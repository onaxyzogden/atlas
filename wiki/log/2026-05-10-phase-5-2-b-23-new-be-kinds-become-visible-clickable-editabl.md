# 2026-05-10 — Phase 5.2.B: 23 new BE kinds become visible + clickable + editable in Observe


**Outcome.** Closes the loop opened by 5.2.A. The 23 new BE kinds now
render as 2D top-down fills/lines/circles in Observe, click-to-edit
opens the Phase-4.4 floating popover with a generic schema (state
toggle + label + notes), and the dispatch table is extension-ready —
adding a per-kind builder later is just dropping it into
`SCHEMA_BUILDERS` in `openBeInlineEdit.ts`.

**Mechanism.**
- New shared layer `apps/web/src/v3/builtEnvironment/layers/BeV2GenericLayer.tsx`
  — subscribes to `useBuiltEnvironmentStoreV2`, projects entities
  matching `projectId` AND `state` (default `'existing'`) AND
  `!LEGACY_OBSERVE_BE_KINDS.has(kind)` into three FeatureCollections
  (poly/line/point) → four MapLibre layers (poly fill + poly line + line
  + point) painted from the kind registry's `color`. Click on any of the
  three click-bearing layers calls the new `openBeInlineEditById(id,
  [lng, lat])` helper.
- New `LEGACY_OBSERVE_BE_KINDS` exported from
  `packages/shared/src/builtEnvironmentKinds.ts` — single source of
  truth for the 8 bespoke kinds. `ObserveDrawHost.tsx` and the new
  generic layer both consume it; the inline `BESPOKE_BE_KINDS` set in
  `ObserveDrawHost.tsx` was removed.
- New `buildGenericBeEditSchema(entity)` in
  `apps/web/src/v3/plan/layers/inlineEditSchemas.ts` — floor schema:
  state select (existing ↔ proposed) + label + notes; on save calls
  `useBuiltEnvironmentStoreV2.updateMetadata` and `setState` if state
  flipped.
- `openBeInlineEdit.ts` refactored: `SCHEMA_BUILDERS` widened to
  `Partial<Record<string, ...>>` with a `pickBuilder(kind)` helper
  that falls through to `buildGenericBeEditSchema` for any kind not in
  the bespoke 8. Existing `openBeInlineEditByObserveKind` (used by
  Observe's `SelectionFloater`) now also benefits from the fallback;
  new sibling `openBeInlineEditById(id, anchor?)` is the entry point
  for the new generic layer.
- `ObserveLayout.tsx` mounts `<BeV2GenericLayer …
  stateFilter="existing" />` alongside the existing 3D extrusion + GLB
  layers.

**Halo deferred.** The new layer doesn't extend Observe's selection
halo (`HALO_LAYER_LINE` / `HALO_LAYER_CIRCLE` filters in
`ObserveAnnotationLayers.tsx`). The floating popover anchored at the
click point provides immediate visual feedback; revisit if usage shows
the lack of selection ring is confusing.

**Per-kind enrichment deferred.** The 23 new kinds get the floor
schema only. Adding `barn.type = dairy|hay|equipment` or
`solar-array.kwhCapacity` is a per-kind drop-in — write the builder
in `inlineEditSchemas.ts` and register it in `SCHEMA_BUILDERS`.

**Files touched (Phase 5.2.B):**
- *Created*:
  `apps/web/src/v3/builtEnvironment/layers/BeV2GenericLayer.tsx`
- *Modified*:
  `packages/shared/src/builtEnvironmentKinds.ts` (export
  `LEGACY_OBSERVE_BE_KINDS`),
  `apps/web/src/v3/builtEnvironment/layers/index.ts` (export
  `BeV2GenericLayer`),
  `apps/web/src/v3/observe/ObserveLayout.tsx` (mount the new layer),
  `apps/web/src/v3/observe/components/draw/ObserveDrawHost.tsx`
  (consume lifted `LEGACY_OBSERVE_BE_KINDS` instead of inline set),
  `apps/web/src/v3/plan/layers/inlineEditSchemas.ts` (add
  `buildGenericBeEditSchema`),
  `apps/web/src/v3/builtEnvironment/inline/openBeInlineEdit.ts`
  (Partial dispatch + `pickBuilder` + new `openBeInlineEditById`).

**Verification:**
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` from
  `apps/web` → exit 0.
- `npx vitest run src/store/__tests__/builtEnvironmentAdapters.test.ts
  src/store/__tests__/builtEnvironmentStoreV2.test.ts` → 32/32 pass.
- Manual MTC smoke deferred to user.

**Plan posture:** Phase 5.2 closed (A + B). Remaining: 5.3 (Plan
taxonomy mirror — surface the 23 kinds in Plan rail), 5.4 (dashboard
widening to N kinds), Phase 6 (legacy-store deletion + final
tsc/test/lint sweep).
