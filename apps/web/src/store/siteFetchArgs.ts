/**
 * siteFetchArgs — pure derivation of the site-data fetch arguments
 * (centroid, country, bbox) from a project's parcel boundary.
 *
 * Shared by `siteDataSync` (boundary-driven fetch scheduling) and
 * `lib/layerRefresh` (layer_complete-driven refresh) so the geometry logic
 * lives in exactly one place. No store reads, no side effects.
 */

import * as turf from '@turf/turf';
import type { LocalProject } from './projectStore.js';

export interface SiteFetchArgs {
  center: [number, number];
  country: string;
  bbox: [number, number, number, number];
}

/**
 * Returns null when the project has no boundary or the geometry fails to
 * parse (the boundary may be transiently invalid mid-edit) — callers decide
 * whether to skip or retry on the next state change.
 */
export function deriveSiteFetchArgs(project: LocalProject): SiteFetchArgs | null {
  if (!project.parcelBoundaryGeojson) return null;
  try {
    const centroid = turf.centroid(project.parcelBoundaryGeojson);
    const coords = centroid.geometry.coordinates;
    const turfBbox = turf.bbox(project.parcelBoundaryGeojson);
    return {
      center: [coords[0] ?? 0, coords[1] ?? 0],
      country: project.country,
      bbox: [turfBbox[0], turfBbox[1], turfBbox[2], turfBbox[3]],
    };
  } catch {
    return null;
  }
}
