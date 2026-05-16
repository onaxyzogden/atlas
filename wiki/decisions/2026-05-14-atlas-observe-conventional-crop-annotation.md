---
title: Observe — Conventional-crop annotation (Earth-Water-Ecology)
date: 2026-05-14
status: accepted
stage: observe
module: earth-water-ecology
---

# Observe — Conventional-crop annotation

## Context

Observe could record grazed land (`pasture`, 2026-05-14 prior ADR) and
late-successional ecological zones (`ecologyZone`), but had no surface for
the most common inherited land cover on the properties Atlas is built for:
ground that arrives under **conventional agronomy** — row crops, perennial
monocultures, cover-cropped fields, or fallow paddocks managed with
tillage and synthetic inputs.

Capturing this matters for three downstream reasons:

1. **Restoration baseline.** Plan and Act need to know what the steward is
   converting *from*. Soil-restoration earthworks, succession plantings,
   and yield modelling all need an observational anchor for "this 4.2 ha
   was annual corn, intensive till, synthetic NPK, moderate compaction".
2. **Compaction + input legacy.** Soil-test samples (`soilSample`) capture
   point-in-time chemistry, but the *practice history* that produced
   that chemistry lives nowhere. A polygon annotation with `compaction`,
   `inputs`, `tillage`, and `irrigation` fields fills the gap.
3. **Visible-state read.** The map should make it obvious where existing
   cropland sits — currently those polygons read as "unmarked land",
   visually identical to ecology zones or pasture.

## Decision

Add a new annotation kind `conventionalCrop` under the existing **Earth,
Water & Ecology** Observe module, sibling to `pasture` and `ecologyZone`.
One polygon tool labelled "Conventional crop" with a rich agronomy schema
(per user preference for richer first-cut capture rather than lean):

- `kind`: `annual-row | perennial-monoculture | cover-cropped | fallow`
- `primaryCrop?` (free text — "Corn", "Soy/wheat rotation")
- `compaction?`: `none | mild | moderate | severe | unknown`
- `inputs?`: `synthetic | organic | mixed | none | unknown`
- `tillage?`: `no-till | reduced | conventional | intensive | unknown`
- `irrigation?`: `none | rainfed | drip | sprinkler | flood | unknown`
- `lastPlanted?` (ISO date)
- `rotationNotes?`, `label?`, `notes?`

### Why earth-water-ecology (not Built Environment / Human Context)

- **Built Environment → Agricultural** would lump cropland with
  greenhouses and silos. Wrong abstraction: cropland is land cover, not
  infrastructure.
- **Human Context** is for stewards, neighbours, access — narrative
  surface, not geographic.
- Earth-Water-Ecology already hosts the land-cover trio (`watercourse`,
  `ecologyZone`, `pasture`). Conventional cropping slots in as the
  fourth member of that family.

### Why a separate Zustand store

A dedicated `conventionalCropStore` (persistence key
`ogden-conventional-crops`) keeps the schema isolated from:
- `pastureStore` — different vocabulary (kind enum, inputs, tillage).
- `ecologyStore.ecologyZones` — `dominantStage` doesn't apply to actively
  cropped ground.
- Plan's design stores — Plan owns *designed* cropping (plant guilds,
  annual beds); Observe notes existing state. Stage separation per
  2026-05-08 ADR preserved.

### Why richer fields than pasture

Per user choice during planning: paddocks differ from each other mostly
by fencing, but conventional cropping differs along many axes the
steward already knows when annotating (compaction, inputs, tillage).
Capturing them upfront avoids a second-pass form that never gets filled.

### Palette

Distinct buff/ochre tones from pasture's tan/buff so the visual read
diverges at a glance:
- `annual-row`: `#a8854a` (dull ochre)
- `perennial-monoculture`: `#8e7136`
- `cover-cropped`: `#9aa56b` (greenish — soil-protected)
- `fallow`: `#c4b89a` (pale straw)

Fill opacity 0.22, line width 1.5 (matches pasture, ecology-zone).

## Files

**New:**
- `apps/web/src/store/conventionalCropStore.ts` — Zustand + persist +
  zundo temporal, full agronomy schema.
- `apps/web/src/v3/observe/components/draw/ConventionalCropTool.tsx` —
  mirror of `PastureTool.tsx`, persist-first polygon draw → edit form,
  Freehand/Dimensions toggle (rect + circle).

**Edits:**
- `apps/web/src/v3/observe/tools/ObserveTools.tsx` — added entry to
  the earth-water-ecology group after Pasture (lucide `Wheat` icon).
- `apps/web/src/v3/observe/components/measure/useMapToolStore.ts` —
  added `'observe.earth-water-ecology.conventional-crop'` to the
  `MapToolId` union.
- `apps/web/src/v3/observe/components/draw/ObserveDrawHost.tsx` — switch
  case dispatching to `ConventionalCropTool`.
- `apps/web/src/v3/observe/components/draw/annotationFieldSchemas.ts` —
  `'conventionalCrop'` in `AnnotationKind`, new schema with 10 fields,
  wired into `FIELD_SCHEMAS` + `FIELD_REMOVERS`.
- `apps/web/src/v3/observe/components/AnnotationRegistry.ts` — registry
  label, row formatting (`${kind} · ${primaryCrop} · ${notes}`), store
  subscription, removal dispatcher.
- `apps/web/src/v3/observe/components/layers/ObserveAnnotationLayers.tsx`
  — fill+line layers `observe-anno-conventional-crop-fill` / `-line`,
  ochre palette, 0.22 fill opacity, 1.5 line width.
- `apps/web/src/v3/observe/modules/earth-water-ecology/EarthWaterEcologyDashboard.tsx`
  — `'conventionalCrop'` added to `AnnotationListCard` `kinds`; empty
  hint updated.

**Not touched** (deliberate):
- Plan-stage tools — Plan owns designed cropping; out of scope per
  stage-separation ADR.
- `soilSampleStore` — chemistry samples remain orthogonal; the new
  practice-history annotation augments but doesn't replace them.

## Out of scope

- Derivations into Earth-Water-Ecology summary tiles ("X% of land
  conventionally cropped"). Follow-up once data accumulates.
- Basemap "Adopt from map" path (BE-specific today; cropland boundaries
  could benefit later via NLCD/CDL polygons).
- Grounding/seed-task tie-in.
- Plan-stage twin or "promote to designed cropping" affordance.

## Verification

- `tsc --noEmit` from `apps/web` — clean (required
  `NODE_OPTIONS=--max-old-space-size=8192`; default 4GB heap OOMs).
- `npm run lint` — exit 0 (ESLint + grounding gate clean).
- Browser preview (preview_eval probes):
  - "Conventional crop" appears in the Observe rail after
    "Pasture / paddock".
  - Tool activation sets `aria-pressed=true` and renders the popover
    with Freehand/Dimensions toggle.
  - `FIELD_SCHEMAS.conventionalCrop.loadDefaults` round-trips all 10
    fields.
  - Adding a record via the store materialises a maplibre fill+line
    layer pair on source `observe-anno-conventional-crop`.
  - `getAnnotationRow` returns correct title + subtitle.
  - `removeAnnotation('conventionalCrop', id)` clears the record.
