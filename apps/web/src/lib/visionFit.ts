/**
 * Vision-to-land fit analysis — rule-based logic that maps project type
 * requirements to assessment score thresholds.
 *
 * No AI. No side effects. Deterministic given inputs.
 *
 * Each project type declares which scores matter, at what threshold,
 * and how critical they are. The fit engine compares actuals to thresholds
 * and produces a status for each: strong, moderate, or challenge.
 */

import type { ScoredResult } from './computeScores.js';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Requirement {
  /** Must match the `label` field from ScoredResult exactly */
  score: string;
  /** Minimum score for this project type to work well */
  threshold: number;
  /** How important this score is to the vision */
  weight: 'critical' | 'important' | 'supportive';
  /** For Design Complexity, higher = harder. Compare (100 - actual) to threshold. */
  inverted?: boolean;
}

export interface FitResult {
  scoreName: string;
  threshold: number;
  actual: number;
  weight: 'critical' | 'important' | 'supportive';
  status: 'strong' | 'moderate' | 'challenge';
  confidence: 'high' | 'medium' | 'low';
}

/* ------------------------------------------------------------------ */
/*  Requirements per project type                                      */
/* ------------------------------------------------------------------ */

const PROJECT_REQUIREMENTS: Record<string, Requirement[]> = {
  regenerative_farm: [
    { score: 'Agricultural Suitability', threshold: 55, weight: 'critical' },
    { score: 'Water Resilience', threshold: 50, weight: 'critical' },
    { score: 'Stewardship Readiness', threshold: 45, weight: 'important' },
    { score: 'Regenerative Potential', threshold: 40, weight: 'important' },
    { score: 'Buildability', threshold: 30, weight: 'supportive' },
  ],

  retreat_center: [
    { score: 'Buildability', threshold: 55, weight: 'critical' },
    { score: 'Water Resilience', threshold: 45, weight: 'important' },
    { score: 'Habitat Sensitivity', threshold: 40, weight: 'important' },
    { score: 'Design Complexity', threshold: 50, weight: 'supportive', inverted: true },
  ],

  homestead: [
    { score: 'Buildability', threshold: 50, weight: 'critical' },
    { score: 'Agricultural Suitability', threshold: 40, weight: 'important' },
    { score: 'Water Resilience', threshold: 40, weight: 'important' },
    { score: 'Stewardship Readiness', threshold: 35, weight: 'supportive' },
  ],

  educational_farm: [
    { score: 'Agricultural Suitability', threshold: 45, weight: 'critical' },
    { score: 'Buildability', threshold: 45, weight: 'critical' },
    { score: 'Water Resilience', threshold: 40, weight: 'important' },
    { score: 'Regenerative Potential', threshold: 35, weight: 'supportive' },
  ],

  conservation: [
    { score: 'Habitat Sensitivity', threshold: 50, weight: 'critical' },
    { score: 'Regenerative Potential', threshold: 50, weight: 'critical' },
    { score: 'Water Resilience', threshold: 45, weight: 'important' },
    { score: 'Stewardship Readiness', threshold: 40, weight: 'supportive' },
  ],

  multi_enterprise: [
    { score: 'Buildability', threshold: 45, weight: 'critical' },
    { score: 'Agricultural Suitability', threshold: 40, weight: 'important' },
    { score: 'Water Resilience', threshold: 45, weight: 'important' },
    { score: 'Stewardship Readiness', threshold: 40, weight: 'important' },
    { score: 'Design Complexity', threshold: 45, weight: 'supportive', inverted: true },
  ],

  moontrance: [
    { score: 'Buildability', threshold: 50, weight: 'critical' },
    { score: 'Water Resilience', threshold: 50, weight: 'critical' },
    { score: 'Stewardship Readiness', threshold: 55, weight: 'important' },
    { score: 'Habitat Sensitivity', threshold: 45, weight: 'important' },
    { score: 'Regenerative Potential', threshold: 40, weight: 'supportive' },
    { score: 'Design Complexity', threshold: 50, weight: 'supportive', inverted: true },
  ],
};

/* ------------------------------------------------------------------ */
/*  Fit computation                                                    */
/* ------------------------------------------------------------------ */

function resolveStatus(actual: number, threshold: number): 'strong' | 'moderate' | 'challenge' {
  if (actual >= threshold + 15) return 'strong';
  if (actual >= threshold - 10) return 'moderate';
  return 'challenge';
}

/**
 * Cross-reference a project type's requirements against the land's assessed scores.
 * Returns one FitResult per requirement, sorted by weight (critical first).
 */
export function computeVisionFit(
  projectType: string | null,
  scores: ScoredResult[],
): FitResult[] {
  if (!projectType) return [];
  const reqs = PROJECT_REQUIREMENTS[projectType];
  if (!reqs) return [];

  const scoreMap = new Map(scores.map((s) => [s.label, s]));

  const weightOrder = { critical: 0, important: 1, supportive: 2 } as const;

  return reqs
    .map((req): FitResult | null => {
      const scored = scoreMap.get(req.score);
      if (!scored) return null;

      const actual = req.inverted ? 100 - scored.score : scored.score;

      return {
        scoreName: req.score,
        threshold: req.threshold,
        actual: scored.score,
        weight: req.weight,
        status: resolveStatus(actual, req.threshold),
        confidence: scored.confidence,
      };
    })
    .filter((r): r is FitResult => r !== null)
    .sort((a, b) => weightOrder[a.weight] - weightOrder[b.weight]);
}

/** Human-readable label for the fit status */
export function fitStatusLabel(status: 'strong' | 'moderate' | 'challenge'): string {
  switch (status) {
    case 'strong': return 'Supports vision';
    case 'moderate': return 'Workable';
    case 'challenge': return 'Needs attention';
  }
}

/** Human-readable label for project types */
export function projectTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    regenerative_farm: 'Regenerative Farm',
    retreat_center: 'Retreat Center',
    homestead: 'Homestead',
    educational_farm: 'Educational Farm',
    conservation: 'Conservation',
    multi_enterprise: 'Multi-Enterprise',
    moontrance: 'Moontrance',
  };
  return labels[type] ?? type;
}

/** All supported project types for the selector */
export const PROJECT_TYPES = [
  'regenerative_farm',
  'retreat_center',
  'homestead',
  'educational_farm',
  'conservation',
  'multi_enterprise',
  'moontrance',
] as const;
