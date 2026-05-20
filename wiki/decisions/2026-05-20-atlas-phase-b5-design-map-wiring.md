# 2026-05-20 — Atlas Phase B.5: Design Map generator wired to API + web

**Status:** Accepted
**Branch:** `feat/atlas-permaculture`
**Phase:** Apricot Lane Validation Protocol — Phase B.5 (wire the Phase B
generator service to a backend route and to the two web entry points).
**Commits:** `1b028056` (B.5.1), `c24b970d` (B.5.2 commit 1 — apiClient + modal),
`3002fa89` (B.5.2 commit 2 — toolbar + NBA trigger + WS bulk handler),
`51f6ed06` (small follow-up: drop now-unused `@ts-expect-error` in the B.5.1
test mock).

## Context

Phase B shipped a pure-function `generateDesignMap(input): { features,
summary, warnings }` service. B.5 is the wiring phase that makes the
generator usable end-to-end: a Fastify route reads the project's parcel
boundary + watershed-derived swale candidates + terrain contours, calls
the generator, optionally persists the rows, and broadcasts the bulk
event over WebSocket; the web client offers a two-step dry-run + save UX
on two surfaces.

Per [[plan-apricot-lane-restart-2026-05-20]] the wiring lands as two
sub-phases, each commit independently:

- **B.5.1** — backend route + tests + app mount.
- **B.5.2** — web `api.designMap.generate(...)`, `DesignMapGeneratorModal`,
  toolbar action, Next Best Action queue entry, modal mount on the mobile
  Overview surface, and a `features_bulk_created` WS handler so the
  persisted features arrive in the project layer stores without a manual
  refresh.

Two surfaces are explicitly required by the plan: the `DomainFloatingToolbar`
(visible across all domains, including `default` — not gated) and the
Observe `NextBestActionsPanel` (between the top-opportunity entry and
`run-feasibility`).

## Decisions

### B.5.1 — API route `POST /api/v1/design-map/project/:projectId/generate`

- New file `apps/api/src/routes/design-map/index.ts` mounted in
  `apps/api/src/app.ts` next to `design-features`.
- Auth: `authenticate` + `resolveProjectRole`; `persist: true`
  additionally requires `requireRole('owner', 'designer')`.
- Body: `{ persist?: boolean = false, options?: { enterprises?, orchard?,
  swale?, paddock?, corridor? } }`.
- Handler:
  1. Reads `parcel_boundary_geojson` + `area_acres` from the `projects`
     row (same pattern as `routes/projects/index.ts`).
  2. Reads `summary_data.swaleCandidates.candidates[]` from the
     `watershed_derived` row in `project_layers` and maps each to the
     generator's `SwaleCandidateInput` shape.
  3. Reads `terrain_analysis.contour_geojson` when present and converts
     each LineString to a `ContourInput` with `meanSlopePct` derived from
     `slope_mean_deg`; missing terrain falls back to "no contours,"
     yielding the existing `'no orchard rows generated'` warning rather
     than a 500.
  4. **Riparian lines deferred.** `drainage_divide` features are polygons
     (`binaryMaskToGeoJSON` output), not LineStrings — a proper
     extraction is its own task. The route passes `undefined`; the
     habitat-corridor algorithm falls back to parcel-perimeter buffer +
     slope-aware spines, which is exactly what it was designed for.
  5. Calls `generateDesignMap(inputs)`.
  6. When `persist === true`, opens a transaction and bulk-inserts each
     `CreateDesignFeatureInput` using the same SQL pattern as
     `routes/design-features/index.ts:255–287`, calls
     `fastify.wsBroadcast('features_bulk_created', { features })`, and
     logs an activity row.
- Response envelope: `{ data: { features, summary, warnings,
  persisted?: { count, ids[] } }, error: null }`.
- Tests under `apps/api/src/tests/designMap.test.ts` cover: dry-run returns
  features without inserting; persist=true creates rows and broadcasts;
  missing layer data yields a warning, not a 500; viewer role gets 403
  when calling with `persist: true`. Full suite at 631 / 3 green.

### B.5.2 — Web `api.designMap.generate(...)` + `DesignMapGeneratorModal`

- `api.designMap.generate(projectId, { persist?, options? })` added next
  to `api.designFeatures.bulkUpsert`. Return type mirrors the route
  envelope.
- `apps/web/src/features/dashboard/DesignMapGeneratorModal.tsx` — two
  steps:
  1. On mount, calls the route with `persist: false`. Displays a 2-column
     grid of formatted summary cards (orchard rows, swales, paddocks,
     corridors, sponge capacity, AU-days, estimated tree count, corridor
     area) and any warnings.
  2. **Save to design** re-calls with `persist: true`; on success the
     modal closes. The server broadcasts `features_bulk_created`; the
     existing project layer stores absorb the rows via the new WS
     dispatcher (below).
- Modal follows the `EmbedCodeModal` token pattern (`zIndex.modal`,
  panel-bg, panel-card-border, panel-muted, semantic accents). Backdrop
  + Escape dismiss. Disabled state covers loading, persisting, and the
  empty `features.length === 0` case.

### B.5.2 — Trigger surfaces

- **Toolbar** — `DomainFloatingToolbar` gains an optional `onOpenDesignMap`
  prop. The toolbar previously returned `null` for `HIDDEN_DOMAINS` (just
  `default`); it now renders whenever **any** of the per-domain tools or
  the global tools row are visible. The global tool row renders an extra
  `Sparkles`-iconed "Design Map" button below the domain row. `MapView`
  passes `onOpenDesignMap={() => setIsDesignMapOpen(true)}` and mounts
  the modal lazily with `apiProjectId = project.serverId ?? project.id`.
- **Next Best Action** — `NextBestActionsPanel` gains an optional
  `onGenerateDesignMap` prop. Queue entry uses the `Wand2` icon, sits
  between the top-opportunity action and `run-feasibility`, and is only
  pushed when both the callback **and** `project.parcelBoundaryGeojson`
  are present (no point offering generation on a parcel that hasn't been
  drawn yet). `MobileProjectShell` lazily mounts the modal and wires
  `onGenerateDesignMap` so the Overview tab can launch it without
  leaving the page.

### B.5.2 — WebSocket bulk handler

- `apps/web/src/lib/wsService.ts` gains a `features_bulk_created`
  dispatcher case + `handleFeaturesBulkCreated(event)` handler. The
  handler fans the bulk payload out to the existing per-feature handler,
  so `useZoneStore` and the structures store both receive the persisted
  rows immediately — closing the B.5 gate clause *"features appear on
  the map via the existing real-time channel"*. The event was already in
  the `websocket.schema.ts` enum (line 17) but had no client-side
  handler before B.5.2.

## Consequences

- Apricot Lane scorecard's **Design Map** row is now in user-reachable
  state: the orchestration capability sits behind the toolbar Sparkles
  button (any domain) and the Overview Next Best Action — both surfaces
  share the same modal and route.
- The two-step (preview → save) pattern means the user never persists
  a rejection-worthy design by accident. The dry-run also gives an
  inexpensive way to surface warnings from each algorithm (missing
  contours, missing swale candidates, perimeter-buffer fallback for
  corridors) before any DB write happens.
- A future riparian-line extractor can be added without a route
  signature change — the algorithm already accepts `riparianLines` and
  the route passes `undefined` today.

## Verification

- `pnpm --filter @ogden/api run lint` → tsc clean.
- `pnpm --filter @ogden/api run test` → **631 passed / 3 skipped (634)**.
- Web `tsc --noEmit` (with `NODE_OPTIONS="--max-old-space-size=8192"`) →
  no B.5-introduced errors. Three residual errors (`StepBoundary.tsx:365`,
  `ArchivePage.tsx:35,36`) are pre-existing on this branch / from
  unrelated in-flight WIP and do not touch any file in the B.5
  commits.
- Manual smoke on the seeded 200-acre fixture deferred per Assumption
  A2 (fixture has not been built yet — synthetic 900 m × 900 m parcel
  in `DesignMapGenerator.test.ts` is the current proxy).

## Links

- Phase B ADR: [[2026-05-20-atlas-phase-b-design-map-generator]]
- Restart plan: [[plan-apricot-lane-restart-2026-05-20]]
- Covenant: [[fiqh-csra-erased-2026-05-04]]
- Mobile flat-stack feedback: [[feedback-mobile-overview-stack]]
- No deletion in revamps: [[feedback-no-deletion]]
