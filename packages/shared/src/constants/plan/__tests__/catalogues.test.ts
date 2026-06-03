import { describe, it, expect } from 'vitest';
import {
  PlanStratumObjectiveSchema,
  PatchRecordSchema,
  type PlanStratumObjective,
} from '../../../schemas/plan/planStratumObjective.schema.js';
import {
  UNIVERSAL_PLAN_OBJECTIVES,
  REGEN_FARM_PRIMARY_OBJECTIVES,
  ECOVILLAGE_PRIMARY_OBJECTIVES,
  AGRITOURISM_PRIMARY_OBJECTIVES,
  RESIDENTIAL_ADDITIVE_OBJECTIVES,
  RESIDENTIAL_PATCHES,
  WELLNESS_PRIMARY_OBJECTIVES,
  WELLNESS_SECONDARY_OBJECTIVES,
  SILVOPASTURE_PRIMARY_OBJECTIVES,
  SILVOPASTURE_SECONDARY_OBJECTIVES,
  SILVOPASTURE_SECONDARY_PATCHES,
  ORCHARD_PRIMARY_OBJECTIVES,
  ORCHARD_SECONDARY_OBJECTIVES,
  ORCHARD_SECONDARY_PATCHES,
  NURSERY_SECONDARY_OBJECTIVES,
  HOMESTEAD_PRIMARY_OBJECTIVES,
  EDUCATION_PRIMARY_OBJECTIVES,
  CONSERVATION_PRIMARY_OBJECTIVES,
  MARKET_GARDEN_PRIMARY_OBJECTIVES,
  OFF_GRID_PRIMARY_OBJECTIVES,
  LIVESTOCK_PRIMARY_OBJECTIVES,
} from '../catalogues/index.js';
import {
  resolveProjectObjectives,
  findPlanStratumObjectiveIn,
} from '../../../relationships/resolveProjectObjectives.js';

const ALL_AUTHORED: readonly PlanStratumObjective[] = [
  ...UNIVERSAL_PLAN_OBJECTIVES,
  ...REGEN_FARM_PRIMARY_OBJECTIVES,
  ...ECOVILLAGE_PRIMARY_OBJECTIVES,
  ...AGRITOURISM_PRIMARY_OBJECTIVES,
  ...RESIDENTIAL_ADDITIVE_OBJECTIVES,
  ...WELLNESS_PRIMARY_OBJECTIVES,
  ...WELLNESS_SECONDARY_OBJECTIVES,
  ...NURSERY_SECONDARY_OBJECTIVES,
  ...SILVOPASTURE_PRIMARY_OBJECTIVES,
  ...SILVOPASTURE_SECONDARY_OBJECTIVES,
  ...ORCHARD_PRIMARY_OBJECTIVES,
  ...ORCHARD_SECONDARY_OBJECTIVES,
  ...HOMESTEAD_PRIMARY_OBJECTIVES,
  ...EDUCATION_PRIMARY_OBJECTIVES,
  ...CONSERVATION_PRIMARY_OBJECTIVES,
  ...MARKET_GARDEN_PRIMARY_OBJECTIVES,
  ...OFF_GRID_PRIMARY_OBJECTIVES,
  ...LIVESTOCK_PRIMARY_OBJECTIVES,
];

const OBJECTIVE_REF = /^(U|RF|RES|EV|AG|WELL|SILV|ORCH|NRS|HMS|EDU|CON|MGD|OFG|LVS)-S[1-7]\.\d+$/;

const PATCH_REF = /^(RES|SILV|ORCH)>(U|RF)-S[1-7]\.\d+$/;

describe('catalogue conformance - schema validity', () => {
  it('every authored objective parses via PlanStratumObjectiveSchema', () => {
    for (const o of ALL_AUTHORED) {
      // .parse throws a descriptive ZodError naming the offending objective.
      expect(() => PlanStratumObjectiveSchema.parse(o), o.id).not.toThrow();
    }
  });

  it('every residential patch parses via PatchRecordSchema', () => {
    for (const p of RESIDENTIAL_PATCHES) {
      expect(() => PatchRecordSchema.parse(p), p.ref).not.toThrow();
    }
  });
});

describe('catalogue conformance - authoring rubric (Standards v1.4)', () => {
  it('every objective has 5-15 checklist items', () => {
    for (const o of ALL_AUTHORED) {
      expect(o.checklist.length, o.id).toBeGreaterThanOrEqual(5);
      expect(o.checklist.length, o.id).toBeLessThanOrEqual(15);
    }
  });

  it('every objective carries a completion gate and act handoff', () => {
    for (const o of ALL_AUTHORED) {
      expect(o.completionGate?.trim(), o.id).toBeTruthy();
      expect(o.actHandoff?.trim(), o.id).toBeTruthy();
    }
  });

  it('every objective ref matches the Authoring Standards format', () => {
    for (const o of ALL_AUTHORED) {
      expect(o.ref, o.id).toMatch(OBJECTIVE_REF);
    }
  });

  it('every patch ref matches the cross-reference format', () => {
    for (const p of RESIDENTIAL_PATCHES) {
      expect(p.ref, p.targetObjectiveId).toMatch(PATCH_REF);
    }
  });

  it('every injected patch item id follows the <target>-pres-<n> rubric', () => {
    for (const p of RESIDENTIAL_PATCHES) {
      for (const item of p.injectedItems) {
        expect(item.id, item.id).toMatch(
          new RegExp(`^${p.targetObjectiveId}-pres-\\d+$`),
        );
      }
    }
  });
});

describe('catalogue conformance - source/layer discipline', () => {
  it('universal objectives are source=universal with no sourceTypeId', () => {
    for (const o of UNIVERSAL_PLAN_OBJECTIVES) {
      expect(o.source, o.id).toBe('universal');
      expect(o.sourceTypeId, o.id).toBeUndefined();
    }
  });

  it('regen primary objectives are source=primary, sourceTypeId=regenerative_farm', () => {
    for (const o of REGEN_FARM_PRIMARY_OBJECTIVES) {
      expect(o.source, o.id).toBe('primary');
      expect(o.sourceTypeId, o.id).toBe('regenerative_farm');
    }
  });

  it('ecovillage primary objectives are source=primary, sourceTypeId=ecovillage', () => {
    for (const o of ECOVILLAGE_PRIMARY_OBJECTIVES) {
      expect(o.source, o.id).toBe('primary');
      expect(o.sourceTypeId, o.id).toBe('ecovillage');
    }
  });

  it('agritourism primary objectives are source=primary, sourceTypeId=agritourism', () => {
    for (const o of AGRITOURISM_PRIMARY_OBJECTIVES) {
      expect(o.source, o.id).toBe('primary');
      expect(o.sourceTypeId, o.id).toBe('agritourism');
    }
  });

  it('residential additive objectives are source=secondary/additive, sourceTypeId=residential', () => {
    for (const o of RESIDENTIAL_ADDITIVE_OBJECTIVES) {
      expect(o.source, o.id).toBe('secondary');
      expect(o.sourceTypeId, o.id).toBe('residential');
      expect(o.secondaryClass, o.id).toBe('additive');
    }
  });

  it('wellness primary objectives are source=primary, sourceTypeId=wellness', () => {
    for (const o of WELLNESS_PRIMARY_OBJECTIVES) {
      expect(o.source, o.id).toBe('primary');
      expect(o.sourceTypeId, o.id).toBe('wellness');
    }
  });

  it('silvopasture primary objectives are source=primary, sourceTypeId=silvopasture', () => {
    for (const o of SILVOPASTURE_PRIMARY_OBJECTIVES) {
      expect(o.source, o.id).toBe('primary');
      expect(o.sourceTypeId, o.id).toBe('silvopasture');
    }
  });

  it('orchard primary objectives are source=primary, sourceTypeId=orchard_food_forest', () => {
    for (const o of ORCHARD_PRIMARY_OBJECTIVES) {
      expect(o.source, o.id).toBe('primary');
      expect(o.sourceTypeId, o.id).toBe('orchard_food_forest');
    }
  });

  it('wellness secondary objectives are source=secondary/additive, sourceTypeId=wellness', () => {
    // Authored under the 2026-05-30 "derive + author" override (the v1.0 source
    // has no secondary section). Additive only - no patch records.
    for (const o of WELLNESS_SECONDARY_OBJECTIVES) {
      expect(o.source, o.id).toBe('secondary');
      expect(o.sourceTypeId, o.id).toBe('wellness');
      expect(o.secondaryClass, o.id).toBe('additive');
    }
  });

  it('nursery secondary objectives are source=secondary/additive, sourceTypeId=nursery', () => {
    for (const o of NURSERY_SECONDARY_OBJECTIVES) {
      expect(o.source, o.id).toBe('secondary');
      expect(o.sourceTypeId, o.id).toBe('nursery');
      expect(o.secondaryClass, o.id).toBe('additive');
    }
  });

  it('silvopasture secondary objectives are source=secondary/additive, sourceTypeId=silvopasture', () => {
    for (const o of SILVOPASTURE_SECONDARY_OBJECTIVES) {
      expect(o.source, o.id).toBe('secondary');
      expect(o.sourceTypeId, o.id).toBe('silvopasture');
      expect(o.secondaryClass, o.id).toBe('additive');
    }
  });

  it('homestead primary objectives are source=primary, sourceTypeId=homestead', () => {
    for (const o of HOMESTEAD_PRIMARY_OBJECTIVES) {
      expect(o.source, o.id).toBe('primary');
      expect(o.sourceTypeId, o.id).toBe('homestead');
    }
  });

  it('education primary objectives are source=primary, sourceTypeId=education', () => {
    for (const o of EDUCATION_PRIMARY_OBJECTIVES) {
      expect(o.source, o.id).toBe('primary');
      expect(o.sourceTypeId, o.id).toBe('education');
    }
  });

  it('conservation primary objectives are source=primary, sourceTypeId=conservation', () => {
    for (const o of CONSERVATION_PRIMARY_OBJECTIVES) {
      expect(o.source, o.id).toBe('primary');
      expect(o.sourceTypeId, o.id).toBe('conservation');
    }
  });

  it('market garden primary objectives are source=primary, sourceTypeId=market_garden', () => {
    for (const o of MARKET_GARDEN_PRIMARY_OBJECTIVES) {
      expect(o.source, o.id).toBe('primary');
      expect(o.sourceTypeId, o.id).toBe('market_garden');
    }
  });

  it('off-grid primary objectives are source=primary, sourceTypeId=off_grid', () => {
    for (const o of OFF_GRID_PRIMARY_OBJECTIVES) {
      expect(o.source, o.id).toBe('primary');
      expect(o.sourceTypeId, o.id).toBe('off_grid');
    }
  });

  it('livestock primary objectives are source=primary, sourceTypeId=livestock_operation', () => {
    for (const o of LIVESTOCK_PRIMARY_OBJECTIVES) {
      expect(o.source, o.id).toBe('primary');
      expect(o.sourceTypeId, o.id).toBe('livestock_operation');
    }
  });
});

describe('catalogue conformance - global id uniqueness', () => {
  it('authored objective ids are globally unique across catalogues', () => {
    const ids = ALL_AUTHORED.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all checklist item ids in the regen+residential resolved set are globally unique', () => {
    // The planTierStore.toProgressMap flatten requires this (injected items
    // included) or two items would collapse onto one progress key.
    const { objectives } = resolveProjectObjectives({
      primaryTypeId: 'regenerative_farm',
      secondaryTypeIds: ['residential'],
    });
    const itemIds = objectives.flatMap((o) => o.checklist.map((i) => i.id));
    expect(new Set(itemIds).size).toBe(itemIds.length);

    const objIds = objectives.map((o) => o.id);
    expect(new Set(objIds).size).toBe(objIds.length);
  });
});

describe('catalogue conformance - patch targets + bridge ids', () => {
  const { objectives } = resolveProjectObjectives({
    primaryTypeId: 'regenerative_farm',
    secondaryTypeIds: ['residential'],
  });

  it('every residential patch target exists in the regen+residential resolved set', () => {
    for (const p of RESIDENTIAL_PATCHES) {
      expect(
        findPlanStratumObjectiveIn(objectives, p.targetObjectiveId),
        p.targetObjectiveId,
      ).toBeDefined();
    }
  });

  it('preserves the 3 visionProfileToChecklist bridge ids on s1-vision', () => {
    // s1-vision-c1/c2/c3 are written by the bridge; they MUST exist or seeded
    // Tier-0 progress is orphaned. (s1-stewardship-c1/c2 are intentionally NOT
    // in the per-type model - RegenFarm v1.3 has external stakeholders, not an
    // internal-team T0 objective; those two bridge mappings are inert for
    // per-type projects and only resolve against the legacy fallback skeleton.)
    const vision = findPlanStratumObjectiveIn(objectives, 's1-vision');
    const itemIds = new Set(vision?.checklist.map((i) => i.id));
    expect(itemIds.has('s1-vision-c1')).toBe(true);
    expect(itemIds.has('s1-vision-c2')).toBe(true);
    expect(itemIds.has('s1-vision-c3')).toBe(true);
  });

  it('carries the s1-vision-c4 secondary-type answerSpec recap item', () => {
    // c4 is answerSpec-driven (projectSecondaryType over
    // projectTypeRecord.secondaryTypeIds); optional, and partitioned into the
    // "Purpose & intent" decision group alongside the primary-type c1.
    const vision = findPlanStratumObjectiveIn(objectives, 's1-vision');
    const c4 = vision?.checklist.find((i) => i.id === 's1-vision-c4');
    expect(c4).toBeDefined();
    expect(c4?.optional).toBe(true);
    expect(c4?.answerSpec?.optionSetId).toBe('projectSecondaryType');
    expect(c4?.answerSpec?.sourceField).toBe(
      'projectTypeRecord.secondaryTypeIds',
    );
  });

  it('carries the s1-vision-steward stewardship answerSpec recap item', () => {
    // s1-vision-steward surfaces the wizard Team-step roster (primary steward +
    // co-stewards) read-only on per-type projects, since the legacy
    // s1-stewardship objective only exists in the fallback skeleton. Optional,
    // steward fieldType, partitioned into the "Purpose & intent" group.
    const vision = findPlanStratumObjectiveIn(objectives, 's1-vision');
    const steward = vision?.checklist.find((i) => i.id === 's1-vision-steward');
    expect(steward).toBeDefined();
    expect(steward?.optional).toBe(true);
    expect(steward?.answerSpec?.fieldType).toBe('steward');
    expect(steward?.answerSpec?.sourceField).toEqual([
      'team.primarySteward',
      'team.coStewards',
    ]);
  });
});

describe('catalogue conformance - ecovillage primary resolution', () => {
  const { objectives } = resolveProjectObjectives({
    primaryTypeId: 'ecovillage',
    secondaryTypeIds: [],
  });

  it('resolves to 50 objectives (19 universal + 31 primary)', () => {
    // The source header table reads "Primary: 29", but the per-tier sub-headers
    // and the 50-total both confirm 31. This locks the corrected count.
    expect(ECOVILLAGE_PRIMARY_OBJECTIVES.length).toBe(31);
    expect(objectives.length).toBe(50);
  });

  it('has globally unique checklist item ids (toProgressMap invariant)', () => {
    const itemIds = objectives.flatMap((o) => o.checklist.map((i) => i.id));
    expect(new Set(itemIds).size).toBe(itemIds.length);
    const objIds = objectives.map((o) => o.id);
    expect(new Set(objIds).size).toBe(objIds.length);
  });

  it('every ecovillage ref is unique within the primary set', () => {
    // Guards the source's duplicate "6.6" (adaptive management), reassigned to
    // EV-S7.9 in ecovillage.ts.
    const refs = ECOVILLAGE_PRIMARY_OBJECTIVES.map((o) => o.ref);
    expect(new Set(refs).size).toBe(refs.length);
  });
});

describe('catalogue conformance - agritourism primary resolution', () => {
  const { objectives } = resolveProjectObjectives({
    primaryTypeId: 'agritourism',
    secondaryTypeIds: [],
  });

  it('resolves to 48 objectives (19 universal + 29 primary)', () => {
    expect(AGRITOURISM_PRIMARY_OBJECTIVES.length).toBe(29);
    expect(objectives.length).toBe(48);
  });

  it('has globally unique checklist item ids (toProgressMap invariant)', () => {
    const itemIds = objectives.flatMap((o) => o.checklist.map((i) => i.id));
    expect(new Set(itemIds).size).toBe(itemIds.length);
    const objIds = objectives.map((o) => o.id);
    expect(new Set(objIds).size).toBe(objIds.length);
  });

  it('every agritourism ref is unique within the primary set', () => {
    // The source index carries no duplicate refs (unlike ecovillage's 6.6);
    // this locks that the encoded set keeps them unique.
    const refs = AGRITOURISM_PRIMARY_OBJECTIVES.map((o) => o.ref);
    expect(new Set(refs).size).toBe(refs.length);
  });
});

describe('catalogue conformance - wellness primary resolution', () => {
  const { objectives } = resolveProjectObjectives({
    primaryTypeId: 'wellness',
    secondaryTypeIds: [],
  });

  it('resolves to 46 objectives (19 universal + 27 primary)', () => {
    expect(WELLNESS_PRIMARY_OBJECTIVES.length).toBe(27);
    expect(objectives.length).toBe(46);
  });

  it('has globally unique checklist item ids (toProgressMap invariant)', () => {
    const itemIds = objectives.flatMap((o) => o.checklist.map((i) => i.id));
    expect(new Set(itemIds).size).toBe(itemIds.length);
    const objIds = objectives.map((o) => o.id);
    expect(new Set(objIds).size).toBe(objIds.length);
  });

  it('every wellness primary ref is unique within the primary set', () => {
    const refs = WELLNESS_PRIMARY_OBJECTIVES.map((o) => o.ref);
    expect(new Set(refs).size).toBe(refs.length);
  });

  it('well-s7-program-launch meets the 5-item floor (operator-authorized c5)', () => {
    // Source lists 4; c5 added under the 2026-05-30 "draft 5th" ruling.
    const launch = WELLNESS_PRIMARY_OBJECTIVES.find(
      (o) => o.id === 'well-s7-program-launch',
    );
    expect(launch?.checklist.length).toBe(5);
  });
});

describe('catalogue conformance - wellness secondary resolution', () => {
  it('contributes 5 additive overlay objectives and no patches', () => {
    expect(WELLNESS_SECONDARY_OBJECTIVES.length).toBe(5);
  });

  it('resolves wellness-secondary onto a regen primary as additive only', () => {
    const base = resolveProjectObjectives({
      primaryTypeId: 'regenerative_farm',
      secondaryTypeIds: [],
    });
    const withWellness = resolveProjectObjectives({
      primaryTypeId: 'regenerative_farm',
      secondaryTypeIds: ['wellness'],
    });
    // Additive only: exactly +5 objectives, no patch injection on existing ones.
    expect(withWellness.objectives.length).toBe(base.objectives.length + 5);
  });

  it('wellness secondary refs do not collide with wellness primary refs', () => {
    const primaryRefs = new Set(WELLNESS_PRIMARY_OBJECTIVES.map((o) => o.ref));
    for (const o of WELLNESS_SECONDARY_OBJECTIVES) {
      expect(primaryRefs.has(o.ref), o.ref).toBe(false);
    }
  });

  it('has globally unique checklist item ids when layered (toProgressMap invariant)', () => {
    const { objectives } = resolveProjectObjectives({
      primaryTypeId: 'regenerative_farm',
      secondaryTypeIds: ['wellness'],
    });
    const itemIds = objectives.flatMap((o) => o.checklist.map((i) => i.id));
    expect(new Set(itemIds).size).toBe(itemIds.length);
    const objIds = objectives.map((o) => o.id);
    expect(new Set(objIds).size).toBe(objIds.length);
  });
});

describe('catalogue conformance - silvopasture primary resolution', () => {
  const { objectives } = resolveProjectObjectives({
    primaryTypeId: 'silvopasture',
    secondaryTypeIds: [],
  });

  it('resolves to 45 objectives (19 universal + 26 primary)', () => {
    expect(SILVOPASTURE_PRIMARY_OBJECTIVES.length).toBe(26);
    expect(objectives.length).toBe(45);
  });

  it('has globally unique checklist item ids (toProgressMap invariant)', () => {
    const itemIds = objectives.flatMap((o) => o.checklist.map((i) => i.id));
    expect(new Set(itemIds).size).toBe(itemIds.length);
    const objIds = objectives.map((o) => o.id);
    expect(new Set(objIds).size).toBe(objIds.length);
  });

  it('every silvopasture primary ref is unique within the primary set', () => {
    const refs = SILVOPASTURE_PRIMARY_OBJECTIVES.map((o) => o.ref);
    expect(new Set(refs).size).toBe(refs.length);
  });
});

describe('catalogue conformance - livestock primary resolution', () => {
  const { objectives } = resolveProjectObjectives({
    primaryTypeId: 'livestock_operation',
    secondaryTypeIds: [],
  });

  it('resolves to 42 objectives (19 universal + 23 primary)', () => {
    expect(LIVESTOCK_PRIMARY_OBJECTIVES.length).toBe(23);
    expect(objectives.length).toBe(42);
  });

  it('has globally unique checklist item ids (toProgressMap invariant)', () => {
    const itemIds = objectives.flatMap((o) => o.checklist.map((i) => i.id));
    expect(new Set(itemIds).size).toBe(itemIds.length);
    const objIds = objectives.map((o) => o.id);
    expect(new Set(objIds).size).toBe(objIds.length);
  });

  it('every livestock primary ref is unique within the primary set', () => {
    const refs = LIVESTOCK_PRIMARY_OBJECTIVES.map((o) => o.ref);
    expect(new Set(refs).size).toBe(refs.length);
  });

  it('binds all six livestock/grazing formula ids across the catalogue', () => {
    const bound = new Set(
      LIVESTOCK_PRIMARY_OBJECTIVES.flatMap((o) =>
        o.checklist
          .map((i) => i.formulaBinding?.formulaId)
          .filter((id): id is NonNullable<typeof id> => Boolean(id)),
      ),
    );
    expect(bound).toEqual(
      new Set([
        'forage-carrying-capacity',
        'carrying-capacity-seasonal',
        'paddock-stocking-density',
        'stock-water-demand',
        'paddock-system-capacity',
        'enterprise-break-even',
      ]),
    );
  });

  it('carries the Amanah advance-sale flag on the marketing objective scopeNotes', () => {
    // feedback_csa_in_catalogues: meat/herd-share advance-subscription channels
    // must be surfaced AND flagged (bay` ma laysa `indak), never silently omitted.
    const marketing = LIVESTOCK_PRIMARY_OBJECTIVES.find(
      (o) => o.id === 'lvs-s7-marketing',
    );
    expect(marketing?.scopeNotes).toBeTruthy();
    expect(marketing?.scopeNotes).toContain('Scholar Council');
    const channels = marketing?.checklist.find(
      (i) => i.id === 'lvs-s7-marketing-c3',
    );
    expect(channels?.label.toLowerCase()).toContain('herd-share');
  });
});

describe('catalogue conformance - orchard primary resolution', () => {
  const { objectives } = resolveProjectObjectives({
    primaryTypeId: 'orchard_food_forest',
    secondaryTypeIds: [],
  });

  it('resolves to 44 objectives (19 universal + 25 primary)', () => {
    expect(ORCHARD_PRIMARY_OBJECTIVES.length).toBe(25);
    expect(objectives.length).toBe(44);
  });

  it('has globally unique checklist item ids (toProgressMap invariant)', () => {
    const itemIds = objectives.flatMap((o) => o.checklist.map((i) => i.id));
    expect(new Set(itemIds).size).toBe(itemIds.length);
    const objIds = objectives.map((o) => o.id);
    expect(new Set(objIds).size).toBe(objIds.length);
  });

  it('every orchard primary ref is unique within the primary set', () => {
    const refs = ORCHARD_PRIMARY_OBJECTIVES.map((o) => o.ref);
    expect(new Set(refs).size).toBe(refs.length);
  });
});

describe('catalogue conformance - nursery secondary resolution', () => {
  it('contributes exactly 8 additive objectives and no patches', () => {
    expect(NURSERY_SECONDARY_OBJECTIVES.length).toBe(8);
  });

  it('resolves nursery onto a regen primary as additive only (+8)', () => {
    const base = resolveProjectObjectives({
      primaryTypeId: 'regenerative_farm',
      secondaryTypeIds: [],
    });
    const withNursery = resolveProjectObjectives({
      primaryTypeId: 'regenerative_farm',
      secondaryTypeIds: ['nursery'],
    });
    expect(withNursery.objectives.length).toBe(base.objectives.length + 8);
  });

  it('applies no patches and records none as skipped', () => {
    const result = resolveProjectObjectives({
      primaryTypeId: 'regenerative_farm',
      secondaryTypeIds: ['nursery'],
    });
    const injected = result.objectives.filter((o) =>
      o.checklist.some((c) => c.expandedBySecondaryId === 'nursery'),
    );
    expect(injected.length).toBe(0);
    expect(result.provenance.skippedPatches).toEqual([]);
  });

  it('nursery additive refs do not collide with the regen primary refs', () => {
    const primaryRefs = new Set(REGEN_FARM_PRIMARY_OBJECTIVES.map((o) => o.ref));
    for (const o of NURSERY_SECONDARY_OBJECTIVES) {
      expect(primaryRefs.has(o.ref), o.ref).toBe(false);
    }
  });

  it('has globally unique checklist item ids when layered', () => {
    const { objectives } = resolveProjectObjectives({
      primaryTypeId: 'regenerative_farm',
      secondaryTypeIds: ['nursery'],
    });
    const itemIds = objectives.flatMap((o) => o.checklist.map((i) => i.id));
    expect(new Set(itemIds).size).toBe(itemIds.length);
    const objIds = objectives.map((o) => o.id);
    expect(new Set(objIds).size).toBe(objIds.length);
  });
});

describe('catalogue conformance - silvopasture secondary resolution', () => {
  it('contributes exactly 5 additive objectives and 3 patches', () => {
    expect(SILVOPASTURE_SECONDARY_OBJECTIVES.length).toBe(5);
    expect(SILVOPASTURE_SECONDARY_PATCHES.length).toBe(3);
  });

  it('every silvopasture secondary patch ref matches the patch format', () => {
    for (const p of SILVOPASTURE_SECONDARY_PATCHES) {
      expect(p.ref, p.targetObjectiveId).toMatch(PATCH_REF);
    }
  });

  it('every silvopasture secondary patch parses via PatchRecordSchema', () => {
    for (const p of SILVOPASTURE_SECONDARY_PATCHES) {
      expect(() => PatchRecordSchema.parse(p), p.ref).not.toThrow();
    }
  });

  it('resolves silvopasture onto a regen primary as +5 additive', () => {
    const base = resolveProjectObjectives({
      primaryTypeId: 'regenerative_farm',
      secondaryTypeIds: [],
    });
    const withSilv = resolveProjectObjectives({
      primaryTypeId: 'regenerative_farm',
      secondaryTypeIds: ['silvopasture'],
    });
    expect(withSilv.objectives.length).toBe(base.objectives.length + 5);
  });

  it('applies all 3 patches to universal targets, none skipped', () => {
    const result = resolveProjectObjectives({
      primaryTypeId: 'regenerative_farm',
      secondaryTypeIds: ['silvopasture'],
    });
    const patched = result.objectives.filter((o) =>
      o.checklist.some((c) => c.expandedBySecondaryId === 'silvopasture'),
    );
    expect(patched.length).toBe(3);
    expect(result.provenance.skippedPatches).toEqual([]);
  });

  it('concatenates patch gate amendments onto the target completion gate', () => {
    const result = resolveProjectObjectives({
      primaryTypeId: 'regenerative_farm',
      secondaryTypeIds: ['silvopasture'],
    });
    const water = findPlanStratumObjectiveIn(
      result.objectives,
      's4-water-strategy',
    );
    expect(water).toBeDefined();
    expect(water?.completionGate).toContain('drinking-water demand');
  });

  it('silvopasture secondary refs do not collide with silvopasture primary refs', () => {
    const primaryRefs = new Set(
      SILVOPASTURE_PRIMARY_OBJECTIVES.map((o) => o.ref),
    );
    for (const o of SILVOPASTURE_SECONDARY_OBJECTIVES) {
      expect(primaryRefs.has(o.ref), o.ref).toBe(false);
    }
  });

  it('has globally unique checklist item ids when layered', () => {
    const { objectives } = resolveProjectObjectives({
      primaryTypeId: 'regenerative_farm',
      secondaryTypeIds: ['silvopasture'],
    });
    const itemIds = objectives.flatMap((o) => o.checklist.map((i) => i.id));
    expect(new Set(itemIds).size).toBe(itemIds.length);
    const objIds = objectives.map((o) => o.id);
    expect(new Set(objIds).size).toBe(objIds.length);
  });
});

// ---------------------------------------------------------------------------
// Decision Groups (Decision Groups Reference v1.0; OLOS spec 9.3-9.4).
// A decision group is a Plan-layer editorial grouping of an objective's
// Act-layer checklist items into 1-6 named decision scopes. Group labels /
// counts / observeFeeds are source-verbatim; item membership is authored under
// the 2026-05-31 operator override (R1), extended the same day to authoring
// full group taxonomy for objectives the doc does not cover.
// ---------------------------------------------------------------------------

/** Objectives whose checklist must be fully partitioned by their groups. */
const OBJECTIVES_WITH_GROUPS = ALL_AUTHORED.filter(
  (o) => o.decisionGroups.length > 0,
);

/**
 * Assert the full mutually-exclusive partition invariant for one objective:
 * 1-6 groups; every group has >=1 item; no item in two groups; the union of
 * all group itemIds equals the objective's checklist item-id set; every
 * group itemId resolves to a real checklist item.
 */
function expectFullPartition(o: PlanStratumObjective): void {
  expect(o.decisionGroups.length, `${o.id} group count`).toBeGreaterThanOrEqual(
    1,
  );
  expect(o.decisionGroups.length, `${o.id} group count`).toBeLessThanOrEqual(6);

  const checklistIds = new Set(o.checklist.map((i) => i.id));
  const seen = new Set<string>();
  for (const g of o.decisionGroups) {
    expect(g.itemIds.length, `${g.id} item count`).toBeGreaterThanOrEqual(1);
    for (const itemId of g.itemIds) {
      // resolves to a real checklist item
      expect(checklistIds.has(itemId), `${g.id} -> ${itemId} unknown`).toBe(
        true,
      );
      // mutually exclusive (no item in two groups)
      expect(seen.has(itemId), `${itemId} appears in two groups`).toBe(false);
      seen.add(itemId);
    }
  }
  // full partition: every checklist item is covered exactly once
  expect(seen.size, `${o.id} partition coverage`).toBe(checklistIds.size);
}

describe('catalogue conformance - decision group partition invariant', () => {
  it('every grouped objective is a full mutually-exclusive partition', () => {
    for (const o of OBJECTIVES_WITH_GROUPS) {
      expectFullPartition(o);
    }
  });

  it('observeFeeds entries are non-empty strings (R2: "-" encoded as [])', () => {
    for (const o of OBJECTIVES_WITH_GROUPS) {
      for (const g of o.decisionGroups) {
        for (const feed of g.observeFeeds) {
          expect(typeof feed, `${g.id} feed type`).toBe('string');
          expect(feed.trim().length, `${g.id} empty feed`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('authored decision-group ids are globally unique across catalogues', () => {
    const ids = ALL_AUTHORED.flatMap((o) =>
      o.decisionGroups.map((g) => g.id),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('authored base groups carry sourceSecondaryId=null', () => {
    // Patch-injected groups get their sourceSecondaryId stamped by the
    // resolver; statically-authored base groups must leave it null.
    for (const o of OBJECTIVES_WITH_GROUPS) {
      for (const g of o.decisionGroups) {
        expect(g.sourceSecondaryId, `${g.id}`).toBeNull();
      }
    }
  });
});

describe('catalogue conformance - decision group Phase 3a coverage', () => {
  it('all 19 universal objectives carry decision groups', () => {
    for (const o of UNIVERSAL_PLAN_OBJECTIVES) {
      expect(o.decisionGroups.length, o.id).toBeGreaterThan(0);
    }
  });

  it('all regen-farm primary objectives carry decision groups', () => {
    for (const o of REGEN_FARM_PRIMARY_OBJECTIVES) {
      expect(o.decisionGroups.length, o.id).toBeGreaterThan(0);
    }
  });

  it('all residential additive objectives carry decision groups', () => {
    for (const o of RESIDENTIAL_ADDITIVE_OBJECTIVES) {
      expect(o.decisionGroups.length, o.id).toBeGreaterThan(0);
    }
  });

  it('every residential patch injects a decision group bundling its items', () => {
    for (const p of RESIDENTIAL_PATCHES) {
      expect(p.injectedGroups.length, p.ref).toBeGreaterThan(0);
      const injectedItemIds = new Set(p.injectedItems.map((i) => i.id));
      const groupedItemIds = p.injectedGroups.flatMap((g) => g.itemIds);
      // injected groups partition exactly the injected items
      expect(new Set(groupedItemIds).size, `${p.ref} dup`).toBe(
        groupedItemIds.length,
      );
      for (const itemId of groupedItemIds) {
        expect(injectedItemIds.has(itemId), `${p.ref} -> ${itemId}`).toBe(true);
      }
      expect(groupedItemIds.length, `${p.ref} coverage`).toBe(
        injectedItemIds.size,
      );
    }
  });
});

describe('catalogue conformance - decision group resolution (regen+residential)', () => {
  const { objectives } = resolveProjectObjectives({
    primaryTypeId: 'regenerative_farm',
    secondaryTypeIds: ['residential'],
  });

  it('every resolved grouped objective remains a full partition', () => {
    // Base groups partition base items; patch-injected groups partition
    // injected items; together they must cover the resolved checklist exactly.
    for (const o of objectives) {
      if (o.decisionGroups.length > 0) expectFullPartition(o);
    }
  });

  it('decision-group ids are globally unique in the resolved set', () => {
    const ids = objectives.flatMap((o) => o.decisionGroups.map((g) => g.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('resolver stamps sourceSecondaryId=residential on patch-injected groups only', () => {
    const injected = objectives.flatMap((o) =>
      o.decisionGroups.filter((g) => g.sourceSecondaryId !== null),
    );
    // The 5 residential patches each inject exactly one group.
    expect(injected.length).toBe(RESIDENTIAL_PATCHES.length);
    for (const g of injected) {
      expect(g.sourceSecondaryId, g.id).toBe('residential');
    }
    // Every other group is an unstamped base group.
    const base = objectives.flatMap((o) =>
      o.decisionGroups.filter((g) => g.sourceSecondaryId === null),
    );
    for (const g of base) {
      expect(g.id.includes('-dgres'), g.id).toBe(false);
    }
  });

  it('does not mutate the shared universal catalogue decisionGroups', () => {
    // The resolver deep-copies; the shared constant for a patched universal
    // objective (e.g. s3-hydrology) must keep only its authored base groups.
    const sharedHydrology = UNIVERSAL_PLAN_OBJECTIVES.find(
      (o) => o.id === 's3-hydrology',
    );
    expect(
      sharedHydrology?.decisionGroups.every((g) => g.sourceSecondaryId === null),
    ).toBe(true);
    expect(
      sharedHydrology?.decisionGroups.some((g) => g.id.includes('-dgres')),
    ).toBe(false);
  });
});

describe('catalogue conformance - orchard secondary resolution', () => {
  it('contributes exactly 5 additive objectives and 4 patches', () => {
    expect(ORCHARD_SECONDARY_OBJECTIVES.length).toBe(5);
    expect(ORCHARD_SECONDARY_PATCHES.length).toBe(4);
  });

  it('every orchard secondary patch ref matches the patch format', () => {
    for (const p of ORCHARD_SECONDARY_PATCHES) {
      expect(p.ref, p.targetObjectiveId).toMatch(PATCH_REF);
    }
  });

  it('every orchard secondary patch parses via PatchRecordSchema', () => {
    for (const p of ORCHARD_SECONDARY_PATCHES) {
      expect(() => PatchRecordSchema.parse(p), p.ref).not.toThrow();
    }
  });

  it('resolves orchard onto a regen primary as +5 additive', () => {
    const base = resolveProjectObjectives({
      primaryTypeId: 'regenerative_farm',
      secondaryTypeIds: [],
    });
    const withOrch = resolveProjectObjectives({
      primaryTypeId: 'regenerative_farm',
      secondaryTypeIds: ['orchard_food_forest'],
    });
    expect(withOrch.objectives.length).toBe(base.objectives.length + 5);
  });

  it('applies all 4 patches to universal targets, none skipped', () => {
    const result = resolveProjectObjectives({
      primaryTypeId: 'regenerative_farm',
      secondaryTypeIds: ['orchard_food_forest'],
    });
    const patched = result.objectives.filter((o) =>
      o.checklist.some(
        (c) => c.expandedBySecondaryId === 'orchard_food_forest',
      ),
    );
    expect(patched.length).toBe(4);
    expect(result.provenance.skippedPatches).toEqual([]);
  });

  it('concatenates patch gate amendments onto the target completion gate', () => {
    const result = resolveProjectObjectives({
      primaryTypeId: 'regenerative_farm',
      secondaryTypeIds: ['orchard_food_forest'],
    });
    const ecology = findPlanStratumObjectiveIn(
      result.objectives,
      's2-ecology',
    );
    expect(ecology).toBeDefined();
    expect(ecology?.completionGate).toContain(
      'Pollinator and beneficial-insect habitat',
    );
  });

  it('orchard secondary refs do not collide with orchard primary refs', () => {
    const primaryRefs = new Set(ORCHARD_PRIMARY_OBJECTIVES.map((o) => o.ref));
    for (const o of ORCHARD_SECONDARY_OBJECTIVES) {
      expect(primaryRefs.has(o.ref), o.ref).toBe(false);
    }
  });

  it('has globally unique checklist item ids when layered', () => {
    const { objectives } = resolveProjectObjectives({
      primaryTypeId: 'regenerative_farm',
      secondaryTypeIds: ['orchard_food_forest'],
    });
    const itemIds = objectives.flatMap((o) => o.checklist.map((i) => i.id));
    expect(new Set(itemIds).size).toBe(itemIds.length);
    const objIds = objectives.map((o) => o.id);
    expect(new Set(objIds).size).toBe(objIds.length);
  });
});
