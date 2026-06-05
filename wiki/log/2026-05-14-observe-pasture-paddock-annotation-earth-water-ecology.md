# 2026-05-14 — Observe: Pasture / paddock annotation (earth-water-ecology)


Added a new `pasture` annotation kind to the Observe stage under the existing
Earth, Water & Ecology module, sibling to `ecology-zone`. Closes the gap where
properties with pre-existing paddocks or pastures had no Observe-side tool to
*note what's already there* (Plan's `PaddockTool` is a design tool under
`useLivestockStore`, not an observation surface — see ADR
`2026-05-08-atlas-plan-module4-livestock.md`).

One polygon tool, lean schema (`kind: open-pasture | paddock | hayfield`,
optional `label`, `notes`), separate `pastureStore` (persistence key
`ogden-pastures`) so the Observe schema doesn't pollute Plan's livestock store
or Observe's `ecologyStore`. New `PastureTool.tsx` mirrors `EcologyZoneTool`'s
persist-first lifecycle. Rendered with buff/tan palette
(`#c9a86a` / `#b58550` / `#d4b878`) at 0.22 fill opacity, 1.5 line width.
Surfaced in `EarthWaterEcologyDashboard`'s `AnnotationListCard`.

tsc clean. ADR: `wiki/decisions/2026-05-14-atlas-observe-pasture-annotation.md`.
