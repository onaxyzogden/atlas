# 2026-04-28 — v3.3 zones land on Diagnose


### Done

**Six concentric use-frequency rings.** The Matrix Toggles popover's third row (Zones, previously a v3.3 placeholder) is now data-backed. Toggling Zones paints six rings on the Diagnose map: Zone 0 = home (5 m disc), Zones 1–4 = annulus belts at 30/100/300/600 m, Zone 5 = "wild beyond" clipped to the parcel boundary when one is supplied.

New module: [`apps/web/src/lib/zones/`](../apps/web/src/lib/zones/) — `concentric.ts` (pure function `computeConcentricZones(centroid, opts?)` returning a `SiteZones` value with the default radii ladder `[5, 30, 100, 300, 600]`; ascending-positive guard rejects malformed custom ladders), `types.ts` (`ZoneIndex`, `ZoneRing`, `SiteZones`), and 11 vitest cases covering radii continuity, default/custom ladder, label/color invariants, Zone 5 unbounded, and centroid pass-through.

New overlay: [`apps/web/src/v3/components/overlays/ZonesOverlay.tsx`](../apps/web/src/v3/components/overlays/ZonesOverlay.tsx) — hand-rolled annulus polygons (outer ring + reversed inner ring as a hole) via `turf.circle`. Zone 0 renders as a solid disc; Zone 5 renders as `parcel boundary − zone-4-outer-circle` when a boundary prop is supplied, and is omitted otherwise. Three layers (`fill` 0.14 opacity, `line`, `symbol` labels) match the SectorsOverlay pattern with idempotent ensure() and visibility-only toggle.

**Wiring.** [`MatrixTogglesPopover.tsx`](../apps/web/src/v3/components/MatrixTogglesPopover.tsx) re-enables the Zones row, drops the `v3.3` soon-badge, footer now reads "Topography · Sectors · Zones live". [`matrixTogglesStore.ts`](../apps/web/src/store/matrixTogglesStore.ts) bumps version 3→4 with a no-op pass-through migrate (earlier versions force-cleared `zones` to keep stale state from claiming a non-existent overlay; that constraint is gone). [`DiagnosePage.tsx`](../apps/web/src/v3/pages/DiagnosePage.tsx) extends `DiagnoseOverlays` with `useMemo(computeConcentricZones(centroid), [centroid])` and threads `project.location.boundary` through. [`DiagnoseMap.tsx`](../apps/web/src/v3/components/DiagnoseMap.tsx) gets a third legend row (zones swatch `#a85a3f`). [`V3LifecycleSidebar.tsx`](../apps/web/src/v3/components/V3LifecycleSidebar.tsx) badge now counts `topography + sectors + zones`.

### Verification

- `apps/web` `tsc --noEmit` clean for the v3.3 surface (zones, popover, sidebar, page, map). Pre-existing rails / FiltersBar / DiagnoseMap.polygonBounds errors unchanged from baseline; not introduced by this session — verified by stashing the v3.3 diff and re-running tsc on HEAD.
- `apps/web` vitest: **25/25** (11 new in `lib/zones/__tests__/concentric.test.ts`, plus the 8 sectors + 6 sidebar tests; sidebar mock now `{ topography: true, sectors: true, zones: true }` and the badge asserts `/3/`).
- `apps/web` `pnpm exec vite build` ran clean (~43s, 493 PWA precache entries — same surface as v3.2). The `pnpm build` script is `tsc && vite build` and currently fails at the tsc gate on the pre-existing baseline errors above. Vite build alone is the truer signal for this session's surface.
- Preview eval at `/v3/project/mtc/diagnose`: popover row labels read "Topography / Sectors / Zones (Zone 0–5)", footer "Topography · Sectors · Zones live", all three checkboxes enabled, badge text reads "Matrix Toggles3…", canvas mounted, legend shows three rows. **Visual screenshot of the rendered zone rings was not captured — `preview_screenshot` timed out three times this session, same regression as v3.2.** Functional verification only.

### Deferred

- **Visual screenshot confirmation** — the preview screenshot tool was unresponsive throughout this session. Functional verification covers the data and DOM paths but does not confirm map paint.
- **Per-project radii overrides.** v3.3 ships a single pedagogical default ladder; an intensive market garden compresses all six zones into ~100 m, while pasture stretches them to kilometres. Adding `Project.zoneRadii?: [number,number,number,number,number]` is a small follow-up.
- **Real homestead anchor.** Zone 0 sits at the parcel centroid; permaculture practice anchors zones at the dwelling. Adding a clickable "Place homestead" pin lands in v3.4.
- **Boundary clipping for the inner annuli.** Today's annuli are full circles even when they overlap the parcel edge. Clipping to boundary would tighten the visual but requires `@turf/mask` or polygon-with-hole assembly per ring.
- **Zone-aware label placement.** Labels currently render at the polygon's centroid (which for an annulus is the circle's center, *inside* the inner hole). Moving labels onto the ring itself is a layout fix.

### Recommended next session

- **Wind-prevailing sector** (Open-Meteo / ERA5) — extend `lib/sectors/` with a wind-rose pull, surface as a fourth sector kind alongside the solar arcs.
- Or — **homestead-marker placement** — small UX feature: click on the Diagnose map to drop the zones anchor; persist as `Project.homesteadCenter?: [lng, lat]`. Unblocks per-project zone calibration.
- Or — **Zone 5 boundary clipping for the inner annuli** if the visual asymmetry is distracting in user testing.
