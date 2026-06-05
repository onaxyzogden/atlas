# 2026-05-18 — D0 implemented: the operating-loop WorkItem spine


**Branch.** `feat/atlas-permaculture` (working tree, uncommitted).

Built D0 per the approved Session Execution Plan executing the ratified
D0–D5 roadmap. Supersede-not-wrap: a canonical client-first `WorkItem`
model ([[2026-05-18-atlas-d0-workitem-spine]]) now holds all five legacy
planned-work sources (phase tasks, field tasks, maintenance, scheduled
livestock moves, nursery batches), migrated idempotently with legacy
stores retained for rollback; append-only event-logs gain an additive
`workItemId?` proof-link. Goal Compass rewired to emit `WorkItem[]` with
the generated-vs-overridden contract re-implemented identically. Clean
read-side cut-overs done: `useEventAggregator`, `TodaysPriorities`,
`PlanExecutionTrackerCard` (the D0 proof surface). One lossy carry
(`ScheduledLivestockMove.direction`) found and fixed mid-execution.

Deliberately deferred the deep CRUD/domain readers (Maintenance, Rotation,
Nursery, Phasing) — they need coupled writer cut-overs + surface a second
lossy gap (`seedSaving`), exceeding D0's anti-scope-creep line; legacy
retained-authoritative keeps them correct → D0.1.

Verified: shared+web tsc clean for all D0 files; web vitest **1140/1141**
(the one failure is a pre-existing A2/B1 `syncManifest` coverage-guard
gap, proven by clean-tree stash repro — not D0); `vite build` ok (PWA
generated; `pnpm build`'s plain-tsc OOM is a heap-script issue, not code);
live Act stage on `mtc` renders the unified 31-task spine ledger +
aggregator/priorities off the spine, zero console errors.
`preview_screenshot` timed out on the disclosed MapLibre/WebGL hang —
DOM-text verification of record.
