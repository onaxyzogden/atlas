/**
 * PlanStageCompassPage — Plan Stage Compass (per-project "mission select").
 *
 * Thin wrapper that binds the Plan data hook + Plan route literals to the
 * stage-agnostic `StageCompassView`. Owns the typed @tanstack/react-router
 * navigation (Plan map entry, cross-stage spine). The Plan center is
 * non-interactive (no Command Centre yet — deferred), so no `commandCentre`
 * affordance is passed. Rendered full-bleed by V3ProjectLayout.
 */

import { useMemo, useState } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { usePlanCompassData } from './usePlanCompassData.js';
import StageCompassView from '../../compass/StageCompassView.js';
import type { Stage } from '../../compass/compassTypes.js';

export default function PlanStageCompassPage() {
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = params.projectId ?? 'mtc';
  const navigate = useNavigate();
  const data = usePlanCompassData(projectId);

  // Default selection: first objective that isn't fully verified, else first.
  const defaultModule = useMemo<string | null>(() => {
    const firstIncomplete = data.views.find((v) => v.progress.pct < 100);
    return (firstIncomplete ?? data.views[0]!).objective.id;
  }, [data.views]);

  const [selected, setSelected] = useState<string | null>(defaultModule);

  const openOnMap = (module: string) =>
    navigate({
      to: '/v3/project/$projectId/plan/$module',
      params: { projectId, module },
      search: {},
    });

  const navigateStage = (stage: Stage) => {
    if (stage === 'plan') return;
    if (stage === 'observe') {
      navigate({ to: '/v3/project/$projectId/compass', params: { projectId } });
      return;
    }
    navigate({ to: `/v3/project/$projectId/${stage}`, params: { projectId } });
  };

  return (
    <StageCompassView
      data={data}
      activeStage="plan"
      stageTitle="Plan"
      centerLabel="PLAN"
      selected={selected}
      onSelect={setSelected}
      onOpenMap={openOnMap}
      onNavigateStage={navigateStage}
    />
  );
}
