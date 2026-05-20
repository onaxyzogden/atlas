# 2026-05-17 — Regeneration Monitoring (Sub-project A1)


Apricot Lane replication ask brainstormed → decomposed into 4 sub-projects
(A ecological monitoring, B biological systems, C transition economics
[covenant-bounded], D operating loop) on a monitoring-first spine. Only
**A1** (monitoring spine + dashboard) built this session; B/C/D + A2 habitat
deferred to own specs. Confirmed: generic capability, **client-side
aggregation only — no DB migration, no new endpoint** (server pivot +
JSONB index documented as deferred in `regenerationMonitor/NOTES.md`).
Delivered: `packages/shared/.../regenerationMetrics.ts` (typed Zod
`.passthrough()` narrowing of the permissive `regeneration_events.observations`
JSONB — zero schema change; metric→goal `goalCriterionId` map; migration-015
sync intact); pure unit-tested `regenerationMonitor/aggregate.ts`
(year-0 = earliest sample, linear pace line, verdict
on-track/lagging/no-target/insufficient-data, lower-is-better inverted);
`TrajectoryChart.tsx` (dependency-free SVG), `SampleEntryForm.tsx` (writes
`observation` event via existing `regenerationEventStore.createEvent`),
`RegenerationMonitorCard.tsx`. Registered `plan-regeneration-monitor` in
`V3PlanPage.tsx`; PlanHub grew 8→9 modules (Module 9). Gate: shared tsc
clean, web tsc clean on touched files, vitest 11/11. **`vite build`
blocked by UNRELATED pre-existing breakage** — `PlanDataLayers.tsx` imports
`flowConnectorStore.js` which a concurrent branch refactor staged for
deletion (`D`); no A1 file touches it; not fixed (owned elsewhere, branch
rebased out-of-band). No browser screenshot (disclosed not faked: build
graph broken by that import; running preview server bound to a different
worktree). New ADR
`decisions/2026-05-17-atlas-regeneration-monitoring-a1.md` + index pointer
+ this entry.
