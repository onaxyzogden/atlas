# 2026-06-07 -- Boundaries surface re-decompose (SP1 Group 1: 7-item doc/map capture -> 5-mode register)

- **Branch:** `feat/structured-capture-forms` (clean explicit-path commits `c68895b9` [BR1] -> `02be8957` [BR2] -> `44d76312`+`70c977c7` [BR3] -> `d8215941`+`61cd50c2` [BR4] -> `25a644c5` [BR5] -> `3cdf31b4` [BR6] -> `ebca7cb2` [BR7] -> `fb3301c7` [BR8] -> `116f7ec8` [BR9 test]; docs this entry; **not pushed**).
- **Plan:** `stages/plan-ev-s1-boundaries-redecompose-draft.md` (SP1 Group 1, tasks BR0-BR9), under the umbrella `check-every-single-objective-prancy-dahl.md` ("OLOS Mockup Batch -- Multi-tier Objective-Capture Rollout", Ecovillage vertical first).
- **Decision:** [[decisions/2026-06-07-atlas-boundaries-redecompose]]
- **Entity:** [[entities/act-tier-shell]]

## What and why

SP1 (the first BUILD group of the OLOS mockup-batch rollout) folds in a re-decompose of the already-shipped universal `s1-boundaries` Tier-0 surface. The operator's `olos_boundary_legal_survey.html` mockup reframes the objective from the 7-item doc/map/mapEntry/decision capture shipped 2026-06-06 ([[decisions/2026-06-06-atlas-tier0-boundaries]]) into **five register-based decisions**, each routed to a distinct right-panel body by a MODE badge. The SP0 triage RECOMMENDED deferring this rework; the **operator overrode** that and scheduled it as SP1 Group 1, built first via SDD. Only Group 1 (Boundaries) is in scope this pass; SP1 Groups 2-4 (EvLegalGovernanceCapture; EvProvisionBalanceCapture + `metadata.team` ratification; EvConflictFrameworkCapture) get their own writing-plans passes.

## Architecture / key decisions

(Full rationale + alternatives in the ADR [[decisions/2026-06-07-atlas-boundaries-redecompose]].)

- **Catalogue re-decompose (BREAKING).** `s1-boundaries` rewritten in `universal.ts` from 7 items / 2 groups to **5 items (`c1..c5`) / 3 groups**; `c6`/`c7` RETIRED. No migration (local-only planning surface; completion rollup keys on live ids).
- **One self-routing `BoundaryCapture`, five register modes.** ONE `isBoundary` flag + ONE body-router arm in `DecisionWorkingPanel`; `boundaryModeFor(itemId)` (pure, TOTAL) drives both the body and the `DecisionList` badge: c1 `boundaryRegister` (Boundary register), c2 `rowRegister` (Rights of way), c3 `tenancyRegister` (Tenancy register), c4 `titleRestrictionChecker` (Title conditions), c5 `landHistoryRegister` (Land history).
- **Parallel-array FormValue encoding (load-bearing).** `FormValue` is flat (`string | string[]`) and cannot hold object arrays, so register rows persist as parallel string arrays zipped to `Math.min` on decode. `encodeBoundary` is the EXACT inverse of `decodeBoundary` per mode; decoders are TOTAL (`asArr`/`asStr` coerce missing/ill-typed keys). No object array on any key; no `any` cast.
- **c4 Unknown HARD GATE.** c4 defaults all six title categories to `'unknown'` (gate starts LOCKED); `isBoundaryValid` true only when `length === 6 && every !== 'unknown'`; panel disables Record + shows "Resolve every Unknown title condition with legal advice before recording." Verified end-to-end.
- **Legacy preserved + unwired.** Shipped 7-item component renamed `BoundaryCaptureLegacy.tsx` (+ css + test, 57 tests green), imported only by its own test (no-deletion-in-revamps rule). Its legacy `doc`/`map`/`mapEntry`/`decision` modes stay in `MODE_LABELS`.
- **Generic cultural banner (R1).** c5 land-history renders a generic cultural-heritage advisory banner; the Amanah-sensitive Indigenous/cultural concern is owned by the dedicated non-deferrable Stakeholders c3 surface, not duplicated here.
- **No predicate / store / shell change.** `s1-boundaries` was already in `TIER_ZERO_OBJECTIVE_IDS`; all five modes persist through the existing `actEvidenceStore.visionFormData[itemId]` path.

## Commits (SDD: implementer per task, two-stage review + explicit-path commit)

- **BR1 `c68895b9`** -- `feat(shared)`: boundary re-decompose `_base` option sets in `fieldOptions.ts`.
- **BR2 `02be8957`** -- `feat(shared)`: re-decompose `s1-boundaries` to 5 items / 3 groups (`universal.ts`); c6/c7 retired.
- **BR3 `44d76312`(+`70c977c7` fixup)** -- `refactor(act-tier0)`: preserve shipped component as `BoundaryCaptureLegacy` (+ retarget css/test imports).
- **BR4 `d8215941`(+`61cd50c2`)** -- `feat/test(act-tier0)`: new `BoundaryCapture` core + pure helpers + encode/decode round-trip tests.
- **BR5 `25a644c5`** -- `feat(act-tier0)`: c1/c2 register bodies (boundary + rights-of-way).
- **BR6 `3cdf31b4`** -- `feat(act-tier0)`: c3 tenancy register + c4 title-conditions hard gate.
- **BR7 `ebca7cb2`** -- `feat(act-tier0)`: c5 land-history body (record rows + prior-IC + contamination + notes + cultural banner).
- **BR8 `fb3301c7`** -- `feat(act-tier0)`: wire gate-notes + 5 mode labels; full web `tsc` to EXIT 0 (retired the 3 stale `DecisionWorkingPanel` switch errors; minimal `(model as BoundaryModel).kind` cast on the genuinely-unreachable fallback; reconciled 5 pre-existing panel tests to the new surface).
- **BR9 `116f7ec8`** -- `test(act-tier0)`: cover all 5 boundary mode labels in `DecisionList` (closes review finding I1) + refresh stale `MODE_LABELS` JSDoc.

## Verification

- **Shared `tsc --noEmit`** EXIT 0; **web `tsc --noEmit`** (8GB heap) EXIT 0 -- full web typecheck green since BR8, reconfirmed at BR9.
- **Bounded vitest** (`--pool=forks --testTimeout=20000`, [[feedback-vitest-bounded-runs]]) green: shared `fieldOptions` (56) + `catalogues` (104); web `BoundaryCapture` (44), `BoundaryCaptureLegacy` (57), `DecisionWorkingPanel` (50), `DecisionList` (17).
- **Two-stage SDD review** (spec then code-quality) PASSED per task BR1-BR8; BR9 closes I1.
- **Final whole-implementation review (BR9): READY TO MERGE.** Background code-reviewer confirmed the five invariants -- decode/encode exact-inverse (no key drift across all 5 modes); flat `FormValue` (no object array / no `any`); c4 Unknown hard gate locked-on-default + end-to-end; all 5 modes wired (catalogue exactly 5 items / 3 groups with c6/c7 negative-asserted, `MODE_LABELS` all 5 keys, workbench detects `startsWith('s1-boundaries-')` + passes `boundaryModeFor`, panel imports the new `./BoundaryCapture.js`); legacy preserved + unwired. No Critical/Important runtime defects. Backlog (non-blocking): I2 rowRegister/tenancy `detail` fields modelled+encoded but not rendered; M1 `--color-error` fallback `#c45a4a` vs sibling `#c4493a`; M2 `BoundaryCaptureLegacy` default export still named `BoundaryCapture`; a11y nits (chip/tri-state `role="group"`, banner `role="note"`).
- **Live preview smoke (DOM-asserted; 2026-06-07, web :5200 + api :3001 both running, `/health` 200):** Drove `/v3/project/mtc/act/tier-shell/s1-boundaries`. (1) The non-map 3-pane workbench renders with NO MapboxGL canvas (`hasMap === false`) -- map suppressed exactly as for `s1-vision`/`s1-stakeholders`. (2) Exactly FIVE decision rows, each carrying the correct mode badge: c1 "Boundary register", c2 "Rights of way", c3 "Tenancy register", c4 "Title conditions", c5 "Land history" (asserted via `data-testid="decision-item"` + `mode-badge-*`). (3) **c4 Unknown HARD GATE verified LOCKED on default:** selecting c4 shows Record `disabled === true`, the gate note "Resolve every Unknown title condition with legal advice before recording" present, and 18 tri-state buttons (6 title categories x Present/Absent/Unknown). **Caveat (no-screenshot-no-claim, [[project-screenshot-hang]]):** `preview_screenshot` timed out twice at 30s (transient unresponsive-renderer hang -- API was healthy, not the dead-API variant); proof above is DOM-asserted via `preview_eval`, NOT a visual screenshot. No visual capture is claimed.

## Hygiene and Amanah

Explicit-pathspec `git commit -F` per task (no-BOM UTF-8 message files; first 3 bytes verified non-BOM); `git diff --cached --name-only` / `git show --stat` confirmed after each commit; `git fetch` + divergence check before each (12/0 local-ahead at BR9 -- no external rebase mid-task). Foreign WIP NEVER staged or touched -- the untracked `wiki/log/2026-06-05-mapsheet-export-server-id-aware.md` appears in no BR commit ([[project-branch-rebase]], [[feedback-commit-immediately-on-rebased-branches]], [[feedback-no-deletion]]); not pushed; ASCII-only (no em-dashes; apostrophes via double-quoted JS strings). **`wiki/log.md` left untouched** -- it has been in an unmerged/foreign-staged state since the external rebase; this standalone log file + the ADR + `wiki/index.md` carry the record.

**Process lesson (R100):** when a subagent does a `git mv` then `Edit` (as in BR3's legacy rename), it can leave the edit uncommitted -- verify committed content via `git show HEAD:<file>`, not the agent's self-report. Verified clean here.

**Amanah:** structured capture of legal/regulatory land constraints + tenure history -- no sale, advance-purchase, financing instrument, or CSRA/salam framing ([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]). Clean.

## SP1 status

Group 1 (Boundaries re-decompose) is built and READY TO MERGE (local-only, not pushed). Groups 2-4 (EvLegalGovernanceCapture; EvProvisionBalanceCapture + `metadata.team` ratification; EvConflictFrameworkCapture) remain -- each its own spec -> plan -> build -> review pass.
