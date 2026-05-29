/**
 * HandoffSection - dispatches to the stage-specific handoff component for the
 * objective being worked. Mounts in ObjectiveWorkspace's side panel and
 * replaces the Phase 1.5 placeholder button.
 */

import type { Objective } from '@ogden/shared';
import ObserveToPlanHandoff from './ObserveToPlanHandoff.js';
import PlanToActHandoff from './PlanToActHandoff.js';
import ActFeedbackLoop from './ActFeedbackLoop.js';

interface Props {
  projectId: string;
  objective: Objective;
  serverId?: string;
}

export default function HandoffSection({ projectId, objective, serverId }: Props) {
  if (objective.stage === 'observe') {
    return <ObserveToPlanHandoff projectId={projectId} objective={objective} />;
  }
  if (objective.stage === 'plan') {
    return <PlanToActHandoff projectId={projectId} objective={objective} />;
  }
  return (
    <ActFeedbackLoop
      projectId={projectId}
      objective={objective}
      serverId={serverId}
    />
  );
}
