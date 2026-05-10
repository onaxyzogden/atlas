# Act-affinity telemetry — durable read/write pipeline for real-steward signal

**Date:** 2026-05-10
**Branch:** feat/atlas-permaculture
**Status:** Implemented (Phases 1–6 landed; Phase 7 = this ADR)
**Predecessor:** [2026-05-09-atlas-act-affinity-v1-sanity-review.md](2026-05-09-atlas-act-affinity-v1-sanity-review.md)

## Why this exists

The pen-and-paper sanity review of the v1 project-type → Act module
affinity table closed with a single recommendation: *ship nothing
until real-steward telemetry exists.* The 4/6 archetypes that matched
v1 are still pen-and-paper; the 2/6 that diverge (homestead,
multi-enterprise) are pen-and-paper too. There is no honest path to a
v2 ranking without instrumented behaviour.

The repo had no analytics infrastructure. No `track()`, no
`/v1/telemetry`, no consent surface, no client-side event buffer. The
question this ADR answers: *what's the smallest end-to-end pipeline
that captures real Act-stage interaction from the next session forward
and renders it against the v1 ranking?*

## Decision

Build a minimum durable pipeline — backend write path, schema-checked
ingestion, server-side aggregate, client-side buffered emission, four
instrumentation sites, and a flag-gated read page. Ship it in
seven phases, each its own commit, with phase gates so partial
landings still accumulate signal.

## Architecture

```
ActModuleBar  ─┐
ActTools      ─┤   recordInteraction(ctx, evt)
ActLayout     ─┼──▶  actInteractionLog.ts  ──▶  api.telemetry
TodaysPriori. ─┤   (in-mem queue + 1.5s          .postActInteractions
AlertsPanel   ─┘    idle / 50-event / beacon)

DashboardRouter ──▶  AffinityTelemetryDashboard.tsx
                      (api.telemetry.getActAffinityAggregate)
                                  │
                                  ▼
                  POST /api/v1/telemetry/act-interactions
                  GET  /api/v1/telemetry/act-interactions/aggregate
                                  │
                                  ▼
                  Postgres: act_interaction_events
                  (project_id, user_id, session_id, occurred_at,
                   project_type, module, event_type, payload jsonb)
```

## Schema

Migration: [`apps/api/src/db/migrations/024_act_interaction_events.sql`](../../apps/api/src/db/migrations/024_act_interaction_events.sql)

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | gen_random_uuid() |
| project_id | uuid → projects(id) ON DELETE CASCADE | required |
| user_id | uuid → users(id) ON DELETE CASCADE | required, never trusted from client |
| session_id | text | UUID v4 from `crypto.randomUUID()`; not persisted client-side |
| occurred_at | timestamptz | client wall clock at emit |
| received_at | timestamptz default now() | server stamp for skew detection |
| project_type | text NULLABLE | matches `PlanProjectTypeId` or null |
| module | text NOT NULL | matches `ActModuleId` |
| event_type | text NOT NULL | CHECK against the 7-enum |
| payload | jsonb default '{}'::jsonb | per-eventType extras |

Indexes: `(project_id, occurred_at DESC)`, `(project_type, module, event_type)`,
`(session_id, occurred_at)`.

The 7-event CHECK constraint mirrors the Zod enum in
[`actTelemetry.schema.ts`](../../packages/shared/src/schemas/actTelemetry.schema.ts) —
both are sources of truth in their own layer and must be kept in
lock-step by hand.

## Endpoint contract

`POST /api/v1/telemetry/act-interactions` — body
`{ events: ActInteractionEventInput[] }`, max 100 events per batch.
Auth: `[authenticate]` only — telemetry is per-user, not per-project,
and `user_id` is taken from `req.userId`, never from the client.
Per-event payload validation is per-event-type via Zod's
`superRefine` (e.g. `quick_log_click` requires `toolId`,
`slideup_close` requires `dwellMs`). FK violations on bad
`project_id` skip the single event and log a warning — telemetry is
best-effort.

`GET /api/v1/telemetry/act-interactions/aggregate?projectId&from&to` —
returns `{ rows: ActAffinityAggregateRow[] }` grouped server-side
on `(project_type, module, event_type)`. Filtered by `req.userId`.
`avgDwellMs` is `AVG(NULLIF((payload->>'dwellMs')::int, 0))`.

OpenAPI entries land in [`apps/api/openapi.yaml`](../../apps/api/openapi.yaml).
Tests in [`apps/api/src/tests/telemetry.test.ts`](../../apps/api/src/tests/telemetry.test.ts).

## Client buffer

[`apps/web/src/lib/actInteractionLog.ts`](../../apps/web/src/lib/actInteractionLog.ts)

- Module-level in-memory queue (`QueuedEvent[]`).
- `recordInteraction(ctx, input)` stamps `sessionId`, `occurredAt`,
  `projectId`, `projectType`, then schedules a flush.
- Three flush triggers: 1500 ms idle (debounced), 50-event ceiling,
  `beforeunload`/`visibilitychange` via `navigator.sendBeacon`.
- Failed POSTs retain events with capped retry (max 3) — drop after
  that to prevent an unbounded leak across the session.
- `useActTelemetry(ctx)` returns a `record(input)` bound to the
  current `(projectId, projectType)` so call-sites stay tidy.
- Vitest spec exercises all three flush triggers + retry semantics
  with fake timers.

## Instrumentation sites

Four sites in the Act stage, each emitting at the smallest hook that
captures the intent without polluting the file:

| Site | Hook | Event types |
|---|---|---|
| [`ActModuleBar.tsx`](../../apps/web/src/v3/act/ActModuleBar.tsx) | `handleTileClick` | `tile_select` / `tile_open` / `tile_close` |
| [`ActTools.tsx`](../../apps/web/src/v3/act/ActTools.tsx) | `handleClick` | `quick_log_click` (payload: toolId) |
| [`ActLayout.tsx`](../../apps/web/src/v3/act/ActLayout.tsx) | `useEffect` on (`slideUpOpen`, `validModule`) | `slideup_open` / `slideup_close` (payload: dwellMs) |
| [`TodaysPriorities.tsx`](../../apps/web/src/v3/act/ops/TodaysPriorities.tsx) + [`AlertsPanel.tsx`](../../apps/web/src/v3/act/ops/AlertsPanel.tsx) | `useEffect` on `rowIds.join('|')` hash | `panel_row_visible` (payload: panel, modules[], rowIds[]) |

Each site uses `useActTelemetry({ projectId, projectType })` where
`projectType` comes from
[`useEffectivePlanProjectType`](../../apps/web/src/v3/plan/hooks/useEffectivePlanProjectType.ts) —
the same hook that powers the v1 ranking. The hash dedupe on
`panel_row_visible` prevents emit-storm on store updates that produce
an identical visible set.

Slide-up dwell uses two refs (`slideUpOpenRef`, `slideUpOpenSinceRef`)
to capture `openedAt` on the false→true transition and emit
`slideup_close` with `dwellMs` on the true→false transition. The
explicit transition guard avoids React 18 strict-mode double-fire.

## Read view

[`AffinityTelemetryDashboard.tsx`](../../apps/web/src/features/dashboard/pages/AffinityTelemetryDashboard.tsx)
— a 6×7 grid (6 project types × 7 Act modules including `schedule`).
Cell color encodes the distance between observed touch-count rank and
v1 affinity rank from
[`projectTypeModuleAffinity.ts`](../../apps/web/src/v3/act/data/projectTypeModuleAffinity.ts):
green (Δ=0), yellow (Δ=1), orange (Δ=2), red (Δ≥3). `schedule` is
absent from v1 so its column always renders as muted no-signal — its
real touch frequency surfaces for free as soon as ≥1 session lands.

The page is reachable via section `dev-affinity-telemetry`. The
sidebar entry lives in a dev-only group below the canonical
accordion, gated by `VITE_ATLAS_TELEMETRY_ENABLED` so it disappears
in production builds.

## Privacy posture

`user_id` is collected with each event. There is no consent surface
yet. Until one exists, `VITE_ATLAS_TELEMETRY_ENABLED` defaults to
`'true'` only in dev builds (`import.meta.env.DEV`) and `'false'`
elsewhere. When the flag is unset or `'false'`, both
`recordInteraction` and the sidebar entry are no-ops.

**Precondition for non-developer use:** a consent banner — explicit
acceptance, displayed before any event emits, with the option to opt
out and have the buffer become a permanent no-op for that user. A
follow-up task. Not in scope for this pass.

## What this does *not* do

- **Affinity-table revisions.** The pen-and-paper review's "ship
  nothing" recommendation still applies. v2 ranking waits for ≥30
  sessions of signal across at least 2 distinct project types.
- **Schedule-module ranking.** Telemetry will surface `schedule`
  touch frequency as a side effect; the ranking decision can then
  be made on data, not theory.
- **Cross-user aggregation.** The aggregate query filters by
  `req.userId`. Team-wide rollups are a follow-up if the user count
  grows past one or two.
- **Time-series breakdown.** `occurred_at` supports hour-of-day or
  day-of-week views later, but v1 dashboard is flat totals.
- **Sankey / sequence visualization** of `slideup_open → tile_close`
  flows. Useful later for "which modules drive into which" but the
  v1 dashboard sticks to a 6×7 grid.

## Out of scope (explicit non-decisions)

- Whether `network` belongs above `harvest` for educational_farm.
  That is the kind of question the dashboard exists to *eventually*
  answer; this pass only builds the read path.
- Consent-banner design. Explicitly deferred. The flag-gate is the
  bridge.
- Whether to persist queued events to localStorage on flush failure.
  Today they retry in memory and drop after 3 failures. If that
  turns out to lose meaningful signal in real use, revisit.

## Risks accepted

| Risk | Mitigation in place |
|---|---|
| `panel_row_visible` floods the queue on rapid store updates | Hash dedupe in the `useEffect` deps |
| Telemetry collection deployed without consent UX | `VITE_ATLAS_TELEMETRY_ENABLED` defaults `'false'` outside dev; sidebar entry hidden under same flag |
| `navigator.sendBeacon` payload exceeds 64KB on long sessions | 50-event ceiling caps a flush at ~10KB serialized |
| Slide-up dwell `useEffect` double-fires under React 18 strict mode | Refs + explicit prev→curr transition guard |

## Definition of Done

All seven phases shipped, each behind its own commit:

1. ✅ `024_act_interaction_events.sql` migration + indexes
2. ✅ `POST` + `GET` routes, OpenAPI entries, Vitest spec
3. ✅ Shared Zod schemas + types in `@ogden/shared`
4. ✅ Frontend buffer + `apiClient.telemetry.*` + Vitest spec
5. ✅ Four instrumentation sites
6. ✅ Dashboard read page + sidebar entry (flag-gated)
7. ✅ This ADR + log entry + cross-link from the v1 sanity review

The user can click around the Act stage for ~2 minutes, navigate to
the dashboard, and see populated 6×7 cells immediately after — no
batch jobs, no waiting.

## Follow-ups

- [ ] Consent banner — precondition before any non-developer steward
      uses the deployed app.
- [ ] After ≥30 sessions × ≥2 project types: a v2 affinity-table
      proposal ADR with the dashboard screenshot inline as evidence.
