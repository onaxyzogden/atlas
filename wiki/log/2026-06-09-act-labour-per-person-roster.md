# 2026-06-09 — LabourInventoryCapture redesigned around a per-person availability roster

**Closed.** Operator selected `LabourInventoryCapture` on the Act tier-shell and
critiqued its single lumped field: *"'Typical weekly hours (whole team combined)'
is ridiculous. Each person has a different availability and adding them up after
it's been individually determined makes more sense than randomly guessing."*
Scope chosen (via AskUserQuestion): the **full per-person model** — each roster
person carries their own (a) weekly hours, (b) four-season availability curve,
and (c) skill+level list; plus **pre-fill the roster from the sibling
StewardCapture decision** (`s1-vision-steward`).

The old model captured team SIZE as a qualitative band ("Who is the stewardship
team?": Solo / Family / Small 2-5 / Larger 6+) and then a single guessed
`hours` total that drove the Capacity signal and Act task pacing. The field that
held the total was coarser than the information needed to compute it.

## Approach — additive roster, derived team totals, no store migration

The component is a pure controlled renderer over a flat `FormValue`
(`Record<string, string | string[]>`). The redesign makes `roster:
PersonAvailability[]` the source of truth and **recomputes** the legacy
`hours`/`spring..winter`/`skills` fields from it on every `encode` via
`deriveTeam` — strictly additive, so every downstream consumer reading the flat
team totals keeps working unchanged and no persisted decisions need migrating.

- **Flat encoding** — the roster persists as index-aligned parallel `string[]`
  arrays (`rosterNames`/`rosterRoles`/`rosterHours`/`rosterSpring..Winter`),
  mirroring StewardCapture's invite arrays, plus `rosterSkills` — ONE packed cell
  per person holding that person's `name::level` skills joined by ASCII Unit
  Separator U+001F (unreachable from a keyboard, so `::`/`;`/`|` inside a custom
  skill name round-trip safely; each token still splits its level on the LAST
  `::`).
- **`deriveTeam(roster)`** — sums hours and each season; unions skills by name
  keeping the HIGHEST level (`beginner < capable < expert`).
- **`decode` is total + back-compat** — a value with no `rosterNames` (an old
  saved decision) collapses its combined hours/seasonal/skills into a single
  synthetic `primary` person, so existing decisions render as a 1-person roster
  and re-encode to identical derived legacy fields (no downstream drift).

## StewardCapture pre-fill

New exported helper `rosterSeedFrom(steward: StewardModel)` builds a seed roster:
an always-present `primary` "You" row plus one row per invited `team_member` /
`contractor` (landowners skipped — they steward the land, they are not labour),
each at a low `DEFAULT_PERSON_HOURS` (10) so seeding N people does not balloon the
derived total before real numbers are entered. `DecisionWorkingPanel` builds the
seed from `siblingValues['s1-vision-steward']` and passes it as the new
`rosterSeed?` prop. Display precedence: persisted roster > steward seed >
WHO-band default rows; the seed bakes into persistence only on the first edit.

## UI

WHO grid is retained but now only seeds the default row count. The roster is a
list of **expandable per-person rows**: a compact head (chevron, role chip, name
input, `{h}h/wk · {n} skills`, remove ✕) that expands to that person's hours
stepper, four-season grid, and skills checklist (with a per-row custom-skill
composer). Below the roster, a derived read-only **whole-team summary** block
("{hours} hrs/week combined, summed across N people") feeds the unchanged
Capacity signal (`getCapBand`) and annual-rhythm chart. Gate note rewritten in
roster terms: ready once one person carries hours and at least one skill.

## Changes (one explicit-path commit `98bbd73c`, `main`, **not pushed**)

- **EDIT `apps/web/src/v3/act/tier-shell/LabourInventoryCapture.tsx`** — model
  (`PersonRole`, `PersonAvailability`, `roster` on `LabourModel`); `encode`/
  `decode` (incl. legacy 1-person fallback); `deriveTeam`, `rosterSeedFrom`,
  packed-skill helpers; `rosterSeed?` prop; expandable-roster + team-summary body.
- **EDIT `apps/web/src/v3/act/tier-shell/LabourInventoryCapture.module.css`** —
  ~14 new roster/team-summary classes, no deletions.
- **EDIT `apps/web/src/v3/act/tier-shell/DecisionWorkingPanel.tsx`** — import
  `rosterSeedFrom`; build `labourRosterSeed` from the steward sibling; pass the
  `rosterSeed` prop; rewrite the labour gate-note (drop the `who` check).
- **EDIT `apps/web/src/v3/act/tier-shell/__tests__/LabourInventoryCapture.test.tsx`**
  — full rewrite for the per-person model (19 tests).

## Verification

`tsc -p apps/web --noEmit` clean (8 GB heap). Bounded vitest
(`--pool=forks --testTimeout=20000`) on the rewritten test file — **19/19**
green: `encode(decode(v))` round-trip incl. a `::`-in-name skill and a 0-skill
person (empty cell); legacy value decodes to a 1-person roster whose derived
totals equal the old combined fields; `deriveTeam` sum + highest-level union;
`isLabourValid`; `summariseLabour`; `rosterSeedFrom` (primary + team_member/
contractor, skips landowner); roster-row render/expand/add/team-total DOM.

DOM proof on the map-free `/v3/components` "Decision Working Panel — labour
inventory" mount ([[project-screenshot-hang]] — `preview_screenshot` hangs on the
WebGL map): default renders one `primary` "You" row with cap bar 22% and live
rhythm bars; +5 on the primary's hours → primary stats "15h/wk", team total "15";
"Add a person" → 2 rows (new `team_member` auto-expanded), derived team total
"25", cap bar 22%→38%, signal "Medium — 1-2 major tasks per week" — confirming
per-person edits flow into the derived whole-team totals.

A foreign-WIP footer/rationale-block reorder in `DecisionWorkingPanel.tsx`
(~lines 947-972) was left **unstaged/untouched**; only my four hunks were staged
(via `git apply --cached` of a partial patch). Pre-existing unrelated
`actToolCoverage` gap (silvopasture s5/s6/s7 override entries) out of scope.

Entity: [[entities/act-tier-shell]] (new "Labour per-person roster" section).

---
