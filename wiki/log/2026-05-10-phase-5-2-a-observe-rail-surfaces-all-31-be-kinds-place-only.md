# 2026-05-10 — Phase 5.2.A: Observe rail surfaces all 31 BE kinds (place-only)


**Outcome.** The Observe `built-environment` toolbar now lists every kind
in `BUILT_ENVIRONMENT_KINDS` (31 total) instead of only the 8 originally-
Observe ones. The 23 newly-surfaced kinds (cabin, yurt, tent-glamping,
prayer-pavilion, pavilion, classroom, bathhouse, earthship, workshop,
lookout, barn, greenhouse, shed, animal-shelter, compost, water-tank,
water-pump-house, solar-array, machinery-shed, fuel-station,
equipment-yard, fire-circle, parking) place directly into V2 with
`state: 'existing'` via a generic placement tool — enough for
inventorying brownfield/established sites.

**Mechanism.**
- New file `apps/web/src/v3/observe/components/draw/BeV2ExistingTool.tsx`
  — generic tool that reads `geometryType` from the registry to choose
  `draw_point`/`draw_line_string`/`draw_polygon`, then on complete calls
  `useBuiltEnvironmentStoreV2.getState().create({ projectId, kind,
  state: 'existing', geometry })`.
- `ObserveDrawHost.tsx` adds a default-case dispatcher: any
  `observe.built-environment.<kind>` tool id whose `<kind>` is in the
  registry but not in the bespoke set falls through to
  `<BeV2ExistingTool kind={kind} />`. The 8 bespoke kinds keep their
  existing per-kind components (BuildingTool, WellTool, …) so create-
  time slide-up authoring of subtype/depthM/areaM2/placement/surface is
  preserved.
- `ObserveTools.tsx` now generates the rail's `built-environment` group
  from the registry: bespoke 8 first (hand-picked icons + labels),
  then the 23 registry-driven entries. Lucide icon names in the
  registry resolve through a new `BE_ICON_MAP` table.
- `useMapToolStore.ts` `MapToolId` union extended with the 23 new
  `observe.built-environment.<kind>` ids.

**What's deferred to 5.2.B (follow-up).** The 23 new kinds have no
edit-mode schema builder yet — clicking a placed `barn` or `compost`
in Observe currently does nothing post-Phase-4.4 (the inline popover
needs an `inlineEditSchemas.ts` builder per kind). Until 5.2.B, the
new kinds are place-then-vertex-edit only; vertex editing works
through the shared handler from 4.3 because they're all polygons.

**Files touched (Phase 5.2.A):**
- *Created*:
  `apps/web/src/v3/observe/components/draw/BeV2ExistingTool.tsx`
- *Modified*:
  `apps/web/src/v3/observe/components/draw/ObserveDrawHost.tsx`,
  `apps/web/src/v3/observe/tools/ObserveTools.tsx`,
  `apps/web/src/v3/observe/components/measure/useMapToolStore.ts`

**Verification:**
- `NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit` from
  `apps/web` → exit 0.
- `npx vitest run src/store/__tests__/builtEnvironmentAdapters.test.ts
  src/store/__tests__/builtEnvironmentStoreV2.test.ts` → 32/32 pass.
- Manual MTC smoke deferred to user (Auto Mode).

**Plan posture:** Phase 5.2.A shipped. 5.2.B (V2-existing inline edit
schemas for the 23 new kinds), 5.3 (Plan taxonomy mirror), 5.4
(dashboard widening), Phase 6 (legacy-store deletion + final
tsc/test/lint sweep) remain.
