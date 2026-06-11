# 2026-06-11 — Deep audit (report-only): friction + missing-content scan

**Branch:** main (6 commits ahead of origin, not pushed). **Mode:** report-only by operator decision — no source/config/git-index changes; docs commit only.

## What happened

Pre-testing comprehensive scan of OLOS for friction points and missing content / incomplete references / inconsistencies. Three parallel exploration passes (workflow+UX friction; content & cross-reference integrity; consistency & repo hygiene), High/contested claims then verified firsthand. Full report: [ATLAS_DEEP_AUDIT_2026-06-11.md](../../ATLAS_DEEP_AUDIT_2026-06-11.md) (repo root, follows prior audit convention).

## Headline results

- **Zero High-severity unknown defects.** Imports clean, no web↔API contract drift, no shared-package drift, catalogues complete for all 15 types (objectives + protocols), Amanah scopeNotes verbatim on CSA/meat-share/season-pass objectives, 63-entry Act tool catalogue fully armable under the `actToolCoverage.test.ts` ratchet, vitest `pool:'forks'` guards in place, all 8 feature flags gated.
- **Prior audits 21/24 resolved** (04-14: 9/11, 04-19: 5/6, 04-21: 6/7), no regressions.
- **Backlog filed P1–P3** in the report: P1 = portal cache/rate-limit (already a documented deferral, 2026-05-04 decision D2+D4), 18 tracked junk files to `git rm --cached`, `pnpm audit` for fast-jwt CVE-2023-48223, Scalar docs dep (**operator decision: WIRE the endpoint later, don't remove**). P2 = observeCycleStore has no server bootstrap (multi-device staleness), wsService project-switch re-fetch TODO, SocialFabric/InfraCondition still unported from phase-3d, ClaudeClient narrative/design-rec methods uncalled.
- **Foreign WIP untouched**: the 4 uncommitted files (ActTierShell / actToolCatalog / DesignElementLayers / objectiveActTools) verified as one coherent guild-tool feature with the `keepAbovePrefix` z-order chain complete; left modified-unstaged byte-identical.

## Contradiction resolved

The standing claim that the dependency gate is unbound for typed projects (`authoring.ts:139` hardcodes empty prereqs; MTC never locks) is **obsolete**: `authoring.ts` `obj()` (line 198) defaults every objective to `[...STRATUM_PREREQS[stratumId]]` (explicit `[]` required to opt out; universal-ids-only invariant enforced by `spineGate.conformance.test.ts`), and `buildActLockContext` (`apps/web/src/routes/index.tsx:155-180`) enforces the gate with route redirects. Session memory corrected accordingly.

## Operator decisions recorded

1. Audit session scope = report-only; fixes deferred to later sessions per the P1–P3 backlog.
2. `@scalar/fastify-api-reference`: resolve by wiring the docs endpoint (~3-5 lines in `app.ts`), not by removing the dependency.
