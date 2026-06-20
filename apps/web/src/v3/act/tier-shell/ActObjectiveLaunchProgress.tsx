/**
 * ActObjectiveLaunchProgress -- the Act-side LIVE launch-milestone tracker for an
 * executing objective. The Plan stage authored each Mode-5 (Launch Preparation)
 * objective's `progressTracking.milestones` (>=2 `{ metric, cadence }` pairs) as
 * DISPLAY-ONLY execution bookkeeping. This panel makes that checklist live during
 * Act: it renders the same milestones and lets the executing steward toggle each
 * one "reached", persisting that state through `launchMilestoneStore` so the
 * crossed-off checklist survives reloads.
 *
 * Mirrors the Plan renderer LaunchProgressPanel for the read half (ListChecks,
 * blue --lp-* register, metric + cadence pill) and adds the one new live affordance
 * -- a per-milestone reached toggle. The toggle writes ONLY a reached record
 * (timestamp + who); there is NO free-text input here, so -- unlike the monitoring
 * reading note -- there is no covenant surface to guard.
 *
 * Display + record-only: marking a milestone reached NEVER gates or freezes the
 * Act loop and NEVER mutates the catalogue objective. Self-gates to null when the
 * objective carries no `progressTracking`. Own blue register CSS.
 */

import { CheckCircle2, Circle, ListChecks } from 'lucide-react';
import type { PlanStratumObjective } from '@ogden/shared';
import {
  useLaunchMilestoneStore,
  useObjectiveMilestones,
} from '../../../store/launchMilestoneStore.js';
import css from './ActObjectiveLaunchProgress.module.css';

export interface ActObjectiveLaunchProgressProps {
  projectId: string;
  objective: PlanStratumObjective;
}

/** Day slice of an ISO timestamp for the compact "reached" meta line. */
function reachedDay(iso: string): string {
  return iso.slice(0, 10);
}

export default function ActObjectiveLaunchProgress({
  projectId,
  objective,
}: ActObjectiveLaunchProgressProps) {
  const tracking = objective.progressTracking;

  // --- hooks run unconditionally (self-gate happens AFTER) ---
  const reached = useObjectiveMilestones(projectId, objective.id);
  const markReached = useLaunchMilestoneStore((s) => s.markReached);
  const clearReached = useLaunchMilestoneStore((s) => s.clearReached);

  // Self-gate: only a Mode-5 objective carries launch-milestone tracking.
  if (!tracking) return null;

  return (
    <section
      className={css.panel}
      data-testid="act-execution-progress"
      aria-label="Launch progress tracking"
    >
      <div className={css.head}>
        <ListChecks size={14} aria-hidden="true" className={css.icon} />
        <p className={css.title}>Launch progress</p>
      </div>

      <ul className={css.list}>
        {tracking.milestones.map(({ metric, cadence }, idx) => {
          // milestoneKey IS the authored metric -- one source of truth, no slug.
          const record = reached[metric];
          const isReached = record != null;
          return (
            <li key={metric} className={css.item}>
              <button
                type="button"
                className={`${css.toggle} ${isReached ? css.toggleOn : ''}`}
                aria-pressed={isReached}
                onClick={() =>
                  isReached
                    ? clearReached(projectId, objective.id, metric)
                    : markReached(projectId, objective.id, metric)
                }
                data-testid={`progress-toggle-${idx}`}
                aria-label={
                  isReached
                    ? `Mark "${metric}" not reached`
                    : `Mark "${metric}" reached`
                }
              >
                {isReached ? (
                  <CheckCircle2 size={15} aria-hidden="true" />
                ) : (
                  <Circle size={15} aria-hidden="true" />
                )}
              </button>
              <span className={css.metricWrap}>
                <span className={isReached ? css.metricDone : css.metric}>
                  {metric}
                  <span className={css.cadence}>{cadence}</span>
                </span>
                {isReached && (
                  <span className={css.reachedMeta} data-testid={`progress-reached-${idx}`}>
                    Reached {reachedDay(record.reachedAt)} &middot; {record.reachedBy}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
