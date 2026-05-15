/**
 * autoLinkSilvopasture — non-React helpers used by the draw tools to
 * compute a silvopasture host pin at draw-finish time.
 *
 * Reads from `cropStore` + `landDesignStore` via `.getState()` (the
 * stores are zustand-persisted singletons, so a getState() snapshot is
 * the same data the React selectors would return). Returns either the
 * encoded host id (when exactly one host contains the geometry) or
 * `null` (zero matches → no link; multiple matches → first match by
 * draw order, with the steward able to re-pin from the inspector).
 *
 * Centralised so every draw tool (paddock / guild / crop-orchard /
 * design-orchard) auto-links the same way.
 */

import { useCropStore } from '../../store/cropStore.js';
import { getDesignElementsForProject } from '../../store/builtEnvironmentSelectors.js';
import {
  findHostIdsForPoint,
  findHostIdsForPolygon,
  resolveSilvopastureHosts,
} from './silvopastureHosts.js';

export function autoLinkSilvopastureForPolygon(
  projectId: string,
  geom: GeoJSON.Polygon,
): string | null {
  const cropAreas = useCropStore.getState().cropAreas;
  const designElements = getDesignElementsForProject(projectId);
  const hosts = resolveSilvopastureHosts(projectId, cropAreas, designElements);
  if (hosts.length === 0) return null;
  const matches = findHostIdsForPolygon(geom, hosts);
  return matches[0] ?? null;
}

export function autoLinkSilvopastureForPoint(
  projectId: string,
  point: [number, number],
): string | null {
  const cropAreas = useCropStore.getState().cropAreas;
  const designElements = getDesignElementsForProject(projectId);
  const hosts = resolveSilvopastureHosts(projectId, cropAreas, designElements);
  if (hosts.length === 0) return null;
  const matches = findHostIdsForPoint(point, hosts);
  return matches[0] ?? null;
}
