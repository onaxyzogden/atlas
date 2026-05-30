// ObjectiveColumn — right-hand column of the Plan tier shell shown when
// a tier is selected (Plan Navigation Spec v1, Slice 1.5). Composes an
// optional ParallelCallout, a featured NextUpCard, and the remaining
// objectives as ObjectiveCards. Click is delegated to the parent so the
// shell can hoist navigation centrally.

import { useMemo } from 'react';
import {
  getObjectiveObserveDomains,
  type PlanStratum,
  type PlanStratumObjective,
  type PlanStratumObjectiveStatus,
  type UniversalDomain,
} from '@ogden/shared';
import { useObserveFeedStore } from '../../../store/observeFeedStore.js';
import { useObserveDataPointStore } from '../../../store/observeDataPointStore.js';
import NextUpCard from './NextUpCard.js';
import ObjectiveCard from './ObjectiveCard.js';
import ParallelCallout from './ParallelCallout.js';
import css from './ObjectiveColumn.module.css';

const DIVERGENT_STATUSES = new Set([
  'needs_investigation',
  'major_constraint',
  'potential_disqualifier',
]);

interface Props {
  tier: PlanStratum;
  objectives: readonly PlanStratumObjective[];
  objectiveStatuses: Readonly<Record<string, PlanStratumObjectiveStatus>>;
  activeObjectiveId: string | null;
  /**
   * Slice 2.4 — objective ids that should flash a transient ring while
   * the deep-link `?highlightIncomplete=s1` is being consumed by the
   * shell. Empty list = no flash. Always pure presentational.
   */
  highlightObjectiveIds?: readonly string[];
  /**
   * Slice 3.5 — projectId used to read the Observe feed and surface
   * divergence flags on objective cards (spec §6.4). When omitted (or
   * empty), divergence counts default to 0.
   */
  projectId?: string;
  onSelectObjective: (objective: PlanStratumObjective) => void;
  /**
   * Slice 4.4 — invoked when the divergence pill on an objective card is
   * clicked. Parents wire this to navigate to the matching Observe
   * Domain Detail surface. When omitted, the pill renders as
   * non-interactive (visual-only). The handler receives the objective so
   * the parent can resolve its primary domain.
   */
  onObjectiveDivergenceClick?: (objective: PlanStratumObjective) => void;
}

const STATUS_PRIORITY: PlanStratumObjectiveStatus[] = [
  'active',
  'available',
  'locked',
  'complete',
];

export default function ObjectiveColumn({
  tier,
  objectives,
  objectiveStatuses,
  activeObjectiveId,
  highlightObjectiveIds,
  projectId,
  onSelectObjective,
  onObjectiveDivergenceClick,
}: Props) {
  const highlightSet = useMemo(
    () => new Set(highlightObjectiveIds ?? []),
    [highlightObjectiveIds],
  );
  const stratumObjectives = useMemo(
    () => objectives.filter((o) => o.stratumId === tier.id),
    [tier.id, objectives],
  );

  // Slice 3.5 — divergence flag counts per objective from Act (§6.4).
  // Subscribing to byProject keeps the column reactive across new flag
  // captures without forcing the consumer to pass counts in.
  //
  // Slice 4.4 — counts also pick up ACTIVE diverged ObserveDataPoints
  // whose domainId is in the objective's mapped domain set
  // (`getObjectiveObserveDomains`). This is the substrate path for
  // Phase 4 divergences that arrive without a parent objective id
  // (data points are domain-keyed, not objective-keyed).
  const observeByProject = useObserveFeedStore((s) => s.byProject);
  const dataPointsByProject = useObserveDataPointStore((s) => s.byProject);
  const divergedDataPointDomainCounts = useMemo(() => {
    const counts = new Map<UniversalDomain, number>();
    if (!projectId) return counts;
    const list = dataPointsByProject[projectId];
    if (!list?.length) return counts;
    for (const point of list) {
      if (point.isSuperseded) continue;
      if (!DIVERGENT_STATUSES.has(point.statusOutput)) continue;
      counts.set(point.domainId, (counts.get(point.domainId) ?? 0) + 1);
    }
    return counts;
  }, [projectId, dataPointsByProject]);
  const divergenceByObjective = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!projectId) return counts;
    const list = observeByProject[projectId];
    if (list?.length) {
      for (const entry of list) {
        if (entry.sourceType !== 'diverged') continue;
        counts[entry.feedKey] = (counts[entry.feedKey] ?? 0) + 1;
      }
    }
    if (divergedDataPointDomainCounts.size > 0) {
      for (const obj of objectives) {
        const domains = getObjectiveObserveDomains(obj);
        let add = 0;
        for (const domainId of domains) {
          add += divergedDataPointDomainCounts.get(domainId) ?? 0;
        }
        if (add > 0) counts[obj.id] = (counts[obj.id] ?? 0) + add;
      }
    }
    return counts;
  }, [projectId, observeByProject, divergedDataPointDomainCounts, objectives]);

  // Next-up = first active, else first available. Falls back to the
  // first objective so the column still has a focal point.
  const nextUp = useMemo(() => {
    for (const target of ['active', 'available'] as const) {
      const found = stratumObjectives.find(
        (o) => objectiveStatuses[o.id] === target,
      );
      if (found) return found;
    }
    return null;
  }, [stratumObjectives, objectiveStatuses]);

  // Parallel cluster = the next-up objective's parallel group, sized 2+.
  const parallelSiblings = useMemo(() => {
    if (!nextUp?.parallelGroupId) return [] as PlanStratumObjective[];
    const group = stratumObjectives.filter(
      (o) =>
        o.parallelGroupId === nextUp.parallelGroupId &&
        (objectiveStatuses[o.id] === 'available' ||
          objectiveStatuses[o.id] === 'active'),
    );
    return group.length >= 2 ? group : [];
  }, [nextUp, stratumObjectives, objectiveStatuses]);

  // Sorted objectives for the list below NextUpCard, with nextUp removed.
  const sortedObjectives = useMemo(() => {
    const list = nextUp
      ? stratumObjectives.filter((o) => o.id !== nextUp.id)
      : stratumObjectives;
    return [...list].sort((a, b) => {
      const sa = STATUS_PRIORITY.indexOf(objectiveStatuses[a.id] ?? 'locked');
      const sb = STATUS_PRIORITY.indexOf(objectiveStatuses[b.id] ?? 'locked');
      return sa - sb;
    });
  }, [stratumObjectives, nextUp, objectiveStatuses]);

  return (
    <section className={css.column} aria-label={`Objectives in ${tier.title}`}>
      {parallelSiblings.length >= 2 && (
        <ParallelCallout objectives={parallelSiblings} />
      )}

      {nextUp && (
        <NextUpCard
          objective={nextUp}
          status={objectiveStatuses[nextUp.id] ?? 'locked'}
          divergenceCount={divergenceByObjective[nextUp.id] ?? 0}
          onSelect={onSelectObjective}
        />
      )}

      {sortedObjectives.length > 0 && (
        <ul className={css.list}>
          {sortedObjectives.map((obj) => (
            <li key={obj.id} className={css.item}>
              <ObjectiveCard
                objective={obj}
                status={objectiveStatuses[obj.id] ?? 'locked'}
                isActive={obj.id === activeObjectiveId}
                isHighlighting={highlightSet.has(obj.id)}
                divergenceCount={divergenceByObjective[obj.id] ?? 0}
                onSelect={onSelectObjective}
                onDivergenceClick={onObjectiveDivergenceClick}
              />
            </li>
          ))}
        </ul>
      )}

      {stratumObjectives.length === 0 && (
        <p className={css.empty}>No objectives recorded for this stratum yet.</p>
      )}
    </section>
  );
}
