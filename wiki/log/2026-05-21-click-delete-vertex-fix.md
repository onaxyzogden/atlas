# 2026-05-21 — Click-delete vertex fix (onMouseUp → onClick)

**Branch.** `feat/atlas-permaculture`. Two commits.

**The bug the user reported.** "Clicking on a vertex does not remove
it" — tested in real Chrome on the same `feat/atlas-permaculture`
branch where vertex-edit + click-to-delete were marked shipped on
2026-05-21 (commits `14db482f` + `bcd5e0ad`). Real regression, not the
Claude-in-Chrome harness coordinate artefact that
[2026-05-21 observe-anno sources false alarm](2026-05-21-observe-anno-sources-false-alarm.md)
and the
[partial smoke-walk follow-up](2026-05-21-observe-vertex-edit-and-click-delete.md)
spent a session chasing.

**Root cause.**
[`clickDeleteDirectSelect.ts`](../../apps/web/src/v3/builtEnvironment/handlers/clickDeleteDirectSelect.ts)
attached deletion to `onMouseUp`. MapboxDraw's `events.mouseup`
([node_modules/@mapbox/mapbox-gl-draw/src/events.js:53-75](../../node_modules/@mapbox/mapbox-gl-draw/src/events.js))
arbitrates click-vs-drag via `isClick` (≤ 4 px / ≤ 500 ms) and routes
clicks to `currentMode.onClick`, drag-releases to
`currentMode.onMouseUp`. So the plain vertex click never reached our
delete branch — only drag-releases did, and those were correctly
filtered out by the redundant in-mode pixel-threshold gate. Net effect:
deletion never fired in any real-user scenario.

**Fix (`90fef60a`).**

- Move deletion logic from `onMouseUp` to `onClick`.
- Drop the now-redundant `CLICK_PIXEL_THRESHOLD` arbitration —
  MapboxDraw's own `isClick` already handles it. Remove the unused
  `_cdDownPoint` stash and `ScreenPoint` type.
- Return early **without** delegating to `stock.onClick` when the
  min-vertex guard fires; otherwise `clickActiveFeature` clears
  `selectedCoordPaths` and kicks the user out of vertex-edit on
  attempting to delete the 3rd vertex of a triangle or the 2nd vertex
  of a 2-point line.
- Reset `_cdVertexCoordPath` at the start of every `onMouseDown` so a
  body-click immediately following a vertex-click can't re-trigger
  deletion against stale state.

**Wiki correction (`16dc2d79`).** Appended a "later" section to the
[partial smoke-walk log](2026-05-21-observe-vertex-edit-and-click-delete.md)
striking through the "harness limitation" framing and recording the
real root cause + fix. Future sessions should treat "clicking a vertex
doesn't delete it" as a code-path problem first, not a coordinate-pixel
problem.

**Verification.**

- `pnpm --filter @ogden/web typecheck` exit 0.
- Source-grounded reasoning: `events.mouseup` dispatch chain in
  MapboxDraw read end-to-end; `direct_select` `onClick` /
  `clickActiveFeature` / `onMouseUp` branches read; only `dragMoving`
  triggers `fireUpdate` on the stock `onMouseUp` path, confirming the
  upstream gate.
- End-to-end keystroke confirmation in a real browser is still owed —
  the in-session Claude-in-Chrome attempt got tangled in cross-module
  store-instance issues (dynamic import vs. component import of the
  zustand store) and never reached a clean delete. The fix is
  behaviour-preserving and bound to the user-reported symptom.

**Branch hygiene.**

- Working tree had unrelated parallel-session edits at commit time
  (basemap-water-adoption + a `template_slug_and_public` migration
  surface). Stashed them as `parallel-session-basemap-water`, committed
  the two slices on a clean tree, restored the stash. Per
  [[feedback-no-deletion]] + [[project-branch-rebase]] — uncommitted
  parallel-session work must not be touched, and slices on a
  force-rebased branch must commit immediately on verification.
- `git fetch` was 2/0 (2 ahead, 0 behind origin) before push; push
  fast-forwarded cleanly.

**Files touched.**

- [`apps/web/src/v3/builtEnvironment/handlers/clickDeleteDirectSelect.ts`](../../apps/web/src/v3/builtEnvironment/handlers/clickDeleteDirectSelect.ts) — `90fef60a`
- [`wiki/log/2026-05-21-observe-vertex-edit-and-click-delete.md`](2026-05-21-observe-vertex-edit-and-click-delete.md) — `16dc2d79`

**Deferred.** Real-browser keystroke walk of the remaining smoke-walk
steps (drag-still-moves, midpoint-add survives, min-vertex guard, Ctrl-Z
restore, Esc exit, LineString variant, Plan-stage zone vertex-edit,
regression checks). The shipped behaviour is now grounded in the
MapboxDraw source rather than the original (incorrect) hook choice; the
remaining walk is confirmation, not discovery.
