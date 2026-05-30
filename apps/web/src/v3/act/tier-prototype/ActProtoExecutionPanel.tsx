// ActProtoExecutionPanel.tsx
//
// PROTOTYPE-ONLY right-rail detail mode. Under the stage-semantics reframe, Act
// EXECUTES what Plan defined: complete the checklist, capture field evidence,
// record the result. This is an execution surface, not an Observe authoring one.
// All state is local and never persisted. Delete with folder.

import { useMemo, useState } from 'react';
import { Camera, Check, ClipboardCheck, Plus } from 'lucide-react';
import type { PlanStratum, PlanStratumObjective, PlanStratumObjectiveStatus } from '@ogden/shared';
import styles from './ActProtoTierShell.module.css';

interface Props {
  tier: PlanStratum | undefined;
  objective: PlanStratumObjective;
  status: PlanStratumObjectiveStatus;
}

const PHOTO_TARGET = 3;

export default function ActProtoExecutionPanel({
  tier,
  objective,
  status,
}: Props) {
  const [checked, setChecked] = useState<Set<string>>(() => new Set());
  const [photoCount, setPhotoCount] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [note, setNote] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);

  const total = objective.checklist.length;
  const done = useMemo(
    () => objective.checklist.filter((item) => checked.has(item.id)).length,
    [objective.checklist, checked],
  );
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const ready = total > 0 && done === total;

  function toggle(itemId: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
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
                checked={checked.has(item.id)}
                onChange={() => toggle(item.id)}
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

        <div className={styles.evCard}>
          <div className={styles.evCardTop}>
            <span className={styles.evCardTitle}>
              Checkpoint photos<span className={styles.req}> *</span>
            </span>
            <span className={styles.evCardCount}>
              {photoCount}/{PHOTO_TARGET}
            </span>
          </div>
          <button
            type="button"
            className={styles.evBtnFull}
            onClick={() =>
              setPhotoCount((count) => Math.min(PHOTO_TARGET, count + 1))
            }
          >
            <Camera size={14} aria-hidden="true" />
            Add photo
          </button>
        </div>

        <div className={styles.evCard}>
          <div className={styles.evCardTop}>
            <span className={styles.evCardTitle}>
              Route passable confirmation<span className={styles.req}> *</span>
            </span>
            <span className={styles.evCardCount}>{confirmed ? 1 : 0}/1</span>
          </div>
          <button
            type="button"
            className={styles.evBtnFull}
            data-confirmed={confirmed}
            onClick={() => setConfirmed(true)}
          >
            <Check size={14} aria-hidden="true" />
            {confirmed ? 'Confirmed' : 'Confirm'}
          </button>
        </div>

        <div className={styles.evCard}>
          <div className={styles.evCardTop}>
            <span className={styles.evCardTitle}>
              Summary note<span className={styles.req}> *</span>
            </span>
            <span className={styles.evCardCount}>{noteSaved ? 1 : 0}/1</span>
          </div>
          <textarea
            className={styles.noteArea}
            rows={3}
            placeholder="Summary note"
            value={note}
            onChange={(event) => {
              setNote(event.target.value);
              setNoteSaved(false);
            }}
          />
          <div className={styles.evBtnRow}>
            <button
              type="button"
              className={styles.evBtnSmall}
              data-saved={noteSaved}
              disabled={note.trim().length === 0}
              onClick={() => setNoteSaved(true)}
            >
              {noteSaved ? 'Saved' : 'Save note'}
            </button>
          </div>
        </div>
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
