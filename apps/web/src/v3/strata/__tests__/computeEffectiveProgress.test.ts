/**
 * computeEffectiveProgress — the single source of truth that unions a
 * project's stored planStratumStore progress with the wizard-derived
 * Stratum-1 completion. This is the function Plan, the Act tier shell,
 * Portfolio cards, and Home urgency all read (directly or via
 * useEffectiveChecklistProgress), so this test pins the behaviour that
 * made Act agree with Plan for a freshly wizard-completed project.
 *
 * Pure / deterministic — no React, no store. Tests the composition only.
 */

import { describe, it, expect } from 'vitest';
import {
  computeAllObjectiveStatuses,
  type PlanStratumObjective,
  type ProjectMetadata,
  type VisionProfile,
} from '@ogden/shared';
import { computeEffectiveProgress } from '../effectiveProgress.js';

/**
 * Minimal S1 objective whose checklist carries the three `s1-vision-*` ids
 * the bridge derives from a VisionProfile (the LIVE catalogue namespace, post
 * `t0->s1` renumber). Only `id` + `checklist[].id` are read by
 * computeEffectiveProgress, so the rest is cast filler.
 */
function s1VisionObjective(): PlanStratumObjective {
  return {
    id: 's1-vision',
    stratumId: 's1-project-foundation',
    title: 'Articulate the land vision',
    focusedQuestion: 'What is this land for?',
    prerequisiteObjectiveIds: [],
    defaultOverlayBundle: [],
    decisionGroups: [],
    outputKind: 'plan-decision-record',
    source: 'universal',
    ref: 'U-S1.1',
    completionGate: '',
    actHandoff: 'Hand off to Act.',
    checklist: [
      { id: 's1-vision-c1', label: 'Vision', feedsInto: [], optional: false },
      { id: 's1-vision-c2', label: 'Goals', feedsInto: [], optional: false },
      { id: 's1-vision-c3', label: 'Capacity', feedsInto: [], optional: false },
    ],
  } as unknown as PlanStratumObjective;
}

const OBJECTIVES = [s1VisionObjective()];
const OBJ_ID = OBJECTIVES[0]!.id;

describe('computeEffectiveProgress', () => {
  it('with NO stored progress and NO vision, nothing is complete', () => {
    const { flatMap, byObjective } = computeEffectiveProgress(
      {},
      undefined,
      undefined,
      OBJECTIVES,
    );
    expect(flatMap['s1-vision-c1']).toBeUndefined();
    expect(byObjective[OBJ_ID]).toEqual([]);
  });

  it('wizard vision pre-satisfies S1 items even with empty stored progress', () => {
    // primaryOutcomes drives both s1-vision-c1 and s1-vision-c2 complete.
    const visionProfile = {
      primaryOutcomes: ['food-security'],
    } as unknown as VisionProfile;

    const { flatMap, byObjective } = computeEffectiveProgress(
      {}, // stored progress empty — the wizard never wrote to the store
      visionProfile,
      undefined,
      OBJECTIVES,
    );

    expect(flatMap['s1-vision-c1']).toBe(true);
    expect(flatMap['s1-vision-c2']).toBe(true);
    // c3 needs BOTH budgetRange AND timelineProgress — absent here.
    expect(flatMap['s1-vision-c3']).toBeUndefined();
    expect(byObjective[OBJ_ID]).toEqual(['s1-vision-c1', 's1-vision-c2']);
  });

  it('unions stored progress WITH wizard-derived completion', () => {
    const visionProfile = {
      primaryOutcomes: ['food-security'],
    } as unknown as VisionProfile;

    const { flatMap, byObjective } = computeEffectiveProgress(
      { [OBJ_ID]: ['s1-vision-c3'] }, // steward manually checked c3 in-app
      visionProfile,
      undefined,
      OBJECTIVES,
    );

    // Derived c1/c2 PLUS stored c3 — the union.
    expect(flatMap['s1-vision-c1']).toBe(true);
    expect(flatMap['s1-vision-c2']).toBe(true);
    expect(flatMap['s1-vision-c3']).toBe(true);
    expect([...(byObjective[OBJ_ID] ?? [])].sort()).toEqual([
      's1-vision-c1',
      's1-vision-c2',
      's1-vision-c3',
    ]);
  });

  it('unions answerSpec-derived completion from metadata (5th arg)', () => {
    // An objective whose item carries an answerSpec resolves to complete purely
    // from ProjectMetadata — no stored progress, no VisionProfile bridge — when
    // the 5th `metadata` arg is supplied.
    const objectives = [
      {
        id: 's1-purpose',
        checklist: [
          {
            id: 's1-purpose-c1',
            label: 'Primary purpose',
            feedsInto: [],
            optional: false,
            answerSpec: {
              fieldType: 'single_select',
              optionSetId: 'projectPrimaryType',
              sourceField: 'projectTypeRecord.primaryTypeId',
              editRoute: { kind: 'plan-type' },
            },
          },
        ],
      } as unknown as PlanStratumObjective,
    ];

    const metadata = {
      projectTypeRecord: { primaryTypeId: 'food-forest' },
    } as unknown as ProjectMetadata;

    // Without metadata: not satisfied.
    const before = computeEffectiveProgress({}, undefined, undefined, objectives);
    expect(before.flatMap['s1-purpose-c1']).toBeUndefined();

    // With metadata: the answerSpec auto-satisfies the item.
    const after = computeEffectiveProgress(
      {},
      undefined,
      undefined,
      objectives,
      metadata,
    );
    expect(after.flatMap['s1-purpose-c1']).toBe(true);
    expect(after.byObjective['s1-purpose']).toEqual(['s1-purpose-c1']);
  });

  it('unions formula-satisfied item ids from the 6th arg (Set), no-op when absent', () => {
    // A checklist item whose livestock formula has a usable result is unioned in
    // exactly like an answerSpec. The caller (useObjectiveFormulaProgress) does
    // the store read and hands in a plain Set; this fn stays pure.
    const objectives = [
      {
        id: 's4-paddock-layout',
        checklist: [
          {
            id: 's4-calc-capacity',
            label: 'Calculate total carrying capacity',
            feedsInto: [],
            optional: false,
            formulaBinding: {
              formulaId: 'paddock-system-capacity',
              satisfiesWhenComputed: true,
            },
          },
          {
            id: 's4-define-density',
            label: 'Define stocking density',
            feedsInto: [],
            optional: false,
          },
        ],
      } as unknown as PlanStratumObjective,
    ];

    // Without the Set: nothing flips.
    const before = computeEffectiveProgress({}, undefined, undefined, objectives);
    expect(before.flatMap['s4-calc-capacity']).toBeUndefined();

    // With the Set: only the listed id is satisfied.
    const after = computeEffectiveProgress(
      {},
      undefined,
      undefined,
      objectives,
      undefined,
      new Set(['s4-calc-capacity']),
    );
    expect(after.flatMap['s4-calc-capacity']).toBe(true);
    expect(after.flatMap['s4-define-density']).toBeUndefined();
    expect(after.byObjective['s4-paddock-layout']).toEqual(['s4-calc-capacity']);

    // Empty Set is a no-op.
    const noop = computeEffectiveProgress(
      {},
      undefined,
      undefined,
      objectives,
      undefined,
      new Set(),
    );
    expect(noop.flatMap['s4-calc-capacity']).toBeUndefined();
  });

  it('Act effective progress equals Plan: same flatMap feeds the status engine', () => {
    // The bug: Act read RAW store progress and skipped the wizard merge, so a
    // freshly-wizard-completed project showed S1 DONE in Plan but EMPTY in Act.
    // Now both call computeEffectiveProgress, so the status map is identical.
    const visionProfile = {
      primaryOutcomes: ['food-security'],
    } as unknown as VisionProfile;

    const effective = computeEffectiveProgress(
      {},
      visionProfile,
      undefined,
      OBJECTIVES,
    );

    const statuses = computeAllObjectiveStatuses(
      OBJECTIVES,
      effective.flatMap,
    );
    // 2 of 3 required checklist items complete -> objective is in progress
    // (available/active), not locked, and definitely not silently empty.
    expect(statuses[OBJ_ID]).not.toBe('locked');
  });
});
