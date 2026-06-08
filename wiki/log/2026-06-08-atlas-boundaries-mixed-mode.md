# 2026-06-08 -- Boundaries Tier-0 surface reverted to the 7-item mixed-mode mockup

**Branch:** `feat/structured-capture-forms` · **Entity:** [[entities/act-tier-shell]] · **ADR:** [[decisions/2026-06-08-atlas-boundaries-mixed-mode]]

## What

Operator selected the centre + right columns of the shipped 5-register `s1-boundaries` Tier-0 Decision Workbench and asked to match `olos_boundaries_legal_mixed_surface.html` -- the EARLIER 7-item mixed-mode shape, preserved as `BoundaryCaptureLegacy.tsx` when the 5-register surface shipped on 2026-06-07. This is a deliberate revert-of-the-revert for this objective: catalogue re-decompose + import swap from the register `BoundaryCapture` to the mixed `BoundaryCaptureLegacy`, plus two new optional feed-caption schema fields and gated `DecisionList` enhancements.

## Commits (BR1-BR6 + polish)

- `15d9482b` BR1 -- schema: optional `feedHint`/`feedNote` on `PlanDecisionChecklistItemSchema`; `ck()` gains `opts`.
- `38df407b` BR3 -- re-decompose `s1-boundaries` to 7 items (order c2,c1,c3,c4,c5,c6,c7) / 2 groups in `universal.ts`; folds the rewritten catalogue test (BR2).
- `66a3202f` BR4 -- `DecisionWorkingPanel` import swap to `BoundaryCaptureLegacy` + mixed-mode gate-note arm; boundary describe block rewritten.
- `620cd45d` BR5 -- `ActTierZeroWorkbench` `boundaryModeFor` import swap + route `feedNote` into `feedsLabel` + wire `showGroups`.
- `4da47016` BR6 -- `DecisionList` group dividers + mode-badge icons (`MODE_ICONS`) + `feedHint` chip, all gated; CSS + tests.
- `9d77a306` polish -- c7 gate-note clarifying comment + c3/c6 gate-note assertions (post-review nit).

## Mapping (id -> legacy mode -> badge)

c2->map (Map) · c1->doc/titleDeed (Document) · c3->mapEntry (Map + entry) · c4->decision/zoning (Decision) · c5->decision/water (Decision) · c6->doc/covenant (Document) · c7->decision/permits (Decision). dg1 "Title & boundary" = [c2,c1]; dg2 "Legal & permit obligations" = [c3,c4,c5,c6,c7].

## Verification

- shared `tsc` EXIT 0; web `tsc` EXIT 0 (8GB heap).
- Bounded vitest (`--pool=forks --testTimeout=20000`): catalogues 105; DecisionWorkingPanel 55; DecisionList 23; BoundaryCaptureLegacy 57 (live); BoundaryCapture 44 (preserved unwired); ActTierZeroWorkbench 37.
- Final code-quality review: APPROVE WITH NITS (no Critical/Important; no regression to other Tier-0 surfaces).
- Live preview DOM-verified (`preview_screenshot` hung on the Act map canvas -- transient, [[project-screenshot-hang]]; used `preview_eval` instead): centre column = 7 items in order under 2 group dividers, every badge iconed, feed chips on c3/c4/c5 (no double-prefix), "0 / 7 decisions made", gate + focused question. Right panel per item = correct body + verbatim `feedNote` feeds-block callout + correct per-mode gate note (c7 none + Record enabled, always valid).

## Notes / deferred

- Filenames now inverted vs roles (`BoundaryCapture` = register/dead; `BoundaryCaptureLegacy` = mixed/live). Rename deferred (churns legacy test imports).
- Register `BoundaryCapture.tsx` + 44-test suite preserved unwired (no-deletion rule) -- the same preservation that made this revival a 6-commit import-swap.
- Two new optional schema fields (`feedHint`/`feedNote`) are general and reusable by any future objective wanting feed captions.

## Amanah

Legal-constraint surveying (boundaries / title / easements / zoning / water / covenants / permits). No sale/advance-purchase/CSRA/salam ([[fiqh-csra-erased-2026-05-04]]); CSA-free surface. No riba/gharar. Clean.
