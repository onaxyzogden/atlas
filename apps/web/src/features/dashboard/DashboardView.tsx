/**
 * DashboardView — content area + metrics panel.
 * The left sidebar is now rendered by ProjectPage (shared with Map View).
 * On mobile, a dropdown selector replaces the sidebar.
 */

import type { LocalProject } from '../../store/projectStore.js';
import DashboardRouter from './DashboardRouter.js';
import DashboardMetrics from './DashboardMetrics.js';
import LandVerdictCard from './LandVerdictCard.js';
import CriticalConstraintAlert from './CriticalConstraintAlert.js';
import DecisionTriad from './DecisionTriad.js';
import OPAComparisonWheel from '../../components/opa-wheel/OPAComparisonWheel.js';
import { useIsMobile } from '../../hooks/useMediaQuery.js';
import { useUIStore } from '../../store/uiStore.js';
import { DASHBOARD_ITEMS } from '../navigation/taxonomy.js';
import css from './DashboardView.module.css';

interface DashboardViewProps {
  project: LocalProject;
  onSwitchToMap: () => void;
  onGenerateBrief?: () => void;
}

// Mobile dropdown mirrors the desktop sidebar by deriving from the canonical
// taxonomy. The previous hardcoded list omitted Energy & Off-Grid, Utilities
// & Infrastructure, Regulatory, Feasibility, Timeline & Phasing, Economics,
// Reports & Export, Public Portal, Educational Atlas, and Siting Rules — making
// those dashboards unreachable on mobile despite being wired in
// DashboardRouter. `dashboardRoute ?? id` matches the section-id resolution
// used by DashboardSidebar so the same selection state works in both views.
// `dashboard-settings` is excluded because it's surfaced via the bottom
// controls, matching DashboardSidebar's ACCORDION_ITEMS filter.
const MOBILE_SECTIONS = DASHBOARD_ITEMS
  .filter((item) => item.id !== 'dashboard-settings')
  .map((item) => ({ id: item.dashboardRoute ?? item.id, label: item.label }));

export default function DashboardView({ project, onSwitchToMap, onGenerateBrief }: DashboardViewProps) {
  const isMobile = useIsMobile();
  const activeSection = useUIStore((s) => s.activeDashboardSection);
  const setActiveSection = useUIStore((s) => s.setActiveDashboardSection);

  // Verdict hero is the executive layer above the existing Overview content.
  // Reserved for the default Overview section ('site-intelligence') so deep
  // dashboards (Hydrology, Economics, …) keep their own context-specific tops.
  const showVerdictHero = activeSection === 'site-intelligence';

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

        {showVerdictHero && (
          <>
            <LandVerdictCard
              project={project}
              onViewConstraints={() => setActiveSection('regulatory')}
              onOpenDesignMap={onSwitchToMap}
              onGenerateBrief={onGenerateBrief}
            />
            <CriticalConstraintAlert
              project={project}
              onCreateChecklist={() => setActiveSection('regulatory')}
            />
            <DecisionTriad project={project} />
            <OPAComparisonWheel project={project} levelColor="#8b7355" />
          </>
        )}

        <DashboardRouter section={activeSection} project={project} onSwitchToMap={onSwitchToMap} />
      </div>

      {!isMobile && (
        <DashboardMetrics
          section={activeSection}
          project={project}
          onGenerateBrief={onGenerateBrief}
          onSwitchToMap={onSwitchToMap}
        />
      )}
    </div>
  );
}
