# 2026-05-15 — Regenerative Farm Catalog: First-Class Cash Enterprises (OQ1 closure for one archetype)

**Status:** accepted
**Scope:** v3 plan-engine content only (intervention catalog)
**Follows:** [2026-05-15 Atlas Spec Reconciliation + MVP Delta](2026-05-15-atlas-spec-reconciliation-mvp-delta.md) — OQ1 / Recommended Next Step 4 (per-project-type minimum-viable dataset)
**Spec:** `OLOS_Atlas_Platform_Workflow_Spec_v1.docx` §4.2 (OQ1)

## Context

OQ1 ("is the planning DB sufficiently populated for all project
types?") was answered **No** in the reconciliation ADR: the catalog
held 20 interventions — a Homestead vertical slice only. Of the six
archetypes in `planProjectTypeTemplates.ts`, only **Homestead** was
end-to-end test-ready; **Regenerative Farm** was *partial* (livestock
/ pasture / earthworks covered, but no market-scale horticulture and
no broadacre cash-crop rotation — its defining enterprises).

Yousef directed: proceed with Regenerative Farm. This closes OQ1 for
that one archetype (the remaining four stay deferred pending the
project-type-list decision).

## Decision

Add **two first-class cash enterprises** to
`apps/web/src/v3/plan/data/interventionCatalog.ts`, authored to the
**existing** schema and selectable by the **existing** criterion
vocabulary — **no engine, schema, or criterion-id changes**:

- **`market-garden`** — commercial Zone-2 standardised-bed market
  garden as the primary horticultural cash line, deliberately
  distinct from the Zone-1 subsistence `kitchen-garden` (larger,
  market-scale, income-first not table-supply). `tile-strip`,
  prereqs `cover-crop-rebuild` + `compost-system`. Contributes
  `income-surplus-usd` (perAcre 4500 @ yr2), `income-streams-count`,
  `food-sov-calories/protein-pct`, `soil-cover-pct`. Monthly
  maintenance metadata (WS4b).
- **`annual-cash-crop-rotation`** — regenerative broadacre
  small-grain / pulse / oilseed rotation under continuous living
  cover; thin per-acre margin carried by scale
  (`fractionOfParcel: 0.35`, the dominant field enterprise).
  `tile-strip`, prereqs `keyline-access-track` + `cover-crop-rebuild`.
  Contributes `income-surplus-usd` (perAcre 180 @ yr2),
  `income-streams-count`, `soil-cover-pct`, `soil-om-pct` (slow gain
  @ yr5). Annual maintenance metadata (WS4b).

### Why this scope (and not more)

The criterion vocabulary is fixed and homestead-centric
(`homesteadGoalTree.ts`) but **already expresses farm cash income**
via `income-surplus-usd` / `income-streams-count` and regenerative
soil gain via `soil-om-pct` / `soil-cover-pct`. The gap was *content*,
not *vocabulary* — so the lowest-risk close is additive catalog
entries the sequencer can already select. No new criterion ids, no
`sequencingEngine` change, no schema change, no archetype tagging on
interventions (selection stays goal-criterion-driven by design).

Sources are agronomically grounded (Fortier; Coleman; Brown,
*Dirt to Soil*; Montgomery, *Growing a Revolution*).

## Consequences

- Regenerative Farm is now end-to-end Auto-design test-ready
  alongside Homestead.
- Retreat Center, Educational Farm, Conservation, Multi-Enterprise
  remain content-blocked (OQ1 still open for them; gated on the
  project-type-list decision — Recommended Next Step 4).
- Both enterprises participate in the WS4b maintenance rollup
  automatically (they carry `maintenanceSchedule`).

## Verification

- `tsc --noEmit` clean (web, 8 GB heap).
- `vitest run src/v3/plan` — 84/84 green across 13 files (4 new
  `regenerativeFarmCatalog.test.ts` specs: both enterprises present;
  both sequenced for an income+soil goal tree; prerequisites pulled
  and ordered ahead; both carry WS4b maintenance metadata). No
  regression to the prior 80.
- Manual Auto-design dry-run with a Regenerative Farm goal tree on a
  real parcel: deferred to a hands-on pass (no dev server this
  session).
