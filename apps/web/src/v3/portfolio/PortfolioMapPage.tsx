/**
 * PortfolioMapPage — the four-zone Portfolio Home map surface
 * (OLOS_Portfolio_Home_Spec_v1.0 §2): left project list · centre multi-boundary
 * map · right at-a-glance rail · bottom stage-navigation rail. The map is the
 * primary `/v3/portfolio` view; the card grid (PortfolioDashboardView) is the
 * alternate accessed via the top-bar toggle.
 *
 * Selection state is owned here and shared with the list + map. P1 ships the
 * list + map + selection wiring; the right rail (§2.4) and bottom stage rail
 * (§2.5) are placeholders that P2 fills with live shared-selector data.
 */

import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import type { LocalProject } from '../../store/projectStore.js';
import PortfolioMap from './PortfolioMap.js';
import PortfolioProjectList from './PortfolioProjectList.js';
import css from './PortfolioMapPage.module.css';

export default function PortfolioMapPage({ projects }: { projects: LocalProject[] }) {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = projects.find((p) => p.id === selectedId) ?? null;

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

        {/* Right at-a-glance rail — P2 replaces this placeholder with
            PortfolioAtAGlanceRail (§2.4). */}
        <aside className={css.railZone}>
          {selected ? (
            <div className={css.railStub}>
              <p className={css.railStubName}>{selected.name}</p>
              <p className={css.railStubHint}>At-a-glance briefing — coming in the next pass.</p>
            </div>
          ) : (
            <p className={css.railStubHint}>Select a project to see its briefing.</p>
          )}
        </aside>
      </div>

      {/* Bottom stage rail — P2 replaces this placeholder with
          PortfolioStageRail (§2.5). */}
      <div className={css.stageZone}>
        {selected ? (
          <span className={css.stageStub}>
            <strong>{selected.name}</strong> · Plan · Act · Observe
          </span>
        ) : (
          <span className={css.stageStubMuted}>Select a project to navigate its stages.</span>
        )}
      </div>
    </div>
  );
}
