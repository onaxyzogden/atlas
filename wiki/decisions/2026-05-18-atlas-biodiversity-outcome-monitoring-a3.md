# 2026-05-18 — Biodiversity Outcome Monitoring (Sub-project A3)

**Status:** Implemented & committed (`bfb689fe` on `feat/atlas-permaculture`)
**Context source:** Approved plan continuing the Apricot Lane decomposition;
sibling of [[2026-05-17-atlas-regeneration-monitoring-a1]] (A1) and the
committed A2 Habitat Allocation (`c0e12776`).

## Decision

A3 closes the gap A2 deferred: A2 sets the **design-time spatial
area-budget** (≥10% habitat, charted vs `regen-habitat-pct`); A3 tracks
the **ecological outcome over time** — is native cover returning, are
invasives falling, is the bird/pollinator community arriving? It is the
ecological-response complement to A2's allocation decision, built by
**re-skinning A1's longitudinal trajectory spine** for a biodiversity
metric family.

Confirmed scope:
- Full **4-metric** biodiversity set (3 scored + 1 trend-only).
- **Additive only** — no DB migration, no new endpoint. `observations`
  JSONB is schemaless and the API never imports the metric registry, so
  new metric keys + a `domain` discriminator are front-end-only.
- **Covenant:** strictly ecological. No ecosystem-service / biodiversity-
  credit / offset / payment economics — that remains the separate
  covenant-bounded **Sub-project C** under Scholar Council. No riba/gharar
  framing in any criterion, copy, or code.

## Architecture (Option a — domain-discriminated single registry)

- `regenerationMetrics.ts` — added `MetricDomain =
  'regeneration' | 'biodiversity'` + a `domain` field on
  `MonitoredMetric`; backfilled the 6 existing metrics as `'regeneration'`;
  added 4 biodiversity keys (`native_veg_cover_pct`,
  `invasive_pressure_pct` [higherIsBetter:false],
  `bird_pollinator_species_count`, `beneficial_predator_index` [trend-only,
  goalCriterionId:null]) to the union, registry, and `TypedObservations`
  Zod object; exported `metricKeysForDomain(domain)`.
- `aggregate.ts` — `buildTrajectories(events, goalTargets, domain?)`:
  iterates `metricKeysForDomain(domain)` when given, else all keys
  (back-compat default — preserves the original behaviour for any other
  caller).
- **Regression fix:** the only A1↔A3 coupling was that `buildTrajectories`
  iterated *all* keys. `RegenerationMonitorCard` now passes `'regeneration'`
  explicitly and `domain="regeneration"` to `SampleEntryForm`; without it
  the existing card would have rendered biodiversity series post-merge.
- `SampleEntryForm.tsx` — `domain` prop drives the metric grid + submit
  loop, so each dashboard's entry form shows only its own family.
- `goalTreeTemplates.ts` — new `biodiversity-outcomes` sub-goal in
  `REGENERATIVE_FARM` (sibling of A2's `biodiversity-habitat`, **not**
  nested — allocation vs outcome are distinct semantic families):
  `bio-native-cover` (60%, yr7), `bio-invasive-pressure` (5%, yr5),
  `bio-species-richness` (45, yr9).
- `BiodiversityMonitorCard.tsx` — clone of `RegenerationMonitorCard`,
  re-skinned ("Plan · Biodiversity Outcomes"), passes `'biodiversity'`.
  `TrajectoryChart` reused unchanged.
- 15th `PlanModule` `biodiversity-monitor` wired through all six
  exhaustive touchpoints (`types.ts`, `PlanViewContext.tsx`,
  `PlanChecklistAside.tsx`, `planModulePalette.ts`,
  `planModuleArtifactPresence.ts`, `PlanModuleSlideUp.tsx`) — the `never`
  switch + `Record<PlanModule,_>` maps enforce completeness.

## Verification

- `@ogden/shared` `tsc`: clean. `apps/web` `tsc --noEmit`: zero errors on
  any A3 file (only a pre-existing, unrelated `useFlowEndpointOptions.test.ts`
  Paddock-type drift remains, untouched by A3).
- Vitest 16/16: new `biodiversity.aggregate.test.ts` (5) proves domain
  isolation both directions + invasive-pressure falling-curve on-track;
  existing `aggregate.test.ts` (11) green — its hardcoded registry-size
  constant updated 6 → 10 (the default-param behaviour is unchanged; the
  registry legitimately grew).
- `vite build`: succeeded (A1's blocking concurrent breakage is resolved
  on the current branch HEAD).
- **Live browser (DOM-verified, screenshot tool unresponsive — disclosed,
  not faked):** Biodiversity card mounts with correct copy; its entry form
  shows exactly the 4 biodiversity metrics and **zero** regeneration
  metrics. **Regression check passed** — the Regeneration form shows all 6
  regen metrics and **zero** biodiversity metrics. Sample persistence
  needs the Fastify/Postgres backend the frontend-only preview doesn't
  serve, so trajectory rendering is covered by the unit tests rather than
  the live UI; `preview_screenshot` timed out 2×30s (same MapLibre/WebGL
  hang as prior sessions) so no screenshot was captured.

## Consequences

- The A-series A (ecological monitoring & habitat) track is now complete:
  A1 (regeneration trajectories), A2 (habitat allocation), A3
  (biodiversity outcomes). B/C/D remain deferred to their own specs.
- Any future monitored-metric addition must declare a `domain`; the
  `never`-guarded switch + `Record<PlanModule,_>` maps will fail tsc if a
  new PlanModule misses a touchpoint.
- `goalCriterionId`s in `regenerationMetrics.ts` mirror criterion ids in
  `goalTreeTemplates.ts` (`bio-*`); they must be changed together.
