/**
 * useToolIdToElementKind — bridge between `useMapToolStore.activeTool`
 * (PlanTools' single source of truth for the armed tool) and the
 * `elementCatalog` `kind` string consumed by the Vision-Layout canvas's
 * draw lifecycle.
 *
 * Unifies the Plan-stage left rail across all four views: when a
 * recognised Plan tool id is armed and the Vision canvas is active, the
 * canvas mounts `useDesignElementDrawTool` with the mapped kind. Tools
 * not in the table return `null` — they are NOT inert: the Vision canvas
 * routes them through `<PlanDrawHost variant="vision">` (its dedicated-
 * store `switch`: zone / buffer-ring / water / fence-line / fertility /
 * flow-connector / note / transect / schedule-move / zone-seed-anchor),
 * which renders via the already-mounted PlanDataLayers. So `null` here
 * means "not an elementCatalog kind", not "unsupported on Vision".
 */

import type { MapToolId } from '../../observe/components/measure/useMapToolStore.js';
import { useMapToolStore } from '../../observe/components/measure/useMapToolStore.js';

/** Prefix used by registry-driven Plan BE tool ids. */
const PLAN_BE_PREFIX = 'plan.structures-subsystems.be.';

/** Pure mapping: PlanTools toolId → elementCatalog kind, or null. */
export function toolIdToElementKind(toolId: MapToolId | null): string | null {
  if (!toolId) return null;
  // Built-Environment registry tools: dispatched by VisionLayoutCanvas
  // directly to BeV2ExistingTool (with state='proposed'), mirroring
  // PlanDrawHost on the Current canvas. We return null here so the
  // elementCatalog DesignElementDrawHost does NOT also mount — that
  // path no-ops for the ~18 BE kinds outside elementCatalog and would
  // double-handle the ~13 that are. Single source of truth: BE V2 store.
  if (toolId.startsWith(PLAN_BE_PREFIX)) {
    return null;
  }
  switch (toolId) {
    case 'plan.plant-systems.orchard':       return 'orchard';
    case 'plan.plant-systems.silvopasture':  return 'silvopasture';
    case 'plan.plant-systems.pasture-mix':   return 'pasture-mix';
    // Phase 2 (2026-05-11) — elementCatalog ports.
    case 'plan.plant-systems.oak-tree':      return 'oak-tree';
    case 'plan.plant-systems.pine-tree':     return 'pine-tree';
    case 'plan.plant-systems.apple-tree':    return 'apple-tree';
    case 'plan.plant-systems.shrub':         return 'shrub';
    case 'plan.plant-systems.hedgerow':      return 'hedgerow';
    case 'plan.water-management.swale':      return 'swale';
    case 'plan.water-management.spring':     return 'spring';
    case 'plan.zone-circulation.path':       return 'path';
    case 'plan.zone-circulation.road':       return 'road';
    case 'plan.zone-circulation.bridge':     return 'bridge';
    case 'plan.machinery.turnaround':        return 'turnaround';
    case 'plan.livestock.paddock':           return 'paddock';
    // 2026-05-21 — Habitat-feature unification. The 7 habitat-only kinds
    // dispatch through `habitat-allocation`; hedgerow / shrub / pond / wildlife
    // pond reuse their existing plant-systems / water-management tool ids
    // since the catalog kind is shared.
    case 'plan.habitat-allocation.owl-box':         return 'owl-box';
    case 'plan.habitat-allocation.raptor-perch':    return 'raptor-perch';
    case 'plan.habitat-allocation.nest-box':        return 'nest-box';
    case 'plan.habitat-allocation.brush-pile':      return 'brush-pile';
    case 'plan.habitat-allocation.snag':            return 'snag';
    case 'plan.habitat-allocation.insectary-strip': return 'insectary-strip';
    case 'plan.habitat-allocation.wetland-edge':    return 'wetland-edge';
    default:                                  return null;
  }
}

/** Subscribes to `activeTool` and returns the mapped kind (or null). */
export function useActiveElementKind(): string | null {
  const activeTool = useMapToolStore((s) => s.activeTool);
  return toolIdToElementKind(activeTool);
}

/**
 * computeVisionDrawArmed — is *any* draw family armed on the Vision canvas?
 *
 * `MapCursorHost` (`useMapCursor`) is the single cursor writer: it paints the
 * crosshair `!important` only while `drawArmed` is true and re-asserts it via a
 * MutationObserver. `useMapboxDrawTool` sets a non-`!important` crosshair, so if
 * `drawArmed` is false while a draw tool is armed, the observer immediately
 * stomps the crosshair back to grab/pointer.
 *
 * `activeKind`/`beKind` alone (the old predicate) only covered elementCatalog +
 * BE tools — they are `null` for the ~16 dedicated-store `plan.*` tools
 * (zone/water/fence/note/transect…), every `observe.*` tool, and the survey
 * tools. This folds in all of them, mirroring the conventions already in
 * `PlanLayout` (`activeTool.startsWith('plan.')`) and `ObserveLayout`
 * (`armedDrawKind !== null || measureToolArmed`). The two survey flags are the
 * takeover signals PlanTierShell drives from the survey stores.
 *
 * Pure (no hook / store read) so it is unit-testable in isolation; `activeTool`
 * is typed `string | null` and cast for the catalog lookup so tests can pass any
 * id without depending on the `MapToolId` union.
 */
export function computeVisionDrawArmed(args: {
  activeTool: string | null;
  surveyActive: boolean;
  slopeActive: boolean;
}): boolean {
  const { activeTool, surveyActive, slopeActive } = args;
  return (
    toolIdToElementKind(activeTool as MapToolId | null) !== null || // elementCatalog kinds
    (activeTool?.startsWith('plan.') ?? false) ||                   // plan.* (incl. BE + dedicated-store)
    (activeTool?.startsWith('observe.') ?? false) ||                // observe.* draw tools
    surveyActive ||                                                 // veg-survey takeover
    slopeActive                                                     // slope-survey takeover
  );
}
