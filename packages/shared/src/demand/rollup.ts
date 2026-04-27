/**
 * Site-wide demand rollup. Sums water + electricity contributions from
 * structures, utilities, and crop areas through their per-type coefficient
 * tables. Pure — no I/O, no React, no store deps.
 */
import {
  type StructureLike,
  getStructureKwhPerDay,
  getStructureWaterGalPerDay,
} from './structureDemand.js';
import { type UtilityLike, getUtilityKwhPerDay } from './utilityDemand.js';
import { type CropAreaLike, getCropAreaWaterGalYr } from './cropDemand.js';

export interface SiteDemandInput {
  structures?: StructureLike[];
  utilities?: UtilityLike[];
  cropAreas?: CropAreaLike[];
}

export interface SiteDemand {
  /** Water — daily figure summed from structures (gal/day). */
  structureWaterGalPerDay: number;
  /** Water — annual figure summed from crop areas (gal/yr). */
  cropWaterGalYr: number;
  /** Total annual water demand in gal — structures × 365 + crop annual. */
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

  const structureWaterGalPerDay = structures.reduce(
    (sum, s) => sum + getStructureWaterGalPerDay(s),
    0,
  );
  const cropWaterGalYr = cropAreas.reduce(
    (sum, a) => sum + getCropAreaWaterGalYr(a),
    0,
  );
  const waterGalYr = Math.round(structureWaterGalPerDay * 365 + cropWaterGalYr);

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
    waterGalYr,
    electricityKwhPerDay,
    electricityKwhYr,
  };
}
