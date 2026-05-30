/**
 * PortfolioMapPage — the four-zone Portfolio Home map surface
 * (OLOS_Portfolio_Home_Spec_v1.0 §2): left project list · centre multi-boundary
 * map · right at-a-glance rail · bottom stage-navigation rail. The map is the
 * primary `/v3/portfolio` view; the card grid (PortfolioDashboardView) is the
 * alternate accessed via the top-bar toggle.
 *
 * Selection state is owned here and shared with the list, map, and both rails.
 * The right rail (§2.4) and bottom stage rail (§2.5) read a single composing
 * briefing hook for the selected project — strictly read-only.
 */

import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import type { LocalProject } from '../../store/projectStore.js';
import PortfolioMap from './PortfolioMap.js';
import PortfolioProjectList from './PortfolioProjectList.js';
import PortfolioAtAGlanceRail from './PortfolioAtAGlanceRail.js';
import PortfolioStageRail from './PortfolioStageRail.js';
import { usePortfolioBriefing } from './usePortfolioBriefing.js';
import css from './PortfolioMapPage.module.css';

export default function PortfolioMapPage({ projects }: { projects: LocalProject[] }) {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = projects.find((p) => p.id === selectedId) ?? null;
  const briefing = usePortfolioBriefing(selected);

  return (
    <div className={css.shell}>
      <div className={css.zones}>
        <aside className={css.listZone}>
          <PortfolioProjectList
            projects={projects}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onNewProject={() => navigate({ to: '/v3/project/wizard' })}
          />
        </aside>

        <div className={css.mapZone}>
          <PortfolioMap projects={projects} selectedId={selectedId} onSelect={setSelectedId} />
        </div>

        {/* Right at-a-glance rail (§2.4) — read-only briefing for the
            selected project; renders its own empty state when none. */}
        <aside className={css.railZone}>
          <PortfolioAtAGlanceRail briefing={briefing} />
        </aside>
      </div>

      {/* Bottom stage rail (§2.5) — Plan/Act/Observe navigation for the
          selected project. */}
      <div className={css.stageZone}>
        <PortfolioStageRail briefing={briefing} />
      </div>
    </div>
  );
}
