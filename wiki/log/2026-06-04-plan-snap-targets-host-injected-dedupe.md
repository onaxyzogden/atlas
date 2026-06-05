# 2026-06-04 — Plan snap targets host-injected (per-tool hook calls deduped)

**Closed.** Code-cleanliness follow-up to the same-day snap rollout
(commit `aecc6322`). After that slice, each of the 10 dedicated/livestock
Plan draw tools independently called
`usePlanSnapTargets(projectId, parcelBoundary)` and took a `parcelBoundary?`
prop solely to feed that one call. But `PlanDrawHost` — their **only** mount
site — already computes a single `getSnapTargets` instance near the top
(the one driving the Plan-BE branch). Commit `72aa79ed`
(`feat/atlas-permaculture`, **not pushed**) injects that single instance into
each tool, collapsing 10 duplicate hook calls into one.

Per tool (FenceLine, Paddock, FlowConnector, MonitoringTransect, PathLine,
UtilityRun, WaterSwale; WaterCatchment, ZonePolygon, CropArea):

- Swap `import { usePlanSnapTargets }` for a `import type { SnapTargets }`
  (from `../../../lib/snapPoint.js`).
- Replace the `parcelBoundary?: GeoJSON.Polygon` prop with
  `getSnapTargets?: () => SnapTargets`.
- Drop the `const getSnapTargets = usePlanSnapTargets(...)` body line —
  `getSnapTargets` now arrives as a prop.
- The `useMapboxDrawTool({ ... snap: true, getSnapTargets })` call is
  unchanged.

`PlanDrawHost` swaps the 10 switch cases' `parcelBoundary={parcelBoundary}`
attribute for `getSnapTargets={getSnapTargets}`.

**Out of scope (intentionally unchanged):** `PlanDesignElementHost` keeps its
own `usePlanSnapTargets` call — it independently needs `parcelBoundary` for
`useDesignElementDrawTool` placement validation. The host's own
`usePlanSnapTargets` call + import stay (still the single source);
`parcelBoundary` remains a `PlanDrawHost` prop. No store/schema change, no new
dependency, no deletion of components.

Behaviour identical — the host assembles the same project-global targets
(fences, paddocks, BE footprints + lines, parcel boundary ring), and only one
tool mounts at a time. Net `-10` lines (`+40/-50`). Verification:
`tsc --noEmit` EXIT=0; bounded vitest (`--pool=forks --testTimeout=20000`)
`snapDrawPoint` (5) + `actToolCoverage` (17) green; `/@fs/`
module-resolution proof for `PlanDrawHost` + 5 representative tools (all
resolve + load with a valid default export — `preview_screenshot` hangs on
the WebGL map, [[project-screenshot-hang]]). One explicit-path commit
(11 files); foreign WIP left untouched. Full snap record:
[wiki/decisions/2026-06-04-atlas-act-adopt-and-draw-snapping.md](decisions/2026-06-04-atlas-act-adopt-and-draw-snapping.md).
