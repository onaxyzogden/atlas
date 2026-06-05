# 2026-05-20 — B5.2.x.c follow-up: map-entry wire-up (left-click CropArea → CoverCropPopoverEditor)

**Branch.** `feat/atlas-permaculture`. Closes the explicit
deferred sub-item from
[[2026-05-20-b5-2-x-c-cover-crop-spine-completion]] —
the map-side click-handler binding the cover-crop popover store had
been parked while C6 shipped the popover shell + store
programmatically callable.

**Surface.** `PlanCropAreaSelectionHandler` (new, ~90 LOC) — props
`{ map, projectId }`, `useEffect` registers `mousedown`, returns
`null`. Mirrors `PlanObserveSelectionHandler` (mousedown + live-layer
query via `map.getStyle().layers` filtered by `crop-fill-` prefix +
`map.queryRenderedFeatures(e.point, { layers })` +
`e.preventDefault()` + `e.originalEvent.stopPropagation()`). Resolves
`cropAreaId` from `properties.id` → `properties.cropAreaId` → strip
`crop-fill-` prefix off `top.layer.id`. The MapCanvas/CropPanel
`crop-fill-*` features stamp only `{ name }` today, so the layer-id
strip is the live path. Dispatches via
`useCoverCropPopoverStore.getState().openFor({ projectId, cropAreaId,
anchor: { x: e.point.x, y: e.point.y } })`. Screen-space anchor
because the popover ships hand-rolled fixed positioning, not
map-coordinate.

**Mount.** `apps/web/src/v3/plan/PlanLayout.tsx` — append-only.
`<PlanCropAreaSelectionHandler map={map} projectId={id} />` adjacent
to the existing `<PlanObserveSelectionHandler map={map} />` (line
205). `<CoverCropPopoverEditor />` adjacent to
`<InlineFeaturePopover map={map} />` (line 232). No existing JSX
node touched.

**Fork resolved.** Per-feature-type store routing (Fork B) chosen
over generalizing `useInlineFormStore` (Fork A). The field-spec API
(`text|number|select|textarea|disclosure`) can't host the
MonthBandPicker editor; generalizing it would ripple through 23
active map tools under `apps/web/src/v3/plan/draw/tools/`. Left-click
→ direct popover (vs. right-click context-menu or select-then-chip)
— matches the Observe precedent and is the smallest surface.

**Posture.** Strictly-additive. No new store (C6 already shipped
`useCoverCropPopoverStore`), no schema bump, no `inlineFormStore`
change, no impact on the other 23 map tools. Single-writer preserved:
Save still funnels through `updateCropArea` +
`pushCoverCropPlanToSpine`.

**Tests** — `PlanCropAreaSelectionHandler.test.tsx` (~130 LOC, RTL +
fake-Map shim). Four cases:
(a) happy path on `crop-fill-ca1` with `{ properties: { id: 'ca1' } }`
opens popover with `{ projectId: 'p1', cropAreaId: 'ca1', anchor:
{ x: 42, y: 84 } }`;
(b) fallback — `properties.id` missing → `cropAreaId` parsed from
layer-id (`crop-fill-ca-xyz` → `ca-xyz`);
(c) no-op when no `crop-fill-*` layer is live (only `paddock-fill-*`);
(d) no-op when `projectId` is null.
Fake `Map` exposes `on/off/getStyle/queryRenderedFeatures` only —
the four primitives the handler touches.

**Gate.** Targeted vitest **7/7** (4 new + 3 existing
CoverCropPopoverEditor). Full apps/web vitest **1536/1536** (150
files). `apps/web` tsc exit 0; `packages/shared` tsc exit 0.
Covenant grep
(`/\b(riba|gharar|csra|salam|investor|financing|cost-of-capital|yield|payback|investment|roi|return\s+on)\b/i`)
on the two new files — no matches. Preview server already running on
:5200 — only pre-existing ECONNREFUSED API noise; no new build/HMR
errors. MapLibre canvas-click hang disclosure: not exercised under
harness; vitest + tsc authoritative.

ADR addendum: [[decisions/2026-05-20-atlas-b5-2-x-c-cover-crop-spine-completion]]
(§"Addendum — Map-entry wire-up closed"). Continues
[[2026-05-20-b5-2-x-c-cover-crop-spine-completion]].
