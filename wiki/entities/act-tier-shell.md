# Act Tier Shell

**Type:** module (v3 Act surface) · **Status:** active (default Act page) · **Surface:** Atlas web (`apps/web`)
**Path:** `apps/web/src/v3/act/tier-shell/` · **Branch:** `feat/atlas-permaculture`

The real, store-backed Act page, promoted from the throwaway 4-rail
map-centric prototype on 2026-05-30 ([[decisions/2026-05-30-atlas-act-tier-shell-promotion]]).
Map-centric layout with the stratum spine above the canvas, the objective
rail on the LEFT, map markers, and a tools rail along the bottom; the RIGHT
panel toggles a dashboard / objective-execution view. `getActShellMode`
defaults to `tier-shell`; `field-action` and `command-centre` are one toggle
away (none deleted, per [[feedback-no-deletion]]).

## Purpose

Give the steward a map-first Act surface where selecting a Plan objective
reveals exactly the field tools that objective calls for, and arming one
places a real, persisted feature on the canvas. Replaces the prototype's
show-everything tool strip with an objective-conditional, categorized rail
(Phase C, 2026-05-31).

## Key files

- `ActTierShell.tsx` — entry; mounts the spine above `StageShell`, the LEFT
  objective rail, the center read-only Act substrate, the bottom tools rail,
  and the RIGHT dashboard/objective toggle. Hosts the DrawHosts (below).
- `ActTierShell.module.css` — shell + category-tile styles (catTile / toolCat
  / toolGrid, +108 lines for the categorized rail).
- `ActTierCategorizedToolsRail.tsx` — bottom rail (Phase C). Renders the
  non-empty tool categories for the selected objective; armed-tile highlight
  from `useMapToolStore`; two empty states. Replaced the always-on three-log
  `ActTierToolsRail` (preserved on disk, no longer mounted).
- `actToolCatalog.ts` — app-layer catalogue joining catalogue-id strings to
  `{ label, icon, category, arm }`. `ActToolArm` is a discriminated union
  `{kind:'map';mapToolId:MapToolId} | {kind:'log';quickLogId:string}`.
  5 categories (terrain-survey, access-utilities, structures,
  production-systems, field-logs); ~21 map tools + 3 logs; `slope`/`aspect`/
  `dem` omitted (analysis-only, un-armable).
- `ActTierToolsRail.tsx` — superseded three-log rail; preserved, unmounted.
- `ActTierObjectiveRail.tsx` / `ActTierObjectiveCard.tsx` — LEFT rail with real
  "N/M verified" chips.
- `ActTierMapMarkers.tsx` — per-objective markers (real geometry,
  hide-until-real, [[decisions/2026-05-31-atlas-act-objective-marker-geometry]]).
- `objectiveProgress.ts` / `objectiveMarkerGeometry.ts` — pure helpers shared
  by rail + markers.

## Data: objective -> tool map

`packages/shared/src/relationships/objectiveActTools.ts` (net-new product data,
mirrors `objectiveObserveDomains.ts`):
- `OBJECTIVE_ACT_TOOLS_OVERRIDE` (per-objective) over
  `STRATUM_ACT_TOOLS_DEFAULT` (per-stratum backstop)
- `getObjectiveActTools(objective): readonly string[]` — override wins, else
  stratum default, else `[]`. Returns catalogue-id strings only (no app deps);
  exported from the ROOT `@ogden/shared` barrel.

Mapping: s1-* -> [] (non-spatial); s2-land-baseline -> terrain/survey set;
s3/s4 -> access + structures; s5-water-strategy -> water systems + water log;
s6-yield-flows -> production systems + harvest/livestock logs; s7-phasing ->
structures.

## DrawHost composition (the ADR-7 seam)

The canvas mounts three DrawHosts side by side, each hard-guarding on its own
id prefix and returning `null` otherwise (one tool armed at a time):
- `ActDrawHost` (`act.*`)
- `ObserveDrawHost` (`observe.*`) — added Phase C
- `PlanDrawHost` (`plan.*`, `variant="current"`, `editable` Plan layers stay
  `false`) — added Phase C

This crosses the ADR-7 stage boundary ("Act executes; Plan decides"); mitigated
by writing through the shared stores (one source of truth) and keeping
`PlanDataLayers editable={false}` (add-only, no editing of Plan decisions). See
[[decisions/2026-05-31-atlas-act-objective-tool-rail]].

## API / arming flow

1. User selects an objective (LEFT rail) -> URL `.../tier-shell/<objectiveId>`.
2. `ActTierCategorizedToolsRail` resolves
   `resolveActTools(getObjectiveActTools(objective))` and groups by category.
3. `onActivate(tool)` -> `handleActivateTool`: `kind:'map'` ->
   `setActiveTool(arm.mapToolId)`; `kind:'log'` -> resolve `QUICK_LOGS` entry,
   `setActiveModule(log.module)` + `setActiveTool(log.toolId)`.
4. The matching DrawHost picks up `activeTool`, mounts its draw dock, and the
   placement persists to the shared store and renders via the data layers.

`MapToolId` drift is caught by `tsc` (every `mapToolId` literal is union-checked).

## Dependencies

- `useMapToolStore` (`v3/observe/components/measure/`) — `{activeTool, setActiveTool}`
- `QUICK_LOGS` (`v3/act/quickLogs.ts`) — field-log definitions (not duplicated)
- `@ogden/shared` — `getObjectiveActTools`, `PlanStratumObjective`
- Shared stores: `builtEnvironmentStoreV2`, crop / livestock / design-element
- `ObserveDrawHost` / `PlanDrawHost` / `ActDrawHost`, `PlanDataLayers`

## Routes

- `act/tier-shell` — dashboard mode
- `act/tier-shell/$objectiveId` — objective-execution mode

## Current state (2026-05-31)

Phase C shipped: categorized objective-driven bottom rail + cross-stage arming
on the canvas (commits `e6030252` rail Parts A-D, not pushed). Field-action got
its own ops dashboard in the same session (`ActOpsDashboard`, commits
`90820e9e` + `94291d51`) but that is a `field-action` surface, NOT this module
(scope: field-action only). tsc-clean for all changed files; live preview
verified functionally via DOM (`preview_screenshot` hung on the WebGL canvas,
disclosed per [[project-screenshot-hang]]).

## Notes

- `ViewBDashboard` is preserved and still the tier-shell's dashboard-mode panel
  (only the field-action surface swapped it for `ActOpsDashboard`).
- TS gotcha: discriminant narrowing of `tool.arm` is DROPPED inside a nested
  `.find` closure -- hoist `const arm = tool.arm` before the closure.
- ASCII-only copy; CSRA model untouched ([[fiqh-csra-erased-2026-05-04]]).
