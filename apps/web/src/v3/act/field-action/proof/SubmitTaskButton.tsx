/**
 * SubmitTaskButton — Slice 3.4 live submit gate.
 *
 * - Disabled while any required proof slot is still pending.
 * - From `not_started`, auto-starts the action before submitting.
 * - Always dispatches `submit`: the state machine routes self-mode to
 *   `verified` directly (collapsing submit+verify) and review-mode to
 *   `submitted` (a verifier hits `markVerified` later — Slice 3.5).
 * - Mobile-sized (min 48px tall) per spec §3.4 capture-UI note.
 */

import { CheckCircle2, Send } from 'lucide-react';
import type { FieldAction } from '@ogden/shared';
import { getProofSchema } from '@ogden/shared';
import { useFieldActionStore } from '../../../../store/fieldActionStore.js';
import { observeSignalConfirmation } from '../../../copy/index.js';
import css from './ProofCapture.module.css';

interface Props {
  projectId: string;
  action: FieldAction;
}

export default function SubmitTaskButton({ projectId, action }: Props) {
  const markStarted = useFieldActionStore((s) => s.markStarted);
  const markSubmitted = useFieldActionStore((s) => s.markSubmitted);

  const schema = getProofSchema(action.proofSchemaId);
  const requiredSlots = schema?.slots.filter((s) => s.required) ?? [];
  const filledSlotIds = new Set(
    action.proofItems.map((p) => p.slotId).filter((id): id is string => Boolean(id)),
  );
  const filledCount = requiredSlots.filter((s) => filledSlotIds.has(s.id)).length;
  const allProofFilled =
    requiredSlots.length > 0 && filledCount === requiredSlots.length;

  const isSelf = action.verificationMode === 'self';
  const canSubmit =
    allProofFilled &&
    (action.status === 'in_progress' || action.status === 'not_started');

  const submit = () => {
    if (!canSubmit) return;
    if (action.status === 'not_started') {
      markStarted(projectId, action.id);
    }
    markSubmitted(projectId, action.id);
  };

  const label = isSelf
    ? action.status === 'verified'
      ? 'Verified'
      : 'Submit and verify'
    : action.status === 'submitted'
      ? 'Awaiting review'
      : 'Submit for review';

  const verified = action.status === 'verified';

  return (
    <div>
      <button
        type="button"
        className={css.submitBtn}
        onClick={submit}
        disabled={!canSubmit || verified || action.status === 'submitted'}
        data-testid="act-task-submit"
      >
        {verified ? (
          <>
            <CheckCircle2 size={16} strokeWidth={2} aria-hidden="true" />
            {label}
          </>
        ) : (
          <>
            <Send size={14} strokeWidth={2} aria-hidden="true" />
            {label}
          </>
        )}
      </button>
      {!allProofFilled && requiredSlots.length > 0 && (
        <p className={css.submitHint} data-testid="act-task-submit-hint">
          {filledCount} of {requiredSlots.length} proof slots captured.
        </p>
      )}
      {allProofFilled && !isSelf && action.status === 'submitted' && (
        <p className={css.submitHint}>
          Submitted — a verifier will confirm the proof.
        </p>
      )}
      {/* Suggestion 4 -- the loop closes visibly: a verified field action now
          lives in the land's record and will surface in Observe. Domain-keyed
          routing is deferred (FieldAction has no domainId yet), so the generic
          land-record confirmation is shown. */}
      {verified && (
        <p className={css.observeSignal} data-testid="act-task-observe-signal">
          {observeSignalConfirmation(null)}
        </p>
      )}
    </div>
  );
}
