# 2026-05-19 — B2.1: Soil food-web / compost hardening (additive)

**Status:** Implemented & verified. Per-task explicit-path commits on
`feat/atlas-permaculture` (`feat(plan)` ×3 + this `docs(wiki)`); **not
pushed** (branch rebased out-of-band — push is a separate explicit
instruction). Live-preview screenshot disclosed-blocked by the known
MapLibre/WebGL hang (cards sit deep behind the `soil-fertility` Plan
slide-up); the pure math tests + tsc + the extraction lock are the
authoritative proof, per the B2 screenshot-honesty precedent.

**Context source:** User chose **"Harden B2 gaps"** after the planning
session found B2 already fully built/verified/pushed out-of-band
([[2026-05-18-atlas-b2-soil-food-web]], commits
`d6af134a..ba3b5b7c`). The original B2 spec
(`docs/superpowers/specs/2026-05-18-b2-soil-food-web-design.md`) was met
in full; B2.1 fills three functional holes that sit *beyond* that spec.
Builds on the B1/B2 template
([[2026-05-18-atlas-b1-plant-system-design-integrity]]).

## Decision

Three additive parts, template-mirrored (pure module + colocated tests
+ display-only / auto-persist surfaces; **no goal-tree criterion** —
EdgeConnectivity / TemporalCoherence / B1 / B2 precedent; no observation
stream to score):

1. **Structured compost-method spec.** New B2-owned static table
   `compostMethodSpec.ts` (`COMPOST_METHOD_SPEC: Record<CompostMethod,
   CompostMethodSpec>` — C:N band, turn cadence, cure weeks, temp band,
   `volumeRetention`, one heuristic note). Replaces
   `CompostCycleCard`'s single free-text `METHOD_HINT` string; the union
   `CompostMethod` is reused from `compostCycleStore`, not redeclared.
2. **Compost-yield + C:N projection.** New pure `compostYieldMath.ts`:
   `projectInventoryVolumeM3`, `estimateYield` (raw × method
   `volumeRetention`, coarse heuristic, explicitly not lab-grade), and
   the GREENS/BROWNS catalog + mass-weighted `aggregateCN` **extracted
   verbatim** from `SoilResourcesCard.tsx`. The card now imports them;
   rendered numbers unchanged by construction — locked by the new
   module's reference-case tests (the card had no colocated test).
3. **Amendment-application plan.** Three **optional** fields appended to
   `CompostBatch` (`appliedToZone?`, `applicationDateISO?`,
   `applicationRateNote?`). `version:1` unchanged, **no `migrate`** —
   optional fields are `undefined` on old persisted rows, already
   tolerated by the card's `?? ''` pattern. No store-action signature
   change (`updateBatch` round-trips the whole batch). `CompostCycleCard`
   gains the 3 inputs via the existing `patch()` auto-persist path, a
   spec-driven hint line, a **display-only** projected-yield line (no
   new store read, no cross-store write), and a non-blocking
   "cured but no application target" warning.

## Covenant & scope boundary

Strictly additive, non-covenant. "Yield" is **compost volume**, never
financial return — no riba/gharar/CSRA/salam/investor/financing/
cost-of-capital/advance-purchase framing. A-series additive covenant
held: **no** DB migration, API endpoint, schema, goal-tree,
`Record<PlanModule,_>` change, new `PlanModule` member, `syncManifest`
entry, or spine mutation. Enforced by: covenant `not.toMatch` assertions
in both new test files + the release-gate covenant grep over the five
touched files (only hits are the two negative-declaration
doc-comments — no real financing field/value/logic). **No registration
change** — `plan-soil-foodweb` / `plan-compost-cycle` are already
mounted and `soil-fertility` is already a `PlanModule`. Legacy untouched
beyond the pure `SoilResourcesCard` extraction.

## Scope delivered

- **New** `apps/web/src/v3/plan/cards/soil-fertility/compostMethodSpec.ts`
  + tests `__tests__/compostMethodSpec.test.ts` (6 — exhaustive Record,
  ordered bands, retention ∈ (0,1], null-means-no-turn, covenant).
- **New** `apps/web/src/v3/plan/cards/soil-fertility/compostYieldMath.ts`
  (also home of the extracted GREENS/BROWNS + `aggregateCN`) + tests
  `__tests__/compostYieldMath.test.ts` (12 — inventory sum, monotonic
  yield, `finishedM3 ≤ feedstockM3`, single-feedstock ratio = its C:N,
  equal grass+straw lands in Cornell 25–35 band, covenant).
- **Edit** `compostCycleStore.ts` — 3 optional `CompostBatch` fields.
- **Edit** `CompostCycleCard.tsx` — spec hint, display-only yield line,
  3 optional amendment inputs, cured-without-application warning.
- **Edit** `SoilResourcesCard.tsx` — pure extraction (imports the
  catalog + `aggregateCN`; behaviour-identical, no rendered change).

## Verification

- web `tsc --noEmit`: no B2.1 error (filtered grep over the five files +
  new modules empty; only pre-existing out-of-band D0 errors remain).
  `packages/shared` tsc exit 0 (untouched).
- Vitest targeted: `compostMethodSpec` 6, `compostYieldMath` 12,
  `soilFoodWebMath` 10 (unchanged — extraction is a separate module),
  `compostCycleStore` 5 (unchanged — additive optional fields). Full
  web suite green, no regression vs the prior 1233 baseline.
- Extraction lock: `compostYieldMath.test.ts` reproduces
  `SoilResourcesCard`'s reference C:N cases exactly.
- `vite build` exit 0.
- Covenant grep PASS; additive-isolation audit PASS (only the 5 B2.1
  files + 2 new test files changed; `version:1`/no-`migrate` intact).
- Live-preview screenshot disclosed-blocked (MapLibre/WebGL hang) — no
  screenshot claimed; static + unit proof is authoritative (B2
  precedent).

## Notes & deferred

- Optional happy-dom `CompostCycleCard` test deferred — B2 itself
  shipped the card test-free; the pure math modules are the gate.
- Cross-card navigation from the amendment plan to a guild/zone is
  **deferred** (YAGNI — no intra-Plan nav API; the field is a
  free-text label by design).
- B-series remaining: B3 rotational-grazing sequencer → B4 → B5.

## References

- [[2026-05-18-atlas-b2-soil-food-web]] — the B2 slice B2.1 hardens.
- [[2026-05-18-atlas-b1-plant-system-design-integrity]] — the template.
- [[2026-05-18-atlas-bd-subproject-decomposition]] — B1–B5 roadmap.
