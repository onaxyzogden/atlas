/**
 * ObjectiveExecutionAside — right-rail workspace for an objective in focus.
 * Stands in for the module guidance rail (`ObserveChecklistAside`) whenever
 * `?objective` is active. Renders the active objective's checklist and evidence
 * requirements and writes the steward's progress to `fieldObjectiveStore`.
 *
 * Note-kind evidence doubles as the run summary: saving a note both records the
 * evidence and mirrors the text into `run.summary`, so a single textarea
 * satisfies both the evidence gate and the `requireSummary` gate.
 *
 * Completion/review controls (Submit for review, reviewer actions, timeline
 * write-back) arrive in Phase 5; this rail is the capture surface.
 */

import { Check, CheckCircle2, Send } from 'lucide-react';
import { useFieldObjectiveStore } from '../../../store/fieldObjectiveStore.js';
import { OBSERVE_MODULE_DOT } from '../moduleGuidance.js';
import { OBSERVE_MODULE_LABEL } from '../types.js';
import type { ObjectiveStatus } from '../../objectives/fieldObjective.js';
import type { FieldObjectiveView } from '../../objectives/useFieldObjectives.js';
import ObjectiveEvidenceCapture, {
  type IndexedEvidence,
} from './ObjectiveEvidenceCapture.js';
import css from './ObjectiveExecutionAside.module.css';

const STATUS_LABEL: Record<ObjectiveStatus, string> = {
  'not-started': 'Not started',
  'in-progress': 'In progress',
  'evidence-submitted': 'Evidence submitted',
  complete: 'Complete',
  'needs-review': 'Needs review',
};

const STATUS_CLASS: Record<ObjectiveStatus, string> = {
  'not-started': '',
  'in-progress': css.status_in_progress ?? '',
  'evidence-submitted': css.status_evidence_submitted ?? '',
  complete: css.status_complete ?? '',
  'needs-review': css.status_needs_review ?? '',
};

interface Props {
  projectId: string;
  view: FieldObjectiveView;
  /** Return to the Command Centre overview (used after submit / completion). */
  onExit: () => void;
}

export default function ObjectiveExecutionAside({
  projectId,
  view,
  onExit,
}: Props) {
  const { objective, run, evaluation } = view;
  const toggleCheck = useFieldObjectiveStore((s) => s.toggleCheck);
  const addEvidence = useFieldObjectiveStore((s) => s.addEvidence);
  const removeEvidence = useFieldObjectiveStore((s) => s.removeEvidence);
  const setSummary = useFieldObjectiveStore((s) => s.setSummary);
  const setStatus = useFieldObjectiveStore((s) => s.setStatus);

  const checkedSet = new Set(run.checkedChecklist);

  // Submit advances to "evidence submitted" and returns to the overview, where
  // a reviewer sees the card in its new state. Completing/sending back are the
  // reviewer's two actions on a submitted objective.
  const submitForReview = () => {
    setStatus(projectId, objective.id, 'evidence-submitted');
    onExit();
  };
  const markComplete = () => {
    setStatus(projectId, objective.id, 'complete');
    onExit();
  };
  const sendBack = () => {
    setStatus(projectId, objective.id, 'needs-review');
  };

  return (
    <aside className={css.box} aria-label="Objective workspace">
      <header className={css.header}>
        <div className={css.titleRow}>
          <span
            className={css.dot}
            style={{ background: OBSERVE_MODULE_DOT[objective.module] }}
            aria-hidden="true"
          />
          <span className={css.module}>
            {OBSERVE_MODULE_LABEL[objective.module]}
          </span>
        </div>
        <h2 className={css.title}>{objective.title}</h2>
        {objective.description && (
          <p className={css.desc}>{objective.description}</p>
        )}
        <div className={css.progress}>
          <div className={css.progressBar}>
            <div
              className={css.progressFill}
              style={{ width: `${evaluation.pct}%` }}
            />
          </div>
          <div className={css.progressMeta}>
            <span>{evaluation.pct}% ready</span>
            <span
              className={`${css.statusPill} ${STATUS_CLASS[run.status]}`}
            >
              {STATUS_LABEL[run.status]}
            </span>
          </div>
        </div>
      </header>

      <section className={css.section} aria-label="Checklist">
        <h3 className={css.sectionTitle}>Checklist</h3>
        <ul className={css.checkList}>
          {objective.checklist.map((item) => {
            const done = checkedSet.has(item.id);
            return (
              <li key={item.id}>
                <label className={css.checkItem}>
                  <span
                    className={`${css.checkBox} ${done ? css.checkBoxOn : ''}`}
                    aria-hidden="true"
                  >
                    {done && <Check size={12} strokeWidth={3} />}
                  </span>
                  <input
                    type="checkbox"
                    checked={done}
                    onChange={() =>
                      toggleCheck(projectId, objective.id, item.id)
                    }
                    style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                  />
                  <span
                    className={`${css.checkLabel} ${done ? css.checkLabelDone : ''}`}
                  >
                    {item.label}
                    {item.required && <span className={css.req}>*</span>}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </section>

      <section className={css.section} aria-label="Evidence">
        <h3 className={css.sectionTitle}>Evidence</h3>
        <div className={css.evList}>
          {objective.evidence.map((spec) => {
            const items: IndexedEvidence[] = run.evidence
              .map((evidence, index) => ({ evidence, index }))
              .filter((x) => x.evidence.specId === spec.id);

            if (spec.kind === 'note') {
              // Single-entry + summary mirror: drop any prior note for this
              // spec, record the fresh one, and keep run.summary in sync.
              const handleNoteAdd = (value: string) => {
                [...items]
                  .sort((a, b) => b.index - a.index)
                  .forEach((it) =>
                    removeEvidence(projectId, objective.id, it.index),
                  );
                if (value) {
                  addEvidence(projectId, objective.id, {
                    specId: spec.id,
                    kind: 'note',
                    value,
                  });
                }
                setSummary(projectId, objective.id, value);
              };
              return (
                <ObjectiveEvidenceCapture
                  key={spec.id}
                  spec={spec}
                  items={items}
                  onAdd={handleNoteAdd}
                  onRemove={(index) =>
                    removeEvidence(projectId, objective.id, index)
                  }
                />
              );
            }

            return (
              <ObjectiveEvidenceCapture
                key={spec.id}
                spec={spec}
                items={items}
                onAdd={(value) =>
                  addEvidence(projectId, objective.id, {
                    specId: spec.id,
                    kind: spec.kind,
                    value,
                  })
                }
                onRemove={(index) =>
                  removeEvidence(projectId, objective.id, index)
                }
              />
            );
          })}
        </div>
      </section>

      <footer className={css.footer}>
        {run.status === 'evidence-submitted' ? (
          <>
            <p className={css.reviewNote}>
              Evidence submitted — awaiting review.
            </p>
            <div className={css.reviewActions}>
              <button
                type="button"
                className={css.ghostBtn}
                onClick={sendBack}
              >
                Send back
              </button>
              <button
                type="button"
                className={`${css.ghostBtn} ${css.successBtn}`}
                onClick={markComplete}
              >
                <CheckCircle2 size={15} strokeWidth={2} /> Mark complete
              </button>
            </div>
          </>
        ) : run.status === 'complete' ? (
          <>
            <p className={css.completeNote}>
              <CheckCircle2 size={16} strokeWidth={2} /> Objective complete
            </p>
            <button type="button" className={css.ghostBtn} onClick={onExit}>
              Back to Command Centre
            </button>
          </>
        ) : (
          <>
            {run.status === 'needs-review' && (
              <p className={`${css.reviewNote} ${css.reviewNoteFlag}`}>
                Sent back for review — address the gaps and resubmit.
              </p>
            )}
            {!evaluation.canSubmit && (
              <p className={css.gateHint}>
                Complete the required checklist and evidence to submit.
              </p>
            )}
            <button
              type="button"
              className={css.primaryBtn}
              disabled={!evaluation.canSubmit}
              onClick={submitForReview}
            >
              <Send size={15} strokeWidth={2} /> Submit for review
            </button>
          </>
        )}
      </footer>
    </aside>
  );
}
