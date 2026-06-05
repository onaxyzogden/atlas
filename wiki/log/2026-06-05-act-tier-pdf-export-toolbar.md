# 2026-06-05 — Floating PDF-export toolbar restored on the Act tier-shell map

**Closed.** Operator: "restore the floating toolbar with the button to download
pdf version of map view." Clarified via AskUserQuestion to: surface = the **Act
tier-shell map**; form = the **full 4-sheet picker, verbatim**.

The only such control that ever existed is the Plan stage's
`MapSheetExportControl` — a floating "Export sheet" pill that captures the live
MapLibre canvas and POSTs one of four captured-map PDF exports (Master Plan /
Base Map / Zone Map / Planting Plan). Its standalone floating form was unmounted
(folded into the Plan `DesignToolRail`), and the Act map never had it.

The Act tier-shell map is rendered by `DiagnoseMap` (`ActTierShell.tsx`), whose
render-prop exposes a live `map` and which already sets
`preserveDrawingBuffer: true` (DiagnoseMap.tsx) — exactly what `captureMapImage`
needs. Same `api.exports.generate` client as Plan. So no map-config or API
change was required: a mount plus one small positioning affordance.

Changes (one explicit-path commit `a5c7da3f`, `feat/atlas-permaculture`, **not
pushed**):

- **EDIT `apps/web/src/v3/plan/MapSheetExportControl.tsx`** — add optional
  `anchor` prop (`"top-left" | "top-right"`, default `"top-left"`). The outer
  floating container swaps its horizontal offset + `alignItems` on the anchor:
  `top-left` -> `{ left: 12, alignItems: "flex-start" }` (current Plan
  behavior, preserved by the default); `top-right` -> `{ right: 12, alignItems:
  "flex-end" }`. ~5 additive lines; no logic change.
- **EDIT `apps/web/src/v3/act/tier-shell/ActTierShell.tsx`** — import
  `MapSheetExportControl` and mount it as a sibling of `MapToolbar` inside the
  `DiagnoseMap` `{({ map }) => ...}` closure:
  `<MapSheetExportControl map={map} projectId={id} anchor="top-right" />`.
  Anchored top-right to clear the top-left `BaseMapCard` (bottom-left holds
  `MapToolbar`, bottom-right the `SectorCompass` overlay). `projectId={id}` uses
  the resolved route id (with the `'mtc'` fallback) since the prop is
  non-nullable `string`.

No change to `DiagnoseMap`, `captureMapImage`, `useMapSheetExport`, `MapToolbar`,
the payload builders, or any Plan mount. The control owns its own async state
(open / generating / download), matching the verbatim-picker choice.

**Verification:** `tsc --noEmit` — both my files produce **0** errors (only
untracked foreign-WIP files error; left untouched). Bounded vitest
(`--pool=forks --testTimeout=20000`) `MapSheetExportControl` payload-builder
suite **10/10** green. Preview DOM proof on
`/v3/project/mtc/act/tier-shell/stratum/s3-systems-reading`:

- the "Export sheet" pill renders **top-right** of the map canvas
  (pillRect left:826/right:941; `BaseMapCard` at left:294-554 — **no overlap**);
- clicking it opens a `role="menu"` popover listing all four items:
  `["Master Plan", "Base Map", "Zone Map", "Planting Plan"]`;
- choosing "Base Map" fires the full capture->POST round-trip; with both web
  (5200) and api (3001) up, the backend returned the inline error
  **`invalid input syntax for type uuid: "mtc"`**.

**Known limitation (NOT a regression).** The `mtc` demo project (Moontrance
Creek) is **seed-only** — it has no `serverId` in `ogden-projects` localStorage
(every other project carries both a UUID `id` and a `serverId`). The
`/api/v1/projects/{projectId}/exports` endpoint requires a real server project
UUID, so generate rejects the `mtc` slug. The Plan `MapSheetExportControl` would
fail identically on `mtc`; this is a pre-existing backend/demo-data constraint,
not introduced by the mount. The UI restore itself is fully DOM-proven.

`preview_screenshot` hangs on the WebGL map, [[project-screenshot-hang]].
Foreign WIP and prior uncommitted wiki edits left untouched.

Entity: [[entities/act-tier-shell]] (new "Floating PDF-export toolbar restored"
section).
