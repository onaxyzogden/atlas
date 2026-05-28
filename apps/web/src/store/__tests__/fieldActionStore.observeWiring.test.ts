// @vitest-environment happy-dom
/**
 * Slice 3.5 — fieldActionStore wiring to the Observe feed + cyclical
 * review trigger.
 *
 * Covers:
 *  - markSubmitted (self mode) collapses to verified and emits ONE
 *    `verified` ObserveFeedEntry (no double-emit).
 *  - markSubmitted (review mode) lands in `submitted` and emits NOTHING.
 *  - markVerified from `submitted` emits one `verified` entry.
 *  - markDiverged emits one `diverged` entry AND calls
 *    cyclicalReviewStore.forceTrigger so the Plan-tier divergence
 *    indicator + cyclical-review banner are reachable.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { DivergenceFlag } from '@ogden/shared';
import { useFieldActionStore } from '../fieldActionStore.js';
import { useObserveFeedStore } from '../observeFeedStore.js';
import { useCyclicalReviewStore } from '../cyclicalReviewStore.js';

const PROJECT = 'p-test-3-5';
const OBJECTIVE = 'obj-test-3-5';

function resetAll(): void {
  useFieldActionStore.setState({ byProject: {} });
  useObserveFeedStore.setState({ byProject: {} });
  useCyclicalReviewStore.setState({ byProject: {} });
}

function makeAction(id: string, mode: 'self' | 'review') {
  return useFieldActionStore.getState().createFieldAction({
    id,
    projectId: PROJECT,
    planObjectiveId: OBJECTIVE,
    tierId: 't0',
    title: `Action ${id}`,
    taskType: 'survey',
    proofSchemaId: 'baseline-photo-only',
    verificationMode: mode,
  });
}

function feedFor() {
  return useObserveFeedStore.getState().getByProject(PROJECT);
}

describe('fieldActionStore — observe feed + cyclical wiring (Slice 3.5)', () => {
  beforeEach(resetAll);

  it('self-mode submit collapses to verified AND emits a verified observation', () => {
    makeAction('fa-self', 'self');
    const { markStarted, markSubmitted, getById } =
      useFieldActionStore.getState();
    markStarted(PROJECT, 'fa-self');
    markSubmitted(PROJECT, 'fa-self');

    const action = getById(PROJECT, 'fa-self');
    expect(action?.status).toBe('verified');

    const feed = feedFor();
    expect(feed).toHaveLength(1);
    expect(feed[0]?.sourceType).toBe('verified');
    expect(feed[0]?.sourceActionId).toBe('fa-self');
    expect(feed[0]?.feedKey).toBe(OBJECTIVE);
  });

  it('review-mode submit lands in submitted and emits nothing', () => {
    makeAction('fa-review', 'review');
    const { markStarted, markSubmitted, getById } =
      useFieldActionStore.getState();
    markStarted(PROJECT, 'fa-review');
    markSubmitted(PROJECT, 'fa-review');

    expect(getById(PROJECT, 'fa-review')?.status).toBe('submitted');
    expect(feedFor()).toHaveLength(0);
  });

  it('markVerified from submitted emits a verified observation exactly once', () => {
    makeAction('fa-rev2', 'review');
    const { markStarted, markSubmitted, markVerified, getById } =
      useFieldActionStore.getState();
    markStarted(PROJECT, 'fa-rev2');
    markSubmitted(PROJECT, 'fa-rev2');
    expect(feedFor()).toHaveLength(0); // still nothing after submit
    markVerified(PROJECT, 'fa-rev2');

    expect(getById(PROJECT, 'fa-rev2')?.status).toBe('verified');
    const feed = feedFor();
    expect(feed).toHaveLength(1);
    expect(feed[0]?.sourceType).toBe('verified');
  });

  it('markVerified is a no-op when already verified (no double emit)', () => {
    makeAction('fa-self2', 'self');
    const { markStarted, markSubmitted, markVerified } =
      useFieldActionStore.getState();
    markStarted(PROJECT, 'fa-self2');
    markSubmitted(PROJECT, 'fa-self2'); // self collapses → verified + emits
    markVerified(PROJECT, 'fa-self2'); // already verified → no transition
    expect(feedFor()).toHaveLength(1);
  });

  it('markDiverged emits a diverged observation AND raises a cyclical-review flag', () => {
    makeAction('fa-div', 'self');
    const { markStarted, markDiverged, getById } =
      useFieldActionStore.getState();
    markStarted(PROJECT, 'fa-div');

    const flag: DivergenceFlag = {
      id: 'flag-1',
      type: 'new_discovery',
      noteText: 'Found a perennial spring not on the survey.',
      proofItems: [],
      capturedAt: '2026-05-28T00:00:00.000Z',
      parentObjectiveId: OBJECTIVE,
      resolutionStatus: 'open',
    };
    markDiverged(PROJECT, 'fa-div', flag);

    expect(getById(PROJECT, 'fa-div')?.status).toBe('diverged');

    const feed = feedFor();
    expect(feed).toHaveLength(1);
    expect(feed[0]?.sourceType).toBe('diverged');
    expect(feed[0]?.feedKey).toBe(OBJECTIVE);
    expect(feed[0]?.divergenceType).toBe('new_discovery');

    // The cyclical-review store now considers this objective forced —
    // ObjectiveDetailPanel reads isForced to surface the review banner
    // even before the 90-day timer would normally trigger it.
    expect(
      useCyclicalReviewStore.getState().isForced(PROJECT, OBJECTIVE),
    ).toBe(true);
  });

  it('diverged is terminal — repeated markDiverged does not re-emit', () => {
    makeAction('fa-div2', 'self');
    const { markStarted, markDiverged } = useFieldActionStore.getState();
    markStarted(PROJECT, 'fa-div2');

    const flag: DivergenceFlag = {
      id: 'flag-a',
      type: 'access_issue',
      noteText: 'Gate locked, owner unreachable.',
      proofItems: [],
      capturedAt: '2026-05-28T00:00:00.000Z',
      parentObjectiveId: OBJECTIVE,
      resolutionStatus: 'open',
    };
    markDiverged(PROJECT, 'fa-div2', flag);
    markDiverged(PROJECT, 'fa-div2', { ...flag, id: 'flag-b' });
    expect(feedFor()).toHaveLength(1);
  });
});
