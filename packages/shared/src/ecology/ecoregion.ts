/**
 * ecoregion — lookup a CEC (Commission for Environmental Cooperation)
 * North American Level III ecoregion id from a lat/lng, and fetch a
 * hand-curated native-pollinator plant list for that ecoregion.
 *
 * WHY CEC, not EPA Omernik III:
 *   EPA Omernik Level III is US-only. Atlas also covers Canada
 *   (Conservation Halton, Milton ON). CEC harmonizes US + CA + MX
 *   under the same Level I/II/III code system, so a Milton ON site
 *   and a Rodale PA site both resolve cleanly. Codes like "8.1.1"
 *   are shared across the border.
 *
 * Lookup strategy (honest-scoping):
 *   We ship each ecoregion as a (bbox, centroid) pair rather than a
 *   full GeoJSON polygon. Full CEC Level III shapefiles are multi-MB
 *   and would balloon the `@ogden/shared` bundle. A bbox-then-nearest-
 *   centroid lookup is intentionally coarse — it will misclassify
 *   points near ecoregion boundaries. This is acknowledged in the
 *   caveats emitted by the pollinator heuristic consumer.
 *
 * Coverage:
 *   Seven eastern North American CEC Level III ecoregions that cover
 *   the Atlas pilot footprint (Ontario Niagara escarpment through
 *   mid-Atlantic). Expansion to additional ecoregions is additive:
 *   append a record to NA_ECOREGIONS and a plant list to the JSON.
 */

import plantsByEcoregionJson from './data/pollinatorPlantsByEcoregion.json' with { type: 'json' };

export type EcoregionId =
  | '8.1.1'   // Eastern Great Lakes Lowlands
  | '8.1.3'   // Northern Allegheny Plateau
  | '8.1.7'   // Northeastern Coastal Zone
  | '8.1.10'  // Erie Drift Plain
  | '8.2.4'   // Ridge and Valley
  | '8.3.1'   // Northern Piedmont
  | '8.5.1';  // Middle Atlantic Coastal Plain

export type PollinatorGuild =
  | 'bees_generalist'
  | 'bumblebees'
  | 'butterflies'
  | 'moths_night_pollinators'
  | 'hummingbirds'
  | 'specialist_bees';

export type PlantHabit =
  | 'forb'
  | 'grass'
  | 'shrub'
  | 'tree'
  | 'vine';

export interface EcoregionRecord {
  id: EcoregionId;
  name: string;
  /** Approximate bounding box [minLng, minLat, maxLng, maxLat] in WGS84. */
  bbox: [number, number, number, number];
  /** Approximate centroid [lng, lat] in WGS84 for nearest-neighbor fallback. */
  centroid: [number, number];
}

export interface PollinatorPlant {
  /** Latin binomial — canonical key. */
  scientific: string;
  common: string;
  habit: PlantHabit;
  /** Rough bloom window, month-number inclusive (1..12). */
  bloom: [number, number];
  /** Pollinator guilds with documented use of this species. */
  guilds: PollinatorGuild[];
  /** Short use-note surfacing the ecological role (for dashboard rendering). */
  note?: string;
}

// ── CEC Level III ecoregion bboxes (approximate, hand-compiled from
// CEC published maps; good enough for the coarse lookup described above).
// IDs follow CEC North American Environmental Atlas Level III codes.
const NA_ECOREGIONS: EcoregionRecord[] = [
  {
    id: '8.1.1',
    name: 'Eastern Great Lakes Lowlands',
    // Covers southern Ontario Lake Ontario shore (Milton, Mississauga,
    // Niagara peninsula) through western NY / north PA Erie lobe.
    bbox: [-80.5, 42.3, -75.5, 44.3],
    centroid: [-78.0, 43.3],
  },
  {
    id: '8.1.3',
    name: 'Northern Allegheny Plateau',
    bbox: [-80.0, 41.0, -74.5, 43.3],
    centroid: [-77.3, 42.1],
  },
  {
    id: '8.1.7',
    name: 'Northeastern Coastal Zone',
    bbox: [-75.0, 40.5, -69.5, 43.8],
    centroid: [-72.3, 42.0],
  },
  {
    id: '8.1.10',
    name: 'Erie Drift Plain',
    bbox: [-84.0, 40.5, -80.0, 42.5],
    centroid: [-82.0, 41.5],
  },
  {
    id: '8.2.4',
    name: 'Ridge and Valley',
    bbox: [-82.0, 37.5, -75.5, 41.5],
    centroid: [-78.5, 39.5],
  },
  {
    id: '8.3.1',
    name: 'Northern Piedmont',
    // Covers SE Pennsylvania (Kutztown / Rodale Institute area) through
    // NJ, DE, north-central MD, into northern VA.
    bbox: [-78.5, 38.5, -74.5, 41.0],
    centroid: [-76.5, 39.7],
  },
  {
    id: '8.5.1',
    name: 'Middle Atlantic Coastal Plain',
    bbox: [-78.0, 35.0, -74.5, 40.0],
    centroid: [-76.2, 37.5],
  },
];

const ECOREGIONS_BY_ID = new Map<EcoregionId, EcoregionRecord>(
  NA_ECOREGIONS.map((r) => [r.id, r]),
);

// Plant lists are shipped as JSON to keep curated data separable from
// code. See `./data/pollinatorPlantsByEcoregion.json`.
const PLANTS_BY_ECOREGION = plantsByEcoregionJson as Record<EcoregionId, PollinatorPlant[]>;

function pointInBbox(
  lng: number,
  lat: number,
  bbox: [number, number, number, number],
): boolean {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
}

function haversineKm(a: [number, number], b: [number, number]): number {
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const p =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(p)));
}

/**
 * Resolve a lat/lng to a CEC Level III ecoregion id. Returns `null` when
 * the point is outside the pilot coverage area (currently eastern North
 * America). Uses bbox containment first, then nearest-centroid fallback
 * within a 400 km radius so points slightly outside a bbox still resolve
 * to the most likely ecoregion.
 */
export function lookupEcoregion(lat: number, lng: number): EcoregionId | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  // First pass: bbox containment. If exactly one contains, that's our
  // answer. If several contain (overlapping bboxes on rugged boundaries),
  // pick the nearest by centroid distance.
  const containing = NA_ECOREGIONS.filter((r) => pointInBbox(lng, lat, r.bbox));
  if (containing.length === 1) {
    const region = containing[0]!;
    return region.id;
  }
  if (containing.length > 1) {
    let best = containing[0]!;
    let bestDist = haversineKm([lng, lat], best.centroid);
    for (const r of containing.slice(1)) {
      const d = haversineKm([lng, lat], r.centroid);
      if (d < bestDist) {
        best = r;
        bestDist = d;
      }
    }
    return best.id;
  }

  // Second pass: nearest centroid within 400 km. Graceful fallback for
  // points just outside the pilot coverage bboxes.
  let nearest: EcoregionRecord | null = null;
  let nearestDist = Infinity;
  for (const r of NA_ECOREGIONS) {
    const d = haversineKm([lng, lat], r.centroid);
    if (d < nearestDist) {
      nearest = r;
      nearestDist = d;
    }
  }
  if (nearest && nearestDist <= 400) {
    return nearest.id;
  }
  return null;
}

/**
 * Look up the ecoregion record (including name, bbox, centroid) for a
 * given id. Returns `null` for unknown ids.
 */
export function getEcoregion(id: EcoregionId): EcoregionRecord | null {
  return ECOREGIONS_BY_ID.get(id) ?? null;
}

/**
 * Native pollinator-friendly plants curated for this ecoregion. Empty
 * array when no curation exists yet. Callers should fall back to the
 * habitat-class-keyed category suggestions in `pollinatorHabitat.ts`
 * when the array is empty.
 */
export function plantsForEcoregion(id: EcoregionId): PollinatorPlant[] {
  return PLANTS_BY_ECOREGION[id] ?? [];
}

/** All ecoregion records — exposed for dashboards / debugging. */
export const ALL_ECOREGIONS: readonly EcoregionRecord[] = NA_ECOREGIONS;
