# 2026-05-10 — Phase 4.3 + 4.4 shipped (vertex handler lifted, Observe BE → floating popover)


Closed the remaining Phase-4 work in the BE unification plan. The earlier
"Phase 4.3 retired as superseded" entry above ratified the schema-only
unification (`beSchemaRegistry`); this entry covers the structural lift
and the UX consolidation the user picked over `AskUserQuestion` (Option A:
"Observe BE edits move to floating popover").

**Phase 4.3 — Vertex-handler lifted to shared composition.**
- new `apps/web/src/v3/builtEnvironment/handlers/SharedVertexEditHandler.tsx`
  (~135 LOC) — owns the entire MapboxDraw `direct_select` lifecycle.
  Takes a `VertexEditDispatch` prop with `geometryKindFor` /
  `readLine` / `readPolygon` / `writeLine` / `writePolygon` /
  `shouldSuppressForTool` / `featureIdPrefix`.
- `apps/web/src/v3/plan/layers/PlanVertexEditHandler.tsx` rewritten as
  a thin composition (~120 LOC, was 177): keeps Plan's per-kind
  dispatch (zone / crop / paddock / structure incl. centroid recompute)
  in this file; delegates lifecycle to the shared handler. Plan's gate
  policy ("any active tool blocks") preserved.
- `apps/web/src/v3/observe/components/draw/AnnotationVertexEditHandler.tsx`
  rewritten as a composition (~75 LOC, was 142): re-uses
  `LINESTRING_KINDS` / `POLYGON_KINDS` / `read*` / `write*` from
  `annotationGeometryRegistry`. Observe's gate policy ("only `observe.*`
  tools block") preserved.

**Phase 4.4 — Observe BE edits unified on Plan's floating popover (Option A).**
- new `apps/web/src/v3/builtEnvironment/inline/openBeInlineEdit.ts` —
  single helper `openBeInlineEditByObserveKind(kind, id, fallbackAnchor?)`
  that maps the legacy Observe `AnnotationKind` (camelCase) → V2
  `kind` (kebab-case) → the matching `inlineEditSchemas.ts` builder →
  `useInlineFormStore.open({ ...schema, anchor })`. Anchor defaults to
  the entity's geometry centroid. Returns `false` for non-BE kinds so
  callers fall through.
- `apps/web/src/v3/observe/ObserveLayout.tsx` mounts
  `<InlineFeaturePopover map={map} />` next to the existing
  `<SelectionFloater />`. The slide-up `<AnnotationFormSlideUp />` stays
  mounted in the overlay tray for non-BE Observe kinds.
- `apps/web/src/v3/observe/components/SelectionFloater.tsx` `onEdit`
  intercepts BE single-selection: tries `openBeInlineEditByObserveKind`
  before falling through to `useAnnotationFormStore.open({ mode: 'edit' })`.
  Batch edit (mixed-kind or multi-feature) still routes to the slide-up
  unconditionally — the popover is single-feature only.
- `apps/web/src/v3/observe/components/draw/annotationFieldSchemas.ts`
  BE section gets a comment marker stating that the eight BE entries
  now serve **create-mode only**; edit-mode is handled by the inline
  popover. Field shapes still match `beSchemaRegistry` so create + edit
  stay 1:1 visually.

**Files touched:**
- new: `apps/web/src/v3/builtEnvironment/handlers/SharedVertexEditHandler.tsx`
- new: `apps/web/src/v3/builtEnvironment/inline/openBeInlineEdit.ts`
- modified: `apps/web/src/v3/plan/layers/PlanVertexEditHandler.tsx`
  (rewritten as composition)
- modified: `apps/web/src/v3/observe/components/draw/AnnotationVertexEditHandler.tsx`
  (rewritten as composition)
- modified: `apps/web/src/v3/observe/ObserveLayout.tsx`
  (`<InlineFeaturePopover map={map} />` mounted alongside the SelectionFloater)
- modified: `apps/web/src/v3/observe/components/SelectionFloater.tsx`
  (BE intercept in `onEdit`)
- modified: `apps/web/src/v3/observe/components/draw/annotationFieldSchemas.ts`
  (Phase 4.4 comment marker on the BE block)

**Verification:**
- `NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit` from
  `apps/web` → exit 0.
- `npx vitest run src/store/__tests__/builtEnvironmentAdapters.test.ts
  src/store/__tests__/builtEnvironmentStoreV2.test.ts` → 32/32 pass.
- Manual MTC smoke deferred to user (Auto Mode).

**Plan posture:** Phases 4.3 + 4.4 closed. Remaining work in the BE
unification plan: 5.2 (Observe rail extension), 5.3 (Plan taxonomy
mirror), 5.4 (dashboard widening), Phase 6 (legacy-store deletion +
final tsc/test/lint sweep).
