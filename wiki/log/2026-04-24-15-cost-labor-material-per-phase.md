# 2026-04-24 — §15 cost-labor-material-per-phase


Commit `6467aa0`. Extended the existing cost-per-phase rollup to include
labor-hours and material-tonnage alongside cost. Structure gains two
optional fields (`laborHoursEstimate?`, `materialTonnageEstimate?`);
StructurePropertiesModal surfaces them as numeric inputs between Phase
and Notes (both new + edit modes); DesignToolsPanel plumbs through both
save paths; PhasingDashboard consolidates into `rollupByPhase` and
renders four stats per phase card (features · cost · labor · material)
with em-dash fallback on zero, plus a running labor/material detail
line in the arc-summary cost cell.

tsc clean on touched files. Total error count dropped from 52 → 13 via
the intra-session `capacityGal` restoration, independent of this work.
Manifest flipped `planned → done`.

### Recommended next

- **§14 `seasonal-storage-water-budget`** — standing plan file in
  `~/.claude/plans/` already describes a Water Budget tab built from
  `climate._monthly_normals` + `WHO_BASIC_DAILY_LITERS` (monthly inflow
  vs. demand + running balance + storage sizing).
- **§9 `infrastructure-cost-placeholder-per-structure`** — may be
  flippable with zero code: `costEstimate` is populated at placement,
  but the StructurePropertiesModal still lacks an input to edit it.
  Low-cost add to this surface we just touched.
- **§17 / §19 batch audit** — sweep status flags for items that are
  effectively shipped but still marked `planned` (the prior §13 utility
  sweep pattern).
