# 2026-05-16 — Click-to-anchor ring seeding + seeded-zone management


Two steward asks against the 2026-05-15 ring-seeder: (1) the origin was
a guessed centroid the steward never chose; (2) the forced parcel clip
destroyed Z3 on a compact lot (a square ~40-acre property cannot hold a
500 m ring).

Seeding now **always requires a picked point**. `ZoneGeneratorContext`
gained `anchorPoint?`; `resolveAnchor()` lets a present point win and
returns `homeCentreZone: null` so a fresh 15 m Z0 disc lands *at the
click*. The forced parcel clip was removed — full rings seed around the
click; existing-zone subtraction + 50 m² floor + per-Z idempotence
unchanged. Trim is now explicit/opt-in.

New one-shot `ZoneSeedAnchorTool` (`draw_point`, modeled on
`SlaughterPointTool`) mounted via a `PlanDrawHost` case under
`plan.zone-circulation.zone-seed-anchor` (no `MapToolId` union edit —
template literal covers it). The "Seed zones from rings" rail action +
`GenerateSiteDesignBar` zero-state shortcut now **arm** this tool
instead of running the generator inline.

`diff`/`clip`/`parcelPolygon` extracted to
`zoneGenerators/parcelGeometry.ts` (shared by seed + trim; one
clip/union impl). This also fixed a latent bug — `resolveAnchor` still
called `parcelPolygon` but the extraction had dropped it from the
import (would have failed typecheck/runtime).

Seeded-zone management: `zoneStore.clearSeededZones(projectId)` (one
undo step; no-op pushes no undo state); `PlanTools` **Clear seeded
zones** + **Trim seeded zones to parcel** rail actions; a dashed-gold
**"Seeded"** badge in `PlanSelectionFloater` (per-zone edit/delete was
already functional — this is discoverability + bulk ops, not new
editor surface).

**Verification.** `vitest run` 857/857 (68 files; 12 zone-relevant new
/updated — `anchorPoint` ⇒ ~π·15² Z0 disc at click + unclipped Z1–Z3;
`clearSeededZones` removes only this project's `ring-seed` & no undo on
no-op; `parcelGeometry` clip/diff/union null on non-overlap). `tsc
--noEmit` (8 GB heap) exit 0. `vite build` 43.8 s.

ADR: `wiki/decisions/2026-05-16-atlas-click-to-anchor-ring-seeding.md`.

**Deferred.** Manual UI pass (arm → map-click in a boundary-bearing
project → unclipped rings → Seeded badge → Trim → Clear → disabled
outside a project) not automatable here (needs a live MapLibre map +
geographic-coordinate clicks).
