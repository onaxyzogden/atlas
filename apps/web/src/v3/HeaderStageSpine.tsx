/**
 * HeaderStageSpine — route-aware mount of the Observe/Plan/Act StageSpine in the
 * global AppShell header (replacing the old LevelNavigatorBar carousel).
 *
 * Parses the current pathname for the v3 project id + lifecycle section, feeds
 * the spine the active stage + Observe's aggregate progress, and owns the typed
 * router navigation (so route literals stay out of the presentational spine).
 * Renders nothing off the recognised v3 project stage routes.
 *
 * Navigation rules (steward-locked):
 *  - Observe segment → the Compass while Observe is incomplete; once every
 *    Observe objective is verified (pct === 100) → the Command Centre.
 *  - Plan / Act segment → that stage's compass route; a no-op when already there.
 */

import { useRouterState, useNavigate } from '@tanstack/react-router';
import StageSpine from './compass/StageSpine.js';
import { useCompassData } from './compass/useCompassData.js';
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
  // Rules of hooks: call unconditionally, before the off-route early return.
  const data = useCompassData(projectId);

  if (!match) return null;

  const activeStage = sectionToStage(match[2]!);

  const onNavigateStage = (stage: Stage) => {
    if (stage === 'observe') {
      if (data.stage.pct >= 100) {
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
    navigate({
      to: `/v3/project/$projectId/${stage}`,
      params: { projectId },
    });
  };

  return (
    <StageSpine
      activeStage={activeStage}
      observeProgress={data.stage}
      onNavigateStage={onNavigateStage}
    />
  );
}
