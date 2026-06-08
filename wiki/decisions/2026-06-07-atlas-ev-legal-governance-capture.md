# ADR: EvLegalGovernanceCapture (SP1 Group 2) -- 8-decision legal/tenure/governance Tier-0 capture

- **Date:** 2026-06-07
- **Status:** Accepted
- **Branch:** `feat/structured-capture-forms` (commits `6f9e04c9` [LG4] -> `ffcc5f22` [LG5] -> `16b39bf3` [LG6] -> `c10c52a6` [LG7] -> `be5b662a` [LG8] -> `c07efb0a` [LG9] -> `b0add7af` [I1 follow-up] + this docs commit; the pure-core commit LG1-3 and the LG0 catalogue commit precede LG4 on the same branch; local-only, **not pushed**)
- **Entity:** [[entities/act-tier-shell]]
- **Relates to:** Group 2 of the OLOS mockup-batch rollout; sibling Group 1 [[decisions/2026-06-07-atlas-boundaries-redecompose]]; clones the proven pattern from [[decisions/2026-06-06-atlas-tier0-stakeholders]] + [[decisions/2026-06-07-atlas-tier0-stewards]]; builds on Phase B [[decisions/2026-06-06-atlas-tier0-workbench]] + Phase A [[decisions/2026-06-05-atlas-structured-capture-forms]]
- **Log:** [[log/2026-06-07-atlas-ev-legal-governance-capture]]

## Context

SP1 Group 2 of the OLOS mockup-batch rollout (Ecovillage vertical first). Group 1 (Boundaries re-decompose) shipped earlier this session; Group 2 builds the next Ecovillage S1 foundation capture: the **`ev-s1-legal-governance`** objective (EV-S1.4 "Legal entity, tenure & governance model"), made faithful to the operator mockup `olos_legal_entity_tenure_financial.html`.

**Two operator decisions resolved before planning (2026-06-07):**

1. **Source of truth = "Mockup + catalogue."** No approved spec (`stages/spec-ev-s1-foundation-captures-draft.md`) or SP0 triage doc existed on disk -- the original skill-invocation arguments assumed documents that were never written. The plan was authored directly from the mockup (canonical UI) + the `ev-s1-legal-governance` catalogue (structural spine), exactly as Group 1 was. (A lower-fidelity single-form prompt at `stages/r2-s1-form-prompts-authored-review.md:155-158` is superseded by the rich-workbench path.)
2. **Jurisdiction = "Add c8 catalogue item."** The mockup's d2 "Confirm governing jurisdiction" was the only mockup decision with no catalogue counterpart. It was added as a new catalogue item rather than dropped, making the surface match the mockup 1:1 at 8 decisions.

## Decision

### 1. Add the c8 governing-jurisdiction item to the catalogue (additive, slot 2)

`ev-s1-legal-governance` gains an 8th checklist item `ev-s1-legal-governance-c8` ("Confirm governing jurisdiction - province, territory, or nation of registration"), inserted at array index 1 (after c1, before c2) of both `checklist` and decision-group dg1's `itemIds` in `packages/shared/src/constants/plan/catalogues/ecovillage.ts`. Catalogue item ids are arbitrary strings (the numeric suffix need not equal array position), so c2-c7 were NOT renumbered. The objective now carries **8 items / dg1 holds 3**. The catalogue partition + 5-15 range + id-uniqueness invariants in `catalogues.test.ts` all still hold.

### 2. FIVE coupled id sources must stay in lockstep (load-bearing)

A catalogue item id for this objective is referenced from **five** places, and all must agree or CI goes red:
1. `ecovillage.ts` `checklist`
2. `ecovillage.ts` `dg1.itemIds`
3. `objectiveActTools.ts` `OBJECTIVE_ACT_TOOLS_OVERRIDE` (hardcoded id array, ~line 1330)
4. `actToolCatalog.ts` `ACT_TOOL_CATALOG` (per-item form-arm entry)
5. the capture's own `legalGovernanceModeFor` resolver

The initial LG0 edit updated only sources 1-3; **source 4 (`ACT_TOOL_CATALOG`) was missed**, which turned `actToolCoverage.test.ts` red and left c8's panel without a header prompt. This was caught by the final code review (finding I1) and closed in commit `b0add7af` by adding the c8 form-arm entry in slot 2. Recorded here so future per-item additions to any objective update all five sources up front. See [[project-protocol-two-sources]] for the related (and intentionally divergent) Act-vs-Plan tool-source split.

### 3. One self-routing `EvLegalGovernanceCapture` with eight modes (mirror the proven single-arm pattern)

Following Group 1 and the Stakeholders/Stewards captures: ONE `isLegalGovernance` flag + ONE body-router arm in `DecisionWorkingPanel` that delegates to a component switching on `itemId`. The pure exported TOTAL `legalGovernanceModeFor(itemId)` drives BOTH the right-panel body AND the `DecisionList` mode badge:

| Item | Mode | Badge label | Mockup decision | Body shape |
|---|---|---|---|---|
| `c1` | `legalEntityPicker` | Entity options | d1 | 5 choice cards (single-select) |
| `c8` | `jurisdiction` | Jurisdiction | d2 | country + province + reg-office selects + read-only jurisdiction note |
| `c2` | `entityDecisionRecord` | Decision record | d3 | 3 textareas (why / enables / constrains) |
| `c3` | `tenureModel` | Tenure model | d4 | 4 choice cards (single-select) |
| `c4` | `decisionFramework` | Decision framework | d5 | 4 cards + quorum select |
| `c5` | `financialGovernance` | Financial governance | d6 | banking cards + 3 threshold selects + FY-end |
| `c6` | `membershipRegister` | Membership register | d7 | 2 multi-toggle checklists (5 + 5) |
| `c7` | `legalAdviceGate` | Legal advice gate | d8 | 5-item scope checklist + written/date (HARD GATE) |

### 4. Flat FormValue encoding with exact decode/encode inverse (load-bearing round-trip invariant)

`FormValue = Record<string, string | string[]>` (web-local, from `actToolCatalog.js` -- NOT exported from `@ogden/shared`). Scalars persist as strings; the two register-style multi-selects (c6 rights / obligations) persist as independent string arrays decoded with `asArr` (NOT zipped rows). `encodeLegalGovernance` is the EXACT private inverse of `decodeLegalGovernance` for all 8 modes; the round-trip identity is unit-tested per mode. Decoders are TOTAL (`asArr`/`asStr` coerce missing/ill-typed keys to safe defaults; never throw). No object array on any key and no `any` cast in the component.

### 5. c7 legal-advice HARD GATE

`legalAdviceGate` (c7) is valid **only** when `adviceScope.length >= 5 && adviceWritten === 'yes'`. The scope checklist has exactly 5 items, so a steward must clear every one AND confirm written advice is in hand before Record enables. The panel disables Record while invalid and renders the gate note "Clear all 5 advice-scope items and confirm written advice before recording." `adviceDate` is recorded but not gated. This mirrors the Group 1 c4 title-checker hard gate. Verified interactively in preview: the warning shows while incomplete and clears once all 5 scope chips are checked and written advice = Yes.

### 6. Field option sets verbatim from the mockup (ASCII-cleaned)

All select/choice-card groups get `_base` option sets in `fieldOptions.ts` (entity options, jurisdiction country/province, registered-office, tenure model, decision framework, quorum, banking structure, three authorisation thresholds, FY-end, written-advice, membership rights, membership obligations, advice scope). Labels are copied verbatim from the mockup with em-dashes replaced by ` - ` and kept ASCII-only.

## Consequences

- `ev-s1-legal-governance` now renders as an 8-decision Tier-0 Decision Workbench (map shell swapped out via `TIER_ZERO_OBJECTIVE_IDS`), faithful to `olos_legal_entity_tenure_financial.html`, jurisdiction in slot 2.
- `DecisionList.MODE_LABELS` now carries a fourth key family (legacy boundary, stakeholder, SP1 boundary, legal governance).
- The c8 addition is additive to the shared catalogue; no item was retired, so no persisted-value orphaning (unlike Group 1's c6/c7 retirement).
- The five-coupled-source coupling is now documented; the I1 miss is the cautionary precedent.

## Deferred

- **silv-sec-s5/s6/s7 act-tool coverage failure (PRE-EXISTING, unrelated):** `actToolCoverage.test.ts` also flags the silvopasture S5-S7 objectives resolving to unregistered tool ids. This predates Group 2 and was NOT fixed (out of scope, no approval); flagged as a background task for a separate pass.
- Out of scope (separate plans): **Group 3** EvProvisionBalanceCapture + `metadata.team` ratification (heavy Amanah / CSA -- Scholar-Council routing likely); **Group 4** EvConflictFrameworkCapture (hard gate "framework signed before Act begins"); SP2 coexistence shell; SP3 Ecovillage S2 spatial captures.

## Amanah

Community legal/tenure/governance structuring is a halal purpose. The c5 financial-governance mode covers fund **custody, authorisation, and reporting only** (joint signatories, separate accounts, trustee-held funds, signing thresholds, FY-end) -- no interest-bearing instrument (riba) and no speculative sale (gharar). Equity-share tenure and share-company entity options are ownership structures (musharaka-like), not riba. No CSA / advance-purchase / CSRA / salam framing appears in this surface, so no Scholar-Council routing was required (unlike Group 3 provision-balance). A one-line Amanah comment records this on the c5 mode in both `EvLegalGovernanceCapture.tsx` and `fieldOptions.ts`. Clean ([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]).

## Verification

- **Typecheck:** shared `tsc --noEmit` EXIT 0; web `tsc --noEmit` (8GB heap) EXIT 0.
- **Bounded vitest** (`--pool=forks --testTimeout=20000`, [[feedback-vitest-bounded-runs]]) all green: shared `catalogues` (104); web `EvLegalGovernanceCapture` (23) covering mode resolver + decode + encode round-trip (all 8 modes) + validity (incl. the c7 hard gate) + summaries; `DecisionList` (18, includes the new LG9 8-label test). `actToolCoverage` green for legal-governance after the I1 fix (only the pre-existing silv-sec failure remains).
- **Two-stage SDD review** (spec then code-quality) per task; **final whole-implementation code review** returned CHANGES NEEDED for ONE Important defect (I1: c8 missing from `ACT_TOOL_CATALOG`) -- fixed in `b0add7af` and independently re-verified (web tsc clean + coverage test green for legal-governance).
- **Live preview smoke (screenshot-gated, no-screenshot-no-claim [[project-screenshot-hang]]):** all 8 capture bodies render faithfully to the mockup with verbatim option labels confirmed; the c7 hard gate verified interactively (warning shown when incomplete, gone when all 5 scope chips + written=Yes). Rendered map-free via a TEMPORARY debug harness in `ComponentsDebugPage.tsx` (the `/v3/components` gallery does not include this component); the harness was REVERTED after capture and never committed. A stale-closure batch-click artifact (clicking all 5 chips in one `preview_eval` left chipsOn=0 due to React auto-batching over the stale model) was a harness artifact, not a component bug -- resolved by clicking each chip in a separate eval.
- **Hygiene:** every commit explicit-pathspec (`git commit -F <msg> -- <paths>`, no `git add -A`, no `--amend`), no-BOM UTF-8 message files, `git fetch` + divergence check before commit, foreign WIP (`wiki/log/2026-06-05-mapsheet-export-server-id-aware.md`) never staged, `wiki/log.md` untouched, ASCII-only (apostrophes via double-quoted JS strings), not pushed ([[project-branch-rebase]], [[feedback-commit-immediately-on-rebased-branches]], [[feedback-no-deletion]]).

## Alternatives considered

- **Eight panel arms (one per mode)** -- rejected; it would balloon `DecisionWorkingPanel` and break the proven one-flag/one-arm pattern shared by every prior Tier-0 capture.
- **Drop the mockup's jurisdiction decision** (no catalogue counterpart) -- rejected; the operator chose to add c8 so the surface matches the mockup 1:1.
- **A richer FormValue (object arrays / JSON-in-string)** -- rejected; the flat `string | string[]` contract is shared across the whole Tier-0 store slice and every sibling capture. Independent multi-select arrays preserve that contract with a tested round-trip invariant.
