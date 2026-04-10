/**
 * DashboardView — content area + metrics panel.
 * The left sidebar is now rendered by ProjectPage (shared with Map View).
 * On mobile, a dropdown selector replaces the sidebar.
 */

import type { LocalProject } from '../../store/projectStore.js';
import DashboardRouter from './DashboardRouter.js';
import DashboardMetrics from './DashboardMetrics.js';
import { useIsMobile } from '../../hooks/useMediaQuery.js';
import { useUIStore } from '../../store/uiStore.js';
import css from './DashboardView.module.css';

interface DashboardViewProps {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const MOBILE_SECTIONS = [
  { id: 'paddock-design', label: 'Paddock Design' },
  { id: 'herd-rotation', label: 'Herd Rotation' },
  { id: 'grazing-analysis', label: 'Grazing Analysis' },
  { id: 'livestock-inventory', label: 'Inventory & Health Ledger' },
  { id: 'planting-tool', label: 'Planting Tool' },
  { id: 'forest-hub', label: 'Forest Hub' },
  { id: 'carbon-diagnostic', label: 'Carbon Diagnostic' },
  { id: 'nursery-ledger', label: 'Nursery Ledger' },
  { id: 'cartographic', label: 'Cartographic' },
  { id: 'hydrology-dashboard', label: 'Hydrology' },
  { id: 'ecological', label: 'Ecological' },
  { id: 'terrain-dashboard', label: 'Terrain' },
  { id: 'stewardship', label: 'Stewardship' },
  { id: 'climate', label: 'Solar & Climate' },
  { id: 'biomass', label: 'Biomass' },
];

export default function DashboardView({ project, onSwitchToMap }: DashboardViewProps) {
  const isMobile = useIsMobile();
  const activeSection = useUIStore((s) => s.activeDashboardSection);
  const setActiveSection = useUIStore((s) => s.setActiveDashboardSection);

  return (
    <div className={css.layout}>
      <div className={css.content}>
        {/* Mobile section selector (desktop sidebar is in ProjectPage) */}
        {isMobile && (
          <select
            className={css.mobileSelect}
            value={activeSection}
            onChange={(e) => setActiveSection(e.target.value)}
            aria-label="Dashboard section"
          >
            {MOBILE_SECTIONS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        )}

        <DashboardRouter section={activeSection} project={project} onSwitchToMap={onSwitchToMap} />
      </div>

      {!isMobile && (
        <DashboardMetrics section={activeSection} project={project} />
      )}
    </div>
  );
}
