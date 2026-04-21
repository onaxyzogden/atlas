/**
 * nasaPowerFetch — Shared helper for fetching NASA POWER climatology at a point.
 *
 * Data source: NASA POWER (Prediction Of Worldwide Energy Resources)
 * https://power.larc.nasa.gov/api/temporal/climatology/point
 * Keyless, CC-licensed, global coverage.
 *
 * Returns the three globally-available fields that supplement regional climate
 * adapters (NOAA ACIS in the US, ECCC in Canada):
 *   - solar_radiation_kwh_m2_day — unlocks computeScores `solar_pv_potential`
 *   - wind_speed_ms              — unlocks FAO56 Penman-Monteith PET upgrade
 *   - relative_humidity_pct      — unlocks FAO56 Penman-Monteith PET upgrade
 *
 * NASA POWER returns annual climatology under the key "ANN" when the `climatology`
 * endpoint is hit with `community=AG`. Units as returned:
 *   ALLSKY_SFC_SW_DWN : MJ/m^2/day   (divide by 3.6 → kWh/m^2/day)
 *   WS10M             : m/s
 *   RH2M              : %
 *
 * Failure policy: single retry on 5xx, then silent-skip (returns null).
 * Callers must not fail their parent fetch if this returns null.
 */

import pino from 'pino';

const logger = pino({ name: 'nasaPowerFetch' });

const NASA_POWER_BASE = 'https://power.larc.nasa.gov/api/temporal/climatology/point';
const NASA_POWER_TIMEOUT_MS = 10_000;
const MJ_TO_KWH_PER_M2_DAY = 3.6;

export interface NasaPowerSummary {
  solar_radiation_kwh_m2_day: number;
  wind_speed_ms: number;
  relative_humidity_pct: number;
  attribution: string;
  confidence: 'high' | 'medium' | 'low';
  source_api: 'NASA POWER (Climatology)';
}

interface NasaPowerResponse {
  properties?: {
    parameter?: {
      ALLSKY_SFC_SW_DWN?: Record<string, number>;
      WS10M?: Record<string, number>;
      RH2M?: Record<string, number>;
    };
  };
}

const FILL_VALUE = -999;

function pickAnnual(series: Record<string, number> | undefined): number | null {
  if (!series) return null;
  // NASA POWER returns "ANN" for annual climatology
  const v = series['ANN'];
  if (v === undefined || v === null || v === FILL_VALUE) return null;
  return v;
}

async function fetchOnce(url: string): Promise<NasaPowerResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), NASA_POWER_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      const err = new Error(`HTTP ${response.status}`) as Error & { status?: number };
      err.status = response.status;
      throw err;
    }
    return (await response.json()) as NasaPowerResponse;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fetch NASA POWER annual climatology for a single point.
 *
 * Returns `null` (silently) on any failure — timeout, network, HTTP error,
 * parse error, or fill-value data. Callers must not propagate these failures;
 * this helper is a best-effort enrichment layer.
 */
export async function fetchNasaPowerSummary(
  lat: number,
  lng: number,
): Promise<NasaPowerSummary | null> {
  const params = new URLSearchParams({
    parameters: 'ALLSKY_SFC_SW_DWN,WS10M,RH2M',
    community: 'AG',
    latitude: lat.toFixed(4),
    longitude: lng.toFixed(4),
    format: 'JSON',
  });
  const url = `${NASA_POWER_BASE}?${params.toString()}`;

  let json: NasaPowerResponse;
  try {
    json = await fetchOnce(url);
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status !== undefined && status >= 500 && status < 600) {
      // single retry on 5xx
      try {
        json = await fetchOnce(url);
      } catch (retryErr) {
        logger.warn(
          { lat, lng, err: (retryErr as Error).message },
          'NASA POWER retry failed — skipping enrichment',
        );
        return null;
      }
    } else {
      logger.warn(
        { lat, lng, err: (err as Error).message },
        'NASA POWER fetch failed — skipping enrichment',
      );
      return null;
    }
  }

  const params_obj = json.properties?.parameter;
  const solarMj = pickAnnual(params_obj?.ALLSKY_SFC_SW_DWN);
  const windMs = pickAnnual(params_obj?.WS10M);
  const rhPct = pickAnnual(params_obj?.RH2M);

  if (solarMj === null || windMs === null || rhPct === null) {
    logger.warn({ lat, lng, solarMj, windMs, rhPct }, 'NASA POWER returned fill values — skipping enrichment');
    return null;
  }

  // NASA POWER climatology is grid-interpolated (0.5° × 0.625° MERRA-2) — treat
  // as "medium" confidence globally. A station-colocation upgrade could lift
  // this to "high" near flux towers, but that's out of scope here.
  return {
    solar_radiation_kwh_m2_day: +(solarMj / MJ_TO_KWH_PER_M2_DAY).toFixed(2),
    wind_speed_ms: +windMs.toFixed(2),
    relative_humidity_pct: +rhPct.toFixed(1),
    attribution: 'NASA POWER (Prediction Of Worldwide Energy Resources) — climatology',
    confidence: 'medium',
    source_api: 'NASA POWER (Climatology)',
  };
}
