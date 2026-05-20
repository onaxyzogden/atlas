# 2026-05-14 — Plan Zone visual hierarchy: opacity ramp, hit-test tie-break, edge-anchored labels


**Branch.** `feat/atlas-permaculture` · sequel to `7b9efe0d`.

**Goal.** Strengthen the Z-stack ordering shipped earlier today
with three perceptual + interaction cues so an intensive-use
zone never gets buried by a later-drawn, less-intensive zone.

**Changes.** All in `apps/web/src/v3/plan/layers/PlanDataLayers.tsx`.

- **`permacultureZone` stamped on the feature.** Added to the
  zone props object inside the zone loop so MapLibre paint
  expressions and the click handler can read it without
  re-querying the store.
- **Z-keyed fill-opacity ramp.** The shared `poly-fill` layer's
  static `fill-opacity: 0.28` is now a `case` expression: when
  `kind === 'zone'`, ramp by Z-level — Z0 = 0.40, Z1 = 0.34,
  Z2 = 0.28, Z3 = 0.22, Z4 = 0.18, Z5 = 0.14. Non-zone polygons
  (paddocks, crops, etc.) keep the 0.28 baseline via the `else`
  arm. Ramp kept tight (0.40–0.14, not 0.55–0.05) to avoid
  drowning the basemap at Z0 or losing Z5 entirely.
- **Hit-test tie-break.** The `onMouseDown` on `plan-data-poly-fill`
  no longer naively picks `e.features[0]`. When the click point
  overlaps multiple zones, it reduces them to the one with the
  lowest `permacultureZone` (Z0 wins over Z1, Z1 over Z2, …) so
  a smaller intensive-use zone drawn first stays selectable
  even after a less-intensive zone is drawn over it. Non-zone
  kinds keep the default "topmost wins" pick.
- **Edge-anchored zone labels.** Replaced the centroid label
  position with a point 60% of the way from the centroid toward
  the top of the polygon's bounding box. Falls back to centroid
  when the candidate lands outside the polygon (concave shapes).
  Other label kinds keep centroid placement.
- **Label collision priority.** The symbol layer now sets
  `symbol-sort-key` = `permacultureZone` for zone labels (0 for
  non-zones) so Z0 labels survive MapLibre's collision pass when
  a Z1+ label would otherwise displace them.

**Verification.** `npm --prefix "apps\web" run typecheck` clean
after a small turf coords / bbox tuple-narrowing fix. Preview
reloads with no error boundaries. Interactive visual checks
(opacity ladder; click-pick on overlapping zones; label visibility
under overlap) are pending manual smoke-test on a project with
multiple overlapping zones — preview tooling can't drive draw
sequences.

**Deferred.** A one-time backfill prompt for legacy zones without
`permacultureZone` (currently default to Z2) is still pending.
The opacity ramp is a single tight scheme; if it reads too subtle
at low pitch we may want a wider 0.45 → 0.10 sweep behind a
display preference.
