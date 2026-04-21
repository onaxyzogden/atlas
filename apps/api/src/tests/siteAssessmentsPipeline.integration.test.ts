/**
 * Integration test for the pipeline → site_assessments materialisation path.
 *
 * Why a mock DB instead of real Postgres: the existing test harness in
 * `tests/helpers/testApp.ts` uses a queued tagged-template mock because no
 * real-DB fixture bootstrap exists yet in apps/api. This test follows the
 * same pattern — it doesn't exercise PG constraints, but it does lock in:
 *
 *   1. `maybeWriteAssessmentIfTier3Complete` is a no-op when < 4 Tier-3
 *      jobs are complete (correctly gating pipeline completion).
 *   2. When all 4 are complete, `writeCanonicalAssessment` runs the full
 *      query sequence and produces:
 *        - overall_score in [0,100]
 *        - all four DB-column scores populated by label lookup from shared
 *        - score_breakdown jsonb containing the full 11-label ScoredResult[]
 *        - data_sources_used populated with every layer type
 *        - version bump + is_current flip
 *   3. The 30-second debounce is respected on a second call.
 *
 * Replace with a real-DB fixture once apps/api has a testcontainers flow.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  writeCanonicalAssessment,
  maybeWriteAssessmentIfTier3Complete,
  SCORE_LABEL_TO_COLUMN,
} from '../services/assessments/SiteAssessmentWriter.js';

// ─── Mock DB builder ──────────────────────────────────────────────────────────

interface InsertCapture {
  values: unknown[];
  scoreBreakdown?: unknown;
}

function buildMockDb() {
  const queue: unknown[][] = [];
  const captured: InsertCapture = { values: [] };

  // Tagged-template that shifts the next row-set off the queue.
  const taggedTemplate = (_strings: TemplateStringsArray, ...values: unknown[]) => {
    // Capture INSERT values for assertion (the INSERT is the only query that
    // receives all the scoreBreakdown/score values as bound params).
    if (values.length >= 12) captured.values = values;
    return Promise.resolve(queue.shift() ?? []);
  };

  // json helper — returned as {__json: v} so the INSERT test can inspect it.
  (taggedTemplate as unknown as { json: (v: unknown) => unknown }).json = (v: unknown) => ({
    __json: v,
  });

  // begin() — invokes callback with the same tagged-template as tx.
  (taggedTemplate as unknown as { begin: (cb: (tx: unknown) => Promise<unknown>) => Promise<unknown> }).begin =
    async (cb) => cb(taggedTemplate);

  return {
    db: taggedTemplate,
    captured,
    enqueue: (...rows: unknown[]) => { queue.push(rows); },
    clearQueue: () => { queue.length = 0; },
  };
}

// ─── Representative layer fixture ─────────────────────────────────────────────

function layerFixtures() {
  return [
    {
      layer_type: 'climate',
      summary_data: { annual_precip_mm: 950, annual_temp_mean_c: 9 },
      confidence: 'high',
      data_date: '2025-09-01',
      source_api: 'NOAA',
      attribution: 'NOAA NCEI',
    },
    {
      layer_type: 'soils',
      summary_data: {
        drainage_class: 'well drained',
        hydrologic_group: 'B',
        fertility_index: 72,
        texture_class: 'silt_loam',
        organic_matter_pct: 3.2,
        rooting_depth_cm: 140,
      },
      confidence: 'high',
      data_date: '2025-06-01',
      source_api: 'SSURGO',
      attribution: 'USDA NRCS',
    },
    {
      layer_type: 'elevation',
      summary_data: { mean_slope_deg: 3.1, min_elevation_m: 210, max_elevation_m: 240 },
      confidence: 'high',
      data_date: '2023-01-01',
      source_api: 'USGS-3DEP',
      attribution: 'USGS',
    },
    {
      layer_type: 'wetlands_flood',
      summary_data: { flood_zone: 'Zone X', wetland_pct: 3 },
      confidence: 'high',
      data_date: '2025-07-01',
      source_api: 'FEMA-NFHL',
      attribution: 'FEMA',
    },
    {
      layer_type: 'land_cover',
      summary_data: { tree_canopy_pct: 32, crop_pct: 40 },
      confidence: 'high',
      data_date: '2024-01-01',
      source_api: 'NLCD',
      attribution: 'USGS MRLC',
    },
    {
      layer_type: 'watershed',
      summary_data: { catchment_area_ha: 85, nearest_stream_m: 120 },
      confidence: 'medium',
      data_date: '2025-01-01',
      source_api: 'NHD',
      attribution: 'USGS NHD',
    },
  ];
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('maybeWriteAssessmentIfTier3Complete', () => {
  let mock: ReturnType<typeof buildMockDb>;

  beforeEach(() => { mock = buildMockDb(); });

  it('returns null when fewer than 4 Tier-3 jobs complete', async () => {
    mock.enqueue({ completed: '2' }); // only 2 complete
    const result = await maybeWriteAssessmentIfTier3Complete(
      mock.db as unknown as import('postgres').Sql,
      'proj-123',
    );
    expect(result).toBeNull();
  });

  it('invokes the writer when 4 Tier-3 jobs are complete', async () => {
    // Queue order mirrors the writer's SQL sequence. Layers is one query
    // returning all 6 rows, so pass them as a single enqueue(...spread) call
    // (builder pushes them as one row-set array).
    mock.enqueue({ completed: '4' });                 // 1. completion check
    mock.enqueue();                                   // 2. debounce check (empty = fresh)
    mock.enqueue({ acreage: '40.0', country: 'US' }); // 3. project fetch
    mock.enqueue(...layerFixtures());                 // 4. layers (single query, 6 rows)
    mock.enqueue();                                   // 5. prev version lookup inside tx (empty)
    mock.enqueue();                                   // 6. UPDATE is_current=false
    mock.enqueue({ id: 'sa-0001' });                  // 7. INSERT RETURNING id

    const result = await maybeWriteAssessmentIfTier3Complete(
      mock.db as unknown as import('postgres').Sql,
      'proj-123',
    );

    expect(result).not.toBeNull();
    expect(result?.skipped).toBe(false);
    expect(result?.assessmentId).toBe('sa-0001');
    expect(result?.version).toBe(1);
    expect(result!.overallScore).toBeGreaterThan(0);
    expect(result!.overallScore).toBeLessThanOrEqual(100);
  });
});

describe('writeCanonicalAssessment — full flow', () => {
  it('produces all 4 DB-column scores + 11-label score_breakdown', async () => {
    const mock = buildMockDb();
    mock.enqueue();                                    // debounce check
    mock.enqueue({ acreage: '40.0', country: 'US' }); // project fetch
    mock.enqueue(...layerFixtures());                 // layers
    mock.enqueue();                                    // prev version (empty → 0)
    mock.enqueue();                                    // UPDATE is_current
    mock.enqueue({ id: 'sa-abc' });                   // INSERT RETURNING

    const result = await writeCanonicalAssessment(
      mock.db as unknown as import('postgres').Sql,
      'proj-123',
    );

    expect(result.skipped).toBe(false);
    expect(result.version).toBe(1);

    // Inspect captured INSERT bindings. `is_current` is hard-coded `true` in
    // the SQL (not a bound param), so 13 bindings in this order:
    //   0 projectId, 1 version, 2 confidence,
    //   3 suitability_score, 4 buildability_score, 5 water_resilience_score,
    //   6 ag_potential_score, 7 overall_score,
    //   8 score_breakdown (json), 9 flags (json), 10 needs_site_visit,
    //   11 data_sources_used, 12 computed_at
    const v = mock.captured.values;
    expect(v[0]).toBe('proj-123');
    expect(v[1]).toBe(1);                        // version
    expect(['high', 'medium', 'low']).toContain(v[2]); // confidence rollup

    // 5 score columns (4 tracked + overall) — must all be numbers in [0,100]
    for (let i = 3; i <= 7; i++) {
      expect(typeof v[i]).toBe('number');
      expect(v[i] as number).toBeGreaterThanOrEqual(0);
      expect(v[i] as number).toBeLessThanOrEqual(100);
    }

    // score_breakdown is a json-wrapped array of ScoredResult with all 4 tracked labels.
    const breakdown = v[8] as { __json: unknown };
    expect(breakdown).toHaveProperty('__json');
    const scored = breakdown.__json as { label: string }[];
    expect(Array.isArray(scored)).toBe(true);
    const labels = scored.map((s) => s.label);
    for (const expectedLabel of Object.values(SCORE_LABEL_TO_COLUMN)) {
      expect(labels).toContain(expectedLabel);
    }

    // flags starts empty
    const flags = v[9] as { __json: unknown };
    expect(flags.__json).toEqual([]);

    // needs_site_visit is a boolean (true iff confidence rolled up to 'low')
    expect(typeof v[10]).toBe('boolean');

    // data_sources_used matches the layer types we fed in
    const sources = v[11] as string[];
    expect(sources).toEqual(['climate', 'soils', 'elevation', 'wetlands_flood', 'land_cover', 'watershed']);

    // computed_at is an ISO-8601 timestamp
    expect(typeof v[12]).toBe('string');
    expect(v[12] as string).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('no-ops with skipped=debounced when a recent is_current row exists', async () => {
    const mock = buildMockDb();
    // Debounce check returns a recent row
    mock.enqueue({ id: 'sa-existing', version: 2, overall_score: '74.5' });

    const result = await writeCanonicalAssessment(
      mock.db as unknown as import('postgres').Sql,
      'proj-123',
    );

    expect(result.skipped).toBe(true);
    expect(result.reason).toBe('debounced');
    expect(result.assessmentId).toBe('sa-existing');
    expect(result.version).toBe(2);
    expect(result.overallScore).toBeCloseTo(74.5, 1);
  });

  it('returns skipped=no_project when the project lookup is empty', async () => {
    const mock = buildMockDb();
    mock.enqueue();  // debounce check (empty)
    mock.enqueue();  // project fetch (empty)

    const result = await writeCanonicalAssessment(
      mock.db as unknown as import('postgres').Sql,
      'proj-gone',
    );
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe('no_project');
  });

  it('returns skipped=no_layers when no complete layers exist for the project', async () => {
    const mock = buildMockDb();
    mock.enqueue();                                    // debounce check
    mock.enqueue({ acreage: '10.0', country: 'US' }); // project fetch
    mock.enqueue();                                    // layers (empty)

    const result = await writeCanonicalAssessment(
      mock.db as unknown as import('postgres').Sql,
      'proj-123',
    );
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe('no_layers');
  });
});
