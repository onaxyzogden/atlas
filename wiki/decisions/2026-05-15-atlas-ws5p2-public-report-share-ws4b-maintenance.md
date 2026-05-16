# 2026-05-15 — WS5 Part 2 (Tokenized Public Report Share) + WS4b (Maintenance Schedule Rollup)

**Status:** accepted
**Scope:** v3 only (Observe → Plan → Act); Fastify API
**Follows:** [2026-05-15 Atlas Spec Reconciliation + MVP Delta](2026-05-15-atlas-spec-reconciliation-mvp-delta.md)
**Spec:** `OLOS_Atlas_Platform_Workflow_Spec_v1.docx` §5.1.2, §4.3.3

## Context

The MVP-delta session shipped WS1–WS6 except two explicitly deferred
items, closed here:

- **WS5 Part 2** — the tokenized, unauthenticated, view-only public
  report-share route (spec §5.1.2). Deferred because it is a security
  boundary needing its own review.
- **WS4b** — the operational-maintenance recurring rollup (spec
  §4.3.3). Regeneration tasks were already a recurring synthetic
  phase; the broader personnel/materials/equipment rollup was open.

Locked decisions (carried from the approved follow-up plan): public
share = **frozen PDF snapshot** (not a live render); token model =
**reuse `project_portals`** (no new migration); public viewer sees the
**full report as-is**; WS4b = **author full maintenance metadata** on
the intervention catalog.

## Decision

### WS5 Part 2 — public report share

- No new migration. Reuse the audited `project_portals` row
  (`share_token uuid UNIQUE`). The snapshot lives in `config` jsonb
  under a new optional `reportShare` block with its **own** publish
  flag, decoupled from the row-level `is_published` that gates the
  storytelling portal.
- `reportShare` shape: `{ published, exportId, storageKey,
  generatedAt }`.
- Authenticated `POST /api/v1/projects/:id/portal/report`
  (`owner` only) runs `PdfExportService.generate(projectId,
  'capital_partner_summary')`, then **merges** into existing `config`
  (storytelling fields preserved). An unpublish variant flips
  `reportShare.published = false`.
- **Public route `GET /api/v1/portal/:shareToken/report.pdf`
  streams the frozen PDF bytes *through* the API.** The raw storage
  URL is never returned to the client — a design that is *stronger*
  than the plan's `{ storageUrl }` shape and **moots the storage-ACL
  checkpoint**: the UUIDv4 token + `reportShare.published` gate are
  the only access path; an unsigned/permanent storage URL is never
  exposed. `Cache-Control: private, no-store` satisfies the
  "unpublish must be immediate, no caching" checkpoint.
- Web: `api.portal.publishReport/unpublishReport` (authed) +
  `getReportShare` (unauthed); public route `/report-share/$token`
  embeds the PDF; ReportPage swaps the authed deep-link copy for a
  "Publish view-only link" / "Unpublish" toggle.

#### Security review (spec gate)

- **Blast radius** = one owner-published `capital_partner_summary`
  snapshot. No live DB-derived render, no mutation, no auth/session
  context, no cross-project reach.
- **Token model** identical to the audited `project_portals`
  model — no new JWT/signed-URL surface.
- **Storage-ACL checkpoint resolved by design**, not assumption: the
  stored URL is never client-visible (bytes streamed through the
  API), so it cannot leak independent of the token gate.
- **Inherited launch-readiness caveat** carried forward: no
  `@fastify/rate-limit`, no CDN cache; gated "before first public
  URL" per [2026-05-10 deferred-todo sweep](2026-05-10-deferred-todo-sweep.md).
- **Covenant.** No new copy; `capital_partner_summary` template
  already enforces "capital partners & allies" framing.

### WS4b — maintenance schedule rollup

- Mirrors `regenerationForcing.ts`: pure `computeMaintenanceSchedule`
  → synthetic recurring `BuildPhase` (`maint-phase-${projectId}`,
  `order: 99`) + tagged `isMaintenanceTask` `PhaseTask`s, woven
  additively at the `runAutoDesign` orchestrator seam — **never**
  inside `sequencingEngine`.
- `MaintenanceSchedule` metadata authored across 19 recurring catalog
  interventions + the 2 recurring regeneration methods (cover-crop
  rebuild, managed grazing). Parcel-assessment (one-time) carries
  none. Recurring regeneration methods are **deduped by method id**
  so multiple barren zones don't double-count.
- `PhaseTask` extended with optional `isMaintenanceTask`,
  `recurrenceFrequency`, `materials`, `requiredPersonnel`,
  `equipmentRequired` — additive, no persist-version bump.
- New `MaintenanceScheduleCard` (Module 7 · Phasing) reconstructs the
  rollup from persisted maintenance tasks: per-frequency buckets,
  annualised labor/cost, materials procurement (dedup by
  `label|unit`), skilled-help-beyond-household, equipment dependency.

#### Latent bug fixed

`GenerateSiteDesignBar.tsx` persisted only
`result.sequencing.generatedPhases`, which silently dropped **both**
regeneration (WS3) and maintenance (WS4b) synthetic-phase tasks
(`replaceGoalCompassRows` only attaches tasks to phases present in
the passed array). Fixed at the orchestrator seam: `AutoDesignResult`
now exposes a combined `generatedPhases` (forcing + sequencing +
maintenance) and the consumer persists that. This also makes WS3
regeneration tasks persist correctly.

## Consequences

- Spec §5.1.2 and §4.3.3 boundaries are closed; the MVP-delta
  workstream set (WS1–WS6 + WS4b + WS5 P2) is complete.
- Rate-limit / CDN cache for the public route remains an open
  launch-readiness item (inherited, gated before first public URL).

## Verification

- `tsc --noEmit` clean (web + api, 8 GB heap — default heap OOMs on
  the web project; not a type error).
- `vitest run` web: plan + store suites 158/158 green incl. 5 new
  `maintenanceSchedule.test.ts` specs (null-phase, synthetic-phase
  emission, annualisation, method dedup, personnel/equipment rollup);
  no regression.
- `vitest run` api: `portal.test.ts` 8/8 green incl. 4 new
  public-route specs (published→200+`no-store`, unpublished→404,
  absent/tampered token→404, storytelling-only portal→404).
- Manual publish→`/report-share/<token>` logged-out + unpublish→404:
  deferred to a hands-on pass (no dev server run this session).
