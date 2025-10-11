import {
  findPolygonCenter,
  squareToPolygon,
  rotatePoint,
  rotatePolygon,
  doLinesIntersect,
  isPointInPolygon,
  doPolygonsIntersect,
  doesLineIntersectPolygon,
  calcHeight,
} from '@/helpers/algs';

describe('algs helper', () => {
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
});
