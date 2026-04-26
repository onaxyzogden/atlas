/**
 * OntarioMunicipalAdapter — Fetches zoning + land capability data for Ontario (CA) projects.
 *
 * Three data sources queried in parallel:
 *
 * 1. Municipal zoning registry — curated `MUNICIPAL_ZONING_REGISTRY` of verified
 *    open-data ArcGIS REST endpoints for covered southern-Ontario municipalities.
 *    Bbox pre-filter narrows the candidate set (usually to one endpoint) before
 *    fetching the actual bylaw polygon. This is the ONLY source that returns
 *    municipal-bylaw-level zoning codes (e.g. "A1-40 Rural Agricultural").
 *
 * 2. LIO Land Use Planning layers (LIO_Open06 MapServer, layers 4/5/15/26)
 *    Ontario-wide provincial planning layers — CLUPA overlay, provincial designations,
 *    Greenbelt, Niagara Escarpment Plan. Queried sequentially (first match wins).
 *    Fields: ZONE_CODE / DESIGNATION, ZONE_DESC, OFFICIAL_PLAN, MUNICIPALITY.
 *    Acts as provincial fallback when the point is outside the municipal registry.
 *
 * 3. AAFC Canada Land Inventory (CLI) — agricultural land capability classification
 *    CLI class 1-7 + subclass letters (T=topography, W=wetness, E=erosion, etc.)
 *    Queries two service URLs — AAFC reorganizes services periodically.
 *
 * Returns: zoning_code, zoning_description, permitted_uses, conditional_uses,
 *          cli_class (1-7), cli_subclass, cli_capability, cli_limitations,
 *          is_agricultural, official_plan_designation, municipality,
 *          municipal_zoning_code, municipal_zoning_description, municipal_zone_category,
 *          municipal_bylaw_source, registry_coverage
 *
 * Confidence ladder:
 *   - `high`    : municipal registry + AAFC CLI both returned
 *   - `medium`  : municipal registry alone, OR LIO + AAFC CLI
 *   - `low`     : single provincial source only, or structured unavailable
 *
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
const MUNI_TIMEOUT_MS = 10_000;

// ─── Municipal Zoning Registry ────────────────────────────────────────────────
//
// Curated map of southern-Ontario municipalities to their open-data ArcGIS REST
// zoning endpoints. A bbox pre-filter scopes candidate endpoints so we typically
// only query one municipality per point. Adding a new municipality requires
// only a registry entry — zero code changes.
//
// License: all endpoints below are published under a municipal open-data licence
// (MOL) or OGL-Ontario 1.0, compatible with commercial redistribution with
// attribution. Each entry carries the attribution string served to the user.

interface MunicipalFieldMap {
  /** Primary zoning-code field, e.g. ZN_ZONE, ZN_CODE2, ZONING */
  code: string;
  /** Secondary descriptor: long name or zone label */
  description?: string;
  /** Category / group (ResidentialLow, Commercial, Employment, …) */
  category?: string;
  /** Subzones / overlays / holding provisions — joined into overlay field */
  overlay?: string;
}

interface MunicipalEndpoint {
  /** Registry key — stable lowercase slug */
  key: string;
  /** Display name */
  label: string;
  /** ArcGIS REST URL up to and including the MapServer/FeatureServer path */
  baseUrl: string;
  /** Integer layer id */
  layerId: number;
  /** Field-name map for this endpoint */
  fields: MunicipalFieldMap;
  /** Bounding box [minLng, minLat, maxLng, maxLat] — used as a cheap pre-filter */
  bbox: [number, number, number, number];
  /** Attribution text (served as `source_api` fragment) */
  attribution: string;
}

/**
 * Southern-Ontario municipal zoning endpoints (verified 2026-04-22).
 *
 * Focused on Halton / GTA / Ottawa / Barrie per operator brief. Each entry has
 * been probed against its root service and its field names have been read from
 * the layer definition. Rural townships outside these bboxes fall through to
 * LIO+CLI automatically.
 */
const MUNICIPAL_ZONING_REGISTRY: MunicipalEndpoint[] = [
  {
    key: 'toronto',
    label: 'City of Toronto',
    baseUrl: 'https://services3.arcgis.com/b9WvedVPoizGfvfD/ArcGIS/rest/services/COTGEO_ZBL_ZONE/FeatureServer',
    layerId: 0,
    fields: { code: 'ZN_ZONE', description: 'ZN_STRING', category: 'ZN_LU_CATEGORY', overlay: 'ZN_HOLDING' },
    bbox: [-79.6393, 43.5810, -79.1152, 43.8555],
    attribution: 'City of Toronto Zoning By-law 569-2013 — Toronto Open Data (Open Government Licence — Toronto)',
  },
  {
    key: 'ottawa',
    label: 'City of Ottawa',
    baseUrl: 'https://maps.ottawa.ca/arcgis/rest/services/Zoning_Bylaw_2026_50/MapServer',
    layerId: 0,
    fields: { code: 'ZN_CODE2', description: 'ZNAME_EN', category: 'ZGROUP_EN', overlay: 'Z_SUBZONES2' },
    bbox: [-76.3558, 44.9617, -75.2465, 45.5375],
    attribution: 'City of Ottawa New Zoning By-law 2026-50 — Open Ottawa (Open Data Licence — City of Ottawa)',
  },
  {
    key: 'mississauga',
    label: 'City of Mississauga',
    baseUrl: 'https://services6.arcgis.com/hM5ymMLbxIyWTjn2/arcgis/rest/services/Mississauga_Zoning_Bylaw/FeatureServer',
    layerId: 0,
    fields: { code: 'ZONE_CODE', description: 'ZONE_DESC', category: 'ZONE_CATEGORY' },
    bbox: [-79.8391, 43.4948, -79.5185, 43.7097],
    attribution: 'City of Mississauga Zoning By-law — Data Mississauga Open Data (MOL)',
  },
  {
    key: 'burlington',
    label: 'City of Burlington',
    baseUrl: 'https://mapping.burlington.ca/arcgisweb/rest/services/COB/Zoning_ByLaw/MapServer',
    layerId: 6,
    fields: { code: 'ZONING', description: 'DESCRIPTION' },
    bbox: [-79.9897, 43.3197, -79.6896, 43.4552],
    attribution: 'City of Burlington Zoning By-law — Burlington Open Data (MOL)',
  },
  {
    key: 'barrie',
    label: 'City of Barrie',
    baseUrl: 'https://gispublic.barrie.ca/arcgis/rest/services/Open_Data/Planning/MapServer',
    layerId: 0,
    fields: { code: 'ZONING', description: 'DESCRIPT', overlay: 'SPECIAL' },
    bbox: [-79.7450, 44.3210, -79.5800, 44.4450],
    attribution: 'City of Barrie Zoning By-law — Barrie Open Data (MOL)',
  },
  {
    key: 'oakville',
    label: 'Town of Oakville',
    baseUrl: 'https://maps.oakville.ca/oakgis/rest/services/SBS/Zoning_By_law_2014_014/FeatureServer',
    layerId: 10,
    fields: { code: 'ZONE', description: 'ZONE_DESC', category: 'CLASS', overlay: 'SP_DESC' },
    bbox: [-79.7708, 43.3837, -79.6200, 43.5400],
    attribution: 'Town of Oakville Zoning By-law 2014-014 — Oakville Open Data (MOL)',
  },
  {
    key: 'milton-urban',
    label: 'Town of Milton (Urban)',
    baseUrl: 'https://api.milton.ca/arcgis/rest/services/WebMaps/UrbanZoning_202512171429/MapServer',
    layerId: 8,
    fields: { code: 'ZONECODE', description: 'ZONING', overlay: 'LABEL' },
    bbox: [-79.9100, 43.4800, -79.7800, 43.5650],
    attribution: 'Town of Milton Urban Zoning By-law 016-2014 — Milton Open Data (MOL)',
  },
  {
    key: 'milton-rural',
    label: 'Town of Milton (Rural)',
    baseUrl: 'https://api.milton.ca/arcgis/rest/services/WebMaps/RuralZoning/MapServer',
    layerId: 9,
    fields: { code: 'ZONECODE', description: 'ZONING', overlay: 'LABEL' },
    bbox: [-80.0200, 43.5400, -79.8000, 43.7200],
    attribution: 'Town of Milton Rural Zoning By-law 144-2003 — Milton Open Data (MOL)',
  },
];

interface MunicipalZoningResult {
  municipalityLabel: string;
  zoningCode: string;
  zoningDescription: string | null;
  zoneCategory: string | null;
  overlay: string | null;
  attribution: string;
}

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
  // --- Municipal bylaw fields (registry-backed) ---
  municipal_zoning_code: string | null;
  municipal_zoning_description: string | null;
  municipal_zone_category: string | null;
  municipal_bylaw_source: string | null;
  registry_coverage: boolean;
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

/**
 * Pre-filter registry candidates whose bbox contains the point. Typically
 * returns 0 or 1 entry since southern-Ontario municipal bboxes don't overlap.
 */
function candidateMunicipalities(lat: number, lng: number): MunicipalEndpoint[] {
  return MUNICIPAL_ZONING_REGISTRY.filter((m) => {
    const [minLng, minLat, maxLng, maxLat] = m.bbox;
    return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
  });
}

/**
 * Query a single municipal endpoint for zoning at the point.
 * Returns null on any failure (timeout, no features, service error).
 */
async function queryMunicipalEndpoint(
  lat: number,
  lng: number,
  endpoint: MunicipalEndpoint,
): Promise<MunicipalZoningResult | null> {
  const isFeatureServer = endpoint.baseUrl.includes('FeatureServer');
  const queryUrl = `${endpoint.baseUrl}/${endpoint.layerId}/query`;

  const outFieldList = [
    endpoint.fields.code,
    endpoint.fields.description,
    endpoint.fields.category,
    endpoint.fields.overlay,
  ].filter((f): f is string => Boolean(f));
  const outFields = outFieldList.length > 0 ? outFieldList.join(',') : '*';

  const params = new URLSearchParams({
    geometry: `${lng},${lat}`,
    geometryType: 'esriGeometryPoint',
    spatialRel: 'esriSpatialRelIntersects',
    outFields,
    returnGeometry: 'false',
    f: 'json',
    ...(isFeatureServer ? {} : { inSR: '4326', outSR: '4326' }),
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MUNI_TIMEOUT_MS);

  try {
    const response = await fetch(`${queryUrl}?${params}`, { signal: controller.signal });
    if (!response.ok) return null;

    const data = await response.json().catch(() => null) as {
      features?: { attributes: Record<string, unknown> }[];
      error?: { message?: string };
    } | null;

    if (!data || data.error) return null;
    const features = data.features;
    if (!features || features.length === 0) return null;

    const attrs = features[0]!.attributes;

    const pickStr = (field: string | undefined): string | null => {
      if (!field) return null;
      const raw = attrs[field];
      if (raw === null || raw === undefined) return null;
      const v = String(raw).trim();
      if (!v || v === 'Unknown' || v === 'N/A') return null;
      return v;
    };

    const code = pickStr(endpoint.fields.code);
    if (!code) return null;

    return {
      municipalityLabel: endpoint.label,
      zoningCode: code,
      zoningDescription: pickStr(endpoint.fields.description),
      zoneCategory: pickStr(endpoint.fields.category),
      overlay: pickStr(endpoint.fields.overlay),
      attribution: endpoint.attribution,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Check each candidate municipal endpoint for a zoning polygon at the point.
 * Returns the first successful result. Candidates are bbox-pre-filtered so
 * typically only 0-1 requests fire.
 */
async function fetchMunicipalZoning(lat: number, lng: number): Promise<MunicipalZoningResult | null> {
  const candidates = candidateMunicipalities(lat, lng);
  if (candidates.length === 0) return null;

  // Fire candidates in parallel — usually 1 entry, occasionally 2 near borders.
  const settled = await Promise.allSettled(
    candidates.map((c) => queryMunicipalEndpoint(lat, lng, c)),
  );
  for (const r of settled) {
    if (r.status === 'fulfilled' && r.value) return r.value;
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
    logger.info({ lat, lng }, 'Fetching Ontario municipal registry + LIO + AAFC CLI zoning data');

    // Query all three sources in parallel
    const [muniSettled, lioSettled, cliSettled] = await Promise.allSettled([
      fetchMunicipalZoning(lat, lng),
      fetchLioPlanning(lat, lng),
      fetchAafcCli(lat, lng),
    ]);

    const muni = muniSettled.status === 'fulfilled' ? muniSettled.value : null;
    const lio  = lioSettled.status  === 'fulfilled' ? lioSettled.value  : null;
    const cli  = cliSettled.status  === 'fulfilled' ? cliSettled.value  : null;

    let summary: OntarioZoningSummary;

    if (!muni && !lio && !cli) {
      // No source returned usable data — structured unavailable
      const explanation =
        'Ontario municipal zoning data is published through LIO and participating municipal ' +
        'open-data portals, but not all areas have digitized zoning bylaws. AAFC CLI coverage ' +
        'may not extend to all areas. Contact your local municipal planning department for ' +
        'official zoning information.';

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
        source_api: 'Municipal registry / LIO / AAFC CLI (unavailable for this area)',
        confidence: 'low',
        municipal_zoning_code: null,
        municipal_zoning_description: null,
        municipal_zone_category: null,
        municipal_bylaw_source: null,
        registry_coverage: false,
      };
    } else {
      // Prefer municipal bylaw code (most specific); otherwise fall back to LIO designation.
      const zoningCode = muni?.zoningCode ?? lio?.zoningCode ?? lio?.officialPlan ?? 'Unknown';
      const zoningDescParts: string[] = [zoningCode];
      if (muni?.zoningDescription)      zoningDescParts.push(muni.zoningDescription);
      else if (lio?.zoningDescription)  zoningDescParts.push(lio.zoningDescription);
      const zoningDesc = zoningDescParts.length > 1
        ? `${zoningDescParts[0]} — ${zoningDescParts.slice(1).join(' / ')}`
        : zoningDescParts[0]!;

      const details = inferZoningDetails(zoningCode);
      const isAg = details.isAgricultural || (cli ? cli.cliClass <= 4 : false);

      const subclassExplanation = cli?.subclass
        ? cli.subclass.split('').map((c) => CLI_SUBCLASS_DESCRIPTIONS[c]).filter(Boolean).join('; ')
        : null;

      const sources: string[] = [];
      if (muni) sources.push(`${muni.municipalityLabel} (bylaw)`);
      if (lio)  sources.push('Ontario LIO (Planning)');
      if (cli)  sources.push('AAFC CLI');

      // Confidence ladder:
      //   high   = municipal bylaw + CLI
      //   medium = municipal bylaw alone, or LIO + CLI
      //   low    = single provincial source only
      let confidence: 'high' | 'medium' | 'low';
      if (muni && cli)            confidence = 'high';
      else if (muni || (lio && cli)) confidence = 'medium';
      else                        confidence = 'low';

      summary = {
        zoning_code: zoningCode,
        zoning_description: zoningDesc,
        permitted_uses: details.permitted_uses,
        conditional_uses: details.conditional_uses,
        official_plan_designation: lio?.officialPlan ?? null,
        municipality: muni?.municipalityLabel ?? lio?.municipality ?? null,
        cli_class: cli?.cliClass ?? null,
        cli_subclass: cli?.subclass || null,
        cli_capability: cli?.capability ?? null,
        cli_limitations: subclassExplanation,
        is_agricultural: isAg,
        data_available: true,
        source_api: sources.join(' + '),
        confidence,
        municipal_zoning_code: muni?.zoningCode ?? null,
        municipal_zoning_description: muni?.zoningDescription ?? null,
        municipal_zone_category: muni?.zoneCategory ?? null,
        municipal_bylaw_source: muni?.attribution ?? null,
        registry_coverage: muni !== null,
      };
    }

    logger.info(
      {
        zoneCode: summary.zoning_code,
        municipality: summary.municipality,
        registryCoverage: summary.registry_coverage,
        cliClass: summary.cli_class,
        isAg: summary.is_agricultural,
        confidence: summary.confidence,
      },
      'Ontario municipal + LIO + CLI fetch complete',
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
      'LIO_Open06 Planning Layers; Agriculture and Agri-Food Canada — Canada Land Inventory (CLI); ' +
      'City of Toronto Zoning By-law 569-2013; City of Ottawa Zoning By-law 2026-50; ' +
      'City of Mississauga Zoning By-law; City of Burlington Zoning By-law; City of Barrie Zoning By-law; ' +
      'Town of Oakville Zoning By-law 2014-014; Town of Milton Urban Zoning By-law 016-2014; ' +
      'Town of Milton Rural Zoning By-law 144-2003'
    );
  }
}

// Exported for tests
export const __MUNICIPAL_ZONING_REGISTRY_FOR_TESTS = MUNICIPAL_ZONING_REGISTRY;
export { candidateMunicipalities as __candidateMunicipalitiesForTests };
