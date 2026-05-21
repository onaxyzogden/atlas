# 2026-05-22 — Adopt-water tool smoke walk (steward task)

**Branch.** `feat/atlas-permaculture`. Follow-up to the adopt-water
slice (commits `d1a5ae15` + `806a4816`). Captures the in-browser
end-to-end the Claude Preview MCP could not run (hangs on WebGL maps).

**Tool.** [`AdoptBasemapWaterTool.tsx`](../../apps/web/src/v3/observe/components/draw/AdoptBasemapWaterTool.tsx).

## Smoke-walk steps

Run at `/v3/project/<id>/observe` in a real browser. Tick each step
pass/fail and capture surprises in the section below.

1. [ ] Basemap set to **Topographic** (or Terrain / Hybrid / Street — anything with OpenMapTiles `water` + `waterway` source-layers).
2. [ ] "From map" section in the Observe rail shows two buttons: **Adopt from map** (building) + **Adopt water** (Waves icon).
3. [ ] Click **Adopt water** → popover reads "Adopt water from map" with the hint copy. Cursor arms.
4. [ ] **Stream test.** Click a visible basemap stream/river line.
   - Tool one-shots (popover dismisses).
   - Inline form opens with `kind: 'watercourse'`, kind dropdown defaults to `stream` (or `ditch` for canal/drain/ditch tiles), `perennial: true`.
   - `water` matrix toggle flipped on if it was off.
   - Saved Watercourse renders in the OBSERVE blue stroke.
   - Cancel discards (`discardOnCancel: true`).
5. [ ] **Lake test.** Re-arm. Click the centre of a visible basemap lake polygon.
   - Form opens with `kind: 'waterbody'`, kind dropdown defaults to `lake` (or whichever class OMT exposes for that feature).
   - Save with a name.
   - Polygon renders as `#5b8aa8 @ 0.45` fill over the basemap polygon.
6. [ ] **Dedup test (polygon).** Re-arm. Click the same lake again.
   - Toast "Already adopted — opened the existing entry for editing".
   - Form opens in edit mode for the existing Waterbody.
7. [ ] **Dedup test (line).** Re-arm. Click an already-adopted stream segment. Same toast + edit-form behaviour.
8. [ ] **Polygon-vs-line priority.** Click a stream that crosses a pond/lake — polygon wins (Waterbody form, not Watercourse).
9. [ ] **No-water-layer fallback.** Switch basemap to Satellite. Re-arm Adopt water. Click anywhere → toast "No water layer in this basemap. Switch to Topographic, Terrain, Street, or Hybrid and try again."
10. [ ] **Persistence check.** Hard-refresh. Both adopted records survive.

## What was verified

_Steward to fill in after the walk._

## What surprised me

_Anything unexpected — odd kind inference (e.g. OMT exposing `pond`
where you saw a lake), UX rough edges, layer-stacking, dedup edge
cases. If everything passed cleanly: "Nothing unexpected."_

## Followups

_File each as its own slice; nothing fixed in-line._
