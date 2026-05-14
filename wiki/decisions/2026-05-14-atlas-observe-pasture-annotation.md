---
title: Observe — Pasture / paddock annotation (Earth-Water-Ecology)
date: 2026-05-14
status: accepted
stage: observe
module: earth-water-ecology
---

# Observe — Pasture / paddock annotation

## Context

Atlas's Observe stage had no way to record pre-existing pastures or paddocks
on a property. The user wanted to "make note of paddocks and pastures already
there" — an *observation* of existing land cover, not a design decision.

Paddocks already exist in Plan as a *design* tool
(`apps/web/src/v3/plan/draw/tools/PaddockTool.tsx` →
`useLivestockStore.paddocks`), capturing stocking density, species, fencing
type — design intent under Yeomans rank 9 + Holmgren P3
(see `wiki/decisions/2026-05-08-atlas-plan-module4-livestock.md`).

The stage separation is correct and preserved:
**Plan designs paddocks. Observe notes existing ones.**

## Decision

Add a new annotation kind `pasture` under the existing **Earth, Water &
Ecology** Observe module, sibling to `ecology-zone`. One polygon tool
labelled "Pasture / paddock" with an optional `kind` field
(`open-pasture | paddock | hayfield`) and lean schema
(`kind`, `label?`, `notes?`).

### Why earth-water-ecology

- **Sectors & Zones** is for invisible forces (sun/wind/fire) — not a fit.
- **Built Environment** is for human-built things; the fence around a
  paddock is already covered by the existing BE `fence` annotation.
- Pasture/paddock = grazed grassland = an ecological land-cover
  observation, sibling to `ecologyZone`.

### Why one tool, not two

"Pasture" and "paddock" differ only by fencing. Modelling them as two
separate tools doubles the manifest entries and asks the user to pick the
right one before drawing. Cleaner: one polygon tool, one `kind` field.
Fenced/unfenced can be added later if it earns its weight.

### Separate Zustand store

A new `pastureStore` (persistence key `ogden-pastures`) keeps the lean
Observe schema isolated from:
- Plan's rich `livestockStore` (design intent).
- Observe's `ecologyStore` (succession-stage analysis used by
  `EcologicalDetail.tsx`, which pastures don't carry).

## Files

**New:**
- `apps/web/src/store/pastureStore.ts` — Zustand + persist + temporal,
  schema `{ id, projectId, geometry, kind, label?, notes?, createdAt }`.
- `apps/web/src/v3/observe/components/draw/PastureTool.tsx` — mirror of
  `EcologyZoneTool.tsx`, persist-first polygon draw → edit form.

**Edits:**
- `apps/web/src/v3/observe/tools/ObserveTools.tsx` — added Pasture /
  paddock entry to the earth-water-ecology group (lucide `Fence` icon).
- `apps/web/src/v3/observe/components/measure/useMapToolStore.ts` — added
  `'observe.earth-water-ecology.pasture'` to the `MapToolId` union.
- `apps/web/src/v3/observe/components/draw/ObserveDrawHost.tsx` — switch
  case dispatching to `PastureTool`.
- `apps/web/src/v3/observe/components/draw/annotationFieldSchemas.ts` —
  `'pasture'` in `AnnotationKind`, new `pasture` schema (kind / label /
  notes), wired into `FIELD_SCHEMAS` + `FIELD_REMOVERS`.
- `apps/web/src/v3/observe/components/AnnotationRegistry.ts` — registry
  entry (label, row formatting, store subscription, removal).
- `apps/web/src/v3/observe/components/layers/ObserveAnnotationLayers.tsx` —
  fill+line layers `observe-anno-pasture-fill` / `observe-anno-pasture-line`,
  palette `#c9a86a` (open-pasture) / `#b58550` (paddock) / `#d4b878`
  (hayfield), 0.22 fill opacity, 1.5 line width.
- `apps/web/src/v3/observe/modules/earth-water-ecology/EarthWaterEcologyDashboard.tsx`
  — `'pasture'` added to the `AnnotationListCard` `kinds`; empty hint
  updated.

**Not touched** (deliberate):
- `EcologicalDetail.tsx` — succession-stage analysis tab; pastures don't
  carry `dominantStage` so they don't belong there.
- `useLivestockStore`, `PaddockTool` — Plan's design domain stays
  untouched.

## Out of scope

- A "promote to Plan paddock" affordance copying an Observe pasture into
  `useLivestockStore`. Real bridge, separate change.
- Fenced/unfenced boolean, current-use (active/abandoned/overgrazed/
  recovering), stocking-rate fields.
- Map symbology beyond simple fill+line (e.g. hatched fill for fenced).

## Verification

- `tsc -p apps/web --noEmit` — clean (0 errors).
- Persist-first lifecycle inherited unchanged from `EcologyZoneTool`
  template; `discardOnCancel` wires through `FIELD_REMOVERS.pasture` to
  `usePastureStore.removePasture`.
