/**
 * DashboardView — full-page dashboard with sidebar + content + metrics.
 * On mobile, a dropdown selector replaces the sidebar.
 */

import { useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import DashboardSidebar from './DashboardSidebar.js';
import DashboardRouter from './DashboardRouter.js';
import DashboardMetrics from './DashboardMetrics.js';
import { useIsMobile } from '../../hooks/useMediaQuery.js';
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
  { id: 'biomass', label: 'Biomass' },
];

export default function DashboardView({ project, onSwitchToMap }: DashboardViewProps) {
  const [activeSection, setActiveSection] = useState('grazing-analysis');
  const isMobile = useIsMobile();

  return (
    <div className={css.layout}>
      {!isMobile && (
        <DashboardSidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
      )}

      <div className={css.content}>
        {/* Mobile section selector */}
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
