import { describe, it, expect } from 'vitest';
import {
  EMPTY_OBSERVE_INPUT,
  OBSERVE_OBJECTIVES,
  evaluateModule,
  evaluateObserve,
  type ObserveProgressInput,
} from '../objectives.js';
import { OBSERVE_MODULES } from '../../types.js';

function input(patch: Partial<ObserveProgressInput>): ObserveProgressInput {
  return { ...EMPTY_OBSERVE_INPUT, ...patch };
}

/** Flip every required objective on so the gate opens. */
const ALL_REQUIRED_MET: ObserveProgressInput = input({
  hasBoundary: true,
  builtFeatureCount: 1,
  hazardCount: 1,
  contourCount: 1,
  soilSampleCount: 1,
  zoneCount: 1,
  swotCount: 1,
});

describe('evaluateModule', () => {
  it('marks tasks observe_to_do when nothing is done', () => {
    const m = evaluateModule(
      OBSERVE_OBJECTIVES['people-governance'],
      EMPTY_OBSERVE_INPUT,
    );
    expect(m.doneCount).toBe(0);
    expect(m.complete).toBe(false);
    expect(m.tasks.every((t) => t.columnId === 'observe_to_do')).toBe(true);
  });

  it('completes when the required objective is met, regardless of optional', () => {
    const m = evaluateModule(
      OBSERVE_OBJECTIVES['people-governance'],
      input({ hasBoundary: true }),
    );
    expect(m.complete).toBe(true);
    expect(m.requiredDone).toBe(m.requiredTotal);
    // optional homestead pin still pending → not all tasks done
    expect(m.doneCount).toBeLessThan(m.total);
    const boundaryTask = m.tasks.find((t) => t.id === 'human-context.boundary');
    expect(boundaryTask?.columnId).toBe('observe_done');
  });

  it('an optional objective alone does not complete the module', () => {
    const m = evaluateModule(
      OBSERVE_OBJECTIVES['people-governance'],
      input({ homesteadPinned: true }),
    );
    expect(m.doneCount).toBe(1);
    expect(m.complete).toBe(false);
  });

  it('treats hazard OR sector as satisfying the macroclimate required objective', () => {
    const viaSector = evaluateModule(
      OBSERVE_OBJECTIVES['climate'],
      input({ sectorCount: 1 }),
    );
    expect(viaSector.complete).toBe(true);
  });
});

describe('evaluateObserve', () => {
  it('empty input → 0% and gate closed', () => {
    const r = evaluateObserve(EMPTY_OBSERVE_INPUT);
    expect(r.overall.percent).toBe(0);
    expect(r.overall.doneCount).toBe(0);
    expect(r.overall.requiredComplete).toBe(false);
    // After the UniversalDomain cutover only a subset of the 16 Observe modules
    // declare a required objective (the rest are unauthored, empty lists). Under
    // empty input every declared-required objective is unmet, so the remaining
    // count equals the number of modules that carry one.
    const modulesWithRequired = OBSERVE_MODULES.filter(
      (m) => r.byModule[m].requiredTotal > 0,
    ).length;
    expect(r.overall.remainingRequired).toHaveLength(modulesWithRequired);
  });

  it('all required objectives met → gate opens', () => {
    const r = evaluateObserve(ALL_REQUIRED_MET);
    expect(r.overall.requiredComplete).toBe(true);
    expect(r.overall.remainingRequired).toHaveLength(0);
    for (const mod of OBSERVE_MODULES) {
      expect(r.byModule[mod].complete).toBe(true);
    }
  });

  it('optional objectives raise the percent but a missing required keeps the gate closed', () => {
    // homestead pin is optional in human-context; no required objective met.
    const r = evaluateObserve(input({ homesteadPinned: true }));
    expect(r.overall.doneCount).toBe(1);
    expect(r.overall.percent).toBeGreaterThan(0);
    expect(r.overall.requiredComplete).toBe(false);
  });

  it('percent reaches 100 only when every objective (incl. optional) is done', () => {
    const everything = input({
      hasBoundary: true,
      homesteadPinned: true,
      builtFeatureCount: 3,
      hazardCount: 1,
      sectorCount: 1,
      contourCount: 1,
      highPointCount: 1,
      transectCount: 1,
      earthworkCount: 1,
      waterLineCount: 1,
      soilSampleCount: 1,
      ecologyObsCount: 1,
      zoneCount: 1,
      patchCount: 1,
      swotCount: 1,
      swotBucketsCovered: 4,
    });
    const r = evaluateObserve(everything);
    expect(r.overall.percent).toBe(100);
    expect(r.overall.doneCount).toBe(r.overall.total);
  });
});
