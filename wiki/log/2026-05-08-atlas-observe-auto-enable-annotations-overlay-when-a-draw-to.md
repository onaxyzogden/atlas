# 2026-05-08 — Atlas OBSERVE: auto-enable annotations overlay when a draw tool is active


### Completed

User-reported: "Property boundary works now but tools like Ecology Zone do
not." Live diagnosis via Chrome MCP confirmed records *were* persisting
(8 ecology zones in `localStorage["ogden-ecology"].state.ecologyZones`,
all with valid Polygon geometry and the right `dominantStage`), but the
master "Observe annotations" overlay toggle in
`useMatrixTogglesStore.observeAnnotations` was off — which sets
`visibility: 'none'` on every `observe-anno-*` layer in
`ObserveAnnotationLayers`. Net effect: draw → save → invisible. The
toggle UI lives in `MapToolbar`'s Overlays popover (stacked-squares icon)
but is easy to miss.

Fix: in `apps/web/src/v3/observe/components/draw/ObserveDrawHost.tsx`,
when any `observe.*` draw tool is active, force
`matrixToggles.observeAnnotations = true`. Idempotent — only flips when
off. The persist-first refactor's "I drew it, where did it go?" trap is
now closed.

### Verification

- `pnpm --filter "@ogden/web" typecheck` exit 0.
- Live: localStorage flipped → reload → 8 zones source-loaded with valid
  Polygon geometry + correct color paint property; once code-side
  auto-enable lands, engaging any draw tool will keep the overlay on.

### Files

- `apps/web/src/v3/observe/components/draw/ObserveDrawHost.tsx` — `useEffect`
  that flips `observeAnnotations` to true when an observe.* tool is active.

### Commit

`6f503cb` on `feat/atlas-permaculture`.

### Recommended next session

- Same as previous: fix `/plan` route crash (`PlanChecklistAside.tsx:148`
  missing `livestock` module guidance).
