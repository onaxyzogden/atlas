# Regeneration Monitor — implementation notes

Sub-project **A1** of the Apricot Lane replication initiative: the
longitudinal monitoring spine + dashboard. B (biological systems), C
(transition economics, covenant-bounded), and D (operating loop) depend on
this and ship as their own specs.

## Architecture

- `aggregate.ts` — pure, deterministic, unit-tested. `RegenerationEvent[]`
  + a flattened goal-target lookup → per-metric / per-zone trajectories
  with an on-track / lagging verdict. No React, no network, no store.
- `TrajectoryChart.tsx` — dependency-free SVG line chart (pace line +
  deadline marker). Presentational only.
- `SampleEntryForm.tsx` — writes an `observation`-type event via the
  existing `regenerationEventStore.createEvent`.
- `../RegenerationMonitorCard.tsx` — orchestrator card, registered as
  `plan-regeneration-monitor` in `V3PlanPage.tsx` and surfaced as Module 9
  in `PlanHub.tsx`.

The metric vocabulary lives in
`packages/shared/src/schemas/regenerationMetrics.ts` — a typed *narrowing*
of the deliberately-permissive `observations` JSONB. No DB migration, no
schema change. Keep its `goalCriterionId` values in sync with
`apps/web/src/v3/plan/data/goalTreeTemplates.ts` (REGENERATIVE_FARM) and
keep `regenerationEvent.schema.ts` ⇄ migration 015 CHECK sync intact.

## Deferred optimization (out of scope for A1)

Aggregation is **client-side** over the existing list endpoint. When sample
volume grows this should move server-side:

1. A pivot endpoint (e.g. `GET /projects/:id/regeneration-metrics`) that
   does the per-metric / per-zone rollup in SQL and returns trajectories
   directly, so the client doesn't pull every raw event.
2. A JSONB GIN/expression index on `regeneration_events.observations` for
   the monitored metric keys to keep that pivot cheap.

Both are documented-but-not-built per the approved A1 plan: ship the
surfacing layer first, optimize when the data justifies it.
