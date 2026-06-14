# 2026-06-14 — Silvopasture seeded protocols

**Branch:** `main` · **Commit:** `51370abc` · **Status:** committed, NOT pushed · **Amanah:** monitoring/review/threshold/cyclical protocols only — no capital/sale/financing surface

## Summary

Filled the **silvopasture** layer of the seeded-protocol mapping, the type that completes the operator's active **Homestead+Silvopasture** vertical slice. All 26 `silv-` objectives now map to 1–3 standing protocols, so a silvopasture steward sees relevant protocols on every objective instead of an empty pill strip. Seeded so far: universal + homestead + ecovillage + **silvopasture**.

## The two protocol pools

A silvopasture-**primary** project resolves both pools via `resolveProjectProtocols`, exactly how `homestead.ts`/`ecovillage.ts` mix type-specific with `u-`:

- **5 silvopasture-specific** (`SILVOPASTURE_PRIMARY_PROTOCOLS`): `silv-tree-browse-damage` (threshold), `silv-establishment-protection` (threshold), `silv-forage-shade-balance` (judgment), `silv-rotational-fencing-integrity` (cyclical, "Treed-Paddock Entry Check"), `silv-root-zone-compaction` (judgment).
- **22 universal** (`UNIVERSAL_PROTOCOL_TEMPLATES`).

The `silv2-*` **secondary** protocols/patches (`silv2-integrated-browse-window`, `silv2-nutrient-distribution`) are **excluded** — they only resolve when silvopasture is a *secondary* type, not for a silvopasture-primary project. (The 5 primary protocols' embedded `objectiveId` fields point at *secondary* objectives `silv-sec-s4-grazing-design`/`silv-sec-s3-forage-survey` — authoring metadata, irrelevant to the seed map, which is keyed the reverse way.)

## Seeded map (`relationships/seededProtocols/silvopasture.ts`)

All 26 `silv-` objective ids verified 1:1 against `constants/plan/catalogues/silvopasture.ts` before authoring (a wrong objective *key* seeds nothing silently — the conformance test catches a wrong *protocol* id only). Representative entries: `silv-s4-tree-integration → [silv-tree-browse-damage, silv-establishment-protection, silv-root-zone-compaction]`; `silv-s3-soil-compaction → [silv-root-zone-compaction, u-s2-new-erosion-signal]`; `silv-s5-fencing → [silv-rotational-fencing-integrity, u-s5-infrastructure-failure]`; `silv-s6-pasture-monitoring → [silv-forage-shade-balance, u-s6-yield-shortfall, u-s6-ecology-indicator-decline]`; `silv-s7-pasture-spelling → [silv-rotational-fencing-integrity, silv-forage-shade-balance]`.

Wired by adding `silvopasture: SILVOPASTURE_SEEDED_PROTOCOLS` to `PRIMARY_MAPS` in `seededProtocols/index.ts` (already exported since the ecovillage slice). No change to `resolveSeededProtocols` logic.

## No new test (auto-covered)

The conformance test added with ecovillage (`seededProtocols.conformance.test.ts`) iterates `PRIMARY_MAPS`, so registering silvopasture adds a new asserted type automatically — **no new test file**. Verified at **4/4** (was 3/3); negative control proven (a deliberately typo'd `silv-tree-browse-damage` failed naming the `(objectiveId, protocolId)` pair, then reverted).

## Amanah

Every seeded protocol is a **monitoring / review / judgment / threshold / cyclical** trigger — browse-damage thresholds, establishment protection, forage–shade balance, root-zone compaction, rotation entry checks, budget/phase review. None creates or implies a sale, advance-purchase, financing, or yield instrument. The lone financial objective `silv-s7-financial-viability` carries only `u-s7-budget-variance` (budget review) — advisory, never a gate. The pill click is navigate-only. Clean per [[fiqh-csra-erased-2026-05-04]]; surplus/possessed-stock sale where it arises is clean per [[fiqh-surplus-sale-clean]].

## Verification

- `@ogden/shared` build (tsc): clean
- Conformance test (bounded forks pool): **4/4** (universal + homestead + ecovillage + silvopasture); negative control proven then reverted
- `@ogden/web` lint: only the 4 pre-existing baseline errors (`syncServiceWorkItemsFallback.test.ts` ×1, `WorkConflictSection.test.tsx` ×3), no new errors
- Live browser deferred — pure render off `resolveSeededProtocols`, fully exercised by the test; v3 map-mount preview hangs deterministically ([[project-screenshot-hang]])

## Files changed (2)

| File | Type |
|------|------|
| `packages/shared/src/relationships/seededProtocols/silvopasture.ts` | NEW |
| `packages/shared/src/relationships/seededProtocols/index.ts` | MODIFIED (import + `PRIMARY_MAPS` entry) |

Entities updated: [[entities/plan-tier-shell]]. Builds on [[log/2026-06-14-atlas-ecovillage-seeded-protocols]].
