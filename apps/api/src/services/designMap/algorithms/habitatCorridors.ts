/**
 * Habitat corridors — emits `conservation` zones that anchor biodiversity
 * stacking on the parcel.
 *
 * The algorithm ships with a deliberately small surface for B.2.corridor:
 *
 *  1. **Perimeter buffer** (always). A donut polygon between the parcel
 *     boundary and an inward-buffered ring forms the windbreak / hedgerow
 *     / wildlife strip around the productive interior. Width is the
 *     `perimeterBufferM` option (default 15 m).
 *  2. **Riparian corridors** (when provided). Each input `LineString` is
 *     buffered to a polygon strip of width `riparianBufferM` (default 20 m).
 *     `riparianLines` is left optional because the watershed layer's
 *     `drainage_divide` features are polygons (from `binaryMaskToGeoJSON`),
 *     not LineStrings — proper line extraction is deferred and the API
 *     route passes `undefined` here in the initial pass.
 *
 * No slope-aware spine generator yet: the protocol mentions it but it
 * requires contour input and a "draw a centreline through the parcel"
 * primitive that does not exist in `geometry.ts`. The perimeter fallback
 * already covers Phase B's "candidate corridors" requirement; spines land
 * in a later refinement pass.
 */

import type { CreateDesignFeatureInput } from '@ogden/shared';
import type { ParcelInput } from '../DesignMapGenerator.js';
import {
  bufferRingInwardM,
  lineLengthM,
  offsetPolyline,
  polygonAreaM2,
  type LineString,
  type LonLat,
  type Ring,
} from '../geometry.js';

export interface HabitatCorridorsOptions {
  /** Perimeter buffer width, metres. */
  perimeterBufferM?: number;
  /** Riparian buffer width (each side), metres. */
  riparianBufferM?: number;
  /** Drop corridors smaller than this area, acres. */
  minCorridorAcres?: number;
}

export interface HabitatCorridorsInput {
  parcel: ParcelInput;
  riparianLines?: LineString[];
  options?: HabitatCorridorsOptions;
}

export interface HabitatCorridorsResult {
  features: CreateDesignFeatureInput[];
  corridorCount: number;
  totalCorridorAcres: number;
  warnings: string[];
}

const M2_PER_ACRE = 4046.8564224;

const DEFAULT_PERIMETER_BUFFER_M = 15;
const DEFAULT_RIPARIAN_BUFFER_M = 20;
const DEFAULT_MIN_CORRIDOR_ACRES = 0.1;

export function generateHabitatCorridors(
  input: HabitatCorridorsInput,
): HabitatCorridorsResult {
  const warnings: string[] = [];
  const features: CreateDesignFeatureInput[] = [];

  const opts: Required<HabitatCorridorsOptions> = {
    perimeterBufferM:
      input.options?.perimeterBufferM ?? DEFAULT_PERIMETER_BUFFER_M,
    riparianBufferM:
      input.options?.riparianBufferM ?? DEFAULT_RIPARIAN_BUFFER_M,
    minCorridorAcres:
      input.options?.minCorridorAcres ?? DEFAULT_MIN_CORRIDOR_ACRES,
  };

  if (input.parcel.boundary.length < 4) {
    warnings.push('parcel boundary too small for habitat corridors');
    return {
      features,
      corridorCount: 0,
      totalCorridorAcres: 0,
      warnings,
    };
  }

  let corridorCount = 0;
  let totalCorridorAcres = 0;

  // Perimeter buffer corridor (donut polygon).
  const innerRing = bufferRingInwardM(
    input.parcel.boundary,
    opts.perimeterBufferM,
  );
  const outerArea = polygonAreaM2(input.parcel.boundary);
  const innerArea = polygonAreaM2(innerRing);
  const perimeterAreaM2 = Math.max(0, outerArea - innerArea);
  const perimeterAcres = perimeterAreaM2 / M2_PER_ACRE;

  if (perimeterAcres >= opts.minCorridorAcres) {
    corridorCount += 1;
    totalCorridorAcres += perimeterAcres;
    features.push({
      featureType: 'zone',
      subtype: 'conservation',
      label: 'Perimeter Habitat Corridor',
      phaseTag: 'habitat',
      geometry: {
        type: 'Polygon',
        coordinates: [
          input.parcel.boundary.map((p) => [p[0], p[1]] as LonLat),
          innerRing.map((p) => [p[0], p[1]] as LonLat),
        ],
      },
      properties: {
        generator: 'habitatCorridors',
        corridorType: 'perimeter',
        bufferWidthM: opts.perimeterBufferM,
        areaAcres: Math.round(perimeterAcres * 10) / 10,
      },
      sortOrder: 400 + corridorCount,
    });
  } else {
    warnings.push('perimeter corridor smaller than minCorridorAcres');
  }

  // Riparian corridors — buffer each line to a strip polygon.
  if (input.riparianLines && input.riparianLines.length > 0) {
    for (const line of input.riparianLines) {
      if (line.length < 2) continue;
      const lengthM = lineLengthM(line);
      const left = offsetPolyline(line, opts.riparianBufferM);
      const right = offsetPolyline(line, -opts.riparianBufferM);
      // Build a closed ring: left forward + right reversed + close.
      const ring: LonLat[] = [
        ...left.map((p) => [p[0], p[1]] as LonLat),
        ...[...right].reverse().map((p) => [p[0], p[1]] as LonLat),
      ];
      if (ring.length > 0) {
        const first = ring[0]!;
        ring.push([first[0], first[1]]);
      }
      const areaM2 = polygonAreaM2(ring);
      const acres = areaM2 / M2_PER_ACRE;
      if (acres < opts.minCorridorAcres) continue;

      corridorCount += 1;
      totalCorridorAcres += acres;
      features.push({
        featureType: 'zone',
        subtype: 'conservation',
        label: `Riparian Corridor ${corridorCount}`,
        phaseTag: 'habitat',
        geometry: {
          type: 'Polygon',
          coordinates: [ring as Ring as LonLat[]],
        },
        properties: {
          generator: 'habitatCorridors',
          corridorType: 'riparian',
          bufferWidthM: opts.riparianBufferM,
          lengthM: Math.round(lengthM * 10) / 10,
          areaAcres: Math.round(acres * 10) / 10,
        },
        sortOrder: 400 + corridorCount,
      });
    }
  }

  if (corridorCount === 0) {
    warnings.push('no habitat corridors generated');
  }

  return {
    features,
    corridorCount,
    totalCorridorAcres: Math.round(totalCorridorAcres * 10) / 10,
    warnings,
  };
}
