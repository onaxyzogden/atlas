/**
 * OpenObservationNeedsPanel — the Observe stage's "Open Observation Needs"
 * launch surface. Each card is a guided observation package: clicking it (the
 * launch action) opens the Observation Capture Workspace for that need. Cards
 * carry the metadata a steward needs to triage: domain, origin, title, why the
 * need exists, location, priority, and live status. No assignee, no due date —
 * who does the work and when is an Act concern.
 *
 * The header also hosts the "Raise observation need" action: a steward can add
 * a `manual`-origin need by hand (follow-ups are raised from the Capture
 * Workspace instead). The new need's location defaults to the mean of the
 * existing needs' centres.
 */

import { useState } from 'react';
import { MapPin, Plus, RefreshCw } from 'lucide-react';
import { useObservationNeedStore } from '../../store/observationNeedStore.js';
import { OBSERVE_MODULE_DOT } from '../observe/moduleGuidance.js';
import { OBSERVE_MODULE_LABEL, type ObserveModule } from '../observe/types.js';
import {
  buildRaisedNeed,
  type ObservationNeedOrigin,
  type ObservationNeedPriority,
  type ObservationNeedStatus,
  type RaiseNeedInput,
} from '../observation-needs/observationNeed.js';
import type { ObservationNeedView } from '../observation-needs/useObservationNeeds.js';
import RaiseNeedForm from '../observe/capture/RaiseNeedForm.js';
import css from './ObserveCommandCentrePage.module.css';

interface Props {
  projectId: string;
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

const ORIGIN_LABEL: Record<ObservationNeedOrigin, string> = {
  seed: 'Seed',
  'follow-up': 'Follow-up',
  manual: 'Manual',
};

/** Fallback site centre when there are no needs to average (MTC). */
const FALLBACK_CENTER: [number, number] = [-78.2, 44.5];

export default function OpenObservationNeedsPanel({
  projectId,
  views,
  selectedId,
  onLaunch,
}: Props) {
  const createNeed = useObservationNeedStore((s) => s.createNeed);
  const [raising, setRaising] = useState(false);
  const [raisedTitle, setRaisedTitle] = useState<string | null>(null);

  // Default a manual need's location to the mean of the existing centres so it
  // lands inside the site rather than at an arbitrary point.
  const meanCenter = (): [number, number] => {
    const centers = views.map((v) => v.objective.target.center);
    if (centers.length === 0) return FALLBACK_CENTER;
    return [
      centers.reduce((a, c) => a + c[0], 0) / centers.length,
      centers.reduce((a, c) => a + c[1], 0) / centers.length,
    ];
  };

  const raiseManual = (input: RaiseNeedInput & { module: ObserveModule }) => {
    const need = buildRaisedNeed(input, {
      id: crypto.randomUUID(),
      projectId,
      module: input.module,
      target: { center: meanCenter() },
      origin: 'manual',
    });
    createNeed(projectId, need);
    setRaising(false);
    setRaisedTitle(need.title);
  };

  return (
    <section className={css.panel} aria-label="Open observation needs">
      <div className={css.panelHead}>
        <p className="eyebrow">Open Observation Needs</p>
        <button
          type="button"
          className={css.raiseBtn}
          onClick={() => {
            setRaisedTitle(null);
            setRaising((v) => !v);
          }}
        >
          <Plus size={14} strokeWidth={2} /> Raise observation need
        </button>
      </div>

      {raising && (
        <div className={css.raiseFormWrap}>
          <RaiseNeedForm
            showModulePicker
            onSubmit={raiseManual}
            onCancel={() => setRaising(false)}
          />
        </div>
      )}
      {raisedTitle && !raising && (
        <p className={css.raiseHint}>Observation need raised: “{raisedTitle}”</p>
      )}

      {views.length === 0 ? (
        <p className={css.emptyNote}>
          No open observation needs for this site yet.
        </p>
      ) : (
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
                  <span
                    className={`${css.objOrigin} ${css[`origin_${objective.origin.replace(/-/g, '_')}`] ?? ''}`}
                  >
                    {ORIGIN_LABEL[objective.origin]}
                  </span>
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
      )}
    </section>
  );
}
