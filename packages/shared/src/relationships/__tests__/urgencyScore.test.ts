import { describe, it, expect } from 'vitest';
import {
  computeProjectUrgency,
  sortByUrgency,
  URGENCY_WEIGHTS,
  INACTIVITY_DAYS_CAP,
  type ProjectUrgencyInputs,
} from '../urgencyScore.js';

const FIXED_NOW = Date.parse('2026-05-28T12:00:00.000Z');

function inputs(
  overrides: Partial<ProjectUrgencyInputs> = {},
): ProjectUrgencyInputs {
  return {
    projectId: 'p1',
    objectiveStatuses: {},
    cyclicalReviewDueObjectiveIds: [],
    fieldActions: [],
    domainFreshness: {},
    divergencePoints: [],
    now: FIXED_NOW,
    ...overrides,
  };
}

describe('computeProjectUrgency — empty project', () => {
  it('scores 0 with all-zero breakdown for an inert project', () => {
    const result = computeProjectUrgency(inputs());
    expect(result.score).toBe(0);
    expect(result.breakdown).toEqual({
      divergencesCritical: 0,
      divergencesHigh: 0,
      staleFoundationDomains: 0,
      ageingFoundationDomains: 0,
      cyclicalReviewsDue: 0,
      blockedFieldActions: 0,
      pendingVerifications: 0,
      draftWizard: false,
      inactivityDays: 0,
    });
  });
});

describe('computeProjectUrgency — divergence severity', () => {
  it('weights a single critical divergence at 100', () => {
    const result = computeProjectUrgency(
      inputs({
        divergencePoints: [
          { statusOutput: 'major_constraint', isSuperseded: false },
        ],
      }),
    );
    expect(result.score).toBe(URGENCY_WEIGHTS.divergenceCritical);
    expect(result.breakdown.divergencesCritical).toBe(1);
    expect(result.breakdown.divergencesHigh).toBe(0);
  });

  it('weights potential_disqualifier as critical', () => {
    const result = computeProjectUrgency(
      inputs({
        divergencePoints: [
          { statusOutput: 'potential_disqualifier', isSuperseded: false },
        ],
      }),
    );
    expect(result.breakdown.divergencesCritical).toBe(1);
    expect(result.score).toBe(URGENCY_WEIGHTS.divergenceCritical);
  });

  it('weights needs_investigation as high', () => {
    const result = computeProjectUrgency(
      inputs({
        divergencePoints: [
          { statusOutput: 'needs_investigation', isSuperseded: false },
        ],
      }),
    );
    expect(result.score).toBe(URGENCY_WEIGHTS.divergenceHigh);
    expect(result.breakdown.divergencesHigh).toBe(1);
    expect(result.breakdown.divergencesCritical).toBe(0);
  });

  it('ignores clear and unknown statuses entirely', () => {
    const result = computeProjectUrgency(
      inputs({
        divergencePoints: [
          { statusOutput: 'clear', isSuperseded: false },
          { statusOutput: 'unknown', isSuperseded: false },
        ],
      }),
    );
    expect(result.score).toBe(0);
    expect(result.breakdown.divergencesCritical).toBe(0);
    expect(result.breakdown.divergencesHigh).toBe(0);
  });

  it('ignores superseded divergences regardless of severity', () => {
    const result = computeProjectUrgency(
      inputs({
        divergencePoints: [
          { statusOutput: 'major_constraint', isSuperseded: true },
          { statusOutput: 'needs_investigation', isSuperseded: true },
        ],
      }),
    );
    expect(result.score).toBe(0);
  });

  it('sums multiple divergences additively', () => {
    const result = computeProjectUrgency(
      inputs({
        divergencePoints: [
          { statusOutput: 'major_constraint', isSuperseded: false },
          { statusOutput: 'potential_disqualifier', isSuperseded: false },
          { statusOutput: 'needs_investigation', isSuperseded: false },
        ],
      }),
    );
    expect(result.breakdown.divergencesCritical).toBe(2);
    expect(result.breakdown.divergencesHigh).toBe(1);
    expect(result.score).toBe(
      2 * URGENCY_WEIGHTS.divergenceCritical +
        URGENCY_WEIGHTS.divergenceHigh,
    );
  });
});

describe('computeProjectUrgency — foundation domain freshness', () => {
  it('weights a stale hydrology domain at 20', () => {
    const result = computeProjectUrgency(
      inputs({ domainFreshness: { hydrology: 'stale' } }),
    );
    expect(result.score).toBe(URGENCY_WEIGHTS.staleFoundationDomain);
    expect(result.breakdown.staleFoundationDomains).toBe(1);
  });

  it('weights stale soil, hydrology, risk-compliance equally', () => {
    const result = computeProjectUrgency(
      inputs({
        domainFreshness: {
          hydrology: 'stale',
          soil: 'stale',
          'risk-compliance': 'stale',
        },
      }),
    );
    expect(result.breakdown.staleFoundationDomains).toBe(3);
    expect(result.score).toBe(3 * URGENCY_WEIGHTS.staleFoundationDomain);
  });

  it('weights an ageing foundation domain at 5', () => {
    const result = computeProjectUrgency(
      inputs({ domainFreshness: { soil: 'ageing' } }),
    );
    expect(result.score).toBe(URGENCY_WEIGHTS.ageingFoundationDomain);
    expect(result.breakdown.ageingFoundationDomains).toBe(1);
  });

  it('ignores stale non-foundation domains', () => {
    const result = computeProjectUrgency(
      inputs({
        domainFreshness: {
          'plants-food': 'stale',
          'animals-livestock': 'stale',
          ecology: 'stale',
        },
      }),
    );
    expect(result.score).toBe(0);
    expect(result.breakdown.staleFoundationDomains).toBe(0);
    expect(result.breakdown.ageingFoundationDomains).toBe(0);
  });

  it('treats missing freshness as zero contribution', () => {
    const result = computeProjectUrgency(
      inputs({ domainFreshness: { hydrology: 'missing' } }),
    );
    expect(result.score).toBe(0);
  });

  it('treats current freshness as zero contribution', () => {
    const result = computeProjectUrgency(
      inputs({ domainFreshness: { hydrology: 'current' } }),
    );
    expect(result.score).toBe(0);
  });
});

describe('computeProjectUrgency — cyclical review queue', () => {
  it('weights each due objective at 15', () => {
    const result = computeProjectUrgency(
      inputs({
        cyclicalReviewDueObjectiveIds: ['o-1', 'o-2', 'o-3'],
      }),
    );
    expect(result.score).toBe(3 * URGENCY_WEIGHTS.cyclicalReviewDue);
    expect(result.breakdown.cyclicalReviewsDue).toBe(3);
  });

  it('zero contributions when the list is empty', () => {
    const result = computeProjectUrgency(inputs());
    expect(result.breakdown.cyclicalReviewsDue).toBe(0);
  });
});

describe('computeProjectUrgency — field action state counts', () => {
  it('weights a blocked field action at 10', () => {
    const result = computeProjectUrgency(
      inputs({
        fieldActions: [{ status: 'blocked', divergenceFlag: null }],
      }),
    );
    expect(result.score).toBe(URGENCY_WEIGHTS.blockedFieldAction);
    expect(result.breakdown.blockedFieldActions).toBe(1);
  });

  it('weights a submitted (pending verification) field action at 5', () => {
    const result = computeProjectUrgency(
      inputs({
        fieldActions: [{ status: 'submitted', divergenceFlag: null }],
      }),
    );
    expect(result.score).toBe(URGENCY_WEIGHTS.pendingVerification);
    expect(result.breakdown.pendingVerifications).toBe(1);
  });

  it('ignores not_started / in_progress / verified / diverged for the count buckets', () => {
    const result = computeProjectUrgency(
      inputs({
        fieldActions: [
          { status: 'not_started', divergenceFlag: null },
          { status: 'in_progress', divergenceFlag: null },
          { status: 'verified', divergenceFlag: null },
          { status: 'diverged', divergenceFlag: null },
        ],
      }),
    );
    expect(result.breakdown.blockedFieldActions).toBe(0);
    expect(result.breakdown.pendingVerifications).toBe(0);
    expect(result.score).toBe(0);
  });
});

describe('computeProjectUrgency — draft wizard', () => {
  it('adds 25 when wizardStatus is in_progress', () => {
    const result = computeProjectUrgency(
      inputs({ wizardStatus: 'in_progress' }),
    );
    expect(result.score).toBe(URGENCY_WEIGHTS.draftWizard);
    expect(result.breakdown.draftWizard).toBe(true);
  });

  it('contributes nothing once the wizard is complete', () => {
    const result = computeProjectUrgency(
      inputs({ wizardStatus: 'complete' }),
    );
    expect(result.score).toBe(0);
    expect(result.breakdown.draftWizard).toBe(false);
  });

  it('contributes nothing when wizardStatus is undefined (legacy project)', () => {
    const result = computeProjectUrgency(inputs());
    expect(result.breakdown.draftWizard).toBe(false);
  });
});

describe('computeProjectUrgency — inactivity', () => {
  it('contributes 1 per day for low inactivity', () => {
    const result = computeProjectUrgency(
      inputs({
        lastActivityAt: new Date(FIXED_NOW - 5 * 86_400_000).toISOString(),
      }),
    );
    expect(result.breakdown.inactivityDays).toBe(5);
    expect(result.score).toBe(5 * URGENCY_WEIGHTS.inactivityPerDay);
  });

  it('caps inactivity at INACTIVITY_DAYS_CAP regardless of dormancy', () => {
    const result = computeProjectUrgency(
      inputs({
        lastActivityAt: new Date(
          FIXED_NOW - 365 * 86_400_000,
        ).toISOString(),
      }),
    );
    expect(result.breakdown.inactivityDays).toBe(INACTIVITY_DAYS_CAP);
    expect(result.score).toBe(
      INACTIVITY_DAYS_CAP * URGENCY_WEIGHTS.inactivityPerDay,
    );
  });

  it('treats null / undefined / missing lastActivityAt as zero days', () => {
    expect(
      computeProjectUrgency(inputs()).breakdown.inactivityDays,
    ).toBe(0);
    expect(
      computeProjectUrgency(inputs({ lastActivityAt: null })).breakdown
        .inactivityDays,
    ).toBe(0);
  });

  it('treats a future-dated lastActivityAt as zero days (clock skew)', () => {
    const result = computeProjectUrgency(
      inputs({
        lastActivityAt: new Date(FIXED_NOW + 86_400_000).toISOString(),
      }),
    );
    expect(result.breakdown.inactivityDays).toBe(0);
  });

  it('treats an unparseable lastActivityAt as zero days', () => {
    const result = computeProjectUrgency(
      inputs({ lastActivityAt: 'not-a-date' }),
    );
    expect(result.breakdown.inactivityDays).toBe(0);
  });
});

describe('computeProjectUrgency — mixed-signal totals', () => {
  it('sums every category for a heavily-flagged project', () => {
    const result = computeProjectUrgency(
      inputs({
        wizardStatus: 'complete',
        lastActivityAt: new Date(FIXED_NOW - 10 * 86_400_000).toISOString(),
        cyclicalReviewDueObjectiveIds: ['o1', 'o2'],
        fieldActions: [
          { status: 'blocked', divergenceFlag: null },
          { status: 'submitted', divergenceFlag: null },
          { status: 'verified', divergenceFlag: null },
        ],
        domainFreshness: {
          hydrology: 'stale',
          soil: 'ageing',
          'risk-compliance': 'current',
        },
        divergencePoints: [
          { statusOutput: 'major_constraint', isSuperseded: false },
          { statusOutput: 'needs_investigation', isSuperseded: false },
          { statusOutput: 'clear', isSuperseded: false },
        ],
      }),
    );
    const expected =
      URGENCY_WEIGHTS.divergenceCritical +
      URGENCY_WEIGHTS.divergenceHigh +
      URGENCY_WEIGHTS.staleFoundationDomain +
      URGENCY_WEIGHTS.ageingFoundationDomain +
      2 * URGENCY_WEIGHTS.cyclicalReviewDue +
      URGENCY_WEIGHTS.blockedFieldAction +
      URGENCY_WEIGHTS.pendingVerification +
      10 * URGENCY_WEIGHTS.inactivityPerDay;
    expect(result.score).toBe(expected);
    expect(result.breakdown).toEqual({
      divergencesCritical: 1,
      divergencesHigh: 1,
      staleFoundationDomains: 1,
      ageingFoundationDomains: 1,
      cyclicalReviewsDue: 2,
      blockedFieldActions: 1,
      pendingVerifications: 1,
      draftWizard: false,
      inactivityDays: 10,
    });
  });

  it('ranks a critical-divergence project above a draft-only project', () => {
    const critical = computeProjectUrgency(
      inputs({
        divergencePoints: [
          { statusOutput: 'major_constraint', isSuperseded: false },
        ],
      }),
    );
    const draft = computeProjectUrgency(
      inputs({ wizardStatus: 'in_progress' }),
    );
    expect(critical.score).toBeGreaterThan(draft.score);
  });

  it('ranks a draft above an inert legacy project', () => {
    const draft = computeProjectUrgency(
      inputs({ wizardStatus: 'in_progress' }),
    );
    const inert = computeProjectUrgency(inputs());
    expect(draft.score).toBeGreaterThan(inert.score);
  });

  it('clamps inactivity contribution under foundation freshness signal', () => {
    const longDormant = computeProjectUrgency(
      inputs({
        lastActivityAt: new Date(
          FIXED_NOW - 365 * 86_400_000,
        ).toISOString(),
      }),
    );
    const oneStaleFoundation = computeProjectUrgency(
      inputs({ domainFreshness: { soil: 'stale' } }),
    );
    expect(longDormant.score).toBe(
      INACTIVITY_DAYS_CAP * URGENCY_WEIGHTS.inactivityPerDay,
    );
    expect(longDormant.score).toBeLessThan(oneStaleFoundation.score);
  });
});

describe('sortByUrgency', () => {
  it('orders items descending by score', () => {
    const items = [
      { id: 'a', score: 5 },
      { id: 'b', score: 100 },
      { id: 'c', score: 30 },
    ];
    const sorted = sortByUrgency(items, (it) => it.score);
    expect(sorted.map((it) => it.id)).toEqual(['b', 'c', 'a']);
  });

  it('is stable on ties — preserves input order', () => {
    const items = [
      { id: 'a', score: 10 },
      { id: 'b', score: 10 },
      { id: 'c', score: 10 },
    ];
    const sorted = sortByUrgency(items, (it) => it.score);
    expect(sorted.map((it) => it.id)).toEqual(['a', 'b', 'c']);
  });

  it('does not mutate the input', () => {
    const items = [
      { id: 'a', score: 5 },
      { id: 'b', score: 100 },
    ];
    const snapshot = [...items];
    sortByUrgency(items, (it) => it.score);
    expect(items).toEqual(snapshot);
  });

  it('handles empty input', () => {
    expect(sortByUrgency([], () => 0)).toEqual([]);
  });
});
