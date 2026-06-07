# ADR: Prerequisite lock gate -- popover CTA fix, Act gating, DEV unlock toggle

- **Date:** 2026-06-07
- **Status:** Accepted
- **Branch:** `feat/structured-capture-forms` (commit `087a8580`, local-only, not pushed)
- **Entity:** [[entities/act-tier-shell]]
- **Relates to:** [[project-plan-gate-unbound-typed]] (the dependency-gate engine is real but `authoring.ts:139` hardcodes empty prereqs for typed projects -- this slice fixes the gate's UI behaviour, NOT the unbound-prereq authoring gap)
- **Log:** [[log/2026-06-07-atlas-plan-act-lock-gate]]

## Context

The Plan prerequisite **lock gate** is driven by a pure status engine in
`packages/shared/src/relationships/`: `computeAllObjectiveStatuses(objectives,
progress, deferredIds?)` yields a per-objective status map
(`locked|available|active|complete|deferred`), and `computeAllStratumStates(...)`
rolls that up to a per-stratum state -- a stratum is `locked` only when EVERY one
of its objectives is locked. Three related defects sat on top of this engine:

1. **The Plan `StratumLockedPopover` primary CTA could no-op.** It routed to
   `unmetPrereqs[0]` filtered only on `!== 'complete'`. Reproduced live: with the
   steward already on `.../objective/s1-vision` (status *active*), opening the
   "Stratum 2 locked" popover targeted `s1-vision` again, so `navigateToObjective`
   was a no-op and the button merely closed the popover. It could also target a
   still-`locked` prerequisite (un-actionable).

2. **No way to bypass the gate while developing.** There was no DEV affordance to
   unlock strata/objectives, forcing developers to grind real progress to reach a
   gated surface.

3. **Act ignored the gate entirely (a real bug).** `ActTierShell` derived its
   spine from `computeAllActStratumStates` -- an execution rollup that **never
   locks** -- and `handleSelectStratum` / `handleSelectObjective` navigated
   unconditionally. A steward could open strata/objectives whose Plan
   prerequisites were unmet, while Plan blocked exactly that.

The status engine being pure means a single override that lifts `locked` ->
`available` propagates to every consumer (spine glyphs, selection guards, popover,
and the new Act gate) without touching the engine itself.

## Decision

Fix all three on top of the existing engine; additive, **no deletion**
([[feedback-no-deletion]]). A tiny reactive store plus a pure helper provide the
single source of truth for the DEV override; both Plan and Act compute Plan
prerequisite statuses and pass them through the helper when the DEV flag is on.

### 1. Popover CTA targets the first actionable, non-current prerequisite

`StratumLockedPopover` gains an optional `currentObjectiveId?: string | null`
prop. The CTA target becomes the first unmet prerequisite that is **actionable**
(`available` or `active`) **and** is not the objective already on screen:

```ts
const ctaTarget =
  unmetPrereqs.find(
    (o) =>
      o.id !== currentObjectiveId &&
      (objectiveStatuses[o.id] === 'available' ||
        objectiveStatuses[o.id] === 'active'),
  ) ?? null;
```

The button relabels to **"Work prerequisite ->"** when a target exists, else
**"Acknowledge"** with `disabled={!ctaTarget}`. The displayed prerequisite list
(`unmetPrereqs`) is unchanged -- only the CTA's target changed.

**Rationale:** keeps the "jump to the next thing you can actually work" intent
while eliminating both no-op modes (current-objective re-target and locked-target).
**Alternatives considered:** (a) keep `unmetPrereqs[0]` and just hide the button
when it equals the current objective -- rejected: still targets locked prereqs;
(b) compute the target in each caller -- rejected: duplicates the actionable-filter
logic across Plan and Act.

### 2. Single DEV override: a tiny store + a pure helper, guarded by `import.meta.env.DEV`

A new `useDevUnlockStore` (Zustand + `persist`, key `ogden-dev-unlock-all-strata`;
`unlockAll`, `toggle`, `setUnlockAll`) holds one boolean. A pure
`liftLockedStatuses(map)` turns every `locked` into `available` and leaves all
other statuses untouched -- an **honest unlock** that does NOT fake completion, so
progress percentages are unaffected. Both Plan and Act apply it only when
`unlockAll && import.meta.env.DEV`, so production never lifts a lock even if a
stale flag sits in `localStorage`.

**Rationale:** one source of truth feeding the pure engine means the override
propagates everywhere (spine, guards, popover, Act gate) for free.
**Alternative considered:** a build-time env var -- rejected: not togglable at
runtime, and developers want to flip the gate on/off live.

### 3. `DevUnlockToggle` mounted in the global header, self-gating to `null`

`DevUnlockToggle` is a fixed top-right pill (`data-testid="dev-unlock-all-toggle"`,
label `{unlockAll ? 'Strata unlocked (dev)' : 'Unlock all (dev)'}`) that returns
`null` after its hooks when `!import.meta.env.DEV`. It is mounted from
`HeaderStageSpine` (wrapped in a fragment beside `<StageSpine>`) so it is reachable
in **both** Plan and Act; production renders nothing.

**Rationale:** the header spine already renders across Plan and Act, so one mount
covers both stages; the component self-gating keeps the production tree clean.

### 4. Act computes the Plan gate and enforces it

`ActTierShell` now computes the **Plan** prerequisite gating state alongside the
existing execution rollup (which still drives spine *progress* chips, untouched):

```ts
const planObjectiveStatuses = useMemo(() => {
  const m = computeAllObjectiveStatuses(objectives, effectiveProgress.flatMap, deferredSet);
  return unlockAll && import.meta.env.DEV ? liftLockedStatuses(m) : m;
}, [objectives, effectiveProgress, deferredSet, unlockAll]);
const planStratumStates = useMemo(
  () => computeAllStratumStates(STRATUM_IDS, objectives, planObjectiveStatuses),
  [objectives, planObjectiveStatuses],
);
```

`handleSelectStratum` opens the shared `StratumLockedPopover` (rather than
navigating) when `planStratumStates[id] === 'locked'`; `handleSelectObjective`
keeps its deselect branch and otherwise `toast.warning(...)`s + returns when the
target objective is `locked`. The shared popover is mounted in the Act shell,
reusing the Plan component with `objectiveStatuses={planObjectiveStatuses}` and
`currentObjectiveId={objectiveId ?? null}`.

**Rationale:** mirrors Plan's guard using the same pure engine, so Plan and Act
agree on what is locked. Keeping the execution rollup separate preserves the
distinction that Act *execution* reaches every stratum while the *Plan dependency
gate* still applies. **Alternative considered:** hard-disable locked tabs --
rejected: the popover must be reachable to explain *why* a tab is locked.

### 5. `ActTierSpine` shows a lock glyph + muted style on locked tabs

`ActTierSpine` accepts `lockedStratumIds: ReadonlySet<string>` (built in
`ActTierShell` from `planStratumStates`). Locked tabs render a Lucide `Lock` chip
(`data-status="locked"`), set `aria-disabled` / `data-locked`, and pick up a muted
dashed style in `ActTierShell.module.css`. The click still fires `onSelectStratum`
so the guard can open the explanatory popover. When the DEV toggle lifts locks the
set is empty -> no lock glyphs.

## Consequences

- A steward on a Plan objective who opens a locked sibling stratum gets a CTA that
  navigates to a prerequisite they can actually work, never a no-op; a deeply
  locked stratum (only locked prereqs) shows a disabled "Acknowledge" with the
  prerequisite list intact.
- Act now refuses to open locked strata/objectives: clicking a locked tab opens
  the shared popover (no navigation), clicking a locked objective toasts a warning,
  and locked spine tabs carry a lock glyph + muted/`aria-disabled` style. Unlocked
  surfaces open exactly as before.
- In DEV only, the header "Unlock all" toggle lifts every `locked` -> `available`
  across both stages; OFF restores gating. Production builds render no toggle and
  never lift a lock.
- The pure status engine, the Act execution rollup (`computeAllActStratumStates`),
  and progress percentages are all unchanged; no schema, route, or migration
  change.

## Amanah

Navigation / gating bug fixes plus a DEV-only developer affordance. No sales
channel, advance purchase, financing instrument, or CSRA/salam framing; no
riba/gharar surface ([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]).
Clean.

## Verification

- Web `tsc --noEmit` clean (`noUncheckedIndexedAccess` on).
- Act tier-shell suite green under bounded `vitest --pool=forks
  --no-file-parallelism --testTimeout=20000` ([[feedback-vitest-bounded-runs]]).
  The one failing test (`actToolCoverage` -- silvopasture s5/s6/s7 missing
  `OBJECTIVE_ACT_TOOLS_OVERRIDE`) is **foreign WIP** (uncommitted `authoring.ts` /
  catalogues edits adding silvopasture objectives), unrelated to this slice -- none
  of the 8 files touch `OBJECTIVE_ACT_TOOLS_OVERRIDE` or objective definitions.
- Live preview (port 5200, `mtc`) confirmed all three flows in **both** Plan and
  Act: **(1)** Plan CTA relabelled "Work prerequisite ->" and navigates
  `s1-vision` -> `s1-boundaries` (a real, non-no-op move, verified after a router
  tick); **(2)** the DEV toggle ON unlocks all Plan strata + Act tabs/objectives,
  OFF restores gating; **(3)** Act locked tabs show the lock glyph, clicking a
  locked tab opens the popover with no navigation, clicking a locked objective
  toasts a warning. **No-screenshot-no-claim honored:** `preview_screenshot` was
  unresponsive (transient dead-API + open-modal wedge, [[project-screenshot-hang]]);
  all assertions are DOM-verified via `preview_eval`, and a transient
  HMR-desync crash in `ActTierSpine` recovered fully on a clean `location.reload()`
  (confirmed not a real bug -- single mount, prop passed).

## Alternatives considered

- **Keep `unmetPrereqs[0]` and hide the CTA when it equals the current
  objective:** rejected -- still targets still-locked prerequisites.
- **Compute the CTA target in each caller:** rejected -- duplicates the
  actionable-filter across Plan and Act; the popover owns it once.
- **Build-time env var for the unlock:** rejected -- not runtime-togglable.
- **Hard-disable locked Act tabs:** rejected -- the popover must stay reachable to
  explain why a tab is locked.
- **Route-level `beforeLoad` redirect for deep-linked locked objectives:**
  deferred -- the interactive paths (spine, cards) are gated; a hard route redirect
  is a larger change, flagged as a follow-up.
