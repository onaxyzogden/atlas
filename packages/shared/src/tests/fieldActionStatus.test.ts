import { describe, it, expect } from 'vitest';
import {
  canTransition,
  computeNextStatus,
  isTerminal,
  isVerified,
  isObserveFeedable,
  hasAllRequiredProof,
} from '../relationships/fieldActionStatus.js';
import type { FieldActionEvent } from '../relationships/fieldActionStatus.js';
import type {
  FieldAction,
  FieldActionStatus,
  FieldActionVerificationMode,
} from '../schemas/fieldAction/fieldAction.schema.js';
import {
  FIELD_ACTION_PROOF_SCHEMAS,
  getProofSchema,
  requiredSlotsFor,
} from '../constants/fieldAction/proofSchemas.js';
import { ProofSchemaSchema } from '../schemas/fieldAction/proofSchema.schema.js';

type StatusOnly = Pick<FieldAction, 'status' | 'verificationMode'>;

const mk = (
  status: FieldActionStatus,
  verificationMode: FieldActionVerificationMode = 'review',
): StatusOnly => ({ status, verificationMode });

const ALL_STATUSES: FieldActionStatus[] = [
  'not_started',
  'in_progress',
  'submitted',
  'verified',
  'diverged',
  'blocked',
];

const ALL_EVENTS: FieldActionEvent[] = [
  'start',
  'submit',
  'verify',
  'return_for_revision',
  'diverge',
  'block',
  'unblock',
];

describe('canTransition (spec §9.4)', () => {
  // 10 legal edges per the spec state machine.
  const LEGAL: Array<[FieldActionStatus, FieldActionStatus]> = [
    ['not_started', 'in_progress'],
    ['in_progress', 'submitted'],
    ['in_progress', 'verified'],
    ['in_progress', 'diverged'],
    ['in_progress', 'blocked'],
    ['submitted', 'verified'],
    ['submitted', 'in_progress'],
    ['submitted', 'diverged'],
    ['blocked', 'in_progress'],
    ['blocked', 'diverged'],
  ];

  it.each(LEGAL)('allows %s -> %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  it('rejects self-edges for every status', () => {
    for (const s of ALL_STATUSES) {
      expect(canTransition(s, s)).toBe(false);
    }
  });

  it('rejects every transition not in the legal table', () => {
    const legalSet = new Set(LEGAL.map(([f, t]) => `${f}->${t}`));
    for (const from of ALL_STATUSES) {
      for (const to of ALL_STATUSES) {
        if (from === to) continue;
        const ok = legalSet.has(`${from}->${to}`);
        expect(canTransition(from, to)).toBe(ok);
      }
    }
  });

  it('treats verified as terminal (no outgoing edges)', () => {
    for (const to of ALL_STATUSES) {
      expect(canTransition('verified', to)).toBe(false);
    }
  });

  it('treats diverged as terminal (no outgoing edges)', () => {
    for (const to of ALL_STATUSES) {
      expect(canTransition('diverged', to)).toBe(false);
    }
  });

  it('rejects not_started -> diverged (must start before declaring divergence)', () => {
    expect(canTransition('not_started', 'diverged')).toBe(false);
  });
});

describe('computeNextStatus — happy paths', () => {
  it('start: not_started -> in_progress', () => {
    expect(computeNextStatus(mk('not_started'), 'start')).toBe('in_progress');
  });

  it('submit in self mode: in_progress -> verified (collapsed edge)', () => {
    expect(computeNextStatus(mk('in_progress', 'self'), 'submit')).toBe(
      'verified',
    );
  });

  it('submit in review mode: in_progress -> submitted', () => {
    expect(computeNextStatus(mk('in_progress', 'review'), 'submit')).toBe(
      'submitted',
    );
  });

  it('verify: submitted -> verified', () => {
    expect(computeNextStatus(mk('submitted'), 'verify')).toBe('verified');
  });

  it('return_for_revision: submitted -> in_progress', () => {
    expect(
      computeNextStatus(mk('submitted'), 'return_for_revision'),
    ).toBe('in_progress');
  });

  it('diverge: in_progress -> diverged', () => {
    expect(computeNextStatus(mk('in_progress'), 'diverge')).toBe('diverged');
  });

  it('diverge: submitted -> diverged (verifier escalation)', () => {
    expect(computeNextStatus(mk('submitted'), 'diverge')).toBe('diverged');
  });

  it('diverge: blocked -> diverged', () => {
    expect(computeNextStatus(mk('blocked'), 'diverge')).toBe('diverged');
  });

  it('block: in_progress -> blocked', () => {
    expect(computeNextStatus(mk('in_progress'), 'block')).toBe('blocked');
  });

  it('unblock: blocked -> in_progress', () => {
    expect(computeNextStatus(mk('blocked'), 'unblock')).toBe('in_progress');
  });
});

describe('computeNextStatus — illegal transitions are no-ops', () => {
  it('start from any status other than not_started returns the input status', () => {
    for (const s of ALL_STATUSES) {
      if (s === 'not_started') continue;
      expect(computeNextStatus(mk(s), 'start')).toBe(s);
    }
  });

  it('submit from any status other than in_progress is a no-op (both modes)', () => {
    for (const s of ALL_STATUSES) {
      if (s === 'in_progress') continue;
      expect(computeNextStatus(mk(s, 'self'), 'submit')).toBe(s);
      expect(computeNextStatus(mk(s, 'review'), 'submit')).toBe(s);
    }
  });

  it('verify from any status other than submitted is a no-op', () => {
    for (const s of ALL_STATUSES) {
      if (s === 'submitted') continue;
      expect(computeNextStatus(mk(s), 'verify')).toBe(s);
    }
  });

  it('return_for_revision is only valid from submitted', () => {
    for (const s of ALL_STATUSES) {
      if (s === 'submitted') continue;
      expect(computeNextStatus(mk(s), 'return_for_revision')).toBe(s);
    }
  });

  it('diverge is rejected from not_started and from terminal states', () => {
    expect(computeNextStatus(mk('not_started'), 'diverge')).toBe('not_started');
    expect(computeNextStatus(mk('verified'), 'diverge')).toBe('verified');
    expect(computeNextStatus(mk('diverged'), 'diverge')).toBe('diverged');
  });

  it('block is only valid from in_progress', () => {
    for (const s of ALL_STATUSES) {
      if (s === 'in_progress') continue;
      expect(computeNextStatus(mk(s), 'block')).toBe(s);
    }
  });

  it('unblock is only valid from blocked', () => {
    for (const s of ALL_STATUSES) {
      if (s === 'blocked') continue;
      expect(computeNextStatus(mk(s), 'unblock')).toBe(s);
    }
  });

  it('terminal states ignore every event', () => {
    for (const event of ALL_EVENTS) {
      expect(computeNextStatus(mk('verified'), event)).toBe('verified');
      expect(computeNextStatus(mk('diverged'), event)).toBe('diverged');
    }
  });
});

describe('terminality and observe-feedability predicates', () => {
  it('isTerminal returns true only for verified and diverged', () => {
    expect(isTerminal('verified')).toBe(true);
    expect(isTerminal('diverged')).toBe(true);
    expect(isTerminal('not_started')).toBe(false);
    expect(isTerminal('in_progress')).toBe(false);
    expect(isTerminal('submitted')).toBe(false);
    expect(isTerminal('blocked')).toBe(false);
  });

  it('isVerified returns true only for verified', () => {
    expect(isVerified({ status: 'verified' })).toBe(true);
    expect(isVerified({ status: 'diverged' })).toBe(false);
    expect(isVerified({ status: 'in_progress' })).toBe(false);
  });

  it('isObserveFeedable returns true for verified and diverged (spec §8.2)', () => {
    expect(isObserveFeedable({ status: 'verified' })).toBe(true);
    expect(isObserveFeedable({ status: 'diverged' })).toBe(true);
    expect(isObserveFeedable({ status: 'not_started' })).toBe(false);
    expect(isObserveFeedable({ status: 'in_progress' })).toBe(false);
    expect(isObserveFeedable({ status: 'submitted' })).toBe(false);
    expect(isObserveFeedable({ status: 'blocked' })).toBe(false);
  });
});

describe('hasAllRequiredProof', () => {
  it('returns true when the required list is empty (vacuous)', () => {
    expect(hasAllRequiredProof([], [])).toBe(true);
    expect(hasAllRequiredProof([{ slotId: 'x' }], [])).toBe(true);
  });

  it('returns true when every required slot id appears in the proof items', () => {
    expect(
      hasAllRequiredProof(
        [{ slotId: 'a' }, { slotId: 'b' }],
        ['a', 'b'],
      ),
    ).toBe(true);
  });

  it('returns false when any required slot id is missing', () => {
    expect(
      hasAllRequiredProof([{ slotId: 'a' }], ['a', 'b']),
    ).toBe(false);
  });

  it('ignores extra above-minimum proof items without a slotId', () => {
    expect(
      hasAllRequiredProof(
        [{ slotId: 'a' }, {}, { slotId: 'b' }, {}],
        ['a', 'b'],
      ),
    ).toBe(true);
  });

  it('deduplicates filled slots before checking coverage', () => {
    expect(
      hasAllRequiredProof(
        [{ slotId: 'a' }, { slotId: 'a' }, { slotId: 'a' }],
        ['a'],
      ),
    ).toBe(true);
  });
});

describe('FIELD_ACTION_PROOF_SCHEMAS catalog', () => {
  it('every seeded entry parses against ProofSchemaSchema', () => {
    for (const schema of FIELD_ACTION_PROOF_SCHEMAS) {
      const parsed = ProofSchemaSchema.safeParse(schema);
      if (!parsed.success) {
        throw new Error(
          `proof schema "${schema.id}" failed validation: ${parsed.error.message}`,
        );
      }
      expect(parsed.success).toBe(true);
    }
  });

  it('exposes a unique id per entry', () => {
    const ids = new Set(FIELD_ACTION_PROOF_SCHEMAS.map((s) => s.id));
    expect(ids.size).toBe(FIELD_ACTION_PROOF_SCHEMAS.length);
  });

  it('always seeds a generic-fallback entry so any task category can resolve', () => {
    expect(getProofSchema('generic-fallback')).toBeDefined();
  });

  it('always seeds a divergence-minimum entry for the Reality Diverges path', () => {
    const div = getProofSchema('divergence-minimum');
    expect(div).toBeDefined();
    expect(div?.taskCategory).toBe('divergence');
  });

  it('requiredSlotsFor returns only required slot ids and ignores optional ones', () => {
    // divergence-minimum is the cleanest mixed case: photo+note required, gps_point optional.
    const required = requiredSlotsFor('divergence-minimum');
    expect(required).toEqual(['photo', 'note']);
  });

  it('requiredSlotsFor returns [] for unknown schema ids', () => {
    expect(requiredSlotsFor('not-a-real-schema')).toEqual([]);
  });

  it('every required slot id within a schema is unique', () => {
    for (const schema of FIELD_ACTION_PROOF_SCHEMAS) {
      const ids = schema.slots.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});
