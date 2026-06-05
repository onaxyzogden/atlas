# ADR: Scope Act map overlays to the active objective

**Date:** 2026-05-24
**Status:** accepted

**Context:**
The single-objective **map-overlay focus** pattern shipped for Observe
(`d5d85fc6`) and Plan (`0e638cba`) — see
[[decisions/2026-05-24-atlas-single-objective-map-overlay-focus]]. That ADR
deliberately **deferred Act** (its decision 4: "Plan only, defer Act"), because
the Act map is mostly cross-stage substrate and needed its own
kind→`ActModule` taxonomy decision. This ADR closes that gap — the deferred-Act
follow-up the prior ADR flagged. All five locked decisions from the prior ADR
carry over unchanged; only the Act-specific taxonomy is new.

**Key finding — Act's own overlays are the thinnest of the three.**
`ActDataLayers` ([act/layers/ActDataLayers.tsx](../../apps/web/src/v3/act/layers/ActDataLayers.tsx))
is the only Act-stage-OWN map layer. Unlike Plan's merged-source `KIND_MODULE`
or Observe's per-module `LayerSpec[]`, it builds just **two** FeatureCollections
of execution-event dots, each feature stamped with a `sourceKind` property
(not a generic `kind`):
- `harvestFC` — `sourceKind: 'crop' | 'livestock'`
- `maintenanceFC` — `sourceKind: 'earthwork' | 'storage'`

So the taxonomy keys on **`sourceKind`**. Only 3 of the 8 Act modules have
own-geometry (`harvest`, `livestock`, `maintain`); the other 5 (`tracker`,
`build`, `review`, `network`, `schedule`) correctly yield an empty Act overlay
under focus — exactly how Plan treats geometry-less modules (goal-compass,
phasing-budgeting). Everything else on the Act map is cross-stage substrate,
which stays ambient.

**Decision:**

1. **Trigger = single-objective focus** (carried over). Scope Act overlays
   whenever exactly one objective is active in the map (a valid `$module`
   reached via the compass's "Open on Map"); revert to full overlays on the
   bare `/act` view.
2. **Overlays = hide non-matching** (carried over). Show only the
   execution-event dots whose `sourceKind` maps to the active objective; hide
   the rest.
3. **Harvest mapping = by source** (steward-confirmed this session). A
   livestock-sourced harvest event → the `livestock` module; a crop-sourced
   one → the `harvest` module. The full `sourceKind`→`ActModule` taxonomy:
   `crop → harvest`, `livestock → livestock`, `earthwork → maintain`,
   `storage → maintain`, `structure → build` (the last included for
   completeness; not currently emitted by `ActDataLayers`).
4. **Substrate stays ambient** (carried over). Only scope Act's OWN overlays;
   the read-only `ObserveAnnotationLayers` + `PlanDataLayers` mounts in the Act
   map and the `SectorCompassOverlay` HUD are left untouched —
   `activeModule` is **not** passed to them.

**Architecture:**

Mirrors the shipped Plan `focus()` shape, swapping `kind`→`sourceKind` and
`KIND_MODULE`→`SOURCEKIND_MODULE`:

- **`ActDataLayers`** — new optional prop `activeModule?: ActModule | null`
  (destructured `= null`). A `SOURCEKIND_MODULE: Record<string, ActModule>`
  lookup near the prefixes, and a pure
  `focus(feats)` helper (identity pass when `activeModule == null`; otherwise
  keep only features whose `sourceKind` maps to `activeModule`; features with
  no/unmapped `sourceKind` drop under focus). `focus(features)` wraps the
  `features` array returned by **both** the `harvestFC` and `maintenanceFC`
  useMemos; `activeModule` added to both dep arrays. The existing source-sync
  `useEffect` already calls `setData(harvestFC)` / `setData(maintenanceFC)` on
  FC change, so no effect changes were needed.

- **`ActLayout`** — `validModule` (`ActModule | null`, via `isActModule`)
  already existed. Passed `activeModule={validModule}` to the `<ActDataLayers>`
  mount **only**. The substrate mounts (`ObserveAnnotationLayers`,
  read-only `PlanDataLayers editable={false}`) and `SectorCompassOverlay`
  were left unchanged.

Net effect under focus: `harvest` → only crop dots; `livestock` → only
paddock-yield (livestock-source) dots; `maintain` → only earthwork/storage
dots; any other module → both FCs empty (only ambient substrate remains).

**Preservation (no-deletion-in-revamps):**
Pure gate-don't-delete — every render path preserved and conditionally
filtered. Outside focus (`activeModule == null`) the render is byte-for-byte
the prior full-overlay behaviour. Per [[feedback-no-deletion]].

**Covenant constraints (held):**
Pure presentation/visibility change — no schema, store action, data model,
`MODULE_CARDS`, or migration. No riba/gharar/CSRA/salam/investor/financing/
yield/ROI framing introduced.

**Consequences:**
- Focusing an Act objective on the map now shows only that objective's
  execution-event geometry plus always-ambient cross-stage substrate and the
  sector-compass HUD — completing the Observe→Plan→Act symmetry.
- The five geometry-less Act modules render an empty own-overlay under focus
  (only substrate), a deliberate and consistent outcome.
- This closes the deferred-Act gap from
  [[decisions/2026-05-24-atlas-single-objective-map-overlay-focus]].

**Verification:**
`corepack pnpm --filter @ogden/web run typecheck` at the 3-error pre-existing
baseline (`StepBoundary.tsx:365` `ReactNode`; `HostUnionContextMenu.test.tsx:58`
+ `HostUnionDrilldownCard.test.tsx:25` test types) — no new errors. One
explicit-path commit on `feat/atlas-permaculture`: `49c22d27`
(`ActDataLayers.tsx` + `ActLayout.tsx`), staged by name per
[[feedback-commit-immediately-on-rebased-branches]].

Extends [[decisions/2026-05-24-atlas-single-objective-map-overlay-focus]].
