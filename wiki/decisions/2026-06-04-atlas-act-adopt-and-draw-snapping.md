# ADR: Adopt-from-map returns to Act read-existing objectives (data-wiring only); draw tools snap to existing lines/vertices via custom MapboxDraw modes

**Date:** 2026-06-04
**Status:** accepted (both features complete + committed; not pushed)
**Branch:** `feat/atlas-permaculture` (Feature 1 `9d0ddae2`, Feature 2 `9728c923`;
plan `~/.claude/plans/elements-of-this-concept-toasty-ember.md`; **not pushed**)
Entity: [[entities/act-tier-shell]].

## Context

Two operator requests against the Act tier-shell map, confirmed mid-implementation:

1. **"Bring back adopt-from-map for relevant objectives."** The adopt-from-map tools
   (click a building footprint / water body off the basemap -> dedup against existing
   entities -> create a `state:'existing'` record + inline edit form) exist only in the
   Observe layer (`AdoptBasemapBuildingTool` / `AdoptBasemapWaterTool`, dispatched by
   `ObserveDrawHost`). The Act tier-shell already mounts `ObserveDrawHost` alongside the
   Act/Plan hosts, and arming an Act `map`-arm tool just calls `setActiveTool(mapToolId)`,
   which any mounted host picks up by id-prefix. Both adopt `MapToolId`s already resolve
   in `ObserveDrawHost`'s switch.

2. **"Enable snap-to-line/vertex for fence and paddock and other polygon drawing tools."**
   The draw stack (`@mapbox/mapbox-gl-draw` v1.4.4 via `useMapboxDrawTool`) had no
   snapping during draw sessions; the pure `snapPoint.ts` helper existed but was only used
   for toolbox placement (`DesignDropController`). The repo already had a custom-mode
   injection precedent: `SharedVertexEditHandler` passes
   `modes: { ...MapboxDraw.modes, [CLICK_DELETE_DIRECT_SELECT]: clickDeleteDirectSelect }`.

## Decision

**Feature 1 -- pure tool-catalogue data-wiring (no new component, no host change).**

- Added two catalogue entries to `actToolCatalog.ts`: `adopt-building` (category
  `structures`, arm `observe.built-environment.adopt-basemap`) and `adopt-water`
  (category `water`, arm `observe.earth-water-ecology.adopt-water`), both reusing the
  already-imported `MapIcon`.
- Wired the ids into the **read-existing** objectives in
  `packages/shared/src/relationships/objectiveActTools.ts`, as the FIRST entry of each
  list: `adopt-building` -> 9 objectives that inventory existing structures /
  infrastructure / productive capacity; `adopt-water` -> 15 objectives that read existing
  surface water (hydrology / sources / availability / quality / yield / features, plus
  ecology + learning objectives mapping on-site water). Selection rule was applied by
  objective intent across all 12 land types' S2/S3 reading objectives.
- **Adopt is a reading activity, so it was intentionally NOT added to S4/S5 design /
  strategy objectives.** Verified: control objective `s4-water-strategy` resolves with no
  adopt entry (first tool `catchment`), confirming no leak into design objectives.

**Feature 2 -- snap-enabled custom draw modes reusing `snapPoint.ts` math.**

- `snapPoint.ts`: additive `snapDrawPoint(map, raw, targets)` + optional
  `lines?: LngLat[][]` / `vertices?: LngLat[]` fields on `SnapTargets`. Within the same
  8 px screen radius, **vertices win over edges** (nearest corner via the existing
  `nearestCorner`, then nearest point on any segment via `snapToSegment`). The legacy
  `snapPoint` / `SnapResult` used by `DesignDropController` is left byte-for-byte
  untouched.
- `snapDrawModes.ts` (new): `snap_draw_line_string` / `snap_draw_polygon` modes that wrap
  stock `draw_line_string` / `draw_polygon` (`{ ...stock, overrides }`), stash
  `state.snapTargets` from `onSetup(opts)`, and rewrite `e.lngLat` via `snapDrawPoint` on
  `onClick` / `onTap` / `onMouseMove` before delegating to stock. So both the committed
  vertex and the rubber-band preview lock onto existing features. Targets are captured
  once at mode start (sufficient for the confirmed "snap to existing" scope).
- `useMapboxDrawTool.ts`: opt-in `snap?` / `getSnapTargets?` props. **Default `false`
  keeps every existing caller byte-for-byte identical**; `draw_point` never snaps. When
  armed, the hook registers the custom modes alongside the stock set and enters the snap
  variant with `changeMode(snapMode, { snapTargets: getSnapTargets() })`.
- `usePlanSnapTargets.ts` (new): shared hook assembling targets from `livestockStore`
  (fence lines + paddock rings), `builtEnvironmentStoreV2` (structure footprints + line
  runs), and the parcel boundary ring -- one source of truth so any tool builds identical
  targets.
- `FenceLineTool` / `PaddockTool` enable snap; `PlanDrawHost` threads `parcelBoundary` to
  both. Other line/polygon tools (ZonePolygon, CropArea, etc.) can opt in by passing the
  same two props.

## Alternatives considered

- **Feature 1: a new Act-specific adopt component/host.** Rejected -- `ObserveDrawHost` is
  already mounted in the Act tier-shell and both adopt ids already dispatch there; a new
  component would duplicate the dedup + inline-edit lifecycle for no behavioural gain.
- **Feature 2: a snapping dependency (e.g. mapbox-gl-draw-snap-mode).** Rejected -- the
  pure `snapPoint.ts` math + the in-repo custom-mode precedent cover the need with no new
  dependency and full control over the vertices-first priority.
- **Feature 2: live-recomputed targets per click.** Deferred -- targets captured at mode
  start match the confirmed "snap to existing" scope; recomputing mid-draw (to snap onto
  the in-progress feature) is a future extension.

## Consequences

- Read-existing Act objectives now surface working adopt-building / adopt-water tools,
  guarded green by `actToolCoverage.test.ts` (every emitted id resolves; every override
  key is a real objective).
- Fence + paddock draw sessions snap to existing fences / paddocks / boundary / structures
  (vertices and edges); the capability is exposed on the shared hook for other tools.
- No store/schema changes, no new dependency, no deletion of legacy components.

## Verification

- **tsc:** `apps/web` `npx tsc --noEmit` -> EXIT=0 (clean, zero errors).
- **vitest** (bounded, `--pool=forks --testTimeout=20000`): `snapDrawPoint` (5) +
  `actToolCoverage` (17) + `act/asBuilt` (34) -> **56 passed**.
- **Live preview** (web dev server :5200): Feature 1 verified prior session via `/@fs/`
  source import (building objectives -> `adopt-building` first, water objectives ->
  `adopt-water` first, `s4-water-strategy` -> no adopt). Feature 2 verified via `/@fs/`
  dynamic import of the live Vite bundle: `snapDrawPoint` returns vertex/line/null
  correctly; `snapDrawModes` exports `snap_draw_line_string` / `snap_draw_polygon` and the
  modes carry `onSetup` / `onClick` / `onMouseMove` overrides; `useMapboxDrawTool`,
  `usePlanSnapTargets`, and `PlanDrawHost` module graph resolves. `preview_screenshot`
  hangs on the WebGL map ([[project-screenshot-hang]]); relied on module + unit proof.

## Process / covenant

Two explicit-path commits (`9d0ddae2`, `9728c923`); each staged only its named files by
path (`git diff --cached --name-only` confirmed exactly the intended set against a tree
with foreign WIP, left untouched). Messages BOM-free UTF-8 via
`[System.IO.File]::WriteAllText` + `git commit -F`, ASCII-only,
`Co-Authored-By: Claude Opus 4.8`. Branch fetched + divergence-checked (0 behind / ahead),
**not pushed** ([[project-branch-rebase]]). Commit-on-verify
([[feedback-commit-immediately-on-rebased-branches]]).

## Follow-up (2026-06-04): snap rolled out to all Plan line/polygon tools

The Decision's closing note ("other line/polygon tools can opt in by passing the same two
props") was acted on the same day. Commit `aecc6322` (`feat/atlas-permaculture`, **not
pushed**) extends the opt-in `snap` + `getSnapTargets` wiring -- reusing the **same**
shared `usePlanSnapTargets` source -- to every remaining Plan line/polygon draw path:

- **8 dedicated tools:** FlowConnector, MonitoringTransect, PathLine, UtilityRun,
  WaterSwale (lines); WaterCatchment, ZonePolygon, CropArea (polygons). Each gains a
  `parcelBoundary?` prop, calls `usePlanSnapTargets`, and passes `snap: true` +
  `getSnapTargets` into its existing `useMapboxDrawTool`; `PlanDrawHost` threads
  `parcelBoundary` into each switch case.
- **Design-element host path:** `useDesignElementDrawTool` now forwards optional
  `snap` / `getSnapTargets` into its inner `useMapboxDrawTool` (pure pass-through, inert
  for `draw_point` kinds); `PlanDesignElementHost` supplies `snap: true` +
  `usePlanSnapTargets`. Covers all line/polygon element kinds in one place.
- **Plan BE proposed-structures:** `BeV2ExistingTool` (shared observe-layer component)
  gains optional `snap` / `getSnapTargets` props **driven from the host** -- `PlanDrawHost`
  calls `usePlanSnapTargets` once near the top (before its early return, per rules of
  hooks) and passes it into the `PLAN_BE_PREFIX` branch. `ObserveDrawHost` passes neither,
  so Observe stays snap-off and no observe->plan import is introduced.

Point tools never snap (no snap mode for `draw_point`); Observe/Act behaviour unchanged;
default `snap=false` keeps every untouched caller byte-for-byte identical. No store/schema
change, no new dependency, no deletion. **Verification:** `tsc --noEmit` EXIT=0; bounded
vitest `snapDrawPoint` (5) + `actToolCoverage` (17) green; all 5 edited/related modules
resolve + load in the live Vite bundle and the snap modes export as expected
(`/@fs/` import proof -- `preview_screenshot` hangs on the WebGL map,
[[project-screenshot-hang]]); live snap-mode engagement already proven on the identical
shared hook in `9728c923`. One explicit-path commit (12 files), foreign WIP left untouched,
**not pushed**.
