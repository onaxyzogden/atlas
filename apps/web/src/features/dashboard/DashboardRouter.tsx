/**
 * DashboardRouter — maps section IDs to dashboard page components.
 */

import { lazy, Suspense } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { PanelLoader } from '../../components/ui/PanelLoader.js';
import DashboardPlaceholder from './pages/DashboardPlaceholder.js';

const GrazingDashboard = lazy(() => import('./pages/GrazingDashboard.js'));

interface DashboardRouterProps {
  section: string;
  project: LocalProject;
  onSwitchToMap: () => void;
}

const SECTION_LABELS: Record<string, string> = {
  'paddock-design': 'Paddock Design',
  'herd-rotation': 'Herd Rotation',
  'livestock-inventory': 'Livestock Inventory',
  'health-ledger': 'Health Ledger',
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
    default:
      return (
        <DashboardPlaceholder
          sectionId={section}
          sectionLabel={SECTION_LABELS[section] ?? section}
        />
      );
  }
}
