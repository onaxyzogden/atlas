# 2026-05-30 -- Act Tier Shell: promote the map-centric prototype to the real default Act page (`tier-shell` mode)

**Status:** Accepted
**Branch:** `feat/atlas-permaculture` (commits `f2347537` shared Phase 0 -> `4f46b47d` web Phases 1-2+tests; not pushed -- out-of-band rebase [[project-branch-rebase]])
**Plan:** `~/.claude/plans/make-the-act-tier-prototype-to-gentle-salamander.md`

## Context

The Act stage shipped `field-action` (`ActMapFirstLayout`) as default: a map canvas
with a right-docked panel holding the store-backed View B dashboard / View A
objective-execution surfaces. Separately, `act/tier-prototype` (`ActProtoTierShell`)
was a throwaway 4-rail concept the operator validated against concept screenshots
-- **top** stratum spine, **left** objectives rail, **center** map, **bottom**
digital-tools rail, **right** dashboard/execution toggle -- running on mock data and
the static objective skeleton, local state only.

The operator asked that the prototype's 4-rail shape become the **real** Act page
with objectives on the **left**, wired to real stores. Confirmed via AskUserQuestion:
promote as a **new shell mode** (not an in-place rewrite), **all four rails on real
data now** (including the bottom tools rail actually arming map tools), aesthetic
left as polish-only (the prototype already inherits the shipped grey+gold chrome
tokens).

## Decision

1. **New default `ActShellMode` `'tier-shell'`.** Extend the union to
   `'tier-shell' | 'field-action' | 'command-centre'` and flip `getActShellMode`'s
   default from `field-action` to `tier-shell`. Explicit per-project values still
   win (toggle invariant; no persist migration needed). `ActShellToggle` becomes
   3-way. `field-action` + `command-centre` stay reachable behind the toggle -- the
   no-deletion-in-revamps rule ([[feedback-no-deletion]]); `tier-prototype/` is left
   untouched and is **copied, not imported**.

2. **Act-specific stratum-execution semantics (new pure helper).** New
   `packages/shared/src/relationships/actStratumExecution.ts` rolls field-action
   **execution** status up per stratum. Crucially it does NOT reuse the Plan-side
   `stratumState.ts`/`computeStratumState`, which returns `locked` for empty or
   prerequisite-gated strata: **Act execution reaches every stratum, so it never
   returns `locked`.** Semantics: empty/undefined -> `available`; any
   `in_progress|submitted|diverged|blocked` -> `active`; `total>0 && all verified`
   -> `complete`; otherwise `available`. Reads only `{stratumId?, status}`; skips
   actions with no `stratumId`.

3. **URL-driven objective selection; static-prefixed routes.** Objective selection
   rides the URL for deep-link parity with field-action. Because TanStack Router
   cannot carry two dynamic siblings under `act/` (`act/$module` already exists), the
   new routes are static-prefixed: `act/tier-shell` and `act/tier-shell/$objectiveId`
   (the latter `validateSearch`-es `taskId`). Stratum + right-mode + armed-module stay
   local state.

4. **Real data into every rail.** Spine = `computeAllActStratumStates`. Left rail =
   `useProjectObjectives(projectId)` filtered by the selected stratum, each card
   showing a real "N/M verified" chip. Right rail = the already-real `ViewBDashboard`
   / `ViewAObjectiveExecution` behind a dashboard/detail toggle. Bottom rail = the
   real `QUICK_LOGS` registry, **extracted** from `ActTools.tsx` into a shared
   `quickLogs.ts` (single source of truth, no copy-paste drift); arming a tool sets
   the active module + `useMapToolStore.setActiveTool`, which the inline `ActDrawHost`
   picks up. Per-objective progress is computed ONCE in the shell
   (`objectiveProgress.ts`) and passed to both the left rail and the map markers so
   they cannot drift.

5. **Objective marker geometry is the one acceptable non-real bit.**
   `PlanStratumObjective` carries no per-objective geometry, so pins use a
   deterministic centroid-offset (copied locally from the prototype's `protoSeed`
   math, NOT imported). Flagged for a future "real objective geometry" pass.

## Foreign-WIP handling (surgical commit)

`ActLayout.tsx` was already dirty on the rebased branch with an out-of-band foreign
change: an `ActFieldActionLayout` -> `ActMapFirstLayout` import+branch swap depending
on two **untracked** files. Staging the file as-is would have produced a broken commit
(dangling import to an uncommitted file) and authored a foreign feature under this
session. Resolution: commit a **surgical** `ActLayout.tsx` diff -- revert the foreign
hunks to HEAD (keeping only the tier-shell import + branch, so the commit builds
against the tracked `ActFieldActionLayout`), then restore the foreign WIP to the
working tree via backup/restore. No foreign file committed; foreign WIP preserved
([[feedback-no-deletion]], [[feedback-commit-immediately-on-rebased-branches]]).

## Consequences

- The Act stage now opens on the 4-rail tier shell by default; the two legacy shells
  remain a per-project toggle away.
- A second, Act-specific stratum-state function now coexists with the Plan one; their
  divergent `locked` behaviour is intentional and load-bearing -- do not "unify" them.
- **Known seam (deferred):** `ViewAObjectiveExecution`'s "Back to all tasks" still
  navigates to `act/field-action`, not mode-aware. Left as-is this slice.
- Follow-ups: mode-aware ViewA back-nav; real per-objective marker geometry;
  per-objective tool relevance in the bottom rail.

## Verification

- Web `tsc --noEmit` exit 0; shared `tsc` clean + `actStratumExecution.test.ts` 9/9;
  `projectStore.shellModes` 5/5.
- Live preview (functional, DOM via `preview_eval`): `/v3/project/mtc/act` renders the
  4-rail tier shell by default (spine S1-S7 with real objective counts, S2 default);
  spine-click S1 re-filtered the left rail to its 2 objectives with distinct real
  chips ("1/1 verified", "0/1 verified"); objective-click drove the URL to
  `act/tier-shell/s1-vision` + flipped the right rail to ViewA; the bottom "Log
  harvest" click flipped only that tool to `data-active=true` (proving
  `setActiveTool('act.harvest.log-entry')` armed `useMapToolStore`/`ActDrawHost`); the
  toggle still offers Tier shell / Field actions / Command centre.
- **`preview_screenshot` unresponsive (disclosed, not assumed):** hung twice at 30s on
  the live MapLibre WebGL canvas + dead API:3001 (documented transient
  [[project-screenshot-hang]]); verified functionally instead.

Continues the spine work from [[decisions/2026-05-27-atlas-plan-tier-shell-phase1]]
and the [[log/2026-05-30-plan-stratum-rename]] (this shell consumes `PLAN_STRATA` /
`computeStratumState` post-rename). CSRA model untouched ([[fiqh-csra-erased-2026-05-04]]);
ASCII-only copy.
