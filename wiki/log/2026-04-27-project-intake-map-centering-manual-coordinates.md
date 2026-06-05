# 2026-04-27 — Project intake: map centering + manual coordinates


Closed a UX gap in the new-project wizard. Step 3's map opened at a
hardcoded Ontario centroid and only re-centered if a MapTiler geocode of
the Step-2 address succeeded. Geocodes were unscoped and silently swallowed
failures, so non-Toronto projects landed wrong with no signal.

### Changes (`feat/shared-scoring`)

- [`packages/shared/src/schemas/project.schema.ts`](packages/shared/src/schemas/project.schema.ts)
  — `ProjectMetadata` extended with `centerLat` (`-90..90`) + `centerLng`
  (`-180..180`). No DB migration (jsonb).
- [`apps/web/src/features/project/wizard/StepLocation.tsx`](apps/web/src/features/project/wizard/StepLocation.tsx)
  — Added optional lat/lng inputs with blur-time range validation +
  "paste lat, lng" textbox that splits Google-Maps-style strings.
- [`apps/web/src/features/project/wizard/StepBoundary.tsx`](apps/web/src/features/project/wizard/StepBoundary.tsx)
  — Inline geocode replaced by `centerMap()` callback driven by
  priority `boundary > manual coords > scoped geocode`. Geocode now
  appends `country=us|ca` + `provinceState`. Failures surface a
  dismissable banner with "Back to Step 2". Toolbar gains a **Recenter**
  button (uses current wizard data). Successful geocodes backfill
  `centerLat/Lng` so the project remembers its center.
- [`apps/web/src/pages/NewProjectPage.tsx`](apps/web/src/pages/NewProjectPage.tsx)
  + [`apps/web/src/features/project/wizard/StepNotes.tsx`](apps/web/src/features/project/wizard/StepNotes.tsx)
  — `WizardData` carries the strings; `buildMetadata()` parses to numbers
  before write so both local + server paths persist.

### Verification

- `apps/web` `tsc --noEmit` clean (Node heap bumped to 8 GB; default
  4 GB OOMs on this project — known Atlas constraint).
- DOM checks in preview: Step 2 lat/lng inputs + paste shortcut +
  inline range validation; Step 3 renders Recenter button + map canvas.
- Screenshot tool timed out — no pixel-level fly-to confirmation.

### Decision document

[`wiki/decisions/2026-04-27-project-intake-map-centering.md`](decisions/2026-04-27-project-intake-map-centering.md)
captures the centering priority + persistence contract for downstream
consumers (notably the §1 `project-intake` implementation pass, which
needs to honor `metadata.centerLat/Lng` when reopening existing projects).

### Deferred

- Wiring `metadata.centerLat/Lng` into the existing-project map open
  path (separate consumer; belongs in §1 implementation).
- Reverse geocoding, map-click-to-set-center.
