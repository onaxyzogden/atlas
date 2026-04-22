/**
 * SsurgoAdapter — Fetches soil data from the USDA SSURGO Soil Data Access (SDA)
 * REST API and returns a complete soil properties result for a project boundary.
 *
 * API: https://SDMDataAccess.sc.egov.usda.gov/Tabular/SDMTabularService/post.rest
 *
 * This is the first real adapter in the pipeline — all others are still stubs.
 * It implements the DataSourceAdapter interface defined in DataPipelineOrchestrator.ts.
 */

import pino from 'pino';
import type { LayerType } from '@ogden/shared';
import type { DataSourceAdapter, AdapterResult, ProjectContext } from '../DataPipelineOrchestrator.js';
import { AppError } from '../../../lib/errors.js';

const logger = pino({ name: 'SsurgoAdapter' });

const SDA_ENDPOINT = 'https://SDMDataAccess.sc.egov.usda.gov/Tabular/SDMTabularService/post.rest';
const SDA_TIMEOUT_MS = 15_000;

// ─── Types ────────────────────────────────────────────────────────────────────

interface SdaResponse {
  Table?: unknown[][];
}

interface MukeyRow {
  mukey: string;
  musym: string;
  muname: string;
  comppct_r: number;
  majcompflag: string;
  compname: string;
  taxclname: string;
  drainagecl: string;
  slope_r: number | null;
  elev_r: number | null;
}

interface HorizonRow {
  mukey: string;
  comppct_r: number;
  hzdept_r: number | null;
  hzdepb_r: number | null;
  ph: number | null;
  organic_matter_pct: number | null;
  cec_meq_100g: number | null;
  ec_ds_m: number | null;
  bulk_density_g_cm3: number | null;
  ksat_um_s: number | null;
  kfact: number | null;
  awc_cm_cm: number | null;
  rooting_depth_cm: number | null;
  claytotal_r: number | null;
  silttotal_r: number | null;
  sandtotal_r: number | null;
  caco3_pct: number | null;
  gypsum_pct: number | null;
  sodium_adsorption_ratio: number | null;
  frag3to10_pct: number | null;
  fraggt10_pct: number | null;
  base_saturation_pct: number | null;
  surface_stoniness: string | null;
  texture_description: string | null;
  drainage_class: string | null;
  taxonomy_class: string | null;
  component_name: string | null;
  component_pct: number | null;
}

/**
 * Per-horizon soil profile row. Added in the field-backfill sprint to expose
 * sub-surface Ksat, texture, OM, and coarse-fragment values that the flat
 * 0–30 cm topsoil average cannot capture.
 */
export interface SoilHorizon {
  depth_top_cm: number;
  depth_bottom_cm: number;
  component_pct: number;
  component_name: string | null;
  ksat_um_s: number | null;
  organic_matter_pct: number | null;
  clay_pct: number | null;
  silt_pct: number | null;
  sand_pct: number | null;
  cec_meq_100g: number | null;
  coarse_fragment_pct: number | null;
}

export interface RestrictiveLayer {
  kind: string;            // e.g. 'Fragipan', 'Lithic bedrock', 'Duripan'
  depth_cm: number;        // top depth of the restriction
  component_name: string | null;
  component_pct: number;
}

interface SoilSummary {
  // Identity
  dominant_component_name: string | null;
  taxonomy_class: string | null;
  drainage_class: string | null;
  texture_description: string | null;

  // Physical properties (weighted averages, 0-30cm topsoil)
  ph: number | null;
  organic_matter_pct: number | null;
  organic_carbon_pct: number | null;
  cec_meq_100g: number | null;
  ec_ds_m: number | null;
  bulk_density_g_cm3: number | null;
  ksat_um_s: number | null;
  kfact: number | null;
  awc_cm_cm: number | null;
  rooting_depth_cm: number | null;
  clay_pct: number | null;
  silt_pct: number | null;
  sand_pct: number | null;
  caco3_pct: number | null;
  gypsum_pct: number | null;
  sodium_adsorption_ratio: number | null;
  coarse_fragment_pct: number | null;
  /** Base saturation by NH4OAc pH 7.0 method — pairs with `cec_meq_100g` (cec7_r). */
  base_saturation_pct: number | null;
  surface_stoniness: string | null;

  // Derived
  texture_class: string | null;
  fertility_index: number | null;
  salinization_risk: string | null;
  soil_health_summary: string | null;

  // Coverage
  mukeys_found: number;
  coverage_pct: number;
  data_date: string;
  source_api: 'USDA SSURGO SDA';
  confidence: 'high' | 'medium' | 'low';

  // Tier 3 compatibility (camelCase aliases)
  drainageClass: string | null;
  organicMatterPct: number | null;
  textureClass: string | null;

  // Field-backfill additions (sprint: SSURGO backfill)
  horizons?: SoilHorizon[];
  restrictive_layer?: RestrictiveLayer | null;
}

// ─── GeoJSON helpers ──────────────────────────────────────────────────────────

type Position = [number, number];
type Ring = Position[];

interface GeoJsonPolygon {
  type: 'Polygon';
  coordinates: Ring[];
}

interface GeoJsonMultiPolygon {
  type: 'MultiPolygon';
  coordinates: Ring[][];
}

type BoundaryGeometry = GeoJsonPolygon | GeoJsonMultiPolygon;

// ─── Exported utilities (for testing) ─────────────────────────────────────────

export function boundaryToWkt(geojson: unknown): string {
  const geo = (geojson && typeof geojson === 'object' && 'type' in geojson)
    ? geojson as BoundaryGeometry
    : null;

  if (!geo) {
    throw new AppError('ADAPTER_INVALID_INPUT', 'Invalid GeoJSON boundary', 400);
  }

  let ring: Ring;

  if (geo.type === 'Polygon') {
    ring = geo.coordinates[0]!;
  } else if (geo.type === 'MultiPolygon') {
    // Select the polygon with the largest area
    let maxArea = -Infinity;
    let largestRing: Ring = geo.coordinates[0]![0]!;
    for (const polygon of geo.coordinates) {
      const outer = polygon[0]!;
      const area = Math.abs(shoelaceArea(outer));
      if (area > maxArea) {
        maxArea = area;
        largestRing = outer;
      }
    }
    ring = largestRing;
  } else {
    throw new AppError('ADAPTER_INVALID_INPUT', `Unsupported geometry type: ${(geo as { type: string }).type}`, 400);
  }

  // WKT format: POLYGON((lng1 lat1, lng2 lat2, ...))
  const coords = ring.map(([lng, lat]) => `${lng} ${lat}`).join(', ');
  return `POLYGON((${coords}))`;
}

function shoelaceArea(ring: Ring): number {
  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i]!;
    const [x2, y2] = ring[i + 1]!;
    area += x1 * y2 - x2 * y1;
  }
  return area / 2;
}

export function computeWeightedAverages(rows: HorizonRow[]): {
  ph: number | null;
  organic_matter_pct: number | null;
  cec_meq_100g: number | null;
  ec_ds_m: number | null;
  bulk_density_g_cm3: number | null;
  ksat_um_s: number | null;
  kfact: number | null;
  awc_cm_cm: number | null;
  rooting_depth_cm: number | null;
  clay_pct: number | null;
  silt_pct: number | null;
  sand_pct: number | null;
  caco3_pct: number | null;
  gypsum_pct: number | null;
  sodium_adsorption_ratio: number | null;
  coarse_fragment_pct: number | null;
  base_saturation_pct: number | null;
  // Categorical (dominant)
  drainage_class: string | null;
  texture_description: string | null;
  taxonomy_class: string | null;
  dominant_component_name: string | null;
  surface_stoniness: string | null;
} {
  if (rows.length === 0) {
    return {
      ph: null, organic_matter_pct: null, cec_meq_100g: null, ec_ds_m: null,
      bulk_density_g_cm3: null, ksat_um_s: null, kfact: null, awc_cm_cm: null,
      rooting_depth_cm: null, clay_pct: null, silt_pct: null, sand_pct: null,
      caco3_pct: null, gypsum_pct: null, sodium_adsorption_ratio: null,
      coarse_fragment_pct: null, base_saturation_pct: null,
      drainage_class: null, texture_description: null, taxonomy_class: null,
      dominant_component_name: null, surface_stoniness: null,
    };
  }

  const totalWeight = rows.reduce((sum, r) => sum + (r.comppct_r ?? 0), 0);
  if (totalWeight === 0) {
    return {
      ph: null, organic_matter_pct: null, cec_meq_100g: null, ec_ds_m: null,
      bulk_density_g_cm3: null, ksat_um_s: null, kfact: null, awc_cm_cm: null,
      rooting_depth_cm: null, clay_pct: null, silt_pct: null, sand_pct: null,
      caco3_pct: null, gypsum_pct: null, sodium_adsorption_ratio: null,
      coarse_fragment_pct: null, base_saturation_pct: null,
      drainage_class: null, texture_description: null, taxonomy_class: null,
      dominant_component_name: null, surface_stoniness: null,
    };
  }

  function weightedAvg(field: keyof HorizonRow): number | null {
    let sum = 0;
    let weightSum = 0;
    for (const row of rows) {
      const val = row[field];
      if (typeof val === 'number' && !isNaN(val)) {
        const w = row.comppct_r ?? 0;
        sum += val * w;
        weightSum += w;
      }
    }
    return weightSum > 0 ? Math.round((sum / weightSum) * 100) / 100 : null;
  }

  // Categorical: take value from highest comppct_r row
  const dominant = rows.reduce((best, row) =>
    (row.comppct_r ?? 0) > (best.comppct_r ?? 0) ? row : best,
  );

  return {
    ph: weightedAvg('ph'),
    organic_matter_pct: weightedAvg('organic_matter_pct'),
    cec_meq_100g: weightedAvg('cec_meq_100g'),
    ec_ds_m: weightedAvg('ec_ds_m'),
    bulk_density_g_cm3: weightedAvg('bulk_density_g_cm3'),
    ksat_um_s: weightedAvg('ksat_um_s'),
    kfact: weightedAvg('kfact'),
    awc_cm_cm: weightedAvg('awc_cm_cm'),
    rooting_depth_cm: weightedAvg('rooting_depth_cm'),
    clay_pct: weightedAvg('claytotal_r'),
    silt_pct: weightedAvg('silttotal_r'),
    sand_pct: weightedAvg('sandtotal_r'),
    caco3_pct: weightedAvg('caco3_pct'),
    gypsum_pct: weightedAvg('gypsum_pct'),
    sodium_adsorption_ratio: weightedAvg('sodium_adsorption_ratio'),
    coarse_fragment_pct: (() => {
      const a = weightedAvg('frag3to10_pct');
      const b = weightedAvg('fraggt10_pct');
      if (a === null && b === null) return null;
      return Math.round(((a ?? 0) + (b ?? 0)) * 10) / 10;
    })(),
    base_saturation_pct: weightedAvg('base_saturation_pct'),
    drainage_class: dominant.drainage_class ?? null,
    texture_description: dominant.texture_description ?? null,
    taxonomy_class: dominant.taxonomy_class ?? null,
    dominant_component_name: dominant.component_name ?? null,
    surface_stoniness: dominant.surface_stoniness ?? null,
  };
}

export function deriveTextureClass(clay: number | null, silt: number | null, sand: number | null): string | null {
  if (clay === null || silt === null || sand === null) return null;

  // USDA texture triangle classification
  if (clay >= 40) {
    if (silt >= 40) return 'silty_clay';
    if (sand >= 45) return 'sandy_clay';
    return 'clay';
  }
  if (clay >= 27) {
    if (sand >= 20 && sand <= 45) return 'clay_loam';
    if (silt >= 40) return 'silty_clay_loam';
    return 'sandy_clay_loam';
  }
  if (silt >= 80) return 'silt';
  if (silt >= 50) {
    if (clay >= 12) return 'silt_loam';
    return 'silt_loam';
  }
  if (sand >= 85) return 'sand';
  if (sand >= 70) return 'loamy_sand';
  if (sand >= 52) return 'sandy_loam';
  return 'loam';
}

export function computeFertilityIndex(
  ph: number | null,
  organicCarbonPct: number | null,
  cec: number | null,
  drainageClass: string | null,
): number | null {
  if (ph === null && organicCarbonPct === null && cec === null && drainageClass === null) {
    return null;
  }

  // pH component (0-25)
  let phScore = 0;
  if (ph !== null) {
    if (ph >= 6.0 && ph <= 7.0) phScore = 25;
    else if ((ph >= 5.5 && ph < 6.0) || (ph > 7.0 && ph <= 7.5)) phScore = 18;
    else phScore = 8;
  }

  // OC component (0-25)
  let ocScore = 0;
  if (organicCarbonPct !== null) {
    if (organicCarbonPct >= 3) ocScore = 25;
    else if (organicCarbonPct >= 2) ocScore = 20;
    else if (organicCarbonPct >= 1) ocScore = 12;
    else if (organicCarbonPct >= 0.5) ocScore = 6;
    else ocScore = 2;
  }

  // CEC component (0-25)
  let cecScore = 0;
  if (cec !== null) {
    if (cec >= 20) cecScore = 25;
    else if (cec >= 10) cecScore = 18;
    else if (cec >= 5) cecScore = 10;
    else cecScore = 3;
  }

  // Drainage component (0-25)
  let drainageScore = 0;
  if (drainageClass !== null) {
    const dc = drainageClass.toLowerCase();
    if (dc.includes('well') && !dc.includes('moderately') && !dc.includes('somewhat') && !dc.includes('poorly')) {
      drainageScore = 25;
    } else if (dc.includes('moderately well')) {
      drainageScore = 20;
    } else if (dc.includes('somewhat poorly')) {
      drainageScore = 12;
    } else if (dc.includes('very poorly')) {
      drainageScore = 2;
    } else if (dc.includes('poorly')) {
      drainageScore = 6;
    }
  }

  return phScore + ocScore + cecScore + drainageScore;
}

export function computeSalinizationRisk(
  ec: number | null,
  sar: number | null,
): 'Low' | 'Moderate' | 'High' | 'Severe' {
  const ecVal = ec ?? 0;
  const sarVal = sar ?? 0;

  if (ecVal >= 8 || sarVal >= 15) return 'Severe';
  if (ecVal >= 4 || sarVal >= 10) return 'High';
  if (ecVal >= 2 || sarVal >= 6) return 'Moderate';
  return 'Low';
}

export function determineConfidence(
  mukeysFound: number,
  ph: number | null,
  organicCarbonPct: number | null,
  cec: number | null,
  drainageClass: string | null,
): 'high' | 'medium' | 'low' {
  if (mukeysFound === 0) return 'low';

  const keyProps = [ph, organicCarbonPct, cec, drainageClass];
  const presentCount = keyProps.filter((v) => v !== null).length;

  if (mukeysFound >= 3 && presentCount === 4) return 'high';
  if (mukeysFound >= 1 && presentCount >= 2) return 'medium';
  return 'low';
}

function buildSoilHealthSummary(summary: Omit<SoilSummary, 'soil_health_summary'>): string {
  const parts: string[] = [];

  if (summary.dominant_component_name) {
    parts.push(`Dominant soil: ${summary.dominant_component_name}`);
  }
  if (summary.texture_class) {
    parts.push(`Texture: ${summary.texture_class.replace(/_/g, ' ')}`);
  }
  if (summary.drainage_class) {
    parts.push(`Drainage: ${summary.drainage_class}`);
  }
  if (summary.ph !== null) {
    parts.push(`pH: ${summary.ph}`);
  }
  if (summary.organic_matter_pct !== null) {
    parts.push(`OM: ${summary.organic_matter_pct}%`);
  }
  if (summary.fertility_index !== null) {
    const label = summary.fertility_index >= 75 ? 'High' :
      summary.fertility_index >= 50 ? 'Moderate' :
      summary.fertility_index >= 25 ? 'Low' : 'Very Low';
    parts.push(`Fertility: ${label} (${summary.fertility_index}/100)`);
  }
  if (summary.salinization_risk && summary.salinization_risk !== 'Low') {
    parts.push(`Salinization risk: ${summary.salinization_risk}`);
  }

  return parts.join('. ') + '.';
}

function mapDrainageToTier3(drainageClass: string | null): string {
  if (!drainageClass) return 'moderate';
  const dc = drainageClass.toLowerCase();
  if (dc.includes('very poorly')) return 'very_poor';
  if (dc.includes('poorly')) return 'poor';
  if (dc.includes('well')) return 'well';
  return 'moderate';
}

// ─── SDA Query Helpers ────────────────────────────────────────────────────────

async function postToSda(query: string): Promise<SdaResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SDA_TIMEOUT_MS);

  try {
    const body = new URLSearchParams({
      query,
      format: 'JSON',
    });

    const response = await fetch(SDA_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new AppError(
        'ADAPTER_HTTP_ERROR',
        `SSURGO SDA returned HTTP ${response.status}: ${text.slice(0, 200)}`,
        502,
      );
    }

    const json = await response.json().catch(() => {
      throw new AppError('ADAPTER_PARSE_ERROR', 'SSURGO SDA returned invalid JSON', 502);
    });

    return json as SdaResponse;
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new AppError('ADAPTER_TIMEOUT', 'SSURGO SDA request timed out', 504);
    }
    throw new AppError('ADAPTER_NETWORK', `SSURGO SDA request failed: ${(err as Error).message}`, 502);
  } finally {
    clearTimeout(timeout);
  }
}

function parseSdaRows<T>(response: SdaResponse, columns: string[]): T[] {
  const table = response.Table;
  if (!table || !Array.isArray(table) || table.length < 2) return [];

  // table[0] = column names, table[1+] = data rows
  const colNames = table[0] as string[];
  const colIndexes = columns.map((name) => {
    const idx = colNames.findIndex((c) => (c as string).toLowerCase() === name.toLowerCase());
    return idx;
  });

  const results: T[] = [];
  for (let i = 1; i < table.length; i++) {
    const row = table[i] as unknown[];
    if (!row || !Array.isArray(row)) continue;
    const obj: Record<string, unknown> = {};
    for (let j = 0; j < columns.length; j++) {
      const idx = colIndexes[j]!;
      obj[columns[j]!] = idx >= 0 ? row[idx] ?? null : null;
    }
    results.push(obj as T);
  }

  return results;
}

// ─── Adapter Class ────────────────────────────────────────────────────────────

export class SsurgoAdapter implements DataSourceAdapter {
  constructor(
    public readonly sourceId: string,
    private readonly layerType: LayerType,
  ) {}

  async fetchForBoundary(boundary: unknown, _context: ProjectContext): Promise<AdapterResult> {
    // Step 1: Convert boundary to WKT
    const wkt = boundaryToWkt(boundary);

    // Step 2: Query 1 — Get MUKEYs via spatial intersection
    const mukeyQuery = `
      SELECT mu.mukey, mu.musym, mu.muname,
             c.comppct_r, c.majcompflag, c.compname, c.taxclname,
             c.drainagecl, c.slope_r, c.elev_r
      FROM mapunit mu
      INNER JOIN component c ON c.mukey = mu.mukey
      WHERE mu.mukey IN (
        SELECT * FROM SDA_Get_Mukey_from_intersection_with_WktWgs84('${wkt}')
      )
      AND c.majcompflag = 'Yes'
      ORDER BY c.comppct_r DESC
    `;

    logger.info('Fetching SSURGO mukeys for boundary');
    const mukeyResponse = await postToSda(mukeyQuery);
    const mukeyRows = parseSdaRows<MukeyRow>(mukeyResponse, [
      'mukey', 'musym', 'muname', 'comppct_r', 'majcompflag',
      'compname', 'taxclname', 'drainagecl', 'slope_r', 'elev_r',
    ]);

    // Extract unique mukeys
    const mukeys = [...new Set(mukeyRows.map((r) => r.mukey))];

    // Zero-mukey case: outside SSURGO coverage
    if (mukeys.length === 0) {
      logger.warn('No SSURGO mukeys found — parcel may be outside US coverage');
      return this.buildUnavailableResult();
    }

    // Step 3: Query 2 — Get full soil attributes via horizon query
    const mukeyList = mukeys.map((k) => `'${k}'`).join(', ');
    const horizonQuery = `
      SELECT c.mukey, c.comppct_r,
             h.hzdept_r, h.hzdepb_r,
             h.ph1to1h2o_r AS ph,
             h.om_r AS organic_matter_pct,
             h.cec7_r AS cec_meq_100g,
             h.ec_r AS ec_ds_m,
             h.dbthirdbar_r AS bulk_density_g_cm3,
             h.ksat_r AS ksat_um_s,
             h.kfact_r AS kfact,
             h.awc_r AS awc_cm_cm,
             h.restrdepdh_r AS rooting_depth_cm,
             h.claytotal_r, h.silttotal_r, h.sandtotal_r,
             h.caco3_r AS caco3_pct,
             h.gypsum_r AS gypsum_pct,
             h.sar_r AS sodium_adsorption_ratio,
             h.frag3to10_r AS frag3to10_pct,
             h.fraggt10_r AS fraggt10_pct,
             h.basesat_r AS base_saturation_pct,
             c.drainagecl AS drainage_class,
             c.taxclname AS taxonomy_class,
             c.compname AS component_name,
             c.comppct_r AS component_pct
      FROM component c
      INNER JOIN chorizon h ON h.cokey = c.cokey
      WHERE c.mukey IN (${mukeyList})
        AND c.majcompflag = 'Yes'
        AND h.hzdept_r = 0
      ORDER BY c.comppct_r DESC, h.hzdept_r ASC
    `;

    logger.info({ mukeyCount: mukeys.length }, 'Fetching SSURGO horizon data');
    const horizonResponse = await postToSda(horizonQuery);
    const horizonRows = parseSdaRows<HorizonRow>(horizonResponse, [
      'mukey', 'comppct_r', 'hzdept_r', 'hzdepb_r', 'ph',
      'organic_matter_pct', 'cec_meq_100g', 'ec_ds_m', 'bulk_density_g_cm3',
      'ksat_um_s', 'kfact', 'awc_cm_cm', 'rooting_depth_cm', 'claytotal_r',
      'silttotal_r', 'sandtotal_r', 'caco3_pct', 'gypsum_pct',
      'sodium_adsorption_ratio', 'frag3to10_pct', 'fraggt10_pct', 'base_saturation_pct',
      'drainage_class', 'taxonomy_class',
      'component_name', 'component_pct',
    ]);

    // Coerce string numbers from SDA JSON to actual numbers
    for (const row of horizonRows) {
      for (const key of Object.keys(row) as (keyof HorizonRow)[]) {
        const val = row[key];
        if (typeof val === 'string' && key !== 'drainage_class' && key !== 'taxonomy_class'
          && key !== 'component_name' && key !== 'surface_stoniness'
          && key !== 'texture_description' && key !== 'mukey') {
          const num = parseFloat(val);
          (row as unknown as Record<string, unknown>)[key] = isNaN(num) ? null : num;
        }
      }
    }

    if (horizonRows.length === 0) {
      logger.warn({ mukeyCount: mukeys.length }, 'SSURGO mukeys found but no horizon data');
    }

    // Step 3b: Field-backfill query — all-horizon profiles + restrictive layers.
    // Non-critical: on failure we still return the topsoil-only summary.
    let horizonProfile: SoilHorizon[] = [];
    let restrictiveLayer: RestrictiveLayer | null = null;
    try {
      const profileQuery = `
        SELECT c.mukey, c.comppct_r, c.compname,
               h.hzdept_r, h.hzdepb_r,
               h.ksat_r AS ksat_um_s,
               h.om_r AS organic_matter_pct,
               h.cec7_r AS cec_meq_100g,
               h.claytotal_r, h.silttotal_r, h.sandtotal_r,
               h.frag3to10_r, h.fraggt10_r,
               cr.reskind AS restriction_kind,
               cr.resdept_r AS restriction_depth_cm
        FROM component c
        INNER JOIN chorizon h ON h.cokey = c.cokey
        LEFT JOIN corestrictions cr ON cr.cokey = c.cokey
        WHERE c.mukey IN (${mukeyList})
          AND c.majcompflag = 'Yes'
        ORDER BY c.comppct_r DESC, h.hzdept_r ASC
      `;

      const profileResponse = await postToSda(profileQuery);
      const profileRows = parseSdaRows<Record<string, unknown>>(profileResponse, [
        'mukey', 'comppct_r', 'compname', 'hzdept_r', 'hzdepb_r',
        'ksat_um_s', 'organic_matter_pct', 'cec_meq_100g',
        'claytotal_r', 'silttotal_r', 'sandtotal_r',
        'frag3to10_r', 'fraggt10_r',
        'restriction_kind', 'restriction_depth_cm',
      ]);

      const toNum = (v: unknown): number | null => {
        if (typeof v === 'number') return isNaN(v) ? null : v;
        if (typeof v === 'string') { const n = parseFloat(v); return isNaN(n) ? null : n; }
        return null;
      };

      // Build horizons[] + locate shallowest restriction across all components,
      // weighting the choice by comppct_r so the dominant component wins ties.
      let bestRestriction: RestrictiveLayer | null = null;
      for (const row of profileRows) {
        const dt = toNum(row.hzdept_r);
        const db = toNum(row.hzdepb_r);
        const cpct = toNum(row.comppct_r) ?? 0;
        if (dt === null || db === null) continue;

        const coarse = (() => {
          const a = toNum(row.frag3to10_r);
          const b = toNum(row.fraggt10_r);
          if (a === null && b === null) return null;
          return Math.round(((a ?? 0) + (b ?? 0)) * 10) / 10;
        })();

        horizonProfile.push({
          depth_top_cm: dt,
          depth_bottom_cm: db,
          component_pct: cpct,
          component_name: typeof row.compname === 'string' ? row.compname : null,
          ksat_um_s: toNum(row.ksat_um_s),
          organic_matter_pct: toNum(row.organic_matter_pct),
          clay_pct: toNum(row.claytotal_r),
          silt_pct: toNum(row.silttotal_r),
          sand_pct: toNum(row.sandtotal_r),
          cec_meq_100g: toNum(row.cec_meq_100g),
          coarse_fragment_pct: coarse,
        });

        const rKind = typeof row.restriction_kind === 'string' ? row.restriction_kind : null;
        const rDepth = toNum(row.restriction_depth_cm);
        if (rKind && rDepth !== null) {
          // Prefer dominant-component restriction; within that, the shallowest.
          if (
            !bestRestriction
            || cpct > bestRestriction.component_pct
            || (cpct === bestRestriction.component_pct && rDepth < bestRestriction.depth_cm)
          ) {
            bestRestriction = {
              kind: rKind,
              depth_cm: rDepth,
              component_name: typeof row.compname === 'string' ? row.compname : null,
              component_pct: cpct,
            };
          }
        }
      }
      restrictiveLayer = bestRestriction;
    } catch (err) {
      logger.warn({ err: (err as Error).message }, 'SSURGO profile/restriction query failed — continuing without backfill');
      horizonProfile = [];
      restrictiveLayer = null;
    }

    // Step 4: Compute weighted averages
    const weighted = computeWeightedAverages(horizonRows);

    // Step 5: Derive additional fields
    const organicCarbonPct = weighted.organic_matter_pct !== null
      ? Math.round((weighted.organic_matter_pct / 1.724) * 100) / 100
      : null;

    const textureClass = deriveTextureClass(weighted.clay_pct, weighted.silt_pct, weighted.sand_pct);

    const fertilityIndex = computeFertilityIndex(
      weighted.ph, organicCarbonPct, weighted.cec_meq_100g, weighted.drainage_class,
    );

    const salinizationRisk = computeSalinizationRisk(weighted.ec_ds_m, weighted.sodium_adsorption_ratio);

    const confidence = determineConfidence(
      mukeys.length, weighted.ph, organicCarbonPct, weighted.cec_meq_100g, weighted.drainage_class,
    );

    const dataDate = new Date().toISOString().split('T')[0]!;

    // Assemble summary
    const partialSummary = {
      dominant_component_name: weighted.dominant_component_name,
      taxonomy_class: weighted.taxonomy_class,
      drainage_class: weighted.drainage_class,
      texture_description: weighted.texture_description,
      ph: weighted.ph,
      organic_matter_pct: weighted.organic_matter_pct,
      organic_carbon_pct: organicCarbonPct,
      cec_meq_100g: weighted.cec_meq_100g,
      ec_ds_m: weighted.ec_ds_m,
      bulk_density_g_cm3: weighted.bulk_density_g_cm3,
      ksat_um_s: weighted.ksat_um_s,
      kfact: weighted.kfact,
      awc_cm_cm: weighted.awc_cm_cm,
      rooting_depth_cm: weighted.rooting_depth_cm,
      clay_pct: weighted.clay_pct,
      silt_pct: weighted.silt_pct,
      sand_pct: weighted.sand_pct,
      caco3_pct: weighted.caco3_pct,
      gypsum_pct: weighted.gypsum_pct,
      sodium_adsorption_ratio: weighted.sodium_adsorption_ratio,
      coarse_fragment_pct: weighted.coarse_fragment_pct,
      base_saturation_pct: weighted.base_saturation_pct,
      surface_stoniness: weighted.surface_stoniness,
      texture_class: textureClass,
      fertility_index: fertilityIndex,
      salinization_risk: salinizationRisk,
      mukeys_found: mukeys.length,
      coverage_pct: 100, // SDA returns data for the intersecting area
      data_date: dataDate,
      source_api: 'USDA SSURGO SDA' as const,
      confidence,
      // Tier 3 compatibility aliases
      drainageClass: mapDrainageToTier3(weighted.drainage_class),
      organicMatterPct: weighted.organic_matter_pct,
      textureClass: textureClass?.replace(/ /g, '_') ?? null,
      // Field-backfill: multi-horizon profile + restrictive layer
      horizons: horizonProfile,
      restrictive_layer: restrictiveLayer,
    };

    const summaryData: SoilSummary = {
      ...partialSummary,
      soil_health_summary: buildSoilHealthSummary(partialSummary),
    };

    logger.info({ mukeys: mukeys.length, confidence }, 'SSURGO fetch complete');

    return {
      layerType: this.layerType,
      sourceApi: 'USDA SSURGO SDA',
      attributionText: this.getAttributionText(),
      confidence,
      dataDate,
      summaryData,
    };
  }

  getConfidence(result: AdapterResult): 'high' | 'medium' | 'low' {
    return result.confidence;
  }

  getAttributionText(): string {
    return 'USDA Natural Resources Conservation Service, Soil Survey Geographic Database (SSURGO)';
  }

  private buildUnavailableResult(): AdapterResult {
    return {
      layerType: this.layerType,
      sourceApi: 'USDA SSURGO SDA',
      attributionText: this.getAttributionText(),
      confidence: 'low',
      dataDate: null,
      summaryData: {
        unavailable: true,
        reason: 'outside_ssurgo_coverage',
        dominant_component_name: null,
        taxonomy_class: null,
        drainage_class: null,
        texture_description: null,
        ph: null,
        organic_matter_pct: null,
        organic_carbon_pct: null,
        cec_meq_100g: null,
        ec_ds_m: null,
        bulk_density_g_cm3: null,
        ksat_um_s: null,
        kfact: null,
        awc_cm_cm: null,
        rooting_depth_cm: null,
        clay_pct: null,
        silt_pct: null,
        sand_pct: null,
        caco3_pct: null,
        gypsum_pct: null,
        sodium_adsorption_ratio: null,
        coarse_fragment_pct: null,
        base_saturation_pct: null,
        surface_stoniness: null,
        texture_class: null,
        fertility_index: null,
        salinization_risk: null,
        soil_health_summary: null,
        mukeys_found: 0,
        coverage_pct: 0,
        data_date: new Date().toISOString().split('T')[0],
        source_api: 'USDA SSURGO SDA',
        confidence: 'low' as const,
        drainageClass: null,
        organicMatterPct: null,
        textureClass: null,
      },
    };
  }
}
