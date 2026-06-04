// ObjectiveColumn — right-hand column of the Plan stratum shell shown when
// a stratum is selected (Plan Navigation Spec v1, Slice 1.5). Composes an
// optional ParallelCallout and a uniform list of ObjectiveCards (the next-up
// objective sorts to the top rather than being pulled into a bespoke card).
// Click is delegated to the parent so the shell can hoist navigation centrally.

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
import { useReviewFlagCountsByObjective } from '../../../store/reviewFlagStore.js';
import ObjectiveCard from './ObjectiveCard.js';
import ParallelCallout from './ParallelCallout.js';
import DesignTensionBanner from './DesignTensionBanner.js';
import { getSourceTag, type SourceTagKind } from './sourceTag.js';
// Plan Spine re-skin — the column container + source-filter pills now use the
// spine palette tokens so they sit in the dark/gold 3-column shell. The card
// children (ObjectiveCard, banners) keep their own CSS modules,
// which already resolve against the app's dark `--color-*` theme.
import { C, F } from '../spine/tokens.js';
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
  /**
   * Plan Nav v1.1 §8 — invoked when a tension banner row is clicked. The shell
   * wires this to navigate to the tension's resolution stratum and flash the
   * objective cards it concerns. Omitted → banner rows render as static text.
   */
  onSelectTension?: (tensionId: string) => void;
  onSelectObjective: (objective: PlanStratumObjective) => void;
  /**
   * Slice 4.4 — invoked when the divergence pill on an objective card is
   * clicked. Parents wire this to navigate to the matching Observe
   * Domain Detail surface. When omitted, the pill renders as
   * non-interactive (visual-only). The handler receives the objective so
   * the parent can resolve its primary domain.
   */
  onObjectiveDivergenceClick?: (objective: PlanStratumObjective) => void;
  /**
   * Plan Nav v1.1 §8.3 — invoked when the "Restore" control on a deferred
   * objective card is clicked. Parents wire this to `undeferObjective`.
   * When omitted, deferred cards render without a restore affordance.
   */
  onRestoreObjective?: (objective: PlanStratumObjective) => void;
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
  onSelectTension,
  onSelectObjective,
  onObjectiveDivergenceClick,
  onRestoreObjective,
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

  // T1.7 -- OPEN review-flag counts per objective (amber chip on each card).
  // The hook is already internally memoized + reactive; do NOT wrap in useMemo.
  const reviewFlagByObjective = useReviewFlagCountsByObjective(projectId ?? null);

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

  // Plan Nav v1.1 §8.3 — deferred objectives are shelved by the steward and
  // shown in a muted group at the bottom of the column, NOT mixed into the
  // active list. This is a pure view partition (like the source filter); the
  // status engine is never mutated.
  const deferredObjectives = useMemo(
    () => visibleObjectives.filter((o) => objectiveStatuses[o.id] === 'deferred'),
    [visibleObjectives, objectiveStatuses],
  );

  // Uniform objective list, with deferred objectives removed (they render in
  // their own muted group below). The next-up objective is no longer pulled
  // out into a bespoke card — it appears inline here, sorted to the top by
  // STATUS_PRIORITY (active/available first) and highlighted when selected.
  const sortedObjectives = useMemo(() => {
    const list = visibleObjectives.filter(
      (o) => objectiveStatuses[o.id] !== 'deferred',
    );
    return [...list].sort((a, b) => {
      const sa = STATUS_PRIORITY.indexOf(objectiveStatuses[a.id] ?? 'locked');
      const sb = STATUS_PRIORITY.indexOf(objectiveStatuses[b.id] ?? 'locked');
      return sa - sb;
    });
  }, [visibleObjectives, objectiveStatuses]);

  return (
    <section
      aria-label={`Objectives in ${stratum.title}`}
      style={{
        flex: 3,
        minWidth: 0,
        minHeight: 0,
        overflowY: 'auto',
        background: C.bg,
        borderRight: `1px solid ${C.border}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: '14px 12px',
      }}
    >
      {/* Stratum heading — orients the column inside the dark spine shell. */}
      <div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: C.textPrimary,
            marginBottom: 2,
          }}
        >
          Stratum {stratum.ordinal}
        </div>
        <div style={{ fontSize: 12, color: C.textSecondary }}>{stratum.title}</div>
      </div>

      {tensionList.length > 0 && (
        <DesignTensionBanner
          tensions={tensionList}
          expanded={tensionExpanded}
          highlightTensionIds={highlightTensionIds}
          onToggle={handleToggleTensions}
          onSelectTension={onSelectTension}
        />
      )}

      {sourceKinds.size > 1 && (
        <div
          role="group"
          aria-label="Filter objectives by source"
          style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}
        >
          {SOURCE_FILTERS.filter(
            (f) => f.key === 'all' || sourceKinds.has(f.key),
          ).map((f) => {
            const isActive = effectiveFilter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                data-active={isActive}
                aria-pressed={isActive}
                onClick={() => setSourceFilter(f.key)}
                style={{
                  padding: '3px 10px',
                  borderRadius: 10,
                  border: `1px solid ${isActive ? C.blue : C.border}`,
                  background: isActive ? C.blueDim : 'transparent',
                  color: isActive ? C.blue : C.textTertiary,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: F.sans,
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      )}

      {parallelSiblings.length >= 2 && (
        <ParallelCallout objectives={parallelSiblings} />
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
                reviewFlagCount={reviewFlagByObjective[obj.id] ?? 0}
                reviewSuggested={reviewSuggestedByObjective[obj.id] ?? false}
                onSelect={onSelectObjective}
                onDivergenceClick={onObjectiveDivergenceClick}
              />
            </li>
          ))}
        </ul>
      )}

      {deferredObjectives.length > 0 && (
        <div className={css.deferredGroup} data-testid="objective-deferred-group">
          <p className={css.deferredHeading}>
            Deferred ({deferredObjectives.length})
          </p>
          <ul className={css.list}>
            {deferredObjectives.map((obj) => (
              <li key={obj.id} className={css.item}>
                <ObjectiveCard
                  objective={obj}
                  status="deferred"
                  isActive={obj.id === activeObjectiveId}
                  divergenceCount={divergenceByObjective[obj.id] ?? 0}
                  reviewFlagCount={reviewFlagByObjective[obj.id] ?? 0}
                  onSelect={onSelectObjective}
                  onRestore={onRestoreObjective}
                />
              </li>
            ))}
          </ul>
        </div>
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
