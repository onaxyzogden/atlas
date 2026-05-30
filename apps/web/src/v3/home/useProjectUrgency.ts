// useProjectUrgency.ts
//
// Composing hook that assembles `ProjectUrgencyInputs` from the five
// stores that feed the engine (per the urgency-engine docstring
// contract: observeDataPointStore, observeFeedStore, fieldActionStore,
// planStratumStore, cyclicalReviewStore + the LocalProject record) and
// returns a `Map<projectId, ProjectUrgencyResult>` ready for Portfolio
// Home (Slice 5.3) and Per-Project Home (Slice 5.4) to consume.
//
// Why a hook, not a server selector: the score depends on locally-
// persisted shell state (planStratumStore checklist progress,
// cyclicalReviewStore forced triggers, fieldActionStore status,
// observeDataPointStore captures, observeFeedStore divergence rows)
// that doesn't reach the server today. Server-side ordering is a
// Phase 5.x follow-up; the engine itself is already pure + portable
// so a future server caller can re-use it without change.
//
// `nowMs` is captured once per hook call so the score doesn't flicker
// between rerenders triggered by unrelated state. The five `byProject`
// maps are read via stable selectors so a mutation in one store
// doesn't tear the others.

import { useMemo } from 'react';
import {
  computeAllObjectiveStatuses,
  computeDomainFreshness,
  computeProjectUrgency,
  isCyclicalReviewDue,
  OBSERVE_DOMAIN_CATALOG,
  UNIVERSAL_DOMAINS,
  type ObserveDataPoint,
  type ObserveFreshness,
  type ProjectUrgencyInputs,
  type ProjectUrgencyResult,
  type UniversalDomain,
} from '@ogden/shared';
import { useFieldActionStore } from '../../store/fieldActionStore.js';
import { useObserveDataPointStore } from '../../store/observeDataPointStore.js';
import { useObserveFeedStore } from '../../store/observeFeedStore.js';
import {
  toProgressMap,
  usePlanStratumProgressStore,
} from '../../store/planStratumStore.js';
import { useCyclicalReviewStore } from '../../store/cyclicalReviewStore.js';
import type { LocalProject } from '../../store/projectStore.js';
import { resolveObjectivesForProject } from '../plan/strata/useProjectObjectives.js';

/** Stable empty map identity so the consumer's React equality check
 *  short-circuits when there are no projects to score. */
const EMPTY_RESULT: ReadonlyMap<string, ProjectUrgencyResult> = new Map();

function latestIsoTimestamp(
  candidates: readonly (string | null | undefined)[],
): string | null {
  let bestMs = -Infinity;
  let bestIso: string | null = null;
  for (const iso of candidates) {
    if (!iso) continue;
    const ms = Date.parse(iso);
    if (!Number.isFinite(ms)) continue;
    if (ms > bestMs) {
      bestMs = ms;
      bestIso = iso;
    }
  }
  return bestIso;
}

/**
 * Assemble + score every project in `projects`. Returns a
 * `Map<projectId, ProjectUrgencyResult>` keyed by `LocalProject.id`.
 *
 * Callers that need an ordered view can pair this with
 * `sortByUrgency(projects, p => map.get(p.id)?.score ?? 0)` from
 * `@ogden/shared` to get a stable, score-descending list.
 */
export function useProjectUrgency(
  projects: readonly LocalProject[],
): ReadonlyMap<string, ProjectUrgencyResult> {
  const fieldActionsByProject = useFieldActionStore((s) => s.byProject);
  const dataPointsByProject = useObserveDataPointStore((s) => s.byProject);
  const feedByProject = useObserveFeedStore((s) => s.byProject);
  const planProgressByProject = usePlanStratumProgressStore((s) => s.byProject);
  const cyclicalReviewByProject = useCyclicalReviewStore((s) => s.byProject);

  // `now` once per hook call so the score doesn't flicker across
  // unrelated rerenders. Re-reads on the next mount cycle.
  const nowMs = useMemo(() => Date.now(), []);

  return useMemo(() => {
    if (projects.length === 0) return EMPTY_RESULT;

    const result = new Map<string, ProjectUrgencyResult>();
    for (const project of projects) {
      const projectId = project.id;
      // Sub-slice D - score against THIS project's resolved objective set.
      // Imperative resolver (not the hook) because this loops over projects.
      const { objectives } = resolveObjectivesForProject(project);

      const fieldActions = fieldActionsByProject[projectId] ?? [];
      const dataPoints = dataPointsByProject[projectId] ?? [];
      const feed = feedByProject[projectId] ?? [];
      const progress = planProgressByProject[projectId] ?? {};
      const reviewMap = cyclicalReviewByProject[projectId] ?? {};

      const objectiveStatuses = computeAllObjectiveStatuses(
        objectives,
        toProgressMap(progress),
      );

      const observeRevisionFlag = (objectiveId: string): boolean =>
        reviewMap[objectiveId]?.forcedTrigger === true;

      const cyclicalReviewDueObjectiveIds: string[] = [];
      for (const objective of objectives) {
        const currentStatus = objectiveStatuses[objective.id];
        if (currentStatus !== 'complete') continue;
        const due = isCyclicalReviewDue({
          objective,
          currentStatus,
          lastReviewedAt: reviewMap[objective.id]?.lastReviewedAt ?? null,
          now: nowMs,
          observeRevisionFlag,
        });
        if (due) cyclicalReviewDueObjectiveIds.push(objective.id);
      }

      const domainFreshness: Partial<Record<UniversalDomain, ObserveFreshness>> =
        {};
      const pointsByDomain = new Map<UniversalDomain, ObserveDataPoint[]>();
      for (const p of dataPoints) {
        const bucket = pointsByDomain.get(p.domainId);
        if (bucket) bucket.push(p);
        else pointsByDomain.set(p.domainId, [p]);
      }
      for (const domain of UNIVERSAL_DOMAINS) {
        domainFreshness[domain] = computeDomainFreshness(
          pointsByDomain.get(domain) ?? [],
          nowMs,
          OBSERVE_DOMAIN_CATALOG[domain].freshnessThresholds,
        );
      }

      // lastActivityAt floor: project record + the latest write across
      // any signal store. Captures "the steward was here recently" even
      // if the project record hasn't been bumped (e.g. a verified field
      // action that fed Observe but didn't touch projectStore).
      const latestFieldActionAt = fieldActions.reduce<string | null>(
        (best, a) => latestIsoTimestamp([best, a.updatedAt]),
        null,
      );
      const latestDataPointAt = dataPoints.reduce<string | null>(
        (best, p) => latestIsoTimestamp([best, p.capturedAt]),
        null,
      );
      const latestFeedAt = feed.reduce<string | null>(
        (best, e) => latestIsoTimestamp([best, e.capturedAt]),
        null,
      );
      const lastActivityAt = latestIsoTimestamp([
        project.updatedAt,
        latestFieldActionAt,
        latestDataPointAt,
        latestFeedAt,
      ]);

      const inputs: ProjectUrgencyInputs = {
        projectId,
        wizardStatus: project.metadata?.wizardStatus,
        lastActivityAt,
        objectiveStatuses,
        cyclicalReviewDueObjectiveIds,
        fieldActions: fieldActions.map((a) => ({
          status: a.status,
          divergenceFlag: a.divergenceFlag,
        })),
        domainFreshness,
        // Engine filters internally by `isSuperseded` + statusOutput
        // category; passing every active+superseded point is safe and
        // saves a redundant filter pass on every render.
        divergencePoints: dataPoints.map((p) => ({
          statusOutput: p.statusOutput,
          isSuperseded: p.isSuperseded,
        })),
        now: nowMs,
      };

      result.set(projectId, computeProjectUrgency(inputs));
    }
    return result;
  }, [
    projects,
    fieldActionsByProject,
    dataPointsByProject,
    feedByProject,
    planProgressByProject,
    cyclicalReviewByProject,
    nowMs,
  ]);
}
