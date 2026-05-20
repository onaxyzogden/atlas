# 2026-05-14 — Plan Zone fixes: decouple Infra, remove Zone Markers, Z-level stacking, popup category filter


**Branch.** `feat/atlas-permaculture` · sequel to `533ff76c`.

**Goal.** Three Plan-stage Zone defects reported in a single
session: (1) clicking Zone & Circulation also lit up the Built
Environment Infrastructure card; (2) the Zone Markers tool group
was wired into the rail but had no draw-tool implementation and
was effectively dead; (3) overlapping zones rendered in draw
order so a Z5 drawn last buried a Z0, making the smaller
intensive-use zone unselectable; (4) follow-on UX — the Zone
popup let stewards pick any category at any Z-level, with no
guardrails against permaculture mismatches.

**Changes.**

- **Infrastructure decoupled from Zones.** `BE_CATEGORY_TO_PLAN_MODULE`
  in `apps/web/src/v3/plan/PlanTools.tsx` and the mirror in
  `PlanChecklistAside.tsx` now route `infrastructure` to
  `structures-subsystems` (matching building / agricultural /
  utility / amenity). The `isActive = activeModule === routed`
  pattern that caused two BE categories to light up together no
  longer applies.
- **Zone Markers fully removed.** The `'zone-marker'` literal
  dropped from `BuiltEnvironmentCategory` in
  `packages/shared/src/builtEnvironmentKinds.ts` (TS union
  narrowing acted as the safety net). Consumers updated:
  `BE_CATEGORY_LABEL` and `BE_CATEGORY_GUIDANCE` in
  `apps/web/src/v3/_shared/builtEnvironmentTools.ts`; the
  Observe twin maps in `ObserveTools.tsx` /
  `ObserveChecklistAside.tsx`; the Plan element catalog and
  height registry. Generator `gen-zone-marker-glbs.mjs` and all
  six GLB assets under `public/models/zone-markers/` deleted;
  `gen:models` script in `apps/web/package.json` trimmed. The
  separate ZonesOverlay matrix rings (Module 3) are unrelated
  and untouched.
- **Z-level stacking.** Zone polygons in
  `apps/web/src/v3/plan/layers/PlanDataLayers.tsx` are now sorted
  by `permacultureZone` descending before being pushed into the
  shared `polys` / `labels` GeoJSON arrays — MapLibre renders
  later features on top, so Z0 lands topmost and Z5 at the
  bottom regardless of draw order. Undefined Z defaults to 2.
  Hit-testing needed no change: `e.features?.[0]` on
  `plan-data-poly-fill` already picks the topmost rendered
  feature.
- **Popup category filtered by Z-level + field reorder.**
  `ZonePolygonTool.tsx` reorders the inline form to Name →
  Z-level → Category and constrains Category to the
  prescribed list for the selected Z-level
  (`Z_TO_CATEGORIES`: Z0 = habitation/spiritual/education/
  infrastructure; Z1 adds food_production + access; Z2 adds
  livestock/retreat/water_retention; Z3 drops habitation/
  spiritual, keeps food_production/livestock/water_retention/
  access/buffer; Z4 = livestock/commons/conservation/
  water_retention/buffer/future_expansion/access; Z5 =
  conservation/commons/water_retention/buffer/future_expansion).
  Implemented via a new `optionsFor?: (values) => options[]`
  hook on `FieldSpec` (in `inlineFormStore.ts`) read by
  `InlineFeaturePopover.tsx` per render. An `onValuesChange`
  patch auto-corrects `category` when the new Z-level no
  longer admits the previously selected category.

**Verification.** `npm --prefix "apps\web" run typecheck` clean
across both commits. Preview reload on
`/v3/project/mtc/plan/zone-circulation` — no error boundaries
trip, all six Z-level counters render. Defect 1 confirmed:
clicking Zone & Circulation no longer activates the
Infrastructure card; clicking Infrastructure opens the
Structures & Subsystems slide-up as expected. Defect 2
confirmed: no Zone Markers section anywhere on the Plan or
Observe rail. Defects 3 + 4 are interactive (require
draw-and-click on the map) — manual smoke-test pending; logic
is contained and typecheck covers shape.

**Deferred.** Other places that may carry per-zone styling
(e.g. zone-aware fill opacity by Z-level for a stronger visual
hierarchy than render order alone) were not addressed.
Legacy zones without `permacultureZone` set fall to Z2 in the
stack; a one-time backfill prompt is not yet implemented.
