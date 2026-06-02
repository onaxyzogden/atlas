# 2026-06-02 -- Act rail header REPLACES the stratum context with the selected objective's detail

**Branch:** `feat/atlas-permaculture`
**Plan:** "Act rail header REPLACES stratum content with the selected objective's
short title + useful info (incl. live closed-loop flow data)" (single-slice,
approved 2026-06-02).
**Commit:** `c7f02afc` -- replace rail header with selected objective detail
(3 files, +346/-14).

## Context

Operator request (verbatim): "when objective chosen, change selected element to
contain the objectives short title and load additional info that may be useful.
reference attached file for reference when it comes to waste vectors". The
"selected element" is the `_railHeader_*` div in `ActTierObjectiveRail` (the Act
tier-shell LEFT rail header), which was STATIC -- it always showed stratum-level
info ("Stratum S4 / Foundation Decisions / Zones, sectors...") even after an
objective was selected. The reference file was
`Downloads/olos-waste-vector-v2.jsx`.

Operator decisions (AskUserQuestion, this thread):
- **Header mode = Replace with objective** (revert to the stratum header when none
  selected; eyebrow keeps the stratum context).
- **Info depth = all four blocks:** focused question, decision progress
  (verified/total), completion gate, act handoff + tools.
- **Flow data = REAL, surface it.** Correcting an earlier wrong claim: a live
  source EXISTS -- `useClosedLoopStore` (`apps/web/src/store/closedLoopStore.ts`,
  persist key `ogden-closed-loop`) holds `materialFlows: MaterialFlow[]` (the
  unified waste-vector / closed-loop model: `materialKind`, structured
  `sourceId`/`sinkId`, throughput, `origin` canvas|list), scoped per project by
  `f.projectId === projectId`, already consumed by `ClosedLoopGraphCard` /
  `WasteVectorTool` / `FlowConnectorTool`. The attached `.jsx` only LOOKED
  flow-less because it uses its own inline mock, not the store. Operator chose
  "Yes -- add a live-flow block" for resource-flow objectives.

Amanah gate: land-stewardship planning UI; no riba/gharar. Clean.

## What shipped

In the objectives branch of `ActTierObjectiveRail.tsx`, the `.railHeader` is now
conditional on the active objective:

- **Objective selected -> objective-detail header** (same `styles.railHeader`
  wrapper): eyebrow `Stratum S{n} . {stratum.title}` (reusing `styles.railEyebrow`,
  keeps the stratum context), title `shortTitle ?? title` (reusing
  `styles.railTitle`), then new `detail.*` blocks, each rendered only when its data
  is present -- focused question; decision progress (verified/total or "No tasks
  yet", with a `data-state` colour cue); completion gate; act handoff; resolved
  act-tool chips (`getObjectiveActTools` -> `resolveActTools`, capped at
  `MAX_TOOL_CHIPS = 6` + "+N more"); and for resource-flow objectives a live
  closed-loop material-flow block ("Material flows: N (M closed-loop)" or a quiet
  "No material flows recorded yet" hint).
- **None selected -> unchanged stratum header** (byte-identical eyebrow / title /
  summary).

The objectives LIST and the protocols branch are unchanged.

### CSS tension resolved
The rail's header classes live in `ActTierShell.module.css`, which is on the
foreign-WIP **never-edit** list. New objective-detail classes went into a NEW
sibling module `ActTierObjectiveRail.module.css` (imported as `detail`); the
wrapper and the stratum-mode header keep reusing `styles.*`. `ActTierShell.module.css`
was not touched.

### Flow-block heuristic (documented v1 limitation)
The live flow block is gated by an id-pattern heuristic
`isResourceFlowObjective(id) = /resource-flow|waste|material-flow/i.test(id)`,
because material flows are project-scoped, not objective-scoped. It matches e.g.
homestead `hms-s2-resource-flows`. **Known gap found during live verify:** on a
regenerative_farm project the conceptual waste-vector objective is
`rf-s6-enterprise-integration` ("Enterprise integration & feedback loops", focused
question literally about "waste-to-input loops") -- but `rf-` is the project-type
prefix, NOT "resource-flow", so the heuristic does not match it and the flow block
does not surface there. No false positives either (the `rf-` prefix does not
contain "resource-flow"). Deferred: broaden the gate (e.g. key off the objective's
act-tools or domain rather than an id substring) so it lights on the farm
waste-vector objective too. Flagged to the operator, not changed without approval.

> **UPDATE 2026-06-02 (commit `4e4b9b34`): this gap is CLOSED.** The gate was
> broadened to an OR over three signals -- the original id pattern, the resolved
> act-tools (the `compost` material-cycling tool, which the s6-integration default
> toolset carries across all project types), and a tight focused-question/title
> prose match. The farm objective `rf-s6-enterprise-integration` now lights via
> the compost tool. See [[2026-06-02-atlas-act-rail-flow-gate-broaden]].

## Verification

- **Typecheck:** `apps/web` exit 0 (background `bfotuljqh`); shared package exit 0.
- **Vitest (bounded, `--pool=forks`):** `ActTierObjectiveRail.test.tsx` 6/6 green
  (+4 new: stratum-header when none selected; header REPLACES on select with
  Decision progress + Tools markers and the stratum summary gone; live flow count
  for a `hms-s2-resource-flows` objective with 3 seeded `materialFlows` -- asserts
  "Material flows: 2" (project-scoped, the 3rd belongs to another project) and
  "1 closed-loop").
- **Live (localhost :5200 + :3001 native pg, real `preview_eval` evidence):** on
  "Halton Hills" (regenerative_farm) -- with NO objective selected the S4 header
  showed "STRATUM S4 | Foundation Decisions | Zones, sectors...". Selecting
  "Project direction" REPLACED the header: eyebrow "STRATUM S4 . FOUNDATION
  DECISIONS", title "Project direction", focused question, "DECISION PROGRESS 0/6
  done", completion gate, "ACT HANDOFF Project Direction Brief" (Tools absent --
  that objective resolves to zero act tools, so the conditional block correctly did
  not render). Switching the spine to S6 cleared the selection and the header
  REVERTED to the S6 stratum header -- proving the revert path. Selecting S6
  "Enterprise integration & feedback loops" rendered the Tools block with exactly
  6 chips (Crop areas, Orchards, Paddocks, Garden beds, Compost, Log harvest) +
  "+1 more" for its 7th tool -- proving the cap. **The live flow block was NOT
  demonstrable on this farm project** because no objective id matches the
  heuristic (see the known gap above); it is proven by the unit test with
  `hms-s2-resource-flows` + seeded flows. Reported honestly, not fabricated.

## Commit shape

Explicit-path commit (`git add --` the three files only:
`ActTierObjectiveRail.tsx`, the new `ActTierObjectiveRail.module.css`,
`__tests__/ActTierObjectiveRail.test.tsx`), guarded with `Compare-Object`
(intended == staged, empty diff). Heavy foreign WIP in the working tree
(financial files, `DesignMap`/`DiagnoseMap`/`OperateMap`, many
`plan/strata/*.module.css`, `ActTierShell.module.css`, `ActTierObjectiveCard.tsx`,
`graphify-out/`, scratch `_*.txt`) left untouched -- never `git add -A`
([[feedback-no-deletion]]). Commit-only (not pushed). ASCII-only; JS apostrophes
double-quoted. The commit-message temp file tripped the Remove-Item path guard on
the literal "resource-flow" string, so the message was written via the editor and
committed with `git commit -F`.

## State after

Selecting an objective in the Act tier-shell rail now surfaces its short title +
focused question + decision progress + completion gate + act handoff/tools (and,
for matching resource-flow objectives, a live closed-loop flow count) in place of
the static stratum header, reverting cleanly when deselected. ADR not warranted
(contained UI enrichment, mechanism documented here and on [[entities/act-tier-shell]]).
