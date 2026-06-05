# 2026-05-15 — Regenerative Farm catalog: first-class cash enterprises


Closed OQ1 for the Regenerative Farm archetype (was *partial* — no
market-scale horticulture, no broadacre cash-crop rotation). ADR:
`decisions/2026-05-15-atlas-regenerative-farm-catalog-cash-enterprises.md`.

Added two interventions to `interventionCatalog.ts`, authored to the
existing schema + selectable by the existing criterion vocabulary
(**no engine / schema / criterion-id change**):

- **`market-garden`** — commercial Zone-2 standardised-bed market
  garden, distinct from the Zone-1 subsistence `kitchen-garden`
  (market-scale, income-first). `tile-strip`; prereqs
  `cover-crop-rebuild` + `compost-system`; income + food-sov + soil
  contributions; monthly WS4b maintenance.
- **`annual-cash-crop-rotation`** — regenerative broadacre rotation
  under continuous cover; dominant field share
  (`fractionOfParcel 0.35`); `tile-strip`; prereqs
  `keyline-access-track` + `cover-crop-rebuild`; income + soil
  contributions; annual WS4b maintenance.

The criterion vocabulary already expressed farm cash income
(`income-surplus-usd` / `income-streams-count`) and regenerative soil
gain (`soil-om-pct` / `soil-cover-pct`) — the gap was content, not
vocabulary, so the close is purely additive.

**Verification.** `tsc --noEmit` clean. `vitest run src/v3/plan`
84/84 across 13 files (4 new `regenerativeFarmCatalog.test.ts`:
presence, sequenced for an income+soil goal tree, prerequisites
pulled + ordered ahead, WS4b metadata). No regression.

**Deferred.** Retreat Center / Educational Farm / Conservation /
Multi-Enterprise stay content-blocked (OQ1 open for them, gated on
the project-type-list decision). Manual Auto-design dry-run on a real
parcel — no dev server this session.
