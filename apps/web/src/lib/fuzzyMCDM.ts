/**
 * Fuzzy Logic + AHP MCDM Weighting — Sprint BF
 *
 * Augments the crisp-threshold FAO S1-N2 scoring (computeFAOSuitability) and
 * the uniform-weighted overall score (computeOverallScore) with:
 *   (a) fuzzy membership functions producing gradual class transitions, and
 *   (b) Saaty (1980) AHP pairwise-comparison weighting.
 *
 * References:
 *   - Zadeh, L. (1965) Fuzzy Sets
 *   - Saaty, T.L. (1980) The Analytic Hierarchy Process
 *   - ALUES / FAO (2015) Fuzzy land-evaluation implementation
 */

export type SuitabilityClass = 'S1' | 'S2' | 'S3' | 'N1' | 'N2';

export type FuzzyMembership = Record<SuitabilityClass, number>;

export interface FuzzyFAOResult {
  /** Per-factor membership vectors */
  perFactor: Record<string, FuzzyMembership>;
  /** Aggregated membership across factors (geometric mean) */
  aggregate: FuzzyMembership;
  /** Max-membership defuzzified class */
  defuzzifiedClass: SuitabilityClass;
  /** Confidence of defuzzification (max membership value) */
  confidence: number;
}

/* ------------------------------------------------------------------ */
/*  Fuzzy membership helpers                                           */
/* ------------------------------------------------------------------ */

/** Trapezoidal membership: plateau at 1 between [b,c], linear decay to 0 at a / d. */
function trapezoid(x: number, a: number, b: number, c: number, d: number): number {
  if (x <= a || x >= d) return 0;
  if (x >= b && x <= c) return 1;
  if (x < b) return (x - a) / (b - a);
  return (d - x) / (d - c);
}

/**
 * Map a factor value to membership across 5 classes using FAO-style break-points.
 * breaks = [absoluteMin, optimalLow, optimalHigh, absoluteMax] — the S1 plateau
 * is [optimalLow, optimalHigh]; memberships for S2/S3/N1/N2 are derived by
 * progressively wider shoulders around the S1 core.
 */
function factorMembership(x: number, breaks: [number, number, number, number]): FuzzyMembership {
  const [lo, optLo, optHi, hi] = breaks;
  const span = hi - lo;
  // S1 = core optimal; S2 = S1 + 10% shoulder; S3 = + 25%; N1 = + 50%; N2 = entire hull
  const shoulder = (mult: number) => {
    const s = span * mult;
    return trapezoid(x, lo - s, optLo - s, optHi + s, hi + s);
  };
  const S1 = trapezoid(x, optLo - span * 0.05, optLo, optHi, optHi + span * 0.05);
  const S2 = Math.max(0, shoulder(0.1) - S1);
  const S3 = Math.max(0, shoulder(0.25) - shoulder(0.1));
  const N1 = Math.max(0, shoulder(0.5) - shoulder(0.25));
  const N2 = Math.max(0, 1 - shoulder(0.5));
  // Normalize (membership sum should ≈ 1)
  const total = S1 + S2 + S3 + N1 + N2;
  if (total <= 0) return { S1: 0, S2: 0, S3: 0, N1: 0, N2: 1 };
  return {
    S1: S1 / total, S2: S2 / total, S3: S3 / total, N1: N1 / total, N2: N2 / total,
  };
}

/* ------------------------------------------------------------------ */
/*  Fuzzy FAO membership — same inputs as computeFAOSuitability         */
/* ------------------------------------------------------------------ */

export function computeFuzzyFAOMembership(inputs: {
  pH: number | null;
  rootingDepthCm: number | null;
  slopeDeg: number | null;
  awcCmCm: number | null;
  ecDsM: number | null;       // salinity
  cecCmolKg: number | null;
  gdd: number | null;         // thermal
  drainageClass: string | null;
}): FuzzyFAOResult {
  const perFactor: Record<string, FuzzyMembership> = {};

  // Break-points per factor (FAO 1976 / ALUES typical agronomic ranges)
  if (inputs.pH != null) perFactor.pH = factorMembership(inputs.pH, [3.5, 6.0, 7.2, 9.5]);
  if (inputs.rootingDepthCm != null) perFactor.rootingDepth = factorMembership(inputs.rootingDepthCm, [10, 75, 200, 400]);
  if (inputs.slopeDeg != null) perFactor.slope = factorMembership(-Math.abs(inputs.slopeDeg), [-45, -5, 0, 0]);
  if (inputs.awcCmCm != null) perFactor.awc = factorMembership(inputs.awcCmCm, [0.04, 0.14, 0.22, 0.35]);
  if (inputs.ecDsM != null) perFactor.salinity = factorMembership(-inputs.ecDsM, [-16, -2, 0, 0]);
  if (inputs.cecCmolKg != null) perFactor.cec = factorMembership(inputs.cecCmolKg, [2, 15, 40, 80]);
  if (inputs.gdd != null) perFactor.thermal = factorMembership(inputs.gdd, [500, 1800, 4500, 7000]);

  // Drainage as categorical → map to a representative numeric anchor then fuzzify
  if (inputs.drainageClass) {
    const d = inputs.drainageClass.toLowerCase();
    const anchor = d.includes('excessive') ? 0.2
      : d.includes('well') ? 1.0
      : d.includes('moderate') ? 0.8
      : d.includes('somewhat') ? 0.6
      : d.includes('poor') ? 0.3
      : d.includes('very poor') ? 0.1 : 0.5;
    perFactor.drainage = factorMembership(anchor, [0, 0.7, 1.0, 1.2]);
  }

  // Aggregate — geometric mean per class across factors (FAO limiting-factor tradition
  // favours min-operator; geometric mean is a softer aggregator used in ALUES)
  const agg: FuzzyMembership = { S1: 1, S2: 1, S3: 1, N1: 1, N2: 1 };
  const keys = Object.keys(perFactor);
  if (keys.length === 0) return {
    perFactor, aggregate: { S1: 0, S2: 0, S3: 0, N1: 0, N2: 1 }, defuzzifiedClass: 'N2', confidence: 0,
  };
  for (const k of keys) {
    for (const cls of ['S1', 'S2', 'S3', 'N1', 'N2'] as SuitabilityClass[]) {
      agg[cls] *= Math.max(1e-6, perFactor[k]![cls]);
    }
  }
  for (const cls of ['S1', 'S2', 'S3', 'N1', 'N2'] as SuitabilityClass[]) {
    agg[cls] = Math.pow(agg[cls], 1 / keys.length);
  }
  // Re-normalize
  const sum = agg.S1 + agg.S2 + agg.S3 + agg.N1 + agg.N2;
  if (sum > 0) {
    for (const cls of ['S1', 'S2', 'S3', 'N1', 'N2'] as SuitabilityClass[]) agg[cls] /= sum;
  }

  // Defuzzify by max membership
  let defuzzifiedClass: SuitabilityClass = 'S1';
  let maxVal = -1;
  for (const cls of ['S1', 'S2', 'S3', 'N1', 'N2'] as SuitabilityClass[]) {
    if (agg[cls] > maxVal) { maxVal = agg[cls]; defuzzifiedClass = cls; }
  }

  return {
    perFactor,
    aggregate: {
      S1: Math.round(agg.S1 * 1000) / 1000,
      S2: Math.round(agg.S2 * 1000) / 1000,
      S3: Math.round(agg.S3 * 1000) / 1000,
      N1: Math.round(agg.N1 * 1000) / 1000,
      N2: Math.round(agg.N2 * 1000) / 1000,
    },
    defuzzifiedClass,
    confidence: Math.round(maxVal * 1000) / 1000,
  };
}

/* ------------------------------------------------------------------ */
/*  Saaty AHP — pairwise comparison weighting                          */
/* ------------------------------------------------------------------ */

export interface AhpResult {
  weights: number[];
  consistencyRatio: number;
  consistent: boolean;       // CR <= 0.10
  lambdaMax: number;
}

// Saaty random consistency index by matrix size (n=1..10)
const RI_TABLE: Record<number, number> = {
  1: 0, 2: 0, 3: 0.58, 4: 0.90, 5: 1.12, 6: 1.24,
  7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49,
};

/**
 * Compute AHP priority weights from a reciprocal pairwise-comparison matrix
 * using geometric-mean row-normalization (close approximation to the principal
 * eigenvector for matrices up to ~10 dimensions).
 */
export function computeAhpWeights(matrix: number[][]): AhpResult {
  const n = matrix.length;
  if (n === 0 || matrix.some((row) => row.length !== n)) {
    throw new Error('AHP: matrix must be square');
  }

  // Geometric mean of each row
  const rowGM = matrix.map((row) => {
    let p = 1;
    for (const v of row) p *= v;
    return Math.pow(p, 1 / n);
  });
  const sumGM = rowGM.reduce((a, b) => a + b, 0);
  const weights = rowGM.map((g) => g / sumGM);

  // λmax estimate — sum of (col-sum × weight)
  const colSums: number[] = Array(n).fill(0);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) colSums[j]! += matrix[i]![j]!;
  let lambdaMax = 0;
  for (let j = 0; j < n; j++) lambdaMax += colSums[j]! * weights[j]!;

  const CI = n > 1 ? (lambdaMax - n) / (n - 1) : 0;
  const RI = RI_TABLE[n] ?? 1.49;
  const CR = RI > 0 ? CI / RI : 0;

  return {
    weights: weights.map((w) => Math.round(w * 10000) / 10000),
    consistencyRatio: Math.round(CR * 10000) / 10000,
    consistent: CR <= 0.10,
    lambdaMax: Math.round(lambdaMax * 10000) / 10000,
  };
}

/**
 * Default 8-dimension AHP matrix for the Atlas scored categories.
 * Order must match the output of computeAssessmentScores():
 *   [Water, Agri, Regen, Buildability, Habitat, Stewardship, Community, DesignComplexity]
 * Values reflect a balanced regenerative-agriculture priority set.
 */
export const DEFAULT_ATLAS_AHP_MATRIX: number[][] = [
  //  W    A    R    B    H    S    C    D
  [  1,   1,   2,   3,   2,   2,   3,   5], // Water Resilience
  [  1,   1,   2,   3,   2,   2,   3,   5], // Agricultural Suitability
  [1/2, 1/2,   1,   2,   1,   1,   2,   4], // Regenerative Potential
  [1/3, 1/3, 1/2,   1, 1/2, 1/2,   1,   2], // Buildability
  [1/2, 1/2,   1,   2,   1,   1,   2,   4], // Habitat Sensitivity
  [1/2, 1/2,   1,   2,   1,   1,   2,   4], // Stewardship Readiness
  [1/3, 1/3, 1/2,   1, 1/2, 1/2,   1,   2], // Community Suitability
  [1/5, 1/5, 1/4, 1/2, 1/4, 1/4, 1/2,   1], // Design Complexity
];

/** Convenience: the default Atlas weight vector (cached from AHP computation). */
export function defaultAtlasWeights(): number[] {
  return computeAhpWeights(DEFAULT_ATLAS_AHP_MATRIX).weights;
}
