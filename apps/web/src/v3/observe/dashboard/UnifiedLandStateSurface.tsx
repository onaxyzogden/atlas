/**
 * UnifiedLandStateSurface — Surface 1 of the Observe Dashboard (OLOS Spec
 * §4). Top: LandStateSummary chip group with freshness filter. Body: a
 * BentoBox grid of 16 DomainStatusCard rows backed by useDomainSnapshots.
 *
 * Surfaces 2 (Domain Detail) and 3 (Temporal Layer) ship in Slices 4.3
 * and 4.5; the PlanRevisionBanner mounted above the chip group ships in
 * Slice 4.4. The dashboard surface holds the freshness-filter state and
 * passes it down as a controlled prop so the chips and grid stay in sync.
 */

import { useMemo, useState } from 'react';
import type { ObserveFreshness } from '@ogden/shared';
import { useDomainSnapshots } from './useDomainSnapshot.js';
import LandStateSummary from './LandStateSummary.js';
import DomainStatusCard from './DomainStatusCard.js';
import PlanRevisionBanner from './revision/PlanRevisionBanner.js';
import css from './UnifiedLandStateSurface.module.css';

interface Props {
  projectId: string;
}

export default function UnifiedLandStateSurface({ projectId }: Props) {
  const snapshots = useDomainSnapshots(projectId);
  const [filter, setFilter] = useState<ObserveFreshness | null>(null);

  const visible = useMemo(
    () => (filter === null ? snapshots : snapshots.filter((s) => s.freshness === filter)),
    [snapshots, filter],
  );

  return (
    <div className={css.surface}>
      <div className={css.header}>
        <PlanRevisionBanner projectId={projectId} />
        <LandStateSummary
          snapshots={snapshots}
          activeFilter={filter}
          onFilterChange={setFilter}
        />
      </div>
      <div
        className={css.grid}
        role="list"
        aria-label="Universal land domains"
      >
        {visible.map((snapshot) => (
          <DomainStatusCard
            key={snapshot.domainId}
            snapshot={snapshot}
            projectId={projectId}
          />
        ))}
        {visible.length === 0 && (
          <div className={css.empty}>
            No domains match this freshness filter.
          </div>
        )}
      </div>
    </div>
  );
}
