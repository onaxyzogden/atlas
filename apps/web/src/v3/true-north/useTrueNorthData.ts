/**
 * useTrueNorthData — reactive view-model for the True North compass.
 *
 * Joins the three backing stores (goal tree, True North questionnaire, Site
 * Profile) with the static segment config and derives per-segment progress in
 * one pass, so the wheel can render all 8 segments without violating the rules
 * of hooks. Mirrors `useCompassData` for the Observe compass.
 */

import { useMemo } from 'react';
import { useGoalTreeStore } from '../../store/goalTreeStore.js';
import { useTrueNorthStore } from '../../store/trueNorthStore.js';
import { useSiteProfileStore } from '../../store/siteProfileStore.js';
import { emptyTrueNorthProfile } from './data/trueNorthTypes.js';
import { emptySiteProfile } from '../plan/data/goalCompassTypes.js';
import { TRUE_NORTH_SEGMENTS, type TrueNorthSegment } from './trueNorthConfig.js';
import {
  segmentProgress,
  aggregateProgress,
  type SegmentProgress,
  type TrueNorthSources,
} from './trueNorthGating.js';
import type { TrueNorthSegmentId } from './data/trueNorthTypes.js';

export interface SegmentView {
  segment: TrueNorthSegment;
  progress: SegmentProgress;
}

export interface TrueNorthData {
  views: SegmentView[];
  byId: Record<TrueNorthSegmentId, SegmentView>;
  stage: SegmentProgress;
  /** Every segment fully answered — unlocks the center Fit Gate. */
  ready: boolean;
  sources: TrueNorthSources;
}

export function useTrueNorthData(projectId: string): TrueNorthData {
  const goalTree = useGoalTreeStore((s) => s.goalTreesByProject[projectId]) ?? null;
  const trueNorth = useTrueNorthStore((s) => s.profilesByProject[projectId]);
  const siteProfile = useSiteProfileStore((s) => s.profilesByProject[projectId]);

  return useMemo(() => {
    const sources: TrueNorthSources = {
      goalTree,
      trueNorth: trueNorth ?? emptyTrueNorthProfile(projectId),
      siteProfile: siteProfile ?? emptySiteProfile(projectId),
    };

    const views: SegmentView[] = TRUE_NORTH_SEGMENTS.map((segment) => ({
      segment,
      progress: segmentProgress(segment.id, sources),
    }));

    const byId = views.reduce(
      (acc, v) => {
        acc[v.segment.id] = v;
        return acc;
      },
      {} as Record<TrueNorthSegmentId, SegmentView>,
    );

    const stage = aggregateProgress(views.map((v) => v.progress));
    const ready = views.length > 0 && views.every((v) => v.progress.complete);

    return { views, byId, stage, ready, sources };
  }, [projectId, goalTree, trueNorth, siteProfile]);
}
