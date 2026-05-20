# 2026-05-11 — deck.gl ScenegraphLayer migration + 3D feature coverage


**Motive.** Atlas's bespoke three.js custom MapLibre layer rendered 14
structure kinds as a shared grey box and excluded vegetation,
earthworks, and zone markers from 3D entirely. The
`OGDEN_LandOS_3D_Models_Briefing.md` proposed migrating to deck.gl's
`ScenegraphLayer` via `MapboxOverlay` to unlock per-instance scenegraph
URLs, picking, PBR lighting, and instanced rendering.

**Change (Phases 1–5 of ADR 2026-05-11-atlas-deckgl-scenegraph-migration).**
- **P1.** New `<DeckOverlay>` wraps `MapboxOverlay`; `DesignElementScenegraphLayer.tsx` replaces the retired three.js `DesignElementGlbLayer.tsx`. Mounted in Plan + Observe canvases.
- **P2.** All 14 structure kinds got per-kind procedural GLBs (yurt with conical roof, prayer-pavilion with dome, fuel-station with canopy, etc.) authored by `scripts/gen-structure-glbs.mjs` against shared `scripts/lib/glb-writer.mjs` + `scripts/lib/primitives.mjs`.
- **P3.** Vegetation category — 5 new kinds (oak-tree, pine-tree, apple-tree, shrub, hedgerow) wired through `BUILT_ENVIRONMENT_KINDS`, `elementCatalog`, `elementHeights`. 4 procedural GLBs (hedgerow stays flat — line geometry).
- **P4.** Earthworks (berm, raised-bed, terrace) + zone markers (zone-0…zone-5) — 9 new kinds, procedural GLBs in `public/models/earthworks/` and `public/models/zone-markers/`.
- **P5.** Per-instance `rotationDeg` + new `scaleMul` on `BuiltEnvironmentEntity.proposed`. `ScenegraphLayer` reads them per instance, `onClick` opens existing inline-edit popover via `openBeInlineEditById`. Generic BE edit schema gained rotation + scale fields for GLB kinds.

**Deferred (P6).** IndexedDB-backed custom GLB upload — substantial standalone slice, deferred to a follow-up session. Palette still shows "coming soon" stub.

**Verification.** `tsc --noEmit` clean across Plan, Observe, shared.
All asset scripts produce valid GLB byte signatures.

**Decision filed:** [2026-05-11-atlas-deckgl-scenegraph-migration.md](decisions/2026-05-11-atlas-deckgl-scenegraph-migration.md)
