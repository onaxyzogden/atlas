/**
 * DashboardView — full-page dashboard with sidebar + content + metrics.
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
        <DashboardRouter section={activeSection} project={project} onSwitchToMap={onSwitchToMap} />
      </div>

      {!isMobile && (
        <DashboardMetrics section={activeSection} project={project} />
      )}
    </div>
  );
}
