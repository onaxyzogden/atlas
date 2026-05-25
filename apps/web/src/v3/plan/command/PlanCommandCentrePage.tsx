/**
 * PlanCommandCentrePage — the aggregate "run the stage" surface for Plan, laid
 * out as a fixed dashboard shell that mirrors `ObserveCommandCentrePage`:
 *
 *   ┌ module tabs ─ All Modules + the 15 Plan modules, each with % verified ──┐
 *   ├ sidebar ─┬ site map (Plan data + design layers + legend + chip) ─┬ rail ┤
 *   │ filter   │                                                       │ time │
 *   │ layers   │                                                       │ ready│
 *   │ base map │                                                       │ gaps │
 *   ├──────────┴ bottom tray ─ open Plan decisions carousel ──────────────────┤
 *
 * A single `activeModule` lens drives the tabs, sidebar filter chip, map focus,
 * the right-rail trio, and the open-decisions tray. Decisions aren't spatial, so
 * the map carries Plan geometry (data overlays + Vision design elements) focused
 * by the lens rather than decision pins. Rendered full-bleed by V3ProjectLayout
 * (the `command-centre` path skips LandOsShell).
 */

import { useState } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { usePlanCompassData } from '../compass/usePlanCompassData.js';
import { usePlanDecisions } from '../decisions/usePlanDecisions.js';
import type { PlanModule } from '../types.js';
import PlanModuleTabs from './PlanModuleTabs.js';
import PlanMapSidebar from './PlanMapSidebar.js';
import PlanSiteMapPanel from './PlanSiteMapPanel.js';
import OpenPlanDecisionsPanel from './OpenPlanDecisionsPanel.js';
import PlanDecisionTimelinePanel from './PlanDecisionTimelinePanel.js';
import PlanModuleReadinessPanel from './PlanModuleReadinessPanel.js';
import PlanGapsPanel from './PlanGapsPanel.js';
import CommandCentreShell from '../../command/shell/CommandCentreShell.js';

export default function PlanCommandCentrePage() {
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = params.projectId ?? 'mtc';
  const navigate = useNavigate();
  const data = usePlanCompassData(projectId);
  const decisions = usePlanDecisions(projectId);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeModule, setActiveModule] = useState<PlanModule | null>(null);
  const [showData, setShowData] = useState(true);
  const [showDesign, setShowDesign] = useState(true);
  const [showBoundary, setShowBoundary] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const filteredViews = activeModule
    ? data.views.filter((v) => (v.objective.id as PlanModule) === activeModule)
    : data.views;

  // Timeline shows all decision activity; the tray shows the work-to-do (drafts),
  // both scoped to the active module via `affectedModule` when a lens is set.
  const moduleDecisions = activeModule
    ? decisions.filter((d) => d.affectedModule === activeModule)
    : decisions;
  const trayDecisions = moduleDecisions.filter((d) => d.status === 'draft');

  const ready =
    data.views.length > 0 && data.views.every((v) => v.progress.pct === 100);

  const backToCompass = () =>
    navigate({ to: '/v3/project/$projectId/plan/compass', params: { projectId } });

  const goAct = () =>
    navigate({ to: '/v3/project/$projectId/act', params: { projectId } });

  const recordDecision = () =>
    navigate({
      to: '/v3/project/$projectId/plan/decisions',
      params: { projectId },
    });

  // Launch action: open the Planning Workspace for the chosen decision.
  const launchDecision = (decisionId: string) => {
    setSelectedId(decisionId);
    navigate({
      to: '/v3/project/$projectId/plan/workspace/$decisionId',
      params: { projectId, decisionId },
    });
  };

  return (
    <CommandCentreShell
      sidebarCollapsed={sidebarCollapsed}
      tabs={
        <PlanModuleTabs
          data={data}
          active={activeModule}
          onSelect={setActiveModule}
          onBackToCompass={backToCompass}
        />
      }
      sidebar={
        <PlanMapSidebar
          active={activeModule}
          onClearModule={() => setActiveModule(null)}
          showData={showData}
          onToggleData={setShowData}
          showDesign={showDesign}
          onToggleDesign={setShowDesign}
          showBoundary={showBoundary}
          onToggleBoundary={setShowBoundary}
          ready={ready}
          onGoAct={goAct}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
        />
      }
      siteMap={
        <PlanSiteMapPanel
          projectId={projectId}
          activeModule={activeModule}
          showData={showData}
          showDesign={showDesign}
          showBoundary={showBoundary}
        />
      }
      rail={
        <>
          <PlanDecisionTimelinePanel decisions={moduleDecisions} />
          <PlanModuleReadinessPanel
            views={filteredViews}
            stagePct={data.stage.pct}
          />
          <PlanGapsPanel projectId={projectId} views={filteredViews} />
        </>
      }
      tray={
        <OpenPlanDecisionsPanel
          decisions={trayDecisions}
          selectedId={selectedId}
          activeModule={activeModule}
          onClearFilter={() => setActiveModule(null)}
          onLaunch={launchDecision}
          onRecordDecision={recordDecision}
        />
      }
    />
  );
}
