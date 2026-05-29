import { describe, it, expect } from 'vitest';
import {
  PlanTierObjectiveSchema,
  PatchRecordSchema,
  type PlanTierObjective,
} from '../../../schemas/plan/planTierObjective.schema.js';
import {
  UNIVERSAL_PLAN_OBJECTIVES,
  REGEN_FARM_PRIMARY_OBJECTIVES,
  RESIDENTIAL_ADDITIVE_OBJECTIVES,
  RESIDENTIAL_PATCHES,
} from '../catalogues/index.js';
import {
  resolveProjectObjectives,
  findPlanTierObjectiveIn,
} from '../../../relationships/resolveProjectObjectives.js';

const ALL_AUTHORED: readonly PlanTierObjective[] = [
  ...UNIVERSAL_PLAN_OBJECTIVES,
  ...REGEN_FARM_PRIMARY_OBJECTIVES,
  ...RESIDENTIAL_ADDITIVE_OBJECTIVES,
];

const OBJECTIVE_REF = /^(U|RF|RES)-T[0-6]\.\d+$/;
const PATCH_REF = /^RES>(U|RF)-T[0-6]\.\d+$/;

describe('catalogue conformance - schema validity', () => {
  it('every authored objective parses via PlanTierObjectiveSchema', () => {
    for (const o of ALL_AUTHORED) {
      // .parse throws a descriptive ZodError naming the offending objective.
      expect(() => PlanTierObjectiveSchema.parse(o), o.id).not.toThrow();
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
        findPlanTierObjectiveIn(objectives, p.targetObjectiveId),
        p.targetObjectiveId,
      ).toBeDefined();
    }
  });

  it('preserves the 3 visionProfileToChecklist bridge ids on t0-vision', () => {
    // t0-vision-c1/c2/c3 are written by the bridge; they MUST exist or seeded
    // Tier-0 progress is orphaned. (t0-stewardship-c1/c2 are intentionally NOT
    // in the per-type model - RegenFarm v1.3 has external stakeholders, not an
    // internal-team T0 objective; those two bridge mappings are inert for
    // per-type projects and only resolve against the legacy fallback skeleton.)
    const vision = findPlanTierObjectiveIn(objectives, 't0-vision');
    const itemIds = new Set(vision?.checklist.map((i) => i.id));
    expect(itemIds.has('t0-vision-c1')).toBe(true);
    expect(itemIds.has('t0-vision-c2')).toBe(true);
    expect(itemIds.has('t0-vision-c3')).toBe(true);
  });
});
