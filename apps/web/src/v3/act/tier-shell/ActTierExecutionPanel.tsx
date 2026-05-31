// ActTierExecutionPanel.tsx
//
// Production tier-shell right-rail detail panel: progress + checklist + ephemeral
// evidence capture for the selected objective. Promoted from the (disposable)
// tier-prototype ActProtoExecutionPanel so production owns its own copy.
//
// The Evidence section is now OBJECTIVE-DRIVEN: each objective declares which
// proof items it requires via getObjectiveEvidence (packages/shared), instead of
// the old hardcoded trio shown for every objective. Evidence state (photos /
// confirms / notes / checklist) is still LOCAL and not yet persisted -- a
// deliberate visual-first swap; store wiring is a separate follow-up.

import { useMemo, useState } from 'react';
import { Camera, Check, ClipboardCheck, Plus } from 'lucide-react';
import type {
  PlanStratum,
  PlanStratumObjective,
  PlanStratumObjectiveStatus,
  EvidenceDescriptor,
} from '@ogden/shared';
import { getObjectiveEvidence } from '@ogden/shared';
import styles from './ActTierExecutionPanel.module.css';

interface Props {
  tier: PlanStratum | undefined;
  objective: PlanStratumObjective;
  status: PlanStratumObjectiveStatus;
}

export default function ActTierExecutionPanel({
  tier,
  objective,
  status,
}: Props) {
  const [checked, setChecked] = useState<Set<string>>(() => new Set());
  // Evidence state keyed by descriptor id so multiple cards of the same kind
  // can coexist (e.g. two photo cards). Local + ephemeral per the header note.
  const [photoCounts, setPhotoCounts] = useState<Record<string, number>>({});
  const [confirms, setConfirms] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [noteSaved, setNoteSaved] = useState<Record<string, boolean>>({});

  const evidence = useMemo(
    () => getObjectiveEvidence(objective),
    [objective],
  );

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

  // Render one evidence card from its descriptor. Each branch reproduces the
  // exact markup/classes the old hardcoded cards used, so the visual is
  // unchanged for any card that is shown -- only WHICH cards appear is now
  // objective-driven.
  function renderEvidenceCard(descriptor: EvidenceDescriptor) {
    const reqMark = descriptor.required ? (
      <span className={styles.req}> *</span>
    ) : null;

    if (descriptor.kind === 'photo') {
      const target = descriptor.target ?? 1;
      const count = photoCounts[descriptor.id] ?? 0;
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
              setPhotoCounts((prev) => ({
                ...prev,
                [descriptor.id]: Math.min(target, (prev[descriptor.id] ?? 0) + 1),
              }))
            }
          >
            <Camera size={14} aria-hidden="true" />
            Add photo
          </button>
        </div>
      );
    }

    if (descriptor.kind === 'confirm') {
      const ok = confirms[descriptor.id] ?? false;
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
              setConfirms((prev) => ({ ...prev, [descriptor.id]: true }))
            }
          >
            <Check size={14} aria-hidden="true" />
            {ok ? 'Confirmed' : 'Confirm'}
          </button>
        </div>
      );
    }

    // kind === 'note'
    const noteValue = notes[descriptor.id] ?? '';
    const saved = noteSaved[descriptor.id] ?? false;
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
            const { value } = event.target;
            setNotes((prev) => ({ ...prev, [descriptor.id]: value }));
            setNoteSaved((prev) => ({ ...prev, [descriptor.id]: false }));
          }}
        />
        <div className={styles.evBtnRow}>
          <button
            type="button"
            className={styles.evBtnSmall}
            data-saved={saved}
            disabled={noteValue.trim().length === 0}
            onClick={() =>
              setNoteSaved((prev) => ({ ...prev, [descriptor.id]: true }))
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
