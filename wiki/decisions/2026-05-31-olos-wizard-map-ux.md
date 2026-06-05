# ADR: Project-creation map UX - basemap toggle, address search, page-fit scroll

- Date: 2026-05-31
- Status: Accepted
- Area: OLOS / Atlas web - project-creation wizard (Step 1 "Site")
- Branch: feat/atlas-permaculture

## Context

When creating a new project the steward lands on Step 1 of the wizard
(`/v3/project/wizard` -> `WizardStep1Site` -> `WizardSiteMap` ->
`DiagnoseMap`) and must locate and trace their parcel on a MapLibre map.
Three gaps existed:

1. The map showed a single hardcoded base layer with no in-context way to
   switch to satellite (important for spotting field/parcel features).
2. The only way to find a location was manual pan/zoom - no address lookup.
3. The wizard page could grow taller than the viewport, so the whole page
   scrolled (pushing the map and footer around) instead of just the form.

## Decision

Add two small overlay components to `WizardSiteMap` and fix the layout
height chain - without touching `DiagnoseMap.tsx` (which carries foreign
uncommitted WIP and already reacts to the basemap store).

1. **WizardBasemapToggle** - compact on-map control (bottom-left) reading
   `useBasemapStore` + `BASEMAP_OPTIONS`
   (`apps/web/src/v3/observe/components/measure/useMapToolStore.ts`).
   DiagnoseMap already calls `map.setStyle()` on basemap change, so the
   toggle is pure UI over the persisted store - no map handle required,
   no DiagnoseMap edit. Chosen over reusing the BaseMapCard dropdown
   (operator preference: compact on-map toggle).

2. **WizardAddressSearch** - debounced (300ms) MapTiler forward-geocode
   wrapping the `ui/Input` primitive. Mounted inside the DiagnoseMap
   render-prop so it has the live `maplibregl.Map`. On select it
   `flyTo`-recenters and drops a single temporary `maplibregl.Marker`;
   the steward still draws/confirms the boundary manually. Results are
   country-scoped (US/CA via the `country` query param, INTL unscoped).
   Guards on `hasMapToken` with a graceful hint when no MapTiler key is
   present. Reuses the existing geocoding REST pattern (no new dependency,
   no API proxy). Deliberately does NOT auto-fetch a legal parcel
   boundary - that needs a cadastral provider (out of scope).

3. **Page-fit / internal scroll** - root cause was
   `ProjectWizardShell.module.css .shell` using
   `min-height: calc(100vh - header)`, letting the shell exceed the
   viewport. Fix: `.shell` -> `height: calc(100vh - var(--header-h,64px))`
   + `overflow:hidden`; `.indicator` / `.footer` -> `flex:0 0 auto`;
   `WizardStep1Site.module.css .form` -> add `min-height:0` so the form
   column scrolls internally. Mobile stacked breakpoint scrolls the
   column as one (no side-by-side map to keep fixed).

## Consequences

- Stewards can switch base layers and locate by address directly on the
  creation map; the page fits the viewport with only the form scrolling.
- DiagnoseMap remains untouched, so the basemap behavior rides entirely
  on the existing persisted store - no risk to the foreign WIP there.
- No new npm dependency; geocoding reuses MapTiler + the existing token
  resolution (`maptilerKey` / `hasMapToken`).

## Verification

- `@ogden/web` typecheck exit 0 (0 errors).
- Vite transforms of all new modules return 200 with no transform errors.
- Preview at `/v3/project/wizard`: basemap toggle renders 5 options,
  address search input present, live map present, `pageScrolls=false`
  (scrollHeight === innerHeight).

## Files

- apps/web/src/v3/project-wizard/WizardBasemapToggle.tsx (new)
- apps/web/src/v3/project-wizard/WizardBasemapToggle.module.css (new)
- apps/web/src/v3/project-wizard/WizardAddressSearch.tsx (new)
- apps/web/src/v3/project-wizard/WizardAddressSearch.module.css (new)
- apps/web/src/v3/project-wizard/WizardSiteMap.tsx (wire both overlays)
- apps/web/src/v3/project-wizard/ProjectWizardShell.module.css (page-fit)
- apps/web/src/v3/project-wizard/WizardStep1Site.module.css (form scroll)
