// useProtocolLibrary — the shared, store-backed derivation for the Plan
// Protocol surface. Lifted verbatim from ProtocolLayerPanel (Plan Spine re-skin
// Phase 2) so the Act-rail panel AND the new Plan list+detail columns derive
// from one source: same templates, same grouping, same lifecycle overlay, same
// token-substitution outputs.
//
// Zustand v5 hazard preserved: we select the reference-stable `records` array and
// the frozen S6 `values` object, then derive everything in `useMemo`. We NEVER
// pass an inline `.filter()`-returning selector to a store hook (that would mint a
// fresh array each render and drive an infinite update loop).

import { useMemo } from 'react';
import {
  resolveProjectProtocols,
  PLAN_STRATA,
  buildProtocolOutputs,
  findPlanStratumObjective,
  type ProjectTypeId,
  type StandardProtocolTemplate,
} from '@ogden/shared';
import { useProtocolStore } from '../../../store/protocolStore.js';
import {
  usePlanStratumProgressStore,
  selectParameterValues,
} from '../../../store/planStratumStore.js';
import { type RecordStatus } from './ProtocolLibraryCard.js';

/** One tier-grouped bucket of templates, in catalogue (first-seen) order. */
export interface ProtocolTierGroup {
  tier: string;
  /**
   * The `PlanStratumId` this group corresponds to (e.g. `s6-integration-design`),
   * or `undefined` for the defensive "Standing protocols" fallback bucket. Typed
   * off the template's own field so no separate `PlanStratumId` import is needed.
   * Lets the Plan surface filter to the currently-open stratum; the Act-rail
   * `ProtocolLayerPanel` simply ignores it.
   */
  stratumId: StandardProtocolTemplate['stratumId'];
  items: StandardProtocolTemplate[];
}

/**
 * Pure helper: narrow a list of tier groups to just the one matching the
 * currently-open stratum. Returns all groups when `activeStratumId` is null
 * (e.g. the Act-rail panel, which has no single open stratum). Unit-testable
 * without rendering.
 */
export function filterProtocolGroups(
  groups: readonly ProtocolTierGroup[],
  activeStratumId: string | null,
): ProtocolTierGroup[] {
  if (!activeStratumId) return [...groups];
  return groups.filter((g) => g.stratumId === activeStratumId);
}

export interface ProtocolLibrary {
  /** Full resolved standing-protocol set for this project's types (S1→S7). */
  templates: readonly StandardProtocolTemplate[];
  /** Templates grouped by stratum (`stratumId`), preserving resolver S1→S7 order. */
  groups: ProtocolTierGroup[];
  /** templateId → lifecycle status, scoped to THIS project. */
  statusByTemplate: Record<string, RecordStatus>;
  /** Derived token-substitution outputs from the steward's S6 parameter values. */
  outputs: Record<string, string>;
  /** Count of templates currently in the `active` lifecycle state. */
  activeCount: number;
}

/**
 * Derive the full protocol library for a project. Pure of any rendering; both
 * the Act-rail `ProtocolLayerPanel` and the Plan `ProtocolColumn` /
 * `ProtocolDetailColumn` consume this so their data can never drift.
 */
export function useProtocolLibrary(
  projectId: string,
  primaryTypeId: ProjectTypeId | null,
  secondaryTypeIds: readonly ProjectTypeId[],
): ProtocolLibrary {
  // Full resolved standing-protocol set (ADR 2026-06-03): universal (22) +
  // primary-type deltas + each compatible secondary's additive/patch protocols,
  // already sorted S1→S7 (stratum ordinal → source layer → authored order) by
  // the pure resolver. Memoised on the project-type identity so it only re-runs
  // when the project's types actually change. `secondaryKey` collapses the array
  // to a stable primitive so a fresh `secondaryTypeIds` array reference per
  // render does not recompute or, worse, churn downstream memos.
  const secondaryKey = secondaryTypeIds.join(',');
  const templates = useMemo<readonly StandardProtocolTemplate[]>(() => {
    if (!primaryTypeId) return [];
    return resolveProjectProtocols({ primaryTypeId, secondaryTypeIds }).protocols;
    // secondaryTypeIds is captured via secondaryKey (stable primitive).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryTypeId, secondaryKey]);

  // §10.1 — derive token-substitution outputs from the steward's S6 parameter
  // values for this project. selectParameterValues returns a frozen {} when
  // no values are entered yet, so unfilled tokens render verbatim brackets.
  // findPlanStratumObjective is pure (constant catalogue object); only `values`
  // changes when the steward types into a ParameterGroup input.
  const s6Values = usePlanStratumProgressStore((s) =>
    selectParameterValues(s, projectId, 's6-yield-flows'),
  );
  const outputs = useMemo(
    () =>
      buildProtocolOutputs(
        findPlanStratumObjective('s6-yield-flows')?.parameterGroup,
        s6Values,
      ),
    [s6Values],
  );

  // Reference-stable selector + useMemo (NEVER an inline `.filter()` selector —
  // Zustand v5 infinite-loop hazard). Build a templateId → status map for THIS
  // project so each card reflects its real lifecycle state.
  const records = useProtocolStore((s) => s.records);
  const statusByTemplate = useMemo<Record<string, RecordStatus>>(() => {
    const map: Record<string, RecordStatus> = {};
    for (const r of records) {
      if (r.projectId === projectId) map[r.templateId] = r.status;
    }
    return map;
  }, [records, projectId]);

  // Group by the template's `stratumId`, preserving first-seen order — which is
  // already S1→S7 because the resolver sorts by stratum ordinal. The heading is
  // the PLAN_STRATA label (`S{ordinal} · {title}`, e.g. "S6 · Integration
  // Design"). Catalogue protocols all set `stratumId`; any that omit it (defensive
  // — e.g. a legacy enterprise template) fall back to one "Standing protocols"
  // bucket rather than dropping out of the list.
  const groups = useMemo<ProtocolTierGroup[]>(() => {
    const STRATUM_LABEL = new Map(
      PLAN_STRATA.map((s) => [s.id, `S${s.ordinal} · ${s.title}`] as const),
    );
    const FALLBACK_TIER = 'Standing protocols';
    const order: string[] = [];
    const byTier = new Map<
      string,
      { stratumId: StandardProtocolTemplate['stratumId']; items: StandardProtocolTemplate[] }
    >();
    for (const t of templates) {
      const tier =
        (t.stratumId && STRATUM_LABEL.get(t.stratumId)) ?? FALLBACK_TIER;
      const bucket = byTier.get(tier);
      if (bucket) {
        bucket.items.push(t);
      } else {
        // The bucket's stratumId is taken from its first template; all templates
        // sharing a PLAN_STRATA label share the same stratumId by construction
        // (the fallback bucket carries `undefined`).
        byTier.set(tier, { stratumId: t.stratumId, items: [t] });
        order.push(tier);
      }
    }
    return order.map((tier) => {
      const bucket = byTier.get(tier)!;
      return { tier, stratumId: bucket.stratumId, items: bucket.items };
    });
  }, [templates]);

  const activeCount = useMemo(
    () => templates.filter((t) => statusByTemplate[t.id] === 'active').length,
    [templates, statusByTemplate],
  );

  return { templates, groups, statusByTemplate, outputs, activeCount };
}
