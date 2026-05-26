/**
 * ActFeedbackLoop — the Act→upstream return path. Lists the tasks attached
 * to the current Act objective and lets the steward raise an
 * EscalationRecord routed back to Observe / Plan / Risk / Monitoring.
 *
 * The full task-lifecycle + proof-capture UI lands in a later phase; here
 * we provide the escalation primitive so the feedback loop is closed and
 * the schema is exercised end-to-end.
 */

import { useMemo, useState } from 'react';
import {
  EscalationSeverity,
  EscalationTriggerKind,
  STATUS_LABELS,
  Stage,
  type Objective,
} from '@ogden/shared';
import {
  useActTaskStore,
  useEscalationRecordStore,
} from '../../../store/olos/index.js';
import css from './HandoffSection.module.css';

interface Props {
  projectId: string;
  objective: Objective;
}

const STAGE_OPTIONS = Stage.options;
const TRIGGER_OPTIONS = EscalationTriggerKind.options;
const SEVERITY_OPTIONS = EscalationSeverity.options;

export default function ActFeedbackLoop({ projectId, objective }: Props) {
  const taskByProject = useActTaskStore((s) => s.byProject);
  const escalationByProject = useEscalationRecordStore((s) => s.byProject);
  const createEscalation = useEscalationRecordStore((s) => s.createEscalation);

  const tasks = useMemo(
    () =>
      Object.values(taskByProject[projectId] ?? {}).filter(
        (t) => t.objectiveId === objective.id,
      ),
    [taskByProject, projectId, objective.id],
  );
  const escalations = useMemo(
    () =>
      Object.values(escalationByProject[projectId] ?? {}).filter(
        (e) => e.objectiveId === objective.id,
      ),
    [escalationByProject, projectId, objective.id],
  );

  const [showForm, setShowForm] = useState(false);
  const [trigger, setTrigger] = useState<typeof TRIGGER_OPTIONS[number]>(
    'new-condition',
  );
  const [severity, setSeverity] = useState<typeof SEVERITY_OPTIONS[number]>(
    'medium',
  );
  const [routedTo, setRoutedTo] = useState<typeof STAGE_OPTIONS[number]>(
    'observe',
  );
  const [note, setNote] = useState('');

  const onRaise = () => {
    if (!trigger || !routedTo) return;
    createEscalation(projectId, {
      objectiveId: objective.id,
      triggerKind: trigger,
      triggerNote: note,
      severity,
      routedToStage: routedTo,
      routedToDomain: objective.domain,
      requestedAction: '',
      status: 'open',
    });
    setNote('');
    setShowForm(false);
  };

  return (
    <div className={css.wrap}>
      <div className={css.packet}>
        <span className={css.packetTitle}>Act tasks for this objective</span>
        {tasks.length === 0 ? (
          <p className={css.packetEmpty}>
            No tasks yet — emit a Plan handoff from the matching Plan
            objective to seed the first task.
          </p>
        ) : (
          <ul className={css.tasksList}>
            {tasks.map((t) => (
              <li key={t.id}>
                <span>{t.title}</span>
                <span className={css.taskStatus}>
                  {STATUS_LABELS[t.status] ?? t.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={css.actions}>
        <button
          type="button"
          className={css.btnGhost}
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? 'Cancel escalation' : 'Raise escalation'}
        </button>
        {escalations.length > 0 ? (
          <span className={css.chip}>
            {escalations.length} raised from this objective
          </span>
        ) : null}
      </div>

      {showForm ? (
        <div className={css.form}>
          <div className={css.formRow}>
            <label htmlFor="esc-trigger">Trigger</label>
            <select
              id="esc-trigger"
              className={css.formSelect}
              value={trigger}
              onChange={(e) =>
                setTrigger(e.target.value as typeof TRIGGER_OPTIONS[number])
              }
            >
              {TRIGGER_OPTIONS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
          <div className={css.formRow}>
            <label htmlFor="esc-severity">Severity</label>
            <select
              id="esc-severity"
              className={css.formSelect}
              value={severity}
              onChange={(e) =>
                setSeverity(e.target.value as typeof SEVERITY_OPTIONS[number])
              }
            >
              {SEVERITY_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className={css.formRow}>
            <label htmlFor="esc-route">Route to</label>
            <select
              id="esc-route"
              className={css.formSelect}
              value={routedTo}
              onChange={(e) =>
                setRoutedTo(e.target.value as typeof STAGE_OPTIONS[number])
              }
            >
              {STAGE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className={css.formRow}>
            <label htmlFor="esc-note">Note</label>
            <input
              id="esc-note"
              className={css.formInput}
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What changed / what needs upstream attention?"
            />
          </div>
          <div className={css.actions}>
            <button
              type="button"
              className={css.btnPrimary}
              onClick={onRaise}
            >
              Raise escalation
            </button>
          </div>
        </div>
      ) : null}

      <p className={css.note}>
        Escalations feed back to Observe / Plan / Risk / Monitoring so the
        owning Stage can re-observe, redesign, or close the signal.
      </p>
    </div>
  );
}
