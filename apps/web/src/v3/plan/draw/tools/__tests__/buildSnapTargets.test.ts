/**
 * buildSnapTargets — pure normalizer that folds the per-store geometries
 * `usePlanSnapTargets` gathers into the `{ lines, vertices }` SnapTargets shape
 * consumed by `snapDrawPoint`. Tested directly (no Zustand mount): the hook is
 * a thin store-gatherer around this function, so the assembly logic lives here.
 */

import { describe, it, expect } from 'vitest';
import { buildSnapTargets } from '../usePlanSnapTargets.js';

describe('buildSnapTargets', () => {
  it('turns a Point into a single snappable vertex (no line)', () => {
    const { lines, vertices } = buildSnapTargets([
      { type: 'Point', coordinates: [1, 2] },
    ]);
    expect(lines).toEqual([]);
    expect(vertices).toEqual([[1, 2]]);
  });

  it('turns a LineString into one line plus its endpoint vertices', () => {
    const { lines, vertices } = buildSnapTargets([
      {
        type: 'LineString',
        coordinates: [
          [0, 0],
          [1, 1],
          [2, 0],
        ],
      },
    ]);
    expect(lines).toEqual([
      [
        [0, 0],
        [1, 1],
        [2, 0],
      ],
    ]);
    expect(vertices).toEqual([
      [0, 0],
      [1, 1],
      [2, 0],
    ]);
  });

  it('contributes every Polygon ring (outer + holes) as line + corners', () => {
    const outer: [number, number][] = [
      [0, 0],
      [4, 0],
      [4, 4],
      [0, 4],
      [0, 0],
    ];
    const hole: [number, number][] = [
      [1, 1],
      [2, 1],
      [2, 2],
      [1, 1],
    ];
    const { lines, vertices } = buildSnapTargets([
      { type: 'Polygon', coordinates: [outer, hole] },
    ]);
    expect(lines).toEqual([outer, hole]);
    // Every coord of both rings becomes a snappable corner.
    expect(vertices).toEqual([...outer, ...hole]);
  });

  it('flattens MultiPolygon and MultiLineString', () => {
    const ringA: [number, number][] = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 0],
    ];
    const lineB: [number, number][] = [
      [5, 5],
      [6, 6],
    ];
    const { lines } = buildSnapTargets([
      { type: 'MultiPolygon', coordinates: [[ringA]] },
      { type: 'MultiLineString', coordinates: [lineB] },
    ]);
    expect(lines).toEqual([ringA, lineB]);
  });

  it('recurses into a GeometryCollection', () => {
    const { lines, vertices } = buildSnapTargets([
      {
        type: 'GeometryCollection',
        geometries: [
          { type: 'Point', coordinates: [9, 9] },
          {
            type: 'LineString',
            coordinates: [
              [0, 0],
              [1, 0],
            ],
          },
        ],
      },
    ]);
    expect(vertices).toContainEqual([9, 9]);
    expect(lines).toEqual([
      [
        [0, 0],
        [1, 0],
      ],
    ]);
  });

  it('skips null/undefined geometries and degenerate (<2-coord) lines', () => {
    const { lines, vertices } = buildSnapTargets([
      null,
      undefined,
      { type: 'LineString', coordinates: [[0, 0]] }, // single coord → not an edge
      { type: 'Polygon', coordinates: [[]] }, // empty ring
    ]);
    expect(lines).toEqual([]);
    expect(vertices).toEqual([]);
  });

  it('assembles a mixed real-world set (design-element point + zone polygon + path line)', () => {
    // Mirrors what the hook gathers: a tree Point, a zone Polygon, a path
    // LineString → one combined target set a draw tool snaps onto.
    const treePoint: GeoJSON.Point = { type: 'Point', coordinates: [10, 10] };
    const zoneRing: [number, number][] = [
      [0, 0],
      [2, 0],
      [2, 2],
      [0, 2],
      [0, 0],
    ];
    const zonePoly: GeoJSON.Polygon = { type: 'Polygon', coordinates: [zoneRing] };
    const pathLine: [number, number][] = [
      [3, 3],
      [4, 4],
    ];
    const path: GeoJSON.LineString = { type: 'LineString', coordinates: pathLine };

    const { lines, vertices } = buildSnapTargets([treePoint, zonePoly, path]);

    expect(lines).toEqual([zoneRing, pathLine]);
    // tree anchor + every zone corner + both path endpoints are all vertices.
    expect(vertices).toContainEqual([10, 10]);
    expect(vertices).toEqual([[10, 10], ...zoneRing, ...pathLine]);
  });
});
