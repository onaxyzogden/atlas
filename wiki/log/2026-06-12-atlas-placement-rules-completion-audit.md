# 2026-06-12 — In-app completability audit + draw-time placement rules (5 phases, landed)

**Branch:** `main` (not pushed). **Plan:** `every-stratum-has-a-sleepy-bentley.md` (approved 2026-06-11; executed 06-11 → 06-12).
**ADRs:** [[decisions/2026-06-11-atlas-completion-path-audit-ratchet]], [[decisions/2026-06-11-atlas-placement-rules-architecture]].

Operator goal: OLOS sufficient end-to-end for an **ecovillage (intentional community) + orchards + food-forest guilds + silvopasture + nursery** — every objective/item completable in-app, and drawing tools that enforce placement logic (zone placement, buffer/setback distances). Operator forks: audit + ratchet first; tiered block/warn; client **and** server enforcement; ecovillage = the existing type.

## What landed (commit per phase)

1. **`fa920b6c` Phase 1 — completion-path audit + ratchet.** Shared classifier `objectiveCompletionPaths.ts` (DI'd `ActToolArmIndex`; classifications `auto-answer | auto-formula | form-capture | objective-map/log/flow | no-path`), app-layer ratchet test + pinned baseline (`completionPathGaps.baseline.json`), report emitter `scripts/audit-checklist-completion-paths.ts` (`--write-baseline` keeps fixture and report in lock-step). **Pinned: 2029 items / 355 objectives; 610 no-path (30.1%); 232 per-item evidence-backed.** Priority: universal → ev- → orch- → silv- → nur- → hms- → others.
2. **`d7df22cc` Phase 2 — framing.** `Ecovillage (Intentional Community)` relabel (operator to confirm); spineGate conformance pins the operator combo (ecovillage + orchard_food_forest + silvopasture + nursery).
3. **`0694ee1c`→`c471eab5` Phase 3 — shared catalog + client gate.** 14-entry tiered rule catalog (`@ogden/shared/placementRules`, data-only; `PLACEMENT_DISTANCES_M` single distance source; amanah notes on 4 rules); pure turf evaluator + pre-buffered context (never on mousemove; all MultiPolygon parts); `PlacementConflictDialog` warn-acknowledgment (≥3 chars, persisted as `placementAcknowledgments`); gate wired into 14 dedicated tools + `useDesignElementDrawTool` (70+ kinds) before skeleton creation + drag-moves on mouseup (block → geometry restored).
4. **`92ed5536` Phase 4 — server PostGIS guard.** `placementGuard.ts` compiles `serverEnforceable` rules to `ST_Covers`/`ST_DWithin(geography)`/`ST_Intersects`; `PLACEMENT_GUARD_MODE=off|log|enforce` (default log); 409 `PLACEMENT_VIOLATION`; bulk rollback; syncService acks + sync-failed surfacing. 10 mock-DB + 6 native-PG integration tests green (plan gate verbatim: well at 20 m → 409, 40 m → 201). **Found + fixed a real pre-existing bug:** PATCH `/design-features/:id` double-encoded `properties`/`style` into jsonb string scalars on every real-PG write (postgres.js stringifies string params on jsonb placeholders again) — now passed via `db.json()`. See the ADR's "Notable find".
5. **`924d0254` Phase 5 — RulesPanel consolidation.** `placementRuleToCatalogEntry` appends draw-time rules to `RULE_CATALOG` (legacy-id dedup; static well-septic + livestock-spiritual entries tagged `drawTime`, amanahNote sourced from the shared rule); CatalogTab renders amanah notes + `draw-time` badges.

## Operational notes

- Integration tests need `INTEGRATION_DATABASE_URL` with the **native** postgresql-x64-17 password `ogden_dev_2024` (`apps/api/.env`), not the docker-era default — [[project-two-postgres-5432]].
- Filtered vitest runs (`-t`) of the integration file break inter-test state (case B's id feeds D); run the whole file.
- Deferred: auto-design stampers post-stamp validation (plan 5.2); gap closure itself (610 no-path items, priority list in `scripts/audit-out/checklist-completion-paths.md`); ~12 residuals queued for operator review (BeV2ExistingTool gating, type-on-Save not re-gated for some kinds, SlaughterPoint/ColdChain/MarketNode ungated, bulk-stamp warn-silently-accepted, full-merge 409s console.warn-only, …).

**Entities updated:** [[entities/shared-package]] (placementRules subpath + classifier), [[entities/api]] (placement guard + jsonb fix), [[entities/web-app]] (draw-time validation + RulesPanel).
