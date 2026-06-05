# 2026-06-04 — Surface zone-seeding tool in the S4 zones objective card

**Branch.** `feat/atlas-permaculture` (clean explicit-path commit `26270041`,
2 files; **not pushed**; local-only per the out-of-band-rebase rule for this
branch).

## Problem

The permaculture zone-seeding workflow (place Zone 0 → Z1–Z5 Mollison concentric
rings auto-generate → trim to property boundary) was inaccessible from the
**s4-zones** objective (U-S4.3, "A coherent spatial framework & zoning"). The
machinery fully existed:

- `ZoneSeedAnchorTool` armed `draw_point` on the map and ran `ringSeedGenerator`
- `ringSeedGenerator` seeded Z0–Z5 annulus polygons around the placed point
- Trim-to-parcel and clear-seeded actions lived in `PlanTools.tsx`

But all three actions were **only in the `PlanTools` left-rail**, visible when the
access-circulation module was the active objective. The `s4-zones` objective linked
to `legacyCardSectionId: 'plan-zone-overview'` → `ZoneCirculationOverviewCard`,
which was **read-only** (coverage stats + mini-map SVG, no action buttons).
Additionally `PlanModuleSlideUp` passed `onSwitchToMap={noop}` so even the
existing "Open the map" link did nothing.

## What shipped

**`ZoneCirculationOverviewCard.tsx`** — added an "Actions" section above Coverage:

- **Seed zones from rings** (Sprout icon) — arms
  `plan.zone-circulation.zone-seed-anchor` via `useMapToolStore.setActiveTool`,
  then calls `onSwitchToMap()` to dismiss the slide-up so the user can click the
  map to place Z0.
- **Trim seeded to parcel** (Scissors icon) — inlines the same clip logic as
  `PlanTools.trimSeededToParcel`: `parcelPolygon()` → `clip()` per seeded zone →
  `updateZone` / `deleteZone` + toast. Disabled when no parcel boundary or no
  seeded zones.
- **Clear seeded zones** (Eraser icon) — calls `clearSeededZones(project.id)` +
  toast. Disabled when no seeded zones.

New imports: `useMapToolStore`, `MapToolId`, `Sprout/Scissors/Eraser` (lucide),
`toast`, `turf`, `parcelPolygon`, `clip`, `PolyFeature` from their existing
locations (no new files created). Additional `useZoneStore` selectors:
`updateZone`, `deleteZone`, `clearSeededZones`.

**`PlanModuleSlideUp.tsx`** — line 132: changed `onSwitchToMap={noop}` →
`onSwitchToMap={closeSlideUp}` for the `plan-zone-overview` case. `closeSlideUp`
was already defined at line 117 as `onClose ?? noop`.

## Verification

- **Typecheck** (`apps/web`): EXIT 0, clean.
- **Preview** (DOM probe, screenshot tool unresponsive — API server down, transient
  per `[[project-screenshot-hang]]`): navigated to S4, opened "Spatial framework &
  zoning" objective → "Show zone overview" → slide-up opened with sections
  **Actions / Coverage / Validation / Mini-map**. All three action buttons present.
  Disabled states correct: Seed enabled; Trim and Clear disabled (no seeded zones
  yet, as expected).

No ADR — incremental UX wiring, not an architectural decision. No new tests added
(the underlying generators + store are already tested; this is a UI wiring change
with correct disabled logic verified via DOM probe).
