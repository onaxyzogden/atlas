# 2026-04-21 — Schema-lift migration executed: `site_assessments` loses the 4 legacy score columns


Session three of the scoring-unification arc. Executed the filed
`site-assessments-schema-lift.md` plan end-to-end: migration 009 applied to dev
DB, writer simplified, PDF templates rewritten to iterate `ScoredResult[]`,
tests updated, new regression guard filed. Full verification matrix green —
shared/api/web tsc clean, api vitest 39 files / **459/459**, web computeScores
**138/138**. Zero row-impact at migration time (verified `SELECT count(*) → 0`).

**Phase 1 — migration runner recon.** Read `apps/api/scripts/migrate.js`:
filesystem-scan over `src/db/migrations/*.sql` sorted by filename, each run via
`psql -f`. Already-applied detection by substring match on "already exists" /
"duplicate". Next available filename is `009_` (slots 001–008 are occupied);
plan had suggested `002_` which was stale. HIGH risk (registry pattern not
confirmed) retired at this point.

**Phase 2 — migration file.** `apps/api/src/db/migrations/009_drop_legacy_score_columns.sql`
— `ALTER TABLE site_assessments DROP COLUMN IF EXISTS suitability_score,
buildability_score, water_resilience_score, ag_potential_score;` plus two
`COMMENT ON COLUMN` statements documenting `score_breakdown` as canonical
`ScoredResult[]` from `@ogden/shared/scoring` and `overall_score` as
denormalised-but-in-sync-by-construction.

**Phase 3 — writer simplification.** `SiteAssessmentWriter.ts` lost
`SCORE_LABEL_TO_COLUMN` + `scoreByLabel` + the `scoreMap` plucking block. The
INSERT shrank from 13 bound params to 9 (no more per-column scores; only
projectId, version, confidence, overall_score, score_breakdown, flags,
needs_site_visit, data_sources_used, computed_at). JSDoc rewritten to
describe the post-009 responsibility set. No behaviour change for callers —
`AssessmentWriteResult` shape unchanged.

**Phase 4 — PDF templates fixed.** `templates/index.ts` `AssessmentRow`
reshaped: drop 4 score fields, type `score_breakdown: ScoredResult[] | null`
and `flags: AssessmentFlag[] | null` (imported from
`@ogden/shared/scoring` and `@ogden/shared` respectively).
`templates/siteAssessment.ts` rewritten to iterate `ScoredResult[]` — gauge
per label + `Overall`; per-component factor tables pull from each result's
own `score_breakdown: ScoreComponent[]` using `{name, value}`. The old
dict-of-dicts iteration (`Object.entries(a.score_breakdown)`) is gone; this
was the latent bug that would have rendered numeric section headers ("0",
"1", …) the moment a real row existed.
`templates/educationalBooklet.ts` rekeyed `SCORE_EXPLANATIONS` on label
strings (`'Overall'`, `'Agricultural Suitability'`, `'Buildability'`,
`'Water Resilience'`, `'Regenerative Potential'`) instead of the old
column-name stems; labels without rich copy (6 of them) render with a
graceful-degradation fallback (score + generic verdict) pending a copy-
writing follow-up. `PdfExportService.fetchAssessment` SELECT reduced to the
canonical column set.

**Phase 5 — tests.** `SiteAssessmentWriter.test.ts` dropped the
`SCORE_LABEL_TO_COLUMN` describe block (constant no longer exists) and gained
a `computeAssessmentScores — canonical shape` block: locks in that every
`ScoredResult` has `{label, score, confidence, score_breakdown: array}` and
that the 4 labels the educational-booklet template has copy for are still
emitted. `siteAssessmentsPipeline.integration.test.ts` INSERT-capture
threshold adjusted 12→8; all `v[i]` assertions reindexed for the 9-binding
INSERT; new assertions verify every `score_breakdown` element has
`{label, score, confidence, score_breakdown, computedAt}`. New file
`siteAssessment.pdfTemplate.test.ts` — regression test that renders the PDF
against a real `ScoredResult[]` from the shared scorer and asserts: (a)
gauge per label + Overall, (b) factor-table card per label, (c) no numeric
section headers (the signature of the dict-of-dicts bug).

**Phase 6 — verification.** Shared tsc clean · API tsc clean · Web tsc
clean · API vitest 39/39 files, 459/459 tests passed · Web computeScores
138/138 passed. Migration 009 applied to dev DB via `psql -f`, `\d+
site_assessments` confirms the 4 columns are gone and column comments
landed on `overall_score` + `score_breakdown`. Full API suite re-run
post-migration with `DATABASE_URL` set — still 459/459.

**Phase 7 — wiki updates.** ADR filed at
`wiki/decisions/2026-04-21-site-assessments-schema-lift.md` (context, design
decisions, out-of-scope, verification matrix, files-touched table).
`wiki/entities/database.md` `site_assessments` row rewritten + a new note
in the bottom bullets documenting the canonical `ScoredResult[]` shape.
`wiki/concepts/scoring-engine.md` gained a "Canonical storage shape" section
with the full TypeScript type signature and pointed to the ADR.

**Open follow-ups surfaced but out of scope:** (a) plain-language copy for
the 6 labels without `SCORE_EXPLANATIONS` entries (renders graceful
degradation today), (b) delete the zombie `useAssessment()` hook or wire it
into a web consumer, (c) typed response schema for
`GET /projects/:id/assessment` (currently untyped via `SELECT sa.*`).
The first closes a UX gap; the second removes dead code; the third is hygiene.
