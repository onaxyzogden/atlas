/**
 * FAO EcoCrop Database — 2071 crops with climate and soil suitability ranges.
 *
 * Sourced from OpenCLIM/ecocrop (https://github.com/OpenCLIM/ecocrop),
 * which contains the complete FAO EcoCrop database under OGL v3.
 *
 * The raw CSV is parsed by scripts/parse_ecocrop.py into ecocrop_parsed.json.
 * This module re-exports typed access to that data.
 *
 * Texture codes: 0=wide/any, 1=heavy(clay), 2=medium(loam), 3=light(sand), 4=organic
 * Drainage codes: 1=poorly drained, 2=well drained, 3=excessively drained
 * Fertility codes: 1=low, 2=moderate, 3=high
 * Salinity codes: 0=none, 1=low(<4dS/m), 2=medium(4-10dS/m), 3=high(>10dS/m)
 */

export interface CropEntry {
  id: string;
  name: string;
  scientificName: string;
  family: string;
  category: string;
  lifecycle: 'annual' | 'biennial' | 'perennial' | 'unknown';
  lifeForm: 'herb' | 'shrub' | 'tree' | 'vine' | 'grass';
  /** Optimal growing temperature range [min, max] in celsius */
  tempOpt: [number, number];
  /** Absolute survival temperature range [min, max] in celsius */
  tempAbs: [number, number];
  /** Optimal annual precipitation [min, max] in mm */
  precipOpt: [number, number];
  /** Absolute annual precipitation [min, max] in mm */
  precipAbs: [number, number];
  /** Optimal soil pH range [min, max] */
  phOpt: [number, number];
  /** Absolute soil pH range [min, max] */
  phAbs: [number, number];
  /** Growing cycle length [min, max] in days */
  growingDays: [number, number];
  /** Killing temperature during early growth (celsius), null if unknown */
  killingTemp: number | null;
  /** Required soil depth in cm, null if unknown */
  soilDepth: number | null;
  /** Acceptable soil texture codes, null if unknown */
  texture: number[] | null;
  /** Preferred drainage code, null if unknown */
  drainage: number | null;
  /** Required soil fertility code, null if unknown */
  fertility: number | null;
  /** Salinity tolerance code, null if unknown */
  salinity: number | null;
  /** Raw FAO category tags */
  categories: string[];
}

// Vite handles JSON imports natively with bundler module resolution
import ecocropData from './ecocrop_parsed.json';

export const ECOCROP_DB: CropEntry[] = ecocropData as CropEntry[];

/** Unique primary categories present in the database. */
export const ECOCROP_CATEGORIES = [
  ...new Set(ECOCROP_DB.map((c) => c.category)),
].sort();

/** Human-readable labels for category codes. */
export const CATEGORY_LABELS: Record<string, string> = {
  cereal: 'Cereals & Pseudocereals',
  legume: 'Pulses & Grain Legumes',
  vegetable: 'Vegetables',
  fruit_nut: 'Fruits & Nuts',
  root_tuber: 'Roots & Tubers',
  forage: 'Forage & Pasture',
  forestry: 'Forestry & Wood',
  industrial: 'Industrial Materials',
  ornamental: 'Ornamentals & Turf',
  medicinal: 'Medicinals & Aromatic',
  cover_crop: 'Cover Crops',
  environmental: 'Environmental',
  other: 'Other',
};

/** Human-readable labels for texture codes. */
export const TEXTURE_LABELS: Record<number, string> = {
  0: 'Any',
  1: 'Heavy (Clay)',
  2: 'Medium (Loam)',
  3: 'Light (Sandy)',
  4: 'Organic',
};

/** Human-readable labels for drainage codes. */
export const DRAINAGE_LABELS: Record<number, string> = {
  1: 'Poorly Drained',
  2: 'Well Drained',
  3: 'Excessively Drained',
};
