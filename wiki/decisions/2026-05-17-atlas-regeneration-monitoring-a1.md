# 2026-05-17 — Regeneration Monitoring (Sub-project A1)

**Status:** Implemented (build-blocked by unrelated branch breakage — see Verification)
**Context source:** Brainstorming session on replicating the Apricot Lane Farms
ecosystem-based farming model (`~/Downloads/Apricot Lane Farm.md`, whose
empirical core is the MDPI 9-year longitudinal soil study).

## Decision

The Apricot Lane replication ask was decomposed into four sub-projects on a
**monitoring-first spine**:

- **A** Ecological monitoring & habitat
- **B** Biological systems engineering
- **C** Transition economics (covenant-bounded — riba/gharar handled in C's own spec)
- **D** End-to-end operating loop

Only **A1 (the monitoring spine + dashboard)** was specced and built this
session. B/C/D and A2 (habitat allocation) are deferred to their own specs.

Confirmed scope decisions:
- Generic, reusable capability — not a specific parcel.
- **Client-side aggregation only.** No DB migration, no new endpoint. A
  server-side pivot endpoint + JSONB index is documented as a deferred
  optimization (see `apps/web/src/features/plan/regenerationMonitor/NOTES.md`).
- A1 is purely ecological monitoring — no financial/capital framing, so no
  riba/gharar exposure in this spec.

## Architecture

- `packages/shared/src/schemas/regenerationMetrics.ts` — typed metric
  vocabulary (`soil_om_pct`, `living_cover_pct`, `infiltration_pct`,
  `microbial_biomass_index`, `water_stable_aggregate_pct`, `bulk_density`)
  as a Zod `.passthrough()` **narrowing** of the deliberately-permissive
  `regeneration_events.observations` JSONB. No schema/DB change. Each metric
  optionally maps to a `REGENERATIVE_FARM` goal-tree `goalCriterionId`;
  `regenerationEvent.schema.ts` ⇄ migration 015 CHECK sync left intact.
- `apps/web/src/features/plan/regenerationMonitor/aggregate.ts` — pure,
  deterministic, unit-tested. Events + flattened goal-target lookup →
  per-metric / per-zone trajectories. "Year 0" = earliest dated sample;
  deadline interpreted as years after baseline; linear pace line;
  verdict `on-track | lagging | no-target | insufficient-data`;
  lower-is-better inverted (bulk density).
- `TrajectoryChart.tsx` (dependency-free SVG, pace + deadline marker),
  `SampleEntryForm.tsx` (writes an `observation` event via the existing
  `regenerationEventStore.createEvent` — no new route),
  `RegenerationMonitorCard.tsx` (orchestrator).
- Registered as `plan-regeneration-monitor` in `V3PlanPage.tsx`; surfaced
  as **Module 9** in `PlanHub.tsx` (Plan hub grew 8 → 9 modules).

## Verification

- `@ogden/shared` `tsc`: clean. `apps/web` `tsc --noEmit`: clean on all
  touched files. Vitest `aggregate.test.ts`: 11/11 green (baseline pick,
  per-zone grouping/sort, site-wide default, on-track/lagging, post-deadline
  clamp, single-sample insufficient-data, no-target, lower-is-better).
- **`vite build` blocked, not by this work.** Build fails resolving
  `../../../store/flowConnectorStore.js` from
  `src/v3/plan/layers/PlanDataLayers.tsx`. `git status` shows
  `flowConnectorStore.ts` staged for **deletion (`D`)** by a concurrent
  in-flight refactor on `feat/atlas-permaculture` (same one swapping
  `wasteVectors`→`materialFlows`/`closedLoopStore`). No A1 file references
  `flowConnectorStore` or `PlanDataLayers`. Not touched — per memory the
  branch is rebased out-of-band and that refactor is owned elsewhere.
- **No browser screenshot** (disclosed, not faked): build graph broken by
  the unrelated import above, and the only running preview server is bound
  to a different git worktree. Live UI verification is gated on the
  unrelated breakage being resolved by whoever owns that refactor.
