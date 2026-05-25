import { describe, it, expect } from 'vitest';
import {
  derivePlanConflicts,
  emptyPlanConflictRun,
  OBSERVE_TO_PLAN_AFFINITY,
  PLAN_CONFLICT_RESOLUTIONS,
  PLAN_CONFLICT_RESOLUTION_LABEL,
} from '../planConflict.js';
import {
  emptyObservationNeedRun,
  evaluateObservationRecorded,
  type ObservationNeed,
  type ObservationNeedRun,
  type ObservationNeedStatus,
} from '../../../observation-needs/observationNeed.js';
import type { ObservationNeedView } from '../../../observation-needs/useObservationNeeds.js';
import {
  emptyPlanDecision,
  type PlanDecision,
} from '../../decisions/planDecision.js';

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
  const run: ObservationNeedRun = {
    ...emptyObservationNeedRun(),
    ...runOverrides,
  };
  return {
    objective,
    run,
    evaluation: evaluateObservationRecorded(objective, run),
  };
}

function recordedRun(
  status: ObservationNeedStatus = 'recorded',
  updatedAt = '2026-05-20T10:00:00.000Z',
): Partial<ObservationNeedRun> {
  return { status, updatedAt };
}

/** A minimal decision; override status/affectedModule/updatedAt per case. */
function decision(overrides: Partial<PlanDecision> = {}): PlanDecision {
  return {
    ...emptyPlanDecision('mtc'),
    id: 'dec-1',
    status: 'accepted',
    headline: 'Stabilise the eroded bank',
    affectedModule: 'water-management',
    updatedAt: '2026-05-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('derivePlanConflicts', () => {
  it('pairs a recorded observation with an affinity-related decision', () => {
    // topography → water-management is in the affinity set.
    const conflicts = derivePlanConflicts(
      [view(need({ id: 'obs', module: 'topography' }), recordedRun())],
      [decision({ id: 'dec', affectedModule: 'water-management' })],
    );
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]?.id).toBe('obs:dec');
    expect(conflicts[0]?.observationId).toBe('obs');
    expect(conflicts[0]?.decisionId).toBe('dec');
    expect(conflicts[0]?.affectedModule).toBe('water-management');
  });

  it('excludes open / in-progress / anticipated needs', () => {
    const decisions = [decision({ affectedModule: 'water-management' })];
    expect(
      derivePlanConflicts(
        [view(need({ module: 'topography' }), { status: 'open' })],
        decisions,
      ),
    ).toHaveLength(0);
    expect(
      derivePlanConflicts(
        [view(need({ module: 'topography' }), { status: 'in-progress' })],
        decisions,
      ),
    ).toHaveLength(0);
  });

  it('includes resolved needs as well as recorded', () => {
    const conflicts = derivePlanConflicts(
      [view(need({ module: 'topography' }), recordedRun('resolved'))],
      [decision({ affectedModule: 'water-management' })],
    );
    expect(conflicts).toHaveLength(1);
  });

  it('excludes rejected decisions', () => {
    const conflicts = derivePlanConflicts(
      [view(need({ module: 'topography' }), recordedRun())],
      [decision({ status: 'rejected', affectedModule: 'water-management' })],
    );
    expect(conflicts).toHaveLength(0);
  });

  it('excludes decisions whose module is outside the affinity set', () => {
    // topography has no affinity to `machinery`.
    const conflicts = derivePlanConflicts(
      [view(need({ module: 'topography' }), recordedRun())],
      [decision({ affectedModule: 'machinery' })],
    );
    expect(conflicts).toHaveLength(0);
  });

  it('excludes decisions with no affectedModule', () => {
    const conflicts = derivePlanConflicts(
      [view(need({ module: 'topography' }), recordedRun())],
      [decision({ affectedModule: undefined })],
    );
    expect(conflicts).toHaveLength(0);
  });

  it('marks severity likely when the observation postdates the decision', () => {
    const conflicts = derivePlanConflicts(
      [
        view(
          need({ module: 'topography', planImpact: 'possible' }),
          recordedRun('recorded', '2026-05-10T00:00:00.000Z'),
        ),
      ],
      [
        decision({
          affectedModule: 'water-management',
          updatedAt: '2026-05-01T00:00:00.000Z',
        }),
      ],
    );
    expect(conflicts[0]?.severity).toBe('likely');
  });

  it('marks severity likely when the observation was flagged likely', () => {
    const conflicts = derivePlanConflicts(
      [
        view(
          need({ module: 'topography', planImpact: 'likely' }),
          recordedRun('recorded', '2026-04-01T00:00:00.000Z'),
        ),
      ],
      [
        decision({
          affectedModule: 'water-management',
          updatedAt: '2026-05-01T00:00:00.000Z',
        }),
      ],
    );
    expect(conflicts[0]?.severity).toBe('likely');
  });

  it('marks severity possible when neither postdating nor flagged likely', () => {
    const conflicts = derivePlanConflicts(
      [
        view(
          need({ module: 'topography', planImpact: 'possible' }),
          recordedRun('recorded', '2026-04-01T00:00:00.000Z'),
        ),
      ],
      [
        decision({
          affectedModule: 'water-management',
          updatedAt: '2026-05-01T00:00:00.000Z',
        }),
      ],
    );
    expect(conflicts[0]?.severity).toBe('possible');
  });

  it('sorts likely before possible, then most-recently-recorded first', () => {
    const conflicts = derivePlanConflicts(
      [
        view(
          need({ id: 'poss', module: 'topography', planImpact: 'possible' }),
          recordedRun('recorded', '2026-04-01T00:00:00.000Z'),
        ),
        view(
          need({ id: 'lateLikely', module: 'topography', planImpact: 'likely' }),
          recordedRun('recorded', '2026-05-20T00:00:00.000Z'),
        ),
        view(
          need({
            id: 'earlyLikely',
            module: 'topography',
            planImpact: 'likely',
          }),
          recordedRun('recorded', '2026-05-01T00:00:00.000Z'),
        ),
      ],
      [
        decision({
          id: 'dec',
          affectedModule: 'water-management',
          updatedAt: '2026-06-01T00:00:00.000Z',
        }),
      ],
    );
    expect(conflicts.map((c) => c.observationId)).toEqual([
      'lateLikely',
      'earlyLikely',
      'poss',
    ]);
  });

  it('does not mutate its inputs', () => {
    const views = [view(need({ module: 'topography' }), recordedRun())];
    const decisions = [decision({ affectedModule: 'water-management' })];
    const snapshot = JSON.stringify({ views, decisions });
    derivePlanConflicts(views, decisions);
    expect(JSON.stringify({ views, decisions })).toBe(snapshot);
  });

  it('returns an empty array for no views or no decisions', () => {
    expect(derivePlanConflicts([], [decision()])).toEqual([]);
    expect(
      derivePlanConflicts([view(need(), recordedRun())], []),
    ).toEqual([]);
  });
});

describe('emptyPlanConflictRun', () => {
  it('opens with no resolution and an empty note', () => {
    const run = emptyPlanConflictRun();
    expect(run.status).toBe('open');
    expect(run.note).toBe('');
    expect(run.resolution).toBeUndefined();
  });
});

describe('conflict resolution labels + affinity map', () => {
  it('has a label for every resolution', () => {
    for (const r of PLAN_CONFLICT_RESOLUTIONS) {
      expect(PLAN_CONFLICT_RESOLUTION_LABEL[r]).toBeTruthy();
    }
  });

  it('maps every Observe module to at least one Plan module', () => {
    for (const modules of Object.values(OBSERVE_TO_PLAN_AFFINITY)) {
      expect(modules.length).toBeGreaterThan(0);
    }
  });
});
