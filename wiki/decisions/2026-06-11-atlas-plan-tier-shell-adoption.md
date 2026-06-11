# 2026-06-11 — Plan tier shell: Plan adopts Act's 4-rail map-centric layout, promoted to default

**Status:** Accepted · Shipped commit `56b8170b` (9 files, +1179/-29) on `main`, not pushed.
**Branch:** `main` ([[project-structured-capture-on-main]]).
**Plan:** `C:\Users\MY OWN AXIS\.claude\plans\i-d-like-for-the-expressive-parrot.md` (approved).

## Context

The Act stage was rebuilt around a **4-rail, map-centric "tier shell"** ([[entities/act-tier-shell]]): top stratum spine, left objective rail, center map, right dashboard/detail, bottom categorized snap-scrolling tools rail. The Plan stage still ran on **two older shells** selected by `getPlanShellMode(project)` — the legacy module-driven `module-bar` (`PlanLayout`) and the dark/gold 3-column `stratum-spine` (`PlanStratumShell`, map embedded in the right `ObjectiveDetailPanel`). The two felt unlike each other and unlike Act. Operator request, verbatim: *"I'd like for the Plan stage to adopt the UI layout of the Act stage."*

The load-bearing insight: `ActTierShell` is effectively a **convergence** of Plan's two shells into one map-centric view. The only behavioral divergence is that **Plan edits design geometry** (editable draw host) where Act places evidence read-only.

## Decision

Build a new `PlanTierShell` that mirrors `ActTierShell` 1:1, and make it the **default Plan shell for every project** — exactly how Act promoted `tier-shell` without deleting `field-action`/`command-centre`.

1. **`getPlanShellMode` defaults to `'tier-shell'`** (`projectStore.ts`) — explicit per-project `planShellMode` still wins (toggle invariant); no persist migration. So every project — builtin and new — opens straight into `PlanTierShell`, satisfying "replace both shells" (nobody lands on a legacy shell by default).
2. **No-deletion** — the `stratum-spine` and `module-bar` branches stay in `PlanLayout` and on disk, reachable via the per-project toggle ([[feedback-no-deletion]]). Full branch removal is deferred to the project-wide cleanup that also retires Act's legacy shells.
3. **`PlanTierShell` reuses Act's chrome, not a fork** — same `StageShell` slot layout (`bottomPlacement="between-rails"`, `symmetricRails`); reuses `ActTierSpine`, `ActTierObjectiveRail`, and the `ActTierCategorizedToolsRail` rendering. Two Act components gained **additive, defaulted props** so the reuse needs no fork and Act is byte-unchanged: `ActTierObjectiveRail` `hideModeToggle?: boolean`, `ActTierSpine` `ariaLabel?: string`.
4. **The one divergence: editable center canvas.** The center mounts Plan's **editable** `VisionLayoutCanvas` + `DesignElementLayers` + `PlanDrawHost` + `PlanPhaseTabs` (Act mounts the read-only Act substrate). The right rail uses `ObjectiveDetailPanel` with `hideMap` so the map lives only in the center.
5. **Plan locking engines, not Act's rollup.** The spine + objective statuses use `computeAllStratumStates` + `computeAllObjectiveStatuses` (Plan gates genuinely lock), NOT Act's never-lock `computeAllActStratumStates`.
6. **Plan-only `'modules'` tool category** — `planToolCatalog.ts` extends `ACT_TOOL_CATEGORIES` with `{ id: 'modules' }`; those tiles arm kind `'module'` → open `PlanModuleSlideUp` (`setSlideUpModule`). `'map'` arms an editable Plan draw tool; `'form'` opens the capture. Objective→tool-id list reuses `getObjectiveActTools` (already keyed by real Plan objective ids).

## Consequences

- Plan and Act now read as one continuous map-centric surface; the IA seam between stages is gone.
- The toggle still reaches both legacy shells; `projectStore.shellModes.test.ts` updated so Plan defaults assert `'tier-shell'` (builtin + non-builtin), explicit-override assertions unchanged (17/17 pass, tsc clean).
- **Server-synced vs local persistence quirk:** server-synced projects (e.g. "351 House") have local `planShellMode` overrides reverted by WS re-sync; builtin/local projects (e.g. `mtc`, `serverId: null`) persist overrides. Regression check for the legacy shells must use a builtin/local project.
- Screenshot proof BLOCKED by the deterministic WebGL/map-mount preview hang ([[project-screenshot-hang]]) — disclosed; verification fell back to DOM/a11y structure + bounded vitest.
- Deferred: full removal of the two legacy Plan-shell branches (joins Act's legacy-shell retirement).

Amanah: pure layout/IA work — no capital, sale, advance-purchase, or financing surface; no riba/gharar/`bayʿ mā laysa ʿindak`/CSRA/salam framing ([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]).

Mirrors [[decisions/2026-05-30-atlas-act-tier-shell-promotion]]; entity [[entities/plan-tier-shell]]; Log: [[log/2026-06-11-atlas-plan-tier-shell]].
