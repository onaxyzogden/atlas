# ADR: Tier-0 Labour Inventory surface (Phase C: bespoke labour capture)

- **Date:** 2026-06-06
- **Status:** Accepted
- **Branch:** `feat/structured-capture-forms` (commits `177f01fb` -> `95d7c424` -> `d179ecc9` -> `df28a062` -> `e8935c0c` -> `87e0d6ab`, local-only, not pushed)
- **Entity:** [[entities/act-tier-shell]]
- **Relates to:** [[decisions/2026-06-06-atlas-tier0-workbench]] (Phase B -- the Tier-0 workbench + `SuccessCriteriaCapture` controlled-renderer pattern this phase mirrors and reuses) and [[decisions/2026-06-05-atlas-structured-capture-forms]] (Phase A -- the structured-capture engine + `FormValue` contract)
- **Log:** [[log/2026-06-06-atlas-tier0-labour-surface]]

## Context

Phase B ([[decisions/2026-06-06-atlas-tier0-workbench]]) shipped the Tier-0
3-pane workbench and proved a **bespoke controlled renderer**
(`SuccessCriteriaCapture`) over the unchanged Phase A `FormValue` contract for
the success-criteria decision. Every other decision in the panel -- including the
labour inventory -- still rendered through the **generic** `VisionFormFields`
engine. The operator then supplied a polished mockup
(`olos_labour_inventory_decision.html`) for the **labour inventory** decision and
chose to converge the product onto it.

The mockup has four blocks: (1) **WHO** -- a single-select of 4 team-shape cards;
(2) weekly **HOURS** -- a stepper plus a derived capacity-band signal; (3)
**SEASONAL** -- per-season steppers (spring/summer/autumn/winter) plus an
annual-rhythm visualization; (4) **SKILLS** -- a type-aware checklist of
candidate skills that varies by the project's chosen type(s).

The generic engine cannot express this interaction; but, exactly as in Phase B,
the **persistence contract must not change** -- the labour decision still records
a plain `FormValue` so the store, the legacy summary mirror, and the modal /
`<select>` fallback all keep working unchanged.

## Decision

Introduce a **bespoke `LabourInventoryCapture` controlled renderer** for the
`s1-vision-labour` decision, routed from the working panel, over an **unchanged
flat `FormValue`**. New code is additive; **no deletion** of the generic engine,
the labour form tool, or its `fields` (all remain as the modal / `<select>`
fallback -- [[feedback-no-deletion]]).

### 1. Bespoke controlled renderer over a flat `FormValue` encoding

`LabourInventoryCapture.tsx` reasons internally with a rich `LabourModel` but
**persists the UNCHANGED `FormValue` type**:
`{ who, hours, spring, summer, autumn, winter: string; skills: string[] }`,
where each skill is encoded as `name::level`. Component-owned `encode`/`decode`
round-trip losslessly. `decode` is **TOTAL**: missing/garbage fields fall back to
defaults, an unknown skill level coerces to `beginner`, `NaN` hours coerce to
`0`, and each skill string is split on the **LAST** `::` so a custom skill name
that itself contains `::` survives the round-trip. This mirrors `SuccessCriteriaCapture`
(an alternative renderer over the same FormValue, not a new store shape).

**Rationale:** the faithful mockup UX needs bespoke interaction, but persistence
must stay on the unchanged `FormValue` contract so the store, summary mirror, and
fallback dropdown are untouched. **Alternatives considered:** (a) **extend the
generic `VisionFormFields` / `FormValue` type** with rich labour subtypes --
rejected: it would fork a generic engine for one decision and change the shared
type; (b) **a new rich `LabourModel` store slice** -- rejected: a second
persistence shape for one decision, breaking the single-FormValue contract and
the legacy summary mirror.

### 2. Display-default baking

`decode` **never fabricates** persisted data. The **component** applies the
mockup's helpful display fallbacks (hours `20`; seasonal `25/20/30/10`) **only as
a display fallback when the value is unset**, and bakes them into the next
persisted model **on the first edit**. The Record action stays **disabled until
the user affirms by editing**.

**Rationale:** this honors the mockup's helpful defaults without recording values
the steward never affirmed, and keeps `encode`/`decode` exact for real persisted
values. **Alternative considered:** bake defaults into `decode` -- rejected:
it would persist (and "complete" the decision with) numbers the steward never
chose, an honesty violation.

### 3. Type-aware skills via shared `resolveLabourSkills`

`resolveLabourSkills(primary, secondaries)` in `@ogden/shared` has **string
parity** with `resolveFieldOptions('laborSkillsByType', ...)` (ONE source of
truth), and `laborSkillsByType._base` was reconciled with the mockup's general
skills (REVIEW-flagged for operator content confirmation). The workbench resolves
labour skills **inline** (no memo -- `secondaryTypeIds ?? []` mints a fresh array
each render so a memo would not stabilise, the same rationale as the Phase-B
`scOptions`) and threads them to the panel via a new `labourSkillSuggestions`
prop.

**Rationale:** skills should vary by project type **without forking** the option
source. **Alternative considered:** a labour-specific skill list separate from
`resolveFieldOptions` -- rejected: it would duplicate (and drift from) the
existing per-type option source.

### 4. Bespoke validity + summary routed before `hasFields`

`DecisionWorkingPanel` routes the labour decision through an `isLabourInventory`
branch placed **before** the generic `hasFields` branch. Validity is computed by
`isLabourValid` (who set **AND** `hours > 0` **AND** `>= 1` skill) and the Record
summary by `summariseLabour` (e.g. "Small paid team, 20 hrs/wk, 4 skills") --
**NOT** the generic `isFormValueValid` / `summariseFormValue`. Detection in the
workbench is `buildDecisionTarget` flagging `isLabourInventory` when the matched
form tool's `formId === 's1-vision-labour'`.

**Rationale:** the labour gate semantics (team + hours + at least one skill) and
the human-readable summary differ from generic required-field validity.
**Alternative considered:** push labour into the generic validity engine via
required-field specs -- rejected: the generic engine cannot express the
who/hours/skills composite gate or the readable summary phrasing.

### 5. Deferred surfaces + inherited status caveats

The **vision-classify** surface is next (VC1-VC5; full code in
`phase-c-tier0-surfaces.md`); the **constraints** register and **stewards** track
come later. The display-only status caveats inherited from Phase B still hold:
defer remains a display-only annotation and `planStratumStore` is untouched.

## Consequences

- A steward opening the Tier-0 labour decision sees the bespoke 4-block surface
  (WHO single-select, HOURS stepper + capacity band, SEASONAL steppers + rhythm
  viz, type-aware SKILLS); Record stays disabled until who + hours + at least one
  skill are affirmed, then records a readable summary, marks the checklist item
  complete, and advances progress; reopening rehydrates the surface from the flat
  `FormValue` losslessly.
- The success-criteria decision and every other decision render exactly as Phase
  B left them; the labour form tool + its `fields` remain in `actToolCatalog.ts`
  as the modal / `<select>` fallback.
- Labour-skill content ships REVIEW-flagged; ONE source of truth keeps the
  `<select>` fallback in sync automatically.
- No `FormValue` type change; no `planStratumStore` touch; no API/DB persistence.

## Amanah

Structured capture of land-stewardship **labour intent** (team shape, weekly +
seasonal hours, skills). No sales channel, advance purchase, or financing
instrument; no CSRA/salam framing; no riba/gharar surface
([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]). Clean.

## Verification

- Shared `tsc --noEmit` clean (LC1); web `tsc --noEmit` EXIT 0 (8GB heap).
- Bounded `vitest --pool=forks --testTimeout=20000`
  ([[feedback-vitest-bounded-runs]]): fieldOptions (16); `LabourInventoryCapture`
  (32, incl. decode `::` round-trip + default-baking + capacity-band boundaries);
  `DecisionWorkingPanel` (22); `ActTierZeroWorkbench` (15, incl. the
  resolver-first-entry threading assertion).
- Two-stage SDD review (spec then code-quality) PASSED for LC1-LC4; LC2 nits
  folded into `d179ecc9`, LC4 nit into `87e0d6ab`.
- Final whole-implementation review + live smoke tracked under the consolidated
  Phase-C plan; the Phase-B map-flicker fix `a842f3f2` makes the live smoke
  viable ([[log/2026-06-06-atlas-tier0-workbench]]).

## Alternatives considered

- **Extend the generic `VisionFormFields` / `FormValue` type for labour:**
  rejected -- forks a generic engine for one decision and mutates the shared type.
- **A new rich `LabourModel` store slice:** rejected -- a second persistence
  shape breaks the single-FormValue contract and the legacy summary mirror.
- **Bake display defaults into `decode`:** rejected -- would persist and "complete"
  the decision with numbers the steward never affirmed.
- **A labour-specific skill list separate from `resolveFieldOptions`:** rejected
  -- duplicates and drifts from the per-type option source; the shared
  `resolveLabourSkills` keeps one source of truth.
- **Generic validity/summary engine for labour:** rejected -- cannot express the
  who/hours/skills composite gate or the readable summary.
