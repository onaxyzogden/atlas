/**
 * Layer Fetcher — replaces mock data with real API calls where possible.
 *
 * Strategy:
 *   US:
 *     - USGS EPQS: Real elevation data (CORS-friendly)
 *     - SSURGO SDA: Real soil data (CORS-friendly)
 *     - USGS WBD: Real watershed/HUC data (CORS-friendly)
 *     - FEMA NFHL + USFWS NWI: Real wetlands/flood data
 *     - MRLC NLCD: Real land cover (WMS)
 *     - Climate: Latitude-based model (NOAA-derived)
 *   CA (Ontario):
 *     - ECCC Climate Normals (OGC API): Real climate station data
 *     - Ontario Hydro Network (LIO ArcGIS REST): Real watershed/stream data
 *     - Ontario Soil Survey Complex (LIO ArcGIS REST): Real soils data
 *     - AAFC Annual Crop Inventory (ImageServer Identify): Real land cover
 *     - Elevation: Latitude-based model (NRCan HRDEM needs backend WCS proxy — Sprint 3)
 *     - Wetlands/Flood: Latitude-based model (Conservation Authority varies — Sprint 3)
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
    const all = JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}');
    all[key] = { layers, fetchedAt: Date.now(), isLive };
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

  // Elevation (US: USGS EPQS — CA: latitude model, NRCan HRDEM needs backend proxy)
  fetchers.push(fetchElevation(lat, lng, options.country).then(trackLive));

  // Soils (US: SSURGO SDA — CA: LIO Ontario Soil Survey Complex)
  fetchers.push(fetchSoils(lat, lng, options.country).then(trackLive));

  // Climate (US: latitude model — CA: ECCC Climate Normals OGC API)
  fetchers.push(fetchClimate(lat, lng, options.country).then(trackLive));

  // Watershed (US: USGS WBD — CA: Ontario Hydro Network LIO)
  fetchers.push(fetchWatershed(lat, lng, options.country).then(trackLive));

  // Wetlands & Flood (US: FEMA NFHL + NWI — CA: latitude model, Conservation Authority varies)
  fetchers.push(fetchWetlandsFlood(lat, lng, options.country).then(trackLive));

  // Land Cover (US: MRLC NLCD — CA: AAFC Annual Crop Inventory)
  fetchers.push(fetchLandCover(lat, lng, options.country).then(trackLive));

  await Promise.allSettled(fetchers);

  const isLive = liveCount > 0;
  setCache(cacheKey, results, isLive);

  return { layers: results, isLive, liveCount, totalCount: 7 };
}

function replaceLayer(results: MockLayerResult[], replacement: MockLayerResult) {
  const idx = results.findIndex((r) => r.layer_type === replacement.layer_type);
  if (idx >= 0) results[idx] = replacement;
}

/** True when the result came from a real API, not a latitude-based estimate. */
function isLiveResult(r: MockLayerResult): boolean {
  return !r.source_api.startsWith('Estimated') &&
         !r.source_api.startsWith('Climate model');
}

// ── Elevation fetcher (USGS EPQS) ──────────────────────────────────────────

async function fetchElevation(lat: number, lng: number, country: string): Promise<MockLayerResult | null> {
  if (country === 'CA') {
    // Use latitude-based estimate for Canada
    return elevationFromLatitude(lat, lng, country);
  }

  try {
    // Query 5 points to get min/max/mean
    const offsets = [
      [0, 0], [0.005, 0.005], [-0.005, 0.005], [0.005, -0.005], [-0.005, -0.005],
    ];

    const elevations = await Promise.all(
      offsets.map(async ([dlng, dlat]) => {
        const url = `https://epqs.nationalmap.gov/v1/json?x=${lng + dlng!}&y=${lat + dlat!}&wkid=4326&units=Meters&includeDate=false`;
        const resp = await fetchWithRetry(url, 8000);
        const data = await resp.json();
        const val = parseFloat(data.value);
        return isNaN(val) ? null : val;
      }),
    );

    const valid = elevations.filter((e): e is number => e !== null);
    if (valid.length === 0) return elevationFromLatitude(lat, lng, country);

    const minElev = Math.round(Math.min(...valid));
    const maxElev = Math.round(Math.max(...valid));
    const meanElev = Math.round(valid.reduce((s, v) => s + v, 0) / valid.length);
    const range = maxElev - minElev;
    const estimatedSlope = Math.min(45, range * 0.3); // rough estimate

    return {
      layer_type: 'elevation',
      fetch_status: 'complete',
      confidence: 'high',
      data_date: new Date().toISOString().split('T')[0]!,
      source_api: 'USGS 3DEP (EPQS)',
      attribution: 'U.S. Geological Survey',
      summary: {
        min_elevation_m: minElev,
        max_elevation_m: maxElev,
        mean_elevation_m: meanElev,
        mean_slope_deg: +(estimatedSlope * 0.4).toFixed(1),
        max_slope_deg: +estimatedSlope.toFixed(1),
        predominant_aspect: estimateAspect(lat, lng),
      },
    };
  } catch {
    return elevationFromLatitude(lat, lng, country);
  }
}

function elevationFromLatitude(lat: number, lng: number, country: string): MockLayerResult {
  // Rough elevation model based on latitude/longitude for Eastern North America
  const baseElev = lat > 45 ? 200 : lat > 40 ? 150 : lat > 35 ? 100 : 50;
  const lngFactor = Math.abs(lng + 80) * 5; // higher further from coast
  const elev = Math.round(baseElev + lngFactor);

  return {
    layer_type: 'elevation',
    fetch_status: 'complete',
    confidence: country === 'CA' ? 'medium' : 'low',
    data_date: new Date().toISOString().split('T')[0]!,
    source_api: country === 'CA' ? 'Estimated (NRCan HRDEM unavailable)' : 'Estimated',
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
    const query = `SELECT TOP 1 mu.muname, mu.musym, c.drainagecl, c.hydgrp, c.taxorder, c.nirrcapcl, c.comppct_r, ch.om_r, ch.ph1to1h2o_r, ch.sandtotal_r, ch.claytotal_r FROM mapunit mu INNER JOIN component c ON mu.mukey = c.mukey LEFT JOIN chorizon ch ON c.cokey = ch.cokey AND ch.hzdept_r = 0 WHERE mu.mukey IN (SELECT mukey FROM SDA_Get_Mukey_from_intersection_with_WktWgs84('POINT(${lng} ${lat})')) ORDER BY c.comppct_r DESC`;

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
    const row = table[2];
    if (!row || columns.length === 0) return soilsFromLatitude(lat, country);

    // Build name→index map for robust column access
    const col = (name: string) => { const idx = columns.findIndex((c: string) => c.toLowerCase() === name.toLowerCase()); return idx >= 0 ? row[idx] : null; };

    const muname = col('muname') ?? 'Unknown';
    const drainage = col('drainagecl') ?? 'Unknown';
    const hydgrp = col('hydgrp') ?? 'Unknown';
    const taxorder = col('taxorder') ?? '';
    const capClass = col('nirrcapcl') ?? '';
    const om = col('om_r') ? parseFloat(col('om_r')) : null;
    const ph = col('ph1to1h2o_r') ? parseFloat(col('ph1to1h2o_r')) : null;
    const sand = col('sandtotal_r') ? parseFloat(col('sandtotal_r')) : null;
    const clay = col('claytotal_r') ? parseFloat(col('claytotal_r')) : null;

    // Derive texture from sand/clay percentages
    let texture = 'Loam';
    if (sand !== null && clay !== null) {
      if (clay > 40) texture = 'Clay';
      else if (sand > 70) texture = 'Sandy loam';
      else if (clay > 25) texture = 'Clay loam';
      else if (sand > 50) texture = 'Sandy loam';
      else texture = 'Loam';
    }

    // Derive farmland class from capability class
    const farmlandClass = capClass === '1' ? 'Prime farmland'
      : capClass === '2' ? 'Farmland of statewide importance'
      : capClass <= '4' ? `Capability Class ${capClass}`
      : `Class ${capClass}`;

    return {
      layer_type: 'soils',
      fetch_status: 'complete',
      confidence: 'high',
      data_date: new Date().toISOString().split('T')[0]!,
      source_api: 'USDA SSURGO (SDA)',
      attribution: 'USDA Natural Resources Conservation Service',
      summary: {
        predominant_texture: texture,
        soil_name: muname,
        drainage_class: drainage || 'Unknown',
        organic_matter_pct: om !== null ? +om.toFixed(1) : 'N/A',
        ph_range: ph !== null ? `${(ph - 0.3).toFixed(1)} - ${(ph + 0.3).toFixed(1)}` : 'N/A',
        hydrologic_group: hydgrp || 'Unknown',
        farmland_class: farmlandClass,
        depth_to_bedrock_m: 'N/A',
        taxonomic_order: taxorder,
      },
    };
  } catch {
    return soilsFromLatitude(lat, country);
  }
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
    layer_type: 'soils',
    fetch_status: 'complete',
    confidence: 'high',
    data_date: new Date().toISOString().split('T')[0]!,
    source_api: 'Ontario Soil Survey Complex (LIO)',
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
    layer_type: 'soils',
    fetch_status: 'complete',
    confidence: 'medium',
    data_date: new Date().toISOString().split('T')[0]!,
    source_api: country === 'CA' ? 'Estimated (OMAFRA CanSIS unavailable)' : 'Estimated',
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

// ── Climate (ECCC OGC API for CA, latitude model for US) ───────────────────

async function fetchClimate(lat: number, lng: number, country: string): Promise<MockLayerResult> {
  // CA: try ECCC Climate Normals OGC API first
  if (country === 'CA') {
    try {
      return await fetchEcccClimate(lat, lng);
    } catch {
      // Fall through to latitude model
    }
  }

  // US / CA fallback: latitude-based model
  const annualTemp = +(14.5 - (lat - 35) * 0.55).toFixed(1);
  const precipMm = Math.round(800 + (lat > 42 ? (48 - lat) * 20 : (lat - 35) * 15));
  const growingDays = Math.round(220 - (lat - 35) * 6.5);
  const frostFreeStart = Math.round(90 + (lat - 35) * 3.5); // day of year
  const frostFreeEnd = Math.round(300 - (lat - 35) * 3); // day of year

  const lastFrostDate = dayOfYearToDate(frostFreeStart);
  const firstFrostDate = dayOfYearToDate(frostFreeEnd);

  // Hardiness zone from latitude
  const zoneNum = Math.max(3, Math.min(9, Math.round(12.5 - (lat - 25) * 0.18)));
  const zoneSub = lat % 2 > 1 ? 'a' : 'b';
  const zone = `${zoneNum}${zoneSub}`;

  return {
    layer_type: 'climate',
    fetch_status: 'complete',
    confidence: 'high',
    data_date: new Date().toISOString().split('T')[0]!,
    source_api: country === 'CA' ? 'Climate model (ECCC-derived)' : 'Climate model (NOAA-derived)',
    attribution: country === 'CA' ? 'Latitude-based model from ECCC normals' : 'Latitude-based model from NOAA normals',
    summary: {
      annual_precip_mm: precipMm,
      annual_temp_mean_c: annualTemp,
      growing_season_days: growingDays,
      first_frost_date: firstFrostDate,
      last_frost_date: lastFrostDate,
      hardiness_zone: zone,
      prevailing_wind: lat > 42 ? 'W-SW' : 'SW',
      annual_sunshine_hours: Math.round(1800 + (35 - Math.abs(lat - 38)) * 30),
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

  // annual_sunshine_hours not in ECCC normals — use latitude estimate
  const sunshineFallback = Math.round(1800 + (35 - Math.abs(lat - 38)) * 30);

  return {
    layer_type: 'climate',
    fetch_status: 'complete',
    confidence: 'high',
    data_date: new Date().toISOString().split('T')[0]!,
    source_api: 'ECCC Climate Normals (OGC API)',
    attribution: 'Environment and Climate Change Canada',
    summary: {
      annual_precip_mm: annualPrecip ?? 'N/A',
      annual_temp_mean_c: meanTemp != null ? +meanTemp.toFixed(1) : 'N/A',
      growing_season_days: !isNaN(frostFreeDays!) ? frostFreeDays : 'N/A',
      last_frost_date: lastFrost ?? 'N/A',
      first_frost_date: firstFrost ?? 'N/A',
      hardiness_zone: hardinessZone ?? 'N/A',
      prevailing_wind: lat > 42 ? 'W-SW' : 'SW',
      annual_sunshine_hours: sunshineFallback,
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
      layer_type: 'watershed',
      fetch_status: 'complete',
      confidence: 'high',
      data_date: new Date().toISOString().split('T')[0]!,
      source_api: 'USGS WBD (NHD Plus)',
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
    layer_type: 'watershed',
    fetch_status: 'complete',
    confidence: nearestM < 1000 ? 'high' : 'medium',
    data_date: new Date().toISOString().split('T')[0]!,
    source_api: 'Ontario Hydro Network (LIO)',
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
    layer_type: 'watershed',
    fetch_status: 'complete',
    confidence: 'medium',
    data_date: new Date().toISOString().split('T')[0]!,
    source_api: country === 'CA' ? 'Estimated (Ontario Hydro Network)' : 'Estimated (NHD Plus)',
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

// ── Wetlands & Flood (FEMA NFHL for US) ────────────────────────────────────

async function fetchWetlandsFlood(lat: number, lng: number, country: string): Promise<MockLayerResult> {
  if (country !== 'US') return wetlandsFromLatitude(lat, country);

  // Fetch FEMA flood zones and NWI wetlands in parallel
  const [floodResult, nwiResult] = await Promise.allSettled([
    fetchFemaFlood(lat, lng),
    fetchNwiWetlands(lat, lng),
  ]);

  const flood = floodResult.status === 'fulfilled' ? floodResult.value : null;
  const nwi = nwiResult.status === 'fulfilled' ? nwiResult.value : null;

  if (!flood && !nwi) return wetlandsFromLatitude(lat, country);

  const floodZone = flood?.zone ?? 'Zone X';
  const isHighRisk = ['A', 'AE', 'AO', 'V', 'VE'].includes(floodZone);

  return {
    layer_type: 'wetlands_flood',
    fetch_status: 'complete',
    confidence: flood && nwi ? 'high' : 'medium',
    data_date: new Date().toISOString().split('T')[0]!,
    source_api: [flood ? 'FEMA NFHL' : null, nwi ? 'USFWS NWI' : null].filter(Boolean).join(' + '),
    attribution: [flood ? 'FEMA' : null, nwi ? 'U.S. Fish & Wildlife Service' : null].filter(Boolean).join(', '),
    summary: {
      flood_zone: `${floodZone}${flood?.subtype ? ` (${flood.subtype})` : ''}`,
      flood_risk: isHighRisk ? 'High risk \u2014 Special Flood Hazard Area' : 'Minimal risk',
      wetland_pct: nwi?.count ? `Yes (${nwi.count} found)` : 'None detected',
      wetland_types: nwi?.types ?? [],
      riparian_buffer_m: 30,
      regulated_area_pct: isHighRisk ? 'Yes \u2014 development restrictions apply' : 'No special restrictions',
    },
  };
}

async function fetchFemaFlood(lat: number, lng: number): Promise<{ zone: string; subtype: string } | null> {
  try {
    const url = `https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer/28/query?where=1%3D1&geometry=${lng}%2C${lat}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=FLD_ZONE%2CZONE_SUBTY&returnGeometry=false&f=json`;
    const resp = await fetchWithRetry(url, 8000);
    const data = await resp.json();
    const attr = data.features?.[0]?.attributes;
    if (!attr) return null;
    return { zone: attr.FLD_ZONE ?? 'X', subtype: attr.ZONE_SUBTY ?? '' };
  } catch {
    return null;
  }
}

async function fetchNwiWetlands(lat: number, lng: number): Promise<{ count: number; types: string[] } | null> {
  try {
    // NWI wetlands query — search within ~500m of point
    const buf = 0.005; // ~500m
    const url = `https://www.fws.gov/wetlands/arcgis/rest/services/Wetlands/MapServer/0/query?where=1%3D1&geometry=${lng - buf}%2C${lat - buf}%2C${lng + buf}%2C${lat + buf}&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=WETLAND_TYPE%2CATTRIBUTE&returnGeometry=false&resultRecordCount=50&f=json`;
    const resp = await fetchWithRetry(url, 10000);
    const data = await resp.json();
    const features = data.features;
    if (!features || features.length === 0) return null;

    // Collect unique wetland types
    const typeSet = new Set<string>();
    for (const f of features) {
      const t = f.attributes?.WETLAND_TYPE ?? f.attributes?.ATTRIBUTE;
      if (t) typeSet.add(String(t));
    }

    // Map NWI codes to readable names
    const readableTypes = [...typeSet].slice(0, 5).map((code) => {
      if (code.startsWith('PEM')) return 'Palustrine Emergent';
      if (code.startsWith('PFO')) return 'Palustrine Forested';
      if (code.startsWith('PSS')) return 'Palustrine Scrub-Shrub';
      if (code.startsWith('PUB')) return 'Palustrine Unconsolidated Bottom';
      if (code.startsWith('PAB')) return 'Palustrine Aquatic Bed';
      if (code.startsWith('R')) return 'Riverine';
      if (code.startsWith('L')) return 'Lacustrine';
      if (code.startsWith('E')) return 'Estuarine';
      if (code === 'Freshwater Emergent Wetland') return code;
      if (code === 'Freshwater Forested/Shrub Wetland') return code;
      return code;
    });

    return { count: features.length, types: readableTypes };
  } catch {
    return null;
  }
}

function wetlandsFromLatitude(lat: number, country: string): MockLayerResult {
  return {
    layer_type: 'wetlands_flood',
    fetch_status: 'complete',
    confidence: 'low',
    data_date: new Date().toISOString().split('T')[0]!,
    source_api: country === 'CA' ? 'Estimated (Conservation Authority)' : 'Estimated (FEMA unavailable)',
    attribution: 'Regional estimate',
    summary: {
      flood_zone: 'Unknown — check local flood maps',
      wetland_pct: lat > 43 ? 'Likely present' : 'Unknown',
      wetland_types: [],
      riparian_buffer_m: 30,
      regulated_area_pct: country === 'CA' ? 'Check Conservation Authority' : 'Check local FEMA maps',
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
        layer_type: 'land_cover',
        fetch_status: 'complete',
        confidence: 'high',
        data_date: new Date().toISOString().split('T')[0]!,
        source_api: 'USGS NLCD 2021',
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
    layer_type: 'land_cover',
    fetch_status: 'complete',
    confidence: 'high',
    data_date: new Date().toISOString().split('T')[0]!,
    source_api: 'AAFC Annual Crop Inventory 2024',
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
    layer_type: 'land_cover',
    fetch_status: 'complete',
    confidence: 'medium',
    data_date: new Date().toISOString().split('T')[0]!,
    source_api: country === 'CA' ? 'Estimated (AAFC model)' : 'Estimated (NLCD unavailable)',
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
