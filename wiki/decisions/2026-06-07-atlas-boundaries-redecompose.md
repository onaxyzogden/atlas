# ADR: Boundaries surface re-decompose (SP1 Group 1) -- 7-item doc/map capture to a 5-mode register

- **Date:** 2026-06-07
- **Status:** Accepted
- **Branch:** `feat/structured-capture-forms` (commits `c68895b9` [BR1] -> `02be8957` [BR2] -> `44d76312`+`70c977c7` [BR3] -> `d8215941`+`61cd50c2` [BR4] -> `25a644c5` [BR5] -> `3cdf31b4` [BR6] -> `ebca7cb2` [BR7] -> `fb3301c7` [BR8] -> `116f7ec8` [BR9 test] + this docs commit; local-only, **not pushed**)
- **Entity:** [[entities/act-tier-shell]]
- **Relates to:** supersedes the shipped 7-item surface [[decisions/2026-06-06-atlas-tier0-boundaries]]; sibling captures [[decisions/2026-06-06-atlas-tier0-stakeholders]], [[decisions/2026-06-07-atlas-tier0-stewards]]; builds on Phase B [[decisions/2026-06-06-atlas-tier0-workbench]] + Phase A [[decisions/2026-06-05-atlas-structured-capture-forms]]
- **Log:** [[log/2026-06-07-atlas-boundaries-redecompose]]

## Context

The OLOS mockup-batch rollout (umbrella plan: Ecovillage vertical first) shipped a triage registry (SP0) whose first build group is **SP1 -- Ecovillage S1 foundation captures**. The SP1 spec folds in a re-decompose of the ALREADY-SHIPPED universal `s1-boundaries` surface: the operator's `olos_boundary_legal_survey.html` mockup reframes the objective from the 7-item doc/map/mapEntry/decision capture shipped on 2026-06-06 ([[decisions/2026-06-06-atlas-tier0-boundaries]]) into **5 register-based decisions**, each routed to a distinct right-panel body by a MODE badge.

The SP0 triage recommended **deferring** the boundaries re-decompose (it is rework of a shipped surface, not net-new coverage). **The operator overrode that recommendation** and scheduled the re-decompose as SP1 Group 1, built first, via Subagent-Driven Development (fresh implementer per task + two-stage spec-then-quality review + commit-per-task, TDD, bounded vitest). This ADR records Group 1 only; SP1 Groups 2-4 (EvLegalGovernanceCapture; EvProvisionBalanceCapture + `metadata.team` ratification; EvConflictFrameworkCapture) get their own writing-plans passes.

The old surface's 7 items (`s1-boundaries-c1..c7`) and 2 decision groups in `packages/shared/src/constants/plan/catalogues/universal.ts` modelled title/deed docs, boundary acknowledgement, easements, zoning, water rights, covenants, and permits. The mockup discards that taxonomy in favour of five **registers** that read like a conveyancing pack: a boundary-section register, a rights-of-way register, a tenancy register, a title-conditions checker, and a land-history register.

## Decision

### 1. Re-decompose the catalogue objective from 7 items / 2 groups to 5 items / 3 groups (BREAKING)

`s1-boundaries` is rewritten in `universal.ts` to ids `c1..c5` across 3 decision groups. **`c6` and `c7` are RETIRED** -- this is a deliberate breaking change to the objective's item set. Any persisted `FormValue` under the retired ids `s1-boundaries-c6` / `s1-boundaries-c7` (and the old c1-c5 shapes) is orphaned; the objective is a planning surface with local-only persistence, so no migration is provided (consistent with the no-migration posture of the prior Tier-0 surfaces). The completion-progress rollup keys on the live item ids, so the count self-corrects.

### 2. One self-routing `BoundaryCapture` with five register modes (mirror the proven single-arm pattern)

Rather than five booleans + five arms in `DecisionWorkingPanel`, the new `BoundaryCapture.tsx` keeps the established shape: ONE `isBoundary` flag + ONE body-router arm in the panel that delegates to a component switching on `itemId` internally. `boundaryModeFor(itemId)` (pure, exported, TOTAL) returns the mode and drives BOTH the right-panel body AND the `DecisionList` mode badge:

| Item | Mode | Badge label | Register shape |
|---|---|---|---|
| `c1` | `boundaryRegister` | Boundary register | sections: direction / type / name / obligation / dispute |
| `c2` | `rowRegister` | Rights of way | rows: type / name / impact / holder / width / detail |
| `c3` | `tenancyRegister` | Tenancy register | agreements: type / name / expiry / flag / detail |
| `c4` | `titleRestrictionChecker` | Title conditions | 6 fixed title categories, each present/absent/unknown |
| `c5` | `landHistoryRegister` | Land history | record rows (era/type/name/body) + prior-IC + contamination[] + notes |

### 3. Parallel-array FormValue encoding (load-bearing round-trip invariant)

`FormValue = Record<string, string | string[]>` is flat -- it cannot hold object arrays. Each register's rows therefore persist as **parallel string arrays** zipped to `Math.min` length on decode. `encodeBoundary` is the EXACT inverse of `decodeBoundary` for every mode; this round-trip identity is load-bearing for persistence (a recorded register must rehydrate byte-faithfully on item re-open). The decoders are TOTAL: `asArr`/`asStr` coerce missing/ill-typed keys to safe defaults, out-of-range positions collapse, and unknown enum values fall back rather than throw. No object array is ever assigned to a `FormValue` key and no `any` cast appears in the component.

### 4. c4 title-conditions Unknown HARD GATE

`titleRestrictionChecker` defaults all six title categories to `'unknown'` when nothing is persisted (`decodeBoundary('s1-boundaries-c4', {})` -> six `'unknown'`), so the gate starts **LOCKED**. `isBoundaryValid` for c4 is true **only** when `categories.length === 6 && every category !== 'unknown'`. The panel disables Record while invalid and renders the gate note "Resolve every Unknown title condition with legal advice before recording." A steward cannot record a clean title until every condition is positively resolved to present/absent -- silence (the default) is never a pass. The end-to-end chain (decode default -> validity predicate -> panel disable -> gate note) was independently verified airtight by the final whole-implementation review.

### 5. Preserve the shipped component as `BoundaryCaptureLegacy` (no deletion in revamps)

Per the project no-deletion-in-revamps rule, the shipped 7-item component was renamed to `BoundaryCaptureLegacy.tsx` (+ css + test, 57 tests still green) and left UNWIRED -- importable only by its own test. Its `boundaryModeFor` still returns the legacy `doc`/`map`/`mapEntry`/`decision` modes, so those keys remain in `DecisionList.MODE_LABELS` alongside the five new keys. The live import path (`DecisionWorkingPanel` -> `./BoundaryCapture.js`, `ActTierZeroWorkbench` -> `boundaryModeFor`) points only at the new component.

### 6. Generic cultural-heritage advisory banner (R1)

The c5 land-history body renders a GENERIC cultural-heritage advisory banner rather than mockup-specific copy. The boundaries surface captures legal/tenure land history; Indigenous/cultural relationships are the dedicated non-deferrable concern of the Stakeholders c3 surface ([[decisions/2026-06-06-atlas-tier0-stakeholders]]), so the boundaries banner stays advisory and non-duplicative. (REVIEW R1: copy operator-confirmable.)

## Consequences

- The `s1-boundaries` Tier-0 surface now captures structured legal/tenure registers instead of loose doc/map metadata; the predicate, store, workbench, and panel are unchanged in shape (the surface stayed within `TIER_ZERO_OBJECTIVE_IDS`, which already contained `s1-boundaries` -- no ActTierShell change was needed).
- Full web `tsc` reached EXIT 0 at BR8 (the first green web typecheck since the BR3 legacy rename; the intervening RED was by design -- full tsc was deferred to BR8) and stays green at BR9.
- The breaking c6/c7 retirement orphans any old persisted values; acceptable for a local-only planning surface with no migration contract.
- `DecisionList.MODE_LABELS` now carries three key families (legacy boundary, stakeholder, SP1 boundary); the JSDoc was refreshed to name all three (BR9).

## Deferred

Carried review-backlog items (none merge-blocking; the final review returned READY TO MERGE):

- **I2 (Important, pre-acknowledged):** `rowRegister.detail` and `tenancyRegister.detail` are modelled, encoded, and decoded (round-trip-safe) but have NO UI input -- invisible/uneditable in the live surface. Expose or remove in a follow-up.
- **M1 (Minor):** `--color-error` fallback in `BoundaryCapture.module.css` is `#c45a4a`; sibling capture stylesheets use `#c4493a`. Invisible at runtime (token resolves), cosmetic-only; align the fallback.
- **M2 (Minor):** `BoundaryCaptureLegacy.tsx`'s default export is still named `BoundaryCapture` (not `BoundaryCaptureLegacy`) -- cosmetic, surfaces in devtools/stack traces; fix when the legacy component is next touched.
- **Accessibility nits:** chip / tri-state groups lack `role="group"` + `aria-labelledby`; the legal/cultural banners lack `role="note"`.
- **I1 (was the only non-backlogged review gap) -- CLOSED in BR9:** the DecisionList test now asserts all five boundary mode labels (was two).

Out of scope (the deferred rich-I/O track, unchanged from the prior boundaries ADR): real spatial map capture and real file upload/storage -- the surface keeps the disabled "coming soon" affordance + metadata stubs.

## Amanah

Structured capture of legal/regulatory land constraints and tenure history (boundaries, rights of way, tenancies, title conditions, land history). No sale, advance-purchase, financing instrument, or CSRA/salam framing ([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]). No riba/gharar. Clean. The c5 land-history banner is advisory only; the Amanah-sensitive Indigenous/cultural concern is handled by the dedicated non-deferrable Stakeholders c3 surface, not here.

## Verification

- **Typecheck:** shared `tsc --noEmit` EXIT 0; web `tsc --noEmit` (8GB heap) EXIT 0 (no new errors; full web tsc green since BR8, reconfirmed at BR9).
- **Bounded vitest** (`--pool=forks --testTimeout=20000`, [[feedback-vitest-bounded-runs]]) all green: shared `fieldOptions` (56) + `catalogues` (104); web `BoundaryCapture` (44), `BoundaryCaptureLegacy` (57, preserved), `DecisionWorkingPanel` (50), `DecisionList` (17).
- **Two-stage SDD review** (spec then code-quality) PASSED per task BR1-BR8; BR9 closes review finding I1.
- **Final whole-implementation review (BR9): READY TO MERGE.** A background code-reviewer confirmed the five load-bearing invariants -- (a) decode/encode exact inverse for all five modes (no key drift); (b) flat `FormValue` (no object array, no `any`); (c) c4 Unknown hard gate locked on default and end-to-end; (d) all five modes wired end-to-end (catalogue holds exactly 5 items / 3 groups, c6/c7 negative-asserted; `MODE_LABELS` has all 5 keys; workbench detects by `startsWith('s1-boundaries-')` + passes `boundaryModeFor`; panel imports the new `./BoundaryCapture.js`); (e) legacy preserved + unwired. No Critical/Important runtime defects; the only non-backlogged gap (I1) is closed here.
- **Hygiene:** every commit explicit-pathspec (`git commit -F <msg> -- <paths>`, no `git add -A`, no `--amend`), no-BOM UTF-8 message files, `git fetch` + divergence check before commit (12/0 local-ahead at BR9, no external rebase mid-task), foreign WIP (`wiki/log/2026-06-05-mapsheet-export-server-id-aware.md`) never staged, ASCII-only (apostrophes via double-quoted JS strings), not pushed ([[project-branch-rebase]], [[feedback-commit-immediately-on-rebased-branches]], [[feedback-no-deletion]]).
- **Live preview smoke:** see the log entry.

## Alternatives considered

- **Five panel arms (one per mode)** -- rejected; it would balloon `DecisionWorkingPanel` and break from the proven one-flag/one-arm pattern shared by every prior Tier-0 capture. The self-routing component keeps the modes co-located.
- **A richer FormValue (object arrays / JSON-in-string)** -- rejected; the flat `string | string[]` contract is shared across the whole Tier-0 store slice and every sibling capture. Parallel-array encoding preserves that contract with a tested round-trip invariant.
- **Defer the re-decompose (SP0 triage recommendation)** -- overridden by the operator, who scheduled it as SP1 Group 1.
- **Delete the shipped 7-item component** -- rejected per the no-deletion-in-revamps rule; preserved as `BoundaryCaptureLegacy`.
