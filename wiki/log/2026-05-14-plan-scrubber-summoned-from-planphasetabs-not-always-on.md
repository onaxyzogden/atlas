# 2026-05-14 — Plan scrubber summoned from PlanPhaseTabs (not always-on)


The bottom-canvas `TemporalScrubSlider` (year cursor for canopy
maturity, landed 2026-05-13) was rendering on every Plan-stage canvas
and overlapping other chrome. It now hides by default and is summoned
by a dedicated "Year scrub" toggle on the top `PlanPhaseTabs` strip.
Visibility lives in a new unpersisted Zustand store
`apps/web/src/v3/plan/canvas/temporalScrubVisibilityStore.ts` — every
Plan-stage entry starts hidden; the scrubbed `currentYear` itself is
preserved within a session via the existing `temporalScrubStore`.
