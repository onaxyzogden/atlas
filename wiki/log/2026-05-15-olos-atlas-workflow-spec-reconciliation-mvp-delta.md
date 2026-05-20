# 2026-05-15 — OLOS/Atlas Workflow-Spec Reconciliation + MVP Delta


**Branch.** `feat/atlas-permaculture`.

**Trigger.** OGDEN issued `OLOS_Atlas_Platform_Workflow_Spec_v1.docx`
(v1.0), treating the codebase as a "partial prototype." A codebase
audit found the system substantially more mature than assumed — the
deterministic sequencing engine, intervention catalog, rich land
model, and three-stage v3 surface already align with spec intent;
gaps were specific and bounded. Scope: a spec↔codebase reconciliation
(answering the spec's 5 Open Questions with code evidence) plus six
scoped MVP-delta workstreams, all v3-only; legacy stage
routes/`LIFECYCLE_STAGES` enum left untouched (Phase 2 housekeeping).

**WS2 — Spec-taxonomy mapping.** Spec's 6 land categories derived
from the existing rich model (zone category + succession + ground
cover) with strict Barren/Compacted precedence; rich model kept, spec
vocabulary is a derived projection.

**WS4 — Regeneration methodology content.** Authored the §3.2.1
toolkit (keyline subsoiling, multi-species cover crop, compost/biology,
biochar [high-compaction only], managed grazing [med/high]) with cited
sources, compaction gating, and critical-path timeline-to-productive-use.

**WS3 — Barren/Compacted system obligation (core value).**
`autoDesign/regenerationForcing.ts` forces a mandatory regeneration
pathway onto every Barren/Compacted zone independent of the goal tree,
plus an assignment gate withholding those zones from productive
allocation until acknowledged. **Woven at the `runAutoDesign`
orchestrator level, not inside `sequencingEngine`** — the sequencing
engine has no `zones` parameter and selects only foundation/
goal-advancing interventions, so it structurally cannot enforce a
zone-driven obligation. `runAutoDesign` gained
`acknowledgedRegenerationZoneIds` input + `regenerationPathways`
output; emits one `regeneration-pathway` fill-polygon draft per forced
zone and schedules regen tasks ahead of the goal-driven phases.

**WS1 — Editable boundary → API sync.** The Observe boundary
draw/edit tool + local persistence to `parcelBoundaryGeojson` already
existed; the real gap was `syncService` never pushing the boundary to
the API. Added `syncProjectBoundary` (calls `api.projects.setBoundary`),
fired from `subscribeToProjects` only when the boundary JSON actually
changed — gated so name/notes edits don't re-trigger the endpoint's
acreage/centroid recompute + Tier-1 pipeline re-enqueue.

**WS5 Part 1 — server-side PDF.** `ReportPage` "Download PDF" now
calls the server Puppeteer renderer via `api.exports.generate(...,
{ exportType: 'capital_partner_summary' })` and opens the stored PDF;
browser Print kept as offline fallback. `capital_partner_summary`
chosen over an "investor" framing to honor the covenant language.

**WS6 — soft Observe completion cue.** New `ObserveReadyCue` in the
Observe right rail surfaces boundary-drawn + ≥1-landscape-placed state
and offers a one-click jump to Plan. Strictly non-blocking — never
gates navigation.

**Verification.** `tsc --noEmit` clean (exit 0, whole web project).
`vitest run` — 77 pass across plan engine + syncService suites (12
new: specTaxonomy 7, regenerationForcing 5); 68-test broad engine
suite green (no regression from `runAutoDesign` changes).

**Deferred.** WS5 Part 2 (tokenized unauthenticated public
report-share route) — deferred at Yousef's direction; a security
boundary warranting its own session, recommended to mirror the audited
`project_portals` precedent. WS4b (operational maintenance
schedule/`MachineryInventoryCard` rollup) remains open.

ADR `decisions/2026-05-15-atlas-spec-reconciliation-mvp-delta.md`.
