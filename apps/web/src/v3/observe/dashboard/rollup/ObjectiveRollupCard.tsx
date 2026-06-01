/**
 * ObjectiveRollupCard — one card of the objective-centric Land State rollup
 * (Observe Surface 4). Shows a single Plan objective's title, its primary
 * domain + freshness pill, and the most recent observations recorded against
 * it (the per-objective activity feed, surfaced here beyond the single Act
 * exec panel). Read-only.
 *
 * Observations are pre-sorted newest-first by the surface; the card shows the
 * first RECENT_LIMIT rows with a "+K more" affordance and an explicit empty
 * state for objectives with no recorded observations yet.
 */

import type {
  ObserveDataPoint,
  ObserveFreshness,
  PlanStratumObjective,
} from '@ogden/shared';
import type { DomainSnapshot } from '../useDomainSnapshot.js';
import {
  readNote,
  formatActyTimestamp,
} from '../observationDisplay.js';
import css from './ObjectiveRollupCard.module.css';

interface Props {
  objective: PlanStratumObjective;
  observations: readonly ObserveDataPoint[];
  snapshot: DomainSnapshot | undefined;
}

const FRESHNESS_LABEL: Record<ObserveFreshness, string> = {
  current: 'Current',
  ageing: 'Ageing',
  stale: 'Stale',
  missing: 'Missing',
};

const RECENT_LIMIT = 3;

export default function ObjectiveRollupCard({
  objective,
  observations,
  snapshot,
}: Props) {
  const recent = observations.slice(0, RECENT_LIMIT);
  const overflow = observations.length - recent.length;

  return (
    <div
      className={css.card}
      data-freshness={snapshot?.freshness ?? 'missing'}
      role="listitem"
    >
      <div className={css.head}>
        <div className={css.title}>{objective.title}</div>
        {snapshot && (
          <span
            className={css.freshness}
            data-freshness={snapshot.freshness}
            title={`${snapshot.label}: ${FRESHNESS_LABEL[snapshot.freshness]}`}
          >
            {FRESHNESS_LABEL[snapshot.freshness]}
          </span>
        )}
      </div>

      {snapshot && (
        <div className={css.domain}>
          {snapshot.label}
          <span className={css.count}>
            {snapshot.observationCount} in domain
          </span>
        </div>
      )}

      {observations.length === 0 ? (
        <div className={css.empty}>No observations recorded yet.</div>
      ) : (
        <ol className={css.feed} aria-label="Recent observations">
          {recent.map((point) => {
            const note = readNote(point.measurementValue);
            return (
              <li key={point.id} className={css.row}>
                <span className={css.timestamp}>
                  {formatActyTimestamp(point.capturedAt)}
                </span>
                {note && <span className={css.note}>{note}</span>}
              </li>
            );
          })}
          {overflow > 0 && (
            <li className={css.more}>+{overflow} more</li>
          )}
        </ol>
      )}
    </div>
  );
}
