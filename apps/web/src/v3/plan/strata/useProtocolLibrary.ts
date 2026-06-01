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
  enterprisesForProjectTypes,
  templatesForEnterprises,
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
  items: StandardProtocolTemplate[];
}

export interface ProtocolLibrary {
  /** Enterprise-filtered standard templates for this project's types. */
  templates: readonly StandardProtocolTemplate[];
  /** Templates grouped by real `tierAuthored`, preserving catalogue order. */
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
  // Enterprise-filtered standard templates (spec 4.3). Memoised on the
  // project-type identity so the pure filter only re-runs when the project's
  // types actually change. `secondaryKey` collapses the array to a stable
  // primitive so a fresh `secondaryTypeIds` array reference per render does not
  // recompute or, worse, churn downstream memos.
  const secondaryKey = secondaryTypeIds.join(',');
  const templates = useMemo<readonly StandardProtocolTemplate[]>(() => {
    if (!primaryTypeId) return [];
    return templatesForEnterprises(
      enterprisesForProjectTypes(primaryTypeId, secondaryTypeIds),
    );
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

  // Group by the template's real `tierAuthored` string, preserving first-seen
  // (catalogue) order. No per-stratum invention: one group per distinct tier the
  // catalogue actually authors.
  const groups = useMemo<ProtocolTierGroup[]>(() => {
    const order: string[] = [];
    const byTier = new Map<string, StandardProtocolTemplate[]>();
    for (const t of templates) {
      // `tierAuthored` is optional in the schema; a template that omits it still
      // groups under a sensible default rather than dropping out of the list.
      const tier = t.tierAuthored ?? 'Standard protocols';
      const bucket = byTier.get(tier);
      if (bucket) {
        bucket.push(t);
      } else {
        byTier.set(tier, [t]);
        order.push(tier);
      }
    }
    return order.map((tier) => ({ tier, items: byTier.get(tier)! }));
  }, [templates]);

  const activeCount = useMemo(
    () => templates.filter((t) => statusByTemplate[t.id] === 'active').length,
    [templates, statusByTemplate],
  );

  return { templates, groups, statusByTemplate, outputs, activeCount };
}
