/**
 * UniversalDomain schema, constants, legacy-module mapping, and persistence
 * migration utility — conformance tests for slice 1 of the universal-domain
 * refactor (ADR 2026-05-25-atlas-universal-domains). No runtime wiring; the
 * cutover that replaces the stage-local enums is a later slice.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  UniversalDomain,
  UNIVERSAL_DOMAINS,
  UNIVERSAL_DOMAIN_LABELS,
  UNIVERSAL_DOMAIN_PURPOSE,
  OBSERVE_MODULE_TO_DOMAIN,
  PLAN_MODULE_TO_DOMAIN,
  ACT_MODULE_TO_DOMAIN,
  mapLegacyModuleId,
  migrateByProjectModuleKeys,
} from '../index.js';

const ALL_DOMAINS = [
  'vision-intent', 'land-base', 'climate', 'topography', 'hydrology', 'soil',
  'ecology', 'plants-food', 'animals-livestock', 'built-infrastructure',
  'access-circulation', 'energy-resources', 'people-governance',
  'economics-capacity', 'risk-compliance', 'monitoring-records',
] as const;

describe('UniversalDomain schema', () => {
  it('accepts all 16 canonical domain ids', () => {
    for (const id of ALL_DOMAINS) {
      expect(UniversalDomain.parse(id)).toBe(id);
    }
  });

  it('rejects unknown domain ids', () => {
    expect(UniversalDomain.safeParse('water').success).toBe(false);
    expect(UniversalDomain.safeParse('Vision-Intent').success).toBe(false);
    expect(UniversalDomain.safeParse('').success).toBe(false);
  });
});

describe('UNIVERSAL_DOMAINS ordering', () => {
  it('contains exactly 16 entries', () => {
    expect(UNIVERSAL_DOMAINS).toHaveLength(16);
  });

  it('matches the canonical ADR ordering', () => {
    expect([...UNIVERSAL_DOMAINS]).toEqual([...ALL_DOMAINS]);
  });

  it('contains no duplicates', () => {
    expect(new Set(UNIVERSAL_DOMAINS).size).toBe(UNIVERSAL_DOMAINS.length);
  });
});

describe('UNIVERSAL_DOMAIN_LABELS / _PURPOSE coverage', () => {
  it('has a label for every domain', () => {
    for (const id of UNIVERSAL_DOMAINS) {
      expect(UNIVERSAL_DOMAIN_LABELS[id]).toBeTypeOf('string');
      expect(UNIVERSAL_DOMAIN_LABELS[id].length).toBeGreaterThan(0);
    }
  });

  it('has a core-purpose string for every domain', () => {
    for (const id of UNIVERSAL_DOMAINS) {
      expect(UNIVERSAL_DOMAIN_PURPOSE[id]).toBeTypeOf('string');
      expect(UNIVERSAL_DOMAIN_PURPOSE[id].length).toBeGreaterThan(0);
    }
  });

  it('has no extra (non-domain) keys', () => {
    expect(Object.keys(UNIVERSAL_DOMAIN_LABELS).sort()).toEqual([...ALL_DOMAINS].sort());
    expect(Object.keys(UNIVERSAL_DOMAIN_PURPOSE).sort()).toEqual([...ALL_DOMAINS].sort());
  });
});

describe('legacy module -> domain mapping', () => {
  const EXPECTED_OBSERVE = [
    'human-context', 'built-environment', 'macroclimate-hazards', 'topography',
    'earth-water-ecology', 'sectors-zones', 'swot-synthesis',
  ];
  const EXPECTED_PLAN = [
    'goal-compass', 'dynamic-layering', 'water-management', 'zone-circulation',
    'structures-subsystems', 'machinery', 'livestock', 'plant-systems',
    'soil-fertility', 'cross-section-solar', 'phasing-budgeting',
    'principle-verification', 'regeneration-monitor', 'habitat-allocation',
    'biodiversity-monitor',
  ];
  const EXPECTED_ACT = [
    'tracker', 'build', 'maintain', 'livestock', 'harvest', 'review',
    'network', 'schedule',
  ];

  it('covers the 7 ObserveModule ids exactly', () => {
    expect(Object.keys(OBSERVE_MODULE_TO_DOMAIN).sort()).toEqual([...EXPECTED_OBSERVE].sort());
  });

  it('covers the 15 PlanModule ids exactly', () => {
    expect(Object.keys(PLAN_MODULE_TO_DOMAIN).sort()).toEqual([...EXPECTED_PLAN].sort());
  });

  it('covers the 8 ActModule ids exactly', () => {
    expect(Object.keys(ACT_MODULE_TO_DOMAIN).sort()).toEqual([...EXPECTED_ACT].sort());
  });

  it('maps every legacy id to a valid UniversalDomain', () => {
    for (const map of [OBSERVE_MODULE_TO_DOMAIN, PLAN_MODULE_TO_DOMAIN, ACT_MODULE_TO_DOMAIN]) {
      for (const domain of Object.values(map)) {
        expect(UniversalDomain.safeParse(domain).success).toBe(true);
      }
    }
  });

  it('mapLegacyModuleId resolves known ids and returns null for unknown', () => {
    expect(mapLegacyModuleId('observe', 'topography')).toBe('topography');
    expect(mapLegacyModuleId('plan', 'water-management')).toBe('hydrology');
    expect(mapLegacyModuleId('act', 'tracker')).toBe('monitoring-records');
    expect(mapLegacyModuleId('observe', 'water-management')).toBeNull(); // wrong stage
    expect(mapLegacyModuleId('plan', 'not-a-module')).toBeNull();
  });

  // Observe is collision-free (7 modules -> 7 distinct domains). Plan and
  // Act each have legitimate collisions because multiple legacy modules fold
  // into the same universal domain (e.g. Plan's regeneration-monitor +
  // habitat-allocation + biodiversity-monitor all collapse to 'ecology').
  // The migration utility (see moduleDomainMigration.ts) warns + last-wins
  // on collision; step 3 of the refactor MUST handle these collisions
  // explicitly (merge strategy per store) to avoid data loss.
  it('Observe has no intra-stage domain collisions', () => {
    const targets = Object.values(OBSERVE_MODULE_TO_DOMAIN);
    expect(new Set(targets).size).toBe(targets.length);
  });

  it('documents Plan known collisions (data-loss surfaces for step 3)', () => {
    const groups = new Map<string, string[]>();
    for (const [moduleId, domain] of Object.entries(PLAN_MODULE_TO_DOMAIN)) {
      const arr = groups.get(domain) ?? [];
      arr.push(moduleId);
      groups.set(domain, arr);
    }
    const collisions: Record<string, string[]> = {};
    for (const [domain, mods] of groups) {
      if (mods.length > 1) collisions[domain] = mods.sort();
    }
    expect(collisions).toEqual({
      'access-circulation': ['dynamic-layering', 'zone-circulation'],
      'built-infrastructure': ['machinery', 'structures-subsystems'],
      'ecology': ['biodiversity-monitor', 'habitat-allocation', 'regeneration-monitor'],
    });
  });

  it('documents Act known collisions (data-loss surfaces for step 3)', () => {
    const groups = new Map<string, string[]>();
    for (const [moduleId, domain] of Object.entries(ACT_MODULE_TO_DOMAIN)) {
      const arr = groups.get(domain) ?? [];
      arr.push(moduleId);
      groups.set(domain, arr);
    }
    const collisions: Record<string, string[]> = {};
    for (const [domain, mods] of groups) {
      if (mods.length > 1) collisions[domain] = mods.sort();
    }
    expect(collisions).toEqual({
      'built-infrastructure': ['build', 'maintain'],
      'monitoring-records': ['review', 'tracker'],
    });
  });
});

describe('migrateByProjectModuleKeys', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('returns null when the input is not a byProject blob', () => {
    expect(migrateByProjectModuleKeys(null, 'observe')).toBeNull();
    expect(migrateByProjectModuleKeys(undefined, 'plan')).toBeNull();
    expect(migrateByProjectModuleKeys(42, 'act')).toBeNull();
    expect(migrateByProjectModuleKeys({ wrong: 'shape' }, 'observe')).toBeNull();
    expect(migrateByProjectModuleKeys({ byProject: 'not-an-object' }, 'observe')).toBeNull();
  });

  it('remaps known Observe module ids to their primary domains', () => {
    const persisted = {
      byProject: {
        'project-1': {
          'human-context': { foo: 1 },
          'topography': { foo: 2 },
          'earth-water-ecology': { foo: 3 },
        },
      },
    };
    const result = migrateByProjectModuleKeys<{ foo: number }>(persisted, 'observe');
    expect(result).not.toBeNull();
    expect(result!.byProject['project-1']).toEqual({
      'people-governance': { foo: 1 },
      'topography': { foo: 2 },
      'hydrology': { foo: 3 },
    });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('drops unknown module ids with a console.warn', () => {
    const persisted = {
      byProject: {
        'project-1': {
          'tracker': { v: 1 },
          'definitely-not-a-module': { v: 2 },
        },
      },
    };
    const result = migrateByProjectModuleKeys<{ v: number }>(persisted, 'act');
    expect(result).not.toBeNull();
    expect(result!.byProject['project-1']).toEqual({
      'monitoring-records': { v: 1 },
    });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]![0]).toContain('definitely-not-a-module');
  });

  it('preserves multiple projects independently', () => {
    const persisted = {
      byProject: {
        'p1': { 'water-management': { x: 'a' } },
        'p2': { 'plant-systems': { x: 'b' } },
      },
    };
    const result = migrateByProjectModuleKeys<{ x: string }>(persisted, 'plan');
    expect(result!.byProject).toEqual({
      'p1': { 'hydrology': { x: 'a' } },
      'p2': { 'plants-food': { x: 'b' } },
    });
  });

  it('handles empty byProject without erroring', () => {
    const result = migrateByProjectModuleKeys({ byProject: {} }, 'observe');
    expect(result).toEqual({ byProject: {} });
  });

  it('warns and last-wins on legitimate Plan collisions (data-loss surface)', () => {
    // regeneration-monitor + habitat-allocation + biodiversity-monitor all
    // map to 'ecology'. Without a merge strategy in the calling store, only
    // the last-iterated value survives. Step 3 must address this per store.
    const persisted = {
      byProject: {
        'p1': {
          'regeneration-monitor': { src: 'rm' },
          'habitat-allocation': { src: 'ha' },
          'biodiversity-monitor': { src: 'bm' },
        },
      },
    };
    const result = migrateByProjectModuleKeys<{ src: string }>(persisted, 'plan');
    expect(result!.byProject['p1']!['ecology']).toBeDefined();
    // exactly one entry survives under 'ecology'
    expect(Object.keys(result!.byProject['p1']!)).toEqual(['ecology']);
    // two collision warnings (3 colliding modules → 2 warns after the first)
    expect(warnSpy).toHaveBeenCalledTimes(2);
    expect(warnSpy.mock.calls.every(([msg]) => String(msg).includes('collision'))).toBe(true);
  });

  // ── mergeFn collision-merge path (step 3 cutover) ─────────────────────

  it('mergeFn: receives parts in canonical insertion order regardless of blob order', () => {
    // Persisted blob deliberately stores the colliding Plan/ecology modules
    // in non-canonical order — biodiversity-monitor first, regeneration-monitor
    // last. The mergeFn must still see them in the canonical map order
    // (regeneration → habitat → biodiversity), which is the order locked by
    // the Plan-collisions test above.
    const persisted = {
      byProject: {
        'p1': {
          'biodiversity-monitor': { src: 'bm' },
          'habitat-allocation': { src: 'ha' },
          'regeneration-monitor': { src: 'rm' },
        },
      },
    };
    const seenOrders: string[][] = [];
    const mergeFn = (_domain: string, parts: ReadonlyArray<{ moduleId: string; value: { src: string } }>) => {
      seenOrders.push(parts.map((p) => p.moduleId));
      return { src: parts.map((p) => p.value.src).join('+') };
    };
    const result = migrateByProjectModuleKeys<{ src: string }>(persisted, 'plan', mergeFn);
    expect(seenOrders).toEqual([
      ['regeneration-monitor', 'habitat-allocation', 'biodiversity-monitor'],
    ]);
    expect(result!.byProject['p1']!['ecology']).toEqual({ src: 'rm+ha+bm' });
  });

  it('mergeFn: return value is stored verbatim under the target domain', () => {
    const persisted = {
      byProject: {
        'p1': {
          'build': [1, 2],
          'maintain': [10, 20],
        },
      },
    };
    const mergeFn = (_d: string, parts: ReadonlyArray<{ moduleId: string; value: number[] }>) =>
      parts.flatMap((p) => p.value);
    const result = migrateByProjectModuleKeys<number[]>(persisted, 'act', mergeFn);
    expect(result!.byProject['p1']!['built-infrastructure']).toEqual([1, 2, 10, 20]);
  });

  it('mergeFn: single-part (no collision) bypasses mergeFn — value passes through', () => {
    let called = 0;
    const mergeFn = (_d: string, _parts: ReadonlyArray<{ moduleId: string; value: number }>) => {
      called += 1;
      return -1;
    };
    const persisted = {
      byProject: {
        'p1': {
          'water-management': 7,        // hydrology  — only Plan module mapping there
          'plant-systems': 8,           // plants-food — only Plan module mapping there
        },
      },
    };
    const result = migrateByProjectModuleKeys<number>(persisted, 'plan', mergeFn);
    expect(called).toBe(0);
    expect(result!.byProject['p1']).toEqual({ hydrology: 7, 'plants-food': 8 });
  });

  it('mergeFn: absent — preserves slice-1 last-wins + warn collision behaviour', () => {
    // Same colliding Plan/ecology fixture as the documented collision test
    // above; without mergeFn, only the last-iterated value survives and two
    // collision warnings fire.
    const persisted = {
      byProject: {
        'p1': {
          'regeneration-monitor': { src: 'rm' },
          'habitat-allocation': { src: 'ha' },
          'biodiversity-monitor': { src: 'bm' },
        },
      },
    };
    const result = migrateByProjectModuleKeys<{ src: string }>(persisted, 'plan');
    expect(Object.keys(result!.byProject['p1']!)).toEqual(['ecology']);
    expect(warnSpy.mock.calls.filter(([msg]) => String(msg).includes('collision'))).toHaveLength(2);
  });

  it('skips non-object module maps defensively', () => {
    const persisted = {
      byProject: {
        'p1': null,
        'p2': { 'tracker': { keep: true } },
      },
    } as unknown;
    const result = migrateByProjectModuleKeys<{ keep: boolean }>(persisted, 'act');
    expect(result!.byProject['p1']).toBeUndefined();
    expect(result!.byProject['p2']).toEqual({ 'monitoring-records': { keep: true } });
  });
});
