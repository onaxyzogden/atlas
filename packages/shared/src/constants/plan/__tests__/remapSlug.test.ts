// remapSlug.test.ts
//
// Property + rule tests for the Tier -> Stratum slug renumber helpers
// (remapSlug.ts) - the single source of truth shared by the catalogue
// constants and the apps/web persisted-store migrations.
//
// Guarantees under test (per the remapSlug.ts doc-comment):
//   - rule examples : the documented t{n} -> s{n+1} mappings, verbatim
//   - totality      : off-pattern ids pass through unchanged (never throws)
//   - tier-bijection: t0->s1 ... t6->s7, all 7 strata covered, no collisions
//   - injectivity   : distinct old slugs never collide on the new slug
//   - idempotency   : re-running on an already-migrated s{n} id is a no-op,
//                     proven CATALOGUE-WIDE against the live (already-renamed)
//                     PLAN_STRATA + every authored catalogue id, item, and ref

import { describe, it, expect } from 'vitest';
import { remapTierId, remapId, remapRef } from '../remapSlug.js';
import { PLAN_STRATA, PLAN_STRATUM_OBJECTIVES } from '../tierObjectives.js';
import {
  UNIVERSAL_PLAN_OBJECTIVES,
  REGEN_FARM_PRIMARY_OBJECTIVES,
  ECOVILLAGE_PRIMARY_OBJECTIVES,
  AGRITOURISM_PRIMARY_OBJECTIVES,
  RESIDENTIAL_ADDITIVE_OBJECTIVES,
  RESIDENTIAL_PATCHES,
} from '../catalogues/index.js';

const ALL_AUTHORED = [
  ...UNIVERSAL_PLAN_OBJECTIVES,
  ...REGEN_FARM_PRIMARY_OBJECTIVES,
  ...ECOVILLAGE_PRIMARY_OBJECTIVES,
  ...AGRITOURISM_PRIMARY_OBJECTIVES,
  ...RESIDENTIAL_ADDITIVE_OBJECTIVES,
];

// The seven canonical stratum ids (= PlanStratumId enum order).
const ALL_STRATUM_IDS = [
  's1-project-foundation',
  's2-land-reading',
  's3-systems-reading',
  's4-foundation-decisions',
  's5-system-design',
  's6-integration-design',
  's7-phasing-resourcing',
];

const isString = (v: unknown): v is string => typeof v === 'string';

describe('remapTierId - rule examples + bare token', () => {
  it('maps the documented full-slug examples', () => {
    expect(remapTierId('t0-project-foundation')).toBe('s1-project-foundation');
    expect(remapTierId('t6-phasing-resourcing')).toBe('s7-phasing-resourcing');
  });

  it('maps a bare t{n} token (field-action fixture shape)', () => {
    expect(remapTierId('t0')).toBe('s1');
    expect(remapTierId('t6')).toBe('s7');
  });

  it('passes an OLOS {domain}--{stage} id through unchanged', () => {
    expect(remapTierId('vision-intent--plan')).toBe('vision-intent--plan');
  });
});

describe('remapId - first-token rewrite, prefix/suffix preserved', () => {
  it('maps the documented examples', () => {
    expect(remapId('t0-vision')).toBe('s1-vision');
    expect(remapId('t0-vision-c1')).toBe('s1-vision-c1');
    expect(remapId('rf-t1-landscape-context')).toBe('rf-s2-landscape-context');
    expect(remapId('rf-t1-landscape-context-pres-1')).toBe(
      'rf-s2-landscape-context-pres-1',
    );
  });

  it('passes an OLOS namespace id through unchanged', () => {
    expect(remapId('vision-intent--plan--1')).toBe('vision-intent--plan--1');
  });

  it('rewrites only the FIRST t{n} token (real ids carry exactly one)', () => {
    expect(remapId('t0-vision-t2-note')).toBe('s1-vision-t2-note');
  });
});

describe('remapRef - uppercase -T{n}. segment', () => {
  it('maps the documented examples', () => {
    expect(remapRef('U-T0.1')).toBe('U-S1.1');
    expect(remapRef('RF-T1.6')).toBe('RF-S2.6');
    expect(remapRef('EV-T6.9')).toBe('EV-S7.9');
    expect(remapRef('RES>U-T3.2')).toBe('RES>U-S4.2');
  });
});

describe('totality - off-pattern ids pass through (never throws)', () => {
  const offPattern = [
    'regenerative_farm',
    'residential',
    'ecovillage',
    'agritourism',
    'tension-3',
    'vision-intent--plan',
    'plan-develop-plan', // a legacyCardSectionId
    '', // empty string
    's1-vision', // already-migrated
  ];

  it('remapId and remapTierId leave off-pattern ids untouched', () => {
    for (const id of offPattern) {
      expect(remapId(id), id).toBe(id);
      expect(remapTierId(id), id).toBe(id);
    }
  });

  it('remapRef leaves an already-migrated or unrelated ref untouched', () => {
    expect(remapRef('U-S1.1')).toBe('U-S1.1');
    expect(remapRef('plain-string')).toBe('plain-string');
  });
});

describe('tier-bijection - t0..t6 -> s1..s7', () => {
  it('remapTierId covers all 7 strata with distinct, correctly-numbered output', () => {
    const tokens = Array.from({ length: 7 }, (_v, n) => `t${n}`);
    const mapped = tokens.map(remapTierId);
    expect(mapped).toEqual(['s1', 's2', 's3', 's4', 's5', 's6', 's7']);
    expect(new Set(mapped).size).toBe(7); // injective: no collisions
  });

  it('remapId covers all 7 strata for full objective slugs', () => {
    const old = Array.from({ length: 7 }, (_v, n) => `t${n}-decision`);
    expect(old.map(remapId)).toEqual([
      's1-decision',
      's2-decision',
      's3-decision',
      's4-decision',
      's5-decision',
      's6-decision',
      's7-decision',
    ]);
  });

  it('remapRef covers all 7 strata for refs', () => {
    const old = Array.from({ length: 7 }, (_v, n) => `U-T${n}.1`);
    expect(old.map(remapRef)).toEqual([
      'U-S1.1',
      'U-S2.1',
      'U-S3.1',
      'U-S4.1',
      'U-S5.1',
      'U-S6.1',
      'U-S7.1',
    ]);
  });
});

describe('injectivity - distinct old slugs never collide', () => {
  it('a multi-prefix old-slug set remaps without collisions', () => {
    const old = [
      ...Array.from({ length: 7 }, (_v, n) => `t${n}-x`),
      ...Array.from({ length: 7 }, (_v, n) => `rf-t${n}-x`),
      ...Array.from({ length: 7 }, (_v, n) => `ev-t${n}-x`),
      ...Array.from({ length: 7 }, (_v, n) => `t${n}-x-c1`),
    ];
    expect(new Set(old).size).toBe(old.length); // inputs are distinct
    const mapped = old.map(remapId);
    expect(new Set(mapped).size).toBe(old.length); // outputs stay distinct
  });

  it('is idempotent: remap(remap(x)) === remap(x)', () => {
    for (const id of ['t0-vision', 'rf-t1-landscape-context-pres-1', 't6']) {
      expect(remapId(remapId(id))).toBe(remapId(id));
      expect(remapTierId(remapTierId(id))).toBe(remapTierId(id));
    }
    expect(remapRef(remapRef('U-T0.1'))).toBe(remapRef('U-T0.1'));
  });
});

describe('catalogue-wide - live catalogue is fully migrated + stable under re-remap', () => {
  it('all 7 strata are covered by the authored catalogues', () => {
    const present = new Set(ALL_AUTHORED.map((o) => o.stratumId));
    expect(present).toEqual(new Set(ALL_STRATUM_IDS));
  });

  it('PLAN_STRATA is the 7 ordered strata (ordinals 1..7), stable under remap', () => {
    expect(PLAN_STRATA.map((s) => s.id)).toEqual(ALL_STRATUM_IDS);
    expect(PLAN_STRATA.map((s) => s.ordinal)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    for (const stratum of PLAN_STRATA) {
      expect(stratum.id, stratum.id).toMatch(/^s[1-7]-/);
      expect(remapTierId(stratum.id), stratum.id).toBe(stratum.id);
      expect(remapId(stratum.id), stratum.id).toBe(stratum.id);
    }
  });

  it('every authored objective id + stratumId is already s{n} (no double-bump)', () => {
    for (const o of ALL_AUTHORED) {
      expect(remapId(o.id), o.id).toBe(o.id);
      expect(remapTierId(o.stratumId), o.id).toBe(o.stratumId);
    }
  });

  it('every authored + skeleton checklist item id is stable under remapId', () => {
    const itemIds = [...ALL_AUTHORED, ...PLAN_STRATUM_OBJECTIVES].flatMap((o) =>
      o.checklist.map((i) => i.id),
    );
    for (const id of itemIds) {
      expect(remapId(id), id).toBe(id);
    }
  });

  it('every authored ref + patch ref is stable under remapRef', () => {
    const refs = [
      ...ALL_AUTHORED.map((o) => o.ref).filter(isString),
      ...RESIDENTIAL_PATCHES.map((p) => p.ref).filter(isString),
    ];
    expect(refs.length).toBeGreaterThan(0);
    for (const ref of refs) {
      expect(remapRef(ref), ref).toBe(ref);
    }
  });

  it('every injected patch item id is stable under remapId', () => {
    const ids = RESIDENTIAL_PATCHES.flatMap((p) =>
      p.injectedItems.map((i) => i.id),
    );
    for (const id of ids) {
      expect(remapId(id), id).toBe(id);
    }
  });
});
