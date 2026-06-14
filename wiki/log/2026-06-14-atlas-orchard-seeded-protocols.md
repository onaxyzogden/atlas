# 2026-06-14 — Orchard / food-forest seeded protocols

**Branch:** `main` · **Commit:** `f56b60b9` · **Status:** committed, NOT pushed · **Amanah:** monitoring/review/threshold/cyclical protocols only — no capital/sale/financing surface

## Summary

Filled the **orchard_food_forest** layer of the seeded-protocol mapping, the other ecovillage-combo member. All 25 primary `orch-s*` objectives now map to 1–3 standing protocols, so an orchard steward sees relevant protocols on every objective instead of an empty pill strip. Seeded so far: universal + homestead + ecovillage + silvopasture + **orchard**.

## Scope correction

The "30 objectives / 6 type-specific protocols" estimate counted secondary entries. An orchard-**primary** project actually has **25** primary `orch-s*` objectives and **4** primary protocols. The two `orch2-*` protocols (`orch2-canopy-shade-encroachment`, `orch2-perennial-water-share`) are **secondary-only** — they resolve when an orchard is layered onto a host type — and `orch-sec-*` objectives are likewise secondary. Both excluded, exactly as `silv2-*` was for silvopasture.

## The two protocol pools

A orchard-**primary** project resolves both pools via `resolveProjectProtocols`:

- **4 orchard-specific** (`ORCHARD_PRIMARY_PROTOCOLS`): `orch-pest-disease-pressure` (threshold), `orch-pollination-window` (cyclical), `orch-young-tree-water` (threshold), `orch-harvest-glut` (threshold/abundance).
- **22 universal** (`UNIVERSAL_PROTOCOL_TEMPLATES`).

## Seeded map (`relationships/seededProtocols/orchard.ts`)

All 25 `orch-s*` objective ids verified 1:1 against `constants/plan/catalogues/orchard.ts` before authoring (a wrong objective *key* seeds nothing silently — the conformance test catches a wrong *protocol* id only). All 4 primary protocols are used. Representative entries: `orch-s3-pest-disease-pressure → [orch-pest-disease-pressure, u-s6-ecology-indicator-decline]`; `orch-s4-species-mix → [orch-pollination-window, u-s6-yield-shortfall]`; `orch-s5-establishment-irrigation → [orch-young-tree-water, u-s5-water-store-low]`; `orch-s5-access-harvest → [orch-harvest-glut, u-s5-access-track-erosion]`; `orch-s6-phenological-monitoring → [orch-pollination-window, u-s6-ecology-indicator-decline]`.

Wired by adding `orchard_food_forest: ORCHARD_SEEDED_PROTOCOLS` to `PRIMARY_MAPS` in `seededProtocols/index.ts`. No change to `resolveSeededProtocols` logic.

## No new test (auto-covered)

The conformance test (`seededProtocols.conformance.test.ts`) iterates `PRIMARY_MAPS`, so registering orchard adds a new asserted type automatically — **no new test file**. Verified at **5/5** (was 4/4); negative control proven (a deliberately typo'd `orch-pest-disease-pressure` failed naming the `(objectiveId, protocolId)` pair, then reverted).

## Amanah

Every seeded protocol is a **monitoring / review / judgment / threshold / cyclical** trigger — pest/disease thresholds, pollination-window confirmation, young-tree water priority, harvest-glut routing, budget/phase review. None creates or implies a sale, advance-purchase, financing, or yield instrument. `orch-harvest-glut` routes *already-harvested possessed surplus* to processing/sharing/preservation — clean per [[fiqh-surplus-sale-clean]] (sale of possessed surplus is permitted; it is not advance-sale). The lone financial objective `orch-s7-financial-viability` carries only `u-s7-budget-variance` (budget review) — advisory, never a gate. The pill click is navigate-only. Clean per [[fiqh-csra-erased-2026-05-04]].

## Verification

- `@ogden/shared` build (tsc): clean
- Conformance test (bounded forks pool): **5/5** (universal + homestead + ecovillage + silvopasture + orchard); negative control proven then reverted
- `@ogden/web` lint: only the 4 pre-existing baseline errors (`syncServiceWorkItemsFallback.test.ts` ×1, `WorkConflictSection.test.tsx` ×3), no new errors
- Live browser deferred — pure render off `resolveSeededProtocols`, fully exercised by the test; v3 map-mount preview hangs deterministically ([[project-screenshot-hang]])

## Files changed (2)

| File | Type |
|------|------|
| `packages/shared/src/relationships/seededProtocols/orchard.ts` | NEW |
| `packages/shared/src/relationships/seededProtocols/index.ts` | MODIFIED (import + `PRIMARY_MAPS` entry) |

Entities updated: [[entities/plan-tier-shell]]. Builds on [[log/2026-06-14-atlas-silvopasture-seeded-protocols]].
