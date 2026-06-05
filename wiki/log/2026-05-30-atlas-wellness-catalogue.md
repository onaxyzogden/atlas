# 2026-05-30 -- Wellness / Healing Sanctuary objective catalogue encoded (primary + secondary)

**Branch:** `feat/atlas-permaculture`
**Commit:** `81812c20` (parent `d75e3b13`) -- one explicit-path slice commit, 3 files,
1308 insertions(+), 7 deletions(-).
**Files:** `packages/shared/src/constants/plan/catalogues/wellness.ts` (new),
`.../catalogues/index.ts` (wired), `.../__tests__/catalogues.test.ts` (conformance).

## What shipped

The Wellness / Healing Sanctuary catalogue, the **third and last economic-tier
catalogue** named in the 2026-05-29 fan-out ([[log/2026-05-29-economic-catalogue-fanout]]),
encoded as pure data through the same registry seam proven by Ecovillage + Agritourism.

- **27 primary-layer objectives** (`WELL-S1.4 .. WELL-S7.6`) across the 7 strata,
  transcribed verbatim from the operator-provided Wellness catalogue doc.
- **WELL-S7.4 (`well-s7-program-launch`)** raised from 4 to the Authoring Standards
  v1.4 **5-item floor** by appending one operator-authorized governance checklist
  item (`well-s7-program-launch-c5`); c1-c4 are verbatim. No `SHORT_OBJECTIVE_ALLOWLIST`
  carve-out was needed (unlike Agritourism AG-S6.4) because the operator authorized
  the 5th item under the **2026-05-30 "draft 5th (AG precedent)" ruling**.
- **5 secondary-overlay objectives** (`well-sec-*`, all `source:'secondary'`,
  `sourceTypeId:'wellness'`, `secondaryClass:'additive'`, **no patch records**):
  `well-sec-s1-healing-philosophy` (WELL-S1.8), `well-sec-s1-regulatory-standards`
  (WELL-S1.9, hard-gate scopeNotes), `well-sec-s4-sensory-standards` (WELL-S4.9),
  `well-sec-s4-therapeutic-program` (WELL-S4.10), `well-sec-s4-safeguarding`
  (WELL-S4.11, scopeNotes). Derived + authored under the **2026-05-30 "derive +
  author" ruling**, an explicit informed override of the standing "catalogue docs
  operator-provided, don't invent content" rule, **scoped to the Wellness secondary
  layer only**.
- Registry wiring: `getPrimaryCatalogue` arm, `getSecondaryCatalogue` branch
  (`{ additive: WELLNESS_SECONDARY_OBJECTIVES, patches: [] }`), and the
  `ALL_CATALOGUE_OBJECTIVES` union spreads. `getSecondaryCatalogue` now serves
  **Residential + Wellness** (was residential-only).

## Covenant

The **2026-05-29 "encode verbatim, no gating" Amanah Gate override is NOT engaged**
for Wellness -- it has **no economic objectives** (no financial-model / revenue /
advance-sale content), so there was nothing to gate. The CSRA prohibition
([[fiqh-csra-erased-2026-05-04]]) is neither implicated nor reintroduced. The two
rulings actually in play here are the narrow 2026-05-30 authoring authorizations
above (5th item + secondary derivation), both operator-approved.

## Verification

Shared typecheck (8GB, `tsc --noEmit`) EXIT 0; vitest 39 files / 727 tests pass
(catalogues.test.ts now asserts `WELLNESS_PRIMARY_OBJECTIVES.length === 27`,
`WELLNESS_SECONDARY_OBJECTIVES.length === 5`, `well-s7-program-launch` checklist
length === 5, `WELL` in the OBJECTIVE_REF regex, and source/layer discipline).
Committed by explicit path (`git reset` + `git diff --cached --name-only` confirmed
the staged set == the 3 slice files) per [[feedback-commit-immediately-on-rebased-branches]];
heavy foreign WIP from parallel sessions left untouched per [[feedback-no-deletion]].
ASCII-only copy.

## State after

**3 of 3 economic catalogues done.** All economic-tier fan-out is complete.
8 catalogues remain unencoded (selectable, universal-only): Conservation, Education,
MarketGarden, Nursery, OffGrid, Orchard, Silvopasture, plus the Homestead primary
stand-in. Encoded primaries: Regenerative-Farm, Ecovillage, Agritourism, Wellness.
Encoded secondaries: Residential, Wellness.
