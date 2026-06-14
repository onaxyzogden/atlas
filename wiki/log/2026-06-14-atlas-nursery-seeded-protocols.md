# 2026-06-14 — Nursery seeded protocols (new SECONDARY-seeding layer)

**Branch:** `main` · **Commit:** `b1f14827` · **Status:** committed, NOT pushed · **Amanah:** monitoring/review/threshold triggers only — covenant-aligned; no advance-sale surface exists in the secondary set

## Summary

Filled the **nursery** layer of the seeded-protocol mapping — and in doing so built the feature's **first secondary-seeding path**. Nursery is architecturally unlike the four prior fills (homestead, ecovillage, silvopasture, orchard), all of which were primary fills registered in `PRIMARY_MAPS` keyed on the type's own primary objectives.

## Why nursery needed new wiring

`constants/plan/catalogues/nursery.ts` exports **only** `NURSERY_SECONDARY_OBJECTIVES` — 8 objectives, all `nur-sec-*`, `source: 'secondary'`. There is **no** `NURSERY_PRIMARY_OBJECTIVES`, no `nur-s*` id anywhere, and the objective resolver wires nursery only as a secondary (`getSecondaryObjectiveCatalogue('nursery')`). So a `PRIMARY_MAPS['nursery']` entry would have no objective keys to hang protocols on — a no-op. Nursery's 8 objectives surface only when nursery is layered as a **secondary** onto a compatible host (the ecovillage combo: ecovillage-primary + orchard + silvopasture + **nursery**). The seeded-protocol resolver previously had no secondary path: `resolveSeededProtocols`'s third param was the **unused** `_secondaryTypeIds`, and there was no `SECONDARY_MAPS`.

## Seedable-pool constraint (narrows the fill)

When nursery is a **secondary**, `getSecondaryProtocolCatalogue('nursery')` loads only `NURSERY_SECONDARY_PROTOCOLS = [nur2-own-planting-supply]`. The 4 rich `NURSERY_PRIMARY_PROTOCOLS` (`nur-propagation-health`, `nur-stock-readiness`, `nur-environmental-control`, `nur-stock-presale`) load **only** when nursery is the *primary* type — they are not in a nursery-as-secondary project's resolved set. So the seedable pool for the 8 `nur-sec-*` objectives is **`nur2-own-planting-supply` + universal `u-` protocols only.** (The "5 protocols" estimate counted the 4 primary protocols, which are unreachable here.) The protocol catalogue was **not** modified — reclassifying those 4 as also-secondary is a separate, operator-owned content decision (**deferred**).

## What changed

- **NEW `relationships/seededProtocols/nursery.ts`** — `NURSERY_SEEDED_PROTOCOLS`, all 8 `nur-sec-*` objectives → 1–3 protocols each, every value `nur2-own-planting-supply` or a universal `u-` id. `nur2-` lands on the two supply/timing objectives (`nur-sec-s3-propagation-strategy`, `nur-sec-s4-sales-dispatch`). All 8 ids verified 1:1 against `constants/plan/catalogues/nursery.ts`.
- **`index.ts`** — added the exported `SECONDARY_MAPS` record (`{ nursery: NURSERY_SEEDED_PROTOCOLS }`, exported so the conformance test auto-covers future secondary types) and rewrote `resolveSeededProtocols` to **honour** the (renamed) `secondaryTypeIds` param: merge universal → primary → each layered secondary, dedup first-wins. **No UI change** — both call sites (`SeededProtocolPills.tsx:42`, `PlanStratumShell.tsx:563`) already pass the secondary list; it was simply ignored until now.
- **`seededProtocols.conformance.test.ts`** — new block iterating `SECONDARY_MAPS`. For each secondary type, the valid set is `universal pool ∪ that secondary's additive catalogue` (host-agnostic, a strict subset of any compatible host's resolved set `universal ∪ hostPrimary ∪ additive`), so passing guarantees the pill resolves on every compatible host. Encodes the design rule "a secondary seeded map references only universal + that secondary's own additive protocols."

## Amanah

Covenant-aligned. The nursery secondary catalogue's own header states its only commerce surface is **ordinary plant sales / dispatch of already-possessed stock — "No advance sale, no financial product, no riba- or gharar-adjacent content."** So there is no advance-sale objective in the secondary set, and the `bayʿ mā laysa ʿindak` guard (`nur-stock-presale`, present only in the primary pool) is correctly absent — its absence opens no gap because the risk it guards does not arise in the secondary layer. Every seeded protocol is a monitoring/review/judgment/threshold trigger (infra failure, contamination signal, water-store low, ecology decline, supply-timing sync). No financial objective exists in the set; nothing seeds a sale, advance-purchase, financing, or yield instrument. No CSRA/salam ([[fiqh-csra-erased-2026-05-04]], [[fiqh-surplus-sale-clean]]).

## Verification

- `@ogden/shared` build (tsc): clean
- Conformance test (bounded forks pool): **6/6** (1 universal + 4 primary + **new nursery secondary**); negative control proven (a deliberately typo'd `nur2-own-planting-supply` failed naming the `(objectiveId, protocolId)` pair, then reverted)
- `@ogden/web` lint: only the 4 pre-existing baseline errors (`syncServiceWorkItemsFallback.test.ts` ×1, `WorkConflictSection.test.tsx` ×3), no new errors
- Live browser deferred — pure render off `resolveSeededProtocols`, fully exercised by the test; v3 map-mount preview hangs deterministically ([[project-screenshot-hang]])

## Files changed (3)

| File | Type |
|------|------|
| `packages/shared/src/relationships/seededProtocols/nursery.ts` | NEW |
| `packages/shared/src/relationships/seededProtocols/index.ts` | MODIFIED (SECONDARY_MAPS + resolver honours secondaryTypeIds) |
| `packages/shared/src/relationships/seededProtocols/__tests__/seededProtocols.conformance.test.ts` | MODIFIED (secondary-map block) |

Entities updated: [[entities/plan-tier-shell]]. Builds on [[log/2026-06-14-atlas-orchard-seeded-protocols]]; completes the ecovillage combo's seeded coverage.
