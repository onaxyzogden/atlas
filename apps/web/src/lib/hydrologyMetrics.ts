/**
 * hydrologyMetrics — derive hydrological engineering metrics from real site data.
 *
 * Sources: NRCS runoff CN method, Manning's equation, Rational method (Q=CiA),
 * Blaney-Criddle ET, and standard agro-hydrology reference tables.
 */

import { status } from './tokens.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HydroInputs {
  /** Annual precipitation mm/yr (from climate layer) */
  precipMm: number;
  /** HUC12/watershed catchment area ha (from watershed layer). Falls back to propertyAcres×20. */
  catchmentHa: number | null;
  /** Property acreage in acres (from project.acreage) */
  propertyAcres: number;
  /** Mean slope in degrees (from elevation layer) */
  slopeDeg: number;
  /** NRCS hydrologic soil group A/B/C/D (from soils layer) */
  hydrologicGroup: string;
  /** Soil drainage class description (from soils layer) */
  drainageClass: string;
  /** FEMA/regulation flood zone string (from wetlands_flood layer) */
  floodZone: string;
  /** Wetland coverage % of property (from wetlands_flood layer) */
  wetlandPct: number;
  /** Mean annual temperature °C (from climate layer) */
  annualTempC: number;

  // Sprint I: LGP inputs (optional — gracefully skipped when absent)
  /** Monthly climate normals array (from _monthly_normals, stripped from cache) */
  monthlyNormals?: { month: number; mean_max_c: number | null; mean_min_c: number | null; precip_mm: number }[] | null;
  /** Available water capacity cm/cm (from soils layer) */
  awcCmCm?: number;
  /** Effective rooting depth cm (from soils layer) */
  rootingDepthCm?: number;
}

export interface HydroMetrics {
  // Real-time analysis
  runoffVelocity: number;      // m/s (Manning's)
  infiltrationRate: number;    // mm/hr (by hydrologic group)
  peakDischarge: number;       // m³/s (Rational method, 50-yr storm)
  subBasinBars: number[];      // 8 relative loading values 0-100
  alertText: string;           // site-contextual alert

  // Design parameters
  catchmentVolume: number;     // m³ (volumetric runoff from property)
  pondDepth: number;           // m (given 3% of area as pond surface)
  seepageRisk: 'LOWEST' | 'LOW' | 'MODERATE' | 'HIGH';
  seepageRiskColor: string;
  seepageDesc: string;
  aiSitingText: string;

  // Dashboard & water budget (gallons)
  resilienceScore: number;     // 0-100
  totalStorageGal: number;
  catchmentPotentialGal: number;
  droughtBufferDays: number;
  inletGalMin: number;
  outletGalMin: number;
  netGainGalMin: number;
  annualRainfallGal: number;
  currentRetentionGal: number;
  targetRetentionGal: number;
  irrigationDemandGal: number;
  surplusGal: number;

  // Water metrics tab
  annualEtMm: number;          // evapotranspiration mm/yr (Blaney-Criddle approx)
  groundwaterRechargeMm: number;
  floodRiskLevel: string;
  retentionScore: number;

  // Sprint F: Hydrology Intelligence
  petMm: number;               // potential ET mm/yr (Blaney-Criddle, uncapped)
  aridityIndex: number;        // P/PET ratio (UNEP aridity metric)
  aridityClass: 'Hyperarid' | 'Arid' | 'Semi-arid' | 'Dry sub-humid' | 'Humid';
  waterBalanceMm: number;      // annual surplus/deficit mm/yr (precip - PET)
  rwhPotentialGal: number;     // rainwater harvesting potential gal/yr from catchment
  rwhStorageGal: number;       // recommended 2-week buffer storage gal
  irrigationDeficitMm: number; // max(0, PET - effectivePrecip) — irrigation gap mm/yr

  // Sprint I: Length of Growing Period
  lgpDays: number;             // moisture-limited growing days (FAO AEZ water balance)
  lgpClass: string;            // FAO AEZ class label
}

// ── Constants ──────────────────────────────────────────────────────────────────

/** Runoff coefficient C by NRCS hydrologic group (row crops / mixed land) */
const RUNOFF_C: Record<string, number> = { A: 0.25, B: 0.45, C: 0.65, D: 0.80 };

/** Green-Ampt infiltration rate (mm/hr) by hydrologic group */
const INFIL_RATE: Record<string, number> = { A: 22, B: 11, C: 5, D: 1.8 };

/** Manning's n for dense pasture/cropland cover */
const MANNINGS_N = 0.038;

/** Hydraulic radius for shallow sheet flow (m) */
const HYDRAULIC_R = 0.14;

/** Fraction of deep percolation reaching groundwater (empirical, humid climates) */
const GW_RECHARGE_FACTOR = 0.38;

// ── Aridity classification (UNEP P/PET thresholds) ────────────────────────────

function classifyAridity(ratio: number): HydroMetrics['aridityClass'] {
  if (ratio < 0.05) return 'Hyperarid';
  if (ratio < 0.20) return 'Arid';
  if (ratio < 0.50) return 'Semi-arid';
  if (ratio < 0.65) return 'Dry sub-humid';
  return 'Humid';
}

// ── Core calculation ───────────────────────────────────────────────────────────

export function computeHydrologyMetrics(inputs: HydroInputs): HydroMetrics {
  const {
    precipMm, catchmentHa, propertyAcres,
    slopeDeg, hydrologicGroup, drainageClass,
    floodZone, wetlandPct: wetlandPctRaw, annualTempC,
  } = inputs;

  // Sanitize numeric inputs that may arrive as strings from live layer data
  const wetlandPct = isFinite(wetlandPctRaw) ? wetlandPctRaw : 0;

  const group = (hydrologicGroup?.match(/^[ABCD]/)?.[0] ?? 'B') as 'A' | 'B' | 'C' | 'D';
  const C = RUNOFF_C[group] ?? 0.45;
  const infiltrationRate = INFIL_RATE[group] ?? 11;

  // Property area in m²
  const propertyM2 = propertyAcres * 4046.86;
  const propertyHa = propertyM2 / 10000;

  // Catchment area (use watershed layer if available, else estimate)
  const effCatchmentHa = catchmentHa ?? Math.max(propertyHa * 8, 10);

  // ── Runoff velocity (Manning's equation) ───────────────────────────────────
  const S = Math.tan(Math.max(slopeDeg, 0.3) * Math.PI / 180); // slope m/m
  const runoffVelocity = Math.round(
    ((1 / MANNINGS_N) * Math.pow(HYDRAULIC_R, 2 / 3) * Math.sqrt(S)) * 100,
  ) / 100;

  // ── Peak discharge (Rational method, 50-yr storm) ─────────────────────────
  // Design storm intensity: empirical i_50 ≈ precipMm / 10 mm/hr for humid climates
  const i50 = precipMm / 10;        // mm/hr
  const i50_ms = i50 / 3_600_000;   // m/s
  const peakDischarge = Math.round(C * i50_ms * effCatchmentHa * 10_000 * 10) / 10;

  // ── Sub-basin loading bars (relative, 0-100) ───────────────────────────────
  // Pattern shaped like a watershed — central basins carry more load
  const PATTERN = [0.44, 0.61, 0.74, 1.00, 0.93, 0.66, 0.51, 0.58];
  const peakLoad = 35 + C * 65;
  const subBasinBars = PATTERN.map((f) => Math.round(f * peakLoad));

  // ── Catchment volume & pond depth ─────────────────────────────────────────
  const catchmentVolume = Math.round(C * (precipMm / 1000) * propertyM2); // m³
  const pondAreaM2 = propertyM2 * 0.03;  // 3% of property
  const rawPondDepth = catchmentVolume / pondAreaM2;
  const pondDepth = Math.round(Math.min(Math.max(rawPondDepth, 0.8), 5.5) * 10) / 10;

  // ── Seepage risk ───────────────────────────────────────────────────────────
  const wellDrained = drainageClass?.toLowerCase().includes('well');
  const poorlyDrained = drainageClass?.toLowerCase().includes('poorly');
  let seepageRisk: HydroMetrics['seepageRisk'];
  let seepageRiskColor: string;
  let seepageDesc: string;

  if (wellDrained && 'AB'.includes(group)) {
    seepageRisk = 'LOWEST';
    seepageRiskColor = status.moderate;
    seepageDesc = `Subsurface ${group === 'A' ? 'sandy' : 'loamy'} layers provide high natural permeability. Pond sealing likely achievable with minimal clay amendment.`;
  } else if ('AB'.includes(group) || (wellDrained && group === 'C')) {
    seepageRisk = 'LOW';
    seepageRiskColor = status.good;
    seepageDesc = `Moderate permeability detected. Compacted base layer or 15cm clay liner recommended for permanent water storage.`;
  } else if (poorlyDrained || group === 'C') {
    seepageRisk = 'MODERATE';
    seepageRiskColor = status.moderate;
    seepageDesc = `Seasonal saturation likely. Perforated underdrain or overflow control structure recommended for pond longevity.`;
  } else {
    seepageRisk = 'HIGH';
    seepageRiskColor = status.poor;
    seepageDesc = `Very low permeability soils. Excellent natural pond sealing. Monitor for frost heave and lateral seep near embankments.`;
  }

  // ── Annual water budget ────────────────────────────────────────────────────
  const annualRainfallGal = (precipMm / 1000) * propertyM2 * 264.172;
  const currentRetentionPct = C > 0.6 ? 0.08 : 0.15;
  const targetRetentionPct = C > 0.6 ? 0.42 : 0.60;
  const currentRetentionGal = annualRainfallGal * currentRetentionPct;
  const targetRetentionGal = annualRainfallGal * targetRetentionPct;
  const irrigationDemandGal = annualRainfallGal * 0.22;
  const surplusGal = targetRetentionGal - irrigationDemandGal;

  // ── Flow rates (gal/min) ───────────────────────────────────────────────────
  const dailyInflowGal = annualRainfallGal / 365;
  const inletGalMin = Math.round(dailyInflowGal / 1440 * 10) / 10;
  const outletGalMin = Math.round(inletGalMin * (1 - C) * 10) / 10;
  const netGainGalMin = Math.round((inletGalMin - outletGalMin) * 10) / 10;

  // ── Resilience score (0–100) ───────────────────────────────────────────────
  let score = 0;
  // Flood zone component (0-30)
  if (/Zone X|not regulated|minimal/i.test(floodZone)) score += 30;
  else if (/Zone A\b|Zone AE/i.test(floodZone)) score += 12;
  else if (/Zone V/i.test(floodZone)) score += 5;
  else score += 20;
  // Wetland buffer (0-20)
  if (wetlandPct > 10) score += 20;
  else if (wetlandPct > 5) score += 16;
  else if (wetlandPct > 1) score += 11;
  else score += 5;
  // Precipitation (0-20)
  if (precipMm >= 650 && precipMm <= 1400) score += 20;
  else if (precipMm >= 450) score += 13;
  else score += 6;
  // Soil drainage (0-15)
  if (wellDrained) score += 15;
  else if (!poorlyDrained) score += 10;
  else score += 4;
  // Base (stream presence) (0-15)
  score += 10 + Math.min(wetlandPct / 2, 5);

  const resilienceScore = Math.round(Math.min(Math.max(score, 30), 99));

  // ── Storage & drought buffer ───────────────────────────────────────────────
  const totalStorageGal = currentRetentionGal;
  const catchmentPotentialGal = annualRainfallGal * C;
  // Drought buffer = how many days storage lasts at peak ET demand
  const peakDailyEtGal = (propertyM2 * 0.005) * 264.172; // ~5mm/day peak ET
  const droughtBufferDays = Math.round(totalStorageGal / peakDailyEtGal);

  // ── Evapotranspiration (Blaney-Criddle simplified) ─────────────────────────
  // Raw PET is unconstrained by precipitation (true atmospheric demand)
  const rawPetMm = (0.46 * Math.max(annualTempC, 0) + 8.13) * 365;
  const petMm = Math.round(rawPetMm);
  // Actual ET capped at 75% of precip (water-limited environments)
  const annualEtMm = Math.round(Math.min(rawPetMm, precipMm * 0.75));
  const deepPercolationMm = Math.max(precipMm - annualEtMm - precipMm * C, 0);
  const groundwaterRechargeMm = Math.round(deepPercolationMm * GW_RECHARGE_FACTOR);

  // ── Sprint F: Aridity, water balance, RWH, irrigation gap ─────────────────
  const aridityIndex = petMm > 0
    ? Math.round((precipMm / petMm) * 1000) / 1000
    : 9.999; // hyper-humid fallback when PET is zero
  const aridityClass = classifyAridity(aridityIndex);
  const waterBalanceMm = Math.round(precipMm - petMm);

  // Rainwater harvesting potential from catchment area (effCatchmentHa computed above)
  const rwhPotentialGal = Math.round(
    effCatchmentHa * 10_000 * (precipMm / 1000) * C * 264.172,
  );
  const rwhStorageGal = Math.round((rwhPotentialGal / 365) * 14); // 2-week buffer

  // Irrigation gap: how much PET exceeds what stays in soil after runoff
  const effectivePrecipMm = precipMm * (1 - C);
  const irrigationDeficitMm = Math.max(0, Math.round(petMm - effectivePrecipMm));

  // ── Sprint I: Length of Growing Period (FAO AEZ water balance) ────────────
  const { lgpDays, lgpClass } = computeLGPDays(
    inputs.monthlyNormals ?? null,
    inputs.awcCmCm ?? 0,
    inputs.rootingDepthCm ?? 0,
    annualTempC,
    precipMm,
  );

  // ── Alert text ─────────────────────────────────────────────────────────────
  let alertText: string;
  const floodIsHigh = /Zone A\b|Zone AE|Zone V/i.test(floodZone);
  if (floodIsHigh) {
    alertText = `Regulated flood hazard zone overlaps with site boundary (${floodZone}). Avoid placing primary structures in low-lying areas. Obtain FEMA LOMA review prior to grading.`;
  } else if (slopeDeg > 8) {
    alertText = `High slope gradient (${slopeDeg.toFixed(1)}°) increases erosion risk during peak storm events. Establish contour swales before ground disturbance.`;
  } else if (group === 'D') {
    alertText = `Very low infiltration soils (Group D). Surface ponding likely above ${infiltrationRate} mm/hr rainfall. Overflow control structures required for all water storage features.`;
  } else if (wetlandPct > 15) {
    alertText = `Significant wetland coverage (${wetlandPct.toFixed(0)}%) detected. Restrict heavy equipment to approved corridors. Buffer setback of 30m recommended around wetland edges.`;
  } else {
    const threshMm = Math.round(precipMm / 30);
    alertText = `Sediment accumulation risk in primary drainage swales. Monitor outlet flows after events exceeding ${threshMm} mm/hr. Schedule annual swale inspection.`;
  }

  // ── AI siting text ─────────────────────────────────────────────────────────
  const slopeClass = slopeDeg < 2 ? 'flat' : slopeDeg < 5 ? 'gentle' : slopeDeg < 10 ? 'moderate' : 'steep';
  const soilClass = group === 'A' ? 'highly permeable' : group === 'B' ? 'moderately permeable' : group === 'C' ? 'low-permeability' : 'impermeable clay';
  const aiSitingText = `Optimal pond siting on ${slopeClass} ${slopeClass === 'flat' ? 'ground for maximum catchment area' : 'grade above keyline point'} using ${soilClass} ${group} soils. Recommended ${((pondDepth * 0.7)).toFixed(1)}–${pondDepth.toFixed(1)}m embankment depth at ${(C * 100).toFixed(0)}% runoff coefficient.`;

  const floodRiskLevel = floodIsHigh ? 'High' : /Zone X/i.test(floodZone) ? 'Minimal' : 'Low';
  const retentionScore = Math.round(resilienceScore * 0.92);

  return {
    runoffVelocity, infiltrationRate, peakDischarge, subBasinBars, alertText,
    catchmentVolume, pondDepth, seepageRisk, seepageRiskColor, seepageDesc, aiSitingText,
    resilienceScore, totalStorageGal, catchmentPotentialGal, droughtBufferDays,
    inletGalMin, outletGalMin, netGainGalMin,
    annualRainfallGal, currentRetentionGal, targetRetentionGal, irrigationDemandGal, surplusGal,
    annualEtMm, groundwaterRechargeMm, floodRiskLevel, retentionScore,
    petMm, aridityIndex, aridityClass, waterBalanceMm,
    rwhPotentialGal, rwhStorageGal, irrigationDeficitMm,
    lgpDays, lgpClass,
  };
}

// ── Sprint I: Length of Growing Period (FAO AEZ) ──────────────────────────────

/** Days in each month (non-leap year) */
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * Compute Length of Growing Period using FAO AEZ monthly water balance.
 *
 * A month contributes to LGP if precipitation ≥ 0.5 × PET (i.e. enough moisture
 * to sustain growth). Soil water storage carry-over is modelled when AWC data is
 * available: surplus from wet months carries into subsequent months up to the
 * soil's available water capacity (AWC × rootingDepth).
 *
 * When monthly normals are unavailable, falls back to an estimate based on
 * the annual aridity index (P/PET).
 */
function computeLGPDays(
  monthlyNormals: { month: number; mean_max_c: number | null; mean_min_c: number | null; precip_mm: number }[] | null,
  awcCmCm: number,
  rootingDepthCm: number,
  annualTempC: number,
  annualPrecipMm: number,
): { lgpDays: number; lgpClass: string } {

  // Fallback when monthly normals are not available — estimate from annual aridity
  if (!monthlyNormals || monthlyNormals.length !== 12) {
    const annualPet = (0.46 * Math.max(annualTempC, 0) + 8.13) * 365;
    const ratio = annualPet > 0 ? annualPrecipMm / annualPet : 1;
    // Rough linear estimate: LGP ≈ ratio × 365, capped at 365
    const est = Math.round(Math.min(ratio * 365, 365));
    return { lgpDays: Math.max(est, 0), lgpClass: classifyLGP(Math.max(est, 0)) };
  }

  // Soil water storage capacity (mm). Default 50mm when data unavailable.
  const maxStorageMm = (awcCmCm > 0 && rootingDepthCm > 0)
    ? awcCmCm * rootingDepthCm * 10   // cm/cm × cm × 10 = mm
    : 50;                              // conservative default

  let storageMm = maxStorageMm * 0.5;  // start half-full (mid-year assumption)
  let lgpDays = 0;

  for (let m = 0; m < 12; m++) {
    const norm = monthlyNormals[m]!;
    const days = DAYS_IN_MONTH[m]!;

    // Monthly mean temp °C
    const meanC = (norm.mean_max_c != null && norm.mean_min_c != null)
      ? (norm.mean_max_c + norm.mean_min_c) / 2
      : annualTempC; // fallback to annual mean

    // Monthly PET (Blaney-Criddle): p × (0.46T + 8.13), p = fraction of annual daylight hours
    // Simplified: p ≈ days / 365 (latitude-independent approximation)
    const p = days / 365;
    const monthPetMm = p * (0.46 * Math.max(meanC, 0) + 8.13) * 365;

    const precipMm = norm.precip_mm ?? 0;

    // Water balance for this month
    const waterIn = precipMm + storageMm;
    const demand = monthPetMm * 0.5; // FAO AEZ threshold: P ≥ 0.5 × PET

    if (waterIn >= demand) {
      lgpDays += days;
      // Carry surplus into storage (capped at max)
      storageMm = Math.min(waterIn - monthPetMm, maxStorageMm);
      if (storageMm < 0) storageMm = 0;
    } else {
      // Partial month: fraction of days where remaining water suffices
      const fraction = demand > 0 ? waterIn / demand : 0;
      lgpDays += Math.round(days * Math.min(fraction, 1));
      storageMm = 0;
    }
  }

  lgpDays = Math.min(lgpDays, 365);
  return { lgpDays, lgpClass: classifyLGP(lgpDays) };
}

/** FAO AEZ Length of Growing Period classification */
function classifyLGP(days: number): string {
  if (days >= 270) return 'Year-round humid';
  if (days >= 180) return 'Long growing season';
  if (days >= 120) return 'Intermediate';
  if (days >= 60) return 'Short growing season';
  return 'Very short / arid';
}

// ── Sprint J: Wind Energy Potential ────────────────────────────────────────────

/** 16-point compass labels for direction reporting */
const COMPASS_16 = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
];

export interface WindEnergyResult {
  /** Frequency-weighted mean wind speed m/s */
  meanWindSpeedMs: number;
  /** Wind power density at hub height W/m² (Betz-limited) */
  powerDensityWm2: number;
  /** NREL wind power class label */
  windPowerClass: 'Poor' | 'Marginal' | 'Moderate' | 'Good' | 'Excellent';
  /** Compass direction with highest power contribution */
  optimalDirection: string;
  /** Estimated capacity factor (fraction of rated power achievable) */
  capacityFactor: number;
}

/**
 * Estimate wind energy potential from wind rose data.
 *
 * Uses frequency-weighted cubic mean (Betz law: P ∝ v³) for power density.
 * Air density: 1.225 kg/m³ at sea level (standard atmosphere).
 * Returns null if wind rose data is unavailable.
 */
export function computeWindEnergy(
  windRose: { frequencies_16: number[]; speeds_avg_ms: number[]; calm_pct: number } | null,
): WindEnergyResult | null {
  if (!windRose || !windRose.frequencies_16 || !windRose.speeds_avg_ms) return null;
  if (windRose.frequencies_16.length !== 16 || windRose.speeds_avg_ms.length !== 16) return null;

  const AIR_DENSITY = 1.225; // kg/m³

  // Frequency-weighted mean speed
  let weightedSpeed = 0;
  let totalFreq = 0;
  // Frequency-weighted cubic mean for power density
  let weightedCubic = 0;
  // Track max power direction
  let maxPower = 0;
  let maxPowerIdx = 0;

  for (let i = 0; i < 16; i++) {
    const freq = windRose.frequencies_16[i] ?? 0;
    const speed = windRose.speeds_avg_ms[i] ?? 0;
    weightedSpeed += freq * speed;
    weightedCubic += freq * speed * speed * speed;
    totalFreq += freq;

    const dirPower = freq * speed * speed * speed;
    if (dirPower > maxPower) {
      maxPower = dirPower;
      maxPowerIdx = i;
    }
  }

  // Account for calm percentage
  const calmFraction = (windRose.calm_pct ?? 0) / 100;
  const effectiveFreq = Math.max(totalFreq * (1 - calmFraction), 0.01);

  const meanWindSpeedMs = Math.round((weightedSpeed / Math.max(totalFreq, 0.01)) * 100) / 100;
  // Power density: 0.5 × ρ × v³ (using frequency-weighted cubic mean)
  const powerDensityWm2 = Math.round(0.5 * AIR_DENSITY * (weightedCubic / effectiveFreq));

  // NREL wind power class thresholds (at 50m hub height)
  const windPowerClass: WindEnergyResult['windPowerClass'] =
    powerDensityWm2 >= 400 ? 'Excellent'
    : powerDensityWm2 >= 200 ? 'Good'
    : powerDensityWm2 >= 100 ? 'Moderate'
    : powerDensityWm2 >= 50 ? 'Marginal'
    : 'Poor';

  // Simple capacity factor estimate based on mean wind speed
  // Typical turbine cut-in ~3 m/s, rated ~12 m/s
  const capacityFactor = Math.round(
    Math.min(Math.max((meanWindSpeedMs - 3) / 9, 0), 0.55) * 100,
  ) / 100;

  return {
    meanWindSpeedMs,
    powerDensityWm2,
    windPowerClass,
    optimalDirection: COMPASS_16[maxPowerIdx] ?? 'N',
    capacityFactor,
  };
}

// ── Formatting helpers ─────────────────────────────────────────────────────────

export function fmtGal(gal: number): string {
  if (gal >= 1_000_000) return `${(gal / 1_000_000).toFixed(1)}M`;
  if (gal >= 1_000) return `${Math.round(gal / 1000)}k`;
  return `${Math.round(gal)}`;
}

/** Safely extract a hydrologic group letter from raw soil data string */
export function parseHydrologicGroup(raw: string | undefined): string {
  if (!raw) return 'B';
  const match = raw.match(/\b([ABCD])\b/);
  return match?.[1] ?? 'B';
}

// ── Default inputs (used when siteData is still loading) ──────────────────────

export const HYDRO_DEFAULTS: HydroInputs = {
  precipMm: 750,
  catchmentHa: null,
  propertyAcres: 10,
  slopeDeg: 3,
  hydrologicGroup: 'B',
  drainageClass: 'well drained',
  floodZone: 'Zone X',
  wetlandPct: 3,
  annualTempC: 9,
};
