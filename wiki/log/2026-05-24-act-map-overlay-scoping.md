# Scope Act map overlays to the active objective

**Date:** 2026-05-24
**Branch:** `feat/atlas-permaculture`

## What

The single-objective map-overlay focus pattern shipped for Observe (`d5d85fc6`)
and Plan (`0e638cba`) but **deferred Act** (decision 4 of the prior ADR: "Plan
only, defer Act"). This slice closes that gap — the deferred-Act follow-up that
ADR flagged. When a steward opens one Act compass objective on the map (a valid
`$module` URL segment via "Open on Map"), `ActDataLayers` now shows only that
objective's execution-event dots and hides the rest; full overlays return on the
bare `/act` view.

## Carried-over + new decisions

All five locked decisions from
[[decisions/2026-05-24-atlas-single-objective-map-overlay-focus]] carry over
unchanged (trigger = single-objective focus; overlays = hide non-matching;
sector-compass HUD stays ambient; substrate stays ambient; only scope the active
stage's own overlays). The one **new** Act-specific decision, steward-confirmed
this session:

- **Harvest mapping = by source.** A livestock-sourced harvest event maps to the
  `livestock` module; a crop-sourced one to `harvest`. Full `sourceKind`→
  `ActModule` taxonomy: `crop → harvest`, `livestock → livestock`,
  `earthwork → maintain`, `storage → maintain`, `structure → build` (last
  included for completeness; not currently emitted).

## Key finding

Act's own overlays are the **thinnest** of the three stages. `ActDataLayers`
builds just two FeatureCollections of execution-event dots (`harvestFC`,
`maintenanceFC`), each feature stamped with a **`sourceKind`** property (not a
generic `kind`). Only 3 of 8 Act modules have own-geometry (`harvest`,
`livestock`, `maintain`); the other 5 (`tracker`, `build`, `review`, `network`,
`schedule`) correctly yield an empty Act overlay under focus — exactly how Plan
treats geometry-less modules. The rest of the Act map is cross-stage substrate
(ambient).

## How

Mirrors the shipped Plan `focus()` shape, swapping `kind`→`sourceKind` and
`KIND_MODULE`→`SOURCEKIND_MODULE`:

- **`ActDataLayers.tsx`** — `import type { ActModule } from '../types.js'`; new
  optional prop `activeModule?: ActModule | null` (destructured `= null`); a
  `SOURCEKIND_MODULE: Record<string, ActModule>` lookup; a pure `focus(feats)`
  helper (identity pass when null; otherwise keep only features whose
  `sourceKind` maps to `activeModule`; unmapped/missing `sourceKind` drop).
  `focus(features)` wraps the `features` array returned by **both** the
  `harvestFC` and `maintenanceFC` useMemos; `activeModule` added to both dep
  arrays. The existing source-sync `useEffect` already calls `setData(...)` on
  FC change, so no effect changes were needed.
- **`ActLayout.tsx`** — `validModule` (`ActModule | null` via `isActModule`)
  already existed; passed `activeModule={validModule}` to the `<ActDataLayers>`
  mount **only**. The substrate mounts (`ObserveAnnotationLayers`, read-only
  `PlanDataLayers editable={false}`) and `SectorCompassOverlay` HUD left
  unchanged.

Net effect under focus: `harvest` → only crop dots; `livestock` → only
paddock-yield dots; `maintain` → only earthwork/storage dots; any other module →
both FCs empty (only ambient substrate remains). Completes the
Observe→Plan→Act overlay-scoping symmetry.

## Preservation (no-deletion-in-revamps)

Pure gate-don't-delete — every render path preserved and conditionally filtered.
Outside focus (`activeModule == null`) the render is byte-for-byte the prior
full-overlay behaviour. Per [[feedback-no-deletion]].

## Covenant

Pure presentation/visibility change — no schema, store action, data model,
`MODULE_CARDS`, or migration. No riba/gharar/CSRA/salam/investor/financing/
yield/ROI framing introduced.

## Verification

`corepack pnpm --filter @ogden/web run typecheck` at the 3-error pre-existing
baseline (`StepBoundary.tsx:365` `ReactNode`; `HostUnionContextMenu.test.tsx:58`
+ `HostUnionDrilldownCard.test.tsx:25` test types) — no new errors. One
explicit-path commit on `feat/atlas-permaculture`: `49c22d27`
(`ActDataLayers.tsx` + `ActLayout.tsx`), staged by name per
[[feedback-commit-immediately-on-rebased-branches]]. Live preview not run
(screenshots hang on the MapLibre canvas — the documented standard); the change
is a pure deterministic FeatureCollection filter verified by typecheck + code
review.

ADR: [[decisions/2026-05-24-atlas-act-map-overlay-scoping]].
Extends [[decisions/2026-05-24-atlas-single-objective-map-overlay-focus]].
