# Plan Tier Shell

**Type:** module (v3 Plan surface) · **Status:** active (default Plan page) · **Surface:** Atlas web (`apps/web`)
**Path:** `apps/web/src/v3/plan/tier-shell/` · **Branch:** `main`

The default Plan page. A map-centric **4-rail tier shell** that mirrors [[entities/act-tier-shell]] 1:1 — top stratum spine + left objective rail + center map + right dashboard/detail + bottom categorized tools — so Plan and Act read as one continuous surface. Promoted to the default Plan shell for **every** project on 2026-06-11 (commit `56b8170b`); the two legacy Plan shells (`stratum-spine`, `module-bar`) are preserved on disk and reachable only via the per-project toggle (no-deletion convention). ADR: [[decisions/2026-06-11-atlas-plan-tier-shell-adoption]].

## Purpose

The Plan stage previously ran on two unlike shells selected by `getPlanShellMode(project)`:
- **`module-bar`** — the legacy module-driven `PlanLayout` (PlanTools left, design canvas center, PlanReadyCue/PlanChecklistAside right, `PlanModuleBar` bottom, `PlanModuleSlideUp` overlay).
- **`stratum-spine`** — the dark/gold 3-column `PlanStratumShell` (StratumSpine left, ObjectiveColumn center, **map embedded inside** the right-hand `ObjectiveDetailPanel`).

Neither felt like the other, and neither felt like Act. `ActTierShell` is effectively a convergence of those two shells into one map-centric view. `PlanTierShell` adopts that exact layout while keeping Plan's defining behavior: **Plan edits design geometry** (editable `VisionLayoutCanvas` / `DesignElementLayers` / `PlanDrawHost`) where Act places evidence read-only.

## Key files

- `apps/web/src/v3/plan/tier-shell/PlanTierShell.tsx` (~600 lines) — the shell. Mirrors `ActTierShell`'s structure (`StageShell` with `bottomPlacement="between-rails"`, `symmetricRails`; spine + leftRail/canvas/rightRail/bottomTray slots). Center canvas = **editable** Plan design surface + `PlanPhaseTabs`; right rail = `ObjectiveDetailPanel` with `hideMap` (the map lives only in the center).
- `apps/web/src/v3/plan/tier-shell/planToolCatalog.ts` — app-layer catalog mirroring `actToolCatalog.ts`. `PLAN_TOOL_CATEGORIES = [...ACT_TOOL_CATEGORIES, { id: 'modules', label: 'Modules' }]` (Plan-only `'modules'` category); `PLAN_MODULE_TOOLS`; `resolvePlanTools`.
- `apps/web/src/v3/plan/tier-shell/PlanTierCategorizedToolsRail.tsx` — thin wrapper over the Act rail rendering; `tools = [...objectiveTools, ...PLAN_MODULE_TOOLS]`, so the Modules row is always present (never short-circuits to empty).

## API / wiring

- **Entry branch:** `apps/web/src/v3/plan/PlanLayout.tsx` — `if (planShellMode === 'tier-shell') return <PlanTierShell />;` ahead of the legacy `stratum-spine` / `module-bar` branches. No new routes; `plan`, `plan/stratum/$stratumId`, and `plan/stratum/$stratumId/objective/$objectiveId` already mount `PlanLayout`, and `PlanTierShell` reads stratum/objective from those existing params (same approach Act uses).
- **Shell-mode default:** `apps/web/src/store/projectStore.ts` — `getPlanShellMode` returns the project's explicit `planShellMode` if set, else defaults to `'tier-shell'`. No persist migration; explicit per-project values win (toggle invariant). The `planShellMode` key is in the builtin-writable allowlist, so the per-stage toggle works on builtin samples — but server-synced projects have local overrides reverted by WS re-sync (builtin/local projects persist them).
- **Status engines:** uses the Plan **locking** engines (`computeAllStratumStates` + `computeAllObjectiveStatuses`), NOT Act's never-lock `computeAllActStratumStates` — Plan gates genuinely lock.
- **Tool arming:** `handleActivateTool` dispatches on `tool.arm.kind` — `'map'` arms an editable Plan draw tool (`useMapToolStore` + `PlanDrawHost`); `'module'` opens `PlanModuleSlideUp` (`setSlideUpModule`); `'form'` opens the text/decision capture.

## Additive changes to shared Act components (reuse, not fork)

Two Act presentational components gained additive, defaulted props so `PlanTierShell` reuses them without forking (no behavioral change to Act):
- `ActTierObjectiveRail.tsx` — `hideModeToggle?: boolean` (default false); when set, the mode bar is hidden and the rail is pinned to `'objectives'`.
- `ActTierSpine.tsx` — `ariaLabel?: string` (default `'Act strata'`); `PlanTierShell` passes `'Plan strata'`.

## Dependencies

`StageShell` slot chrome · `ActTierSpine` / `ActTierObjectiveRail` (reused, parameterized) · `ActTierCategorizedToolsRail` rendering · `getObjectiveActTools` (`packages/shared/src/relationships/objectiveActTools.ts`, keyed by real Plan objective ids) · `VisionLayoutCanvas` / `DesignElementLayers` / `PlanDrawHost` (editable design canvas) · `ObjectiveDetailPanel` (`hideMap`) · `PlanModuleSlideUp` · `computeAllStratumStates` / `computeAllObjectiveStatuses`.

## Current state

Shipped and default on `main` (commit `56b8170b`, 9 files, +1179/-29; not pushed at session close). All three Plan shells verified to render: tier-shell (default, "351 House"), legacy `stratum-spine` and legacy `module-bar` (both reachable via toggle on the builtin `mtc` sample). `projectStore.shellModes.test.ts` updated — Plan defaults now assert `'tier-shell'` for builtin + non-builtin; explicit-override assertions unchanged. 17/17 tests pass; tsc clean. Screenshot proof BLOCKED by the deterministic WebGL/map-mount preview hang ([[project-screenshot-hang]]) — disclosed, fell back to DOM/structural verification.

Amanah: pure layout/IA work — no capital, sale, advance-purchase, or financing surface; no riba/gharar/`bayʿ mā laysa ʿindak`/CSRA/salam framing ([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]).

Mirrors [[entities/act-tier-shell]]. ADR: [[decisions/2026-06-11-atlas-plan-tier-shell-adoption]]. Log: [[log/2026-06-11-atlas-plan-tier-shell]].
