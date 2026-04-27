# 2026-04-27 — Project-intake map centering & coordinate persistence

**Status:** Accepted · `feat/shared-scoring`
**Scope:** [apps/web/src/features/project/wizard/](apps/web/src/features/project/wizard/) · [packages/shared/src/schemas/project.schema.ts](packages/shared/src/schemas/project.schema.ts)

## Problem

Step 3 (Boundary) of the new-project wizard opened the map at a hardcoded
Ontario centroid (`[-79.8, 43.5]`). It attempted to recenter via a MapTiler
geocode of the address from Step 2, but:

1. The geocode call was **unscoped** — no country/region bias — so vague or
   ambiguous addresses (e.g. "Main St, Springfield") landed elsewhere.
2. Failures were **silently swallowed**; the user had no signal that the
   default centroid wasn't their property.
3. There was **no manual override** — a user with exact coordinates from
   Google Maps or a survey had no way to skip geocoding entirely.

Result: boundary drawing required pan-zoom across continents on every
non-Toronto project.

## Decision

**Centering priority** (in [StepBoundary.tsx](apps/web/src/features/project/wizard/StepBoundary.tsx)):

```
1. existing parcelBoundaryGeojson  →  fitBounds
2. manual centerLat + centerLng    →  flyTo zoom 15
3. address (scoped geocode)        →  flyTo zoom 15
   else                            →  warning banner + Step-2 link
```

**Manual coordinate input** added to [StepLocation.tsx](apps/web/src/features/project/wizard/StepLocation.tsx):
- Two number inputs (latitude, longitude) with `±90` / `±180` blur validation
- A "paste lat, lng" textbox that splits Google-Maps-style strings (`43.65, -79.38`) into both fields

**Scoped geocoding** when falling back to address:
- Append `country=us|ca` from `data.country` (skipped for `INTL`)
- Concatenate `provinceState` to query string for tighter results

**Persistence:** `centerLat` + `centerLng` (numbers) added to
`ProjectMetadata` zod schema (`projects.metadata` jsonb — no DB migration
needed). Successful geocodes **backfill** the manual fields so the
project remembers its center without a second geocode call later.

**Recenter affordance:** toolbar button on Step 3 re-runs the priority
chain using current wizard data; disabled when there's no signal.

**Failure UX:** non-blocking banner above the map ("Couldn't locate
that address. Go back to Step 2 and enter coordinates…") with "Back to
Step 2" + dismiss buttons.

## Why

- Manual coordinates short-circuit ambiguity for users who already know
  the exact spot — common workflow when copying from Google Maps, GPS
  unit, or survey docs.
- Scoping the geocode by country alone resolves most misfires without
  needing a fancy autocomplete UI.
- Persisting to `metadata` jsonb (instead of a new column) avoids a DB
  migration for a feature that may evolve. Promote to a dedicated column
  if/when query patterns demand indexing.

## How to apply

When implementing the §1 `project-intake` consumer surface (or any code
that opens the project map outside the wizard), honor
`metadata.centerLat`/`centerLng` as the initial map center. The wizard
guarantees these are populated whenever geocoding or manual entry
succeeded; absence means the project owner explicitly skipped both.

When adding new map-bearing wizard steps, follow the boundary > coords >
geocode priority — boundary is authoritative because user-drawn geometry
implies user knows where they want to be.

## Out of scope (deferred)

- Reverse geocoding (lat/lng → address autofill)
- Map-click-to-set-center UX
- Updating already-existing project map open paths to consume
  `metadata.centerLat/Lng` (this is a §1 implementation-pass concern;
  the wizard side now provides the contract)

## Verification

- `apps/web/` `tsc --noEmit` clean (with `--max-old-space-size=8192`)
- Browser DOM checks confirm Step 2 lat/lng inputs + paste shortcut +
  inline range validation; Step 3 renders Recenter button + map canvas
- Screenshot capture timed out twice during preview verification —
  visual fly-to behavior was not pixel-confirmed
