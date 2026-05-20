# 2026-05-10 — Phase 4.3 retired as superseded


The original Phase 4.3 plan in the BE unification ADR
(`2026-05-10-atlas-built-environment-unification.md`) called for
lifting `PlanVertexEditHandler.tsx` and `InlineFeaturePopover.tsx`
into a shared `apps/web/src/v3/builtEnvironment/` directory driven
by per-kind field schemas. Two concurrent commits delivered the
equivalent unification through a different shape:

- `ad9c514` — table-driven BE inline-edit dispatch in
  `PlanObserveSelectionHandler.tsx` (collapses eight near-identical
  layer-prefix if-blocks into a `BE_INLINE_EDIT_DISPATCH` walk).
- `85f0014` — Phase 4.4 BE schema registry at
  `apps/web/src/v3/builtEnvironment/schemas/beSchemaRegistry.ts`;
  Plan's `inlineEditSchemas.ts` and Observe's
  `annotationFieldSchemas.ts` now both consume option enums + titles
  + defaults from it.

Together with Phase 4.5 (annotation geometry registry, `62980eb`),
the BE-unification deduplication goal is achieved: both stages
dispatch through V2 store reads, share a single option-registry,
and use a single table for inline-edit dispatch. A physical lift
of `PlanVertexEditHandler.tsx` to `builtEnvironment/` was
considered and rejected — that handler still switches on
`zone | crop | paddock | structure`, three of which are
Plan-domain non-BE kinds, so co-location would just relocate a
Plan-domain switch without functional payoff. Phase 4.3 retired
as superseded.

Open remaining BE-unification work: Phase 5 (surface Plan-only
kinds in Observe draw rail + vice versa) and Phase 6 (flip
`ATLAS_BUILT_ENV_V2` flag default-on, delete legacy stores,
tsc/test/lint sweep).
