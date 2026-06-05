# ADR: The Observe-lens canvas renders a real MapLibre basemap with parcel + observation pins, falling back to PseudoMap for geometry-less projects

**Date:** 2026-06-04
**Status:** accepted (Tasks T1-T6 complete + committed; T5 functionally landed via an
absorbed foreign WIP commit; full basemap tile render unverifiable in the no-network
preview sandbox -- wiring/selection/badge/fallback DOM-verified, markers unit-tested)
**Branch:** `feat/atlas-permaculture` (commits `85bcd8b2`, `1c72d8ea`, `6ad3df30`,
`c16b165b`, `65650432`, `4e378eab`, `4debac08`; plan `49b0cac8`; T5 absorbed into the
out-of-band WIP `0276a484`; **not pushed**)
Plan: `docs/superpowers/plans/2026-06-04-atlas-observe-live-map.md`.

## Context

The `module-bar` Observe lens (`apps/web/src/v3/observe/lens/`) renders its centre
canvas as `PseudoMap` -- a decorative inline-SVG terrain that scatters observation pins
at normalized `[0,1]` `x/y` positions with NO geographic meaning. The lens was already
wired onto each project's live `ObserveDataPoint` substrate
([[decisions/2026-06-03-atlas-observe-lens-live-data-toggle]],
[[decisions/2026-06-03-atlas-observe-lens-measurement-bindings]]), but the pins still
floated on a fake backdrop: a steward could not see WHERE an observation sits on the
land. Atlas already ships MapLibre (`maplibre-gl ^4.7.0`) with a shared helper
(`apps/web/src/lib/maplibre.ts`: `MAP_STYLES`, `ESRI_WORLD_IMAGERY_STYLE`, `hasMapToken`).

**Operator decisions (this session):**
1. **Seed real demo geo + graceful fallback.** Ship MTC with a plausible boundary +
   per-point coordinates so the live map renders out of the box; any project without
   geometry keeps `PseudoMap` (zero regression).
2. **MTC geo = plausible Ontario placeholder** (NOT a surveyed parcel). It is sample
   data and must be labelled as such.
3. **Approach B -- a new lightweight dedicated `ObserveMap`** on `maplibre-gl`, NOT a
   reuse of the heavy Plan/Act `MapCanvas` (which carries draw tooling, layer
   management, and edit state the read-only Observe canvas must not inherit).
4. **A demo-data honesty badge** ("Sample location data") driven off an explicit
   `demoGeometry` flag, so the steward is never misled that the placeholder is real.

## Decision

**1. A typed map payload on the lens bundle (`ObserveMapData`), built in ONE place.**
`lens/types.ts` gains `BBox = [minLng, minLat, maxLng, maxLat]`,
`ObserveMapMarker { id, lng, lat, lens, type, label, age }`, and
`ObserveMapData { boundary: GeoJSON.FeatureCollection | null, bbox, markers, demoGeometry }`,
exposed as a nullable `LensDataBundle.map`. The payload is resolved by a pure
`buildObserveMap(points, parcelBoundary, nowMs, isDemoGeometry)` in `liveBundle.ts`,
mirroring the existing `buildObservationPins` pure-mapper idiom: it projects each
georeferenced active point to a `[lng,lat]` marker (dropping null-geometry points),
derives the `bbox` from the boundary when present else from the markers, and **returns
`null`** when there is neither a boundary nor a single georeferenced point -- the signal
the dashboard reads to fall back to `PseudoMap`. The mock bundle leaves `map: null`
(Millbrook stays on `PseudoMap`). bbox math is hardened against non-finite coordinates
and null GeoJSON features (`6ad3df30`).

**2. `ObserveMap` -- a new read-only MapLibre canvas, not a `MapCanvas` reuse.**
NEW `lens/ObserveMap.tsx` (~199 lines) is a self-contained read-only map. Props
`{ boundary, bbox, markers, activeLens, onObsClick, selectedObs, demoGeometry }`. A
mount-only effect builds a `maplibregl.Map` (`style: hasMapToken ? MAP_STYLES.hybrid :
ESRI_WORLD_IMAGERY_STYLE`, `bounds: bbox`, `dragRotate:false`, rotation disabled,
`NavigationControl`); on `load` it adds a `parcel` GeoJSON source +
`parcel-fill`/`parcel-line` layers and flips a `ready` flag. A `reposition()` projects
each marker `[lng,lat]` to screen pixels via `map.project()` and the lens renders its
EXISTING pin visual language on an SVG overlay above the canvas (`pointerEvents:none` on
the overlay; `auto` on each pin group), reusing the extracted `ObservationPin` so the
pins, selection callout, and `filter#glow` styling are byte-identical to `PseudoMap`.
The map owns no draw/edit state; pin clicks call the same `onObsClick`/`selectedObs`
contract the PseudoMap used, so the IntelligencePanel selection wiring is unchanged.

**3. `ObservationPin` extracted from `PseudoMap` (shared pin markup).** `components.tsx`
gains an exported `ObservationPin({ px, py, obs, mapColor, isActive, isSelected, onClick })`
above `PseudoMap`; `PseudoMap`'s inline pin map is refactored to call it. Markup is
byte-identical to the prior inline pin EXCEPT `pointerEvents:'auto'` is added to the `<g>`
(so a pin stays clickable under an overlay whose container is `pointerEvents:none`).
`PseudoMap` behaviour is otherwise unchanged and it stays exported ([[feedback-no-deletion]]).

**4. The dashboard branches on `bundle.map`.** `ObserveLensDashboard.tsx` imports
`ObserveMap` and swaps the StageShell `canvas` slot to
`bundle.map ? <ObserveMap .../> : <PseudoMap .../>`, threading `boundary`, `bbox`,
`markers`, `activeLens`, `onObsClick`, `selectedObs`, and `demoGeometry` from the bundle.
Both PseudoMap props (`activeLens`/`onObsClick`/`selectedObs`) are preserved on the
fallback branch.

**5. Seeded MTC demo geometry behind an explicit demo flag.** `projectStore.ts` gains a
`MTC_PARCEL_BOUNDARY` `FeatureCollection` (a 5-coord Polygon at ~`[-80.10,44.30]`,
Ontario; 6-dp), set on `MTC_SEED.parcelBoundaryGeojson` with `hasParcelBoundary:true`,
plus an idempotent backfill in `seedMtcDemo` that patches a persisted MTC row missing the
boundary (preserving the existing curated-actions + observe-points seeders).
`builtinObserveDataPoints.ts` adds a `location` `[lng,lat]` to all 10 MTC seed rows so
each becomes a georeferenced marker. The `demoGeometry` flag is threaded from the seed
through `buildObserveMap` to the badge -- MTC is sample data, so `ObserveMap` paints a
"SAMPLE LOCATION DATA" badge.

## Consequences

- The live Observe canvas now places each observation at its true coordinate on a real
  satellite/hybrid basemap, with the parcel outline drawn; the steward reads location,
  not a decorative scatter.
- Projects with no boundary and no georeferenced point render `PseudoMap` unchanged --
  `buildObserveMap` returning `null` is the single fallback signal; the mock/Millbrook
  path is untouched.
- The demo badge keeps the placeholder honest: the MTC coordinates are plausible, not
  surveyed, and say so on the map face.
- `ObserveMap` is intentionally read-only and standalone; a future editable Observe map
  (or a server-synced boundary) is a new prop/source on this component, not a fork of the
  heavy `MapCanvas`.
- The extracted `ObservationPin` is the one definition of the lens pin, shared by both
  the real map and the fallback -- a pin-style change lands in one place.

## Verification

- `apps/web` `tsc --noEmit` (`NODE_OPTIONS=--max-old-space-size=8192`) -> **EXIT 0**,
  zero errors (ObserveMap, ObserveLensDashboard, liveBundle, projectStore,
  builtinObserveDataPoints, components).
- Bounded `--pool=forks` vitest -> **32/32 green**: the 4 `observeMap.test.ts` cases over
  `buildObserveMap` (null when no geo; boundary-derived bbox + `demoGeometry`; marker per
  georeferenced point omitting null-geometry; marker-derived bbox) plus the rewritten
  `liveBundle.test.ts` fixture-sanity (all 10 MTC points now carry `Point` geometry; the
  bundle resolves a non-null `map` with 10 markers, `boundary:null`, `demoGeometry:false`
  for the no-flag builder call) -- the two stale "no geometry"/"null map" assertions were
  updated to the seeded reality (`4debac08`).
- **Live preview, disclosed DOM reads (port 5200).** The preview sandbox has **no
  external network** -- every off-localhost request fails (`net::ERR_FAILED`), including
  `api.maptiler.com/.../style.json`. With a MapTiler key present `ObserveMap` selects the
  `hybrid` style, its `style.json` fetch fails, the map `load` never fires, and pins
  (gated on `ready`) do not paint. **This is an environment limitation, not a code
  defect, and is disclosed rather than papered over.** What WAS proven via DOM:
  `/v3/project/mtc/observe` (Live) renders `ObserveMap` -- a maplibre canvas +
  NavigationControl + the SVG overlay + the "SAMPLE LOCATION DATA" badge are all present,
  proving the `bundle.map` branch is selected and `demoGeometry` flows through. The mock
  route (and any geometry-less project) renders `PseudoMap` -- no maplibre canvas, no
  badge, 10 `ObservationPin` groups -- proving the fallback. Marker projection is proven
  by the unit tests. `preview_screenshot` hung again ([[project-screenshot-hang]]) --
  disclosed; no unproven visual-success claim.

## Process / covenant

Explicit-path commits (staged exactly the named files; never `git add -A`; `git reset -q`
before staging; verified `git diff --cached` against a working tree full of foreign
"epitaxy" WIP, left untouched). An external rebase fired mid-session and absorbed the T5
`ObserveLensDashboard.tsx` edit into the foreign WIP commit `0276a484`; per
[[feedback-no-deletion]] / leave-foreign-WIP-untouched the foreign commit was NOT
rewritten -- the T5 edit was verified by `git diff 65650432 HEAD -- ObserveLensDashboard.tsx`
(exactly the canvas swap, nothing foreign) and secured as an ancestor under the T6 commit;
if the external process ever drops `0276a484`, re-apply the canvas-slot swap. Branch
divergence-checked, **not pushed** ([[project-branch-rebase]],
[[feedback-commit-immediately-on-rebased-branches]]). `mockData.ts` byte-untouched;
`PseudoMap` + `ObservationPin` stay exported ([[feedback-no-deletion]]). ASCII-only copy;
apostrophe-free JS strings. CSRA model untouched ([[fiqh-csra-erased-2026-05-04]]).
Amanah: read-only map render of the operator's own land + sample coordinates -- no
sales/finance instrument, clean.

## Deferred

- Replace the MTC placeholder polygon with the real surveyed boundary when available
  (drops the demo badge for MTC via `demoGeometry:false`).
- Full basemap tile render + on-map pin paint must be re-verified in a network-capable
  environment (or with a screenshot once the sandbox can reach the tile host).
- An editable Observe map (boundary edit / point relocation) remains out of scope --
  `ObserveMap` is read-only by design.

Entity: [[entities/observe-dashboard]]. Log: [[log/2026-06-04-atlas-observe-live-map]].
