# 2026-06-11 — Upstream S1–S3 cites authored into agritourism + ecovillage S4–S7 (audit backlog #3)

**Branch:** main. **Scope:** two catalogue files only — `packages/shared/src/constants/plan/catalogues/ecovillage.ts` + `agritourism.ts` (**not committed**).

## What happened

Executed deferred remediation **#3** from the same-day stratum traceability audit ([STRATUM_TRACEABILITY_AUDIT_2026-06-11.md](../../STRATUM_TRACEABILITY_AUDIT_2026-06-11.md) §9; [[log/2026-06-11-atlas-stratum-traceability-audit]]): the two sparsest catalogues — ecovillage (~16/20 transitive-only) and agritourism (~19/22) — got explicit upstream-cite checklist items in their S4–S7 objectives, following the offGrid "Confirm X against Tier-N Y" pattern rendered in the in-file "Stratum N" phrasing. Each new item is a **required** `ck()` appended to the objective's checklist and to one existing decision group (full-partition invariant preserved); labels derive only from existing in-catalogue S1–S3 titles/labels (derive-and-author mode — no invented facts or numbers); ASCII-only; no completionGate/title/scopeNote/existing-item changes.

## Authored: 32 items (16 ecovillage + 16 agritourism)

- **Ecovillage (16):** every S4–S7 objective from `ev-s4-infra-strategy` through `ev-s7-exit-succession` now carries one cite item (c6/c7) naming a Stratum 1 decision (financial governance, decision-making process, community agreements, provision balance, legal entity & tenure), Stratum 2 finding (max sustainable population, founding-group cohesion, food production potential, planning environment), or Stratum 3 survey (existing-structure reuse/renovation, waste volumes & soil treatment, energy demand & generation, infrastructure condition).
- **Agritourism (16):** S4 circulation/service-model/food-strategy/safety-compliance/revenue-model/biosecurity-zoning, S5 dining/programming/sanitation/safety infra, S6 experience-feedback/compliance-monitoring/food-integration, S7 staffing-training/booking-system/phased-launch — each citing the Stratum 1 experience vision, visitor capacity, operational boundaries, regulatory framework, or commercial proposition; Stratum 2 arrival experience or seasonal patterns; or Stratum 3 food production capacity, emergency access, or water & sanitation demand.

New items carry **no `mode`** — `EXPECTED_MODES` in `catalogues.test.ts` pins modes as verbatim OLOS-prototype-badge transcriptions; inventing badges would break source fidelity. Appending c6/c7 ids to capture-backed objectives (`ev-s7-exit-succession`, `ev-s4-financial-model`) is safe: `exitSuccessionModeFor()`-style resolvers return null for unknown suffixes and DecisionWorkingPanel falls through to generic free-text capture (test-pinned at `ExitSuccessionCapture.test.tsx:87`).

## Deviation from the approved 35-item plan (called out per the plan's deviation clause)

**3 of the 19 mapped agritourism objectives were already satisfied** — they carry explicit S1–S3 cites in the newer `AG-SN.x` ref notation, which the audit's "Stratum N"-phrasing count missed: `ag-s5-dispersed-siting` (c1/c6 → AG-S3.7 carrying capacity + AG-S3.4 sensory environment), `ag-s5-decentralised-servicing` (c6 → AG-S3.3 water/sanitation + AG-S3.7), `ag-s7-seasonal-resilience` (c6 → AG-S2.8 seasonal patterns). Authoring duplicates would have violated the approved "complement, not duplicate" rule, so they were **skipped** — net 32 items, not 35. Two near-misses kept their mappings: `ag-s4-revenue-model` c10's AG-S3.7 cite sits in the *optional* membership block (the new c12 gives core viability an unconditional S1 cite); `ag-s4-biosecurity-zoning` c6 cites only AG-S4.4 (same-stratum).

## Verification

- `catalogues.test.ts` **107/107**, `spineTraceability.conformance.test.ts` **11/11**, `spineGate.conformance.test.ts` **30/30** — all bounded forks pool ([[feedback-vitest-bounded-runs]]); packages/shared `tsc --noEmit` clean.
- ev workbench suites (apps/web): `AdaptiveManagementCapture` **22/22**, `ExitSuccessionCapture` **18/18**, `ActTierZeroWorkbench` **41/42** — the 1 failure (`:499`, expects no mode badges on s1-vision) was **proven pre-existing** by stashing both catalogue edits and re-running: identical failure without them. It originates in the out-of-band dirty `ActTierShell.tsx`/`actToolCatalog.ts` WIP, not this session.
- `git status`: only the two catalogue files newly modified by this session.

## Amanah

The `ag-s4-revenue-model` and `ag-s7-seasonal-resilience` scopeNotes (membership/season-pass bayʿ mā laysa ʿindak flags, Scholar Council routing) are **byte-untouched**; the new c12 cites only the Stratum 1 commercial proposition and visitor capacity — no new commercial instruments introduced.

## Remaining backlog from the audit

#1 wire universal `feedsInto` (operator authoring decision) and #4 optional "Informed by" UI chips. Education catalogue cites were named in the audit's remediation #3 but were **not** in this session's approved scope (ag + ev only) — still open if the operator wants them.
