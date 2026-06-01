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
