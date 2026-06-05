# 2026-05-12 — Plan3DSelectionHandler diagnostic instrumentation


**Why.** Paddock click-to-select still silent in 3D after the Vision-canvas
mount (commit `78b21bc`). Needs hands-on console output before triage.

**What.** Added `console.debug('[Plan3DSelect] …', …)` at five points in
`Plan3DSelectionHandler.tsx`: mount, click (with point / present-layers /
unfiltered anyHits), selectable-layer query result, kind/id resolution,
and store-items snapshot after the set call. Triage decision table left
in chat — to be re-pasted into ADR once root cause is identified, then
diagnostics stripped.
