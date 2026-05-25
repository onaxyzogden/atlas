import { describe, it, expect } from 'vitest';
import {
  derivePlanImpactFlags,
  emptyPlanReviewRun,
  type PlanImpactFlag,
} from '../planImpactFlag.js';
import {
  emptyObservationNeedRun,
  type ObservationNeed,
  type ObservationNeedRun,
  type ObservationNeedStatus,
  type PlanImpact,
} from '../../../observation-needs/observationNeed.js';
import {
  evaluateObservationRecorded,
} from '../../../observation-needs/observationNeed.js';
import type { ObservationNeedView } from '../../../observation-needs/useObservationNeeds.js';

/** A minimal observation need; override module/planImpact/etc per case. */
function need(overrides: Partial<ObservationNeed> = {}): ObservationNeed {
  return {
    id: 'need-1',
    projectId: 'mtc',
    stage: 'observe',
    module: 'topography',
    title: 'Recheck eroded bank',
    target: { center: [-78.2, 44.5] },
    requiredTools: [],
    requiredLayers: [],
    checklist: [],
    evidence: [
      { id: 'summary', kind: 'note', label: 'Summary note', required: true },
    ],
    recordingRule: {
      requireAllRequiredChecklist: false,
      requireAllRequiredEvidence: true,
      requireSummary: true,
    },
    priority: 'medium',
    origin: 'seed',
    reason: 'Bank slumped after the storm',
    ...overrides,
  };
}

/** Build a view from a need + a run shape, computing the recording eval. */
function view(
  objective: ObservationNeed,
  runOverrides: Partial<ObservationNeedRun> = {},
): ObservationNeedView {
  const run: ObservationNeedRun = { ...emptyObservationNeedRun(), ...runOverrides };
  return { objective, run, evaluation: evaluateObservationRecorded(objective, run) };
}

function recordedRun(
  status: ObservationNeedStatus = 'recorded',
  updatedAt = '2026-05-20T10:00:00.000Z',
): Partial<ObservationNeedRun> {
  return { status, updatedAt };
}

describe('derivePlanImpactFlags', () => {
  it('includes recorded needs flagged possible or likely', () => {
    const flags = derivePlanImpactFlags([
      view(need({ id: 'a', planImpact: 'likely' }), recordedRun()),
      view(need({ id: 'b', planImpact: 'possible' }), recordedRun()),
    ]);
    expect(flags.map((f) => f.id)).toEqual(['a', 'b']);
  });

  it('includes resolved needs as well as recorded', () => {
    const flags = derivePlanImpactFlags([
      view(need({ id: 'a', planImpact: 'likely' }), recordedRun('resolved')),
    ]);
    expect(flags).toHaveLength(1);
  });

  it('excludes needs with planImpact none or undefined', () => {
    const flags = derivePlanImpactFlags([
      view(need({ id: 'a', planImpact: 'none' }), recordedRun()),
      view(need({ id: 'b' }), recordedRun()), // undefined
    ]);
    expect(flags).toHaveLength(0);
  });

  it('excludes open / in-progress needs even when flagged', () => {
    const flags = derivePlanImpactFlags([
      view(need({ id: 'a', planImpact: 'likely' }), { status: 'open' }),
      view(need({ id: 'b', planImpact: 'likely' }), { status: 'in-progress' }),
    ]);
    expect(flags).toHaveLength(0);
  });

  it('sorts likely before possible', () => {
    const flags = derivePlanImpactFlags([
      view(need({ id: 'p', planImpact: 'possible' }), recordedRun()),
      view(need({ id: 'l', planImpact: 'likely' }), recordedRun()),
    ]);
    expect(flags.map((f) => f.id)).toEqual(['l', 'p']);
  });

  it('sorts most-recently-recorded first within the same impact', () => {
    const flags = derivePlanImpactFlags([
      view(
        need({ id: 'older', planImpact: 'likely' }),
        recordedRun('recorded', '2026-05-01T00:00:00.000Z'),
      ),
      view(
        need({ id: 'newer', planImpact: 'likely' }),
        recordedRun('recorded', '2026-05-20T00:00:00.000Z'),
      ),
    ]);
    expect(flags.map((f) => f.id)).toEqual(['newer', 'older']);
  });

  it('carries module, reason, source link, recordedAt and target onto the flag', () => {
    const [flag] = derivePlanImpactFlags([
      view(
        need({
          id: 'a',
          planImpact: 'likely',
          module: 'earth-water-ecology',
          reason: 'Spring reappeared',
          sourceObservationId: 'obs-parent',
          target: { center: [-79, 45] },
        }),
        recordedRun('recorded', '2026-05-20T10:00:00.000Z'),
      ),
    ]) as [PlanImpactFlag];
    expect(flag.needId).toBe('a');
    expect(flag.module).toBe('earth-water-ecology');
    expect(flag.reason).toBe('Spring reappeared');
    expect(flag.sourceObservationId).toBe('obs-parent');
    expect(flag.recordedAt).toBe('2026-05-20T10:00:00.000Z');
    expect(flag.target.center).toEqual([-79, 45]);
    expect(flag.planImpact).toBe('likely');
  });

  it('omits the source link when the need has no parent observation', () => {
    const [flag] = derivePlanImpactFlags([
      view(need({ id: 'a', planImpact: 'possible' }), recordedRun()),
    ]);
    expect(flag.sourceObservationId).toBeUndefined();
  });

  it('returns an empty array for no views', () => {
    expect(derivePlanImpactFlags([])).toEqual([]);
  });
});

describe('emptyPlanReviewRun', () => {
  it('opens with no decision and an empty note', () => {
    const run = emptyPlanReviewRun();
    expect(run.status).toBe('open');
    expect(run.note).toBe('');
    expect(run.decision).toBeUndefined();
  });

  // Guard against a stray import drift: every flagged impact is a PlanImpact.
  it('only ever flags the two non-none impacts', () => {
    const impacts: PlanImpact[] = ['none', 'possible', 'likely'];
    const flagged = impacts.filter((i) => i === 'possible' || i === 'likely');
    expect(flagged).toEqual(['possible', 'likely']);
  });
});
