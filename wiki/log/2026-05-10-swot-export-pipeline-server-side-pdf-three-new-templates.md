# 2026-05-10 — SWOT export pipeline (server-side PDF, three new templates)


Built the backing surface that closes the inert-CTA loop opened by today's
two button-deletion sweeps (commits `2dda642` + `18772ad`). Three of the
deleted buttons — **Export journal**, **Export report**, **Export
synthesis summary** — plus the retained label-only **Export journal** in
`SwotJournal` all wanted the same surface: a SWOT-aware report exporter.
The inert-CTA rule from this morning's ADR is **symmetric** — *"when a
backing surface lands, the deleted button comes back with a real
handler"* — and this session is that other half.

Backend (5 files):

- **`packages/shared/src/schemas/export.schema.ts`** — extended
  `ExportType` enum with `'swot_journal'`, `'swot_diagnosis_report'`,
  `'swot_synthesis'`. Added `SwotPayload` zod schema mirroring the
  `SwotEntry` store shape; added optionally to `CreateExportInput.payload`.
- **`apps/api/src/services/pdf/templates/swotJournal.ts`** (new) —
  bucket-count summary, sortable entries table with tags + GPS.
- **`apps/api/src/services/pdf/templates/swotDiagnosisReport.ts`** (new) —
  stage bar, executive summary, 2×2 quadrant overview with top-3 entries
  each, tag-frequency-prioritised findings, S+O / W+T action pairs.
- **`apps/api/src/services/pdf/templates/swotSynthesis.ts`** (new) —
  gradient hero, four-lenses card, equations, weighted tag cloud.
- **`apps/api/src/services/pdf/templates/index.ts`** — registered all three.

> No DB migration — `project_exports.export_type` is free-text at the
> DB level; only the Zod enum gates new values.

Frontend (3 files):

- **`SwotJournal.tsx`** — wired the retained `Export journal` button
  to `api.exports.generate()` + `window.open(storageUrl)`.
- **`SwotDiagnosisReport.tsx`** — reintroduced `Export report` button.
- **`SwotDashboard.tsx`** — reintroduced `Export synthesis summary`
  button at the bottom of `DesignImplications`. Companion *Create
  action plan from synthesis* stays deleted (no generator yet).

All three buttons show `Generating…` + disabled state during the
Puppeteer round-trip. tsc clean across `apps/web` and `apps/api`.

Deferred:

- **Send to diagnosis report** — internal pipe (copy SWOT entries into
  diagnosis findings), not an export. Different surface; flagged for a
  follow-up session.
- Other Observe export labels (Terrain report, Hydrology data) — same
  pattern, deferred to later sessions.

ADR: `wiki/decisions/2026-05-10-atlas-swot-export-pipeline.md`.
