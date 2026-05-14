/**
 * Annual-crop phenology catalog — drives the Annual Planting Calendar
 * generator (`schedulePlantingFromAreas.ts`). Separate file from
 * `plantSpeciesData.ts` (which is perennial-leaning trees / shrubs / vines
 * / ground covers) so existing consumers stay green.
 *
 * Per-entry timing is expressed as offsets from the parcel's spring last
 * frost and fall first frost. The scheduler converts those offsets into
 * concrete YYYY-MM-DD dates per project / year.
 *
 * Sources: Cornell Cooperative Extension (Garden-Based Learning, Vegetable
 * MD Online), OMAFRA Pub 363 (Vegetable Production Recommendations),
 * Johnny's Selected Seeds growing guides. Targets cool-temperate (zones
 * 4-7) and is hand-tuned for the Moontrance Creek archetype.
 */

export interface AnnualPlantPhenology {
  id: string;
  commonName: string;
  latinName: string;
  category: 'fruiting' | 'leafy' | 'root' | 'legume' | 'cucurbit' | 'brassica';
  coolOrWarmSeason: 'cool' | 'warm' | 'either';
  /**
   * Weeks before last spring frost to start indoors. `null` = direct-sow
   * only (no transplant pathway). When `null`, `transplantWeeksAfterLastFrost`
   * must also be null.
   */
  startIndoorsWeeksBeforeLastFrost: number | null;
  /**
   * Direct-sow window expressed in weeks relative to last spring frost.
   * Negative `start` = sow before last frost (cool-season crops). Set
   * `null` when the crop is only transplanted (e.g. peppers).
   */
  directSowWeeksRelativeToLastFrost: { start: number; end: number } | null;
  /**
   * Weeks after last spring frost to transplant seedlings outdoors.
   * `null` when the crop is direct-sow only.
   */
  transplantWeeksAfterLastFrost: number | null;
  /** Days from transplant (or direct-sow) to first harvest. */
  daysToFirstHarvest: number;
  /** Duration of the harvest window once it opens (days). */
  harvestWindowDays: number;
  /**
   * Succession planting cadence. `null` = single planting only.
   * `cutoffWeeksBeforeFirstFrost` stops the succession before fall frost.
   */
  succession: { intervalDays: number; cutoffWeeksBeforeFirstFrost: number } | null;
  /** Spacing in rows (cm). Drives quantity estimates on the card. */
  spacingCm: { inRow: number; betweenRow: number };
  /** Average yield (kg per square metre of bed). */
  yieldKgPerM2: number;
  /** Free-text note shown on the card. */
  notes?: string;
}

export const ANNUAL_PHENOLOGY: AnnualPlantPhenology[] = [
  // ── Fruiting (warm-season, transplant) ─────────────────────────────────
  {
    id: 'tomato',
    commonName: 'Tomato',
    latinName: 'Solanum lycopersicum',
    category: 'fruiting',
    coolOrWarmSeason: 'warm',
    startIndoorsWeeksBeforeLastFrost: 6,
    directSowWeeksRelativeToLastFrost: null,
    transplantWeeksAfterLastFrost: 2,
    daysToFirstHarvest: 75,
    harvestWindowDays: 60,
    succession: null,
    spacingCm: { inRow: 60, betweenRow: 90 },
    yieldKgPerM2: 4.5,
  },
  {
    id: 'pepper',
    commonName: 'Sweet Pepper',
    latinName: 'Capsicum annuum',
    category: 'fruiting',
    coolOrWarmSeason: 'warm',
    startIndoorsWeeksBeforeLastFrost: 8,
    directSowWeeksRelativeToLastFrost: null,
    transplantWeeksAfterLastFrost: 2,
    daysToFirstHarvest: 70,
    harvestWindowDays: 60,
    succession: null,
    spacingCm: { inRow: 45, betweenRow: 60 },
    yieldKgPerM2: 2.5,
  },
  {
    id: 'eggplant',
    commonName: 'Eggplant',
    latinName: 'Solanum melongena',
    category: 'fruiting',
    coolOrWarmSeason: 'warm',
    startIndoorsWeeksBeforeLastFrost: 8,
    directSowWeeksRelativeToLastFrost: null,
    transplantWeeksAfterLastFrost: 2,
    daysToFirstHarvest: 80,
    harvestWindowDays: 50,
    succession: null,
    spacingCm: { inRow: 60, betweenRow: 75 },
    yieldKgPerM2: 2.2,
  },

  // ── Cucurbits (warm-season, either) ────────────────────────────────────
  {
    id: 'cucumber',
    commonName: 'Cucumber',
    latinName: 'Cucumis sativus',
    category: 'cucurbit',
    coolOrWarmSeason: 'warm',
    startIndoorsWeeksBeforeLastFrost: 3,
    directSowWeeksRelativeToLastFrost: { start: 2, end: 6 },
    transplantWeeksAfterLastFrost: 2,
    daysToFirstHarvest: 55,
    harvestWindowDays: 45,
    succession: { intervalDays: 21, cutoffWeeksBeforeFirstFrost: 10 },
    spacingCm: { inRow: 30, betweenRow: 90 },
    yieldKgPerM2: 3.5,
  },
  {
    id: 'summer_squash',
    commonName: 'Summer Squash',
    latinName: 'Cucurbita pepo',
    category: 'cucurbit',
    coolOrWarmSeason: 'warm',
    startIndoorsWeeksBeforeLastFrost: null,
    directSowWeeksRelativeToLastFrost: { start: 1, end: 4 },
    transplantWeeksAfterLastFrost: null,
    daysToFirstHarvest: 50,
    harvestWindowDays: 60,
    succession: { intervalDays: 28, cutoffWeeksBeforeFirstFrost: 10 },
    spacingCm: { inRow: 60, betweenRow: 120 },
    yieldKgPerM2: 5,
  },
  {
    id: 'winter_squash',
    commonName: 'Winter Squash',
    latinName: 'Cucurbita maxima',
    category: 'cucurbit',
    coolOrWarmSeason: 'warm',
    startIndoorsWeeksBeforeLastFrost: 3,
    directSowWeeksRelativeToLastFrost: { start: 1, end: 3 },
    transplantWeeksAfterLastFrost: 2,
    daysToFirstHarvest: 100,
    harvestWindowDays: 21,
    succession: null,
    spacingCm: { inRow: 90, betweenRow: 180 },
    yieldKgPerM2: 2.8,
    notes: 'Cure 10 days post-harvest for storage.',
  },

  // ── Legumes (cool/warm, direct-sow) ────────────────────────────────────
  {
    id: 'bush_bean',
    commonName: 'Bush Bean',
    latinName: 'Phaseolus vulgaris',
    category: 'legume',
    coolOrWarmSeason: 'warm',
    startIndoorsWeeksBeforeLastFrost: null,
    directSowWeeksRelativeToLastFrost: { start: 0, end: 6 },
    transplantWeeksAfterLastFrost: null,
    daysToFirstHarvest: 55,
    harvestWindowDays: 21,
    succession: { intervalDays: 14, cutoffWeeksBeforeFirstFrost: 8 },
    spacingCm: { inRow: 10, betweenRow: 45 },
    yieldKgPerM2: 1.2,
  },
  {
    id: 'pole_bean',
    commonName: 'Pole Bean',
    latinName: 'Phaseolus vulgaris',
    category: 'legume',
    coolOrWarmSeason: 'warm',
    startIndoorsWeeksBeforeLastFrost: null,
    directSowWeeksRelativeToLastFrost: { start: 1, end: 4 },
    transplantWeeksAfterLastFrost: null,
    daysToFirstHarvest: 65,
    harvestWindowDays: 45,
    succession: null,
    spacingCm: { inRow: 15, betweenRow: 90 },
    yieldKgPerM2: 1.8,
  },
  {
    id: 'pea',
    commonName: 'Garden Pea',
    latinName: 'Pisum sativum',
    category: 'legume',
    coolOrWarmSeason: 'cool',
    startIndoorsWeeksBeforeLastFrost: null,
    directSowWeeksRelativeToLastFrost: { start: -6, end: -2 },
    transplantWeeksAfterLastFrost: null,
    daysToFirstHarvest: 60,
    harvestWindowDays: 21,
    succession: null,
    spacingCm: { inRow: 5, betweenRow: 60 },
    yieldKgPerM2: 0.8,
    notes: 'Direct-sow as soon as soil is workable.',
  },

  // ── Leafy (cool-season, succession) ────────────────────────────────────
  {
    id: 'lettuce',
    commonName: 'Lettuce',
    latinName: 'Lactuca sativa',
    category: 'leafy',
    coolOrWarmSeason: 'cool',
    startIndoorsWeeksBeforeLastFrost: 4,
    directSowWeeksRelativeToLastFrost: { start: -4, end: 4 },
    transplantWeeksAfterLastFrost: -2,
    daysToFirstHarvest: 50,
    harvestWindowDays: 14,
    succession: { intervalDays: 14, cutoffWeeksBeforeFirstFrost: 6 },
    spacingCm: { inRow: 25, betweenRow: 30 },
    yieldKgPerM2: 2,
  },
  {
    id: 'kale',
    commonName: 'Kale',
    latinName: 'Brassica oleracea (Acephala)',
    category: 'brassica',
    coolOrWarmSeason: 'cool',
    startIndoorsWeeksBeforeLastFrost: 6,
    directSowWeeksRelativeToLastFrost: { start: -4, end: 2 },
    transplantWeeksAfterLastFrost: -2,
    daysToFirstHarvest: 55,
    harvestWindowDays: 120,
    succession: null,
    spacingCm: { inRow: 45, betweenRow: 60 },
    yieldKgPerM2: 3,
    notes: 'Frost improves flavour; harvest through fall.',
  },
  {
    id: 'spinach',
    commonName: 'Spinach',
    latinName: 'Spinacia oleracea',
    category: 'leafy',
    coolOrWarmSeason: 'cool',
    startIndoorsWeeksBeforeLastFrost: null,
    directSowWeeksRelativeToLastFrost: { start: -6, end: -2 },
    transplantWeeksAfterLastFrost: null,
    daysToFirstHarvest: 45,
    harvestWindowDays: 21,
    succession: { intervalDays: 14, cutoffWeeksBeforeFirstFrost: 4 },
    spacingCm: { inRow: 10, betweenRow: 30 },
    yieldKgPerM2: 1.5,
  },

  // ── Roots (cool-season, direct-sow) ────────────────────────────────────
  {
    id: 'carrot',
    commonName: 'Carrot',
    latinName: 'Daucus carota',
    category: 'root',
    coolOrWarmSeason: 'cool',
    startIndoorsWeeksBeforeLastFrost: null,
    directSowWeeksRelativeToLastFrost: { start: -3, end: 8 },
    transplantWeeksAfterLastFrost: null,
    daysToFirstHarvest: 70,
    harvestWindowDays: 30,
    succession: { intervalDays: 21, cutoffWeeksBeforeFirstFrost: 10 },
    spacingCm: { inRow: 5, betweenRow: 30 },
    yieldKgPerM2: 3,
  },
  {
    id: 'beet',
    commonName: 'Beet',
    latinName: 'Beta vulgaris',
    category: 'root',
    coolOrWarmSeason: 'cool',
    startIndoorsWeeksBeforeLastFrost: null,
    directSowWeeksRelativeToLastFrost: { start: -3, end: 6 },
    transplantWeeksAfterLastFrost: null,
    daysToFirstHarvest: 55,
    harvestWindowDays: 21,
    succession: { intervalDays: 21, cutoffWeeksBeforeFirstFrost: 8 },
    spacingCm: { inRow: 8, betweenRow: 30 },
    yieldKgPerM2: 2.5,
  },

  // ── Brassicas (cool-season, transplant) ────────────────────────────────
  {
    id: 'broccoli',
    commonName: 'Broccoli',
    latinName: 'Brassica oleracea (Italica)',
    category: 'brassica',
    coolOrWarmSeason: 'cool',
    startIndoorsWeeksBeforeLastFrost: 6,
    directSowWeeksRelativeToLastFrost: null,
    transplantWeeksAfterLastFrost: -2,
    daysToFirstHarvest: 70,
    harvestWindowDays: 21,
    succession: null,
    spacingCm: { inRow: 45, betweenRow: 60 },
    yieldKgPerM2: 1.8,
  },
];

export const ANNUAL_PHENOLOGY_BY_ID: Record<string, AnnualPlantPhenology> = Object.fromEntries(
  ANNUAL_PHENOLOGY.map((p) => [p.id, p]),
);

export function getAnnualPhenology(id: string): AnnualPlantPhenology | undefined {
  return ANNUAL_PHENOLOGY_BY_ID[id];
}
