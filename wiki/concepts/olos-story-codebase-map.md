# OLOS Story → Codebase Map

## Summary

The 17-chapter narrative *"The Story of OLOS"* depicts a steward arriving at raw
land and, through **The Steward's Atlas**, moving from fragmentation → shared
memory → an honest reading of the land → a capacity-based build sequence →
on-the-ground execution → a living seasonal loop. This page cross-references the
12 capabilities the story depicts against what actually exists in the codebase
(verified 2026-05-23; rows #10 and #7 both updated 2026-05-23 as their features
shipped).
**Verdict: the story is almost entirely realized — ~9 of
12 capabilities are fully shipped, 3 are partial, none is missing.** The genuinely
remaining gaps are narrow: inline needs-&-yields edge authoring in the Plan
slide-up, a collaboration audit trail,
and the cinematic design-overlay-on-satellite / flyover. (Two former entries
here have since shipped: the observation→confidence feedback wire as a
**distinct field-verification axis** — row #10; and the **Goal-Compass
sequencing UI** — row #7.)

This is distinct from [Gap Analysis](../entities/gap-analysis.md) (which tracks
FAO/USDA/IUCN *dataset* coverage) and complements
[Permaculture Alignment](permaculture-alignment.md) (which scores Atlas against
Holmgren's principles). The two P0 backlog items in that alignment review —
needs-&-yields graph and temporal slider/succession — **have since shipped**,
which is the main reason an earlier draft of this mapping was stale.

## How It Works

The story arc decomposes into 12 capabilities distributed across Atlas's three
lifecycle stages: **Observe → Plan → Act**.

### OBSERVE

| # | Story capability (chapter) | Status | Key code | Remaining gap |
|---|---|---|---|---|
| 1 | **Shared memory** — one persistent source of truth replacing scattered files (Ch6) | ✅ **Full** | `apps/web/src/store/projectStore.ts` (LocalProject; child stores projectId-tagged; localStorage + API sync) | None material. |
| 2 | **Layers** — terrain/soil/water/climate overlays with confidence (Ch7) | ✅ **Full** | `features/assessment/DataCompletenessWidget.tsx`; `components/panels/EducationalAtlasPanel.tsx` (per-layer confidence shown); `WithConfidence<T>` | — |
| 3 | **Field capture** — geotagged frost pockets, wind sectors, wet spots, animal trails (Ch8) | ✅ **Full (desktop)** / ⚠️ legacy (mobile) | `v3/observe/components/draw/` (ObserveDrawHost, HazardZoneTool, `annotationFieldSchemas.ts` FIELD_SCHEMAS, AnnotationRegistry); `store/externalForcesStore.ts`, `ecologyStore.ts` | Mobile in-the-field capture (`features/mobile/GPSTracker.tsx`, `features/fieldwork/`) is wired but not integrated into the v3 canvas; `features/mobile-fieldwork/` is an orphan scaffold. |
| 4 | **Constraints / honest reading** — the land told truthfully, incl. what it *can't* do (Ch9) | ✅ **Full** | `store/swotStore.ts` (structured SWOT with map pins); `features/zones/ZoneSiteSuitabilityCard.tsx` (zone × site-data conflict audit); `v3/observe/components/draw/HazardZoneTool.tsx`; `packages/shared` computeScores + confidence | — |
| 5 | **Zone map** — Mollison Zones 0–5 by visit frequency, explicitly labelled (Ch10) | ✅ **Full** | `lib/zones/permacultureLabels.ts` (Z0–Z5 visit-frequency labels); `v3/observe/components/draw/PermacultureZoneTool.tsx` (concentric rings 0–5); `v3/components/overlays/ZonesOverlay.tsx`; `store/zoneStore.ts` | — |

### PLAN

| # | Story capability (chapter) | Status | Key code | Remaining gap |
|---|---|---|---|---|
| 6 | **Dependency mapping (needs & yields)** — web of needs/yields; produce no waste; integrate (Ch3, Ch11) | ✅ **Full (engine)** / ⚠️ UI authoring | `packages/shared/src/relationships/` (integrationScoreFromEdges, orphanOutputs, unmetInputs, closedLoops); `store/relationshipsStore.ts`; `v3/plan/cards/principle-verification/NeedsYieldsAuditCard.tsx` (readout); integration score weighted 0.10 in scoring | Inline "connect this output" edge authoring is still legacy-canvas-only (MapView); Plan slide-up readout is textual. |
| 7 | **Goal Compass** — capacity-based phases, dependency-driven, milestones, Yeomans Scale of Permanence (Ch12) | ✅ **Full** | `v3/plan/engine/goalCompass/sequencingEngine.ts` (topological sort by prerequisites + Yeomans phase); `v3/plan/data/goalCompassTypes.ts`, `homesteadGoalTree.ts`, `interventionCatalog`; `store/phaseStore.ts` (`yeomansCap`, `generatedFromGoalCompass`). **Sequence UI (2026-05-23):** read-only **Build sequence** tab in the Goal-Compass slide-up — `v3/plan/engine/goalCompass/goalCompassSequenceLayout.ts` (pure `buildSequenceLayout` → permanence swimlane bands + nodes in build order + dependency edges) + `v3/plan/cards/goal-compass/GoalCompassSequenceCard.tsx` (bespoke SVG, re-runs the pure engine in a `useMemo`, surfaces `skipped[]`); registered via `MODULE_CARDS['goal-compass']` + `PlanModuleSlideUp.tsx`. | None material. The dependency graph / permanence ladder / build-order surface now exists and also exposes the engine's `skipped[]` reasoning. Deferred (optional): drag-to-reorder, `asOf` year-scrubber decay animation. See [[2026-05-23-atlas-goal-compass-sequence-ui]]. |
| 11 | **Housing readiness** — house comes late, only when access/water/power support it (Ch11) | ✅ **Full** | `store/phaseStore.ts` (Yeomans-cap gating, habitation ~phase 3+); `features/zones/ZoneSiteSuitabilityCard.tsx`; `features/structures/PermitReadinessCard.tsx` (residential/septic/well/electrical/ag-exemption gates) | Heuristic siting gate only; no permit-tracking schema (follow-on). |

### ACT

| # | Story capability (chapter) | Status | Key code | Remaining gap |
|---|---|---|---|---|
| 8 | **Command Centre** — tasks with photos, materials, cost, completion criteria (Ch13–14) | ✅ **Full** | `store/workItemStore.ts` (canonical WorkItem spine, shipped ~2026-05-19; photos/materials/cost/`completionCriteria` bound to rows + `fulfilWorkItem`); `features/act/PlanExecutionTrackerCard.tsx`; `FieldProofPanel.tsx` (who/dates/notes/photoRef/sign-off via proofEventStore) | — |
| 9 | **Collaboration / accountability** — who does what + change history (Ch14) | ⚠️ **Partial** | `features/collaboration/SuggestEditPanel.tsx` (suggest-edit → approval); `MembersTab.tsx` (RBAC) | No version-diff, change-log, or activity timeline (audit trail). |
| 10 | **Living seasonal loop** — observe over real seasons/years, feed back (Ch15) | ✅ **Full** | Design-time: `v3/plan/canvas/temporalScrubStore.ts` (year cursor 1–50); `v3/plan/cards/plant-systems/CanopySuccessionCard.tsx`, `SuccessionPathCard.tsx`. Real-time: `features/regeneration/RegenerationTimelineCard.tsx`, `PhotoComparePane.tsx`. **Feedback wire (2026-05-23):** `packages/shared/src/fieldVerification/` (pure decay/aggregate core) + `apps/web/src/lib/fieldVerification/` (`buildVerificationZones`, `useFieldVerification`) derive a **distinct field-verification axis** from logged soil samples + monitoring transects, surfaced via `FieldVerificationBadge` (in `DataCompletenessWidget` + `EducationalAtlasPanel`) and a decaying glow on the Observe map (`ObserveAnnotationLayers` field-verification LayerSpec). | Logged multi-year observation now feeds back as a sub-region, decay-weighted *field-verification* level shown **alongside** source confidence. By design the source-confidence enum itself stays static (the axes are kept distinct so ground-truth can't masquerade as institutional provenance). Deferred: factoring verification into `computeScores`; year-scrubber `asOf` decay animation. See [[2026-05-23-atlas-field-verification-axis]]. |
| 12 | **Closing / 3D vision** — design overlaid on satellite with fade, drone flyover (Ch17) | ⚠️ **Partial** | `features/map/CesiumTerrainViewer.tsx` (3D Cesium terrain); deck.gl scenegraph + custom GLB upload; `features/reporting/ReportingPanel.tsx` (screenshot) | No design-overlay-on-satellite compositing/fade and no automated flyover. Lowest priority — presentation, not workflow. |

**Tally:** 9 Full · 3 Partial · 0 Missing. (On 2026-05-23 two rows moved
Partial → Full: #10 when the observation→confidence feedback wire shipped as a
distinct field-verification axis, and #7 when the Goal-Compass sequencing UI
shipped as a read-only Build-sequence tab.)

## Where It's Used

This mapping spans all three lifecycle stages and is implemented across:
- **Observe:** `apps/web/src/v3/observe/` (annotation draw host, hazard/zone/sector tools), `store/swotStore.ts`, `store/externalForcesStore.ts`, `lib/zones/permacultureLabels.ts`.
- **Plan:** `apps/web/src/v3/plan/engine/goalCompass/`, `v3/plan/cards/principle-verification/NeedsYieldsAuditCard.tsx`, `packages/shared/src/relationships/`, `store/phaseStore.ts`, `store/relationshipsStore.ts`.
- **Act:** `apps/web/src/store/workItemStore.ts`, `features/act/` (PlanExecutionTrackerCard, FieldProofPanel), `features/regeneration/`, `features/collaboration/`.
- **Closing:** `features/map/CesiumTerrainViewer.tsx`, `features/reporting/ReportingPanel.tsx`.

## Constraints

1. **This is a verified snapshot (2026-05-23), not a permanent claim.** Several
   rows were stale within weeks because the underlying features ship fast. Re-verify
   against current code before acting on any status here — a "Full" claim names a
   file that existed when this page was written, not necessarily now.
2. **The three remaining gaps are the actionable surface.** In rough priority:
   (a) inline needs-&-yields edge authoring in Plan (#6); (b) collaboration audit
   trail (#9); (c) design-overlay-on-satellite + flyover (#12, presentation-only,
   lowest). Two former top items shipped 2026-05-23: the observation→confidence
   feedback wire (#10) as a distinct field-verification axis
   ([[2026-05-23-atlas-field-verification-axis]]) — its only deferred remnants
   being the (deliberately optional) `computeScores` tie-in and the year-scrubber
   `asOf` decay animation; and the Goal-Compass sequencing UI (#7) as a read-only
   Build-sequence tab ([[2026-05-23-atlas-goal-compass-sequence-ui]]) — deferred
   remnants being drag-to-reorder and the same `asOf` decay animation.
3. **Don't relitigate shipped capabilities.** #1–5, #7, #8, #10, #11 and the
   engine behind #6 are done; treat them as load-bearing, not as backlog.
4. **Covenant framing is preserved.** Capital-contributor language elsewhere in
   the product remains "capital partners & allies" per the 2026-05-04 fiqh
   decision; nothing in this mapping reintroduces advance-purchase framing.
