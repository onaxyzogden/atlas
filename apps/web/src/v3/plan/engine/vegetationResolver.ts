/**
 * vegetationResolver — single read path for a zone's succession stage and
 * ground cover. Observed `VegetationPatch` polygons are the default source
 * of truth; a per-zone manual value (`LandZone.successionStage` /
 * `.groundCover`) acts as an override that wins when explicitly set.
 *
 * Each axis resolves independently:
 *   - if the zone has that field set → override
 *   - else area-weighted dominant of patches overlapping the zone
 *   - else none
 *
 * `source` summarises the pair: 'override' if either axis came from the
 * zone, otherwise 'derived' if either came from patches, else 'none'.
 *
 * Plan: what-type-of-zones-sleepy-comet.md.
 */

import * as turf from '@turf/turf';
import type {
  LandZone,
  SuccessionStage,
  GroundCoverState,
} from '../../../store/zoneStore.js';
import type { VegetationPatch } from '../../../store/vegetationStore.js';

export interface ResolvedVegetation {
  successionStage: SuccessionStage | null;
  groundCover: GroundCoverState | null;
  source: 'override' | 'derived' | 'none';
}

function safeArea(geom: GeoJSON.Geometry): number {
  try {
    return turf.area(turf.feature(geom));
  } catch {
    return 0;
  }
}

/** Area of the overlap between a patch and a zone, 0 on any failure. */
function overlapArea(
  patch: GeoJSON.Polygon | GeoJSON.MultiPolygon,
  zone: GeoJSON.Polygon | GeoJSON.MultiPolygon,
): number {
  try {
    const clipped = turf.intersect(
      turf.featureCollection([turf.feature(patch), turf.feature(zone)]),
    );
    return clipped ? turf.area(clipped) : 0;
  } catch {
    return 0;
  }
}

/** Pick the key with the greatest accumulated weight, or null if empty. */
function dominant<K extends string>(weights: Map<K, number>): K | null {
  let best: K | null = null;
  let bestW = 0;
  for (const [k, w] of weights) {
    if (w > bestW) {
      bestW = w;
      best = k;
    }
  }
  return best;
}

/**
 * Resolve a single zone's vegetation. `patches` should already be scoped
 * to the zone's project (callers pass the project slice).
 */
export function resolveZoneVegetation(
  zone: LandZone,
  patches: VegetationPatch[],
): ResolvedVegetation {
  const overrideStage = zone.successionStage ?? null;
  const overrideCover = zone.groundCover ?? null;

  let derivedStage: SuccessionStage | null = null;
  let derivedCover: GroundCoverState | null = null;

  if (!overrideStage || !overrideCover) {
    const stageW = new Map<SuccessionStage, number>();
    const coverW = new Map<GroundCoverState, number>();
    for (const p of patches) {
      const w = overlapArea(p.geometry, zone.geometry);
      if (w <= 0) continue;
      stageW.set(p.successionStage, (stageW.get(p.successionStage) ?? 0) + w);
      coverW.set(p.groundCover, (coverW.get(p.groundCover) ?? 0) + w);
    }
    derivedStage = dominant(stageW);
    derivedCover = dominant(coverW);
  }

  const successionStage = overrideStage ?? derivedStage;
  const groundCover = overrideCover ?? derivedCover;

  let source: ResolvedVegetation['source'] = 'none';
  if (overrideStage || overrideCover) source = 'override';
  else if (derivedStage || derivedCover) source = 'derived';

  return { successionStage, groundCover, source };
}

/**
 * Project-wide dominant ground cover by patch area — feeds the
 * SiteProfile `currentLandCover` facet. Returns null when there are no
 * patches with measurable area.
 */
export function deriveCurrentLandCover(
  projectId: string,
  patches: VegetationPatch[],
): GroundCoverState | null {
  const coverW = new Map<GroundCoverState, number>();
  for (const p of patches) {
    if (p.projectId !== projectId) continue;
    const w = safeArea(p.geometry);
    if (w <= 0) continue;
    coverW.set(p.groundCover, (coverW.get(p.groundCover) ?? 0) + w);
  }
  return dominant(coverW);
}
