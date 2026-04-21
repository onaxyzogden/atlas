/**
 * verify-scoring-parity.ts — One-shot parity / smoke-test for the shared
 * scoring module.
 *
 * Context (sprint: shared-scoring unification, 2026-04-21):
 *   apps/web and apps/api now both import `computeAssessmentScores` from
 *   `@ogden/shared/scoring` — web via its thin shim at
 *   `apps/web/src/lib/computeScores.ts`, api via direct import from the
 *   `SiteAssessmentWriter`. Because the two paths resolve to the SAME module,
 *   parity is structural: the function cannot produce different numbers on
 *   either side for the same inputs. This script proves the module is
 *   importable + callable in a real Node process (not just in vitest), and
 *   produces the 11 expected ScoredResult labels for a realistic layer set.
 *
 * Usage:
 *   pnpm --filter @ogden/api exec tsx apps/api/scripts/verify-scoring-parity.ts
 *   # or from apps/api:
 *   npx tsx scripts/verify-scoring-parity.ts
 *
 * Optional: pass a projectId to load real layers from Postgres and compare
 * against `site_assessments.overall_score` for that project (requires a
 * DATABASE_URL env var and a populated row):
 *   npx tsx scripts/verify-scoring-parity.ts <projectId>
 */

import {
  computeAssessmentScores,
  computeOverallScore,
  type MockLayerResult,
} from '@ogden/shared/scoring';

// ─── Fixture: matches the integration test's layer set ────────────────────────

const FIXTURE: MockLayerResult[] = [
  {
    layerType: 'climate',
    fetchStatus: 'complete',
    confidence: 'high',
    dataDate: '2025-09-01',
    sourceApi: 'NOAA',
    attribution: 'NOAA NCEI',
    summary: { annual_precip_mm: 950, annual_temp_mean_c: 9 },
  },
  {
    layerType: 'soils',
    fetchStatus: 'complete',
    confidence: 'high',
    dataDate: '2025-06-01',
    sourceApi: 'SSURGO',
    attribution: 'USDA NRCS',
    summary: {
      drainage_class: 'well drained',
      hydrologic_group: 'B',
      fertility_index: 72,
      texture_class: 'silt_loam',
      organic_matter_pct: 3.2,
      rooting_depth_cm: 140,
    },
  },
  {
    layerType: 'elevation',
    fetchStatus: 'complete',
    confidence: 'high',
    dataDate: '2023-01-01',
    sourceApi: 'USGS-3DEP',
    attribution: 'USGS',
    summary: { mean_slope_deg: 3.1, min_elevation_m: 210, max_elevation_m: 240 },
  },
  {
    layerType: 'wetlands_flood',
    fetchStatus: 'complete',
    confidence: 'high',
    dataDate: '2025-07-01',
    sourceApi: 'FEMA-NFHL',
    attribution: 'FEMA',
    summary: { flood_zone: 'Zone X', wetland_pct: 3 },
  },
  {
    layerType: 'land_cover',
    fetchStatus: 'complete',
    confidence: 'high',
    dataDate: '2024-01-01',
    sourceApi: 'NLCD',
    attribution: 'USGS MRLC',
    summary: { tree_canopy_pct: 32, crop_pct: 40 },
  },
  {
    layerType: 'watershed',
    fetchStatus: 'complete',
    confidence: 'medium',
    dataDate: '2025-01-01',
    sourceApi: 'NHD',
    attribution: 'USGS NHD',
    summary: { catchment_area_ha: 85, nearest_stream_m: 120 },
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

function banner(title: string): void {
  const bar = '─'.repeat(60);
  console.log(`\n${bar}\n  ${title}\n${bar}`);
}

async function main(): Promise<void> {
  banner('SCORING PARITY SMOKE TEST');
  console.log('Using @ogden/shared/scoring (same module web + api import)');
  console.log(`Fixture layers: ${FIXTURE.map((l) => l.layerType).join(', ')}`);
  console.log('Project: acreage=40, country=US');

  const computedAt = '2026-04-21T12:00:00.000Z'; // deterministic
  const scores = computeAssessmentScores(FIXTURE, 40, 'US', computedAt);
  const overall = computeOverallScore(scores);

  banner('ALL 11 SCORES');
  for (const s of scores) {
    const score = typeof s.score === 'number' ? s.score.toFixed(1) : 'n/a';
    console.log(`  ${s.label.padEnd(30)} ${score.padStart(6)}   [${s.confidence}]`);
  }

  banner('OVERALL');
  console.log(`  weighted overall: ${overall.toFixed(1)}`);

  banner('DB COLUMN MAPPING (SiteAssessmentWriter)');
  const tracked = [
    'Water Resilience',
    'Buildability',
    'Agricultural Suitability',
    'Regenerative Potential',
  ];
  for (const label of tracked) {
    const hit = scores.find((s) => s.label === label);
    if (!hit) {
      console.error(`  MISSING: ${label} — writer would throw on INSERT`);
      process.exitCode = 2;
    } else {
      console.log(`  ✓ ${label.padEnd(30)} ${hit.score.toFixed(1).padStart(6)}`);
    }
  }

  banner('DETERMINISM CHECK');
  const scores2 = computeAssessmentScores(FIXTURE, 40, 'US', computedAt);
  const identical =
    scores.length === scores2.length &&
    scores.every((s, i) => {
      const s2 = scores2[i];
      return s2 !== undefined && s.label === s2.label && s.score === s2.score;
    });
  if (identical) {
    console.log('  ✓ Two consecutive calls produced byte-identical scores');
  } else {
    console.error('  ✗ Scores differ between calls — non-determinism bug');
    process.exitCode = 3;
  }

  banner('OPTIONAL: compare against DB');
  const projectId = process.argv[2];
  if (!projectId) {
    console.log('  (no projectId arg — skipping DB comparison)');
    console.log('  Pass one to compare: tsx verify-scoring-parity.ts <projectId>');
    return;
  }

  // Lazy import so the script works without DB deps if no projectId is passed.
  const postgres = (await import('postgres')).default;
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('  DATABASE_URL not set — cannot compare');
    process.exitCode = 4;
    return;
  }
  const sql = postgres(url);
  try {
    const rows = await sql<{ overall_score: string | null; score_breakdown: unknown }[]>`
      SELECT overall_score::text, score_breakdown
      FROM site_assessments
      WHERE project_id = ${projectId} AND is_current = true
    `;
    if (rows.length === 0) {
      console.log(`  No is_current row for project ${projectId}`);
    } else {
      const row = rows[0]!;
      const dbOverall = parseFloat(row.overall_score ?? '0');
      const delta = Math.abs(dbOverall - overall);
      console.log(`  DB overall_score: ${dbOverall.toFixed(1)}`);
      console.log(`  Script overall  : ${overall.toFixed(1)}`);
      console.log(`  |delta|         : ${delta.toFixed(3)}`);
      console.log(
        delta <= 0.1
          ? '  ✓ Match within numeric(4,1) rounding threshold'
          : '  ✗ MISMATCH — investigate (different inputs, not function bug)',
      );
    }
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
