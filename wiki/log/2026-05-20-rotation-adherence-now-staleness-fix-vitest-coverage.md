# 2026-05-20 — Rotation-adherence `now` staleness fix + vitest coverage


**Branch.** `feat/atlas-permaculture`. Two-commit pair (one prior, one
new) closing a latent staleness bug on the B3 plan-vs-actual adherence
surface (`apps/web/src/features/livestock/`) and locking it down with
fake-timer specs. Re-narrating the fix entry because the prior log
entry was dropped during an upstream rebase under the branch.

**Fix (prior commit, present in HEAD as the `useNow` hook).** Both
`RotationAdherenceCard.tsx` and `RotationAdherenceActionsCard.tsx`
passed `now: new Date().toISOString()` into a `useMemo` whose deps were
`[paddocks, plan, moves]` only — so the "current time" handed to
`computeRotationAdherence` was captured once at first render and
refreshed only when upstream store data changed. Lights, headline
counts, and the ranked drift list could lag the wall clock indefinitely
across grazing / rest thresholds (overgrazed, short-rest, under-rested
re-entry, open-interval occupancy "run to now"). Fix: new shared
`apps/web/src/hooks/useNow.ts` — `useState` seeded from
`new Date().toISOString()` + `useEffect` `setInterval` at 60 s cadence
(configurable, default `60_000`), interval cleared on unmount, re-armed
on `intervalMs` change. Both adherence components consume `useNow()`
and add `now` to the `computeRotationAdherence` memo deps. No engine
change, no store touched, no schema bump, no adherence math altered.

**Test coverage (this commit).** Two new vitest specs pin the
property end-to-end:

1. `apps/web/src/hooks/__tests__/useNow.test.ts` — 4 specs: seed value
   matches `Date.now()` at mount, value refreshes after the interval
   elapses, `vi.getTimerCount() === 0` after `unmount()`, and a custom
   `intervalMs` re-arms on rerender. Pattern lifted from
   `lib/__tests__/actInteractionLog.test.ts` — `vi.useFakeTimers()` in
   `beforeEach`, `vi.useRealTimers()` in `afterEach`,
   `vi.setSystemTime(T0)` once to seed deterministic ISO strings, then
   `vi.advanceTimersByTime(...)` inside `act` (no `setSystemTime` in
   action steps — fake timers already move `Date.now()`; combining
   both double-advances the clock).
2. `apps/web/src/features/livestock/__tests__/RotationAdherenceCard.staleness.test.tsx`
   — single integration spec: mounts the card with one paddock, a
   `targetGrazeDays: 3` plan cell, and an open `move_in` event
   timestamped `T0 − 2.5 days` (no matching `move_out`, so the
   engine closes the interval at `now`). Asserts zero `rec-row` at
   T0, advances fake timers by one day, asserts exactly one
   `rec-row` with `data-severity="high"` and text matching
   `/grazed/i`, plus a **negative control** that the three livestock
   store states (`paddocks`, `byProject`, `events`) are
   reference-identical before and after the advance — proving the
   re-render is purely time-driven (the exact regression vector).

**Regression-proof gate (manual, not committed).** Replaced
`useNow.ts` with a no-`useEffect` stub; 4 of the 5 new specs failed
(staleness spec + 3 of 4 hook specs); restored, 5/5 green. Confirms
the specs would catch a revert of the fix.

**Verification.** `npx vitest run` on the new files: 5/5 green
(~73 ms). Full `apps/web/src/features/livestock` + `apps/web/src/hooks`
suite: 111/111 green. `npx tsc --noEmit` from `apps/web/`: exit 0.
