/**
 * ActTaskDetail — expanded task body per spec §5.3.
 *
 * Layout (Slice 3.4 — live):
 *   1. Header (title, status badge, verification mode, assignee count).
 *   2. ProofSlotList — every schema slot in order with type-specific
 *      capture (Photo / GPS point / GPS trace / Measurement / Logged
 *      result / Note / Document) plus the "Add more evidence" drawer.
 *   3. Methodology / checklist note placeholder — surfacing the parent
 *      objective's checklist with feeds_into / is_methodology tags is
 *      still a Phase-4 cross-stage concern.
 *   4. Action buttons. SubmitTaskButton goes live once all required
 *      proof slots are filled; Reality Diverges + Mark Blocked /
 *      Unblock + Start are wired here. Reality Diverges UI lands in
 *      Slice 3.5.
 */

import {
  Lock,
  AlertTriangle,
  CheckCircle2,
  Play,
} from 'lucide-react';
import type { FieldAction, FieldActionStatus } from '@ogden/shared';
import { getProofSchema } from '@ogden/shared';
import { useFieldActionStore } from '../../../store/fieldActionStore.js';
import ProofSlotList from './proof/ProofSlotList.js';
import SubmitTaskButton from './proof/SubmitTaskButton.js';
import css from './ActTaskDetail.module.css';

interface Props {
  projectId: string;
  action: FieldAction;
}

const STATUS_LABEL: Record<FieldActionStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  submitted: 'Submitted',
  verified: 'Verified',
  diverged: 'Diverged',
  blocked: 'Blocked',
};

export default function ActTaskDetail({ projectId, action }: Props) {
  const markStarted = useFieldActionStore((s) => s.markStarted);
  const markBlocked = useFieldActionStore((s) => s.markBlocked);
  const unblock = useFieldActionStore((s) => s.unblock);

  const schema = getProofSchema(action.proofSchemaId);
  const requiredSlots = schema?.slots.filter((s) => s.required) ?? [];
  const filledSlotIds = new Set(
    action.proofItems.map((p) => p.slotId).filter((id): id is string => Boolean(id)),
  );
  const filledCount = requiredSlots.filter((s) => filledSlotIds.has(s.id)).length;

  const assigneeCount = action.assignedTo?.length ?? 0;
  const verificationLabel =
    action.verificationMode === 'self' ? 'Self verify' : 'Needs review';

  const handleStart = () => {
    markStarted(projectId, action.id);
  };
  const handleBlock = () => {
    const reason = window.prompt('What is blocking this task?');
    if (!reason || !reason.trim()) return;
    markBlocked(projectId, action.id, reason.trim());
  };
  const handleUnblock = () => {
    unblock(projectId, action.id);
  };

  return (
    <div
      className={css.detail}
      data-status={action.status}
      data-testid="act-task-detail"
    >
      <div className={css.header}>
        <div className={css.titleRow}>
          <h2 className={css.title}>{action.title}</h2>
          <span className={css.statusBadge} data-status={action.status}>
            {STATUS_LABEL[action.status]}
          </span>
        </div>
        <div className={css.metaRow}>
          <span className={css.metaChip}>{verificationLabel}</span>
          {assigneeCount > 0 && (
            <span className={css.metaChip}>
              {assigneeCount} assignee{assigneeCount === 1 ? '' : 's'}
            </span>
          )}
          {requiredSlots.length > 0 && (
            <span className={css.metaChip}>
              {filledCount} / {requiredSlots.length} proof
            </span>
          )}
        </div>
      </div>

      {action.status === 'blocked' && action.blockedReason && (
        <div className={css.blockedReason}>
          <strong>Blocked:</strong> {action.blockedReason}
        </div>
      )}

      <div className={css.section}>
        <span className={css.sectionTitle}>Proof requirements</span>
        <ProofSlotList projectId={projectId} action={action} />
      </div>

      <div className={css.section}>
        <span className={css.sectionTitle}>Methodology &amp; checklist</span>
        <div className={css.methodologyNote}>
          Methodology steps with feeds_into tags surface alongside the
          Phase 4 Observe rewire.
        </div>
      </div>

      <div className={css.actions}>
        {action.status === 'not_started' && (
          <button
            type="button"
            className={`${css.btn} ${css.btnPrimary}`}
            onClick={handleStart}
            data-testid="act-task-start"
          >
            <Play size={12} strokeWidth={2} aria-hidden="true" />
            Start task
          </button>
        )}
        {(action.status === 'in_progress' ||
          action.status === 'not_started' ||
          action.status === 'submitted' ||
          action.status === 'verified') && (
          <SubmitTaskButton projectId={projectId} action={action} />
        )}
        {action.status === 'in_progress' && (
          <button
            type="button"
            className={`${css.btn} ${css.btnDiverge}`}
            disabled
            title="Reality Diverges capture lands in Slice 3.5"
            data-testid="act-task-diverge"
          >
            <AlertTriangle size={12} strokeWidth={2} aria-hidden="true" />
            Reality diverges
          </button>
        )}
        {(action.status === 'in_progress' || action.status === 'not_started') && (
          <button
            type="button"
            className={`${css.btn} ${css.btnDanger}`}
            onClick={handleBlock}
            data-testid="act-task-block"
          >
            <Lock size={12} strokeWidth={2} aria-hidden="true" />
            Mark blocked
          </button>
        )}
        {action.status === 'blocked' && (
          <button
            type="button"
            className={`${css.btn} ${css.btnSecondary}`}
            onClick={handleUnblock}
            data-testid="act-task-unblock"
          >
            <Play size={12} strokeWidth={2} aria-hidden="true" />
            Unblock
          </button>
        )}
        {action.status === 'verified' && (
          <span className={`${css.btn} ${css.btnSecondary}`} aria-disabled="true">
            <CheckCircle2 size={12} strokeWidth={2} aria-hidden="true" />
            Verified
          </span>
        )}
      </div>
    </div>
  );
}
