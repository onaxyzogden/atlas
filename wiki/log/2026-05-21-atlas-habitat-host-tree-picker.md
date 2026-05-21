# 2026-05-21 — Atlas habitat-feature inline-popover host-tree picker

**Slice 8-E** of the 2026-05-21 habitat-features unification.

## What landed

- `apps/web/src/v3/plan/layers/inlineEditSchemas.ts` — new
  `buildHabitatFeatureEditSchema(el, projectId, updateElement, designElements)`
  schema-builder. Emits per-kind fields (`mountingHeightM` for owl-box /
  nest-box, `heightM` for raptor-perch, `approxHeightM` + `cavityCount`
  for snag), a conditional `hostTreeFeatureId` select for the four
  mount-on-tree kinds (`owl-box` / `raptor-perch` / `nest-box` / `snag`),
  and universal `label` + `notes`. `onSave` deep-patches `habitatMetadata`
  immutably and collapses fully-empty metadata back to `undefined`.
- `apps/web/src/v3/plan/layers/__tests__/buildHabitatFeatureEditSchema.test.ts` —
  8 new cases covering host-candidate listing, populated picker, empty-
  state readonly helper copy, host-field suppression for non-mount-on-
  tree kinds (`brush-pile`), snag dimension fields alongside the host
  picker, and the onSave write+clear roundtrip.
- `apps/web/src/v3/plan/PlanSelectionFloater.tsx` — extends the count-chip-
  as-button pattern (already used for paddock edit) to habitat-category
  DesignElements. `habitatElement` lookup gates the new branch; the
  click handler opens the schema-driven popover via `useInlineFormStore`.
- `apps/web/src/features/biodiversity/__tests__/habitatFeatureDependencyGraph.test.ts` —
  added a roundtrip case `popover → store → seeder roundtrip (Slice 8-E)`
  proving that calling `schema.onSave({ hostTreeFeatureId: 'oak1' })`
  followed by `pushHabitatFeaturesToSpine('p1')` produces a habitat-
  feature WorkItem with `dependsOnAuto: ['tree__oak1']`.

## Why

Slice 8-B added the `habitatMetadata.hostTreeFeatureId` schema field and
the `seedHabitatFeatureDependencies` projector, but stewards had no UI
path to write the field. They had to edit `useLandDesignStore` via
devtools. Slice 8-E closes that gap with an inline popover that lists
every placed `oak-tree` / `pine-tree` / `apple-tree` / `shrub` point as a
candidate host. Stewardship sovereignty preserved — the user names the
host explicitly; the system never auto-infers it.

## Picker scope

| Habitat kind     | Picker visible? | Rationale                              |
| ---              | ---             | ---                                    |
| `owl-box`        | ✅              | Boxes mount on trees                   |
| `raptor-perch`   | ✅              | Perches mount on trees / posts         |
| `nest-box`       | ✅              | Boxes mount on trees                   |
| `snag`           | ✅              | A snag IS a tree — link to lineage     |
| `brush-pile`     | ❌              | Pile sits on the ground                |
| `insectary-strip`| ❌              | Line geometry, not tree-hosted         |
| `wetland-edge`   | ❌              | Polygon, not tree-hosted               |

## Empty state

When the project has no placed vegetation-category tree-planting point,
the picker renders as a readonly `<select>` with the single option
"Place an oak / pine / apple / shrub point first." Stewards see the
affordance, learn the dependency, and are not silently denied.

## Save behaviour

`onSave` deep-patches `habitatMetadata` so per-kind dimension fields and
host selection coexist with the universal `notes`. An empty
`hostTreeFeatureId` string deletes the key; a fully-empty metadata
object collapses to `undefined` so downstream consumers see a clean
shape.

## Verification

- `npx vitest run src/v3/plan/layers/__tests__/buildHabitatFeatureEditSchema.test.ts src/features/biodiversity/__tests__/habitatFeatureDependencyGraph.test.ts` → 15/15 green.
- Covenant grep `\b(riba|gharar|csra|salam|investor|financing|cost-of-capital)\b` across the new + modified files → zero matches.

## Out of scope (still deferred)

- Multi-host support (a habitat feature linked to multiple trees).
- Reverse picker (from a tree, pick which habitat features it hosts).
- Visual edge overlay on the Plan canvas connecting habitat to host.
- Hedgerow / orchard / silvopasture as host candidates — line / polygon
  vegetation isn't a host substrate; only point trees qualify per the
  Slice 8-B seeder contract.
