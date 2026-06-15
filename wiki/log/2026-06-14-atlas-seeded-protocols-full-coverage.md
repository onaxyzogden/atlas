# 2026-06-14 — Seeded protocols: full coverage across all 14 project types

**Branch:** `main` · **Commit:** `59c9e5d0` · **Status:** committed, NOT pushed · **Amanah:** monitoring/review/judgment/threshold/cyclical triggers only — financial objectives advisory-only; advance-sale objectives seeded with their dedicated Amanah-review protocol where one exists and advisory-only where none does; no CSRA/salam

## Summary

Closed the seeded-protocol mapping for **every remaining objective in every catalogue**, so all 14 project types now render their standing-protocol pill strip + pinned "For this objective" group. This completes the feature begun with the pills surface (`4fc1744b`) and filled type-by-type since (homestead/ecovillage with the conformance guard, then silvopasture, orchard, nursery). The prior fills covered 5 types across the two dimensions; this slice adds the remaining **8 primary maps (200 objectives)** and **5 secondary maps (31 objectives)** in one pass.

## Scope — two dimensions

**Primary** (`PRIMARY_MAPS`, keyed by primary type; pool = 22 universal `u-` + that type's `<TYPE>_PRIMARY_PROTOCOLS`): added regenerative_farm (13 `rf-s*`), market_garden (24 `mgd-s*`), agritourism (34 `ag-s*`), education (22 `edu-s*`), conservation (30 `con-s*`), off_grid (27 `ofg-s*`), wellness (27 `well-s*`), livestock_operation (23 `lvs-s*`) = **200**. `PRIMARY_MAPS` now holds all 12 primary-capable types that have primary objectives (nursery has no primary objective catalogue and residential is `canBePrimary:false`, so both are correctly absent here).

**Secondary** (`SECONDARY_MAPS`, keyed by secondary type; pool = universal + that type's additive secondary protocols ONLY — the primary protocols do not resolve in a secondary context): added silvopasture (8 `silv-sec-s*`, additive `silv2-*`), orchard_food_forest (5 `orch-sec-s*`, additive `orch2-*`), wellness (5 `well-sec-s*`, additive `well2-guest-operation-buffer`), residential (6 `res-s*`, additive `res2-*`), livestock_operation (7 `lvs-sec-s*`, additive `lvo2-*`) = **31**. `SECONDARY_MAPS` now holds all 6 secondary contexts (with nursery from the prior slice).

**Scope correction:** orchard-secondary is **5** `orch-sec-*` objectives, not the 6 the plan estimated — verified 1:1 against the catalogue.

## What changed

- **NEW seed files (primary-only):** `regenFarm.ts`, `marketGarden.ts`, `agritourism.ts`, `education.ts`, `conservation.ts`, `offGrid.ts`.
- **NEW seed files (dual role-pure exports):** `wellness.ts` (`WELLNESS_SEEDED_PROTOCOLS` + `WELLNESS_SECONDARY_SEEDED_PROTOCOLS`), `livestockOperation.ts` (`LIVESTOCK_SEEDED_PROTOCOLS` + `LIVESTOCK_SECONDARY_SEEDED_PROTOCOLS`). Primary and secondary keys live in two separate exports so the conformance test validates each against the correct pool.
- **NEW seed file (secondary-only):** `residential.ts` (`RESIDENTIAL_SEEDED_PROTOCOLS`).
- **MODIFIED (append a secondary export, primary export untouched):** `silvopasture.ts` (+`SILVOPASTURE_SECONDARY_SEEDED_PROTOCOLS`), `orchard.ts` (+`ORCHARD_SECONDARY_SEEDED_PROTOCOLS`).
- **MODIFIED `index.ts`:** imports + 8 new `PRIMARY_MAPS` lines + 5 new `SECONDARY_MAPS` lines. `resolveSeededProtocols` body unchanged.
- **No schema, resolver, conformance-test, or UI change** — the conformance test iterates both records (auto-covers every new entry), and both call sites already pass `secondaryTypeIds`.
- Every objective id verified **1:1** against `constants/plan/catalogues/<type>.ts` before authoring (231 keys; the test catches a wrong protocol id, not a wrong objective key, so the catalogue cross-check is the authoring gate).

## Amanah

Every seeded protocol is a monitoring/review/judgment/threshold/cyclical trigger; nothing creates, sells, finances, or pre-sells. Flagged objectives were authored directly (not delegated). The per-objective rules applied:

- **Financial / revenue / break-even objectives → advisory universal triggers only** (`u-s7-budget-variance`, `u-s7-material-availability`): `rf-s7-cash-flow`, `rf-s7-enterprise-sequencing`, `mgd-s6-sales-revenue-tracking`, `mgd-s7-financial-viability`, `edu-s7-financial-viability`, `con-s1-tenure-covenant` (governance review), `con-s7-funding-resourcing`, `lvs-s7-break-even`.
- **Advance-sale objective WITH a dedicated Amanah-review protocol → seed it** (the protocol exists precisely to gate the decision against the Amanah gate, so seeding it is covenant-*aligned*): `mgd-s1-market-channels` + `mgd-s1-production-targets-sales` → `mg-market-channel-advance-sale`; `ag-s4-revenue-model` + `ag-s7-booking-system` → `agri-experience-presale`.
- **Advance-sale objective WITHOUT such a protocol → advisory-only; nothing fabricated:** `lvs-s7-marketing` (meat-share/herd-share, Scholar-Council-gated) → `u-s7-budget-variance` only.
- **Harvest / surplus objective → possessed-surplus routing, clean:** `orch-sec-s6-harvest-pathway` → `u-s6-abundance-surplus` / `u-s6-yield-shortfall`.
- **No CSRA/salam anywhere** ([[fiqh-csra-erased-2026-05-04]], [[fiqh-surplus-sale-clean]]).

## Verification

- `@ogden/shared` build (tsc): clean, exit 0.
- Conformance test (bounded forks pool): **19/19** (1 universal + 12 primary + 6 secondary). Negative control proven on **both** dimensions — a typo'd protocol id in a primary map (conservation) and a secondary map (residential) each failed naming the `(objectiveId, protocolId)` pair, with the other 17 passing — then reverted byte-identical.
- End-to-end resolver sanity: `resolveSeededProtocols('ag-s4-revenue-model','agritourism')` includes `agri-experience-presale`; `resolveSeededProtocols('res-s3-water-quality', <host>, ['residential'])` includes `res2-dwelling-water-safety`. Both pass.
- `@ogden/web` lint (tsc --noEmit): only the 4 pre-existing baseline errors (`syncServiceWorkItemsFallback.test.ts` ×1, `WorkConflictSection.test.tsx` ×3), no new errors.
- Live browser deferred — pure render off `resolveSeededProtocols`, fully exercised by the test; v3 map-mount preview hangs deterministically ([[project-screenshot-hang]]).

## Files changed (12)

| File | Type |
|------|------|
| `packages/shared/src/relationships/seededProtocols/regenFarm.ts` | NEW (primary) |
| `packages/shared/src/relationships/seededProtocols/marketGarden.ts` | NEW (primary) |
| `packages/shared/src/relationships/seededProtocols/agritourism.ts` | NEW (primary) |
| `packages/shared/src/relationships/seededProtocols/education.ts` | NEW (primary) |
| `packages/shared/src/relationships/seededProtocols/conservation.ts` | NEW (primary) |
| `packages/shared/src/relationships/seededProtocols/offGrid.ts` | NEW (primary) |
| `packages/shared/src/relationships/seededProtocols/wellness.ts` | NEW (primary + secondary exports) |
| `packages/shared/src/relationships/seededProtocols/livestockOperation.ts` | NEW (primary + secondary exports) |
| `packages/shared/src/relationships/seededProtocols/residential.ts` | NEW (secondary-only) |
| `packages/shared/src/relationships/seededProtocols/silvopasture.ts` | MODIFIED (append secondary export) |
| `packages/shared/src/relationships/seededProtocols/orchard.ts` | MODIFIED (append secondary export) |
| `packages/shared/src/relationships/seededProtocols/index.ts` | MODIFIED (register 8 primary + 5 secondary) |

Entity updated: [[entities/plan-tier-shell]]. Builds on [[log/2026-06-14-atlas-nursery-seeded-protocols]] — **completes seeded-protocol coverage for all 14 project types.**

## Deferred

- The 4 rich `NURSERY_PRIMARY_PROTOCOLS` reclassification (carried over — operator-owned content decision).
- `mg2-*` / `agri2-*` / `edu2-*` secondary protocols have no secondary objective catalogue to attach to (a pre-existing catalogue design quirk, not a seeding task).
- Push remains operator-authorized — nothing pushed.
