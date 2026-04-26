/**
 * footprints.ts — predefined GeoJSON polygon templates for each structure type.
 *
 * Each footprint is a rectangle centered at [0,0] in meters.
 * At placement time, we translate to the target lat/lng using Turf.js.
 */

import type { Structure, StructureType } from '../../store/structureStore.js';

export interface FootprintTemplate {
  widthM: number;
  depthM: number;
  label: string;
  icon: string;
  description: string;
  category: 'dwelling' | 'agricultural' | 'spiritual' | 'utility' | 'gathering' | 'infrastructure';
  costRange: [number, number]; // [low, high] in USD
  infrastructureReqs: string[];
}

export const STRUCTURE_TEMPLATES: Record<StructureType, FootprintTemplate> = {
  cabin: {
    widthM: 8, depthM: 6, label: 'Cabin', icon: '\u{1F3E0}',
    description: 'Primary dwelling or guest cabin',
    category: 'dwelling', costRange: [85000, 135000],
    infrastructureReqs: ['water', 'power', 'septic'],
  },
  yurt: {
    widthM: 7, depthM: 7, label: 'Yurt', icon: '\u{26FA}',
    description: 'Seasonal or semi-permanent circular dwelling',
    category: 'dwelling', costRange: [8000, 25000],
    infrastructureReqs: ['power'],
  },
  pavilion: {
    widthM: 10, depthM: 8, label: 'Pavilion', icon: '\u{1F3DB}',
    description: 'Open-air gathering structure',
    category: 'gathering', costRange: [25000, 65000],
    infrastructureReqs: ['power'],
  },
  greenhouse: {
    widthM: 12, depthM: 6, label: 'Greenhouse', icon: '\u{1F33F}',
    description: 'Season extension growing space',
    category: 'agricultural', costRange: [12000, 45000],
    infrastructureReqs: ['water'],
  },
  barn: {
    widthM: 14, depthM: 10, label: 'Barn', icon: '\u{1F3DA}',
    description: 'Livestock shelter, hay storage, workshop',
    category: 'agricultural', costRange: [35000, 95000],
    infrastructureReqs: ['water', 'power'],
  },
  workshop: {
    widthM: 8, depthM: 6, label: 'Workshop', icon: '\u{1F527}',
    description: 'Tool workshop and maintenance area',
    category: 'infrastructure', costRange: [20000, 55000],
    infrastructureReqs: ['power'],
  },
  prayer_space: {
    widthM: 8, depthM: 8, label: 'Prayer Space', icon: '\u{1F54C}',
    description: 'Dedicated prayer and contemplation pavilion',
    category: 'spiritual', costRange: [30000, 75000],
    infrastructureReqs: ['water'],
  },
  bathhouse: {
    widthM: 6, depthM: 4, label: 'Bathhouse', icon: '\u{1F6BF}',
    description: 'Wudu and bathing facility',
    category: 'spiritual', costRange: [25000, 55000],
    infrastructureReqs: ['water', 'septic', 'power'],
  },
  classroom: {
    widthM: 10, depthM: 8, label: 'Classroom', icon: '\u{1F4DA}',
    description: 'Educational space and community hall',
    category: 'gathering', costRange: [45000, 120000],
    infrastructureReqs: ['water', 'power', 'septic'],
  },
  storage: {
    widthM: 6, depthM: 4, label: 'Storage Shed', icon: '\u{1F4E6}',
    description: 'Tool and material storage',
    category: 'infrastructure', costRange: [5000, 15000],
    infrastructureReqs: [],
  },
  animal_shelter: {
    widthM: 8, depthM: 6, label: 'Animal Shelter', icon: '\u{1F404}',
    description: 'Livestock run-in shelter',
    category: 'agricultural', costRange: [8000, 25000],
    infrastructureReqs: ['water'],
  },
  compost_station: {
    widthM: 4, depthM: 4, label: 'Compost Station', icon: '\u267B',
    description: 'Composting and biochar facility',
    category: 'infrastructure', costRange: [3000, 10000],
    infrastructureReqs: [],
  },
  water_pump_house: {
    widthM: 3, depthM: 3, label: 'Pump House', icon: '\u{1F4A7}',
    description: 'Well pump and water treatment',
    category: 'utility', costRange: [8000, 25000],
    infrastructureReqs: ['power'],
  },
  tent_glamping: {
    widthM: 5, depthM: 5, label: 'Tent / Glamping', icon: '\u26FA',
    description: 'Glamping platform or tent site',
    category: 'gathering', costRange: [3000, 12000],
    infrastructureReqs: [],
  },
  fire_circle: {
    widthM: 6, depthM: 6, label: 'Fire Circle', icon: '\u{1F525}',
    description: 'Gathering fire pit with seating',
    category: 'gathering', costRange: [2000, 8000],
    infrastructureReqs: [],
  },
  lookout: {
    widthM: 3, depthM: 3, label: 'Lookout Point', icon: '\u{1F441}',
    description: 'Scenic viewpoint or observation deck',
    category: 'gathering', costRange: [5000, 20000],
    infrastructureReqs: [],
  },
  earthship: {
    widthM: 12, depthM: 8, label: 'Earthship', icon: '\u{1F30D}',
    description: 'Self-sustaining passive solar dwelling',
    category: 'dwelling', costRange: [75000, 180000],
    infrastructureReqs: ['water', 'septic'],
  },
  solar_array: {
    widthM: 10, depthM: 6, label: 'Solar Array', icon: '\u2600',
    description: 'Ground-mounted solar panel array',
    category: 'utility', costRange: [15000, 45000],
    infrastructureReqs: ['power'],
  },
  well: {
    widthM: 2, depthM: 2, label: 'Well', icon: '\u{1F4A7}',
    description: 'Drilled or dug water well',
    category: 'utility', costRange: [8000, 30000],
    infrastructureReqs: ['power'],
  },
  water_tank: {
    widthM: 3, depthM: 3, label: 'Water Tank', icon: '\u{1F6B0}',
    description: 'Water storage tank (cistern)',
    category: 'utility', costRange: [3000, 15000],
    infrastructureReqs: [],
  },
};

/**
 * Generate a GeoJSON polygon rectangle at a given center point.
 * Uses meter-to-degree approximation (good enough for placement).
 */
export function createFootprintPolygon(
  center: [number, number],
  widthM: number,
  depthM: number,
  rotationDeg: number = 0,
): GeoJSON.Polygon {
  const [lng, lat] = center;

  // Approximate meters to degrees at this latitude
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos((lat * Math.PI) / 180);

  const halfW = (widthM / 2) / mPerDegLng;
  const halfD = (depthM / 2) / mPerDegLat;

  // Base rectangle corners (unrotated)
  const corners: [number, number][] = [
    [lng - halfW, lat - halfD],
    [lng + halfW, lat - halfD],
    [lng + halfW, lat + halfD],
    [lng - halfW, lat + halfD],
  ];

  // Apply rotation around center
  if (rotationDeg !== 0) {
    const rad = (rotationDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    for (let i = 0; i < corners.length; i++) {
      const dx = corners[i]![0] - lng;
      const dy = corners[i]![1] - lat;
      corners[i] = [
        lng + dx * cos - dy * sin,
        lat + dx * sin + dy * cos,
      ];
    }
  }

  return {
    type: 'Polygon',
    coordinates: [[...corners, corners[0]!]],
  };
}

/**
 * Per-type fallback ridge/eave heights in metres. Used by `estimateStructureHeightM`
 * when the Structure record itself doesn't carry an explicit `heightM`. Rough
 * estimates aimed at shadow-length math, not engineering.
 */
const STRUCTURE_HEIGHT_M: Record<StructureType, number> = {
  cabin: 5.5,
  yurt: 4.2,
  pavilion: 4.5,
  greenhouse: 3.5,
  barn: 7.0,
  workshop: 4.5,
  prayer_space: 6.0,
  bathhouse: 3.5,
  classroom: 5.0,
  storage: 3.0,
  animal_shelter: 3.5,
  compost_station: 1.8,
  water_pump_house: 2.8,
  tent_glamping: 3.2,
  fire_circle: 0.5,
  lookout: 6.0,
  earthship: 5.5,
  solar_array: 2.5,
  well: 1.5,
  water_tank: 3.5,
};

/**
 * Resolve the ridge/eave height in metres for a structure. Prefers the
 * steward-entered `heightM` on the Structure when present (positive, finite);
 * otherwise falls back to the per-type table. Accepts either a full Structure
 * or a bare type for callers that don't have the record handy.
 */
export function estimateStructureHeightM(input: Structure | StructureType): number {
  if (typeof input === 'object' && input !== null) {
    const explicit = input.heightM;
    if (typeof explicit === 'number' && Number.isFinite(explicit) && explicit > 0) {
      return explicit;
    }
    return STRUCTURE_HEIGHT_M[input.type] ?? 4.0;
  }
  return STRUCTURE_HEIGHT_M[input] ?? 4.0;
}

/**
 * Cost band for a placed structure. When the steward has set
 * `costEstimate`, the band is centered on that value (\u00B115%) and
 * `source` is `'user'`. Otherwise the band is derived from the type
 * template's `costRange` scaled by the placed footprint's area relative
 * to the template's nominal area, clamped to [0.5x, 2x] so a hand-resized
 * footprint doesn't blow the cost into nonsense territory.
 *
 * Returned `infraReqs` are passed through from the type template so the
 * dashboard can surface "Requires: water, power" hints alongside the
 * cost chip.
 */
export interface InfrastructureCostBand {
  low: number;
  mid: number;
  high: number;
  source: 'user' | 'template';
  infraReqs: string[];
}

export function deriveInfrastructureCost(st: Structure): InfrastructureCostBand {
  const tmpl = STRUCTURE_TEMPLATES[st.type];
  const infraReqs = tmpl?.infrastructureReqs ?? [];

  if (st.costEstimate != null && Number.isFinite(st.costEstimate) && st.costEstimate >= 0) {
    const mid = st.costEstimate;
    return {
      low: Math.round(mid * 0.85),
      mid,
      high: Math.round(mid * 1.15),
      source: 'user',
      infraReqs,
    };
  }

  if (!tmpl) {
    return { low: 0, mid: 0, high: 0, source: 'template', infraReqs };
  }

  const [tLow, tHigh] = tmpl.costRange;
  const nominalArea = tmpl.widthM * tmpl.depthM;
  const placedArea = (st.widthM ?? tmpl.widthM) * (st.depthM ?? tmpl.depthM);
  const scaleRaw = nominalArea > 0 ? placedArea / nominalArea : 1;
  const scale = Math.max(0.5, Math.min(2, scaleRaw));

  const low = Math.round(tLow * scale);
  const high = Math.round(tHigh * scale);
  const mid = Math.round((low + high) / 2);
  return { low, mid, high, source: 'template', infraReqs };
}

/**
 * Short money formatter used by cost chips and roll-ups. Aimed at glanceable
 * widths, not currency-correct precision: `$25k`, `$1.2M`, `$850`.
 */
export function formatCostShort(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '$0';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    const m = value / 1_000_000;
    const fixed = m >= 10 ? m.toFixed(0) : m.toFixed(1);
    return `$${fixed.replace(/\.0$/, '')}M`;
  }
  if (abs >= 1_000) {
    const k = value / 1_000;
    const fixed = k >= 10 ? k.toFixed(0) : k.toFixed(1);
    return `$${fixed.replace(/\.0$/, '')}k`;
  }
  return `$${Math.round(value)}`;
}
