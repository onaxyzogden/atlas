---
title: Click-to-anchor ring seeding + seeded-zone management
date: 2026-05-16
status: accepted
stage: plan
module: goal-compass / zone-generators
supersedes-partly: 2026-05-15-atlas-zone-generator-seam-ring-seeding
---

# ADR: Click-to-anchor ring seeding + seeded-zone management

**Date:** 2026-05-16
**Status:** accepted

## Context

The [[2026-05-15-atlas-zone-generator-seam-ring-seeding]] ring-seeder ran
**synchronously off a guessed anchor**: `resolveAnchor()` picked an
explicit home-centre → legacy Z0 → parcel centroid, then hard-clipped
every band to the parcel and wrote zones immediately. Two steward
problems followed:

1. **No control over the origin.** Rings grew from a centroid the
   steward never chose. On real sites the home centre is a deliberate
   placement, not the parcel's mathematical middle.
2. **The forced parcel clip destroyed the outer rings.** A square
   ~40-acre lot cannot geometrically contain a 500 m Z3 (let alone
   Z4/Z5) — clipping left Z3 as a vestigial corner sliver or empty.

Separately, seeded zones were *already* fully editable/deletable (they
are ordinary `LandZone`s; `seedProvenance: 'ring-seed'` is only a dashed
marker + per-Z idempotence guard), but that was undiscoverable and there
was no bulk way to clear a bad seed run or opt into the parcel clip.

## Decision

**1. Seeding always requires a steward-picked point.**
`ZoneGeneratorContext` gained `anchorPoint?: [number, number]`. In
`resolveAnchor()` a present `anchorPoint` **wins** and returns
`{ center: turf.point(anchorPoint), homeCentreZone: null }` — `null`
home-centre forces a fresh 15 m Z0 disc *at the click*, so rings grow
from exactly where the steward tapped. The legacy
home-centre/Z0/centroid fallback is kept (harmless; the tool always
supplies `anchorPoint`).

**2. The forced parcel clip is removed.** Full Mollison rings are seeded
around the click; Z3 stays whole on a compact lot. Existing-zone
subtraction (no-overlap) and the `MIN_SEED_AREA_M2 = 50` sliver floor
are unchanged, so per-Z idempotence still holds. Trimming to the parcel
is now an **explicit, opt-in** steward action, not a silent default.

**3. New one-shot point tool `ZoneSeedAnchorTool`.** Modeled on
`SlaughterPointTool`: `useMapboxDrawTool<GeoJSON.Point>({ mode:
'draw_point' })`; on complete it builds the ctx with `anchorPoint`,
runs `runZoneGenerator('ring-seed', ctx)`, `addZone`s each draft,
toasts the count, and disarms (`setActiveTool(null)`). Mounted via a
`PlanDrawHost` dispatch case under id
`plan.zone-circulation.zone-seed-anchor` — no `MapToolId` union edit
(the `plan.zone-circulation.${string}` template literal already covers
it). The "Seed zones from rings" rail action and the
`GenerateSiteDesignBar` zero-state shortcut now both **arm this tool**
(`setActiveTool(...)`) instead of running the generator inline, so
seeding always starts with a click.

**4. Shared parcel-geometry helper.** `diff`/`clip`/`parcelPolygon`
extracted from `ringSeedGenerator` into
`zoneGenerators/parcelGeometry.ts` (pure turf, no store/React) so the
seed path and the new trim action share one clip/union implementation
(a seed edge and a later trim must agree to the metre). This also fixed
a latent bug: `resolveAnchor` still called `parcelPolygon` but the
extraction had dropped it from the import — would have failed
typecheck/runtime.

**5. Seeded-zone management.**
- `zoneStore.clearSeededZones(projectId)` — one `set` removing only
  this project's `ring-seed` zones (single undo step); returns the
  count and **no-ops without pushing an undo state** when nothing is
  seeded.
- `PlanTools.tsx` gained sibling rail actions: **Clear seeded zones**
  (calls `clearSeededZones`, toasts; disabled when none) and **Trim
  seeded zones to parcel** (`parcelPolygon` + `clip` per `ring-seed`
  zone, `updateZone` with recomputed `areaM2`, `deleteZone` if empty;
  disabled when no parcel or no seeds).
- `PlanSelectionFloater.tsx` renders a dashed-gold **"Seeded"** badge
  when the single selected zone is `seedProvenance === 'ring-seed'` —
  making the already-working per-zone edit/delete discoverable.

## Consequences

- Seeding is now a deliberate two-step gesture (arm → click) with the
  origin under steward control; the Z0 disc lands at the click.
- Outer rings survive on compact parcels; parcel-fit is an explicit
  decision (Trim) rather than silent data loss.
- `parcelGeometry` is the single source for clip/union — seed and trim
  can't drift.
- Future non-anchored generators still plug into the same registry;
  the `armToolId` field on the action only routes anchored ones
  through the map.

## Files changed

- **New:** `apps/web/src/v3/plan/engine/zoneGenerators/parcelGeometry.ts`;
  `apps/web/src/v3/plan/draw/tools/ZoneSeedAnchorTool.tsx`;
  tests `__tests__/parcelGeometry.test.ts`,
  `src/store/__tests__/zoneStore.clearSeeded.test.ts`.
- `zoneGenerators/types.ts` — `anchorPoint?`.
- `zoneGenerators/ringSeedGenerator.ts` — anchor-from-point wins, forced
  clip removed, helper import, `describe` reworded.
- `zoneGenerators/__tests__/ringSeedGenerator.test.ts` — header reworded;
  parcel-clip test replaced with a NOT-clipped assertion (Z3 ≫ tiny
  parcel); new `anchorPoint` test (Z0 disc at click + unclipped Z1–Z3).
- `apps/web/src/store/zoneStore.ts` — `clearSeededZones`.
- `apps/web/src/v3/plan/draw/PlanDrawHost.tsx` — dispatch case.
- `apps/web/src/v3/plan/PlanTools.tsx` — `armToolId`, Clear, Trim.
- `apps/web/src/v3/plan/cards/goal-compass/GenerateSiteDesignBar.tsx` —
  zero-state shortcut routes through arm-tool.
- `apps/web/src/v3/plan/PlanSelectionFloater.tsx` — "Seeded" badge.

## Verification

- `vitest run` — **857/857** (68 files); the 12 zone-relevant tests:
  `anchorPoint` emits a ~π·15² Z0 disc centred on the click + unclipped
  Z1–Z3 (Z3 area ≫ a tiny parcel proves no clip); `clearSeededZones`
  removes only this project's `ring-seed` zones and pushes no undo step
  on the no-op; `parcelGeometry` clip/diff/union (null on non-overlap).
- `tsc --noEmit` (8 GB heap) — clean, exit 0 (default `tsc` OOMs on
  this repo — unrelated, pre-existing).
- `vite build` — success (43.8 s).

## Scope / non-goals

Plan only. Per-zone edit/delete was already functional — this adds
discoverability + bulk ops, not new editor surface. Manual UI pass
(arm → map-click inside a boundary-bearing project → unclipped rings →
Seeded badge → Trim → Clear → disabled outside a project) **not
automatable** here: the path needs a live MapLibre map and steward
clicks at geographic coordinates; deferred to a human dev-server pass.
