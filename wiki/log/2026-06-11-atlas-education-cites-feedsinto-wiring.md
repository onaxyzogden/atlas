# 2026-06-11 — Education upstream cites + universal feedsInto wiring (audit backlog #3 close + #1)

**Branch:** main. **Scope:** four files — `catalogues/education.ts`, `catalogues/universal.ts`, `catalogues/authoring.ts`, and the (still-uncommitted) `__tests__/spineTraceability.conformance.test.ts` (**not committed**).

## What happened

Two linked remediations from the 2026-06-11 stratum traceability audit ([STRATUM_TRACEABILITY_AUDIT_2026-06-11.md](../../STRATUM_TRACEABILITY_AUDIT_2026-06-11.md) §9; [[log/2026-06-11-atlas-stratum-traceability-audit]]):

1. **Backlog #3 (final slice) — education upstream cites.** With ecovillage + agritourism done in the prior session ([[log/2026-06-11-atlas-upstream-cites-agritourism-ecovillage]]), the education catalogue was the remaining "Moderate"-traceability type. 13 required upstream-cite `ck()` items were authored into its transitive-only S4–S7 objectives, using the file's own **"Tier N" convention** (Tier 0 -> S1, Tier 1 -> S2, Tier 2 -> S3 — matching its only pre-existing cite, "regulatory framework from Tier 0").
2. **Backlog #1 — universal feedsInto forward wiring.** The 31 S2/S3 survey items in `universal.ts` (s2-terrain, s2-climate, s2-ecology, s2-infrastructure, s3-hydrology, s3-soil) previously all declared `feedsInto: []`. They now name which S4/S5 design objective each survey item informs.

## Education: 13 items authored (1 skip)

Skipped `edu-s4-food-hospitality` — its c5 already cites the Tier-0 regulatory framework. This is **13, not the audit's 12-transitive count**: `edu-s4-safety-risk-framework` already hard-gates on its *own* S4 site risk assessment, but that is not an upstream cite, so it still received a Tier-2 learner-access-survey cite (c7). Each new item is a required `ck()` appended to the checklist and to exactly one existing decision group (full-partition invariant preserved); no `mode` (EXPECTED_MODES fidelity); ASCII-only; both authored-c5 provenance comments and all three hard-gate scopeNotes byte-untouched.

| Objective | New item | Tier cite |
|---|---|---|
| edu-s4-teaching-zone-allocation | c7 | Tier 1 site learning potential + teaching infrastructure |
| edu-s4-safety-risk-framework | c7 | Tier 2 learner access & safety survey |
| edu-s4-program-delivery | c6 | Tier 0 program types + max group sizes |
| edu-s5-teaching-spaces | c6 | Tier 1 teaching infrastructure capacity & acoustics |
| edu-s5-demo-plots-signage | c6 | Tier 2 demonstration site baseline |
| edu-s5-learner-amenity | c6 | Tier 2 learner access & safety findings |
| edu-s5-food-kitchen | c6 | Tier 0 food handling permit requirements |
| edu-s6-program-evaluation | c6 | Tier 0 mission + learning outcomes |
| edu-s6-external-relations-compliance | c6 | Tier 0 regulatory framework obligations |
| edu-s6-adaptive-management | c6 | Tier 2 demonstration site baseline |
| edu-s7-program-launch | c6 | Tier 0 program types + annual calendar |
| edu-s7-instructor-onboarding | c6 | Tier 0 regulatory framework (children checks) |
| edu-s7-financial-viability | c7 | Tier 0 max group sizes + program calendar |

## feedsInto wiring: 31 items -> 5 consumers

`ck()` was extended additively with an optional `feeds?: string[]` opt (emits `feedsInto: opts.feeds ?? []`); `ckA`/`ckF` untouched, every existing `ck()` call byte-identical in output. The mapping (operator-approved authoring decision) targets the five transitive-only S4/S5 consumers the audit named:

- **s4-zones** x13 (terrain, climate, ecology, infrastructure, soil-type)
- **s5-water-infrastructure** x10 (terrain, climate, ecology, hydrology, soil)
- **s4-water-strategy** x7 (terrain elevation, climate rainfall, ecology water habitat, infra utilities, hydrology)
- **s5-soil-improvement** x6 (terrain erosion, hydrology runoff, soil profile/texture/pH/drainage)
- **s5-access** x6 (terrain topo/slopes/erosion, ecology corridors, infra roads/legal-access) — the audit's strongest single gap, now tethered

`s4-direction` deliberately not a target (already prose-cites all surveys as the synthesis objective). The UI consumption path already exists ([DecisionChecklist.tsx:631](../../apps/web/src/v3/plan/strata/DecisionChecklist.tsx) renders "Feeds" chips; the Act Tier-0 workbench derives feed labels), so the wiring lights up chips on these 31 rows immediately — partially delivering backlog #4's surface, though dedicated reverse "Informed by" chips remain open.

## New conformance coverage (backlog #1 guard)

Added a third describe block to `spineTraceability.conformance.test.ts` (3 new assertions, 11 -> 14): every `feedsInto` target resolves to a known objective; every target sits in a strictly later stratum than its source item (forward-only, acyclic); and each of the five named consumers receives >=1 feed (floor pin against silent regression to fully-unwired).

## Verification

- `catalogues.test.ts` **107/107**, `spineTraceability.conformance.test.ts` **14/14**, `spineGate.conformance.test.ts` **30/30** — bounded forks pool ([[feedback-vitest-bounded-runs]]); packages/shared `tsc --noEmit` **clean**.
- apps/web `DecisionList.test.tsx` green; `ActTierZeroWorkbench.test.tsx` **43/44** — the 1 failure (`:523`, expects no mode badges on s1-vision) **proven pre-existing** by stashing this session's three catalogue/authoring files and re-running (identical 1 failed / 43 passed). Originates in the out-of-band dirty `ActTierShell.tsx`/`actToolCatalog.ts` WIP, not this session.
- `git status`: this session's delta is exactly education.ts + universal.ts + authoring.ts + the spineTraceability test. Foreign WIP (projectStore.ts, ActTierObjectiveRail/Shell/Spine.tsx, actToolCatalog.ts, DesignElementLayers.tsx, ObjectiveDetailPanel.tsx, new plan/tier-shell/ dir) untouched ([[feedback-no-deletion]]).

## Amanah

Education is a clean land/education-stewardship catalogue (only money objective EDU-S7.6 is ordinary fee-for-service; no advance sale, no riba/gharar). The new financial-viability cite (c7) references only Tier-0 group sizes and the program calendar — no commercial instrument introduced.

## Remaining backlog from the audit

#4 optional dedicated "Informed by" reverse UI chips (unblocked by this session's feedsInto wiring, not in scope). Backlog #1, #2, #3 now all closed (pending commit).
