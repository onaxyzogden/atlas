# ADR: Act tier-shell Evidence section is per-objective; tools rail navigates by dots

**Date:** 2026-05-31
**Status:** Accepted
**Branch:** `feat/atlas-permaculture` (three explicit-path slice commits `efd4c41f` boxed checklist -> `1135366d` per-objective Evidence -> `1098cd58` dots navigator; interleaved with foreign commits by the out-of-band rebase [[project-branch-rebase]]; not pushed)
**Plan:** `~/.claude/plans/elements-of-this-concept-toasty-ember.md`

## Context

Three operator requests captured live on the production Act tier-shell
right-rail execution panel ([[entities/act-tier-shell]]):

1. **Box the checklist items.** The objective's checklist rendered as a bare
   flex stack (`.execCheckRow` had no chrome) directly above the already-boxed
   Evidence cards (`.evCard`), reading as two inconsistent treatments.
2. **The Evidence section was hardcoded.** Three cards -- Checkpoint photos /
   Route passable confirmation / Summary note -- were shown for EVERY objective.
   The operator flagged "Route passable confirmation" as access/road-specific
   and irrelevant to most objectives, and chose the broad fix (AskUserQuestion:
   **"Make all evidence per-objective"**): drive the whole section from a
   per-objective relevance map, not just gate the one card.
3. **Replace the tools-rail scrollbar with dots.** The bottom rail frames one
   tool category at a time and revealed the rest via a native vertical scrollbar
   (a prior iteration's `.toolsRow` `overflow-y:auto` + `scroll-snap-type:y`).
   The operator wanted vertically-stacked circles/dashes that BOTH indicate the
   current category page AND navigate (click -> scroll/snap), scrollbar hidden.

Three independent slices; each committed as it verified.

## Decision

### 1. Per-objective Evidence model (net-new product data)

A new shared module
`packages/shared/src/relationships/objectiveEvidence.ts` mirrors the
objective->tool pattern ([[decisions/2026-05-31-atlas-act-objective-tool-rail]],
`objectiveActTools.ts`). Unlike the tool catalogue -- which lives app-side
because it joins lucide icons + the `MapToolId` union -- the **Evidence
descriptor data has NO app deps** (id, kind, label, required, target), so the
catalogue AND the relevance map both live in `@ogden/shared` and the resolver
returns ready-to-render descriptors; the app layer only renders.

- `EvidenceKind = 'photo' | 'confirm' | 'note'`;
  `EvidenceDescriptor { id, kind, label, required, target? }`.
- `EVIDENCE_CATALOG` -- five descriptors. The original three are preserved
  verbatim so shown visuals stay byte-identical: `checkpoint-photos`
  (photo, target 3), `route-passable` (confirm), `summary-note` (note). Two
  generics added: `site-photo` (photo, target 1, optional),
  `measurement-confirm` (confirm, "Measurements verified on site").
- `OBJECTIVE_EVIDENCE_OVERRIDE` -- keyed by the REAL 19 universal objective ids
  (the same vocabulary the tool-rail rewrite established). `summary-note` on all
  19. **`route-passable` on ONLY `s5-access` and `s2-infrastructure`** (the
  operator's fix). `measurement-confirm` on the measured/spec-design objectives
  (`s3-soil`, `s4-water-strategy`, `s5-water-infrastructure`,
  `s5-soil-improvement`). Photos on objectives that survey or place physical
  things on site.
- `STRATUM_EVIDENCE_DEFAULT` -- per-stratum backstop (every stratum at least
  `summary-note`; the two reading strata add `site-photo`).
- `getObjectiveEvidence(objective): readonly EvidenceDescriptor[]` -- resolves
  `OVERRIDE[id] ?? STRATUM_DEFAULT[stratumId] ?? ['summary-note']`, maps ids ->
  descriptors via the catalogue (dropping unknown ids). Exported from the ROOT
  `@ogden/shared` barrel beside `getObjectiveActTools`.

`ActTierExecutionPanel` renders `evidence.map(renderEvidenceCard)`. The three
scalar evidence vars became descriptor-keyed records
(`photoCounts`/`confirms`/`notes`/`noteSaved`: `Record<string, ...>`) so
multiple cards of one kind can coexist. Each `kind` branch reproduces the
EXISTING markup/classes byte-for-byte (`.evCard`, `.evCardTop`, `.evCardTitle` +
`.req`, `.evCardCount`, `.evBtnFull` with `data-confirmed`, the note
`.noteArea`/`.evBtnRow`/`.evBtnSmall`) -- only WHICH cards appear is now
objective-driven. **Evidence state stays LOCAL and unpersisted** -- a deliberate
visual-first swap matching the panel's pre-existing precedent; store wiring is a
separate follow-up. The `ready` gate is unchanged (checklist-only).

### 2. Conformance guard

`apps/web/src/v3/act/tier-shell/__tests__/objectiveEvidenceCoverage.test.ts`
mirrors `actToolCoverage.test.ts` -- the exact guard whose absence let the tool
override map silently rot against stale ids. Six invariants: every override key
is a real universal objective id; every objective has an entry; every id in
every list AND every resolved descriptor exists in the catalogue; each catalogue
descriptor's id matches its key + valid kind + photo target > 0; every objective
emits at least `summary-note`.

### 3. Dots navigator replaces the scrollbar (CSS + small JSX)

`ActTierCategorizedToolsRail` builds an indexable `visibleCats` list once (the
non-empty categories for the objective), tracks the framed category via an
`IntersectionObserver` (`root` = the row, `threshold [0.25,0.5,0.75,1]`, deps
`objective.id` + visible-count -> highest-ratio entry sets `activeIndex`), and
renders a `.toolsDots` `<nav>` -- one `.toolDot` button per category, rendered
**only when `visibleCats.length > 1`** -- as a sibling of `.toolsRow` inside a
new `.toolsBody` flex row. Clicking a dot `scrollIntoView({behavior:'smooth',
block:'start'})`s the matching `.toolCat`, landing on the existing snap point.
A `.toolDot` is a 7px circle that elongates into a 16px gold dash when active
(combining the operator's "circles/dashes"). The native scrollbar is hidden on
`.toolsRow` (`scrollbar-width:none` + `::-webkit-scrollbar{display:none}`).
`--act-cat-h` moved from `.toolsRow` to the `.toolsBody` wrapper so both
children inherit it.

### 4. Box the checklist items (CSS-only)

`.execCheckRow` gains the `.evCard` chrome (`padding:10px 12px`, `--color-bg`
background, 1px `--color-border`, `--radius-md`) while staying a flex ROW
(checkbox + label side by side); `.execChecklist` gap 6px -> 8px to match the
Evidence-card spacing. No JSX change.

## Consequences

- The Evidence section now reflects each objective's own field-proof needs;
  "Route passable confirmation" no longer appears on objectives it has nothing
  to do with. New objectives without an override fall through to the per-stratum
  default; the universal floor is always `summary-note`.
- A second authored relationship map now governs the Act execution panel
  (evidence) alongside the tool rail (tools). Both are **product data, authored
  by hand**, both keyed by the real 19 objective ids, both conformance-guarded.
  Drift from the objective-id vocabulary fails the build.
- Evidence capture remains ephemeral (per-id local state, resets on reload),
  consistent with the panel's standing "visual-first, not persisted" posture.
  Persisting it (a `planStratumStore` slice or new evidence slice) is the named
  follow-up.
- The tools rail is now navigable without a visible scrollbar; the dots double
  as a page indicator. Single-category objectives show no dots (no chrome for a
  one-page rail).

## Verification

- `tsc --noEmit` clean: `apps/web` exit 0, `packages/shared` exit 0 (the prior
  foreign-WIP web errors have since cleared).
- Conformance: `objectiveEvidenceCoverage.test.ts` **6/6 green**.
- Live preview (typed project "Baseline Test Homestead",
  `/v3/project/8a815400-.../act`), DOM + `preview_screenshot`:
  - Slice 1: checklist items render as bordered cards matching the Evidence
    cards below.
  - Slice 2: `s1-vision` -> only "Summary note"; `s2-terrain` -> Checkpoint
    photos + Summary note (**NO** route-passable); `s5-access` -> Checkpoint
    photos + Route passable + Summary note. Confirmed by reading `.evCardTitle`
    text per objective.
  - Slice 3: `s2-ecology` (two categories) -> 2 dots, native scrollbar hidden
    (`scrollbarWidth:'none'`), row overflows (`scrollHeight 240 > clientHeight
    116`), first dot the gold dash; clicking dot 2 scrolled the row
    (`scrollTop 124`) and the observer moved the active dash to dot 2;
    `s2-terrain` (one category) -> 0 dots. `preview_screenshot` captured both
    dot states.

## Process / covenant

Three explicit-path slice commits (own files by name, never `git add -A`;
`git diff --cached --name-only` before each; each committed the moment it
verified per [[feedback-commit-immediately-on-rebased-branches]]) plus this
`docs(wiki)` commit. Commit messages written BOM-free via
`[System.IO.File]::WriteAllText` + `git commit -F`. Foreign WIP left untouched
([[feedback-no-deletion]]); not pushed at slice time (out-of-band rebase,
[[project-branch-rebase]]). CSRA model untouched
([[fiqh-csra-erased-2026-05-04]]); ASCII-only copy.

Entity: [[entities/act-tier-shell]]. Log: [[log/2026-05-31-act-tier-shell-evidence-dots]].
Builds on [[decisions/2026-05-31-atlas-act-objective-tool-rail]].
