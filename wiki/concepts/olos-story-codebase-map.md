# OLOS Story → Codebase Map

## Summary

The 17-chapter narrative *"The Story of OLOS"* depicts a steward arriving at raw
land and, through **The Steward's Atlas**, moving from fragmentation → shared
memory → an honest reading of the land → a capacity-based build sequence →
on-the-ground execution → a living seasonal loop. This page cross-references the
12 capabilities the story depicts against what actually exists in the codebase
(verified 2026-05-23). **Verdict: the story is almost entirely realized — ~7 of
12 capabilities are fully shipped, 5 are partial, none is missing.** The genuinely
remaining gaps are narrow: inline needs-&-yields edge authoring in the Plan
slide-up, a dedicated Goal-Compass sequencing UI, a collaboration audit trail,
the real observation→confidence feedback wire, and the cinematic
design-overlay-on-satellite / flyover.

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
| 7 | **Goal Compass** — capacity-based phases, dependency-driven, milestones, Yeomans Scale of Permanence (Ch12) | ✅ **Full (engine)** / ⚠️ UI | `v3/plan/engine/goalCompass/sequencingEngine.ts` (topological sort by prerequisites + Yeomans phase); `v3/plan/data/goalCompassTypes.ts`, `homesteadGoalTree.ts`, `interventionCatalog`; `store/phaseStore.ts` (`yeomansCap`, `generatedFromGoalCompass`) | The engine generates work items → phaseStore, but there is no dedicated UI surface visualizing the sequence / dependency graph / permanence ladder. |
| 11 | **Housing readiness** — house comes late, only when access/water/power support it (Ch11) | ✅ **Full** | `store/phaseStore.ts` (Yeomans-cap gating, habitation ~phase 3+); `features/zones/ZoneSiteSuitabilityCard.tsx`; `features/structures/PermitReadinessCard.tsx` (residential/septic/well/electrical/ag-exemption gates) | Heuristic siting gate only; no permit-tracking schema (follow-on). |

### ACT

| # | Story capability (chapter) | Status | Key code | Remaining gap |
|---|---|---|---|---|
| 8 | **Command Centre** — tasks with photos, materials, cost, completion criteria (Ch13–14) | ✅ **Full** | `store/workItemStore.ts` (canonical WorkItem spine, shipped ~2026-05-19; photos/materials/cost/`completionCriteria` bound to rows + `fulfilWorkItem`); `features/act/PlanExecutionTrackerCard.tsx`; `FieldProofPanel.tsx` (who/dates/notes/photoRef/sign-off via proofEventStore) | — |
| 9 | **Collaboration / accountability** — who does what + change history (Ch14) | ⚠️ **Partial** | `features/collaboration/SuggestEditPanel.tsx` (suggest-edit → approval); `MembersTab.tsx` (RBAC) | No version-diff, change-log, or activity timeline (audit trail). |
| 10 | **Living seasonal loop** — observe over real seasons/years, feed back (Ch15) | ✅ **Full (design-time)** / ⚠️ real-time | Design-time: `v3/plan/canvas/temporalScrubStore.ts` (year cursor 1–50); `v3/plan/cards/plant-systems/CanopySuccessionCard.tsx`, `SuccessionPathCard.tsx`. Real-time: `features/regeneration/RegenerationTimelineCard.tsx`, `PhotoComparePane.tsx` | Multi-year observation is *logged* (proofEventStore) but not yet *fed back* into layer confidence — confidence stays static unless data is manually re-uploaded. |
| 12 | **Closing / 3D vision** — design overlaid on satellite with fade, drone flyover (Ch17) | ⚠️ **Partial** | `features/map/CesiumTerrainViewer.tsx` (3D Cesium terrain); deck.gl scenegraph + custom GLB upload; `features/reporting/ReportingPanel.tsx` (screenshot) | No design-overlay-on-satellite compositing/fade and no automated flyover. Lowest priority — presentation, not workflow. |

**Tally:** 7 Full · 5 Partial · 0 Missing.

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
2. **The five remaining gaps are the actionable surface.** In rough priority:
   (a) real observation→confidence feedback wire (#10); (b) Goal-Compass
   sequencing UI (#7); (c) inline needs-&-yields edge authoring in Plan (#6);
   (d) collaboration audit trail (#9); (e) design-overlay-on-satellite + flyover
   (#12, presentation-only, lowest).
3. **Don't relitigate shipped capabilities.** #1–5, #8, #11 and the engines
   behind #6/#7/#10 are done; treat them as load-bearing, not as backlog.
4. **Covenant framing is preserved.** Capital-contributor language elsewhere in
   the product remains "capital partners & allies" per the 2026-05-04 fiqh
   decision; nothing in this mapping reintroduces advance-purchase framing.
