/**
 * succession/speciesData — seed canopy growth curves for the four
 * placed vegetation kinds in the Plan elementCatalog (oak-tree,
 * pine-tree, apple-tree, shrub). Numbers are deliberately conservative
 * v1 estimates; canopy/height in metres at sample ages.
 *
 * Sources:
 *   - oak-tree:   USDA NRCS Plant Guide (Quercus rubra / alba composite)
 *   - apple-tree: USDA NRCS Plant Guide (Malus domestica, semi-dwarf)
 *   - pine-tree:  USDA NRCS Plant Guide (Pinus strobus)
 *   - shrub:      generic permaculture forestry composite (e.g.
 *                 elderberry / hazel mid-bush form)
 *
 * Keyed by `DesignElementSpec.kind` so the v1 slider can index without
 * a separate species-id field on `DesignElement`. Once a richer species
 * picker lands, this table moves to `(speciesId → curve)` and the kind
 * → species map lives elsewhere.
 *
 * Gaps to track in `wiki/entities/gap-analysis.md`:
 *   - hedgerow (line geometry — needs a different age model)
 *   - pawpaw / persimmon / chestnut (P1 species per the temporal-slider
 *     ADR but not yet in elementCatalog)
 */

export type SuccessionStage = 'pioneer' | 'mid' | 'climax';

export interface GrowthSample {
  /** Age in years. */
  y: number;
  /** Crown diameter in metres. */
  c: number;
  /** Above-ground height in metres. */
  h: number;
}

export interface GrowthCurve {
  samples: GrowthSample[];
  /** Age at which growth saturates; canopy is clamped above this. */
  matureAtYears: number;
  stage: SuccessionStage;
  expectedLifespanYears: number;
}

/** Per-kind seed data. */
export const SPECIES_GROWTH: Record<string, GrowthCurve> = {
  'oak-tree': {
    samples: [
      { y: 1, c: 0.5, h: 0.8 },
      { y: 5, c: 2, h: 3 },
      { y: 15, c: 6, h: 10 },
      { y: 30, c: 12, h: 18 },
      { y: 50, c: 18, h: 24 },
    ],
    matureAtYears: 40,
    stage: 'climax',
    expectedLifespanYears: 200,
  },
  'pine-tree': {
    samples: [
      { y: 1, c: 0.4, h: 1 },
      { y: 5, c: 2, h: 4 },
      { y: 15, c: 5, h: 12 },
      { y: 30, c: 8, h: 22 },
      { y: 50, c: 10, h: 28 },
    ],
    matureAtYears: 30,
    stage: 'mid',
    expectedLifespanYears: 120,
  },
  'apple-tree': {
    samples: [
      { y: 1, c: 0.6, h: 1 },
      { y: 5, c: 3, h: 3 },
      { y: 15, c: 6, h: 5 },
      { y: 30, c: 7, h: 6 },
    ],
    matureAtYears: 15,
    stage: 'mid',
    expectedLifespanYears: 50,
  },
  shrub: {
    samples: [
      { y: 1, c: 0.4, h: 0.6 },
      { y: 5, c: 1.5, h: 1.5 },
      { y: 15, c: 2, h: 2 },
    ],
    matureAtYears: 8,
    stage: 'pioneer',
    expectedLifespanYears: 30,
  },
};

/** Generic fallback when the species/kind is unknown. Three classes
 *  loosely matched to the existing elementCatalog draw cadence. */
export const GENERIC_GROWTH_CURVES: Record<'fast' | 'medium' | 'slow', GrowthCurve> = {
  fast: {
    samples: [
      { y: 1, c: 0.5, h: 0.8 },
      { y: 5, c: 2.5, h: 3 },
      { y: 15, c: 4, h: 6 },
    ],
    matureAtYears: 12,
    stage: 'pioneer',
    expectedLifespanYears: 40,
  },
  medium: {
    samples: [
      { y: 1, c: 0.5, h: 1 },
      { y: 5, c: 2, h: 3 },
      { y: 15, c: 5, h: 8 },
      { y: 30, c: 8, h: 15 },
    ],
    matureAtYears: 25,
    stage: 'mid',
    expectedLifespanYears: 100,
  },
  slow: {
    samples: [
      { y: 1, c: 0.4, h: 0.7 },
      { y: 5, c: 1.5, h: 2.5 },
      { y: 15, c: 5, h: 9 },
      { y: 30, c: 10, h: 16 },
      { y: 50, c: 16, h: 22 },
    ],
    matureAtYears: 45,
    stage: 'climax',
    expectedLifespanYears: 180,
  },
};
