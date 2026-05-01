# 2026-04-30 — V3 DiagnosePage: parcel satellite snapshot

**Status:** Accepted
**Branch:** `feat/atlas-permaculture`
**Phase:** 5.3 (V3 MapboxGL integration — DiagnosePage hero aside)
**Files:**
- `apps/web/src/v3/components/ParcelSatelliteSnapshot.tsx` (new)
- `apps/web/src/v3/components/ParcelSatelliteSnapshot.module.css` (new)
- `apps/web/src/v3/pages/DiagnosePage.tsx`
- `apps/web/src/v3/pages/DiagnosePage.module.css`

## Context

`DiagnosePage` rendered a `◊` glyph placeholder in the `StageHero` aside slot
labelled with the parcel caption. The accompanying comment marked the slot
as "satellite tile snapshot — Phase 5.3" deferral. Of the three Phase-5
MapboxGL items, this one is the smallest scope: a static snapshot does not
need an interactive maplibregl instance, draw tools, or store wiring.

The DiagnosePage body already mounts `DiagnoseMap` (a real maplibregl
instance) — RULE 2's "no MapboxGL in v3.0" guidance had already been lifted
on Diagnose by the overlay/zone overlays that ship today. So the aside slot
is the last visible placeholder on Diagnose.

## Decision

Render a server-rendered satellite tile from the MapTiler Static Maps API,
overlaid with the parcel boundary polygon as an SVG `<polygon>`.

- **Tile source**: `https://api.maptiler.com/maps/satellite/static/<lng>,<lat>,<zoom>/<W>x<H>.png?key=…`
  — same MapTiler key resolution path the rest of the app uses (`maptilerKey`
  from `apps/web/src/lib/maplibre.ts`, with the user-paste-key fallback).
- **Boundary overlay**: Web-mercator forward-project each ring vertex against
  the tile's centre + zoom + dimensions, render as an absolute-positioned
  SVG polygon (gold stroke + 18% gold fill) above the `<img>`.
- **Zoom selection**: derive from the parcel's bbox span so the polygon
  occupies ~70% of the tile width. Clamped to z8–z18.
- **Fallback**: when no MapTiler key is configured *or* the project carries
  no boundary polygon, render the previous `◊` glyph in the same dashed
  card. This preserves dev-without-key parity and keeps mock projects
  rendering.

The component is a pure functional/visual surface — no stores, no
maplibregl runtime, no draw tools. Mount cost is essentially the cost of
the `<img>` request.

## Why this and not a full maplibregl mini-map

- **Scope**: a maplibregl instance for a 320×240 hero card pulls in the
  full GL runtime + style fetch + potentially a second viewport-sizing
  observer per page. The static endpoint does the same job in one image.
- **Interactivity**: this slot is decorative — the interactive Diagnose map
  already lives below (Site analysis section). Doubling the GL footprint
  for a non-interactive surface is unjustified.
- **Future drift**: if Diagnose ever grows a "click parcel to fly to" or
  per-vertex hover, swap to a maplibregl instance — the component shape
  stays stable.

## Out of scope (deferred)

- **5.1 DesignPage live canvas** — placement, snapping, live scoring
  callouts. Needs its own ADR (canvas semantics, snap targets, score
  recompute cadence). Materially larger scope than 5.3.
- **5.2 OperatePage field map** — MapboxGL + parcel + alert pin overlay
  to replace `FieldMapPlaceholder`. Needs its own ADR (telemetry source,
  pin clustering, refresh cadence).

## Verification

- `tsc --noEmit` clean for `@ogden/web`.
- The MTC fixture carries `mockProject.location.boundary`, so `/v3/project/mtc/diagnose`
  exercises the live path under preview when a MapTiler key is paste-saved.
- Without a key, the fallback ◊ glyph renders identically to the prior
  placeholder — no regression for dev-without-key flow.
