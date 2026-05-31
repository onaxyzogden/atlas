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
 *
 * Mobile (§2.1, ≤760px): the left list collapses to a slide-up sheet behind a
 * "Projects" button; the right rail slides up as a bottom sheet whenever a
 * project is selected; the bottom stage rail stays fixed. All driven by the
 * same selection state — no separate mobile component tree.
 */

import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { List, X } from 'lucide-react';
import type { LocalProject } from '../../store/projectStore.js';
import PortfolioMap from './PortfolioMap.js';
import PortfolioProjectList from './PortfolioProjectList.js';
import PortfolioAtAGlanceRail from './PortfolioAtAGlanceRail.js';
import PortfolioStageRail from './PortfolioStageRail.js';
import { usePortfolioBriefing } from './usePortfolioBriefing.js';
import { usePortfolioStages } from './usePortfolioStages.js';
import css from './PortfolioMapPage.module.css';

export default function PortfolioMapPage({ projects }: { projects: LocalProject[] }) {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Mobile-only: whether the slide-up project list sheet is open.
  const [listOpen, setListOpen] = useState(false);
  const selected = projects.find((p) => p.id === selectedId) ?? null;
  const briefing = usePortfolioBriefing(selected);
  const stageById = usePortfolioStages(projects);

  // Selecting a project closes the mobile list sheet (and, by populating
  // `selected`, opens the right-rail bottom sheet on mobile).
  const handleSelect = (id: string) => {
    setSelectedId(id);
    setListOpen(false);
  };

  return (
    <div className={css.shell}>
      {/* Mobile-only "Projects" trigger for the slide-up list (§2.1). */}
      <button
        type="button"
        className={css.mobileListToggle}
        onClick={() => setListOpen((v) => !v)}
        aria-expanded={listOpen}
      >
        <List size={16} aria-hidden />
        Projects
      </button>

      <div className={css.zones}>
        <aside className={`${css.listZone} ${listOpen ? css.listZoneOpen : ''}`}>
          <PortfolioProjectList
            projects={projects}
            selectedId={selectedId}
            onSelect={handleSelect}
            onNewProject={() => navigate({ to: '/v3/project/wizard' })}
            stageById={stageById}
          />
        </aside>

        <div className={css.mapZone}>
          <PortfolioMap
            projects={projects}
            selectedId={selectedId}
            onSelect={handleSelect}
            stageById={stageById}
          />
        </div>

        {/* Right at-a-glance rail (§2.4) — read-only briefing for the selected
            project; renders its own empty state when none. On mobile this aside
            becomes a bottom sheet that slides up only while a project is
            selected (`railZoneOpen`). */}
        <aside className={`${css.railZone} ${selected ? css.railZoneOpen : ''}`}>
          <button
            type="button"
            className={css.sheetClose}
            onClick={() => setSelectedId(null)}
            aria-label="Close project details"
          >
            <X size={16} aria-hidden />
          </button>
          <PortfolioAtAGlanceRail briefing={briefing} />
        </aside>
      </div>

      {/* Bottom stage rail (§2.5) — Plan/Act/Observe navigation for the
          selected project. Stays fixed full-width across all breakpoints. */}
      <div className={css.stageZone}>
        <PortfolioStageRail briefing={briefing} />
      </div>
    </div>
  );
}
