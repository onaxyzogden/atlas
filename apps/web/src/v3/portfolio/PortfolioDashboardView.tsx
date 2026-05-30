// PortfolioDashboardView.tsx
//
// The card-grid overview of all projects (OLOS_Portfolio_Home_Spec_v1.0 §3) —
// the alternate to the four-zone map view, reached via the top-bar toggle.
// Extracted verbatim from the original PortfolioHomePage body (Phase 5, Slice
// 5.3) so the urgency-ordered grid is preserved per the no-deletion rule; the
// container now owns the header + view toggle.
//
// The summary bar + §3.3 card-field alignment (and the spec's "order by last
// activity") are P7 polish; this pass keeps the existing urgency ordering.

import { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { sortByUrgency } from '@ogden/shared';
import type { LocalProject } from '../../store/projectStore.js';
import { useProjectUrgency } from '../home/useProjectUrgency.js';
import { useMyProjectRoles } from '../../hooks/useMyProjectRoles.js';
import ProjectUrgencyCard from './ProjectUrgencyCard.js';
import css from './PortfolioHomePage.module.css';

export default function PortfolioDashboardView({ projects }: { projects: LocalProject[] }) {
  const navigate = useNavigate();
  const urgencyMap = useProjectUrgency(projects);
  const roleMap = useMyProjectRoles();

  const ordered = useMemo(
    () => sortByUrgency(projects, (p) => urgencyMap.get(p.id)?.score ?? 0),
    [projects, urgencyMap],
  );

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
    <div className={css.grid}>
      {ordered.map((project) => (
        <ProjectUrgencyCard
          key={project.id}
          project={project}
          urgency={urgencyMap.get(project.id)}
          role={project.serverId ? roleMap.get(project.serverId) : undefined}
        />
      ))}
    </div>
  );
}
