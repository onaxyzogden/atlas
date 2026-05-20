# 2026-05-16 — fix(plan): feature-edit popover docked to a fixed right-edge position + StageShell `data-stage-bottom` anchor


Steward-reported (screenshot): the shared "EDIT BUILDING"/feature
mini-form was obstructed or cut off whenever a feature near the bottom
of the map was selected/placed.

Root cause: `InlineFeaturePopover` (one shared component mounted per
stage in `DiagnoseMap` across Plan/Observe/Act) rendered anchored to
the feature's `[lng, lat]`, re-projected via `map.project()` each
`move`/`zoom`/`resize`. It auto-flipped right→left on horizontal clip
but had **no vertical clamp and no max-height/scroll** — a bottom-edge
feature pushed the form behind the module bar or off-screen.

Fix (steward chose "fixed right dock, always", minimal — no
selection-highlight): `.popover` switched from anchor-translate to a
fixed dock — `position: absolute; top: 56px; right: 12px; z-index: 6;
max-height: calc(100% - 56px - 96px); overflow-y: auto` (clears the
`DesignToolRail`, reserves space above the bottom bar, long forms
scroll inside). Removed `transform: translate(...)` + the
`.popover[data-flipped='true']` block. `InlineFeaturePopover.tsx`:
removed the `screen` `useState` + the `map.project` projection
`useEffect`; `if (!active || !screen)` → `if (!active)`; `<form>` no
longer emits `data-flipped`/`style={{left,top}}`. `map` prop retained
(`_props`) so the 3 call sites typecheck unchanged. ESC /
click-outside / save / cancel unchanged. Applies to all three stages
automatically (one shared component).

Also committed this session: `StageShell.tsx` now tags its bottom
tray with `data-stage-bottom=""`. The prior selection-floater-stacking
fix (`dd43b59a`, landed via an out-of-band rebase) and its ADR/log
described this attribute as "pre-existing" — it was not; this is the
missing piece that lets `floaterStackRoot.ts`'s `[data-stage-bottom]`
query actually re-anchor the stack above the module bar.

**Verification.** `tsc --noEmit` (8 GB heap) exit 0; live stylesheet
inspection confirmed the `.popover` rule applied with the `calc()`
resolved and no flip remnants; real-canvas `getBoundingClientRect`
showed the panel in the safe zone with ~240 px bottom clearance.

ADR: `wiki/decisions/2026-05-16-atlas-inline-popover-fixed-dock.md`.

**Deferred.** Screenshot proof unavailable — the WebGL map canvas
hangs the capture tool, and the preview env returned a 0-size
viewport. A live cross-stage manual pass (Observe + Act, long-form
scroll, bottom-edge feature; plus the StageShell-completed floater
re-anchor) needs a working MapLibre preview and is left to a steward
pass. Many unrelated working-tree files (zone-generator / basemap /
ZonePolygonTool / zoneSizeGuide) are concurrent in-progress work from
the rebased branch and were **not** committed in this session.
