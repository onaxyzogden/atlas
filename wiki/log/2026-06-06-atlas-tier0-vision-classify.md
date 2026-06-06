# 2026-06-06 -- Tier-0 Vision-classify surface (Phase C: bespoke committed/aspirational sort)

- **Branch:** `feat/structured-capture-forms` (clean explicit-path commits, **not pushed**).
- **Plan:** the consolidated `phase-c-tier0-surfaces.md` (Part 2, tasks VC1-VC5).
- **Decision:** [[decisions/2026-06-06-atlas-tier0-vision-classify]]
- **Entity:** [[entities/act-tier-shell]]

## What and why

Phase C Part 2 replaces the **generic** `VisionFormFields` rendering of the
`s1-vision-classify` Tier-0 decision with a **bespoke surface** faithful to the
operator mockup, following the Phase-B `SuccessCriteriaCapture` and Phase-C-Part-1
`LabourInventoryCapture` controlled-renderer pattern. The mockup sorts candidate
**vision elements** into two columns -- **Committed** (what the steward will do
now) vs **Aspirational** (longer-horizon hopes) -- via: type-aware **suggestion
chips** (click to stage), a **transient Unclassified staging zone** (sort each
into a column), a **write-your-own** input with a committed/aspirational role
toggle, in-column **switch** (move to the other column) and **delete**, and a
"Show N more" chip toggle.

This phase **builds on** Phase B ([[log/2026-06-06-atlas-tier0-workbench]]) and
Phase C Part 1 ([[log/2026-06-06-atlas-tier0-labour-surface]]) and **reuses** the
Tier-0 workbench + working panel -- it does not rebuild them. Scope = the
vision-classify decision only; labour, success criteria, and every other decision
render exactly as the prior phases left them. Part 3 (boundaries / stakeholders)
is **design-only** this phase, recorded in the consolidated plan.

## Architecture / key decisions

(Full rationale + alternatives in the ADR [[decisions/2026-06-06-atlas-tier0-vision-classify]].)

- **Byte-compatible flat `FormValue` -- no encode needed.** Unlike labour
  (which encodes a rich model into flat scalars), vision-classify's value shape
  `{ committed: string[]; aspirational: string[] }` is **already native
  `FormValue`** -- both arms are plain `string[]`, the SAME shape the existing
  vision-classify form tool persists. So `decodeClassify` is a TOTAL read (filters
  non-arrays AND non-string elements within each array to `[]`/`['x']`) with **no
  inverse encode** -- `onChange` writes the two arrays straight back onto the
  draft. Persistence, the summary mirror, and the modal / `<select>` fallback are
  unchanged.
- **Transient Unclassified staging is component-local UI, NOT persisted.** A
  staged-but-unsorted element lives only in `useState`; nothing is recorded until
  the steward sorts it into Committed or Aspirational. `inUse(text)` enforces text
  uniqueness across all three lists (committed / aspirational / unclassified) so
  cards can safely key by text.
- **Type-aware suggestions via a shared resolver.** `resolveVisionClassifyOptions(
  primary, secondaries)` in `@ogden/shared` mirrors the `resolveLabourSkills` /
  `resolveSuccessCriteriaOptions` union/dedup/order-stable idiom (union of `_base`
  + primary + each secondary, first-seen dedup; unknown/missing contribute
  nothing). The starter `VISION_CLASSIFY_OPTIONS` ships REVIEW-flagged for operator
  content confirmation. Suggestions are plain strings (NOT domain-tagged) -- a
  vision element is classified committed-vs-aspirational by the steward, not
  pre-bucketed.
- **Bespoke validity/summary routed before `hasFields`.** The panel routes
  vision-classify through an `isVisionClassify` arm placed **first** (before
  labour, success-criteria, `hasFields`, and the textarea fallback); validity is
  `isVisionClassifyValid` (`committed.length + aspirational.length >= 1`) and the
  Record summary is `summariseVisionClassify` ("N committed, M aspirational") --
  **NOT** the generic `isFormValueValid` / `summariseFormValue`. The draft is
  decoded once into a single `classifyModel` reused by validity, the summary, and
  the body renderer (mirrors the labour `labourModel` derive-once pattern).
- **Detection.** `buildDecisionTarget` flags `isVisionClassify` directly via
  `item.id === 's1-vision-classify'` (simpler than labour's tool-formId join, and
  not dependent on a form match existing); the early body-router arm takes
  precedence over the generic form renderer that the matched form tool would
  otherwise trigger. The workbench resolves suggestions **inline** (no-memo, same
  rationale as `scOptions` / `labourSkills` -- `secondaryTypeIds ?? []` mints a
  fresh array each render so a memo cannot stabilise) and threads them via the new
  `visionClassifySuggestions` panel prop. The vision-classify form tool + its
  `fields` stay in `actToolCatalog.ts` as the modal / `<select>` fallback (no
  deletion -- [[feedback-no-deletion]]).

## Commits (SDD: implementer per task, two-stage review + explicit-path commit)

- **VC1 `6c736503`** -- `feat(shared): add resolveVisionClassifyOptions + starter vision-element list`.
  NEW `VISION_CLASSIFY_OPTIONS` + `resolveVisionClassifyOptions(primary,
  secondaries)` resolver (REVIEW-flagged starter list); union/dedup/order tests.
- **VC1-polish `65b3ef2a`** -- `refactor(shared): tighten resolveVisionClassifyOptions consistency`.
  Reuse the `FieldOptionSet` alias for the constant's type; assert primary-list
  entries land after `_base`; add a cross-list dedup test; rename the loop var.
  20 fieldOptions tests green.
- **VC2 `468421db`** -- `feat(act): add VisionClassifyCapture bespoke surface`.
  NEW controlled renderer (`VisionClassifyCapture.tsx` + css + test) over the
  byte-compatible `{ committed, aspirational }` value; exports `decodeClassify`
  (TOTAL) / `isVisionClassifyValid` / `summariseVisionClassify` / `ClassifyValue`.
  Two-column sort, transient Unclassified staging, suggestion chips, write-your-own,
  switch/delete, show-more.
- **VC2-polish `63724014`** -- `refactor(act): disambiguate staging discard label + widen VisionClassify tests`.
  Discard button aria-label changed to `Remove "<text>" from staging` (resolves a
  JSDOM accessible-name collision with the suggestion chip); key-invariant comment;
  garbage-within-array decode test; switch-column test. 14 capture tests.
- **VC2 baseline fix `79e78e14`** -- `fix(act): make labour-skill threading assertion typecheck-clean`.
  Surfaced by the VC2 implementer: a prior LC4-test tweak left
  `getAllByText(expected[0])` (`string | undefined`) failing web `tsc` though
  vitest passed; bound `const firstSkill = expected[0]!;` (the file's existing `!`
  idiom). Restores the clean web-tsc baseline required for verification.
- **VC3 `aea42348`** -- `feat(act): route vision-classify decision to VisionClassifyCapture`.
  Panel `isVisionClassify` router arm placed FIRST (before labour / success-criteria
  / hasFields / textarea); bespoke validity (`isVisionClassifyValid`) + summary
  (`summariseVisionClassify`); new `visionClassifySuggestions` prop; gate note
  "Classify at least one element before recording". 24 panel tests.
- **VC3-polish `6b5ab59c`** -- `refactor(act-tier0): derive classify model once in DecisionWorkingPanel`.
  Decode the draft once into a single `classifyModel` reused across validity, the
  record summary, and the body renderer (mirrors the labour `labourModel` pattern,
  replacing three inline `decodeClassify(draft)` calls); refresh the stale
  body-router header doc to list the vision-classify + labour bespoke arms; split
  the empty/valid panel test into two `it()` blocks; assert the gate-note text on
  the empty path. 25 panel tests.
- **VC4 `428717e7`** -- `feat(act-tier0): thread vision-classify suggestions in workbench`.
  `buildDecisionTarget` flags `isVisionClassify` via `item.id ===
  's1-vision-classify'`; inline `resolveVisionClassifyOptions` threaded to the
  panel via `visionClassifySuggestions`; detection (true / sibling-false) +
  resolver-first-entry threading tests. 19 workbench tests.
- **VC5 `<pending>`** -- this docs entry + the ADR + index/log updates
  (explicit-pathspec wiki commit).

## Verification

- **Shared `tsc --noEmit`** clean; **web `tsc --noEmit`** EXIT 0 (8GB heap).
- **Bounded vitest** (`--pool=forks --testTimeout=20000`,
  [[feedback-vitest-bounded-runs]]) green per task: fieldOptions (20);
  `VisionClassifyCapture` (14); `DecisionWorkingPanel` (25); `ActTierZeroWorkbench`
  (19).
- **Two-stage SDD review** (spec then code-quality) **PASSED** for VC1-VC4. VC1
  nice-to-haves folded into `65b3ef2a`; VC2 Important (discard-label collision) +
  nits folded into `63724014`; VC3 Important (derive-once memoization) + nits
  folded into `6b5ab59c`; VC4 approved with two optional nice-to-haves (left as-is,
  non-gating).
- **Final whole-implementation review (Part 1 LC1-LC5 + Part 2 VC1-VC5):**
  PASSED -- APPROVED, no Critical/Important defects; architectural contract
  (unchanged FormValue, no-deletion fallback, ordered bespoke arms with
  isVisionClassify first, resolver idiom, inline no-memo suggestions, ASCII-only)
  verified honored; labour/vision-classify surfaces mirror appropriately and
  diverge only on the justified encode-vs-no-encode axis. Three nice-to-haves
  recorded as deferred (N-1 reset transient staging state on decision switch by
  keying bespoke children on itemId -- same class as the I-2 rationale-flush fix;
  N-3 aria-pressed parity on the own-role toggle; a precedence-ordering test for
  fields + isVisionClassify).
- **Live smoke: PASS** (2026-06-06, dev `web`:5200 + `api`:3001, API health 200
  DB-backed; no-screenshot-no-claim honored -- two screenshots captured). Route
  `/v3/project/mtc/act/tier-shell/s1-vision` on Moontrance Creek (regenerative
  farm) renders the **non-map 3-pane Tier-0 workbench** (no MapboxGL). Selecting
  **Classify vision elements as committed vs. aspirational** shows the bespoke
  `VisionClassifyCapture`: type-aware suggestion chips (regen-farm: "Grow food for
  our household" / "Restore degraded soil" / "Create habitat for wildlife"), the
  "Show 6 more suggestions" toggle, Committed/Aspirational columns rehydrated from
  the persisted flat `FormValue`, the own-role toggle + write-your-own input.
  Interaction verified end-to-end: clicking a chip marked it used/disabled and
  staged an Unclassified card; sorting it to Aspirational moved it (Committed 1 ->
  Aspirational 1, staging cleared) and kept Record enabled. Selecting **Inventory
  available labour** renders the Part-1 `LabourInventoryCapture` (team-size,
  weekly-hours capacity band + "Medium" capacity-signal narration, seasonal
  variation + annual-rhythm sparkline, type-aware regen-farm skills, Beginner/
  Capable/Expert). The screenshot tool's cold-load `UnknownVizError` was the
  transient hang ([[project-screenshot-hang]]); a web-preview restart after the API
  was healthy resolved it.

## Hygiene and Amanah

Explicit-pathspec `git commit -F` per task (no-BOM UTF-8 message files, first
bytes verified non-BOM); `git diff --cached --name-only` confirmed before each
commit; foreign WIP NEVER staged or touched ([[project-branch-rebase]],
[[feedback-commit-immediately-on-rebased-branches]], [[feedback-no-deletion]]);
not pushed; ASCII-only. **Amanah:** structured capture of land-stewardship vision
intent (committed-vs-aspirational sort of vision elements) -- no sales channel,
advance purchase, or financing instrument; no CSRA/salam framing
([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]).

## Deferred

- **Boundaries + Stakeholders surfaces (Part 3)** -- DESIGN-ONLY this phase
  (recorded in `phase-c-tier0-surfaces.md`); build later.
- **Stewards** real-invite / RBAC track.
- Finalizing the **REVIEW-flagged `VISION_CLASSIFY_OPTIONS` content** (operator
  confirm / extend).
- VC2 deferred nits: raw-text testids (future-proofing); the write-your-own input
  aria-label (a pre-existing sibling-wide gap, not a regression).
- No `FormValue` type change; no `planStratumStore` touch; no API/DB persistence.
