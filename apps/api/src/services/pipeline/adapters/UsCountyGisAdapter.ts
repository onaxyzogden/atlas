/**
 * UsCountyGisAdapter — Fetches zoning data for US projects.
 *
 * Two-step process:
 * 1. FCC Census Block API — resolve (lat, lng) → county FIPS + county name + state
 *    https://geo.fcc.gov/api/census/area  (no auth required)
 *
 * 2. Curated COUNTY_ZONING_REGISTRY — maps FIPS → ArcGIS REST endpoint
 *    If county is in registry: query the endpoint, extract zone code + description + overlay
 *    If county is not in registry: return a structured "unavailable" result with guidance
 *    (This is an intentional, non-error outcome for unregistered counties)
 *
 * Derives permitted_uses, conditional_uses, is_agricultural from zone code pattern matching.
 *
 * Confidence: always 'medium' — county GIS data is authoritative but setback/bulk standards
 * require further lookup from the county's zoning ordinance PDF.
 *
 * Falls back gracefully at every step — never throws.
 *
 * Thirteenth live adapter in the pipeline.
 */

import pino from 'pino';
import type { LayerType } from '@ogden/shared';
import type { DataSourceAdapter, AdapterResult, ProjectContext } from '../DataPipelineOrchestrator.js';
import { AppError } from '../../../lib/errors.js';

const logger = pino({ name: 'UsCountyGisAdapter' });

const FCC_GEOCODER_URL = 'https://geo.fcc.gov/api/census/area';
const ARCGIS_TIMEOUT_MS = 12_000;
const FCC_TIMEOUT_MS    = 8_000;

// ─── County Zoning Registry ───────────────────────────────────────────────────
//
// Curated map of county FIPS → ArcGIS REST endpoint.
// Each entry specifies the MapServer/FeatureServer URL, layer index, and field mapping.
// Adding a new county requires only a new data entry — zero code changes.

interface ZoningFieldMap {
  zone: string;          // Primary zoning code field
  description?: string;  // Human-readable description field
  overlay?: string;      // Overlay district field
}

interface CountyEndpoint {
  url: string;           // ArcGIS REST MapServer/FeatureServer base URL
  layerId: number;       // Layer index
  fields: ZoningFieldMap;
  countyLabel: string;   // Display name for attribution
}

const COUNTY_ZONING_REGISTRY: Record<string, CountyEndpoint> = {
  // Lancaster County, PA — PA Dutch country agriculture
  '42071': {
    url: 'https://arcgis.lancastercountypa.gov/arcgis/rest/services/PA_Zoning/MapServer',
    layerId: 0,
    fields: { zone: 'ZONING', description: 'FULLNAME' },
    countyLabel: 'Lancaster County, PA',
  },
  // Loudoun County, VA — rural/suburban transition
  '51107': {
    url: 'https://logis.loudoun.gov/gis/rest/services/COL/Zoning/MapServer',
    layerId: 3,
    fields: { zone: 'ZD_ZONE_NAME', description: 'ZD_ZONE_DESC' },
    countyLabel: 'Loudoun County, VA',
  },
  // Buncombe County, NC — western NC mountain agriculture
  '37021': {
    url: 'https://gis.buncombecounty.org/arcgis/rest/services/bcmap_vt/MapServer',
    layerId: 19,
    fields: { zone: 'ZONING_CODE' },
    countyLabel: 'Buncombe County, NC',
  },
  // Hamilton County, OH — Ohio River Valley agriculture
  '39061': {
    url: 'https://cagisonline.hamilton-co.org/arcgis/rest/services/Countywide_Layers/Zoning/MapServer',
    layerId: 21,
    fields: { zone: 'ZONING', description: 'ZONE_DESCRIPTION', overlay: 'ZONETYPE' },
    countyLabel: 'Hamilton County, OH',
  },
  // Dane County, WI — dairy country
  '55025': {
    url: 'https://dcimapapps.countyofdane.com/arcgissrv/rest/services/Zoning/MapServer',
    layerId: 3,
    fields: { zone: 'ZONING_DISTRICT', description: 'ZONING_CATAGORY' },
    countyLabel: 'Dane County, WI',
  },
  // Washington County, OR — Willamette Valley agriculture
  '41067': {
    url: 'https://gispub.co.washington.or.us/server/rest/services/LUT_PDS/Planning_Layers/MapServer',
    layerId: 0,
    fields: { zone: 'LUD' },
    countyLabel: 'Washington County, OR',
  },
  // Sonoma County, CA — wine country agriculture
  '06097': {
    url: 'https://services9.arcgis.com/vrAor4t4EOQc8QLZ/ArcGIS/rest/services/Sonoma_Zoning/FeatureServer',
    layerId: 0,
    fields: { zone: 'BASEZONING', overlay: 'DISTRICT' },
    countyLabel: 'Sonoma County, CA',
  },
  // Boulder County, CO — agriculture + conservation
  '08013': {
    url: 'https://maps.bouldercounty.org/ArcGIS/rest/services/PLANNING/LUC_ZoningDistricts/MapServer',
    layerId: 0,
    fields: { zone: 'ZONECLASS', description: 'ZONEDESC' },
    countyLabel: 'Boulder County, CO',
  },
  // Whatcom County, WA — dairy and berry farming
  '53073': {
    url: 'https://gis.whatcomcounty.us/arcgis/rest/services/EnterprisePublishing/WhatcomCo_Planning/MapServer',
    layerId: 0,
    fields: { zone: 'ZONING' },
    countyLabel: 'Whatcom County, WA',
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface ZoningSummary {
  zoning_code: string;
  zoning_description: string;
  permitted_uses: string[];
  conditional_uses: string[];
  county_name: string | null;
  state_code: string | null;
  overlay_districts: string[];
  is_agricultural: boolean;
  registry_coverage: boolean;  // true = county in registry, false = unavailable result
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

async function resolveCountyFips(lat: number, lng: number): Promise<{
  fips: string;
  countyName: string;
  stateCode: string;
} | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FCC_TIMEOUT_MS);

  try {
    const url = `${FCC_GEOCODER_URL}?lat=${lat}&lon=${lng}&censusYear=2020&format=json`;
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) return null;

    const data = await response.json().catch(() => null) as {
      results?: {
        county_fips?: string;
        county_name?: string;
        state_code?: string;
      }[];
    } | null;

    const r = data?.results?.[0];
    if (!r?.county_fips || !r.county_name) return null;

    return {
      fips: r.county_fips,
      countyName: r.county_name,
      stateCode: r.state_code ?? '',
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function queryCountyEndpoint(
  lat: number,
  lng: number,
  endpoint: CountyEndpoint,
): Promise<{ zoneCode: string; description: string | null; overlay: string | null } | null> {
  const isFeatureServer = endpoint.url.includes('FeatureServer');
  const queryUrl = `${endpoint.url}/${endpoint.layerId}/query`;

  const outFields = [
    endpoint.fields.zone,
    endpoint.fields.description,
    endpoint.fields.overlay,
  ].filter((f): f is string => Boolean(f)).join(',');

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
  const timeout = setTimeout(() => controller.abort(), ARCGIS_TIMEOUT_MS);

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

    const zoneCode = String(
      attrs[endpoint.fields.zone] ??
      attrs['ZONING'] ?? attrs['ZONE_CODE'] ?? attrs['ZONE'] ??
      attrs['ZONING_CODE'] ?? attrs['ZN_CODE'] ?? attrs['ZONECODE'] ??
      'Unknown',
    ).trim();

    const descField = endpoint.fields.description;
    const description = descField
      ? (String(
          attrs[descField] ??
          attrs['ZONING_DESC'] ?? attrs['ZONE_DESC'] ?? attrs['DESCRIPTION'] ??
          attrs['ZONE_NAME'] ?? attrs['DESC_'] ?? '',
        ).trim() || null)
      : null;

    const overlayField = endpoint.fields.overlay;
    const overlay = overlayField
      ? (String(attrs[overlayField] ?? '').trim() || null)
      : null;

    return { zoneCode, description, overlay };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** Infer agricultural + use characteristics from a zoning code string. */
function inferZoningDetails(code: string): {
  permitted_uses: string[];
  conditional_uses: string[];
  isAgricultural: boolean;
} {
  const c = code.toUpperCase();
  const isAg = /^(A|AG|AR|RR|RA|FA|FP)[\s\-]?/i.test(c) ||
    c.includes('AGRI') || c.includes('FARM') || c.includes('RURAL');
  const isResidential = /^(R|RE|RS|RM|RD)[\s\-]?\d/i.test(c) ||
    c.includes('RESIDENTIAL') || c.includes('DWELLING');
  const isCommercial = /^(C|B|CB|CC)[\s\-]?\d/i.test(c) ||
    c.includes('COMMERCIAL') || c.includes('BUSINESS');
  const isIndustrial = /^(I|M|IN|LI|HI)[\s\-]?\d/i.test(c) ||
    c.includes('INDUSTRIAL') || c.includes('MANUFACTUR');
  const isConservation = c.includes('CONSERV') || c.includes('OPEN SPACE') ||
    c.includes('FOREST') || /^(OS|FC|FP|P)[\s\-]?\d/i.test(c);

  if (isAg) {
    return {
      permitted_uses: ['Agricultural operation', 'Single-family dwelling', 'Farm buildings', 'Forestry'],
      conditional_uses: ['Agritourism', 'Bed & breakfast', 'Home occupation', 'Farm stand/market'],
      isAgricultural: true,
    };
  }
  if (isResidential) {
    return {
      permitted_uses: ['Single-family dwelling', 'Home occupation'],
      conditional_uses: ['Accessory dwelling unit', 'Home-based business'],
      isAgricultural: false,
    };
  }
  if (isConservation) {
    return {
      permitted_uses: ['Conservation', 'Passive recreation', 'Forestry'],
      conditional_uses: ['Limited agriculture', 'Nature education'],
      isAgricultural: false,
    };
  }
  if (isCommercial) {
    return {
      permitted_uses: ['Commercial use', 'Office', 'Retail'],
      conditional_uses: ['Mixed use'],
      isAgricultural: false,
    };
  }
  if (isIndustrial) {
    return {
      permitted_uses: ['Industrial use', 'Manufacturing', 'Warehousing'],
      conditional_uses: ['Heavy commercial'],
      isAgricultural: false,
    };
  }
  return {
    permitted_uses: ['See local zoning ordinance for permitted uses'],
    conditional_uses: [],
    isAgricultural: false,
  };
}

function buildUnavailableResult(countyName: string | null, stateCode: string | null): ZoningSummary {
  const locationDesc = countyName && stateCode ? `${countyName}, ${stateCode}` : 'this location';
  const explanation =
    `Zoning data for ${locationDesc} is not yet available in the Atlas registry. ` +
    `US zoning is managed at the county/municipal level with no unified national database. ` +
    `Check your local county GIS portal or planning department for zoning maps and ordinances.`;

  return {
    zoning_code: 'Data not available for this area',
    zoning_description: explanation,
    permitted_uses: [],
    conditional_uses: [],
    county_name: countyName,
    state_code: stateCode,
    overlay_districts: [],
    is_agricultural: false,
    registry_coverage: false,
    source_api: countyName
      ? `County GIS (${locationDesc} — not in registry)`
      : 'County GIS (county not resolved)',
    confidence: 'low',
  };
}

// ─── Adapter Class ────────────────────────────────────────────────────────────

export class UsCountyGisAdapter implements DataSourceAdapter {
  constructor(
    public readonly sourceId: string,
    private readonly layerType: LayerType,
  ) {}

  async fetchForBoundary(boundary: unknown, context: ProjectContext): Promise<AdapterResult> {
    const { lat, lng } = extractCentroid({ ...context, boundaryGeojson: boundary });
    logger.info({ lat, lng }, 'Fetching US county zoning data');

    let summary: ZoningSummary;

    // Step 1: Resolve county FIPS
    const county = await resolveCountyFips(lat, lng);

    if (!county) {
      logger.warn({ lat, lng }, 'FCC geocoder failed to resolve county — returning unavailable');
      summary = buildUnavailableResult(null, null);
    } else {
      logger.info({ fips: county.fips, county: county.countyName, state: county.stateCode }, 'County resolved');

      // Step 2: Check registry
      const endpoint = COUNTY_ZONING_REGISTRY[county.fips];
      if (!endpoint) {
        logger.info(
          { fips: county.fips, county: county.countyName },
          'County not in registry — returning structured unavailable result',
        );
        summary = buildUnavailableResult(county.countyName, county.stateCode);
      } else {
        // Step 3: Query county GIS
        const result = await queryCountyEndpoint(lat, lng, endpoint);

        if (!result) {
          logger.warn({ fips: county.fips }, 'County GIS query returned no features');
          summary = buildUnavailableResult(county.countyName, county.stateCode);
        } else {
          const details = inferZoningDetails(result.zoneCode);
          const descriptionText = result.description
            ? `${result.zoneCode} — ${result.description}`
            : result.zoneCode;

          summary = {
            zoning_code: result.zoneCode,
            zoning_description: descriptionText,
            permitted_uses: details.permitted_uses,
            conditional_uses: details.conditional_uses,
            county_name: county.countyName,
            state_code: county.stateCode,
            overlay_districts: result.overlay ? [result.overlay] : [],
            is_agricultural: details.isAgricultural,
            registry_coverage: true,
            source_api: `${endpoint.countyLabel} GIS`,
            confidence: 'medium',
          };
        }
      }
    }

    logger.info(
      {
        zoneCode: summary.zoning_code,
        county: summary.county_name,
        isAg: summary.is_agricultural,
        confidence: summary.confidence,
      },
      'US county zoning fetch complete',
    );

    return {
      layerType: this.layerType,
      sourceApi: summary.source_api,
      attributionText: this.getAttributionText(summary),
      confidence: summary.confidence,
      dataDate: new Date().toISOString().split('T')[0]!,
      summaryData: summary,
    };
  }

  private getAttributionText(summary: ZoningSummary): string {
    if (summary.registry_coverage && summary.county_name) {
      return `${summary.county_name} Planning Department — Zoning via county ArcGIS GIS portal`;
    }
    return 'US county/municipal planning departments — zoning data not available for this county';
  }

  getConfidence(result: AdapterResult): 'high' | 'medium' | 'low' {
    return result.confidence;
  }

  getAttributionText(): string {
    return 'US county/municipal planning departments — zoning via county ArcGIS GIS portals';
  }
}
