# 2026-06-02 -- Dedicated greywater / flow-connector Act tool + FLOW_TOOL_IDS

**Branch:** `feat/atlas-permaculture`
**Commit:** `905318ca` -- dedicated greywater/flow-connector Act tool + FLOW_TOOL_IDS
(11 files).
**Builds on** [[2026-06-02-atlas-act-rail-flow-gate-maximalist]] (`35e8cd3c`, the
maximalist FLOW_TOOL_IDS set + greywater prose) and
[[2026-06-02-atlas-act-rail-objective-header]] (`c7f02afc`, the original flow block).
Closes the deferred idea recorded at the foot of the maximalist log entry.

## Context

The maximalist flow-block gate (task #46) made the Act tier-shell's live
closed-loop material-flow block light on a 17-id source/sink set + greywater prose,
but explicitly noted the gap: **no Act-catalogue tool actually authors a flow.**
`closedLoopStore` already carried a `greywater` MaterialKind and Plan had
`FlowConnectorTool` / `WasteVectorListView`, but neither was reachable from the Act
tools rail -- so a steward on an Act objective could not record a greywater /
closed-loop flow without leaving for the Plan canvas. This task adds a dedicated,
FUNCTIONAL Act tool that captures a source->sink material flow (default materialKind
`greywater`), attaches it to the water + integration objectives, and folds its id
into `FLOW_TOOL_IDS` as the single strongest gate signal.

**Why list-capture, not a map connector (expert decision -- permaculture + SaaS).**
A flow is a source->sink relationship + a material kind; the *spatial* connector
already lives in Plan. Reusing `FlowConnectorTool` from Act was not viable: it drives
its edit form through `useInlineFormStore` / `InlineFeaturePopover`, which the Act
tier-shell deliberately does NOT mount (and mounting it would change behaviour for
the ~20 existing Act map tools that share that singleton). The disciplined, isolated
choice is an **Act-owned list-capture popover** mirroring the established
`actAsBuiltPopoverStore` / `ActAsBuiltPopover` pattern, reusing
`closedLoopStore.addMaterialFlow({ origin: 'list', ... })` + `useFlowEndpointOptions`
-- exactly what `WasteVectorListView` already does in Plan.

Amanah gate: land-stewardship planning UI; no riba/gharar. Clean.

## What shipped (11 files)

**Create**
- `actFlowPopoverStore.ts` -- minimal Act-scoped zustand singleton
  (`open` / `openPopover` / `close`), intentionally distinct from `useInlineFormStore`.
- `ActFlowConnectorPopover.tsx` (+ `.module.css`) -- a `Modal`-hosted capture form:
  Label, Material kind (`<select>` from `MATERIAL_KIND_CONFIG`, default `greywater`),
  From / To (each a `<select>` of `useFlowEndpointOptions` + a `__free__` free-text
  fallback), Notes. Save builds a `MaterialFlow` (origin `list`, color from config,
  null source/sink ids on free text -> `sourceLabel`/`sinkLabel`), calls
  `addMaterialFlow`, and closes. Save disabled until a label + both endpoints filled.
- `ActFlowConnectorPopover.test.tsx` (happy-dom, 3 tests) -- default greywater; Save
  enable/disable; Save calls `addMaterialFlow` once with the expected shape + closes.

**Modify**
- `actToolCatalog.ts` -- new arm kind `{ kind: 'flow' }`; `flow-connector` tool
  (label "Material flow", `Waypoints` icon, category `water`).
- `ActTierShell.tsx` -- `handleActivateTool` flow branch
  (`useActFlowPopoverStore.getState().openPopover()`); popover mount.
- `ActLayout.tsx` -- parity mount in the legacy StageShell path.
- `ActTierCategorizedToolsRail.tsx` -- `isToolArmed` handles the new arm kind
  (returns false; the tool opens a Modal, no persistent armed highlight). Real type
  fix: the new union member broke `arm.quickLogId` narrowing.
- `objectiveActTools.ts` (shared) -- `flow-connector` attached to
  `s6-integration-design` (default) + `s5-water-infrastructure` (override).
- `ActTierObjectiveRail.tsx` -- `flow-connector` added to `FLOW_TOOL_IDS` (now 18
  ids) as the single dedicated flow-authoring tool + strongest gate signal.
- `ActTierObjectiveRail.test.tsx` -- isolating case (sentinel objective id
  `test-flow-only` resolving to `['flow-connector']` via a partial `@ogden/shared`
  mock, neutral prose, non-matching id) proving the tool ALONE lights the flow block.

## Verification

- **Typecheck:** `apps/web` exit 0; shared package exit 0 (catches the new union arm
  + the `isToolArmed` narrowing fix).
- **Vitest (bounded, `--pool=forks --testTimeout=20000`):** 19/19 green --
  `actToolCoverage` (5), `ActFlowConnectorPopover` (3), `ActTierObjectiveRail` (11).
- **Live (localhost :5200 + native pg per [[project_two_postgres_5432]], real
  `preview_eval` evidence):** on the MTC (Moontrance Creek, silvopasture) project's
  Act tier-shell, S6 Integration Design -> "Whole-farm biodiversity monitoring"
  objective: the **Water & Hydrology** rail category shows the **Material flow** tile;
  clicking it opens the "Record material flow" Modal with materialKind defaulting to
  **Greywater**. Filling Label + free-text From ("Kitchen sink") / To ("Orchard
  swale") and clicking "Add flow" appended a `MaterialFlow` to
  `localStorage['ogden-closed-loop']` (origin `list`, color `#5aa0a8`, materialKind
  `greywater`, projectId `mtc`, null ids + free-text labels), the popover closed, and
  the rail's live block updated to "Material flows: 1 (0 closed-loop)" -- 0
  closed-loop correct because free-text endpoints carry null ids. Dev-injected flow
  removed afterwards (`materialFlows` length 0 confirmed). Reported honestly, not
  fabricated.

## Commit shape

Explicit-path commit (`git add --` the 11 files only), guarded with `Compare-Object`
(intended == staged, empty diff) run atomically with `git commit -F` in one shell
invocation. Heavy foreign WIP left untouched -- never `git add -A`. Commit-only (not
pushed). ASCII-only; JS/JSON apostrophes double-quoted; commit message written to the
system temp dir and committed with `git commit -F`.

## State after

The Act tools rail now has a dedicated, functional greywater / closed-loop flow
authoring tool, reachable directly from water + integration objectives, that writes
real `MaterialFlow` records to `closedLoopStore` -- the strongest signal for the
flow-block gate and the close of the maximalist-set deferred idea. The maximalist
17-id source/sink set is retained for discoverability (now 18 with `flow-connector`);
narrowing it is a possible future cleanup now that a real authoring tool exists. ADR
not warranted (contained UI feature + a recorded expert interaction-model decision;
mechanism documented here and on [[entities/act-tier-shell]]).
