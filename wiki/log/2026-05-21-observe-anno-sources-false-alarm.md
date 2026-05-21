# 2026-05-21 — Observe-anno "stuck source" diagnosis closed as headless-RAF artefact

**Branch.** `feat/atlas-permaculture`. **No code change.** Wiki-only
documentation so a future session doesn't chase the same ghost.

**The premise filed for investigation.** Four MapLibre sources in the
Observe stage —
`observe-anno-conventional-crop`, `observe-anno-pasture`,
`observe-anno-pasture-fence`, `observe-anno-selection` — were reported
to never reach `loaded: true` despite valid feature data, with the
chain of consequence being that drawn Observe annotations were
invisible to map picking and the click → detail-panel smoke walk
in [2026-05-21 vertex edit + click-to-delete](2026-05-21-observe-vertex-edit-and-click-delete.md)
could not proceed.

**What the live probe actually shows.**

Under Claude Preview at `/v3/project/mtc/observe` with two seeded
Conventional Crop polygons:

| source | paused | used | loaded | tiles |
|---|---|---|---|---|
| `observe-anno-conventional-crop` | false | true | true | 2 |
| `observe-anno-pasture` | false | true | true | 2 |
| `observe-anno-pasture-fence` | false | true | true | 2 |
| `observe-anno-selection` | false | false | true | 0 (no selection — correct) |

```
m.isSourceLoaded('observe-anno-conventional-crop') === true   ✅
queryRenderedFeatures over the crop → 1 hit, props
  { annoId: 'cc-1', annoKind: 'conventionalCrop', kind: 'annual-row', ... }   ✅
```

…after exactly one `_render()` tick. No code change required to
get there.

**Why a prior session thought the loop was dead.** That session
probed `m._frame` to check whether the paint loop was alive and saw
it `null` even after `triggerRepaint()`. The MapLibre 5.x build
this repo uses renamed that field to **`_frameRequest`** and now
schedules frames via `AbortController` + `browser.frameAsync` (see
`node_modules/maplibre-gl/dist/maplibre-gl-dev.js:57944`), so
`_frame` was always undefined and the "render loop is dead"
conclusion was a property-name miss. Re-probing the correct field
shows `_frameRequest` is non-null — a frame IS queued. It just
never resolves while the Claude Preview tab is backgrounded,
because headless Chrome throttles `requestAnimationFrame` for
inactive tabs. In a real user's browser the first paint after
mount fires immediately and the `_updatedSources` queue drains in
that same tick.

**ALL geojson sources show the same idle-paused profile** in the
preview, not just the named four: `be-v2-*`, `matrix-*-dem`,
`design-el-extrusion`, `diagnose-parcel-boundary`. The "siblings
load normally" framing in the original brief was an artefact of
when those siblings happened to be probed (post-interaction) vs.
when the four were probed (cold mount, pre-interaction). The four
are not uniquely broken.

**Diagnostic technique worth keeping.** When debugging
"isSourceLoaded never true" under Claude Preview, the source state
at idle is unreliable. Force a paint by calling
`m._render(performance.now())` once from the eval console — this
drains `_updatedSources`, resumes paused SourceCaches, and lets
tile generation complete synchronously enough for the next probe
to read a real "loaded" state. If sources still don't load after
that, the bug is real.

**Implication for the [vertex-edit + click-delete smoke walk](2026-05-21-observe-vertex-edit-and-click-delete.md).**
The "clicks don't open detail panels" symptom — if reproducible in
a real browser — is not caused by stuck sources. Likelier
candidates to investigate next:

- `SelectionFloater` / `PlanSelectionFloater` consuming the click
  before the layer handler fires.
- The 50 ms `consumedAt` deduper in `ObserveAnnotationLayers.tsx`
  mis-rejecting a legitimate empty-map → layer-click sequence.
- `useAnnotationFormStore` already showing the same record
  (early-return at the `existingId === id && kind === kind`
  guard).

These are the next things to sample if the smoke walk fails on a
real-browser re-run.

**Verification artefacts.**

- `m.isSourceLoaded('observe-anno-conventional-crop') === true`
  under live preview after one `_render()` tick (the acceptance
  criterion from the original brief).
- `queryRenderedFeatures` returns the seeded crop with the correct
  `annoKind` / `annoId` props for the layer click handler to fire
  on.
- No source files modified; preview server's working tree clean
  except for unrelated parallel-session work (showcase + evidence-
  audit branches) intentionally not touched per
  [[feedback-no-deletion]] + the "don't touch parallel-session
  edits" branch hygiene rule.

**Disposition.** Closed as not-a-bug. Future sessions should
re-test the smoke walk in a real browser before re-opening this
thread — the four-sources-stuck premise is not actionable.
