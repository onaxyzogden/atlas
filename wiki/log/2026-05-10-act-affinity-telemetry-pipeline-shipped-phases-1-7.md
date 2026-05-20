# 2026-05-10 — Act-affinity telemetry pipeline shipped (Phases 1–7)


**Branch.** `feat/atlas-permaculture`.

**Scope.** The seven-phase plan from the 2026-05-09 pen-and-paper sanity
review landed end-to-end: the v1 affinity table now has a durable
read/write pipeline so the next ranking decision rides on real-steward
signal, not paper personas.

- **Phase 1** — Migration `024_act_interaction_events.sql` (project_id,
  user_id, session_id, occurred_at, project_type, module, event_type,
  payload jsonb) plus three indexes; CHECK constraint pins the
  7-event enum.
- **Phase 2** — Fastify plugin `routes/telemetry/index.ts` with
  `POST /api/v1/telemetry/act-interactions` (batched insert, max 100,
  per-event-type Zod superRefine) and
  `GET /api/v1/telemetry/act-interactions/aggregate` (server-grouped on
  `(project_type, module, event_type)`, filtered by `req.userId`).
  OpenAPI entries + Vitest coverage in `tests/telemetry.test.ts`.
- **Phase 3** — Shared Zod schemas + types in
  `packages/shared/src/schemas/actTelemetry.schema.ts`;
  `ACT_INTERACTION_EVENT_TYPES` is the single source of truth that the
  SQL CHECK mirrors by hand.
- **Phase 4** — Client buffer in `apps/web/src/lib/actInteractionLog.ts`:
  module-level queue, 1500 ms idle / 50-event ceiling / sendBeacon
  triggers, capped 3-retry, `useActTelemetry(ctx)` hook, full Vitest
  fake-timer spec. `apiClient.telemetry.{post,get}` wired.
- **Phase 5** — Four instrumentation sites: `ActModuleBar` (3-way
  tile_select/open/close), `ActTools` (quick_log_click w/ toolId),
  `ActLayout` (slide-up dwell via two refs + transition guard),
  `TodaysPriorities` + `AlertsPanel` (panel_row_visible w/ rowIds-hash
  dedupe).
- **Phase 6** — `AffinityTelemetryDashboard.tsx` 6×7 grid colored by
  |observed rank − v1 rank| (green/yellow/orange/red), reachable via
  `dev-affinity-telemetry` section behind
  `VITE_ATLAS_TELEMETRY_ENABLED`; sidebar Dev group renders only when
  the flag is on.
- **Phase 7** — ADR
  [2026-05-10-atlas-act-affinity-telemetry-pipeline.md](decisions/2026-05-10-atlas-act-affinity-telemetry-pipeline.md);
  cross-link added to the predecessor v1 sanity-review ADR.

**Privacy posture.** `user_id` is collected; no consent surface yet.
Flag defaults `'true'` only in dev builds. A consent banner is the
explicit precondition before any non-developer steward uses the
deployed app — called out in the ADR follow-ups.

**Out of scope.** Affinity-table revisions (wait for ≥30 sessions × ≥2
project types of signal); schedule-module ranking; cross-user
aggregation; time-series breakdown; sankey/sequence visualizations.

**Verification handed to user.** Apply the migration
(`pnpm --filter api migrate`), drive ~2 min of Act-stage
interactions across multiple project types, confirm POST batches
fire after 1.5 s idle, open the dashboard and see the populated 6×7
grid. `pnpm -r test` and `pnpm -r typecheck` were run in-session and
came back clean for the touched modules.
