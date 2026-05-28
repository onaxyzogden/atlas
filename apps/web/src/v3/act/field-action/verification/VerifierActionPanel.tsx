/**
 * VerifierActionPanel — for review-mode tasks in `submitted` state, per
 * OLOS Act Command Center Spec v1 §7.3. Surfaces three verifier verbs:
 *
 *   - Confirm                → markVerified  (terminal, routes to Observe)
 *   - Return for revision    → returnForRevision (back to `in_progress`)
 *   - Escalate to Plan       → markDiverged with `plan_error` type, which
 *                              raises the Plan revision flag on the parent
 *                              objective. This is the spec's "escalate to
 *                              Plan" verb — equivalent to the steward
 *                              raising Reality Diverges from the verifier
 *                              seat.
 *
 * Verifier identity wiring (RBAC) lands in Phase 5. For Phase 3 we surface
 * the panel for any user looking at a submitted review-mode task so the
 * Slice 3.5 gate is reachable.
 */

import { useState } from 'react';
import { Check, RefreshCcw, RotateCcw } from 'lucide-react';
import type { DivergenceFlag, FieldAction } from '@ogden/shared';
import { useFieldActionStore } from '../../../../store/fieldActionStore.js';
import css from './Verification.module.css';

interface Props {
  projectId: string;
  action: FieldAction;
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `flag-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function VerifierActionPanel({ projectId, action }: Props) {
  const markVerified = useFieldActionStore((s) => s.markVerified);
  const returnForRevision = useFieldActionStore((s) => s.returnForRevision);
  const markDiverged = useFieldActionStore((s) => s.markDiverged);
  const [busy, setBusy] = useState(false);

  const handleConfirm = () => {
    setBusy(true);
    try {
      markVerified(projectId, action.id);
    } finally {
      setBusy(false);
    }
  };

  const handleReturn = () => {
    const note = window.prompt('Why is this returned for revision?');
    if (note === null) return;
    setBusy(true);
    try {
      returnForRevision(projectId, action.id, note.trim() || undefined);
    } finally {
      setBusy(false);
    }
  };

  const handleEscalate = () => {
    const note = window.prompt(
      'Describe the Plan-level issue you are escalating:',
    );
    if (note === null) return;
    if (!note.trim()) {
      window.alert('A note is required to escalate to Plan.');
      return;
    }
    const flag: DivergenceFlag = {
      id: newId(),
      type: 'plan_error',
      noteText: note.trim(),
      proofItems: [],
      capturedAt: new Date().toISOString(),
      parentObjectiveId: action.planObjectiveId,
      resolutionStatus: 'open',
    };
    setBusy(true);
    try {
      markDiverged(projectId, action.id, flag);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={css.panel} data-testid="verifier-action-panel">
      <h3 className={css.panelTitle}>Verifier actions</h3>
      <p className={css.panelIntro}>
        Confirm the proof, return for revision, or escalate to Plan if the
        submission reveals a deeper plan-level issue.
      </p>
      <div className={css.actions}>
        <button
          type="button"
          className={css.confirmBtn}
          onClick={handleConfirm}
          disabled={busy}
          data-testid="verifier-confirm"
        >
          <Check size={12} strokeWidth={2} aria-hidden="true" />
          Confirm
        </button>
        <button
          type="button"
          className={css.returnBtn}
          onClick={handleReturn}
          disabled={busy}
          data-testid="verifier-return"
        >
          <RotateCcw size={12} strokeWidth={2} aria-hidden="true" />
          Return for revision
        </button>
        <button
          type="button"
          className={css.escalateBtn}
          onClick={handleEscalate}
          disabled={busy}
          data-testid="verifier-escalate"
        >
          <RefreshCcw size={12} strokeWidth={2} aria-hidden="true" />
          Escalate to Plan
        </button>
      </div>
    </div>
  );
}
