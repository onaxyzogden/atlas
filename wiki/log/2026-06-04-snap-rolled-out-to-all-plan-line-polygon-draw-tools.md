# 2026-06-04 — Snap rolled out to all Plan line/polygon draw tools

**Closed.** Follow-up to the same-day snap ADR (Feature 2, commit
`9728c923`), which enabled opt-in vertex/edge snapping on the shared
`useMapboxDrawTool` hook and wired only `FenceLineTool` + `PaddockTool`.
Commit `aecc6322` (`feat/atlas-permaculture`, **not pushed**) extends the
identical `snap` + `getSnapTargets` opt-in — reusing the **same** shared
`usePlanSnapTargets` source (existing fences + paddock rings, built-
environment footprints + line runs, parcel boundary ring) — to every
remaining Plan line/polygon draw path:

- **8 dedicated tools:** FlowConnector, MonitoringTransect, PathLine,
  UtilityRun, WaterSwale (lines); WaterCatchment, ZonePolygon, CropArea
  (polygons). Each gains a `parcelBoundary?` prop, calls
  `usePlanSnapTargets`, and passes `snap: true` + `getSnapTargets` into its
  existing `useMapboxDrawTool`. `PlanDrawHost` threads `parcelBoundary` into
  all 8 switch cases.
- **Design-element host path:** `useDesignElementDrawTool` forwards optional
  `snap` / `getSnapTargets` into its inner `useMapboxDrawTool` (pure pass-
  through; inert for `draw_point` kinds). `PlanDesignElementHost` supplies
  `snap: true` + `usePlanSnapTargets` — covering all line/polygon element
  kinds in one place.
- **Plan BE proposed-structures:** `BeV2ExistingTool` (shared observe-layer
  component) gains optional `snap` / `getSnapTargets` props **driven from the
  host** — `PlanDrawHost` calls `usePlanSnapTargets` once near the top
  (before its early return, per rules of hooks) and passes it into the
  `PLAN_BE_PREFIX` branch. `ObserveDrawHost` passes neither, so Observe stays
  snap-off and no observe->plan import is introduced.

Point tools never snap (no snap mode for `draw_point`); Observe/Act behaviour
unchanged; default `snap=false` keeps every untouched caller byte-for-byte
identical. No store/schema change, no new dependency, no deletion of legacy
components. Verification: `tsc --noEmit` EXIT=0; bounded vitest
(`--pool=forks --testTimeout=20000`) `snapDrawPoint` (5) + `actToolCoverage`
(17) green; all 5 edited/related modules resolve + load in the live Vite
bundle and the snap modes export as expected (`/@fs/` import proof —
`preview_screenshot` hangs on the WebGL map, [[project-screenshot-hang]]);
live snap-mode engagement already proven on the identical shared hook in
`9728c923`. One explicit-path commit (12 files); foreign WIP left untouched.
Full record:
[wiki/decisions/2026-06-04-atlas-act-adopt-and-draw-snapping.md](decisions/2026-06-04-atlas-act-adopt-and-draw-snapping.md).
