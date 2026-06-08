# 2026-06-07 -- Prerequisite lock gate: popover CTA fix, Act gating, DEV unlock toggle

- **Branch:** `feat/structured-capture-forms` (single explicit-path commit `087a8580`, 8 files, +279/-27; **not pushed** at commit time -- pushed at session close).
- **Plan:** `change-objective-names-labels-titles-to-floofy-catmull.md` (lock-gate slice, issues 1-3).
- **Decision:** [[decisions/2026-06-07-atlas-plan-act-lock-gate]]
- **Entity:** [[entities/act-tier-shell]]

## What and why

Three related defects around the Plan prerequisite **lock gate**, all fixed on top
of the existing pure status engine (`computeAllObjectiveStatuses` ->
`computeAllStratumStates` in `packages/shared/src/relationships/`):

1. **Plan `StratumLockedPopover` CTA could no-op** -- it targeted `unmetPrereqs[0]`
   filtered only on `!== 'complete'`, so it could re-target the objective already on
   screen (a no-op `navigateToObjective`) or a still-`locked` prerequisite.
2. **No DEV bypass** -- no way to unlock strata/objectives while developing a gated
   surface.
3. **Act ignored the gate (real bug)** -- `ActTierShell` drove its spine from the
   execution rollup `computeAllActStratumStates` (which never locks) and navigated
   unconditionally, so a steward could open strata/objectives whose Plan
   prerequisites were unmet -- while Plan blocked exactly that.

## Architecture / key decisions

(Full rationale + alternatives in the ADR [[decisions/2026-06-07-atlas-plan-act-lock-gate]].)

- **Popover CTA -> first actionable, non-current prereq.** New optional
  `currentObjectiveId` prop; `ctaTarget` = first unmet prereq with status
  `available`/`active` whose id `!== currentObjectiveId`. Button relabels
  "Work prerequisite ->" (or disabled "Acknowledge" when none). The displayed
  `unmetPrereqs` list is unchanged.
- **One DEV override: store + pure helper.** New `useDevUnlockStore` (Zustand +
  `persist`, key `ogden-dev-unlock-all-strata`; `unlockAll`/`toggle`/`setUnlockAll`)
  + pure `liftLockedStatuses(map)` that turns `locked` -> `available` and leaves
  everything else untouched (honest unlock -- does NOT fake completion, progress %
  unaffected). Applied only when `unlockAll && import.meta.env.DEV`, so production
  never lifts a lock even with a stale `localStorage` flag. Because the engine is
  pure, the lifted map propagates to spine glyphs, selection guards, popover, and
  the Act gate for free.
- **`DevUnlockToggle` in the global header.** Fixed top-right pill
  (`data-testid="dev-unlock-all-toggle"`), returns `null` after hooks when
  `!import.meta.env.DEV`. Mounted from `HeaderStageSpine` (fragment beside
  `<StageSpine>`) so it covers both Plan and Act.
- **Act computes + enforces the Plan gate.** `ActTierShell` adds
  `planObjectiveStatuses` (= `computeAllObjectiveStatuses(...)` then
  `liftLockedStatuses` under the DEV flag) and `planStratumStates`
  (`computeAllStratumStates`), separate from the execution rollup that still drives
  progress chips. `handleSelectStratum` opens the shared popover (no navigation)
  when the stratum is locked; `handleSelectObjective` keeps its deselect branch and
  otherwise `toast.warning`s + returns when the target objective is locked. The
  shared `StratumLockedPopover` is mounted in the Act shell with
  `objectiveStatuses={planObjectiveStatuses}`, `currentObjectiveId={objectiveId ?? null}`.
- **`ActTierSpine` lock affordance.** New `lockedStratumIds: ReadonlySet<string>`
  prop (built from `planStratumStates`); locked tabs render a Lucide `Lock` chip
  (`data-status="locked"`), set `aria-disabled`/`data-locked`, and pick up a muted
  dashed style in `ActTierShell.module.css`. Click still fires `onSelectStratum` so
  the guard can open the explanatory popover. DEV unlock empties the set -> no glyphs.

## Commit

- **`087a8580`** -- `feat(plan/act): prerequisite lock gate -- popover CTA fix, Act
  gating, dev unlock toggle`. 8 files, +279/-27:
  - NEW `apps/web/src/store/devUnlockStore.ts` (+48) -- store + `liftLockedStatuses`.
  - NEW `apps/web/src/v3/DevUnlockToggle.tsx` (+54) -- DEV-only header pill.
  - `apps/web/src/v3/HeaderStageSpine.tsx` (+16/-) -- mount the toggle (fragment).
  - `apps/web/src/v3/act/tier-shell/ActTierShell.module.css` (+18) -- locked tab +
    chip styles.
  - `apps/web/src/v3/act/tier-shell/ActTierShell.tsx` (+83) -- Plan gate compute +
    guards + popover mount.
  - `apps/web/src/v3/act/tier-shell/ActTierSpine.tsx` (+24) -- `lockedStratumIds`
    prop + lock glyph.
  - `apps/web/src/v3/plan/strata/PlanStratumShell.tsx` (+39) -- DEV override on
    statuses + celebration early-return + `currentObjectiveId` on popover.
  - `apps/web/src/v3/plan/strata/StratumLockedPopover.tsx` (+24) -- `ctaTarget` +
    relabel + `currentObjectiveId` prop.

## Verification

- **Web `tsc --noEmit`** clean (`noUncheckedIndexedAccess` on).
- **Bounded vitest** (`--pool=forks --no-file-parallelism --testTimeout=20000`,
  [[feedback-vitest-bounded-runs]]) -- Act tier-shell suite green. The one failing
  test (`actToolCoverage` -- silvopasture s5/s6/s7 missing
  `OBJECTIVE_ACT_TOOLS_OVERRIDE`) is **foreign WIP** (uncommitted `authoring.ts` /
  catalogue edits adding silvopasture objectives), unrelated to this slice -- none
  of the 8 files touch `OBJECTIVE_ACT_TOOLS_OVERRIDE` or objective definitions.
- **Live smoke (port 5200, `mtc`): PASS** in both Plan and Act.
  **(1) Plan CTA:** with `s1-vision` open, opening the locked-S2 popover shows
  "Work prerequisite ->" and navigates to `s1-boundaries` (first available,
  non-current prereq) -- verified after a TanStack Router tick (the synchronous
  post-click `location.href` returned the pre-navigation URL; re-read confirmed
  `s1-vision` -> `s1-boundaries`). A deeper stratum with only locked prereqs shows a
  disabled "Acknowledge" with the list intact.
  **(2) DEV toggle:** ON unlocks all Plan strata (no lock icons, spine selectable,
  no popover) AND all Act tabs/objectives; OFF restores gating; the toggle carries
  `data-testid="dev-unlock-all-toggle"` and self-gates to `null` in production.
  **(3) Act gate:** locked spine tabs show the lock glyph; clicking a locked tab
  opens `StratumLockedPopover` with no navigation; clicking a locked objective card
  toasts a warning; unlocked surfaces open normally.
- **No-screenshot-no-claim honored:** `preview_screenshot` was unresponsive
  (transient dead-API + open-modal wedge, [[project-screenshot-hang]]); all
  assertions are DOM-verified via `preview_eval`. A mid-interaction
  "Cannot read properties of undefined (reading 'has')" crash in `ActTierSpine` was
  diagnosed as **HMR desync** (`ActTierShell` recompiled while `ActTierSpine` stayed
  stale); a clean `location.reload()` recovered fully (9 tabs, toggle present, no
  crash) -- confirmed there is a single `<ActTierSpine>` mount and the
  `lockedStratumIds` prop IS passed, so not a real bug.

## Hygiene and Amanah

Explicit-pathspec `git commit -F` (temp-dir no-BOM message file -- PowerShell
here-strings mis-parse the `->` arrows, and `.git/` is not writable via the Write
tool); only the 8 slice files staged; substantial **foreign WIP** (auth pages,
nginx, `authoring.ts` + catalogues, foreign wiki edits) NEVER staged or touched
([[project-branch-rebase]], [[feedback-commit-immediately-on-rebased-branches]],
[[feedback-no-deletion]]). Branch is `feat/structured-capture-forms` (memory's
`feat/atlas-permaculture` was stale). **Amanah:** navigation/gating bug fixes + a
DEV-only developer affordance -- no sale/advance-purchase/financing instrument, no
CSRA/salam framing ([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]).
ASCII-only. Clean.

## Deferred

- **Route-level `beforeLoad` redirect** for deep-linked locked Act objective URLs
  -- the interactive paths (spine, cards) are gated, but a cold link straight to a
  locked objective still renders it; a hard route redirect is a larger change.
- The underlying **[[project-plan-gate-unbound-typed]]** gap is untouched
  (`authoring.ts:139` hardcodes empty prereqs for typed projects, so MTC never hard-
  locks) -- this slice fixes the gate's UI behaviour, not the unbound-prereq wiring.
- No `planStratumStore` shape change; no API/DB persistence; no schema/route change.
