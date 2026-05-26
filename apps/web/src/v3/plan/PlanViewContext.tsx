/**
 * PlanViewContext — exposes the currently-active Plan view tab
 * (`current` / `vision` / `terrain3d`) to any descendant inside the
 * Plan stage tree without prop-drilling.
 *
 * Wired at `PlanLayout.tsx` around the whole rendered tree (Plan rail,
 * canvas, slide-up, module bar), so lazy-loaded module cards can call
 * `usePlanView()` and decide whether to year-scope their data.
 *
 * `PLAN_MODULE_SCOPE` classifies each of the 11 Plan modules as
 * `'phased'` (data filtered by the year-scrubber-driven Yeomans cap)
 * or `'time-invariant'` (zones, structures shell, machinery,
 * cross-section — backing stores have no `proposed.phase`, so cards
 * show the same content on every view and render the muted
 * "all years" chip).
 *
 * Note (2026-05-14): the former `phase-1` / `phase-2` tabs were
 * retired; their Yeomans-cap role moved to `yeomansCapForYear` in
 * `types.ts`, driven by the bottom-canvas year scrubber.
 */

import { createContext, useContext, type ReactNode } from 'react';
import type { PlanModule, PlanView } from './types.js';

export type PlanModuleScope = 'phased' | 'time-invariant';

export const PLAN_MODULE_SCOPE: Record<PlanModule, PlanModuleScope> = {
  'vision-intent': 'time-invariant',
  // access-circulation collapses dynamic-layering (time-invariant) +
  // zone-circulation (phased); zones drive year-scoping, so 'phased' wins.
  'access-circulation': 'phased',
  hydrology: 'phased',
  // built-infrastructure collapses structures-subsystems + machinery — both
  // time-invariant.
  'built-infrastructure': 'time-invariant',
  'animals-livestock': 'phased',
  'plants-food': 'phased',
  soil: 'phased',
  climate: 'time-invariant',
  'economics-capacity': 'phased',
  'risk-compliance': 'phased',
  // ecology collapses regeneration-monitor + habitat-allocation +
  // biodiversity-monitor — all time-invariant.
  ecology: 'time-invariant',
  // Unauthored Plan domains — default to time-invariant.
  'land-base': 'time-invariant',
  topography: 'time-invariant',
  'energy-resources': 'time-invariant',
  'people-governance': 'time-invariant',
  'monitoring-records': 'time-invariant',
};

interface PlanViewContextValue {
  view: PlanView;
}

const PlanViewCtx = createContext<PlanViewContextValue | null>(null);

interface ProviderProps {
  view: PlanView;
  children: ReactNode;
}

export function PlanViewProvider({ view, children }: ProviderProps) {
  return (
    <PlanViewCtx.Provider value={{ view }}>{children}</PlanViewCtx.Provider>
  );
}

/**
 * Returns the currently-active Plan view. Defaults to `'current'` if
 * called outside the provider (e.g. unit-test render of an isolated
 * card) so cards remain self-contained.
 */
export function usePlanView(): PlanView {
  const ctx = useContext(PlanViewCtx);
  return ctx?.view ?? 'current';
}
