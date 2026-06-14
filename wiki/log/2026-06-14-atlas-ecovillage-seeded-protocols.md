# 2026-06-14 — Ecovillage seeded protocols + seeded-ID conformance guard

**Branch:** `main` · **Commit:** `c1f6a636` · **Status:** committed, NOT pushed · **Amanah:** monitoring/review protocols only — no capital/sale/financing surface

## Summary

Filled the **ecovillage** layer of the seeded-protocol mapping (built 2026-06-14 in `4fc1744b`, which seeded only universal + homestead). Every one of the 31 `ev-` objectives now maps to 1–3 standing protocols, so an ecovillage steward sees relevant protocols on every objective instead of an empty pill strip. Also added the first conformance test guarding seeded-ID validity.

## The two protocol pools

An ecovillage project resolves both pools via `resolveProjectProtocols`, so seedings draw from each — exactly how `homestead.ts` mixes `hs-` with `u-` IDs:

- **4 ecovillage-specific** (`ECOVILLAGE_PRIMARY_PROTOCOLS`): `eco-governance-decision-cadence` (cyclical), `eco-member-capacity-balance` (judgment), `eco-shared-resource-load` (threshold), `eco-common-land-stewardship` (cyclical). The "12+" original estimate was wrong — the catalogue holds 4.
- **22 universal** (`UNIVERSAL_PROTOCOL_TEMPLATES`).

## Seeded map (`relationships/seededProtocols/ecovillage.ts`)

All 31 `ev-` objective ids verified against `constants/plan/catalogues/ecovillage.ts` before authoring (the explore agent's per-stratum summary counts were internally inconsistent; the detail table summed to the authoritative 31, which matched 1:1). Representative entries: `ev-s1-legal-governance → [eco-governance-decision-cadence, u-s1-working-agreement-review]`; `ev-s2-carrying-capacity → [eco-shared-resource-load, u-s2-baseline-staleness-resurvey]`; `ev-s4-food-system → [eco-common-land-stewardship, u-s6-yield-shortfall]`; `ev-s5-sanitation-waste → [eco-shared-resource-load, u-s2-contamination-signal]`; `ev-s6-social-monitoring → [eco-governance-decision-cadence, eco-member-capacity-balance, u-s6-stewardship-overload]`; `ev-s7-exit-succession → [eco-governance-decision-cadence]`.

Wired into the resolver by adding `ecovillage: ECOVILLAGE_SEEDED_PROTOCOLS` to `PRIMARY_MAPS` in `seededProtocols/index.ts`. No change to `resolveSeededProtocols` logic — it already merges universal + primary by key with dedup. `PRIMARY_MAPS` is now **exported** so the conformance test iterates every registered type (future types auto-covered).

## Conformance test (new guardrail)

`relationships/seededProtocols/__tests__/seededProtocols.conformance.test.ts` — closes the silent gap where a typo'd protocol id renders no pill with no error:

1. Every `UNIVERSAL_SEEDED_PROTOCOLS` id exists in `UNIVERSAL_PROTOCOL_TEMPLATES`.
2. For each `PRIMARY_MAPS` entry, every seeded id resolves against `resolveProjectProtocols({ primaryTypeId })` — the exact set `useProtocolLibrary` resolves at runtime.

Failure names the `(objectiveId, protocolId)` pair. **Caveat (documented in the test):** it catches a wrong *protocol* id, not a wrong *objective* key (an unknown key simply seeds nothing) — objective ids are verified at authoring time.

## Amanah

Every seeded protocol is a **monitoring / review / judgment** trigger — governance cadence, contribution-load fairness, resource-load ceilings, land-care cadence, budget/phase review. None creates or implies a sale, advance-purchase, financing, or membership-yield instrument. The two financial objectives (`ev-s4-financial-model`, `ev-s7-financial-plan`) carry only `eco-member-capacity-balance` (contribution fairness) + `u-s7-budget-variance` (budget review) — advisory, never a gate. The memory note "ev-s7-financial-plan NEVER a source" governs the work-generation layer, not protocol seeding. The pill click is navigate-only. Clean per [[fiqh-csra-erased-2026-05-04]].

## Verification

- `@ogden/shared` build (tsc): clean
- Conformance test (bounded forks pool): **3/3** (universal + homestead + ecovillage); negative control proven — a deliberately typo'd id fails with the pair named, then reverted
- `@ogden/web` lint: only the 4 pre-existing baseline errors (`syncServiceWorkItemsFallback.test.ts` ×1, `WorkConflictSection.test.tsx` ×3), no new errors
- Live browser deferred — pure render off `resolveSeededProtocols`, fully exercised by the test; v3 map-mount preview hangs deterministically ([[project-screenshot-hang]])

## Files changed (3)

| File | Type |
|------|------|
| `packages/shared/src/relationships/seededProtocols/ecovillage.ts` | NEW |
| `packages/shared/src/relationships/seededProtocols/index.ts` | MODIFIED (import + `PRIMARY_MAPS` entry + export) |
| `packages/shared/src/relationships/seededProtocols/__tests__/seededProtocols.conformance.test.ts` | NEW |

Entities updated: [[entities/plan-tier-shell]]. Builds on [[log/2026-06-14-atlas-seeded-protocol-pills]].
