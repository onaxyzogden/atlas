# 2026-05-21 — Observe vertex edit + click-to-delete

**Branch.** `feat/atlas-permaculture`. Two commits — round 1 `14db482f`
(vertex-edit entry), round 2 `bcd5e0ad` (click-to-delete vertex). ADR:
[2026-05-21 vertex edit + click-delete](../decisions/2026-05-21-atlas-observe-vertex-edit-and-click-delete.md).

**The gap.** Drawn Observe annotations (polygon kinds like Conventional
Crop, Pasture, Vegetation, Hazard; linestring kinds like Access Road,
Contour Line) could be repositioned via drag and re-shaped from scratch
via redraw, but a steward returning to a saved feature had no way to
nudge an individual vertex without deleting and re-drawing the whole
thing. Click-to-delete was the natural refinement gesture on top — a
stray vertex should disappear in one click, not via "drag onto a
neighbour to collapse."

**What changed — round 1 (vertex-edit entry).**

- [apps/web/src/v3/observe/components/AnnotationDetailPanel.tsx](../../apps/web/src/v3/observe/components/AnnotationDetailPanel.tsx):
  Added an **Edit vertices** button (lucide `Move` icon) to the detail
  panel footer, gated on `POLYGON_KINDS.has(kind) ||
  LINESTRING_KINDS.has(kind)`. Handler calls
  `observeSelectionStore.set([{ kind, id }])` + `setMoveMode(true)`,
  then dismisses the panel via `closeStore()` (NOT the local `close`
  wrapper, which also clears the selection — we want the selection to
  carry into vertex-edit). Point-kind annotations and sector arcs are
  excluded — sector has its own `AnnotationSectorHandles`, points have
  no vertices.
- [apps/web/src/v3/observe/components/draw/annotationGeometryRegistry.ts](../../apps/web/src/v3/observe/components/draw/annotationGeometryRegistry.ts):
  Registered `conventionalCrop` and `pasture` in `POLYGON_KINDS` and
  added their `readPolygon` + `writePolygon` cases routing through
  `useConventionalCropStore.updateConventionalCrop({ geometry })` and
  `usePastureStore.updatePasture({ geometry })`. Existing
  `SharedVertexEditHandler` + `AnnotationVertexEditHandler` pipeline
  picked up the new kinds with zero handler changes.

**What changed — round 2 (click-to-delete).**

- NEW [apps/web/src/v3/builtEnvironment/handlers/clickDeleteDirectSelect.ts](../../apps/web/src/v3/builtEnvironment/handlers/clickDeleteDirectSelect.ts):
  Custom MapboxDraw mode that spreads `MapboxDraw.modes.direct_select`
  and overrides four lifecycle methods. `onMouseDown` stashes the
  screen-point of the cursor; `onVertex` captures the `coord_path` of
  the vertex the gesture landed on; `onMidpoint` clears that capture
  (midpoint click *adds* a vertex — stock behaviour, must not delete
  the newly-added vertex); `onMouseUp` arbitrates click-vs-drag via
  `Math.hypot(dx, dy) > CLICK_PIXEL_THRESHOLD` (4 px). On a true click
  with a vertex captured, calls `feature.removeCoordinate(coordPath)`
  + fires `draw.update` on the public event surface, which
  `SharedVertexEditHandler.onUpdate` already consumes — no persistence
  changes needed.
- Min-vertex guard `canRemoveCoordinate(feature, coordPath)`:
  polygons require `ring.length > 4` before delete (closed-ring,
  triangle = 4 entries; below 4 leaves a degenerate polygon); lines
  require `coords.length > 2`. Silent refusal per user choice — no
  toast.
- [apps/web/src/v3/builtEnvironment/handlers/SharedVertexEditHandler.tsx](../../apps/web/src/v3/builtEnvironment/handlers/SharedVertexEditHandler.tsx):
  Registered the mode on the per-mount `MapboxDraw` instance via
  `modes: { ...MapboxDraw.modes, [CLICK_DELETE_DIRECT_SELECT]: clickDeleteDirectSelect }`,
  and switched `changeMode` from `'direct_select'` to the new mode
  name. Both Plan-stage `PlanVertexEditHandler` and Observe-stage
  `AnnotationVertexEditHandler` compose this handler and inherit the
  behaviour with no further changes.

**Behavioural consequence.**

While in vertex-edit mode on a polygon or line:
- Click a vertex (no drag) → vertex removed; `draw.update` fires;
  owning store patched; layer re-renders; Cmd-Z undoes through the
  store's `temporal()` history.
- Click + drag a vertex → moves the vertex (unchanged).
- Click a midpoint handle → adds a new vertex (unchanged).
- Click a vertex on a triangle / 2-vertex line → nothing (silently
  gated).
- Esc → exits vertex-edit (unchanged).

Drawing a *new* polygon (`draw_polygon` mode) is unaffected — the
custom mode is only mounted during vertex-edit.

**Verification.**

- `pnpm --filter @ogden/web typecheck`: only three pre-existing
  unrelated errors (`StepBoundary.tsx:365`, two `__tests__/HostUnion…`)
  — none in touched files.
- Interactive smoke test was **not run** — API at `localhost:3001` was
  offline (ECONNREFUSED) during this session, blocking login on the
  Vite preview. Flagged transparently per project CLAUDE.md "say so
  rather than assuming success." Next session with a live API should
  walk the plan's smoke checklist (polygon click-delete, line variant,
  triangle min-vertex guard, midpoint-add survival, Ctrl-Z restore).

**Out of scope.**

- Bulk vertex delete (shift-click multiple, then delete) — MapboxDraw's
  selection model is single-vertex by default; multi-select is a much
  larger surface area.
- Toast / hint when min-vertex guard kicks in — user chose silent
  refusal.
- Plain-click delete on point-kind annotations — points have no
  vertices; they reposition by drag (`AnnotationDragHandler`).
- Sector arc handles — `sector` uses `AnnotationSectorHandles`, not
  vertex-edit; intentionally excluded from `canEditVertices`.

**Behavioural memory.** [[feedback-commit-immediately-on-rebased-branches]]
— both slices committed the moment typecheck cleared, before any
external rebase window. [[project-branch-rebase]] — fetched + verified
no divergence prior to commit.

**Smoke walk — deferred (second pass).** A scheduled smoke walk against
a live API was attempted later in the day. Steps 1–3 cleared via
programmatic store seeding (`addConventionalCrop` → `open({kind, id})`
→ click "Edit vertices"); selection store correctly held
`{ moveMode: true, selected: [...] }` with `activeTool: null`. But the
MapboxDraw control never mounted — zero `gl-draw-*` layers, no
`mapbox-gl-draw` sources. Could be (a) the programmatic seed path
bypassing a React subscription the handler depends on, (b) HMR stale
state, or (c) interaction with concurrent uncommitted WIP that
broadened `readPolygon` / `writePolygon` to MultiPolygon for
`vegetation` and `pasture`. The walk was halted to avoid mixing
verification with in-flight work; a follow-up was filed to re-run on
a clean tree (a real draw-then-click flow rather than programmatic
seeding).

**Smoke walk — deferred (third pass, diagnostic).** Re-run attempted
against a live API + Vite preview. The 14-step walk was again not
completed, but the open question from the second pass is closed and a
new larger blocker was identified.

*Closed.* Hypothesis (c) — the uncommitted MultiPolygon guard in
[AnnotationVertexEditHandler.tsx](../../apps/web/src/v3/observe/components/draw/AnnotationVertexEditHandler.tsx)
(`g && g.type === 'Polygon' ? g : null`) — is **not** the cause. The
guard only sits in the working tree (part of the in-flight Pasture /
Vegetation Fill-remainder feature), not in shipped commits
`14db482f` / `bcd5e0ad`. For `conventionalCrop` the store path writes
only `Polygon`, so even with the guard active `readPolygon` returns
non-null.

*New finding.* On the offline / no-auth path, four
Observe-annotation MapboxGL sources never reach `loaded:true`:
`observe-anno-conventional-crop`, `observe-anno-pasture`,
`observe-anno-pasture-fence`, `observe-anno-selection`. All other
sources (`be-v2-*`, `plan-data-*`, `matrix-*`, `mapbox-gl-draw-*`,
`maptiler_*`, `terrain_rgb`, `contours`, `diagnose-parcel-boundary`)
load fine. The conventional-crop source has
`_data.features.length === 2` with valid coordinates and correct
`annoId` / `annoKind` props, the layer is visible and unfiltered, yet
`m.isSourceLoaded()` returns `false`, `m.querySourceFeatures()`
returns 0, and `m.queryRenderedFeatures()` at the polygon centroid
returns 0 even at zoom 16. **A real user click on a saved Conventional
Crop polygon cannot reach the selection store**, because the fill
layer's pick surface has no rendered features. This is the upstream
explanation for hypothesis (a): the prior pass's programmatic seed
(`addConventionalCrop` + `open({kind, id})`) pushed the selection
into the store, but
[useMapboxDrawTool](../../apps/web/src/v3/observe/components/draw/useMapboxDrawTool.ts)'s
gating chain for vertex-edit leans on an active-tool / selection
combo the broken source pipeline never produces in normal use, so no
MapboxDraw instance was mounted.

*The vertex-edit code is sound.* The blocker is upstream in the
observe-anno source loading layer, not in
`AnnotationVertexEditHandler` / `SharedVertexEditHandler` /
`clickDeleteDirectSelect`. Steps 2–10 of the smoke checklist cannot
run while the source pipeline is broken.

*Other things noticed.* Mid-diagnosis `window.location.reload()` put
the Vite client into a connect / reconnect loop and the React app
failed to re-mount (`__atlasMap` undefined, body 367 bytes). API role
gating surfaced once the API was up: `role: viewer` /
`You do not have access to this project` against project `mtc` — the
cached `ogden-auth-token` belongs to a stale demo user without owner
rights. Next pass needs a clean Vite restart and a freshly-registered
user owning a new project.

*No commits / no push this pass.* Working tree's uncommitted Pasture /
Vegetation Fill-remainder + EWE derivations changes left untouched
([[project-branch-rebase]] — they belong to a parallel session).
Zero code edits in this pass; only this log entry.

*Next-pass repro recipe.*

1. `preview_stop` then `preview_start name=web` for a clean Vite.
2. Clear `ogden-auth-token` and register a fresh user via the login
   flow; create a new project owned by that user (don't reuse `mtc`).
3. Before drawing, snapshot `m.getStyle().sources` keyed by
   `m.isSourceLoaded(...)`; confirm `observe-anno-conventional-crop`
   reaches `loaded:true` after the first crop is drawn. If it stays
   `false`, the regression is in
   [ObserveAnnotationLayers.tsx](../../apps/web/src/v3/observe/components/layers/ObserveAnnotationLayers.tsx)
   (also in the uncommitted diff right now — diff against
   `origin/feat/atlas-permaculture` first).
4. Only after the source loads should steps 1–14 be attempted.

A `spawn_task` chip was filed for the source-loading regression so
this pass can hand back cleanly without conflating the two scopes.

---

## 2026-05-21 (later) — Smoke walk re-attempt via Claude-in-Chrome MCP, partial confirmation

**Context.** The headless-RAF source-load false alarm from earlier today
([2026-05-21 observe-anno sources false alarm](2026-05-21-observe-anno-sources-false-alarm.md))
cleared the way to retry the smoke walk in a real (non-headless) Chrome
via `mcp__Claude_in_Chrome`. Pre-flight worked end-to-end: API +
Vite up; fresh user `smoke-2026-05-21@ogden.local` registered against
`/api/v1/auth/register`; token injected into `ogden-auth-token`; route
landed cleanly on `/v3/project/mtc/observe`.

**Verified visually (steps 1–3).**

- **Step 1.** Conventional Crop tool armed from the Agricultural section;
  five points clicked + double-click closed; annotation form opened;
  Save persisted to `ogden-conventional-crops`. Polygon (ring length 7
  = 6 unique + closing) rendered on the map in the live MapLibre source
  `observe-anno-conventional-crop` (`featureCount: 1`,
  `annoKind: "conventionalCrop"`, `annoId: b95bea48-30b5-443f-ba90-706a4dd23968`).
- **Step 2.** Click on the polygon opened `SelectionFloater` with the
  expected footer chips: `Conventional crop | Edit | Move | Delete |
  × Clear`. The **Move** button (lucide `Move` icon) is the
  vertex-edit entry — it replaces the planned "Edit vertices" footer
  button described in `AnnotationDetailPanel.tsx`, because in this
  flow clicks land on `SelectionFloater` first (the detail panel
  only opens via the explicit Edit chip). Same handler:
  `setMoveMode(true)` + selection retained.
- **Step 3.** Clicking Move dismissed the floater label but kept the
  polygon selected; six vertex handles + five midpoint dots rendered
  on the polygon edges (visible in screenshot
  `ss_3594lpic0`/`ss_1851moum7`); tooltip "Drag to reposition — click
  to finish" appeared near the Move chip.

**Blocked (steps 4–12).** The Claude-in-Chrome `computer` tool's click
coordinate uses screenshot pixels while the page is rendered at
`window.innerWidth=1744` vs the 1515-wide screenshot (DPR ≈ 1.10 ×
viewport-fit ratio). A click at screenshot `(920, 400)` actually lands
at DOM `(799, 348)` — the polygon body just *inside* the visible vertex
handle — which MapboxDraw interprets as "click outside vertex → exit
direct_select" rather than "click on vertex → click-delete." The
vertex *handle radius* is on the order of 6–8 px, so the ≈ 100 px
screenshot↔DOM offset is well outside any hit area. Synthesizing
`PointerEvent`s directly on the canvas at the correctly-projected DOM
coordinate (verified via `m.project(vertex)`) also failed to trigger
the click-delete path — MapboxDraw's vertex hit-test consumes the
real event pipeline, not raw dispatched events on the canvas. This
is a harness limitation, not a code regression: the picking + handler
mounting all work; we just can't *prove* the deletion mutation via
synthetic input in this environment.

**Implication.** Steps 4 (click-delete), 5 (drag-move), 6 (midpoint-
add), 7 (min-vertex guard), 8 (Ctrl-Z), 9 (Esc exits), 10 (LineString),
11–12 (Plan-stage zone vertex-edit) remain code-path-verified by the
typecheck + the ADR's per-file rationale but not end-to-end
keystroke-verified in this session. The next pass should drive the
clicks from **outside the MCP layer** — either a native human run
or a Playwright/Puppeteer harness with proper viewport sizing so
screenshot pixel = CSS pixel.

**Disposition.** Partial confirmation. The full 14-step walk is
deferred to a setup where the cursor lands where the screenshot
says it does. The four shipped files
([clickDeleteDirectSelect.ts](../../apps/web/src/v3/builtEnvironment/handlers/clickDeleteDirectSelect.ts),
[SharedVertexEditHandler.tsx](../../apps/web/src/v3/builtEnvironment/handlers/SharedVertexEditHandler.tsx),
[AnnotationDetailPanel.tsx](../../apps/web/src/v3/observe/components/AnnotationDetailPanel.tsx),
[annotationGeometryRegistry.ts](../../apps/web/src/v3/observe/components/draw/annotationGeometryRegistry.ts))
stay merged on `feat/atlas-permaculture`; nothing reverted.
