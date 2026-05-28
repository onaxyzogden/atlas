/**
 * ActTaskDetail — expanded task body per spec §5.3.
 *
 * Layout:
 *   1. Header (title, status badge, verification mode, assignee count)
 *   2. Proof requirements (primary, highest visual weight) — each
 *      required slot shows label + instruction; "Capture" wiring lands
 *      in Slice 3.4 (PhotoCapture / GpsTraceCapture / etc).
 *   3. Methodology / checklist note placeholder — Slice 3.4 will surface
 *      the parent objective's checklist with feeds_into / is_methodology
 *      tags. For Slice 3.3 we render a placeholder so the layout is
 *      verifiable.
 *   4. Action buttons (Start / Submit / Reality Diverges / Mark Blocked /
 *      Unblock). Submit + Reality Diverges are disabled with explicit
 *      Slice 3.4 / 3.5 hints; Mark Blocked + Start + Unblock are wired
 *      live via fieldActionStore mutators.
 */

import {
  Camera,
  MapPin,
  Route,
  Ruler,
  FileText,
  ClipboardList,
  StickyNote,
  Lock,
  AlertTriangle,
  CheckCircle2,
  Play,
  Send,
} from 'lucide-react';
import type {
  FieldAction,
  FieldActionStatus,
  FieldActionProofType,
} from '@ogden/shared';
import { getProofSchema } from '@ogden/shared';
import { useFieldActionStore } from '../../../store/fieldActionStore.js';
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

const PROOF_ICON: Record<FieldActionProofType, typeof Camera> = {
  photo: Camera,
  gps_point: MapPin,
  gps_trace: Route,
  measurement: Ruler,
  logged_result: ClipboardList,
  note: StickyNote,
  document: FileText,
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
  const allProofFilled = requiredSlots.length > 0 && filledCount === requiredSlots.length;

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
        {requiredSlots.length === 0 ? (
          <div className={css.methodologyNote}>
            No proof required for this task category.
          </div>
        ) : (
          requiredSlots.map((slot) => {
            const filled = filledSlotIds.has(slot.id);
            const Icon = PROOF_ICON[slot.proofType] ?? Camera;
            return (
              <div
                key={slot.id}
                className={css.proofSlot}
                data-filled={filled ? 'true' : 'false'}
              >
                <span className={css.proofIcon}>
                  <Icon size={14} strokeWidth={1.75} aria-hidden="true" />
                </span>
                <div className={css.proofMeta}>
                  <span className={css.proofLabel}>{slot.label}</span>
                  <span className={css.proofInstruction}>{slot.instruction}</span>
                </div>
                <span className={css.proofState} data-filled={filled ? 'true' : 'false'}>
                  {filled ? 'Captured' : 'Pending'}
                </span>
              </div>
            );
          })
        )}
      </div>

      <div className={css.section}>
        <span className={css.sectionTitle}>Methodology &amp; checklist</span>
        <div className={css.methodologyNote}>
          Methodology steps with feeds_into tags arrive in Slice 3.4 alongside
          live proof capture.
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
        {action.status === 'in_progress' && (
          <button
            type="button"
            className={`${css.btn} ${css.btnPrimary}`}
            disabled
            title="Live submission lands in Slice 3.4"
            data-testid="act-task-submit"
          >
            <Send size={12} strokeWidth={2} aria-hidden="true" />
            Submit task
          </button>
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
      {action.status === 'in_progress' && !allProofFilled && (
        <span className={css.btnHint}>
          Submit unlocks once proof slots are captured (Slice 3.4).
        </span>
      )}
    </div>
  );
}
