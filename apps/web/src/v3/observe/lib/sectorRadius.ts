/**
 * sectorRadius — single source of truth for the OBSERVE sector wedge
 * outer radius (metres). Both the on-map renderer
 * (`ObserveAnnotationLayers`) and the export library
 * (`annotationExport`) consult `getSectorRadiusM(projectId)` so a
 * configured override (`metadata.sectorRadiusM`) flows everywhere from
 * one place.
 *
 * Pure module — no React. Mirrors the read-only `useProjectStore.getState()`
 * pattern already used by `resolveSectorAnchor` in `annotationExport.ts`.
 */

import { useProjectStore } from '../../../store/projectStore.js';

/** Default sector wedge outer radius (metres) when no project-level
 *  override is set. 250 m is the historical hard-coded value and is
 *  reasonable for a typical 12-acre homestead. */
export const DEFAULT_SECTOR_RADIUS_M = 250;

/** Read the project's configured sector wedge radius (metres). Falls
 *  back to DEFAULT_SECTOR_RADIUS_M when unset, non-finite, or
 *  non-positive. */
export function getSectorRadiusM(projectId: string | null | undefined): number {
  if (!projectId) return DEFAULT_SECTOR_RADIUS_M;
  const project = useProjectStore
    .getState()
    .projects.find((p) => p.id === projectId);
  const v = project?.metadata?.sectorRadiusM;
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
    return v;
  }
  return DEFAULT_SECTOR_RADIUS_M;
}
