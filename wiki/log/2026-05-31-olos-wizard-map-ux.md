# Log: 2026-05-31 - OLOS wizard creation-map UX

Session objective: on the live project-creation map (Step 1 of the
wizard), enable base-layer switching, address-based property lookup, and
a viewport-fitting layout where only the form section scrolls.

## What landed

- New `WizardBasemapToggle` (compact on-map base-layer control, bottom-left)
  over `useBasemapStore` + `BASEMAP_OPTIONS`. No DiagnoseMap edit - it
  already reacts to the store via `setStyle`.
- New `WizardAddressSearch` (debounced MapTiler forward-geocode, country
  scoped, flyTo + single temporary marker, hasMapToken guard). Mounted in
  the DiagnoseMap render-prop, ungated.
- Page-fit/scroll CSS fix: `.shell` height+overflow:hidden,
  indicator/footer flex:0 0 auto, `.form` min-height:0.

## Verification

- @ogden/web typecheck exit 0.
- Vite module transforms 200, no transform errors.
- Preview /v3/project/wizard: 5 basemap options, search input, live map,
  pageScrolls=false.

## Constraints honored

- DiagnoseMap.tsx untouched (foreign WIP).
- Staged exactly 7 wizard files by explicit path; no git add -A; no
  foreign WIP staged.
- ASCII-only copy; no legacy component deletion.

## ADR

- wiki/decisions/2026-05-31-olos-wizard-map-ux.md
