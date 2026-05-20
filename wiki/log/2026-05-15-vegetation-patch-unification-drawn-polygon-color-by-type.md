# 2026-05-15 — Vegetation Patch unification + drawn-polygon color by type


**Branch.** `feat/atlas-permaculture`.

**Trigger.** Bug: the "Ground cover" Observe tool did nothing on an
"Ecology zone" polygon — the two EWE tools wrote to disjoint stores
(`useEcologyStore.ecologyZones` vs `useZoneStore` LandZones). Follow-on
user request: "change color of drawn polygon based on type."

**Vegetation Patch unification (Approach C).** New
`apps/web/src/store/vegetationStore.ts` (`VegetationPatch` = geometry +
5-value `successionStage` + 8-value `groundCover`; `ogden-vegetation` v1,
`persist` + `temporal`; `groundCoverFromStage` export). One unified
"Vegetation & cover" Observe tool replaces both old tools;
`EcologyZoneTool.tsx` + `GroundCoverPaintTool.tsx` and their
schema/dispatch/registry/`POLYGON_KINDS` entries deleted. New
`v3/plan/engine/vegetationResolver.ts` (`resolveZoneVegetation` —
per-axis, zone override wins else area-weighted dominant of overlapping
patches via `turf.intersect`; `deriveCurrentLandCover`); 9 consumers
rewired; ZonePanel keeps succession/cover selects as the override
channel. One-time migration drains `ogden-ecology.ecologyZones` into
`ogden-vegetation` (guarded `migratedFromEcology`); zoneStore v2→v3
`bare→disturbed`. Canonical 5-value scale everywhere. turf v7 API fix:
`intersect(featureCollection([a,b]))`. Spec:
`docs/superpowers/specs/2026-05-15-vegetation-patch-unification-design.md`.
ADR `decisions/2026-05-15-atlas-vegetation-patch-unification.md`.

**Drawn-polygon color by type.** (A) New `DRAW_PREVIEW_COLORS` table in
`mapboxDrawStyles.ts`; `useMapboxDrawTool` gained optional `previewColor`
→ `setPaintProperty` on `gl-draw-polygon-fill`/`-stroke` after
`addControl` (guarded by `getLayer`, in effect deps); the three EWE
polygon tools pass their kind's color (vegetation = ground-cover
`sparse-grasses` `#bfa86a`, pasture `#b58550`, crop `#a8854a`).
(B) `ObserveAnnotationLayers` vegetation feature `color` switched
`successionStage`→`groundCover` (`GROUND_COVER_COLORS`); now-unused
`ECOLOGY_STAGE_COLOR` removed (would trip `noUnusedLocals` — deviation
from plan's "keep it defined", made to keep the typecheck gate clean).
ADR `decisions/2026-05-15-atlas-drawn-polygon-color-by-type.md`.

**Verification.** `npm run typecheck` clean (exit 0, memory-safe 8 GB
node script — plain `tsc` OOMs). `npm test` — 59 files / 815 tests
green incl. new `vegetationResolver.test.ts`. Dev server: no console
errors; `preview_screenshot` unresponsive (renderer hang, unrelated) so
no visual capture — the in-progress draw tint is not exercisable via
preview automation (synthetic events don't reach the MapLibre/MapboxDraw
pipeline) and needs a manual draw; committed groundCover color path is
logic-only and gate-covered.

**Entity page.** `entities/site-annotations-store.md` updated (vegetation
lifted out of the 7-namespace family into its own store).
