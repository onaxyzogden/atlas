import { describe, it, expect } from 'vitest';
import {
  evaluatePaddockWelfare,
  paddockPassesWelfare,
  welfareSummaryForProject,
  worstWelfareBand,
} from '../welfarePass.js';
import type { Paddock } from '../../../store/livestockStore.js';
import type { Utility } from '../../../store/utilityStore.js';
import type { ProjectedStructure as Structure } from '@ogden/shared';

/** Build a paddock with a tiny square ring centered at (0, 0) — the
 *  centroid lands at (0, 0). Other fields don't matter for the math. */
function makePaddock(id = 'p1'): Paddock {
  return {
    id,
    projectId: 'proj',
    name: id,
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [-0.00001, -0.00001],
          [0.00001, -0.00001],
          [0.00001, 0.00001],
          [-0.00001, 0.00001],
          [-0.00001, -0.00001],
        ],
      ],
    },
  } as unknown as Paddock;
}

/** ~1° longitude at the equator ≈ 111 km, so 1e-3° ≈ 111 m, 9e-4° ≈ 100 m.
 *  Use these to land structures inside / outside the 100 m good band. */
function structureAt(
  type: 'barn' | 'animal_shelter' | 'pavilion',
  lng: number,
  lat: number,
  name = 'x',
): Structure {
  return { type, center: [lng, lat], name } as unknown as Structure;
}

function waterTankAt(lng: number, lat: number, name = 'tank'): Utility {
  return { type: 'water_tank', center: [lng, lat], name } as unknown as Utility;
}

describe('worstWelfareBand', () => {
  it('returns good when all good', () => {
    expect(worstWelfareBand('good', 'good', 'good')).toBe('good');
  });
  it('prefers missing over poor over fair over good', () => {
    expect(worstWelfareBand('good', 'fair')).toBe('fair');
    expect(worstWelfareBand('fair', 'poor')).toBe('poor');
    expect(worstWelfareBand('poor', 'missing')).toBe('missing');
  });
});

describe('evaluatePaddockWelfare', () => {
  const paddock = makePaddock();

  it('marks every axis missing when nothing is placed', () => {
    const r = evaluatePaddockWelfare(paddock, [], []);
    expect(r.shade.band).toBe('missing');
    expect(r.shelter.band).toBe('missing');
    expect(r.water.band).toBe('missing');
    expect(r.worst).toBe('missing');
    expect(r.centroid).not.toBeNull();
    expect(r.centroid!.lat).toBeCloseTo(0, 4);
    expect(r.centroid!.lng).toBeCloseTo(0, 4);
  });

  it('rates shade good when an allowed structure is within 100 m', () => {
    // ~22 m east of centroid (2e-4° lng at the equator ≈ 22 m)
    const r = evaluatePaddockWelfare(paddock, [], [structureAt('pavilion', 0.0002, 0)]);
    expect(r.shade.band).toBe('good');
    expect(r.shade.nearestName).toBe('x');
    // Pavilion is not a shelter type — shelter stays missing.
    expect(r.shelter.band).toBe('missing');
    expect(r.water.band).toBe('missing');
    expect(r.worst).toBe('missing');
  });

  it('combines per-axis bands into worst-of-three', () => {
    // barn satisfies both shade and shelter at ~22 m → good;
    // water tank ~166 m away → fair.
    const r = evaluatePaddockWelfare(
      paddock,
      [waterTankAt(0.0015, 0)],
      [structureAt('barn', 0.0002, 0)],
    );
    expect(r.shade.band).toBe('good');
    expect(r.shelter.band).toBe('good');
    expect(r.water.band).toBe('fair');
    expect(r.worst).toBe('fair');
  });

  it('returns null centroid when geometry is degenerate', () => {
    const degenerate = {
      ...makePaddock('degen'),
      geometry: { type: 'Polygon', coordinates: [[]] },
    } as unknown as Paddock;
    const r = evaluatePaddockWelfare(degenerate, [], []);
    expect(r.centroid).toBeNull();
    expect(r.worst).toBe('missing');
  });
});

describe('paddockPassesWelfare', () => {
  const paddock = makePaddock();

  it('passes only when every axis is good', () => {
    expect(
      paddockPassesWelfare(
        paddock,
        [waterTankAt(0.0002, 0)],
        [structureAt('barn', 0.0002, 0)],
      ),
    ).toBe(true);
  });

  it('fails when any axis is short of good', () => {
    // barn covers shade+shelter good; water tank at ~166 m → fair.
    expect(
      paddockPassesWelfare(
        paddock,
        [waterTankAt(0.0015, 0)],
        [structureAt('barn', 0.0002, 0)],
      ),
    ).toBe(false);
  });

  it('fails when nothing is placed', () => {
    expect(paddockPassesWelfare(paddock, [], [])).toBe(false);
  });
});

describe('welfareSummaryForProject', () => {
  it('returns zero count + zero pct for no paddocks', () => {
    expect(welfareSummaryForProject([], [], [])).toEqual({ paddockCount: 0, passPct: 0 });
  });

  it('reports 50% when 2 of 4 paddocks pass', () => {
    // 4 paddocks all at (0, 0); only paddocks within 100 m of the barn+tank
    // pass. Build all 4 at the same origin, then place a barn+tank at origin
    // for everyone (all 4 pass).
    const paddocks = [makePaddock('a'), makePaddock('b'), makePaddock('c'), makePaddock('d')];
    // Place barn+tank for paddocks a, b only by referencing the same point —
    // since all paddocks share a centroid, we'd get 4/4. To split, shift two
    // paddocks far away so only a, b have anchors within 100 m.
    const farPaddocks = paddocks.map((p, i) =>
      i < 2
        ? p
        : ({
            ...p,
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [0.05 - 0.00001, 0.05 - 0.00001],
                  [0.05 + 0.00001, 0.05 - 0.00001],
                  [0.05 + 0.00001, 0.05 + 0.00001],
                  [0.05 - 0.00001, 0.05 + 0.00001],
                  [0.05 - 0.00001, 0.05 - 0.00001],
                ],
              ],
            },
          } as unknown as Paddock),
    );
    const summary = welfareSummaryForProject(
      farPaddocks,
      [waterTankAt(0, 0)],
      [structureAt('barn', 0, 0)],
    );
    expect(summary.paddockCount).toBe(4);
    expect(summary.passPct).toBe(50);
  });

  it('reports 100% when every paddock passes', () => {
    const paddocks = [makePaddock('a'), makePaddock('b')];
    const summary = welfareSummaryForProject(
      paddocks,
      [waterTankAt(0, 0)],
      [structureAt('barn', 0, 0)],
    );
    expect(summary.paddockCount).toBe(2);
    expect(summary.passPct).toBe(100);
  });
});
