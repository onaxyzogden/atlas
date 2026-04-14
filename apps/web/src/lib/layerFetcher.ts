/**
 * Layer Fetcher — replaces mock data with real API calls where possible.
 *
 * Strategy:
 *   US:
 *     - USGS 3DEP WCS: Real elevation raster tiles at 1m resolution (CORS-friendly)
 *     - SSURGO SDA: Real soil data (CORS-friendly)
 *     - USGS WBD: Real watershed/HUC data (CORS-friendly)
 *     - FEMA NFHL + USFWS NWI: Real wetlands/flood data
 *     - MRLC NLCD: Real land cover (WMS)
 *     - NOAA ACIS: Real climate normals from nearest GHCN station (CORS-friendly)
 *   CA (Ontario):
 *     - ECCC Climate Normals (OGC API): Real climate station data
 *     - Ontario Hydro Network (LIO ArcGIS REST): Real watershed/stream data
 *     - Ontario Soil Survey Complex (LIO ArcGIS REST): Real soils data
 *     - AAFC Annual Crop Inventory (ImageServer Identify): Real land cover
 *     - Elevation: NRCan HRDEM via backend COG proxy (CGVD2013→NAVD88 datum conversion)
 *     - LIO CA Regulation Limits + Ontario Wetland Inventory: Real wetlands/flood data
 *
 * All fetchers fall back gracefully on failure. Results cached 24h in localStorage.
 */

import { generateMockLayers, type MockLayerResult } from './mockLayerData.js';

// ── Cache ──────────────────────────────────────────────────────────────────

const CACHE_KEY = 'ogden-layer-cache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry {
  layers: MockLayerResult[];
  fetchedAt: number;
  isLive: boolean;
}

function getCacheKey(lat: number, lng: number, country: string): string {
  return `${lat.toFixed(3)}_${lng.toFixed(3)}_${country}`;
}

function getCache(key: string): CacheEntry | null {
  try {
    const all = JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}');
    const entry = all[key];
    if (entry && Date.now() - entry.fetchedAt < CACHE_TTL_MS) return entry;
  } catch { /* */ }
  return null;
}

/** Read cached layer results for a location (returns null if not cached). */
export function getCachedLayers(center: [number, number], country: string): { layers: MockLayerResult[]; isLive: boolean; fetchedAt: number } | null {
  const key = getCacheKey(center[1], center[0], country);
  return getCache(key);
}

function setCache(key: string, layers: MockLayerResult[], isLive: boolean) {
  try {
    // Strip large arrays before caching to stay within localStorage limits.
    // Stats are preserved; raw payloads are re-fetched when needed.
    const cacheable = layers.map((l) => {
      if (l.layerType === 'elevation' && l.summary?.raster_tile) {
        const { raster_tile: _strip, ...rest } = l.summary;
        return { ...l, summary: rest };
      }
      if (l.layerType === 'climate') {
        let summary = l.summary;
        if (summary?._monthly_normals) {
          const { _monthly_normals: _strip, ...rest } = summary;
          summary = rest;
        }
        if (summary?._wind_rose) {
          const { _wind_rose: _strip, ...rest } = summary;
          summary = rest;
        }
        if (summary !== l.summary) return { ...l, summary };
      }
      return l;
    });

    const all = JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}');
    all[key] = { layers: cacheable, fetchedAt: Date.now(), isLive };
    // Prune old entries (keep max 20)
    const keys = Object.keys(all);
    if (keys.length > 20) {
      const oldest = keys.sort((a, b) => all[a].fetchedAt - all[b].fetchedAt);
      for (let i = 0; i < keys.length - 20; i++) delete all[oldest[i]!];
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(all));
  } catch { /* */ }
}

// ── Main fetcher ───────────────────────────────────────────────────────────

export interface FetchLayerOptions {
  center: [number, number]; // [lng, lat]
  country: 'US' | 'CA';
  bbox?: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat] from project boundary
}

export interface FetchLayerResults {
  layers: MockLayerResult[];
  isLive: boolean; // true if at least some data came from real APIs
  liveCount: number;
  totalCount: number;
}

// In-flight promise map for request deduplication
const inFlight = new Map<string, Promise<FetchLayerResults>>();

export function fetchAllLayers(options: FetchLayerOptions): Promise<FetchLayerResults> {
  const [lng, lat] = options.center;
  const cacheKey = getCacheKey(lat, lng, options.country);

  // Check cache
  const cached = getCache(cacheKey);
  if (cached) {
    return Promise.resolve({ layers: cached.layers, isLive: cached.isLive, liveCount: cached.isLive ? 7 : 0, totalCount: 7 });
  }

  // Deduplicate: return existing in-flight promise if same location is being fetched
  const existing = inFlight.get(cacheKey);
  if (existing) return existing;

  const promise = fetchAllLayersInternal(options, cacheKey);
  inFlight.set(cacheKey, promise);
  promise.finally(() => inFlight.delete(cacheKey));
  return promise;
}

async function fetchAllLayersInternal(options: FetchLayerOptions, cacheKey: string): Promise<FetchLayerResults> {
  const [lng, lat] = options.center;

  // Start with mock data as baseline
  const mock = generateMockLayers(options.country);
  const results: MockLayerResult[] = [...mock];
  let liveCount = 0;

  // Only count results from real APIs (not latitude-based estimates)
  function trackLive(r: MockLayerResult | null) {
    if (r) {
      replaceLayer(results, r);
      if (isLiveResult(r)) liveCount++;
    }
  }

  // Fetch real data in parallel — each fetcher replaces its mock entry
  const fetchers: Promise<void>[] = [];

  // Elevation (US: USGS 3DEP WCS raster — CA: latitude model, NRCan HRDEM needs backend proxy)
  fetchers.push(fetchElevation(lat, lng, options.country, options.bbox).then(trackLive));

  // Soils (US: SSURGO SDA — CA: LIO Ontario Soil Survey Complex)
  fetchers.push(fetchSoils(lat, lng, options.country).then(trackLive));

  // Climate (US: NOAA ACIS station normals — CA: ECCC Climate Normals OGC API)
  fetchers.push(fetchClimate(lat, lng, options.country, options.bbox).then(trackLive));

  // Watershed (US: USGS WBD — CA: Ontario Hydro Network LIO)
  fetchers.push(fetchWatershed(lat, lng, options.country).then(trackLive));

  // Wetlands & Flood (US: FEMA NFHL + NWI — CA: LIO CA Regulation + Ontario Wetlands)
  fetchers.push(fetchWetlandsFlood(lat, lng, options.country, options.bbox).then(trackLive));

  // Land Cover (US: MRLC NLCD — CA: AAFC Annual Crop Inventory)
  fetchers.push(fetchLandCover(lat, lng, options.country).then(trackLive));

  // Zoning (US: County GIS via FIPS resolver — CA: LIO Municipal Zoning + AAFC CLI)
  fetchers.push(fetchZoning(lat, lng, options.country, options.bbox).then(trackLive));

  // Infrastructure (OpenStreetMap Overpass API — universal, no auth)
  fetchers.push(fetchInfrastructure(lat, lng).then(trackLive));

  // Sprint M: Groundwater depth (USGS NWIS — US only)
  fetchers.push(fetchUSGSNWIS(lat, lng, options.country).then(trackLive));

  // Sprint M: Water quality (EPA WQP — US only)
  fetchers.push(fetchEPAWQP(lat, lng, options.country).then(trackLive));

  await Promise.allSettled(fetchers);

  const isLive = liveCount > 0;
  setCache(cacheKey, results, isLive);

  return { layers: results, isLive, liveCount, totalCount: 7 };
}

function replaceLayer(results: MockLayerResult[], replacement: MockLayerResult) {
  const idx = results.findIndex((r) => r.layerType === replacement.layerType);
  if (idx >= 0) results[idx] = replacement;
  else results.push(replacement); // new layer type (e.g. infrastructure) — append
}

/** True when the result came from a real API with usable data. */
function isLiveResult(r: MockLayerResult): boolean {
  return r.fetchStatus === 'complete' &&
         !r.sourceApi.startsWith('Estimated') &&
         !r.sourceApi.startsWith('Climate model');
}

// ── Elevation fetcher (USGS 3DEP WCS raster tiles) ───────────────────────

const WCS_3DEP_BASE = 'https://elevation.nationalmap.gov/arcgis/services/3DEPElevation/ImageServer/WCSServer';
const MAX_RASTER_DIM = 512; // Cap tile size for browser performance

async function fetchElevation(
  lat: number,
  lng: number,
  country: string,
  bbox?: [number, number, number, number],
): Promise<MockLayerResult | null> {
  // Derive a default bbox from center if the project boundary bbox is not provided
  const effectiveBbox: [number, number, number, number] = bbox ?? [
    lng - 0.005, lat - 0.005, lng + 0.005, lat + 0.005,
  ];

  if (country === 'CA') {
    try {
      return await fetchElevationNrcan(lat, lng, effectiveBbox);
    } catch {
      return elevationFromLatitude(lat, lng, country);
    }
  }

  try {
    return await fetchElevationWCS(lat, lng, effectiveBbox);
  } catch {
    return elevationFromLatitude(lat, lng, country);
  }
}

/**
 * Fetch Canadian elevation via the backend NRCan HRDEM proxy.
 * The proxy reads Cloud Optimized GeoTIFFs from NRCan STAC,
 * applies CGVD2013→NAVD88 datum conversion, and returns a
 * processed raster tile matching the US 3DEP payload structure.
 */
async function fetchElevationNrcan(
  lat: number,
  lng: number,
  bbox: [number, number, number, number],
): Promise<MockLayerResult> {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const params = new URLSearchParams({
    minLon: String(minLng),
    minLat: String(minLat),
    maxLon: String(maxLng),
    maxLat: String(maxLat),
  });

  const resp = await fetchWithRetry(`/api/v1/elevation/nrcan-hrdem?${params}`, 30000);
  const result = await resp.json();

  if (result.error) {
    throw new Error(result.error.message ?? 'HRDEM proxy error');
  }

  const d = result.data;
  if (!d || d.fetchStatus !== 'complete' || !d.summary) {
    throw new Error(d?.message ?? 'No HRDEM data available');
  }

  return {
    layerType: 'elevation',
    fetchStatus: d.fetchStatus,
    confidence: d.confidence,
    dataDate: d.dataDate ?? new Date().toISOString().split('T')[0]!,
    sourceApi: d.sourceApi,
    attribution: d.attribution,
    summary: {
      min_elevation_m: d.summary.min_elevation_m,
      max_elevation_m: d.summary.max_elevation_m,
      mean_elevation_m: d.summary.mean_elevation_m,
      mean_slope_deg: d.summary.mean_slope_deg,
      max_slope_deg: d.summary.max_slope_deg,
      predominant_aspect: d.summary.predominant_aspect,
      datum: d.datum,
      datum_offset_applied: d.datum_offset_applied,
      original_datum: d.original_datum,
      rasterUrl: d.rasterUrl,
      raster_tile: d.raster_tile,
    },
  };
}

/**
 * Fetch elevation raster tile via USGS 3DEP WCS GetCoverage.
 * Requests up to 1m resolution (capped to MAX_RASTER_DIM pixels per axis).
 * Parses the GeoTIFF response and computes statistics + slope from the raster grid.
 */
async function fetchElevationWCS(
  lat: number,
  lng: number,
  bbox: [number, number, number, number],
): Promise<MockLayerResult> {
  const [minLng, minLat, maxLng, maxLat] = bbox;

  // Compute span in metres for resolution calculation
  const latSpanM = (maxLat - minLat) * 111320;
  const lngSpanM = (maxLng - minLng) * 111320 * Math.cos((lat * Math.PI) / 180);

  // Target 1m resolution, capped to MAX_RASTER_DIM
  let width = Math.round(lngSpanM);
  let height = Math.round(latSpanM);
  if (width > MAX_RASTER_DIM || height > MAX_RASTER_DIM) {
    const scale = MAX_RASTER_DIM / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  width = Math.max(2, width);
  height = Math.max(2, height);

  // WCS 1.0.0 GetCoverage — widest compatibility with ArcGIS WCS services
  const params = new URLSearchParams({
    SERVICE: 'WCS',
    VERSION: '1.0.0',
    REQUEST: 'GetCoverage',
    COVERAGE: 'DEP3Elevation_1',
    CRS: 'EPSG:4326',
    BBOX: `${minLng},${minLat},${maxLng},${maxLat}`,
    WIDTH: String(width),
    HEIGHT: String(height),
    FORMAT: 'GeoTIFF',
  });

  const url = `${WCS_3DEP_BASE}?${params}`;
  const resp = await fetchWithRetry(url, 20000);

  // WCS may return XML error instead of a raster — detect and reject
  const contentType = resp.headers.get('content-type') ?? '';
  if (contentType.includes('xml') || contentType.includes('text')) {
    throw new Error('WCS returned error/XML response instead of raster');
  }

  const arrayBuffer = await resp.arrayBuffer();
  const { fromArrayBuffer } = await import('geotiff');
  const tiff = await fromArrayBuffer(arrayBuffer);
  const image = await tiff.getImage();
  const rasters = await image.readRasters();
  const data = rasters[0] as Float32Array | Float64Array;
  const rasterW = image.getWidth();
  const rasterH = image.getHeight();
  const noDataValue = image.getGDALNoData() ?? -9999;

  // ── Statistics pass ──────────────────────────────────────────────────────
  let min = Infinity, max = -Infinity, sum = 0, validCount = 0;
  for (let i = 0; i < data.length; i++) {
    const v = data[i]!;
    if (v === noDataValue || v < -1000 || v > 9000) continue;
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
    validCount++;
  }

  if (validCount === 0) {
    throw new Error('No valid elevation data in WCS raster tile');
  }

  const mean = sum / validCount;

  // ── Slope computation (finite differences on the raster grid) ────────────
  const cellSizeX = lngSpanM / rasterW;
  const cellSizeY = latSpanM / rasterH;
  let slopeSum = 0, slopeMax = 0, slopeCount = 0;
  // Aspect accumulation for dominant-aspect calculation
  const aspectBins: Record<string, number> = { N: 0, NE: 0, E: 0, SE: 0, S: 0, SW: 0, W: 0, NW: 0 };

  for (let row = 1; row < rasterH - 1; row++) {
    for (let col = 1; col < rasterW - 1; col++) {
      const idx = row * rasterW + col;
      const z = data[idx]!;
      if (z === noDataValue || z < -1000) continue;

      const zL = data[idx - 1]!;
      const zR = data[idx + 1]!;
      const zU = data[idx - rasterW]!;
      const zD = data[idx + rasterW]!;
      if (zL === noDataValue || zR === noDataValue || zU === noDataValue || zD === noDataValue) continue;
      if (zL < -1000 || zR < -1000 || zU < -1000 || zD < -1000) continue;

      const dzdx = (zR - zL) / (2 * cellSizeX);
      const dzdy = (zD - zU) / (2 * cellSizeY);
      const slopeDeg = Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy)) * (180 / Math.PI);

      slopeSum += slopeDeg;
      if (slopeDeg > slopeMax) slopeMax = slopeDeg;
      slopeCount++;

      // Aspect: angle from north, clockwise
      const aspectRad = Math.atan2(-dzdx, dzdy);
      const aspectDeg = ((aspectRad * 180) / Math.PI + 360) % 360;
      const bin = aspectDeg < 22.5 ? 'N' : aspectDeg < 67.5 ? 'NE' : aspectDeg < 112.5 ? 'E'
        : aspectDeg < 157.5 ? 'SE' : aspectDeg < 202.5 ? 'S' : aspectDeg < 247.5 ? 'SW'
        : aspectDeg < 292.5 ? 'W' : aspectDeg < 337.5 ? 'NW' : 'N';
      aspectBins[bin]!++;
    }
  }

  const meanSlope = slopeCount > 0 ? slopeSum / slopeCount : 0;
  const predominantAspect = slopeCount > 0
    ? Object.entries(aspectBins).sort((a, b) => b[1] - a[1])[0]![0]
    : estimateAspect(lat, lng);

  // ── Raster tile payload for downstream consumers (terrain viz, analysis) ─
  const effectiveResolution = Math.max(lngSpanM / rasterW, latSpanM / rasterH);
  const rasterTile = {
    width: rasterW,
    height: rasterH,
    bbox: [minLng, minLat, maxLng, maxLat] as [number, number, number, number],
    resolution_m: +effectiveResolution.toFixed(2),
    noDataValue,
    data: Array.from(data),
  };

  return {
    layerType: 'elevation',
    fetchStatus: 'complete',
    confidence: 'high',
    dataDate: new Date().toISOString().split('T')[0]!,
    sourceApi: 'USGS 3DEP (WCS 1m)',
    attribution: 'U.S. Geological Survey, 3D Elevation Program',
    summary: {
      min_elevation_m: Math.round(min),
      max_elevation_m: Math.round(max),
      mean_elevation_m: Math.round(mean),
      mean_slope_deg: +meanSlope.toFixed(1),
      max_slope_deg: +Math.min(slopeMax, 90).toFixed(1),
      predominant_aspect: predominantAspect,
      raster_tile: rasterTile,
    },
  };
}

function elevationFromLatitude(lat: number, lng: number, country: string): MockLayerResult {
  // Rough elevation model based on latitude/longitude for Eastern North America
  const baseElev = lat > 45 ? 200 : lat > 40 ? 150 : lat > 35 ? 100 : 50;
  const lngFactor = Math.abs(lng + 80) * 5; // higher further from coast
  const elev = Math.round(baseElev + lngFactor);

  return {
    layerType: 'elevation',
    fetchStatus: 'complete',
    confidence: country === 'CA' ? 'medium' : 'low',
    dataDate: new Date().toISOString().split('T')[0]!,
    sourceApi: country === 'CA' ? 'Estimated (NRCan HRDEM unavailable)' : 'Estimated',
    attribution: 'Latitude-based estimate',
    summary: {
      min_elevation_m: elev - 30,
      max_elevation_m: elev + 50,
      mean_elevation_m: elev,
      mean_slope_deg: 5.2,
      max_slope_deg: 18.0,
      predominant_aspect: estimateAspect(lat, lng),
    },
  };
}

function estimateAspect(lat: number, _lng: number): string {
  // Most agricultural land in Eastern NA faces S/SE
  return lat > 44 ? 'S' : lat > 40 ? 'SE' : 'SW';
}

// ── Soils (SSURGO for US, LIO Ontario Soil Survey for CA) ─────────────────

async function fetchSoils(lat: number, lng: number, country: string): Promise<MockLayerResult | null> {
  if (country === 'CA') {
    try {
      return await fetchLioSoils(lat, lng);
    } catch {
      return soilsFromLatitude(lat, country);
    }
  }

  try {
    // Extended query: fetch all major chorizon properties with component weighting
    const query = `SELECT mu.muname, mu.musym, c.drainagecl, c.hydgrp, c.taxorder, c.nirrcapcl, c.comppct_r, ch.om_r, ch.ph1to1h2o_r, ch.sandtotal_r, ch.claytotal_r, ch.silttotal_r, ch.cec7_r, ch.ec_r, ch.dbthirdbar_r, ch.ksat_r, ch.awc_r, ch.caco3_r, ch.sar_r, c.resdepth_r FROM mapunit mu INNER JOIN component c ON mu.mukey = c.mukey LEFT JOIN chorizon ch ON c.cokey = ch.cokey AND ch.hzdept_r = 0 WHERE mu.mukey IN (SELECT mukey FROM SDA_Get_Mukey_from_intersection_with_WktWgs84('POINT(${lng} ${lat})')) AND c.majcompflag = 'Yes' ORDER BY c.comppct_r DESC`;

    const resp = await fetchWithRetry('https://SDMDataAccess.sc.egov.usda.gov/Tabular/SDMTabularService/post.rest', 10000, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ SERVICE: 'query', REQUEST: 'query', QUERY: query, FORMAT: 'JSON+COLUMNNAME+METADATA' }),
    });

    const data = await resp.json();
    const table = data.Table;
    if (!table || table.length < 3) return soilsFromLatitude(lat, country);

    // table[0] = column names, table[1] = metadata, table[2+] = data rows
    const columns: string[] = table[0] ?? [];
    if (columns.length === 0) return soilsFromLatitude(lat, country);

    // Build name→index map for robust column access
    const colIdx = (name: string) => columns.findIndex((c: string) => c.toLowerCase() === name.toLowerCase());

    // Parse all data rows (multiple components)
    const rows: Array<Record<string, string | null>> = [];
    for (let i = 2; i < table.length; i++) {
      const r = table[i];
      if (!r) continue;
      const obj: Record<string, string | null> = {};
      for (const name of columns) {
        const idx = colIdx(name);
        obj[name.toLowerCase()] = idx >= 0 && r[idx] != null ? String(r[idx]) : null;
      }
      rows.push(obj);
    }

    if (rows.length === 0) return soilsFromLatitude(lat, country);

    // Weighted average computation across components
    const pf = (v: string | null | undefined) => v != null ? parseFloat(v) : null;
    const numFields = ['om_r', 'ph1to1h2o_r', 'sandtotal_r', 'claytotal_r', 'silttotal_r', 'cec7_r', 'ec_r', 'dbthirdbar_r', 'ksat_r', 'awc_r', 'caco3_r', 'sar_r', 'resdepth_r'] as const;
    const weighted: Record<string, number | null> = {};

    for (const field of numFields) {
      let sumWV = 0, sumW = 0;
      for (const row of rows) {
        const val = pf(row[field]);
        const wt = pf(row['comppct_r']);
        if (val !== null && isFinite(val) && wt !== null && wt > 0) {
          sumWV += val * wt;
          sumW += wt;
        }
      }
      weighted[field] = sumW > 0 ? sumWV / sumW : null;
    }

    // Dominant component (highest comppct_r) for categorical fields
    const dominant = rows[0]!; // already sorted by comppct_r DESC
    const muname = dominant['muname'] ?? 'Unknown';
    const drainage = dominant['drainagecl'] ?? 'Unknown';
    const hydgrp = dominant['hydgrp'] ?? 'Unknown';
    const taxorder = dominant['taxorder'] ?? '';
    const capClass = dominant['nirrcapcl'] ?? '';

    const om = weighted['om_r'] ?? null;
    const ph = weighted['ph1to1h2o_r'] ?? null;
    const sand = weighted['sandtotal_r'] ?? null;
    const clay = weighted['claytotal_r'] ?? null;
    const silt = weighted['silttotal_r'] ?? null;
    const cec = weighted['cec7_r'] ?? null;
    const ec = weighted['ec_r'] ?? null;
    const bulkDensity = weighted['dbthirdbar_r'] ?? null;
    const ksat = weighted['ksat_r'] ?? null;
    const awc = weighted['awc_r'] ?? null;
    const caco3 = weighted['caco3_r'] ?? null;
    const sar = weighted['sar_r'] ?? null;
    const rootingDepth = weighted['resdepth_r'] ?? null;

    // Derive texture class (USDA texture triangle, simplified)
    const textureClass = deriveTextureClassFe(clay, silt, sand);

    // Derive display texture name
    let texture = textureClass ? textureClass.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : 'Loam';
    if (!textureClass) {
      const s = sand ?? 0, c = clay ?? 0;
      if (c > 40) texture = 'Clay';
      else if (s > 70) texture = 'Sandy loam';
      else if (c > 25) texture = 'Clay loam';
      else if (s > 50) texture = 'Sandy loam';
      else texture = 'Loam';
    }

    // Derive farmland class from capability class
    const farmlandClass = capClass === '1' ? 'Prime farmland'
      : capClass === '2' ? 'Farmland of statewide importance'
      : capClass <= '4' ? `Capability Class ${capClass}`
      : `Class ${capClass}`;

    // Compute fertility index (0-100): pH + OC + CEC + drainage
    const fertilityIndex = computeFertilityIndexFe(ph, om != null ? om * 0.58 : null, cec, drainage);

    // Compute salinization risk from EC + SAR
    const salinizationRisk = computeSalinizationRiskFe(ec, sar);

    const round2 = (v: number | null) => v !== null && isFinite(v) ? +v.toFixed(2) : null;
    const round1 = (v: number | null) => v !== null && isFinite(v) ? +v.toFixed(1) : null;

    return {
      layerType: 'soils',
      fetchStatus: 'complete',
      confidence: 'high',
      dataDate: new Date().toISOString().split('T')[0]!,
      sourceApi: 'USDA SSURGO (SDA)',
      attribution: 'USDA Natural Resources Conservation Service',
      summary: {
        predominant_texture: texture,
        soil_name: muname,
        drainage_class: drainage || 'Unknown',
        organic_matter_pct: om !== null ? +om.toFixed(1) : 'N/A',
        ph_range: ph !== null ? `${(ph - 0.3).toFixed(1)} - ${(ph + 0.3).toFixed(1)}` : 'N/A',
        ph_value: round1(ph),
        hydrologic_group: hydgrp || 'Unknown',
        farmland_class: farmlandClass,
        depth_to_bedrock_m: 'N/A',
        taxonomic_order: taxorder,
        // Extended soil properties (Sprint B)
        cec_meq_100g: round1(cec),
        ec_ds_m: round2(ec),
        bulk_density_g_cm3: round2(bulkDensity),
        ksat_um_s: round1(ksat),
        awc_cm_cm: round2(awc),
        rooting_depth_cm: round1(rootingDepth),
        clay_pct: round1(clay),
        silt_pct: round1(silt),
        sand_pct: round1(sand),
        caco3_pct: round2(caco3),
        sodium_adsorption_ratio: round1(sar),
        texture_class: textureClass,
        fertility_index: fertilityIndex,
        salinization_risk: salinizationRisk,
        component_count: rows.length,
      },
    };
  } catch {
    return soilsFromLatitude(lat, country);
  }
}

// ── Soil derived computations (frontend, matching backend SsurgoAdapter logic) ──

/** USDA texture triangle classification (simplified) */
function deriveTextureClassFe(clay: number | null, silt: number | null, sand: number | null): string | null {
  if (clay === null || silt === null || sand === null) return null;
  if (clay >= 40) return 'clay';
  if (silt >= 80) return 'silt';
  if (silt >= 50 && clay < 27) return 'silt_loam';
  if (clay >= 27 && clay < 40 && sand <= 20) return 'silty_clay_loam';
  if (clay >= 27 && clay < 40 && sand > 20 && sand <= 45) return 'clay_loam';
  if (sand >= 85) return 'sand';
  if (sand >= 70 && clay < 15) return 'loamy_sand';
  if (sand >= 50 && clay < 20) return 'sandy_loam';
  if (clay >= 20 && clay < 35 && silt < 28 && sand >= 45) return 'sandy_clay_loam';
  return 'loam';
}

/** Fertility index (0-100) from pH, OC%, CEC, drainage — matches backend computeFertilityIndex */
function computeFertilityIndexFe(
  ph: number | null, oc: number | null, cec: number | null, drainage: string | null,
): number | null {
  if (ph === null && oc === null && cec === null && drainage === null) return null;

  // pH component (0-25)
  let phScore = 0;
  if (ph !== null) {
    if (ph >= 6.0 && ph <= 7.5) phScore = 25;
    else if (ph >= 5.5 && ph <= 8.0) phScore = 18;
    else if (ph >= 5.0 && ph <= 8.5) phScore = 12;
    else phScore = 8;
  }

  // OC component (0-25)
  let ocScore = 0;
  if (oc !== null) {
    if (oc >= 3.0) ocScore = 25;
    else if (oc >= 2.0) ocScore = 20;
    else if (oc >= 1.0) ocScore = 12;
    else if (oc >= 0.5) ocScore = 6;
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
  let drainScore = 0;
  if (drainage) {
    const dl = drainage.toLowerCase();
    if (dl.includes('well') && !dl.includes('poorly') && !dl.includes('moderately')) drainScore = 25;
    else if (dl.includes('moderately well')) drainScore = 20;
    else if (dl.includes('somewhat poorly') || dl.includes('somewhat excessively')) drainScore = 12;
    else if (dl.includes('poorly') && !dl.includes('very')) drainScore = 6;
    else if (dl.includes('very poorly') || dl.includes('excessively')) drainScore = 2;
    else drainScore = 15; // unknown — assume moderate
  }

  return phScore + ocScore + cecScore + drainScore;
}

/** Salinization risk from EC (dS/m) and SAR — matches backend computeSalinizationRisk */
function computeSalinizationRiskFe(ec: number | null, sar: number | null): string {
  const levels = ['Low', 'Moderate', 'High', 'Severe'];
  let ecLevel = 0;
  if (ec !== null) {
    if (ec >= 8) ecLevel = 3;
    else if (ec >= 4) ecLevel = 2;
    else if (ec >= 2) ecLevel = 1;
  }
  let sarLevel = 0;
  if (sar !== null) {
    if (sar >= 15) sarLevel = 3;
    else if (sar >= 10) sarLevel = 2;
    else if (sar >= 6) sarLevel = 1;
  }
  return levels[Math.max(ecLevel, sarLevel)]!;
}

async function fetchLioSoils(lat: number, lng: number): Promise<MockLayerResult> {
  // Tight buffer ~300 m to intersect the polygon the centroid sits within
  const buf = 0.003;
  const envelope = encodeURIComponent(JSON.stringify({
    xmin: lng - buf, ymin: lat - buf,
    xmax: lng + buf, ymax: lat + buf,
    spatialReference: { wkid: 4326 },
  }));
  const url =
    `https://ws.lioservices.lrc.gov.on.ca/arcgis1071a/rest/services/LIO_OPEN_DATA/LIO_Open05/MapServer/9/query` +
    `?geometry=${envelope}&geometryType=esriGeometryEnvelope&spatialRel=esriSpatialRelIntersects` +
    `&outFields=*&returnGeometry=false&f=json`;

  const resp = await fetchWithRetry(url, 10000);
  const data = await resp.json() as { features?: { attributes: Record<string, unknown> }[] };

  const features = data?.features;
  if (!features || features.length === 0) throw new Error('LIO soils: no features at point');

  // Take first (dominant) polygon — LIO returns most-overlapping first at small bbox
  const attrs = features[0]!.attributes;

  // Field name fallback chains — LIO schema varies across service versions
  const textureRaw =
    attrs['TEXTURE'] ?? attrs['SOIL_TEXTURE'] ?? attrs['TEX'] ?? attrs['TEXTURE_CLASS'] ?? null;
  const drainageRaw =
    attrs['DRAINAGE'] ?? attrs['DRAIN_CL'] ?? attrs['DRAINAGE_CLASS'] ?? attrs['DRAIN'] ?? null;
  const omRaw =
    attrs['ORG_MATTER'] ?? attrs['ORGANIC_MATTER'] ?? attrs['OM_PCT'] ?? attrs['ORGANIC_CARBON'] ?? null;
  const farmlandRaw =
    attrs['FARMLAND_CL'] ?? attrs['CANADA_LAND_INV'] ?? attrs['CLI_CLASS'] ?? attrs['CAPABILITY'] ?? null;
  const phRaw =
    attrs['PH'] ?? attrs['SOIL_PH'] ?? attrs['REACTION'] ?? null;
  const soilNameRaw =
    attrs['SOIL_SERIES'] ?? attrs['SOIL_NAME'] ?? attrs['SERIES_NAME'] ?? attrs['MAP_UNIT'] ?? 'Unknown';
  const bedrockRaw =
    attrs['DEPTH_BEDROCK'] ?? attrs['BEDROCK_DEPTH'] ?? attrs['DEPTH_TO_BEDROCK'] ?? null;
  const taxonRaw =
    attrs['TAXON_ORDER'] ?? attrs['GREAT_GROUP'] ?? attrs['ORDER_'] ?? null;

  const texture = textureRaw ? lioNormalizeTexture(String(textureRaw)) : 'Loam';
  const drainage = drainageRaw ? String(drainageRaw) : 'Moderately well drained';
  const om = omRaw != null ? +parseFloat(String(omRaw)).toFixed(1) : 3.0;
  const farmlandClass = farmlandRaw ? lioFormatCscsClass(String(farmlandRaw)) : 'Class 2 (CSCS)';
  const phVal = phRaw != null ? parseFloat(String(phRaw)) : 6.5;
  const phRange = `${(phVal - 0.3).toFixed(1)} - ${(phVal + 0.3).toFixed(1)}`;
  const depth = bedrockRaw != null ? +parseFloat(String(bedrockRaw)).toFixed(1) : 'N/A';

  return {
    layerType: 'soils',
    fetchStatus: 'complete',
    confidence: 'high',
    dataDate: new Date().toISOString().split('T')[0]!,
    sourceApi: 'Ontario Soil Survey Complex (LIO)',
    attribution: 'OMAFRA / Ontario Ministry of Natural Resources',
    summary: {
      predominant_texture: texture,
      soil_name: String(soilNameRaw),
      drainage_class: drainage,
      organic_matter_pct: om,
      ph_range: phRange,
      hydrologic_group: lioHydroGroup(texture, drainage),
      farmland_class: farmlandClass,
      depth_to_bedrock_m: depth,
      taxonomic_order: taxonRaw ? String(taxonRaw) : '',
    },
  };
}

function lioNormalizeTexture(raw: string): string {
  const t = raw.toLowerCase();
  if (t.includes('clay loam')) return 'Clay loam';
  if (t.includes('silty clay')) return 'Silty clay';
  if (t.includes('clay')) return 'Clay';
  if (t.includes('sandy loam') || t === 'sl') return 'Sandy loam';
  if (t.includes('silt loam') || t === 'sil') return 'Silt loam';
  if (t.includes('loamy sand') || t === 'ls') return 'Loamy sand';
  if (t.includes('loam')) return 'Loam';
  if (t.includes('sand')) return 'Sand';
  return raw;
}

function lioFormatCscsClass(raw: string): string {
  const n = raw.trim().replace(/^class\s*/i, '').replace(/^c\s*/i, '');
  return `Class ${n} (CSCS)`;
}

function lioHydroGroup(texture: string, drainage: string): string {
  const t = texture.toLowerCase();
  const d = drainage.toLowerCase();
  if (t.includes('clay')) return 'D';
  if (d.includes('poor') || d.includes('very poor')) return 'C';
  if (t.includes('sandy')) return 'A';
  return 'B';
}

function soilsFromLatitude(lat: number, country: string): MockLayerResult {
  // Ontario soils are predominantly clay loam in the south
  const texture = lat > 44 ? 'Sandy loam' : 'Clay loam';
  return {
    layerType: 'soils',
    fetchStatus: 'complete',
    confidence: 'medium',
    dataDate: new Date().toISOString().split('T')[0]!,
    sourceApi: country === 'CA' ? 'Estimated (OMAFRA CanSIS unavailable)' : 'Estimated',
    attribution: country === 'CA' ? 'Latitude-based estimate (Ontario typical)' : 'Latitude-based estimate',
    summary: {
      predominant_texture: texture,
      drainage_class: 'Moderately well drained',
      organic_matter_pct: 3.0,
      ph_range: '6.0 - 7.0',
      hydrologic_group: 'C',
      farmland_class: country === 'CA' ? 'Class 2 (CSCS)' : 'Estimated',
      depth_to_bedrock_m: 'N/A',
    },
  };
}

// ── Climate (NOAA ACIS for US, ECCC OGC API for CA) ─────────────────────────

async function fetchClimate(
  lat: number,
  lng: number,
  country: string,
  bbox?: [number, number, number, number],
): Promise<MockLayerResult> {
  // CA: try ECCC Climate Normals OGC API first
  if (country === 'CA') {
    try {
      return await fetchEcccClimate(lat, lng);
    } catch {
      // Fall through to latitude model
    }
  }

  // US: try NOAA ACIS (real station-based 1991-2020 normals)
  if (country === 'US') {
    try {
      return await fetchNoaaClimate(lat, lng, bbox);
    } catch {
      // Fall through to latitude model
    }
  }

  // Fallback: latitude-based model (low confidence)
  return climateFromLatitude(lat, lng, country);
}

// ── NOAA ACIS — real US climate normals from nearest GHCN station ─────────

const ACIS_BASE = 'https://data.rcc-acis.org';

async function fetchNoaaClimate(
  lat: number,
  lng: number,
  bbox?: [number, number, number, number],
): Promise<MockLayerResult> {
  // Step 1: Find nearest climate station via ACIS StnMeta
  // Expand search area ~30 km beyond project boundary (or 0.5° default)
  const pad = 0.3;
  const searchBbox = bbox
    ? `${(bbox[0] - pad).toFixed(4)},${(bbox[1] - pad).toFixed(4)},${(bbox[2] + pad).toFixed(4)},${(bbox[3] + pad).toFixed(4)}`
    : `${(lng - 0.5).toFixed(4)},${(lat - 0.5).toFixed(4)},${(lng + 0.5).toFixed(4)},${(lat + 0.5).toFixed(4)}`;

  const metaResp = await fetchWithRetry(`${ACIS_BASE}/StnMeta`, 10000, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bbox: searchBbox,
      meta: 'name,ll,sids,state,valid_daterange',
      elems: 'maxt,mint,pcpn',
    }),
  });

  interface AcisStation {
    name: string;
    ll: [number, number];
    sids: string[];
    state: string;
    valid_daterange: [string, string][];
  }

  const metaJson = await metaResp.json() as { meta?: AcisStation[] };
  const stations = metaJson.meta;
  if (!stations || stations.length === 0) {
    throw new Error('ACIS: no climate stations found in search area');
  }

  // Pick nearest station with valid data covering most of the 1991-2020 normals period
  const cosLat = Math.cos(lat * Math.PI / 180);
  let bestStation: AcisStation | null = null;
  let bestDist = Infinity;

  for (const stn of stations) {
    const [sLng, sLat] = stn.ll;
    const dx = (sLng - lng) * cosLat;
    const dy = sLat - lat;
    const dist = Math.hypot(dx, dy);

    const hasRange = stn.valid_daterange?.some((range) => {
      const [start, end] = range;
      return start && end && start <= '1995' && end >= '2015';
    });

    if (hasRange && dist < bestDist) {
      bestDist = dist;
      bestStation = stn;
    }
  }

  // Fallback to nearest station even if daterange check fails
  if (!bestStation) {
    bestStation = stations.reduce((best, stn) => {
      const [sLng, sLat] = stn.ll;
      const dist = Math.hypot((sLng - lng) * cosLat, sLat - lat);
      const [bLng, bLat] = best.ll;
      return dist < Math.hypot((bLng - lng) * cosLat, bLat - lat) ? stn : best;
    });
  }

  const sid = bestStation.sids[0]?.split(' ')[0];
  if (!sid) throw new Error('ACIS: station has no SID');

  // Step 2: Query 30-year monthly climate data from the station
  const dataResp = await fetchWithRetry(`${ACIS_BASE}/StnData`, 15000, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sid,
      sdate: '1991-01',
      edate: '2020-12',
      elems: [
        { name: 'maxt', interval: 'mly', duration: 'mly', reduce: 'mean', maxmissing: 5 },
        { name: 'mint', interval: 'mly', duration: 'mly', reduce: 'mean', maxmissing: 5 },
        { name: 'pcpn', interval: 'mly', duration: 'mly', reduce: 'sum', maxmissing: 5 },
      ],
    }),
  });

  const dataJson = await dataResp.json() as {
    meta: { name: string; ll: [number, number]; sids: string[] };
    data: [string, string, string, string][];
  };

  const rows = dataJson.data;
  if (!rows || rows.length < 24) {
    throw new Error('ACIS: insufficient climate data from station');
  }

  // Step 3: Compute 12-month normals from 30 years of monthly data
  // ACIS returns values in °F and inches. "M" = missing, "T" = trace.
  const monthlyMaxtF: number[][] = Array.from({ length: 12 }, () => []);
  const monthlyMintF: number[][] = Array.from({ length: 12 }, () => []);
  const monthlyPcpnIn: number[][] = Array.from({ length: 12 }, () => []);

  for (const [dateStr, maxtStr, mintStr, pcpnStr] of rows) {
    const month = parseInt(dateStr.split('-')[1]!, 10) - 1;
    if (month < 0 || month > 11) continue;

    const maxt = acisParseValue(maxtStr);
    const mint = acisParseValue(mintStr);
    const pcpn = acisParseValue(pcpnStr);

    if (maxt !== null) monthlyMaxtF[month]!.push(maxt);
    if (mint !== null) monthlyMintF[month]!.push(mint);
    if (pcpn !== null) monthlyPcpnIn[month]!.push(pcpn);
  }

  // Average across years to produce 12-month normals
  const normMaxtF = monthlyMaxtF.map(acisAvg);
  const normMintF = monthlyMintF.map(acisAvg);
  const normPcpnIn = monthlyPcpnIn.map(acisAvg);

  // Must have temp data for at least 10 months
  const validMonths = normMaxtF.filter((v) => v !== null).length;
  if (validMonths < 10) {
    throw new Error('ACIS: too many missing months in normals computation');
  }

  // Step 4: Convert to metric and compute derived values
  const fToC = (f: number) => (f - 32) * 5 / 9;
  const inToMm = (i: number) => i * 25.4;

  const monthlyMeanC = normMaxtF.map((maxt, m) => {
    const mint = normMintF[m] ?? null;
    if (maxt === null || mint === null) return null;
    return fToC((maxt + mint) / 2);
  });
  const monthlyMinC = normMintF.map((v) => v !== null ? fToC(v) : null);
  const monthlyPrecipMm = normPcpnIn.map((v) => v !== null ? inToMm(v) : 0);

  const annualPrecipMm = Math.round(monthlyPrecipMm.reduce((a, b) => a + b, 0));
  const validMeans = monthlyMeanC.filter((v): v is number => v !== null);
  const annualMeanC = +(validMeans.reduce((a, b) => a + b, 0) / validMeans.length).toFixed(1);

  // Frost dates from monthly min temps
  const safeMinsC = monthlyMinC.map((v) => v ?? 0);
  const lastFrostDate = acisComputeLastFrost(safeMinsC);
  const firstFrostDate = acisComputeFirstFrost(safeMinsC);
  const growingDays = acisGrowingSeasonDays(lastFrostDate, firstFrostDate);

  // Growing degree days base 10°C (sum of monthly GDD contributions)
  const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const gdd = Math.round(
    monthlyMeanC.reduce<number>((sum, tc, m) =>
      sum + (tc !== null ? Math.max(0, tc - 10) * DAYS_IN_MONTH[m]! : 0), 0),
  );

  // USDA Hardiness zone: approximate from coldest month average minimum
  // Monthly avg min is ~10°C warmer than annual extreme min, so adjust
  const coldestMinC = Math.min(...safeMinsC);
  const hardinessZone = acisHardinessZone(coldestMinC);

  // Station distance → confidence
  const stationDistKm = bestDist * 111;
  const confidence: 'high' | 'medium' | 'low' =
    stationDistKm < 30 ? 'high' : stationDistKm < 60 ? 'medium' : 'low';

  // Build monthly normals array for downstream consumers (stripped from cache)
  const monthlyNormals = Array.from({ length: 12 }, (_, m) => ({
    month: m + 1,
    mean_max_c: normMaxtF[m] !== null ? +fToC(normMaxtF[m]!).toFixed(1) : null,
    mean_min_c: normMintF[m] !== null ? +fToC(normMintF[m]!).toFixed(1) : null,
    precip_mm: +monthlyPrecipMm[m]!.toFixed(1),
  }));

  // Koppen classification from monthly normals (Sprint C)
  const koppenCode = computeKoppen(monthlyMeanC, monthlyPrecipMm);

  // Freeze-thaw cycles from monthly temperatures (Sprint C)
  const freezeThaw = computeFreezeThaw(monthlyMeanC, monthlyMinC);

  // Parallel non-blocking fetches: wind rose + NASA POWER solar radiation
  const [windRose, solarData] = await Promise.all([
    fetchWindRose(lat, lng, 'US', bbox).catch(() => null as WindRoseData | null),
    fetchNasaPowerSolar(lat, lng),
  ]);

  // Solar radiation: use NASA POWER if available, else latitude estimate
  const sunshineFallback = Math.round(1800 + (35 - Math.abs(lat - 38)) * 30);
  const annualSunshine = solarData
    ? Math.round(solarData.solar_radiation_kwh_m2_day * 365 / 1.0 * 0.45) // GHI → approx sunshine hours
    : sunshineFallback;

  return {
    layerType: 'climate',
    fetchStatus: 'complete',
    confidence,
    dataDate: '1991-2020',
    sourceApi: 'NOAA ACIS (1991\u20132020 Normals)',
    attribution: `NOAA Regional Climate Centers \u2014 station: ${bestStation.name}`,
    summary: {
      annual_precip_mm: annualPrecipMm,
      annual_temp_mean_c: annualMeanC,
      growing_season_days: growingDays,
      first_frost_date: firstFrostDate,
      last_frost_date: lastFrostDate,
      hardiness_zone: hardinessZone,
      growing_degree_days_base10c: gdd,
      prevailing_wind: windRose?.prevailing ?? (lat > 42 ? 'W-SW' : 'SW'),
      annual_sunshine_hours: annualSunshine,
      noaa_station: bestStation.name,
      noaa_station_distance_km: Math.round(stationDistKm),
      // Sprint C additions
      koppen_classification: koppenCode,
      koppen_label: koppenCode ? koppenLabel(koppenCode) : null,
      freeze_thaw_cycles_per_year: freezeThaw.freeze_thaw_cycles_per_year,
      snow_months: freezeThaw.snow_months,
      solar_radiation_kwh_m2_day: solarData?.solar_radiation_kwh_m2_day ?? null,
      solar_radiation_monthly: solarData?.solar_radiation_monthly ?? null,
      _monthly_normals: monthlyNormals,
      ...(windRose ? { _wind_rose: windRose } : {}),
    },
  };
}

// ── ACIS helper functions ──────────────────────────────────────────────────

function acisParseValue(val: string): number | null {
  if (!val || val === 'M' || val === 'S') return null;
  if (val === 'T') return 0; // Trace precipitation
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

function acisAvg(arr: number[]): number | null {
  if (arr.length === 0) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function acisComputeLastFrost(monthlyMinC: number[]): string {
  // Walk backward through spring months (Jun→Jan) to find last below-freezing month
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const days = [31, 28, 31, 30, 31, 30];

  for (let m = 5; m >= 0; m--) {
    if (monthlyMinC[m]! < 0) {
      if (m < 5 && monthlyMinC[m + 1]! >= 0) {
        const range = monthlyMinC[m + 1]! - monthlyMinC[m]!;
        const frac = range > 0 ? -monthlyMinC[m]! / range : 0.5;
        const day = Math.max(1, Math.min(days[m]!, Math.round(days[m]! * (1 - frac) + 1)));
        return `${names[m + 1]} ${day}`;
      }
      return `${names[m]} ${Math.round(days[m]! * 0.5)}`;
    }
  }
  return 'Mar 15';
}

function acisComputeFirstFrost(monthlyMinC: number[]): string {
  // Walk forward through fall months (Jul→Dec) to find first below-freezing month
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  for (let m = 6; m <= 11; m++) {
    if (monthlyMinC[m]! < 0) {
      if (m > 6 && monthlyMinC[m - 1]! >= 0) {
        const range = monthlyMinC[m - 1]! - monthlyMinC[m]!;
        const frac = range > 0 ? monthlyMinC[m - 1]! / range : 0.5;
        const day = Math.max(1, Math.min(days[m]!, Math.round(frac * days[m]!)));
        return `${names[m]} ${day}`;
      }
      return `${names[m]} ${Math.round(days[m]! * 0.5)}`;
    }
  }
  return 'Nov 15';
}

function acisGrowingSeasonDays(lastFrost: string, firstFrost: string): number {
  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONTH_OFFSETS = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

  function toDoy(s: string): number {
    const parts = s.split(' ');
    const mIdx = MONTH_NAMES.indexOf(parts[0]!);
    const day = parseInt(parts[1]!, 10);
    return mIdx >= 0 ? MONTH_OFFSETS[mIdx]! + day : 150;
  }

  return Math.max(0, toDoy(firstFrost) - toDoy(lastFrost));
}

function acisHardinessZone(coldestMonthlyMinC: number): string {
  // Monthly avg min is ~8-12°C warmer than the annual extreme minimum.
  // Adjust by 10°C to approximate the extreme used in USDA zone definitions.
  const extremeMinF = (coldestMonthlyMinC - 10) * 9 / 5 + 32;
  // Zones: 10°F bands starting at Zone 1 = -60 to -50°F
  const zoneNum = Math.max(1, Math.min(13, Math.floor((extremeMinF + 60) / 10) + 1));
  const subZone = extremeMinF % 10 < 5 ? 'a' : 'b';
  return `${zoneNum}${subZone}`;
}

// ── Climate derived computations (Sprint C) ─────────────────────────────────

/**
 * Koppen-Geiger climate classification from monthly temperature and precipitation.
 * Returns code like "Cfa", "Dfb", "BSk" etc.
 */
function computeKoppen(
  monthlyMeanC: (number | null)[],
  monthlyPrecipMm: number[],
): string | null {
  const temps = monthlyMeanC.filter((v): v is number => v !== null);
  if (temps.length < 12 || monthlyPrecipMm.length < 12) return null;

  const t = monthlyMeanC as number[];
  const p = monthlyPrecipMm;
  const tWarm = Math.max(...t);
  const tCold = Math.min(...t);
  const tMean = t.reduce((a, b) => a + b, 0) / 12;
  const pAnnual = p.reduce((a, b) => a + b, 0);

  // Summer/winter halves (NH: Apr-Sep = summer; SH would flip but Atlas is NA-focused)
  const pSummer = p.slice(3, 9).reduce((a, b) => a + b, 0);
  const pWinter = pAnnual - pSummer;
  const pDriestSummer = Math.min(...p.slice(3, 9));
  const pWettestWinter = Math.max(...p.slice(0, 3), ...p.slice(9, 12));
  const pDriestWinter = Math.min(...p.slice(0, 3), ...p.slice(9, 12));
  const pWettestSummer = Math.max(...p.slice(3, 9));

  // Arid threshold (Koppen B)
  const pThreshold = pSummer >= 0.7 * pAnnual ? 2 * tMean + 28
    : pWinter >= 0.7 * pAnnual ? 2 * tMean
    : 2 * tMean + 14;

  // Group E — Polar
  if (tWarm < 10) {
    return tWarm > 0 ? 'ET' : 'EF';
  }

  // Group B — Arid
  if (pAnnual < pThreshold) {
    const subtype = pAnnual < pThreshold * 0.5 ? 'W' : 'S'; // desert vs steppe
    const temp = tMean >= 18 ? 'h' : 'k'; // hot vs cold
    return `B${subtype}${temp}`;
  }

  // Group A — Tropical (coldest month >= 18°C)
  if (tCold >= 18) {
    const pDriest = Math.min(...p);
    if (pDriest >= 60) return 'Af';
    if (pDriest >= 100 - pAnnual / 25) return 'Am';
    return 'Aw';
  }

  // Group C — Temperate (coldest month > -3°C and < 18°C)
  // Group D — Continental (coldest month <= -3°C)
  const group = tCold > -3 ? 'C' : 'D';

  // Second letter — precipitation pattern
  let second: string;
  if (pDriestSummer < 40 && pDriestSummer < pWettestWinter / 3) second = 's';
  else if (pDriestWinter < pWettestSummer / 10) second = 'w';
  else second = 'f';

  // Third letter — temperature
  let third: string;
  if (tWarm >= 22) third = 'a';
  else if (t.filter((v) => v >= 10).length >= 4) third = 'b';
  else if (group === 'D' && tCold < -38) third = 'd';
  else third = 'c';

  return `${group}${second}${third}`;
}

/** Human-readable Koppen label */
function koppenLabel(code: string): string {
  const labels: Record<string, string> = {
    Af: 'Tropical rainforest', Am: 'Tropical monsoon', Aw: 'Tropical savanna',
    BWh: 'Hot desert', BWk: 'Cold desert', BSh: 'Hot semi-arid', BSk: 'Cold semi-arid',
    Cfa: 'Humid subtropical', Cfb: 'Oceanic', Cfc: 'Subpolar oceanic',
    Csa: 'Hot-summer Mediterranean', Csb: 'Warm-summer Mediterranean',
    Cwa: 'Subtropical monsoon', Cwb: 'Subtropical highland',
    Dfa: 'Hot-summer humid continental', Dfb: 'Warm-summer humid continental',
    Dfc: 'Subarctic', Dfd: 'Extremely cold subarctic',
    Dwa: 'Monsoon humid continental', Dwb: 'Monsoon subarctic',
    ET: 'Tundra', EF: 'Ice cap',
  };
  return labels[code] ?? code;
}

/**
 * Estimate freeze-thaw cycles per year and snow months from monthly temperatures.
 */
function computeFreezeThaw(monthlyMeanC: (number | null)[], monthlyMinC: (number | null)[]): {
  freeze_thaw_cycles_per_year: number;
  snow_months: number;
} {
  let transitionMonths = 0;
  let snowMonths = 0;

  for (let m = 0; m < 12; m++) {
    const meanT = monthlyMeanC[m] ?? null;
    const minT = monthlyMinC[m] ?? null;
    if (meanT === null) continue;

    // Snow month: mean temp below 0°C
    if (meanT < 0) snowMonths++;

    // Transition month: mean near freezing (min < 0 and mean < 5°C)
    // Daily cycling between freeze and thaw
    if (minT !== null && minT < 0 && meanT > -5 && meanT < 5) {
      transitionMonths++;
    }
  }

  // Each transition month averages ~15 freeze-thaw cycles (daily cycling)
  return {
    freeze_thaw_cycles_per_year: transitionMonths * 15,
    snow_months: snowMonths,
  };
}

/**
 * Fetch solar radiation data from NASA POWER API (global, free, no key).
 * Returns annual + monthly GHI (Global Horizontal Irradiance) in kWh/m2/day.
 */
async function fetchNasaPowerSolar(lat: number, lng: number): Promise<{
  solar_radiation_kwh_m2_day: number;
  solar_radiation_monthly: number[];
} | null> {
  try {
    const url = `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=ALLSKY_SFC_SW_DWN&community=AG&longitude=${lng.toFixed(4)}&latitude=${lat.toFixed(4)}&format=JSON`;
    const resp = await fetchWithRetry(url, 12000);
    const data = await resp.json() as {
      properties?: { parameter?: { ALLSKY_SFC_SW_DWN?: Record<string, number> } };
    };

    const ghi = data?.properties?.parameter?.ALLSKY_SFC_SW_DWN;
    if (!ghi) return null;

    const monthly: number[] = [];
    for (let m = 1; m <= 12; m++) {
      const key = String(m).padStart(2, '0');
      monthly.push(+(ghi[key] ?? 0).toFixed(2));
    }
    const annual = ghi['ANN'] ?? +(monthly.reduce((a, b) => a + b, 0) / 12).toFixed(2);

    return {
      solar_radiation_kwh_m2_day: +annual.toFixed(2),
      solar_radiation_monthly: monthly,
    };
  } catch {
    return null;
  }
}

// ── Latitude-based climate fallback (low confidence) ──────────────────────

function climateFromLatitude(lat: number, lng: number, country: string): MockLayerResult {
  const annualTemp = +(14.5 - (lat - 35) * 0.55).toFixed(1);
  const precipMm = Math.round(800 + (lat > 42 ? (48 - lat) * 20 : (lat - 35) * 15));
  const growingDays = Math.round(220 - (lat - 35) * 6.5);
  const frostFreeStart = Math.round(90 + (lat - 35) * 3.5);
  const frostFreeEnd = Math.round(300 - (lat - 35) * 3);
  const lastFrostDate = dayOfYearToDate(frostFreeStart);
  const firstFrostDate = dayOfYearToDate(frostFreeEnd);
  const zoneNum = Math.max(3, Math.min(9, Math.round(12.5 - (lat - 25) * 0.18)));
  const zoneSub = lat % 2 > 1 ? 'a' : 'b';

  // Latitude-based wind rose (no station data available)
  const windRose = windRoseFromLatitude(lat);

  return {
    layerType: 'climate',
    fetchStatus: 'complete',
    confidence: 'low',
    dataDate: new Date().toISOString().split('T')[0]!,
    sourceApi: country === 'CA' ? 'Estimated (ECCC-derived)' : 'Estimated (NOAA-derived)',
    attribution: country === 'CA' ? 'Latitude-based estimate from ECCC normals' : 'Latitude-based estimate from NOAA normals',
    summary: {
      annual_precip_mm: precipMm,
      annual_temp_mean_c: annualTemp,
      growing_season_days: growingDays,
      first_frost_date: firstFrostDate,
      last_frost_date: lastFrostDate,
      hardiness_zone: `${zoneNum}${zoneSub}`,
      prevailing_wind: windRose.prevailing,
      annual_sunshine_hours: Math.round(1800 + (35 - Math.abs(lat - 38)) * 30),
      // Sprint C — null in fallback mode (no monthly data available)
      koppen_classification: null,
      koppen_label: null,
      freeze_thaw_cycles_per_year: null,
      snow_months: null,
      solar_radiation_kwh_m2_day: null,
      solar_radiation_monthly: null,
      _wind_rose: windRose,
    },
  };
}

async function fetchEcccClimate(lat: number, lng: number): Promise<MockLayerResult> {
  // OGC API Features — find nearest climate normal station within 0.5° (~50 km)
  const bbox = `${(lng - 0.5).toFixed(4)},${(lat - 0.5).toFixed(4)},${(lng + 0.5).toFixed(4)},${(lat + 0.5).toFixed(4)}`;
  const url = `https://api.weather.gc.ca/collections/climate-normals/items?f=json&bbox=${bbox}&limit=5`;
  const resp = await fetchWithRetry(url, 10000);
  const data = await resp.json() as { features?: { geometry: { coordinates: [number, number] }; properties: Record<string, unknown> }[] };

  const features = data?.features;
  if (!features || features.length === 0) throw new Error('ECCC: no stations in bbox');

  // Pick nearest station by Euclidean degree distance
  const nearest = features.reduce((best, f) => {
    const [fLng, fLat] = f.geometry.coordinates;
    const dist = Math.hypot((fLng - lng), (fLat - lat));
    const [bLng, bLat] = best.geometry.coordinates;
    const bestDist = Math.hypot((bLng - lng), (bLat - lat));
    return dist < bestDist ? f : best;
  });

  const p = nearest.properties;

  const annualPrecip = p['ANNUAL_PRECIP'] != null ? parseFloat(String(p['ANNUAL_PRECIP'])) : null;
  const meanTemp = p['MEAN_TEMP'] != null ? parseFloat(String(p['MEAN_TEMP'])) : null;
  const frostFreeDays = p['FROST_FREE_PERIOD'] != null ? parseInt(String(p['FROST_FREE_PERIOD']), 10) : null;
  const lastFrost = p['LAST_SPRING_FROST_DATE'] ?? p['LAST_FROST_DATE'] ?? null;
  const firstFrost = p['FIRST_FALL_FROST_DATE'] ?? p['FIRST_FROST_DATE'] ?? null;
  const hardinessZone = p['HARDINESS_ZONE'] ?? p['CLIMATE_ZONE'] ?? null;

  if (annualPrecip === null && meanTemp === null) {
    throw new Error('ECCC: missing core climate fields');
  }

  // Parallel non-blocking fetches: wind rose + NASA POWER solar radiation
  const [windRose, solarData] = await Promise.all([
    fetchWindRose(lat, lng, 'CA').catch(() => null as WindRoseData | null),
    fetchNasaPowerSolar(lat, lng),
  ]);

  // Solar radiation: use NASA POWER if available, else latitude estimate
  const sunshineFallback = Math.round(1800 + (35 - Math.abs(lat - 38)) * 30);
  const annualSunshine = solarData
    ? Math.round(solarData.solar_radiation_kwh_m2_day * 365 / 1.0 * 0.45)
    : sunshineFallback;

  // Estimate freeze-thaw from mean temp (rough — no monthly breakdown from ECCC)
  const snowMonthsEst = meanTemp != null && meanTemp < 5 ? Math.round(Math.max(0, 6 - meanTemp)) : 0;

  return {
    layerType: 'climate',
    fetchStatus: 'complete',
    confidence: 'high',
    dataDate: new Date().toISOString().split('T')[0]!,
    sourceApi: 'ECCC Climate Normals (OGC API)',
    attribution: 'Environment and Climate Change Canada',
    summary: {
      annual_precip_mm: annualPrecip ?? 'N/A',
      annual_temp_mean_c: meanTemp != null ? +meanTemp.toFixed(1) : 'N/A',
      growing_season_days: !isNaN(frostFreeDays!) ? frostFreeDays : 'N/A',
      last_frost_date: lastFrost ?? 'N/A',
      first_frost_date: firstFrost ?? 'N/A',
      hardiness_zone: hardinessZone ?? 'N/A',
      prevailing_wind: windRose?.prevailing ?? (lat > 42 ? 'W-SW' : 'SW'),
      annual_sunshine_hours: annualSunshine,
      // Sprint C additions
      koppen_classification: null, // ECCC doesn't provide monthly breakdown for Koppen
      koppen_label: null,
      freeze_thaw_cycles_per_year: snowMonthsEst > 0 ? snowMonthsEst * 15 : 0,
      snow_months: snowMonthsEst,
      solar_radiation_kwh_m2_day: solarData?.solar_radiation_kwh_m2_day ?? null,
      solar_radiation_monthly: solarData?.solar_radiation_monthly ?? null,
      ...(windRose ? { _wind_rose: windRose } : {}),
    },
  };
}

function dayOfYearToDate(doy: number): string {
  const d = new Date(2024, 0, doy);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

// ── Watershed (USGS WBD for US, OHN for CA) ───────────────────────────────

async function fetchWatershed(lat: number, lng: number, country: string): Promise<MockLayerResult> {
  if (country === 'CA') {
    try {
      return await fetchOhnWatercourse(lat, lng);
    } catch {
      return watershedFromLatitude(lat, lng, country);
    }
  }

  if (country !== 'US') return watershedFromLatitude(lat, lng, country);

  try {
    // Query HUC12 from USGS Watershed Boundary Dataset
    const url = `https://hydro.nationalmap.gov/arcgis/rest/services/wbd/MapServer/6/query?where=1%3D1&geometry=${lng}%2C${lat}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=HUC12%2CNAME%2CSTATES&returnGeometry=false&f=json`;
    const resp = await fetchWithRetry(url, 10000);
    const data = await resp.json();

    const feature = data.features?.[0]?.attributes;
    if (!feature) return watershedFromLatitude(lat, lng, country);

    const huc12 = feature.huc12 ?? feature.HUC12 ?? '';
    const name = feature.name ?? feature.NAME ?? 'Unknown';

    return {
      layerType: 'watershed',
      fetchStatus: 'complete',
      confidence: 'high',
      dataDate: new Date().toISOString().split('T')[0]!,
      sourceApi: 'USGS WBD (NHD Plus)',
      attribution: 'U.S. Geological Survey',
      summary: {
        huc_code: huc12,
        watershed_name: name,
        nearest_stream_m: 'Query available',
        stream_order: 'N/A',
        catchment_area_ha: 'N/A',
        flow_direction: lng < -90 ? 'S' : lng < -80 ? 'SE' : 'E',
      },
    };
  } catch {
    return watershedFromLatitude(lat, lng, country);
  }
}

async function fetchOhnWatercourse(lat: number, lng: number): Promise<MockLayerResult> {
  // Buffer ~1 km at Ontario latitudes (1° ≈ 111 km)
  const buf = 0.009;
  const envelope = encodeURIComponent(JSON.stringify({
    xmin: lng - buf, ymin: lat - buf,
    xmax: lng + buf, ymax: lat + buf,
    spatialReference: { wkid: 4326 },
  }));
  const url =
    `https://ws.lioservices.lrc.gov.on.ca/arcgis2/rest/services/LIO_OPEN_DATA/LIO_Open01/MapServer/26/query` +
    `?geometry=${envelope}&geometryType=esriGeometryEnvelope&spatialRel=esriSpatialRelIntersects` +
    `&outFields=*&returnGeometry=true&f=json`;

  const resp = await fetchWithRetry(url, 10000);
  const data = await resp.json() as { features?: { attributes: Record<string, unknown>; geometry?: { paths: number[][][] } }[] };

  const features = data?.features;
  if (!features || features.length === 0) throw new Error('OHN: no watercourse features in bbox');

  // Find vertex closest to query point (degrees → metres with cos(lat) correction)
  const cosLat = Math.cos(lat * Math.PI / 180);
  let minDistM = Infinity;
  let closestAttrs: Record<string, unknown> = {};

  for (const feature of features) {
    const paths = feature.geometry?.paths ?? [];
    for (const path of paths) {
      for (const vertex of path) {
        const dy = ((vertex[1] ?? 0) - lat) * 111000;
        const dx = ((vertex[0] ?? 0) - lng) * 111000 * cosLat;
        const dist = Math.hypot(dx, dy);
        if (dist < minDistM) {
          minDistM = dist;
          closestAttrs = feature.attributes;
        }
      }
    }
  }

  const nearestM = Math.round(minDistM);

  // Field name fallback chains — LIO field names vary between service versions
  const watercourseNameRaw =
    closestAttrs['OFFICIAL_NAME'] ??
    closestAttrs['NAME_EN'] ??
    closestAttrs['WATERCOURSE_NAME'] ??
    closestAttrs['FEAT_NAME'] ??
    'Unnamed watercourse';

  const streamOrderRaw =
    closestAttrs['STREAM_ORDER'] ??
    closestAttrs['STRAHLER_ORDER'] ??
    closestAttrs['ORDER_'] ??
    closestAttrs['STRAHLER'] ??
    deriveFallbackStreamOrder(features.length);

  return {
    layerType: 'watershed',
    fetchStatus: 'complete',
    confidence: nearestM < 1000 ? 'high' : 'medium',
    dataDate: new Date().toISOString().split('T')[0]!,
    sourceApi: 'Ontario Hydro Network (LIO)',
    attribution: 'Ontario Ministry of Natural Resources and Forestry',
    summary: {
      huc_code: 'N/A',
      watershed_name: String(watercourseNameRaw),
      nearest_stream_m: nearestM,
      stream_order: streamOrderRaw,
      catchment_area_ha: 'N/A',
      flow_direction: lng < -79 ? 'E to S' : 'SE to NW',
    },
  };
}

function deriveFallbackStreamOrder(featureCount: number): number {
  // Rough proxy: more features in 1 km bbox → smaller (tributary) streams
  return featureCount > 5 ? 1 : featureCount > 2 ? 2 : 3;
}

function watershedFromLatitude(lat: number, lng: number, country: string): MockLayerResult {
  const isGreatLakes = lat > 41 && lat < 47 && lng > -84 && lng < -75;
  const name = country === 'CA'
    ? (isGreatLakes ? 'Lake Ontario Basin' : 'St. Lawrence Basin')
    : (isGreatLakes ? 'Great Lakes Basin' : lat > 40 ? 'Upper Ohio Basin' : 'Chesapeake Bay Basin');

  return {
    layerType: 'watershed',
    fetchStatus: 'complete',
    confidence: 'medium',
    dataDate: new Date().toISOString().split('T')[0]!,
    sourceApi: country === 'CA' ? 'Estimated (Ontario Hydro Network)' : 'Estimated (NHD Plus)',
    attribution: 'Regional estimate',
    summary: {
      huc_code: 'N/A',
      watershed_name: name,
      nearest_stream_m: 'Estimated',
      stream_order: 2,
      catchment_area_ha: 'N/A',
      flow_direction: lng < -79 ? 'E to S' : 'SE to NW',
    },
  };
}

// ── Wetlands & Flood (FEMA NFHL + NWI for US, LIO CA Regulation + Wetlands for CA) ──

async function fetchWetlandsFlood(
  lat: number,
  lng: number,
  country: string,
  bbox?: [number, number, number, number],
): Promise<MockLayerResult> {
  // CA: try LIO Conservation Authority Regulation Limits + Ontario Wetland Inventory
  if (country === 'CA') {
    try {
      return await fetchLioFloodWetlands(lat, lng, bbox);
    } catch {
      return wetlandsUnavailable('CA');
    }
  }

  if (country !== 'US') return wetlandsUnavailable(country);

  const effectiveBbox: [number, number, number, number] = bbox ?? [
    lng - 0.005, lat - 0.005, lng + 0.005, lat + 0.005,
  ];

  // US: Fetch FEMA flood zones and NWI wetlands in parallel
  const [floodResult, nwiResult] = await Promise.allSettled([
    fetchFemaFlood(lat, lng, effectiveBbox),
    fetchNwiWetlands(lat, lng, effectiveBbox),
  ]);

  const flood = floodResult.status === 'fulfilled' ? floodResult.value : null;
  const nwi = nwiResult.status === 'fulfilled' ? nwiResult.value : null;

  if (!flood && !nwi) return wetlandsUnavailable('US');

  // ── Flood zone classification ─────────────────────────────────────────
  const floodZone = flood?.zone ?? 'Zone X';
  const isHighRisk = FEMA_HIGH_RISK_ZONES.has(floodZone);
  const isModerateRisk = FEMA_MODERATE_RISK_ZONES.has(floodZone);

  let floodRisk: string;
  if (isHighRisk) {
    floodRisk = 'High risk \u2014 Special Flood Hazard Area (1% annual chance flood)';
  } else if (isModerateRisk) {
    floodRisk = 'Moderate risk \u2014 0.2% annual chance flood area';
  } else {
    floodRisk = 'Minimal risk \u2014 outside identified Special Flood Hazard Areas';
  }

  const floodLabel = `${floodZone}${flood?.subtype ? ` (${flood.subtype})` : ''}`;

  // ── Wetland coverage percentage ───────────────────────────────────────
  const cosLat = Math.cos(lat * Math.PI / 180);
  const widthM = (effectiveBbox[2] - effectiveBbox[0]) * 111320 * cosLat;
  const heightM = (effectiveBbox[3] - effectiveBbox[1]) * 111320;
  const bboxAreaHa = (widthM * heightM) / 10000;
  const wetlandPct = nwi && bboxAreaHa > 0
    ? +(nwi.totalAreaHa / bboxAreaHa * 100).toFixed(1)
    : 0;

  // ── Merged result ─────────────────────────────────────────────────────
  const sources: string[] = [];
  const attributions: string[] = [];
  if (flood) { sources.push('FEMA NFHL'); attributions.push('FEMA'); }
  if (nwi) { sources.push('USFWS NWI'); attributions.push('U.S. Fish & Wildlife Service'); }

  return {
    layerType: 'wetlands_flood',
    fetchStatus: 'complete',
    confidence: flood && nwi ? 'high' : 'medium',
    dataDate: new Date().toISOString().split('T')[0]!,
    sourceApi: sources.join(' + '),
    attribution: attributions.join(', '),
    summary: {
      flood_zone: floodLabel,
      flood_risk: floodRisk,
      base_flood_elevation_ft: flood?.bfe ?? 'N/A',
      static_bfe_ft: flood?.staticBfe ?? 'N/A',
      fema_panel: flood?.panel ?? 'N/A',
      wetland_pct: wetlandPct,
      wetland_types: nwi?.types ?? [],
      wetland_count: nwi?.count ?? 0,
      wetland_area_ha: nwi?.totalAreaHa ?? 0,
      riparian_buffer_m: 30,
      regulated_area_pct: isHighRisk
        ? 'Yes \u2014 development restrictions apply (SFHA)'
        : isModerateRisk
          ? 'Possible \u2014 check local floodplain ordinance'
          : 'No federal flood restrictions identified',
    },
  };
}

// ── FEMA flood zone classifications ────────────────────────────────────────

/** FEMA Special Flood Hazard Areas — 1% annual chance (100-year) flood. */
const FEMA_HIGH_RISK_ZONES = new Set(['A', 'AE', 'AH', 'AO', 'AR', 'A99', 'V', 'VE']);
/** Moderate-risk zones — 0.2% annual chance (500-year) flood. */
const FEMA_MODERATE_RISK_ZONES = new Set(['B', 'X PROTECTED BY LEVEE', '0.2 PCT ANNUAL CHANCE FLOOD HAZARD']);

function femaDescribeZone(zone: string, subtype: string): string {
  switch (zone) {
    case 'A': return 'Flood zone A \u2014 high-risk area, no BFE determined';
    case 'AE': return `Flood zone AE \u2014 high-risk area with base flood elevation${subtype ? ` (${subtype})` : ''}`;
    case 'AH': return 'Flood zone AH \u2014 shallow flooding (1\u20133 ft ponding)';
    case 'AO': return 'Flood zone AO \u2014 shallow flooding (sheet flow 1\u20133 ft)';
    case 'AR': return 'Flood zone AR \u2014 flood risk due to levee restoration';
    case 'A99': return 'Flood zone A99 \u2014 protected by levee under construction';
    case 'V': return 'Flood zone V \u2014 coastal high-risk with wave action, no BFE';
    case 'VE': return 'Flood zone VE \u2014 coastal high-risk with wave action and BFE';
    case 'X':
      if (subtype) return `Flood zone X (${subtype})`;
      return 'Flood zone X \u2014 minimal flood risk';
    case 'D': return 'Flood zone D \u2014 undetermined risk (no analysis performed)';
    default: return `Flood zone ${zone}${subtype ? ` (${subtype})` : ''}`;
  }
}

// ── US sub-fetchers (FEMA + NWI) ──────────────────────────────────────────

interface FemaFloodResult {
  zone: string;
  subtype: string;
  bfe: number | null;
  staticBfe: number | null;
  panel: string | null;
  description: string;
}

/**
 * Query FEMA National Flood Hazard Layer (NFHL) for flood zone designation.
 *
 * Queries layer 28 (S_FLD_HAZ_AR — flood hazard areas) at the project
 * centroid, returning zone designation, base flood elevation, and FIRM panel.
 * Uses bbox envelope when available to catch zone boundaries near edges.
 */
async function fetchFemaFlood(
  lat: number,
  lng: number,
  bbox: [number, number, number, number],
): Promise<FemaFloodResult | null> {
  try {
    // Query the flood hazard area polygon at the centroid point first
    const pointUrl =
      `https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer/28/query` +
      `?where=1%3D1&geometry=${lng}%2C${lat}` +
      `&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects` +
      `&outFields=FLD_ZONE%2CZONE_SUBTY%2CSTATIC_BFE%2CDEPTH%2CVELOCITY%2CSOURCE_CIT%2CBFE_REVERT%2CDFIRM_ID` +
      `&returnGeometry=false&f=json`;

    const resp = await fetchWithRetry(pointUrl, 8000);
    const data = await resp.json() as { features?: { attributes: Record<string, unknown> }[] };

    const features = data?.features;
    if (!features || features.length === 0) {
      // No FEMA coverage at this point — area may not be mapped
      return null;
    }

    // Take the first (most relevant) flood zone polygon
    const attr = features[0]!.attributes;
    const zone = String(attr['FLD_ZONE'] ?? 'X');
    const subtype = String(attr['ZONE_SUBTY'] ?? '');

    // Base Flood Elevation — STATIC_BFE is the primary field for AE zones
    const staticBfeRaw = attr['STATIC_BFE'];
    const staticBfe = staticBfeRaw != null && staticBfeRaw !== -9999 && staticBfeRaw !== -999
      ? parseFloat(String(staticBfeRaw))
      : null;

    // BFE_REVERT is used when a zone was revised — keep as secondary
    const bfeRevertRaw = attr['BFE_REVERT'];
    const bfeRevert = bfeRevertRaw != null && bfeRevertRaw !== -9999 && bfeRevertRaw !== -999
      ? parseFloat(String(bfeRevertRaw))
      : null;

    const bfe = staticBfe ?? bfeRevert ?? null;

    // DFIRM panel identifier
    const panel = attr['DFIRM_ID'] ? String(attr['DFIRM_ID']) : null;

    // If project bbox spans multiple zones, query with envelope to detect
    // the highest-risk zone touching the property
    if (bbox && !FEMA_HIGH_RISK_ZONES.has(zone)) {
      try {
        const envResult = await fetchFemaBboxHighestRisk(bbox, zone, subtype, bfe, panel);
        if (envResult) return envResult;
      } catch { /* keep point result */ }
    }

    return {
      zone,
      subtype,
      bfe: bfe !== null && !isNaN(bfe) ? +bfe.toFixed(1) : null,
      staticBfe: staticBfe !== null && !isNaN(staticBfe) ? +staticBfe.toFixed(1) : null,
      panel,
      description: femaDescribeZone(zone, subtype),
    };
  } catch {
    return null;
  }
}

/**
 * Secondary FEMA query using the project bbox envelope.
 * Detects when a property straddles a flood zone boundary — the centroid
 * might be in Zone X while a portion falls within AE.
 * Returns the highest-risk zone found, or null to keep the point result.
 */
async function fetchFemaBboxHighestRisk(
  bbox: [number, number, number, number],
  pointZone: string,
  pointSubtype: string,
  pointBfe: number | null,
  pointPanel: string | null,
): Promise<FemaFloodResult | null> {
  const envUrl =
    `https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer/28/query` +
    `?where=1%3D1&geometry=${bbox[0]}%2C${bbox[1]}%2C${bbox[2]}%2C${bbox[3]}` +
    `&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects` +
    `&outFields=FLD_ZONE%2CZONE_SUBTY%2CSTATIC_BFE%2CDFIRM_ID` +
    `&returnGeometry=false&resultRecordCount=10&f=json`;

  const resp = await fetchWithRetry(envUrl, 8000);
  const data = await resp.json() as { features?: { attributes: Record<string, unknown> }[] };

  const features = data?.features;
  if (!features || features.length <= 1) return null;

  // Find the highest-risk zone in the bbox
  let worstZone = pointZone;
  let worstSubtype = pointSubtype;
  let worstBfe = pointBfe;
  let worstPanel = pointPanel;

  for (const f of features) {
    const z = String(f.attributes['FLD_ZONE'] ?? 'X');
    if (femaZoneRank(z) > femaZoneRank(worstZone)) {
      worstZone = z;
      worstSubtype = String(f.attributes['ZONE_SUBTY'] ?? '');
      const sbfe = f.attributes['STATIC_BFE'];
      worstBfe = sbfe != null && sbfe !== -9999 ? parseFloat(String(sbfe)) : null;
      worstPanel = f.attributes['DFIRM_ID'] ? String(f.attributes['DFIRM_ID']) : pointPanel;
    }
  }

  // Only upgrade if we found a higher-risk zone than the centroid
  if (femaZoneRank(worstZone) <= femaZoneRank(pointZone)) return null;

  return {
    zone: worstZone,
    subtype: worstSubtype,
    bfe: worstBfe !== null && !isNaN(worstBfe) ? +worstBfe.toFixed(1) : null,
    staticBfe: worstBfe !== null && !isNaN(worstBfe) ? +worstBfe.toFixed(1) : null,
    panel: worstPanel,
    description: femaDescribeZone(worstZone, worstSubtype),
  };
}

/** Risk ranking for FEMA zones — higher number = higher flood risk. */
function femaZoneRank(zone: string): number {
  if (zone === 'VE' || zone === 'V') return 6;
  if (zone === 'AE') return 5;
  if (zone === 'AH' || zone === 'AO') return 4;
  if (zone === 'A' || zone === 'AR' || zone === 'A99') return 3;
  if (zone === 'D') return 2;
  if (zone === 'B' || zone.includes('0.2 PCT')) return 1;
  return 0; // X, C, or unclassified
}

interface NwiWetlandsResult {
  count: number;
  types: string[];
  totalAreaHa: number;
}

/**
 * Query USFWS National Wetlands Inventory for the project bbox.
 *
 * Returns polygon features with ACRES (or SHAPE_Area) for area calculation,
 * plus Cowardin classification codes decoded to human-readable type names.
 */
async function fetchNwiWetlands(
  lat: number,
  lng: number,
  bbox: [number, number, number, number],
): Promise<NwiWetlandsResult | null> {
  try {
    const url =
      `https://www.fws.gov/wetlands/arcgis/rest/services/Wetlands/MapServer/0/query` +
      `?where=1%3D1` +
      `&geometry=${bbox[0]}%2C${bbox[1]}%2C${bbox[2]}%2C${bbox[3]}` +
      `&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects` +
      `&outFields=WETLAND_TYPE%2CATTRIBUTE%2CACRES%2CSHAPE_Area` +
      `&returnGeometry=false&resultRecordCount=100&f=json`;

    const resp = await fetchWithRetry(url, 10000);
    const data = await resp.json() as { features?: { attributes: Record<string, unknown> }[] };

    const features = data?.features;
    if (!features || features.length === 0) return null;

    // Accumulate area and collect unique wetland types
    let totalAreaHa = 0;
    const typeSet = new Set<string>();

    for (const f of features) {
      const attrs = f.attributes;

      // Area: ACRES is authoritative; SHAPE_Area is m² in the service projection
      const acresRaw = attrs['ACRES'];
      const shapeAreaRaw = attrs['SHAPE_Area'];
      if (acresRaw != null && acresRaw !== 0) {
        totalAreaHa += parseFloat(String(acresRaw)) * 0.404686; // acres → ha
      } else if (shapeAreaRaw != null && shapeAreaRaw !== 0) {
        totalAreaHa += parseFloat(String(shapeAreaRaw)) / 10000; // m² → ha
      }

      // Wetland type — Cowardin classification code
      const code = String(attrs['WETLAND_TYPE'] ?? attrs['ATTRIBUTE'] ?? '');
      if (code) typeSet.add(code);
    }

    // Decode NWI Cowardin codes to readable names
    const readableTypes = [...typeSet].slice(0, 8).map(nwiDecodeType);
    // Deduplicate after decoding (multiple codes may map to the same name)
    const uniqueTypes = [...new Set(readableTypes)].slice(0, 6);

    return {
      count: features.length,
      types: uniqueTypes,
      totalAreaHa: +totalAreaHa.toFixed(2),
    };
  } catch {
    return null;
  }
}

/**
 * Decode NWI Cowardin classification codes to human-readable names.
 * Handles both the compact code format (PEM1, PFO1A) and the
 * long-form text labels returned by some NWI service versions.
 */
function nwiDecodeType(code: string): string {
  // Already a readable string from some NWI service versions
  if (code.includes('Freshwater') || code.includes('Estuarine') || code.includes('Riverine')) return code;

  // System prefix decode
  const c = code.toUpperCase();
  if (c.startsWith('PEM')) return 'Palustrine Emergent';
  if (c.startsWith('PFO')) return 'Palustrine Forested';
  if (c.startsWith('PSS')) return 'Palustrine Scrub-Shrub';
  if (c.startsWith('PUB')) return 'Palustrine Unconsolidated Bottom';
  if (c.startsWith('PAB')) return 'Palustrine Aquatic Bed';
  if (c.startsWith('POW') || c.startsWith('PUS')) return 'Palustrine Open Water';
  if (c.startsWith('R1')) return 'Riverine Tidal';
  if (c.startsWith('R2')) return 'Riverine Lower Perennial';
  if (c.startsWith('R3')) return 'Riverine Upper Perennial';
  if (c.startsWith('R4')) return 'Riverine Intermittent';
  if (c.startsWith('R5')) return 'Riverine Unknown Perennial';
  if (c.startsWith('R')) return 'Riverine';
  if (c.startsWith('L1')) return 'Lacustrine Limnetic';
  if (c.startsWith('L2')) return 'Lacustrine Littoral';
  if (c.startsWith('L')) return 'Lacustrine';
  if (c.startsWith('E2')) return 'Estuarine Intertidal';
  if (c.startsWith('E1')) return 'Estuarine Subtidal';
  if (c.startsWith('E')) return 'Estuarine';
  if (c.startsWith('M')) return 'Marine';
  return code;
}

// ── Canada sub-fetchers (LIO Conservation Authority + Ontario Wetland Inventory) ──

interface LioRegulationResult {
  isRegulated: boolean;
  caName: string | null;
  regType: string | null;
}

interface LioWetlandResult {
  totalAreaHa: number;
  types: string[];
  count: number;
  hasSignificant: boolean;
}

/**
 * Fetch Ontario Conservation Authority flood/regulation data and provincial
 * wetland inventory data in parallel, combining into a single result.
 *
 * LIO field names vary between service versions — every attribute access
 * uses a fallback chain to stay resilient across schema changes.
 */
async function fetchLioFloodWetlands(
  lat: number,
  lng: number,
  bbox?: [number, number, number, number],
): Promise<MockLayerResult> {
  const effectiveBbox: [number, number, number, number] = bbox ?? [
    lng - 0.005, lat - 0.005, lng + 0.005, lat + 0.005,
  ];

  const envelope = encodeURIComponent(JSON.stringify({
    xmin: effectiveBbox[0], ymin: effectiveBbox[1],
    xmax: effectiveBbox[2], ymax: effectiveBbox[3],
    spatialReference: { wkid: 4326 },
  }));

  // Fetch Conservation Authority regulation limits and wetlands in parallel
  const [regResult, wetResult] = await Promise.allSettled([
    fetchLioRegulation(envelope),
    fetchLioWetlands(envelope),
  ]);

  const reg = regResult.status === 'fulfilled' ? regResult.value : null;
  const wet = wetResult.status === 'fulfilled' ? wetResult.value : null;

  // If both sub-fetchers returned nothing, throw so the caller hits the fallback
  if (!reg && !wet) throw new Error('LIO: no flood/wetland data in project area');

  // Compute project bbox area in hectares for wetland coverage percentage
  const cosLat = Math.cos(lat * Math.PI / 180);
  const widthM = (effectiveBbox[2] - effectiveBbox[0]) * 111320 * cosLat;
  const heightM = (effectiveBbox[3] - effectiveBbox[1]) * 111320;
  const bboxAreaHa = (widthM * heightM) / 10000;

  // Flood zone classification
  const isRegulated = reg?.isRegulated ?? false;
  const floodZone = isRegulated
    ? `CA Regulated \u2014 ${reg?.regType ?? 'Development restricted within regulation limit'}`
    : 'Not within identified CA regulation limits';

  // Wetland coverage
  const wetlandAreaHa = wet?.totalAreaHa ?? 0;
  const wetlandPct = bboxAreaHa > 0 ? +(wetlandAreaHa / bboxAreaHa * 100).toFixed(1) : 0;

  // Riparian buffer depends on CA — most Ontario CAs enforce 15-30m
  const bufferNote = isRegulated
    ? 'Per CA regulation (typically 15\u201330m from watercourse, 120m from PSW)'
    : 30;

  // Build source/attribution from which sub-fetchers succeeded
  const sources: string[] = [];
  const attributions: string[] = [];
  if (reg) { sources.push('LIO CA Regulation Limits'); attributions.push('Ontario MNRF'); }
  if (wet) { sources.push('Ontario Wetland Inventory (LIO)'); attributions.push('Ontario NHIC / MNRF'); }

  return {
    layerType: 'wetlands_flood',
    fetchStatus: 'complete',
    confidence: reg && wet ? 'high' : 'medium',
    dataDate: new Date().toISOString().split('T')[0]!,
    sourceApi: sources.join(' + '),
    attribution: [...new Set(attributions)].join(', '),
    summary: {
      flood_zone: floodZone,
      flood_risk: isRegulated
        ? 'Within Conservation Authority regulated area \u2014 development requires CA permit under O.Reg. 97/04'
        : 'Outside identified CA regulation limits \u2014 verify with local Conservation Authority',
      wetland_pct: wetlandPct,
      wetland_types: wet?.types ?? [],
      wetland_count: wet?.count ?? 0,
      wetland_area_ha: wetlandAreaHa,
      has_significant_wetland: wet?.hasSignificant ?? false,
      riparian_buffer_m: bufferNote,
      regulated_area_pct: isRegulated
        ? `Yes \u2014 ${reg?.caName ?? 'Conservation Authority'} regulation area`
        : 'Not within identified regulated area',
      conservation_authority: reg?.caName ?? null,
    },
  };
}

/**
 * Query LIO Conservation Authority Regulation Limits.
 * This layer represents the outer boundary within which CAs regulate
 * development under Ontario Regulation 97/04 (and successors).
 */
async function fetchLioRegulation(envelope: string): Promise<LioRegulationResult | null> {
  // LIO_Open14 contains planning/regulatory layers
  // Try multiple known layer indices — CA Regulation Limits moves between versions
  const layerUrls = [
    `https://ws.lioservices.lrc.gov.on.ca/arcgis1071a/rest/services/LIO_OPEN_DATA/LIO_Open14/MapServer/0/query`,
    `https://ws.lioservices.lrc.gov.on.ca/arcgis1071a/rest/services/LIO_OPEN_DATA/LIO_Open14/MapServer/1/query`,
  ];

  for (const baseUrl of layerUrls) {
    try {
      const url =
        `${baseUrl}?geometry=${envelope}&geometryType=esriGeometryEnvelope` +
        `&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=false&f=json`;

      const resp = await fetchWithRetry(url, 10000);
      const data = await resp.json() as { features?: { attributes: Record<string, unknown> }[] };

      const features = data?.features;
      if (!features || features.length === 0) continue;

      const attrs = features[0]!.attributes;

      // Field name fallback chains — LIO field names vary between service versions
      const caName =
        attrs['CA_NAME'] ??
        attrs['CONSERVATION_AUTHORITY'] ??
        attrs['AUTHORITY_NAME'] ??
        attrs['OFFICIAL_NAME'] ??
        attrs['NAME'] ??
        null;

      const regType =
        attrs['REG_TYPE'] ??
        attrs['REGULATION_TYPE'] ??
        attrs['REGULATION_LIMIT'] ??
        attrs['TYPE'] ??
        attrs['CLASS'] ??
        null;

      return {
        isRegulated: true,
        caName: caName ? String(caName) : null,
        regType: regType ? lioFormatRegType(String(regType)) : null,
      };
    } catch {
      continue;
    }
  }

  // No features found in any layer — area is not within a regulation limit
  return { isRegulated: false, caName: null, regType: null };
}

function lioFormatRegType(raw: string): string {
  const t = raw.toLowerCase();
  if (t.includes('flood')) return 'Flood plain';
  if (t.includes('erosion')) return 'Erosion hazard';
  if (t.includes('dynamic')) return 'Dynamic beach hazard';
  if (t.includes('wetland')) return 'Wetland regulation area';
  if (t.includes('shoreline')) return 'Shoreline hazard';
  return raw;
}

/**
 * Query LIO Ontario Wetland Inventory.
 * Returns evaluated wetlands (PSW and non-PSW) that intersect the project bbox.
 * Computes total area and collects wetland type classifications.
 */
async function fetchLioWetlands(envelope: string): Promise<LioWetlandResult | null> {
  // LIO_Open05 contains natural heritage features including evaluated wetlands
  // Try multiple known layer indices
  const layerUrls = [
    `https://ws.lioservices.lrc.gov.on.ca/arcgis1071a/rest/services/LIO_OPEN_DATA/LIO_Open05/MapServer/2/query`,
    `https://ws.lioservices.lrc.gov.on.ca/arcgis1071a/rest/services/LIO_OPEN_DATA/LIO_Open05/MapServer/3/query`,
    `https://ws.lioservices.lrc.gov.on.ca/arcgis1071a/rest/services/LIO_OPEN_DATA/LIO_Open05/MapServer/4/query`,
  ];

  for (const baseUrl of layerUrls) {
    try {
      const url =
        `${baseUrl}?geometry=${envelope}&geometryType=esriGeometryEnvelope` +
        `&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=false` +
        `&resultRecordCount=50&f=json`;

      const resp = await fetchWithRetry(url, 10000);
      const data = await resp.json() as { features?: { attributes: Record<string, unknown> }[] };

      const features = data?.features;
      if (!features || features.length === 0) continue;

      let totalAreaHa = 0;
      let hasSignificant = false;
      const typeSet = new Set<string>();

      for (const f of features) {
        const attrs = f.attributes;

        // Area (hectares) — field name fallback chain
        const areaRaw =
          attrs['AREA_HA'] ??
          attrs['WETLAND_AREA_HA'] ??
          attrs['SHAPE_Area'] ??
          attrs['SHAPE_AREA'] ??
          attrs['TOTAL_AREA'] ??
          null;
        if (areaRaw != null) {
          let ha = parseFloat(String(areaRaw));
          // SHAPE_Area is typically in m² for projected CRS — convert if suspiciously large
          if (ha > 100000) ha = ha / 10000;
          totalAreaHa += ha;
        }

        // Wetland type — field name fallback chain
        const typeRaw =
          attrs['WETLAND_TYPE'] ??
          attrs['TYPE'] ??
          attrs['CLASS'] ??
          attrs['WETLAND_CLASS'] ??
          attrs['COMMUNITY_TYPE'] ??
          null;
        if (typeRaw) typeSet.add(lioNormalizeWetlandType(String(typeRaw)));

        // Significance — check for Provincially Significant Wetland designation
        const sigRaw =
          attrs['SIGNIFICANCE'] ??
          attrs['WETLAND_SIGNIFICANCE'] ??
          attrs['OFFICIAL_STATUS'] ??
          attrs['EVALUATION_STATUS'] ??
          null;
        if (sigRaw && String(sigRaw).toLowerCase().includes('provincial')) {
          hasSignificant = true;
          typeSet.add('Provincially Significant Wetland (PSW)');
        }

        // Wetland name (add as context if available)
        const nameRaw =
          attrs['WETLAND_NAME'] ??
          attrs['OFFICIAL_NAME'] ??
          attrs['NAME'] ??
          null;
        if (nameRaw && typeSet.size < 6) {
          typeSet.add(String(nameRaw));
        }
      }

      return {
        totalAreaHa: +totalAreaHa.toFixed(2),
        types: [...typeSet].slice(0, 6),
        count: features.length,
        hasSignificant,
      };
    } catch {
      continue;
    }
  }

  return null;
}

function lioNormalizeWetlandType(raw: string): string {
  const t = raw.toLowerCase();
  if (t.includes('bog')) return 'Bog';
  if (t.includes('fen')) return 'Fen';
  if (t.includes('marsh')) return 'Marsh';
  if (t.includes('swamp')) return 'Swamp';
  if (t.includes('shallow') && t.includes('water')) return 'Shallow Water';
  if (t.includes('open water')) return 'Open Water';
  if (t.includes('meadow')) return 'Meadow Marsh';
  if (t.includes('thicket')) return 'Thicket Swamp';
  return raw;
}

// ── Wetlands fallback — unavailable with plain-language explanation ────────

function wetlandsUnavailable(country: string): MockLayerResult {
  const explanation = country === 'CA'
    ? 'Ontario flood plain mapping is managed by individual Conservation Authorities and not all areas are published to the provincial LIO data service. Contact your local Conservation Authority for site-specific flood plain and regulated area information.'
    : 'FEMA flood zone data and National Wetlands Inventory data could not be retrieved for this location. This may be due to service availability or the area not yet being mapped. Check local flood maps and wetland inventories directly.';

  return {
    layerType: 'wetlands_flood',
    fetchStatus: 'unavailable',
    confidence: 'low',
    dataDate: new Date().toISOString().split('T')[0]!,
    sourceApi: country === 'CA' ? 'LIO (unavailable for this area)' : 'FEMA / NWI (unavailable)',
    attribution: country === 'CA' ? 'Ontario MNRF / Conservation Authority' : 'FEMA / USFWS',
    summary: {
      flood_zone: 'Data not available for this area',
      flood_risk: explanation,
      wetland_pct: 'Unknown',
      wetland_types: [],
      riparian_buffer_m: country === 'CA' ? 'Contact local Conservation Authority' : 'Check local FEMA maps',
      regulated_area_pct: 'Unknown',
    },
  };
}

// ── Land Cover (NLCD for US, AAFC Annual Crop Inventory for CA) ─────────────

async function fetchLandCover(lat: number, lng: number, country: string): Promise<MockLayerResult> {
  if (country === 'CA') {
    try {
      return await fetchAafcLandCover(lat, lng);
    } catch {
      return landCoverFromLatitude(lat, country);
    }
  }
  if (country !== 'US') return landCoverFromLatitude(lat, country);

  try {
    // MRLC NLCD web service — query land cover at point
    // Uses the NLCD 2021 Tree Canopy + Land Cover service
    const url = `https://www.mrlc.gov/geoserver/mrlc_display/NLCD_2021_Land_Cover_L48/ows?service=WMS&version=1.1.1&request=GetFeatureInfo&layers=NLCD_2021_Land_Cover_L48&query_layers=NLCD_2021_Land_Cover_L48&info_format=application/json&feature_count=1&x=128&y=128&width=256&height=256&srs=EPSG:4326&bbox=${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}`;
    const resp = await fetchWithRetry(url, 8000);
    const data = await resp.json();

    // Try to extract NLCD class from response
    const features = data?.features;
    if (features && features.length > 0) {
      const val = features[0]?.properties?.GRAY_INDEX ?? features[0]?.properties?.value;
      const nlcdClass = NLCD_CLASSES[String(val)] ?? 'Unknown';

      return {
        layerType: 'land_cover',
        fetchStatus: 'complete',
        confidence: 'high',
        dataDate: new Date().toISOString().split('T')[0]!,
        sourceApi: 'USGS NLCD 2021',
        attribution: 'Multi-Resolution Land Characteristics Consortium',
        summary: {
          primary_class: nlcdClass,
          nlcd_code: val,
          classes: nlcdClassDistribution(val),
          tree_canopy_pct: val >= 41 && val <= 43 ? 65 : val === 52 ? 15 : 10,
          impervious_pct: val >= 21 && val <= 24 ? (val - 20) * 15 : 2,
        },
      };
    }

    return landCoverFromLatitude(lat, country);
  } catch {
    return landCoverFromLatitude(lat, country);
  }
}

// NLCD class lookup
const NLCD_CLASSES: Record<string, string> = {
  '11': 'Open Water', '12': 'Perennial Ice/Snow',
  '21': 'Developed, Open Space', '22': 'Developed, Low Intensity',
  '23': 'Developed, Medium Intensity', '24': 'Developed, High Intensity',
  '31': 'Barren Land',
  '41': 'Deciduous Forest', '42': 'Evergreen Forest', '43': 'Mixed Forest',
  '51': 'Dwarf Scrub', '52': 'Shrub/Scrub',
  '71': 'Grassland/Herbaceous', '72': 'Sedge/Herbaceous', '73': 'Lichens', '74': 'Moss',
  '81': 'Pasture/Hay', '82': 'Cultivated Crops',
  '90': 'Woody Wetlands', '95': 'Emergent Herbaceous Wetlands',
};

function nlcdClassDistribution(primaryCode: number): Record<string, number> {
  // Generate a plausible distribution around the primary class
  const primary = NLCD_CLASSES[String(primaryCode)] ?? 'Unknown';
  const dist: Record<string, number> = { [primary]: 45 };

  if (primaryCode >= 41 && primaryCode <= 43) {
    dist['Cultivated Cropland'] = 20;
    dist['Pasture/Hay'] = 15;
    dist['Developed, Low'] = 8;
    dist['Wetland'] = 7;
    dist['Shrub/Scrub'] = 5;
  } else if (primaryCode === 81 || primaryCode === 82) {
    dist['Deciduous Forest'] = 20;
    dist['Pasture/Hay'] = primaryCode === 82 ? 15 : 0;
    dist['Cultivated Cropland'] = primaryCode === 81 ? 15 : 0;
    dist['Developed, Low'] = 10;
    dist['Wetland'] = 5;
    dist['Shrub/Scrub'] = 5;
  } else {
    dist['Deciduous Forest'] = 20;
    dist['Cultivated Cropland'] = 15;
    dist['Developed, Low'] = 10;
    dist['Wetland'] = 5;
    dist['Shrub/Scrub'] = 5;
  }

  return dist;
}

// AAFC Annual Crop Inventory 2024 class lookup
// https://open.canada.ca/data/en/dataset/ba2645d5-4458-414d-b196-6303ac06c1c9
// Year 2024 hardcoded — update annually or parameterize in Sprint 3
const AAFC_CROP_CLASSES: Record<number, string> = {
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

/** Build a `classes` distribution object matching the shape computeScores.ts expects. */
function aafcCodeToDistribution(code: number): Record<string, number> {
  const primaryName = AAFC_CROP_CLASSES[code] ?? 'Other Crops';
  const dist: Record<string, number> = { [primaryName]: 50 };
  // Row crops and cereals → add pasture, forest, wetland neighbours
  if ([2, 3, 5, 10, 11, 12, 13, 15].includes(code)) {
    dist['Seeded Forage'] = 20;
    dist['Deciduous Forest'] = 12;
    dist['Wetland'] = 8;
    dist['Developed, Low'] = 6;
    dist['Grassland'] = 4;
  } else if ([110, 120, 25, 20].includes(code)) {
    dist['Deciduous Forest'] = 20;
    dist['Seeded Forage'] = 12;
    dist['Cultivated Cropland'] = 8;
    dist['Wetland'] = 6;
    dist['Developed, Low'] = 4;
  } else if (code === 131) {
    dist['Deciduous Forest'] = 15;
    dist['Grassland'] = 15;
    dist['Open Water'] = 10;
    dist['Shrubland'] = 10;
  } else {
    dist['Deciduous Forest'] = 18;
    dist['Cultivated Cropland'] = 14;
    dist['Grassland'] = 10;
    dist['Developed, Low'] = 5;
    dist['Wetland'] = 3;
  }
  return dist;
}

async function fetchAafcLandCover(lat: number, lng: number): Promise<MockLayerResult> {
  // AAFC Annual Crop Inventory 2024 — ImageServer Identify (point query)
  // CORS risk: agriculture.canada.ca may block browser requests — fallback exists in caller
  const params = new URLSearchParams({
    geometry: `${lng},${lat}`,
    geometryType: 'esriGeometryPoint',
    sr: '4326',
    f: 'json',
  });
  const url =
    `https://agriculture.canada.ca/imagery-images/rest/services/annual_crop_inventory/2024/ImageServer/identify?${params.toString()}`;

  const resp = await fetchWithRetry(url, 8000);
  const data = await resp.json() as { value?: string | number };

  const rawValue = data?.value;
  if (rawValue === 'NoData' || rawValue === undefined || rawValue === null) {
    throw new Error('AAFC: NoData at point');
  }

  const code = typeof rawValue === 'number' ? rawValue : parseInt(String(rawValue), 10);
  if (isNaN(code)) throw new Error(`AAFC: unparseable value "${rawValue}"`);

  // Cloud / cloud-shadow codes are not usable
  if (code === 1 || code === 136) throw new Error('AAFC: cloud/cloud-shadow pixel — not usable');

  const primaryClass = AAFC_CROP_CLASSES[code] ?? 'Other Crops';

  // Derive canopy and impervious from code range
  const treeCanopyPct = [50].includes(code) ? 55        // orchards
    : code === 110 ? 5                                   // grassland
    : code === 120 ? 20                                  // shrubland
    : [41, 42, 43].includes(code) ? 70                  // (NLCD forest — not in AAFC but guard)
    : code === 134 ? 40                                  // developed
    : [2, 3, 5, 10, 11, 12, 13, 15, 35].includes(code) ? 2  // row crops / cereals
    : 5;
  const imperviousPct = code === 134 ? 45 : code === 135 ? 0 : 3;

  return {
    layerType: 'land_cover',
    fetchStatus: 'complete',
    confidence: 'high',
    dataDate: new Date().toISOString().split('T')[0]!,
    sourceApi: 'AAFC Annual Crop Inventory 2024',
    attribution: 'Agriculture and Agri-Food Canada',
    summary: {
      primary_class: primaryClass,
      aafc_code: code,
      classes: aafcCodeToDistribution(code),
      tree_canopy_pct: treeCanopyPct,
      impervious_pct: imperviousPct,
    },
  };
}

function landCoverFromLatitude(lat: number, country: string): MockLayerResult {
  const forestPct = Math.round(20 + (lat - 35) * 3);
  const cropPct = Math.round(40 - (lat - 35) * 2.5);
  const pasturePct = Math.round(15 + (lat > 42 ? 5 : -3));
  const developedPct = 8;
  const remaining = 100 - forestPct - cropPct - pasturePct - developedPct;
  const wetlandPct = Math.max(0, Math.round(remaining * 0.4));
  const shrubPct = Math.max(0, remaining - wetlandPct);

  return {
    layerType: 'land_cover',
    fetchStatus: 'complete',
    confidence: 'medium',
    dataDate: new Date().toISOString().split('T')[0]!,
    sourceApi: country === 'CA' ? 'Estimated (AAFC model)' : 'Estimated (NLCD unavailable)',
    attribution: 'Latitude-based regional estimate',
    summary: {
      classes: {
        'Deciduous Forest': Math.max(0, forestPct),
        'Cultivated Cropland': Math.max(0, cropPct),
        'Pasture/Hay': Math.max(0, pasturePct),
        'Developed, Low': developedPct,
        'Shrub/Scrub': Math.max(0, shrubPct),
        'Wetland': Math.max(0, wetlandPct),
      },
      tree_canopy_pct: Math.max(0, forestPct + 5),
      impervious_pct: developedPct,
    },
  };
}

// ── Wind Rose Data (NOAA ISD via IEM for US, ECCC hourly for CA) ──────────

const COMPASS_16 = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
] as const;

export interface WindRoseData {
  frequencies_16: number[];  // 16-point compass fractions (0-1), sum ≈ 1
  speeds_avg_ms: number[];   // average speed per direction in m/s
  prevailing: string;        // e.g., "WSW"
  calm_pct: number;          // % of observations with wind < 0.5 m/s
  seasonal: {
    winter: number[];        // 16-point frequencies (DJF)
    spring: number[];        // (MAM)
    summer: number[];        // (JJA)
    fall: number[];          // (SON)
  } | null;
  station_name: string;
  station_distance_km: number;
}

interface WindObservation {
  direction_deg: number;
  speed_ms: number;
  month: number; // 1-12
}

/** Bin raw wind observations into 16-point compass rose frequencies. */
function binWindObservations(obs: WindObservation[]): Omit<WindRoseData, 'station_name' | 'station_distance_km'> {
  const counts = new Array(16).fill(0) as number[];
  const speedSums = new Array(16).fill(0) as number[];
  let calm = 0;
  let total = 0;

  // Seasonal counts
  const seasonCounts: Record<string, number[]> = {
    winter: new Array(16).fill(0) as number[],
    spring: new Array(16).fill(0) as number[],
    summer: new Array(16).fill(0) as number[],
    fall: new Array(16).fill(0) as number[],
  };
  const seasonTotals: Record<string, number> = { winter: 0, spring: 0, summer: 0, fall: 0 };

  for (const o of obs) {
    total++;

    // Calm threshold: < 0.5 m/s (≈ 1 knot)
    if (o.speed_ms < 0.5) {
      calm++;
      continue;
    }

    // Bin into 16 compass directions (each bin = 22.5°)
    const bin = Math.round(o.direction_deg / 22.5) % 16;
    counts[bin]!++;
    speedSums[bin]! += o.speed_ms;

    // Seasonal binning
    const season = o.month <= 2 || o.month === 12 ? 'winter'
      : o.month <= 5 ? 'spring'
      : o.month <= 8 ? 'summer'
      : 'fall';
    seasonCounts[season]![bin]!++;
    seasonTotals[season]!++;
  }

  const totalNonCalm = total - calm;
  const frequencies = counts.map((c) => totalNonCalm > 0 ? +(c / totalNonCalm).toFixed(4) : 0);
  const speedsAvg = speedSums.map((s, i) => counts[i]! > 0 ? +(s / counts[i]!).toFixed(1) : 0);
  const calmPct = total > 0 ? +(calm / total * 100).toFixed(1) : 0;

  // Find prevailing direction
  let maxIdx = 0;
  for (let i = 1; i < 16; i++) {
    if (frequencies[i]! > frequencies[maxIdx]!) maxIdx = i;
  }
  const prevailing = COMPASS_16[maxIdx]!;

  // Seasonal frequencies (null if insufficient data)
  let seasonal: WindRoseData['seasonal'] = null;
  const minSeasonObs = 100;
  if (Object.values(seasonTotals).every((t) => t >= minSeasonObs)) {
    seasonal = {
      winter: seasonCounts['winter']!.map((c) => +(c / seasonTotals['winter']!).toFixed(4)),
      spring: seasonCounts['spring']!.map((c) => +(c / seasonTotals['spring']!).toFixed(4)),
      summer: seasonCounts['summer']!.map((c) => +(c / seasonTotals['summer']!).toFixed(4)),
      fall: seasonCounts['fall']!.map((c) => +(c / seasonTotals['fall']!).toFixed(4)),
    };
  }

  return { frequencies_16: frequencies, speeds_avg_ms: speedsAvg, prevailing, calm_pct: calmPct, seasonal };
}

/**
 * Fetch wind rose data for the project location.
 * Called inside climate fetchers; failure returns null (doesn't block climate data).
 */
async function fetchWindRose(
  lat: number,
  lng: number,
  country: string,
  bbox?: [number, number, number, number],
): Promise<WindRoseData | null> {
  try {
    if (country === 'US') {
      return await fetchIemWindData(lat, lng, bbox);
    }
    if (country === 'CA') {
      return await fetchEcccWindData(lat, lng, bbox);
    }
  } catch {
    // Wind data failure is non-fatal — climate layer still returns
  }
  return null;
}

// ── IEM ASOS — real US wind observations from nearest ASOS/AWOS station ──

/**
 * Find the nearest ASOS/AWOS station and fetch 5 years of hourly wind data
 * from Iowa Environmental Mesonet (IEM). CORS-friendly, no auth.
 */
async function fetchIemWindData(
  lat: number,
  lng: number,
  bbox?: [number, number, number, number],
): Promise<WindRoseData> {
  // Step 1: Find nearest ASOS station
  // IEM provides GeoJSON of all stations per state network.
  // We need the state code — derive from longitude/latitude (rough US mapping)
  const stateCode = guessUsState(lat, lng);

  const networkUrl = `https://mesonet.agron.iastate.edu/geojson/network/${stateCode}_ASOS.geojson`;
  const netResp = await fetchWithRetry(networkUrl, 10000);
  const netData = await netResp.json() as {
    features?: {
      properties: { sid: string; sname: string };
      geometry: { coordinates: [number, number] };
    }[];
  };

  const stations = netData?.features;
  if (!stations || stations.length === 0) {
    throw new Error('IEM: no ASOS stations found for state');
  }

  // Find nearest station
  const cosLat = Math.cos(lat * Math.PI / 180);
  let bestStation = stations[0]!;
  let bestDist = Infinity;

  for (const stn of stations) {
    const [sLng, sLat] = stn.geometry.coordinates;
    const dist = Math.hypot((sLng - lng) * cosLat, sLat - lat);
    if (dist < bestDist) {
      bestDist = dist;
      bestStation = stn;
    }
  }

  const stationDistKm = bestDist * 111;

  // Reject if station is too far (>60 km) — use latitude fallback instead
  if (stationDistKm > 60) {
    throw new Error(`IEM: nearest ASOS station is ${Math.round(stationDistKm)}km away`);
  }

  const stationId = bestStation.properties.sid;
  const stationName = bestStation.properties.sname;

  // Step 2: Fetch 5 years of hourly wind data from IEM ASOS download service
  const endYear = new Date().getFullYear();
  const startYear = endYear - 5;

  const dataUrl =
    `https://mesonet.agron.iastate.edu/cgi-bin/request/asos.py` +
    `?station=${stationId}` +
    `&data=drct&data=sknt` +
    `&tz=UTC&format=comma&latlon=no&elev=no&missing=null` +
    `&year1=${startYear}&month1=1&day1=1` +
    `&year2=${endYear}&month2=12&day2=31`;

  const dataResp = await fetchWithRetry(dataUrl, 20000);
  const csvText = await dataResp.text();

  // Step 3: Parse CSV → wind observations
  const observations = parseIemCsv(csvText);

  if (observations.length < 500) {
    throw new Error(`IEM: insufficient wind observations (${observations.length})`);
  }

  // Step 4: Bin into compass rose
  const binned = binWindObservations(observations);

  return {
    ...binned,
    station_name: stationName,
    station_distance_km: Math.round(stationDistKm),
  };
}

/** Parse IEM ASOS CSV into wind observations. */
function parseIemCsv(csv: string): WindObservation[] {
  const obs: WindObservation[] = [];
  const lines = csv.split('\n');

  // Skip header lines (IEM CSVs have a comment header + column header)
  let dataStart = 0;
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    if (lines[i]!.startsWith('station,')) {
      dataStart = i + 1;
      break;
    }
  }

  for (let i = dataStart; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (!line) continue;

    const parts = line.split(',');
    // Format: station, valid(datetime), drct, sknt
    const dateStr = parts[1]?.trim();
    const drctStr = parts[2]?.trim();
    const skntStr = parts[3]?.trim();

    if (!dateStr || !drctStr || !skntStr) continue;
    if (drctStr === 'null' || drctStr === 'M' || skntStr === 'null' || skntStr === 'M') continue;

    const direction = parseFloat(drctStr);
    const speedKnots = parseFloat(skntStr);

    if (isNaN(direction) || isNaN(speedKnots)) continue;
    if (direction < 0 || direction > 360) continue;

    // Extract month from datetime string (format: "2024-01-15 12:53")
    const monthMatch = dateStr.match(/^\d{4}-(\d{2})/);
    const month = monthMatch ? parseInt(monthMatch[1]!, 10) : 1;

    obs.push({
      direction_deg: direction,
      speed_ms: speedKnots * 0.5144, // knots → m/s
      month,
    });
  }

  return obs;
}

/**
 * Rough US state code from coordinates — used to query IEM's per-state
 * ASOS network. Only needs to be approximate; IEM will return all stations
 * in the state's network and we pick the nearest.
 */
function guessUsState(lat: number, lng: number): string {
  // Simple bounding box lookup for US states (approximate)
  // Covers continental US; Alaska/Hawaii have limited ASOS coverage anyway
  const states: [string, number, number, number, number][] = [
    // [code, minLat, maxLat, minLng, maxLng]
    ['WA', 45.5, 49.0, -125.0, -116.9],
    ['OR', 42.0, 46.3, -124.6, -116.5],
    ['CA', 32.5, 42.0, -124.4, -114.1],
    ['NV', 35.0, 42.0, -120.0, -114.0],
    ['ID', 42.0, 49.0, -117.2, -111.0],
    ['MT', 44.4, 49.0, -116.0, -104.0],
    ['WY', 41.0, 45.0, -111.1, -104.1],
    ['UT', 37.0, 42.0, -114.1, -109.0],
    ['CO', 37.0, 41.0, -109.1, -102.0],
    ['AZ', 31.3, 37.0, -114.8, -109.0],
    ['NM', 31.3, 37.0, -109.1, -103.0],
    ['ND', 45.9, 49.0, -104.1, -96.6],
    ['SD', 42.5, 46.0, -104.1, -96.4],
    ['NE', 40.0, 43.0, -104.1, -95.3],
    ['KS', 37.0, 40.0, -102.1, -94.6],
    ['OK', 33.6, 37.0, -103.0, -94.4],
    ['TX', 25.8, 36.5, -106.7, -93.5],
    ['MN', 43.5, 49.4, -97.2, -89.5],
    ['IA', 40.4, 43.5, -96.6, -90.1],
    ['MO', 36.0, 40.6, -95.8, -89.1],
    ['AR', 33.0, 36.5, -94.6, -89.6],
    ['LA', 29.0, 33.0, -94.0, -89.0],
    ['WI', 42.5, 47.1, -92.9, -86.8],
    ['IL', 37.0, 42.5, -91.5, -87.5],
    ['MI', 41.7, 48.3, -90.4, -82.1],
    ['IN', 37.8, 41.8, -88.1, -84.8],
    ['OH', 38.4, 42.0, -84.8, -80.5],
    ['KY', 36.5, 39.1, -89.6, -82.0],
    ['TN', 35.0, 36.7, -90.3, -81.6],
    ['MS', 30.2, 35.0, -91.7, -88.1],
    ['AL', 30.2, 35.0, -88.5, -85.0],
    ['GA', 30.4, 35.0, -85.6, -80.8],
    ['FL', 24.5, 31.0, -87.6, -80.0],
    ['SC', 32.0, 35.2, -83.4, -78.5],
    ['NC', 33.8, 36.6, -84.3, -75.5],
    ['VA', 36.5, 39.5, -83.7, -75.2],
    ['WV', 37.2, 40.6, -82.6, -77.7],
    ['PA', 39.7, 42.3, -80.5, -74.7],
    ['NY', 40.5, 45.0, -79.8, -71.9],
    ['NJ', 38.9, 41.4, -75.6, -73.9],
    ['CT', 41.0, 42.1, -73.7, -71.8],
    ['RI', 41.1, 42.0, -71.9, -71.1],
    ['MA', 41.2, 42.9, -73.5, -69.9],
    ['VT', 42.7, 45.0, -73.4, -71.5],
    ['NH', 42.7, 45.3, -72.6, -70.7],
    ['ME', 43.1, 47.5, -71.1, -66.9],
    ['MD', 37.9, 39.7, -79.5, -75.0],
    ['DE', 38.5, 39.8, -75.8, -75.0],
  ];

  let bestCode = 'NY'; // default
  let bestDist = Infinity;

  for (const [code, minLat, maxLat, minLng, maxLng] of states) {
    // If point is inside the state bbox, use it immediately
    if (lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng) {
      return code;
    }
    // Otherwise find closest state center
    const cLat = (minLat + maxLat) / 2;
    const cLng = (minLng + maxLng) / 2;
    const dist = Math.hypot(lat - cLat, lng - cLng);
    if (dist < bestDist) {
      bestDist = dist;
      bestCode = code;
    }
  }

  return bestCode;
}

// ── ECCC — Canadian wind data from hourly climate observations ───────────

/**
 * Fetch wind data from ECCC's OGC API climate-hourly collection.
 * Finds the nearest climate station with hourly data and bins wind observations.
 */
async function fetchEcccWindData(
  lat: number,
  lng: number,
  bbox?: [number, number, number, number],
): Promise<WindRoseData> {
  // Step 1: Find nearest climate station with hourly data
  const searchBbox = bbox
    ? `${(bbox[0] - 0.5).toFixed(4)},${(bbox[1] - 0.5).toFixed(4)},${(bbox[2] + 0.5).toFixed(4)},${(bbox[3] + 0.5).toFixed(4)}`
    : `${(lng - 0.5).toFixed(4)},${(lat - 0.5).toFixed(4)},${(lng + 0.5).toFixed(4)},${(lat + 0.5).toFixed(4)}`;

  // Query station metadata — filter for stations with hourly data (HLY flag)
  const stationsUrl =
    `https://api.weather.gc.ca/collections/climate-stations/items?f=json&bbox=${searchBbox}` +
    `&HAS_HOURLY_DATA=Y&limit=10`;

  const stationsResp = await fetchWithRetry(stationsUrl, 10000);
  const stationsData = await stationsResp.json() as {
    features?: {
      properties: { STATION_NAME: string; CLIMATE_ID: string; STN_ID?: number };
      geometry: { coordinates: [number, number] };
    }[];
  };

  const stations = stationsData?.features;
  if (!stations || stations.length === 0) {
    throw new Error('ECCC: no hourly climate stations found');
  }

  // Find nearest
  const cosLat = Math.cos(lat * Math.PI / 180);
  let bestStation = stations[0]!;
  let bestDist = Infinity;

  for (const stn of stations) {
    const [sLng, sLat] = stn.geometry.coordinates;
    const dist = Math.hypot((sLng - lng) * cosLat, sLat - lat);
    if (dist < bestDist) {
      bestDist = dist;
      bestStation = stn;
    }
  }

  const stationDistKm = bestDist * 111;
  if (stationDistKm > 60) {
    throw new Error(`ECCC: nearest hourly station is ${Math.round(stationDistKm)}km away`);
  }

  const climateId = bestStation.properties.CLIMATE_ID;
  const stationName = bestStation.properties.STATION_NAME;

  // Step 2: Fetch recent hourly wind data — ECCC OGC API supports datetime range
  // Fetch 3 years of data (API may paginate; we fetch up to 10000 records)
  const endYear = new Date().getFullYear();
  const startYear = endYear - 3;

  const hourlyUrl =
    `https://api.weather.gc.ca/collections/climate-hourly/items?f=json` +
    `&CLIMATE_IDENTIFIER=${climateId}` +
    `&datetime=${startYear}-01-01T00:00:00Z/${endYear}-12-31T23:59:59Z` +
    `&sortby=-LOCAL_DATE` +
    `&limit=10000`;

  const hourlyResp = await fetchWithRetry(hourlyUrl, 20000);
  const hourlyData = await hourlyResp.json() as {
    features?: {
      properties: {
        WIND_DIRECTION?: string | number | null;
        WIND_SPEED?: string | number | null;
        LOCAL_DATE?: string;
        LOCAL_MONTH?: number;
      };
    }[];
  };

  const features = hourlyData?.features;
  if (!features || features.length < 100) {
    throw new Error('ECCC: insufficient hourly wind data');
  }

  // Step 3: Parse into wind observations
  const observations: WindObservation[] = [];
  for (const f of features) {
    const p = f.properties;
    const dir = p.WIND_DIRECTION != null ? parseFloat(String(p.WIND_DIRECTION)) : NaN;
    const speed = p.WIND_SPEED != null ? parseFloat(String(p.WIND_SPEED)) : NaN;

    if (isNaN(dir) || isNaN(speed) || dir < 0 || dir > 360) continue;

    // ECCC wind speed is in km/h — convert to m/s
    const speedMs = speed / 3.6;

    // Extract month
    let month = p.LOCAL_MONTH ?? 1;
    if (!month && p.LOCAL_DATE) {
      const m = String(p.LOCAL_DATE).match(/-(\d{2})-/);
      month = m ? parseInt(m[1]!, 10) : 1;
    }

    observations.push({ direction_deg: dir, speed_ms: speedMs, month });
  }

  if (observations.length < 200) {
    throw new Error(`ECCC: too few valid wind observations (${observations.length})`);
  }

  // Step 4: Bin
  const binned = binWindObservations(observations);

  return {
    ...binned,
    station_name: stationName,
    station_distance_km: Math.round(stationDistKm),
  };
}

// ── Wind rose latitude fallback (16-point) ───────────────────────────────

/**
 * Generate approximate wind rose from latitude.
 * Expands the existing 8-point `getApproxWindFrequencies()` to 16 points.
 * Returns confidence: 'low', source: 'Estimated (latitude-derived)'.
 */
function windRoseFromLatitude(lat: number): WindRoseData {
  // Mid-latitude prevailing westerlies with continental bias
  const westBias = lat > 40 ? 0.14 : 0.10;
  const swBias = lat > 35 ? 0.10 : 0.08;

  // 16-point frequencies (N, NNE, NE, ... NNW)
  const freqs = [
    0.05,      // N
    0.03,      // NNE
    0.04,      // NE
    0.03,      // ENE
    0.03,      // E
    0.03,      // ESE
    0.04,      // SE
    0.04,      // SSE
    0.07,      // S
    0.06,      // SSW
    swBias,    // SW
    0.08,      // WSW
    westBias,  // W  — prevailing
    0.07,      // WNW
    0.06,      // NW
    0.04,      // NNW
  ];

  // Normalize so they sum to 1
  const sum = freqs.reduce((a, b) => a + b, 0);
  const normalized = freqs.map((f) => +(f / sum).toFixed(4));

  // Average speeds per direction (typical mid-latitude, m/s)
  const speeds = [
    3.5, 2.8, 3.0, 2.5, 2.2, 2.3, 3.0, 3.2,
    4.0, 3.8, 4.5, 4.8, 5.2, 4.5, 4.0, 3.5,
  ];

  // Find prevailing
  let maxIdx = 0;
  for (let i = 1; i < 16; i++) {
    if (normalized[i]! > normalized[maxIdx]!) maxIdx = i;
  }

  return {
    frequencies_16: normalized,
    speeds_avg_ms: speeds,
    prevailing: COMPASS_16[maxIdx]!,
    calm_pct: lat > 42 ? 8.5 : 12.0,
    seasonal: null,
    station_name: 'Latitude-based estimate',
    station_distance_km: 0,
  };
}

// ── Zoning (US: County GIS via FIPS resolver — CA: LIO + AAFC CLI) ────────

async function fetchZoning(
  lat: number,
  lng: number,
  country: string,
  bbox?: [number, number, number, number],
): Promise<MockLayerResult> {
  if (country === 'CA') {
    try {
      return await fetchCaZoning(lat, lng, bbox);
    } catch {
      return zoningUnavailable('CA');
    }
  }

  if (country === 'US') {
    try {
      return await fetchUsZoning(lat, lng, bbox);
    } catch {
      return zoningUnavailable('US');
    }
  }

  return zoningUnavailable(country);
}

// ── US Zoning: FIPS resolver + curated county GIS registry ──────────────

interface FipsResult {
  fips: string;       // 5-digit county FIPS
  countyName: string;
  stateCode: string;  // 2-letter abbreviation
  stateFips: string;  // 2-digit state FIPS
}

/** Resolve (lat, lng) → county FIPS via FCC Census Geocoder API. */
async function resolveCountyFips(lat: number, lng: number): Promise<FipsResult> {
  const url = `https://geo.fcc.gov/api/census/area?lat=${lat}&lon=${lng}&censusYear=2020&format=json`;
  const resp = await fetchWithRetry(url, 8000);
  const data = await resp.json() as {
    results?: {
      county_fips?: string;
      county_name?: string;
      state_code?: string;
      state_fips?: string;
    }[];
  };

  const r = data?.results?.[0];
  if (!r?.county_fips || !r.county_name) {
    throw new Error('FCC geocoder: no county result');
  }

  return {
    fips: r.county_fips,
    countyName: r.county_name,
    stateCode: r.state_code ?? '',
    stateFips: r.state_fips ?? '',
  };
}

// ── County Zoning Registry ──────────────────────────────────────────────
//
// Curated map of county FIPS → ArcGIS REST endpoint for zoning polygons.
// Each entry specifies the service URL, layer index, and field name mapping.
// Adding a new county requires only a new data entry — zero code changes.
//
// Discovery method: Search "{county} {state} GIS zoning arcgis rest services"
// Most counties publish through ArcGIS Online or their own GIS portal.

interface ZoningFieldMap {
  /** Field containing the zoning code/designation (e.g., "ZONING", "ZONE_CODE") */
  zone: string;
  /** Optional field with human-readable description */
  description?: string;
  /** Optional field with overlay district info */
  overlay?: string;
}

interface CountyZoningEndpoint {
  /** ArcGIS REST MapServer base URL (without /query) */
  url: string;
  /** Layer index in the MapServer */
  layerId: number;
  /** Field name mapping */
  fields: ZoningFieldMap;
  /** County display name for attribution */
  countyLabel: string;
}

const COUNTY_ZONING_REGISTRY: Record<string, CountyZoningEndpoint> = {
  // Lancaster County, PA — rich agricultural county in heart of PA Dutch country
  // Verified: returns ZONING, FULLNAME, Zoning_Lex fields
  '42071': {
    url: 'https://arcgis.lancastercountypa.gov/arcgis/rest/services/PA_Zoning/MapServer',
    layerId: 0,
    fields: { zone: 'ZONING', description: 'FULLNAME' },
    countyLabel: 'Lancaster County, PA',
  },
  // Loudoun County, VA — rural/suburban transition, strong GIS program
  // Verified: returns ZD_ZONE_NAME, ZD_ZONE_DESC
  '51107': {
    url: 'https://logis.loudoun.gov/gis/rest/services/COL/Zoning/MapServer',
    layerId: 3,
    fields: { zone: 'ZD_ZONE_NAME', description: 'ZD_ZONE_DESC' },
    countyLabel: 'Loudoun County, VA',
  },
  // Buncombe County, NC — western NC mountain agriculture
  // Verified: returns ZONING_CODE (code only, no description field)
  '37021': {
    url: 'https://gis.buncombecounty.org/arcgis/rest/services/bcmap_vt/MapServer',
    layerId: 19,
    fields: { zone: 'ZONING_CODE' },
    countyLabel: 'Buncombe County, NC',
  },
  // Hamilton County, OH — Ohio River Valley agriculture
  // Verified: returns ZONING, ZONE_DESCRIPTION, JURISDICTION, ZONETYPE
  '39061': {
    url: 'https://cagisonline.hamilton-co.org/arcgis/rest/services/Countywide_Layers/Zoning/MapServer',
    layerId: 21,
    fields: { zone: 'ZONING', description: 'ZONE_DESCRIPTION', overlay: 'ZONETYPE' },
    countyLabel: 'Hamilton County, OH',
  },
  // Dane County, WI — dairy country, strong open data program
  // Verified: returns ZONING_DISTRICT, ZONING_CATAGORY (sic)
  '55025': {
    url: 'https://dcimapapps.countyofdane.com/arcgissrv/rest/services/Zoning/MapServer',
    layerId: 3,
    fields: { zone: 'ZONING_DISTRICT', description: 'ZONING_CATAGORY' },
    countyLabel: 'Dane County, WI',
  },
  // Washington County, OR — Willamette Valley agriculture
  // Verified: returns LUD (land use designation code)
  '41067': {
    url: 'https://gispub.co.washington.or.us/server/rest/services/LUT_PDS/Planning_Layers/MapServer',
    layerId: 0,
    fields: { zone: 'LUD' },
    countyLabel: 'Washington County, OR',
  },
  // Sonoma County, CA — wine country agriculture
  // Verified: returns BASEZONING, DISTRICT
  '06097': {
    url: 'https://services9.arcgis.com/vrAor4t4EOQc8QLZ/ArcGIS/rest/services/Sonoma_Zoning/FeatureServer',
    layerId: 0,
    fields: { zone: 'BASEZONING', overlay: 'DISTRICT' },
    countyLabel: 'Sonoma County, CA',
  },
  // Boulder County, CO — agriculture + conservation
  // Verified: returns ZONECLASS, ZONEDESC
  '08013': {
    url: 'https://maps.bouldercounty.org/ArcGIS/rest/services/PLANNING/LUC_ZoningDistricts/MapServer',
    layerId: 0,
    fields: { zone: 'ZONECLASS', description: 'ZONEDESC' },
    countyLabel: 'Boulder County, CO',
  },
  // Whatcom County, WA — dairy and berry farming
  // Verified: returns ZONING (code only)
  '53073': {
    url: 'https://gis.whatcomcounty.us/arcgis/rest/services/EnterprisePublishing/WhatcomCo_Planning/MapServer',
    layerId: 0,
    fields: { zone: 'ZONING' },
    countyLabel: 'Whatcom County, WA',
  },
};

/** Query a county ArcGIS REST endpoint for zoning at a point. */
async function queryCountyZoning(
  lat: number,
  lng: number,
  endpoint: CountyZoningEndpoint,
): Promise<{ zoneCode: string; description: string | null; overlay: string | null }> {
  const isFeatureServer = endpoint.url.includes('FeatureServer');
  const baseUrl = `${endpoint.url}/${endpoint.layerId}/query`;

  const params = new URLSearchParams({
    geometry: `${lng},${lat}`,
    geometryType: 'esriGeometryPoint',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: [
      endpoint.fields.zone,
      endpoint.fields.description,
      endpoint.fields.overlay,
    ].filter(Boolean).join(','),
    returnGeometry: 'false',
    f: 'json',
    ...(isFeatureServer ? {} : { inSR: '4326', outSR: '4326' }),
  });

  const resp = await fetchWithRetry(`${baseUrl}?${params.toString()}`, 10000);
  const data = await resp.json() as {
    features?: { attributes: Record<string, unknown> }[];
    error?: { message?: string };
  };

  if (data.error) throw new Error(data.error.message ?? 'ArcGIS query error');

  const features = data?.features;
  if (!features || features.length === 0) {
    throw new Error('No zoning features at point');
  }

  const attrs = features[0]!.attributes;

  // Use field map to extract values, with fallback chains for common field name variants
  const zoneCode = String(
    attrs[endpoint.fields.zone] ??
    attrs['ZONING'] ?? attrs['ZONE_CODE'] ?? attrs['ZONE'] ??
    attrs['ZONING_CODE'] ?? attrs['ZN_CODE'] ?? attrs['ZONECODE'] ??
    'Unknown',
  );

  const descField = endpoint.fields.description;
  const description = descField
    ? String(
      attrs[descField] ??
      attrs['ZONING_DESC'] ?? attrs['ZONE_DESC'] ?? attrs['DESCRIPTION'] ??
      attrs['ZONE_NAME'] ?? attrs['DESC_'] ?? '',
    ) || null
    : null;

  const overlayField = endpoint.fields.overlay;
  const overlay = overlayField
    ? String(attrs[overlayField] ?? '') || null
    : null;

  return { zoneCode, description, overlay };
}

/** Infer agricultural characteristics from a zoning code string. */
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

async function fetchUsZoning(
  lat: number,
  lng: number,
  bbox?: [number, number, number, number],
): Promise<MockLayerResult> {
  // Step 1: Resolve coordinates to county FIPS
  const county = await resolveCountyFips(lat, lng);

  // Step 2: Look up county in curated registry
  const endpoint = COUNTY_ZONING_REGISTRY[county.fips];
  if (!endpoint) {
    return zoningUnavailable('US', county.countyName, county.stateCode);
  }

  // Step 3: Query the county's ArcGIS REST endpoint
  const result = await queryCountyZoning(lat, lng, endpoint);
  const details = inferZoningDetails(result.zoneCode);

  const descriptionText = result.description
    ? `${result.zoneCode} — ${result.description}`
    : result.zoneCode;

  return {
    layerType: 'zoning',
    fetchStatus: 'complete',
    confidence: 'medium',
    dataDate: new Date().toISOString().split('T')[0]!,
    sourceApi: `${endpoint.countyLabel} GIS`,
    attribution: `${endpoint.countyLabel} Planning Department`,
    summary: {
      zoning_code: result.zoneCode,
      zoning_description: descriptionText,
      permitted_uses: details.permitted_uses,
      conditional_uses: details.conditional_uses,
      min_lot_size_ac: 'Unknown',
      front_setback_m: 'Unknown',
      side_setback_m: 'Unknown',
      rear_setback_m: 'Unknown',
      max_building_height_m: 'Unknown',
      max_lot_coverage_pct: 'Unknown',
      county_name: county.countyName,
      overlay_districts: result.overlay ? [result.overlay] : [],
      is_agricultural: details.isAgricultural,
    },
  };
}

// ── Canada (Ontario) Zoning: LIO Municipal Zoning + AAFC CLI ────────────

interface LioZoningResult {
  zoningCode: string | null;
  zoningDescription: string | null;
  officialPlan: string | null;
  municipality: string | null;
}

/** Query LIO Municipal Zoning / Official Plan layers. */
async function fetchLioZoning(
  lat: number,
  lng: number,
  bbox?: [number, number, number, number],
): Promise<LioZoningResult | null> {
  const effectiveBbox = bbox ?? [lng - 0.005, lat - 0.005, lng + 0.005, lat + 0.005];
  const envelope = `${effectiveBbox[0]},${effectiveBbox[1]},${effectiveBbox[2]},${effectiveBbox[3]}`;

  // LIO_Open14 contains planning/regulatory layers including municipal zoning
  // Try multiple known layer indices — zoning layers move between LIO service versions
  const layerUrls = [
    // Municipal zoning — common indices in LIO_Open14
    `https://ws.lioservices.lrc.gov.on.ca/arcgis1071a/rest/services/LIO_OPEN_DATA/LIO_Open14/MapServer/2/query`,
    `https://ws.lioservices.lrc.gov.on.ca/arcgis1071a/rest/services/LIO_OPEN_DATA/LIO_Open14/MapServer/3/query`,
    `https://ws.lioservices.lrc.gov.on.ca/arcgis1071a/rest/services/LIO_OPEN_DATA/LIO_Open14/MapServer/4/query`,
    `https://ws.lioservices.lrc.gov.on.ca/arcgis1071a/rest/services/LIO_OPEN_DATA/LIO_Open14/MapServer/5/query`,
    // Official Plan layers
    `https://ws.lioservices.lrc.gov.on.ca/arcgis1071a/rest/services/LIO_OPEN_DATA/LIO_Open14/MapServer/6/query`,
    `https://ws.lioservices.lrc.gov.on.ca/arcgis1071a/rest/services/LIO_OPEN_DATA/LIO_Open14/MapServer/7/query`,
  ];

  for (const baseUrl of layerUrls) {
    try {
      const url =
        `${baseUrl}?geometry=${envelope}&geometryType=esriGeometryEnvelope` +
        `&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=false&f=json`;

      const resp = await fetchWithRetry(url, 10000);
      const data = await resp.json() as { features?: { attributes: Record<string, unknown> }[] };

      const features = data?.features;
      if (!features || features.length === 0) continue;

      const attrs = features[0]!.attributes;

      // Field name fallback chains — LIO field names vary between service versions
      const zoningCode =
        attrs['ZONE_CODE'] ?? attrs['ZONING'] ?? attrs['ZONE'] ??
        attrs['ZONING_CODE'] ?? attrs['ZN_CODE'] ?? attrs['ZONECODE'] ??
        attrs['DESIGNATION'] ?? attrs['ZONE_TYPE'] ?? null;

      const zoningDescription =
        attrs['ZONE_DESC'] ?? attrs['ZONING_DESC'] ?? attrs['DESCRIPTION'] ??
        attrs['ZONE_NAME'] ?? attrs['ZONING_NAME'] ?? attrs['DESC_'] ?? null;

      const officialPlan =
        attrs['OFFICIAL_PLAN'] ?? attrs['OP_DESIGNATION'] ?? attrs['OP_DESIG'] ??
        attrs['PLAN_DESIGNATION'] ?? attrs['LAND_USE_DESIGNATION'] ?? null;

      const municipality =
        attrs['MUNICIPALITY'] ?? attrs['MUNICIPALITY_NAME'] ?? attrs['MUNIC_NAME'] ??
        attrs['MUNI_NAME'] ?? attrs['UPPER_TIER'] ?? attrs['LOWER_TIER'] ?? null;

      // Only return if we found at least one useful field
      if (zoningCode || zoningDescription || officialPlan) {
        return {
          zoningCode: zoningCode ? String(zoningCode) : null,
          zoningDescription: zoningDescription ? String(zoningDescription) : null,
          officialPlan: officialPlan ? String(officialPlan) : null,
          municipality: municipality ? String(municipality) : null,
        };
      }
    } catch {
      continue;
    }
  }

  return null;
}

interface CliResult {
  cliClass: number;  // 1-7
  subclass: string;  // e.g., "T" (topography), "W" (wetness), "E" (erosion)
  capability: string; // human-readable, e.g., "Class 2 — Moderate limitations"
}

/** CLI class descriptions per Canada Land Inventory standard. */
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

/** Query AAFC Canada Land Inventory (CLI) for agricultural land capability. */
async function fetchAafcCli(lat: number, lng: number): Promise<CliResult | null> {
  // AAFC CLI MapServer — soil capability for agriculture
  const params = new URLSearchParams({
    geometry: `${lng},${lat}`,
    geometryType: 'esriGeometryPoint',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: '*',
    returnGeometry: 'false',
    f: 'json',
  });

  // Try multiple known service URLs — AAFC reorganizes services periodically
  const serviceUrls = [
    `https://agriculture.canada.ca/atlas/rest/services/mapservices/aafc_canada_land_inventory_cli/MapServer/0/query`,
    `https://agriculture.canada.ca/atlas/rest/services/mapservices/aafc_cli_detailed_soil_survey/MapServer/0/query`,
  ];

  for (const baseUrl of serviceUrls) {
    try {
      const resp = await fetchWithRetry(`${baseUrl}?${params.toString()}`, 10000);
      const data = await resp.json() as {
        features?: { attributes: Record<string, unknown> }[];
        error?: { message?: string };
      };

      if (data.error) continue;

      const features = data?.features;
      if (!features || features.length === 0) continue;

      const attrs = features[0]!.attributes;

      // CLI class field fallback chain
      const rawClass =
        attrs['CLI_CLASS'] ?? attrs['CLASS'] ?? attrs['CAPABILITY_CLASS'] ??
        attrs['SOIL_CLASS'] ?? attrs['AG_CLASS'] ?? attrs['CLI'] ?? null;

      if (rawClass === null) continue;

      const cliClass = typeof rawClass === 'number' ? rawClass : parseInt(String(rawClass), 10);
      if (isNaN(cliClass) || cliClass < 1 || cliClass > 7) continue;

      // Subclass field
      const rawSubclass =
        attrs['CLI_SUBCLASS'] ?? attrs['SUBCLASS'] ?? attrs['CAPABILITY_SUBCLASS'] ??
        attrs['LIMITATION'] ?? attrs['LIMIT_CODE'] ?? '';

      const subclass = String(rawSubclass).replace(/[^A-Za-z]/g, '').toUpperCase();

      return {
        cliClass,
        subclass,
        capability: CLI_CLASS_DESCRIPTIONS[cliClass] ?? `Class ${cliClass}`,
      };
    } catch {
      continue;
    }
  }

  return null;
}

/** Fetch Canada (Ontario) zoning — parallel LIO zoning + AAFC CLI queries. */
async function fetchCaZoning(
  lat: number,
  lng: number,
  bbox?: [number, number, number, number],
): Promise<MockLayerResult> {
  const [lioResult, cliResult] = await Promise.allSettled([
    fetchLioZoning(lat, lng, bbox),
    fetchAafcCli(lat, lng),
  ]);

  const lio = lioResult.status === 'fulfilled' ? lioResult.value : null;
  const cli = cliResult.status === 'fulfilled' ? cliResult.value : null;

  // If we got nothing from either source, the area isn't covered
  if (!lio && !cli) {
    return zoningUnavailable('CA');
  }

  // Build zoning code from available data
  const zoningCode = lio?.zoningCode ?? lio?.officialPlan ?? 'Unknown';
  const zoningDesc = lio?.zoningDescription
    ? `${zoningCode} — ${lio.zoningDescription}`
    : zoningCode;

  // Infer uses from the Ontario zoning code
  const details = inferZoningDetails(zoningCode);

  // Build sources and attributions
  const sources: string[] = [];
  const attributions: string[] = [];
  if (lio) {
    sources.push('Ontario Municipal GIS (LIO)');
    attributions.push('Ontario MNRF');
  }
  if (cli) {
    sources.push('AAFC CLI');
    attributions.push('Agriculture and Agri-Food Canada');
  }

  // CLI subclass explanation
  const subclassExplanation = cli?.subclass
    ? cli.subclass.split('').map((c) => CLI_SUBCLASS_DESCRIPTIONS[c]).filter(Boolean).join('; ')
    : undefined;

  return {
    layerType: 'zoning',
    fetchStatus: 'complete',
    confidence: lio && cli ? 'medium' : 'low',
    dataDate: new Date().toISOString().split('T')[0]!,
    sourceApi: sources.join(' + '),
    attribution: attributions.join(', '),
    summary: {
      zoning_code: zoningCode,
      zoning_description: zoningDesc,
      permitted_uses: details.permitted_uses,
      conditional_uses: details.conditional_uses,
      min_lot_size_ac: 'Unknown',
      front_setback_m: 'Unknown',
      side_setback_m: 'Unknown',
      rear_setback_m: 'Unknown',
      max_building_height_m: 'Unknown',
      max_lot_coverage_pct: 'Unknown',
      official_plan_designation: lio?.officialPlan ?? undefined,
      municipality: lio?.municipality ?? undefined,
      cli_class: cli?.cliClass ?? undefined,
      cli_subclass: cli?.subclass ?? undefined,
      cli_capability: cli?.capability ?? undefined,
      cli_limitations: subclassExplanation ?? undefined,
      is_agricultural: details.isAgricultural || (cli ? cli.cliClass <= 4 : false),
    },
  };
}

// ── Zoning fallback — unavailable with plain-language explanation ────────

function zoningUnavailable(country: string, countyName?: string, stateCode?: string): MockLayerResult {
  let explanation: string;
  let sourceApi: string;

  if (country === 'US') {
    if (countyName && stateCode) {
      explanation =
        `Zoning data for ${countyName}, ${stateCode} is not yet available in the Atlas registry. ` +
        `US zoning is managed at the county/municipal level and there is no unified national database. ` +
        `Check your local county GIS portal or planning department for zoning maps and ordinances.`;
      sourceApi = `County GIS (${countyName}, ${stateCode} — not in registry)`;
    } else {
      explanation =
        'Could not determine the county for this location. US zoning data requires county-level GIS services. ' +
        'Check your local county planning department for zoning information.';
      sourceApi = 'County GIS (county not resolved)';
    }
  } else if (country === 'CA') {
    explanation =
      'Ontario municipal zoning data is published through the Land Information Ontario (LIO) data service, ' +
      'but not all municipalities have digitized their zoning bylaws. Additionally, AAFC Canada Land Inventory ' +
      'coverage may not extend to all areas. Contact your local municipal planning department for official zoning information.';
    sourceApi = 'LIO / AAFC CLI (unavailable for this area)';
  } else {
    explanation = 'Zoning data is currently only supported for US and Canadian (Ontario) locations.';
    sourceApi = 'Not supported';
  }

  return {
    layerType: 'zoning',
    fetchStatus: 'unavailable',
    confidence: 'low',
    dataDate: new Date().toISOString().split('T')[0]!,
    sourceApi: sourceApi,
    attribution: country === 'US' ? 'Municipal planning department' : 'Ontario MNRF / AAFC',
    summary: {
      zoning_code: 'Data not available for this area',
      zoning_description: explanation,
      permitted_uses: [],
      conditional_uses: [],
      min_lot_size_ac: 'Unknown',
      front_setback_m: 'Unknown',
      side_setback_m: 'Unknown',
      rear_setback_m: 'Unknown',
      max_building_height_m: 'Unknown',
      max_lot_coverage_pct: 'Unknown',
    },
  };
}

// ── Infrastructure (Overpass API — OpenStreetMap) ─────────────────────────

/** Haversine distance between two WGS84 points, in km. */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth radius km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Fetch infrastructure POIs from OpenStreetMap Overpass API.
 * Single batched query for 9 categories: hospital, masjid, market,
 * power substation, drinking water, roads, protected areas, nature reserves.
 * Search radius ~25km (0.25° bbox expansion).
 * Returns nearest distance per category in the summary object.
 */
async function fetchInfrastructure(lat: number, lng: number): Promise<MockLayerResult | null> {
  try {
    // ~25km search radius (0.25° ≈ 28km at mid-latitudes)
    const south = lat - 0.25;
    const north = lat + 0.25;
    const west = lng - 0.25;
    const east = lng + 0.25;
    const bbox = `${south},${west},${north},${east}`;

    // Single batched OverpassQL query — all categories in one request
    const query = `[out:json][timeout:15];
(
  nwr["amenity"="hospital"](${bbox});
  nwr["amenity"="place_of_worship"]["religion"="muslim"](${bbox});
  nwr["shop"="supermarket"](${bbox});
  nwr["shop"="convenience"](${bbox});
  nwr["power"="substation"](${bbox});
  nwr["amenity"="drinking_water"](${bbox});
  nwr["highway"~"primary|secondary|tertiary"](${bbox});
  nwr["boundary"="protected_area"](${bbox});
  nwr["leisure"="nature_reserve"](${bbox});
);
out center;`;

    const resp = await fetchWithRetry(
      'https://overpass-api.de/api/interpreter',
      15000,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
      },
    );

    const data = await resp.json() as {
      elements: Array<{
        type: string;
        lat?: number;
        lon?: number;
        center?: { lat: number; lon: number };
        tags?: Record<string, string>;
      }>;
    };

    const elements = data.elements ?? [];

    // Categorize elements into buckets
    interface POI { lat: number; lng: number; name: string | null; subtype: string | null }
    const buckets = {
      hospital: [] as POI[],
      masjid: [] as POI[],
      market: [] as POI[],
      power_substation: [] as POI[],
      water_supply: [] as POI[],
      road: [] as POI[],
      protected_area: [] as POI[],
    };

    for (const el of elements) {
      const elLat = el.lat ?? el.center?.lat;
      const elLng = el.lon ?? el.center?.lon;
      if (elLat == null || elLng == null) continue;

      const tags = el.tags ?? {};
      const name = tags.name ?? null;

      if (tags.amenity === 'hospital') {
        buckets.hospital.push({ lat: elLat, lng: elLng, name, subtype: null });
      } else if (tags.amenity === 'place_of_worship' && tags.religion === 'muslim') {
        buckets.masjid.push({ lat: elLat, lng: elLng, name, subtype: null });
      } else if (tags.shop === 'supermarket' || tags.shop === 'convenience') {
        buckets.market.push({ lat: elLat, lng: elLng, name, subtype: tags.shop });
      } else if (tags.power === 'substation') {
        buckets.power_substation.push({ lat: elLat, lng: elLng, name, subtype: null });
      } else if (tags.amenity === 'drinking_water') {
        buckets.water_supply.push({ lat: elLat, lng: elLng, name, subtype: null });
      } else if (tags.highway && /^(primary|secondary|tertiary)$/.test(tags.highway)) {
        buckets.road.push({ lat: elLat, lng: elLng, name, subtype: tags.highway });
      } else if (tags.boundary === 'protected_area' || tags.leisure === 'nature_reserve') {
        buckets.protected_area.push({ lat: elLat, lng: elLng, name, subtype: tags.protect_class ?? tags.protection_title ?? null });
      }
    }

    // Find nearest POI per category
    function findNearest(pois: POI[]): { km: number; name: string | null; subtype: string | null } | null {
      if (pois.length === 0) return null;
      let best: POI = pois[0]!;
      let bestDist = haversineKm(lat, lng, best.lat, best.lng);
      for (let i = 1; i < pois.length; i++) {
        const d = haversineKm(lat, lng, pois[i]!.lat, pois[i]!.lng);
        if (d < bestDist) { bestDist = d; best = pois[i]!; }
      }
      return { km: Math.round(bestDist * 10) / 10, name: best.name, subtype: best.subtype };
    }

    const nearest = {
      hospital: findNearest(buckets.hospital),
      masjid: findNearest(buckets.masjid),
      market: findNearest(buckets.market),
      power_substation: findNearest(buckets.power_substation),
      water_supply: findNearest(buckets.water_supply),
      road: findNearest(buckets.road),
      protected_area: findNearest(buckets.protected_area),
    };

    const totalPois = Object.values(buckets).reduce((s, b) => s + b.length, 0);

    return {
      layerType: 'infrastructure',
      fetchStatus: 'complete',
      confidence: 'medium', // OSM data quality varies
      dataDate: new Date().toISOString().split('T')[0]!,
      sourceApi: 'OpenStreetMap Overpass API',
      attribution: '© OpenStreetMap contributors',
      summary: {
        hospital_nearest_km: nearest.hospital?.km ?? null,
        hospital_name: nearest.hospital?.name ?? null,
        masjid_nearest_km: nearest.masjid?.km ?? null,
        masjid_name: nearest.masjid?.name ?? null,
        market_nearest_km: nearest.market?.km ?? null,
        market_name: nearest.market?.name ?? null,
        power_substation_nearest_km: nearest.power_substation?.km ?? null,
        water_supply_nearest_km: nearest.water_supply?.km ?? null,
        road_nearest_km: nearest.road?.km ?? null,
        road_type: nearest.road?.subtype ?? null,
        protected_area_nearest_km: nearest.protected_area?.km ?? null,
        protected_area_name: nearest.protected_area?.name ?? null,
        protected_area_class: nearest.protected_area?.subtype ?? null,
        protected_area_count: buckets.protected_area.length,
        poi_count: totalPois,
      },
    };
  } catch {
    // Graceful degradation — Overpass may be unreachable or rate-limited
    return null;
  }
}

// ── Sprint M: USGS NWIS Groundwater ────────────────────────────────────────

async function fetchUSGSNWIS(lat: number, lng: number, country: string): Promise<MockLayerResult | null> {
  if (country !== 'US') return null;
  try {
    const today = new Date();
    const endDT = today.toISOString().split('T')[0]!;
    const startDate = new Date(today);
    startDate.setFullYear(startDate.getFullYear() - 1);
    const startDT = startDate.toISOString().split('T')[0]!;

    const bBox = `${(lng - 0.5).toFixed(4)},${(lat - 0.5).toFixed(4)},${(lng + 0.5).toFixed(4)},${(lat + 0.5).toFixed(4)}`;
    const url =
      `https://waterservices.usgs.gov/nwis/gwlevels/?format=json` +
      `&bBox=${bBox}&siteType=GW&parameterCd=72019` +
      `&startDT=${startDT}&endDT=${endDT}`;

    const resp = await fetchWithRetry(url, 15000);
    const data = await resp.json() as {
      value?: {
        timeSeries?: Array<{
          sourceInfo?: {
            siteName?: string;
            geoLocation?: { geogLocation?: { latitude?: number; longitude?: number } };
          };
          values?: Array<{ value?: Array<{ value?: string; dateTime?: string }> }>;
        }>;
      };
    };

    const timeSeries = data?.value?.timeSeries ?? [];
    if (timeSeries.length === 0) return null;

    interface WellRecord {
      depthFt: number;
      depthM: number;
      km: number;
      name: string;
      date: string;
    }

    const wells: WellRecord[] = [];
    for (const ts of timeSeries) {
      const siteName = ts.sourceInfo?.siteName ?? 'Unknown well';
      const siteLat = ts.sourceInfo?.geoLocation?.geogLocation?.latitude;
      const siteLng = ts.sourceInfo?.geoLocation?.geogLocation?.longitude;
      if (siteLat == null || siteLng == null) continue;

      const values = ts.values?.[0]?.value ?? [];
      const lastValid = [...values].reverse().find((v) => v.value != null && v.value !== '' && !isNaN(Number(v.value)));
      if (!lastValid) continue;

      const depthFt = Number(lastValid.value);
      if (!isFinite(depthFt) || depthFt < 0) continue;

      wells.push({
        depthFt,
        depthM: Math.round((depthFt / 3.28084) * 10) / 10,
        km: Math.round(haversineKm(lat, lng, siteLat, siteLng) * 10) / 10,
        name: siteName,
        date: lastValid.dateTime?.split('T')[0] ?? endDT,
      });
    }

    if (wells.length === 0) return null;

    wells.sort((a, b) => a.km - b.km);
    const nearest = wells[0]!;

    return {
      layerType: 'groundwater',
      fetchStatus: 'complete',
      confidence: 'high',
      dataDate: nearest.date,
      sourceApi: 'USGS NWIS',
      attribution: 'U.S. Geological Survey National Water Information System',
      summary: {
        groundwater_depth_m: nearest.depthM,
        groundwater_depth_ft: Math.round(nearest.depthFt * 10) / 10,
        station_nearest_km: nearest.km,
        station_name: nearest.name,
        station_count: wells.length,
        measurement_date: nearest.date,
      },
    };
  } catch {
    return null;
  }
}

// ── Sprint M: EPA Water Quality Portal ─────────────────────────────────────

async function fetchEPAWQP(lat: number, lng: number, country: string): Promise<MockLayerResult | null> {
  if (country !== 'US') return null;
  try {
    // Step A: find nearest monitoring station
    const stationUrl =
      `https://www.waterqualitydata.us/data/Station/search` +
      `?lat=${lat}&long=${lng}&within=25&mimeType=json`;

    const stationResp = await fetchWithRetry(stationUrl, 15000);
    const stations = await stationResp.json() as Array<{
      MonitoringLocationIdentifier?: string;
      MonitoringLocationName?: string;
      LatitudeMeasure?: string;
      LongitudeMeasure?: string;
      OrganizationFormalName?: string;
    }>;

    interface StationInfo { id: string; name: string; km: number; org: string }
    let nearestStation: StationInfo | null = null;
    if (Array.isArray(stations) && stations.length > 0) {
      const mapped: StationInfo[] = stations
        .filter((s) => s.LatitudeMeasure != null && s.LongitudeMeasure != null)
        .map((s) => ({
          id: s.MonitoringLocationIdentifier ?? '',
          name: s.MonitoringLocationName ?? 'Unknown station',
          km: Math.round(haversineKm(lat, lng, Number(s.LatitudeMeasure), Number(s.LongitudeMeasure)) * 10) / 10,
          org: s.OrganizationFormalName ?? '',
        }));
      mapped.sort((a, b) => a.km - b.km);
      nearestStation = mapped[0] ?? null;
    }

    // Step B: fetch results for key parameters
    const today = new Date();
    const endDT = today.toISOString().split('T')[0]!;
    const startDate = new Date(today);
    startDate.setFullYear(startDate.getFullYear() - 1);
    const startDT = startDate.toISOString().split('T')[0]!;

    const chars = encodeURIComponent('pH,Dissolved oxygen (DO),Nitrate,Turbidity');
    const resultUrl =
      `https://www.waterqualitydata.us/data/Result/search` +
      `?lat=${lat}&long=${lng}&within=25` +
      `&characteristicName=${chars}` +
      `&startDateLo=${startDT}&mimeType=json`;

    const resultResp = await fetchWithRetry(resultUrl, 20000);
    const results = await resultResp.json() as Array<{
      CharacteristicName?: string;
      ResultMeasureValue?: string;
      ResultMeasure?: { MeasureUnitCode?: string };
      ActivityStartDate?: string;
    }>;

    // Pick latest value per characteristic
    type CharMap = Record<string, { value: number; date: string; unit: string }>;
    const charLatest: CharMap = {};

    if (Array.isArray(results)) {
      for (const r of results) {
        const name = r.CharacteristicName ?? '';
        const raw = r.ResultMeasureValue ?? '';
        const val = Number(raw);
        if (!isFinite(val)) continue;
        const date = r.ActivityStartDate ?? endDT;
        const unit = r.ResultMeasure?.MeasureUnitCode ?? '';
        const existing = charLatest[name];
        if (!existing || date > existing.date) {
          charLatest[name] = { value: val, date, unit };
        }
      }
    }

    const ph = charLatest['pH'];
    const doVal = charLatest['Dissolved oxygen (DO)'];
    const nitrate = charLatest['Nitrate'];
    const turbidity = charLatest['Turbidity'];

    const lastMeasured = [ph, doVal, nitrate, turbidity]
      .filter(Boolean)
      .map((v) => v!.date)
      .sort()
      .reverse()[0] ?? null;

    if (!ph && !doVal && !nitrate && !turbidity && !nearestStation) return null;

    return {
      layerType: 'water_quality',
      fetchStatus: 'complete',
      confidence: 'medium',
      dataDate: lastMeasured ?? endDT,
      sourceApi: 'EPA Water Quality Portal',
      attribution: 'EPA National Water Quality Monitoring Council',
      summary: {
        ph_value: ph?.value ?? null,
        ph_date: ph?.date ?? null,
        dissolved_oxygen_mg_l: doVal?.value ?? null,
        do_date: doVal?.date ?? null,
        nitrate_mg_l: nitrate?.value ?? null,
        nitrate_date: nitrate?.date ?? null,
        turbidity_ntu: turbidity?.value ?? null,
        turbidity_date: turbidity?.date ?? null,
        station_nearest_km: nearestStation?.km ?? null,
        station_name: nearestStation?.name ?? null,
        station_count: Array.isArray(stations) ? stations.length : 0,
        orgname: nearestStation?.org ?? null,
        last_measured: lastMeasured,
      },
    };
  } catch {
    return null;
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, timeoutMs: number, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { ...init, signal: controller.signal });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp;
  } finally {
    clearTimeout(timer);
  }
}

/** Retry wrapper — retries transient failures with exponential backoff. */
async function fetchWithRetry(url: string, timeoutMs: number, init?: RequestInit, maxRetries = 2): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fetchWithTimeout(url, timeoutMs, init);
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
      }
    }
  }
  throw lastError;
}
