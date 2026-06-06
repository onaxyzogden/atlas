# 2026-06-06 -- Tier-0 Labour Inventory surface (Phase C: bespoke labour capture)

- **Branch:** `feat/structured-capture-forms` (clean explicit-path commits, **not pushed**).
- **Plan:** the Phase-C labour plan (`phase-c-labour-inventory-surface.md`) under the consolidated `phase-c-tier0-surfaces.md`.
- **Decision:** [[decisions/2026-06-06-atlas-tier0-labour-surface]]
- **Entity:** [[entities/act-tier-shell]]

## What and why

Phase C replaces the **generic** `VisionFormFields` rendering of the
`s1-vision-labour` Tier-0 decision with a **bespoke surface** faithful to the
operator mockup `olos_labour_inventory_decision.html`, following the Phase-B
`SuccessCriteriaCapture` controlled-renderer pattern. The mockup has four blocks:
(1) **WHO** single-select (4 cards -- e.g. solo / family / small paid team /
larger crew); (2) weekly **HOURS** stepper + a capacity-band signal; (3)
**SEASONAL** steppers (spring/summer/autumn/winter) + an annual-rhythm
visualization; (4) a **type-aware SKILLS** list.

This phase **builds on Phase B** ([[log/2026-06-06-atlas-tier0-workbench]]) and
**reuses** the Tier-0 workbench + working panel -- it does not rebuild them. Scope
= the labour decision only; success criteria and every other decision render
exactly as Phase B left them.

## Architecture / key decisions

(Full rationale + alternatives in the ADR [[decisions/2026-06-06-atlas-tier0-labour-surface]].)

- **Flat `FormValue` encoding.** The component reasons with a rich `LabourModel`
  but **persists a FLAT `FormValue`** (the type is UNCHANGED):
  `{ who, hours, spring, summer, autumn, winter: string; skills: string[] }`
  where each skill is `name::level`. Component-owned `encode`/`decode`
  round-trip losslessly; `decode` is **TOTAL** (defaults for missing/garbage;
  unknown level -> `beginner`; `NaN` hours -> `0`) and splits each skill on the
  **LAST** `::` so a custom skill name that itself contains `::` round-trips.
- **Display-default baking.** `decode` never fabricates persisted data; the
  **component** applies the mockup display fallbacks (hours `20`; seasonal
  `25/20/30/10`) **only as a display fallback when unset**, and bakes them into
  the next persisted model on first edit. The Record action stays disabled until
  the user affirms by editing -- nothing the steward never affirmed is recorded.
- **Type-aware skills via a shared resolver.** `resolveLabourSkills(primary,
  secondaries)` in `@ogden/shared` has **string parity** with
  `resolveFieldOptions('laborSkillsByType', ...)` (ONE source of truth);
  `laborSkillsByType._base` was reconciled with the mockup's general skills
  (REVIEW-flagged for operator content confirmation).
- **Bespoke validity/summary.** The panel routes labour **before** the
  `hasFields` branch and computes validity via `isLabourValid` (who set AND
  `hours > 0` AND `>= 1` skill) and the Record summary via `summariseLabour`
  (e.g. "Small paid team, 20 hrs/wk, 4 skills") -- **NOT** the generic
  `isFormValueValid` / `summariseFormValue`.
- **Detection.** `buildDecisionTarget` flags `isLabourInventory` when the matched
  form tool's `formId === 's1-vision-labour'`; the workbench resolves labour
  skills **inline** (no-memo, same rationale as `scOptions` -- `secondaryTypeIds
  ?? []` mints a fresh array each render so a memo cannot stabilise) and threads
  them via the new `labourSkillSuggestions` panel prop. The labour form tool +
  its `fields` stay in `actToolCatalog.ts` as the modal / `<select>` fallback
  (no deletion -- [[feedback-no-deletion]]).

## Commits (SDD: implementer per task, two-stage review + explicit-path commit)

- **LC1 `177f01fb`** -- `feat(shared): add resolveLabourSkills + reconcile labour-skill base list`.
  NEW `resolveLabourSkills(primary, secondaries)` resolver + `laborSkillsByType._base`
  reconciled with the mockup's general skills (REVIEW-flagged for operator
  confirmation); string-parity test against `resolveFieldOptions`; 16/16
  fieldOptions tests green.
- **LC2 `95d7c424`** -- `feat(act): add LabourInventoryCapture bespoke surface`.
  NEW controlled renderer (`LabourInventoryCapture.tsx` + css + test, 23 tests);
  exports `encode` / `decode` / `summariseLabour` / `isLabourValid`. Four mockup
  blocks (WHO single-select, HOURS stepper + capacity band, SEASONAL steppers +
  rhythm viz, type-aware SKILLS) over the unchanged flat `FormValue`.
- **LC2-hardening `d179ecc9`** -- `fix(act): harden labour skill decode and cover default-baking`.
  `decode` now splits each skill on the LAST `::` so a custom skill name
  containing `::` round-trips losslessly; +9 tests pinning default-baking from an
  empty value + capacity-band boundaries; 32 tests.
- **LC3 `df28a062`** -- `feat(act): route labour decision to LabourInventoryCapture`.
  Panel `isLabourInventory` router branch placed **before** `hasFields`; bespoke
  validity (`isLabourValid`) + summary (`summariseLabour`); new
  `labourSkillSuggestions` prop; the gate note names the missing requirement;
  22 panel tests.
- **LC4 `e8935c0c`** -- `feat(act): detect + resolve labour inventory in tier-0 workbench`.
  `buildDecisionTarget` flags labour (`formId === 's1-vision-labour'`); inline
  `resolveLabourSkills` threaded to the panel via `labourSkillSuggestions`; 15
  workbench tests.
- **LC4-test `87e0d6ab`** -- `test(act): assert resolved labour skill, not hardcoded base entry`.
  The threading test asserts the resolver's **first entry** renders, so it
  survives operator revisions of the REVIEW-flagged `_base` list (no hardcoded
  expectation).
- **LC5 `<pending>`** -- this docs entry + the ADR + index/log updates
  (explicit-pathspec wiki commit).

## Verification

- **Shared `tsc --noEmit`** clean; **web `tsc --noEmit`** EXIT 0 (8GB heap).
- **Bounded vitest** (`--pool=forks --testTimeout=20000`,
  [[feedback-vitest-bounded-runs]]) green per task: fieldOptions (16);
  `LabourInventoryCapture` (32); `DecisionWorkingPanel` (22);
  `ActTierZeroWorkbench` (15).
- **Two-stage SDD review** (spec then code-quality) **PASSED** for LC1-LC4. LC2
  code-quality nits (decode `::` split, default-baking coverage) folded into
  `d179ecc9`; the LC4 nit (de-hardcode the threading test) folded into
  `87e0d6ab`.
- **Final whole-implementation review + live smoke** are tracked under the
  consolidated Phase-C plan. Note the Phase-B headless-map flicker was fixed in
  `a842f3f2`, so the live smoke is now viable -- see
  [[log/2026-06-06-atlas-tier0-workbench]].

## Hygiene and Amanah

Explicit-pathspec `git commit -F` per task (no-BOM UTF-8 message files, first
bytes verified non-BOM); `git diff --cached --name-only` confirmed before each
commit; foreign WIP NEVER staged or touched ([[project-branch-rebase]],
[[feedback-commit-immediately-on-rebased-branches]], [[feedback-no-deletion]]);
not pushed; ASCII-only. **Amanah:** structured capture of land-stewardship
labour intent -- no sales channel, advance purchase, or financing instrument;
no CSRA/salam framing ([[fiqh-csra-erased-2026-05-04]],
[[feedback-csa-in-catalogues]]).

## Deferred

- **Vision-classify surface (VC1-VC5)** -- next; full code in
  `phase-c-tier0-surfaces.md`.
- **Constraints register** and **Stewards** (real-invite / RBAC track).
- Finalizing the **REVIEW-flagged `_base` labour-skill content** (operator
  confirm).
- The optional panel **gate-note nit** (drop "weekly hours" from the missing-list
  -- transient / self-healing) -- deferred.
- No `FormValue` type change; no `planStratumStore` touch; no API/DB persistence.
