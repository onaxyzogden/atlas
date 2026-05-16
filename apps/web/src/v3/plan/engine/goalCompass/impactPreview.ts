/**
 * Impact Preview — given a candidate override (delete row / disable
 * intervention / change cost / change labor), re-runs the engine without
 * the affected intervention and surfaces the deltas.
 *
 * Returns:
 *   - forecast deltas per criterion (pct points at each year bucket)
 *   - which downstream interventions are now skipped (prereq orphaned)
 *   - human-readable summary lines for the UI panel
 */

import type {
  GoalTree,
  SiteProfile,
} from '../../data/goalCompassTypes.js';
import { INTERVENTION_CATALOG } from '../../data/interventionCatalog.js';
import { runSequencingEngine } from './sequencingEngine.js';
import type { SequencingResult } from './sequencingEngine.js';
import { computeForecast } from './criteriaForecast.js';
import type { ForecastResult } from './criteriaForecast.js';
import { FORECAST_YEARS } from './criteriaForecast.js';

export interface ImpactDelta {
  criterionId: string;
  criterionDescription: string;
  unit: string;
  byYear: { year: number; before: number; after: number; delta: number }[];
  meetsByDeadlineBefore: boolean;
  meetsByDeadlineAfter: boolean;
}

export interface ImpactPreview {
  removedInterventionId: string;
  removedInterventionName: string;
  cascadingRemovals: { id: string; name: string; reason: string }[];
  deltas: ImpactDelta[];
  summaryLines: string[];
  forecastBefore: ForecastResult;
  forecastAfter: ForecastResult;
}

export function computeImpactPreview(
  goalTree: GoalTree,
  siteProfile: SiteProfile,
  projectId: string,
  baselineResult: SequencingResult,
  removedInterventionId: string,
  alreadyExcludedIds: readonly string[] = [],
): ImpactPreview {
  const removed = baselineResult.selected.find(
    (s) => s.intervention.id === removedInterventionId,
  );
  const removedName = removed?.intervention.name ?? removedInterventionId;

  const excluded = new Set<string>([...alreadyExcludedIds, removedInterventionId]);
  const reducedCatalog = INTERVENTION_CATALOG.filter((i) => !excluded.has(i.id));
  const afterResult = runSequencingEngine(goalTree, siteProfile, projectId, reducedCatalog);

  const beforeIds = new Set(baselineResult.selected.map((s) => s.intervention.id));
  const afterIds = new Set(afterResult.selected.map((s) => s.intervention.id));

  const cascadingRemovals: ImpactPreview['cascadingRemovals'] = [];
  for (const before of baselineResult.selected) {
    if (before.intervention.id === removedInterventionId) continue;
    if (!afterIds.has(before.intervention.id)) {
      cascadingRemovals.push({
        id: before.intervention.id,
        name: before.intervention.name,
        reason: 'Prerequisite removed',
      });
    }
  }

  const forecastBefore = computeForecast(baselineResult, goalTree, siteProfile);
  const forecastAfter = computeForecast(afterResult, goalTree, siteProfile);

  const deltas: ImpactDelta[] = forecastBefore.criteria.map((cb) => {
    const ca = forecastAfter.criteria.find((c) => c.criterion.id === cb.criterion.id);
    const byYear = FORECAST_YEARS.map((year) => {
      const before = cb.points.find((p) => p.year === year)?.value ?? 0;
      const after = ca?.points.find((p) => p.year === year)?.value ?? 0;
      return { year, before, after, delta: after - before };
    });
    return {
      criterionId: cb.criterion.id,
      criterionDescription: cb.criterion.description,
      unit: cb.criterion.unit,
      byYear,
      meetsByDeadlineBefore: cb.meetsTargetByDeadline,
      meetsByDeadlineAfter: ca?.meetsTargetByDeadline ?? false,
    };
  });

  const summaryLines: string[] = [];
  summaryLines.push(`Removing "${removedName}".`);
  if (cascadingRemovals.length) {
    summaryLines.push(
      `${cascadingRemovals.length} downstream intervention${cascadingRemovals.length === 1 ? '' : 's'} will be orphaned: ${cascadingRemovals.map((c) => c.name).join(', ')}.`,
    );
  }
  const regressions = deltas.filter(
    (d) => d.meetsByDeadlineBefore && !d.meetsByDeadlineAfter,
  );
  if (regressions.length) {
    summaryLines.push(
      `${regressions.length} criterion target${regressions.length === 1 ? '' : 's'} will no longer be met by deadline: ${regressions.map((r) => r.criterionDescription).join('; ')}.`,
    );
  }
  if (!cascadingRemovals.length && !regressions.length) {
    summaryLines.push('No criteria regressions or downstream cascades detected.');
  }
  void beforeIds;

  return {
    removedInterventionId,
    removedInterventionName: removedName,
    cascadingRemovals,
    deltas,
    summaryLines,
    forecastBefore,
    forecastAfter,
  };
}
