/**
 * OpenObservationNeedsPanel — the Observe stage's "Open Observation Needs"
 * launch surface. Each card is a guided observation package: clicking it (the
 * launch action) opens the Observation Capture Workspace for that need. Cards
 * carry the metadata a steward needs to triage: domain, title, why the need
 * exists, location, priority, and live status. No assignee, no due date — who
 * does the work and when is an Act concern.
 */

import { MapPin, RefreshCw } from 'lucide-react';
import { OBSERVE_MODULE_DOT } from '../observe/moduleGuidance.js';
import { OBSERVE_MODULE_LABEL } from '../observe/types.js';
import type {
  ObservationNeedPriority,
  ObservationNeedStatus,
} from '../observation-needs/observationNeed.js';
import type { ObservationNeedView } from '../observation-needs/useObservationNeeds.js';
import css from './ObserveCommandCentrePage.module.css';

interface Props {
  views: ObservationNeedView[];
  /** Currently highlighted need (e.g. via a map-marker click). */
  selectedId?: string | null;
  onLaunch: (needId: string) => void;
}

const STATUS_LABEL: Record<ObservationNeedStatus, string> = {
  open: 'Open',
  'in-progress': 'In progress',
  recorded: 'Recorded',
  resolved: 'Resolved',
};

const PRIORITY_LABEL: Record<ObservationNeedPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export default function OpenObservationNeedsPanel({
  views,
  selectedId,
  onLaunch,
}: Props) {
  if (views.length === 0) {
    return (
      <section className={css.panel} aria-label="Open observation needs">
        <p className="eyebrow">Open Observation Needs</p>
        <p className={css.emptyNote}>
          No open observation needs for this site yet.
        </p>
      </section>
    );
  }

  return (
    <section className={css.panel} aria-label="Open observation needs">
      <p className="eyebrow">Open Observation Needs</p>
      <div className={css.objCardGrid}>
        {views.map(({ objective, run, evaluation }) => {
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

              {objective.reason && (
                <span className={css.objCardDesc}>{objective.reason}</span>
              )}

              <span className={css.objCardMeta}>
                <span className={css.objMetaItem}>
                  <MapPin size={13} strokeWidth={2} />
                  {objective.target.center[1].toFixed(4)},{' '}
                  {objective.target.center[0].toFixed(4)}
                </span>
                {objective.trigger && (
                  <span className={css.objMetaItem}>
                    <RefreshCw size={13} strokeWidth={2} /> {objective.trigger}
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
