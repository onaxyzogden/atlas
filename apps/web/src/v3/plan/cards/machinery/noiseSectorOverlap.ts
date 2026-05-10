/**
 * noiseSectorOverlap — detect machinery-element placements that sit inside
 * a dwelling's noise sector wedge (Phase C of the machinery module).
 *
 * The noise sector is anchored at each dwelling, opens in the steward-
 * authored compass bearing, and reaches `REACH_M` metres outward. Any
 * fuel-station, machinery-shed, or equipment-yard element whose geometry
 * intersects that wedge is flagged: the prevailing wind will carry engine
 * and refuel noise straight into the dwelling.
 *
 * Dwelling kinds are kept as a module-level set so future additions
 * (cabin, longhouse, ...) drop in without touching this file's logic.
 */

import * as turf from '@turf/turf';
import type { DesignElement } from '../../../../store/designElementsStore.js';
import type { Compass8 } from '../../../../store/sectorStore.js';

const DWELLING_KINDS = new Set<string>(['yurt']);

const NOISY_KINDS = new Set<string>([
  'fuel-station',
  'machinery-shed',
  'equipment-yard',
]);

const DEFAULT_NOISE_HALF_WIDTH = 25;

/** Reach (metres) used for the wedge that anchors at each dwelling. */
const REACH_M = 200;

const COMPASS_BEARING: Record<Compass8, number> = {
  N: 0,
  NE: 45,
  E: 90,
  SE: 135,
  S: 180,
  SW: 225,
  W: 270,
  NW: 315,
};

function elementCentroid(el: DesignElement): GeoJSON.Position | null {
  if (el.geometry.type === 'Point') return el.geometry.coordinates;
  if (el.geometry.type === 'Polygon' || el.geometry.type === 'LineString') {
    const c = turf.centroid(turf.feature(el.geometry));
    return c.geometry.coordinates;
  }
  return null;
}

/** Build a wedge polygon anchored at `center`, opening to `bearingDeg`. */
function wedgePolygon(
  center: GeoJSON.Position,
  bearingDeg: number,
  halfWidthDeg: number,
  reachM: number,
): GeoJSON.Polygon {
  const startBearing = bearingDeg - halfWidthDeg;
  const endBearing = bearingDeg + halfWidthDeg;
  // Step at 5° increments so curved arcs stay smooth without exploding vertex count.
  const STEP = 5;
  const ring: GeoJSON.Position[] = [center];
  for (let b = startBearing; b <= endBearing; b += STEP) {
    const dest = turf.destination(turf.point(center), reachM / 1000, b, {
      units: 'kilometers',
    });
    ring.push(dest.geometry.coordinates);
  }
  // Always include the exact end-bearing in case (end - start) % STEP !== 0.
  const dest = turf.destination(turf.point(center), reachM / 1000, endBearing, {
    units: 'kilometers',
  });
  ring.push(dest.geometry.coordinates);
  ring.push(center);
  return { type: 'Polygon', coordinates: [ring] };
}

export interface NoiseSectorHit {
  /** The noisy element (fuel-station, machinery-shed, equipment-yard). */
  source: DesignElement;
  /** The dwelling whose noise sector the source sits inside. */
  dwelling: DesignElement;
}

export interface NoiseSectorOverlapInput {
  elements: DesignElement[];
  noiseDirection: Compass8 | null | undefined;
  noiseHalfWidth: number | null | undefined;
}

export function detectNoiseSectorHits(
  input: NoiseSectorOverlapInput,
): NoiseSectorHit[] {
  if (!input.noiseDirection) return [];
  const bearing = COMPASS_BEARING[input.noiseDirection];
  const halfWidth =
    input.noiseHalfWidth && Number.isFinite(input.noiseHalfWidth)
      ? input.noiseHalfWidth
      : DEFAULT_NOISE_HALF_WIDTH;

  const dwellings = input.elements.filter((e) => DWELLING_KINDS.has(e.kind));
  const sources = input.elements.filter((e) => NOISY_KINDS.has(e.kind));
  if (dwellings.length === 0 || sources.length === 0) return [];

  const hits: NoiseSectorHit[] = [];
  for (const dwelling of dwellings) {
    const center = elementCentroid(dwelling);
    if (!center) continue;
    const wedge = wedgePolygon(center, bearing, halfWidth, REACH_M);
    const wedgeFeat = turf.feature(wedge);
    for (const source of sources) {
      const sourceFeat = turf.feature(source.geometry);
      try {
        if (turf.booleanIntersects(wedgeFeat, sourceFeat)) {
          hits.push({ source, dwelling });
        }
      } catch {
        // turf occasionally throws on degenerate input; skip silently.
      }
    }
  }
  return hits;
}

/** Friendly label for a flagged element. */
export function describeElement(el: DesignElement): string {
  return el.label ?? el.kind;
}
