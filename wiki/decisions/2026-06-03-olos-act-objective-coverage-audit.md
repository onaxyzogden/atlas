# ADR: Act-stage objective coverage audit + per-type tool overrides (homestead first)

**Date:** 2026-06-03
**Status:** accepted

**Context:**
The operator asked whether *every single objective* across all project types has
an Act-stage tool that lets a user **complete** and **record completion** of its
task set. There was no deterministic proof — ~200 objectives resolve per-type,
and `OBJECTIVE_ACT_TOOLS_OVERRIDE` only carried explicit entries for the
universal baseline + silvopasture. All 12 other type catalogues (homestead
`hms-*`, regenerative_farm, market_garden, orchard_food_forest, ecovillage,
agritourism, education, conservation, off_grid, wellness, nursery,
livestock_operation) fell through to the coarse `STRATUM_ACT_TOOLS_DEFAULT` —
the exact misalignment that forced the explicit silvopasture overrides on
2026-06-01. Homestead is the active vertical slice's *primary* type and was
uncovered.

**Decision:**
1. Built a deterministic, read-only **audit script**
   (`scripts/audit-act-objective-coverage.ts`, run via `tsx`) that drives the
   same `@ogden/shared` resolvers the live UI uses
   (`resolveProjectObjectives`, `getObjectiveActTools`, `getObjectiveEvidence`,
   `getPrimaryDomainForObjective`) and emits a per-objective coverage matrix
   (`scripts/audit-out/act-objective-coverage.md`) across all 14 types
   (13 primary + residential as a secondary layer). The human-readable
   classification + remediation lives in
   `scripts/audit-out/act-coverage-findings.md`.
2. Classified the gaps into three classes:
   - **Gap A** — objectives resolving to the coarse stratum default rather than
     a precise per-type override (a *precision* gap, not an availability gap).
   - **Gap B** — `Record observation` hard-disabled by a null primary Observe
     domain. **Audit finding: Gap B = 0** — the Record path is never structurally
     blocked; every objective is completable and recordable today via the
     universal `ActTierExecutionPanel` (checklist + evidence + Record).
   - **Gap C** — objectives resolving to `[]` bottom-rail tools (decision/strategy
     objectives served by checklist + summary-note, vs. accidental empties).
3. **Remediation R1 (this ADR):** authored explicit `OBJECTIVE_ACT_TOOLS_OVERRIDE`
   entries for **homestead first** (active slice primary) — 15 `hms-*` entries:
   8 spatial objectives grounded to real `ACT_TOOL_CATALOG` tools (each tool id
   verified against a real checklist item), 7 decision/financial objectives set
   to an intentional, gap-noted `[]` (correcting 6 that previously showed
   misaligned stratum-default tools, e.g. buildings/barns/tanks on a budget
   objective).
4. **Remediation R3 (this ADR):** ratcheted
   `apps/web/src/v3/act/tier-shell/__tests__/actToolCoverage.test.ts` to assert
   every homestead objective has an explicit override entry (an explicit `[]`
   satisfies the ratchet; only a brand-new un-wired `hms-*` objective trips it),
   alongside the existing universal + silvopasture assertions.
5. **Remediation R2 (form-arm tools for the ~30 s1 vision objectives): DEFERRED.**
   The existing form tools are hardwired to the universal `s1-vision-c*` formIds
   and prompts; reusing them on per-type s1 objectives is semantically wrong, and
   authoring new per-type form prompts = inventing operator-reviewed catalogue
   content (forbidden). The universal `s1-vision` (with its form arms) already
   resolves into every project, so the completion path is not blocked.

**Consequences:**
- A repeatable audit now proves coverage rather than eyeballing ~200 objectives;
  re-run it after any catalogue or override change.
- Homestead objectives surface their own tools; decision objectives resolve a
  deliberate `[]`. Audit re-run after R1: Gap A 271→256, Gap B 0,
  Gap C 41→47 (18 intentional / 29 default-driven).
- The remaining 11 primary types (256 Gap-A objectives) are wired with the same
  grounded-candidate method — every tool id verified against a real checklist
  item + a mountable `ACT_TOOL_CATALOG` tool; decision/strategy objectives →
  gap-noted `[]`. Suggested order: regenerative_farm, market_garden, orchard.
- The `olos_*` proof/verification backend remains unwired into the live Act UI
  (separate epic; out of scope).
- All final tool mappings are operator-reviewable catalogue content, not invented
  ([[feedback-csa-in-catalogues]] content-discipline rule applies).

Commit `61a56ae6` (4 files; not pushed). Builds on the silvopasture override
precedent ([[entities/act-tier-shell]]). A pre-existing, unrelated
`resolveProjectObjectives.test.ts` count assertion (stale after the agritourism
AG-S4.8 membership extension, `15680301`) was proven independent via stash and
flagged for a separate fix; not touched here.
