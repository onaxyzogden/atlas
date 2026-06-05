# 2026-05-11 — Module 7 wrapped: notes field + drive-time unit lock


**Motive.** Two carried-forward items from the Broiler Product Map
ADR remained: `notes` was in the entity schema but absent from the
three tool popovers, and the drive-time rollup in
MarketDistributionCard was the last bit of card math without a unit
test. Closing both makes Module 7 feature-complete.

**Change.**
- Added `{ key: 'notes', label: 'Notes', kind: 'textarea' }` to the
  Slaughter point, Cold-chain unit, and Market node inline-form
  field arrays + onSave write-through.
- Extracted `computeCentroid` (arithmetic mean of `[lon, lat]`
  pairs) and `computeDriveTime` (great-circle km → road km × detour
  ÷ avg-speed, both clamped at 1) into `agribusinessSizing.ts`.
  MarketDistributionCard now calls them — turf.distance still owns
  the geodesy step, but everything after is pure and tested.
- 10 new vitest cases: empty/single/two/four-point centroid; drive-
  time default-sizing round-trip (10 km × 1.3 ÷ 60 km/h = 13 min),
  linear & inverse scaling, two clamps, zero-distance.

**Verification.** 30/30 vitest pass (20 prior + 10 new). typecheck
clean. lint clean.

**Commit.** `763d7b0` on `feat/atlas-permaculture`. Pushed.
