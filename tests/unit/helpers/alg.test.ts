import {
  calcHeight,
  doLinesIntersect,
  doPlace,
  doPolygonsIntersect,
  doesLineIntersectPolygon,
  findPolygonCenter,
  isPointInPolygon,
  p2pp,
  pp2p,
  rotatePoint,
  rotatePolygon,
  squareToPolygon,
} from '@/helpers/algs';

describe('algs helper', () => {
  test('pp2p converts PPoint to Point', () => {
    const ppoint: [number, number] = [10, 20];
    const point = pp2p(ppoint);
    expect(point).toEqual({ x: 10, y: 20 });
  });

  test('p2pp converts Point to PPoint', () => {
    const point = { x: 10, y: 20 };
    const ppoint = p2pp(point);
    expect(ppoint).toEqual([10, 20]);
  });

  test('findPolygonCenter', () => {
    const polygon = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    const center = findPolygonCenter(polygon);
    expect(center).toEqual({ x: 5, y: 5 });
  });

  test('squareToPolygon', () => {
    const square = { top: 0, left: 0, size: 10 };
    const polygon = squareToPolygon(square);
    expect(polygon).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ]);
  });

  test('rotatePoint', () => {
    const origin = { x: 0, y: 0 };
    const point = { x: 10, y: 0 };
    const radians = Math.PI / 2;
    const rotatedPoint = rotatePoint(origin, point, radians);
    expect(rotatedPoint).toEqual({ x: 0, y: -10 });
  });

  test('rotatePolygon', () => {
    const polygon = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    const radians = Math.PI / 2;
    const rotatedPolygon = rotatePolygon(polygon, radians);
    expect(rotatedPolygon).toEqual([
      { x: 0, y: 10 },
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ]);
  });

  test('doLinesIntersect', () => {
    const a1 = { x: 0, y: 0 };
    const a2 = { x: 10, y: 10 };
    const b1 = { x: 0, y: 10 };
    const b2 = { x: 10, y: 0 };
    expect(doLinesIntersect(a1, a2, b1, b2)).toBe(true);
  });

  test('doLinesIntersect - lines do not intersect', () => {
    const a1 = { x: 0, y: 0 };
    const a2 = { x: 10, y: 0 };
    const b1 = { x: 0, y: 10 };
    const b2 = { x: 10, y: 10 };
    expect(doLinesIntersect(a1, a2, b1, b2)).toBe(false);
  });

  test('doLinesIntersect - parallel lines', () => {
    const a1 = { x: 0, y: 0 };
    const a2 = { x: 10, y: 0 };
    const b1 = { x: 0, y: 5 };
    const b2 = { x: 10, y: 5 };
    expect(doLinesIntersect(a1, a2, b1, b2)).toBe(false);
  });

  test('doLinesIntersect - touching endpoints', () => {
    const a1 = { x: 0, y: 0 };
    const a2 = { x: 10, y: 0 };
    const b1 = { x: 10, y: 0 };
    const b2 = { x: 10, y: 10 };
    expect(doLinesIntersect(a1, a2, b1, b2)).toBe(true);
  });

  test('isPointInPolygon', () => {
    const polygon = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    const pointInside = { x: 5, y: 5 };
    const pointOutside = { x: 15, y: 15 };
    expect(isPointInPolygon(pointInside, polygon)).toBe(true);
    expect(isPointInPolygon(pointOutside, polygon)).toBe(false);
  });

  test('isPointInPolygon - point on edge', () => {
    const polygon = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    const pointOnEdge = { x: 5, y: 0 };
    // Point on edge is considered inside by the algorithm
    expect(isPointInPolygon(pointOnEdge, polygon)).toBe(true);
  });

  test('isPointInPolygon - complex polygon', () => {
    const polygon = [
      { x: 0, y: 0 },
      { x: 10, y: 5 },
      { x: 8, y: 10 },
      { x: 2, y: 10 },
    ];
    const pointInside = { x: 5, y: 5 };
    const pointOutside = { x: 1, y: 1 };
    expect(isPointInPolygon(pointInside, polygon)).toBe(true);
    // This point is actually inside the polygon
    expect(isPointInPolygon(pointOutside, polygon)).toBe(true);
  });

  test('doPolygonsIntersect', () => {
    const poly1 = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    const poly2 = [
      { x: 5, y: 5 },
      { x: 15, y: 5 },
      { x: 15, y: 15 },
      { x: 5, y: 15 },
    ];
    const poly3 = [
      { x: 15, y: 15 },
      { x: 25, y: 15 },
      { x: 25, y: 25 },
      { x: 15, y: 25 },
    ];
    expect(doPolygonsIntersect(poly1, poly2)).toBe(true);
    expect(doPolygonsIntersect(poly1, poly3)).toBe(false);
  });

  test('doPolygonsIntersect - one polygon inside another', () => {
    const poly1 = [
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 20 },
      { x: 0, y: 20 },
    ];
    const poly2 = [
      { x: 5, y: 5 },
      { x: 15, y: 5 },
      { x: 15, y: 15 },
      { x: 5, y: 15 },
    ];
    expect(doPolygonsIntersect(poly1, poly2)).toBe(true);
  });

  test('doPolygonsIntersect - second polygon inside first', () => {
    const poly1 = [
      { x: 5, y: 5 },
      { x: 15, y: 5 },
      { x: 15, y: 15 },
      { x: 5, y: 15 },
    ];
    const poly2 = [
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 20 },
      { x: 0, y: 20 },
    ];
    expect(doPolygonsIntersect(poly1, poly2)).toBe(true);
  });

  test('doesLineIntersectPolygon', () => {
    const polygon = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    const lineStart = { x: 0, y: 5 };
    const lineEnd = { x: 10, y: 5 };
    const line2Start = { x: 0, y: 15 };
    const line2End = { x: 10, y: 15 };
    expect(doesLineIntersectPolygon(lineStart, lineEnd, polygon)).toBe(true);
    expect(doesLineIntersectPolygon(line2Start, line2End, polygon)).toBe(false);
  });

  test('calcHeight', () => {
    const polygons = [
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ],
      [
        { x: 15, y: 20 },
        { x: 25, y: 20 },
        { x: 25, y: 30 },
        { x: 15, y: 30 },
      ],
    ];
    expect(calcHeight(polygons)).toBe(30);
  });

  test('calcHeight - empty array', () => {
    expect(calcHeight([])).toBe(0);
  });

  test('calcHeight - single polygon', () => {
    const polygons = [
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 15 },
        { x: 0, y: 15 },
      ],
    ];
    expect(calcHeight(polygons)).toBe(15);
  });

  test('doPlace - successful placement', () => {
    const polys = [
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ],
    ];
    const newPoly = [
      { x: 20, y: 15 },
      { x: 30, y: 15 },
      { x: 30, y: 25 },
      { x: 20, y: 25 },
    ];
    expect(doPlace(polys, newPoly)).toBe(true);
  });

  test('doPlace - intersecting polygons', () => {
    const polys = [
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ],
    ];
    const newPoly = [
      { x: 5, y: 5 },
      { x: 15, y: 5 },
      { x: 15, y: 15 },
      { x: 5, y: 15 },
    ];
    expect(doPlace(polys, newPoly)).toBe(false);
  });

  test('doPlace - too many horizontal intersections', () => {
    const polys = [
      [
        { x: 0, y: 0 },
        { x: 5, y: 0 },
        { x: 5, y: 20 },
        { x: 0, y: 20 },
      ],
      [
        { x: 10, y: 0 },
        { x: 15, y: 0 },
        { x: 15, y: 20 },
        { x: 10, y: 20 },
      ],
      [
        { x: 30, y: 0 },
        { x: 35, y: 0 },
        { x: 35, y: 20 },
        { x: 30, y: 20 },
      ],
      [
        { x: 40, y: 0 },
        { x: 45, y: 0 },
        { x: 45, y: 20 },
        { x: 40, y: 20 },
      ],
    ];
    const newPoly = [
      { x: 20, y: 5 },
      { x: 25, y: 5 },
      { x: 25, y: 15 },
      { x: 20, y: 15 },
    ];
    expect(doPlace(polys, newPoly)).toBe(false);
  });

  test('doPlace - too many vertical intersections', () => {
    const polys = [
      [
        { x: 0, y: 0 },
        { x: 20, y: 0 },
        { x: 20, y: 5 },
        { x: 0, y: 5 },
      ],
      [
        { x: 0, y: 10 },
        { x: 20, y: 10 },
        { x: 20, y: 15 },
        { x: 0, y: 15 },
      ],
      [
        { x: 0, y: 30 },
        { x: 20, y: 30 },
        { x: 20, y: 35 },
        { x: 0, y: 35 },
      ],
      [
        { x: 0, y: 40 },
        { x: 20, y: 40 },
        { x: 20, y: 45 },
        { x: 0, y: 45 },
      ],
    ];
    const newPoly = [
      { x: 5, y: 20 },
      { x: 15, y: 20 },
      { x: 15, y: 25 },
      { x: 5, y: 25 },
    ];
    expect(doPlace(polys, newPoly)).toBe(false);
  });

  test('doPlace - empty polygon array', () => {
    const polys: any[] = [];
    const newPoly = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    expect(doPlace(polys, newPoly)).toBe(true);
  });
});
