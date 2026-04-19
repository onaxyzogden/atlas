/**
 * OntarioMunicipalAdapter — Fetches zoning + land capability data for Ontario (CA) projects.
 *
 * Two data sources queried in parallel:
 *
 * 1. LIO Land Use Planning layers (LIO_Open06 MapServer, layers 4/5/15/26)
 *    Ontario-wide provincial planning layers — CLUPA overlay, provincial designations,
 *    Greenbelt, Niagara Escarpment Plan. Queried sequentially (first match wins).
 *    Fields: ZONE_CODE / DESIGNATION, ZONE_DESC, OFFICIAL_PLAN, MUNICIPALITY
 *
 * 2. AAFC Canada Land Inventory (CLI) — agricultural land capability classification
 *    CLI class 1-7 + subclass letters (T=topography, W=wetness, E=erosion, etc.)
 *    Queries two service URLs — AAFC reorganizes services periodically.
 *
 * Returns: zoning_code, zoning_description, permitted_uses, conditional_uses,
 *          cli_class (1-7), cli_subclass, cli_capability, cli_limitations,
 *          is_agricultural, official_plan_designation, municipality
 *
 * Confidence: medium when both sources return data, low when only one does.
 * Returns a structured "unavailable" result (not an error) when no data is found.
 *
 * Fourteenth (final) live adapter in the pipeline — completes 100% Tier 1 coverage.
 */

import pino from 'pino';
import type { LayerType } from '@ogden/shared';
import type { DataSourceAdapter, AdapterResult, ProjectContext } from '../DataPipelineOrchestrator.js';
import { AppError } from '../../../lib/errors.js';

const logger = pino({ name: 'OntarioMunicipalAdapter' });

const LIO_OPEN06_BASE =
  'https://ws.lioservices.lrc.gov.on.ca/arcgis1071a/rest/services/LIO_OPEN_DATA/LIO_Open06/MapServer';

// LIO Open06 layer indices that contain provincial land use planning data
const LIO_PLANNING_LAYERS = [4, 5, 15, 26];

const AAFC_CLI_URLS = [
  'https://agriculture.canada.ca/atlas/rest/services/mapservices/aafc_canada_land_inventory_cli/MapServer/0/query',
  'https://agriculture.canada.ca/atlas/rest/services/mapservices/aafc_cli_detailed_soil_survey/MapServer/0/query',
];

const LIO_TIMEOUT_MS  = 12_000;
const AAFC_TIMEOUT_MS = 10_000;

// ─── CLI class descriptions ───────────────────────────────────────────────────

const CLI_CLASS_DESCRIPTIONS: Record<number, string> = {
  1: 'Class 1 — No significant limitations for crops',
  2: 'Class 2 — Moderate limitations, restricts range of crops',
  3: 'Class 3 — Moderately severe limitations, restricts range of crops',
  4: 'Class 4 — Severe limitations, restricts to special crops',
  5: 'Class 5 — Forage crops only, improvement practices feasible',
  6: 'Class 6 — Forage crops only, improvement not feasible',
  7: 'Class 7 — No agricultural capability',
};

const CLI_SUBCLASS_DESCRIPTIONS: Record<string, string> = {
  T: 'Topography limitation',
  W: 'Excess water / poor drainage',
  E: 'Erosion damage',
  S: 'Soil limitation (structure, depth, salinity)',
  D: 'Undesirable soil structure',
  F: 'Low fertility',
  M: 'Moisture limitation (droughtiness)',
  I: 'Inundation (flooding)',
  P: 'Stoniness',
  R: 'Shallowness to bedrock',
  C: 'Adverse climate',
  X: 'Minor, cumulative adverse characteristics',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface LioZoningResult {
  zoningCode: string | null;
  zoningDescription: string | null;
  officialPlan: string | null;
  municipality: string | null;
}

interface CliResult {
  cliClass: number;
  subclass: string;
  capability: string;
}

interface OntarioZoningSummary {
  zoning_code: string;
  zoning_description: string;
  permitted_uses: string[];
  conditional_uses: string[];
  official_plan_designation: string | null;
  municipality: string | null;
  cli_class: number | null;
  cli_subclass: string | null;
  cli_capability: string | null;
  cli_limitations: string | null;
  is_agricultural: boolean;
  data_available: boolean;
  source_api: string;
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

/**
 * Query LIO_Open06 planning layers sequentially — first match with useful fields wins.
 */
async function fetchLioPlanning(lat: number, lng: number): Promise<LioZoningResult | null> {
  const envelope = `${lng - 0.005},${lat - 0.005},${lng + 0.005},${lat + 0.005}`;

  for (const layerId of LIO_PLANNING_LAYERS) {
    const url =
      `${LIO_OPEN06_BASE}/${layerId}/query` +
      `?geometry=${envelope}&geometryType=esriGeometryEnvelope` +
      `&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=false&f=json`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), LIO_TIMEOUT_MS);

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) continue;

      const data = await response.json().catch(() => null) as {
        features?: { attributes: Record<string, unknown> }[];
      } | null;

      const features = data?.features;
      if (!features || features.length === 0) continue;

      const attrs = features[0]!.attributes;

      // Field fallback chains — LIO field names vary by layer and service version
      const zoningCode = [
        'ZONE_CODE', 'ZONING', 'ZONE', 'ZONING_CODE', 'ZN_CODE', 'ZONECODE',
        'DESIGNATION', 'ZONE_TYPE', 'LAND_USE_CATEGORY',
      ].reduce<string | null>((acc, f) => acc ?? (attrs[f] != null ? String(attrs[f]) : null), null);

      const zoningDescription = [
        'ZONE_DESC', 'ZONING_DESC', 'DESCRIPTION', 'ZONE_NAME', 'ZONING_NAME', 'DESC_',
        'DESIGNATION_DESC', 'LAND_USE_DESC',
      ].reduce<string | null>((acc, f) => acc ?? (attrs[f] != null ? String(attrs[f]) : null), null);

      const officialPlan = [
        'OFFICIAL_PLAN', 'OP_DESIGNATION', 'OP_DESIG',
        'PLAN_DESIGNATION', 'LAND_USE_DESIGNATION',
      ].reduce<string | null>((acc, f) => acc ?? (attrs[f] != null ? String(attrs[f]) : null), null);

      const municipality = [
        'MUNICIPALITY', 'MUNICIPALITY_NAME', 'MUNIC_NAME',
        'MUNI_NAME', 'UPPER_TIER', 'LOWER_TIER',
      ].reduce<string | null>((acc, f) => acc ?? (attrs[f] != null ? String(attrs[f]) : null), null);

      // Return on first layer that has at least one useful field
      if (zoningCode || zoningDescription || officialPlan) {
        return {
          zoningCode:        zoningCode        ? zoningCode.trim()        : null,
          zoningDescription: zoningDescription ? zoningDescription.trim() : null,
          officialPlan:      officialPlan      ? officialPlan.trim()      : null,
          municipality:      municipality      ? municipality.trim()      : null,
        };
      }
    } catch {
      // Layer failed — try next
    } finally {
      clearTimeout(timeout);
    }
  }

  return null;
}

/**
 * Query AAFC Canada Land Inventory for agricultural land capability.
 * Tries two service URLs in sequence.
 */
async function fetchAafcCli(lat: number, lng: number): Promise<CliResult | null> {
  const params = new URLSearchParams({
    geometry: `${lng},${lat}`,
    geometryType: 'esriGeometryPoint',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: '*',
    returnGeometry: 'false',
    f: 'json',
  });

  for (const serviceUrl of AAFC_CLI_URLS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AAFC_TIMEOUT_MS);

    try {
      const response = await fetch(`${serviceUrl}?${params}`, { signal: controller.signal });
      if (!response.ok) continue;

      const data = await response.json().catch(() => null) as {
        features?: { attributes: Record<string, unknown> }[];
        error?: { message?: string };
      } | null;

      if (!data || data.error) continue;

      const features = data.features;
      if (!features || features.length === 0) continue;

      const attrs = features[0]!.attributes;

      const rawClass = [
        'CLI_CLASS', 'CLASS', 'CAPABILITY_CLASS', 'SOIL_CLASS', 'AG_CLASS', 'CLI',
      ].reduce<unknown>((acc, f) => acc ?? attrs[f], null);

      if (rawClass === null || rawClass === undefined) continue;

      const cliClass = typeof rawClass === 'number' ? rawClass : parseInt(String(rawClass), 10);
      if (isNaN(cliClass) || cliClass < 1 || cliClass > 7) continue;

      const rawSubclass = [
        'CLI_SUBCLASS', 'SUBCLASS', 'CAPABILITY_SUBCLASS', 'LIMITATION', 'LIMIT_CODE',
      ].reduce<unknown>((acc, f) => acc ?? attrs[f], null);

      const subclass = String(rawSubclass ?? '').replace(/[^A-Za-z]/g, '').toUpperCase();

      return {
        cliClass,
        subclass,
        capability: CLI_CLASS_DESCRIPTIONS[cliClass] ?? `Class ${cliClass}`,
      };
    } catch {
      continue;
    } finally {
      clearTimeout(timeout);
    }
  }

  return null;
}

/** Infer agricultural + use characteristics from an Ontario planning code. */
function inferZoningDetails(code: string): {
  permitted_uses: string[];
  conditional_uses: string[];
  isAgricultural: boolean;
} {
  const c = code.toUpperCase();
  const isAg = /^(A|AG|AR|NEC.*AGRI|EP.*AGRI)/i.test(c) ||
    c.includes('AGRI') || c.includes('FARM') || c.includes('RURAL');
  const isGreenbelt = c.includes('GREENBELT') || c.includes('GREEN BELT');
  const isNaturalHeritage = c.includes('NATURAL') || c.includes('HERITAGE') ||
    c.includes('ENVIRON') || c.includes('EP') || c.includes('NHS');
  const isResidential = c.includes('RESID') || c.includes('DWELLING');
  const isCommercial = c.includes('COMMERC') || c.includes('BUSINESS');
  const isIndustrial = c.includes('INDUSTRI') || c.includes('MANUFACTUR');

  if (isAg) {
    return {
      permitted_uses: ['Agricultural operation', 'Farm dwellings', 'Farm buildings', 'Forestry'],
      conditional_uses: ['Agritourism', 'Bed & breakfast', 'Home occupation', 'Agricultural-related uses'],
      isAgricultural: true,
    };
  }
  if (isGreenbelt) {
    return {
      permitted_uses: ['Agriculture', 'Conservation', 'Outdoor recreation'],
      conditional_uses: ['Farm-related commercial', 'Agritourism'],
      isAgricultural: true,
    };
  }
  if (isNaturalHeritage) {
    return {
      permitted_uses: ['Conservation', 'Passive recreation', 'Environmental protection'],
      conditional_uses: ['Limited low-impact recreation'],
      isAgricultural: false,
    };
  }
  if (isResidential) {
    return {
      permitted_uses: ['Residential dwelling'],
      conditional_uses: ['Home occupation', 'Secondary suite'],
      isAgricultural: false,
    };
  }
  if (isCommercial) {
    return {
      permitted_uses: ['Commercial use', 'Retail', 'Office'],
      conditional_uses: ['Mixed use'],
      isAgricultural: false,
    };
  }
  if (isIndustrial) {
    return {
      permitted_uses: ['Industrial use', 'Manufacturing'],
      conditional_uses: ['Heavy commercial'],
      isAgricultural: false,
    };
  }
  return {
    permitted_uses: ['See municipal zoning bylaw for permitted uses'],
    conditional_uses: [],
    isAgricultural: false,
  };
}

// ─── Adapter Class ────────────────────────────────────────────────────────────

export class OntarioMunicipalAdapter implements DataSourceAdapter {
  constructor(
    public readonly sourceId: string,
    private readonly layerType: LayerType,
  ) {}

  async fetchForBoundary(boundary: unknown, context: ProjectContext): Promise<AdapterResult> {
    const { lat, lng } = extractCentroid({ ...context, boundaryGeojson: boundary });
    logger.info({ lat, lng }, 'Fetching Ontario LIO planning + AAFC CLI zoning data');

    // Query both sources in parallel
    const [lioSettled, cliSettled] = await Promise.allSettled([
      fetchLioPlanning(lat, lng),
      fetchAafcCli(lat, lng),
    ]);

    const lio = lioSettled.status === 'fulfilled' ? lioSettled.value : null;
    const cli = cliSettled.status === 'fulfilled' ? cliSettled.value : null;

    let summary: OntarioZoningSummary;

    if (!lio && !cli) {
      // Neither source returned usable data — structured unavailable
      const explanation =
        'Ontario municipal zoning data is published through LIO, but not all municipalities have ' +
        'digitized their zoning bylaws. AAFC CLI coverage may not extend to all areas. ' +
        'Contact your local municipal planning department for official zoning information.';

      summary = {
        zoning_code: 'Data not available for this area',
        zoning_description: explanation,
        permitted_uses: [],
        conditional_uses: [],
        official_plan_designation: null,
        municipality: null,
        cli_class: null,
        cli_subclass: null,
        cli_capability: null,
        cli_limitations: null,
        is_agricultural: false,
        data_available: false,
        source_api: 'LIO / AAFC CLI (unavailable for this area)',
        confidence: 'low',
      };
    } else {
      const zoningCode = lio?.zoningCode ?? lio?.officialPlan ?? 'Unknown';
      const zoningDesc = lio?.zoningDescription
        ? `${zoningCode} — ${lio.zoningDescription}`
        : zoningCode;

      const details = inferZoningDetails(zoningCode);
      const isAg = details.isAgricultural || (cli ? cli.cliClass <= 4 : false);

      const subclassExplanation = cli?.subclass
        ? cli.subclass.split('').map((c) => CLI_SUBCLASS_DESCRIPTIONS[c]).filter(Boolean).join('; ')
        : null;

      const sources: string[] = [];
      if (lio)  sources.push('Ontario LIO (Planning)');
      if (cli)  sources.push('AAFC CLI');

      const confidence: 'medium' | 'low' = (lio && cli) ? 'medium' : 'low';

      summary = {
        zoning_code: zoningCode,
        zoning_description: zoningDesc,
        permitted_uses: details.permitted_uses,
        conditional_uses: details.conditional_uses,
        official_plan_designation: lio?.officialPlan ?? null,
        municipality: lio?.municipality ?? null,
        cli_class: cli?.cliClass ?? null,
        cli_subclass: cli?.subclass || null,
        cli_capability: cli?.capability ?? null,
        cli_limitations: subclassExplanation,
        is_agricultural: isAg,
        data_available: true,
        source_api: sources.join(' + '),
        confidence,
      };
    }

    logger.info(
      {
        zoneCode: summary.zoning_code,
        cliClass: summary.cli_class,
        isAg: summary.is_agricultural,
        confidence: summary.confidence,
      },
      'Ontario zoning + CLI fetch complete',
    );

    return {
      layerType: this.layerType,
      sourceApi: summary.source_api,
      attributionText: this.getAttributionText(),
      confidence: summary.confidence,
      dataDate: new Date().toISOString().split('T')[0]!,
      summaryData: summary,
    };
  }

  getConfidence(result: AdapterResult): 'high' | 'medium' | 'low' {
    return result.confidence;
  }

  getAttributionText(): string {
    return (
      'Ontario Ministry of Natural Resources and Forestry — Land Information Ontario (LIO), ' +
      'LIO_Open06 Planning Layers; Agriculture and Agri-Food Canada — Canada Land Inventory (CLI)'
    );
  }
}
