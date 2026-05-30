// ObjectiveColumn — right-hand column of the Plan stratum shell shown when
// a stratum is selected (Plan Navigation Spec v1, Slice 1.5). Composes an
// optional ParallelCallout, a featured NextUpCard, and the remaining
// objectives as ObjectiveCards. Click is delegated to the parent so the
// shell can hoist navigation centrally.

import { useEffect, useMemo, useState } from 'react';
import {
  getObjectiveObserveDomains,
  isCyclicalReviewDue,
  type DesignTension,
  type PlanStratum,
  type PlanStratumObjective,
  type PlanStratumObjectiveStatus,
  type UniversalDomain,
} from '@ogden/shared';
import { useObserveFeedStore } from '../../../store/observeFeedStore.js';
import { useObserveDataPointStore } from '../../../store/observeDataPointStore.js';
import {
  useCyclicalReviewStore,
  selectProjectReviewMap,
} from '../../../store/cyclicalReviewStore.js';
import { usePlanTensionBannerStore } from '../../../store/planTensionBannerStore.js';
import NextUpCard from './NextUpCard.js';
import ObjectiveCard from './ObjectiveCard.js';
import ParallelCallout from './ParallelCallout.js';
import DesignTensionBanner from './DesignTensionBanner.js';
import { getSourceTag, type SourceTagKind } from './sourceTag.js';
import css from './ObjectiveColumn.module.css';

const DIVERGENT_STATUSES = new Set([
  'needs_investigation',
  'major_constraint',
  'potential_disqualifier',
]);

interface Props {
  stratum: PlanStratum;
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
  /**
   * Plan Nav v1.1 §8 — active design tensions for this project's type
   * pairing (from `useProjectObjectives`). Surfaced as a collapsible banner
   * at the top of the column. Empty/omitted = no banner.
   */
  tensions?: readonly DesignTension[];
  /**
   * Plan Nav v1.1 §8 — the currently-open stratum id. Tensions whose
   * `resolutionStratumId` matches get a static highlight ring and trigger a
   * transient auto-expand of the banner.
   */
  activeStratumId?: string | null;
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

// Plan Nav v1.1 §8 — how long the tension banner stays auto-expanded after the
// steward arrives at a stratum where a tension resolves. Mirrors the spine's
// HIGHLIGHT_DURATION_MS cadence (a touch longer, since there is reading to do).
const TENSION_AUTO_EXPAND_MS = 5000;

// Plan Nav v1.1 §5 — source filter. Purely a view filter over the rendered
// list; it never touches `objectiveStatuses` or the spine's progress/unlock.
type SourceFilter = 'all' | SourceTagKind;
const SOURCE_FILTERS: ReadonlyArray<{ key: SourceFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'universal', label: 'Universal' },
  { key: 'primary', label: 'Primary' },
  { key: 'secondary', label: 'Secondary' },
];

export default function ObjectiveColumn({
  stratum,
  objectives,
  objectiveStatuses,
  activeObjectiveId,
  highlightObjectiveIds,
  projectId,
  tensions,
  activeStratumId,
  onSelectObjective,
  onObjectiveDivergenceClick,
}: Props) {
  const highlightSet = useMemo(
    () => new Set(highlightObjectiveIds ?? []),
    [highlightObjectiveIds],
  );
  const stratumObjectives = useMemo(
    () => objectives.filter((o) => o.stratumId === stratum.id),
    [stratum.id, objectives],
  );

  // Plan Nav v1.1 §5 — source filter (All / Universal / Primary / Secondary).
  // The bar only shows when this stratum actually mixes sources; on an
  // all-universal stratum it would be inert noise. The filter is applied
  // BEFORE the nextUp / parallel / sorted memos so the featured card and the
  // list stay consistent, but it never feeds the status engine.
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const sourceKinds = useMemo(() => {
    const kinds = new Set<SourceTagKind>();
    for (const o of stratumObjectives) kinds.add(getSourceTag(o).kind);
    return kinds;
  }, [stratumObjectives]);
  // Guard against a sticky filter hiding everything after the steward
  // navigates to a stratum that lacks the previously-selected source.
  const effectiveFilter: SourceFilter =
    sourceFilter !== 'all' && sourceKinds.has(sourceFilter)
      ? sourceFilter
      : 'all';
  const visibleObjectives = useMemo(
    () =>
      effectiveFilter === 'all'
        ? stratumObjectives
        : stratumObjectives.filter(
            (o) => getSourceTag(o).kind === effectiveFilter,
          ),
    [stratumObjectives, effectiveFilter],
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

  // Plan Nav v1.1 §7 — per-card "review suggested" flag. Subscribes to this
  // project's cyclical-review map so a badge appears the moment a 90-day clock
  // elapses or `forceTrigger` fires (dev-tools / the Phase-4 Observe-revision
  // stand-in). The predicate is complete-only, so only complete objectives can
  // light up; it is purely presentational and never feeds the status engine.
  const reviewMap = useCyclicalReviewStore((s) =>
    selectProjectReviewMap(s, projectId ?? ''),
  );
  const reviewSuggestedByObjective = useMemo(() => {
    const map: Record<string, boolean> = {};
    if (!projectId) return map;
    for (const o of stratumObjectives) {
      const record = reviewMap[o.id];
      map[o.id] = isCyclicalReviewDue({
        objective: o,
        currentStatus: objectiveStatuses[o.id] ?? 'locked',
        lastReviewedAt: record?.lastReviewedAt ?? null,
        now: Date.now(),
        observeRevisionFlag: record?.forcedTrigger ? () => true : undefined,
      });
    }
    return map;
  }, [projectId, reviewMap, stratumObjectives, objectiveStatuses]);

  // Plan Nav v1.1 §8 — design-tension banner. The resolved tension list is
  // passed in (derived, never persisted); only the collapse PREFERENCE is
  // persisted (per project, default collapsed). Tensions whose resolution
  // stratum is the one currently open get a static ring, and the banner
  // transiently auto-expands so the steward notices "reconcile it here".
  const tensionList = tensions ?? [];
  const tensionCollapsed = usePlanTensionBannerStore((s) =>
    s.isCollapsed(projectId ?? ''),
  );
  const setTensionCollapsed = usePlanTensionBannerStore((s) => s.setCollapsed);
  const highlightTensionIds = useMemo(() => {
    if (!activeStratumId) return [] as string[];
    return tensionList
      .filter((t) => t.resolutionStratumId === activeStratumId)
      .map((t) => t.id);
  }, [tensionList, activeStratumId]);
  const hasHighlightedTension = highlightTensionIds.length > 0;
  const [tensionAutoExpanded, setTensionAutoExpanded] = useState(false);
  useEffect(() => {
    if (!hasHighlightedTension) return;
    setTensionAutoExpanded(true);
    const timer = window.setTimeout(
      () => setTensionAutoExpanded(false),
      TENSION_AUTO_EXPAND_MS,
    );
    return () => window.clearTimeout(timer);
  }, [activeStratumId, hasHighlightedTension]);
  const tensionExpanded = tensionAutoExpanded || !tensionCollapsed;
  const handleToggleTensions = () => {
    // Manual intent wins over the transient auto-expand: clear it and persist
    // the inverse of whatever is currently showing.
    setTensionAutoExpanded(false);
    setTensionCollapsed(projectId ?? '', tensionExpanded);
  };

  // Next-up = first active, else first available. Falls back to the
  // first objective so the column still has a focal point.
  const nextUp = useMemo(() => {
    for (const target of ['active', 'available'] as const) {
      const found = visibleObjectives.find(
        (o) => objectiveStatuses[o.id] === target,
      );
      if (found) return found;
    }
    return null;
  }, [visibleObjectives, objectiveStatuses]);

  // Parallel cluster = the next-up objective's parallel group, sized 2+.
  const parallelSiblings = useMemo(() => {
    if (!nextUp?.parallelGroupId) return [] as PlanStratumObjective[];
    const group = visibleObjectives.filter(
      (o) =>
        o.parallelGroupId === nextUp.parallelGroupId &&
        (objectiveStatuses[o.id] === 'available' ||
          objectiveStatuses[o.id] === 'active'),
    );
    return group.length >= 2 ? group : [];
  }, [nextUp, visibleObjectives, objectiveStatuses]);

  // Sorted objectives for the list below NextUpCard, with nextUp removed.
  const sortedObjectives = useMemo(() => {
    const list = nextUp
      ? visibleObjectives.filter((o) => o.id !== nextUp.id)
      : visibleObjectives;
    return [...list].sort((a, b) => {
      const sa = STATUS_PRIORITY.indexOf(objectiveStatuses[a.id] ?? 'locked');
      const sb = STATUS_PRIORITY.indexOf(objectiveStatuses[b.id] ?? 'locked');
      return sa - sb;
    });
  }, [visibleObjectives, nextUp, objectiveStatuses]);

  return (
    <section className={css.column} aria-label={`Objectives in ${stratum.title}`}>
      {tensionList.length > 0 && (
        <DesignTensionBanner
          tensions={tensionList}
          expanded={tensionExpanded}
          highlightTensionIds={highlightTensionIds}
          onToggle={handleToggleTensions}
        />
      )}

      {sourceKinds.size > 1 && (
        <div
          className={css.filterBar}
          role="group"
          aria-label="Filter objectives by source"
        >
          {SOURCE_FILTERS.filter(
            (f) => f.key === 'all' || sourceKinds.has(f.key),
          ).map((f) => (
            <button
              key={f.key}
              type="button"
              className={css.filterButton}
              data-active={effectiveFilter === f.key}
              aria-pressed={effectiveFilter === f.key}
              onClick={() => setSourceFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

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
                reviewSuggested={reviewSuggestedByObjective[obj.id] ?? false}
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

      {stratumObjectives.length > 0 && visibleObjectives.length === 0 && (
        <p className={css.empty}>
          No {effectiveFilter} objectives in this stratum.
        </p>
      )}
    </section>
  );
}
