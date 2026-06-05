import { describe, it, expect } from 'vitest';
import {
  EMPTY_ACT_INPUT,
  ACT_OBJECTIVES,
  evaluateModule,
  evaluateAct,
  type ActProgressInput,
} from '../objectives.js';
import { ACT_MODULES } from '../../types.js';

function input(patch: Partial<ActProgressInput>): ActProgressInput {
  return { ...EMPTY_ACT_INPUT, ...patch };
}

/** Only the `tracker` module carries a required objective. */
const REQUIRED_OBJECTIVE_COUNT = 1;

/** Flip the single required objective on so the gate opens. */
const ALL_REQUIRED_MET: ActProgressInput = input({ workItemDoneCount: 1 });

describe('evaluateModule', () => {
  it('marks tasks act_to_do when nothing is done', () => {
    const m = evaluateModule(ACT_OBJECTIVES['monitoring-records'], EMPTY_ACT_INPUT, 'monitoring-records');
    expect(m.doneCount).toBe(0);
    expect(m.complete).toBe(false);
    expect(m.tasks.every((t) => t.columnId === 'act_to_do')).toBe(true);
  });

  it('completes when the required objective is met, regardless of optional', () => {
    const m = evaluateModule(
      ACT_OBJECTIVES['monitoring-records'],
      input({ workItemDoneCount: 1 }),
      'monitoring-records',
    );
    expect(m.complete).toBe(true);
    expect(m.requiredDone).toBe(m.requiredTotal);
    // optional "three work items" still pending → not all tasks done
    expect(m.doneCount).toBeLessThan(m.total);
    const doneTask = m.tasks.find((t) => t.id === 'tracker.done');
    expect(doneTask?.columnId).toBe('act_done');
  });

  it('treats SWOT OR hazard as satisfying the review objective', () => {
    const viaHazard = evaluateModule(
      ACT_OBJECTIVES['monitoring-records'],
      input({ hazardCount: 1 }),
      'monitoring-records',
    );
    expect(viaHazard.doneCount).toBe(1);
    const task = viaHazard.tasks.find((t) => t.id === 'review.assess');
    expect(task?.columnId).toBe('act_done');
  });

  it('treats contact OR community event as satisfying the network objective', () => {
    const viaEvent = evaluateModule(
      ACT_OBJECTIVES['people-governance'],
      input({ communityEventCount: 1 }),
      'people-governance',
    );
    expect(viaEvent.doneCount).toBe(1);
  });

  it('an optional-only module with nothing done still evaluates complete', () => {
    // maintain carries no required objective → never gates.
    const m = evaluateModule(ACT_OBJECTIVES['built-infrastructure'], EMPTY_ACT_INPUT, 'built-infrastructure');
    expect(m.requiredTotal).toBe(0);
    expect(m.complete).toBe(true);
  });
});

describe('evaluateAct', () => {
  it('empty input → 0% and gate closed', () => {
    const r = evaluateAct(EMPTY_ACT_INPUT);
    expect(r.overall.percent).toBe(0);
    expect(r.overall.doneCount).toBe(0);
    expect(r.overall.requiredComplete).toBe(false);
    expect(r.overall.remainingRequired).toHaveLength(REQUIRED_OBJECTIVE_COUNT);
  });

  it('the required objective met → gate opens and every module is complete', () => {
    const r = evaluateAct(ALL_REQUIRED_MET);
    expect(r.overall.requiredComplete).toBe(true);
    expect(r.overall.remainingRequired).toHaveLength(0);
    for (const mod of ACT_MODULES) {
      expect(r.byModule[mod].complete).toBe(true);
    }
  });

  it('optional objectives raise the percent but a missing required keeps the gate closed', () => {
    // maintenance event is optional; the required tracker objective is unmet.
    const r = evaluateAct(input({ maintenanceEventCount: 1 }));
    expect(r.overall.doneCount).toBe(1);
    expect(r.overall.percent).toBeGreaterThan(0);
    expect(r.overall.requiredComplete).toBe(false);
  });

  it('percent reaches 100 only when every objective (incl. optional) is done', () => {
    const everything = input({
      workItemDoneCount: 3,
      phaseCompletedCount: 1,
      pilotCount: 1,
      maintenanceEventCount: 1,
      livestockMoveCount: 1,
      harvestEntryCount: 1,
      swotCount: 1,
      hazardCount: 1,
      contactCount: 1,
      communityEventCount: 1,
      appropriateTechCount: 1,
    });
    const r = evaluateAct(everything);
    expect(r.overall.percent).toBe(100);
    expect(r.overall.doneCount).toBe(r.overall.total);
  });
});
