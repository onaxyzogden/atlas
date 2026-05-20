# 2026-05-14 — Observe: Conventional-crop annotation (earth-water-ecology)


New `conventionalCrop` annotation kind under the Earth-Water-Ecology
Observe module, sibling to `pasture` and `ecologyZone`. Closes the gap
where inherited conventionally-farmed cropland — row crops, perennial
monocultures, cover-cropped fields, fallow paddocks — had no Observe-side
note surface, so Plan and Act stages now have an anchor for what
restoration is converting *from*. One polygon tool with rich agronomy
schema (kind enum + primaryCrop, compaction, inputs, tillage, irrigation,
lastPlanted, rotationNotes, label, notes) per steward preference for
richer first-cut capture. Dedicated `conventionalCropStore` (persist key
`ogden-conventional-crops`) keeps the schema isolated from `pastureStore`
and `ecologyStore`. Distinct ochre palette (annual-row `#a8854a`,
perennial-monoculture `#8e7136`, cover-cropped `#9aa56b`, fallow
`#c4b89a`) so the visual read diverges at a glance from pasture's
tan/buff. Mirrors the pasture template's 9-integration-point pattern
(store, draw tool, schema, registry, switchboard, MapToolId union, rail
entry, layer spec, dashboard list). Freehand + Dimensions (rect, circle)
toggle inherited. `tsc --noEmit` clean (required 8GB heap), `npm run lint`
exit 0, preview-verified end-to-end via store + DOM probes.

Files: [apps/web/src/store/conventionalCropStore.ts](../apps/web/src/store/conventionalCropStore.ts),
[apps/web/src/v3/observe/components/draw/ConventionalCropTool.tsx](../apps/web/src/v3/observe/components/draw/ConventionalCropTool.tsx),
[annotationFieldSchemas.ts](../apps/web/src/v3/observe/components/draw/annotationFieldSchemas.ts),
[AnnotationRegistry.ts](../apps/web/src/v3/observe/components/AnnotationRegistry.ts),
[ObserveDrawHost.tsx](../apps/web/src/v3/observe/components/draw/ObserveDrawHost.tsx),
[useMapToolStore.ts](../apps/web/src/v3/observe/components/measure/useMapToolStore.ts),
[ObserveTools.tsx](../apps/web/src/v3/observe/tools/ObserveTools.tsx),
[ObserveAnnotationLayers.tsx](../apps/web/src/v3/observe/components/layers/ObserveAnnotationLayers.tsx),
[EarthWaterEcologyDashboard.tsx](../apps/web/src/v3/observe/modules/earth-water-ecology/EarthWaterEcologyDashboard.tsx).
Decision: [decisions/2026-05-14-atlas-observe-conventional-crop-annotation.md](decisions/2026-05-14-atlas-observe-conventional-crop-annotation.md).
