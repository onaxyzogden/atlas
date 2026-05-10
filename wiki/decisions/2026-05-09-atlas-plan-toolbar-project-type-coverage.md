# 2026-05-09 — Plan toolbar: project-type coverage closeout (Tiers A · B · C)

## Context

The 2026-05-09 Plan project-type checklist card surfaced 36 design prompts (6 types × 6 prompts). A gap audit ([plan file](../../../.claude/plans/each-project-type-has-frolicking-sunrise.md)) compared each prompt against the 13 toolbar tools and identified 13 deduplicated coverage gaps grouped into three tiers. This decision records the closeout of all three tiers — the toolbar now offers a one-click artifact path for every prompt that admits a spatial answer.

## Tier A — cross-cutting attributes (shipped earlier in this session)

Three popover fields added to every placeable; no new tools.

- **A1 phase setter** — `phase` select threaded through every `*Tool.tsx` `openForm({ fields })` call; default sourced from `phaseStore`'s active filter. Existing `phase` field on every placeable is now editable from the inline popover.
- **A2 enterprise tag** — new `enterpriseStore.ts` (project-scoped enterprise list with name + colour, persisted). Optional `enterprise?: string` on 9 placeable stores. `layeringLensStore` extended with `groupBy: 'yeomans' | 'enterprise'` mode that recolours by enterprise.
- **A3 path accessibility** — `accessible?: boolean` + `restPointAnchors?: [lon, lat][]` on `pathStore.Path`; popover toggle in `PathLineTool`.

## Tier B — five new draw tools (shipped earlier in this session)

Each follows the persist-first map-first pattern: skeleton `add()` on draw → inline popover → `updateRecord` on Save / `deleteRecord` on Cancel.

- **B5 annotation marker** ([EcologicalNoteTool.tsx](../../apps/web/src/v3/plan/draw/tools/EcologicalNoteTool.tsx)) — point + kind enum (`indicator-species | rest-point | disturbed-ground | asset | hazard`). Backed by new `ecologicalNoteStore.ts`. Flips `principle-verification` and `dynamic-layering` from non-spatial to spatial-when-present in `planModuleArtifactPresence`.
- **B1 utility line** ([UtilityRunTool.tsx](../../apps/web/src/v3/plan/draw/tools/UtilityRunTool.tsx)) — line-string + kind (`water | septic | power | data`). New `utilityRunStore.ts`.
- **B2 setback / buffer ring** ([BufferRingTool.tsx](../../apps/web/src/v3/plan/draw/tools/BufferRingTool.tsx)) — offset polygon at adjustable distance from selected feature. New `setbackStore.ts`.
- **B3 flow connector** ([FlowConnectorTool.tsx](../../apps/web/src/v3/plan/draw/tools/FlowConnectorTool.tsx)) — line-string with arrow head, snaps to fertility-unit endpoints. New `flowConnectorStore.ts`.
- **B4 monitoring transect** ([MonitoringTransectTool.tsx](../../apps/web/src/v3/plan/draw/tools/MonitoringTransectTool.tsx)) — line-string + cadence + observation log. New `monitoringTransectStore.ts`. Flips `phasing-budgeting` and `principle-verification` to spatial-when-present.

`planModuleArtifactPresence.ts` header updated: the prior assertion that three modules were "non-spatial-by-design" was loosened to "non-spatial-by-default" since B4 + B5 introduce optional spatial complements.

## Tier C — five overlays / helpers (shipped this segment)

- **C1 sun-path overlay** ([PlanSunPathOverlay.tsx](../../apps/web/src/v3/plan/layers/PlanSunPathOverlay.tsx)) — read-only map layer. Plots solstice/equinox arcs around the project anchor (first Z0 zone centroid → boundary centroid → fallback). Each date samples sun position every 20 min from sunrise to sunset (suncalc), projects 200 m at the compass bearing per sample (turf.destination), and renders a labelled solar-noon symbol. Gated on the new `sunPath` toggle. Unblocks Retreat #2 and Homestead #1.
- **C2 contour overlay** ([PlanContoursOverlay.tsx](../../apps/web/src/v3/plan/layers/PlanContoursOverlay.tsx)) — mirror of `DesignContoursOverlay`. MapTiler vector contour tiles, conditional `line-width` boosting every-100m elevations. Reuses the existing `topography` toggle (Plan and Design draw on different map instances; no collision). Unblocks RegFarm #3 and #5.
- **C3 storage-volume sizing** — `householdLpd` + `daysOffGrid` fields on `WaterNode` (only meaningful for `kind: 'storage'`). Captured via [WaterStorageTool.tsx](../../apps/web/src/v3/plan/draw/tools/WaterStorageTool.tsx) and [inlineEditSchemas.ts](../../apps/web/src/v3/plan/layers/inlineEditSchemas.ts). Reactive computation deferred — capture-only is enough for a follow-up helper card to compute warnings without a second store migration. Unblocks Homestead #3.
- **C4 paddock stocking-rate** — `pastureQuality` enum (`poor | fair | good | excellent`) on `Paddock`, with AUE/ha values documented in the type's doc comment. Captured via [PaddockTool.tsx](../../apps/web/src/v3/plan/draw/tools/PaddockTool.tsx) and `inlineEditSchemas.ts`. Same capture-only stance as C3. Unblocks RegFarm #2.
- **C5 Z-distance ring overlay** ([PlanZoneRingsOverlay.tsx](../../apps/web/src/v3/plan/layers/PlanZoneRingsOverlay.tsx)) — three dashed rings (Z1=30 m, Z2=100 m, Z3=500 m) drawn as `turf.circle` polygons around every Z0 zone centroid. Gated on new `zoneRings` toggle. Unblocks Homestead #4.

`useMatrixTogglesStore` bumped v9 → v10; migration falls back to `false` for new keys so existing stewards don't inherit unfamiliar layers. `MapOverlaysLegend` lists both new overlays. `ObserveAnnotationLayers` narrowed its `MatrixToggleKey` exclusions to keep `sunPath` and `zoneRings` Plan-only (compile-time guarantee they can't be miswired into Observe annotations).

## Out of scope

- `cross-section-solar` map tool — vertical transect editor remains in slide-up cards. C1 sun-path is the map counterpart.
- `principle-verification` map tool — Holmgren checklist is non-spatial. B5 annotation marker is the spatial complement.

## Verification

- TypeScript: full `tsc --noEmit` clean across all three rounds.
- Manual project-type sweep: switched through all six types after each round; cross-check chips on previously-uncovered prompts now flip green when the matching artifact is placed.
- Persistence: every new field/store survives reload via existing zustand `persist` middleware.

## Risks accepted

- Sizing helpers (C3, C4) capture inputs but don't yet compute warnings. Acceptable because a follow-up helper card can read these fields without another store migration; the alternative — wiring a reactive `inlineFormStore.readonly` field — would require touching the form schema for a feature that isn't in the prompt set.
- Sun-path 200 m projection radius is a viewing radius, not a ground distance. Stewards needing micro-precise shadow casts should drop into the cross-section editor — noted in the layer's header comment.
- `zoneRings` thresholds are hard-coded (30/100/500 m). Per-project overrides deferred until a steward asks — single source of truth in `PlanZoneRingsOverlay.RINGS`.

## Related

- [2026-05-09 Plan rail — Project-Type Template Checklist card](2026-05-09-atlas-plan-project-type-checklist.md) — the upstream prompt set
- [Plan file](../../../.claude/plans/each-project-type-has-frolicking-sunrise.md) — full gap matrix
