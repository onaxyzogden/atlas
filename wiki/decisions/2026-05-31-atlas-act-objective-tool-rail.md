# ADR: Act tier-shell bottom rail is objective-driven; arming Plan/Observe tools on the Act canvas

**Date:** 2026-05-31
**Status:** Accepted
**Branch:** `feat/atlas-permaculture` (commits `e6030252` Parts A-D -> `90820e9e` ActOpsDashboard -> `94291d51` map-first wiring; interleaved with foreign commits by the out-of-band rebase [[project-branch-rebase]]; not pushed)
**Plan:** `~/.claude/plans/lets-promote-the-stratum-transient-tower.md`

## Context

The Act tier-shell promotion ([[decisions/2026-05-30-atlas-act-tier-shell-promotion]])
shipped its bottom rail (`ActTierToolsRail`) as three always-on field logs
(harvest / water / livestock) drawn straight from `QUICK_LOGS`. That ADR's
follow-up list explicitly deferred "per-objective tool relevance in the bottom
rail." Two operator requests, captured on the live rail, drove this slice:

1. The bottom toolbar should hold the tools relevant to the **chosen
   objective** -- a categorized panel (Terrain & Survey / Access & Utilities /
   Structures / Production Systems / Field logs) filtered by the selected
   objective, like the throwaway `act/tier-prototype` shape. Field logs stop
   being defaults and become objective-conditional.
2. Port the prototype's ops-card dashboard into the **field-action** surface,
   replacing the all-tasks `ViewBDashboard` in its no-objective right panel.

Three binding operator decisions (AskUserQuestion):
- **Tool relevance -> author an EXPLICIT per-objective->tool map** (net-new
  product data; not domain-driven reuse, not show-all).
- **Tool behavior -> wire each tool to a REAL map placement/draw action now**
  (not a visual stub).
- **Dashboard scope -> field-action only.** The tier-shell keeps its task-list
  dashboard + Dashboard/Objective toggle; `ViewBDashboard` is preserved.

## Decision

### 1. Explicit objective->tool map (net-new product data)

`packages/shared/src/relationships/objectiveActTools.ts` mirrors
`objectiveObserveDomains.ts`: a per-objective override table
(`OBJECTIVE_ACT_TOOLS_OVERRIDE`) over a per-stratum default backstop
(`STRATUM_ACT_TOOLS_DEFAULT`), resolved by `getObjectiveActTools(objective)`.
It returns **catalogue-id strings only** (e.g. `'contour'`, `'paddocks'`,
`'harvest'`) so it stays free of app-layer deps; exported from the ROOT
`@ogden/shared` barrel (not the relationships barrel), matching the
observe-domains precedent. The mapping is authored, not derived:

- s1-vision / s1-stewardship -> `[]` (non-spatial -> empty state)
- s2-land-baseline -> contour, drainage, soil, vegetation, erosion
- s3-systems-baseline -> roads, power, water-lines, gates, fencing, buildings
- s4-zones-sectors -> roads, gates, fencing, buildings
- s5-water-strategy -> water-lines, tanks, wells, water (log)
- s6-yield-flows -> crops, orchards, paddocks, beds, compost, harvest (log), livestock (log)
- s7-phasing -> buildings, barns, tanks

### 2. App-layer catalogue joins ids to real arming actions

`apps/web/src/v3/act/tier-shell/actToolCatalog.ts` is the single source of truth
joining each catalogue id to its label, lucide icon, category, and the REAL
action it arms via a discriminated union `ActToolArm`:
- `{ kind: 'map'; mapToolId: MapToolId }` -- arms a placement/draw tool through
  `useMapToolStore.setActiveTool`. **Every `mapToolId` literal is checked
  against the `MapToolId` union by `tsc`** -- a typo fails the build, the
  primary safety net for the 21 placement tools.
- `{ kind: 'log'; quickLogId: string }` -- routes through the existing
  `QUICK_LOGS` (act.* field logs); no duplication of log definitions.

Analysis-only prototype tools (`slope`, `aspect`, `dem`) are OMITTED -- they
have no draw tool and no store, so an un-armable button is worse than absence.

`ActTierCategorizedToolsRail` renders only the non-empty categories for the
selected objective (collapsible, default expanded), with armed-tile
highlighting from `useMapToolStore`, and two empty states (no objective ->
"Select an objective to see its tools"; non-spatial objective -> "This
objective has no map tools").

### 3. Mount Observe/Plan DrawHosts on the Act canvas (the ADR-7 tension)

The Act tier-shell canvas previously mounted only `ActDrawHost` (handles
`act.*`), so arming an `observe.*` / `plan.*` id was a no-op there. "Wire to
real actions" therefore required mounting `ObserveDrawHost` and `PlanDrawHost`
beside `ActDrawHost`. Each host hard-guards on its own id prefix and returns
`null` otherwise, so the three compose safely; only one tool is armed at a time.

This **crosses the ADR-7 stage boundary** ("Act executes + collects; Plan
decides"). It is mitigated, not ignored:
- All three hosts write to the **shared stores** (`builtEnvironmentStoreV2`,
  crop/livestock/design-element stores) -- one source of truth, no Act-only
  shadow copy of geometry.
- `PlanDataLayers` stays `editable={false}` on the Act canvas. That flag gates
  EDITING existing Plan features (its `if (!editable) return` guards live in
  the selection/edit effects), **not** new-feature drawing. So Act can ADD
  placements but cannot EDIT Plan decisions -- add-only, preserving the spirit
  of "Plan decides."

### 4. Field-action ops dashboard (scope-limited)

`ActOpsDashboard` (a permanent equivalent of the prototype-only
`ActProtoDashboard`) stacks the four production-wired ops cards -- WeatherStrip,
TodaysPriorities, AlertsPanel, UpcomingEvents -- and replaces `ViewBDashboard`
in the **no-objective** branch of `ActMapFirstLayout` only. The objective branch
still renders `ViewAObjectiveExecution`. `ViewBDashboard` is preserved (still the
tier-shell's dashboard mode) per [[feedback-no-deletion]].

## Consequences

- Selecting an objective on the tier-shell reveals exactly the tools that
  objective calls for; arming one places a real, persisted feature on the Act
  canvas. The bottom rail is no longer a fixed three-log strip.
- A second cross-stage seam now exists: Act mounts Plan/Observe draw tools.
  This is deliberate and load-bearing -- do **not** "purify" it back to
  ActDrawHost-only without re-solving "wire tools to real actions." The
  `editable={false}` + shared-store invariants are what keep it ADR-7-honest.
- The objective->tool map is **product data, authored by hand.** New objectives
  without an override fall through to the per-stratum default; a brand-new
  stratum with neither resolves to `[]` (empty state, not show-all).
- Catalogue <-> `MapToolId` drift is caught by `tsc`; a union-valid id that
  lacks a DrawHost dispatch branch is caught only by the manual arm-each pass
  (done this slice for all 21).
- Closes the "per-objective tool relevance" follow-up from
  [[decisions/2026-05-30-atlas-act-tier-shell-promotion]].

## Verification

- Web `tsc --noEmit` clean for all changed files (the only remaining web tsc
  errors are foreign `ORCHARD_SECONDARY_*` from a parallel session's uncommitted
  work). Two initial closure-narrowing errors (TS dropping the `ActToolArm`
  discriminant inside a `.find` callback) were fixed by hoisting `tool.arm` to a
  `const` before the closure.
- Live preview (functional, DOM via `preview_eval` / `preview_inspect`):
  s2-land-baseline -> only the Terrain & Survey category with its 5 tools;
  s6-yield-flows -> Production Systems (5) + Field logs (harvest, livestock),
  with the water log correctly absent (it belongs to s5); no-objective -> empty
  state. Arming "Paddocks" flipped its tile to `data-active=true` AND mounted a
  real `PlanDrawHost` PADDOCK draw dock on the Act canvas (proving the cross-stage
  arming works end to end). Field-action no-objective panel renders the four ops
  cards via `ActMapFirstLayout` (`preview_inspect` confirmed the component +
  card content), not the task list.
- **`preview_screenshot` unresponsive (disclosed, not assumed):** hung at 30s on
  the live MapLibre WebGL canvas even after the API:3001 was restarted to HTTP
  200 (documented transient [[project-screenshot-hang]]); verified via DOM /
  component inspection instead.

CSRA model untouched ([[fiqh-csra-erased-2026-05-04]]); ASCII-only copy.
Entity: [[entities/act-tier-shell]]. Log: [[log/2026-05-31-act-objective-tool-rail]].
