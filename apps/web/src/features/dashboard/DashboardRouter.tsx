/**
 * DashboardRouter — maps section IDs to dashboard page components.
 */

import { lazy, Suspense } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { PanelLoader } from '../../components/ui/PanelLoader.js';
import DashboardPlaceholder from './pages/DashboardPlaceholder.js';

const GrazingDashboard = lazy(() => import('./pages/GrazingDashboard.js'));
const HerdRotationDashboard = lazy(() => import('./pages/HerdRotationDashboard.js'));
const LivestockDashboard = lazy(() => import('./pages/LivestockDashboard.js'));
const PaddockDesignDashboard = lazy(() => import('./pages/PaddockDesignDashboard.js'));
const PlantingToolDashboard = lazy(() => import('./pages/PlantingToolDashboard.js'));
const ForestHubDashboard = lazy(() => import('./pages/ForestHubDashboard.js'));
const CarbonDiagnosticDashboard = lazy(() => import('./pages/CarbonDiagnosticDashboard.js'));
const NurseryLedgerDashboard = lazy(() => import('./pages/NurseryLedgerDashboard.js'));

interface DashboardRouterProps {
  section: string;
  project: LocalProject;
  onSwitchToMap: () => void;
}

const SECTION_LABELS: Record<string, string> = {
  'cartographic': 'Cartographic',
  'hydrology-dashboard': 'Hydrology',
  'ecological': 'Ecological',
  'terrain-dashboard': 'Terrain',
  'stewardship': 'Stewardship',
  'biomass': 'Biomass',
  'dashboard-settings': 'Settings',
  'archive': 'Archive',
};

export default function DashboardRouter({ section, project, onSwitchToMap }: DashboardRouterProps) {
  switch (section) {
    case 'grazing-analysis':
      return (
        <Suspense fallback={<PanelLoader />}>
          <GrazingDashboard project={project} onSwitchToMap={onSwitchToMap} />
        </Suspense>
      );
    case 'herd-rotation':
      return (
        <Suspense fallback={<PanelLoader />}>
          <HerdRotationDashboard project={project} onSwitchToMap={onSwitchToMap} />
        </Suspense>
      );
    case 'livestock-inventory':
    case 'health-ledger':
      return (
        <Suspense fallback={<PanelLoader />}>
          <LivestockDashboard project={project} onSwitchToMap={onSwitchToMap} />
        </Suspense>
      );
    case 'paddock-design':
      return (
        <Suspense fallback={<PanelLoader />}>
          <PaddockDesignDashboard project={project} onSwitchToMap={onSwitchToMap} />
        </Suspense>
      );
    case 'planting-tool':
      return (
        <Suspense fallback={<PanelLoader />}>
          <PlantingToolDashboard project={project} onSwitchToMap={onSwitchToMap} />
        </Suspense>
      );
    case 'forest-hub':
      return (
        <Suspense fallback={<PanelLoader />}>
          <ForestHubDashboard project={project} onSwitchToMap={onSwitchToMap} />
        </Suspense>
      );
    case 'carbon-diagnostic':
      return (
        <Suspense fallback={<PanelLoader />}>
          <CarbonDiagnosticDashboard project={project} onSwitchToMap={onSwitchToMap} />
        </Suspense>
      );
    case 'nursery-ledger':
      return (
        <Suspense fallback={<PanelLoader />}>
          <NurseryLedgerDashboard project={project} onSwitchToMap={onSwitchToMap} />
        </Suspense>
      );
    default:
      return (
        <DashboardPlaceholder
          sectionId={section}
          sectionLabel={SECTION_LABELS[section] ?? section}
        />
      );
  }
}
