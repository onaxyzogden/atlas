# 2026-05-30 -- Act Tier Shell promoted to the real default Act page (`tier-shell` mode)

Promoted the throwaway 4-rail map-centric Act prototype (`act/tier-prototype`,
`ActProtoTierShell`) into the **real, store-backed** Act tier page, with objectives
moved to the **left** rail per the operator's ask. Done as a **new shell mode**, not
an in-place rewrite: a new `tier-shell/` folder *copies* (never imports) the
prototype's structure and wires every rail to real stores; `tier-prototype/` and its
route are left untouched, and the two legacy Act shells (`field-action`,
`command-centre`) stay one toggle away ([[feedback-no-deletion]]). Rationale, the
deliberate divergence from the Plan-side stratum-state function, the route shape, and
the surgical foreign-WIP commit are recorded in the ADR
[[decisions/2026-05-30-atlas-act-tier-shell-promotion]]. Two explicit-path commits on
`feat/atlas-permaculture` (`f2347537` shared Phase 0 -> `4f46b47d` web Phases 1-2 +
tests), plus this wiki commit.

## Phase 0 -- shared Act-stratum-execution helper (`f2347537`)

New pure, store-free `packages/shared/src/relationships/actStratumExecution.ts`
(barrel-exported via `relationships/index.ts` + the named re-export block in
`src/index.ts`): `computeActStratumExecution(actions)` tallies per-stratum
`{total, verified, inFlight, notStarted}` in one pass reading only `{stratumId?,
status}` (actions with no `stratumId` skipped); `actStratumStateFromCounts(counts)`
maps to a `PlanStratumState` with **Act semantics**; `computeAllActStratumStates(
stratumIds, actions)` returns the per-stratum record. **Key decision:** it does NOT
reuse Plan's `computeStratumState` (`stratumState.ts`), which returns `locked` for
empty / prerequisite-gated strata -- Act execution reaches every stratum, so it
**never** returns `locked`. Semantics: empty/undefined -> `available`; any
`in_progress|submitted|diverged|blocked` (the IN_FLIGHT set) -> `active`;
`total>0 && all verified` -> `complete`; else `available`.
`tests/actStratumExecution.test.ts` -- 9 cases (empty never locks, all-verified
completes, `total>0` required for complete, any in-flight actives, count tally) --
all green.

## Phases 1-2 -- shell-mode plumbing + the real shell (`4f46b47d`)

**Plumbing.** `projectStore.ts`: `ActShellMode` extended to
`'tier-shell' | 'field-action' | 'command-centre'`; `getActShellMode` default flipped
`'field-action' -> 'tier-shell'` (explicit per-project values still win -- toggle
invariant, no persist migration). `ActShellToggle.tsx` becomes 3-way (the new
`tier-shell` / `LayoutPanelTop` entry first). `routes/index.tsx` adds two
**static-prefixed** routes -- `act/tier-shell` and `act/tier-shell/$objectiveId`
(latter `validateSearch`-es `taskId`) -- because TanStack Router cannot carry two
dynamic siblings under `act/` (`act/$module` already exists). `ActTools.tsx`'s private
`QUICK_LOGS` registry was **extracted** to a shared `v3/act/quickLogs.ts` so the new
bottom rail and `ActTools` share one source (pure refactor, no behaviour change).

**The shell.** New `v3/act/tier-shell/`: `ActTierShell.tsx` (entry; URL-driven
`objectiveId`, local `selectedStratumId` default `s2-land-reading`, `rightMode`,
`activeModule`; spine mounted ABOVE `StageShell` -- which has no top slot -- with the
four rails in the 5 slots), `ActTierSpine.tsx` (real `computeAllActStratumStates`, no
`Lock` path), `ActTierObjectiveRail.tsx` + `ActTierObjectiveCard.tsx` (LEFT;
`useProjectObjectives(id)` filtered by stratum, per-objective "N/M verified" chip),
`ActTierMapMarkers.tsx` (objective pins), `ActTierToolsRail.tsx` (BOTTOM; real
`QUICK_LOGS`, arming `setActiveModule` + `useMapToolStore.setActiveTool`, reading
`activeTool` for the armed-highlight), `objectiveProgress.ts` (per-objective
`{total, verified, state}` computed ONCE, shared by rail + markers so they cannot
drift), and `ActTierShell.module.css` (copied from the prototype, tokens unchanged).
CENTER map mounts the full read-only Act substrate (`BaseMapCard` ·
`ObserveAnnotationLayers` · `PlanDataLayers editable={false}` ·
`ActStructureClickHandler` · `ActDataLayers` · `SectorCompassOverlay` ·
`ActStructurePopover` · `ActTierMapMarkers` · `ActDrawHost`) + a floating
`ActShellToggle`. RIGHT = the already-real `ViewBDashboard` / `ViewAObjectiveExecution`
behind a dashboard/detail toggle + `ProofSyncIndicator`. The one non-real bit:
objective markers use a deterministic centroid-offset (copied locally from the
prototype, NOT imported), since `PlanStratumObjective` carries no per-objective
geometry -- flagged for a future real-geometry pass. `ActLayout.tsx` gained a
`tier-shell` branch BEFORE the `field-action` branch (see below). `projectStore.
shellModes.test.ts` updated -- Act default now asserts `'tier-shell'`; 5/5.

## Surgical foreign-WIP commit (`ActLayout.tsx`)

`ActLayout.tsx` was already dirty on the rebased branch with an out-of-band foreign
change (an `ActFieldActionLayout -> ActMapFirstLayout` import+branch swap depending on
two **untracked** files). Staging as-is would have produced a broken commit (dangling
import to an uncommitted file) and authored a foreign feature under this session.
Resolution: backed the file up, reverted the foreign hunks to HEAD (keeping ONLY the
tier-shell import + branch, so the commit builds against the tracked
`ActFieldActionLayout`), committed, then restored the backup so the foreign WIP stays
in the working tree. Verified no foreign file committed, no backup leftover
([[feedback-no-deletion]], [[feedback-commit-immediately-on-rebased-branches]]).
*(At session close the working tree's `ActLayout.tsx` shows the foreign
`ActMapFirstLayout` import live again on top of the committed tier-shell branch --
that is the restored foreign WIP, not a regression.)*

## Verification

- **Typecheck/tests:** web `tsc --noEmit` exit 0; shared `tsc` clean +
  `actStratumExecution.test.ts` 9/9; `projectStore.shellModes` 5/5.
- **Preview (functional, DOM via `preview_eval`):** `/v3/project/mtc/act` renders the
  4-rail tier shell by default (spine S1-S7 with real objective counts, S2 selected);
  spine-click S1 re-filtered the left rail to its 2 objectives with distinct real
  chips ("1/1 verified" + "0/1 verified"); objective-click drove the URL to
  `act/tier-shell/s1-vision` and flipped the right rail to ViewA; the bottom "Log
  harvest" click flipped only that tool to `data-active=true` (proving
  `setActiveTool('act.harvest.log-entry')` armed `useMapToolStore`/`ActDrawHost`); the
  3-way toggle still offers Tier shell / Field actions / Command centre (no-deletion
  proof).
- **`preview_screenshot` unresponsive (disclosed, not assumed):** hung twice at 30s on
  the live MapLibre WebGL canvas + dead API:3001 -- the documented transient
  [[project-screenshot-hang]]; the page itself stayed responsive between attempts. Per
  the CLAUDE.md preview-verification rule I disclosed this and substituted DOM-level
  functional proof for all five checks rather than claim a visual it could not capture.
  A spine-click no-op during this pass was traced to `innerText` carrying newlines
  (`"S1\nProject Foundation\n2 OBJECTIVES"`), fixed by matching `startsWith('S1')`.

## Out of scope (intentional / deferred)

- **`ViewAObjectiveExecution` "Back to all tasks"** still navigates to
  `act/field-action`, not mode-aware -- left as-is this slice (don't modify ViewA);
  documented as a follow-up to make it mode-aware.
- **Real per-objective marker geometry** (the deterministic offset is the one
  non-real bit) and **per-objective tool relevance** in the bottom rail (all three
  quick-logs shown; objective->tool filtering deferred).
- Foreign parallel-session WIP (`ActLayout` map-first swap + its untracked files,
  financial/economics/capital-partner, DesignMap/DiagnoseMap/OperateMap,
  MaterialSubstitutions, graphify-out, ZoneSomSidebar, the `_*.py`/`_*.txt` scratch
  files) left uncommitted per [[feedback-no-deletion]].

## Branch state

`feat/atlas-permaculture`. Two code/test slice commits (`f2347537` shared ->
`4f46b47d` web), each staged by explicit path (never `git add -A`); this log entry +
the ADR + the `log.md`/`index.md` pointers + the OLOS entity touch land in a third
wiki commit. **Not pushed** -- the branch is rebased out-of-band
([[project-branch-rebase]]); push only after the steward says go, with a `git fetch
origin` + divergence check first ([[feedback-commit-immediately-on-rebased-branches]]).
Continues the spine work from [[decisions/2026-05-27-atlas-plan-tier-shell-phase1]] and
consumes `PLAN_STRATA` / `computeStratumState` post-[[log/2026-05-30-plan-stratum-rename]].
CSRA model untouched ([[fiqh-csra-erased-2026-05-04]]); ASCII-only copy.
