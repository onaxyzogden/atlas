# 2026-06-07 -- EvLegalGovernanceCapture (SP1 Group 2: 8-decision legal/tenure/governance Tier-0 capture)

- **Branch:** `feat/structured-capture-forms` (clean explicit-path commits LG0 catalogue + LG1-3 pure core -> `6f9e04c9` [LG4] -> `ffcc5f22` [LG5] -> `16b39bf3` [LG6] -> `c10c52a6` [LG7] -> `be5b662a` [LG8] -> `c07efb0a` [LG9] -> `b0add7af` [I1 follow-up]; docs this entry; **not pushed**).
- **Plan:** `expressive-imagining-book.md` (SP1 Group 2, tasks LG0-LG9 + Verification), under the OLOS mockup-batch rollout umbrella (Ecovillage vertical first).
- **Decision:** [[decisions/2026-06-07-atlas-ev-legal-governance-capture]]
- **Entity:** [[entities/act-tier-shell]]

## What and why

Group 2 of the OLOS mockup-batch rollout. Builds the Tier-0 Decision Workbench capture for the Ecovillage objective `ev-s1-legal-governance` (EV-S1.4 "Legal entity, tenure & governance model"), faithful to the operator mockup `olos_legal_entity_tenure_financial.html`. Two operator decisions framed the work: source of truth = mockup + catalogue (no spec/triage doc existed on disk); jurisdiction = add a new c8 catalogue item (the only mockup decision with no catalogue counterpart) so the surface matches the mockup 1:1 at 8 decisions. Only Group 2 in scope this pass; Groups 3-4 get their own plans.

## Architecture / key decisions

(Full rationale + alternatives in the ADR [[decisions/2026-06-07-atlas-ev-legal-governance-capture]].)

- **c8 catalogue item (additive, slot 2).** `ev-s1-legal-governance-c8` ("Confirm governing jurisdiction...") inserted at index 1 of `checklist` + dg1 `itemIds` in `ecovillage.ts`. Item ids are arbitrary strings, so c2-c7 were not renumbered. Objective now 8 items / dg1 holds 3. No item retired -> no persisted-value orphaning.
- **FIVE coupled id sources (load-bearing).** A per-item id is referenced from: (1) `ecovillage.ts` checklist, (2) `ecovillage.ts` dg1.itemIds, (3) `objectiveActTools.ts` OBJECTIVE_ACT_TOOLS_OVERRIDE, (4) `actToolCatalog.ts` ACT_TOOL_CATALOG, (5) the capture's `legalGovernanceModeFor`. LG0 updated 1-3; **source 4 was missed** -> CI red + c8 panel header missing. Caught by final review (I1), fixed in `b0add7af`.
- **One self-routing `EvLegalGovernanceCapture`, eight modes.** ONE `isLegalGovernance` flag + ONE body-router arm in `DecisionWorkingPanel`; pure TOTAL `legalGovernanceModeFor(itemId)` drives body + `DecisionList` badge: c1 `legalEntityPicker` (Entity options), c8 `jurisdiction` (Jurisdiction), c2 `entityDecisionRecord` (Decision record), c3 `tenureModel` (Tenure model), c4 `decisionFramework` (Decision framework), c5 `financialGovernance` (Financial governance), c6 `membershipRegister` (Membership register), c7 `legalAdviceGate` (Legal advice gate).
- **Flat FormValue, exact decode/encode inverse.** Scalars as strings; c6 rights/obligations as independent `string[]` (NOT zipped rows). `encodeLegalGovernance` is the exact private inverse of `decodeLegalGovernance` per mode (round-trip unit-tested); decoders TOTAL (`asArr`/`asStr`); no object array on any key, no `any`.
- **c7 legal-advice HARD GATE.** Valid only when `adviceScope.length >= 5 && adviceWritten === 'yes'`; panel disables Record + shows "Clear all 5 advice-scope items and confirm written advice before recording." `adviceDate` recorded but not gated. Mirrors Group 1 c4.
- **Field option sets verbatim from the mockup** (`fieldOptions.ts` `_base` sets), em-dashes -> ` - `, ASCII-only.
- **Predicate widen only.** `ev-s1-legal-governance` added to `TIER_ZERO_OBJECTIVE_IDS` (`ActTierShell.tsx`); all 8 modes persist via the existing `actEvidenceStore.visionFormData[itemId]` path.

## Commits (SDD: implementer per task, two-stage review + explicit-path commit)

- **LG0** -- `feat(shared)`: add c8 governing-jurisdiction item to `ev-s1-legal-governance` catalogue (`ecovillage.ts` + `objectiveActTools.ts`).
- **LG1-3** -- `feat(act-tier0)`: `EvLegalGovernanceCapture` pure core -- decode/encode/valid/summarise + tests.
- **LG4 `6f9e04c9`** -- `feat(act-tier0)`: legal-governance field option sets (`fieldOptions.ts`).
- **LG5 `ffcc5f22`** -- `feat(act-tier0)`: `EvLegalGovernanceCapture` 8-panel render bodies.
- **LG6 `16b39bf3`** -- `feat(act-tier0)`: wire `EvLegalGovernanceCapture` into `DecisionWorkingPanel` (flag + 4 arms).
- **LG7 `c10c52a6`** -- `feat(act-tier0)`: detect `ev-s1-legal-governance-` items + mode badges in workbench (`ActTierZeroWorkbench`).
- **LG8 `be5b662a`** -- `feat(act-tier0)`: mount `ev-s1-legal-governance` in Tier-0 workbench (`TIER_ZERO_OBJECTIVE_IDS`).
- **LG9 `c07efb0a`** -- `feat(act-tier0)`: legal-governance mode labels + `DecisionList` test (8 labels).
- **I1 `b0add7af`** -- `fix(act-tier0)`: add `ev-s1-legal-governance-c8` to `ACT_TOOL_CATALOG` (the missed fifth source).

## Verification

- **Shared `tsc --noEmit`** EXIT 0; **web `tsc --noEmit`** (8GB heap) EXIT 0.
- **Bounded vitest** (`--pool=forks --testTimeout=20000`, [[feedback-vitest-bounded-runs]]) green: shared `catalogues` (104); web `EvLegalGovernanceCapture` (23 -- mode resolver + decode + encode round-trip all 8 modes + validity incl. c7 hard gate + summaries), `DecisionList` (18, incl. new LG9 8-label test). `actToolCoverage` green for legal-governance after the I1 fix.
- **Two-stage SDD review** per task; **final whole-implementation review: CHANGES NEEDED for ONE Important defect (I1: c8 missing from `ACT_TOOL_CATALOG`)** -- fixed `b0add7af`, re-verified (web tsc clean + coverage green for legal-governance).
- **Live preview smoke (screenshot-gated, [[project-screenshot-hang]]):** dev server "web" (:5200) + API (:3001) + native Postgres (:5432) all up after restart ("All synced"). All 8 capture bodies render faithfully to the mockup (verbatim option labels confirmed); **c7 hard gate verified interactively** -- warning shown while incomplete, gone once all 5 scope chips checked + written advice = Yes. Rendered map-free via a TEMPORARY debug harness in `ComponentsDebugPage.tsx` (the `/v3/components` gallery does not include this component); harness REVERTED after capture, **never committed**. The "all 5 chips in one eval left chipsOn=0" effect was a React auto-batching / stale-closure HARNESS artifact (resolved by clicking each chip in a separate eval), not a component bug.

## Hygiene and Amanah

Explicit-pathspec `git commit -F` per task (no-BOM UTF-8 message files; first 3 bytes verified non-BOM); `git fetch` + divergence check before each commit. Foreign WIP NEVER staged or touched -- the untracked `wiki/log/2026-06-05-mapsheet-export-server-id-aware.md` appears in no LG commit; **`wiki/log.md` left untouched** (unmerged/foreign since the external rebase); this standalone log file + the ADR + `wiki/index.md` carry the record ([[project-branch-rebase]], [[feedback-commit-immediately-on-rebased-branches]], [[feedback-no-deletion]]). Not pushed; ASCII-only (no em-dashes; apostrophes via double-quoted JS strings).

**Process lesson:** the I1 miss confirms the FIVE-coupled-source rule for per-item id additions on any objective -- update `checklist`, `dg1.itemIds`, `OBJECTIVE_ACT_TOOLS_OVERRIDE`, `ACT_TOOL_CATALOG`, and the capture's mode resolver together; `actToolCoverage.test.ts` is the guard that catches a missed `ACT_TOOL_CATALOG` entry.

**Amanah:** community legal/tenure/governance structuring -- halal. c5 financial-governance covers custody/authorisation/reporting only (joint signatories, separate accounts, trustee-held funds, signing thresholds) -- no riba, no gharar. Equity-share tenure + share-company entity options are ownership structures (musharaka-like), not riba. No CSA/advance-purchase/CSRA/salam framing -> no Scholar-Council routing (unlike Group 3). One-line Amanah comment on the c5 mode in component + fieldOptions ([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]). Clean.

## SP1 status

Group 1 (Boundaries re-decompose) and Group 2 (EvLegalGovernanceCapture) are both built and READY TO MERGE (local-only, not pushed). Groups 3-4 (EvProvisionBalanceCapture + `metadata.team` ratification -- heavy Amanah/CSA, Scholar-Council routing likely; EvConflictFrameworkCapture -- "framework signed before Act begins" hard gate) remain, each its own spec -> plan -> build -> review pass. Deferred (pre-existing, unrelated): the silv-sec-s5/s6/s7 `actToolCoverage` failure, flagged as a background task.
