# ADR: Map overlays follow single-objective focus (Observe + Plan)

**Date:** 2026-05-24
**Status:** accepted

**Context:**
The single-objective **focus pattern** already shipped for the *rails* — when a
steward clicks "Open on Map" for one compass objective, the tool palette and
checklist aside collapse to show only that objective's card(s) (Goal 2 / Phase 3).
But the **map itself** still rendered every module's data overlay at once. A
steward who focused "Water Management" on the Plan map still saw livestock
paddocks, plant guilds, zones, structures, and every other group layered on top —
the exact overwhelm the compass was meant to cure, just relocated from the rail to
the canvas. The steward directed: *"map view overlays and sector compass segments
should only show what is relevant to that objective when in the initiation phase
of that stage."*

**Decision (steward-locked choices):**

1. **Trigger = single-objective focus.** Scope the map overlays whenever exactly
   one objective is active in the map view (the focused mode reached via the
   compass's "Open on Map", i.e. a valid `$module` URL segment). Revert to full
   overlays when no objective is selected (the bare `/observe` or `/plan` view).
2. **Overlays = hide non-matching.** Strict single-objective map: show only the
   layer(s)/feature(s) whose module matches the active objective; hide all
   others. Mirrors the strict rail focus.
3. **Sector compass HUD = always ambient.** Despite the original phrasing
   mentioning "sector compass segments," the steward explicitly chose to leave the
   `SectorCompassOverlay` HUD always visible — only **data** overlays get scoped.
4. **Scope = Plan only, defer Act.** Implement Observe + Plan overlay scoping now.
   Act is deferred — the Act map is mostly cross-stage substrate (Observe
   annotations + read-only `PlanDataLayers`) that does not map to Act modules, so
   it needs its own kind→`ActModule` taxonomy decision later.
5. **Cross-stage substrate = keep ambient.** Only scope the *active stage's own*
   overlays. Prior-stage read-only substrate (Observe annotations mounted in the
   Plan map for context) stays always-visible — `activeModule` is **not** passed to
   substrate mounts.

**Architecture:**

The two stages have divergent layer architectures, so scoping took two shapes:

- **Observe — clean per-module specs.** `ObserveAnnotationLayers` already builds
  one `LayerSpec[]` per module (each `{ id, data, layers, toggleKey? }`), with
  visibility driven by `map.setLayoutProperty(layer.id, 'visibility', …)`. Added a
  `SPEC_MODULE: Record<string, ObserveModule>` lookup and folded a `moduleMatch`
  term into both `specVisible` computations:
  `const specVisible = (activeModule == null || SPEC_MODULE[spec.id] === activeModule) && (spec.toggleKey ? subToggles[spec.toggleKey] : visible);`
  `activeModule` added to the effect dep array. `field-verification` is omitted
  from the map (so it hides under focus). New optional prop `activeModule?:
  ObserveModule | null`, wired from `ObserveLayout` (`validModule`).

- **Plan — merged-source collections.** `PlanDataLayers` (~4k lines) merges all 15
  modules' features into shared `plan-data-poly/line/point/label/setback/flow/…`
  sources distinguished by a per-feature `kind` property — so scoping is *not*
  per-layer visibility but **filtering the FeatureCollections**. Added a
  `KIND_MODULE: Record<string, PlanModule>` taxonomy (derived from the per-feature
  module comments in the FC builder: zone/path/setback→zone-circulation;
  crop/guild/guild-member/host-canopy-union(+label)→plant-systems;
  paddock/fence-line/slaughter_point/cold_chain_unit/market_node→livestock;
  utility/utility-point/structure→structures-subsystems; fertility/flow→
  soil-fertility; note/transect→principle-verification; water_catchment/storage/
  swale/sink + utility_conflict→water-management) and a pure `focus(feats)` helper
  that drops every feature whose kind ≠ `activeModule` (identity pass when null;
  unmapped kinds drop under focus). Applied to all 13 returned FCs;
  `activeModule` added to the `useMemo` deps. Modules with no map geometry (e.g.
  goal-compass, phasing-budgeting) correctly yield an empty Plan overlay under
  focus, leaving only the ambient substrate.

- **Plan — design-element canvas.** `DesignElementLayers` (`design-el-*`) builds
  its features from `designElementsStore` rows that carry a `category`
  (`DesignCategory`). Added a `CATEGORY_MODULE: Record<DesignCategory, PlanModule |
  null>` map (water→water-management, access→zone-circulation, grazing→livestock,
  structure/amenity→structures-subsystems, machinery→machinery,
  vegetation→plant-systems, earthworks→water-management,
  habitat→habitat-allocation, custom→null/hidden) and filtered the `visible` set;
  `activeModule` added to the FC `useMemo` deps. New optional prop wired from
  `PlanLayout` (`validModule`).

- **Mount wiring.** `PlanLayout` passes `activeModule={validModule}` to
  `PlanDataLayers` and `DesignElementLayers` only. The `ObserveAnnotationLayers`
  substrate mount in the Plan map is **left unchanged** (ambient cross-stage
  context, decision 5). The Vision authoring canvas (`VisionLayoutCanvas`) is also
  left unscoped — it is a dedicated design-authoring surface, not reached via "Open
  on Map".

**Preservation (no-deletion-in-revamps):**
Pure gate-don't-delete — every layer/feature/spec render path is preserved and
conditionally rendered, never removed. Outside focus mode (`activeModule == null`)
behaviour is byte-for-byte the prior full-overlay render.

**Covenant constraints (held):**
Pure presentation/visibility change — no schema, store action, data model,
`MODULE_CARDS`, or migration. No riba/gharar/CSRA/salam/investor/financing/yield/
ROI framing introduced.

**Consequences:**
- Focusing an objective on the Observe or Plan map now shows only that objective's
  geometry plus always-ambient cross-stage substrate and the sector-compass HUD.
- The sector-compass HUD stays ambient by explicit choice (decision 3) — a future
  request to scope its segments would be a separate change.
- **Act map overlays remain unscoped** (decision 4) — a known, deliberate gap;
  revisit with an Act kind→module taxonomy if the steward wants Act focus.

**Verification:**
`tsc --noEmit` at the 3-error pre-existing baseline (`StepBoundary.tsx:365`
`ReactNode`; `HostUnionContextMenu.test.tsx:58` + `HostUnionDrilldownCard.test.tsx:25`
test types) — no new errors. Two explicit-path commits on `feat/atlas-permaculture`:
Observe slice (`d5d85fc6`: `ObserveAnnotationLayers.tsx` + `ObserveLayout.tsx`) and
Plan slice (`0e638cba`: `PlanDataLayers.tsx` + `DesignElementLayers.tsx` +
`PlanLayout.tsx`). Divergence-checked before push (8 ahead / 0 behind — clean
fast-forward).
