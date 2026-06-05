# PlacedFeaturesCard

**Surface:** Atlas web (`apps/web`) · **Added:** 2026-05-19 · **Branch:** `feat/atlas-permaculture`

Right-rail card that lists every feature the steward has placed on the
map for the active project, scoped to the active stage. Closes the
long-standing gap where users had no UI surface enumerating placements —
the canvas was opaque at moderate density and there was no quick path to
focus / delete a specific item from a list.

## Files

- `apps/web/src/features/shared/placedFeatures/usePlacedFeatures.ts` —
  selector hook unifying three stores into `PlacedFeatureRow[]`
- `apps/web/src/features/shared/placedFeatures/usePlacedFeatures.test.ts` —
  12 vitest cases (centroid helpers, rollup, stage scoping, draft hiding,
  sort, projectId filter)
- `apps/web/src/features/shared/placedFeatures/PlacedFeaturesCard.tsx` —
  collapsible card with header rollup, grouped body, row actions
- `apps/web/src/features/shared/placedFeatures/PlacedFeaturesCard.module.css`
- `apps/web/src/features/shared/placedFeatures/CONTEXT.md`

## Stage scoping

| Stage | Built-environment | Design elements | Zones |
|---|---|---|---|
| `observe` | `state === 'existing'` | hidden | all |
| `plan` | `state === 'proposed'` | non-draft | all |

## Data sources (three stores, one model)

- `builtEnvironmentStoreV2` → buildings, wells, fences, utilities, …
- `landDesignStore` → paddocks, swales, ponds, paths, … (by projectId)
- `zoneStore` → custom land-use zones

Geometry → centroid is computed locally (`Point` / `LineString` /
`Polygon` / `MultiPolygon`) so consumers don't need Turf or map-host
access for fly-to.

## Row actions

- **Focus** — invokes `useMapFocusStore.focus({ projectId, center, zoom: 17 })`
- **Delete** — `window.confirm` then source-discriminated remover
  (`removeBuilt` / `removeDesign(projectId, id)` / `removeZone`)

## Mount points

- `apps/web/src/v3/observe/components/ObserveChecklistAside.tsx` —
  `<PlacedFeaturesCard stage="observe" projectId={projectId} />` after
  `<ObserveReadyCue />`
- `apps/web/src/v3/plan/PlanChecklistAside.tsx` —
  `<PlacedFeaturesCard stage="plan" projectId={projectId} />` after
  `<PlanProjectTypeCard />`

## Row actions — visibility toggle (added 2026-05-19)

Each row now has an Eye / EyeOff button (lucide-react) before Focus.
Clicking flips `hidden: boolean` on the underlying entity via three
source-discriminated setters from `usePlacedFeatures`:

- **built** → new `builtEnvironmentStoreV2.setHidden(id, hidden)` action
  (writes root-level `hidden` field, not `metadata` — survives the
  `existing`/`proposed` state axis)
- **design** → existing `landDesignStore.update(projectId, id, { hidden })`
- **zone** → existing `zoneStore.updateZone(id, { hidden })`

`BuiltEnvironmentEntity`, `DesignElement`, and `LandZone` each gained an
optional `hidden?: boolean` field — additive, falsy-default, no Zustand
`migrate` bumps needed.

The three map layers skip hidden entities in their projection loops:

- `apps/web/src/v3/builtEnvironment/layers/BeV2GenericLayer.tsx` — `if (e.hidden) continue;`
- `apps/web/src/v3/plan/canvas/layers/DesignElementLayers.tsx` — `.filter((el) => !el.hidden)`
- `apps/web/src/v3/plan/layers/PlanDataLayers.tsx` — `.filter((z) => !z.hidden)`

Hidden rows stay in the card (dimmed, label struck through, swatch
preserved) so the steward can flip them back on. The eye button defies
the hover-fade applied to other action buttons (`.actions > .actionBtn:not(.actionBtnEye)`)
so a hidden row is always immediately un-hideable without hovering.

## Search + hide-hidden filter (added 2026-05-19)

A toolbar at the top of the expanded card body provides two controls:

- **Search input** — case-insensitive substring against `label`,
  `groupLabel`, and `kind`. Mirrors the
  `DesignElementPalette.tsx:41–50` pattern (same Lucide `Search` icon,
  same `.searchRow` / `.search` CSS shape).
- **"Hide hidden" pill** — `aria-pressed` button that filters out rows
  with `hidden === true`. Default off so toggled-off rows remain
  reachable.

Header rollup stays on the **unfiltered** `rows`; body grouping uses
the **filtered** rows. The split reads as "what is placed" (summary)
vs "what is currently shown" (body). Empty-result fallback renders
when the filter clears the list but `rows.length > 0`.

State is local `useState` — ephemeral, no persist.

## Deliberately deferred

- Per-stage visibility (today's `hidden` flag is global, not per-stage)
- Bulk show/hide for a whole group
- Group filter chips (built/design taxonomies are registry-driven)
- Persisted search state across sessions
- Inline edit (use existing inline popover via Focus action)
- Drag-to-reorder, multi-select, bulk delete
- Cross-project / cross-site inventory

## Conventions honoured

- **Selector stability** (`wiki/decisions/2026-04-26-zustand-selector-stability.md`):
  zones/built-entities selected raw, derived in `useMemo` — no array
  literals or `?? []` inside selectors.
- **vitest happy-dom directive** matches sibling tests
  (`// @vitest-environment happy-dom`) — required because the zustand
  persist middleware touches `window.localStorage` on store rehydrate.
- **noUncheckedIndexedAccess**: `centroidOf` + `averageRing` use explicit
  destructuring and `typeof === 'number'` guards on coordinate tuples.

## Verification (2026-05-19)

- `npm test` — 14/14 vitest cases passing (12 original + 2 covering
  `hidden` plumbing through `PlacedFeatureRow` from each source, and
  proving hidden rows stay in the list rather than being filtered out)
- `tsc` — clean for placedFeatures (pre-existing unrelated errors in
  `SilvopastureIntegrationCard.tsx` left untouched)
- DOM preview verification per the WebGL-screenshot ADR
  (`wiki/decisions/2026-05-17-webgl-screenshot-timeouts.md`):
  - Observe stage at `/v3/project/mtc/observe` — "8 placed · 8 buildings",
    collapsed 60px → expanded 380px, 8 rows × {Focus, ×}
  - Plan stage at `/v3/project/mtc/plan` — "1 placed · 1 paddocks",
    collapsed 60px → expanded 151px, "Paddocks (1)" group renders
  - Visibility toggle: clicking the eye button on the Paddock row
    flipped `data-hidden` to `"true"`, swapped icon Eye → EyeOff,
    flipped `aria-pressed`, and changed title to "Show on map";
    clicking again restored all three. Confirms hook ↔ store ↔ UI
    plumbing end-to-end.
