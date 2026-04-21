# 2026-04-21 — `site_assessments` schema lift: drop the 4-column score projection

**Status:** Accepted (migration 009 applied to dev DB; API tsc clean; 459/459 vitest green; web computeScores 138/138)
**Sprint:** 2026-04-21 follow-up to shared-scoring unification
**Context source:** Wiki (entities/database.md, entities/api.md, concepts/scoring-engine.md, log.md entries 2026-04-21 × 2), plan file `site-assessments-schema-lift.md`, audit `ATLAS_DEEP_AUDIT_2026-04-21.md`

---

## Context

The 2026-04-21 morning sprint unified scoring: `@ogden/shared/scoring` became
the single source of truth, consumed by both web (via a thin shim at
`apps/web/src/lib/computeScores.ts`) and the Fastify API writer at
`apps/api/src/services/assessments/SiteAssessmentWriter.ts`. The writer
persisted a v1-shaped `site_assessments` row with four dedicated numeric
columns — `suitability_score`, `buildability_score`, `water_resilience_score`,
`ag_potential_score` — alongside the full `ScoredResult[]` in `score_breakdown`
jsonb. The four columns were a **lossy projection** of the ten labels the
shared scorer emits; they came from the pre-unification schema that only
knew about four score categories.

Three facts, discovered during the parity-verification pass, reshaped the
blast radius of dropping them:

1. **Zero `site_assessments` rows existed in dev DB** (`SELECT count(*) → 0`).
   The Tier-3 pipeline has never fired to completion. No backfill required.
2. **The web UI does not consume the DB assessment at all.** `useAssessment()`
   is defined in `apps/web/src/hooks/useProjectQueries.ts:48` but has zero
   call sites. Every score the user sees is computed fresh client-side from
   `computeAssessmentScores` — same module the writer uses, different
   invocation.
3. **Latent bug in `pdf/templates/siteAssessment.ts`:** the template iterated
   `score_breakdown` as `Record<string, Record<string, number>>` (the legacy
   dict-of-dicts shape documented in the 001 DDL comment), but the new writer
   stores `ScoredResult[]`. So `Object.entries([...])` produced numeric
   section headers ("0","1","2"…) with gibberish factor tables. Invisible
   in prod only because no rows exist.

The combined signal: drop-the-columns is low-risk, gains are large (ten
labels surface instead of four, label-rename trap removed, latent PDF bug
forced into daylight), and this is the natural moment to fix the PDF.

## Decision

1. **Drop all four legacy score columns** in migration 009:
   ```sql
   ALTER TABLE site_assessments
     DROP COLUMN IF EXISTS suitability_score,
     DROP COLUMN IF EXISTS buildability_score,
     DROP COLUMN IF EXISTS water_resilience_score,
     DROP COLUMN IF EXISTS ag_potential_score;
   ```
   Safe because zero rows existed at migration time.

2. **`score_breakdown` is canonical.** Stores `ScoredResult[]` exactly as
   `computeAssessmentScores(...)` returns it. Every per-label score reads
   from this array. Column comment on the live table documents the shape
   so the next engineer does not reinvent the dict.

3. **`overall_score` stays** as a denormalised convenience column
   (cheap to index/sort). Computed via `computeOverallScore(scores)` inside
   the same writer transaction, so zero drift possible.

4. **No back-compat view.** Confirmed no external readers today (no web
   consumer, no public API client, no reports outside the in-repo PDF
   service). Adding a `site_assessments_legacy` view would be speculative
   future-proofing; skipped.

5. **Fix the PDF templates in the same PR.** `siteAssessment.ts` now iterates
   `ScoredResult[]` and renders a gauge per label + a per-component factor
   table per ScoredResult (using each result's own `score_breakdown:
   ScoreComponent[]`). `educationalBooklet.ts` rekeyed `SCORE_EXPLANATIONS`
   on label strings (`'Overall'`, `'Agricultural Suitability'`, etc.) instead
   of the old column-name stems; labels without copy render with graceful
   degradation (score + generic verdict, no flavour text) pending a
   copy-writing follow-up.

6. **Writer simplification.** `SiteAssessmentWriter.ts` lost the
   `SCORE_LABEL_TO_COLUMN` const, `scoreByLabel` helper, `scoreMap` block,
   and four redundant INSERT bindings. INSERT shrank from 13 → 9 bindings.

## Why not keep the columns "just in case"?

Counter-proposed: keep them denormalised for indexed sorts like
`ORDER BY water_resilience_score DESC`. Rejected because:

- `score_breakdown` is queryable with `jsonb_path_query` and
  `jsonb_array_elements`; sorting by arbitrary label is a few extra lines,
  not a schema cost.
- Re-adding a column later is a 10-line backfill from
  `jsonb_array_elements(score_breakdown) WITH ORDINALITY`. Low practical
  regret cost if we ever want one.
- The label-rename trap (silent NULL if a shared-scorer rename breaks the
  `as const` map) is structural, not situational. Deleting the columns
  deletes the trap.

## Out of scope (deferred follow-ups)

- **Copy-writing for the 6 labels without `SCORE_EXPLANATIONS` entries**
  (Habitat Sensitivity, Stewardship Readiness, Community Suitability,
  Design Complexity, FAO Land Suitability, USDA Land Capability). Falls
  back to generic verdict today; separate sprint adds the plain-language
  copy without touching the schema.
- **External back-compat view.** Deferred until (or if) a public-portal
  consumer activates.
- **Typed response schema for `GET /projects/:id/assessment`.** Currently
  untyped via `SELECT sa.*`; separate hygiene sprint tightens it.

## Consequences

- The PDF export now surfaces **10 label gauges + per-component factor
  tables** instead of the broken dict-of-dicts rendering. All 10 labels
  visible in the site-assessment template.
- Writer code shrinks: one less moving part, no stringly-typed label map,
  one less invariant to enforce at write time.
- DB storage narrows by 4 numeric columns (zero row impact today).
- Future shared-scorer changes propagate into the PDF + DB automatically
  via `ScoredResult[]` — no column schema to resync.
- New regression test in `apps/api/src/tests/siteAssessment.pdfTemplate.test.ts`
  locks in the correct iteration so the dict-of-dicts bug cannot return.

## Verification (2026-04-21)

- `pnpm --filter @ogden/shared exec tsc --noEmit`  → clean
- `pnpm --filter @ogden/api exec tsc --noEmit`     → clean
- `pnpm --filter @ogden/web exec tsc --noEmit`     → clean
- `pnpm --filter @ogden/api exec vitest run`       → 39 files, 459/459 passed
- `pnpm --filter @ogden/web exec vitest run computeScores` → 138/138 passed
- Migration 009 applied against dev DB; `\d+ site_assessments` confirms 4
  columns gone, column comments landed on `overall_score` + `score_breakdown`.

## Files touched

| File | Change |
|---|---|
| `apps/api/src/db/migrations/009_drop_legacy_score_columns.sql` | **NEW** — DROP COLUMN ×4 + column comments |
| `apps/api/src/services/assessments/SiteAssessmentWriter.ts` | Removed `SCORE_LABEL_TO_COLUMN`, `scoreByLabel`, `scoreMap`; INSERT 13→9 bindings; updated JSDoc |
| `apps/api/src/services/pdf/templates/index.ts` | `AssessmentRow` reshaped: drops 4 score fields, types `score_breakdown: ScoredResult[]`, `flags: AssessmentFlag[]`; imports from `@ogden/shared/scoring` + `@ogden/shared` |
| `apps/api/src/services/pdf/templates/siteAssessment.ts` | Iterates `ScoredResult[]`; gauge per label + Overall; per-component factor tables from each result's own `score_breakdown` |
| `apps/api/src/services/pdf/templates/educationalBooklet.ts` | `SCORE_EXPLANATIONS` rekeyed on label strings; iterates `ScoredResult[]` for cards; graceful-degradation fallback for labels without copy |
| `apps/api/src/services/pdf/PdfExportService.ts` | SELECT reduced to canonical columns |
| `apps/api/src/tests/SiteAssessmentWriter.test.ts` | Replaced `SCORE_LABEL_TO_COLUMN` describe block with canonical `ScoredResult[]` shape tests |
| `apps/api/src/tests/siteAssessmentsPipeline.integration.test.ts` | INSERT capture threshold 12→8; reindexed param assertions (13→9 bindings) |
| `apps/api/src/tests/siteAssessment.pdfTemplate.test.ts` | **NEW** — regression test guarding against dict-of-dicts rendering return |
