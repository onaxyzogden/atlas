/**
 * LandStateSummary — top-of-surface freshness counter on the Unified Land
 * State (OLOS Observe Dashboard Spec §4.2). Renders four chips
 * ("N current · N ageing · N stale · N missing") and lets the steward
 * toggle a single-freshness filter on the underlying DomainStatusCard
 * grid. Filter is local UI state owned by UnifiedLandStateSurface; this
 * component is a controlled chip group.
 */

import type { ObserveFreshness } from '@ogden/shared';
import type { DomainSnapshot } from './useDomainSnapshot.js';
import css from './LandStateSummary.module.css';

interface Props {
  snapshots: readonly DomainSnapshot[];
  activeFilter: ObserveFreshness | null;
  onFilterChange: (next: ObserveFreshness | null) => void;
}

const ORDER: readonly ObserveFreshness[] = [
  'current',
  'ageing',
  'stale',
  'missing',
];

const LABEL: Record<ObserveFreshness, string> = {
  current: 'current',
  ageing: 'ageing',
  stale: 'stale',
  missing: 'missing',
};

export default function LandStateSummary({
  snapshots,
  activeFilter,
  onFilterChange,
}: Props) {
  const counts: Record<ObserveFreshness, number> = {
    current: 0,
    ageing: 0,
    stale: 0,
    missing: 0,
  };
  for (const s of snapshots) counts[s.freshness] += 1;

  return (
    <div className={css.wrap}>
      <div className={css.headline}>Unified land state</div>
      <div className={css.chips} role="group" aria-label="Filter by freshness">
        {ORDER.map((bucket) => {
          const isActive = activeFilter === bucket;
          return (
            <button
              key={bucket}
              type="button"
              className={css.chip}
              data-freshness={bucket}
              data-active={isActive}
              aria-pressed={isActive}
              onClick={() => onFilterChange(isActive ? null : bucket)}
            >
              <span className={css.chipCount}>{counts[bucket]}</span>
              <span className={css.chipLabel}>{LABEL[bucket]}</span>
            </button>
          );
        })}
        {activeFilter !== null && (
          <button
            type="button"
            className={css.clear}
            onClick={() => onFilterChange(null)}
          >
            Clear filter
          </button>
        )}
      </div>
    </div>
  );
}
