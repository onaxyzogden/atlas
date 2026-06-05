# 2026-06-04 -- Observe lens: wire in a live MapLibre basemap (parcel + georeferenced pins) with PseudoMap fallback

**Branch.** `feat/atlas-permaculture` (explicit-path commits `85bcd8b2`, `1c72d8ea`,
`6ad3df30`, `c16b165b`, `65650432`, `4e378eab`, `4debac08`; plan `49b0cac8`; T5 absorbed
into the out-of-band WIP `0276a484`; rebased out-of-band, divergence-checked, **not
pushed**). Plan: `docs/superpowers/plans/2026-06-04-atlas-observe-live-map.md`.
ADR: [[decisions/2026-06-04-atlas-observe-live-map]]. Entity: [[entities/observe-dashboard]].
Executed task-by-task via superpowers:subagent-driven-development (fresh implementer per
task + spec-compliance then code-quality review).

The `module-bar` Observe lens canvas was a decorative `PseudoMap` SVG scattering pins at
meaningless normalized `[0,1]` positions. This work replaced it (when geometry exists)
with a real read-only MapLibre basemap rendering the parcel boundary + observation points
at true coordinates, preserving the pin visual language and falling back to `PseudoMap`
for geometry-less projects. Operator-locked: seed real MTC demo geo + graceful fallback;
MTC geo = plausible Ontario placeholder; Approach B (new lightweight `ObserveMap`, NOT a
`MapCanvas` reuse); a "Sample location data" honesty badge off an explicit `demoGeometry`
flag.

## T1 -- ObserveMapData types + LensDataBundle.map (`85bcd8b2`)

`lens/types.ts`: `BBox = [minLng,minLat,maxLng,maxLat]`,
`ObserveMapMarker { id, lng, lat, lens, type, label, age }`,
`ObserveMapData { boundary, bbox, markers, demoGeometry }`, nullable `LensDataBundle.map`.

## T2 -- buildObserveMap pure builder + tests + live wire (`1c72d8ea`, hardened `6ad3df30`)

`liveBundle.ts`: pure `buildObserveMap(points, parcelBoundary, nowMs, isDemoGeometry)` --
markers from georeferenced active points (null-geometry dropped), bbox from boundary else
markers, **returns `null`** when neither boundary nor any georeferenced point exists (the
fallback signal). `useLiveLensBundle` threads the project `parcelBoundaryGeojson` + demo
flag. `__tests__/observeMap.test.ts` (4 cases). A follow-up (`6ad3df30`) hardened the bbox
math against non-finite coords + null GeoJSON features and fixed a test type + null anchor.

## T3 -- Extract ObservationPin from PseudoMap (`c16b165b`)

`components.tsx`: exported `ObservationPin({ px, py, obs, mapColor, isActive, isSelected,
onClick })` above `PseudoMap`; PseudoMap's inline pin map refactored to call it. Markup
byte-identical EXCEPT `pointerEvents:'auto'` added to the `<g>` (clickable under a
`pointerEvents:none` overlay). PseudoMap behaviour unchanged, still exported.

## T4 -- ObserveMap read-only MapLibre canvas (`65650432`, ~199 lines)

NEW `lens/ObserveMap.tsx`. Props `{ boundary, bbox, markers, activeLens, onObsClick,
selectedObs, demoGeometry }`. Mount-only effect builds `maplibregl.Map` (`style:
hasMapToken ? MAP_STYLES.hybrid : ESRI_WORLD_IMAGERY_STYLE`, `bounds:bbox`,
`dragRotate:false`, rotation disabled, `NavigationControl`); on `load` adds the `parcel`
GeoJSON source + `parcel-fill`/`parcel-line` layers and sets `ready`. `reposition()`
projects each marker via `map.project()`; an SVG overlay (`pointerEvents:none`, glow defs)
renders `{ready && markers.map(...)}` -> `ObservationPin`, a selection callout, and a
`{demoGeometry && ...}` "SAMPLE LOCATION DATA" badge. Reuses the same
`onObsClick`/`selectedObs` contract as PseudoMap; owns no draw/edit state. Code-reviewed
APPROVED (5 non-blocking nice-to-haves).

## T5 -- Swap dashboard canvas to ObserveMap (content in HEAD via `0276a484`)

`ObserveLensDashboard.tsx`: `import ObserveMap`; the StageShell `canvas` slot becomes
`bundle.map ? <ObserveMap boundary/bbox/markers/activeLens/onObsClick/selectedObs/demoGeometry .../>
: <PseudoMap activeLens/onObsClick/selectedObs .../>`.

**Hazard realized (recorded, not hidden):** the external rebase fired while this edit was
staged-but-uncommitted and absorbed it into the FOREIGN WIP commit `0276a484` ("epitaxy
pre-switch"). Per leave-foreign-WIP-untouched, that commit was NOT rewritten; the edit was
verified via `git diff 65650432 HEAD -- ObserveLensDashboard.tsx` (exactly the canvas swap,
nothing foreign) and is secured as an ancestor under the T6 commit. If the external process
drops `0276a484`, re-apply this one edit. Lesson reinforced:
[[feedback-commit-immediately-on-rebased-branches]].

## T6 -- Seed MTC parcel boundary + observation point coords (`4e378eab`)

`projectStore.ts`: `MTC_PARCEL_BOUNDARY` `FeatureCollection` (5-coord Polygon ~
`[-80.1059..-80.0958, 44.2965..44.3035]`, 6-dp) set on `MTC_SEED.parcelBoundaryGeojson`
with `hasParcelBoundary:true`, plus an idempotent backfill in `seedMtcDemo` patching a
persisted MTC row missing the boundary (existing curated-actions + observe-points seeders
preserved). `builtinObserveDataPoints.ts`: a `location` `[lng,lat]` added to all 10 MTC
seed rows. This invalidated two `liveBundle.test.ts` fixture-sanity tests asserting "no
geometry"/"null map" (anticipated by the T2 plan note) -- both rewritten to the seeded
reality (all 10 points carry `Point` geometry; non-null map, 10 markers, `boundary:null`,
`demoGeometry:false` for the no-flag builder call) and committed `4debac08`. Bounded vitest
-> 32/32.

## Verification

- **tsc:** `apps/web` `tsc --noEmit` (`NODE_OPTIONS=--max-old-space-size=8192`) -> EXIT 0,
  0 errors. (Empty tsc output is NOT success -- EXIT 0 confirmed explicitly.)
- **vitest** (bounded, `--pool=forks`): `observeMap.test.ts` + `liveBundle.test.ts` ->
  **32/32** green.
- **Live preview, disclosed DOM reads (port 5200).** The preview sandbox has **no
  external network**; every off-localhost request fails (`net::ERR_FAILED`), including the
  MapTiler `style.json`. With a MapTiler key present `ObserveMap` picks `hybrid`, the style
  fetch fails, the map `load` never fires, and pins (gated on `ready`) do not paint. **This
  is an environment limitation, not a code defect -- disclosed, not papered over.** Proven
  via DOM: `/v3/project/mtc/observe` (Live) renders `ObserveMap` (maplibre canvas +
  NavigationControl + SVG overlay + "SAMPLE LOCATION DATA" badge present -> `bundle.map`
  branch selected, `demoGeometry` flowing); the mock route renders `PseudoMap` (no
  maplibre, no badge, 10 `ObservationPin` groups -> fallback). Marker projection proven by
  unit tests. `preview_screenshot` hung ([[project-screenshot-hang]]) -- disclosed; the
  request flood crashed the dead-API preview server.

## Process / covenant

Explicit-path commits (`git reset -q`; staged named files only; `git diff --cached`
audited; foreign WIP restored-staged out and left untouched). Branch divergence-checked,
**not pushed** ([[project-branch-rebase]]). `mockData.ts` byte-untouched; `PseudoMap` +
`ObservationPin` stay exported ([[feedback-no-deletion]]). ASCII-only; apostrophe-free JS
strings. CSRA model untouched ([[fiqh-csra-erased-2026-05-04]]). Amanah: read-only map of
the operator's own land + sample coords -- clean.

## Deferred

- Replace the MTC placeholder polygon with the real surveyed boundary (drops the demo
  badge via `demoGeometry:false`).
- Re-verify full basemap tile render + on-map pin paint in a network-capable environment
  (or with a screenshot once the sandbox can reach the tile host).
- An editable Observe map stays out of scope -- `ObserveMap` is read-only by design.
