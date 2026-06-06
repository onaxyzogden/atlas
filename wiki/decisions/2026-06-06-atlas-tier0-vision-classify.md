# ADR: Tier-0 Vision-classify surface (Phase C: bespoke committed/aspirational sort)

- **Date:** 2026-06-06
- **Status:** Accepted
- **Branch:** `feat/structured-capture-forms` (commits `6c736503` -> `65b3ef2a` -> `468421db` -> `63724014` -> `79e78e14` -> `aea42348` -> `6b5ab59c` -> `428717e7`, local-only, not pushed)
- **Entity:** [[entities/act-tier-shell]]
- **Relates to:** [[decisions/2026-06-06-atlas-tier0-labour-surface]] (Phase C Part 1 -- the bespoke controlled-renderer + shared-resolver + detect-in-`buildDecisionTarget` pattern this part mirrors), [[decisions/2026-06-06-atlas-tier0-workbench]] (Phase B -- the Tier-0 workbench + `SuccessCriteriaCapture` controlled-renderer pattern), and [[decisions/2026-06-05-atlas-structured-capture-forms]] (Phase A -- the structured-capture engine + `FormValue` contract)
- **Log:** [[log/2026-06-06-atlas-tier0-vision-classify]]

## Context

Phase B shipped the Tier-0 3-pane workbench and a bespoke controlled renderer
(`SuccessCriteriaCapture`) over the unchanged `FormValue` contract; Phase C Part 1
([[decisions/2026-06-06-atlas-tier0-labour-surface]]) added a second bespoke
renderer (`LabourInventoryCapture`) and established the full per-surface pattern:
shared resolver in `@ogden/shared` -> bespoke controlled renderer with exported
`decode`/validity/summary helpers -> route before `hasFields` in the panel ->
detect in `buildDecisionTarget` + thread suggestions through the workbench.

The operator then supplied the vision-classify mockup and chose to converge the
`s1-vision-classify` decision onto it. The mockup sorts candidate **vision
elements** into two columns -- **Committed** vs **Aspirational** -- with type-aware
suggestion chips, a transient Unclassified staging zone, a write-your-own input
with a role toggle, in-column switch/delete, and a show-more chip toggle.

The generic `VisionFormFields` engine cannot express this interaction; but, as in
Phases A/B/C-1, the **persistence contract must not change** -- the decision still
records a plain `FormValue` so the store, the legacy summary mirror, and the modal
/ `<select>` fallback all keep working unchanged.

## Decision

Introduce a **bespoke `VisionClassifyCapture` controlled renderer** for the
`s1-vision-classify` decision, routed from the working panel, over an **unchanged
`FormValue`**. New code is additive; **no deletion** of the generic engine, the
vision-classify form tool, or its `fields` (all remain as the modal / `<select>`
fallback -- [[feedback-no-deletion]]).

### 1. Byte-compatible value -- a controlled renderer with NO encode

The vision-classify value shape is `{ committed: string[]; aspirational: string[] }`.
Both arms are **native `FormValue`** (plain `string[]`), the SAME shape the
existing vision-classify form tool persists. So unlike labour -- which encodes a
rich `LabourModel` into flat scalars and needs an `encode`/`decode` pair --
vision-classify needs **no inverse encode**. `decodeClassify(value)` is a TOTAL
read: a non-array field collapses to `[]`, and non-string elements within an array
are filtered out (`[1, null, 'x'] -> ['x']`). `onChange` writes the two arrays
straight back onto the draft.

**Rationale:** the faithful mockup UX needs bespoke interaction, but persistence is
already on the unchanged `FormValue` contract -- and because the shape is natively
compatible, the simplest correct design is a pure controlled renderer with a TOTAL
decode and no encode. **Alternatives considered:** (a) **encode into flat scalars
like labour** -- rejected: pointless ceremony when both arms are already
`string[]`; (b) **a new rich store slice** -- rejected: a second persistence shape
for one decision, breaking the single-FormValue contract and the legacy summary
mirror.

### 2. Transient Unclassified staging -- component-local, never persisted

A suggestion chip, when clicked, stages its text into a component-local
`unclassified` list (`useState`); the steward then sorts each into Committed or
Aspirational. Nothing reaches the draft -- and nothing is recordable -- until it is
sorted into a column. `inUse(text)` enforces text uniqueness across all three lists
(committed / aspirational / unclassified) so cards key safely by text.

**Rationale:** the mockup's two-step "stage then sort" keeps the steward's intent
explicit (a staged element is a candidate, not yet a commitment) and avoids
recording anything the steward never affirmed -- the same honesty principle as the
labour display-default baking. **Alternative considered:** persist the staging zone
-- rejected: it would record un-affirmed candidates and add a third array to the
value shape for no durable purpose.

### 3. Type-aware suggestions via shared `resolveVisionClassifyOptions`

`resolveVisionClassifyOptions(primary, secondaries)` in `@ogden/shared` mirrors the
`resolveLabourSkills` / `resolveSuccessCriteriaOptions` idiom: union of `_base` +
primary + each secondary, first-seen dedup, order-stable; unknown/missing
contribute nothing. The starter `VISION_CLASSIFY_OPTIONS` (typed via the shared
`FieldOptionSet` alias) ships REVIEW-flagged for operator content confirmation. The
workbench resolves suggestions **inline** (no memo -- `secondaryTypeIds ?? []`
mints a fresh array each render so a memo would not stabilise, the same rationale as
the Phase-B `scOptions` and Phase-C-1 `labourSkills`) and threads them via a new
`visionClassifySuggestions` panel prop.

**Decision detail -- plain strings, not domain-tagged.** Unlike success-criteria
options (which carry an Ecological/Economic/Stewardship `domain`),
vision-classify suggestions are **plain strings**. A vision element is classified
committed-vs-aspirational **by the steward at sort time**, not pre-bucketed by a
design-time tag.

**Rationale:** suggestions should vary by project type without forking the option
source; the committed/aspirational axis is the steward's judgement, not a property
of the element. **Alternative considered:** pre-tag each option committed or
aspirational -- rejected: it pre-empts the exact judgement the surface exists to
capture.

### 4. Bespoke validity + summary routed FIRST

`DecisionWorkingPanel` routes vision-classify through an `isVisionClassify` arm
placed **first** -- before the labour, success-criteria, generic `hasFields`, and
textarea fallback arms. Validity is `isVisionClassifyValid` (`committed.length +
aspirational.length >= 1`) and the Record summary is `summariseVisionClassify`
("N committed, M aspirational") -- **NOT** the generic `isFormValueValid` /
`summariseFormValue`. The draft is decoded once into a single `classifyModel`
(`ClassifyValue | null`) reused by validity, the summary, and the body renderer
(mirrors the labour `labourModel` derive-once pattern).

**Why the arm must be first.** `s1-vision-classify` **does** match a form tool in
`actToolCatalog.ts`, so `buildDecisionTarget` populates `fields`/`prompt` for it --
without the early bespoke arm the panel would fall through to the generic form
renderer. The ordering is load-bearing, not cosmetic.

**Rationale:** the gate semantics (at least one element classified) and the
human-readable summary differ from generic required-field validity.
**Alternative considered:** push vision-classify into the generic validity engine
-- rejected: it cannot express the "at least one across two columns" gate or the
readable summary phrasing.

### 5. Detection via `item.id`, not the tool-formId join

`buildDecisionTarget` flags `isVisionClassify` directly via `item.id ===
's1-vision-classify'`. Phase C Part 1's labour detection uses the matched form
tool's `formId`; here `item.id` is simpler, equally correct (the tool is joined by
`formId === item.id`), and does not depend on a form match existing. The literal id
is consistent with established practice in the same function (labour hardcodes
`'s1-vision-labour'`; success-criteria uses a literal `optionSetId`); there is no
const/enum form to reference.

**Rationale:** prefer the simpler, dependency-free detection; the early body-router
arm already guarantees precedence over the matched form tool.

### 6. Deferred surfaces + inherited status caveats

The **boundaries** and **stakeholders** surfaces (Part 3) are **design-only** this
phase (recorded in `phase-c-tier0-surfaces.md`); the **stewards** real-invite /
RBAC track comes later. The display-only status caveats inherited from Phase B
still hold: defer remains a display-only annotation and `planStratumStore` is
untouched.

## Consequences

- A steward opening the Tier-0 vision-classify decision sees the bespoke surface:
  type-aware suggestion chips (click to stage), a transient Unclassified staging
  zone (sort each into Committed or Aspirational), a write-your-own input with a
  committed/aspirational role toggle, and in-column switch/delete; Record stays
  disabled until at least one element is classified, then records a readable
  "N committed, M aspirational" summary, marks the checklist item complete, and
  advances progress; reopening rehydrates the two columns from the flat `FormValue`
  losslessly (the transient staging zone starts empty -- it was never persisted).
- The labour, success-criteria, and every other decision render exactly as the
  prior phases left them; the vision-classify form tool + its `fields` remain in
  `actToolCatalog.ts` as the modal / `<select>` fallback.
- Vision-classify suggestion content ships REVIEW-flagged; ONE source of truth
  keeps the `<select>` fallback in sync automatically.
- No `FormValue` type change; no `planStratumStore` touch; no API/DB persistence.

## Amanah

Structured capture of land-stewardship **vision intent** -- sorting candidate
vision elements into committed (now) vs aspirational (longer-horizon) columns. No
sales channel, advance purchase, or financing instrument; no CSRA/salam framing; no
riba/gharar surface ([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]).
Clean.

## Verification

- Shared `tsc --noEmit` clean (VC1); web `tsc --noEmit` EXIT 0 (8GB heap).
- Bounded `vitest --pool=forks --testTimeout=20000`
  ([[feedback-vitest-bounded-runs]]): fieldOptions (20); `VisionClassifyCapture`
  (14, incl. TOTAL-decode over garbage + switch-column + staging); `DecisionWorkingPanel`
  (25, incl. the gate-note + valid-path emission); `ActTierZeroWorkbench` (19,
  incl. detection true/sibling-false + the resolver-first-entry threading
  assertion).
- Two-stage SDD review (spec then code-quality) PASSED for VC1-VC4; VC1 nits folded
  into `65b3ef2a`, VC2 Important (discard-label collision) + nits into `63724014`,
  VC3 Important (derive-once memoization) + nits into `6b5ab59c`; VC4 approved with
  two optional non-gating nice-to-haves.
- Final whole-implementation review (Part 1 LC1-LC5 + Part 2 VC1-VC5): PASSED,
  APPROVED -- no Critical/Important defects; contract verified honored; three
  nice-to-haves deferred (reset transient staging on decision switch, aria-pressed
  parity on the own-role toggle, a precedence-ordering test).
- Deferred nice-to-haves CLOSED in polish pass `1e2b5607` (TDD-first, RED before
  GREEN): the bespoke children are keyed on `decision.itemId` so transient
  non-persisted UI state (Unclassified staging / Labour skill composer) resets on a
  decision switch; `aria-pressed` added to the own-role buttons; and a precedence
  test locks the body-router arm ordering (a target with BOTH `fields` and
  `isVisionClassify` renders the bespoke surface, not generic fields). Re-verified
  bounded vitest (`DecisionWorkingPanel` 28, `VisionClassifyCapture` 15,
  `LabourInventoryCapture` 32) green; shared + web `tsc --noEmit` clean.
- Live smoke (2026-06-06): PASS. `/v3/project/mtc/act/tier-shell/s1-vision`
  (Moontrance Creek, regenerative farm) renders the non-map 3-pane Tier-0
  workbench; `VisionClassifyCapture` shows type-aware regen-farm suggestion chips,
  rehydrated Committed/Aspirational columns, and the staging->sort flow works
  end-to-end (chip -> Unclassified card -> sort to Aspirational; Committed 1 ->
  Aspirational 1, Record enabled); the sibling labour decision renders
  `LabourInventoryCapture`. No-screenshot-no-claim honored (two screenshots);
  cold-load screenshot `UnknownVizError` was the transient hang
  ([[project-screenshot-hang]]), resolved by a web-preview restart once the API was
  healthy.

## Alternatives considered

- **Encode the value into flat scalars like labour:** rejected -- both arms are
  already native `string[]`; an encode pair would be pointless ceremony.
- **A new rich store slice for vision-classify:** rejected -- a second persistence
  shape breaks the single-FormValue contract and the legacy summary mirror.
- **Persist the transient Unclassified staging zone:** rejected -- it would record
  un-affirmed candidates and add a third array to the value shape for no durable
  purpose.
- **Pre-tag each suggestion committed or aspirational:** rejected -- it pre-empts
  the steward judgement the surface exists to capture.
- **Generic validity/summary engine for vision-classify:** rejected -- cannot
  express the "at least one across two columns" gate or the readable summary.
- **Detect via the tool-formId join (like labour):** rejected in favour of the
  simpler dependency-free `item.id ===` check; the early body-router arm already
  guarantees precedence over the matched form tool.
