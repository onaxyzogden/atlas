/**
 * ActStageCompassPage — Act Stage Compass (per-project "mission select").
 *
 * Thin wrapper that binds the Act data hook + Act route literals to the
 * stage-agnostic `StageCompassView`. Owns the typed @tanstack/react-router
 * navigation (Act map entry, Command Centre unlock, cross-stage spine). The
 * Act center unlocks into the Act Command Centre — mirroring Observe/Plan.
 * Rendered full-bleed by V3ProjectLayout.
 */

import { useMemo, useState } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useActCompassData } from './useActCompassData.js';
import StageCompassView from '../../compass/StageCompassView.js';

export default function ActStageCompassPage() {
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = params.projectId ?? 'mtc';
  const navigate = useNavigate();
  const data = useActCompassData(projectId);

  // "The outer ring readies the stage; the center runs it." Mirror Observe/Plan's
  // current "unlock for now" gate — the Command Centre is reachable as soon as
  // there are modules, without requiring every objective verified.
  const ready = data.views.length > 0;

  // Default selection: first objective that isn't fully verified, else first.
  const defaultModule = useMemo<string | null>(() => {
    const firstIncomplete = data.views.find((v) => v.progress.pct < 100);
    return (firstIncomplete ?? data.views[0]!).objective.id;
  }, [data.views]);

  const [selected, setSelected] = useState<string | null>(defaultModule);

  const openOnMap = (module: string) =>
    navigate({
      to: '/v3/project/$projectId/act/$module',
      params: { projectId, module },
      search: {},
    });

  const goCommandCentre = () =>
    navigate({
      to: '/v3/project/$projectId/act/command-centre',
      params: { projectId },
    });

  return (
    <StageCompassView
      data={data}
      activeStage="act"
      stageTitle="Act"
      centerLabel="ACT"
      selected={selected}
      onSelect={setSelected}
      onOpenMap={openOnMap}
      commandCentre={{ ready, onEnter: goCommandCentre }}
    />
  );
}
