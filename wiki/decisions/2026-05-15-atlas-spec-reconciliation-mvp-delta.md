# 2026-05-15 — OLOS/Atlas Workflow-Spec Reconciliation + MVP Delta

**Status:** Accepted (WS1–WS6 implemented; WS5 Part 2 deferred)
**Branch:** `feat/atlas-permaculture`
**Owner:** Yousef
**Plan:** `~/.claude/plans/c-users-my-own-axis-downloads-olos-atla-graceful-pond.md`

## Context

OGDEN issued `OLOS_Atlas_Platform_Workflow_Spec_v1.docx` (v1.0), a
foundational workflow spec for the Observe → Plan → Report/Implement
pipeline that treated the codebase as a "partial prototype." A codebase
audit found the system substantially more mature than the spec assumed:
the deterministic (non-AI) sequencing engine, intervention catalog,
rich land model, and three-stage v3 surface already align with the
spec's intent. Gaps were specific and bounded, not foundational. The
spec maps entirely onto the v3 surface (Observe/Plan/Act).

## Decision

Six scoped MVP-delta workstreams, all v3-only; legacy stage
routes/`LIFECYCLE_STAGES` enum left untouched (Phase 2 housekeeping).

1. **Spec-taxonomy mapping (WS2).** New
   `v3/plan/engine/specTaxonomy.ts` derives the spec's 6 land
   categories from the existing rich model (zone category +
   succession + ground cover) with strict Barren/Compacted
   precedence. The rich model is kept; the spec vocabulary is a
   derived projection, not a replacement.

2. **Regeneration methodology content (WS4).** New
   `v3/plan/data/regenerationPathway.ts` authors the §3.2.1
   methodology toolkit (keyline subsoiling, multi-species cover crop,
   compost/biology, biochar [high-compaction only], managed grazing
   [med/high]) with cited sources, compaction gating, and a
   critical-path timeline-to-productive-use calculation.

3. **Barren/Compacted system obligation (WS3) — core value.**
   `v3/plan/engine/autoDesign/regenerationForcing.ts` forces a
   mandatory regeneration pathway onto every Barren/Compacted zone
   **independent of the goal tree**, plus an assignment gate that
   withholds those zones from productive allocation until
   acknowledged. **Woven at the `runAutoDesign` orchestrator level,
   not inside `sequencingEngine`** — the sequencing engine has no
   `zones` parameter and selects only foundation/goal-advancing
   interventions, so it structurally cannot enforce a zone-driven
   obligation. `runAutoDesign` gained
   `acknowledgedRegenerationZoneIds` input and `regenerationPathways`
   output; it emits one `regeneration-pathway` fill-polygon draft per
   forced zone and schedules the regen tasks ahead of the goal-driven
   phases.

4. **Editable boundary → API sync (WS1).** The Observe boundary
   draw/edit tool (`BoundaryTool`, draw + `direct_select` vertex
   edit + live area) and local persistence to
   `projectStore.parcelBoundaryGeojson` already existed. The real gap
   was that `syncService.syncProjectUpdate` never pushed the boundary
   to the API. Added `syncProjectBoundary` (calls
   `api.projects.setBoundary`), fired from `subscribeToProjects` only
   when the boundary JSON actually changed — deliberately gated so
   ordinary name/notes edits don't re-trigger the boundary endpoint's
   acreage/centroid recompute + Tier-1 pipeline re-enqueue.

5. **Server-side PDF (WS5 Part 1).** `ReportPage` "Download PDF" now
   calls the server Puppeteer renderer via `api.exports.generate(...,
   { exportType: 'capital_partner_summary' })` and opens the stored
   PDF; browser Print kept as offline fallback. **`capital_partner_summary`
   chosen deliberately over an "investor" framing** to honor the
   covenant language ("capital partners & allies," not "investors").

6. **Soft Observe completion cue (WS6).** New `ObserveReadyCue` in the
   Observe right rail surfaces boundary-drawn + ≥1-landscape-placed
   state and offers a one-click jump to Plan. **Strictly
   non-blocking** — never gates navigation (the spec explicitly allows
   returning to Observe anytime).

## Deferred

- **WS5 Part 2 — tokenized unauthenticated public report-share
  route.** Deferred at Yousef's direction. It is a security boundary
  the plan gated as a confirm-with-Yousef item; warrants its own
  session with a security review. Recommended model when revisited:
  mirror the audited `project_portals` precedent (`share_token uuid`
  UNIQUE + `is_published` gate + public `/api/v1/...` route + public
  web route) rather than introducing a new signed-JWT surface.
- **WS4b — operational maintenance schedule.** Regeneration tasks are
  modeled as a recurring synthetic phase via the forcing engine; the
  broader personnel/materials/equipment rollup
  (`MachineryInventoryCard` extension) remains open.

## Open Questions answered (spec §7)

- **OQ1** catalog populated per project type? No — 20 interventions,
  homestead-only; content blocker flagged.
- **OQ2** planning DB structure? Flat Zod-validated TypeScript catalog.
- **OQ3** single vs multi-type? Single type per property at MVP.
- **OQ4** regeneration documented for Barren/Compacted? Was
  sparse/implicit; now authored (WS4) and enforced (WS3).
- **OQ5** MVP roles? Landowner/Operator + Aspiring Farmer; Investor via
  view-only link; Consultant = Phase 2.

## Verification

`tsc --noEmit` clean (exit 0, whole web project). `vitest run` — 77
pass across the plan engine + syncService suites (12 new:
specTaxonomy 7, regenerationForcing 5). 68-test broad engine suite
green (no regression from `runAutoDesign` changes).
