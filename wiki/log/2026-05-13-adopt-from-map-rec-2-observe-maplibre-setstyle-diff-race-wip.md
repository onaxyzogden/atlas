# 2026-05-13 — Adopt-from-map Rec #2 (Observe): MapLibre setStyle diff race wiped observe-anno sources


**Correction.** The 2026-05-13 entry above (Rec #1, matrix-toggle flip)
got Save → matrix toggle → 2D fill *partly* right but missed a separate,
more brutal failure mode: on the affected client (Chrome, real
localStorage state), the observe-annotation sources for the adopted
building were being added by
[`ObserveAnnotationLayers`](apps/web/src/v3/observe/components/layers/ObserveAnnotationLayers.tsx)
and then **silently removed within ~1 s by MapLibre's `setStyle` diff
path**. The 2D fill never had a chance to render. The toggle flip was
necessary but not sufficient. The original "still not working — saved,
no sign anything was done" report was reproducing this second bug,
not the first.

**Root cause.**
[`DiagnoseMap`](apps/web/src/v3/components/DiagnoseMap.tsx) constructs
the MapLibre instance with `style: MAP_STYLES[initialBasemapRef.current]`,
then a sibling `useEffect` on `[map, basemap]` calls
`map.setStyle(MAP_STYLES[basemap])` once `map` becomes non-null. On
first mount those two values are identical — the rehydrated basemap.
The `setStyle` call is therefore a no-op from the steward's point of
view, but MapLibre's default `setStyle(target, {diff: true})` doesn't
treat it as a no-op:

1. `setStyle` begins fetching the (same) target style JSON.
2. While the fetch is in flight, sibling effects in
   `ObserveAnnotationLayers`, `DesignElementExtrusionLayer`,
   `BeV2GenericLayer`, etc. run and `addSource`/`addLayer` their
   `observe-anno-*` / `be-*` sources.
3. Target JSON arrives. MapLibre computes the diff between the
   current style (now carrying our app-added sources) and the target
   JSON (which doesn't know about them).
4. `t.Map._updateDiff` → `style.setState` → `style.removeSource` is
   called for every app-added source. **Crucially**, this path
   bypasses `map.removeSource` — no public listener fires, no
   `style.load` re-hook surfaces, and instrumented `setStyle`/
   `removeSource` traps don't observe it. Sources vanish silently.

This was confirmed in Chrome with progressive prototype-level traps:
neither `map.setStyle` nor `map.removeSource` fired between source-add
and source-disappearance — but a trap planted directly on the internal
`style.setState`/`style.removeSource` caught the diff path tearing
down all four `observe-anno-*` sources from the `_updateDiff` call.
Stack: `t.Map._updateDiff → de.setState → style.removeSource(observe-anno-*)`.

**Fix.** Added an `appliedBasemapRef` to
[`DiagnoseMap`](apps/web/src/v3/components/DiagnoseMap.tsx), initialised
to the same value used to construct the map. The basemap-swap effect
now early-returns when `appliedBasemapRef.current === basemap`, and
updates the ref *before* calling `setStyle` on a real change. The
no-op `setStyle` on first mount is eliminated; legitimate basemap
swaps still go through the diff path (and the existing `style.load`
re-hook in `ObserveAnnotationLayers` re-adds sources cleanly because
in that case the diff is correct — sources weren't added pre-emptively).

**Verified.**
- `tsc --noEmit` clean (8 GB heap — pre-existing OOM workaround).
- `vite build` clean (38.90 s).
- Chrome reproduction at `/v3/project/eadb3223-.../observe`:
  pre-fix `Object.keys(getStyle().sources).filter(s=>s.startsWith('observe-anno'))`
  returned `[]` 8 s after navigation; post-fix returns
  `['observe-anno-human-points','observe-anno-human-zones',
  'observe-anno-be-buildings','observe-anno-selection']` with the
  `be-buildings-fill` + `be-buildings-line` layers visible and a
  20-feature FeatureCollection on the source. The adopted building
  the steward had saved earlier in the day is now visible.

**Lesson.** When a "redundant" effect fires `setStyle(currentStyle)`,
remember the MapLibre default is `diff: true` and the diff is
computed against *current* state, not against the spec we last
asked for. That means any app-added source/layer that lands between
the `setStyle` call and its async resolution is in the diff's
"remove" set — silently. Same-value `setStyle` is not a no-op.
The internal mutation path (`Style._updateDiff` → `style.setState`
→ `style.removeSource`) doesn't surface via public `removeSource`
either, so naïve `map.removeSource` traps will not catch the wipe.
Either gate against same-value calls (this fix), pass
`{diff: false}` and re-add on `style.load`, or defer all app
source-adds until after the basemap has fully settled. We chose the
gate — minimal change, no impact on legitimate basemap swaps.

**Net diff.**
- [`DiagnoseMap.tsx`](apps/web/src/v3/components/DiagnoseMap.tsx):
  +12 lines (`appliedBasemapRef`, gate, rationale comment).
- No other production-code changes; all diagnostic instrumentation
  added during the hunt was reverted.

**Deferred.**
- The same race could in theory bite *legitimate* basemap swaps if a
  sibling `useEffect` adds sources between the `setStyle` call and
  the `style.load` event. Today's `ObserveAnnotationLayers` apply
  bails on empty `style.layers` and re-runs on `style.load`, so
  it's robust — but every new layer mounted under `DiagnoseMap`
  inherits the same contract and could trip the diff if it doesn't
  follow the same pattern. Worth a follow-up: extract a shared
  "wait-for-style-then-apply" helper in the BE layer index.
