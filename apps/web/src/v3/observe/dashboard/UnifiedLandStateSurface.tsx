/**
 * UnifiedLandStateSurface — Surface 1 of the Observe Dashboard (OLOS Spec
 * §4). Top: LandStateSummary chip group with freshness filter. Body: a
 * BentoBox grid of 16 DomainStatusCard rows backed by useDomainSnapshots.
 *
 * Surfaces 2 (Domain Detail) and 3 (Temporal Layer) ship in Slices 4.3
 * and 4.5; the PlanRevisionBanner mounted above the chip group ships in
 * Slice 4.4. The dashboard surface holds the freshness-filter state and
 * passes it down as a controlled prop so the chips and grid stay in sync.
 *
 * Slice 4.5 also surfaces the "Present" entry-point in the header
 * toolbar — opens the read-only PresentationModeOverlay; the overlay's
 * own footer mounts the Share dialog.
 */

import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import type { ObserveFreshness } from '@ogden/shared';
import { useProjectStore } from '../../../store/projectStore.js';
import { useStageSearchStore } from '../../../store/stageSearchStore.js';
import { observeDomainMatchesQuery } from '../../search/useStageSearchResults.js';
import { useDomainSnapshots } from './useDomainSnapshot.js';
import LandStateSummary from './LandStateSummary.js';
import DomainStatusCard from './DomainStatusCard.js';
import PlanRevisionBanner from './revision/PlanRevisionBanner.js';
import ChronicSynthesisCard from './ChronicSynthesisCard.js';
import CoOccurrenceSynthesisCard from './CoOccurrenceSynthesisCard.js';
import PresentationModeOverlay from './presentation/PresentationModeOverlay.js';
import PresentationShareDialog from './presentation/PresentationShareDialog.js';
import css from './UnifiedLandStateSurface.module.css';

interface Props {
  projectId: string;
}

export default function UnifiedLandStateSurface({ projectId }: Props) {
  const navigate = useNavigate();
  const snapshots = useDomainSnapshots(projectId);
  const project = useProjectStore((s) =>
    s.projects.find((p) => p.id === projectId),
  );
  const [filter, setFilter] = useState<ObserveFreshness | null>(null);
  const [presentationOpen, setPresentationOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  // Header Stage Search: while a query is active, narrow the 16-domain grid to
  // domains whose label / purpose / id matches. The freshness filter still
  // applies underneath (search ∧ freshness). Selecting a card clears the query
  // so the dashboard returns to its full grid on the revealed domain detail.
  const searchQuery = useStageSearchStore((s) => s.query);
  const clearSearch = useStageSearchStore((s) => s.clear);
  const searchActive = searchQuery.trim() !== '';

  const freshnessVisible = useMemo(
    () => (filter === null ? snapshots : snapshots.filter((s) => s.freshness === filter)),
    [snapshots, filter],
  );
  const visible = useMemo(
    () =>
      searchActive
        ? freshnessVisible.filter((s) =>
            observeDomainMatchesQuery(
              { label: s.label, purpose: s.purpose, domainId: s.domainId },
              searchQuery,
            ),
          )
        : freshnessVisible,
    [freshnessVisible, searchActive, searchQuery],
  );

  return (
    <div className={css.surface}>
      <div className={css.header}>
        <PlanRevisionBanner projectId={projectId} />
        <ChronicSynthesisCard projectId={projectId} />
        <CoOccurrenceSynthesisCard projectId={projectId} />
        <div className={css.toolbar}>
          <button
            type="button"
            className={css.presentButton}
            onClick={() =>
              navigate({
                to: '/v3/project/$projectId/observe/dashboard/rollup',
                params: { projectId },
              })
            }
          >
            By objective
          </button>
          <button
            type="button"
            className={css.presentButton}
            onClick={() => setPresentationOpen(true)}
            disabled={!project}
          >
            Present
          </button>
        </div>
        <LandStateSummary
          snapshots={snapshots}
          activeFilter={filter}
          onFilterChange={setFilter}
        />
      </div>
      <div
        className={css.grid}
        role="list"
        aria-label={
          searchActive
            ? `Universal land domains matching “${searchQuery.trim()}”`
            : 'Universal land domains'
        }
      >
        {visible.map((snapshot) => (
          <DomainStatusCard
            key={snapshot.domainId}
            snapshot={snapshot}
            projectId={projectId}
            onNavigate={searchActive ? clearSearch : undefined}
          />
        ))}
        {visible.length === 0 && (
          <div className={css.empty}>
            {searchActive
              ? `No domains match “${searchQuery.trim()}”.`
              : 'No domains match this freshness filter.'}
          </div>
        )}
      </div>
      {presentationOpen && project && (
        <PresentationModeOverlay
          project={project}
          mode="live"
          onClose={() => {
            setPresentationOpen(false);
            setShareOpen(false);
          }}
          onShare={() => setShareOpen(true)}
        />
      )}
      {shareOpen && project && (
        <PresentationShareDialog
          projectId={project.id}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  );
}
