# 2026-04-24 — Pollinator habitat **state** overlay (4th §7 wave)


**Motive.** The existing `PollinatorHabitatOverlay` reads the bbox-scale synthesized `pollinator_opportunity` 5×5 grid emitted by `PollinatorOpportunityProcessor` — a planting-opportunity surface that mixes cover sampling with connectivity role. That doesn't answer the parcel-scale question users actually ask on site: *what habitat exists here today?*

**Shared helper.** Added [`packages/shared/src/ecology/pollinatorHabitatState.ts`](packages/shared/src/ecology/pollinatorHabitatState.ts) — pure `classifyZoneHabitat({ coverClass, disturbanceLevel })` returning `{ band, score, normalizedClass, isLimiting }`. Limiting table (cropland/urban/water) wins over supportive; limiting weight ≥ 0.9 → `hostile`, else `low`. Supportive weight is discounted by `1 − 0.3 × disturbanceLevel`, then banded at 0.8 / 0.55 / 0.3. Reuses `POLLINATOR_SUPPORTIVE_WEIGHTS` + `POLLINATOR_LIMITING_WEIGHTS` — no new authoritative vocabulary. Substring match prefers longest key so "Mixed Forest" beats "Forest". 10/10 vitest cases green.

**Overlay.** [`apps/web/src/features/map/PollinatorHabitatStateOverlay.tsx`](apps/web/src/features/map/PollinatorHabitatStateOverlay.tsx) fetches the existing `soil_regeneration` layer, classifies each zone centroid via `classifyZoneHabitat`, writes `habitatStateBand` onto feature props, and paints classed circles + strokes keyed by a Mapbox `match` expression (sage / gold / muted / slate-red palette, mirroring the opportunity overlay). Lucide Leaf icon in the spine (distinct from the Flower-2 used on opportunity). `pollinatorHabitatStateVisible` + setter in [`mapStore.ts`](apps/web/src/store/mapStore.ts); compact toggle slotted into [`LeftToolSpine.tsx`](apps/web/src/features/map/LeftToolSpine.tsx); lazy imports + mount in [`MapView.tsx`](apps/web/src/features/map/MapView.tsx).

**Scoring parity.** Untouched. `computeScores.ts` does not reference the new helper; `verify-scoring-parity.ts` stays at delta 0.

### Deferred

- True pixel-scale habitat raster (parcel-scale land cover sampled at say 10 m) rather than zone centroids.
- Regional-plant lists keyed to `normalizedClass` for the tooltip ("supports X / Y").
- Cross-parcel stitching — current overlay stops at the project boundary.
