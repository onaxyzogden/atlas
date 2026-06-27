// ObserveLensDashboard.tsx — mock-backed Observe lens surface (NOT yet wired to live data)
//
// Root of the "observational lens" Observe dashboard. Promoted from the prior
// `prototype/` namespace; this is now the live `module-bar` Observe shell
// (mounted by ObserveLayout) as well as the chrome-free debug route
// /v3/prototype/observe-lens. Self-contained state; no project context,
// no live data, no MapLibre — fed entirely by local mock fixtures.
// Lens identity/order/domains come from @ogden/shared OBSERVE_LENSES (live);
// all rich display values are local mock fixtures (see ./mockData).
//
// LAYOUT: this is now composed on Atlas's real StageShell (between-rails),
// mirroring act/tier-shell/ActTierShell. The top ObserveLensSpine is now a
// minimal filter-chip bar (icon + label + freshness dot, filter-only); the rich
// per-lens cards (meta, divergence, summary) moved DOWN into ObserveLensDetailRail,
// mounted in StageShell's `bottomTray` (between-rails) so it sits under the map
// canvas between the full-height left/right rails. A whole-card click in that
// rail opens the lens's DomainDetailSlideUp (each card carries a button-styled
// "View all observations" CTA; filter reset lives in the top spine chips). The
// right rail stacks Land Intelligence atop a vertical Recent
// Observations list (one shared scroll, via IntelligencePanel's `footer`). The
// internal TopBar was dropped (it duplicated the global app-shell header). The
// old CSS `zoom` box is gone; the UI renders at Act's natural proportions (see
// the de-zoom rebake in ./components.tsx and the spine in ./ObserveLensSpine.tsx).

import { useMemo, useState } from 'react';
import type { ObserveLensId } from '@ogden/shared';
import { DEFAULT_COMMUNITY_HORIZON_DAYS } from '@ogden/shared';
import type { ObserveLensDataSource } from '../../../store/projectStore.js';
import { useCommunityWorkPlanStore } from '../../../store/communityWorkPlanStore.js';
import { useBuiltEnvironmentStoreV2 } from '../../../store/builtEnvironmentStoreV2.js';
import { useWorkItemStore } from '../../../store/workItemStore.js';
import {
  useCommunityMeetingPlaceStore,
  selectMeetingPlace,
} from '../../../store/communityMeetingPlaceStore.js';
import {
  resolveMeetingPlaceCoords,
  selectUpcomingCommunityMeetings,
} from '../../../features/community/communityMeetingPlace.js';
import StageShell from '../../_shell/StageShell.js';
import { useViewScope } from '../../roles/useViewScope.js';
import { C, F } from './tokens.js';
import { LensDataProvider } from './lensData/LensDataContext.js';
import { mockBundle } from './lensData/mockBundle.js';
import { useLiveLensBundle } from './lensData/liveBundle.js';
import type { MockObservation } from './types.js';
import ObserveLensSpine from './ObserveLensSpine.js';
import ObserveLensDetailRail from './ObserveLensDetailRail.js';
import {
  CycleTimelineBar,
  DomainDetailSlideUp,
  IntelligencePanel,
  PseudoMap,
  RecentObservationsStrip,
} from './components.js';
import ObserveMap, { type ObserveMeetingPlace } from './ObserveMap.js';
import css from './ObserveLensDashboard.module.css';

interface Props {
  /**
   * The project whose live ObserveDataPoint store + domain snapshots feed
   * the live bundle. Omitted on the chrome-free debug route
   * (/v3/prototype/observe-lens), which has no project context and so
   * always renders the mock fixtures.
   */
  projectId?: string;
  /**
   * Which source to render. Defaults to `live`; resolves to `mock` when no
   * projectId is available (debug route) regardless of this value.
   */
  dataSource?: ObserveLensDataSource;
}

export default function ObserveLensDashboard({ projectId, dataSource = 'live' }: Props) {
  const [activeLens, setActiveLens] = useState<string>('all');
  const [selectedObs, setSelectedObs] = useState<MockObservation | null>(null);
  const [detailLens, setDetailLens] = useState<ObserveLensId | null>(null);

  // Operational Role Layer: ring the viewer's in-focus lenses (the lens
  // dashboard is the all-domains overview, so it rings rather than collapses).
  // Disengaged on the chrome-free debug route (no projectId) and for
  // solo/no-role viewers ⇒ every lens renders exactly as before.
  const viewScope = useViewScope(projectId ?? '');

  // Phase 5: resolve the bundle from the per-project data-source choice.
  // useLiveLensBundle is a hook, so it is called unconditionally (rules of
  // hooks); when the lens renders mock it builds over the empty projectId and
  // the result is discarded. Every lens component reads the chosen bundle via
  // LensDataProvider/useLensData rather than importing mockData directly.
  const liveBundle = useLiveLensBundle(projectId ?? '');
  const useMock = dataSource === 'mock' || !projectId;
  const bundle = useMock ? mockBundle : liveBundle;

  // Communal-meeting marker (live + real geometry only). Raw subscriptions
  // derived in useMemo (Zustand selector-stability rule): the steward's
  // EXPLICIT meeting-place designation + the CONFIRMED community meetings,
  // cross-checked against the WorkItem spine — all via the shared pure helpers.
  const meetingDesignation = useCommunityMeetingPlaceStore((s) =>
    selectMeetingPlace(s, projectId ?? ''),
  );
  const beEntities = useBuiltEnvironmentStoreV2((s) => s.entities);
  const communityProposals = useCommunityWorkPlanStore((s) => s.proposals);
  const workItems = useWorkItemStore((s) => s.items);
  const meetingTodayISO = useMemo(
    () => new Date().toISOString().slice(0, 10),
    [],
  );
  const meetingPlace = useMemo<ObserveMeetingPlace | null>(() => {
    if (useMock || !projectId) return null;
    const coords = resolveMeetingPlaceCoords(meetingDesignation, beEntities);
    if (!coords) return null;
    const spineStatusById = new Map<string, string>();
    for (const it of workItems) spineStatusById.set(it.id, it.status);
    const entries = selectUpcomingCommunityMeetings(
      communityProposals,
      projectId,
      meetingTodayISO,
      DEFAULT_COMMUNITY_HORIZON_DAYS,
      spineStatusById,
    );
    if (entries.length === 0) return null;
    return {
      lng: coords[0],
      lat: coords[1],
      entries: entries.map((e) => ({ title: e.title, dueDate: e.dueDate })),
    };
  }, [
    useMock,
    projectId,
    meetingDesignation,
    beEntities,
    communityProposals,
    workItems,
    meetingTodayISO,
  ]);

  const handleLensChange = (id: string) => {
    setActiveLens(id);
    setSelectedObs(null);
  };

  const handleObsClick = (obs: MockObservation) => {
    setSelectedObs((prev) => (prev?.id === obs.id ? null : obs));
  };

  return (
    // .lensShell is position:relative so the absolute slide-up (a SIBLING below,
    // NOT StageShell's `overlay` slot) covers the spine + shell — matching
    // today's full-bleed slide-up and Act's sibling-modal pattern.
    // The internal TopBar was removed: it duplicated the global app-shell header
    // (OGDEN / Land OS + stage chips + Share/Present); TopBar stays exported in
    // components.tsx (no-deletion) for the chrome-free debug route's use.
    // LensDataProvider feeds the resolved bundle to every lens component below
    // (spine, rails, map, panel, slide-up) via useLensData — renders no DOM node.
    <LensDataProvider bundle={bundle}>
    <div
      className={css.lensShell}
      style={{ color: C.textPrimary, fontFamily: F.sans }}
    >
      <style>{`
        *::-webkit-scrollbar { width: 7px; height: 7px; }
        *::-webkit-scrollbar-track { background: ${C.bg}; }
        *::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }
        *::-webkit-scrollbar-thumb:hover { background: ${C.borderLight}; }
      `}</style>

      {/* Lens selector — top spine (ActTierSpine-style); replaces the former
          horizontal DomainsView strip as the sole lens selector. */}
      <ObserveLensSpine
        activeLens={activeLens}
        onSelectLens={handleLensChange}
        projectTitle={bundle.project.name}
        projectType={bundle.project.type}
        scopedDomains={viewScope.isScoped ? viewScope.scope : undefined}
        showFocusToggle={viewScope.layerActive}
        focusMode={viewScope.focusMode}
        onFocusModeChange={viewScope.setFocusMode}
      />

      <div className={css.shellWrap}>
        <StageShell
          bottomPlacement="between-rails"
          symmetricRails
          canvasLabel="Observe lens map"
          leftRailLabel="Cycle timeline"
          rightRailLabel="Land intelligence"
          leftRail={<CycleTimelineBar vertical />}
          canvas={
            bundle.map ? (
              <ObserveMap
                boundary={bundle.map.boundary}
                bbox={bundle.map.bbox}
                markers={bundle.map.markers}
                activeLens={activeLens}
                onObsClick={handleObsClick}
                selectedObs={selectedObs}
                demoGeometry={bundle.map.demoGeometry}
                meetingPlace={meetingPlace}
              />
            ) : (
              <PseudoMap
                activeLens={activeLens}
                onObsClick={handleObsClick}
                selectedObs={selectedObs}
              />
            )
          }
          rightRail={
            <IntelligencePanel
              activeLens={activeLens}
              selectedObs={selectedObs}
              onOpenDetail={setDetailLens}
              footer={
                <RecentObservationsStrip
                  vertical
                  activeLens={activeLens}
                  selectedObs={selectedObs}
                  onObsClick={handleObsClick}
                />
              }
            />
          }
          bottomTray={
            <ObserveLensDetailRail
              activeLens={activeLens}
              onSelectLens={handleLensChange}
              onOpenDetail={setDetailLens}
            />
          }
        />
      </div>

      {/* Domain detail slide-up — sibling overlay (covers spine + shell). */}
      {detailLens && (
        <DomainDetailSlideUp lensId={detailLens} onClose={() => setDetailLens(null)} />
      )}
    </div>
    </LensDataProvider>
  );
}
