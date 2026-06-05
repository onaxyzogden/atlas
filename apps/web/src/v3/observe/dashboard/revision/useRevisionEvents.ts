/**
 * useRevisionEvents — composed hook that powers the Plan Revision Banner
 * (OLOS Observe Dashboard Spec §4.2). Reads the per-project union of the
 * Phase 4 `observeDataPointStore` + the Phase 3 `observeFeedStore`, filters
 * to events strictly newer than the steward's `lastDismissedAt` cursor in
 * `planRevisionDismissalStore`, ranks them via `computeRevisionPriority`,
 * and returns everything the banner + cyclical-review wiring need.
 *
 * Why "events" and not "data points": the priority ranker
 * (`packages/shared/src/relationships/revisionPriority.ts`) operates on the
 * unified `RevisionEvent` shape so divergences, observations, and freshness
 * changes can co-rank. Phase 4 ships divergence + observation events here;
 * freshness-change events stay folded into the next slice (4.5) when the
 * Temporal Layer ships the missing freshness deltas.
 *
 * The hook is intentionally state-light — it reads the three Zustand
 * stores' per-project slices directly and re-derives on every render. The
 * inputs are small (one project's events at a time) and Zustand selectors
 * shallow-equal-stabilise the slice identities, so the memo is enough.
 */

import { useMemo } from 'react';
import {
  computeRevisionPriority,
  type RevisionPriority,
  type UniversalDomain,
} from '@ogden/shared';
import { findObjectiveGlobally } from '../../../plan/objectiveCatalog.js';
import {
  useObserveDataPointStore,
  selectObserveDataPointsForProject,
} from '../../../../store/observeDataPointStore.js';
import {
  useObserveFeedStore,
  selectObserveFeedForProject,
} from '../../../../store/observeFeedStore.js';
import { usePlanRevisionDismissalStore } from '../../../../store/planRevisionDismissalStore.js';
import { resolveDomainForObjective } from './resolveDomainForObjective.js';
import { buildRevisionEvents } from './buildRevisionEvents.js';

export { buildRevisionEvents } from './buildRevisionEvents.js';

export interface RevisionEventsSummary {
  /** Highest priority across the post-dismissal event window, or `null`
   *  when the window is empty / no event ranks high enough to surface. */
  priority: RevisionPriority | null;
  /** Count of events in the window (banner uses this for "N divergences" copy). */
  eventCount: number;
  /** Distinct objective ids touched by the in-window events; banner deep-links
   *  to the first impacted objective. */
  impactedObjectiveIds: readonly string[];
  /** Distinct domain ids touched by the in-window events; banner copy can name
   *  them, and the Plan Revision Flag sync uses them for the overlap check. */
  impactedDomains: readonly UniversalDomain[];
  /** ISO timestamp the steward last dismissed (null when never dismissed). */
  lastDismissedAt: string | null;
}

export function useRevisionEvents(projectId: string): RevisionEventsSummary {
  const dataPoints = useObserveDataPointStore((s) =>
    selectObserveDataPointsForProject(s, projectId),
  );
  const feedEntries = useObserveFeedStore((s) =>
    selectObserveFeedForProject(s, projectId),
  );
  const lastDismissedAt = usePlanRevisionDismissalStore(
    (s) => s.byProject[projectId] ?? null,
  );

  return useMemo(() => {
    const built = buildRevisionEvents(
      dataPoints,
      feedEntries,
      lastDismissedAt,
      (objectiveId) => {
        const obj = findObjectiveGlobally(objectiveId);
        return obj ? resolveDomainForObjective(obj) : null;
      },
    );
    return {
      priority: computeRevisionPriority(built.events),
      eventCount: built.events.length,
      impactedObjectiveIds: built.impactedObjectiveIds,
      impactedDomains: built.impactedDomains,
      lastDismissedAt,
    };
  }, [dataPoints, feedEntries, lastDismissedAt]);
}
