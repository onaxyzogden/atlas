/**
 * ActCommandCentrePage — the aggregate "run the stage" surface for Act, laid out
 * as a fixed dashboard shell that mirrors `PlanCommandCentrePage`:
 *
 *   ┌ module tabs ─ All Modules + the 8 Act modules, each with % done ─────────┐
 *   ├ sidebar ─┬ site map (Act execution layers + legend + chip) ─┬ ops rail ──┤
 *   │ filter   │                                                  │ weather    │
 *   │ layers   │                                                  │ priorities │
 *   │ base map │                                                  │ alerts     │
 *   │          │                                                  │ events     │
 *   ├──────────┴ bottom tray ─ open work items carousel ──────────────────────┤
 *
 * A single `activeModule` lens drives the tabs, sidebar filter chip, map focus,
 * the right-rail ops panels (Today's Priorities / Alerts already treat a null
 * lens as "all modules"), and the open-work-items tray. Work items aren't all
 * spatial, so the map carries Act execution geometry focused by the lens rather
 * than work-item pins.
 *
 * The right rail REUSES the existing Act operations stack — WeatherStrip (the
 * kept weather tile, always on), Today's Priorities, Alerts, Upcoming Events —
 * inside ActOpsAside's `.aside` surface, so the operational feel and the weather
 * tile are preserved by reuse, not rebuild. Rendered full-bleed by
 * V3ProjectLayout (the `command-centre` path skips LandOsShell).
 */

import { useMemo, useState } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import type { WorkItem } from '@ogden/shared';
import { useActCompassData } from '../compass/useActCompassData.js';
import { useWorkItemStore } from '../../../store/workItemStore.js';
import type { ActModule } from '../types.js';
import ActModuleTabs from './ActModuleTabs.js';
import ActMapSidebar from './ActMapSidebar.js';
import ActSiteMapPanel from './ActSiteMapPanel.js';
import OpenWorkItemsPanel from './OpenWorkItemsPanel.js';
import { actWorkItemModule } from './actWorkItemModule.js';
import WeatherStrip from '../ops/WeatherStrip.js';
import TodaysPriorities from '../ops/TodaysPriorities.js';
import AlertsPanel from '../ops/AlertsPanel.js';
import UpcomingEvents from '../ops/UpcomingEvents.js';
import CommandCentreShell from '../../command/shell/CommandCentreShell.js';
import aside from '../ops/ActOpsAside.module.css';

export default function ActCommandCentrePage() {
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = params.projectId ?? 'mtc';
  const navigate = useNavigate();
  const data = useActCompassData(projectId);
  const items = useWorkItemStore((s) => s.items);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeModule, setActiveModule] = useState<ActModule | null>(null);
  const [showData, setShowData] = useState(true);
  const [showBoundary, setShowBoundary] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Open work items (the tracker spine), scoped to this project then to the
  // active module via `actWorkItemModule`. Subscribe to `items` raw and derive
  // in useMemo (selector-stability rule).
  const openItems = useMemo(
    () =>
      items.filter(
        (i) =>
          i.projectId === projectId &&
          (i.status === 'todo' || i.status === 'in-progress'),
      ),
    [items, projectId],
  );
  const trayItems = useMemo(
    () =>
      activeModule
        ? openItems.filter((i) => actWorkItemModule(i) === activeModule)
        : openItems,
    [openItems, activeModule],
  );

  const ready =
    data.views.length > 0 && data.views.every((v) => v.progress.pct === 100);

  const backToCompass = () =>
    navigate({ to: '/v3/project/$projectId/act/compass', params: { projectId } });

  const goReport = () =>
    navigate({ to: '/v3/project/$projectId/report', params: { projectId } });

  const openModule = (module: ActModule) =>
    navigate({
      to: '/v3/project/$projectId/act/$module',
      params: { projectId, module },
      search: {},
    });

  const openSchedule = () => openModule('schedule');
  const goTracker = () => openModule('tracker');

  // Launch action: open the Act module the work item belongs to.
  const launchItem = (item: WorkItem) => {
    setSelectedId(item.id);
    openModule(actWorkItemModule(item));
  };

  return (
    <CommandCentreShell
      sidebarCollapsed={sidebarCollapsed}
      tabs={
        <ActModuleTabs
          data={data}
          active={activeModule}
          onSelect={setActiveModule}
          onBackToCompass={backToCompass}
        />
      }
      sidebar={
        <ActMapSidebar
          active={activeModule}
          onClearModule={() => setActiveModule(null)}
          showData={showData}
          onToggleData={setShowData}
          showBoundary={showBoundary}
          onToggleBoundary={setShowBoundary}
          ready={ready}
          onGoReport={goReport}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
        />
      }
      siteMap={
        <ActSiteMapPanel
          projectId={projectId}
          activeModule={activeModule}
          showData={showData}
          showBoundary={showBoundary}
        />
      }
      rail={
        <div className={aside.aside}>
          <WeatherStrip projectId={projectId} onOpen={openSchedule} />
          <TodaysPriorities projectId={projectId} activeModule={activeModule} />
          <AlertsPanel projectId={projectId} activeModule={activeModule} />
          <UpcomingEvents projectId={projectId} onOpenSchedule={openSchedule} />
        </div>
      }
      tray={
        <OpenWorkItemsPanel
          items={trayItems}
          selectedId={selectedId}
          activeModule={activeModule}
          onClearFilter={() => setActiveModule(null)}
          onLaunch={launchItem}
          onGoTracker={goTracker}
        />
      }
    />
  );
}
