/**
 * NlcdAdapter — Fetches 2021 land cover classification for US projects.
 *
 * Data source: USGS MRLC — NLCD 2021 Land Cover Layer 48 (lower 48 states)
 * https://www.mrlc.gov/geoserver/mrlc_display/NLCD_2021_Land_Cover_L48/ows
 * (WMS GetFeatureInfo — no auth required)
 *
 * Queries 5 sample points across the project boundary (centroid + 4 cardinal
 * offsets at ±400 m) to build a real class distribution rather than the
 * heuristic used in the frontend. Aggregates NLCD codes into:
 *   primary_class, nlcd_code (dominant), classes (distribution %),
 *   tree_canopy_pct, impervious_pct, dominant_system
 *
 * Falls back to a latitude-based estimate when MRLC is unavailable.
 *
 * Eleventh live adapter in the pipeline.
 */

import pino from 'pino';
import type { LayerType } from '@ogden/shared';
import type { DataSourceAdapter, AdapterResult, ProjectContext } from '../DataPipelineOrchestrator.js';
import { AppError } from '../../../lib/errors.js';

const logger = pino({ name: 'NlcdAdapter' });

const NLCD_WMS_BASE = 'https://www.mrlc.gov/geoserver/mrlc_display/NLCD_2021_Land_Cover_L48/ows';
const NLCD_TIMEOUT_MS = 10_000;

// Cardinal offsets ≈ 400 m at mid-US latitudes (~0.0036°)
const SAMPLE_OFFSETS: Array<[number, number]> = [
  [0, 0],         // centroid
  [0, 0.0036],    // north
  [0, -0.0036],   // south
  [0.0045, 0],    // east (corrected for longitude compression)
  [-0.0045, 0],   // west
];

// ─── NLCD class tables ────────────────────────────────────────────────────────

const NLCD_CLASSES: Record<number, string> = {
  11: 'Open Water',
  12: 'Perennial Ice/Snow',
  21: 'Developed, Open Space',
  22: 'Developed, Low Intensity',
  23: 'Developed, Medium Intensity',
  24: 'Developed, High Intensity',
  31: 'Barren Land',
  41: 'Deciduous Forest',
  42: 'Evergreen Forest',
  43: 'Mixed Forest',
  51: 'Dwarf Scrub',
  52: 'Shrub/Scrub',
  71: 'Grassland/Herbaceous',
  72: 'Sedge/Herbaceous',
  73: 'Lichens',
  74: 'Moss',
  81: 'Pasture/Hay',
  82: 'Cultivated Crops',
  90: 'Woody Wetlands',
  95: 'Emergent Herbaceous Wetlands',
};

/** Approximate tree canopy % for each NLCD class */
const NLCD_CANOPY_PCT: Record<number, number> = {
  41: 75, 42: 80, 43: 70, 90: 50,  // forests + woody wetlands
  52: 15, 51: 10,                    // scrub
  81: 3, 82: 2, 71: 2,              // agriculture/grass
  21: 10, 22: 15, 23: 8, 24: 5,    // developed
  95: 0, 31: 0, 11: 0, 12: 0,
};

/** Approximate impervious % for each NLCD class */
const NLCD_IMPERVIOUS_PCT: Record<number, number> = {
  21: 10, 22: 30, 23: 65, 24: 90,  // developed classes
  11: 0,  82: 0,  41: 0,  71: 0,   // natural/agricultural
  81: 1,  52: 0,  90: 0,  95: 0,
};

/** Broad system name for each NLCD code range */
function nlcdSystem(code: number): string {
  if (code === 11) return 'Aquatic';
  if (code === 12) return 'Snow/Ice';
  if (code >= 21 && code <= 24) return 'Developed';
  if (code === 31) return 'Barren';
  if (code >= 41 && code <= 43) return 'Forest';
  if (code >= 51 && code <= 52) return 'Shrubland';
  if (code >= 71 && code <= 74) return 'Grassland';
  if (code === 81 || code === 82) return 'Agriculture';
  if (code === 90 || code === 95) return 'Wetland';
  return 'Unknown';
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface LandCoverSummary {
  primary_class: string;
  nlcd_code: number | null;
  dominant_system: string;
  classes: Record<string, number>;
  tree_canopy_pct: number;
  impervious_pct: number;
  sample_count: number;
  data_year: '2021';
  source_api: 'USGS NLCD 2021';
  confidence: 'high' | 'medium' | 'low';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractCentroid(context: ProjectContext): { lat: number; lng: number } {
  if (context.centroidLat != null && context.centroidLng != null) {
    return { lat: context.centroidLat, lng: context.centroidLng };
  }

  const geo = context.boundaryGeojson as { type?: string; coordinates?: number[][][] | number[][][][] } | null;
  if (!geo?.coordinates) {
    throw new AppError('ADAPTER_INVALID_INPUT', 'No centroid and no valid GeoJSON boundary', 400);
  }

  const allCoords: number[][] =
    geo.type === 'MultiPolygon'
      ? (geo.coordinates as number[][][][]).flat(2)
      : (geo.coordinates as number[][][]).flat();

  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const [lng, lat] of allCoords) {
    if (lat! < minLat) minLat = lat!;
    if (lat! > maxLat) maxLat = lat!;
    if (lng! < minLng) minLng = lng!;
    if (lng! > maxLng) maxLng = lng!;
  }
  return { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 };
}

async function queryNlcdPoint(lat: number, lng: number): Promise<number | null> {
  const half = 0.01;
  const bboxStr = `${lng - half},${lat - half},${lng + half},${lat + half}`;

  const params = new URLSearchParams({
    service: 'WMS',
    version: '1.1.1',
    request: 'GetFeatureInfo',
    layers: 'NLCD_2021_Land_Cover_L48',
    query_layers: 'NLCD_2021_Land_Cover_L48',
    info_format: 'application/json',
    feature_count: '1',
    x: '128',
    y: '128',
    width: '256',
    height: '256',
    srs: 'EPSG:4326',
    bbox: bboxStr,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), NLCD_TIMEOUT_MS);

  try {
    const response = await fetch(`${NLCD_WMS_BASE}?${params}`, { signal: controller.signal });

    if (!response.ok) {
      return null; // Best-effort — don't throw on individual sample failures
    }

    const json = (await response.json().catch(() => null)) as { features?: Array<{ properties?: Record<string, unknown> }> } | null;
    if (!json) return null;

    const features = json?.features;
    if (!features || features.length === 0) return null;

    const val = features[0]?.properties?.GRAY_INDEX ?? features[0]?.properties?.value;
    if (val === undefined || val === null) return null;

    const code = typeof val === 'number' ? val : parseInt(String(val), 10);
    return isNaN(code) ? null : code;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function buildLatitudeFallback(lat: number): LandCoverSummary {
  const forestPct   = Math.max(0, Math.round(20 + (lat - 35) * 3));
  const cropPct     = Math.max(0, Math.round(40 - (lat - 35) * 2.5));
  const pasturePct  = Math.max(0, Math.round(15 + (lat > 42 ? 5 : -3)));
  const developedPct = 8;
  const remaining   = Math.max(0, 100 - forestPct - cropPct - pasturePct - developedPct);
  const wetlandPct  = Math.round(remaining * 0.4);
  const shrubPct    = Math.max(0, remaining - wetlandPct);

  return {
    primary_class: 'Cultivated Crops',
    nlcd_code: null,
    dominant_system: 'Agriculture',
    classes: {
      'Deciduous Forest':   forestPct,
      'Cultivated Crops':   cropPct,
      'Pasture/Hay':        pasturePct,
      'Developed, Low Intensity': developedPct,
      'Shrub/Scrub':        shrubPct,
      'Woody Wetlands':     wetlandPct,
    },
    tree_canopy_pct: Math.max(0, forestPct + 5),
    impervious_pct: developedPct,
    sample_count: 0,
    data_year: '2021',
    source_api: 'USGS NLCD 2021',
    confidence: 'low',
  };
}

// ─── Adapter Class ────────────────────────────────────────────────────────────

export class NlcdAdapter implements DataSourceAdapter {
  constructor(
    public readonly sourceId: string,
    private readonly layerType: LayerType,
  ) {}

  async fetchForBoundary(boundary: unknown, context: ProjectContext): Promise<AdapterResult> {
    const { lat, lng } = extractCentroid({ ...context, boundaryGeojson: boundary });
    logger.info({ lat, lng }, 'Fetching NLCD 2021 land cover');

    // Query all 5 sample points in parallel (best-effort — failures return null)
    const samplePoints = SAMPLE_OFFSETS.map(([dLng, dLat]) => [lat + dLat, lng + dLng] as [number, number]);
    const results = await Promise.all(samplePoints.map(([pLat, pLng]) => queryNlcdPoint(pLat, pLng)));

    const validCodes = results.filter((c): c is number => c !== null);

    let summary: LandCoverSummary;

    if (validCodes.length === 0) {
      logger.warn({ lat, lng }, 'NLCD: no valid pixels returned — using latitude fallback');
      summary = buildLatitudeFallback(lat);
    } else {
      // ── Build distribution from sampled codes ─────────────────────────────
      const codeCounts: Record<number, number> = {};
      for (const code of validCodes) {
        codeCounts[code] = (codeCounts[code] ?? 0) + 1;
      }

      const total = validCodes.length;
      const classes: Record<string, number> = {};
      for (const [codeStr, count] of Object.entries(codeCounts)) {
        const code = parseInt(codeStr, 10);
        const name = NLCD_CLASSES[code] ?? `Class ${code}`;
        classes[name] = Math.round((count / total) * 100);
      }

      // Dominant code by count
      const dominantCode = parseInt(
        Object.entries(codeCounts).sort((a, b) => b[1] - a[1])[0]![0],
        10,
      );
      const primaryClass = NLCD_CLASSES[dominantCode] ?? `Class ${dominantCode}`;

      // Weighted average canopy + impervious from distribution
      let canopySum = 0, imperviousSum = 0;
      for (const code of validCodes) {
        canopySum     += NLCD_CANOPY_PCT[code]     ?? 5;
        imperviousSum += NLCD_IMPERVIOUS_PCT[code] ?? 0;
      }
      const treeCanopyPct  = Math.round(canopySum / total);
      const imperviousPct  = Math.round(imperviousSum / total);
      const dominantSystem = nlcdSystem(dominantCode);

      // Confidence: high if centroid returned a value, medium if only offsets did
      const confidence: 'high' | 'medium' | 'low' = results[0] !== null ? 'high' : 'medium';

      summary = {
        primary_class: primaryClass,
        nlcd_code: dominantCode,
        dominant_system: dominantSystem,
        classes,
        tree_canopy_pct: treeCanopyPct,
        impervious_pct: imperviousPct,
        sample_count: total,
        data_year: '2021',
        source_api: 'USGS NLCD 2021',
        confidence,
      };
    }

    logger.info(
      {
        primaryClass: summary.primary_class,
        nlcdCode: summary.nlcd_code,
        canopy: summary.tree_canopy_pct,
        impervious: summary.impervious_pct,
        samples: summary.sample_count,
        confidence: summary.confidence,
      },
      'NLCD land cover fetch complete',
    );

    return {
      layerType: this.layerType,
      sourceApi: summary.source_api,
      attributionText: this.getAttributionText(),
      confidence: summary.confidence,
      dataDate: summary.data_year,
      summaryData: summary,
    };
  }

  getConfidence(result: AdapterResult): 'high' | 'medium' | 'low' {
    return result.confidence;
  }

  getAttributionText(): string {
    return 'Multi-Resolution Land Characteristics Consortium (MRLC) — National Land Cover Database 2021';
  }
}
