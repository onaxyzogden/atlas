# 2026-05-13 — Adopt-from-map root cause (correction): builtEnvironment toggle gated 2D fill off


**Why the earlier entry was wrong.** The earlier-today entry concluded
the bug was perceptual and shipped a `toast.success` for visible save
feedback. Retest by user: "still not working. Saved the building. No
ability to re-edit it. No sign anything was done besides a notification
in the top right corner that it was saved but it is not visible on
the map view." The toast fired; the building remained invisible; no
clickable feature existed for re-edit. Root cause was downstream of
the save layer entirely.

**Real root cause.** `ObserveAnnotationLayers` is the *only* renderer
that draws V2 buildings as a 2D footprint at default top-down pitch.
Its `be-buildings` layer carries `toggleKey: 'builtEnvironment'`, and
[`matrixTogglesStore.ts:76`](apps/web/src/store/matrixTogglesStore.ts:76)
defaults `builtEnvironment: false`. The other two BE-V2 layers in
Observe don't fill the gap:

- `BeV2GenericLayer` deliberately excludes `LEGACY_OBSERVE_BE_KINDS`
  (including `building`), since the legacy 8 kinds have bespoke
  renderers in `ObserveAnnotationLayers`.
- `DesignElementExtrusionLayer` renders 3D extrusion only at pitch
  > 0 (collapses top-down). Default Observe view is top-down.

Meanwhile `AdoptedBuildingsSync` runs on every V2-entity change and
hides the basemap building whose `osm_id` matches
`entity.existing.adoptedFromBasemapId`. So at the moment of Save the
basemap building disappears, the V2 2D fill is gated off, the V2 3D
extrusion is invisible at pitch 0 — the steward sees a blank patch
and no clickable feature for re-edit. Direct evidence from the live
dev preview: `localStorage['ogden-atlas-matrix-toggles'].state.builtEnvironment
=== false` while
`localStorage['ogden-built-environment-v2'].state.entities.filter(e =>
e.kind === 'building' && e.state === 'existing').length === 13`. Flipping
the toggle to true via the matrix UI immediately reveals all 13 adopted
buildings as 2D fills (verified by screenshot).

**What.**
- Reverted the toast-on-save addition in
  [`buildBuildingEditSchema`](apps/web/src/v3/plan/layers/inlineEditSchemas.ts) —
  it was the wrong fix.
- In
  [`AdoptBasemapBuildingTool.tsx`](apps/web/src/v3/observe/components/draw/AdoptBasemapBuildingTool.tsx),
  after `useBuiltEnvironmentStoreV2.create()` succeeds, flip
  `useMatrixTogglesStore.builtEnvironment` to `true` if it isn't
  already. Source comment records the rationale so a future
  reader doesn't strip it as redundant. The toggle is `persist`ed,
  so future sessions retain the on state.
- Net diff: +12 lines in `AdoptBasemapBuildingTool.tsx`, −9 lines in
  `inlineEditSchemas.ts` (toast import + call + comment).

**Verified.** `tsc --noEmit` clean; `vite build` clean (31.49s,
8GB heap — pre-existing OOM workaround). In the live preview at
`/v3/project/mtc/observe` the existing 13 adopted buildings become
visible the moment `builtEnvironment` is true; the 2D fill is the
clickable surface that re-opens the inline form (via
`ObserveAnnotationLayers` click handler → `openBeInlineEditByObserveKind`).

**Lesson.** First-pass "this is a perception bug" diagnosis was a
shortcut: I had the localStorage evidence that Save persists, and
treated "user reports no visible change" as proof the data was just
invisible-by-design. The correct read was "user reports no visible
change *because the V2 entity isn't rendered at default pitch when
the matrix toggle is off*." Should have walked the rendering pipeline
end-to-end in Phase 1 — what layer paints this entity, what gates it —
before concluding perceptual. Updated the systematic-debugging
discipline note in this session's plan file.

**Deferred / follow-ups.**
- The same toggle gate hides every other BE kind (well, septic, fence,
  gate, driveway, power-line, buried-utility) when their place-tools
  run. Each tool would need the same one-line toggle-flip — or
  preferably, refactor: each BE V2 tool's success path flips
  `builtEnvironment` on as a shared helper. Tracked but not in this
  fix's scope.
- Default `builtEnvironment: false` is conservative — consider
  switching to `true` once the V2 building footprint style is
  unambiguous against the basemap. Until then, the auto-flip-on-create
  pattern keeps it discoverable without ambushing fresh stewards
  with overlays they didn't ask for.
