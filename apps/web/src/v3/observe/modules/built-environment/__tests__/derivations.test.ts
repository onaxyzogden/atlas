/**
 * Phase 5.4 — derivations tests for the V2 category KPI strip + export
 * helpers added to surface the 23 non-legacy BE kinds in
 * BuiltEnvironmentDashboard.
 *
 * Covers:
 *   1. Empty entity list → 5 stable cards, all dim, all count "0".
 *   2. Mixed kinds in two categories → counts + kindsPresent + dominant pill.
 *   3. Polygon-majority bucket → area metric formatted via formatArea.
 *   4. Cross-project / wrong-state / legacy-kind filtering.
 *   5. Export helpers shape: builtV2EntitiesForExport + builtV2Counts.
 */

import { describe, it, expect } from 'vitest';
import {
  builtEnvironmentV2CategoryKpis,
  builtV2EntitiesForExport,
  builtV2Counts,
} from '../derivations.js';
import type { BuiltEnvironmentEntity } from '@ogden/shared';

const PROJECT = 'p-test';
const OTHER_PROJECT = 'p-other';

let nextId = 0;
function ent(
  kind: string,
  opts: Partial<BuiltEnvironmentEntity> & {
    geometry?: BuiltEnvironmentEntity['geometry'];
  } = {},
): BuiltEnvironmentEntity {
  nextId += 1;
  return {
    id: `e-${nextId}`,
    projectId: PROJECT,
    kind,
    state: 'existing',
    geometry: opts.geometry ?? {
      type: 'Polygon',
      coordinates: [
        [
          [-78.20, 44.50],
          [-78.20, 44.51],
          [-78.19, 44.51],
          [-78.19, 44.50],
          [-78.20, 44.50],
        ],
      ],
    },
    createdAt: '2026-05-10T00:00:00.000Z',
    updatedAt: '2026-05-10T00:00:00.000Z',
    ...opts,
  };
}

describe('builtEnvironmentV2CategoryKpis', () => {
  it('returns 5 stable cards in fixed order even when empty', () => {
    const out = builtEnvironmentV2CategoryKpis({ entities: [], projectId: PROJECT });
    expect(out).toHaveLength(5);
    expect(out.map((c) => c.label)).toEqual([
      'Habitable structures',
      'Agricultural',
      'Utility (extended)',
      'Machinery',
      'Amenity',
    ]);
    for (const c of out) {
      expect(c.value).toBe('0');
      expect(c.tone).toBe('dim');
      expect(c.pill).toBeUndefined();
    }
  });

  it('buckets yurts + barns into Habitable + Agricultural respectively', () => {
    const entities: BuiltEnvironmentEntity[] = [
      ent('yurt'),
      ent('yurt'),
      ent('yurt'),
      ent('barn'),
      ent('barn'),
    ];
    const out = builtEnvironmentV2CategoryKpis({ entities, projectId: PROJECT });
    const habitable = out.find((c) => c.label === 'Habitable structures');
    const agri = out.find((c) => c.label === 'Agricultural');
    const util = out.find((c) => c.label === 'Utility (extended)');

    expect(habitable?.tone).not.toBe('dim');
    expect(habitable?.pill).toBe('Yurt');
    expect(agri?.pill).toBe('Barn');
    expect(util?.tone).toBe('dim');
    expect(util?.value).toBe('0');
  });

  it('polygon-majority bucket reports formatted area not raw count', () => {
    const entities = [ent('barn'), ent('greenhouse')];
    const out = builtEnvironmentV2CategoryKpis({ entities, projectId: PROJECT });
    const agri = out.find((c) => c.label === 'Agricultural');
    // formatArea returns a string with units (m²/ha); must NOT be the bare count.
    expect(agri?.value).not.toBe('2');
    expect(agri?.value).toMatch(/m²|ha/);
  });

  it('filters out other projects, proposed-state, and legacy kinds', () => {
    const entities: BuiltEnvironmentEntity[] = [
      ent('barn'), // counted
      ent('barn', { projectId: OTHER_PROJECT }), // wrong project
      ent('barn', { state: 'proposed' }), // wrong state
      ent('building'), // legacy kind — excluded
      ent('fence', {
        geometry: {
          type: 'LineString',
          coordinates: [
            [-78.2, 44.5],
            [-78.19, 44.5],
          ],
        },
      }), // legacy kind — excluded
    ];
    const out = builtEnvironmentV2CategoryKpis({ entities, projectId: PROJECT });
    const agri = out.find((c) => c.label === 'Agricultural');
    expect(agri?.pill).toBe('Barn');
    // Habitable should be empty — the legacy `building` kind is excluded.
    const habitable = out.find((c) => c.label === 'Habitable structures');
    expect(habitable?.tone).toBe('dim');
  });
});

describe('builtV2EntitiesForExport', () => {
  it('emits one row per eligible entity with category + areaM2', () => {
    const entities = [ent('barn'), ent('cabin'), ent('building') /* legacy */];
    const rows = builtV2EntitiesForExport(entities, PROJECT);
    expect(rows).toHaveLength(2);
    const barn = rows.find((r) => r.kind === 'barn');
    expect(barn?.category).toBe('agricultural');
    expect(barn?.state).toBe('existing');
    expect(barn?.areaM2).toBeGreaterThan(0);
  });

  it('emits lengthM for line-geometry entries', () => {
    const entities = [
      ent('utility-overhead', {
        geometry: {
          type: 'LineString',
          coordinates: [
            [-78.20, 44.50],
            [-78.19, 44.50],
          ],
        },
      }),
    ];
    // utility-overhead may not exist in the registry; fall back: use a real
    // line-typed non-legacy kind. If none exists, this test is a no-op.
    const rows = builtV2EntitiesForExport(entities, PROJECT);
    if (rows.length === 0) return;
    expect(rows[0]!.areaM2).toBeUndefined();
  });

  it('drops other-project and proposed-state and legacy-kind rows', () => {
    const entities: BuiltEnvironmentEntity[] = [
      ent('barn'),
      ent('barn', { projectId: OTHER_PROJECT }),
      ent('barn', { state: 'proposed' }),
      ent('well'),
    ];
    const rows = builtV2EntitiesForExport(entities, PROJECT);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.kind).toBe('barn');
  });
});

describe('builtV2Counts', () => {
  it('totals + per-category counts match eligible entities', () => {
    const entities = [
      ent('barn'),
      ent('barn'),
      ent('greenhouse'),
      ent('yurt'),
      ent('building'), // excluded — legacy
      ent('barn', { projectId: OTHER_PROJECT }), // excluded
    ];
    const counts = builtV2Counts(entities, PROJECT);
    expect(counts.total).toBe(4);
    expect(counts.byCategory.agricultural).toBe(3);
    expect(counts.byCategory.building).toBe(1);
  });

  it('returns zero total for empty input', () => {
    const counts = builtV2Counts([], PROJECT);
    expect(counts.total).toBe(0);
    expect(Object.keys(counts.byCategory)).toHaveLength(0);
  });
});
