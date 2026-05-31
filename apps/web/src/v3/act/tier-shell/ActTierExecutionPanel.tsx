// ActTierExecutionPanel.tsx
//
// Production tier-shell right-rail detail panel: progress + checklist +
// persisted evidence capture for the selected objective. Promoted from the
// (disposable) tier-prototype ActProtoExecutionPanel so production owns its
// own copy.
//
// Evidence is now OBJECTIVE-DRIVEN (each objective declares which proof items
// it requires via getObjectiveEvidence, @ogden/shared) and PERSISTED:
//
//   - Checklist completion  -> planStratumStore.toggleItem (projectId, objectiveId, itemId)
//                             Same store the Plan stage reads; item ids are globally
//                             unique so progress is shared across Act + Plan views.
//   - Photo counts / confirms / notes -> actEvidenceStore (projectId, objectiveId, descriptorId)

import { useMemo } from 'react';
import { Camera, Check, ClipboardCheck, Plus } from 'lucide-react';
import type {
  PlanStratum,
  PlanStratumObjective,
  PlanStratumObjectiveStatus,
  EvidenceDescriptor,
} from '@ogden/shared';
import { getObjectiveEvidence } from '@ogden/shared';
import {
  usePlanStratumProgressStore,
} from '../../../store/planStratumStore.js';
import {
  useActEvidenceStore,
  EMPTY_CAPTURE,
} from '../../../store/actEvidenceStore.js';
import styles from './ActTierExecutionPanel.module.css';

// Stable empty fallback so the completedIds selector never returns a new
// array reference when the project has no progress for this objective yet.
const EMPTY_IDS: readonly string[] = Object.freeze([]);

interface Props {
  projectId: string;
  tier: PlanStratum | undefined;
  objective: PlanStratumObjective;
  status: PlanStratumObjectiveStatus;
}

export default function ActTierExecutionPanel({
  projectId,
  tier,
  objective,
  status,
}: Props) {
  // -------------------------------------------------------------------------
  // Checklist -- wired to planStratumStore (shared with Plan stage).
  // -------------------------------------------------------------------------
  const completedIds = usePlanStratumProgressStore(
    (s) => s.byProject[projectId]?.[objective.id] ?? EMPTY_IDS,
  );
  const toggleItem = usePlanStratumProgressStore((s) => s.toggleItem);

  // -------------------------------------------------------------------------
  // Evidence -- wired to actEvidenceStore.
  // -------------------------------------------------------------------------
  const capture = useActEvidenceStore(
    (s) => s.byProject[projectId]?.[objective.id] ?? EMPTY_CAPTURE,
  );
  const addPhoto = useActEvidenceStore((s) => s.addPhoto);
  const setConfirm = useActEvidenceStore((s) => s.setConfirm);
  const updateNote = useActEvidenceStore((s) => s.updateNote);
  const saveNote = useActEvidenceStore((s) => s.saveNote);

  // -------------------------------------------------------------------------
  // Progress derivations.
  // -------------------------------------------------------------------------
  const evidence = useMemo(
    () => getObjectiveEvidence(objective),
    [objective],
  );

  const total = objective.checklist.length;
  const done = useMemo(
    () =>
      objective.checklist.filter((item) => completedIds.includes(item.id))
        .length,
    [objective.checklist, completedIds],
  );
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const ready = total > 0 && done === total;

  // -------------------------------------------------------------------------
  // Evidence card renderer. Each branch reproduces the exact markup/classes
  // the old hardcoded cards used, so the visual is unchanged for any card
  // that is shown -- only WHICH cards appear is objective-driven, and the
  // state is now persisted rather than ephemeral.
  // -------------------------------------------------------------------------
  function renderEvidenceCard(descriptor: EvidenceDescriptor) {
    const reqMark = descriptor.required ? (
      <span className={styles.req}> *</span>
    ) : null;

    if (descriptor.kind === 'photo') {
      const target = descriptor.target ?? 1;
      const count = capture.photos[descriptor.id] ?? 0;
      return (
        <div className={styles.evCard} key={descriptor.id}>
          <div className={styles.evCardTop}>
            <span className={styles.evCardTitle}>
              {descriptor.label}
              {reqMark}
            </span>
            <span className={styles.evCardCount}>
              {count}/{target}
            </span>
          </div>
          <button
            type="button"
            className={styles.evBtnFull}
            onClick={() =>
              addPhoto(projectId, objective.id, descriptor.id, target)
            }
          >
            <Camera size={14} aria-hidden="true" />
            Add photo
          </button>
        </div>
      );
    }

    if (descriptor.kind === 'confirm') {
      const ok = capture.confirms[descriptor.id] ?? false;
      return (
        <div className={styles.evCard} key={descriptor.id}>
          <div className={styles.evCardTop}>
            <span className={styles.evCardTitle}>
              {descriptor.label}
              {reqMark}
            </span>
            <span className={styles.evCardCount}>{ok ? 1 : 0}/1</span>
          </div>
          <button
            type="button"
            className={styles.evBtnFull}
            data-confirmed={ok}
            onClick={() =>
              setConfirm(projectId, objective.id, descriptor.id, true)
            }
          >
            <Check size={14} aria-hidden="true" />
            {ok ? 'Confirmed' : 'Confirm'}
          </button>
        </div>
      );
    }

    // kind === 'note'
    const noteValue = capture.notes[descriptor.id] ?? '';
    const saved = capture.notesSaved[descriptor.id] ?? false;
    return (
      <div className={styles.evCard} key={descriptor.id}>
        <div className={styles.evCardTop}>
          <span className={styles.evCardTitle}>
            {descriptor.label}
            {reqMark}
          </span>
          <span className={styles.evCardCount}>{saved ? 1 : 0}/1</span>
        </div>
        <textarea
          className={styles.noteArea}
          rows={3}
          placeholder={descriptor.label}
          value={noteValue}
          onChange={(event) => {
            updateNote(
              projectId,
              objective.id,
              descriptor.id,
              event.target.value,
            );
          }}
        />
        <div className={styles.evBtnRow}>
          <button
            type="button"
            className={styles.evBtnSmall}
            data-saved={saved}
            disabled={noteValue.trim().length === 0}
            onClick={() =>
              saveNote(projectId, objective.id, descriptor.id)
            }
          >
            {saved ? 'Saved' : 'Save note'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.execPanel}>
      <div className={styles.execHeader}>
        <span className={styles.execEyebrow}>{tier?.title ?? 'Objective'}</span>
        <span className={styles.execTitle}>{objective.title}</span>
        <span className={styles.execStatus} data-status={status}>
          {status}
        </span>
        <p className={styles.execDesc}>{objective.focusedQuestion}</p>
      </div>

      <div className={styles.execProgress}>
        <div className={styles.execBar}>
          <div className={styles.execBarFill} style={{ width: `${pct}%` }} />
        </div>
        <div className={styles.execProgressTop}>
          <span>{pct}% ready</span>
          <span>
            {done}/{total} steps
          </span>
        </div>
      </div>

      <section className={styles.execSection}>
        <h4 className={styles.execSectionTitle}>Checklist</h4>
        <div className={styles.execChecklist}>
          {objective.checklist.map((item) => (
            <label key={item.id} className={styles.execCheckRow}>
              <input
                type="checkbox"
                checked={completedIds.includes(item.id)}
                onChange={() => toggleItem(projectId, objective.id, item.id)}
              />
              <span>
                {item.label}
                {!item.optional && <span className={styles.req}> *</span>}
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className={styles.execSection}>
        <h4 className={styles.execSectionTitle}>Evidence</h4>
        {evidence.map(renderEvidenceCard)}
      </section>

      <section className={styles.execSection}>
        <h4 className={styles.execSectionTitle}>This need&apos;s activity</h4>
        <p className={styles.execEmpty}>No observations recorded.</p>
        <button type="button" className={styles.linkBtn}>
          <Plus size={13} aria-hidden="true" />
          Raise follow-up need
        </button>
      </section>

      <button type="button" className={styles.recordBtn} disabled={!ready}>
        <ClipboardCheck size={16} aria-hidden="true" />
        Record observation
      </button>
    </div>
  );
}
