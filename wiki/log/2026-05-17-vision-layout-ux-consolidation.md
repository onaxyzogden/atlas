# 2026-05-17 — Vision Layout UX consolidation


Three steward-reported Vision Layout (also `terrain3d`) Plan-canvas rough
edges fixed in one pass, no behavior/layer deletion (project "no deletion
in revamps" convention upheld). (1) `BaseMapCard` gained an optional
`hiddenOverlays?: ReadonlyArray<MatrixToggleKey>` prop — the mount site
declares its dead overlay keys, keeping `BaseMapCard` ignorant of canvas
topology; the row filter is `STAGE_HIDDEN[stage] ∪ hiddenOverlays`.
`VisionLayoutCanvas` passes `VISION_DEAD_OVERLAYS=['sunPath','zoneRings']`
(those overlay components aren't mounted there). `topography` deliberately
kept (its Observe topo annotations still render via the mounted
`ObserveAnnotationLayers`); `scheduledMoves` kept (intentional cross-stage
Act surfacing). `zones`/`zoneRings` labels corrected (latter now reads
Z1–Z5, matching `ZONE_RING_BANDS`). (2) `CustomModelPalette` relocated
from a floating bottom-right card into the left `PlanTools` rail —
restyled as a `<section className={css.group}>` reusing
`PlanTools.module.css`, mounted inside `PlanTools` gated
`usePlanView() ∈ {vision,terrain3d}`; floating mount + import removed
from `VisionLayoutCanvas`; store wiring unchanged (pure relocation).
(3) `InlineFeaturePopover.module.css` `.popover` re-anchored
`top:56px`→`bottom:12px`, `max-height`→`calc(100% - 80px)`. No
`matrixTogglesStore`/persist change (toggles still persist, just not
surfaced where they can't act). `pnpm --filter web typecheck` (8 GiB)
clean. Preview DOM-asserted (WebGL screenshots blocked offline —
disclosed, not faked): Custom models section in the rail on Vision /
absent on Current Land; "Paddock" inline popover measured 12px from the
map's right + bottom edges. New ADR
`decisions/2026-05-17-atlas-vision-layout-ux-consolidation.md` + index
pointer + this entry + `entities/web-app.md` Current State.
