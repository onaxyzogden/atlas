import { describe, it, expect } from 'vitest';
import {
  resolveProjectObjectives,
  findPlanStratumObjectiveIn,
} from '../resolveProjectObjectives.js';
import {
  findUniversalObjective,
  SILVOPASTURE_SECONDARY_OBJECTIVES,
  RESIDENTIAL_ADDITIVE_OBJECTIVES,
  type SecondaryCatalogue,
} from '../../constants/plan/catalogues/index.js';
import { ck, obj, patch } from '../../constants/plan/catalogues/authoring.js';
import { detectCovenantBanned } from '../../constants/covenant/bannedTerms.js';

describe('resolveProjectObjectives - regenerative_farm (primary only)', () => {
  const r = resolveProjectObjectives({ primaryTypeId: 'regenerative_farm' });

  it('resolves 19 universal + 13 primary = 32 objectives', () => {
    // Universal resolves to 19 (20 authored − s4-direction excluded, 2026-06-17).
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

  it('resolves 19 + 13 + 5 additive = 37 objectives (res-s3-water-quality excluded)', () => {
    // Universal resolves to 19 (20 authored − s4-direction excluded, 2026-06-17).
    expect(r.objectives).toHaveLength(37);
  });

  it('applies all 14 residential patches (every target present)', () => {
    // 6 prior patches + the 4 Tier-1 (Stratum-2) Land-Reading patches added
    // 2026-06-16 (RES>U-S2.1 terrain, RES>U-S2.2 climate, RES>U-S2.3 ecology,
    // RES>U-S2.4 infrastructure - all universal targets, always present) + the
    // Tier-4 (Stratum-5) RES>U-S5.1 residential-access patch added 2026-06-17
    // (universal s5-access target, always present) + the 3 Tier-6 (Stratum-7)
    // Launch Preparation patches added 2026-06-18 (RES>U-S7.1 occupancy on
    // s7-phase1, RES>U-S7.2 domestic capital on s7-resource-plan, RES>U-S7.3
    // domestic risks on s7-risk-register - all universal targets, always present).
    expect(r.provenance.appliedPatchRefs).toHaveLength(14);
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
      additiveCount: 5,
      patchCount: 14,
    });
  });

  it('has no active tension for this pair', () => {
    expect(r.activeTensions).toEqual([]);
  });

  it('injects 6 items into s3-hydrology (5 + 6 = 11), stamped + gate concatenated', () => {
    const hydro = findPlanStratumObjectiveIn(r.objectives, 's3-hydrology');
    expect(hydro?.checklist).toHaveLength(11);
    const injected = hydro?.checklist.filter(
      (i) => i.expandedBySecondaryId === 'residential',
    );
    expect(injected).toHaveLength(6);
    expect(hydro?.completionGate).toContain('Hydrological survey complete');
    expect(hydro?.completionGate).toContain(
      'source potability status and treatment requirements defined for household use.',
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

describe('resolveProjectObjectives - canonical declaration config (regen + residential + silvopasture)', () => {
  // The load-bearing configuration for the 2026-06-16 Tier-0 / Declaration
  // restructure: Regenerative Farm (primary) + Residential + Silvopasture
  // (secondaries). Pins the restructured Stratum-1 set, the gating DAG
  // (0.1 -> [0.2 || 0.3 || 0.4] -> [0.5 || 0.6]) via universal-only
  // prerequisites, and the silvopasture enterprise-mix patch (0.5a, 8 -> 12).
  const r = resolveProjectObjectives({
    primaryTypeId: 'regenerative_farm',
    secondaryTypeIds: ['residential', 'silvopasture'],
  });

  const s1Ids = (): string[] =>
    r.objectives
      .filter((o) => o.stratumId === 's1-project-foundation')
      .map((o) => o.id);

  it('surfaces the six canonical declaration objectives in Stratum 1', () => {
    const ids = s1Ids();
    for (const id of [
      's1-vision', // 0.1
      's1-steward', // 0.2
      's1-boundaries', // 0.3
      's1-stakeholders', // 0.4
      'rf-s1-enterprise-mix', // 0.5
      'res-s1-household-needs', // 0.6
    ]) {
      expect(ids).toContain(id);
    }
  });

  it('also lands silvopasture livestock-intent in S1 -- 7 total, NOT part of the declaration set', () => {
    // The doc-level "6 declaration objectives" is the restructure SCOPE; the
    // silvopasture secondary independently contributes its own pre-existing S1
    // additive (silv-sec-s1-livestock-intent), so the resolved S1 stratum
    // carries SEVEN objectives for the full triad. (For regen + residential
    // alone it is six -- see the block above.)
    const ids = s1Ids();
    expect(ids).toContain('silv-sec-s1-livestock-intent');
    expect(ids).toHaveLength(7);
  });

  it('wires the declaration gating DAG via universal-only prerequisites', () => {
    const prereq = (id: string): readonly string[] =>
      findPlanStratumObjectiveIn(r.objectives, id)?.prerequisiteObjectiveIds ??
      [];
    // Roots: 0.1, 0.3, 0.4 are ungated entry points.
    expect(prereq('s1-vision')).toEqual([]);
    expect(prereq('s1-boundaries')).toEqual([]);
    expect(prereq('s1-stakeholders')).toEqual([]);
    // Gated objectives -- every prereq is a universal id (invariant-safe).
    expect(prereq('s1-steward')).toEqual(['s1-vision']);
    expect(prereq('rf-s1-enterprise-mix')).toEqual([
      's1-vision',
      's1-boundaries',
    ]);
    expect(prereq('res-s1-household-needs')).toEqual([
      's1-vision',
      's1-steward',
    ]);
  });

  it('patches rf-s1-enterprise-mix from 8 to 12 items (4 silvopasture-injected, stamped)', () => {
    const em = findPlanStratumObjectiveIn(r.objectives, 'rf-s1-enterprise-mix');
    expect(em?.checklist).toHaveLength(12);
    const injected =
      em?.checklist.filter(
        (i) => i.expandedBySecondaryId === 'silvopasture',
      ) ?? [];
    expect(injected).toHaveLength(4);
    expect(em?.completionGate).toContain(
      'Livestock integration strategy defined',
    );
  });

  it('applies every patch from both secondaries with no skips (14 residential + 15 silvopasture)', () => {
    // Both secondaries gained four Tier-1 (Stratum-2) Land-Reading patches on
    // 2026-06-16: residential 6 -> 10, silvopasture 8 -> 12. Residential gained a
    // further Tier-4 (Stratum-5) patch on 2026-06-17 (RES>U-S5.1 access -> 11).
    // Both then gained three Tier-6 (Stratum-7) Launch Preparation patches on
    // 2026-06-18 (RES>U-S7.1/2/3 and SILV>U-S7.1/2/3 onto universal s7-phase1 /
    // s7-resource-plan / s7-risk-register): residential 11 -> 14, silvopasture
    // 12 -> 15. Every target is present under the regen primary (universal s2/s5/s7
    // ids + rf-s2-land-health + rf-s2-landscape-context), so all 29 apply with
    // nothing skipped.
    expect(r.provenance.appliedPatchRefs).toHaveLength(29);
    expect(r.provenance.skippedPatches).toEqual([]);
  });

  // ---- Tier-1 (Stratum-2) Reception / Land-Reading restructure 2026-06-16 -------

  it('resolves EXACTLY the six spec Stratum-2 Land-Reading surveys for this config', () => {
    // The resolved Land-Reading set must be precisely the six spec surveys:
    // 1.1 terrain, 1.2 climate, 1.3 ecology, 1.4 infrastructure (universal), and
    // 1.5 land-health, 1.6 landscape-context (regen primary). No objective was
    // added or removed by the Tier-1 restructure - only reception framing +
    // per-type intent lens + the eight secondary patches.
    const s2 = r.objectives
      .filter((o) => o.stratumId === 's2-land-reading')
      .map((o) => o.id);
    expect(new Set(s2)).toEqual(
      new Set([
        's2-terrain',
        's2-climate',
        's2-ecology',
        's2-infrastructure',
        'rf-s2-land-health',
        'rf-s2-landscape-context',
      ]),
    );
  });

  it('applies all eight new Tier-1 S2 patches (4 silvopasture + 4 residential) onto the Land-Reading surveys', () => {
    // The smoke for the Stage-1 finish gate: every authored Tier-1 patch ref is
    // present in appliedPatchRefs and nothing was skipped for this triad.
    const applied = new Set(r.provenance.appliedPatchRefs);
    for (const ref of [
      'SILV>U-S2.1',
      'SILV>U-S2.3',
      'SILV>U-S2.4',
      'SILV>RF-S2.5',
      'RES>U-S2.1',
      'RES>U-S2.2',
      'RES>U-S2.3',
      'RES>U-S2.4',
    ]) {
      expect(applied.has(ref), ref).toBe(true);
    }
    expect(r.provenance.skippedPatches).toEqual([]);
  });

  // ---- Tier-2 (Stratum-3) Reception / Systems-Reading restructure 2026-06-16 ----

  it('resolves EXACTLY the five spec Stratum-3 reception surveys for this config', () => {
    // The resolved Systems-Reading set must be precisely the five spec surveys:
    // 2.1 hydrology, 2.2 soil, 2.3 nutrient cycling, 2.4 pest pressure, and the
    // new 2.5 livestock stock-water (silvopasture-secondary additive). No more.
    const s3 = r.objectives
      .filter((o) => o.stratumId === 's3-systems-reading')
      .map((o) => o.id);
    expect(new Set(s3)).toEqual(
      new Set([
        's3-hydrology',
        's3-soil',
        'rf-s3-nutrient-cycling',
        'rf-s3-pest-pressure',
        'silv-sec-s3-stock-water',
      ]),
    );
  });

  it('honours excludedFromResolution: forage-survey + water-quality are defined but not resolved', () => {
    // Both objectives are authored in their catalogues with the flag set...
    expect(
      SILVOPASTURE_SECONDARY_OBJECTIVES.some(
        (o) => o.id === 'silv-sec-s3-forage-survey' && o.excludedFromResolution,
      ),
    ).toBe(true);
    expect(
      RESIDENTIAL_ADDITIVE_OBJECTIVES.some(
        (o) => o.id === 'res-s3-water-quality' && o.excludedFromResolution,
      ),
    ).toBe(true);
    // ...but neither reaches the resolved spine (relocated/deferred per plan).
    const allIds = new Set(r.objectives.map((o) => o.id));
    expect(allIds.has('silv-sec-s3-forage-survey')).toBe(false);
    expect(allIds.has('res-s3-water-quality')).toBe(false);
  });

  it('Amanah: no advance-sale / subscription / yield-share wording in the resolved Stratum-3 set', () => {
    // Scan the resolved Stratum-3 active copy against the shared covenant union
    // (hard-ban + conditional). These are land-reading survey fields -- no scopeNote
    // is scanned here, so the full union is admitted with no forbidding-copy carve-out.
    const strings: string[] = [];
    for (const o of r.objectives.filter(
      (x) => x.stratumId === 's3-systems-reading',
    )) {
      strings.push(o.title, o.focusedQuestion);
      if (o.completionGate) strings.push(o.completionGate);
      if (o.actHandoff) strings.push(o.actHandoff);
      if (o.observeOutput) strings.push(o.observeOutput);
      if (o.buildsOnDisplay) strings.push(o.buildsOnDisplay);
      for (const row of o.intentLens ?? []) strings.push(row.text);
      for (const c of o.checklist) strings.push(c.label);
    }
    expect(strings.length).toBeGreaterThan(0);
    for (const s of strings) {
      expect(detectCovenantBanned(s), s).toBe(false);
    }
  });
});

describe('resolveProjectObjectives - skip-not-throw on a real pairing', () => {
  // agritourism now has an encoded primary catalogue (34 objectives), so it
  // resolves universal + agritourism-primary. residential is compatible (X) on
  // agritourism, so its catalogue layers in too, but residential's P0 patch
  // (RES>RF-S2.6) targets rf-s2-landscape-context - a regenfarm objective absent
  // under an agritourism primary (agritourism has its OWN ag-s2-landscape-context,
  // a different id) => that one patch is still skipped while the other thirteen land
  // (the 5 prior universal patches RES>U-S3.1/S3.2/S4.2/S4.3/S5.2 + the 4 Tier-1
  // universal s2 patches RES>U-S2.1..S2.4 + the Tier-4 universal RES>U-S5.1 patch
  // + the 3 Tier-6 universal s7 patches RES>U-S7.1..S7.3 are all on always-present
  // universal targets). The skip-not-throw behaviour holds even with the primary
  // encoded.
  const r = resolveProjectObjectives({
    primaryTypeId: 'agritourism',
    secondaryTypeIds: ['residential'],
  });

  it('resolves 19 universal + 34 agritourism primary + 5 residential additive = 58 objectives', () => {
    // Universal resolves to 19 (20 authored − s4-direction excluded, 2026-06-17).
    // The Tier-6 s7 patches inject checklist items, not objectives, so the count
    // is unchanged.
    expect(r.objectives).toHaveLength(58);
  });

  it('applies 13 patches and skips the regen-only landscape-context patch without throwing', () => {
    expect(r.provenance.appliedPatchRefs).toHaveLength(13);
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

  it('skips the regen-only landscape-context patch (wellness not encoded) and applies the 13 universal patches', () => {
    // Only RES>RF-S2.6 targets a regen-primary objective absent here; the other
    // 13 residential patches (5 prior + 4 Tier-1 s2 + 1 Tier-4 s5-access + 3 Tier-6
    // s7) all target universal ids.
    expect(r.provenance.appliedPatchRefs).toHaveLength(13);
    expect(r.provenance.skippedPatches).toHaveLength(1);
  });
});

describe('resolveProjectObjectives - N/A pair (homestead + residential)', () => {
  const r = resolveProjectObjectives({
    primaryTypeId: 'homestead',
    secondaryTypeIds: ['residential'],
  });

  it('loads homestead primary but not the incompatible secondary (19 universal + 15 homestead primary = 34)', () => {
    // Universal resolves to 19 (20 authored − s4-direction excluded, 2026-06-17).
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
    // Universal resolves to 19 (20 authored − s4-direction excluded, 2026-06-17).
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
