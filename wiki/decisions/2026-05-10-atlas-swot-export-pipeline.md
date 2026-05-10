# ADR — Atlas SWOT Export Pipeline

**Date:** 2026-05-10
**Status:** Accepted
**Context tags:** atlas, observe, swot, pdf-export, inert-cta-rule

## Context

Two inert-CTA sweeps earlier today (commits `2dda642` + `18772ad`)
deleted 18 buttons under the rule *"if a CTA has no live target,
delete it."* Three of those — **Export journal**, **Export report**,
**Export synthesis summary** — plus the retained label-only **Export
journal** in `SwotJournal` all wanted the same backing surface: a
SWOT-aware report exporter.

The Atlas API already runs a Puppeteer-based PDF export service
(`apps/api/src/services/pdf/`) with seven production templates
(site_assessment, design_brief, feature_schedule, field_notes,
capital_partner_summary, scenario_comparison, educational_booklet),
S3 storage, a `project_exports` DB row per generation, and a
`POST /api/v1/projects/:id/exports` route. The wiki had flagged
*"Frontend integration not yet wired — panels still use
window.print()"* as a gap.

## Decision

Reuse the existing PDF service and add three new templates for the
SWOT module. Wire the deleted SWOT export buttons back in with real
handlers.

**Scoping:**
- **SWOT trio only this session** — Journal, Diagnosis Report,
  Synthesis Summary. Other Observe export labels (Terrain, Hydrology)
  deferred.
- **Server-side rendering** (Puppeteer + S3 + DB row), not client-side
  jsPDF/markdown. Keeps a single export pipeline, single audit trail.
- **Defer "Send to diagnosis report"** — it's an internal pipe (copy
  SWOT entries into the diagnosis findings section), not an export.
  Different surface; flagged for a follow-up session.
- **PDF only** — matches existing service precedent. No
  `format: 'markdown' | 'pdf'` axis introduced.

## Implementation

### Backend
- `packages/shared/src/schemas/export.schema.ts` — extend
  `ExportType` enum with `'swot_journal'`, `'swot_diagnosis_report'`,
  `'swot_synthesis'`. New `SwotPayload` zod schema mirroring the
  `SwotEntry` store shape; added optionally to
  `CreateExportInput.payload`.
- `apps/api/src/services/pdf/templates/swotJournal.ts` (new) —
  bucket-count summary, sortable entries table with tags + GPS.
- `apps/api/src/services/pdf/templates/swotDiagnosisReport.ts` (new) —
  stage bar, executive summary, 2×2 quadrant overview with top-3
  entries each, tag-frequency-prioritised findings table, S+O / W+T
  recommended action pairs.
- `apps/api/src/services/pdf/templates/swotSynthesis.ts` (new) —
  gradient hero, four-lenses quadrant card, S+O / W+T equations,
  frequency-weighted tag cloud.
- `apps/api/src/services/pdf/templates/index.ts` — register all three.

> No DB migration needed — `project_exports.export_type` is free-text
> at the DB level; only the Zod enum gates new values.

### Frontend
- `SwotJournal.tsx` — wired `Export journal` button to
  `api.exports.generate(projectId, { exportType: 'swot_journal',
  payload: { swot: { entries } } })`, opens `storageUrl` in new tab.
- `SwotDiagnosisReport.tsx` — reintroduced `Export report` button,
  same handler shape with `'swot_diagnosis_report'`.
- `SwotDashboard.tsx` — reintroduced `Export synthesis summary`
  button at the bottom of `DesignImplications`, same shape with
  `'swot_synthesis'`. The companion *Create action plan from
  synthesis* button stays deleted — no action-plan generator exists yet.
- All three buttons show `Generating…` + disabled during the request
  (Puppeteer cold-start can be ~3s).

## Consequences

### Positive
- Three deleted CTAs return with real handlers — the inert-CTA rule
  is symmetric.
- Closes the *"frontend not yet wired"* gap for the SWOT module;
  pattern is reusable for Terrain, Hydrology, etc. in later sessions.
- Single audit trail (one `project_exports` row per generation) for
  every report exported anywhere in the app.

### Negative
- Puppeteer cold-start (~3s) on first request after server boot makes
  the button feel briefly broken. Mitigated by busy-state affordance.
- New `SwotPayload` shape duplicates the store's `SwotEntry` interface;
  if the store schema drifts, the export schema must be kept in sync.

### Inert-CTA rule, restated
The deletion rule from `2026-05-10-atlas-observe-inert-cta-audit.md` is
**symmetric**: *"when a backing surface lands, the deleted button comes
back — with a real handler."* Reintroducing the three SWOT export
buttons in this session is not a contradiction of the deletion ADRs;
it is the rule's other half.

## References
- Inert-CTA audit ADR: `wiki/decisions/2026-05-10-atlas-observe-inert-cta-audit.md`
- PDF service entity: `wiki/entities/pdf-export-service.md`
- SWOT store: `apps/web/src/store/swotStore.ts`
- Commits: (this session)
