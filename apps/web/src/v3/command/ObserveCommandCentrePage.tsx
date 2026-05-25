/**
 * ObserveCommandCentrePage — the aggregate "run the stage" surface for Observe,
 * laid out as a fixed dashboard shell (per the Stage Command Center mockup):
 *
 *   ┌ topbar ─ title + Compass back ───────────────────────────────────┐
 *   ├ module tabs ─ All Modules + the 7 domains, each with % verified ──┤
 *   ├ sidebar ─┬ site map (markers + legend + filter chip) ─┬ rail ─────┤
 *   │ filter   │                                            │ timeline  │
 *   │ layers   │                                            │ evidence  │
 *   │ base map │                                            │ gaps      │
 *   ├──────────┴ bottom tray ─ open observation needs carousel ─────────┤
 *
 * A single `activeModule` lens drives the tabs, sidebar filter chip, map
 * markers + "Filtered to" chip + legend, timeline, and needs carousel. The
 * per-module capture dashboards are reachable from the capture workspace, not
 * embedded here. Rendered full-bleed by V3ProjectLayout (the `command-centre`
 * path skips LandOsShell).
 */

import { useState } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { Compass } from 'lucide-react';
import { useCompassData } from '../compass/useCompassData.js';
import { useObservationNeeds } from '../observation-needs/useObservationNeeds.js';
import { isDismissedAutoNeed } from '../observation-needs/autoObservationNeeds.js';
import type { ObserveModule } from '../observe/types.js';
import ObserveModuleTabs from './ObserveModuleTabs.js';
import ObserveMapSidebar from './ObserveMapSidebar.js';
import SiteMapPanel from './SiteMapPanel.js';
import OpenObservationNeedsPanel from './OpenObservationNeedsPanel.js';
import ObservationTimelinePanel from './ObservationTimelinePanel.js';
import EvidenceLibraryPanel from './EvidenceLibraryPanel.js';
import GapsPanel from './GapsPanel.js';
import css from './ObserveCommandCentrePage.module.css';

export default function ObserveCommandCentrePage() {
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = params.projectId ?? 'mtc';
  const navigate = useNavigate();
  const data = useCompassData(projectId);
  const needViews = useObservationNeeds(projectId);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeModule, setActiveModule] = useState<ObserveModule | null>(null);
  const [showBoundary, setShowBoundary] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Drop cleared auto-needs (recorded or dismissed) from every display surface —
  // map markers, timeline, and the needs carousel — while leaving the underlying
  // catalog (and `useObservationNeed`) able to resolve their ids mid-record.
  const displayViews = needViews.filter((v) => !isDismissedAutoNeed(v));

  const filteredViews = activeModule
    ? displayViews.filter((v) => v.objective.module === activeModule)
    : displayViews;

  const ready =
    data.views.length > 0 && data.views.every((v) => v.progress.pct === 100);

  const backToCompass = () =>
    navigate({ to: '/v3/project/$projectId/compass', params: { projectId } });

  const goPlan = () =>
    navigate({ to: '/v3/project/$projectId/plan', params: { projectId } });

  // Launch action: open the Observation Capture Workspace for the chosen need by
  // deep-linking into ObserveLayout with its module + the `?need` driver.
  const launchNeed = (needId: string) => {
    const view = needViews.find((v) => v.objective.id === needId);
    if (!view) return;
    navigate({
      to: '/v3/project/$projectId/observe/$module',
      params: { projectId, module: view.objective.module },
      search: { need: needId },
    });
  };

  return (
    <div className={css.shell}>
      <header className={css.topbar}>
        <div className={css.topbarMain}>
          <p className="eyebrow">Observe · Command Centre</p>
          <h1 className={css.topbarTitle}>Observe Command Centre</h1>
          <p className={css.topbarSub}>
            {ready
              ? `Foundation verified across all ${data.views.length} domains — run the Observe stage from one place.`
              : `${data.stage.pct}% verified across ${data.views.length} domains — launch an observation need to keep going.`}
          </p>
        </div>
        <button type="button" className={css.ghostBtn} onClick={backToCompass}>
          <Compass size={16} strokeWidth={2} /> Compass
        </button>
      </header>

      <ObserveModuleTabs
        data={data}
        active={activeModule}
        onSelect={setActiveModule}
      />

      <div
        className={css.body}
        data-sidebar={sidebarCollapsed ? 'collapsed' : 'expanded'}
      >
        <ObserveMapSidebar
          active={activeModule}
          onClearModule={() => setActiveModule(null)}
          showBoundary={showBoundary}
          onToggleBoundary={setShowBoundary}
          showMarkers={showMarkers}
          onToggleMarkers={setShowMarkers}
          markerCount={filteredViews.length}
          ready={ready}
          onGoPlan={goPlan}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
        />

        <SiteMapPanel
          projectId={projectId}
          views={filteredViews}
          activeModule={activeModule}
          showBoundary={showBoundary}
          showMarkers={showMarkers}
          onSelectObjective={setSelectedId}
        />

        <div className={css.rail}>
          <ObservationTimelinePanel views={filteredViews} />
          <EvidenceLibraryPanel projectId={projectId} />
          <GapsPanel projectId={projectId} />
        </div>
      </div>

      <div className={css.bottomTray}>
        <OpenObservationNeedsPanel
          projectId={projectId}
          views={filteredViews}
          selectedId={selectedId}
          activeModule={activeModule}
          onClearFilter={() => setActiveModule(null)}
          onLaunch={launchNeed}
        />
      </div>
    </div>
  );
}
