/**
 * DomainDetailLayout — Surface 2 of the Observe Dashboard (OLOS Observe
 * Dashboard Spec §4). Three-column orchestrator:
 *
 *   left   = DomainOverlayStrip (chip strip; primary bundle + extra layers)
 *            + DomainObservationNeeds (open needs deep-linked to legacy
 *              Observation Capture Workspace)
 *   center = DomainMapHost (DiagnoseMap fitted to the parcel boundary with
 *            data point markers) + DomainObservationList (chronological
 *            union of real data points + virtual feed-entry projections,
 *            with supersession indicators)
 *   right  = DomainEvidenceLibrary (paginated proof grid)
 *            + LegacyModuleEmbed when OBSERVE_DOMAIN_CATALOG[domainId]
 *              .legacyModuleMapping resolves to one of the 7 Phase 3
 *              module dashboards.
 *
 * 9 net-new domains (legacyModuleMapping === null) render the thin shell
 * without the legacy embed — overlay strip + observation list + empty
 * states fill the surface honestly until real data accumulates.
 *
 * The dashboard surface owns the activeOverlayIds state: Slice 4.3 wires
 * only the visual chip strip; Slice 4.4 layers map activation onto these
 * ids when the Plan Revision Banner lands. Until then, toggling chips
 * updates local state but the map already renders the bundle visually.
 */

import { useMemo, useState, useEffect } from 'react';
import type { OverlayId, UniversalDomain } from '@ogden/shared';
import {
  OBSERVE_DOMAIN_CATALOG,
  UNIVERSAL_DOMAIN_LABELS,
} from '@ogden/shared';
import { useV3Project } from '../../../data/useV3Project.js';
import { useDomainPoints } from './useDomainPoints.js';
import { useDomainSnapshots } from '../useDomainSnapshot.js';
import DomainDetailHeader from './DomainDetailHeader.js';
import DomainOverlayStrip from './DomainOverlayStrip.js';
import DomainMapHost from './DomainMapHost.js';
import DomainObservationList from './DomainObservationList.js';
import type { SourceFilter } from './observationSource.js';
import DomainEvidenceLibrary from './DomainEvidenceLibrary.js';
import DomainObservationNeeds from './DomainObservationNeeds.js';
import LegacyModuleEmbed from './LegacyModuleEmbed.js';
import PlanRevisionBanner from '../revision/PlanRevisionBanner.js';
import css from './DomainDetailLayout.module.css';

interface Props {
  projectId: string;
  domainId: UniversalDomain;
  /**
   * Optional pre-seed for the observation list's source filter, supplied when
   * the steward arrives via an Objective Rollup "View in Domain Detail"
   * deep-link (`?source=act`). Folded into the list key so re-entering the same
   * domain through a fresh deep-link re-applies the pre-filter.
   */
  initialSourceFilter?: SourceFilter;
}

const FALLBACK_CENTROID: [number, number] = [-78.2, 44.5];

function bundleFor(domainId: UniversalDomain): readonly OverlayId[] {
  return OBSERVE_DOMAIN_CATALOG[domainId].defaultOverlayBundle;
}

export default function DomainDetailLayout({
  projectId,
  domainId,
  initialSourceFilter,
}: Props) {
  const project = useV3Project(projectId);
  const view = useDomainPoints(projectId, domainId);
  const snapshots = useDomainSnapshots(projectId);
  const snapshot = useMemo(
    () => snapshots.find((s) => s.domainId === domainId) ?? null,
    [snapshots, domainId],
  );

  const defaultBundle = bundleFor(domainId);
  const [activeOverlayIds, setActiveOverlayIds] = useState<readonly OverlayId[]>(
    defaultBundle,
  );

  // Reset overlays when navigating between domains so the chips reflect
  // the new domain's default bundle rather than the prior domain's last
  // selection. Equality compares by id list — no-op when re-renders fire
  // for unrelated reasons.
  useEffect(() => {
    setActiveOverlayIds(defaultBundle);
  }, [defaultBundle]);

  const toggleOverlay = (id: OverlayId) => {
    setActiveOverlayIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const legacyId = OBSERVE_DOMAIN_CATALOG[domainId].legacyModuleMapping;
  const centroid = (project?.location.center ??
    FALLBACK_CENTROID) as [number, number];
  const boundary = project?.location.boundary;
  const label = UNIVERSAL_DOMAIN_LABELS[domainId];

  return (
    <div className={css.layout}>
      <DomainDetailHeader
        projectId={projectId}
        domainId={domainId}
        domainLabel={label}
        freshness={snapshot?.freshness ?? 'missing'}
        latestStatus={snapshot?.latestStatus ?? null}
        observationCount={snapshot?.observationCount ?? 0}
        divergenceCount={snapshot?.divergenceCount ?? 0}
      />

      <PlanRevisionBanner projectId={projectId} />

      <div className={css.body}>
        <aside className={css.leftCol} aria-label="Domain overlays and needs">
          <DomainOverlayStrip
            bundle={defaultBundle}
            activeOverlayIds={activeOverlayIds}
            onToggle={toggleOverlay}
          />
          <section className={css.section}>
            <h2 className={css.sectionTitle}>Open observation needs</h2>
            <DomainObservationNeeds
              projectId={projectId}
              domainId={domainId}
            />
          </section>
        </aside>

        <main className={css.centerCol} aria-label="Domain map and observations">
          <div className={css.mapShell}>
            <DomainMapHost
              centroid={centroid}
              boundary={boundary}
              points={view.all}
            />
          </div>
          <section className={css.section}>
            <h2 className={css.sectionTitle}>Observations</h2>
            <DomainObservationList
              key={`${domainId}:${initialSourceFilter ?? 'all'}`}
              projectId={projectId}
              view={view}
              initialSourceFilter={initialSourceFilter}
            />
          </section>
        </main>

        <aside className={css.rightCol} aria-label="Evidence and module content">
          <section className={css.section}>
            <h2 className={css.sectionTitle}>Evidence library</h2>
            <DomainEvidenceLibrary view={view} />
          </section>
          {legacyId && (
            <section className={css.section}>
              <LegacyModuleEmbed domainId={domainId} />
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
