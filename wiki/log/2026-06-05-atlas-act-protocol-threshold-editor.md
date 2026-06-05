# 2026-06-05 -- Act Protocols: per-protocol threshold editor

**Branch.** `feat/atlas-permaculture` (clean explicit-path commit `b79f8f50`,
7 files +759/-7; **not pushed**). Lets a steward adjust, from the Act protocol
detail pane, the bracketed `[token]` threshold values embedded in a standing
protocol's trigger condition (e.g. `[reserve threshold]` in "IF stored water
falls below [reserve threshold]").

**Why.** `useProtocolLibrary` derived its substitution `outputs` solely from the
legacy `s6-yield-flows` `parameterGroup` (5 tokens), whose names **never
intersect** the ~32 distinct tokens in the resolved per-type Act catalogues
(`resolveProjectProtocols` -> `universal.ts` + per-type files). So every Act
condition rendered a verbatim, uneditable bracket -- and widening the
parameterGroup is blocked by the `protocolOutputs.test.ts` orphan guard.
Triggering is manual (no eval engine; `autoFill.ts` only string-splits), so the
ask is to make the **value substituted into the human-read condition** editable.

**Operator decisions (AskUserQuestion).** Value scope = **per-protocol**
(override keyed `(projectId, templateId, token)`); coverage = **full now** (a
small additive persisted slice so ANY `[token]` in ANY active protocol is
editable); edit UX = **inline live-persist** in the detail pane.

**Store (additive, v5->v6).** `planStratumStore` gains
`protocolTokenOverridesByProject` + `setProtocolTokenOverride` /
`clearProtocolTokenOverrides` + a stable frozen-empty
`selectProjectProtocolOverrides`. Migration bumps `version: 5 -> 6` with an
additive backfill (`?? {}`); `partialize` + `cloneForProject` extended.
`discardObjectivesProgress` (objective-keyed) does NOT clear the template-keyed
slice -- inert leftovers acceptable for v1. No record/condition shape change ->
legacy S6 path, Plan ParameterGroup, shared catalogues, and the orphan guard
untouched.

**Hook.** `useProtocolLibrary` returns a memoised
`outputsFor(templateId) = { ...outputs, ...(overrides[templateId] ?? {}) }`
(deps `[outputs, protocolOverrides]`); base `outputs` kept for back-compat, and a
template with no overrides returns the identical base ref (Plan columns
byte-unaffected).

**Editor + wiring.** New `ActProtocolThresholdEditor.tsx` exports a pure
`extractConditionTokens(condition)` (deduped, first-seen via
`renderConditionSegments(condition, {})`); returns `null` with no tokens, else
one input per token (`act-threshold-input-${token}`, per-keystroke
`setProtocolTokenOverride`, gold filled border) under an "Adjust thresholds"
header + conditional `Reset` (`act-threshold-reset`). Subscribes inline via
`s.protocolTokenOverridesByProject[pid]?.[tid]` (indexes, never derives -> no
Zustand v5 loop). `ActProtocolDetailPane` destructures `outputsFor`, renders the
card via `outputsFor(template.id)` and mounts the editor between the card and the
activation-control row; `ProtocolLayerPanel` list cards likewise use
`outputsFor(t.id)`.

**Verified.** web `tsc` EXIT 0 (8GB heap) -- caught + fixed a real
`template.title` -> `template.name` (the `StandardProtocolTemplate` type exposes
`name`, not `title`). Bounded `--pool=forks`
([[feedback-vitest-bounded-runs]]) 19/19: new
`planStratumStore.protocolOverrides` (12: set/clear round-trip, per-(project,
template) isolation, empty-string verbatim, clear no-op same-ref, stable
frozen-empty selector, no-touch-other-slices, clone deep-copy, v5->v6 migration
backfill+preserve, v5-blob rehydrate) + new `ActProtocolThresholdEditor` (7, via
the FULL `ActProtocolDetailPane`: 3 `extractConditionTokens` units,
one-input-per-token, no-editor-for-no-token, typing writes override + card
substitutes live, Reset clears + card returns to bracket + reset control hides).
**Live DOM proof + screenshot** on MTC S5 `u-s5-water-store-low`: selecting the
card mounted the editor; typing "20% of capacity" into
`act-threshold-input-reserve threshold` substituted live into the card IF
("stored water falls below 20% of capacity", gold) -- screenshot confirmed; Reset
returned the verbatim `[reserve threshold]` and hid the control; store net-zero.
The no-token `u-s3-flow-anomaly-reassess` mounted the pane but NO editor
([[project-screenshot-hang]]).

**Discipline.** Explicit-pathspec commit of exactly 7 files via `git commit -F`;
foreign WIP (`ActOpsDashboard.tsx`, `ActTierShell.tsx`, `ActTierWeatherPanel.tsx`
+ `.module.css`, `apps/web/_tsc_review.txt`, uncommitted wiki files) left
unstaged ([[feedback-commit-immediately-on-rebased-branches]]); fetched +
confirmed 0 behind / no divergence; **not pushed** ([[project-branch-rebase]]);
ASCII copy; Amanah -- threshold editing is the steward's own approved bound, no
riba/gharar/`bay' ma laysa 'indak`, verbatim `scopeNotes` untouched
([[fiqh-csra-erased-2026-05-04]]).

ADR [[decisions/2026-06-05-atlas-act-protocol-threshold-editor]]; entity
[[entities/act-tier-shell]].
