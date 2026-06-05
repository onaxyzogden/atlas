// fieldActionStatus.ts
//
// Pure state-machine helpers for FieldAction. The state machine matches
// OLOS Act Command Center Spec v1 §9.4 exactly:
//
//   not_started ──start──▶ in_progress
//   in_progress ──submit──▶ submitted              (review mode)
//   in_progress ──submit──▶ verified               (self mode, terminal)
//   in_progress ──diverge──▶ diverged              (terminal)
//   in_progress ──block──▶ blocked
//   submitted   ──verify──▶ verified               (terminal)
//   submitted   ──return──▶ in_progress            (verifier returns work)
//   submitted   ──diverge──▶ diverged              (verifier escalates)
//   blocked     ──unblock──▶ in_progress
//   blocked     ──diverge──▶ diverged
//   verified    — terminal (no outgoing edges)
//   diverged    — terminal (no outgoing edges)
//
// "Reality Diverges" is reachable from in_progress / submitted / blocked
// per spec §6 (always enabled regardless of proof state, see §9.5). The
// edge from not_started ▶ diverged is intentionally not allowed — a
// steward must at least start the task before they can declare it
// diverged, so we get a meaningful divergence flag with the right author
// and timestamp.
//
// All helpers are dependency-free (no I/O, no stores) so the same code
// runs in apps/web, in Vitest, and from a future server-side validator.

import type {
  FieldAction,
  FieldActionStatus,
  FieldActionVerificationMode,
} from '../schemas/fieldAction/fieldAction.schema.js';

/** All status transition events recognised by the state machine. */
export type FieldActionEvent =
  | 'start'
  | 'submit'
  | 'verify'
  | 'return_for_revision'
  | 'diverge'
  | 'block'
  | 'unblock';

const TERMINAL: ReadonlySet<FieldActionStatus> = new Set<FieldActionStatus>([
  'verified',
  'diverged',
]);

/**
 * Adjacency table of legal status transitions. The state machine has only
 * 10 legal edges so a hand-written table is clearer than a comparator soup
 * and round-trips through TypeScript's exhaustiveness checker.
 */
const LEGAL_EDGES: ReadonlyArray<
  Readonly<{ from: FieldActionStatus; to: FieldActionStatus }>
> = [
  { from: 'not_started', to: 'in_progress' },
  { from: 'in_progress', to: 'submitted' },
  { from: 'in_progress', to: 'verified' }, // self mode collapses submit + verify
  { from: 'in_progress', to: 'diverged' },
  { from: 'in_progress', to: 'blocked' },
  { from: 'submitted', to: 'verified' },
  { from: 'submitted', to: 'in_progress' }, // returned for revision
  { from: 'submitted', to: 'diverged' }, // verifier escalates
  { from: 'blocked', to: 'in_progress' },
  { from: 'blocked', to: 'diverged' },
];

/** True iff `from` ▶ `to` is a legal status transition. */
export function canTransition(
  from: FieldActionStatus,
  to: FieldActionStatus,
): boolean {
  if (from === to) return false;
  return LEGAL_EDGES.some((e) => e.from === from && e.to === to);
}

/**
 * Compute the next status for `action` given a transition `event` and the
 * action's `verificationMode`. Returns the current status unchanged when
 * the event is not applicable from the current state (defensive — the
 * caller can compare returned vs current to detect a no-op).
 */
export function computeNextStatus(
  action: Pick<FieldAction, 'status' | 'verificationMode'>,
  event: FieldActionEvent,
): FieldActionStatus {
  const { status, verificationMode } = action;

  switch (event) {
    case 'start':
      return status === 'not_started' ? 'in_progress' : status;
    case 'submit': {
      if (status !== 'in_progress') return status;
      return submitTarget(verificationMode);
    }
    case 'verify':
      return status === 'submitted' ? 'verified' : status;
    case 'return_for_revision':
      return status === 'submitted' ? 'in_progress' : status;
    case 'diverge':
      // Reachable from in_progress / submitted / blocked per spec §6 / §9.5.
      if (status === 'in_progress' || status === 'submitted' || status === 'blocked') {
        return 'diverged';
      }
      return status;
    case 'block':
      return status === 'in_progress' ? 'blocked' : status;
    case 'unblock':
      return status === 'blocked' ? 'in_progress' : status;
    default: {
      const exhaustiveCheck: never = event;
      return exhaustiveCheck;
    }
  }
}

function submitTarget(mode: FieldActionVerificationMode): FieldActionStatus {
  return mode === 'self' ? 'verified' : 'submitted';
}

/** Terminal states never accept further transitions. */
export function isTerminal(status: FieldActionStatus): boolean {
  return TERMINAL.has(status);
}

/** True for the only two states that mean "this field action is done". */
export function isVerified(
  action: Pick<FieldAction, 'status'>,
): boolean {
  return action.status === 'verified';
}

/**
 * True when the action's evidence should flow into the Observe feed. Per
 * spec §8.2, both verified and diverged tasks route evidence to Observe
 * (verified via the proof schema's domain, diverged via the parent
 * objective's domain). The Slice 3.5 routing helper consumes this.
 */
export function isObserveFeedable(
  action: Pick<FieldAction, 'status'>,
): boolean {
  return action.status === 'verified' || action.status === 'diverged';
}

/**
 * True when all required proof slots for `requiredSlotIds` are present in
 * `proofItems`. The SubmitTaskButton (Slice 3.4) uses this to gate
 * enablement. The catalog (`proofSchemas.ts requiredSlotsFor`) is the
 * authority on which slot ids are required.
 */
export function hasAllRequiredProof(
  proofItems: ReadonlyArray<{ slotId?: string }>,
  requiredSlotIds: ReadonlyArray<string>,
): boolean {
  if (requiredSlotIds.length === 0) return true;
  const filled = new Set(
    proofItems
      .map((p) => p.slotId)
      .filter((id): id is string => typeof id === 'string'),
  );
  return requiredSlotIds.every((id) => filled.has(id));
}

/**
 * Compute the Observe-feed routing key for an evidence-bearing transition
 * (spec §8.2). Verified actions route via the first id in `observeFeedIds[]`
 * if the proof schema declared one — that's the canonical "domain" for the
 * verification (e.g. soil-test → soil-health). Diverged actions always route
 * via the parent objective id: divergence is by definition a Plan-level
 * concern, so the parent objective is the right bucket for the Plan
 * Revision Banner consumer in Phase 4.
 *
 * Pure — never throws and never reads I/O so the same routing is reachable
 * from the web store, future server jobs, and Vitest specs.
 */
export function routeToObserveFeed(
  action: Pick<
    FieldAction,
    'status' | 'observeFeedIds' | 'planObjectiveId'
  >,
): string {
  if (action.status === 'verified') {
    const tagged = action.observeFeedIds?.[0];
    if (typeof tagged === 'string' && tagged.length > 0) return tagged;
  }
  return action.planObjectiveId;
}
