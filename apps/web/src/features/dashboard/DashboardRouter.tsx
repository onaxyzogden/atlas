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
    case 'site-intelligence':
      return (
        <PanelShell name="Site Intelligence">
          <SiteIntelligenceDashboard project={project} onSwitchToMap={onSwitchToMap} />
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
