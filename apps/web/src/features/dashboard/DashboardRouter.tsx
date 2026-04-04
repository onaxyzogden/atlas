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

interface DashboardRouterProps {
  section: string;
  project: LocalProject;
  onSwitchToMap: () => void;
}

const SECTION_LABELS: Record<string, string> = {
  'planting-tool': 'Planting Tool',
  'forest-hub': 'Forest Hub',
  'carbon-diagnostic': 'Carbon Diagnostic',
  'nursery-ledger': 'Nursery Ledger',
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
    default:
      return (
        <DashboardPlaceholder
          sectionId={section}
          sectionLabel={SECTION_LABELS[section] ?? section}
        />
      );
  }
}
