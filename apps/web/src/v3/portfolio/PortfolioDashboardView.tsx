// PortfolioDashboardView.tsx
//
// The card-grid overview of all projects (OLOS_Portfolio_Home_Spec_v1.0 §3) —
// the alternate to the four-zone map view, reached via the top-bar toggle.
// Originally extracted from the Phase-5 PortfolioHomePage body (no-deletion
// rule); P7 adds the §3 summary bar, the §3.3 card composition (stage bar,
// stratum + Plan progress, type badges), and summary-bar-driven filtering.
//
// Stage (usePortfolioStages) and Plan progress (usePortfolioPlanProgress) are
// computed ONCE here and passed to each card as props, so the grid never runs a
// store-subscribing hook per card. The summary bar and the stage/diverged
// filters are owned here (lifted state, no new store) — the bar drives the grid.

import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { sortByUrgency } from '@ogden/shared';
import type { LocalProject } from '../../store/projectStore.js';
import { useProjectUrgency } from '../home/useProjectUrgency.js';
import { useMyProjectRoles } from '../../hooks/useMyProjectRoles.js';
import ProjectUrgencyCard from './ProjectUrgencyCard.js';
import PortfolioSummaryBar from './PortfolioSummaryBar.js';
import { usePortfolioStages } from './usePortfolioStages.js';
import { usePortfolioPlanProgress } from './usePortfolioPlanProgress.js';
import type { PortfolioStage } from './portfolioModel.js';
import css from './PortfolioHomePage.module.css';

export default function PortfolioDashboardView({ projects }: { projects: LocalProject[] }) {
  const navigate = useNavigate();
  const urgencyMap = useProjectUrgency(projects);
  const roleMap = useMyProjectRoles();
  const stageMap = usePortfolioStages(projects);
  const planProgressMap = usePortfolioPlanProgress(projects);

  // Summary-bar-driven filters (lifted state — no new store, §7.2).
  const [stageFilter, setStageFilter] = useState<PortfolioStage | null>(null);
  const [divergedOnly, setDivergedOnly] = useState(false);

  const ordered = useMemo(
    () => sortByUrgency(projects, (p) => urgencyMap.get(p.id)?.score ?? 0),
    [projects, urgencyMap],
  );

  const visible = useMemo(() => {
    return ordered.filter((p) => {
      if (stageFilter && stageMap.get(p.id) !== stageFilter) return false;
      if (divergedOnly) {
        const b = urgencyMap.get(p.id)?.breakdown;
        const diverged = b ? b.divergencesCritical + b.divergencesHigh > 0 : false;
        if (!diverged) return false;
      }
      return true;
    });
  }, [ordered, stageFilter, divergedOnly, stageMap, urgencyMap]);

  if (projects.length === 0) {
    return (
      <div className={css.emptyState}>
        <p>You haven't created any projects yet.</p>
        <button
          type="button"
          className={css.helpLink}
          onClick={() => navigate({ to: '/v3/project/wizard' })}
        >
          + Create your first project
        </button>
      </div>
    );
  }

  return (
    <>
      <PortfolioSummaryBar
        projects={projects}
        stageMap={stageMap}
        urgencyMap={urgencyMap}
        stageFilter={stageFilter}
        divergedOnly={divergedOnly}
        onStageFilter={setStageFilter}
        onToggleDiverged={() => setDivergedOnly((v) => !v)}
      />
      {visible.length === 0 ? (
        <div className={css.emptyState}>
          <p>No projects match the current filters.</p>
          <button
            type="button"
            className={css.helpLink}
            onClick={() => {
              setStageFilter(null);
              setDivergedOnly(false);
            }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className={css.grid}>
          {visible.map((project) => (
            <ProjectUrgencyCard
              key={project.id}
              project={project}
              urgency={urgencyMap.get(project.id)}
              stage={stageMap.get(project.id) ?? 'plan'}
              planProgress={planProgressMap.get(project.id)}
              role={project.serverId ? roleMap.get(project.serverId) : undefined}
            />
          ))}
        </div>
      )}
    </>
  );
}
