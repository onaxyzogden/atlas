# 2026-04-28 — Needs & Yields graph: Phase 1 (shared package)


Shipped Phase 1 of the [Needs & Yields dependency graph
ADR](decisions/2026-04-28-needs-yields-dependency-graph.md) — the data
model + algorithms layer, no UI.

### What landed
- New subpath `@ogden/shared/relationships`:
  - `types.ts` — 13-value `ResourceType` const tuple, `EdgeSchema` Zod schema (with optional `ratio` ∈ [0,1]), `PlacedEntity<T>` and `RelationshipsState` value-object interfaces.
  - `catalog.ts` — `EntityType` union across the four canonical demand-module enums (Structure ∪ Utility ∪ CropArea ∪ Livestock = 54 types after dedup); exhaustive `OUTPUTS_BY_TYPE` and `INPUTS_BY_TYPE` `Record<EntityType, ResourceType[]>` seeds. The `Record` type makes adding a new enum value a typecheck failure here, enforcing exhaustiveness.
  - `flow.ts` — pure-function Edge CRUD (`addEdge`, `removeEdge`, `addEntity`, `removeEntity`, `emptyState`).
  - `cycle.ts` — `orphanOutputs`, `unmetInputs`, `closedLoops` (Johnson-style DFS with canonical-rotation dedup), `integrationScoreFromEdges` ∈ [0,1].
- `WEIGHTS['Ecological Integration'] = 0` slot reserved in [computeScores.ts](../packages/shared/src/scoring/computeScores.ts) — surfaceable but score-neutral until Phase 2 (canvas edge editor) ships.
- `./relationships` registered in `packages/shared/package.json` `exports`.
- 23 vitest cases in [relationships.test.ts](../packages/shared/src/tests/relationships.test.ts) — schema validation, catalog exhaustiveness, four cycle-algorithm contracts. Full shared suite: 159/159 green.

### Verification
- `pnpm --filter @ogden/shared run typecheck` clean.
- `pnpm --filter @ogden/shared test` 159/159.
- `pnpm -r run typecheck`: `packages/shared` ✓, `apps/api` ✓, `apps/web` ✗ — but the web errors are pre-existing in `src/v3/components/` (FiltersBar, DiagnoseRail, HomeRail, OperateRail) from commits `54070af`/`3a32a38`/`ff2d92f`, unrelated to relationships. Flagged for separate cleanup.

### ADR status
- [needs-yields-dependency-graph](decisions/2026-04-28-needs-yields-dependency-graph.md) flipped `proposed → accepted (Phase 1 of 3 — shared package shipped 2026-04-28)`.

### Deferred
- Phase 2 (canvas sockets/edges UI), Phase 3 (DB migration + persistence), then re-run Permaculture Scholar dialogue once #1+#2 ship.
- Pre-existing v3 web typecheck errors should be cleaned up separately.
