# 2026-05-13 — perception bug, fixed by toast


**Why.** Steward report: Observe → Adopt from map → click 3D basemap
building → enter label / height / notes → Save → "as if nothing was
done." Worked at first ship (`e534ddd3`, 2026-05-13), regressed.

**Investigation.** Followed `superpowers:systematic-debugging` Phase 1.
Instrumented all five boundaries with `[adopt-debug]` probes:
`AdoptBasemapBuildingTool.create()`,
`openBeInlineEditById` schema resolve, `InlineFeaturePopover.onSubmit`,
`buildBuildingEditSchema.onSave`, `builtEnvironmentStoreV2.updateMetadata`.
Repro'd with synthetic input + real `KeyboardEvent` sequences. Every
boundary fired in order: `STORE.open` (1×), `onSubmit` (1×), `onSave`
(1× with correct values), `updateMetadata` (1× with `match found`),
`STORE.close` (1×). localStorage `ogden-built-environment-v2` carried
the patched `label`, `proposed.heightM`, and `notes` correctly. The
StrictMode 2× identity-change in the popover was a dev-only artifact
of `prevActive !== active`, not a real reset.

**Root cause.** Save mechanism is sound. The bug is **perceptual**:
the adopted building's 3D extrusion was already on-map *before* Save
(rendered at the basemap's `render_height` from the `existing` block
written by `create()`), and `label` is metadata-only — invisible on
the map surface. Saving an unedited form re-writes the same values
and produces no visible delta, so the steward concluded "nothing
happened." Older buggy entities in localStorage (e.g. `a0ce2f9f`)
match the pattern "Save pressed with defaults unchanged" exactly.

**What.**
- Added `toast.success(\`Saved "${label}"\`)` to
  `buildBuildingEditSchema.onSave` (
  [`apps/web/src/v3/plan/layers/inlineEditSchemas.ts:1149`](apps/web/src/v3/plan/layers/inlineEditSchemas.ts))
  after the `updateMetadata` call. Single 7-line diff; no behavioural
  change to persistence. Comment in source records the perception-bug
  rationale for future readers.
- Removed all `[adopt-debug]` probes from 5 files; removed
  `window.__adoptMap` debug exposure.

**Verified.** `tsc --noEmit` exit 0; `vite build` clean in 36.51s
with `NODE_OPTIONS=--max-old-space-size=8192` (default 4GB OOMs on
this monorepo — environmental, unrelated). The save path itself was
verified end-to-end in Phase 1 (localStorage round-trip + extrusion
height match). Toast confirmation is the only user-facing change.

**Deferred.** Default heap OOM during `npm run lint` / `npm run build`
is a Windows dev-env papercut, not a regression — track separately
if it becomes blocking.
