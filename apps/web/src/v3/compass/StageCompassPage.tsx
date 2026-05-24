/**
 * StageCompassPage — Observe Stage Compass (per-project "mission select").
 *
 * Thin wrapper that binds the Observe data hook + Observe route literals to the
 * stage-agnostic `StageCompassView`. Owns the typed @tanstack/react-router
 * navigation (Observe map entry, Command Centre unlock, cross-stage spine) so
 * the shared view stays free of stage-specific route strings. Rendered
 * full-bleed by V3ProjectLayout (no LandOsShell sidebar/rail).
 */

import { useMemo, useState } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useCompassData } from './useCompassData.js';
import StageCompassView from './StageCompassView.js';
import TrueNorthAdvisoryBanner from '../true-north/TrueNorthAdvisoryBanner.js';

export default function StageCompassPage() {
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = params.projectId ?? 'mtc';
  const navigate = useNavigate();
  const data = useCompassData(projectId);

  // "The outer ring readies the stage; the center runs it." The hub unlocks
  // only once every Observe objective is fully verified.
  const ready =
    data.views.length > 0 && data.views.every((v) => v.progress.pct === 100);

  // Default selection: first objective that isn't fully verified, else first.
  const defaultModule = useMemo<string | null>(() => {
    const firstIncomplete = data.views.find((v) => v.progress.pct < 100);
    // OBSERVE_COMPASS_OBJECTIVES is non-empty, so views[0] always exists.
    return (firstIncomplete ?? data.views[0]!).objective.id;
  }, [data.views]);

  const [selected, setSelected] = useState<string | null>(defaultModule);

  const openOnMap = (module: string) =>
    navigate({
      to: '/v3/project/$projectId/observe/$module',
      params: { projectId, module },
      search: {},
    });

  const goCommandCentre = () =>
    navigate({
      to: '/v3/project/$projectId/observe/command-centre',
      params: { projectId },
    });

  return (
    <>
      <TrueNorthAdvisoryBanner projectId={projectId} />
      <StageCompassView
        data={data}
        activeStage="observe"
        stageTitle="Observe"
        centerLabel="OBSERVE"
        selected={selected}
        onSelect={setSelected}
        onOpenMap={openOnMap}
        commandCentre={{ ready, onEnter: goCommandCentre }}
      />
    </>
  );
}
