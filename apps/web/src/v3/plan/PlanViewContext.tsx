/**
 * PlanViewContext — exposes the currently-active Plan view tab
 * (`current` / `vision` / `phase-1` / `phase-2` / `terrain3d`) to any
 * descendant inside the Plan stage tree without prop-drilling.
 *
 * Wired at `PlanLayout.tsx` around the whole rendered tree (Plan rail,
 * canvas, slide-up, module bar), so lazy-loaded module cards can call
 * `usePlanView()` and decide whether to year-scope their data.
 *
 * `PLAN_MODULE_SCOPE` classifies each of the 11 Plan modules as
 * `'phased'` (data filtered by Yeomans cap on phase-1 / phase-2) or
 * `'time-invariant'` (zones, structures shell, machinery, cross-section
 * — backing stores have no `proposed.phase`, so cards show the same
 * content on every view and render the muted "all years" chip).
 *
 * Note (2026-05-11): `terrain3d` is treated as un-capped (same scope as
 * `vision`) — it is a v1 placeholder per `types.ts`.
 */

import { createContext, useContext, type ReactNode } from 'react';
import type { PlanModule, PlanView } from './types.js';

export type PlanModuleScope = 'phased' | 'time-invariant';

export const PLAN_MODULE_SCOPE: Record<PlanModule, PlanModuleScope> = {
  'dynamic-layering':       'phased',
  'water-management':       'phased',
  'zone-circulation':       'time-invariant',
  'structures-subsystems':  'time-invariant',
  machinery:                'time-invariant',
  livestock:                'phased',
  'plant-systems':          'phased',
  'soil-fertility':         'phased',
  'cross-section-solar':    'time-invariant',
  'phasing-budgeting':      'phased',
  'principle-verification': 'phased',
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
