# 2026-06-02 -- Live closed-loop credit guidance in the flow-connector popover

**Branch:** `feat/atlas-permaculture`
**Commit:** `fb413f41` -- live closed-loop credit guidance in the material-flow
popover (5 files).
**Builds on** [[2026-06-02-atlas-act-flow-connector-tool]] (`905318ca`, the dedicated
greywater / flow-connector Act tool). Closes that entry's recorded next-session
follow-up.

## Context

The flow-connector popover ([[entities/act-tier-shell]]) already showed a STATIC
one-line note at the foot of the form: "Pin BOTH endpoints to mapped features to earn
closed-loop credit; free-text flows still count toward the material-flow total." It
never changed. A steward filling the form got no live signal about whether the flow
they were about to save would actually earn closed-loop credit (the Act rail's
`sourceId && sinkId` count), and the advice was misleading when the project had NO
mapped features -- `useFlowEndpointOptions` returns `[]`, so "pin both endpoints" is
impossible (only free text is available).

This task makes the guidance DYNAMIC: a live credit-status line reflecting the current
From / To selections, prompting toward structured endpoints only when that is actually
possible. Guidance only -- it does NOT block Save; free-text flows remain deliberately
allowed (they count toward "Material flows: N" but not "M closed-loop").

Amanah gate: land-stewardship planning UI; no riba/gharar. Clean.

## What shipped (5 files)

**Create**
- `flowCreditStatus.ts` -- a pure, render-free helper (mirrors `geometryDiff.ts` /
  `applyAsBuiltDiff.ts`): `flowCreditState({ sourceStructured, sinkStructured,
  hasFeatureOptions })` returns one of three states, plus a `FLOW_CREDIT_COPY` map.
  - `earned`      -- both endpoints pinned to structured features.
  - `prompt`      -- not both pinned, but feature options exist (steward could pin).
  - `no-features` -- not both pinned AND no feature options at all (pinning impossible,
                     so the advice adapts instead of nagging to pin).
- `flowCreditStatus.test.ts` (pure, no store/render import, 4 tests) -- all three
  states incl. the one-pinned boundary in both option regimes; copy-exists check.

**Modify**
- `ActFlowConnectorPopover.tsx` -- derive `creditState` from the live `sourceSel` /
  `sinkSel` selections (`isStructured(sel) = sel !== '' && sel !== '__free__'`) and
  `options.length > 0`; replace the static `<p class=note>` with a line driven by
  `creditState` (positive `noteEarned` class when earned, else neutral `note`) carrying
  a `data-credit` attribute. No change to `canSave` / `onSave`.
- `ActFlowConnectorPopover.module.css` -- add `.noteEarned` (non-italic, non-dimmed,
  green positive cue; same metrics as `.note`).
- `ActFlowConnectorPopover.test.tsx` -- +2 tests: with empty stores the guidance shows
  the `no-features` copy (and neither the prompt nor the earned copy); both endpoints
  free text stays non-earned.

The `earned` RENDER path needs seeded endpoint stores (heavy), so it is covered by the
pure `flowCreditStatus.test.ts` rather than the component test -- the standard
split-out documented in the plan.

## Verification

- **Typecheck:** `apps/web` exit 0; shared package exit 0.
- **Vitest (bounded, `--pool=forks --testTimeout=20000`):** 20/20 green --
  `flowCreditStatus` (4), `ActFlowConnectorPopover` (5), `ActTierObjectiveRail` (11).
- **Live (localhost :5200 + native pg per [[project_two_postgres_5432]], real
  `preview_eval` evidence):** on the MTC (Moontrance Creek) Act tier-shell, S6
  Integration Design -> "Enterprise integration & feedback loops" objective, the
  Material flow tile opens the "Record material flow" Modal. The From / To selects
  offer only "Select a feature..." + "Other (type a name)..." (MTC has no mapped
  features, so `useFlowEndpointOptions` returns `[]`), and the guidance paragraph
  renders `data-credit="no-features"` with the no-features copy and the neutral `.note`
  class. Setting both endpoints to free text kept the state `no-features` (never
  earned), confirming the dynamic branch. No flow was saved (`materialFlows` length 0
  confirmed); state left clean. The `earned` state cannot be exercised on MTC (no
  structured features) and is covered by the unit test -- reported honestly, not
  fabricated.

## Commit shape

Explicit-path commit (`git add --` the 5 files only), guarded with `Compare-Object`
(intended == staged, empty diff) run atomically with `git commit -F` in one shell
invocation. Heavy foreign WIP in the working tree left untouched -- never `git add -A`.
Commit-only (not pushed). ASCII-only; JS/JSON apostrophes double-quoted; commit message
written to the system temp dir and committed with `git commit -F`.

## State after

The flow-connector popover now communicates, at author time, why a flow does or does
not count as closed-loop and what (if anything) the steward can do about it -- without
ever blocking the deliberately-allowed free-text path. ADR not warranted (contained UI
enhancement on an already-documented tool; mechanism captured here and on
[[entities/act-tier-shell]]).
