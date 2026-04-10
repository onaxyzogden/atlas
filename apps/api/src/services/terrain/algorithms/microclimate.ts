/**
 * Microclimate modelling — 5 site-scale climate analyses derived from
 * terrain analysis outputs, climate normals, and soil drainage data.
 *
 * Analyses:
 *   1. Sun trap detection — south-facing sheltered slopes with high solar exposure
 *   2. Dry zone / wet zone mapping — composite of slope, aspect, drainage, flow accumulation
 *   3. Wind shelter zones — leeward areas based on prevailing wind + TPI shelter
 *   4. Frost risk zones — frost pocket probability combined with climate frost dates
 *   5. Outdoor comfort map — seasonal composite scoring human comfort
 *
 * All functions operate on pre-loaded data from terrain_analysis and project_layers.
 * They do NOT re-fetch elevation rasters — they reuse TPI, frost pocket, slope, and
 * aspect grids that were already computed by the terrain analysis processor.
 */

import type { ElevationGrid } from '../ElevationGridReader.js';
import { computeSlopeGrid } from './hydro.js';

// ── Shared types ───────────────────────────────────────────────────────────

/** Aspect in degrees (0=N, 90=E, 180=S, 270=W), -1=flat */
function computeAspectGrid(grid: ElevationGrid): Float32Array {
  const { data, width, height, cellSizeX, cellSizeY, noDataValue } = grid;
  const aspect = new Float32Array(width * height).fill(-1);

  for (let row = 1; row < height - 1; row++) {
    for (let col = 1; col < width - 1; col++) {
      const idx = row * width + col;
      const z = data[idx]!;
      if (z === noDataValue || z < -1000) continue;

      const zL = data[idx - 1]!;
      const zR = data[idx + 1]!;
      const zU = data[idx - width]!;
      const zD = data[idx + width]!;

      if (zL === noDataValue || zR === noDataValue || zU === noDataValue || zD === noDataValue) continue;
      if (zL < -1000 || zR < -1000 || zU < -1000 || zD < -1000) continue;

      const dzdx = (zR - zL) / (2 * cellSizeX);
      const dzdy = (zD - zU) / (2 * cellSizeY);

      if (Math.abs(dzdx) < 1e-8 && Math.abs(dzdy) < 1e-8) {
        aspect[idx] = -1; // flat
        continue;
      }

      // atan2 gives angle from north, clockwise
      let a = Math.atan2(-dzdx, dzdy) * (180 / Math.PI);
      if (a < 0) a += 360;
      aspect[idx] = a;
    }
  }

  return aspect;
}

/** Climate context loaded from the climate project_layer summary. */
export interface ClimateContext {
  /** Mean annual temperature in Celsius */
  meanTempC: number;
  /** Prevailing wind direction in degrees (0=N, 90=E, 180=S, 270=W) */
  prevailingWindDir: number;
  /** Average wind speed in m/s */
  avgWindSpeedMs: number;
  /** Last spring frost date (day of year, 1-365) */
  lastSpringFrostDoy: number;
  /** First fall frost date (day of year, 1-365) */
  firstFallFrostDoy: number;
  /** Growing season length in days */
  growingSeasonDays: number;
}

/** Soil drainage context loaded from the soils project_layer summary. */
export interface SoilDrainageContext {
  /** Dominant drainage class: 'well', 'moderate', 'poor', 'very_poor' */
  drainageClass: 'well' | 'moderate' | 'poor' | 'very_poor';
  /** Drainage class score 0-1 (1=well drained) */
  drainageScore: number;
}

/** TPI context loaded from terrain_analysis table. */
export interface TPIContext {
  classGrid: Int8Array; // 0=ridge, 1=upper, 2=mid, 3=flat, 4=lower, 5=valley
  width: number;
  height: number;
}

/** Frost pocket context loaded from terrain_analysis table. */
export interface FrostPocketContext {
  probabilityGrid: Float32Array; // 0.0-1.0 per cell
  severity: 'high' | 'medium' | 'low' | 'none';
  width: number;
  height: number;
}

/** Flow accumulation from watershed_derived layer. */
export interface FlowAccContext {
  accumulationGrid: Float32Array;
  width: number;
  height: number;
}

// ── 1. Sun trap detection ──────────────────────────────────────────────────

export interface SunTrapResult {
  sunTrapAreaPct: number;
  sunTrapMask: Uint8Array; // 1 = sun trap cell
  scoreGrid: Float32Array; // 0-100 solar exposure score per cell
  hotspotCount: number;
}

/**
 * Sun traps: south-facing slopes (aspect 135-225 deg in northern hemisphere)
 * with TPI indicating shelter above (ridge or upper_slope in adjacent uphill
 * cells). Scored by aspect alignment + slope steepness + shelter presence.
 */
export function computeSunTraps(
  grid: ElevationGrid,
  tpiCtx: TPIContext,
): SunTrapResult {
  const { width, height, noDataValue, data } = grid;
  const size = width * height;

  const slopeGrid = computeSlopeGrid(grid);
  const aspectGrid = computeAspectGrid(grid);

  const sunTrapMask = new Uint8Array(size);
  const scoreGrid = new Float32Array(size);

  let sunTrapCells = 0;
  let totalValid = 0;

  for (let row = 1; row < height - 1; row++) {
    for (let col = 1; col < width - 1; col++) {
      const idx = row * width + col;
      const z = data[idx]!;
      if (z === noDataValue || z < -1000) continue;
      totalValid++;

      const aspect = aspectGrid[idx]!;
      const slope = slopeGrid[idx]!;

      if (aspect < 0) continue; // flat — no aspect

      // South-facing: aspect between 135 and 225 degrees
      const isSouthFacing = aspect >= 135 && aspect <= 225;
      if (!isSouthFacing) continue;

      // Aspect alignment score: 1.0 at 180 deg, 0.0 at 135/225
      const aspectDev = Math.abs(aspect - 180);
      const aspectScore = Math.max(0, 1 - aspectDev / 45);

      // Slope score: moderate slope (5-20 deg) is ideal for sun trapping
      let slopeScore: number;
      if (slope < 2) slopeScore = 0.2;
      else if (slope < 5) slopeScore = 0.5;
      else if (slope <= 20) slopeScore = 1.0;
      else if (slope <= 30) slopeScore = 0.6;
      else slopeScore = 0.2;

      // Shelter score: check TPI of uphill (northern) neighbours
      // Uphill for south-facing slopes = cells to the north (row-1)
      let shelterScore = 0;
      if (tpiCtx.classGrid.length === size) {
        const northIdx = (row - 1) * width + col;
        const northTpi = tpiCtx.classGrid[northIdx]!;
        // Ridge (0) or upper_slope (1) provide wind shelter from behind
        if (northTpi === 0 || northTpi === 1) shelterScore = 1.0;
        else if (northTpi === 2) shelterScore = 0.5; // mid_slope partial shelter
        else shelterScore = 0.1;
      }

      // Composite score: 40% aspect, 30% slope, 30% shelter
      const score = Math.round(aspectScore * 40 + slopeScore * 30 + shelterScore * 30);
      scoreGrid[idx] = score;

      // Threshold: score >= 50 qualifies as sun trap
      if (score >= 50) {
        sunTrapMask[idx] = 1;
        sunTrapCells++;
      }
    }
  }

  // Count distinct hotspot clusters (connected components with score >= 70)
  let hotspotCount = 0;
  const visited = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    if (scoreGrid[i]! >= 70 && !visited[i]) {
      hotspotCount++;
      const queue = [i];
      visited[i] = 1;
      while (queue.length > 0) {
        const ci = queue.pop()!;
        const cr = Math.floor(ci / width);
        const cc = ci % width;
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as [number, number][]) {
          const nr = cr + dr;
          const nc = cc + dc;
          if (nr < 0 || nr >= height || nc < 0 || nc >= width) continue;
          const ni = nr * width + nc;
          if (!visited[ni] && scoreGrid[ni]! >= 70) {
            visited[ni] = 1;
            queue.push(ni);
          }
        }
      }
    }
  }

  return {
    sunTrapAreaPct: totalValid > 0 ? +((sunTrapCells / totalValid) * 100).toFixed(1) : 0,
    sunTrapMask,
    scoreGrid,
    hotspotCount,
  };
}

// ── 2. Dry zone / wet zone mapping ─────────────────────────────────────────

export interface MoistureZoneResult {
  classification: {
    dry_pct: number;
    moderate_pct: number;
    moist_pct: number;
    wet_pct: number;
  };
  classGrid: Int8Array; // 0=dry, 1=moderate, 2=moist, 3=wet
  dominantClass: string;
}

/**
 * Moisture zonation combining:
 *   - Slope (steep = drier, flat = wetter)
 *   - Aspect (south/west-facing = drier in northern hemisphere)
 *   - Flow accumulation (high = wetter)
 *   - Soil drainage class (well-drained = drier)
 *
 * Each factor contributes to a 0-1 wetness index.
 */
export function computeMoistureZones(
  grid: ElevationGrid,
  flowAccCtx: FlowAccContext,
  soilCtx: SoilDrainageContext,
): MoistureZoneResult {
  const { width, height, noDataValue, data } = grid;
  const size = width * height;

  const slopeGrid = computeSlopeGrid(grid);
  const aspectGrid = computeAspectGrid(grid);

  const classGrid = new Int8Array(size).fill(-1);

  // Flow accumulation percentiles for normalisation
  const validAcc: number[] = [];
  for (let i = 0; i < size; i++) {
    if (data[i]! !== noDataValue && data[i]! > -1000 && flowAccCtx.accumulationGrid[i] !== undefined) {
      validAcc.push(flowAccCtx.accumulationGrid[i]!);
    }
  }
  validAcc.sort((a, b) => a - b);
  const accP95 = validAcc.length > 0 ? validAcc[Math.floor(validAcc.length * 0.95)]! : 1;

  const counts = [0, 0, 0, 0]; // dry, moderate, moist, wet
  let totalValid = 0;

  for (let row = 1; row < height - 1; row++) {
    for (let col = 1; col < width - 1; col++) {
      const idx = row * width + col;
      const z = data[idx]!;
      if (z === noDataValue || z < -1000) continue;
      totalValid++;

      const slope = slopeGrid[idx]!;
      const aspect = aspectGrid[idx]!;
      const acc = flowAccCtx.accumulationGrid[idx] ?? 0;

      // Slope factor: steeper = drier (0=wet, 1=dry)
      const slopeDryness = Math.min(1, slope / 30);

      // Aspect factor: south/west facing = drier (northern hemisphere)
      let aspectDryness = 0.5; // default for flat
      if (aspect >= 0) {
        // South (180) and west (270) are drier; north (0/360) and east (90) wetter
        // Map to 0 (wet, north-facing) to 1 (dry, south-facing)
        const southAlignment = Math.cos((aspect - 180) * Math.PI / 180);
        aspectDryness = (1 + southAlignment) / 2; // 0-1, 1=south
      }

      // Flow accumulation factor: high = wetter
      const accWetness = Math.min(1, acc / Math.max(1, accP95));

      // Soil drainage factor: well-drained = drier
      const soilDryness = soilCtx.drainageScore;

      // Composite wetness index: 0 = very dry, 1 = very wet
      // Weights: slope 25%, aspect 20%, flow accumulation 35%, soil drainage 20%
      const wetnessIndex =
        (1 - slopeDryness) * 0.25 +
        (1 - aspectDryness) * 0.20 +
        accWetness * 0.35 +
        (1 - soilDryness) * 0.20;

      let cls: number;
      if (wetnessIndex < 0.25) cls = 0;       // dry
      else if (wetnessIndex < 0.50) cls = 1;   // moderate
      else if (wetnessIndex < 0.75) cls = 2;   // moist
      else cls = 3;                             // wet

      classGrid[idx] = cls;
      counts[cls]!++;
    }
  }

  const total = Math.max(1, totalValid);
  const classification = {
    dry_pct: +((counts[0]! / total) * 100).toFixed(1),
    moderate_pct: +((counts[1]! / total) * 100).toFixed(1),
    moist_pct: +((counts[2]! / total) * 100).toFixed(1),
    wet_pct: +((counts[3]! / total) * 100).toFixed(1),
  };

  const labels = ['dry', 'moderate', 'moist', 'wet'];
  const maxIdx = counts.indexOf(Math.max(...counts));
  const dominantClass = labels[maxIdx] ?? 'moderate';

  return { classification, classGrid, dominantClass };
}

// ── 3. Wind shelter zones ──────────────────────────────────────────────────

export interface WindShelterResult {
  shelteredAreaPct: number;
  shelterMask: Uint8Array; // 1 = sheltered cell
  exposureGrid: Float32Array; // 0-100, 0=fully sheltered, 100=fully exposed
  dominantExposure: 'sheltered' | 'moderate' | 'exposed';
}

/**
 * Wind shelter: leeward areas behind ridges/upper slopes relative to
 * prevailing wind direction. Uses TPI classification to identify shelter
 * sources (ridges/upper slopes) and checks if each cell is downwind
 * from them.
 */
export function computeWindShelter(
  grid: ElevationGrid,
  tpiCtx: TPIContext,
  climate: ClimateContext,
): WindShelterResult {
  const { width, height, noDataValue, data } = grid;
  const size = width * height;

  const slopeGrid = computeSlopeGrid(grid);
  const shelterMask = new Uint8Array(size);
  const exposureGrid = new Float32Array(size).fill(100); // default fully exposed

  // Wind direction: prevailing wind comes FROM this direction
  // Leeward = opposite side of wind direction
  const windDirRad = climate.prevailingWindDir * Math.PI / 180;
  // Wind vector: direction wind blows FROM — we search upwind for shelter
  const windDx = Math.sin(windDirRad); // col component
  const windDy = -Math.cos(windDirRad); // row component (negative because row 0 = north)

  // Search distance in cells for shelter sources (max ~200m)
  const searchRadius = Math.min(20, Math.round(200 / Math.max(1, grid.resolution_m)));

  let shelteredCells = 0;
  let totalValid = 0;

  for (let row = 1; row < height - 1; row++) {
    for (let col = 1; col < width - 1; col++) {
      const idx = row * width + col;
      const z = data[idx]!;
      if (z === noDataValue || z < -1000) continue;
      totalValid++;

      // Walk upwind from this cell looking for shelter features
      let maxShelterScore = 0;
      let shelterFound = false;

      for (let step = 1; step <= searchRadius; step++) {
        const checkCol = Math.round(col + windDx * step);
        const checkRow = Math.round(row + windDy * step);

        if (checkCol < 0 || checkCol >= width || checkRow < 0 || checkRow >= height) break;

        const checkIdx = checkRow * width + checkCol;
        const checkZ = data[checkIdx]!;
        if (checkZ === noDataValue || checkZ < -1000) continue;

        // Elevation advantage: upwind cell is higher
        const elevDiff = checkZ - z;
        if (elevDiff <= 0) continue; // not providing shelter

        // TPI class of upwind cell
        const tpiClass = tpiCtx.classGrid[checkIdx]!;
        let tpiShelterBonus = 0;
        if (tpiClass === 0) tpiShelterBonus = 1.0;      // ridge — strong shelter
        else if (tpiClass === 1) tpiShelterBonus = 0.7;  // upper slope
        else if (tpiClass === 2) tpiShelterBonus = 0.3;  // mid slope

        // Shelter decays with distance
        const distanceDecay = 1 - (step - 1) / searchRadius;

        // Shelter score: elevation advantage + TPI + distance decay
        const elevScore = Math.min(1, elevDiff / 10); // 10m = full shelter
        const shelterScore = (elevScore * 0.5 + tpiShelterBonus * 0.3 + distanceDecay * 0.2);

        if (shelterScore > maxShelterScore) {
          maxShelterScore = shelterScore;
          shelterFound = true;
        }
      }

      // Also factor in local slope aspect relative to wind
      // Lee side of slope provides additional shelter
      const slopeVal = slopeGrid[idx]!;
      if (slopeVal > 3) {
        // Steeper slopes provide more directional shelter
        maxShelterScore = Math.min(1, maxShelterScore + slopeVal / 60);
      }

      // Exposure = inverse of shelter (0 = fully sheltered, 100 = exposed)
      const exposure = Math.round((1 - maxShelterScore) * 100);
      exposureGrid[idx] = exposure;

      if (exposure < 40) { // less than 40% exposure = sheltered
        shelterMask[idx] = 1;
        shelteredCells++;
      }
    }
  }

  const shelteredPct = totalValid > 0 ? (shelteredCells / totalValid) * 100 : 0;

  let dominantExposure: 'sheltered' | 'moderate' | 'exposed';
  if (shelteredPct > 50) dominantExposure = 'sheltered';
  else if (shelteredPct > 20) dominantExposure = 'moderate';
  else dominantExposure = 'exposed';

  return {
    shelteredAreaPct: +shelteredPct.toFixed(1),
    shelterMask,
    exposureGrid,
    dominantExposure,
  };
}

// ── 4. Frost risk zones ────────────────────────────────────────────────────

export interface FrostRiskResult {
  riskClassification: {
    high_risk_pct: number;
    moderate_risk_pct: number;
    low_risk_pct: number;
    minimal_risk_pct: number;
  };
  riskGrid: Int8Array; // 0=minimal, 1=low, 2=moderate, 3=high
  extendedFrostDays: number; // estimated extra frost days in pocket zones
  effectiveGrowingSeason: number; // adjusted growing season days
}

/**
 * Frost risk = terrain frost pocket probability combined with climate frost dates.
 * Cells with high frost pocket probability + shorter growing season = highest risk.
 * Low-lying sheltered cells face more frost risk than exposed ridges.
 */
export function computeFrostRisk(
  grid: ElevationGrid,
  frostCtx: FrostPocketContext,
  tpiCtx: TPIContext,
  climate: ClimateContext,
): FrostRiskResult {
  const { width, height, noDataValue, data } = grid;
  const size = width * height;

  const riskGrid = new Int8Array(size).fill(-1);
  const counts = [0, 0, 0, 0]; // minimal, low, moderate, high
  let totalValid = 0;

  // Growing season from climate
  const growingSeasonDays = climate.growingSeasonDays;
  // Extended frost days estimate: based on topographic frost pocket severity
  let maxExtendedDays = 0;

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const idx = row * width + col;
      const z = data[idx]!;
      if (z === noDataValue || z < -1000) continue;
      totalValid++;

      // Frost pocket probability (0-1)
      const frostProb = frostCtx.probabilityGrid[idx] ?? 0;

      // TPI-based risk modifier: valleys (5) and lower slopes (4) have more risk
      const tpiClass = tpiCtx.classGrid[idx] ?? 3;
      let tpiRiskFactor: number;
      if (tpiClass === 5) tpiRiskFactor = 1.0;       // valley — maximum risk
      else if (tpiClass === 4) tpiRiskFactor = 0.7;   // lower slope
      else if (tpiClass === 3) tpiRiskFactor = 0.4;   // flat
      else if (tpiClass === 2) tpiRiskFactor = 0.2;   // mid slope
      else tpiRiskFactor = 0.05;                       // upper/ridge — minimal

      // Climate frost window factor: shorter growing season = higher base risk
      const climateFactor = growingSeasonDays < 120 ? 1.0
        : growingSeasonDays < 150 ? 0.8
        : growingSeasonDays < 180 ? 0.6
        : growingSeasonDays < 210 ? 0.4
        : 0.2;

      // Composite risk: 45% frost pocket, 30% TPI position, 25% climate
      const riskScore = frostProb * 0.45 + tpiRiskFactor * 0.30 + climateFactor * 0.25;

      let cls: number;
      if (riskScore >= 0.7) cls = 3;       // high
      else if (riskScore >= 0.45) cls = 2; // moderate
      else if (riskScore >= 0.20) cls = 1; // low
      else cls = 0;                         // minimal

      riskGrid[idx] = cls;
      counts[cls]!++;

      // Track extended frost days (high-risk cells can extend frost 2-4 weeks)
      if (cls === 3 && frostProb > 0.5) {
        const extra = Math.round(frostProb * 28); // up to 28 extra frost days
        if (extra > maxExtendedDays) maxExtendedDays = extra;
      }
    }
  }

  const total = Math.max(1, totalValid);

  return {
    riskClassification: {
      high_risk_pct: +((counts[3]! / total) * 100).toFixed(1),
      moderate_risk_pct: +((counts[2]! / total) * 100).toFixed(1),
      low_risk_pct: +((counts[1]! / total) * 100).toFixed(1),
      minimal_risk_pct: +((counts[0]! / total) * 100).toFixed(1),
    },
    riskGrid,
    extendedFrostDays: maxExtendedDays,
    effectiveGrowingSeason: Math.max(0, growingSeasonDays - maxExtendedDays),
  };
}

// ── 5. Outdoor comfort map ─────────────────────────────────────────────────

export interface ComfortResult {
  seasonalScores: {
    spring: { meanScore: number; comfortablePct: number };
    summer: { meanScore: number; comfortablePct: number };
    fall: { meanScore: number; comfortablePct: number };
    winter: { meanScore: number; comfortablePct: number };
  };
  annualMeanScore: number;
  comfortGrid: Float32Array; // 0-100, annual mean comfort per cell
  bestSeason: string;
}

/**
 * Outdoor comfort: seasonal composite scoring human comfort by combining:
 *   - Temperature (from climate normals, adjusted by elevation lapse rate)
 *   - Wind exposure (from wind shelter analysis)
 *   - Solar gain (from sun trap scores)
 *   - Frost risk (penalises comfort in cold seasons)
 *
 * Score 0-100 where 100 = maximally comfortable.
 */
export function computeOutdoorComfort(
  grid: ElevationGrid,
  sunTrap: SunTrapResult,
  windShelter: WindShelterResult,
  frostRisk: FrostRiskResult,
  climate: ClimateContext,
): ComfortResult {
  const { width, height, noDataValue, data } = grid;
  const size = width * height;

  const comfortGrid = new Float32Array(size);

  // Elevation lapse rate: ~6.5 C per 1000m
  const LAPSE_RATE = 0.0065;

  // Find reference elevation (mean of valid cells)
  let sumElev = 0;
  let validCount = 0;
  for (let i = 0; i < size; i++) {
    const z = data[i]!;
    if (z !== noDataValue && z > -1000) {
      sumElev += z;
      validCount++;
    }
  }
  const refElev = validCount > 0 ? sumElev / validCount : 0;

  // Seasonal temperature adjustments from mean annual
  const baseTemp = climate.meanTempC;
  const seasonTemps = {
    spring: baseTemp - 2,
    summer: baseTemp + 8,
    fall: baseTemp - 1,
    winter: baseTemp - 12,
  };

  type Season = keyof typeof seasonTemps;
  const seasons: Season[] = ['spring', 'summer', 'fall', 'winter'];

  const seasonalSums: Record<Season, { scoreSum: number; comfortCount: number; validCount: number }> = {
    spring: { scoreSum: 0, comfortCount: 0, validCount: 0 },
    summer: { scoreSum: 0, comfortCount: 0, validCount: 0 },
    fall: { scoreSum: 0, comfortCount: 0, validCount: 0 },
    winter: { scoreSum: 0, comfortCount: 0, validCount: 0 },
  };

  let annualScoreSum = 0;
  let annualValid = 0;

  for (let i = 0; i < size; i++) {
    const z = data[i]!;
    if (z === noDataValue || z < -1000) continue;

    // Elevation-adjusted temperature delta from site mean
    const elevDelta = (z - refElev) * LAPSE_RATE;

    // Wind exposure factor: 0=sheltered (good), 100=exposed (bad)
    const windExposure = windShelter.exposureGrid[i] ?? 100;
    const windComfort = (100 - windExposure) / 100; // 0-1

    // Solar gain factor: 0-100 from sun trap score
    const solarGain = sunTrap.scoreGrid[i] ?? 0;
    const solarComfort = solarGain / 100; // 0-1

    // Frost risk: 0=minimal, 3=high
    const frostClass = frostRisk.riskGrid[i] ?? 0;
    const frostPenalty = frostClass >= 0 ? frostClass / 3 : 0; // 0-1

    let seasonScoreSum = 0;

    for (const season of seasons) {
      // Temperature comfort: optimal ~18-24C for humans, falls off outside
      const localTemp = seasonTemps[season] - elevDelta;
      let tempComfort: number;
      if (localTemp >= 18 && localTemp <= 24) {
        tempComfort = 1.0;
      } else if (localTemp >= 10 && localTemp < 18) {
        tempComfort = 0.5 + 0.5 * ((localTemp - 10) / 8);
      } else if (localTemp > 24 && localTemp <= 32) {
        tempComfort = 0.5 + 0.5 * ((32 - localTemp) / 8);
      } else if (localTemp >= 0 && localTemp < 10) {
        tempComfort = 0.2 * (localTemp / 10);
      } else if (localTemp > 32 && localTemp <= 40) {
        tempComfort = 0.2 * ((40 - localTemp) / 8);
      } else {
        tempComfort = 0;
      }

      // Seasonal frost adjustment
      const seasonFrostMod = (season === 'winter' || season === 'spring')
        ? 1 - frostPenalty * 0.4
        : 1 - frostPenalty * 0.1;

      // Composite: 35% temp, 25% wind shelter, 25% solar, 15% frost
      const score = Math.round(
        (tempComfort * 35 +
         windComfort * 25 +
         solarComfort * 25 +
         seasonFrostMod * 15) * seasonFrostMod,
      );

      const clamped = Math.max(0, Math.min(100, score));
      seasonalSums[season].scoreSum += clamped;
      seasonalSums[season].validCount++;
      if (clamped >= 50) seasonalSums[season].comfortCount++;
      seasonScoreSum += clamped;
    }

    const annualScore = Math.round(seasonScoreSum / 4);
    comfortGrid[i] = annualScore;
    annualScoreSum += annualScore;
    annualValid++;
  }

  const seasonalScores = {} as ComfortResult['seasonalScores'];
  let bestSeason = 'summer';
  let bestScore = -1;

  for (const season of seasons) {
    const s = seasonalSums[season];
    const mean = s.validCount > 0 ? +((s.scoreSum / s.validCount)).toFixed(1) : 0;
    const comfPct = s.validCount > 0 ? +((s.comfortCount / s.validCount) * 100).toFixed(1) : 0;
    seasonalScores[season] = { meanScore: +mean, comfortablePct: comfPct };

    if (+mean > bestScore) {
      bestScore = +mean;
      bestSeason = season;
    }
  }

  return {
    seasonalScores,
    annualMeanScore: annualValid > 0 ? +(annualScoreSum / annualValid).toFixed(1) : 0,
    comfortGrid,
    bestSeason,
  };
}
