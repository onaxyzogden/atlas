/**
 * NoaaClimateAdapter — Fetches 1991–2020 climate normals for US projects.
 *
 * Data source: NOAA Regional Climate Centers — Applied Climate Information System (ACIS)
 * https://data.rcc-acis.org  (no auth required, POST-based)
 *
 * Two-step process:
 * 1. StnMeta — find the nearest GHCN station with adequate 1991-2020 coverage
 * 2. StnData — fetch 30 years of monthly maxt/mint/pcpn (°F and inches)
 *
 * Derives:
 *   annual_precip_mm, annual_temp_mean_c, growing_season_days,
 *   first_frost_date, last_frost_date, hardiness_zone,
 *   growing_degree_days_base10c, koppen_classification,
 *   noaa_station, noaa_station_distance_km,
 *   freeze_thaw_cycles_per_year, snow_months
 *
 * Falls back to latitude-based estimate when ACIS returns no usable data.
 *
 * Ninth live adapter in the pipeline.
 */

import pino from 'pino';
import type { LayerType } from '@ogden/shared';
import type { DataSourceAdapter, AdapterResult, ProjectContext } from '../DataPipelineOrchestrator.js';
import { AppError } from '../../../lib/errors.js';
import { fetchNasaPowerSummary } from './nasaPowerFetch.js';

const logger = pino({ name: 'NoaaClimateAdapter' });

const ACIS_BASE = 'https://data.rcc-acis.org';
const ACIS_TIMEOUT_MS = 20_000;

// ─── Types ────────────────────────────────────────────────────────────────────

interface AcisStation {
  name: string;
  ll: [number, number]; // [lng, lat]
  sids: string[];
  state: string;
  valid_daterange?: [string, string][];
}

interface ClimateNormals {
  // Core outputs
  annual_precip_mm: number;
  annual_temp_mean_c: number;
  growing_season_days: number;
  last_frost_date: string;
  first_frost_date: string;
  hardiness_zone: string;
  growing_degree_days_base10c: number;

  // Derived
  koppen_classification: string | null;
  freeze_thaw_cycles_per_year: number;
  snow_months: number;

  // Monthly breakdown
  monthly_normals: Array<{
    month: number;
    mean_max_c: number | null;
    mean_min_c: number | null;
    precip_mm: number;
  }>;

  // Station metadata
  noaa_station: string;
  noaa_station_distance_km: number;

  data_period: '1991-2020';
  source_api: 'NOAA ACIS (1991–2020 Normals)';
  confidence: 'high' | 'medium' | 'low';

  // Optional NASA POWER enrichment (global climatology supplement)
  solar_radiation_kwh_m2_day?: number;
  wind_speed_ms?: number;
  relative_humidity_pct?: number;
  nasa_power_source?: 'NASA POWER (Climatology)';
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

async function acisPost<T>(endpoint: string, body: object): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ACIS_TIMEOUT_MS);

  try {
    const response = await fetch(`${ACIS_BASE}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new AppError(
        'ADAPTER_HTTP_ERROR',
        `ACIS ${endpoint} returned HTTP ${response.status}: ${text.slice(0, 200)}`,
        502,
      );
    }

    const json = await response.json().catch(() => {
      throw new AppError('ADAPTER_PARSE_ERROR', `ACIS ${endpoint} returned invalid JSON`, 502);
    });

    return json as T;
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new AppError('ADAPTER_TIMEOUT', `ACIS ${endpoint} request timed out`, 504);
    }
    throw new AppError('ADAPTER_NETWORK', `ACIS ${endpoint} request failed: ${(err as Error).message}`, 502);
  } finally {
    clearTimeout(timeout);
  }
}

function parseAcisValue(val: string): number | null {
  if (!val || val === 'M' || val === 'S') return null;
  if (val === 'T') return 0; // Trace precipitation
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

function monthlyAvg(arr: number[]): number | null {
  if (arr.length === 0) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function fToC(f: number): number {
  return (f - 32) * 5 / 9;
}

function inToMm(inches: number): number {
  return inches * 25.4;
}

/**
 * Estimate last spring frost date from monthly minimum temperatures.
 * Walks spring months (Jan→Jun) backward to find the last below-zero month.
 */
function computeLastFrostDate(monthlyMinC: number[]): string {
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const days  = [31,    28,    31,    30,    31,    30   ];

  for (let m = 5; m >= 0; m--) {
    if ((monthlyMinC[m] ?? 0) < 0) {
      if (m < 5 && (monthlyMinC[m + 1] ?? 0) >= 0) {
        const range = (monthlyMinC[m + 1] ?? 0) - (monthlyMinC[m] ?? 0);
        const frac = range > 0 ? -(monthlyMinC[m] ?? 0) / range : 0.5;
        const day = Math.max(1, Math.min(days[m]!, Math.round(days[m]! * (1 - frac) + 1)));
        return `${names[m + 1]} ${day}`;
      }
      return `${names[m]} ${Math.round(days[m]! * 0.5)}`;
    }
  }
  return 'Mar 15';
}

/**
 * Estimate first fall frost date from monthly minimum temperatures.
 * Walks fall months (Jul→Dec) forward to find the first below-zero month.
 */
function computeFirstFrostDate(monthlyMinC: number[]): string {
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days  = [31,    28,    31,    30,    31,    30,    31,    31,    30,    31,    30,    31   ];

  for (let m = 6; m <= 11; m++) {
    if ((monthlyMinC[m] ?? 0) < 0) {
      if (m > 6 && (monthlyMinC[m - 1] ?? 0) >= 0) {
        const range = (monthlyMinC[m - 1] ?? 0) - (monthlyMinC[m] ?? 0);
        const frac = range > 0 ? (monthlyMinC[m - 1] ?? 0) / range : 0.5;
        const day = Math.max(1, Math.min(days[m]!, Math.round(frac * days[m]!)));
        return `${names[m]} ${day}`;
      }
      return `${names[m]} ${Math.round(days[m]! * 0.5)}`;
    }
  }
  return 'Nov 15';
}

function computeGrowingSeasonDays(lastFrost: string, firstFrost: string): number {
  const MONTH_NAMES   = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONTH_OFFSETS = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

  const toDoy = (s: string): number => {
    const parts = s.split(' ');
    const mIdx = MONTH_NAMES.indexOf(parts[0]!);
    const day = parseInt(parts[1]!, 10);
    return mIdx >= 0 ? MONTH_OFFSETS[mIdx]! + day : 150;
  };

  return Math.max(0, toDoy(firstFrost) - toDoy(lastFrost));
}

function computeHardinessZone(coldestMonthlyMinC: number): string {
  // Approximate annual extreme minimum from monthly average minimum (subtract ~10°C)
  const extremeMinF = (coldestMonthlyMinC - 10) * 9 / 5 + 32;
  const zoneNum = Math.max(1, Math.min(13, Math.floor((extremeMinF + 60) / 10) + 1));
  const subZone = extremeMinF % 10 < 5 ? 'a' : 'b';
  return `${zoneNum}${subZone}`;
}

/**
 * Köppen-Geiger classification from 12-month temperature and precipitation normals.
 * Returns a 2-3 character code (e.g. "Dfb", "Cfa", "BSk") or null if data incomplete.
 */
function computeKoppen(monthlyMeanC: (number | null)[], monthlyPrecipMm: number[]): string | null {
  const valid = monthlyMeanC.filter((v): v is number => v !== null);
  if (valid.length < 12 || monthlyPrecipMm.length < 12) return null;

  const t = monthlyMeanC as number[];
  const p = monthlyPrecipMm;
  const tWarm = Math.max(...t);
  const tCold = Math.min(...t);
  const tMean = t.reduce((a, b) => a + b, 0) / 12;
  const pAnnual = p.reduce((a, b) => a + b, 0);

  const pSummer = p.slice(3, 9).reduce((a, b) => a + b, 0);
  const pWinter = pAnnual - pSummer;
  const pDriestSummer  = Math.min(...p.slice(3, 9));
  const pWettestWinter = Math.max(...p.slice(0, 3), ...p.slice(9, 12));
  const pDriestWinter  = Math.min(...p.slice(0, 3), ...p.slice(9, 12));
  const pWettestSummer = Math.max(...p.slice(3, 9));

  const pThreshold = pSummer >= 0.7 * pAnnual ? 2 * tMean + 28
    : pWinter >= 0.7 * pAnnual ? 2 * tMean
    : 2 * tMean + 14;

  // Group E — Polar
  if (tWarm < 10) return tWarm > 0 ? 'ET' : 'EF';

  // Group B — Arid
  if (pAnnual < pThreshold) {
    const subtype = pAnnual < pThreshold * 0.5 ? 'W' : 'S';
    const temp = tMean >= 18 ? 'h' : 'k';
    return `B${subtype}${temp}`;
  }

  // Group A — Tropical
  if (tCold >= 18) {
    const pDriest = Math.min(...p);
    if (pDriest >= 60) return 'Af';
    if (pDriest >= 100 - pAnnual / 25) return 'Am';
    return 'Aw';
  }

  const group = tCold > -3 ? 'C' : 'D';

  let second: string;
  if (pDriestSummer < 40 && pDriestSummer < pWettestWinter / 3) second = 's';
  else if (pDriestWinter < pWettestSummer / 10) second = 'w';
  else second = 'f';

  let third: string;
  if (tWarm >= 22) third = 'a';
  else if (t.filter((v) => v >= 10).length >= 4) third = 'b';
  else if (group === 'D' && tCold < -38) third = 'd';
  else third = 'c';

  return `${group}${second}${third}`;
}

/**
 * Estimate freeze-thaw cycles per year from monthly temperature normals.
 */
function computeFreezeThaw(monthlyMeanC: (number | null)[], monthlyMinC: (number | null)[]): {
  freeze_thaw_cycles_per_year: number;
  snow_months: number;
} {
  let transitionMonths = 0;
  let snowMonths = 0;

  for (let m = 0; m < 12; m++) {
    const meanT = monthlyMeanC[m] ?? null;
    const minT  = monthlyMinC[m] ?? null;
    if (meanT === null) continue;

    if (meanT < 0) snowMonths++;

    if (minT !== null && minT < 0 && meanT > -5 && meanT < 5) {
      transitionMonths++;
    }
  }

  return {
    freeze_thaw_cycles_per_year: transitionMonths * 15,
    snow_months: snowMonths,
  };
}

/**
 * Latitude-based fallback climate estimate for US sites.
 * Used when ACIS returns no data (no stations in rural areas, API unavailable, etc.).
 */
function buildLatitudeFallback(lat: number): ClimateNormals {
  const annualTemp = +(14.5 - (lat - 35) * 0.55).toFixed(1);
  const precipMm = Math.round(800 + (lat > 42 ? (48 - lat) * 20 : (lat - 35) * 15));
  const growingDays = Math.round(220 - (lat - 35) * 6.5);
  const lastFrost = 'Apr 15';
  const firstFrost = 'Oct 15';
  const zoneNum = Math.max(3, Math.min(9, Math.round(12.5 - (lat - 25) * 0.18)));
  const zoneSub = lat % 2 > 1 ? 'a' : 'b';

  return {
    annual_precip_mm: precipMm,
    annual_temp_mean_c: annualTemp,
    growing_season_days: growingDays,
    last_frost_date: lastFrost,
    first_frost_date: firstFrost,
    hardiness_zone: `${zoneNum}${zoneSub}`,
    growing_degree_days_base10c: Math.round(Math.max(0, annualTemp - 5) * 180),
    koppen_classification: null,
    freeze_thaw_cycles_per_year: 0,
    snow_months: 0,
    monthly_normals: [],
    noaa_station: 'Estimated (no station found)',
    noaa_station_distance_km: 0,
    data_period: '1991-2020',
    source_api: 'NOAA ACIS (1991–2020 Normals)',
    confidence: 'low',
  };
}

// ─── Adapter Class ────────────────────────────────────────────────────────────

export class NoaaClimateAdapter implements DataSourceAdapter {
  constructor(
    public readonly sourceId: string,
    private readonly layerType: LayerType,
  ) {}

  async fetchForBoundary(boundary: unknown, context: ProjectContext): Promise<AdapterResult> {
    const { lat, lng } = extractCentroid({ ...context, boundaryGeojson: boundary });
    logger.info({ lat, lng }, 'Fetching NOAA ACIS climate normals');

    let normals: ClimateNormals;

    try {
      normals = await this.fetchAcisNormals(lat, lng);
    } catch (err) {
      if (err instanceof AppError) {
        logger.warn({ lat, lng, code: err.code }, 'ACIS unavailable — falling back to latitude estimate');
      } else {
        logger.warn({ lat, lng, err: (err as Error).message }, 'ACIS error — falling back to latitude estimate');
      }
      normals = buildLatitudeFallback(lat);
    }

    // ── NASA POWER enrichment (best-effort, silent-skip on failure) ───────
    try {
      const nasa = await fetchNasaPowerSummary(lat, lng);
      if (nasa) {
        normals.solar_radiation_kwh_m2_day = nasa.solar_radiation_kwh_m2_day;
        normals.wind_speed_ms = nasa.wind_speed_ms;
        normals.relative_humidity_pct = nasa.relative_humidity_pct;
        normals.nasa_power_source = nasa.source_api;
      }
    } catch (err) {
      logger.warn({ lat, lng, err: (err as Error).message }, 'NASA POWER enrichment threw — continuing without it');
    }

    logger.info(
      {
        station: normals.noaa_station,
        distKm: normals.noaa_station_distance_km,
        precip: normals.annual_precip_mm,
        temp: normals.annual_temp_mean_c,
        confidence: normals.confidence,
      },
      'NOAA climate fetch complete',
    );

    return {
      layerType: this.layerType,
      sourceApi: normals.source_api,
      attributionText: this.getAttributionText(),
      confidence: normals.confidence,
      // `data_date` is a DATE column — pass the period-end date. The
      // human-readable "1991-2020" range stays in summary_data.data_period.
      dataDate: '2020-12-31',
      summaryData: normals,
    };
  }

  private async fetchAcisNormals(lat: number, lng: number): Promise<ClimateNormals> {
    // ── Step 1: Find nearest station ────────────────────────────────────────
    const pad = 0.5;
    const searchBbox = `${(lng - pad).toFixed(4)},${(lat - pad).toFixed(4)},${(lng + pad).toFixed(4)},${(lat + pad).toFixed(4)}`;

    const metaJson = await acisPost<{ meta?: AcisStation[] }>('StnMeta', {
      bbox: searchBbox,
      meta: 'name,ll,sids,state,valid_daterange',
      elems: 'maxt,mint,pcpn',
    });

    const stations = metaJson.meta;
    if (!stations || stations.length === 0) {
      throw new AppError('ADAPTER_NO_DATA', 'ACIS: no climate stations found in search area', 404);
    }

    // Select nearest station with adequate 1991-2020 coverage
    const cosLat = Math.cos(lat * Math.PI / 180);
    let bestStation: AcisStation | null = null;
    let bestDist = Infinity;

    for (const stn of stations) {
      const [sLng, sLat] = stn.ll;
      const dx = ((sLng ?? 0) - lng) * cosLat;
      const dy = (sLat ?? 0) - lat;
      const dist = Math.hypot(dx, dy);

      const hasRange = stn.valid_daterange?.some(([start, end]) =>
        start && end && start <= '1995' && end >= '2015',
      );

      if (hasRange && dist < bestDist) {
        bestDist = dist;
        bestStation = stn;
      }
    }

    // Fallback: nearest station regardless of coverage
    if (!bestStation) {
      bestStation = stations.reduce((best, stn) => {
        const [sLng, sLat] = stn.ll;
        const dist = Math.hypot(((sLng ?? 0) - lng) * cosLat, (sLat ?? 0) - lat);
        const [bLng, bLat] = best.ll;
        return dist < Math.hypot(((bLng ?? 0) - lng) * cosLat, (bLat ?? 0) - lat) ? stn : best;
      });
    }

    const sid = bestStation.sids[0]?.split(' ')[0];
    if (!sid) {
      throw new AppError('ADAPTER_NO_DATA', 'ACIS: selected station has no SID', 404);
    }

    // ── Step 2: Fetch 30-year monthly data ──────────────────────────────────
    const dataJson = await acisPost<{
      meta: { name: string; ll: [number, number] };
      data: [string, string, string, string][];
    }>('StnData', {
      sid,
      sdate: '1991-01',
      edate: '2020-12',
      elems: [
        { name: 'maxt', interval: 'mly', duration: 'mly', reduce: 'mean', maxmissing: 5 },
        { name: 'mint', interval: 'mly', duration: 'mly', reduce: 'mean', maxmissing: 5 },
        { name: 'pcpn', interval: 'mly', duration: 'mly', reduce: 'sum',  maxmissing: 5 },
      ],
    });

    const rows = dataJson.data;
    if (!rows || rows.length < 24) {
      throw new AppError('ADAPTER_NO_DATA', 'ACIS: insufficient climate data from station', 404);
    }

    // ── Step 3: Aggregate monthly normals ───────────────────────────────────
    const monthlyMaxtF: number[][] = Array.from({ length: 12 }, () => []);
    const monthlyMintF: number[][] = Array.from({ length: 12 }, () => []);
    const monthlyPcpnIn: number[][] = Array.from({ length: 12 }, () => []);

    for (const [dateStr, maxtStr, mintStr, pcpnStr] of rows) {
      const month = parseInt(dateStr.split('-')[1]!, 10) - 1;
      if (month < 0 || month > 11) continue;

      const maxt = parseAcisValue(maxtStr);
      const mint = parseAcisValue(mintStr);
      const pcpn = parseAcisValue(pcpnStr);

      if (maxt !== null) monthlyMaxtF[month]!.push(maxt);
      if (mint !== null) monthlyMintF[month]!.push(mint);
      if (pcpn !== null) monthlyPcpnIn[month]!.push(pcpn);
    }

    const normMaxtF  = monthlyMaxtF.map(monthlyAvg);
    const normMintF  = monthlyMintF.map(monthlyAvg);
    const normPcpnIn = monthlyPcpnIn.map(monthlyAvg);

    const validMonths = normMaxtF.filter((v) => v !== null).length;
    if (validMonths < 10) {
      throw new AppError('ADAPTER_NO_DATA', 'ACIS: too many missing months in normals', 404);
    }

    // ── Step 4: Convert to metric ────────────────────────────────────────────
    const monthlyMeanC: (number | null)[] = normMaxtF.map((maxt, m) => {
      const mint = normMintF[m] ?? null;
      if (maxt === null || mint === null) return null;
      return fToC((maxt + mint) / 2);
    });
    const monthlyMinC: (number | null)[] = normMintF.map((v) => v !== null ? fToC(v) : null);
    const monthlyPrecipMm: number[] = normPcpnIn.map((v) => v !== null ? inToMm(v) : 0);

    const annualPrecipMm = Math.round(monthlyPrecipMm.reduce((a, b) => a + b, 0));
    const validMeans = monthlyMeanC.filter((v): v is number => v !== null);
    const annualMeanC = +(validMeans.reduce((a, b) => a + b, 0) / validMeans.length).toFixed(1);

    // ── Step 5: Derived computations ─────────────────────────────────────────
    const safeMinsC = monthlyMinC.map((v) => v ?? 0);
    const lastFrostDate  = computeLastFrostDate(safeMinsC);
    const firstFrostDate = computeFirstFrostDate(safeMinsC);
    const growingDays    = computeGrowingSeasonDays(lastFrostDate, firstFrostDate);

    const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const gdd = Math.round(
      monthlyMeanC.reduce<number>((sum, tc, m) =>
        sum + (tc !== null ? Math.max(0, tc - 10) * DAYS_IN_MONTH[m]! : 0), 0),
    );

    const coldestMinC = Math.min(...safeMinsC);
    const hardinessZone = computeHardinessZone(coldestMinC);

    const koppenCode = computeKoppen(monthlyMeanC, monthlyPrecipMm);
    const { freeze_thaw_cycles_per_year, snow_months } = computeFreezeThaw(monthlyMeanC, monthlyMinC);

    // ── Step 6: Monthly normals array ────────────────────────────────────────
    const monthlyNormals = Array.from({ length: 12 }, (_, m) => ({
      month: m + 1,
      mean_max_c: normMaxtF[m] !== null ? +fToC(normMaxtF[m]!).toFixed(1) : null,
      mean_min_c: normMintF[m] !== null ? +fToC(normMintF[m]!).toFixed(1) : null,
      precip_mm: +monthlyPrecipMm[m]!.toFixed(1),
    }));

    // ── Station distance → confidence ────────────────────────────────────────
    const stationDistKm = Math.round(bestDist * 111);
    const confidence: 'high' | 'medium' | 'low' =
      stationDistKm < 30 ? 'high' : stationDistKm < 60 ? 'medium' : 'low';

    return {
      annual_precip_mm: annualPrecipMm,
      annual_temp_mean_c: annualMeanC,
      growing_season_days: growingDays,
      last_frost_date: lastFrostDate,
      first_frost_date: firstFrostDate,
      hardiness_zone: hardinessZone,
      growing_degree_days_base10c: gdd,
      koppen_classification: koppenCode,
      freeze_thaw_cycles_per_year,
      snow_months,
      monthly_normals: monthlyNormals,
      noaa_station: bestStation.name,
      noaa_station_distance_km: stationDistKm,
      data_period: '1991-2020',
      source_api: 'NOAA ACIS (1991–2020 Normals)',
      confidence,
    };
  }

  getConfidence(result: AdapterResult): 'high' | 'medium' | 'low' {
    return result.confidence;
  }

  getAttributionText(): string {
    return 'NOAA Regional Climate Centers — Applied Climate Information System (ACIS), 1991–2020 Normals';
  }
}
