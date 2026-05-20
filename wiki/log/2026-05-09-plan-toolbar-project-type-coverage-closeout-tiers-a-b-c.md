# 2026-05-09 — Plan toolbar: project-type coverage closeout (Tiers A · B · C)


Closed the 13 gaps from the [project-type checklist audit plan](../../.claude/plans/each-project-type-has-frolicking-sunrise.md). Toolbar now offers a one-click artifact path for every prompt that admits a spatial answer. Decision recorded in [decisions/2026-05-09-atlas-plan-toolbar-project-type-coverage.md](decisions/2026-05-09-atlas-plan-toolbar-project-type-coverage.md).

### What shipped

- **Tier A — popover fields**: phase setter (every placeable), enterprise tag (new `enterpriseStore` + recolour mode in `layeringLensStore`), path accessibility flag + rest-point anchors.
- **Tier B — five new draw tools**: `EcologicalNoteTool` (annotation marker), `UtilityRunTool` (water/septic/power/data), `BufferRingTool` (setback ring), `FlowConnectorTool` (snaps to fertility units), `MonitoringTransectTool`. New stores backing each. `planModuleArtifactPresence` header loosened from "non-spatial-by-design" to "non-spatial-by-default" for `principle-verification`, `dynamic-layering`, `phasing-budgeting`.
- **Tier C — overlays + capture fields**: `PlanSunPathOverlay` (suncalc + turf — solstice/equinox arcs, anchor priority Z0 → boundary → fallback), `PlanContoursOverlay` (mirror of Design's MapTiler tile layer), `PlanZoneRingsOverlay` (Z1/Z2/Z3 dashed rings around Z0 centroids), `householdLpd` + `daysOffGrid` capture on `WaterNode` for storage sizing, `pastureQuality` enum on `Paddock` for AUE/ha lookup.

### Plumbing

- `useMatrixTogglesStore` v9 → v10 with migration falling back to `false` for new keys (`sunPath`, `zoneRings`).
- `MapOverlaysLegend` lists the two new overlays with swatches.
- `ObserveAnnotationLayers` narrowed `MatrixToggleKey` exclusions in three places to compile-time-prove the new keys can't be miswired into Observe annotations.

### Verification

- TypeScript: full `tsc --noEmit` clean across all three rounds.
- Manual project-type sweep: switched through all six types after each round; cross-check chips on previously-uncovered prompts now flip green when the matching artifact is placed.

### Risks accepted

- C3/C4 are capture-only; reactive computation deferred to a follow-up helper card (no second store migration needed).
- Sun-path 200 m projection is a viewing radius, not a ground distance — micro-precise shadow casts belong in the cross-section editor.
- `zoneRings` thresholds hard-coded at 30/100/500 m; per-project overrides deferred until a steward asks.
