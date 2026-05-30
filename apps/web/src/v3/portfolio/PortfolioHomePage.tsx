// PortfolioHomePage.tsx
//
// Container for the multi-project Portfolio Home surface
// (OLOS_Portfolio_Home_Spec_v1.0). A slim top bar carries the view toggle
// (§6) and the New-project action; below it sits either the four-zone Map
// view (§2, the primary surface) or the card-grid Dashboard view (§3).
//
// Mounted at `/v3/portfolio`. The original urgency-ordered card grid (Phase 5,
// Slice 5.3) is preserved as PortfolioDashboardView per the no-deletion rule —
// the map view is the new default, the grid is one toggle away.

import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useProjectStore } from '../../store/projectStore.js';
import PortfolioMapPage from './PortfolioMapPage.js';
import PortfolioDashboardView from './PortfolioDashboardView.js';
import PortfolioViewToggle, { type PortfolioView } from './PortfolioViewToggle.js';
import css from './PortfolioHomePage.module.css';

export default function PortfolioHomePage() {
  const projects = useProjectStore((s) => s.projects);
  const navigate = useNavigate();
  const [view, setView] = useState<PortfolioView>('map');

  const activeProjects = useMemo(
    () => projects.filter((p) => p.status !== 'archived'),
    [projects],
  );

  return (
    <div className={css.container}>
      <div className={css.topbar}>
        <div className={css.topbarLead}>
          <span className={css.eyebrow}>Portfolio</span>
          <span className={css.countLabel}>
            {activeProjects.length} {activeProjects.length === 1 ? 'project' : 'projects'}
          </span>
        </div>
        <div className={css.topbarActions}>
          <PortfolioViewToggle view={view} onChange={setView} />
          <button
            type="button"
            className={css.addBtn}
            onClick={() => navigate({ to: '/v3/project/wizard' })}
          >
            + New project
          </button>
        </div>
      </div>

      <div className={css.viewArea}>
        {view === 'map' ? (
          <PortfolioMapPage projects={activeProjects} />
        ) : (
          <div className={css.scrollHost}>
            <PortfolioDashboardView projects={activeProjects} />
          </div>
        )}
      </div>
    </div>
  );
}
