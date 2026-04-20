/**
 * Energy Intelligence — Sprint BD Phase 1
 *
 * Pure frontend computation for Cat 9 Renewable Energy remaining gaps:
 *   - Ground-source geothermal (residential heat-pump feasibility)
 *   - Energy storage sizing (battery for solar PV system)
 *
 * Both use already-fetched climate + soils + solar layers; no new API calls.
 *
 * References:
 *   - ASHRAE Handbook (ground temp approximation: deep-soil temp ≈ mean annual air temp)
 *   - IGSHPA ground-source heat pump design manual (soil thermal conductivity)
 *   - NREL PVWatts + standard sizing: ~1 day autonomy for grid-tied, 3 days off-grid
 */

export type GeothermalRating = 'Excellent' | 'Good' | 'Fair' | 'Marginal';
export type StorageRating = 'Excellent' | 'Good' | 'Adequate' | 'Limited';

export interface GeothermalResult {
  rating: GeothermalRating;
  groundTempC: number;           // mean deep-soil temp (≈ mean annual air temp)
  soilConductivityWmK: number;   // estimated W/(m·K) from texture class
  systemType: 'Vertical loop (closed)' | 'Horizontal loop (closed)' | 'Pond loop' | 'Not recommended';
  heatPumpCopEst: number;        // estimated coefficient of performance
  recommendation: string;
  limitingFactors: string[];
}

export interface EnergyStorageResult {
  rating: StorageRating;
  dailySolarKwhPerKwp: number;   // kWh/day per kWp installed
  recommendedBatteryKwh: number; // per typical 5 kWp home PV system
  autonomyDays: number;          // 1 for grid-tied, 3 for off-grid
  recommendation: string;
}

/* ------------------------------------------------------------------ */
/*  Geothermal — ground-source heat pump feasibility                   */
/* ------------------------------------------------------------------ */

/**
 * Soil thermal conductivity estimate from USDA texture class.
 * Values (W/(m·K)) per IGSHPA handbook typical moist-soil ranges:
 *   Clay (moist):          1.1–1.6
 *   Clay loam:             1.0–1.4
 *   Loam:                  0.9–1.3
 *   Silt loam:             1.0–1.4
 *   Sandy loam:            1.2–1.7
 *   Sand (moist):          1.6–2.4
 *   Organic (peat/muck):   0.3–0.5
 *   Rock (bedrock):        2.0–3.5
 */
function soilConductivityFromTexture(texture: string | null, bedrockDepthM: number | null): number {
  const t = (texture ?? '').toLowerCase();
  if (bedrockDepthM != null && bedrockDepthM < 1.5) return 2.8; // shallow bedrock — drill into rock
  if (t.includes('sand') && !t.includes('loam')) return 2.0;
  if (t.includes('sandy')) return 1.5;
  if (t.includes('clay') && !t.includes('loam')) return 1.35;
  if (t.includes('clay loam')) return 1.2;
  if (t.includes('silt')) return 1.2;
  if (t.includes('loam')) return 1.1;
  if (t.includes('peat') || t.includes('muck') || t.includes('organic')) return 0.4;
  return 1.2; // default
}

export function computeGeothermalPotential(inputs: {
  meanAnnualTempC: number | null;
  soilTextureClass: string | null;
  depthToBedrockM: number | null;
  waterTableDepthM: number | null;
  drainageClass: string | null;
}): GeothermalResult {
  const groundTempC = inputs.meanAnnualTempC ?? 10;
  const conductivity = soilConductivityFromTexture(inputs.soilTextureClass, inputs.depthToBedrockM);
  const limiting: string[] = [];

  // System type selection (IGSHPA decision tree simplified)
  let systemType: GeothermalResult['systemType'] = 'Horizontal loop (closed)';
  if (inputs.depthToBedrockM != null && inputs.depthToBedrockM < 1.5) {
    systemType = 'Vertical loop (closed)';
    limiting.push('Shallow bedrock forces vertical drilling (higher install cost).');
  } else if (conductivity >= 1.5) {
    systemType = 'Horizontal loop (closed)';
  } else if ((inputs.drainageClass ?? '').toLowerCase().includes('poor')) {
    systemType = 'Pond loop';
    limiting.push('Poor drainage — horizontal loop trenching may be impractical; consider pond loop if water body nearby.');
  }
  if (conductivity < 0.6) {
    limiting.push('Very low soil thermal conductivity (peat/organic) — loop length must be extended significantly.');
  }

  // COP estimate — higher ground temp + higher K = better COP
  // Typical ground-source COP: 3.5–5.0. Adjust from baseline 4.0.
  let cop = 4.0;
  if (groundTempC < 5) { cop -= 0.8; limiting.push('Cold deep-soil temperature reduces heat-pump efficiency.'); }
  else if (groundTempC > 18) cop += 0.3;
  if (conductivity >= 1.6) cop += 0.3;
  else if (conductivity < 0.9) cop -= 0.4;
  cop = Math.max(2.8, Math.min(5.2, cop));

  // Rating composite
  let rating: GeothermalRating;
  if (cop >= 4.3 && conductivity >= 1.3) rating = 'Excellent';
  else if (cop >= 3.8 && conductivity >= 1.0) rating = 'Good';
  else if (cop >= 3.3) rating = 'Fair';
  else rating = 'Marginal';

  let recommendation: string;
  if (rating === 'Excellent' || rating === 'Good') {
    recommendation = `${systemType} viable; estimated heating COP ~${cop.toFixed(1)}. Sized for typical 200 m² home: expect 400–600 m loop length depending on heat load.`;
  } else if (rating === 'Fair') {
    recommendation = `${systemType} feasible but payback longer (COP ~${cop.toFixed(1)}). Site-specific heat load calc recommended before committing.`;
  } else {
    recommendation = 'Ground-source heat pump economics marginal on this site. Air-source heat pump or PV + resistance heating may be more cost-effective.';
  }

  return {
    rating,
    groundTempC: Math.round(groundTempC * 10) / 10,
    soilConductivityWmK: Math.round(conductivity * 100) / 100,
    systemType,
    heatPumpCopEst: Math.round(cop * 10) / 10,
    recommendation,
    limitingFactors: limiting,
  };
}

/* ------------------------------------------------------------------ */
/*  Energy Storage — battery sizing for solar PV                       */
/* ------------------------------------------------------------------ */

export function computeEnergyStorage(inputs: {
  solarRadiationKwhM2Day: number | null;
  typicalSystemKwp?: number;       // default 5 kWp residential
  offGrid?: boolean;
}): EnergyStorageResult {
  const psh = inputs.solarRadiationKwhM2Day ?? 0;
  const systemKwp = inputs.typicalSystemKwp ?? 5;
  const offGrid = inputs.offGrid ?? false;

  // kWh/day generated = PSH × system size × typical performance ratio (~0.78)
  const dailyKwh = psh * systemKwp * 0.78;
  const dailyKwhPerKwp = psh * 0.78;

  // Battery sizing: 1 day autonomy for grid-tied backup; 3 days for off-grid
  const autonomyDays = offGrid ? 3 : 1;
  // Household daily load estimate (typical 4-person rural home): 20 kWh/day
  // For grid-tied backup, size to cover critical loads only (~40% of daily): 8 kWh
  const dailyLoadKwh = offGrid ? 20 : 8;
  // Usable battery depth of discharge ~80% (LFP), round-trip efficiency ~90%
  const recommendedBatteryKwh = Math.round((dailyLoadKwh * autonomyDays) / (0.8 * 0.9));

  let rating: StorageRating;
  if (dailyKwhPerKwp >= 4.5) rating = 'Excellent';
  else if (dailyKwhPerKwp >= 3.5) rating = 'Good';
  else if (dailyKwhPerKwp >= 2.5) rating = 'Adequate';
  else rating = 'Limited';

  const recommendation =
    rating === 'Excellent' || rating === 'Good'
      ? `A ${systemKwp} kWp PV system generates ~${Math.round(dailyKwh)} kWh/day on average. Recommended battery: ${recommendedBatteryKwh} kWh (${offGrid ? '3-day off-grid autonomy' : '1-day grid-tied backup for critical loads'}).`
      : rating === 'Adequate'
      ? `Solar resource adequate but seasonal variability may require oversized battery. Consider ${Math.round(recommendedBatteryKwh * 1.3)} kWh buffer for winter months.`
      : 'Solar resource marginal for battery-based autonomy. Grid-tied system with minimal storage recommended; evaluate wind hybrid if local resource supports.';

  return {
    rating,
    dailySolarKwhPerKwp: Math.round(dailyKwhPerKwp * 10) / 10,
    recommendedBatteryKwh,
    autonomyDays,
    recommendation,
  };
}
