// PerProjectHomePage.tsx
//
// Phase 5, Slice 5.3-carryover -> Slice 5.4. Per-Project Home mounted at
// `/v3/project/$projectId/home` and `/v3/project/$projectId/` (both
// routes resolve to this page so deep links + the default landing land
// in the same place). Consumes `useProjectUrgency([project])` in the
// single-project case the urgency engine docstring contract explicitly
// supports: the score is only used as a routing hint INSIDE NextUpCard
// (highest-priority breakdown channel wins), it is never rendered.
//
// The composing hook is the canonical urgency reader; this page does not
// re-implement the 5-store assembly. The Portfolio Home and Per-Project
// Home surfaces share the same `buildUrgencyChips` helper so the chip
// mapping never drifts.

import { useNavigate, useParams } from '@tanstack/react-router';
import { Sprout } from 'lucide-react';
import PageHeader from '../components/PageHeader.js';
import { useProjectStore } from '../../store/projectStore.js';
import { useProjectUrgency } from './useProjectUrgency.js';
import { useMyProjectRoles } from '../../hooks/useMyProjectRoles.js';
import AttentionRail from './AttentionRail.js';
import NextUpCard from './NextUpCard.js';
import StageStatusRow from './StageStatusRow.js';
import css from './PerProjectHomePage.module.css';

export default function PerProjectHomePage() {
  const params = useParams({ strict: false }) as { projectId?: string };
  const navigate = useNavigate();
  const project = useProjectStore((s) =>
    params.projectId
      ? s.projects.find((p) => p.id === params.projectId)
      : null,
  );

  // useProjectUrgency is stable: even with a fresh array literal the hook
  // memoises on the array contents internally for the no-projects case
  // and on every store-byProject map identity otherwise. Wrapping in a
  // useMemo would only delay the hook by one render.
  const urgencyMap = useProjectUrgency(project ? [project] : []);
  const roleMap = useMyProjectRoles();

  if (!project) {
    return <p className={css.empty}>No project loaded.</p>;
  }

  // Slice 5.5a access gate. Scoped views are an authenticated + synced
  // capability: a contractor or landowner on a SYNCED project (one with a
  // serverId) gets an honest empty state instead of the steward home - their
  // task / portal surfaces ship in Slices 5.5c / 5.5d. Local-only projects
  // have no serverId so they are never in the map (always full single-owner
  // view), and signed-out sessions get an empty map, so this never fires for
  // the dominant offline/demo flow.
  const scopedRole = project.serverId ? roleMap.get(project.serverId) : undefined;
  if (scopedRole === 'contractor' || scopedRole === 'landowner') {
    return (
      <div className={css.scrollHost}>
        <PageHeader
          eyebrow="Project"
          title={project.name}
          actions={
            <button
              type="button"
              className={css.headerLink}
              onClick={() => navigate({ to: '/v3/portfolio' })}
            >
              All projects
            </button>
          }
        />
        <p className={css.empty}>
          Your role on this project does not include the home view. Contact the
          project steward if you need access.
        </p>
      </div>
    );
  }

  const urgency = urgencyMap.get(project.id);
  const draftWizard = project.metadata?.wizardStatus === 'in_progress';

  return (
    <div className={css.scrollHost}>
      <PageHeader
        eyebrow="Project"
        title={project.name}
        subtitle={
          project.description ??
          'Your land at a glance. The next move, the open signals, and where each stage stands.'
        }
        actions={
          <div className={css.headerActions}>
            {draftWizard ? (
              <span className={css.finishSetupPill}>
                <Sprout size={12} aria-hidden /> Finish setup
              </span>
            ) : null}
            <button
              type="button"
              className={css.headerLink}
              onClick={() => navigate({ to: '/v3/portfolio' })}
            >
              All projects
            </button>
          </div>
        }
      />

      <div className={css.body}>
        <div className={css.main}>
          <NextUpCard project={project} urgency={urgency} />
          <StageStatusRow project={project} />
        </div>
        <div className={css.sideRail}>
          <AttentionRail urgency={urgency} />
        </div>
      </div>
    </div>
  );
}
