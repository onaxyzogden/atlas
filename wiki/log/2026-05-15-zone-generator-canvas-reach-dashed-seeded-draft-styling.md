# 2026-05-15 — Zone-generator canvas reach + dashed seeded-draft styling


**Why.** Closes the two items the zone-generator-seam ADR
(`decisions/2026-05-15-atlas-zone-generator-seam-ring-seeding.md`) left
"pending separately": seeding was only reachable from the Goal Compass
Proposal bar, and generator-seeded zones were visually
indistinguishable from committed hand-drawn zones.

**Change.** (1) `PlanTools.tsx` — list-driven `ZONE_GENERATOR_ACTIONS`
registry + `runZoneGeneratorAction` rendered as an action button in the
Zone & Circulation rail section. Unlike `ToolItem`s it doesn't arm a
draw mode — it runs the pure `ringSeedGenerator` synchronously,
resolves the project via `useProjectStore`, `addZone`s the result, and
surfaces `canRun`'s reason / seeded count via the global `toast`. A
future generator is a one-line array entry. (2) `PlanDataLayers.tsx` —
zone features now carry `seedProvenance`; a separate filtered
`plan-data-poly-seed-line` line layer renders a static
`line-dasharray: [2,2]` over `seedProvenance === 'ring-seed'` zones
(separate layer, not a `case` on `poly-line` — maplibre-gl 4.7.1
`line-dasharray` is not data-driven; mirrors the existing
`setback-line` precedent), wired into the lens-recolor parity block
(guarded by `getLayer`). No engine/seam/schema change — reuses the
existing `LandZone.seedProvenance` field.

**Verification.** `vitest run src/v3/plan/engine/zoneGenerators` 5/5
green; `tsc --noEmit` (full web, 8 GB heap) exit 0; preview — rail
button renders; `mtc` (no boundary) → warning toast with `canRun`'s
parcel-boundary reason; "351 House — Atlas Sample" (has boundary) →
"Seeded 4 draft zone(s)" toast + 4 `ring-seed` zones (Z0 home +
Z1/Z2/Z3) persisted; Current Land map view shows the seeded
concentric rings with dashed outlines; Yeomans-lens toggle produced
zero console errors (recolor-parity path ran). Screenshot tool went
unresponsive on the zoomed close-up — dashed rendering confirmed from
the wider Current Land capture, not a zoomed shot.

**Deferred.** In-canvas "Drop home centre" action and a dashed-style
fill (only the outline is dashed) — neither requested. The
typo-reword force-push of `cbb08e15` remains blocked on explicit
authorization (external rebase already published it; moot).
