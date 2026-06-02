import { describe, it, expect } from 'vitest';
import {
  resolveProjectObjectives,
  findPlanStratumObjectiveIn,
} from '../resolveProjectObjectives.js';
import {
  findUniversalObjective,
  type SecondaryCatalogue,
} from '../../constants/plan/catalogues/index.js';
import { ck, obj, patch } from '../../constants/plan/catalogues/authoring.js';

describe('resolveProjectObjectives - regenerative_farm (primary only)', () => {
  const r = resolveProjectObjectives({ primaryTypeId: 'regenerative_farm' });

  it('resolves 19 universal + 13 primary = 32 objectives', () => {
    expect(r.objectives).toHaveLength(32);
  });

  it('emits only universal + primary sources, no secondary', () => {
    const sources = new Set(r.objectives.map((o) => o.source));
    expect(sources).toEqual(new Set(['universal', 'primary']));
  });

  it('has no tensions, no patches, no dedup for a bare primary', () => {
    expect(r.activeTensions).toEqual([]);
    expect(r.provenance.appliedPatchRefs).toEqual([]);
    expect(r.provenance.skippedPatches).toEqual([]);
    expect(r.provenance.dedupedObjectiveIds).toEqual([]);
  });

  it('sorts by stratum ordinal: first objective in S1, last in S7', () => {
    expect(r.objectives[0]?.stratumId).toBe('s1-project-foundation');
    expect(r.objectives.at(-1)?.stratumId).toBe('s7-phasing-resourcing');
  });

  it('orders universal before primary within a shared tier', () => {
    const s1 = r.objectives.filter((o) => o.stratumId === 's1-project-foundation');
    const firstPrimaryIdx = s1.findIndex((o) => o.source === 'primary');
    const lastUniversalIdx = s1.map((o) => o.source).lastIndexOf('universal');
    expect(lastUniversalIdx).toBeLessThan(firstPrimaryIdx);
  });
});

describe('resolveProjectObjectives - regenerative_farm + residential (M, tension-free)', () => {
  const r = resolveProjectObjectives({
    primaryTypeId: 'regenerative_farm',
    secondaryTypeIds: ['residential'],
  });

  it('resolves 19 + 13 + 6 additive = 38 objectives', () => {
    expect(r.objectives).toHaveLength(38);
  });

  it('applies all 5 residential patches (every target present)', () => {
    expect(r.provenance.appliedPatchRefs).toHaveLength(5);
    expect(r.provenance.skippedPatches).toEqual([]);
  });

  it('records the residential secondary flag accurately', () => {
    const flag = r.provenance.secondaryFlags.find(
      (f) => f.secondaryTypeId === 'residential',
    );
    expect(flag).toMatchObject({
      secondaryTypeId: 'residential',
      relation: 'M',
      loaded: true,
      encoded: true,
      additiveCount: 6,
      patchCount: 5,
    });
  });

  it('has no active tension for this pair', () => {
    expect(r.activeTensions).toEqual([]);
  });

  it('injects 2 items into s3-hydrology (5 + 2 = 7), stamped + gate concatenated', () => {
    const hydro = findPlanStratumObjectiveIn(r.objectives, 's3-hydrology');
    expect(hydro?.checklist).toHaveLength(7);
    const injected = hydro?.checklist.filter(
      (i) => i.expandedBySecondaryId === 'residential',
    );
    expect(injected).toHaveLength(2);
    expect(hydro?.completionGate).toContain('Hydrological survey complete');
    expect(hydro?.completionGate).toContain(
      'Domestic water demand confirmed against available yield.',
    );
  });

  it('lands P0 on the regen primary objective rf-s2-landscape-context (6 + 1 = 7)', () => {
    const lc = findPlanStratumObjectiveIn(r.objectives, 'rf-s2-landscape-context');
    expect(lc?.checklist).toHaveLength(7);
    expect(
      lc?.checklist.some(
        (i) =>
          i.id === 'rf-s2-landscape-context-pres-1' &&
          i.expandedBySecondaryId === 'residential',
      ),
    ).toBe(true);
  });

  it('does not mutate the shared catalogue constants', () => {
    // The resolved copy gained items; the source constant must be untouched.
    expect(findUniversalObjective('s3-hydrology')?.checklist).toHaveLength(5);
  });
});

describe('resolveProjectObjectives - skip-not-throw on a real pairing', () => {
  // agritourism now has an encoded primary catalogue (29 objectives), so it
  // resolves universal + agritourism-primary. residential is compatible (X) on
  // agritourism, so its catalogue layers in too, but residential's P0 patch
  // targets rf-s2-landscape-context - a regenfarm objective absent under an
  // agritourism primary (agritourism has its OWN ag-s2-landscape-context, a
  // different id) => P0 is still skipped, P1-P4 land. The skip-not-throw
  // behaviour holds even with the primary encoded.
  const r = resolveProjectObjectives({
    primaryTypeId: 'agritourism',
    secondaryTypeIds: ['residential'],
  });

  it('resolves 19 universal + 29 agritourism primary + 6 residential additive = 54 objectives', () => {
    expect(r.objectives).toHaveLength(54);
  });

  it('applies 4 patches and skips P0 without throwing', () => {
    expect(r.provenance.appliedPatchRefs).toHaveLength(4);
    expect(r.provenance.skippedPatches).toHaveLength(1);
    expect(r.provenance.skippedPatches[0]).toMatchObject({
      secondaryTypeId: 'residential',
      targetObjectiveId: 'rf-s2-landscape-context',
      reason: 'missing-target',
    });
  });

  it('surfaces the residential+agritourism tension (tension-9)', () => {
    expect(r.activeTensions.map((t) => t.id)).toContain('tension-9');
  });
});

describe('resolveProjectObjectives - wellness + residential', () => {
  const r = resolveProjectObjectives({
    primaryTypeId: 'wellness',
    secondaryTypeIds: ['residential'],
  });

  it('surfaces the residential+wellness tension (tension-10)', () => {
    expect(r.activeTensions.map((t) => t.id)).toContain('tension-10');
  });

  it('skips P0 (wellness not encoded) and applies the 4 universal patches', () => {
    expect(r.provenance.appliedPatchRefs).toHaveLength(4);
    expect(r.provenance.skippedPatches).toHaveLength(1);
  });
});

describe('resolveProjectObjectives - N/A pair (homestead + residential)', () => {
  const r = resolveProjectObjectives({
    primaryTypeId: 'homestead',
    secondaryTypeIds: ['residential'],
  });

  it('loads homestead primary but not the incompatible secondary (19 universal + 15 homestead primary = 34)', () => {
    expect(r.objectives).toHaveLength(34);
    expect(
      r.objectives.every(
        (o) => o.source === 'universal' || o.source === 'primary',
      ),
    ).toBe(true);
  });

  it('records the secondary as not loaded with relation NA', () => {
    const flag = r.provenance.secondaryFlags.find(
      (f) => f.secondaryTypeId === 'residential',
    );
    expect(flag).toMatchObject({
      relation: 'NA',
      loaded: false,
      additiveCount: 0,
      patchCount: 0,
    });
  });

  it('applies no patches and has no tension', () => {
    expect(r.provenance.appliedPatchRefs).toEqual([]);
    expect(r.activeTensions).toEqual([]);
  });
});

describe('resolveProjectObjectives - dedup by objective id (synthetic)', () => {
  // A synthetic residential additive objective colliding with a universal id.
  const dup = obj({
    id: 's3-soil',
    stratumId: 's3-systems-reading',
    ref: 'RES-S3.2',
    source: 'secondary',
    sourceTypeId: 'residential',
    secondaryClass: 'additive',
    title: 'Duplicate soil objective',
    focusedQuestion: 'Does this collide?',
    checklist: [ck('synthetic-dup-1', 'placeholder item')],
    completionGate: 'n/a',
    actHandoff: 'n/a',
  });

  const r = resolveProjectObjectives(
    { primaryTypeId: 'regenerative_farm', secondaryTypeIds: ['residential'] },
    {
      getSecondaryCatalogue: (id): SecondaryCatalogue | undefined =>
        id === 'residential' ? { additive: [dup], patches: [] } : undefined,
    },
  );

  it('drops the duplicate, records it, and keeps the count at 32', () => {
    expect(r.provenance.dedupedObjectiveIds).toContain('s3-soil');
    expect(r.objectives).toHaveLength(32);
    const flag = r.provenance.secondaryFlags.find(
      (f) => f.secondaryTypeId === 'residential',
    );
    expect(flag?.additiveCount).toBe(0);
  });

  it('keeps the original universal s3-soil (first occurrence wins)', () => {
    const soil = findPlanStratumObjectiveIn(r.objectives, 's3-soil');
    expect(soil?.source).toBe('universal');
  });
});

describe('resolveProjectObjectives - missing patch target (synthetic)', () => {
  const orphanPatch = patch({
    secondaryTypeId: 'residential',
    targetObjectiveId: 'does-not-exist-xyz',
    ref: 'RES>U-S10.9',
    injectedItems: [ck('orphan-1', 'item for a missing target')],
  });

  const r = resolveProjectObjectives(
    { primaryTypeId: 'regenerative_farm', secondaryTypeIds: ['residential'] },
    {
      getSecondaryCatalogue: (id): SecondaryCatalogue | undefined =>
        id === 'residential' ? { additive: [], patches: [orphanPatch] } : undefined,
    },
  );

  it('skips the patch and records it without throwing', () => {
    expect(r.provenance.skippedPatches).toHaveLength(1);
    expect(r.provenance.skippedPatches[0]).toMatchObject({
      targetObjectiveId: 'does-not-exist-xyz',
      reason: 'missing-target',
      secondaryTypeId: 'residential',
    });
    expect(r.provenance.appliedPatchRefs).toEqual([]);
  });
});

describe('resolveProjectObjectives - determinism', () => {
  it('is referentially pure: identical inputs yield deep-equal output', () => {
    const a = resolveProjectObjectives({
      primaryTypeId: 'regenerative_farm',
      secondaryTypeIds: ['residential'],
    });
    const b = resolveProjectObjectives({
      primaryTypeId: 'regenerative_farm',
      secondaryTypeIds: ['residential'],
    });
    expect(a).toEqual(b);
  });

  it('normalises secondaries: dedupes and drops self-as-secondary', () => {
    const r = resolveProjectObjectives({
      primaryTypeId: 'regenerative_farm',
      secondaryTypeIds: ['residential', 'residential', 'regenerative_farm'],
    });
    expect(r.secondaryTypeIds).toEqual(['residential']);
  });
});
