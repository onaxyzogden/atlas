/**
 * TaskProofPanel - the formal proof/verification surface for a single ActTask
 * (OLOS Act completion fork, 2026-06-04). Behind the OLOS_FORMAL_PROOF flag;
 * mounted by ActFeedbackLoop only when enabled.
 *
 * Two-party model:
 *   - The submitter (owner/designer) captures one or more ProofRecords. Each is
 *     created locally then pushed to the proofs API (addressed by serverId),
 *     returning a server UUID.
 *   - A separate reviewer (owner/designer/reviewer) signs off with a
 *     VerificationRecord citing the server-saved proof ids. Because the
 *     verifications API does NOT auto-transition the task, the sign-off owns a
 *     second write: it transitions the ActTask to verified-complete (pass) or
 *     needs-rework (anything else) and pushes that too.
 *
 * RBAC mirrors the API gates: proof create = owner/designer; verification
 * create = owner/designer/reviewer. The formal path is a synced capability, so
 * both controls require a serverId.
 */

import { useMemo, useState } from 'react';
import {
  STATUS_LABELS,
  VerificationOutcome,
  roleSatisfies,
  type ActTask,
  type ActTaskStatus,
  type ProjectMemberRecord,
  type ProjectRole,
  type ProofType,
  type VerificationOutcome as VerificationOutcomeType,
  type VerificationRecord,
} from '@ogden/shared';
import {
  useProofRecordStore,
  useVerificationRecordStore,
  useActTaskStore,
} from '../../../store/olos/index.js';
import { useTaskProofSync } from '../../../hooks/useTaskProofSync.js';
import css from './TaskProofPanel.module.css';

interface Props {
  projectId: string;
  task: ActTask;
  serverId?: string;
  members: ProjectMemberRecord[];
  currentUserId?: string;
  myRole?: ProjectRole;
  /**
   * Fired after a successful PASS sign-off (verification pushed + task
   * transitioned). Optional side channel: the tier-shell adapter uses it to
   * project the pass back into Observe as a `task_verification` ObserveDataPoint
   * (it has the PlanStratumObjective in hand). Not invoked on needs-rework, and
   * the OLOS-workspace usage leaves it unset (it lacks the objective to key on).
   */
  onVerifiedPass?: (verification: VerificationRecord) => void;
}

const PROOF_TYPE_OPTIONS: ProofType[] = [
  'note',
  'photo',
  'measurement',
  'receipt',
  'inspection',
  'test',
  'signature',
  'before-after',
  'video',
  'document',
];
const OUTCOME_OPTIONS = VerificationOutcome.options;

/** A proof is server-saved (eligible to be cited in a verification) once its id
 *  is a UUID rather than a local `proof-` draft. */
function isServerProof(id: string): boolean {
  return !id.startsWith('proof-');
}

export default function TaskProofPanel({
  projectId,
  task,
  serverId,
  members,
  currentUserId,
  myRole,
  onVerifiedPass,
}: Props) {
  // Pull this task's proofs + verifications on mount. No-op offline.
  useTaskProofSync(projectId, serverId, task.id);

  const proofsByProject = useProofRecordStore((s) => s.byProject);
  const createProof = useProofRecordStore((s) => s.createProof);
  const pushProof = useProofRecordStore((s) => s.pushOne);

  const verificationsByProject = useVerificationRecordStore((s) => s.byProject);
  const createVerification = useVerificationRecordStore(
    (s) => s.createVerification,
  );
  const pushVerification = useVerificationRecordStore((s) => s.pushOne);

  const setTaskStatus = useActTaskStore((s) => s.setStatus);
  const getTask = useActTaskStore((s) => s.getTask);
  const pushTask = useActTaskStore((s) => s.pushOne);

  const proofs = useMemo(
    () =>
      Object.values(proofsByProject[projectId] ?? {}).filter(
        (p) => p.taskId === task.id,
      ),
    [proofsByProject, projectId, task.id],
  );
  const verifications = useMemo(
    () =>
      Object.values(verificationsByProject[projectId] ?? {}).filter(
        (v) => v.taskId === task.id,
      ),
    [verificationsByProject, projectId, task.id],
  );
  const serverProofIds = useMemo(
    () => proofs.filter((p) => isServerProof(p.id)).map((p) => p.id),
    [proofs],
  );

  // The formal path is a synced capability; both controls require a serverId
  // and mirror the API requireRole gates.
  const isEditor =
    !!myRole &&
    (roleSatisfies(myRole, 'owner') || roleSatisfies(myRole, 'designer'));
  const canCapture = !!serverId && isEditor;
  const canVerify =
    !!serverId && (isEditor || (!!myRole && roleSatisfies(myRole, 'reviewer')));

  const [proofType, setProofType] = useState<ProofType>('note');
  const [proofNote, setProofNote] = useState('');
  const [fileUri, setFileUri] = useState('');
  const [measurementValue, setMeasurementValue] = useState('');
  const [measurementUnit, setMeasurementUnit] = useState('');
  const [busy, setBusy] = useState(false);

  const onCapture = async () => {
    if (!serverId || busy) return;
    setBusy(true);
    try {
      const value =
        proofType === 'measurement' && measurementValue.trim() !== ''
          ? Number(measurementValue)
          : undefined;
      const proof = createProof(projectId, {
        taskId: task.id,
        proofType,
        note: proofNote.trim() || undefined,
        fileUri: fileUri.trim() || undefined,
        measurementValue: Number.isFinite(value) ? value : undefined,
        measurementUnit:
          proofType === 'measurement' && measurementUnit.trim() !== ''
            ? measurementUnit.trim()
            : undefined,
        submittedBy: currentUserId,
        verificationStatus: 'pending',
      });
      await pushProof(proof, serverId);
      setProofNote('');
      setFileUri('');
      setMeasurementValue('');
      setMeasurementUnit('');
    } finally {
      setBusy(false);
    }
  };

  const [outcome, setOutcome] = useState<VerificationOutcomeType>('pass');
  const [verifyNotes, setVerifyNotes] = useState('');

  const onSignOff = async () => {
    if (!serverId || busy || serverProofIds.length === 0) return;
    setBusy(true);
    try {
      const verification = createVerification(projectId, {
        taskId: task.id,
        verifierId: currentUserId,
        outcome,
        criteriaChecked: [],
        notes: verifyNotes.trim() || undefined,
        requiredReworkIds: [],
        proofRecordIds: serverProofIds,
      });
      await pushVerification(verification, serverId);

      // Second write: the verifications API does not transition the task.
      const nextStatus: ActTaskStatus =
        outcome === 'pass' ? 'verified-complete' : 'needs-rework';
      setTaskStatus(projectId, task.id, nextStatus);
      const updated = getTask(projectId, task.id);
      if (updated) await pushTask(updated, serverId);
      if (outcome === 'pass') onVerifiedPass?.(verification);
      setVerifyNotes('');
    } finally {
      setBusy(false);
    }
  };

  const memberName = (userId?: string) => {
    if (!userId) return undefined;
    const m = members.find((x) => x.userId === userId);
    return m?.displayName ?? m?.email ?? userId;
  };

  return (
    <div className={css.packet}>
      <span className={css.packetTitle}>Proof and verification</span>

      {proofs.length === 0 ? (
        <p className={css.packetEmpty}>
          No proof captured yet for this task.
        </p>
      ) : (
        <ul className={css.tasksList}>
          {proofs.map((p) => (
            <li key={p.id}>
              <span>
                {p.proofType}
                {p.note ? `: ${p.note}` : ''}
                {p.proofType === 'measurement' &&
                p.measurementValue !== undefined
                  ? `: ${p.measurementValue}${
                      p.measurementUnit ? ` ${p.measurementUnit}` : ''
                    }`
                  : ''}
              </span>
              <span className={css.taskStatus}>{p.verificationStatus}</span>
              {p.submittedBy ? (
                <span className={css.taskStatus}>
                  {memberName(p.submittedBy)}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canCapture ? (
        <div className={css.form}>
          <div className={css.formRow}>
            <label htmlFor={`proof-type-${task.id}`}>Proof type</label>
            <select
              id={`proof-type-${task.id}`}
              className={css.formSelect}
              aria-label="Proof type"
              value={proofType}
              onChange={(e) => setProofType(e.target.value as ProofType)}
            >
              {PROOF_TYPE_OPTIONS.map((pt) => (
                <option key={pt} value={pt}>
                  {pt}
                </option>
              ))}
            </select>
          </div>
          <div className={css.formRow}>
            <label htmlFor={`proof-note-${task.id}`}>Note</label>
            <input
              id={`proof-note-${task.id}`}
              className={css.formInput}
              type="text"
              aria-label="Proof note"
              value={proofNote}
              onChange={(e) => setProofNote(e.target.value)}
              placeholder="What was done / what the evidence shows"
            />
          </div>
          {proofType === 'measurement' ? (
            <div className={css.formRow}>
              <label htmlFor={`proof-measure-${task.id}`}>Measurement</label>
              <input
                id={`proof-measure-${task.id}`}
                className={css.formInput}
                type="number"
                aria-label="Measurement value"
                value={measurementValue}
                onChange={(e) => setMeasurementValue(e.target.value)}
                placeholder="Value"
              />
              <input
                className={css.formInput}
                type="text"
                aria-label="Measurement unit"
                value={measurementUnit}
                onChange={(e) => setMeasurementUnit(e.target.value)}
                placeholder="Unit"
              />
            </div>
          ) : (
            <div className={css.formRow}>
              <label htmlFor={`proof-uri-${task.id}`}>File URI</label>
              <input
                id={`proof-uri-${task.id}`}
                className={css.formInput}
                type="text"
                aria-label="Proof file URI"
                value={fileUri}
                onChange={(e) => setFileUri(e.target.value)}
                placeholder="Link to a photo / document (optional)"
              />
            </div>
          )}
          <div className={css.actions}>
            <button
              type="button"
              className={css.btnPrimary}
              onClick={() => void onCapture()}
              disabled={busy}
            >
              Capture proof
            </button>
          </div>
        </div>
      ) : null}

      {verifications.length > 0 ? (
        <ul className={css.tasksList}>
          {verifications.map((v) => (
            <li key={v.id}>
              <span>Verification</span>
              <span className={css.taskStatus}>{v.outcome}</span>
              {v.verifierId ? (
                <span className={css.taskStatus}>
                  {memberName(v.verifierId)}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {canVerify ? (
        <div className={css.form}>
          <div className={css.formRow}>
            <label htmlFor={`verify-outcome-${task.id}`}>Outcome</label>
            <select
              id={`verify-outcome-${task.id}`}
              className={css.formSelect}
              aria-label="Verification outcome"
              value={outcome}
              onChange={(e) =>
                setOutcome(e.target.value as VerificationOutcomeType)
              }
            >
              {OUTCOME_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
          <div className={css.formRow}>
            <label htmlFor={`verify-notes-${task.id}`}>Notes</label>
            <input
              id={`verify-notes-${task.id}`}
              className={css.formInput}
              type="text"
              aria-label="Verification notes"
              value={verifyNotes}
              onChange={(e) => setVerifyNotes(e.target.value)}
              placeholder="Sign-off notes"
            />
          </div>
          <div className={css.actions}>
            <button
              type="button"
              className={css.btnPrimary}
              onClick={() => void onSignOff()}
              disabled={busy || serverProofIds.length === 0}
            >
              Sign off
            </button>
            {serverProofIds.length === 0 ? (
              <span className={css.chip}>
                Capture and sync a proof before sign-off
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      <p className={css.note}>
        Current status: {STATUS_LABELS[task.status] ?? task.status}
      </p>
    </div>
  );
}
