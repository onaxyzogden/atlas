# 2026-06-13 — Plan slope-survey % fix + survey overlay toggle + generic objective-tools map takeover

**Project:** Atlas (OLOS) · **Branch:** `main` · **Surface:** `apps/web` (v3 Plan/Act tier shells)
**Plan:** `the-early-tiers-stratum-objectives-mossy-turtle` (3 slices, 3 independent commits, no push)
**Test project:** `9f8f3100-b804-42a1-bdf6-38ac24df95b6` (server-backed)

Three operator-reported items from testing the Plan `s2-terrain` slope survey, executed as three
independent `main` commits (explicit per-file `git add`; all concurrent operator WIP left unstaged;
nothing pushed).

## Slice 1 — Bug #1: drawing slope polygons did not update per-class % (commit `9c406701`)

**Symptom:** drawing slope-class polygons in the Plan `s2-terrain` survey left every class at 0% / "—".
**Diagnosed (not blindly patched):** the survey polygons are turf-measured in **acres**, but
`SlopeSurveyPanel`/`SlopeSurveySummary` were resolving site size from `project.location.acreage`, which is
(a) a **display-unit** value (hectares under metric) and (b) **zeroed by `adaptLocalProjectToV3` when
`areaKnown` is false even when a boundary polygon exists** → `safeSite = 0` → every `pct = 0` (the
`selectSlopeSurveyTotals` guard at `slopeSurveyStore.ts` clamps a non-positive site to 0).
**Fix:** new resolver `resolveSiteAcres(location)` (`apps/web/src/v3/data/siteArea.ts`) that prefers the
**turf-measured parcel boundary in acres** (matching the drawn polygons' units), falling back through the
display acreage only when no boundary exists. `SlopeSurveyPanel` / `SlopeSurveySummary` (and the vegetation
twins) now resolve site acres through it. Probe logs removed before commit.

## Slice 2 — Feature #2: survey overlay toggle (commit `da089d52`)

Added show/hide overlay toggles for the **drawn** survey extents, following the matrix-toggle idiom:
- `matrixTogglesStore.ts` — new `MatrixToggleKey`s `slopeSurvey` + `vegetationSurvey`, **default ON**
  (drawn extents visible by default, like `placedZones`); persist **version 15 → 16** with a migrate clause
  seeding both `true` for existing snapshots.
- `BaseMapCard.tsx` — two `DEFAULT_OVERLAYS` rows; both added to `STAGE_HIDDEN.observe` only (the survey
  layers mount on **Plan + Act**, never Observe, so the rows show on Plan/Act and are hidden on Observe).
- `SlopeSurveyLayer.tsx` / `VegetationSurveyLayer.tsx` — subscribe the matching key and apply
  `setLayoutProperty(id, 'visibility', …)` over `[fill, line, label]` **inside `apply()`** (re-applies across
  data rebuilds + style reloads), `visible` in the effect deps.
- Follow-on type fix: `ObserveAnnotationLayers.tsx` excludes both new keys from `LayerSpec['toggleKey']`
  (parallel to `waterRouter`) so the exhaustive `subToggles` literal stays valid.

## Slice 3 — Feature #3: generic "open map with tools" takeover, Plan-wired (commit `304e6997`)

Generalized the two bespoke survey takeovers into a reusable, **objective-scoped** focused map+tools mode.
**Grain = per draw/place objective** (the catalog is keyed per-objective via `getObjectiveActTools`); an
objective "needs the map" iff it resolves to **≥ 1 `kind:'map'` tool**.

**New (shell-agnostic, so Act can reuse later):**
- `apps/web/src/store/objectiveToolsTakeoverStore.ts` — ephemeral `{ active, activeProjectId,
  activeObjectiveId, open(pid, oid), close() }`. NOT persisted, NOT in syncManifest (the survey stores
  persist their `byProject` geometry; this carries only the takeover flag). `open()` closes the slope + veg
  survey takeovers (one-directional import → no cycle) for mutual exclusion.
- `apps/web/src/v3/_shared/map-takeover/objectiveMapTools.ts` — `objectiveMapTools` /
  `objectiveNeedsMap`: `resolvePlanTools(getObjectiveActTools(objective)).filter(arm.kind === 'map')`.
- `OpenMapToolsButton.tsx` — "Open map with tools"; self-gates to `objectiveNeedsMap` (renders nothing for
  non-spatial objectives).
- `ObjectiveToolsPanel.tsx` (+ `mapTakeover.module.css`) — focused right-rail tool grid, grouped by
  `PLAN_TOOL_CATEGORIES`; arms via `useMapToolStore.setActiveTool` (pure toggle, no shell dispatcher); Done
  disarms + closes. Map-arm tools only (the bottom `PlanTierCategorizedToolsRail` keeps the full set).

**Plan wiring (`PlanTierShell.tsx`, non-WIP):** compute `toolsTakeoverActive = store.active &&
activeProjectId === id && activeObjectiveId === objectiveId`; append `&& !toolsTakeoverActive` to
`showTierZeroWorkbench` (so a Tier-0 draw/place objective yields the workbench to the map, reaching its draw
hosts — Tier-0 has no bottom tools rail otherwise); swap the right rail to `<ObjectiveToolsPanel>` when
active; mount `<OpenMapToolsButton>` in the **objective-detail rail** (`rightMode` defaults to `'detail'` for
any selected objective, so it's discoverable). **Reverse hygiene:** the two survey summaries now `close()`
the generic takeover when opening their survey.

**Plan deviation (recorded):** the plan named `DecisionWorkingPanel` as the button mount, but that component
is decision-item-scoped and has **no `PlanStratumObjective` in scope** — threading one in would change its
contract (undiscussed). Mounted in `PlanTierShell`'s objective-detail rail instead, where `selectedObjective`
is available and the surface is Plan-only (mounting in the shared `ObjectiveDetailPanel` would surface a dead
button in Act, where the takeover is deferred). Also resolves tools via `resolvePlanTools` (Plan twin), and
gates on `kind:'map'` (strictly: the plan's `getObjectiveActTools().length > 0` would render a dead button
for form/flow-only objectives).

**Deferred (next session):** Act-side wiring — mount `ObjectiveToolsPanel` + `OpenMapToolsButton` in
`ActTierShell.tsx`. Deferred because `ActTierShell.tsx` is currently operator WIP; the store + components are
shell-agnostic, so it's a small follow-up with no new mechanism. See [[entities/act-tier-shell]].

## Verification

`npm run typecheck` (web, `--max-old-space-size=8192`) EXIT 0 after each slice — only the **4 pre-existing
baseline errors** remain (`syncServiceWorkItemsFallback.test.ts` ×1, `WorkConflictSection.test.tsx` ×3; both
committed test files, foreign, unrelated). Bounded vitest (`--pool=forks --singleFork`,
[[feedback-vitest-bounded-runs]]): new `objectiveToolsTakeoverStore.test.ts` **5/5** (open/close + cross-store
hygiene) + `vegetationSurveyStore.test.ts` **13/13** regression = 18/18. **Live map-mount probe skipped** per
the deterministic v3 WebGL/map-mount preview hang ([[project-screenshot-hang]]) on a server-backed project —
disclosed; relied on static + unit proof, consistent with Slices 1–2 (the wiring mirrors the already-shipped
survey takeover exactly).

## Amanah

Pure bug-fix / overlay-visibility / map-tooling-IA work — no capital, sale, advance-purchase, or financing
surface; no riba/gharar/`bayʿ mā laysa ʿindak`/CSRA/salam framing; Feature #3 only surfaces existing draw
tools per objective and adds no economic instrument ([[fiqh-csra-erased-2026-05-04]],
[[feedback-csa-in-catalogues]]).

Entity: [[entities/plan-tier-shell]]; deferred-Act note on [[entities/act-tier-shell]].
