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
    default:                                  return null;
  }
}

/** Subscribes to `activeTool` and returns the mapped kind (or null). */
export function useActiveElementKind(): string | null {
  const activeTool = useMapToolStore((s) => s.activeTool);
  return toolIdToElementKind(activeTool);
}
