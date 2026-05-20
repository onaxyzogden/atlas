# 2026-05-14 — Plan year scrubber subsumes Year 1 / Year 5 tabs


The Plan-stage `PlanPhaseTabs` strip lost its `phase-1` ("Year 1") and
`phase-2` ("Year 5") tabs. Their sole job — driving `PHASE_VIEW_CAP`,
the Yeomans Scale of Permanence cap that filters canvas elements and
module-card data — moved to a new `yeomansCapForYear(currentYear)`
helper in `apps/web/src/v3/plan/types.ts`, driven by the bottom-canvas
year scrubber's `useTemporalScrubStore.currentYear`. Thresholds were
chosen to preserve bit-identical behaviour at the two prior tab
landings (Year 1..2 → `water`, Year 3..5 → `buildings`, Year 6+
uncapped). Five cap consumers migrated; `PlanView` shrinks to
`current | vision | terrain3d`; `PlanViewBadge` now appends
`Year N · capped at <key>` so the active cap stays legible after the
tabs are gone.

Also fixed in the same change: the scrubber's tick row
(`[1, 5, 15, 30, 50]`) used to evenly distribute via
`justify-content: space-between`, mis-aligning labels from their
mathematical positions on the 1..50 axis. Replaced with absolute
positioning at `((y - 1) / 49) * 100%`, so "5" now sits under the
thumb at Year 5, "15" at 15, etc.

See: [2026-05-14-atlas-plan-year-scrubber-yeomans-cap.md](decisions/2026-05-14-atlas-plan-year-scrubber-yeomans-cap.md)
