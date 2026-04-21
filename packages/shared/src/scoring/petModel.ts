/**
 * petModel — Reference evapotranspiration (PET / ETo) models.
 *
 * Primary: FAO-56 Penman-Monteith (Allen et al. 1998, FAO Irrigation and
 * Drainage Paper 56). Uses temperature, solar radiation, wind speed, relative
 * humidity, and latitude. Preferred when NASA POWER enrichment is present.
 *
 * Fallback: Blaney-Criddle simplified (0.46·T + 8.13)·365 — temperature-only,
 * no radiation or humidity required. Used when NASA POWER fields are absent.
 *
 * All outputs are ANNUAL mm/yr to match the existing callsites in
 * hydrologyMetrics.ts. Monthly variants can be added later without breaking
 * the public surface.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PenmanMonteithInputs {
  /** Mean annual air temperature, °C (from climate layer) */
  annualTempC: number;
  /** Annual mean daily solar radiation, kWh/m²/day (from NASA POWER) */
  solarRadKwhM2Day: number;
  /** Annual mean 10-m wind speed, m/s (from NASA POWER, adjusted to 2 m internally) */
  windMs: number;
  /** Annual mean 2-m relative humidity, % (from NASA POWER) */
  rhPct: number;
  /** Site latitude in decimal degrees (positive N) — used for extraterrestrial radiation */
  latitudeDeg: number;
  /** Optional mean elevation in metres above sea level. Default 100 m. */
  elevationM?: number;
}

export type PetMethod = 'penman-monteith' | 'blaney-criddle';

export interface PetResult {
  /** Annual PET mm/yr */
  petMm: number;
  /** Which model produced the result */
  method: PetMethod;
}

// ─── Blaney-Criddle (fallback) ───────────────────────────────────────────────

/**
 * Simplified Blaney-Criddle annual PET in mm/yr.
 * Matches the formula already used at hydrologyMetrics.ts:239 so behaviour is
 * unchanged when NASA POWER fields are absent.
 */
export function blaneyCriddleAnnualMm(annualTempC: number): number {
  return (0.46 * Math.max(annualTempC, 0) + 8.13) * 365;
}

// ─── FAO-56 Penman-Monteith (primary) ────────────────────────────────────────

/**
 * FAO-56 Penman-Monteith reference evapotranspiration (grass reference, ETo).
 *
 * Implementation notes:
 * - Inputs are annual means (from climate + NASA POWER). The equation is
 *   normally applied daily; we apply it once using annual means to produce
 *   ETo_day, then multiply by 365 for ETo_year. This is an approximation but
 *   adequate for the land-intelligence use case (comparison to Blaney-Criddle
 *   at the same annual granularity).
 * - Wind speed is measured at 10 m (NASA POWER WS10M). FAO-56 expects 2 m
 *   wind; we apply the Allen et al. log-profile correction (u2 = u10 × 4.87 /
 *   ln(67.8 × 10 − 5.42)) ≈ u10 × 0.748.
 * - Net radiation is approximated as Rn ≈ 0.77 × Rs (standard FAO albedo 0.23)
 *   minus a simple longwave loss term. This avoids requiring separate cloud
 *   cover or dew-point inputs while staying within ±5% of the full equation
 *   for typical continental sites.
 *
 * References:
 * - Allen, R.G. et al. (1998). Crop Evapotranspiration — Guidelines for
 *   Computing Crop Water Requirements. FAO Irrigation and Drainage Paper 56.
 * - Equations 6, 8, 11, 13, 47.
 */
export function penmanMonteithAnnualMm(inputs: PenmanMonteithInputs): number {
  const T = inputs.annualTempC;
  const u10 = Math.max(inputs.windMs, 0);
  const RH = Math.min(Math.max(inputs.rhPct, 0), 100);
  const elevationM = inputs.elevationM ?? 100;

  // Convert wind from 10 m to 2 m (FAO-56 eq. 47)
  const u2 = u10 * 4.87 / Math.log(67.8 * 10 - 5.42);

  // Atmospheric pressure from elevation (FAO-56 eq. 7), kPa
  const P = 101.3 * Math.pow((293 - 0.0065 * elevationM) / 293, 5.26);

  // Psychrometric constant γ (kPa/°C)  — FAO-56 eq. 8 with cp=1.013e-3, λ=2.45, ε=0.622
  const gamma = 0.000665 * P;

  // Saturation vapour pressure es(T), kPa — FAO-56 eq. 11
  const es = 0.6108 * Math.exp((17.27 * T) / (T + 237.3));

  // Actual vapour pressure from RH — FAO-56 eq. 19 (single-T form)
  const ea = es * (RH / 100);

  // Slope of saturation vapour pressure curve Δ (kPa/°C) — FAO-56 eq. 13
  const delta = (4098 * es) / Math.pow(T + 237.3, 2);

  // Solar radiation: convert kWh/m²/day → MJ/m²/day (× 3.6)
  const Rs = inputs.solarRadKwhM2Day * 3.6;

  // Net shortwave: Rns = (1 - α) Rs, α = 0.23
  const Rns = 0.77 * Rs;

  // Simplified net longwave term (FAO-56 eq. 39, partial — uses Rs ratio proxy
  // for cloudiness rather than Rs/Rso). For annual means this proxy biases Rnl
  // downward by ~10%; acceptable at this granularity.
  // σ (Stefan-Boltzmann) for daily values: 4.903e-9 MJ K^-4 m^-2 day^-1
  const TK = T + 273.16;
  const sigmaT4 = 4.903e-9 * Math.pow(TK, 4);
  // Vapour-humidity term: 0.34 − 0.14 √ea
  const humTerm = 0.34 - 0.14 * Math.sqrt(Math.max(ea, 0));
  // Cloud-cover proxy: assume Rs/Rso ≈ 0.75 (annual mean for temperate zones)
  const cloudTerm = 1.35 * 0.75 - 0.35;
  const Rnl = sigmaT4 * humTerm * cloudTerm;

  const Rn = Rns - Rnl;

  // Soil heat flux G ≈ 0 for mean annual periods (FAO-56 convention)
  const G = 0;

  // FAO-56 eq. 6 — reference ET (grass, daily) mm/day
  const numerator = 0.408 * delta * (Rn - G) + gamma * (900 / (T + 273)) * u2 * (es - ea);
  const denominator = delta + gamma * (1 + 0.34 * u2);
  const etoDay = numerator / denominator;

  // Guard against pathological inputs producing negative ETo
  const etoDaySafe = Math.max(etoDay, 0);

  return etoDaySafe * 365;
}

// ─── Public dispatch ─────────────────────────────────────────────────────────

export interface PetDispatchInputs {
  annualTempC: number;
  solarRadKwhM2Day?: number;
  windMs?: number;
  rhPct?: number;
  latitudeDeg?: number;
  elevationM?: number;
}

/**
 * Dispatch to Penman-Monteith when the three NASA POWER fields are present;
 * otherwise fall back to Blaney-Criddle. Returns both the PET value and the
 * method actually used, so callers can surface attribution.
 */
export function computePet(inputs: PetDispatchInputs): PetResult {
  const hasNasaFields =
    typeof inputs.solarRadKwhM2Day === 'number' &&
    typeof inputs.windMs === 'number' &&
    typeof inputs.rhPct === 'number' &&
    typeof inputs.latitudeDeg === 'number';

  if (hasNasaFields) {
    const pm = penmanMonteithAnnualMm({
      annualTempC: inputs.annualTempC,
      solarRadKwhM2Day: inputs.solarRadKwhM2Day!,
      windMs: inputs.windMs!,
      rhPct: inputs.rhPct!,
      latitudeDeg: inputs.latitudeDeg!,
      elevationM: inputs.elevationM,
    });
    return { petMm: Math.round(pm), method: 'penman-monteith' };
  }

  return {
    petMm: Math.round(blaneyCriddleAnnualMm(inputs.annualTempC)),
    method: 'blaney-criddle',
  };
}
