# 2026-05-21 — Observe rail: pasture, conventional crop, berm, raised bed → Agricultural

**Status.** Implemented on `feat/atlas-permaculture` (commit `acf3009f`).
Observe-only slice; Plan is intentionally untouched.

## Context

The Observe stage's left rail
([apps/web/src/v3/observe/tools/ObserveTools.tsx](../../apps/web/src/v3/observe/tools/ObserveTools.tsx))
is composed of two parallel grouping systems:

1. **Module-mapped groups** (`TOOL_GROUPS: Record<ObserveModule, ToolItem[]>`) —
   one per Observe module (`human-context`, `topography`,
   `earth-water-ecology`, `sectors-zones`, `swot-synthesis`, etc.). Each
   tool's `toolId` is `observe.<module>.<tool>` and the section
   click-target activates that module.
2. **Built-Environment category sub-sections** (rendered from
   `BE_TOOL_GROUPS` in
   [\_shared/builtEnvironmentTools.ts](../../apps/web/src/v3/_shared/builtEnvironmentTools.ts)),
   one per `BuiltEnvironmentCategory` — `building`, `agricultural`,
   `utility`, `infrastructure`, `machinery`, `amenity`. Each surfaces as
   its own flat top-level rail section per the
   [2026-05-14 BE-flatten](2026-05-14-…) precedent.

Until 2026-05-21, the EWE module group contained seven tools:

```
Watercourse · Soil sample · Vegetation & cover ·
Pasture / paddock · Conventional crop · Berm · Raised bed
```

Berm and Raised bed had been moved into EWE on 2026-05-14 when the
Earthworks BE category was dropped from the rail (with Terrace going
to Amenities). Pasture and Conventional crop had lived in EWE since
introduction.

## Problem

EWE conceptually describes **ecological/observational facts** — what
the land is in terms of water, soil, vegetation. Four of its seven
tools describe **agricultural use and shaping**:

- **Pasture / paddock** — a grazed land use.
- **Conventional crop** — an arable land use.
- **Raised bed** — a productive growing structure.
- **Berm** — an earthwork that supports beds / shapes water flow for
  production.

An Agricultural rail section already exists in Observe, sourced from
the BE registry's `agricultural` category. It already contains the
productive **buildings** that serve those fields and beds — barn,
greenhouse, shed, animal shelter, compost station. The
stewards-eye-view mental model is "agriculture = pasture + crops +
beds + the barns that serve them, in one place"; the four EWE tools
broke that grouping.

## Decision

Move the four tools to the Agricultural rail section in **Observe
only**, via the existing
`BE_TOOL_GROUPS`-render special-case pattern (the 2026-05-14
`amenity → terrace` precedent).

### Implementation

[apps/web/src/v3/observe/tools/ObserveTools.tsx](../../apps/web/src/v3/observe/tools/ObserveTools.tsx)
— single-file change.

**1. Trim EWE.** The `earth-water-ecology` entry of `TOOL_GROUPS` now
contains only the three genuinely ecological tools:

```ts
'earth-water-ecology': [
  { id: 'watercourse', label: 'Watercourse',        Icon: Waves,    toolId: 'observe.earth-water-ecology.watercourse' },
  { id: 'soil-sample', label: 'Soil sample',        Icon: TestTube, toolId: 'observe.earth-water-ecology.soil-sample' },
  { id: 'vegetation',  label: 'Vegetation & cover', Icon: Sprout,   toolId: 'observe.earth-water-ecology.vegetation' },
],
```

**2. Append to Agricultural.** In the `BE_TOOL_GROUPS.map((group) => …)`
render block, extend the existing `sourceItems` `amenity → terrace`
ternary with a sibling branch:

```ts
const sourceItems =
  group.category === 'amenity'
    ? [
        ...group.items,
        ...BE_TOOL_ITEMS.filter((i) => i.kind === 'terrace'),
      ]
    : group.category === 'agricultural'
      ? [
          ...group.items,
          { kind: 'pasture',           label: 'Pasture / paddock', Icon: Fence },
          { kind: 'conventional-crop', label: 'Conventional crop', Icon: Wheat },
          ...BE_TOOL_ITEMS.filter(
            (i) => i.kind === 'berm' || i.kind === 'raised-bed',
          ),
        ]
      : group.items;
```

**3. Route the EWE-store tools to their existing toolIds.** The
downstream `groupItems` mapping previously hard-coded
`` `observe.built-environment.${bg.kind}` ``. It now branches per
kind:

```ts
const groupItems: ToolItem[] = sourceItems.map((bg) => {
  let toolId: MapToolId;
  if (bg.kind === 'pasture') {
    toolId = 'observe.earth-water-ecology.pasture';
  } else if (bg.kind === 'conventional-crop') {
    toolId = 'observe.earth-water-ecology.conventional-crop';
  } else {
    toolId = `observe.built-environment.${bg.kind}` as MapToolId;
  }
  return { id: bg.kind, label: bg.label, Icon: bg.Icon, toolId };
});
```

This keeps pasture / conventional-crop annotations writing to
`pastureStore` / `conventionalCropStore` (and surfacing in the EWE
dashboard / `EcologicalDetail` panel) with **no change** to the
draw pipeline, schemas, or stores. Berm and raised-bed continue
to use the BE pipeline unchanged.

### Why not alternative approaches

- **Re-categorise berm / raised-bed in the shared registry
  (`packages/shared/src/builtEnvironmentKinds.ts`,
  `earthworks` → `agricultural`).** Rejected. Plan deliberately
  routed berm → `water-management` and raised-bed → `plant-systems`
  on 2026-05-14
  ([PlanTools.tsx:138, 191](../../apps/web/src/v3/plan/PlanTools.tsx)).
  A registry change would either regress those per-stage decisions
  or force additional Plan-side special-cases to override the
  registry — strictly more code than the Observe-only branch.
  Pasture and conventional-crop are not BE-registered at all — they
  own their stores — so registry mutation cannot relocate them.

- **Introduce an `agriculture` first-class Observe module.** Rejected
  for now. No store, checklist, dashboard, or right-rail aside
  exists for it; building those is a multi-slice effort with no
  current product driver. Visual rail grouping under the existing
  Agricultural BE section delivers the user-visible outcome with
  zero schema churn.

- **Send berm to Topography instead.** Considered as a borderline
  case — berm shapes water flow and could read as a topographic
  intervention. The user's framing grouped all four tools together,
  so the consistent move (pasture + conventional-crop + berm +
  raised-bed → Agricultural) was implemented. This can be split
  later if operator feedback indicates berm reads as topographic.

## Consequences

**User-visible.** After this slice:

- **EWE rail section.** Watercourse · Soil sample · Vegetation & cover.
- **Agricultural rail section.** Barn · Greenhouse · Shed · Animal
  Shelter · Compost Station · **Pasture / paddock · Conventional
  crop · Berm · Raised bed**.

**Behaviour preserved.**

- Pasture and conventional-crop annotations still write to
  `pastureStore` / `conventionalCropStore`; the EWE dashboard /
  `EcologicalDetail` surfacing is unchanged.
- Berm and raised-bed continue through the BE draw pipeline; their
  geometry-edit / display behaviour
  ([annotationGeometryRegistry.ts](../../apps/web/src/v3/observe/components/draw/annotationGeometryRegistry.ts))
  is unchanged.
- EWE-checklist guidance copy
  ([ObserveChecklistAside.tsx:110](../../apps/web/src/v3/observe/components/ObserveChecklistAside.tsx))
  mentions "pasture" only metaphorically — left untouched.
- Section-header click on Agricultural still routes to the BE module
  (`BE_CATEGORY_TO_OBSERVE_MODULE.agricultural = 'built-environment'`).
  Tool-button `stopPropagation` ensures picking pasture or
  conventional-crop activates the tool without a module switch.

**Plan-stage unchanged.** Plan keeps berm under `water-management` and
raised-bed under `plant-systems`. Pasture and conventional-crop are
Observe-only as before.

## Covenant (non-financial / ecological only)

Presentation-only slice on an ecological / agricultural land-use
model. No riba / gharar / CSRA / salam / investor / financing /
cost-of-capital framing in any new file.

## Out of scope

- Plan-stage rail re-grouping.
- BE-registry re-categorisation of berm / raised-bed.
- Introduction of a first-class `agriculture` Observe module
  (store, checklist, dashboard, right-rail aside).
- Splitting berm from raised-bed (e.g. berm → Topography) — open
  for follow-up if operator feedback indicates.

## Verification

- Live preview at `/v3/project/mtc/observe` (server `:5200`) confirms
  both sections render as specified.
- No new console errors; pre-existing `[SYNC] Initial sync failed`
  warnings unrelated to this change.

## Files

**New (2):**
- [wiki/decisions/2026-05-21-atlas-observe-rail-pasture-crops-earthworks-to-agricultural.md](2026-05-21-atlas-observe-rail-pasture-crops-earthworks-to-agricultural.md) (this ADR)
- [wiki/log/2026-05-21-observe-rail-pasture-crops-earthworks-to-agricultural.md](../log/2026-05-21-observe-rail-pasture-crops-earthworks-to-agricultural.md)

**Edited (1):**
- [apps/web/src/v3/observe/tools/ObserveTools.tsx](../../apps/web/src/v3/observe/tools/ObserveTools.tsx)
  — EWE entries trimmed; agricultural sourceItems branch + per-kind
  toolId router added.

## References

- 2026-05-14 BE rail flatten / Earthworks-section drop / Terrace →
  Amenities precedent (`amenity → terrace` ternary in
  [ObserveTools.tsx](../../apps/web/src/v3/observe/tools/ObserveTools.tsx)).
- [PlanTools.tsx:138, 191](../../apps/web/src/v3/plan/PlanTools.tsx) —
  Plan's distinct per-stage placements for berm and raised-bed
  (water-management, plant-systems).
- [builtEnvironmentKinds.ts](../../packages/shared/src/builtEnvironmentKinds.ts)
  — BE category registry (left unchanged).
