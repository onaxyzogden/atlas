/**
 * CaptureExecutionAside — right-rail workspace for an observation need in focus.
 * Stands in for the module guidance rail (`ObserveChecklistAside`) whenever
 * `?need` is active. Renders the active need's checklist and evidence
 * requirements and writes the steward's progress to `observationNeedStore`.
 *
 * Note-kind evidence doubles as the run summary: saving a note both records the
 * evidence and mirrors the text into `run.summary`, so a single textarea
 * satisfies both the evidence gate and the `requireSummary` gate.
 *
 * The terminal action is "Record observation": there is no review gate inside
 * Observe. Recording closes the need; whether the recorded reality warrants
 * intervention is decided downstream by Plan.
 */

import { useState } from 'react';
import { Check, CheckCircle2, Plus } from 'lucide-react';
import { useObservationNeedStore } from '../../../store/observationNeedStore.js';
import { OBSERVE_MODULE_DOT } from '../moduleGuidance.js';
import { OBSERVE_MODULE_LABEL, type ObserveModule } from '../types.js';
import {
  buildRaisedNeed,
  type ObservationNeedStatus,
  type RaiseNeedInput,
} from '../../observation-needs/observationNeed.js';
import type { ObservationNeedView } from '../../observation-needs/useObservationNeeds.js';
import CaptureEvidenceCapture, {
  type IndexedEvidence,
} from './CaptureEvidenceCapture.js';
import RaiseNeedForm from './RaiseNeedForm.js';
import ObservationTimelinePanel from '../../command/ObservationTimelinePanel.js';
import css from './CaptureExecutionAside.module.css';

const STATUS_LABEL: Record<ObservationNeedStatus, string> = {
  open: 'Open',
  'in-progress': 'In progress',
  recorded: 'Recorded',
  resolved: 'Resolved',
};

const STATUS_CLASS: Record<ObservationNeedStatus, string> = {
  open: '',
  'in-progress': css.status_in_progress ?? '',
  recorded: css.status_complete ?? '',
  resolved: css.status_complete ?? '',
};

interface Props {
  projectId: string;
  view: ObservationNeedView;
  /** Return to the Command Centre overview (used after recording). */
  onExit: () => void;
}

export default function CaptureExecutionAside({
  projectId,
  view,
  onExit,
}: Props) {
  const { objective, run, evaluation } = view;
  const toggleCheck = useObservationNeedStore((s) => s.toggleCheck);
  const addEvidence = useObservationNeedStore((s) => s.addEvidence);
  const removeEvidence = useObservationNeedStore((s) => s.removeEvidence);
  const setSummary = useObservationNeedStore((s) => s.setSummary);
  const setStatus = useObservationNeedStore((s) => s.setStatus);
  const createNeed = useObservationNeedStore((s) => s.createNeed);

  const [raising, setRaising] = useState(false);
  const [raisedTitle, setRaisedTitle] = useState<string | null>(null);

  const checkedSet = new Set(run.checkedChecklist);

  // Recording is the single terminal action: it closes the need and returns to
  // the Command Centre, where the timeline shows the recorded observation.
  const recordObservation = () => {
    setStatus(projectId, objective.id, 'recorded');
    onExit();
  };

  // Raise a follow-up need off this observation. The new need inherits this
  // need's module + target and back-links via `sourceObservationId`; we stay in
  // place and show a confirmation rather than navigating away.
  const raiseFollowUp = (input: RaiseNeedInput & { module: ObserveModule }) => {
    const need = buildRaisedNeed(input, {
      id: crypto.randomUUID(),
      projectId,
      module: objective.module,
      target: objective.target,
      origin: 'follow-up',
      sourceObservationId: objective.id,
    });
    createNeed(projectId, need);
    setRaising(false);
    setRaisedTitle(need.title);
  };

  return (
    <aside className={css.box} aria-label="Observation capture">
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
                <CaptureEvidenceCapture
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
              <CaptureEvidenceCapture
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

      {/* Focus-mode timeline filter: the observation timeline scoped to just
          this need (a single-view array yields only its events). */}
      <section className={css.section} aria-label="Observation timeline">
        <ObservationTimelinePanel
          views={[view]}
          heading="This need's activity"
          emptyNote="No observations recorded for this need yet."
        />
      </section>

      <section className={css.section} aria-label="Raise follow-up need">
        {raising ? (
          <RaiseNeedForm
            defaultModule={objective.module}
            onSubmit={raiseFollowUp}
            onCancel={() => setRaising(false)}
          />
        ) : (
          <>
            <button
              type="button"
              className={css.actionBtn}
              onClick={() => {
                setRaisedTitle(null);
                setRaising(true);
              }}
            >
              <Plus size={14} strokeWidth={2} /> Raise follow-up need
            </button>
            {raisedTitle && (
              <p className={css.savedHint}>
                Follow-up need raised: “{raisedTitle}”
              </p>
            )}
          </>
        )}
      </section>

      <footer className={css.footer}>
        {run.status === 'recorded' || run.status === 'resolved' ? (
          <>
            <p className={css.completeNote}>
              <CheckCircle2 size={16} strokeWidth={2} /> Observation recorded
            </p>
            <button type="button" className={css.ghostBtn} onClick={onExit}>
              Back to Command Centre
            </button>
          </>
        ) : (
          <>
            {!evaluation.canRecord && (
              <p className={css.gateHint}>
                Complete the required checklist and evidence to record this
                observation.
              </p>
            )}
            <button
              type="button"
              className={css.primaryBtn}
              disabled={!evaluation.canRecord}
              onClick={recordObservation}
            >
              <CheckCircle2 size={15} strokeWidth={2} /> Record observation
            </button>
          </>
        )}
      </footer>
    </aside>
  );
}
