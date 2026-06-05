/**
 * Geometry layer of the field-verification axis (web-only, turf-backed).
 *
 * Turns dated, located field observations into "influence zones" — buffered
 * polygons around where the steward actually stood — so verification reads as
 * SUB-REGIONAL (near the observation) rather than blanket-across the parcel.
 * Each zone carries the time-decayed strength of the observations behind it,
 * so the map can glow brighter where the ground has been read recently and
 * fade where the reading has gone stale.
 *
 * Pairs with the pure core in @ogden/shared (decayWeight / levelFromWeight):
 * this file only adds geometry. See apps/web/src/lib/spatialSampling.ts for
 * the `isInside` membership test reused by `verificationAt`.
 */

import * as turf from '@turf/turf';
import type {
  Feature,
  FeatureCollection,
  LineString,
  MultiPolygon,
  Point,
  Polygon,
  Position,
} from 'geojson';
import {
  decayWeight,
  levelFromWeight,
  DEFAULT_HALF_LIFE_YEARS,
  type LayerType,
  type VerificationLevel,
} from '@ogden/shared';
import { isInside } from '../spatialSampling.js';

/** Influence radius for a point observation (soil sample), metres. First-guess
 *  constant — kept here for easy tuning. */
export const POINT_BUFFER_M = 150;
/** Influence radius either side of a transect walk line, metres. Narrower than
 *  a point sample because a transect already sweeps a path. */
export const TRANSECT_BUFFER_M = 75;

const LEVEL_RANK: Record<VerificationLevel, number> = {
  unverified: 0,
  corroborated: 1,
  verified: 2,
};

/** Properties stamped onto each verification zone polygon. `layerTypes` lists
 *  every data layer this zone speaks to (water-quality maps to two). */
export interface VerificationZoneProps {
  layerTypes: LayerType[];
  level: VerificationLevel;
  weight: number;
  observationCount: number;
  lastObservedAt: string | null;
}

/** One observation region before buffering: its geometry, the layer(s) it
 *  verifies, and the dates it was observed (one per visit). */
export interface VerificationZoneInput {
  geometry: Point | LineString;
  layerTypes: LayerType[];
  /** ISO date-times or `YYYY-MM-DD`; one entry per observation/visit. */
  observedDates: string[];
}

export type VerificationZoneCollection = FeatureCollection<
  Polygon | MultiPolygon,
  VerificationZoneProps
>;

const EMPTY: VerificationZoneCollection = { type: 'FeatureCollection', features: [] };

/** Build buffered influence zones from observation inputs. Each input becomes
 *  at most one polygon, tagged with its summed decayed weight → level. Inputs
 *  with no dates, no layers, zero net weight, or unbufferable geometry are
 *  skipped. */
export function buildVerificationZones(
  inputs: VerificationZoneInput[],
  asOf: string | Date = new Date(),
  halfLifeYears: number = DEFAULT_HALF_LIFE_YEARS,
): VerificationZoneCollection {
  const features: Feature<Polygon | MultiPolygon, VerificationZoneProps>[] = [];

  for (const input of inputs) {
    if (!input.observedDates.length || !input.layerTypes.length) continue;

    let weight = 0;
    let lastT: number | null = null;
    for (const d of input.observedDates) {
      weight += decayWeight(d, asOf, halfLifeYears);
      const t = new Date(d).getTime();
      if (Number.isFinite(t) && (lastT === null || t > lastT)) lastT = t;
    }
    if (weight <= 0) continue;

    const radiusM = input.geometry.type === 'Point' ? POINT_BUFFER_M : TRANSECT_BUFFER_M;
    let buffered: Feature<Polygon | MultiPolygon> | undefined;
    try {
      buffered = turf.buffer(turf.feature(input.geometry), radiusM, {
        units: 'meters',
      }) as Feature<Polygon | MultiPolygon> | undefined;
    } catch {
      continue;
    }
    if (!buffered?.geometry) continue;

    features.push({
      type: 'Feature',
      geometry: buffered.geometry,
      properties: {
        layerTypes: input.layerTypes,
        level: levelFromWeight(weight),
        weight,
        observationCount: input.observedDates.length,
        lastObservedAt: lastT === null ? null : new Date(lastT).toISOString(),
      },
    });
  }

  return features.length ? { type: 'FeatureCollection', features } : EMPTY;
}

/** Strongest verification level covering `point` for a given layer, or
 *  `'unverified'` if no zone for that layer contains the point. Reuses the
 *  shared `isInside` polygon-membership test. */
export function verificationAt(
  point: Position,
  layerType: LayerType,
  zones: VerificationZoneCollection,
): VerificationLevel {
  let best: VerificationLevel = 'unverified';
  for (const f of zones.features) {
    if (!f.properties.layerTypes.includes(layerType)) continue;
    const inside = isInside(point, {
      type: 'FeatureCollection',
      features: [{ type: 'Feature', geometry: f.geometry, properties: {} }],
    });
    if (inside && LEVEL_RANK[f.properties.level] > LEVEL_RANK[best]) {
      best = f.properties.level;
    }
  }
  return best;
}
