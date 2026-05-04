/**
 * v2 ScoredResult[] (10 labels) → v3 ProjectScores (6 categories) adapter.
 *
 * Phase 4.2 reconciliation. The shared scorer in
 * `packages/shared/src/scoring/computeScores.ts` emits a fixed 10-label
 * roster (8 weighted + Ecological Integration in WEIGHTS but unused +
 * diagnostic facets at weight 0). v3's view-model collapses those into
 * 6 plain-language categories that the lifecycle pages render.
 *
 * Mapping rationale (load-bearing labels only — diagnostic facets at
 * weight 0 are deliberately ignored):
 *
 *   landFit            ← avg(Agricultural Suitability, Regenerative
 *                            Potential, Stewardship Readiness)
 *                        Steward readiness reflects "is the steward set
 *                        up to actually run this land" which is the same
 *                        signal Land Fit communicates in the brief.
 *   water              ← Water Resilience
 *   regulation         ← Habitat Sensitivity
 *                        Wetlands/floodplain/critical-habitat are the
 *                        regulatory constraints today; a dedicated
 *                        Regulation label is on the Phase 7 backlog.
 *   access             ← Buildability
 *                        Buildability already factors infrastructure +
 *                        terrain + remediation risk — closest available
 *                        proxy for "can we get to and onto this site".
 *   financial          ← Community Suitability
 *                        Until a Cat-22 economic scorer lands, community
 *                        suitability is the closest-fit signal (labour
 *                        pool, demographics, demand catchment).
 *   designCompleteness ← 100 − Design Complexity
 *                        Design Complexity inverts cleanly: a high-
 *                        complexity site is one where the design is the
 *                        long pole; we surface that as "completeness gap".
 *
 * Confidence: each v3 score takes the lowest confidence among its source
 * labels (matches the rollup rule used by `SiteAssessmentWriter`).
 *
 * Verdict: synthesized from overall score using the same thresholds the
 * MTC fixture authors against. Labels mirror the `Verdict.label` strings
 * shipped on the existing fixture so v3 pages render consistently.
 */

import type { ScoredResult } from '@ogden/shared/scoring';
import type {
  ConfidenceTier,
  ProjectScores,
  Score,
  Verdict,
  VerdictStatus,
} from '../types.js';

type ScoreLabel =
  | 'Water Resilience'
  | 'Agricultural Suitability'
  | 'Regenerative Potential'
  | 'Buildability'
  | 'Habitat Sensitivity'
  | 'Stewardship Readiness'
  | 'Community Suitability'
  | 'Design Complexity';

function byLabel(scores: ScoredResult[], label: ScoreLabel): ScoredResult | undefined {
  return scores.find((s) => s.label === label);
}

/** ScoredResult.confidence ('high'|'medium'|'low') → v3 ConfidenceTier
 *  ('high'|'good'|'mixed'|'low'). Medium maps to `good`; the v3 `mixed`
 *  tier is reserved for the explicit "multiple sources disagree" case
 *  which the shared scorer doesn't emit — so it's never produced here. */
function tierOf(c: ScoredResult['confidence'] | undefined): ConfidenceTier {
  if (c === 'high') return 'high';
  if (c === 'medium') return 'good';
  return 'low';
}

const TIER_RANK: Record<ConfidenceTier, number> = { high: 3, good: 2, mixed: 1, low: 0 };

/** Weakest-wins rollup across contributing labels. */
function weakestTier(tiers: ConfidenceTier[]): ConfidenceTier {
  if (tiers.length === 0) return 'low';
  return tiers.reduce((acc, t) => (TIER_RANK[t] < TIER_RANK[acc] ? t : acc), tiers[0]!);
}

/** Plain-language label derived from value. v3 surfaces these next to the
 *  numeric score; the shared scorer's `rating` field is more granular but
 *  also stricter ("Insufficient Data"), so we re-derive here against the
 *  v3 brief's language. */
function valueLabel(value: number): string {
  if (value >= 80) return 'Strong';
  if (value >= 65) return 'Workable';
  if (value >= 50) return 'Moderate';
  if (value >= 35) return 'Needs improvement';
  if (value > 0) return 'At risk';
  return 'Insufficient Data';
}

/** "What this means" sentence per category. Generic but grounded — pages
 *  can override when they author per-category narrative content. */
const MEANING: Record<keyof ProjectScores, (v: number) => string> = {
  landFit: (v) =>
    v >= 65
      ? 'Soils, ecology, and steward capacity support the intended uses with manageable adjustments.'
      : 'Land-fit signals are weak — agronomy, regen capacity, or steward readiness need work before the design holds.',
  water: (v) =>
    v >= 65
      ? 'Water balance and supply are workable for the planned land uses; monitor seasonal extremes.'
      : 'Water resilience is the load-bearing constraint — a placed source or storage strategy is required before grazing or irrigation.',
  regulation: (v) =>
    v >= 65
      ? 'Wetland setbacks and regulated areas constrain footprint but do not block the vision.'
      : 'Regulated wetlands or critical habitat materially constrain the buildable envelope; verify with the conservation authority.',
  access: (v) =>
    v >= 65
      ? 'Primary access and on-site infrastructure are workable; internal circulation can be drawn on the design canvas.'
      : 'Access or supporting infrastructure (roads, utilities, remediation) is a real cost driver — investigate before committing capital.',
  financial: (v) =>
    v >= 65
      ? 'The local labour pool, demographics, and demand catchment support the planned enterprises.'
      : 'Community/market signals are thin for the planned enterprises — verify the catchment before scaling fixed costs.',
  designCompleteness: (v) =>
    v >= 65
      ? 'Design intent is well-developed for the site; remaining gaps are local refinements.'
      : 'Design intent has structural gaps; complete the canvas before committing to phased build.',
};

const CATEGORY_TITLE: Record<keyof ProjectScores, string> = {
  landFit: 'Land Fit',
  water: 'Water',
  regulation: 'Regulation',
  access: 'Access',
  financial: 'Financial Reality',
  designCompleteness: 'Design Completeness',
};

function buildScore(
  key: keyof ProjectScores,
  value: number,
  contributingTiers: ConfidenceTier[],
): Score {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return {
    category: CATEGORY_TITLE[key],
    value: clamped,
    label: valueLabel(clamped),
    meaning: MEANING[key](clamped),
    confidence: weakestTier(contributingTiers),
  };
}

/** Average a set of scores, ignoring undefined entries. Returns null when
 *  every input is undefined so callers can fall back to "Insufficient
 *  Data" instead of synthesising a zero. */
function avgScore(...rs: Array<ScoredResult | undefined>): { value: number; tiers: ConfidenceTier[] } | null {
  const present = rs.filter((r): r is ScoredResult => r !== undefined && Number.isFinite(r.score));
  if (present.length === 0) return null;
  const value = present.reduce((acc, r) => acc + r.score, 0) / present.length;
  return { value, tiers: present.map((r) => tierOf(r.confidence)) };
}

function singleScore(r: ScoredResult | undefined): { value: number; tiers: ConfidenceTier[] } | null {
  if (!r || !Number.isFinite(r.score)) return null;
  return { value: r.score, tiers: [tierOf(r.confidence)] };
}

function placeholderScore(key: keyof ProjectScores): Score {
  return {
    category: CATEGORY_TITLE[key],
    value: 0,
    label: 'Insufficient Data',
    meaning:
      'Run the Tier-1 layer fetch — this score becomes available once site data is loaded.',
    confidence: 'low',
  };
}

export function adaptScoredResultsToV3(scores: ScoredResult[]): ProjectScores {
  const ag = byLabel(scores, 'Agricultural Suitability');
  const rp = byLabel(scores, 'Regenerative Potential');
  const sr = byLabel(scores, 'Stewardship Readiness');
  const water = byLabel(scores, 'Water Resilience');
  const habitat = byLabel(scores, 'Habitat Sensitivity');
  const build = byLabel(scores, 'Buildability');
  const community = byLabel(scores, 'Community Suitability');
  const complexity = byLabel(scores, 'Design Complexity');

  const landFitAgg = avgScore(ag, rp, sr);
  const waterAgg = singleScore(water);
  const regAgg = singleScore(habitat);
  const accessAgg = singleScore(build);
  const financialAgg = singleScore(community);
  // Design Complexity inverts: 100 − complexity ≈ completeness.
  const completenessAgg = complexity
    ? { value: 100 - complexity.score, tiers: [tierOf(complexity.confidence)] }
    : null;

  return {
    landFit: landFitAgg
      ? buildScore('landFit', landFitAgg.value, landFitAgg.tiers)
      : placeholderScore('landFit'),
    water: waterAgg
      ? buildScore('water', waterAgg.value, waterAgg.tiers)
      : placeholderScore('water'),
    regulation: regAgg
      ? buildScore('regulation', regAgg.value, regAgg.tiers)
      : placeholderScore('regulation'),
    access: accessAgg
      ? buildScore('access', accessAgg.value, accessAgg.tiers)
      : placeholderScore('access'),
    financial: financialAgg
      ? buildScore('financial', financialAgg.value, financialAgg.tiers)
      : placeholderScore('financial'),
    designCompleteness: completenessAgg
      ? buildScore('designCompleteness', completenessAgg.value, completenessAgg.tiers)
      : placeholderScore('designCompleteness'),
  };
}

const VERDICT_TABLE: Array<{ min: number; status: VerdictStatus; label: string }> = [
  { min: 80, status: 'strong', label: 'Strong' },
  { min: 65, status: 'supported', label: 'Supported' },
  { min: 50, status: 'supported-with-fixes', label: 'Supported with Required Fixes' },
  { min: 35, status: 'conditional', label: 'Conditional' },
  { min: 20, status: 'at-risk', label: 'At Risk' },
  { min: 0, status: 'blocked', label: 'Blocked' },
];

/** Synthesize the headline verdict from the v2 overall score. The summary
 *  text is brief — pages can override when they have richer narrative. */
export function adaptVerdict(overallScore: number, scores: ProjectScores): Verdict {
  const clamped = Math.max(0, Math.min(100, Math.round(overallScore)));
  const row = VERDICT_TABLE.find((r) => clamped >= r.min) ?? VERDICT_TABLE[VERDICT_TABLE.length - 1]!;
  // Identify the weakest of the v3 6 categories (excluding placeholders) so
  // the summary points at the actual load-bearing constraint.
  const weakest = (Object.entries(scores) as Array<[keyof ProjectScores, Score]>)
    .filter(([, s]) => s.label !== 'Insufficient Data')
    .sort(([, a], [, b]) => a.value - b.value)[0];
  const constraintHint = weakest
    ? ` ${CATEGORY_TITLE[weakest[0]]} is the weakest dimension at ${weakest[1].value}.`
    : '';
  return {
    status: row.status,
    label: row.label,
    score: clamped,
    scoreLabel: 'Overall Fit',
    summary: `Overall fit is ${row.label.toLowerCase()} (${clamped}/100).${constraintHint}`,
  };
}
