# features/shared/placedFeatures

Right-rail card listing every feature the steward has placed on the map
for the active project + stage.

## Files

- `PlacedFeaturesCard.tsx` — collapsible card; rollup tally + grouped list
  with focus/delete row actions.
- `usePlacedFeatures.ts` — selector hook unifying `builtEnvironmentStoreV2`,
  `landDesignStore`, and `zoneStore` into a single `PlacedFeatureRow[]`,
  scoped to the stage (`'observe'` / `'plan'`). Exports pure helpers
  (`centroidOf`, `rollupRows`) for testing.
- `usePlacedFeatures.test.ts` — vitest coverage for the helpers + the
  hook's stage scoping and project filtering.
- `PlacedFeaturesCard.module.css` — local styles; matches the rail palette
  via `--color-surface` / `--color-border` / `--color-text`.

## Stage scoping

| Stage     | Sources surfaced                                            |
|-----------|-------------------------------------------------------------|
| `observe` | built-environment (`state==='existing'`) + zones            |
| `plan`    | built-environment (`state==='proposed'`) + design + zones   |

Auto-design draft elements (`DesignElement.draft === true`) are hidden —
they are reviewed via the `DraftReviewBar`, not the steady-state inventory.

## Map focus

Row "Focus" calls `useMapFocusStore.focus({ projectId, center, zoom: 17 })`.
`DesignMap` / `DiagnoseMap` already consume `mapFocusStore.request` and
fire `flyTo` when the request's `projectId` matches and the map is
mounted.

Geometry → centre is computed locally in `centroidOf`:
- `Point` → coordinates
- `LineString` → mid vertex
- `Polygon` / `MultiPolygon` → average of the first outer ring

## Mounted in

- `v3/observe/components/ObserveChecklistAside.tsx` (top of rail)
- `v3/plan/PlanChecklistAside.tsx` (top of rail)

## Per-row visibility toggle

Each row carries an Eye / EyeOff button (lucide) that flips a `hidden`
flag on the underlying entity:

- `BuiltEnvironmentEntity.hidden` — set via new
  `builtEnvironmentStoreV2.setHidden(id, hidden)` action (root-level
  field, not metadata, so it survives state-axis transitions).
- `DesignElement.hidden` — set via existing
  `landDesignStore.update(projectId, id, { hidden })`.
- `LandZone.hidden` — set via existing
  `zoneStore.updateZone(id, { hidden })`.

The three map layers skip hidden entities in their projection loops
(`BeV2GenericLayer`, `DesignElementLayers`, `PlanDataLayers`). Hidden
rows stay in the card (dimmed, label struck through) so they remain
toggleable. The eye toggle defies the hover-fade on `.actions` (always
visible) so a hidden row is immediately un-hideable.

## Search + hide-hidden filter

A toolbar renders at the top of the expanded body whenever
`rows.length > 0`:

- **Search input** (`<input type="search">`) — case-insensitive
  substring match against `row.label`, `row.groupLabel`, and `row.kind`.
  Pattern mirrors `DesignElementPalette` (`apps/web/src/v3/plan/canvas/`).
- **"Hide hidden" pill** (`aria-pressed`-styled `<button>`) — when on,
  drops rows whose underlying entity carries `hidden: true`. Defaults
  off so toggled-off rows stay reachable.

Body grouping uses the filtered rows; the header rollup stays on the
**unfiltered** `rows` so the summary always reads "what is placed,"
not "what is currently shown." Empty-result fallback renders when the
filter excludes everything but `rows.length > 0`.

Filter state lives in the component (`useState`) — ephemeral by design;
it does not persist across stage switches or remounts.

## Deliberately deferred (do not "fix" without revisiting)

- **Per-stage visibility** — `hidden` is global, not per-stage; a
  feature hidden in Observe is also hidden in Plan. Add stage-keyed
  flags only if a real use case appears.
- **Bulk show/hide all in a group** — defer; today's inventories are
  small enough for row-by-row to be fine.
- **Group filter chips** — open-ended group taxonomy (built/design
  kinds depend on registry catalogs); revisit only if a fixed taxonomy
  emerges.
- **Persisted search state** — ephemeral by design; revisit only if
  stewards report losing context on stage switches.
- **Drag-reorder / multi-select** — defer until inventories regularly
  exceed ~30 features.
- **Inline edit** — focus-on-map already brings the existing inline
  popover into reach; duplicating an editor inside the rail row is not
  needed yet.
