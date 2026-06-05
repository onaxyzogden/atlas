# 2026-06-02 -- Broaden the Act rail flow-block gate beyond an id substring

**Branch:** `feat/atlas-permaculture`
**Commit:** `4e4b9b34` -- broaden Act rail flow-block gate beyond id substring
(2 files, +135/-9).
**Closes the known gap** documented in
[[2026-06-02-atlas-act-rail-objective-header]] (the v1 id-substring heuristic).

## Context

In TASK C the live closed-loop material-flow block in `ActTierObjectiveRail`
(the Act tier-shell LEFT rail objective-detail header) was gated by an id-only
heuristic: `isResourceFlowObjective(id) = /resource-flow|waste|material-flow/i
.test(id)`. Live verification surfaced a gap: on a regenerative_farm project the
conceptual waste-vector objective is `rf-s6-enterprise-integration` ("Enterprise
integration & feedback loops", whose focused question is literally about
"waste-to-input loops") -- but `rf-` is the project-type prefix, NOT
"resource-flow", so the heuristic never matched and the flow block did not surface
there. Flagged to the operator; the operator approved the deferred refinement
verbatim: "broaden the flow-block gate".

Amanah gate: land-stewardship planning UI; no riba/gharar. Clean.

## What shipped

`isResourceFlowObjective` is now an OR over three signals, keyed off the
objective's resolved act-tools and prose rather than its id alone. The signature
changed to take the objective plus its resolved tool ids:

1. **id pattern** (unchanged) -- `/resource-flow|waste|material-flow/i.test(id)`.
   Keeps the homestead `hms-s2-resource-flows` objective lit (its stratum-s2
   default toolset has no `compost`, so the id pattern is what catches it).
2. **act-tool signal** -- `FLOW_TOOL_IDS = new Set(['compost'])`; lights when the
   resolved tool ids include `compost`. `compost` (the Recycle-icon
   `observe.built-environment.compost` tool) is the structural closed-loop signal:
   it is resolved for the s6 integration tier default toolset across ALL project
   types, plus soil-improvement and forage-improvement objectives. This is what
   lets the block light on `rf-s6-enterprise-integration` (no per-objective
   override -> falls through to `STRATUM_ACT_TOOLS_DEFAULT['s6-integration-design']`
   which includes `compost`).
3. **prose signal** -- `FLOW_PROSE_RE =
   /waste-to-input|closed[- ]loop|material flow|feedback loop|nutrient cycl/i`
   over `focusedQuestion + title`. Kept narrow to avoid false positives on
   incidental "minimise waste" copy; a safety net for waste-vector objectives that
   carry neither a resource-flow id nor the compost tool.

The call site passes `activeObjective` plus `tools.map((t) => t.id)` (the `tools`
memo was already computed for the tool-chip block, so no extra resolution).

No CSS change; `ActTierObjectiveRail.module.css` untouched. `ActTierShell.module.css`
(foreign-WIP never-edit) untouched. No new dependency on a domain field -- the
`PlanStratumObjective` schema carries none, so the gate keys off id + resolved
act-tools + prose only.

## Verification

- **Typecheck:** `apps/web` exit 0; shared package exit 0 (absolute-path tsc
  invocations).
- **Vitest (bounded, `--pool=forks`):** `ActTierObjectiveRail.test.tsx` 7/7 green
  (+1 new regression: an objective with id `rf-s6-enterprise-integration`, stratum
  `s6-integration-design`, and neutral prose -- which FAILS the old id gate -- lights
  the flow block purely via the `compost` tool from the s6 default toolset; asserts
  "Material flows: 1" + "1 closed-loop" with one seeded closed flow).
- **Live (localhost :5200 + native pg, real `preview_eval` evidence):** on "Halton
  Hills" (regenerative_farm) selecting the S6 "Enterprise integration & feedback
  loops" objective now renders the flow block: header showed the eyebrow + title +
  focused question (...waste-to-input loops...) + "DECISION PROGRESS 0/7 done" +
  completion gate + act handoff + TOOLS chips (Crop areas, Orchards, Paddocks,
  Garden beds, Compost, Log harvest, +1 more) + "No material flows recorded yet"
  with zero flows. After seeding 2 flows (1 closed) into `ogden-closed-loop`:
  "Material flows: 2 (1 closed-loop)". Dev-injected seed removed afterward
  (`localStorage.getItem('ogden-closed-loop') === null` confirmed). Reported
  honestly, not fabricated.

## Commit shape

Explicit-path commit (`git add --` the two files only: `ActTierObjectiveRail.tsx`,
`__tests__/ActTierObjectiveRail.test.tsx`), guarded with `Compare-Object`
(intended == staged, empty diff) run atomically with `git commit` in one shell
invocation. Heavy foreign WIP in the working tree left untouched -- never
`git add -A`. Commit-only (not pushed). ASCII-only; JS apostrophes double-quoted;
commit message written via the editor to the system temp dir and committed with
`git commit -F`.

## State after

The live closed-loop material-flow block now surfaces on resource-flow /
waste-vector objectives across ALL project types -- via id pattern (homestead),
the `compost` act-tool (the s6 integration tier on every project type, plus
soil/forage improvement), or tight prose -- closing the regenerative_farm gap from
the prior session. ADR not warranted (contained UI heuristic refinement, mechanism
documented here and on [[entities/act-tier-shell]]).
