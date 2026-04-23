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
 *   produces the 14 expected ScoredResult labels for a realistic layer set
 *   (8 weighted scores + 3 §5 water-resilience sub-scores + FAO + USDA LCC).
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
  {
    // §5 sub-scores consume watershed_derived (pond/swale counts, runoff,
    // detention area, drainage-density class); fixture exercises each
    // Water-Retention / Drought-Resilience / Storm-Resilience component.
    layerType: 'watershed_derived',
    fetchStatus: 'complete',
    confidence: 'medium',
    dataDate: '2026-04-01',
    sourceApi: 'Tier3Pipeline',
    attribution: 'ogden-atlas tier3',
    summary: {
      runoff: { maxAccumulation: 180, meanAccumulation: 22, highConcentrationPct: 3.2 },
      flood: { detentionZoneCount: 2, detentionAreaPct: 3.1 },
      drainageDivides: { divideCount: 4, divideCellPct: 5.5 },
      drainageDensity: { drainageDensityKmPerKm2: 0.9, drainageDensityClass: 'Moderate' },
      pondCandidates: { candidateCount: 3 },
      swaleCandidates: { candidateCount: 6 },
      confidence: 'medium',
      dataSources: ['tier3-pipeline'],
    },
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

  banner(`ALL ${scores.length} SCORES`);
  for (const s of scores) {
    const score = typeof s.score === 'number' ? s.score.toFixed(1) : 'n/a';
    console.log(`  ${s.label.padEnd(30)} ${score.padStart(6)}   [${s.confidence}]`);
  }

  // Sanity: assert the three §5 sub-scores are present (non-trivially exercised
  // by the watershed_derived fixture above — a missing one means regression).
  const requiredSub = ['Water Retention', 'Drought Resilience', 'Storm Resilience'];
  const missing = requiredSub.filter((l) => !scores.some((s) => s.label === l));
  if (missing.length) {
    console.error(`  MISSING §5 sub-scores: ${missing.join(', ')}`);
    process.exitCode = 2;
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
    // Load the same inputs the writer used: project acreage/country + all
    // complete project_layers. Run them through the shared scorer exactly as
    // SiteAssessmentWriter does, then compare to the DB's stored overall_score.
    // Any non-zero delta here is a real writer-vs-scorer divergence.
    const [project] = await sql<{ acreage: string | null; country: string }[]>`
      SELECT acreage::text, country FROM projects WHERE id = ${projectId}
    `;
    if (!project) {
      console.log(`  Project ${projectId} not found`);
      return;
    }
    const layerRows = await sql<{
      layer_type: string;
      summary_data: Record<string, unknown> | null;
      confidence: string | null;
      data_date: string | null;
      source_api: string | null;
      attribution: string | null;
    }[]>`
      SELECT layer_type, summary_data, confidence, data_date::text,
             source_api, attribution_text AS attribution
      FROM project_layers
      WHERE project_id = ${projectId} AND fetch_status = 'complete'
    `;
    const [assessment] = await sql<{ overall_score: string | null; computed_at: string }[]>`
      SELECT overall_score::text, computed_at::text
      FROM site_assessments
      WHERE project_id = ${projectId} AND is_current = true
    `;
    if (!assessment) {
      console.log(`  No is_current row for project ${projectId}`);
      return;
    }

    const normalizeConfidence = (c: string | null): 'high' | 'medium' | 'low' =>
      c === 'high' || c === 'medium' || c === 'low' ? c : 'low';
    const realLayers: MockLayerResult[] = layerRows.map((r) => ({
      layerType: r.layer_type as MockLayerResult['layerType'],
      fetchStatus: 'complete',
      confidence: normalizeConfidence(r.confidence),
      dataDate: r.data_date ?? '',
      sourceApi: r.source_api ?? '',
      attribution: r.attribution ?? '',
      summary: r.summary_data ?? {},
    } as MockLayerResult));
    const realAcreage = project.acreage !== null ? parseFloat(project.acreage) : null;
    const realScores = computeAssessmentScores(
      realLayers, realAcreage, project.country, assessment.computed_at,
    );
    const realOverall = computeOverallScore(realScores);
    const dbOverall = parseFloat(assessment.overall_score ?? '0');
    const delta = Math.abs(dbOverall - realOverall);
    console.log(`  Real-layer rescore: ${realOverall.toFixed(1)} (${layerRows.length} layers)`);
    console.log(`  DB overall_score : ${dbOverall.toFixed(1)}`);
    console.log(`  |delta|          : ${delta.toFixed(3)}`);
    if (delta <= 0.1) {
      console.log('  ✓ Writer/scorer parity within numeric(4,1) rounding threshold');
    } else {
      console.error('  ✗ Parity FAILED — writer and scorer disagree on same inputs');
      process.exitCode = 5;
    }
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
