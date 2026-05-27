// ObjectiveColumn — right-hand column of the Plan tier shell shown when
// a tier is selected (Plan Navigation Spec v1, Slice 1.5). Composes the
// tier header, an optional ParallelCallout, a featured NextUpCard, and
// the remaining objectives as ObjectiveCards. Click is delegated to the
// parent so the shell can hoist navigation centrally.

import { useMemo } from 'react';
import type {
  PlanTier,
  PlanTierObjective,
  PlanTierObjectiveStatus,
} from '@ogden/shared';
import NextUpCard from './NextUpCard.js';
import ObjectiveCard from './ObjectiveCard.js';
import ParallelCallout from './ParallelCallout.js';
import css from './ObjectiveColumn.module.css';

interface Props {
  tier: PlanTier;
  objectives: readonly PlanTierObjective[];
  objectiveStatuses: Readonly<Record<string, PlanTierObjectiveStatus>>;
  activeObjectiveId: string | null;
  /**
   * Slice 2.4 — objective ids that should flash a transient ring while
   * the deep-link `?highlightIncomplete=t0` is being consumed by the
   * shell. Empty list = no flash. Always pure presentational.
   */
  highlightObjectiveIds?: readonly string[];
  onSelectObjective: (objective: PlanTierObjective) => void;
}

const STATUS_PRIORITY: PlanTierObjectiveStatus[] = [
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
  onSelectObjective,
}: Props) {
  const highlightSet = useMemo(
    () => new Set(highlightObjectiveIds ?? []),
    [highlightObjectiveIds],
  );
  const tierObjectives = useMemo(
    () => objectives.filter((o) => o.tierId === tier.id),
    [tier.id, objectives],
  );

  // Next-up = first active, else first available. Falls back to the
  // first objective so the column still has a focal point.
  const nextUp = useMemo(() => {
    for (const target of ['active', 'available'] as const) {
      const found = tierObjectives.find(
        (o) => objectiveStatuses[o.id] === target,
      );
      if (found) return found;
    }
    return null;
  }, [tierObjectives, objectiveStatuses]);

  // Parallel cluster = the next-up objective's parallel group, sized 2+.
  const parallelSiblings = useMemo(() => {
    if (!nextUp?.parallelGroupId) return [] as PlanTierObjective[];
    const group = tierObjectives.filter(
      (o) =>
        o.parallelGroupId === nextUp.parallelGroupId &&
        (objectiveStatuses[o.id] === 'available' ||
          objectiveStatuses[o.id] === 'active'),
    );
    return group.length >= 2 ? group : [];
  }, [nextUp, tierObjectives, objectiveStatuses]);

  // Sorted objectives for the list below NextUpCard, with nextUp removed.
  const sortedObjectives = useMemo(() => {
    const list = nextUp
      ? tierObjectives.filter((o) => o.id !== nextUp.id)
      : tierObjectives;
    return [...list].sort((a, b) => {
      const sa = STATUS_PRIORITY.indexOf(objectiveStatuses[a.id] ?? 'locked');
      const sb = STATUS_PRIORITY.indexOf(objectiveStatuses[b.id] ?? 'locked');
      return sa - sb;
    });
  }, [tierObjectives, nextUp, objectiveStatuses]);

  return (
    <section className={css.column} aria-label={`Objectives in ${tier.title}`}>
      <header className={css.header}>
        <p className={css.eyebrow}>Tier {tier.ordinal}</p>
        <h2 className={css.title}>{tier.title}</h2>
        <p className={css.summary}>{tier.summary}</p>
      </header>

      {parallelSiblings.length >= 2 && (
        <ParallelCallout objectives={parallelSiblings} />
      )}

      {nextUp && (
        <NextUpCard
          objective={nextUp}
          status={objectiveStatuses[nextUp.id] ?? 'locked'}
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
                onSelect={onSelectObjective}
              />
            </li>
          ))}
        </ul>
      )}

      {tierObjectives.length === 0 && (
        <p className={css.empty}>No objectives recorded for this tier yet.</p>
      )}
    </section>
  );
}
