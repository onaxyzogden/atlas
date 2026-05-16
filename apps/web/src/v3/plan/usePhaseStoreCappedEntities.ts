/**
 * usePhaseStoreCappedEntities — Yeomans cap filter for entities tagged
 * with a `phaseStore.BuildPhase.id` (a UUID), NOT with a Yeomans
 * `PhaseKey`. Looks up each entity's phase in phaseStore, reads its
 * `yeomansCap`, then applies the year-scrubber-derived Yeomans cap the
 * same way `usePhaseCappedEntities` does for Yeomans-native entities.
 *
 * Adapter rationale: most Plan-module data (WaterNode, livestock
 * paddocks, soil tasks) is tagged on the **project axis** via a
 * phaseStore phase id — not the Yeomans Scale of Permanence axis used
 * by the Vision-Layout design canvas. This hook bridges the two so the
 * year scrubber can honestly filter module-card data.
 *
 * Cap source (2026-05-14): `yeomansCapForYear(currentYear)`. When the
 * cap is `null` (Year 6+) entities are returned unchanged. Otherwise an
 * entity is kept iff:
 *   - `entity.phase` is null/undefined (unassigned → uncapped), OR
 *   - the referenced BuildPhase has `yeomansCap` undefined
 *     (steward hasn't classified it → uncapped), OR
 *   - `phaseIndex(yeomansCap) <= phaseIndex(yeomansCapForYear(year))`.
 *
 * Decision: wiki/decisions/2026-05-12-plan-phasestore-yeomans-adapter.md
 */

import { useMemo } from 'react';
import { usePhaseStore } from '../../store/phaseStore.js';
import { useTemporalScrubStore } from './canvas/temporalScrubStore.js';
import { phaseIndex, yeomansCapForYear } from './types.js';

export interface PhaseStoreCappable {
  /** phaseStore.BuildPhase.id, or null/undefined when unassigned. */
  phase?: string | null;
}

export function usePhaseStoreCappedEntities<T extends PhaseStoreCappable>(
  entities: ReadonlyArray<T>,
): T[] {
  const currentYear = useTemporalScrubStore((s) => s.currentYear);
  const phases = usePhaseStore((s) => s.phases);
  return useMemo(() => {
    const capKey = yeomansCapForYear(currentYear);
    if (!capKey) return entities.slice();
    const viewCap = phaseIndex(capKey);
    // Index phases by id for O(1) lookup.
    const byId = new Map(phases.map((p) => [p.id, p]));
    return entities.filter((e) => {
      if (e.phase == null) return true;
      const ph = byId.get(e.phase);
      if (!ph || ph.yeomansCap === undefined) return true;
      return phaseIndex(ph.yeomansCap) <= viewCap;
    });
  }, [entities, phases, currentYear]);
}
