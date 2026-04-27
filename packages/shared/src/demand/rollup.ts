/**
 * Site-wide demand rollup. Sums water + electricity contributions from
 * structures, utilities, crop areas, and livestock paddocks through their
 * per-type coefficient tables. Pure — no I/O, no React, no store deps.
 */
import {
  type StructureLike,
  getStructureKwhPerDay,
  getStructureWaterGalPerDay,
} from './structureDemand.js';
import { type UtilityLike, getUtilityKwhPerDay } from './utilityDemand.js';
import { type CropAreaLike, getCropAreaWaterGalYr } from './cropDemand.js';
import { type LivestockLike, getPaddockWaterGalPerDay } from './livestockDemand.js';

export interface SiteDemandInput {
  structures?: StructureLike[];
  utilities?: UtilityLike[];
  cropAreas?: CropAreaLike[];
  paddocks?: LivestockLike[];
  /** PET-driven crop-water multiplier; defaults to 1.0 when omitted. */
  climateMultiplier?: number;
}

export interface SiteDemand {
  /** Water — daily figure summed from structures (gal/day). */
  structureWaterGalPerDay: number;
  /** Water — annual figure summed from crop areas (gal/yr). */
  cropWaterGalYr: number;
  /** Water — annual figure from livestock paddocks (gal/yr). */
  livestockWaterGalYr: number;
  /** Total annual water demand in gal — structures × 365 + crop annual + livestock annual. */
  waterGalYr: number;

  /** Electricity — daily figure (kWh/day) from structures + utilities. */
  electricityKwhPerDay: number;
  /** Electricity — annual figure (kWh/yr). */
  electricityKwhYr: number;
}

export function sumSiteDemand(input: SiteDemandInput): SiteDemand {
  const structures = input.structures ?? [];
  const utilities = input.utilities ?? [];
  const cropAreas = input.cropAreas ?? [];
  const paddocks = input.paddocks ?? [];
  const climateMultiplier = input.climateMultiplier ?? 1;

  const structureWaterGalPerDay = structures.reduce(
    (sum, s) => sum + getStructureWaterGalPerDay(s),
    0,
  );
  const cropWaterGalYr = cropAreas.reduce(
    (sum, a) => sum + getCropAreaWaterGalYr(a, climateMultiplier),
    0,
  );
  const livestockWaterGalPerDay = paddocks.reduce(
    (sum, p) => sum + getPaddockWaterGalPerDay(p),
    0,
  );
  const livestockWaterGalYr = Math.round(livestockWaterGalPerDay * 365);
  const waterGalYr = Math.round(
    structureWaterGalPerDay * 365 + cropWaterGalYr + livestockWaterGalYr,
  );

  const structureKwhPerDay = structures.reduce(
    (sum, s) => sum + getStructureKwhPerDay(s),
    0,
  );
  const utilityKwhPerDay = utilities.reduce(
    (sum, u) => sum + getUtilityKwhPerDay(u),
    0,
  );
  const electricityKwhPerDay = structureKwhPerDay + utilityKwhPerDay;
  const electricityKwhYr = Math.round(electricityKwhPerDay * 365);

  return {
    structureWaterGalPerDay,
    cropWaterGalYr,
    livestockWaterGalYr,
    waterGalYr,
    electricityKwhPerDay,
    electricityKwhYr,
  };
}
