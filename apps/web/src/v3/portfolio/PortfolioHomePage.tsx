// PortfolioHomePage.tsx
//
// Phase 5, Slice 5.3 — Portfolio Home. Surfaces every active (non-archived)
// project as an urgency-ordered card grid. The urgency score is computed by
// `useProjectUrgency` and used purely as the sort key; each card surfaces
// the underlying reasons (divergences, stale domains, drafts, inactivity)
// rather than the score itself.
//
// Mounted at `/v3/portfolio`. The existing `/v3/project` (no projectId)
// "Property Candidates" landing surface is preserved per the no-deletion
// rule — Portfolio Home is a sibling surface, not a replacement.
//
// "Finish setup" badge on draft projects per the Phase 2 carry-over in
// the OLOS plan: drafts route the user back into the wizard at the step
// they left, while complete projects route to the project view (Slice 5.4
// will repoint that to `/v3/project/$id/home`).

import { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { sortByUrgency } from '@ogden/shared';
import PageHeader from '../components/PageHeader.js';
import { useProjectStore } from '../../store/projectStore.js';
import { useProjectUrgency } from '../home/useProjectUrgency.js';
import { useMyProjectRoles } from '../../hooks/useMyProjectRoles.js';
import ProjectUrgencyCard from './ProjectUrgencyCard.js';
import css from './PortfolioHomePage.module.css';

export default function PortfolioHomePage() {
  const projects = useProjectStore((s) => s.projects);
  const navigate = useNavigate();

  const activeProjects = useMemo(
    () => projects.filter((p) => p.status !== 'archived'),
    [projects],
  );

  const urgencyMap = useProjectUrgency(activeProjects);
  const roleMap = useMyProjectRoles();

  const ordered = useMemo(
    () =>
      sortByUrgency(activeProjects, (p) => urgencyMap.get(p.id)?.score ?? 0),
    [activeProjects, urgencyMap],
  );

  return (
    <div className={css.scrollHost}>
      <PageHeader
        eyebrow="Portfolio"
        title="Your land at a glance"
        subtitle="Projects ordered by what needs attention. Tap a card to dive in."
        actions={
          <button
            type="button"
            className={css.addBtn}
            onClick={() => navigate({ to: '/v3/project/wizard' })}
          >
            + New project
          </button>
        }
      />

      {activeProjects.length === 0 ? (
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
      ) : (
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
      )}
    </div>
  );
}
