/**
 * v2 LocalProject → v3 Project adapter (Phase 4 single-seam unlock).
 *
 * The MTC fixture stays as a deterministic dev sentinel under id `'mtc'`.
 * Every other id loads from `useProjectStore` and gets adapted into the
 * v3 view-model. Rich briefs (`diagnose`, `prove`, `operate`, `build`)
 * are deliberately left undefined for real projects — Phase 5 and Phase 6
 * populate them. Pages must empty-state when those sub-briefs are absent
 * (the v3 routing layer renders a placeholder if a brief is missing).
 *
 * Phase 4.2 (full reconciliation with `@ogden/shared/scoring`) is layered
 * on top of this adapter when the scorer's 10 labels finish their mapping
 * onto the v3 6-category `ProjectScores`. Until then we emit a single
 * shared "Insufficient data" score per slot so the type contract holds.
 */

import type { LocalProject } from '../../store/projectStore.js';
import type { SiteData } from '../../store/siteDataStore.js';
import { computeAssessmentScores, computeOverallScore } from '@ogden/shared/scoring';
import type {
  Project,
  Score,
  ProjectScores,
  Verdict,
  ConfidenceTier,
  LifecycleStage,
} from '../types.js';
import { adaptScoredResultsToV3, adaptVerdict } from './adaptScores.js';

const PLACEHOLDER_TIER: ConfidenceTier = 'low';

function placeholderScore(category: string, hint: string): Score {
  return {
    category,
    value: 0,
    label: 'Insufficient Data',
    meaning: hint,
    confidence: PLACEHOLDER_TIER,
  };
}

const DEFAULT_SCORES: ProjectScores = {
  landFit: placeholderScore(
    'Land Fit',
    'Run the Tier-1 layer fetch to populate this score.',
  ),
  water: placeholderScore(
    'Water',
    'Water resilience score requires hydrology + groundwater layers.',
  ),
  regulation: placeholderScore(
    'Regulation',
    'Regulation score requires wetlands + floodplain layers.',
  ),
  access: placeholderScore(
    'Access',
    'Access score requires infrastructure + zoning layers.',
  ),
  financial: placeholderScore(
    'Financial Reality',
    'Financial readiness is authored on the Prove brief — Phase 6.',
  ),
  designCompleteness: placeholderScore(
    'Design Completeness',
    'Design completeness is derived once the Design canvas has placements.',
  ),
};

const PLACEHOLDER_VERDICT: Verdict = {
  status: 'conditional',
  label: 'Awaiting site data',
  score: 0,
  scoreLabel: 'Overall Fit',
  summary: 'Site data is still loading or incomplete. Run the Tier-1 layer fetch to populate this verdict.',
};

/** v2 has no canonical lifecycle stage on `LocalProject` itself; that lives
 *  in the lifecycle store. Until that wiring lands we default real projects
 *  to `'observe'` so the v3 stage banner renders something sensible. */
const DEFAULT_STAGE: LifecycleStage = 'discover';

/** Cheap guard: real LocalProject acreage is in the project's preferred unit
 *  (`metric` → ha, `imperial` → ac). v3 carries the unit alongside the value
 *  so downstream pages render the right suffix. */
function unitOf(p: LocalProject): 'ac' | 'ha' {
  return p.units === 'imperial' ? 'ac' : 'ha';
}

/** Pull a parcel boundary Polygon out of the v2 FeatureCollection if one
 *  exists. v3 only consumes the first polygon — multi-polygon parcels are a
 *  Phase 5 concern. */
function firstPolygon(p: LocalProject): GeoJSON.Polygon | undefined {
  const fc = p.parcelBoundaryGeojson;
  if (!fc || fc.type !== 'FeatureCollection') return undefined;
  for (const f of fc.features) {
    if (f.geometry?.type === 'Polygon') return f.geometry;
  }
  return undefined;
}

/** Phase 4.2: derive real `ProjectScores` + `Verdict` from the shared
 *  scoring engine when the project has at least one `complete` Tier-1
 *  layer in `useSiteDataStore`. Returns `null` when site data isn't ready
 *  yet so the caller can fall back to placeholders. */
function deriveScoresFromSiteData(
  p: LocalProject,
  siteData: SiteData | undefined,
): { scores: ProjectScores; verdict: Verdict; readinessConfidence: ConfidenceTier } | null {
  if (!siteData || siteData.status !== 'complete') return null;
  const completeLayers = siteData.layers.filter((l) => l.fetchStatus === 'complete');
  if (completeLayers.length === 0) return null;

  const acreage = p.acreage ?? null;
  const computed = computeAssessmentScores(siteData.layers, acreage, p.country);
  const scores = adaptScoredResultsToV3(computed);
  const overall = computeOverallScore(computed);
  const verdict = adaptVerdict(overall, scores);

  // Roll readiness confidence as the weakest of the v3 scores that
  // actually carry data — matches the rollup rule used elsewhere.
  const tiersWithData = (Object.values(scores) as Score[])
    .filter((s) => s.label !== 'Insufficient Data')
    .map((s) => s.confidence);
  const readinessConfidence: ConfidenceTier =
    tiersWithData.length === 0
      ? 'low'
      : tiersWithData.includes('low')
        ? 'low'
        : tiersWithData.includes('mixed')
          ? 'mixed'
          : tiersWithData.includes('good')
            ? 'good'
            : 'high';

  return { scores, verdict, readinessConfidence };
}

export function adaptLocalProjectToV3(p: LocalProject, siteData?: SiteData): Project {
  const polygon = firstPolygon(p);
  const derived = deriveScoresFromSiteData(p, siteData);
  return {
    id: p.id,
    name: p.name,
    shortLabel: p.name.slice(0, 4).toUpperCase(),
    stage: DEFAULT_STAGE,
    location: {
      region: p.provinceState ? `${p.provinceState}, ${p.country}` : p.country,
      country: p.country,
      acreage: p.acreage ?? 0,
      acreageUnit: unitOf(p),
      ...(polygon ? { boundary: polygon } : {}),
    },
    verdict: derived ? derived.verdict : PLACEHOLDER_VERDICT,
    summary:
      p.description ??
      p.visionStatement ??
      'Project shell — site data and design intent populate over the lifecycle.',
    scores: derived ? derived.scores : DEFAULT_SCORES,
    blockers: [],
    actions: [],
    activity: [],
    readiness: {
      landFit: derived?.scores.landFit.confidence ?? PLACEHOLDER_TIER,
      designCompleteness:
        derived?.scores.designCompleteness.confidence ?? PLACEHOLDER_TIER,
      opsBurden: 'light',
      capitalBurden: 'light',
      confidence: derived?.readinessConfidence ?? PLACEHOLDER_TIER,
    },
    // Rich briefs intentionally omitted — Phase 5 & 6 populate
    // diagnose / prove / operate / build from real stores.
  };
}
