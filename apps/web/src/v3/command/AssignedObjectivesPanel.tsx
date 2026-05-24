/**
 * AssignedObjectivesPanel — the doc's "Ongoing Observe Tasks" launch surface.
 * Each card is a guided field-work package: clicking it (the launch action)
 * opens Objective Focus Mode for that objective. Cards carry the metadata a
 * steward needs to triage: domain, title, location, priority, due date,
 * assignee, and live status.
 */

import { Clock, MapPin, User } from 'lucide-react';
import { OBSERVE_MODULE_DOT } from '../observe/moduleGuidance.js';
import { OBSERVE_MODULE_LABEL } from '../observe/types.js';
import type {
  ObjectivePriority,
  ObjectiveStatus,
} from '../objectives/fieldObjective.js';
import type { FieldObjectiveView } from '../objectives/useFieldObjectives.js';
import css from './ObserveCommandCentrePage.module.css';

interface Props {
  views: FieldObjectiveView[];
  /** Currently highlighted objective (e.g. via a map-marker click). */
  selectedId?: string | null;
  onLaunch: (objectiveId: string) => void;
}

const STATUS_LABEL: Record<ObjectiveStatus, string> = {
  'not-started': 'Not started',
  'in-progress': 'In progress',
  'evidence-submitted': 'Evidence submitted',
  complete: 'Complete',
  'needs-review': 'Needs review',
};

const PRIORITY_LABEL: Record<ObjectivePriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

function formatDue(dueAt?: string): string | null {
  if (!dueAt) return null;
  const d = new Date(dueAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function AssignedObjectivesPanel({
  views,
  selectedId,
  onLaunch,
}: Props) {
  if (views.length === 0) {
    return (
      <section className={css.panel} aria-label="Assigned objectives">
        <p className="eyebrow">Assigned objectives</p>
        <p className={css.emptyNote}>No objectives assigned for this site yet.</p>
      </section>
    );
  }

  return (
    <section className={css.panel} aria-label="Assigned objectives">
      <p className="eyebrow">Assigned objectives</p>
      <div className={css.objCardGrid}>
        {views.map(({ objective, run, evaluation }) => {
          const due = formatDue(objective.dueAt);
          const isSelected = selectedId === objective.id;
          return (
            <button
              key={objective.id}
              type="button"
              className={`${css.objCard} ${isSelected ? css.objCardActive : ''}`}
              onClick={() => onLaunch(objective.id)}
            >
              <span className={css.objCardTop}>
                <span
                  className={css.objCardDot}
                  style={{ background: OBSERVE_MODULE_DOT[objective.module] }}
                />
                <span className={css.objCardModule}>
                  {OBSERVE_MODULE_LABEL[objective.module]}
                </span>
                <span
                  className={`${css.objStatus} ${css[`status_${run.status.replace(/-/g, '_')}`] ?? ''}`}
                >
                  {STATUS_LABEL[run.status]}
                </span>
              </span>

              <span className={css.objCardTitle}>{objective.title}</span>

              {objective.description && (
                <span className={css.objCardDesc}>{objective.description}</span>
              )}

              <span className={css.objCardMeta}>
                <span className={css.objMetaItem}>
                  <MapPin size={13} strokeWidth={2} />
                  {objective.target.center[1].toFixed(4)},{' '}
                  {objective.target.center[0].toFixed(4)}
                </span>
                {due && (
                  <span className={css.objMetaItem}>
                    <Clock size={13} strokeWidth={2} /> Due {due}
                  </span>
                )}
                {objective.assignee && (
                  <span className={css.objMetaItem}>
                    <User size={13} strokeWidth={2} /> {objective.assignee.name}
                  </span>
                )}
                <span
                  className={`${css.objPriority} ${css[`prio_${objective.priority}`] ?? ''}`}
                >
                  {PRIORITY_LABEL[objective.priority]}
                </span>
              </span>

              <span className={css.objProgressTrack}>
                <span
                  className={css.objProgressFill}
                  style={{ width: `${evaluation.pct}%` }}
                />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
