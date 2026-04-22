/**
 * SiteAssessmentWriter — persists a canonical `site_assessments` row for a
 * project after its Tier-3 pipeline completes.
 *
 * Responsibilities (post migration 009, 2026-04-21):
 *
 *   1. Read `project_layers.summary_data` + project acreage/country.
 *   2. Adapt DB LayerRows to the `MockLayerResult[]` shape the shared scorer
 *      expects (pure function: `layerRowsToMockLayers`).
 *   3. Call `computeAssessmentScores(...)` from `@ogden/shared/scoring` with
 *      a pipeline-timestamp `computedAt` (deterministic for tests).
 *   4. Persist the full `ScoredResult[]` into `score_breakdown` jsonb (source
 *      of truth for all per-label scores).
 *   5. Denormalise `overall_score` via `computeOverallScore(scores)` for cheap
 *      sorts/indexes.
 *   6. Roll up `confidence` across all ScoredResults (weakest wins).
 *   7. In one transaction: flip existing `is_current = false`; INSERT new row
 *      with bumped version.
 *
 * The legacy 4-column projection (suitability_score, buildability_score,
 * water_resilience_score, ag_potential_score) was dropped in migration 009 —
 * `score_breakdown` is now canonical. Label-based column plucking is gone;
 * renames inside the shared scorer no longer break the writer.
 */

import pino from 'pino';
import type postgres from 'postgres';
import {
  computeAssessmentScores,
  computeOverallScore,
  validateLayerSummary,
  type MockLayerResult,
  type ScoredResult,
} from '@ogden/shared/scoring';
import type { LayerType } from '@ogden/shared';

const logger = pino({ name: 'SiteAssessmentWriter' });

// ─── Types ────────────────────────────────────────────────────────────────────

type Confidence = 'high' | 'medium' | 'low';

export interface AssessmentWriteResult {
  assessmentId: string;
  version: number;
  overallScore: number;
  skipped: boolean;
  reason?: string;
}

interface LayerRow {
  layer_type: string;
  summary_data: Record<string, unknown> | null;
  confidence: string | null;
  data_date: string | null;
  source_api: string | null;
  attribution: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEBOUNCE_MS = 30_000;

// ─── Adapter: DB LayerRow[] → MockLayerResult[] (scorer input) ───────────────

function normalizeConfidence(c: string | null): Confidence {
  if (c === 'high' || c === 'medium' || c === 'low') return c;
  return 'low';
}

/**
 * Pure adapter — project_layers rows → MockLayerResult[] accepted by the
 * shared scorer. Missing optional metadata (dataDate/sourceApi/attribution)
 * falls back to sentinel strings; the scorer only reads `layerType`,
 * `summary`, and `confidence`, so the sentinels never affect scoring.
 *
 * Runtime validation: every row's `summary_data` passes through
 * `validateLayerSummary` so stale jsonb (e.g. rows persisted before the
 * 2026-04-21 null-over-sentinel normalization) can't inject strings like
 * `'N/A'` into slots the compile-time type claims are `number | null`.
 * Invalid fields are coerced to `null` (scorer already tolerates nulls)
 * and logged for telemetry. The layer itself is never dropped — partial
 * data still scores better than no data.
 */
export function layerRowsToMockLayers(
  rows: LayerRow[],
  opts: { projectId?: string } = {},
): MockLayerResult[] {
  return rows.map((r) => {
    const layerType = r.layer_type as LayerType;
    const result = validateLayerSummary(layerType, r.summary_data);
    const summary = result.ok ? result.summary : (r.summary_data ?? {});
    if (result.ok && result.coercions.length > 0) {
      logger.warn(
        {
          projectId: opts.projectId,
          layerType,
          coercions: result.coercions,
        },
        'Stale layer summary — coerced invalid fields to null',
      );
    }
    return {
      layerType,
      fetchStatus: 'complete' as const,
      confidence: normalizeConfidence(r.confidence),
      dataDate: r.data_date ?? '',
      sourceApi: r.source_api ?? '',
      attribution: r.attribution ?? '',
      summary,
    };
  });
}

// ─── Rollup helpers ───────────────────────────────────────────────────────────

/**
 * Roll up confidence across all ScoredResults. Rule: `min(confidences)` where
 * high > medium > low. Applied to every ScoredResult emitted by the shared
 * scorer (all 10 labels, not just a subset), so overall confidence reflects
 * the weakest contributing layer across the full assessment.
 */
function rollupConfidence(scores: ScoredResult[]): Confidence {
  const confs = scores.map((s) => s.confidence);
  if (confs.length === 0) return 'low';
  if (confs.some((c) => c === 'low')) return 'low';
  if (confs.every((c) => c === 'high')) return 'high';
  return 'medium';
}

/** Clamp to [0,100] with one-decimal rounding for pg numeric(4,1). */
function clampScore(n: number): number {
  return Math.round(Math.max(0, Math.min(100, n)) * 10) / 10;
}

// ─── Writer ───────────────────────────────────────────────────────────────────

/**
 * Compute and persist a canonical SiteAssessment row for a project.
 *
 * Idempotency: if an existing `is_current = true` row was written within the
 * last DEBOUNCE_MS milliseconds, this is a no-op (skipped=true). Protects
 * against all four Tier-3 workers independently firing the writer when the
 * last one completes.
 *
 * Invariant: `overall_score` is always `computeOverallScore(score_breakdown)`
 * — both are written together inside a single transaction from the same
 * scorer output. Zero drift possible.
 */
export async function writeCanonicalAssessment(
  db: postgres.Sql,
  projectId: string,
): Promise<AssessmentWriteResult> {
  // 1. Idempotency guard — debounce rapid-fire post-pipeline calls.
  const recentRows = await db<{ id: string; version: number; overall_score: string | null }[]>`
    SELECT id, version, overall_score::text
    FROM site_assessments
    WHERE project_id = ${projectId}
      AND is_current = true
      AND computed_at > now() - (${DEBOUNCE_MS}::bigint || ' milliseconds')::interval
  `;
  if (recentRows.length > 0) {
    const row = recentRows[0]!;
    logger.info({ projectId, assessmentId: row.id }, 'Skipping assessment write — debounced');
    return {
      assessmentId: row.id,
      version: row.version,
      overallScore: parseFloat(row.overall_score ?? '0'),
      skipped: true,
      reason: 'debounced',
    };
  }

  // 2. Load project metadata (acreage, country) for the scorer.
  const [project] = await db<{ acreage: string | null; country: string }[]>`
    SELECT acreage::text, country
    FROM projects
    WHERE id = ${projectId}
  `;
  if (!project) {
    logger.warn({ projectId }, 'Project not found — cannot compute assessment');
    return { assessmentId: '', version: 0, overallScore: 0, skipped: true, reason: 'no_project' };
  }
  const acreage = project.acreage !== null ? parseFloat(project.acreage) : null;
  const country = project.country;

  // 3. Load all project layer summaries.
  const layerRows = await db<LayerRow[]>`
    SELECT layer_type, summary_data, confidence, data_date::text, source_api, attribution
    FROM project_layers
    WHERE project_id = ${projectId}
      AND fetch_status = 'complete'
  `;
  if (layerRows.length === 0) {
    logger.warn({ projectId }, 'No complete layers — cannot compute assessment');
    return { assessmentId: '', version: 0, overallScore: 0, skipped: true, reason: 'no_layers' };
  }

  // 4. Adapt to scorer input + compute.
  const mockLayers = layerRowsToMockLayers(layerRows, { projectId });
  const computedAt = new Date().toISOString();
  const scores = computeAssessmentScores(mockLayers, acreage, country, computedAt);

  // 5. Denormalise overall + roll up confidence (no per-label plucking — the
  //    full ScoredResult[] goes into score_breakdown as source of truth).
  const overall = clampScore(computeOverallScore(scores));
  const overallConfidence = rollupConfidence(scores);
  const dataSourcesUsed = layerRows.map((r) => r.layer_type);

  // 6. Transactional write — flip is_current, INSERT new row with bumped version.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inserted = await db.begin(async (tx: any) => {
    const [prev] = await tx<{ version: number }[]>`
      SELECT version
      FROM site_assessments
      WHERE project_id = ${projectId}
      ORDER BY version DESC
      LIMIT 1
    `;
    const nextVersion = (prev?.version ?? 0) + 1;

    await tx`
      UPDATE site_assessments
      SET is_current = false
      WHERE project_id = ${projectId} AND is_current = true
    `;

    const rows = await tx<{ id: string }[]>`
      INSERT INTO site_assessments (
        project_id, version, is_current, confidence,
        overall_score,
        score_breakdown, flags, needs_site_visit, data_sources_used, computed_at
      ) VALUES (
        ${projectId},
        ${nextVersion},
        true,
        ${overallConfidence},
        ${overall},
        ${tx.json(scores) as unknown as string},
        ${tx.json([]) as unknown as string},
        ${overallConfidence === 'low'},
        ${dataSourcesUsed},
        ${computedAt}
      )
      RETURNING id
    `;

    return { id: rows[0]!.id, version: nextVersion };
  });

  logger.info(
    { projectId, assessmentId: inserted.id, version: inserted.version, overall },
    'Wrote canonical site assessment',
  );

  return {
    assessmentId: inserted.id,
    version: inserted.version,
    overallScore: overall,
    skipped: false,
  };
}

/**
 * Check whether all four Tier-3 jobs for a project are complete, and if so,
 * invoke the writer. Intended to be called from the tail of each Tier-3
 * worker's success path. The writer itself is idempotent, so multiple
 * workers racing to the finish line is safe.
 */
export async function maybeWriteAssessmentIfTier3Complete(
  db: postgres.Sql,
  projectId: string,
): Promise<AssessmentWriteResult | null> {
  const rows = await db<{ completed: string }[]>`
    SELECT count(*)::text AS completed
    FROM data_pipeline_jobs
    WHERE project_id = ${projectId}
      AND status = 'complete'
      AND job_type IN ('compute_terrain', 'compute_microclimate', 'compute_watershed', 'compute_soil_regeneration')
  `;
  const completed = parseInt(rows[0]?.completed ?? '0', 10);
  if (completed < 4) return null;

  return writeCanonicalAssessment(db, projectId);
}
