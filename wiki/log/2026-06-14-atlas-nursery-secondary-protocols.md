# 2026-06-14 — Nursery operational protocols reach the secondary (layered) context

**Branch:** `main` · **Commit:** `a559eea7` · **Status:** committed, NOT pushed · **Amanah:** monitoring/threshold/cyclical triggers only — possessed-state framing throughout; the bayʿ mā laysa ʿindak presale guard deliberately left primary-only; no advance-sale surface, no CSRA/salam

## Summary

Closes the deferred nursery-protocol reclassification carried since the secondary-seeding path ([[log/2026-06-14-atlas-nursery-seeded-protocols]]) and the full-coverage capstone ([[log/2026-06-14-atlas-seeded-protocols-full-coverage]]). A nursery layered onto a host (the ecovillage combo) previously resolved only `nur2-own-planting-supply` + universal protocols on its 8 `nur-sec-*` objectives — the rich operational knowledge in `NURSERY_PRIMARY_PROTOCOLS` was unreachable. This authors three secondary-context analogues and seeds them, so a layered nursery now gets propagation monitoring, not just supply-sync.

## The stranded-knowledge problem

`getSecondaryProtocolCatalogue('nursery')` returns only `NURSERY_SECONDARY_PROTOCOLS.additive`, and `resolveProjectProtocols` pulls a secondary type's **additive set only — never its primary set**. The four rich `NURSERY_PRIMARY_PROTOCOLS` (`nur-propagation-health`, `nur-stock-readiness`, `nur-environmental-control`, `nur-stock-presale`) therefore load only when nursery is the *primary* type. But nursery is `canBePrimary: true` with **no primary objective catalogue**, so even nursery-as-primary surfaces them only in the Protocol-mode library, never as a seeded pill — and nursery-as-secondary (its real-world use) never sees them at all.

## Approach chosen (operator-approved)

Of four options (new `nur2-*` secondaries / + presale guard available / move-reclassify-source / defer), the operator chose **new `nur2-*` secondaries, presale guard primary-only** — the idiomatic `<prefix>2` pattern (matches `silv2-*` / `orch2-*` / `res2-*` / `lvo2-*` and the existing `nur2-own-planting-supply`), non-destructive (nursery-as-primary keeps its full set), and the most Amanah-conservative.

## What changed

- **`constants/protocol/catalogues/nursery.ts`** — added three protocols to `NURSERY_SECONDARY_PROTOCOLS` (was 1, now 4), each `source: 'secondary'`, `sourceTypeId: 'nursery'`, mirroring the corresponding primary's `type` / `stratumId` and the hazard-based `severityTier: 'respond'`:
  - `nur2-propagation-health` (threshold, s6) — damping-off / pest / disease in the layered propagation bench.
  - `nur2-stock-readiness` (cyclical, s7) — possessed-state readiness window (route or sell stock that exists and is ready).
  - `nur2-environmental-control` (threshold, s5) — propagation climate tolerance band.
- **`relationships/seededProtocols/nursery.ts`** — seeded the analogues onto four objectives: `nur-sec-s2-biosecurity-survey` += propagation-health; `nur-sec-s3-propagation-strategy` += propagation-health + stock-readiness; `nur-sec-s4-propagation-infra-design` += environmental-control; `nur-sec-s4-sales-dispatch` += stock-readiness. Header rewritten — the secondary set now carries the three overlays and the primary-only presale rationale is restated.
- **No schema, resolver, getter, conformance-test, or UI change** — purely additive `nur2-*` ids in the existing additive set + seed map; the conformance guard auto-covers (it iterates `SECONDARY_MAPS`).

## Amanah

Covenant-aligned. The secondary objective set's only commerce surface is ordinary sale/dispatch of already-possessed stock — no advance-sale decision exists. So the `bayʿ mā laysa ʿindak` guard (`nur-stock-presale`) is **deliberately left primary-only**: importing it would either falsely flag the clean possessed-stock sale (`nur-sec-s4-sales-dispatch`) or sit orphaned with nothing to attach to. `nur2-stock-readiness` checks possessed-state readiness only ("the stock exists and is ready to route or sell"), never an advance commitment. The Amanah sales-channel allowlist test (`SALES_CHANNEL_IDS`) is untouched — `nur-stock-presale` keeps its verbatim scopeNote and pin. Every seeded protocol is a monitoring / threshold / cyclical trigger; nothing sells, finances, or pre-sells. No CSRA/salam ([[fiqh-csra-erased-2026-05-04]], [[fiqh-surplus-sale-clean]]).

## Verification

- `@ogden/shared` build (tsc): clean, exit 0.
- `protocolCatalogues.test.ts`: **13/13** (source-purity, global-id-uniqueness, Amanah sales-channel allowlist, resolve invariants — all green with the three new protocols present).
- `seededProtocols.conformance.test.ts`: **19/19**; negative control proven (a typo'd `nur2-propagation-healthX` failed naming the `(objectiveId, protocolId)` pair, 18 others green, then reverted byte-identical).
- dist wiring confirmed — all three ids emitted into both compiled files; the seed-map occurrence counts reconcile exactly (map placements + the two header mentions of `nur2-stock-readiness`).
- `@ogden/web` lint: only the 4 pre-existing baseline errors (`syncServiceWorkItemsFallback.test.ts` ×1, `WorkConflictSection.test.tsx` ×3), no new.
- Live browser deferred — pure render off `resolveSeededProtocols`, fully exercised by the test; v3 map-mount preview hangs deterministically ([[project-screenshot-hang]]).

## Files changed (2)

| File | Type |
|------|------|
| `packages/shared/src/constants/protocol/catalogues/nursery.ts` | MODIFIED (+3 secondary protocols) |
| `packages/shared/src/relationships/seededProtocols/nursery.ts` | MODIFIED (seed 4 objectives + header) |

Entity updated: [[entities/plan-tier-shell]]. Resolves the "(a) `NURSERY_PRIMARY_PROTOCOLS` reclassification" deferral from [[log/2026-06-14-atlas-seeded-protocols-full-coverage]].
