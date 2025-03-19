import type { Achievement, ContextData } from '@/types';
import { Dimensions } from 'react-native';
import { type Polygon, calcHeight, doPlace, rotatePolygon, squareToPolygon, cyrb64Hash, PPoint, pp2p, Point } from '@/helpers/algs';
import { readFileToString } from '@/helpers/common';
import { getAchievements } from '@/helpers/sqlite';
import t from '@/helpers/localization';
import { Skia, SkImage, SkPath } from '@shopify/react-native-skia';
import * as FileSystem from 'expo-file-system';
import { getSetting, setSetting } from '@/constants/settings';


export interface Stamp {
  achievement: any;
  color: string;
  drawPaths: Array<SkPath>;
  hull: Array<Point>;
  svgPaths: Array<SkPath>;
};

const makeHash = (width: number, height: number, ids: Array<string>): string => {
  const hashSource = `${width}|${height}|${ids.join('|')}`;
  const hash = cyrb64Hash(hashSource);
  return hash;
}

const applyViewBoxTransform = (path: SkPath, left: number, top: number, size: number) => {
  const scale = size / 256;
  const matrix = Skia.Matrix();
  matrix.translate(left, top);
  matrix.scale(scale, scale);
  const newPath = path.copy()
  newPath.transform(matrix);
  return newPath;
}

const rotatePath = (path: SkPath, left: number, top: number, size: number, radians: number) => {
  const matrix = Skia.Matrix();
  const [ cx, cy ] = [ left + size / 2, top + size / 2 ];
  matrix.translate(cx, cy);
  matrix.rotate(radians);
  matrix.translate(-cx, -cy);
  const newPath = path.copy()
  newPath.transform(matrix);
  return newPath;
}

const convexHull = (points: Array<PPoint>) => {
  if (points.length < 3) return points; // Если <3 точек, уже выпуклая оболочка

  points.sort(([x1, y1], [x2, y2]) => x1 === x2 ? y1 - y2 : x1 - x2);

  const crossProduct = ([ax, ay]: PPoint, [bx, by]: PPoint, [cx, cy]: PPoint) =>
    (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);

  let hull = [];

  for (let p of points) {
    while (hull.length >= 2 && crossProduct(hull[hull.length - 2], hull[hull.length - 1], p) <= 0) {
      hull.pop();
    }
    hull.push(p);
  }

  let t = hull.length + 1;
  for (let i = points.length - 2; i >= 0; i--) {
    let p = points[i];
    while (hull.length >= t && crossProduct(hull[hull.length - 2], hull[hull.length - 1], p) <= 0) {
      hull.pop();
    }
    hull.push(p);
  }

  hull.pop();
  return hull;
};

const getGroupPolygon = (paths: Array<SkPath>): Array<Point> => {
  let points: Array<PPoint> = [];

  paths.forEach(path => {
    const cmds = path.toCmds();
    cmds.forEach(cmd => {
      if (cmd[0] === 0 || cmd[0] === 1) {
        points.push([cmd[1], cmd[2]]);
      }
    });
  });
  return convexHull(points).map(p => pp2p(p));
};

export const extractPathsData = (svgString: string | null) => {
  if (!svgString) return [];
  const matches = [...svgString.matchAll(/<path[^>]*d="([^"]+)"/g)];
  return matches.map(match => match[1]);
}

export const loadAchievements = async (achievements: Array<any>): Promise<Array<{ id: string; paths: Array<SkPath> | null }>> => {

  const processSvg = async (file: any): Promise<Array<SkPath> | null> => {
    const svg = extractPathsData((await readFileToString(file)));
    if (!svg) return null;
    const result = svg.map((x: string) => Skia.Path.MakeFromSVGString(x)).filter(x => !!x);
    return result;
  }

  const files = require.context('../assets/stamps', true, /\.svg$/, 'sync');
  const svgs = Object.fromEntries(files.keys()
    .map(x => ({ id: x.replace(/^.+\/([^.]+)\..+$/g, '$1'), file: files(x) }))
    .map(x => [ x.id.split('-')[0], x.file ])
  );

  const results: Array<{ id: string; paths: Array<SkPath> | null }> = [];
  for (let i = 0; i < achievements.length; i++) {
    const a = achievements[i];
    const file = svgs[a.id];
    const result: { id: string; paths: Array<SkPath> | null } = { id: a.id, paths: null };
    if (!!file) {
      result.paths = await processSvg(file);
    }
    results.push(result);
  }
  return results;
}

export const prepareAchievements = async (stampsColors: { 'light': {}, 'dark': {} }, bgImage: SkImage | null, themeName: 'light' | 'dark'):
  Promise<{ image: SkImage | null, data: ContextData[] }> =>
{
  if (!stampsColors || !bgImage) return { image: null, data: [] };

  function addStamp(width: number, size: number, radians: number, polys: Array<Polygon>): { left: number, top: number, radians: number } {

    const checkBounds = (poly: Polygon): boolean => {
      for (const point of poly) {
        if (point.x < 8 || point.x > (width - 48) || point.y < 8) {
          return false;
        }
      }
      return true;
    }

    const height = calcHeight(polys);
    const minTop = Math.floor(polys.length / 3) * size + 32;
    const t = (p: number) => Math.round((Math.random() * 0.1 + 0.09 * p) * (height - minTop)) + minTop;

    let i = 0;
    let found = false;
    let poly: any;
    let top;
    let left;
    while (i < 10 && !found) {
      top = t(i);
      let j = 0;
      while (!found && j < 5) {
        left = Math.round(((Math.random() * 0.1) + 0.15 * j) * width) + 16;
        poly = rotatePolygon(squareToPolygon({ left, top, size }), radians);
        if (checkBounds(poly)) {
          found = doPlace(polys, poly);
        }
        j++;
      }
      i++;
    }
    while (!found) {
      top = height + Math.round((Math.random() * 8 + 8));
      left = Math.round((Math.random() * 0.70) * width) + 16;
      radians = (Math.random() * Math.PI / 6 + 0.1) * Math.sign(Math.random() - 0.5);
      poly = rotatePolygon(squareToPolygon({ left, top, size }), radians);
      found = doPlace(polys, poly);
    }
    // @ts-ignore
    return { left, top, radians };
  }

  const makeData = (saved: any, achievements: Achievement[]): ContextData[] => {
    const data: ContextData[] = [];
    for (const d of saved) {
      const achievement = achievements.find(a => a.id === d.id);
      if (achievement) {
        data.push({
          achievement,
          color: d.color,
          hull: d.hull,
        });
      }
    }
    return data;
  }

  try {
    let { width, height } = Dimensions.get('screen');
    width = Math.round(width);
    height = Math.round(height) - 240;

    const list = await getAchievements();
    const achievements: Achievement[] = list.map(a => {
      return {
        arrivalAirport: a.arrivalAirport,
        date: (new Date(a.flightDate)).toLocaleString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }),
        departureAirport : a.departureAirport,
        id: a.name,
        name: t(`achievements.${a.name}`),
        svg: [] as SkPath[],
      }
    });
    const svgs = await loadAchievements(achievements);
    achievements.forEach(a => {
      const svg = svgs.find(s => s.id === a.id);
      if (!!svg && svg.paths) a.svg = svg.paths;
    })

    const hash = makeHash(width, height, achievements.map(x => x.id));
    if (getSetting('achievements_hash', '$$$====$$$') === hash) {
      const image = await importImage(themeName);
      const saved = await importData();
      if (!!saved) {
        const data = makeData(saved, achievements);
        if (!!image) return { image, data };
      }
    }

    const maxSvgSize = 0.22 * (width - 32);
    const colors = Object.entries(stampsColors[themeName]).slice(1).map(e => e[0]);
    const stamps: Array<Stamp> = [];

    for (let i = 0; i < svgs.length; i++) {
      const svg = svgs[i];
      if (!svg.paths) continue;
      const id = svg.id;
      const isCountry = id.length === 2;
      const size = isCountry ? Math.round(maxSvgSize * (Math.random() * 0.1 + 0.9)) : 0.24 * (width - 32);
      const selected = colors[Math.floor(Math.random() * colors.length)];
      const color = isCountry ? selected : 'gold';
      const r = ((Math.random() * 120) - 60) * Math.PI / 180;
      const { left, top, radians} = addStamp(width, size, r, stamps.map(s => s.hull));
      const paths = svg.paths?.map((path: SkPath) =>
        rotatePath(applyViewBoxTransform(path, left, top, size),
          left, top, size, radians)
        ) || [];
      const result: Stamp = {
        achievement: { ...achievements.find(x => x.id === id) },
        color,
        drawPaths: paths,
        hull: getGroupPolygon(paths),
        svgPaths: svg.paths,
      };
      stamps.push(result);
    }

    let image: SkImage | null = null;
    for (const t of ['light', 'dark']) {
      const img = await createCachedImage(width, height, bgImage, stamps, stampsColors[t as 'light' | 'dark']);
      if (!img) return { image: null, data: [] };
      await exportImage(img, t);
      if (t === themeName) image = img;
    }
    const saved = stamps.map(x => ({ id: x.achievement.id, hull: x.hull, color: x.color }));
    await exportData(saved);
    setSetting('achievements_hash', hash);
    const data = makeData(saved, achievements);
    return { image, data };
  } catch (e) {
    return { image: null, data: [] };
  }
}

export const createCachedImage = async (width: number, height: number, bgImage: SkImage, stamps: Stamp[], colors: any): Promise<SkImage | null> => {
  if (width === 0 || height === 0 || !bgImage || stamps.length === 0) return null;
  height = Math.max(calcHeight(stamps.map(x => x.hull)) + 50, height);

  const skiaCanvas = Skia.Surface.Make(width * 2, height * 2);
  if (!skiaCanvas) return null;
  const skCanvas = skiaCanvas.getCanvas();
  skCanvas.scale(2, 2);

  if (bgImage) {
    const paint = Skia.Paint();
    paint.setAlphaf(0.1);
    let rx = 0;
    while (rx < width) {
      let ry = 0;
      while (ry < height) {
        skCanvas.drawImage(bgImage, rx, ry, paint);
        ry += bgImage.height();
      }
      rx += bgImage.width();
    }
  }

  stamps.map(async (stamp) => {
    const paths = stamp.drawPaths;

    const stampPaint = Skia.Paint();
    stampPaint.setColor(Skia.Color(colors[stamp.color]));
    const noiseShader = Skia.Shader.MakeTurbulence(0.05, 0.1, 4, Math.random(), 0, 0);
    stampPaint.setShader(noiseShader);
    const cl = Skia.Color(colors[stamp.color]);
    const colorFilter = Skia.ColorFilter.MakeMatrix([
      0, 0, 0, 0, cl[0],
      0, 0, 0, 0, cl[1],
      0, 0, 0, 0, cl[2],
      0, 0, 0, 1, 0.7,
    ]);
    stampPaint.setColorFilter(colorFilter);

    paths.forEach((path: any) => {
      skCanvas.drawPath(path, stampPaint);
    });
  })

  const result = skiaCanvas.makeImageSnapshot();

  return result;
}

const exportImage = async (image: SkImage, themeName: string) => {
  if (!image) return;
  const data = image.encodeToBase64();
  if (!data) return;
  const path = `${FileSystem.cacheDirectory}achievements-${themeName}.png`;
  try {
    await FileSystem.writeAsStringAsync(path, data, { encoding: 'base64' });
    //sharing image
    const surface = Skia.Surface.Make(image.width(), image.height());
    if (!surface) return;
    const canvas = surface.getCanvas();
    canvas.drawColor(Skia.Color(themeName === 'light' ? 'white' : 'black'));
    canvas.drawImage(image, 0, 0);
    canvas.scale(0.5, 0.5);
    const result = surface.makeImageSnapshot().encodeToBase64();
    if (!result) return;
    await FileSystem.writeAsStringAsync(`${FileSystem.cacheDirectory}achievements-share-${themeName}.png`, result, { encoding: 'base64' });
  } catch (e) {}
}

const exportData = async (data: { id: string, hull: Point[], color: string }[]) => {
  const path = `${FileSystem.cacheDirectory}achievements-data.json`;
  try {
    await FileSystem.writeAsStringAsync(path, JSON.stringify(data), { encoding: 'utf8' });
  } catch (e) {}
}

const importImage = async (themeName: string) => {
  const path = `${FileSystem.cacheDirectory}achievements-${themeName}.png`;
  const fileInfo = await FileSystem.getInfoAsync(path);
  if (!fileInfo.exists) return null;

  try {
    const data = await FileSystem.readAsStringAsync(path, { encoding: 'base64' });
    const image = Skia.Image.MakeImageFromEncoded(Skia.Data.fromBase64(data));
    if (!!image) return image;
  } catch (e) {}
  return null;
}

const importData = async (): Promise<{ id: string, hull: Point[], color: string }[] | null> => {
  const path = `${FileSystem.cacheDirectory}achievements-data.json`;
  const fileInfo = await FileSystem.getInfoAsync(path);
  if (!fileInfo.exists) return null;

  try {
    const data = await FileSystem.readAsStringAsync(path, { encoding: 'utf8' });
    const result = JSON.parse(data);
    return result;
  } catch (e) {}
  return null;
}
