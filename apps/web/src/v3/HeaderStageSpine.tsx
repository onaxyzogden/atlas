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
 * Navigation rules (steward-locked):
 *  - Observe segment → the Compass while Observe is incomplete; once every
 *    Observe objective is verified (pct === 100) → the Command Centre.
 *  - Plan segment → the Plan Compass while incomplete; once every Plan objective
 *    is verified (pct === 100) → the Plan Command Centre. A no-op when already on
 *    a Plan route.
 *  - Act segment → that stage's route; a no-op when already there.
 */

import { useRouterState, useNavigate } from '@tanstack/react-router';
import StageSpine from './compass/StageSpine.js';
import { useCompassData } from './compass/useCompassData.js';
import { usePlanCompassData } from './plan/compass/usePlanCompassData.js';
import { useActCompassData } from './act/compass/useActCompassData.js';
import type { Stage } from './compass/compassTypes.js';

const ROUTE_RE =
  /^\/v3\/project\/([^/]+)\/(compass|observe|plan|act|report)(?:\/|$)/;

/** compass + observe sections → Observe active; report → none highlighted. */
function sectionToStage(section: string): Stage | null {
  switch (section) {
    case 'compass':
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
          to: '/v3/project/$projectId/compass',
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
      } else {
        navigate({
          to: '/v3/project/$projectId/plan/compass',
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
    <StageSpine
      activeStage={activeStage}
      progressByStage={progressByStage}
      onNavigateStage={onNavigateStage}
    />
  );
}
