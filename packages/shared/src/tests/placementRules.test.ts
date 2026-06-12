// placementRules.test.ts
//
// Integrity test for the shared placement-rule catalog. Pure data checks —
// geometry evaluation is tested where it lives (client evaluator / server
// guard). Pins the block-rule id set so a severity downgrade (block -> warn)
// is a reviewed diff, never a silent one.

import { describe, expect, it } from 'vitest';
import {
  PLACEMENT_DISTANCES_M,
  PLACEMENT_RULES,
  ZONE_CATEGORIES,
  findPlacementRule,
  rulesForCandidate,
  serverEnforceableRules,
  subjectMatches,
  type PlacementRule,
} from '../placementRules/index.js';

const VALID_ZONE_CATEGORIES = new Set<string>(ZONE_CATEGORIES);

/** Constraint shapes the Phase-4 server guard knows how to compile. */
const SERVER_COMPILABLE = new Set([
  'within-boundary',
  'min-distance-from',
  'zone-exclusion',
]);

describe('placement-rule catalog integrity', () => {
  it('rule ids are unique and kebab-case', () => {
    const ids = PLACEMENT_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('every rule carries a non-empty message and a valid severity', () => {
    for (const r of PLACEMENT_RULES) {
      expect(r.message.trim().length, r.id).toBeGreaterThan(0);
      expect(['block', 'warn']).toContain(r.severity);
    }
  });

  it('distance constraints have finite distances and at least one target pool', () => {
    for (const r of PLACEMENT_RULES) {
      const c = r.constraint;
      if (c.type !== 'min-distance-from' && c.type !== 'max-distance-from') continue;
      expect(Number.isFinite(c.distanceM), r.id).toBe(true);
      expect(c.distanceM, r.id).toBeGreaterThanOrEqual(0);
      // max-distance "within 0 m of X" is vacuously unsatisfiable.
      if (c.type === 'max-distance-from') expect(c.distanceM, r.id).toBeGreaterThan(0);
      const pools =
        (c.target.kinds?.length ?? 0) +
        (c.target.categories?.length ?? 0) +
        (c.target.zoneCategories?.length ?? 0) +
        (c.target.siteLayers?.length ?? 0) +
        (c.target.setbackRings ? 1 : 0);
      expect(pools, `${r.id} target must reference at least one pool`).toBeGreaterThan(0);
      expect(c.target.label.trim().length, r.id).toBeGreaterThan(0);
    }
  });

  it('zone constraints reference only canonical zone categories', () => {
    for (const r of PLACEMENT_RULES) {
      const c = r.constraint;
      const cats =
        c.type === 'zone-containment' || c.type === 'zone-exclusion'
          ? c.zoneCategories
          : c.type === 'min-distance-from' || c.type === 'max-distance-from'
            ? (c.target.zoneCategories ?? [])
            : [];
      for (const cat of cats) {
        expect(VALID_ZONE_CATEGORIES.has(cat), `${r.id}: ${cat}`).toBe(true);
      }
    }
  });

  it('zone-containment percentages and ring ranges are sane', () => {
    for (const r of PLACEMENT_RULES) {
      const c = r.constraint;
      if (c.type === 'zone-containment') {
        expect(c.minCoveragePct, r.id).toBeGreaterThan(0);
        expect(c.minCoveragePct, r.id).toBeLessThanOrEqual(100);
        expect(c.zoneCategories.length, r.id).toBeGreaterThan(0);
      }
      if (c.type === 'zone-exclusion') {
        expect(c.zoneCategories.length, r.id).toBeGreaterThan(0);
      }
      if (c.type === 'permaculture-ring-range') {
        expect(c.minZ, r.id).toBeLessThanOrEqual(c.maxZ);
      }
    }
  });

  it('pins the block-rule id set (severity downgrades are reviewed diffs)', () => {
    const blocks = PLACEMENT_RULES.filter((r) => r.severity === 'block')
      .map((r) => r.id)
      .sort();
    expect(blocks).toEqual([
      'boundary-containment',
      'buffer-zone-exclusion',
      'livestock-water-protection',
      'paddock-prohibited-zones',
      'septic-well-separation',
      'well-septic-separation',
    ]);
  });

  it('serverEnforceable is set only on constraint shapes the guard compiles', () => {
    for (const r of serverEnforceableRules()) {
      expect(SERVER_COMPILABLE.has(r.constraint.type), r.id).toBe(true);
    }
  });

  it('distances stay consistent between the constants and the rules', () => {
    const dist = (r: PlacementRule | undefined) =>
      r &&
      (r.constraint.type === 'min-distance-from' ||
        r.constraint.type === 'max-distance-from')
        ? r.constraint.distanceM
        : undefined;
    expect(dist(findPlacementRule('well-septic-separation'))).toBe(
      PLACEMENT_DISTANCES_M.wellSeptic,
    );
    expect(dist(findPlacementRule('septic-well-separation'))).toBe(
      PLACEMENT_DISTANCES_M.wellSeptic,
    );
    expect(dist(findPlacementRule('livestock-spiritual-buffer'))).toBe(
      PLACEMENT_DISTANCES_M.livestockSpiritual,
    );
    expect(dist(findPlacementRule('wetland-disturbance-buffer'))).toBe(
      PLACEMENT_DISTANCES_M.wetlandDisturbance,
    );
    expect(dist(findPlacementRule('riparian-planting-buffer'))).toBe(
      PLACEMENT_DISTANCES_M.riparianPlanting,
    );
    expect(dist(findPlacementRule('nursery-water-proximity'))).toBe(
      PLACEMENT_DISTANCES_M.nurseryWaterMax,
    );
  });
});

describe('subjectMatches / rulesForCandidate', () => {
  it('kinds match exactly; categories match broadly; either suffices', () => {
    expect(
      subjectMatches({ kinds: ['paddock'] }, { kind: 'paddock', category: 'grazing' }),
    ).toBe(true);
    expect(
      subjectMatches({ kinds: ['paddock'] }, { kind: 'orchard', category: 'grazing' }),
    ).toBe(false);
    expect(
      subjectMatches({ categories: ['structure'] }, { kind: 'barn', category: 'structure' }),
    ).toBe(true);
    expect(
      subjectMatches(
        { kinds: ['well'], categories: ['structure'] },
        { kind: 'well', category: 'utility' },
      ),
    ).toBe(true);
  });

  it('empty subject matches everything; exceptKinds always wins', () => {
    expect(subjectMatches({}, { kind: 'anything' })).toBe(true);
    expect(
      subjectMatches({ exceptKinds: ['hedgerow'] }, { kind: 'hedgerow' }),
    ).toBe(false);
    expect(
      subjectMatches(
        { kinds: ['hedgerow'], exceptKinds: ['hedgerow'] },
        { kind: 'hedgerow' },
      ),
    ).toBe(false);
  });

  it('a paddock candidate picks up its full rule set', () => {
    const ids = rulesForCandidate({ kind: 'paddock', category: 'grazing' }).map(
      (r) => r.id,
    );
    for (const expected of [
      'boundary-containment',
      'paddock-prohibited-zones',
      'buffer-zone-exclusion',
      'livestock-water-protection',
      'livestock-spiritual-buffer',
      'paddock-no-self-overlap',
      'steward-setback-respect',
    ]) {
      expect(ids).toContain(expected);
    }
    // …and nothing aimed at other kinds.
    expect(ids).not.toContain('well-septic-separation');
    expect(ids).not.toContain('nursery-water-proximity');
  });

  it('buffer-zone exemptions: a hedgerow may enter buffer zones, a barn may not', () => {
    const hedgerow = rulesForCandidate({ kind: 'hedgerow', category: 'vegetation' });
    const barn = rulesForCandidate({ kind: 'barn', category: 'structure' });
    expect(hedgerow.map((r) => r.id)).not.toContain('buffer-zone-exclusion');
    expect(barn.map((r) => r.id)).toContain('buffer-zone-exclusion');
  });

  it('annotation kinds are exempt from boundary containment', () => {
    for (const kind of ['buffer-ring', 'ecological-note', 'monitoring-transect']) {
      expect(rulesForCandidate({ kind }).map((r) => r.id)).not.toContain(
        'boundary-containment',
      );
    }
  });
});
