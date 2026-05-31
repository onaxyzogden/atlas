# 2026-05-31 -- Act tier-shell: boxed checklist items, per-objective Evidence, dots navigator for the tools rail

**Branch.** `feat/atlas-permaculture` (three explicit-path slice commits `efd4c41f` Slice 1 -> `1135366d` Slice 2 -> `1098cd58` Slice 3, interleaved by the out-of-band rebase with foreign commits; branch 25 ahead of origin, **not pushed** at slice time). Plan: `~/.claude/plans/elements-of-this-concept-toasty-ember.md`. ADR: [[decisions/2026-05-31-atlas-act-evidence-perobjective-and-dots]].

Three operator requests on the production Act tier-shell right-rail execution panel ([[entities/act-tier-shell]]), each an independent slice.

## Slice 1 -- Box up the checklist items (`efd4c41f`, CSS-only)

`ActTierExecutionPanel.module.css`: `.execCheckRow` rendered as a bare flex stack directly above the already-boxed `.evCard` Evidence cards. Gave it the same chrome (`padding:10px 12px`, `background:var(--color-bg)`, `border:1px solid var(--color-border)`, `border-radius:var(--radius-md)`) while keeping it a flex ROW (checkbox + label side by side); bumped `.execChecklist` gap 6px -> 8px to match the Evidence-card spacing. No JSX change.

## Slice 2 -- Per-objective Evidence model + panel refactor (`1135366d`)

The Evidence section was three HARDCODED cards (Checkpoint photos / Route passable confirmation / Summary note) shown for EVERY objective. The operator flagged "Route passable confirmation" as access-specific and chose (AskUserQuestion) **"Make all evidence per-objective"** -- drive the whole section from a relevance map, not just gate the one card.

- **New shared module** [packages/shared/src/relationships/objectiveEvidence.ts](packages/shared/src/relationships/objectiveEvidence.ts), mirroring `objectiveActTools.ts`. Because the Evidence descriptor data has NO app deps (no icons, no `MapToolId`), the catalogue AND the relevance map both live in `@ogden/shared` and the resolver returns ready-to-render descriptors -- the app layer only renders.
  - `EvidenceKind = 'photo'|'confirm'|'note'`; `EvidenceDescriptor {id,kind,label,required,target?}`.
  - `EVIDENCE_CATALOG` (5): original `checkpoint-photos` (photo, target 3), `route-passable` (confirm), `summary-note` (note) preserved verbatim so shown visuals stay byte-identical; plus generics `site-photo` (photo, target 1, optional) + `measurement-confirm` (confirm, "Measurements verified on site").
  - `OBJECTIVE_EVIDENCE_OVERRIDE` keyed by the REAL 19 universal objective ids. `summary-note` on all 19; **`route-passable` on ONLY `s5-access` + `s2-infrastructure`** (the fix); `measurement-confirm` on `s3-soil` / `s4-water-strategy` / `s5-water-infrastructure` / `s5-soil-improvement`; photos on survey/placement objectives.
  - `STRATUM_EVIDENCE_DEFAULT` backstop (every stratum >= `summary-note`; reading strata add `site-photo`).
  - `getObjectiveEvidence(objective)` -> `OVERRIDE[id] ?? STRATUM_DEFAULT[stratumId] ?? ['summary-note']`, mapped to descriptors (unknown ids dropped). Exported from the ROOT barrel ([packages/shared/src/index.ts](packages/shared/src/index.ts)) beside `getObjectiveActTools`.
- **[ActTierExecutionPanel.tsx](apps/web/src/v3/act/tier-shell/ActTierExecutionPanel.tsx)** -- the three scalar evidence vars became descriptor-keyed records (`photoCounts`/`confirms`/`notes`/`noteSaved`: `Record<string, ...>`) so multiple cards of one kind coexist; `evidence = useMemo(getObjectiveEvidence(objective))`; a `renderEvidenceCard(descriptor)` helper with photo/confirm/note branches reproducing the EXISTING markup/classes byte-for-byte; the three hardcoded blocks replaced by `{evidence.map(renderEvidenceCard)}`. Evidence state stays LOCAL/unpersisted (header comment updated to say it is now objective-driven but still ephemeral). The `ready` gate (checklist-only) and all other sections unchanged.
- **New conformance test** [objectiveEvidenceCoverage.test.ts](apps/web/src/v3/act/tier-shell/__tests__/objectiveEvidenceCoverage.test.ts) mirroring `actToolCoverage.test.ts` -- the exact guard whose absence let the tool override map silently rot. 6 invariants (override keys real; every objective covered; ids+descriptors in catalogue; descriptor id==key + valid kind + photo target>0; every objective >= summary-note).

## Slice 3 -- Dots navigator replaces the tools-rail scrollbar (`1098cd58`)

The bottom rail frames one tool category at a time; a prior iteration revealed the rest via a native vertical scrollbar (`.toolsRow` `overflow-y:auto` + `scroll-snap-type:y mandatory`). Operator wanted vertically-stacked circles/dashes that indicate AND navigate, scrollbar hidden.

- **[ActTierCategorizedToolsRail.tsx](apps/web/src/v3/act/tier-shell/ActTierCategorizedToolsRail.tsx)** -- builds an indexable `visibleCats` list once (the non-empty categories), tracks the framed category via an `IntersectionObserver` (`root` = `rowRef`, `threshold [0.25,0.5,0.75,1]`, deps `objective.id` + visible-count; highest-`intersectionRatio` entry sets `activeIndex`; disconnect on cleanup; short-circuits to index 0 when `visibleCount <= 1`). Renders a `.toolsDots` `<nav>` -- one `.toolDot` button per category, **only when `visibleCats.length > 1`** -- as a sibling of `.toolsRow` in a new `.toolsBody` flex row; each dot `scrollIntoView`s its `.toolCat` (via `catRefs`). Hooks declared before the early returns (so `tools`/`visibleCats` compute with `objective` possibly null); the empty-state guard switched from `tools.length === 0` to `visibleCats.length === 0`.
- **[ActTierShell.module.css](apps/web/src/v3/act/tier-shell/ActTierShell.module.css)** -- new `.toolsBody` row wrapper (declares `--act-cat-h`, so both children inherit it); `.toolsRow` gains `flex:1 1 auto; min-width:0` and hides the native scrollbar (`scrollbar-width:none` + a separate `::-webkit-scrollbar{display:none}`); new `.toolsDots` (centered column, 6px gap) and `.toolDot` (7px circle -> `data-active` elongates to a 16px gold dash; hover brighten; `:focus-visible` outline).

## Verification

- **tsc:** `apps/web` exit 0; `packages/shared` exit 0. (The foreign-WIP web errors flagged in [[log/2026-05-31-act-tier-shell-followups]] have since cleared.)
- **Conformance:** `objectiveEvidenceCoverage.test.ts` **6/6**.
- **Live preview** (typed project "Baseline Test Homestead", `/v3/project/8a815400-80c3-4413-93a4-0a0030f372d3/act`), DOM via `preview_eval` + two `preview_screenshot`s:
  - Slice 1: checklist items render as bordered cards matching the Evidence cards.
  - Slice 2: `s1-vision` -> `["Summary note *"]` only; `s2-terrain` -> Checkpoint photos + Summary note (no route-passable); `s5-access` -> Checkpoint photos + Route passable + Summary note (read off `.evCardTitle`).
  - Slice 3: `s2-ecology` (Water & Hydrology + Ecology & Habitat) -> `dotCount 2`, `scrollbarWidth 'none'`, row `scrollHeight 240 > clientHeight 116`, dots `[true,false]`; clicking dot 2 -> `scrollTop 124` and dots `[false,true]` (observer fired); `s2-terrain` -> `dotCount 0`. Screenshots captured both dot states (the gold dash moving from the upper to the lower dot as the row scrolled from the single-tile Water category to the 3-tile Ecology category).

## Process / covenant

Three explicit-path slice commits (own files by name, never `git add -A`; `git diff --cached --name-only` before each; committed the moment each verified per [[feedback-commit-immediately-on-rebased-branches]]) plus this `docs(wiki)` commit. Commit messages written BOM-free via `[System.IO.File]::WriteAllText` + `git commit -F`. Branch fetched + divergence-checked before push (ahead 25, not behind). Foreign WIP untouched ([[feedback-no-deletion]]); CSRA model untouched ([[fiqh-csra-erased-2026-05-04]]); ASCII-only copy.

**Deferred (named):** persist Evidence/form capture to a real store slice (`planStratumStore` or a new evidence slice) so photos/confirms/notes survive reload -- still local/ephemeral by design.
