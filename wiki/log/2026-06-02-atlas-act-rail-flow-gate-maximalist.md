# 2026-06-02 -- Maximalist FLOW_TOOL_IDS + greywater prose for the Act rail flow-block gate

**Branch:** `feat/atlas-permaculture`
**Commit:** `35e8cd3c` -- expand flow-block tool gate to material source/sink set
+ greywater prose (2 files, +144/-14).
**Builds on** [[2026-06-02-atlas-act-rail-flow-gate-broaden]] (`4e4b9b34`, the
three-signal OR) and [[2026-06-02-atlas-act-rail-objective-header]] (`c7f02afc`,
the original flow block).

## Context

In task #45 the flow-block gate `isResourceFlowObjective` (which decides on which
Act tier-shell objectives the live closed-loop material-flow block surfaces) became
an OR over three signals: an id pattern, the resolved act-tools containing the
single `compost` tool, and a tight prose match. The operator then asked, as a
permaculture / biodynamics / SaaS expert review: should tools BEYOND `compost` join
`FLOW_TOOL_IDS`?

**Governing design fact.** The flow block is **project-scoped** --
`flows.filter((f) => f.projectId === projectId)` -- so the count is identical for
every objective in a project; the gate only decides *on which objectives the block
is surfaced*, and it degrades gracefully to "No material flows recorded yet" when
the project has no flows. The gate is therefore a **signal** ("is this objective
about *cycling* a material"), not a material *detector*. That makes a broad set
low-cost: the only downside of breadth is mild ubiquity, not wrong data.

**Operator decisions (AskUserQuestion, this session):**
- **Q1 (gate breadth) = Maximalist.** The operator deliberately overrode my
  recommended "Restrained" (cycling-primitives-only) option, prioritising
  *discoverability* of the closed-loop feature over signal density. Recorded as a
  deliberate product decision, not an oversight.
- **Q2 (greywater prose) = Yes.** Broaden the prose axis to catch greywater /
  water-reuse / rainwater-harvest objectives that resolve to no flow tool.

Amanah gate: land-stewardship planning UI; no riba/gharar. Clean.

## What shipped

`ActTierObjectiveRail.tsx` -- two constants changed; `isResourceFlowObjective` body
UNCHANGED (it already ORs the set + prose).

1. **`FLOW_TOOL_IDS`** expanded from `new Set(['compost'])` to the maximalist
   material source/sink set (17 ids), grouped by material pathway:
   - organic-matter / nutrient cycling: `compost`, `fertility-unit`
   - water sources / sinks / buffers / conveyance: `watercourse`, `spring`,
     `storage`, `swale`, `sink`, `tanks`, `wells`
   - yield sources (production -> harvest material): `crops`, `orchards`, `beds`
   - livestock / manure pathway: `paddocks`, `pasture`, `barns`
   - field-log tools that track material movement: `harvest`, `livestock`
   So water-infrastructure (s5 overrides -> swale/storage/tanks/sink/wells),
   production, livestock, and s6-integration objectives all light the block, not
   just compost-bearing ones.
2. **`FLOW_PROSE_RE`** broadened from
   `/waste-to-input|closed[- ]loop|material flow|feedback loop|nutrient cycl/i`
   to also include `grey[- ]?water|rainwater harvest|water re-?use|water recycl`.
   Terms are scoped (no bare `reuse|recycl`) to avoid over-matching incidental copy.

The gate STILL gates: form-only objectives (e.g. `s1-vision`, which resolves to
purpose-statement / success-criteria / ... form tools, none in the set) with
neutral prose stay dark.

## Verification

- **Typecheck:** `apps/web` exit 0 (with `--max-old-space-size=8192`); shared
  package exit 0.
- **Vitest (bounded, `--pool=forks --testTimeout=20000`):**
  `ActTierObjectiveRail.test.tsx` 10/10 green. +3 new cases:
  1. *maximalist gate* -- an `s5-water-infrastructure` objective (stratum
     `s5-system-design`, neutral prose) lights via a water act-tool with no compost;
     1 seeded closed `water` flow -> "Material flows: 1" + "1 closed-loop".
  2. *greywater prose* -- an `s1-stakeholders` objective (resolves to
     neighbour-pin/steward, NOT in the set) lights purely via a focused question
     naming "greywater reuse".
  3. *stays-dark* -- an `s1-vision` objective (form tools only) does NOT render the
     flow block even with a seeded flow, proving the gate is still a gate under the
     maximalist set.
- **Live (localhost :5200 + native pg per [[project_two_postgres_5432]], real
  `preview_eval` evidence):** on "Halton Hills" (regenerative_farm) the S5 "Water
  harvesting & storage system" objective now renders the flow block with TOOLS chips
  "Swales / Water storage / Tanks / Water lines / Sinks / Wells" -- water source/sink
  tools absent from the old compost-only set -- proving the maximalist water-tool
  signal lights the block live. (The actual gate runs on `focusedQuestion + title`,
  which for this objective matches none of the prose terms, so the lighting is the
  TOOL signal, definitively.) The seeded-COUNT live demo could not be re-captured:
  an UNRELATED foreign-WIP vite HMR break (`src/v3/observe/prototype/components.tsx`
  + `ObserveLensPrototype.tsx` failing to reload -- not my files) blanked the SPA in
  the running dev session. The count path is covered by the green unit tests above.
  Dev-injected `ogden-closed-loop` seed removed afterwards
  (`localStorage.getItem(...) === null` confirmed). Reported honestly, not
  fabricated.

## Commit shape

Explicit-path commit (`git add --` the two files only: `ActTierObjectiveRail.tsx`,
`__tests__/ActTierObjectiveRail.test.tsx`), guarded with `Compare-Object`
(intended == staged, empty diff) run atomically with `git commit -F` in one shell
invocation. Heavy foreign WIP in the working tree left untouched -- never
`git add -A`. Commit-only (not pushed). ASCII-only; JS apostrophes double-quoted;
commit message written to the system temp dir and committed with `git commit -F`.

## State after

The live closed-loop material-flow block now surfaces on any objective resolving to
a material source/sink tool (water / production / livestock / integration) or naming
a greywater / water-reuse concern, in addition to the resource-flow id pattern --
maximising discoverability of the closed-loop feature while still staying dark on
form-only objectives. ADR not warranted (contained UI heuristic tuning + a recorded
operator product decision; mechanism documented here and on
[[entities/act-tier-shell]]).

## Deferred idea (recorded, not in scope)

A dedicated Act-rail flow-connector / greywater / waste-vector tool: the
`closedLoopStore` already has a `greywater` MaterialKind and the canvas has
`WasteVectorTool` / `FlowConnectorTool`, but none expose an Act catalogue id. When
one is added, its id becomes the single strongest flow signal and should join
`FLOW_TOOL_IDS`, at which point the maximalist set could be reconsidered / narrowed.
