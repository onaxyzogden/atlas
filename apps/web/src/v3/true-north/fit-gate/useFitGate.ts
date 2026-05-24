/**
 * useFitGate — reactive view-model for the Fit Gate verdict surface.
 *
 * Joins the Stage 0 questionnaire (True North + Site Profile + goal archetype)
 * with the GIS vision-fit results, then runs the pure `computeFitGate` engine.
 * GIS is sourced exactly like `useTypeFitRanking`: site layers → assessment
 * scores → `computeVisionFit` for the steward's chosen archetype.
 */

import { useMemo } from 'react';
import { useProjectStore } from '../../../store/projectStore.js';
import { useSiteData } from '../../../store/siteDataStore.js';
import { computeAssessmentScores } from '../../../lib/computeScores.js';
import { computeVisionFit, type FitResult } from '../../../lib/visionFit.js';
import { useTrueNorthData } from '../useTrueNorthData.js';
import { ARCHETYPE_TO_PROJECT_TYPE } from '../trueNorthConfig.js';
import { computeFitGate, type FitGateResult } from './engine/fitGate.js';
import type { ProjectArchetype } from '../../plan/data/goalCompassTypes.js';

export interface FitGateView {
  result: FitGateResult;
  archetype: ProjectArchetype | null;
  /** True once GIS layers exist and scored — otherwise the GIS finding is omitted. */
  hasGis: boolean;
  /** Stage 0 progress is complete across all 8 segments. */
  ready: boolean;
  stagePct: number;
}

export function useFitGate(projectId: string): FitGateView {
  const data = useTrueNorthData(projectId);
  const project = useProjectStore((s) =>
    s.projects.find((p) => p.id === projectId),
  );
  const siteData = useSiteData(projectId);

  const archetype = data.sources.goalTree?.archetype ?? null;

  const gisFit = useMemo<FitResult[]>(() => {
    if (!siteData?.layers || !archetype) return [];
    const projectType = ARCHETYPE_TO_PROJECT_TYPE[archetype];
    if (!projectType) return [];
    const scores = computeAssessmentScores(
      siteData.layers,
      project?.acreage ?? null,
    );
    if (scores.length === 0) return [];
    return computeVisionFit(projectType, scores);
  }, [siteData, archetype, project?.acreage]);

  const result = useMemo(
    () =>
      computeFitGate({
        archetype,
        trueNorth: data.sources.trueNorth,
        siteProfile: data.sources.siteProfile,
        gisFit,
      }),
    [archetype, data.sources.trueNorth, data.sources.siteProfile, gisFit],
  );

  return {
    result,
    archetype,
    hasGis: gisFit.length > 0,
    ready: data.ready,
    stagePct: data.stage.pct,
  };
}
