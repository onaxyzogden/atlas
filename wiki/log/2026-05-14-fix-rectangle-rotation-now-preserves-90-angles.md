# 2026-05-14 — Fix: rectangle rotation now preserves 90° angles


User reported that rotating a rect in Dimensions mode deformed the
shape. Root cause in
[apps/web/src/features/structures/footprints.ts](../apps/web/src/features/structures/footprints.ts)
`createFootprintPolygon`: rotation was applied in lng/lat **degree
space** after the half-extents had already been scaled by the
per-axis degrees-to-meters factors (`mPerDegLng` ≠ `mPerDegLat`). At
non-axis-aligned rotations the rotation matrix mixed the two
unequal-scale axes and sheared the rectangle into a parallelogram —
the further from the equator, the worse the shear.

Fix: rotate in **metric space** instead. Build the four corners as
metre offsets from centre `[(±W/2, ±D/2)]`, apply the 2×2 rotation in
metres, then project each rotated offset back to lng/lat using the
per-axis scale. The 90° angles are now preserved because the
rotation operates on an isotropic (metric) coordinate system before
the anisotropic projection back to degrees.

Verified at lat=44°, 14×10 m rect, rotation=30°:
- **Old**: edges 15.55 m / 9.38 m, angles 106.2° / 73.8° (sheared).
- **New**: edges 14.00 m / 10.00 m, angles 90° / 90° / 90° / 90°.

`tsc --noEmit -p apps/web` clean (only unrelated pre-existing errors
in untracked `observePrefill.ts`). `createFootprintPolygon` is the
shared rect primitive used by every Dimensions-mode rect — Structures,
Buildings, Zones, Paddocks, CropAreas, WaterCatchments, and (via the
prior commit) all 5 agricultural BE kinds through
`BeV2ExistingTool` — so the fix propagates uniformly.
