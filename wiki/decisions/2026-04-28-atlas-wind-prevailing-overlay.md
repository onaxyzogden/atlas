# 2026-04-28 — Atlas Wind-Prevailing Sector Overlay

**Status:** Implemented · v3.4 mock-first

## Context

The Diagnose page already carried three permaculture matrix overlays (Topography,
Solar Sectors, Concentric Zones) all radiating from a homestead-or-centroid
anchor (see homestead session, commit `771e31a`). The fourth overlay the
Permaculture Scholar dialogue called for — prevailing wind — was a natural next
step: the anchor flow-through is in place, the `SiteSectors` shape already
includes a `"wind-prevailing"` `SectorKind`, and the wind rose is one of the
classic Mollison sector tools (informs windbreak siting, frost-pocket reads,
fire-spread direction, wood-smoke fallout).

Question: should wind be a sub-mode of the existing Sectors toggle, or a fourth
independent toggle?

## Decision

**Wind is its own matrix toggle key** (`wind: boolean`), parallel to
`topography`, `sectors`, `zones`. The popover lists four rows; the sidebar
count badge ranges 0–4; the legend grows a fourth row.

**Geometry:** eight 45°-wide compass petals (N/NE/E/SE/S/SW/W/NW), each
centered on its bearing. Petal length encodes prevailing-wind frequency:
`reachMeters = maxReachMeters * (frequency / peakFrequency)` so the longest
petal always equals `maxReachMeters` (default 600 m).

**Climatology:** Eastern-Ontario pedagogical default (W/NW dominant, sum ≈ 1).
This is a mock — no Open-Meteo / ERA5 fetch yet. The function takes optional
`frequencies?` and `maxReachMeters?` overrides for when a real climatology
backend lands.

**Visual:** single rose color `#5b7a8a` (slate blue, distinct from solar's
gold and zones' terracotta). Fill `0.18`, line `0.9` (solid, no dasharray —
the wind rose reads as a continuous shape, not nested sun arcs). Labels
suppressed below 10% frequency to keep the rose readable at typical zooms.

## Consequences

### Why a separate toggle (not a Sectors sub-mode)

- **Different mental model.** Solar arcs are *time-of-year* slices (winter /
  summer / equinox); wind is *frequency* over the year. Conflating them under
  one "Sectors" label muddies the distinction the Permaculture Scholar
  dialogue carefully drew.
- **Different reach scale.** Solar reach is fixed by view-radius; wind reach
  varies per direction. Tying them to one toggle would force one to compromise.
- **Cost is small.** The popover row, count, legend swatch, and store key are
  cheap to add; the mental clarity buys more than it costs.

### Persistence migration

`matrixTogglesStore` bumped v4 → v5. Migrate fills `wind: false` for any v4
state, so existing users don't inherit a noisy fourth overlay on first load.

### What's mocked vs. live

| Concern | Status |
|---|---|
| Wedge geometry (turf.sector) | Live |
| Anchor flow-through (homestead → centroid → fallback) | Live |
| Toggle / count / legend wiring | Live |
| Frequency table (climatology) | **Mocked** — Eastern Ontario hand-tuned |
| Open-Meteo / ERA5 fetch | Deferred |
| Per-month rose (seasonal toggle) | Deferred |

## Alternatives Considered

- **Sub-mode of Sectors with a popover dropdown.** Rejected — mental-model
  mismatch (see above).
- **Petal width by frequency, fixed reach.** Rejected — petals would visually
  overlap at high frequencies and the dominant direction wouldn't be
  immediately scannable. Fixed-width petals + variable reach gives the
  classic wind-rose silhouette.
- **Multi-color per direction.** Rejected — single-color rose composes more
  cleanly with the existing solar/zones palette and avoids legend bloat.

## Files

- `apps/web/src/lib/sectors/wind.ts` — `computeWindSectors(anchor, opts?)`
  pure function; `DEFAULT_FREQUENCIES`; 10 vitest cases.
- `apps/web/src/v3/components/overlays/WindSectorsOverlay.tsx` — MapLibre
  overlay; `matrix-wind-*` source/layer prefix; idempotent ensure.
- `apps/web/src/store/matrixTogglesStore.ts` — v5 schema with `wind` key.
- `apps/web/src/v3/components/MatrixTogglesPopover.tsx` — fourth row.
- `apps/web/src/v3/components/V3LifecycleSidebar.tsx` — count + caption.
- `apps/web/src/v3/components/DiagnoseMap.tsx` — fourth legend row.
- `apps/web/src/v3/pages/DiagnosePage.tsx` — wires `computeWindSectors` +
  overlay alongside solar/zones.

Commit: `35d82e4` on `feat/atlas-permaculture`.
