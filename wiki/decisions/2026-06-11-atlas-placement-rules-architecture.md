# 2026-06-11 — Draw-time placement rules: shared catalog, client gate, server PostGIS guard

**Status:** Accepted · Implemented · Committed on `main` (`0694ee1c` catalog → `a9a38169` evaluator → `2e7bab84` dialog/gate → `dd61b9e2` tool wiring → `c471eab5` drag-moves → `92ed5536` server guard → `924d0254` RulesPanel), not pushed.
**Plan:** `C:\Users\MY OWN AXIS\.claude\plans\every-stratum-has-a-sleepy-bentley.md` (approved).

## Context

Before this work, nothing validated manual draws at draw time: snapping and per-point spacing existed, zone-affinity vetoes lived only in the auto-design allocator, and the 15 siting rules (riparian 30 m, well-septic 30 m, wetland 120 m, …) ran only post-hoc in `features/rules/RulesEngine.ts`. The design-features API persisted geometry with no validation at all. Operator decisions: **tiered enforcement** (hard vetoes block; soft rules warn + acknowledge, mirroring the UtilityConflictDialog pattern) enforced **client AND server** (PostGIS).

## Decision

**One rule source, three consumers.** Rule *definitions* are pure data in `packages/shared/src/placementRules/` (`types.ts`, `catalog.ts`, `selectors.ts`; subpath `@ogden/shared/placementRules` — zod-only package, **no turf**). Evaluation lives with the consumers: client via turf, server via PostGIS, RulesPanel via a mapping.

- **Catalog:** 14 entries / 13 named rules (well-septic separation is encoded as two directional entries). 6 block (all `serverEnforceable`), 8 warn. Constraint vocabulary: `within-boundary | zone-containment | zone-exclusion | min-distance-from | max-distance-from | no-overlap-same-kind | permaculture-ring-range`. `PLACEMENT_DISTANCES_M` is the single distance source — `SETBACK_RULES` in `SitingRules.ts` re-bases onto it so draw-time and post-hoc numbers can never diverge. Rules carry `message` / `whyItMatters` / optional `amanahNote` (huquq al-jar, tahara, the Prophet ﷺ forbidding fouling water sources, khushuʿ). `legacyRuleId` links a draw-time rule to the post-hoc RULE_CATALOG entry it duplicates.
- **Client gate** (`apps/web/src/v3/plan/validation/`): `buildPlacementContext(projectId)` takes a one-shot store snapshot and **pre-buffers distance targets once** (never on mousemove); `evaluatePlacement(geom, subject, ctx)` is pure and iterates **all** MultiPolygon parts (the `geo.ts` largest-ring shortcut is a known trap); `gatePlacement` rejects blocks with a toast, routes warns through `PlacementConflictDialog` (≥3-char acknowledgment, copied from the utility-veto UX), and stores `placementAcknowledgments` on the record. Wired into all 14 dedicated draw tools + `useDesignElementDrawTool` (70+ catalog kinds) **before** skeleton-record creation, and into drag-commit handlers (`PlanDataLayers.tsx`, `DesignElementLayers.tsx`) on mouseup only — block → geometry restored + toast. Zone rules **no-op** (not warn) when no zones are drawn; annotations (`buffer-ring`, `ecological-note`, `monitoring-transect`) are never gated; overlays (`zone`, `catchment`) are designations of ground, gated only by boundary containment.
- **Server guard** (`apps/api/src/lib/placementGuard.ts`): compiles `serverEnforceable` rules — `within-boundary` → `ST_Covers` vs `projects.parcel_boundary` (skip when null), `min-distance-from` → `ST_DWithin(geography)` vs sibling `design_features`, `zone-exclusion` → `ST_Intersects`. Env `PLACEMENT_GUARD_MODE = off|log|enforce`, **default `log`** — legacy rows must never brick sync. Violations → `409 {code:'PLACEMENT_VIOLATION', violations}`; warns 409 unless `acknowledgeWarnings`; bulk POST is transactional (one violator rolls back the batch). `syncService` sends `acknowledgeWarnings` when the record carries acks and marks the record sync-failed on 409 (no retry loop).
- **RulesPanel consolidation** (`924d0254`): `placementRuleToCatalogEntry` appends the shared rules to `RULE_CATALOG` (block→error, warn→warning, description = `whyItMatters`); rules whose `legacyRuleId` names an existing static entry are not duplicated — the static entry is tagged `drawTime` and livestock-spiritual sources its `amanahNote` from the shared rule via `findPlacementRule` (single source). CatalogTab renders the amanah line + a `draw-time` badge.

**Setback rings stay static** (per the `setbackStore.ts` header ADR): enforcement reads **live source geometry** at validation time, so the stale-ring problem is solved by not depending on rings; the `steward-setback-respect` warn rule treats drawn rings as the steward's own recorded constraints.

## Verification

- Web: evaluator unit tests + validation suite green; `tsc --noEmit` exit 0.
- API mock-DB: `placementGuard.test.ts` 10/10 — mode gating, candidate mapping, 409 envelope, PATCH-only-on-geometry, annotation bypass proven by FIFO queue alignment.
- API integration: `placementGuard.integration.test.ts` 6/6 against **native postgresql-x64-17 on localhost:5432** ([[project-two-postgres-5432]]) — the plan gate verbatim: seeded septic, POST well at ~20 m → 409 (`well-septic-separation`), at ~40 m → 201; boundary containment; PATCH move rejected with stored geometry proven unmoved; bulk rollback; log-mode acceptance. Needs `INTEGRATION_DATABASE_URL` with the **native** password `ogden_dev_2024` (from `apps/api/.env`), not the docker-era `ogden_dev_password` default.

## Notable find: pre-existing PATCH jsonb corruption (fixed in `92ed5536`)

Integration case D exposed a **pre-existing** route bug (verified at HEAD): PATCH `/design-features/:id` pre-stringified `properties`/`style` and bound them on jsonb placeholders. postgres.js JSON-stringifies a string param on a jsonb-typed placeholder **again**, so every PATCH against real PG wrote `properties` as a double-encoded jsonb *string scalar* and then 422'd parsing its own response (after the corrupt write committed). Proven empirically: `SELECT ${'{}'}::jsonb` returns the string `"{}"`. Fix: pass objects via `db.json(...)`. Rule of thumb now on record: **never bind a pre-stringified string to a jsonb placeholder with postgres.js.**

## Out of scope / deferred

- Auto-design stampers running `evaluatePlacement` post-stamp (plan 5.2, explicitly optional — deferred).
- Folding the buried-utility veto into the catalog; live fill-tint of in-progress polygon sketches; reactive auto-updating setback rings (ADR-rejected).
- `Z_TO_CATEGORIES` and per-intervention `zoneAffinity` deliberately NOT merged into the catalog (zone-creation picker and auto-design content data respectively, not placement rules).
