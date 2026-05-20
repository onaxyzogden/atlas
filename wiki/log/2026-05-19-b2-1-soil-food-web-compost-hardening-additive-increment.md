# 2026-05-19 — B2.1: soil food-web / compost hardening (additive increment)


**Branch.** `feat/atlas-permaculture`. After the planning session found
B2 already fully built/verified/pushed out-of-band
([[decisions/2026-05-18-atlas-b2-soil-food-web]], `d6af134a..ba3b5b7c`),
the user chose **"Harden B2 gaps"**. Implemented B2.1 — three additive,
non-covenant, B1/B2-template-mirrored parts filling functional holes
*beyond* the original B2 spec:

1. New B2-owned static `compostMethodSpec.ts`
   (`COMPOST_METHOD_SPEC: Record<CompostMethod,_>` — C:N band, turn
   cadence, cure weeks, temp band, `volumeRetention`, heuristic note),
   replacing `CompostCycleCard`'s single free-text `METHOD_HINT`.
2. New pure `compostYieldMath.ts` — `projectInventoryVolumeM3`,
   `estimateYield` (raw × method `volumeRetention`, coarse, explicitly
   not lab-grade) + the GREENS/BROWNS catalog + mass-weighted
   `aggregateCN` **extracted verbatim** from `SoilResourcesCard.tsx`
   (the card had no colocated test; the new module's reference-case
   tests are the extraction lock — rendered numbers unchanged by
   construction).
3. Three **optional** `CompostBatch` fields (`appliedToZone?`,
   `applicationDateISO?`, `applicationRateNote?`; `version:1` unchanged,
   no `migrate`) surfaced in `CompostCycleCard` via the existing
   `patch()` auto-persist path + spec-driven hint + display-only
   projected-yield line + non-blocking cured-without-application
   warning.

**Covenant.** Strictly additive, non-covenant — "yield" is compost
volume, never financial return (no riba/gharar/CSRA/salam/investor/
financing/cost-of-capital framing; covenant `not.toMatch` in both new
test files + release-gate grep PASS). A-series additive covenant held:
no DB migration / API / schema / goal-tree / `Record<PlanModule,_>` /
`syncManifest` / spine change; **no registration change** (cards already
mounted, `soil-fertility` already a `PlanModule`).

**Verification.** Web tsc 0 B2.1 errors, shared tsc exit 0; vitest
`compostMethodSpec` 6 + `compostYieldMath` 12, full web suite green (no
regression vs the prior 1233 baseline; extraction lock reproduces
`SoilResourcesCard`'s reference C:N cases exactly); `vite build` exit 0;
additive-isolation audit PASS (`version:1`/no-`migrate` intact). Live
screenshot disclosed-blocked by the known MapLibre/WebGL hang — static
+ unit proof authoritative (B2 precedent).

**Commits.** Per-task explicit-path commits on `feat/atlas-permaculture`
(`feat(plan)` ×3 + this `docs(wiki)`); **not pushed** (branch rebased
out-of-band — push is a separate explicit instruction). ADR:
[[decisions/2026-05-19-atlas-b2-1-soil-compost-hardening]]. B-series
remaining: B3 rotational-grazing → B4 → B5.
