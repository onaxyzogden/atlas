# 2026-05-10 — Field Task + Observation moved to left rail


The `Create Field Task` (primary) and `Log Observation` (secondary)
buttons used to sit at the bottom of the right-rail Ops aside
(`ActOpsAside` → `QuickActions`), alongside Weather / Today's
Priorities / Alerts / Upcoming Events. Operationally they're
field-log entries — same intent as the Quick Log strip on the left
rail (Log harvest / Log water check / Log livestock move). Operator
asked for the move to consolidate logging into one column.

Move:

- `apps/web/src/v3/act/ActTools.tsx` — added `useState`,
  `useV3Project`, `CreateFieldTaskDialog`, `LogObservationDialog`,
  and rendered `<QuickActions>` (reused from `./ops/QuickActions.js`)
  as the last item inside the Quick Log strip. Mounted both dialogs
  from this component so the buttons are self-contained.
- `apps/web/src/v3/act/ops/ActOpsAside.tsx` — removed the
  `<QuickActions>` block, the dialog `useState`s, dialog mounts, and
  the now-unused imports. The right rail now stops at Upcoming
  Events.
- `QuickActions` component itself was left untouched and re-imported
  from its existing location, so styling stays consistent with no
  CSS duplication.

Verified live: left "Quick log" strip now contains 5 buttons (Log
harvest / Log water check / Log livestock move / Create Field Task /
Log Observation), and the right "Act checklist" rail no longer
contains a `[aria-label="Quick actions"]` section. (commit 07630b1.)
