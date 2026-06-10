/**
 * HeaderStageSpine — route-aware mount of the Observe/Plan/Act StageSpine in the
 * global AppShell header (replacing the old LevelNavigatorBar carousel).
 *
 * Parses the current pathname for the v3 project id + lifecycle section, feeds
 * the spine the active stage + each stage's real aggregate progress (Observe /
 * Plan / Act from their own compass data hooks), and owns the typed router
 * navigation (so route literals stay out of the presentational spine).
 * Renders nothing off the recognised v3 project stage routes.
 *
 * Navigation rules (steward-locked; compass pages retired 2026-05-31):
 *  - Observe segment → the Observe working surface while incomplete; once every
 *    Observe objective is verified (pct === 100) → the Command Centre.
 *  - Plan segment → the Plan working surface while incomplete; once every Plan
 *    objective is verified (pct === 100) → the Plan Command Centre. A no-op when
 *    already on a Plan route.
 *  - Act segment → the Act working surface (map-first field-action shell) while
 *    incomplete; once every Act objective is verified (pct === 100) → the Act
 *    Command Centre. A no-op when already on an Act route.
 */

import { useRouterState, useNavigate } from '@tanstack/react-router';
import DevUnlockToggle from './DevUnlockToggle.js';
import StageSpine from './compass/StageSpine.js';
import { useCompassData } from './compass/useCompassData.js';
import { usePlanCompassData } from './plan/compass/usePlanCompassData.js';
import { useActCompassData } from './act/compass/useActCompassData.js';
import type { Stage } from './compass/compassTypes.js';
import { useProjectStore } from '../store/projectStore.js';
import { resolveObjectivesForProject } from './plan/strata/useProjectObjectives.js';

const ROUTE_RE =
  /^\/v3\/project\/([^/]+)\/(observe|plan|act|report)(?:\/|$)/;

// Capture the stratum id when the steward is on a Plan stratum route
// (plan/stratum/$stratumId[/objective/...]) so switching to Act can preserve it.
const PLAN_STRATUM_RE = /^\/v3\/project\/[^/]+\/plan\/stratum\/([^/]+)/;

// Capture the objectiveId when on act/tier-shell/$objectiveId. The $ anchor
// excludes act/tier-shell/stratum/$stratumId (two segments, so no match).
const ACT_OBJECTIVE_RE = /^\/v3\/project\/[^/]+\/act\/tier-shell\/([^/]+)$/;

/** observe section → Observe active; report → none highlighted. */
function sectionToStage(section: string): Stage | null {
  switch (section) {
    case 'observe':
      return 'observe';
    case 'plan':
      return 'plan';
    case 'act':
      return 'act';
    default:
      return null; // report
  }
}

export default function HeaderStageSpine() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  const match = ROUTE_RE.exec(pathname);
  const projectId = match?.[1] ?? 'mtc';
  // Rules of hooks: call all three unconditionally, before the off-route return.
  const observeData = useCompassData(projectId);
  const planData = usePlanCompassData(projectId);
  const actData = useActCompassData(projectId);

  if (!match) return null;

  const activeStage = sectionToStage(match[2]!);

  const progressByStage = {
    observe: observeData.stage,
    plan: planData.stage,
    act: actData.stage,
  };

  const onNavigateStage = (stage: Stage) => {
    if (stage === 'observe') {
      if (observeData.stage.pct >= 100) {
        navigate({
          to: '/v3/project/$projectId/observe/command-centre',
          params: { projectId },
        });
      } else {
        navigate({
          to: '/v3/project/$projectId/observe',
          params: { projectId },
        });
      }
      return;
    }
    if (stage === activeStage) return; // already on this stage — no-op
    if (stage === 'plan') {
      if (planData.stage.pct >= 100) {
        navigate({
          to: '/v3/project/$projectId/plan/command-centre',
          params: { projectId },
        });
        return;
      }
      // Mirror Plan->Act stratum forwarding: when on act/tier-shell/$objectiveId,
      // carry the selected objective into the Plan stratum+objective route.
      const actObjectiveId = ACT_OBJECTIVE_RE.exec(pathname)?.[1] ?? null;
      if (actObjectiveId) {
        const project = useProjectStore
          .getState()
          .projects.find((p) => p.id === projectId || p.serverId === projectId);
        if (project) {
          const { objectives } = resolveObjectivesForProject(project);
          const obj = objectives.find((o) => o.id === actObjectiveId);
          if (obj) {
            navigate({
              to: '/v3/project/$projectId/plan/stratum/$stratumId/objective/$objectiveId',
              params: { projectId, stratumId: obj.stratumId, objectiveId: actObjectiveId },
            });
            return;
          }
        }
      }
      navigate({
        to: '/v3/project/$projectId/plan',
        params: { projectId },
      });
      return;
    }
    if (stage === 'act') {
      if (actData.stage.pct >= 100) {
        navigate({
          to: '/v3/project/$projectId/act/command-centre',
          params: { projectId },
        });
        return;
      }
      // Preserve the stratum the steward was viewing in Plan: forward its id to
      // the stratum-bearing Act route. Coming from anywhere else (Observe, a
      // Plan command-centre/module route, a cold link) → bare /act, which lands
      // ActTierShell on its S1 fallback. ActTierShell validates the id, so a
      // stale segment degrades to S1 rather than erroring.
      const planStratumId = PLAN_STRATUM_RE.exec(pathname)?.[1];
      if (planStratumId) {
        navigate({
          to: '/v3/project/$projectId/act/tier-shell/stratum/$stratumId',
          params: { projectId, stratumId: planStratumId },
        });
      } else {
        navigate({
          to: '/v3/project/$projectId/act',
          params: { projectId },
        });
      }
      return;
    }
    navigate({
      to: `/v3/project/$projectId/${stage}`,
      params: { projectId },
    });
  };

  return (
    <>
      <StageSpine
        activeStage={activeStage}
        progressByStage={progressByStage}
        onNavigateStage={onNavigateStage}
      />
      {/* DEV-only: bypass the Plan prerequisite lock gate. Self-gates on
          import.meta.env.DEV (renders null in production). */}
      <DevUnlockToggle />
    </>
  );
}
