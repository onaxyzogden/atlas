/**
 * usePhaseCappedEntities — filter helper that mirrors the Yeomans-cap
 * logic used by `DesignElementScenegraphLayer` so Plan-module cards
 * show data scoped to the temporal-scrubber's current year.
 *
 * Existing entities (`state !== 'proposed'`) always pass through —
 * only `proposed` entities are gated by the active Yeomans cap.
 *
 * Cap source (2026-05-14): `yeomansCapForYear(currentYear)` from
 * `useTemporalScrubStore`. Year 1..2 caps at `water`; Year 3..5 at
 * `buildings`; Year 6+ is uncapped.
 *
 * Generic over any object that exposes `state` + optional
 * `proposed.phase`. Cards just pass their raw store array through and
 * receive a filtered copy.
 */

import { useMemo } from 'react';
import { useTemporalScrubStore } from './canvas/temporalScrubStore.js';
import { phaseIndex, yeomansCapForYear, type PhaseKey } from './types.js';

interface PhaseCappable {
  state?: string;
  proposed?: { phase?: PhaseKey | null } | null;
}

export function usePhaseCappedEntities<T extends PhaseCappable>(
  entities: ReadonlyArray<T>,
): T[] {
  const currentYear = useTemporalScrubStore((s) => s.currentYear);
  return useMemo(() => {
    const capKey = yeomansCapForYear(currentYear);
    const cap = capKey ? phaseIndex(capKey) : Infinity;
    if (cap === Infinity) return entities.slice();
    return entities.filter((e) => {
      if (e.state !== 'proposed') return true;
      const phase = (e.proposed?.phase ?? 'buildings') as PhaseKey;
      return phaseIndex(phase) <= cap;
    });
  }, [entities, currentYear]);
}
