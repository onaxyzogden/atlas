# 2026-04-28 — Needs & Yields graph: Phase 2 (canvas edges)


### Done

Shipped Phase 2 of the [Needs & Yields dependency graph
ADR](decisions/2026-04-28-needs-yields-dependency-graph.md) — the live-canvas
socket and edge-draw UI behind `FEATURE_RELATIONSHIPS`. Phase 1 landed the
shared-package data model; Phase 2 surfaces it on the v2 map.

New web modules:

- [`apps/web/src/store/relationshipsStore.ts`](../apps/web/src/store/relationshipsStore.ts) — Zustand+persist project-scoped edge graph; validates via `EdgeSchema.safeParse` on insert; dedupes; localStorage-backed (DB persistence deferred to Phase 3).
- [`apps/web/src/lib/relationships/useAllPlacedEntities.ts`](../apps/web/src/lib/relationships/useAllPlacedEntities.ts) — selector aggregating structures, utilities, crop areas, and paddocks for the active project (paddocks expand to one entry per species).
- [`apps/web/src/features/map/RelationshipsOverlay.tsx`](../apps/web/src/features/map/RelationshipsOverlay.tsx) — `RelationshipsToggle` (compact spine button, Lucide Network icon) + `RelationshipsOverlay` (DOM overlay with `map.project()` + rAF-throttled re-projection on move/zoom/resize). Output sockets fan in the right hemisphere (green), input sockets in the left (gold), 26 px from the centroid. Drag-from-output → drop-on-input creates an edge after compatibility validation; invalid drops flash a 600 ms red banner. Edges render as SVG `<line>` with click-to-remove.
- [`apps/web/src/features/map/RelationshipsRail.tsx`](../apps/web/src/features/map/RelationshipsRail.tsx) — bottom-right floating card showing live `integrationScoreFromEdges` (0–100, "weight 0 — informational" badge) and the orphan-output list from `orphanOutputs`. Visible only while the overlay is active.

Wiring: [`MapView.tsx`](../apps/web/src/features/map/MapView.tsx) lazy-loads the toggle, overlay, and rail; [`LeftToolSpine.tsx`](../apps/web/src/features/map/LeftToolSpine.tsx) gained a `relationshipsSlot` next to the analysis-tool group.

Vite + Vitest aliases for `@ogden/shared/relationships` added in both [`vite.config.ts`](../apps/web/vite.config.ts) and [`vitest.config.ts`](../apps/web/vitest.config.ts).

### Tests

- `apps/web/src/tests/relationshipsStore.test.ts` — 5 tests covering valid round-trip, schema rejection, dedup-on-add, predicate remove, and `clearProject` scoping. All pass.

### Verification

- `pnpm --filter @ogden/web exec tsc --noEmit` produced no errors in any of the new relationships files (LeftToolSpine, MapView, RelationshipsOverlay, RelationshipsRail, relationshipsStore, useAllPlacedEntities).
- `pnpm --filter @ogden/web exec vitest run src/tests/relationshipsStore.test.ts` → 5/5 pass.
- Phase 1 vitest suite (`packages/shared`) untouched and still green.
- The integration score remains weighted at 0 in [`computeScores.ts`](../packages/shared/src/scoring/computeScores.ts), so existing project overall scores do not shift.

### Deferred

- **Phase 3 — DB persistence + non-zero scoring weight.** Edges currently live in localStorage only; the `Ecological Integration` slot is held at weight 0 until the canvas UX is validated.
- **Inline edge ratios.** `Edge.ratio` is in the schema but the UI has no setter yet — every edge is treated as routing 100% of the source's output.
- **Closed-loop highlight.** `closedLoops` is implemented in `cycle.ts` but the overlay does not yet visually emphasize edges that complete a cycle.
- **Persisted view-active flag.** `viewActive` is intentionally session-only; revisit if users want it sticky.

### Recommended next session

- **Wire `closedLoops` into the overlay** so edges participating in a cycle render with a brighter accent (visual confirmation that Holmgren P6 — Produce No Waste — is actually being achieved).
- Or — **bring up Phase 3** by lifting the integration weight from 0 to 0.10 and adding a server-side `relationships` table/endpoint.
