# 2026-04-28 — Needs & Yields graph: Phase 3 (server persistence + scoring weight)


### Done

Closed out the [Needs & Yields ADR](decisions/2026-04-28-needs-yields-dependency-graph.md) with server-of-record persistence and the integration-weight lift:

- **Migration 016** (`apps/api/src/db/migrations/016_project_relationships.sql`) — `project_relationships` table with FK CASCADE on project, UNIQUE on `(project_id, from_id, from_output, to_id, to_input)` mirroring the in-memory dedup, CHECK on the 13-value resource enum (kept in lockstep with `ResourceTypeSchema` via the shared test suite), CHECK no self-loop, CHECK ratio in [0,1].
- **API routes** (`apps/api/src/routes/relationships/index.ts`) — `GET/POST/DELETE /api/v1/projects/:id/relationships` with role gating (any role to read; owner/designer to write). `EdgeSchema.parse` is wrapped in a local `parseEdge` that rethrows as `ValidationError` so the global handler returns a clean 422 regardless of zod-instance identity across workspace packages. POST uses `ON CONFLICT DO UPDATE SET ratio` to honor the table's UNIQUE constraint without surprising callers. Smoke test covers GET (empty + populated), POST (valid + invalid resource), DELETE (204 + 404).
- **Web sync** (`apps/web/src/features/map/useRelationshipsSync.ts`) — hydrate-then-drain hook mounted by `RelationshipsOverlay`. Pending mutations live in the persisted store as a per-project FIFO queue (`pendingByProject`). Drains are sequential; 4xx responses log + drop, 5xx/network errors requeue at head and pause until the next interval / `online` event. localStorage stays canonical so offline writes never block the canvas.
- **Scoring weight lift** (`packages/shared/src/scoring/computeScores.ts`) — Ecological Integration `0 → 0.10`. Redistribution drawn per the Permaculture Scholar's recommendation: Design Complexity `0.10 → 0.05` (P8 makes integration the precise measure of complexity), Regenerative Potential `0.15 → 0.12` (P6 cycling = engine of regeneration), Agricultural Suitability `0.15 → 0.13` (P3 cycling boosts yields). Sum stays at 1.00. Rail badge updated from "weight 0 — informational" to "weight 0.10 · live".

### Verification
- `packages/shared` — 7 files / 159 tests pass (no regression on relationships, scoring, or schemas).
- `apps/api` — `relationships.test.ts` 6/6 pass; `tsc --noEmit` clean.
- `apps/web` — `relationshipsStore.test.ts` 5/5 pass; relationships-touching files type-clean. Pre-existing v3 typecheck errors (FiltersBar, DiagnoseRail, HomeRail, OperateRail) are unrelated.

### Awaiting
- Run `pnpm --filter @ogden/api migrate` against staging when next deploying — migration 016 is idempotent on a clean DB but has not been applied to long-running environments.
