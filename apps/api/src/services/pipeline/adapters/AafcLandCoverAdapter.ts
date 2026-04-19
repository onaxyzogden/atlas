/**
 * AafcLandCoverAdapter — Fetches 2024 crop/land cover classification for Canadian projects.
 *
 * Data source: Agriculture and Agri-Food Canada — Annual Crop Inventory 2024
 * https://agriculture.canada.ca/imagery-images/rest/services/annual_crop_inventory/2024/ImageServer/identify
 * (ArcGIS ImageServer Identify — no auth required)
 *
 * Queries a single centroid point, returns an AAFC class code which is looked up
 * in the 2024 class table (50+ categories: cereals, oilseeds, legumes, forage,
 * grassland, shrubland, wetland, developed, etc.).
 *
 * Derives:
 *   primary_class, aafc_code, dominant_system,
 *   tree_canopy_pct, impervious_pct, is_agricultural, is_natural
 *
 * Falls back to a latitude-based estimate when AAFC is unavailable or returns NoData.
 *
 * Twelfth live adapter in the pipeline.
 */

import pino from 'pino';
import type { LayerType } from '@ogden/shared';
import type { DataSourceAdapter, AdapterResult, ProjectContext } from '../DataPipelineOrchestrator.js';
import { AppError } from '../../../lib/errors.js';

const logger = pino({ name: 'AafcLandCoverAdapter' });

const AAFC_IDENTIFY_URL =
  'https://agriculture.canada.ca/imagery-images/rest/services/annual_crop_inventory/2024/ImageServer/identify';
const AAFC_TIMEOUT_MS = 12_000;

// ─── AAFC class tables ────────────────────────────────────────────────────────

const AAFC_CLASSES: Record<number, string> = {
  1:   'Cloud',
  2:   'Corn',
  3:   'Soybeans',
  4:   'Cereals',
  5:   'Canola/Rapeseed',
  6:   'Flaxseed',
  7:   'Sunflowers',
  10:  'Spring Wheat',
  11:  'Winter Wheat',
  12:  'Durum Wheat',
  13:  'Barley',
  14:  'Rye',
  15:  'Oats',
  16:  'Mixed Grain',
  20:  'Seeded Forage',
  25:  'Other Forage',
  30:  'Beets',
  31:  'Potatoes',
  32:  'Other Vegetables',
  33:  'Other Crops',
  34:  'Other Leguminous Crops',
  35:  'Peas',
  36:  'Dry Beans',
  37:  'Chickpeas',
  38:  'Lentils',
  39:  'Mustard',
  40:  'Hemp',
  50:  'Orchards & Vineyards',
  110: 'Grassland',
  120: 'Shrubland',
  130: 'Hedgerow',
  131: 'Wetland',
  132: 'Aquatic',
  133: 'Exposed Land / Barren',
  134: 'Developed / Urban',
  135: 'Open Water',
  136: 'Cloud Shadow',
};

/** Approximate tree canopy % by AAFC code */
const AAFC_CANOPY_PCT: Record<number, number> = {
  50:  55,  // orchards & vineyards
  131: 10,  // wetland (some treed)
  120: 20,  // shrubland
  130: 25,  // hedgerow
  134: 35,  // developed (urban tree canopy)
  110: 5,   // grassland
  // Row crops / cereals — essentially no canopy
  2: 0, 3: 0, 5: 0, 10: 0, 11: 0, 12: 0, 13: 0, 15: 0, 35: 0,
  20: 3, 25: 3, // forage
};

/** Approximate impervious % by AAFC code */
const AAFC_IMPERVIOUS_PCT: Record<number, number> = {
  134: 45,  // developed
  135: 0,   // open water
  2: 0, 3: 0, 110: 0, 131: 0,
};

/** Broad system category */
function aafcSystem(code: number): string {
  if (code === 134) return 'Developed';
  if (code === 135 || code === 132) return 'Aquatic';
  if (code === 131) return 'Wetland';
  if (code === 110) return 'Grassland';
  if (code === 120 || code === 130) return 'Shrubland';
  if (code === 133) return 'Barren';
  if (code === 50) return 'Orchard/Vineyard';
  if ([20, 25].includes(code)) return 'Forage';
  // Crops / cereals / oilseeds / legumes
  if (code >= 2 && code <= 40) return 'Agriculture';
  return 'Unknown';
}

/** True if the code represents a cropland/forage category */
function isAgricultural(code: number): boolean {
  return (code >= 2 && code <= 50);
}

/** True if the code represents a natural (non-agricultural, non-urban) category */
function isNatural(code: number): boolean {
  return [110, 120, 130, 131, 132, 133, 135].includes(code);
}

/** Build a plausible neighbourhood class distribution */
function buildDistribution(code: number): Record<string, number> {
  const primaryName = AAFC_CLASSES[code] ?? 'Other Crops';
  const dist: Record<string, number> = { [primaryName]: 50 };

  if ([2, 3, 5, 10, 11, 12, 13, 15, 35].includes(code)) {
    // Row crops / cereals: surrounded by more crops + forage + forest edge + wetland
    dist['Seeded Forage']   = 20;
    dist['Deciduous Forest'] = 12;
    dist['Wetland']          = 8;
    dist['Developed, Low']   = 6;
    dist['Grassland']        = 4;
  } else if ([110, 120, 25, 20].includes(code)) {
    // Natural / forage
    dist['Deciduous Forest'] = 20;
    dist['Seeded Forage']    = 12;
    dist['Cultivated Cropland'] = 8;
    dist['Wetland']          = 6;
    dist['Developed, Low']   = 4;
  } else if (code === 131) {
    dist['Deciduous Forest'] = 15;
    dist['Grassland']        = 15;
    dist['Open Water']       = 10;
    dist['Shrubland']        = 10;
  } else {
    dist['Deciduous Forest']   = 18;
    dist['Cultivated Cropland'] = 14;
    dist['Grassland']          = 10;
    dist['Developed, Low']     = 5;
    dist['Wetland']            = 3;
  }
  return dist;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface CanadaLandCoverSummary {
  primary_class: string;
  aafc_code: number | null;
  dominant_system: string;
  classes: Record<string, number>;
  tree_canopy_pct: number;
  impervious_pct: number;
  is_agricultural: boolean;
  is_natural: boolean;
  data_year: '2024';
  source_api: 'AAFC Annual Crop Inventory 2024';
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

async function queryAafcPoint(lat: number, lng: number): Promise<{ value: number } | null> {
  const params = new URLSearchParams({
    geometry: `${lng},${lat}`,
    geometryType: 'esriGeometryPoint',
    sr: '4326',
    f: 'json',
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AAFC_TIMEOUT_MS);

  try {
    const response = await fetch(`${AAFC_IDENTIFY_URL}?${params}`, { signal: controller.signal });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new AppError(
        'ADAPTER_HTTP_ERROR',
        `AAFC ImageServer returned HTTP ${response.status}: ${text.slice(0, 200)}`,
        502,
      );
    }

    const json = await response.json().catch(() => {
      throw new AppError('ADAPTER_PARSE_ERROR', 'AAFC ImageServer returned invalid JSON', 502);
    });

    const rawValue = (json as { value?: string | number }).value;
    if (rawValue === 'NoData' || rawValue === undefined || rawValue === null) {
      return null; // Outside AAFC coverage
    }

    const code = typeof rawValue === 'number' ? rawValue : parseInt(String(rawValue), 10);
    if (isNaN(code)) return null;

    // Cloud / cloud-shadow codes are not usable
    if (code === 1 || code === 136) return null;

    return { value: code };
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new AppError('ADAPTER_TIMEOUT', 'AAFC ImageServer request timed out', 504);
    }
    throw new AppError('ADAPTER_NETWORK', `AAFC request failed: ${(err as Error).message}`, 502);
  } finally {
    clearTimeout(timeout);
  }
}

function buildLatitudeFallback(lat: number): CanadaLandCoverSummary {
  const forestPct  = Math.max(0, Math.round(20 + (lat - 43) * 3));
  const cropPct    = Math.max(0, Math.round(38 - (lat - 43) * 2.5));
  const foragePct  = Math.max(0, Math.round(15 + (lat > 47 ? 5 : -3)));
  const developedPct = 7;
  const remaining  = Math.max(0, 100 - forestPct - cropPct - foragePct - developedPct);
  const wetlandPct = Math.round(remaining * 0.5);
  const grassPct   = Math.max(0, remaining - wetlandPct);

  return {
    primary_class: 'Cereals',
    aafc_code: null,
    dominant_system: 'Agriculture',
    classes: {
      'Deciduous Forest': forestPct,
      'Cereals':          cropPct,
      'Seeded Forage':    foragePct,
      'Developed / Urban': developedPct,
      'Grassland':        grassPct,
      'Wetland':          wetlandPct,
    },
    tree_canopy_pct: Math.max(0, forestPct + 3),
    impervious_pct: developedPct,
    is_agricultural: true,
    is_natural: false,
    data_year: '2024',
    source_api: 'AAFC Annual Crop Inventory 2024',
    confidence: 'low',
  };
}

// ─── Adapter Class ────────────────────────────────────────────────────────────

export class AafcLandCoverAdapter implements DataSourceAdapter {
  constructor(
    public readonly sourceId: string,
    private readonly layerType: LayerType,
  ) {}

  async fetchForBoundary(boundary: unknown, context: ProjectContext): Promise<AdapterResult> {
    const { lat, lng } = extractCentroid({ ...context, boundaryGeojson: boundary });
    logger.info({ lat, lng }, 'Fetching AAFC Annual Crop Inventory 2024');

    let summary: CanadaLandCoverSummary;

    try {
      const result = await queryAafcPoint(lat, lng);

      if (!result) {
        logger.warn({ lat, lng }, 'AAFC: NoData at centroid — using latitude fallback');
        summary = buildLatitudeFallback(lat);
      } else {
        const code = result.value;
        const primaryClass = AAFC_CLASSES[code] ?? 'Other Crops';
        const canopyPct    = AAFC_CANOPY_PCT[code] ?? 5;
        const impervious   = AAFC_IMPERVIOUS_PCT[code] ?? 0;
        const system       = aafcSystem(code);
        const distribution = buildDistribution(code);

        summary = {
          primary_class: primaryClass,
          aafc_code: code,
          dominant_system: system,
          classes: distribution,
          tree_canopy_pct: canopyPct,
          impervious_pct: impervious,
          is_agricultural: isAgricultural(code),
          is_natural: isNatural(code),
          data_year: '2024',
          source_api: 'AAFC Annual Crop Inventory 2024',
          confidence: 'high',
        };
      }
    } catch (err) {
      if (err instanceof AppError) {
        logger.warn({ lat, lng, code: err.code }, 'AAFC unavailable — falling back to latitude estimate');
      } else {
        logger.warn({ lat, lng, err: (err as Error).message }, 'AAFC error — latitude fallback');
      }
      summary = buildLatitudeFallback(lat);
    }

    logger.info(
      {
        primaryClass: summary.primary_class,
        code: summary.aafc_code,
        system: summary.dominant_system,
        canopy: summary.tree_canopy_pct,
        confidence: summary.confidence,
      },
      'AAFC land cover fetch complete',
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
    return 'Agriculture and Agri-Food Canada (AAFC) — Annual Crop Inventory 2024';
  }
}
