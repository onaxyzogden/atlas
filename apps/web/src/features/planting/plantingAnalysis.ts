/**
 * plantingAnalysis — pure-function analysis module for Planting Tool dashboard.
 *
 * Filters species by site conditions, computes frost-safe planting windows,
 * validates crop placements, estimates yields, and surfaces companion notes.
 */

import {
  PLANT_SPECIES,
  SPECIES_BY_ID,
  parseHardinessZone,
  type PlantSpeciesInfo,
} from './plantSpeciesData.js';
import type { CropArea } from '../../store/cropStore.js';

/* ================================================================== */
/*  Types                                                              */
/* ================================================================== */

export interface SuitabilityResult {
  suitable: PlantSpeciesInfo[];
  excluded: { species: PlantSpeciesInfo; reason: string }[];
}

export interface PlantingWindows {
  springStart: string;
  springEnd: string;
  fallStart: string;
  fallEnd: string;
  growingDays: number;
  lastFrostRaw: string;
  firstFrostRaw: string;
}

export interface PlacementValidation {
  cropAreaId: string;
  cropAreaName: string;
  valid: boolean;
  warnings: string[];
}

export interface YieldEstimate {
  cropAreaId: string;
  cropAreaName: string;
  species: string;
  areaM2: number;
  treesEstimated: number;
  yieldKg: number;
  yieldUnit: string;
}

export interface CompanionNote {
  speciesA: string;
  speciesB: string;
  relationship: 'companion' | 'incompatible';
  noteA: string;
  noteB: string;
}

export interface PlantingMetrics {
  totalTrees: number;
  totalLinearFeetPerimeter: number;
  estimatedCanopyCoverPct: number;
  totalAreaM2: number;
}

/* ================================================================== */
/*  Helpers                                                            */
/* ================================================================== */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Parse a frost date string like "Apr 28" or "late April" into month index (0-11). */
function parseFrostMonth(dateStr: string): number {
  const lower = dateStr.toLowerCase();
  for (let i = 0; i < MONTHS.length; i++) {
    if (lower.includes(MONTHS[i]!.toLowerCase())) return i;
  }
  // Fallback: check full month names
  const fullMonths = ['january','february','march','april','may','june','july','august','september','october','november','december'];
  for (let i = 0; i < fullMonths.length; i++) {
    if (lower.includes(fullMonths[i]!)) return i;
  }
  return 3; // default April
}

function parseFrostDay(dateStr: string): number {
  const match = dateStr.match(/(\d{1,2})/);
  if (match?.[1]) return parseInt(match[1], 10);
  const lower = dateStr.toLowerCase();
  if (lower.includes('early')) return 5;
  if (lower.includes('mid')) return 15;
  if (lower.includes('late')) return 25;
  return 15;
}

function formatMonthDay(month: number, day: number): string {
  const m = Math.max(0, Math.min(11, month));
  const d = Math.max(1, Math.min(28, day));
  return `${MONTHS[m]} ${d}`;
}

function normalizeDrainage(d: string): string {
  return d.toLowerCase().trim();
}

/* ================================================================== */
/*  Core Analysis Functions                                            */
/* ================================================================== */

/**
 * Filter species by site hardiness zone, drainage class, and slope.
 */
export function filterSuitableSpecies(
  climate: { hardiness_zone?: string } | null,
  soils: { drainage_class?: string } | null,
  elevation: { mean_slope_deg?: number } | null,
): SuitabilityResult {
  const zoneNum = parseHardinessZone(climate?.hardiness_zone ?? '6a');
  const drain = normalizeDrainage(soils?.drainage_class ?? 'well drained');
  const slope = elevation?.mean_slope_deg ?? 3;

  const suitable: PlantSpeciesInfo[] = [];
  const excluded: { species: PlantSpeciesInfo; reason: string }[] = [];

  for (const sp of PLANT_SPECIES) {
    // Hardiness zone check
    if (zoneNum < sp.hardinessRange[0] || zoneNum > sp.hardinessRange[1]) {
      excluded.push({ species: sp, reason: `Zone ${zoneNum} outside range ${sp.hardinessRange[0]}\u2013${sp.hardinessRange[1]}` });
      continue;
    }
    // Drainage check
    const drainMatch = sp.drainageSuitability.some((d) => drain.includes(normalizeDrainage(d)) || normalizeDrainage(d).includes(drain));
    if (!drainMatch) {
      excluded.push({ species: sp, reason: `Drainage "${drain}" not suitable (needs ${sp.drainageSuitability.join(', ')})` });
      continue;
    }
    // Slope check
    if (slope > sp.maxSlopeDeg) {
      excluded.push({ species: sp, reason: `Slope ${slope.toFixed(1)}\u00b0 exceeds max ${sp.maxSlopeDeg}\u00b0` });
      continue;
    }
    suitable.push(sp);
  }

  return { suitable, excluded };
}

/**
 * Derive frost-safe planting windows from climate adapter data.
 */
export function computePlantingWindows(
  climate: {
    last_frost_date?: string;
    first_frost_date?: string;
    growing_season_days?: number;
    growing_degree_days_base10c?: number;
  } | null,
): PlantingWindows {
  const lastFrost = climate?.last_frost_date ?? 'Apr 28';
  const firstFrost = climate?.first_frost_date ?? 'Oct 12';
  const growingDays = climate?.growing_season_days ?? 165;

  const lastM = parseFrostMonth(lastFrost);
  const lastD = parseFrostDay(lastFrost);
  const firstM = parseFrostMonth(firstFrost);
  const firstD = parseFrostDay(firstFrost);

  // Spring window: 2 weeks after last frost to 6 weeks after
  const springStartD = lastD + 14;
  const springStartM = springStartD > 28 ? lastM + 1 : lastM;
  const springEndD = lastD + 42;
  const springEndM = springEndD > 28 ? lastM + Math.floor(springEndD / 28) : lastM;

  // Fall window: 8 weeks before first frost to 4 weeks before
  const fallEndD = firstD - 28;
  const fallEndM = fallEndD < 1 ? firstM - 1 : firstM;
  const fallStartD = firstD - 56;
  const fallStartM = fallStartD < 1 ? firstM - 2 : firstM;

  return {
    springStart: formatMonthDay(springStartM, springStartD % 28 || 1),
    springEnd: formatMonthDay(springEndM, springEndD % 28 || 15),
    fallStart: formatMonthDay(Math.max(0, fallStartM), Math.max(1, ((fallStartD % 28) + 28) % 28 || 1)),
    fallEnd: formatMonthDay(Math.max(0, fallEndM), Math.max(1, ((fallEndD % 28) + 28) % 28 || 1)),
    growingDays,
    lastFrostRaw: lastFrost,
    firstFrostRaw: firstFrost,
  };
}

/**
 * Validate a crop area placement against site conditions.
 */
export function validatePlacement(
  cropArea: CropArea,
  climate: { hardiness_zone?: string; last_frost_date?: string; first_frost_date?: string } | null,
  soils: { drainage_class?: string } | null,
  elevation: { mean_slope_deg?: number; predominant_aspect?: string } | null,
): PlacementValidation {
  const warnings: string[] = [];
  const slope = elevation?.mean_slope_deg ?? 0;
  const aspect = (elevation?.predominant_aspect ?? '').toUpperCase();
  const drain = normalizeDrainage(soils?.drainage_class ?? 'well drained');

  // Frost pocket detection: low slope + north-facing = potential cold air pooling
  if (slope < 3 && ['N', 'NE', 'NW'].includes(aspect)) {
    warnings.push('Potential frost pocket: low slope with north-facing aspect \u2014 cold air may pool here');
  }

  // Drainage check per species
  for (const speciesId of cropArea.species) {
    const sp = SPECIES_BY_ID[speciesId];
    if (!sp) continue;
    const drainOk = sp.drainageSuitability.some((d) =>
      drain.includes(normalizeDrainage(d)) || normalizeDrainage(d).includes(drain),
    );
    if (!drainOk) {
      warnings.push(`${sp.commonName} prefers ${sp.drainageSuitability.join('/')} drainage, site is "${drain}"`);
    }
    if (slope > sp.maxSlopeDeg) {
      warnings.push(`${sp.commonName} max slope is ${sp.maxSlopeDeg}\u00b0, site has ${slope.toFixed(1)}\u00b0`);
    }
  }

  // High-frost-sensitivity species in late frost area
  if (climate?.last_frost_date) {
    const m = parseFrostMonth(climate.last_frost_date);
    if (m >= 4) { // May or later last frost
      for (const speciesId of cropArea.species) {
        const sp = SPECIES_BY_ID[speciesId];
        if (sp?.frostSensitivity === 'high') {
          warnings.push(`${sp.commonName} is frost-sensitive and last frost is late (${climate.last_frost_date})`);
        }
      }
    }
  }

  return {
    cropAreaId: cropArea.id,
    cropAreaName: cropArea.name,
    valid: warnings.length === 0,
    warnings,
  };
}

/**
 * Compute yield estimates for crop areas. Clearly labeled as estimates.
 */
export function computeYieldEstimates(
  cropAreas: CropArea[],
): YieldEstimate[] {
  const estimates: YieldEstimate[] = [];

  for (const area of cropAreas) {
    for (const speciesId of area.species) {
      const sp = SPECIES_BY_ID[speciesId];
      if (!sp?.yieldEstimate) continue;

      const spacingArea = sp.spacingM.inRow * sp.spacingM.betweenRow;
      const treesEstimated = spacingArea > 0 ? Math.floor(area.areaM2 / spacingArea) : 0;
      const yieldKg = treesEstimated * sp.yieldEstimate.perTreeKg;

      estimates.push({
        cropAreaId: area.id,
        cropAreaName: area.name,
        species: sp.commonName,
        areaM2: area.areaM2,
        treesEstimated,
        yieldKg: Math.round(yieldKg),
        yieldUnit: sp.yieldEstimate.unit,
      });
    }
  }

  return estimates;
}

/**
 * Surface companion planting notes for a set of species.
 */
export function getCompanionNotes(speciesIds: string[]): CompanionNote[] {
  const notes: CompanionNote[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < speciesIds.length; i++) {
    const idA = speciesIds[i]!;
    for (let j = i + 1; j < speciesIds.length; j++) {
      const idB = speciesIds[j]!;
      const a = SPECIES_BY_ID[idA];
      const b = SPECIES_BY_ID[idB];
      if (!a || !b) continue;

      const key = [idA, idB].sort().join(':');
      if (seen.has(key)) continue;
      seen.add(key);

      if (a.companions.includes(idB) || b.companions.includes(idA)) {
        notes.push({
          speciesA: a.commonName,
          speciesB: b.commonName,
          relationship: 'companion',
          noteA: a.commonName,
          noteB: b.commonName,
        });
      }
      if (a.incompatible.includes(idB) || b.incompatible.includes(idA)) {
        notes.push({
          speciesA: a.commonName,
          speciesB: b.commonName,
          relationship: 'incompatible',
          noteA: a.commonName,
          noteB: b.commonName,
        });
      }
    }
  }

  return notes;
}

/**
 * Compute aggregate planting metrics from crop areas + species data.
 */
export function computePlantingMetrics(
  cropAreas: CropArea[],
  totalPropertyAreaM2: number,
): PlantingMetrics {
  let totalTrees = 0;
  let totalPerimeterM = 0;
  let totalCanopyM2 = 0;
  let totalAreaM2 = 0;

  for (const area of cropAreas) {
    totalAreaM2 += area.areaM2;

    // Rough perimeter estimate: assume square for simplicity
    totalPerimeterM += Math.sqrt(area.areaM2) * 4;

    for (const speciesId of area.species) {
      const sp = SPECIES_BY_ID[speciesId];
      if (!sp) continue;
      const spacingArea = sp.spacingM.inRow * sp.spacingM.betweenRow;
      if (spacingArea <= 0) continue;
      const trees = Math.floor(area.areaM2 / spacingArea);
      totalTrees += trees;
      totalCanopyM2 += trees * Math.PI * (sp.canopySpreadM / 2) ** 2;
    }
  }

  const totalLinearFeetPerimeter = Math.round(totalPerimeterM * 3.28084);
  const estimatedCanopyCoverPct = totalPropertyAreaM2 > 0
    ? Math.min(Math.round((totalCanopyM2 / totalPropertyAreaM2) * 100), 100)
    : 0;

  return { totalTrees, totalLinearFeetPerimeter, estimatedCanopyCoverPct, totalAreaM2 };
}
