# 2026-05-10 — Phase 4.5: repair broken Observe edit paths (4 remaining BE kinds)


Closed the Phase 0 regression where buried-utilities, fences, gates,
and driveways fell through to the generic "Edit in Observe →" link
popover instead of opening the inline-edit popover used by the other
four BE kinds. Routes all writes through
`useBuiltEnvironmentStoreV2.updateMetadata()`.

**Schema builders (`apps/web/src/v3/plan/layers/inlineEditSchemas.ts`):**
- `buildBuriedUtilityEditSchema` — subtype (water_main | gas | fibre
  | sewer | other) + label + notes; writes to `existing.subtype`.
- `buildFenceEditSchema` — subtype (barbed | page_wire | electric |
  privacy | other) + label + notes; writes to `existing.subtype`.
- `buildGateEditSchema` — label + notes only (no subtype).
- `buildDrivewayEditSchema` — surface (gravel | paved | dirt | other)
  + label + notes; writes to `existing.surface`.

All four mirror the existing `buildPowerLineEditSchema` template and
the option enums match `annotationFieldSchemas.ts` verbatim.

**Dispatch (`apps/web/src/v3/plan/draw/PlanObserveSelectionHandler.tsx`):**
- Replaced eight near-identical `if (top.layer.id.startsWith(…))`
  blocks with a `BE_INLINE_EDIT_DISPATCH` table that pairs each
  layer-id prefix with the V2 entity kind and the matching schema
  builder. The runtime loop in `onMouseDown` walks the table once
  per click. Adds the four new prefixes alongside the existing
  buildings / wells / septics / power-lines entries.

**Verification:**
- `npx tsc --noEmit` from `apps/web` → exit 0 (8 GB heap required
  on this machine; default 4 GB OOMs during a full project check).
- `npx vitest run src/store/__tests__/builtEnvironmentAdapters.test.ts`
  → 16/16 pass.
- Preview-stage click-through deferred to next session.

**Unblocks:**
- Phase 4.4 registry-driven schema work (now that every BE kind has
  an `inlineEditSchemas` builder, the registry has a complete source
  of truth to consume).
- Phase 4.3 generalization of `PlanVertexEditHandler` /
  `InlineFeaturePopover` into BE-aware variants.
