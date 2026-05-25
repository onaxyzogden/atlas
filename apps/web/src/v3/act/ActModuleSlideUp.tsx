/**
 * ActModuleSlideUp — Act-stage wrapper over the shared ModuleSlideUp.
 *
 * Owns only the lazy act-card imports + the renderCard switch keyed by
 * sectionId. Chrome (scrim, sheet, tabs, focus trap) lives in
 * `_shared/moduleNav/ModuleSlideUp.tsx`.
 */

import { lazy, useCallback, type ReactNode } from 'react';
import { ModuleSlideUp } from '../_shared/moduleNav/index.js';
import type { LocalProject } from '../../store/projectStore.js';
import type { ActModule } from './types.js';
import { MODULE_CARDS, ACT_MODULE_FULL_LABEL } from './types.js';

// Act cards lazy-loaded.
const PlanExecutionTrackerCard  = lazy(() => import('../../features/act/PlanExecutionTrackerCard.js'));
const ResourcingCard            = lazy(() => import('../../features/act/ResourcingCard.js'));
const IncomingWorkPackagesCard  = lazy(() => import('../../features/act/IncomingWorkPackagesCard.js'));
const BuildGanttCard            = lazy(() => import('../../features/act/BuildGanttCard.js'));
const BudgetCard                = lazy(() => import('../../features/act/BudgetCard.js'));
const OperatingDashboardCard    = lazy(() => import('../../features/act/OperatingDashboardCard.js'));
const PilotPlotsCard            = lazy(() => import('../../features/act/PilotPlotsCard.js'));
const MaintenanceScheduleCard   = lazy(() => import('../../features/act/MaintenanceScheduleCard.js'));
const IrrigationManagerCard     = lazy(() => import('../../features/act/IrrigationManagerCard.js'));
const WasteRoutingChecklistCard = lazy(() => import('../../features/act/WasteRoutingChecklistCard.js'));
const HarvestLogCard            = lazy(() => import('../../features/act/HarvestLogCard.js'));
const SuccessionTrackerCard     = lazy(() => import('../../features/act/SuccessionTrackerCard.js'));
const OngoingSwotCard           = lazy(() => import('../../features/act/OngoingSwotCard.js'));
const HazardPlansCard           = lazy(() => import('../../features/act/HazardPlansCard.js'));
const NetworkCrmCard            = lazy(() => import('../../features/act/NetworkCrmCard.js'));
const CommunityEventCard        = lazy(() => import('../../features/act/CommunityEventCard.js'));
const AppropriateTechLogCard    = lazy(() => import('../../features/act/AppropriateTechLogCard.js'));
const LivestockYieldCard        = lazy(() => import('../../features/act/LivestockYieldCard.js'));
const LivestockMoveCard         = lazy(() => import('../../features/act/LivestockMoveCard.js'));
const StructureYieldCard        = lazy(() => import('../../features/act/StructureYieldCard.js'));
const MaintenanceLogCard        = lazy(() => import('../../features/act/MaintenanceLogCard.js'));
const WeatherForecastCard       = lazy(() => import('../../features/act/WeatherForecastCard.js'));
const EventCalendarCard         = lazy(() => import('../../features/act/EventCalendarCard.js'));
const RotationScheduleCard         = lazy(() => import('../../features/livestock/RotationScheduleCard.js'));
const PastureUtilizationCard       = lazy(() => import('../../features/livestock/PastureUtilizationCard.js'));
const ForageQualitySeasonalCard    = lazy(() => import('../../features/livestock/ForageQualitySeasonalCard.js'));
const BrowsePressureRiskCard       = lazy(() => import('../../features/livestock/BrowsePressureRiskCard.js'));
const PredatorRiskHotspotsCard     = lazy(() => import('../../features/livestock/PredatorRiskHotspotsCard.js'));
const WelfareAccessAuditCard       = lazy(() => import('../../features/livestock/WelfareAccessAuditCard.js'));
const AnimalCorridorGrazingRouteCard = lazy(() => import('../../features/livestock/AnimalCorridorGrazingRouteCard.js'));

function renderActCard(sectionId: string, project: LocalProject) {
  const noop = () => {};
  switch (sectionId) {
    case 'act-plan-tracker':      return <PlanExecutionTrackerCard project={project} onSwitchToMap={noop} />;
    case 'act-resourcing':        return <ResourcingCard project={project} onSwitchToMap={noop} />;
    case 'act-incoming-packages': return <IncomingWorkPackagesCard projectId={project.id} />;
    case 'act-build-gantt':       return <BuildGanttCard project={project} onSwitchToMap={noop} />;
    case 'act-budget':            return <BudgetCard project={project} onSwitchToMap={noop} />;
    case 'act-operating-dashboard': return <OperatingDashboardCard project={project} onSwitchToMap={noop} />;
    case 'act-pilot-plots':       return <PilotPlotsCard project={project} onSwitchToMap={noop} />;
    case 'act-maintenance-events': return <MaintenanceLogCard project={project} onSwitchToMap={noop} />;
    case 'act-maintenance':       return <MaintenanceScheduleCard project={project} onSwitchToMap={noop} />;
    case 'act-irrigation':        return <IrrigationManagerCard project={project} onSwitchToMap={noop} />;
    case 'act-waste-routing':     return <WasteRoutingChecklistCard project={project} onSwitchToMap={noop} />;
    case 'act-harvest-log':       return <HarvestLogCard project={project} onSwitchToMap={noop} />;
    case 'act-structure-yield':   return <StructureYieldCard project={project} onSwitchToMap={noop} />;
    case 'act-succession':        return <SuccessionTrackerCard project={project} onSwitchToMap={noop} />;
    case 'act-ongoing-swot':      return <OngoingSwotCard project={project} onSwitchToMap={noop} />;
    case 'act-hazard-plans':      return <HazardPlansCard project={project} onSwitchToMap={noop} />;
    case 'act-network-crm':       return <NetworkCrmCard project={project} onSwitchToMap={noop} />;
    case 'act-community-event':   return <CommunityEventCard project={project} onSwitchToMap={noop} />;
    case 'act-appropriate-tech':  return <AppropriateTechLogCard project={project} onSwitchToMap={noop} />;
    case 'act-livestock-yield':           return <LivestockYieldCard project={project} onSwitchToMap={noop} />;
    case 'act-livestock-moves':           return <LivestockMoveCard project={project} onSwitchToMap={noop} />;
    case 'act-livestock-rotation':        return <RotationScheduleCard projectId={project.id} />;
    case 'act-livestock-pasture':         return <PastureUtilizationCard projectId={project.id} />;
    case 'act-livestock-forage':          return <ForageQualitySeasonalCard project={project} />;
    case 'act-livestock-browse-pressure': return <BrowsePressureRiskCard projectId={project.id} />;
    case 'act-livestock-predator-risk':   return <PredatorRiskHotspotsCard projectId={project.id} />;
    case 'act-livestock-welfare-audit':   return <WelfareAccessAuditCard projectId={project.id} />;
    case 'act-livestock-corridors':       return <AnimalCorridorGrazingRouteCard projectId={project.id} />;
    case 'act-weather-forecast':  return <WeatherForecastCard project={project} onSwitchToMap={noop} />;
    case 'act-event-calendar':    return <EventCalendarCard project={project} onSwitchToMap={noop} />;
    default: return null;
  }
}

interface Props {
  module: ActModule | null;
  open: boolean;
  onClose: () => void;
  project: LocalProject;
  topBar?: ReactNode;
}

export default function ActModuleSlideUp({ module, open, onClose, project, topBar }: Props) {
  const cards = module ? MODULE_CARDS[module] : [];
  const label = module ? ACT_MODULE_FULL_LABEL[module] : '';

  const renderCard = useCallback(
    (sectionId: string) => renderActCard(sectionId, project),
    [project],
  );

  return (
    <ModuleSlideUp
      open={open && module !== null}
      onClose={onClose}
      eyebrow="Act · module"
      label={label}
      cards={cards}
      renderCard={renderCard}
      ariaLabel={module ? `${label} — act tools` : undefined}
      topBar={topBar}
    />
  );
}
