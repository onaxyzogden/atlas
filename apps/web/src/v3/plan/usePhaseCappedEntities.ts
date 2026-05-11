/**
 * usePhaseCappedEntities — filter helper that mirrors the Yeomans-cap
 * logic used by `DesignElementScenegraphLayer` so Plan-module cards
 * show data scoped to the active view tab (Year 1 / Year 5).
 *
 * Existing entities (`state !== 'proposed'`) always pass through —
 * only `proposed` entities are gated by the active phase cap.
 *
 * Views `current`, `vision`, and `terrain3d` are un-capped — same
 * scope as the full dataset.
 *
 * Generic over any object that exposes `state` + optional
 * `proposed.phase`. Cards just pass their raw store array through and
 * receive a filtered copy.
 */

import { useMemo } from 'react';
import { usePlanView } from './PlanViewContext.js';
import { PHASE_VIEW_CAP, phaseIndex, type PhaseKey } from './types.js';

interface PhaseCappable {
  state?: string;
  proposed?: { phase?: PhaseKey | null } | null;
}

export function usePhaseCappedEntities<T extends PhaseCappable>(
  entities: ReadonlyArray<T>,
): T[] {
  const view = usePlanView();
  return useMemo(() => {
    const cap =
      view === 'phase-1' || view === 'phase-2'
        ? phaseIndex(PHASE_VIEW_CAP[view])
        : Infinity;
    if (cap === Infinity) return entities.slice();
    return entities.filter((e) => {
      if (e.state !== 'proposed') return true;
      const phase = (e.proposed?.phase ?? 'buildings') as PhaseKey;
      return phaseIndex(phase) <= cap;
    });
  }, [entities, view]);
}
