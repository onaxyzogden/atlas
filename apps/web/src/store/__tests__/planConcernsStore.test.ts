import { describe, it, expect, beforeEach } from 'vitest';
import {
  usePlanConcernsStore,
  EMPTY_CONCERNS,
  selectConcerns,
  approvedAmendmentsForObjective,
  type RaiseConcernInput,
} from '../planConcernsStore';

const PID = 'project-1';
const OBJ = 's4-water-strategy';
const get = () => usePlanConcernsStore.getState();
const list = (pid = PID) => get().byProject[pid] ?? [];

const TS = 1_700_000_000_000;

const RAISE: RaiseConcernInput = {
  objectiveRef: OBJ,
  observation: 'Spring flow is lower than the design assumed.',
  proposedChange: 'Add a second storage tank above the kitchen garden.',
  raisedBy: 'Aisha',
};

beforeEach(() => {
  usePlanConcernsStore.setState({ byProject: {} });
});

describe('planConcernsStore -- empty list', () => {
  it('defaults to the shared EMPTY list for an unknown project', () => {
    expect(selectConcerns(get().byProject, 'unknown')).toBe(EMPTY_CONCERNS);
    expect(selectConcerns(get().byProject, 'unknown')).toEqual([]);
  });
});

describe('planConcernsStore -- raiseConcern', () => {
  it('appends a raised concern with trimmed text + supplied id/timestamp', () => {
    get().raiseConcern(
      PID,
      { ...RAISE, observation: '   ' + RAISE.observation + '   ' },
      { id: 'c1', at: TS },
    );
    expect(list()).toHaveLength(1);
    const c = list()[0]!;
    expect(c).toMatchObject({
      id: 'c1',
      objectiveRef: OBJ,
      observation: RAISE.observation,
      proposedChange: RAISE.proposedChange,
      raisedBy: 'Aisha',
      timestamp: TS,
      status: 'raised',
    });
    expect(c.reviewedBy).toBeUndefined();
    expect(c.reviewedAt).toBeUndefined();
    expect(c.amendmentText).toBeUndefined();
  });

  it('is a no-op when the observation is empty after trim', () => {
    get().raiseConcern(PID, { ...RAISE, observation: '   ' }, { id: 'c1', at: TS });
    expect(PID in get().byProject).toBe(false);
  });

  it('generates an id when none is supplied', () => {
    get().raiseConcern(PID, RAISE, { at: TS });
    const c = list()[0]!;
    expect(typeof c.id).toBe('string');
    expect(c.id.length).toBeGreaterThan(0);
  });

  it('appends concerns in submission order', () => {
    get().raiseConcern(PID, RAISE, { id: 'c1', at: TS });
    get().raiseConcern(
      PID,
      { ...RAISE, observation: 'Second issue noted.' },
      { id: 'c2', at: TS + 1_000 },
    );
    expect(list().map((c) => c.id)).toEqual(['c1', 'c2']);
  });
});

describe('planConcernsStore -- Amanah refuse-to-store', () => {
  it('refuses an observation that trips the CSA / advance-sale guard', () => {
    get().raiseConcern(
      PID,
      { ...RAISE, observation: 'Fund the tank via a CSA subscription presale.' },
      { id: 'c1', at: TS },
    );
    expect(PID in get().byProject).toBe(false);
  });

  it('refuses a proposedChange that trips the guard', () => {
    get().raiseConcern(
      PID,
      { ...RAISE, proposedChange: 'Offer a yield-share advance-sale to members.' },
      { id: 'c1', at: TS },
    );
    expect(PID in get().byProject).toBe(false);
  });

  it('stores a clean concern after a refused one', () => {
    get().raiseConcern(
      PID,
      { ...RAISE, observation: 'Cover it with a salam advance-sale.' },
      { id: 'c1', at: TS },
    ); // refused
    get().raiseConcern(PID, RAISE, { id: 'c2', at: TS + 1_000 });
    expect(list()).toHaveLength(1);
    expect(list()[0]!.id).toBe('c2');
  });
});

describe('planConcernsStore -- markUnderReview', () => {
  it('transitions a raised concern to under-review', () => {
    get().raiseConcern(PID, RAISE, { id: 'c1', at: TS });
    get().markUnderReview(PID, 'c1');
    expect(list()[0]!.status).toBe('under-review');
  });

  it('is a no-op for an unknown concern', () => {
    get().raiseConcern(PID, RAISE, { id: 'c1', at: TS });
    get().markUnderReview(PID, 'nope');
    expect(list()[0]!.status).toBe('raised');
  });

  it('is a no-op for an unknown project', () => {
    get().markUnderReview('unknown', 'c1');
    expect('unknown' in get().byProject).toBe(false);
  });
});

describe('planConcernsStore -- resolveConcern (approve)', () => {
  it('records an amendment ALONGSIDE the original; status approved', () => {
    get().raiseConcern(PID, RAISE, { id: 'c1', at: TS });
    get().resolveConcern(PID, 'c1', 'approved', 'Council', {
      amendmentText: '   Storage tank added per review.   ',
      at: TS + 2_000,
    });
    const c = list()[0]!;
    expect(c.status).toBe('approved');
    expect(c.reviewedBy).toBe('Council');
    expect(c.reviewedAt).toBe(TS + 2_000);
    expect(c.amendmentText).toBe('Storage tank added per review.');
    // The original observation/proposedChange are never overwritten.
    expect(c.observation).toBe(RAISE.observation);
    expect(c.proposedChange).toBe(RAISE.proposedChange);
  });

  it('approve is a no-op without an amendment (covenant: must record one)', () => {
    get().raiseConcern(PID, RAISE, { id: 'c1', at: TS });
    get().resolveConcern(PID, 'c1', 'approved', 'Council', { amendmentText: '   ' });
    expect(list()[0]!.status).toBe('raised');
    expect(list()[0]!.amendmentText).toBeUndefined();
  });

  it('approve refuses a CSA-like amendment (Amanah persist reject)', () => {
    get().raiseConcern(PID, RAISE, { id: 'c1', at: TS });
    get().resolveConcern(PID, 'c1', 'approved', 'Council', {
      amendmentText: 'Cover the cost with a CSA subscription presale.',
    });
    expect(list()[0]!.status).toBe('raised');
    expect(list()[0]!.amendmentText).toBeUndefined();
  });

  it('never re-resolves a terminal concern', () => {
    get().raiseConcern(PID, RAISE, { id: 'c1', at: TS });
    get().resolveConcern(PID, 'c1', 'approved', 'Council', {
      amendmentText: 'first',
      at: TS + 1,
    });
    get().resolveConcern(PID, 'c1', 'declined', 'Other', { at: TS + 2 });
    const c = list()[0]!;
    expect(c.status).toBe('approved');
    expect(c.amendmentText).toBe('first');
    expect(c.reviewedBy).toBe('Council');
  });
});

describe('planConcernsStore -- resolveConcern (decline) + append-only', () => {
  it('decline closes with no amendment', () => {
    get().raiseConcern(PID, RAISE, { id: 'c1', at: TS });
    get().resolveConcern(PID, 'c1', 'declined', 'Council', { at: TS + 2_000 });
    const c = list()[0]!;
    expect(c.status).toBe('declined');
    expect(c.reviewedBy).toBe('Council');
    expect(c.reviewedAt).toBe(TS + 2_000);
    expect(c.amendmentText).toBeUndefined();
  });

  it('resolving one concern leaves every other concern untouched', () => {
    get().raiseConcern(PID, RAISE, { id: 'c1', at: TS });
    get().raiseConcern(
      PID,
      { ...RAISE, observation: 'Second issue.' },
      { id: 'c2', at: TS + 1_000 },
    );
    const before = list()[1]!;
    get().resolveConcern(PID, 'c1', 'approved', 'Council', {
      amendmentText: 'fixed',
      at: TS + 2_000,
    });
    expect(list()[0]!.status).toBe('approved');
    // The other concern record is byte-identical (same reference, untouched).
    expect(list()[1]!).toBe(before);
    expect(list()[1]!).toMatchObject({ id: 'c2', status: 'raised' });
  });

  it('is a no-op for an unknown project / concern', () => {
    get().resolveConcern('unknown', 'c1', 'declined', 'Council', { at: TS });
    expect('unknown' in get().byProject).toBe(false);
    get().raiseConcern(PID, RAISE, { id: 'c1', at: TS });
    get().resolveConcern(PID, 'nope', 'declined', 'Council', { at: TS });
    expect(list()[0]!.status).toBe('raised');
  });
});

describe('planConcernsStore -- approvedAmendmentsForObjective', () => {
  it('returns only approved amendments touching the objective, in order', () => {
    get().raiseConcern(PID, RAISE, { id: 'c1', at: TS });
    get().raiseConcern(
      PID,
      { ...RAISE, objectiveRef: 's5-access', observation: 'Other objective.' },
      { id: 'c2', at: TS + 1_000 },
    );
    get().resolveConcern(PID, 'c1', 'approved', 'Council', {
      amendmentText: 'tank added',
      at: TS + 2_000,
    });
    get().resolveConcern(PID, 'c2', 'approved', 'Council', {
      amendmentText: 'lane added',
      at: TS + 3_000,
    });
    const ams = approvedAmendmentsForObjective(selectConcerns(get().byProject, PID), OBJ);
    expect(ams.map((c) => c.id)).toEqual(['c1']);
    expect(ams[0]!.amendmentText).toBe('tank added');
  });

  it('excludes raised + declined concerns', () => {
    get().raiseConcern(PID, RAISE, { id: 'c1', at: TS });
    get().raiseConcern(PID, { ...RAISE, observation: 'Still open.' }, { id: 'c2', at: TS + 1 });
    get().resolveConcern(PID, 'c1', 'declined', 'Council', { at: TS + 2_000 });
    const ams = approvedAmendmentsForObjective(selectConcerns(get().byProject, PID), OBJ);
    expect(ams).toEqual([]);
  });

  it('returns EMPTY for an unknown project', () => {
    expect(
      approvedAmendmentsForObjective(selectConcerns(get().byProject, 'unknown'), OBJ),
    ).toEqual([]);
  });
});
