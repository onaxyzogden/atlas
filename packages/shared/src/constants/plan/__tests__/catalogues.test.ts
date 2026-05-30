import { describe, it, expect } from 'vitest';
import {
  PlanStratumObjectiveSchema,
  PatchRecordSchema,
  type PlanStratumObjective,
} from '../../../schemas/plan/planTierObjective.schema.js';
import {
  UNIVERSAL_PLAN_OBJECTIVES,
  REGEN_FARM_PRIMARY_OBJECTIVES,
  ECOVILLAGE_PRIMARY_OBJECTIVES,
  AGRITOURISM_PRIMARY_OBJECTIVES,
  RESIDENTIAL_ADDITIVE_OBJECTIVES,
  RESIDENTIAL_PATCHES,
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
];

const OBJECTIVE_REF = /^(U|RF|RES|EV|AG)-S[1-7]\.\d+$/;

// Objectives transcribed verbatim from a pre-v1.4 source (Authoring Standards
// v1.3 or earlier) may carry fewer than the v1.4 5-item floor. Each is listed
// here with its source so the floor stays tight for every v1.4 catalogue.
//   ag-s6-food-integration: Agritourism v1.0 / Standards v1.3, 4 items in source
const SHORT_OBJECTIVE_ALLOWLIST = new Set<string>(['ag-s6-food-integration']);
const PATCH_REF = /^RES>(U|RF)-S[1-7]\.\d+$/;

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
      const floor = SHORT_OBJECTIVE_ALLOWLIST.has(o.id) ? 4 : 5;
      expect(o.checklist.length, o.id).toBeGreaterThanOrEqual(floor);
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
