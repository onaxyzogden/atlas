# 2026-05-29 -- Economic-catalogue fan-out: Ecovillage + Agritourism primaries

First fan-out of pure-data primary catalogues on top of the per-type objective
model ([[decisions/2026-05-29-atlas-per-type-objective-model]] shipped the
pipeline). The operator chose "Both economic ones" via AskUserQuestion -- the two
economic catalogues where the 2026-05-29 Amanah Gate override ("encode verbatim,
no gating") actually applies -- and they were encoded back to back. Architecture
and the cross-cutting decisions are in the ADR
[[decisions/2026-05-29-atlas-economic-catalogue-fanout]]; this entry is the
session arc.

Per-slice workflow (operator-stated, followed for each): extract spec from the
source dump -> encode following the regenFarm/residential pattern -> register in
`index.ts` -> extend the rubric test -> typecheck + test -> commit.

## Ecovillage primary (`416b48d2`, 31 objectives)

`constants/plan/catalogues/ecovillage.ts` -- 31 type-specific primary objectives
(EV-T*, `source: 'primary'`, `sourceTypeId: 'ecovillage'`) over the 7 tiers, on
top of the 19 Universal -> **50 resolved**. `canBeSecondary: false`, so registered
in `getPrimaryCatalogue` only. **Count reconciliation:** the source header table
reads "Primary: 29" but the per-tier sub-headers and the 50-total confirm **31**;
the source's duplicate ref "6.6" (adaptive management) was reassigned to
**EV-T6.9** to keep refs unique. Two economic objectives encoded verbatim as plain
data per the override: `ev-t3-financial-model` (EV-T3.8, financial contribution &
shared economics) and `ev-t6-financial-plan` (EV-T6.5, communal financial plan &
capital contribution schedule) -- communal cost-sharing, not advance sale of
future yield.

## Agritourism primary (`7b81931a`, 29 objectives)

`constants/plan/catalogues/agritourism.ts` -- 29 primary objectives (AG-T*,
`source: 'primary'`, `sourceTypeId: 'agritourism'`) over the 7 tiers (3/4/4/5/5/4/4)
-> **48 resolved**. **Primary-only despite `canBeSecondary: true`:** the catalogue
doc carries only a primary layer (no additive-as-secondary, no patch records), so
it registers in `getPrimaryCatalogue` only, like Ecovillage; `getSecondaryCatalogue`
still handles only `residential`. A secondary-layer spec is not in hand and was not
invented. The source index carries no duplicate refs. Two economic objectives:
`ag-t3-revenue-model` (AG-T3.8, booking/pricing/revenue) and `ag-t6-phased-launch`
(AG-T6.6, phased launch & financial viability), verbatim, no gating.

## AG-T5.4 rubric deviation (flagged for operator review)

`ag-t5-food-integration` ("design farm-to-guest integration feedback loop",
AG-T5.4) has exactly **4** checklist items; the Catalogue Authoring Standards v1.4
rubric requires **>= 5**. The Agritourism doc is body v1.0 / Standards v1.3,
predating the floor. Rather than invent a 5th item (forbidden) or silently weaken
a shared invariant, encoded verbatim at 4 and added a narrow documented allowlist
in `catalogues.test.ts`: `SHORT_OBJECTIVE_ALLOWLIST = { 'ag-t5-food-integration' }`,
so the floor stays 5 for every other and every future v1.4 catalogue. **Removal
condition:** if a fresher Agritourism doc (>= v1.4) arrives, re-encode AG-T5.4 to
>= 5 items and drop the allowlist entry. Surfaced to the operator in the completion
report.

## resolveProjectObjectives test premise update

The "skip-not-throw on a real pairing" block in
`relationships/__tests__/resolveProjectObjectives.test.ts` used `agritourism` as a
stand-in for an **unencoded** primary (resolved 19 + 6 residential-additive = 25).
Encoding agritourism changed that to 19 + 29 + 6 = **54**; updated the count, test
name, and comment block. Intent preserved + still green: residential's P0 patch
targets `rf-t1-landscape-context` (a regenFarm objective), absent under an
agritourism primary -- agritourism has its OWN `ag-t1-landscape-context`, a
different id -- so P0 still skips (recorded, not thrown), P1-P4 land, tension-9
still surfaces. Verified by grep that no other test assumed agritourism unencoded
(only `schemas.test.ts` enum-membership, unaffected).

## Verification

Shared `pnpm --filter @ogden/shared run typecheck` clean (no economic objective
trips the schema -- all the new fields are the same defaulted ones from sub-slice
B). `pnpm --filter @ogden/shared run test` -> **697 / 697 pass**, `catalogues.test.ts`
at 22 tests including the two new resolution blocks (Ecovillage 31/50,
ref-uniqueness, global checklist-id uniqueness; Agritourism 29/48, same) and the
source-discipline tests (`source: 'primary'`, correct `sourceTypeId`). No UI / web
change this slice (pure data through the seam), so no preview verification needed.

## Branch state

`feat/atlas-permaculture`. Two explicit-path slice commits (`416b48d2` Ecovillage,
`7b81931a` Agritourism) -- staged exactly 4 files each by path, `git diff --cached
--name-only` confirmed before each commit, fetch + divergence-check before push per
[[feedback-commit-immediately-on-rebased-branches]]. Pushed clean fast-forward
(`416b48d2..7b81931a`), post-push divergence 0/0. This ADR + log entry + index/log
pointers land in a separate `docs(wiki)` commit. Heavy foreign WIP from parallel
sessions (capitalPartnerSummary, EconomicsPanel, financialStore, the Design/Diagnose/
OperateMap trio, MaterialSubstitutions, graphify-out/*, ZoneSomSidebar, scratch
`_*.txt` / `tsc_*.txt` / `vitest_*.txt`) left uncommitted per [[feedback-no-deletion]].
CSRA model untouched; ASCII-only copy. Next economic catalogue when scheduled:
**Wellness** -- now encoded (2026-05-30, commit `81812c20`); see
[[log/2026-05-30-atlas-wellness-catalogue]].
