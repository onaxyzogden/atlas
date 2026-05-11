/**
 * useToolIdToElementKind — bridge between `useMapToolStore.activeTool`
 * (PlanTools' single source of truth for the armed tool) and the
 * `elementCatalog` `kind` string consumed by the Vision-Layout canvas's
 * draw lifecycle.
 *
 * Unifies the Plan-stage left rail across all four views: when a
 * recognised Plan tool id is armed and the Vision canvas is active, the
 * canvas mounts `useDesignElementDrawTool` with the mapped kind. Tools
 * not in the table return `null` — the rail still responds (highlight,
 * disarm) but the Vision draw lifecycle stays inert. Phase 2 will close
 * the remaining gaps (pond/spring/road/bridge/turnaround/vegetation).
 */

import type { MapToolId } from '../../observe/components/measure/useMapToolStore.js';
import { useMapToolStore } from '../../observe/components/measure/useMapToolStore.js';

/** Prefix used by registry-driven Plan BE tool ids. */
const PLAN_BE_PREFIX = 'plan.structures-subsystems.be.';

/** Pure mapping: PlanTools toolId → elementCatalog kind, or null. */
export function toolIdToElementKind(toolId: MapToolId | null): string | null {
  if (!toolId) return null;
  // Built-Environment registry tools: kind is the suffix after the prefix.
  // The elementCatalog covers the structure-class subset; the V2 registry
  // covers all 31. designElementsStore.add() routes via isStructureClass,
  // so passing the bare kind is safe — useDesignElementDrawTool's
  // findElementSpec() lookup will short-circuit (no-op) for any kind not
  // present in elementCatalog, leaving Vision draw inert for those.
  if (toolId.startsWith(PLAN_BE_PREFIX)) {
    return toolId.slice(PLAN_BE_PREFIX.length);
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
