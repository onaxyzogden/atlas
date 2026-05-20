# 2026-05-20 — Rotation-adherence `now` staleness fix (shared `useNow` hook)


**Branch.** `feat/atlas-permaculture`. Both `RotationAdherenceCard` and
`RotationAdherenceActionsCard` (`apps/web/src/features/livestock/`) passed
`now: new Date().toISOString()` into a `useMemo` whose deps were
`[paddocks, plan, moves]` only — so the "current time" handed to
`computeRotationAdherence` was captured once at first render and
refreshed only when upstream store data changed. Result: lights, headline
counts, and the ranked drift list could lag the wall clock indefinitely
across grazing/rest thresholds (overgrazed, short-rest, under-rested
re-entry, open-interval occupancy "run to now").

**Fix.** New shared `apps/web/src/hooks/useNow.ts` — `useState` seeded
from `new Date().toISOString()` + `useEffect` `setInterval` at 60 s
cadence (configurable, default `60_000`), interval cleared on unmount,
re-armed on `intervalMs` change. Both adherence components consume
`useNow()` and add `now` to the `computeRotationAdherence` memo deps; no
other call sites touched. No new hook elsewhere in the repo (grep), and
the existing `apps/web/src/hooks/` directory was the obvious home.

Strictly a refresh fix on a read-only / draft-emitting analytics
surface — no engine change, no store touched, no schema bump, no
adherence math altered. tsc `--noEmit` exit 0 across the web app.
Preview verification skipped: the bug only manifests once wall clock
crosses a grazing threshold (minutes to hours), not observable in a
single screenshot frame.
