# 2026-06-06 -- Tier-0 Decision Workbench (Phase B: inline non-map capture)

- **Branch:** `feat/structured-capture-forms` (eight clean explicit-path commits, **not pushed**).
- **Plan:** `check-every-single-objective-prancy-dahl` ("Tier-0 Decision Workbench -- Phase B: inline non-map capture from the prescribed-options mockup").
- **Decision:** [[decisions/2026-06-06-atlas-tier0-workbench]]
- **Entity:** [[entities/act-tier-shell]]

## What and why

Operator supplied a polished mockup (`olos_act_tier0_prescribed_options.html`)
for the **Act Tier-0** capture experience and chose to converge the product onto
it. It diverges from Phase A ([[log/2026-06-05-atlas-structured-capture-forms]])
on three axes: (1) **layout** -- a non-map 3-pane inline workbench (Objectives /
Decisions / working surface) replaces the popover modal for the Tier-0
(`s1-vision`) objective; (2) **success criteria** -- a chip-to-seed UX (domain
suggestion chips spawn editable criterion rows, min-3 / max-5 gate) replaces the
`<select>` repeatable; (3) **decision framing** -- a per-decision "Why these?"
rationale + a lightweight "Not ready -- needs more observation" defer.

This phase **reuses** the Phase A engine (`VisionFormFields`,
`actEvidenceStore.visionFormData`, `resolveFieldOptions`, the `s1-vision` `fields`
specs) -- it does not rebuild it. Scope = Tier-0 only; the map-centric shell is
untouched for spatial tiers.

## Architecture (additive, no deletion)

A new inline layout mode inside the Act shell. A predicate
`isTierZeroObjective(objective)` (matches `s1-vision` by id, widenable later)
swaps `<StageShell>` (the MapboxGL canvas) for `<ActTierZeroWorkbench>` and
suppresses the modal for that objective ONLY; every other objective renders the
existing map shell unchanged. Success-criteria options gain a typed `domain`,
becoming the SINGLE source of truth from which the legacy string list is derived.
Rationale + defer persist in additive `actEvidenceStore` slices that DO NOT touch
the progress / dependency-gate engine (defer is display-only this phase).

## Commits (SDD: implementer per task, two-stage review + explicit-path commit)

- **PB1 `ab577853`** -- `feat(shared): add domain-tagged success-criteria options + resolver`.
  NEW `CriterionDomain`/`CriterionOption` + `SUCCESS_CRITERIA_OPTIONS`
  (REVIEW-flagged, per-type + `_base`, domain-tagged) +
  `resolveSuccessCriteriaOptions(primary, secondaries[])` (union, dedup by `text`,
  order-stable); `resolveFieldOptions('successCriteriaByType', ...)` re-derived as
  `resolveSuccessCriteriaOptions(...).map(o => o.text)` (ONE source of truth, string
  parity preserved); barrel exports. Resolver + string-parity test.
- **PB2 `98015fdc` + `2178325f`** -- `feat(act): add decisionRationale + deferredDecisions slices to actEvidenceStore`.
  NEW `decisionRationale` + `saveDecisionRationale`; NEW `deferredDecisions` +
  `setDecisionDeferred`; persist v2->v3 passthrough `migrate`, `partialize`
  extended; keyed by `itemId`. Does NOT touch `planStratumStore`. Test (rationale
  write/read, defer toggle, v2->v3 rehydrate yields empty new slices, existing
  slices intact).
- **PB3 `1fe3b64d`** -- `feat(act): add SuccessCriteriaCapture chip-to-seed renderer`.
  NEW `SuccessCriteriaCapture.tsx` (+css+test). Domain chips (first 2 + "Show N
  more" toggle; click seeds a filled row + marks chip used via presence-derivation),
  editable numbered rows (check-on-filled, delete, "Write your own" add-row capped
  at `max`, min-3 gate note). CONTROLLED over `{ criteria: string[] }` -- same
  FormValue as Phase A, `onChange` emits that shape.
- **PB4 `ba033e21`** -- `feat(act): add DecisionList center pane`.
  NEW `DecisionList.tsx` (+css+test, 12/12, tsc clean). Renders the active
  objective's checklist as selectable rows (`decision-item` testid, `data-item-id`),
  done state from effective progress, feed + optional annotations; imports
  `findObjectiveGlobally`.
- **PB5 `439b00a6`** -- `feat(act): add DecisionWorkingPanel right pane`.
  NEW `DecisionWorkingPanel.tsx` (+css+test). Body router (success-criteria ->
  `SuccessCriteriaCapture`; `fields` -> `VisionFormFields`; else textarea); footer
  feeds callout + "Why these?" rationale (persist onBlur) + Record (disabled until
  valid via `isFormValueValid`) + defer toggle. Owns only the working/rationale
  drafts, re-seeded on `itemId`; persistence lifted to the parent.
- **PB6 `2b1beb6c`** (+ polish `724f8f43`) -- `feat(act): add ActTierZeroWorkbench 3-pane container`.
  NEW `ActTierZeroWorkbench.tsx` (+css, 10/10 tests). 3-column grid; left
  objectives rail (per-objective decision counts, keyboard-operable rows) + next-box
  ("Completes Tier 0 / Unlocks Tier 1 -- Land Reading"); center `DecisionList`;
  right `DecisionWorkingPanel` over the pure `buildDecisionTarget(item)`. Owns only
  the active-decision selection (re-seeded on active-objective change). **Polish
  `724f8f43`:** removed two `useMemo`s that could never stabilise
  (`secondaryTypeIds ?? []` mints a fresh array each render) in favour of inline
  computation + dropped the unused import -- code/intent honesty (a non-blocking
  code-quality finding I chose to address).
- **PB7 `5ad5ec8b`** -- `feat(act): swap Act shell to Tier-0 workbench for s1-vision`.
  `ActTierShell.tsx` (+62): module-level `isTierZeroObjective` predicate + stable
  frozen-empty `EMPTY_RATIONALES`/`EMPTY_DEFERRED`; new `decisionRationale`/
  `deferredDecisions` selectors + `handleSaveRationale`/`handleToggleDefer`
  callbacks; `showTierZeroWorkbench = selectedObjective != null &&
  isTierZeroObjective(selectedObjective)` (plain const after all hooks); conditional
  render of `<ActTierZeroWorkbench>` (reusing `handleFormDataSave` as `onRecord`,
  `effectiveProgress.byObjective` as `progressByObjective`) vs the unchanged
  `<StageShell>`; trailing `<VisionFormsTabsModal>` suppressed when the workbench
  shows. Existing locals reused verbatim; map render path untouched.
- **PB8 `6f901aed`** -- this docs entry + the ADR + index/log updates (explicit-path wiki
  commit).
- **I-2 fix `d41a3ce6`** -- `fix(act): flush decision rationale on switch/unmount`.
  Final-review finding I-2: rationale persisted only onBlur, so a draft typed then
  abandoned by clicking another decision (no blur) was silently dropped.
  `DecisionWorkingPanel.tsx` now holds the latest draft in a `useRef` and the
  `[itemId]` effect cleanup flushes it via the OUTGOING render's `onSaveRationale`
  (effect-cleanup closure semantics bind the save to the decision being left). The
  existing idempotent onBlur save is kept. Regression tests added at both panel
  (flush-on-switch-without-blur, no-save-when-unchanged, flush-on-unmount; 17) and
  workbench (save lands on the outgoing item id; 11) levels.

## Verification

- **Shared `tsc --noEmit`** clean (PB1). **Web `tsc --noEmit`** EXIT 0 (8GB heap)
  after each web task; foreign `src/compost/*` WIP errors do not surface in the
  `@ogden/web` filtered check.
- **Bounded vitest** (`--pool=forks --testTimeout=20000`,
  [[feedback-vitest-bounded-runs]]): shared resolver + string-parity;
  `actEvidenceStore` (rationale + defer + v3 migrate), `SuccessCriteriaCapture`,
  `DecisionList` (12), `DecisionWorkingPanel`, `ActTierZeroWorkbench` (10) green.
- **PB7 test path: documented tsc-only** (Phase A precedent) -- `ActTierShell` is a
  no-prop router/map/multi-store integration component never unit-tested today; the
  swap reuses `handleFormDataSave` verbatim as `onRecord`. Coverage rests on tsc +
  the manual smoke.
- **Live preview smoke: RESOLVED 2026-06-06 -- now PASSES after fix `a842f3f2`,
  see [[log/2026-06-06-atlas-tier0-cold-load-map-flicker-fix]].** (Original
  blocked attempt retained below for the record.) Dev server (web 5200
  + api 3001 + native postgres 5432) up; authenticated; 11 seeded projects.
  Navigated by deep link to
  `/v3/project/7f87442e.../act/tier-shell/s1-vision` across three fresh browser
  restarts with rapid polling. **Root cause** (read from `ActTierShell.tsx:768`):
  `showTierZeroWorkbench = selectedObjective != null && isTierZeroObjective(...)`
  is *false* until `objectives` finish async hydration, so the shell transiently
  mounts `<StageShell>` -> `<DiagnoseMap>` (MapboxGL/WebGL); WebGL init wedges the
  headless renderer permanently (~2-3 s after navigation) BEFORE the workbench can
  swap in. Confirmed environmental, not a Phase-B defect: vite builds clean (no
  compile errors), zero console errors, the renderer is responsive on the
  s1-vision URL with `hasMap:false` during the early boot window, and wedges only
  at the transient-map mount. No `/v3/components` gallery route exists in this
  codebase to use as the map-free escape hatch. Per the no-screenshot-no-claim
  rule, the workbench's runtime behavior is therefore asserted by the unit/component
  suite (82/82 incl. the I-2 regressions) + tsc + render-branch source review, NOT
  by a live screenshot. The manual smoke remains the one open verification gate;
  recommended re-run path: a non-headless browser, or guard the transient map mount
  during objectives hydration so the deep link never momentarily mounts WebGL.

## Hygiene and Amanah

Explicit-pathspec `git commit -F` per task (no-BOM UTF-8 message files, first bytes
verified `feat`); `git diff --cached --name-only` confirmed before each commit;
foreign WIP (`LoginPage`/`RegisterPage`/`authoring.ts`/`catalogues/index.ts`/
`WizardStep2Vision.tsx`/`act-tier-shell.md` + untracked
`spineGate.conformance.test.ts` etc.) NEVER staged or touched
([[project-branch-rebase]], [[feedback-commit-immediately-on-rebased-branches]],
[[feedback-no-deletion]]); not pushed; ASCII-only. **Amanah:** structured capture
of land-stewardship planning intent (success criteria, rationale) -- no sales
channel, advance purchase, or financing instrument; no CSRA/salam framing
([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]).

## Deferred

- True per-item **defer status** in `planStratumStore` / dependency gating (defer
  is display-only this phase; TODO flagged).
- Tier-0 treatment for objectives other than `s1-vision`; spatial-tier layouts
  (map shell untouched).
- Chip-seed UX for non-success-criteria fields (labour/constraints render via the
  existing `VisionFormFields` engine inside the new panel -- unchanged interaction).
- Domain-sectioned chips with dividers; pane overflow / internal-scroll ownership;
  `data-objective-row` / `criterion-row` testid reconsideration -- to be judged at
  the visual smoke.
- Finalizing domain-tagged option content (ships REVIEW-flagged).
- ~~The live preview smoke (the one remaining manual verification gate)~~ --
  **DONE 2026-06-06: smoke PASSES after fix `a842f3f2`**
  ([[log/2026-06-06-atlas-tier0-cold-load-map-flicker-fix]]).
- ~~**Transient map flash on the `s1-vision` deep link**~~ -- **FIXED 2026-06-06
  (`a842f3f2`):** `showTierZeroWorkbench` now short-circuits on the URL-synchronous
  `objectiveId` (the "treat an unresolved-but-known-Tier-0 objectiveId as Tier-0"
  option), so the cold deep-link never mounts `<StageShell>`/`<DiagnoseMap>`; a
  non-map placeholder covers the pre-hydration window. See
  [[log/2026-06-06-atlas-tier0-cold-load-map-flicker-fix]].
- Final whole-implementation review (SDD requirement after all tasks) -- DONE this
  session (APPROVE-WITH-NITS; I-2 the one actionable finding, now fixed in
  `d41a3ce6`).
