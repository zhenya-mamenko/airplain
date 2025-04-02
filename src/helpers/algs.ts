export interface Point {
  x: number;
  y: number;
}

export type PPoint = [number, number];

export type Polygon = Array<Point>;

export interface Square {
  top: number;
  left: number;
  size: number;
}

export function pp2p(p: PPoint): Point {
  return { x: p[0], y: p[1] };
}

export function p2pp(p: Point): PPoint {
  return [ p.x, p.y ];
}

function findPolygonCenter(poly: Polygon): Point {
  const sum = poly.reduce(
    (acc, point) => ({
      x: acc.x + point.x,
      y: acc.y + point.y
    }),
    { x: 0, y: 0 }
  );

  return {
    x: sum.x / poly.length,
    y: sum.y / poly.length
  };
}

export function squareToPolygon({ top, left, size }: Square): Polygon {
  return [
    {x: left, y: top},
    {x: left + size, y: top},
    {x: left + size, y: top + size},
    {x: left, y: top + size},
  ];
}

function rotatePoint(origin: Point, point: Point, radians: number): Point {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const nx = (cos * (point.x - origin.x)) + (sin * (point.y - origin.y)) + origin.x;
  const ny = (cos * (point.y - origin.y)) - (sin * (point.x - origin.x)) + origin.y;
  return { x: Math.round(nx), y: Math.round(ny)};
}

export function rotatePolygon(poly: Polygon, radians: number): Polygon {
  const origin: Point = findPolygonCenter(poly);
  const result = poly.map(point => rotatePoint(origin, point, radians)) as Polygon;
  return result;
}

function doLinesIntersect(a1: Point,  a2: Point, b1: Point, b2: Point): boolean {
  const area1 = (a2.x - a1.x) * (b1.y - a1.y) - (b1.x - a1.x) * (a2.y - a1.y);
  const area2 = (a2.x - a1.x) * (b2.y - a1.y) - (b2.x - a1.x) * (a2.y - a1.y);
  const area3 = (b2.x - b1.x) * (a1.y - b1.y) - (a1.x - b1.x) * (b2.y - b1.y);
  const area4 = (b2.x - b1.x) * (a2.y - b1.y) - (a2.x - b1.x) * (b2.y - b1.y);

  return (area1 * area2 <= 0) && (area3 * area4 <= 0);
}

export function isPointInPolygon(point: Point, polygon: Polygon): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    if (((polygon[i].y > point.y) !== (polygon[j].y > point.y)) &&
        (point.x < (polygon[j].x - polygon[i].x) * (point.y - polygon[i].y) / 
        (polygon[j].y - polygon[i].y) + polygon[i].x)) {
      inside = !inside;
    }
  }
  return inside;
}

function doPolygonsIntersect(poly1: Polygon, poly2: Polygon): boolean {
  for (let i = 0; i < poly1.length; i++) {
    const next1 = (i + 1) % poly1.length;
    for (let j = 0; j < poly2.length; j++) {
      const next2 = (j + 1) % poly2.length;
      if (doLinesIntersect(
        poly1[i],
        poly1[next1],
        poly2[j],
        poly2[next2]
      )) {
        return true;
      }
    }
  }

  return poly1.some(p => isPointInPolygon(p, poly2)) ||
    poly2.some(p => isPointInPolygon(p, poly1));
}

function doesLineIntersectPolygon(lineStart: Point, lineEnd: Point, poly: Polygon): boolean {
  for (let i = 0; i < poly.length; i++) {
    const next = (i + 1) % poly.length;
    if (doLinesIntersect(lineStart, lineEnd, poly[i], poly[next])) {
      return true;
    }
  }
  return false;
}

function doOnHorizontal(poly1: Polygon, poly2: Polygon): boolean {
  for (const point of poly2) {
    if (doesLineIntersectPolygon({x: 0, y: point.y}, {x: 1e6, y: point.y}, poly1)) return true;
  }
  return false;
}

function doOnVertical(poly1: Polygon, poly2: Polygon): boolean {
  for (const point of poly2) {
    if (doesLineIntersectPolygon({x: point.x, y: 0}, {x: point.x, y: 1e6}, poly1)) return true;
  }
  return false;
}

export function calcHeight(polys: Array<Polygon>): number {
  return polys.length > 0 ? polys.flat().reduce((acc: number, point: Point) => point.y > acc ? point.y : acc, 0) : 0;
}

export function doPlace(polys: Array<Polygon>, poly: Polygon): boolean {
  let vCount = 0, hCount = 0;
  for (const check of polys) {
    if (doPolygonsIntersect(check, poly)) return false;
    if (doOnVertical(check, poly)) vCount++;
    if (doOnHorizontal(check, poly)) hCount++;
  };
  if (hCount > 3) return false;
  if (Math.floor(polys.length / 2) + 1 < vCount) return false;
  return true;
}

// cyrb53 (c) 2018 bryc (github.com/bryc). License: Public domain. Attribution appreciated.
// https://github.com/bryc/code/blob/master/jshash/experimental/cyrb53.js
const cyrb64 = (str: string, seed = 0) => {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for(let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1  = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2  = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  return [h2>>>0, h1>>>0];
};
export const cyrb64Hash =  (str: string, seed = 0) => {
  const [h2, h1] = cyrb64(str, seed);
  return h2.toString(36).padStart(7, '0') + h1.toString(36).padStart(7, '0');
}
