# 2026-06-11 — Plan tier shell: adopt Act's 4-rail map-centric layout, promote to default

**Branch:** `main` · **Commit:** `56b8170b` (9 files, +1179/-29; not pushed)
**Plan:** `C:\Users\MY OWN AXIS\.claude\plans\i-d-like-for-the-expressive-parrot.md` (approved)

## What

Built `PlanTierShell` mirroring [[entities/act-tier-shell]] 1:1 and made it the default Plan page for every project. Operator request: *"I'd like for the Plan stage to adopt the UI layout of the Act stage."* `ActTierShell` is a convergence of Plan's two legacy shells (`module-bar`, `stratum-spine`) into one map-centric 4-rail view; `PlanTierShell` adopts that layout exactly while keeping Plan's defining behavior — an **editable** design canvas where Act is read-only.

## Changes (9 files)

- **NEW `apps/web/src/v3/plan/tier-shell/PlanTierShell.tsx`** (~600 lines) — primary deliverable. `StageShell` (`bottomPlacement="between-rails"`, `symmetricRails`) with spine + leftRail/canvas/rightRail/bottomTray. Center = editable `VisionLayoutCanvas` + `DesignElementLayers` + `PlanDrawHost` + `PlanPhaseTabs`; right rail = `ObjectiveDetailPanel` with `hideMap` (map lives only in center). Spine/objective statuses via the Plan **locking** engines `computeAllStratumStates` + `computeAllObjectiveStatuses` (NOT Act's never-lock rollup). URL-derived stratum/objective selection on the existing Plan routes.
- **NEW `planToolCatalog.ts`** — `PLAN_TOOL_CATEGORIES = [...ACT_TOOL_CATEGORIES, { id: 'modules', label: 'Modules' }]`; `PLAN_MODULE_TOOLS`; `resolvePlanTools`. `handleActivateTool` dispatches on `arm.kind`: `'map'` → editable Plan draw tool, `'module'` → `PlanModuleSlideUp` (`setSlideUpModule`), `'form'` → capture.
- **NEW `PlanTierCategorizedToolsRail.tsx`** — wrapper over the Act rail rendering; `tools = [...objectiveTools, ...PLAN_MODULE_TOOLS]`, so the Modules row never short-circuits to empty.
- **MOD `PlanLayout.tsx`** — `if (planShellMode === 'tier-shell') return <PlanTierShell />;` ahead of the legacy branches.
- **MOD `projectStore.ts`** — `getPlanShellMode` default → `'tier-shell'`; explicit per-project value still wins; no persist migration.
- **MOD `routes/index.tsx`** — comment-only (no new routes; existing Plan params drive the shell).
- **MOD `ActTierObjectiveRail.tsx`** — additive `hideModeToggle?: boolean` (default false); pins rail to `'objectives'` and hides the mode bar when set. Reused by `PlanTierShell`, Act byte-unchanged.
- **MOD `ActTierSpine.tsx`** — additive `ariaLabel?: string` (default `'Act strata'`); `PlanTierShell` passes `'Plan strata'`.
- **MOD `projectStore.shellModes.test.ts`** — Plan defaults now assert `'tier-shell'` (builtin + non-builtin); explicit-override assertions unchanged.

## Reconciliation: "replace both shells" + no-deletion

Same mechanism Act used: defaulting `getPlanShellMode` to `'tier-shell'` means nobody lands on a legacy shell by default (the "replace both shells" decision), while the `stratum-spine` / `module-bar` branches stay in `PlanLayout` and on disk, reachable via the per-project toggle ([[feedback-no-deletion]]). Full branch removal is deferred to the cleanup that also retires Act's legacy shells.

## Verified

`projectStore.shellModes.test.ts` 17/17 pass; tsc clean. All three Plan shells render: tier-shell (default, "351 House"); legacy `stratum-spine` and `module-bar` (both reachable via the toggle on the builtin `mtc` sample — no-deletion confirmed). **Server-synced vs local quirk found:** local `planShellMode` overrides on server-synced projects (351 House) are reverted by WS re-sync; builtin/local projects (`mtc`, `serverId: null`) persist them — so the legacy-shell regression check used `mtc`. **Screenshot proof BLOCKED** by the deterministic WebGL/map-mount preview hang ([[project-screenshot-hang]]) — disclosed throughout, never claimed; fell back to DOM/a11y structure + bounded vitest ([[feedback-vitest-bounded-runs]]).

## Discipline

Committed only my 9 files via explicit pathspec; the 4 pre-existing parallel "guild-rings / layer-ordering" WIP files (`ActTierShell.tsx` +1, `actToolCatalog.ts` +7, `DesignElementLayers.tsx` +73, `objectiveActTools.ts` guild refs) were left dirty and untouched. On `main`, nothing pushed ([[project-structured-capture-on-main]]).

Amanah: pure layout/IA work — no capital, sale, advance-purchase, or financing surface; no riba/gharar/`bayʿ mā laysa ʿindak`/CSRA/salam framing ([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]).

ADR: [[decisions/2026-06-11-atlas-plan-tier-shell-adoption]]; entity [[entities/plan-tier-shell]]; mirrors [[entities/act-tier-shell]].
