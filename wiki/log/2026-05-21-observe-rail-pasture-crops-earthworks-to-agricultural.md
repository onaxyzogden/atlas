# 2026-05-21 — Observe rail: pasture / conventional crop / berm / raised bed → Agricultural

**Branch.** `feat/atlas-permaculture`. Single-file Observe-only slice
(commit `acf3009f`). Full rationale in
[2026-05-21 ADR](../decisions/2026-05-21-atlas-observe-rail-pasture-crops-earthworks-to-agricultural.md).

**What changed.**

- [apps/web/src/v3/observe/tools/ObserveTools.tsx](../../apps/web/src/v3/observe/tools/ObserveTools.tsx):
  Removed `pasture`, `conventional-crop`, `be-berm`, `be-raised-bed`
  from the `earth-water-ecology` entry of `TOOL_GROUPS` (lines
  142–148 of the prior file). Extended the existing
  `BE_TOOL_GROUPS.map(...)` render block's `sourceItems` special-case
  with a sibling branch for `group.category === 'agricultural'`,
  appending the four tools — mirroring the established
  `amenity → terrace` precedent (2026-05-14). The downstream
  `groupItems` mapping was rewritten as a `let toolId` switch so
  pasture and conventional-crop retain their EWE-prefixed toolIds
  (`observe.earth-water-ecology.pasture`,
  `observe.earth-water-ecology.conventional-crop`) — only the rail
  *grouping* moves, not the underlying draw + store pipeline. Berm
  and raised-bed continue to dispatch
  `observe.built-environment.berm` / `observe.built-environment.raised-bed`
  unchanged.

**Why EWE was not the right home.**

EWE describes ecological/observational facts — water, soil, vegetation
cover. Pasture / paddock and conventional crop describe **how the land
is farmed**; berm and raised bed describe **how the land is shaped for
production**. The Agricultural rail section already exists (BE category
`agricultural`, sourced from
[builtEnvironmentTools.ts:115](../../apps/web/src/v3/_shared/builtEnvironmentTools.ts)
and the registry at
[builtEnvironmentKinds.ts](../../packages/shared/src/builtEnvironmentKinds.ts))
and already contains the productive *buildings* (barn, greenhouse,
shed, animal shelter, compost station). Grouping the productive
*fields and beds* alongside the productive *buildings* matches operator
mental model: "agriculture" = pasture + crops + beds + their barns,
in one place.

**Why not change the BE registry instead.**

Re-categorising `berm` / `raised-bed` from `earthworks` →
`agricultural` in
[packages/shared/src/builtEnvironmentKinds.ts](../../packages/shared/src/builtEnvironmentKinds.ts)
would auto-surface them in the Agricultural section of **both**
Observe and Plan. Plan deliberately routed berm →
`water-management` and raised-bed → `plant-systems` on 2026-05-14
when the Earthworks BE rail section was dropped
([PlanTools.tsx:138, 191](../../apps/web/src/v3/plan/PlanTools.tsx)).
A registry recategorisation would regress those per-stage choices.
Pasture and conventional-crop are not BE-registered at all — they
have their own stores (`pastureStore`, `conventionalCropStore`) —
so registry mutation cannot move them anyway. The Observe-only
rail-grouping change keeps Plan's distinct decisions intact and
touches one file.

**Side-effects.**

- Section-header click on the Agricultural rail still routes to the
  Built Environment Observe module
  (`BE_CATEGORY_TO_OBSERVE_MODULE.agricultural = 'built-environment'`);
  individual tool-button clicks call `stopPropagation` so picking
  pasture / conventional-crop from the new rail location still
  activates the EWE-prefixed tool without forcing a module switch.
- EWE checklist copy (`ObserveChecklistAside.tsx:110`) mentions
  "pasture" only metaphorically as an example of an ecological patch
  — no change needed.
- EWE dashboard / `EcologicalDetail` surfaces pasture and conventional
  crop from their stores, not from the rail location — unchanged.

**Verification.**

- Live preview at `/v3/project/mtc/observe` (server `:5200`):
  - EWE section now contains exactly **Watercourse**, **Soil sample**,
    **Vegetation & cover**.
  - Agricultural section now contains: Barn, Greenhouse, Shed, Animal
    Shelter, Compost Station, **Pasture / paddock**, **Conventional
    crop**, **Berm**, **Raised bed**.
- Console errors limited to pre-existing `[SYNC] Initial sync failed`
  noise unrelated to the rail change.

**Out of scope.** Plan-stage rail re-grouping; BE-registry
re-categorisation of berm / raised-bed; introduction of a first-class
`agriculture` Observe module + checklist / dashboard / store
(no current product driver).
