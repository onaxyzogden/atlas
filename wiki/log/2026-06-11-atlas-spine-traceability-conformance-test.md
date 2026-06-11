# 2026-06-11 — Global spine-traceability conformance test (audit backlog #2)

**Branch:** main. **Scope:** one new test file, zero source/catalogue changes (**not committed**).

## What happened

Executed deferred remediation **#2** from the same-day stratum traceability audit ([STRATUM_TRACEABILITY_AUDIT_2026-06-11.md](../../STRATUM_TRACEABILITY_AUDIT_2026-06-11.md) §9; [[log/2026-06-11-atlas-stratum-traceability-audit]]): a **global static conformance test** that permanently closes the silent-permanent-lock latent risk for future catalogue authoring. Where `spineGate.conformance.test.ts` resolves only 6 representative project-type combos, the new suite sweeps **every authored objective in every encoded catalogue** via `allCatalogueObjectives()` (currently 222 standalone), plus the legacy fallback skeleton.

## The new suite

`packages/shared/src/constants/plan/__tests__/spineTraceability.conformance.test.ts` — 11 tests, 3 describe blocks:

1. **`STRATUM_PREREQS` well-formedness** — S1 is the ungated entry tier; every gate id is a universal objective in the immediately prior stratum; every stratum after S1 has a non-empty gate.
2. **Global catalogue sweep** — sanity floor (≥222 objectives, proves the sweep never goes vacuous); **universal-ids-only** (every `prerequisiteObjectiveId` on every authored objective resolves in `UNIVERSAL_PLAN_OBJECTIVES` — the documented CRITICAL INVARIANT whose violation silently locks an objective forever on dropped-secondary combos); **strictly-earlier-stratum** (prereq graph acyclic by construction); **every non-S1 objective reaches S1 transitively**; **every S4+ objective reaches Stratum 1, 2, AND 3 transitively** — the audit's structural-PASS verdict, now codified.
3. **Legacy fallback skeleton** (`PLAN_STRATUM_OBJECTIVES`, live as level-3 resolution for null-type projects) — same invariants within its self-contained id space (prereqs resolve internally, strictly earlier, S4+ reaches S1–S3).

A deliberate future `[]` opt-out outside S1 will fail the reachability assertions here first — relaxing them must be a conscious edit, per the header comment.

## Verification

- New suite **11/11 green** on the bounded forks pool ([[feedback-vitest-bounded-runs]]); sibling `catalogues.test.ts` + `spineGate.conformance.test.ts` re-run together: **137/137 green**.
- **Negative test proven:** temporarily injected `prerequisiteObjectiveIds: ['ag-s4-revenue-model']` (a non-universal primary id) onto `ag-s5-accommodation` — exactly 3 assertions failed naming the objective (universal-ids-only + both reachability checks), then reverted; `agritourism.ts` byte-identical (clean in `git status`).
- Worktree note: `apps/api/src/app.ts` left the dirty set out-of-band since the audit session, while `apps/api/package.json` + root `package.json` + `pnpm-lock.yaml` appeared dirty — none touched by this session (foreign WIP, [[feedback-no-deletion]]).

## Remaining backlog from the audit (unchanged)

#1 wire universal `feedsInto` (operator authoring decision), #3 author upstream cites for agritourism/ecovillage/education, #4 optional "Informed by" UI chips.

Amanah: test-only guardrail on the planning spine — no ethical exposure.
