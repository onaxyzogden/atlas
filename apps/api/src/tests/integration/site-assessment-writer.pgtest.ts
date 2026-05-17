/**
 * site-assessment-writer.pgtest.ts — locks the single-`is_current` invariant,
 * the 30 s debounce, and overall_score == computeOverallScore(score_breakdown)
 * under a REAL `db.begin` transaction. The mock's `db.begin = cb => cb(mockDb)`
 * cannot reproduce transactional visibility or the version flip.
 *
 * `writeCanonicalAssessment` is pure (takes `db` as a param, no config
 * import) so a static import here is safe per the harness hard rule.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import type postgres from 'postgres';
import { computeOverallScore, type ScoredResult } from '@ogden/shared/scoring';
import { writeCanonicalAssessment } from '../../services/assessments/SiteAssessmentWriter.js';
import { INTEGRATION_ENABLED, getHarness, resetDb, closeHarness } from './harness.js';
import { seedUser, seedProject, seedCompleteLayer } from './fixtures.js';

const clampScore = (n: number) => Math.round(Math.max(0, Math.min(100, n)) * 10) / 10;

describe.skipIf(!INTEGRATION_ENABLED)('writeCanonicalAssessment (real PostGIS tx)', () => {
  let sql: postgres.Sql;

  beforeAll(async () => { ({ sql } = await getHarness()); await resetDb(sql); });
  afterEach(async () => { await resetDb(sql); });
  afterAll(async () => { await closeHarness(); });

  it('versions assessments and keeps exactly one is_current row', async () => {
    const ownerId = await seedUser(sql);
    const projectId = await seedProject(sql, ownerId, { acreage: 120, country: 'US' });
    await seedCompleteLayer(sql, projectId, 'climate', { koppen: 'Dfb' });
    await seedCompleteLayer(sql, projectId, 'soils', { drainageClass: 'well' });

    const r1 = await writeCanonicalAssessment(sql, projectId);
    expect(r1.skipped).toBe(false);
    expect(r1.version).toBe(1);

    // Immediate re-call → debounced (within 30 s window).
    const rDebounced = await writeCanonicalAssessment(sql, projectId);
    expect(rDebounced.skipped).toBe(true);
    expect(rDebounced.reason).toBe('debounced');

    // Age the current row past the debounce window, then re-write.
    await sql`
      UPDATE site_assessments
      SET computed_at = computed_at - interval '31 seconds'
      WHERE project_id = ${projectId} AND is_current = true
    `;
    const r2 = await writeCanonicalAssessment(sql, projectId);
    expect(r2.skipped).toBe(false);
    expect(r2.version).toBe(2);

    const rows = await sql<{
      version: number; is_current: boolean; overall_score: string | null;
      score_breakdown: ScoredResult[];
    }[]>`
      SELECT version, is_current, overall_score::text, score_breakdown
      FROM site_assessments WHERE project_id = ${projectId} ORDER BY version
    `;
    expect(rows.map((r) => r.is_current)).toEqual([false, true]);
    const current = rows.find((r) => r.is_current)!;
    expect(current.version).toBe(2);

    // Invariant: stored overall_score is the clamped computeOverallScore of
    // the stored breakdown — recomputed independently from jsonb.
    const expected = clampScore(computeOverallScore(current.score_breakdown));
    expect(parseFloat(current.overall_score!)).toBeCloseTo(expected, 1);
  });

  it('skips with no_layers / no_project on empty inputs', async () => {
    const ownerId = await seedUser(sql);
    const emptyProject = await seedProject(sql, ownerId);

    const noLayers = await writeCanonicalAssessment(sql, emptyProject);
    expect(noLayers.skipped).toBe(true);
    expect(noLayers.reason).toBe('no_layers');

    const noProject = await writeCanonicalAssessment(sql, crypto.randomUUID());
    expect(noProject.skipped).toBe(true);
    expect(noProject.reason).toBe('no_project');
  });
});
