/**
 * useObservationNeeds — joins the static seed catalog with the persisted run
 * store into ready-to-render view models, scoped to one project. One place for
 * the Command Centre panels, the map markers, and the Capture Workspace to read
 * observation needs so they stay consistent.
 */

import { useMemo } from 'react';
import { useObservationNeedStore } from '../../store/observationNeedStore.js';
import { useEvidenceCounts } from '../command/useEvidenceCounts.js';
import { useFieldVerification } from '../../lib/fieldVerification/useFieldVerification.js';
import { seedObservationNeedsForProject } from './seedObservationNeeds.js';
import {
  detectCoverageGapNeeds,
  detectStaleNeeds,
  meanCenter,
} from './autoObservationNeeds.js';
import {
  emptyObservationNeedRun,
  evaluateObservationRecorded,
  type RecordingEvaluation,
  type ObservationNeed,
  type ObservationNeedRun,
} from './observationNeed.js';

export interface ObservationNeedView {
  objective: ObservationNeed;
  run: ObservationNeedRun;
  evaluation: RecordingEvaluation;
}

/**
 * All needs for a project, each with its live run + recording eval. The catalog
 * is the static seed set, plus steward-raised needs (`createdByProject`), plus
 * system-raised "auto" needs derived on the fly from two live signals — coverage
 * gaps (`useEvidenceCounts`) and stale data (`useFieldVerification`). Auto-needs
 * are recomputed each render (never persisted); only their run-state persists,
 * under deterministic ids. Cleared auto-needs are filtered at the DISPLAY layer
 * (see `isDismissedAutoNeed`), NOT here — so `useObservationNeed` keeps resolving
 * an auto-need's id while its Capture Workspace records it.
 */
export function useObservationNeeds(projectId: string): ObservationNeedView[] {
  const runs = useObservationNeedStore((s) => s.byProject[projectId]);
  const created = useObservationNeedStore((s) => s.createdByProject[projectId]);
  const evidenceRows = useEvidenceCounts(projectId);
  const { perLayer } = useFieldVerification(projectId);
  return useMemo(() => {
    const authored = [
      ...seedObservationNeedsForProject(projectId),
      ...(created ?? []),
    ];
    const center = meanCenter(authored);
    const auto = [
      ...detectCoverageGapNeeds(projectId, evidenceRows, center),
      ...detectStaleNeeds(projectId, perLayer, center),
    ];
    const catalog = [...authored, ...auto];
    return catalog.map((objective) => {
      const run = runs?.[objective.id] ?? emptyObservationNeedRun();
      return {
        objective,
        run,
        evaluation: evaluateObservationRecorded(objective, run),
      };
    });
  }, [projectId, runs, created, evidenceRows, perLayer]);
}

/** One need view by id, or null when the id is unknown. */
export function useObservationNeed(
  projectId: string,
  needId: string | null | undefined,
): ObservationNeedView | null {
  const views = useObservationNeeds(projectId);
  return useMemo(() => {
    if (!needId) return null;
    return views.find((v) => v.objective.id === needId) ?? null;
  }, [views, needId]);
}
