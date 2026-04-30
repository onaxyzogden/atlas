/**
 * DashboardRouter — maps section IDs to dashboard page components.
 */

import { lazy, Suspense, type ReactNode } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { PanelLoader } from '../../components/ui/PanelLoader.js';
import ErrorBoundary from '../../components/ErrorBoundary.js';
import DashboardPlaceholder from './pages/DashboardPlaceholder.js';

/** Wraps lazy-loaded dashboard panels with Suspense + ErrorBoundary */
function PanelShell({ name, children }: { name: string; children: ReactNode }) {
  return (
    <ErrorBoundary name={name}>
      <Suspense fallback={<PanelLoader />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

const SiteIntelligenceDashboard = lazy(() => import('./pages/SiteIntelligenceDashboard.js'));
const WorkflowWheelDashboard = lazy(() => import('./pages/WorkflowWheelDashboard.js'));
const MapLayersDashboard = lazy(() => import('./pages/MapLayersDashboard.js'));
const GrazingDashboard = lazy(() => import('./pages/GrazingDashboard.js'));
const HerdRotationDashboard = lazy(() => import('./pages/HerdRotationDashboard.js'));
const LivestockDashboard = lazy(() => import('./pages/LivestockDashboard.js'));
const PaddockDesignDashboard = lazy(() => import('./pages/PaddockDesignDashboard.js'));
const PlantingToolDashboard = lazy(() => import('./pages/PlantingToolDashboard.js'));
const ForestHubDashboard = lazy(() => import('./pages/ForestHubDashboard.js'));
const CarbonDiagnosticDashboard = lazy(() => import('./pages/CarbonDiagnosticDashboard.js'));
const NurseryLedgerDashboard = lazy(() => import('./pages/NurseryLedgerDashboard.js'));
const HydrologyDashboard = lazy(() => import('./pages/HydrologyDashboard.js'));
const CartographicDashboard = lazy(() => import('./pages/CartographicDashboard.js'));
const EcologicalDashboard = lazy(() => import('./pages/EcologicalDashboard.js'));
const TerrainDashboard = lazy(() => import('./pages/TerrainDashboard.js'));
const StewardshipDashboard = lazy(() => import('./pages/StewardshipDashboard.js'));
const SolarClimateDashboard = lazy(() => import('../../features/climate/SolarClimateDashboard.js'));
const EconomicsPanel = lazy(() => import('../../features/economics/EconomicsPanel.js'));
const ScenarioPanel = lazy(() => import('../../features/scenarios/ScenarioPanel.js'));
const InvestorSummaryExport = lazy(() => import('../../features/export/InvestorSummaryExport.js'));
const RegulatoryPanel = lazy(() => import('../../features/regulatory/RegulatoryPanel.js'));
const FeasibilityCommandCenter = lazy(() => import('../../features/decision/FeasibilityCommandCenter.js'));
const EnergyDashboard = lazy(() => import('./pages/EnergyDashboard.js'));
const EducationalAtlasDashboard = lazy(() => import('./pages/EducationalAtlasDashboard.js'));
const PhasingDashboard = lazy(() => import('./pages/PhasingDashboard.js'));
const SiteDataLayersPage = lazy(() => import('../../features/site-data-layers/SiteDataLayersPage.js'));
const ZoningDashboard = lazy(() => import('./pages/ZoningDashboard.js'));
const CollaborationDashboard = lazy(() => import('./pages/CollaborationDashboard.js'));
const TemplatesDashboard = lazy(() => import('./pages/TemplatesDashboard.js'));
const FieldworkDashboard = lazy(() => import('./pages/FieldworkDashboard.js'));
const VersionHistoryDashboard = lazy(() => import('./pages/VersionHistoryDashboard.js'));
const BiomassDashboard = lazy(() => import('./pages/BiomassDashboard.js'));
const ObserveHub = lazy(() => import('../observe/ObserveHub.js'));
const StewardSurveyCard = lazy(() => import('../observe/StewardSurveyCard.js'));
const IndigenousRegionalCard = lazy(() => import('../observe/IndigenousRegionalCard.js'));
const HazardsLogCard = lazy(() => import('../observe/HazardsLogCard.js'));
const CrossSectionTool = lazy(() => import('../observe/CrossSectionTool.js'));
const SoilTestsCard = lazy(() => import('../observe/SoilTestsCard.js'));
const FoodChainCard = lazy(() => import('../observe/FoodChainCard.js'));
const SectorCompassCard = lazy(() => import('../observe/SectorCompassCard.js'));
const SwotJournalCard = lazy(() => import('../observe/SwotJournalCard.js'));
const DiagnosisReportExport = lazy(() => import('../observe/DiagnosisReportExport.js'));
// PLAN-stage Phase 1 — landing surface. Stage 2 of the 3-stage cycle.
// Subsequent phases register the eight spec modules' cards alongside this.
const PlanHub = lazy(() => import('../plan/PlanHub.js'));
// PLAN-stage Phase 3 — 16 spec-module cards + tools (2026-04-29 IA restructure).
const PermanenceScalesCard = lazy(() => import('../plan/PermanenceScalesCard.js'));
const RunoffCalculatorCard = lazy(() => import('../plan/RunoffCalculatorCard.js'));
const SwaleDrainTool = lazy(() => import('../plan/SwaleDrainTool.js'));
const StorageInfraTool = lazy(() => import('../plan/StorageInfraTool.js'));
const ZoneLevelLayer = lazy(() => import('../plan/ZoneLevelLayer.js'));
const PathFrequencyEditor = lazy(() => import('../plan/PathFrequencyEditor.js'));
const PlantDatabaseCard = lazy(() => import('../plan/PlantDatabaseCard.js'));
const GuildBuilderCard = lazy(() => import('../plan/GuildBuilderCard.js'));
const CanopySimulatorCard = lazy(() => import('../plan/CanopySimulatorCard.js'));
const SoilFertilityDesignerCard = lazy(() => import('../plan/SoilFertilityDesignerCard.js'));
const WasteVectorTool = lazy(() => import('../plan/WasteVectorTool.js'));
const TransectVerticalEditorCard = lazy(() => import('../plan/TransectVerticalEditorCard.js'));
const PhasingMatrixCard = lazy(() => import('../plan/PhasingMatrixCard.js'));
const SeasonalTaskCard = lazy(() => import('../plan/SeasonalTaskCard.js'));
const LaborBudgetSummaryCard = lazy(() => import('../plan/LaborBudgetSummaryCard.js'));
const HolmgrenChecklistCard = lazy(() => import('../plan/HolmgrenChecklistCard.js'));
// ACT-stage Phase 1 — landing surface. Stage 3 of the 3-stage cycle.
const ActHub = lazy(() => import('../act/ActHub.js'));
// ACT-stage Phase 3 — 13 spec-module cards (2026-04-29 IA restructure).
const BuildGanttCard = lazy(() => import('../act/BuildGanttCard.js'));
const BudgetActualsCard = lazy(() => import('../act/BudgetActualsCard.js'));
const PilotPlotsCard = lazy(() => import('../act/PilotPlotsCard.js'));
const MaintenanceScheduleCard = lazy(() => import('../act/MaintenanceScheduleCard.js'));
const IrrigationManagerCard = lazy(() => import('../act/IrrigationManagerCard.js'));
const WasteRoutingChecklistCard = lazy(() => import('../act/WasteRoutingChecklistCard.js'));
const OngoingSwotCard = lazy(() => import('../act/OngoingSwotCard.js'));
const HarvestLogCard = lazy(() => import('../act/HarvestLogCard.js'));
const SuccessionTrackerCard = lazy(() => import('../act/SuccessionTrackerCard.js'));
const NetworkCrmCard = lazy(() => import('../act/NetworkCrmCard.js'));
const CommunityEventCard = lazy(() => import('../act/CommunityEventCard.js'));
const HazardPlansCard = lazy(() => import('../act/HazardPlansCard.js'));
const AppropriateTechLogCard = lazy(() => import('../act/AppropriateTechLogCard.js'));

interface DashboardRouterProps {
  section: string;
  project: LocalProject;
  onSwitchToMap: () => void;
}

const SECTION_LABELS: Record<string, string> = {
  'dashboard-settings': 'Settings',
  'archive': 'Archive',
};

export default function DashboardRouter({ section, project, onSwitchToMap }: DashboardRouterProps) {
  switch (section) {
    case 'dashboard-observe-hub':
      return (
        <PanelShell name="Observe Hub">
          <ObserveHub project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'dashboard-plan-hub':
      return (
        <PanelShell name="Plan Hub">
          <PlanHub project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'plan-permanence-scales':
      return (
        <PanelShell name="Permanence Scales">
          <PermanenceScalesCard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'plan-runoff-calculator':
      return (
        <PanelShell name="Runoff Calculator">
          <RunoffCalculatorCard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'plan-swale-drain':
      return (
        <PanelShell name="Swale / Drain Tool">
          <SwaleDrainTool project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'plan-storage-infra':
      return (
        <PanelShell name="Storage Infrastructure">
          <StorageInfraTool project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'plan-zone-level':
      return (
        <PanelShell name="Zone Level Layer">
          <ZoneLevelLayer project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'plan-path-frequency':
      return (
        <PanelShell name="Path Frequency">
          <PathFrequencyEditor project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'plan-plant-database':
      return (
        <PanelShell name="Plant Database">
          <PlantDatabaseCard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'plan-guild-builder':
      return (
        <PanelShell name="Guild Builder">
          <GuildBuilderCard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'plan-canopy-simulator':
      return (
        <PanelShell name="Canopy Simulator">
          <CanopySimulatorCard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'plan-soil-fertility':
      return (
        <PanelShell name="Soil Fertility Designer">
          <SoilFertilityDesignerCard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'plan-waste-vectors':
      return (
        <PanelShell name="Waste-to-Resource Vectors">
          <WasteVectorTool project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'plan-transect-vertical':
    case 'plan-solar-overlay':
      // Solar overlay is integrated inline with the transect vertical editor
      // (per plan: "share existing CrossSection panel"); both ids resolve to
      // the same surface, with the solar checkbox toggled on by default.
      return (
        <PanelShell name="Transect Vertical + Solar">
          <TransectVerticalEditorCard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'plan-phasing-matrix':
      return (
        <PanelShell name="Phasing Matrix">
          <PhasingMatrixCard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'plan-seasonal-tasks':
      return (
        <PanelShell name="Seasonal Tasks">
          <SeasonalTaskCard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'plan-labor-budget':
      return (
        <PanelShell name="Labor & Budget">
          <LaborBudgetSummaryCard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'plan-holmgren-checklist':
      return (
        <PanelShell name="Holmgren Checklist">
          <HolmgrenChecklistCard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'dashboard-act-hub':
      return (
        <PanelShell name="Act Hub">
          <ActHub project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'act-build-gantt':
      return (
        <PanelShell name="Build Gantt">
          <BuildGanttCard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'act-budget-actuals':
      return (
        <PanelShell name="Budget Actuals">
          <BudgetActualsCard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'act-pilot-plots':
      return (
        <PanelShell name="Pilot Plots">
          <PilotPlotsCard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'act-maintenance-schedule':
      return (
        <PanelShell name="Maintenance Schedule">
          <MaintenanceScheduleCard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'act-irrigation-manager':
      return (
        <PanelShell name="Irrigation Manager">
          <IrrigationManagerCard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'act-waste-routing':
      return (
        <PanelShell name="Waste Routing Checklist">
          <WasteRoutingChecklistCard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'act-ongoing-swot':
      return (
        <PanelShell name="Ongoing SWOT">
          <OngoingSwotCard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'act-harvest-log':
      return (
        <PanelShell name="Harvest Log">
          <HarvestLogCard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'act-succession-tracker':
      return (
        <PanelShell name="Succession Tracker">
          <SuccessionTrackerCard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'act-network-crm':
      return (
        <PanelShell name="Network CRM">
          <NetworkCrmCard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'act-community-events':
      return (
        <PanelShell name="Community Events">
          <CommunityEventCard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'act-hazard-plans':
      return (
        <PanelShell name="Hazard Action Plans">
          <HazardPlansCard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'act-appropriate-tech':
      return (
        <PanelShell name="Appropriate-Tech Log">
          <AppropriateTechLogCard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'observe-steward-survey':
      return (
        <PanelShell name="Steward Survey">
          <StewardSurveyCard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'observe-indigenous-regional':
      return (
        <PanelShell name="Indigenous & Regional Context">
          <IndigenousRegionalCard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'observe-hazards-log':
      return (
        <PanelShell name="Hazards Log">
          <HazardsLogCard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'observe-cross-section':
      return (
        <PanelShell name="A–B Cross-Section">
          <CrossSectionTool project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'observe-soil-tests':
      return (
        <PanelShell name="Jar / Perc / Roof Catchment">
          <SoilTestsCard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'observe-food-chain':
      return (
        <PanelShell name="Food-Chain & Succession">
          <FoodChainCard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'observe-sector-compass':
      return (
        <PanelShell name="Sector Compass">
          <SectorCompassCard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'observe-swot-journal':
      return (
        <PanelShell name="SWOT Journal">
          <SwotJournalCard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'observe-diagnosis-report':
      return (
        <PanelShell name="Diagnosis Report">
          <DiagnosisReportExport project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'site-intelligence':
      return (
        <PanelShell name="Site Intelligence">
          <SiteIntelligenceDashboard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'workflow-wheel':
      return (
        <PanelShell name="Workflow">
          <WorkflowWheelDashboard project={project} />
        </PanelShell>
      );
    case 'map-layers':
      return (
        <PanelShell name="Map Layers">
          <MapLayersDashboard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'data-catalog':
      return (
        <PanelShell name="Data Catalog">
          <SiteDataLayersPage projectId={project.serverId ?? project.id} />
        </PanelShell>
      );
    case 'grazing-analysis':
      return (
        <PanelShell name="Grazing Analysis">
          <GrazingDashboard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'herd-rotation':
      return (
        <PanelShell name="Herd Rotation">
          <HerdRotationDashboard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'livestock-inventory':
    case 'health-ledger':
      return (
        <PanelShell name="Livestock">
          <LivestockDashboard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'paddock-design':
      return (
        <PanelShell name="Paddock Design">
          <PaddockDesignDashboard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'planting-tool':
      return (
        <PanelShell name="Planting Tool">
          <PlantingToolDashboard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'forest-hub':
      return (
        <PanelShell name="Forest Hub">
          <ForestHubDashboard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'carbon-diagnostic':
      return (
        <PanelShell name="Carbon Diagnostic">
          <CarbonDiagnosticDashboard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'nursery-ledger':
      return (
        <PanelShell name="Nursery Ledger">
          <NurseryLedgerDashboard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'hydrology-dashboard':
      return (
        <PanelShell name="Hydrology">
          <HydrologyDashboard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'cartographic':
      return (
        <PanelShell name="Cartographic">
          <CartographicDashboard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'ecological':
      return (
        <PanelShell name="Ecological">
          <EcologicalDashboard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'terrain-dashboard':
      return (
        <PanelShell name="Terrain">
          <TerrainDashboard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'stewardship':
      return (
        <PanelShell name="Stewardship">
          <StewardshipDashboard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'biomass':
      return (
        <PanelShell name="Biomass">
          <BiomassDashboard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'climate':
      return (
        <PanelShell name="Climate">
          <SolarClimateDashboard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'economics':
      return (
        <PanelShell name="Economics">
          <EconomicsPanel project={project} />
        </PanelShell>
      );
    case 'scenarios':
      return (
        <PanelShell name="Scenarios">
          <ScenarioPanel project={project} />
        </PanelShell>
      );
    case 'investor-summary':
      return (
        <PanelShell name="Investor Summary">
          <InvestorSummaryExport project={project} onClose={onSwitchToMap} />
        </PanelShell>
      );
    case 'regulatory':
      return (
        <PanelShell name="Regulatory">
          <RegulatoryPanel project={project} />
        </PanelShell>
      );
    case 'energy-offgrid':
      return (
        <PanelShell name="Energy & Off-Grid">
          <EnergyDashboard project={project} onSwitchToMap={onSwitchToMap} focus="energy" />
        </PanelShell>
      );
    case 'infrastructure-utilities':
      return (
        <PanelShell name="Utilities & Infrastructure">
          <EnergyDashboard project={project} onSwitchToMap={onSwitchToMap} focus="infrastructure" />
        </PanelShell>
      );
    case 'timeline-phasing':
      return (
        <PanelShell name="Timeline & Phasing">
          <PhasingDashboard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'educational':
      return (
        <PanelShell name="Educational Atlas">
          <EducationalAtlasDashboard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'feasibility':
      return (
        <PanelShell name="Feasibility">
          <FeasibilityCommandCenter project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'zoning':
      return (
        <PanelShell name="Zoning">
          <ZoningDashboard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'collaboration':
      return (
        <PanelShell name="Collaboration">
          <CollaborationDashboard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'templates':
      return (
        <PanelShell name="Templates">
          <TemplatesDashboard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'fieldwork':
      return (
        <PanelShell name="Fieldwork">
          <FieldworkDashboard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    case 'history':
      return (
        <PanelShell name="Version History">
          <VersionHistoryDashboard project={project} onSwitchToMap={onSwitchToMap} />
        </PanelShell>
      );
    default:
      return (
        <DashboardPlaceholder
          sectionLabel={SECTION_LABELS[section] ?? section}
        />
      );
  }
}
