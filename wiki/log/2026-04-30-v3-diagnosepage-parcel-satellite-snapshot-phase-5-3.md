# 2026-04-30 — V3 DiagnosePage parcel satellite snapshot (Phase 5.3)


### Done

Replaced the `◊` glyph placeholder in `DiagnosePage`'s `StageHero` aside with a server-rendered satellite tile from the MapTiler Static Maps API plus an SVG-polygon outline of the parcel boundary. Web-mercator forward projection picks a zoom that fits the bbox into ~70% of the tile width (clamped z8–z18). Pure visual surface — no maplibregl runtime, no stores, no draw tools. Falls back to the prior glyph card when no MapTiler key is configured or the project carries no boundary polygon, preserving dev-without-key parity.

**Implementation:**
- `apps/web/src/v3/components/ParcelSatelliteSnapshot.tsx` (new) — `bboxOf` / `chooseZoom` / `projectToTile` helpers + the visual component.
- `apps/web/src/v3/components/ParcelSatelliteSnapshot.module.css` (new) — relative-positioned art container with absolute-overlay SVG.
- `apps/web/src/v3/pages/DiagnosePage.tsx` — imports the new component, replaces inline `ParcelPlaceholder` in `aside`, removes the local `ParcelPlaceholder` declaration.
- `apps/web/src/v3/pages/DiagnosePage.module.css` — drops the now-unused `.parcel*` classes.

**Verification:** `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` clean for `@ogden/web`. MTC fixture carries `mockProject.location.boundary`, so `/v3/project/mtc/diagnose` exercises the live path under preview when a MapTiler key is saved.

### Risks accepted
- 5.1 (Design canvas with placement/snapping/scoring callouts) and 5.2 (Operate field map with telemetry pins) remain ADR-gated. Each needs its own scoping pass before implementation; this is the scoped subset of Phase 5 that ships now.

ADR: [`wiki/decisions/2026-04-30-v3-parcel-satellite-snapshot.md`](decisions/2026-04-30-v3-parcel-satellite-snapshot.md). Closes Phase 5.3 of the in-flight closure plan.
