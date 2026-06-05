# ADR: Relocate the protocol threshold editor from Act to Plan

- **Date:** 2026-06-05
- **Status:** Accepted
- **Branch:** `feat/atlas-permaculture` (commit `769074f2`, local-only, not pushed)
- **Entity:** [[entities/act-tier-shell]]
- **Supersedes (placement only):** [[decisions/2026-06-05-atlas-act-protocol-threshold-editor]] (the editor shipped in `b79f8f50`, placed in the Act detail pane)
- **Relates to:** [[decisions/2026-06-04-atlas-act-protocol-stratum-scope-detail]] (the Plan/Act protocol detail surfaces); [[decisions/2026-04-18-milos-grounding-two-axis]] (the protocol condition/token model)

## Context

The per-protocol threshold editor -- the UI that lets a steward set the bracketed
`[token]` values in a standing protocol's trigger condition (e.g.
`[reserve threshold]` in "IF stored water falls below [reserve threshold]") --
was shipped in `b79f8f50` mounted in the **Act** protocol detail pane
(`ActProtocolDetailPane`). The operator corrected the placement:

> "the protocols are supposed to be editable in **Plan** stage, not ACT."

This is a stage-semantics correction, not a feature change. **Plan** is where a
steward *designs* standing protocols (decides the bounds); **Act** *executes*
them (reads the live operating bound during stewardship). So the editing
affordance belongs on the Plan protocol surface, and Act should merely
**display** whatever bounds were set in Plan.

Crucially, the data layer was already stage-agnostic: the
`protocolTokenOverridesByProject` slice + `setProtocolTokenOverride` /
`clearProtocolTokenOverrides` / `selectProjectProtocolOverrides` + the v5->v6
migration + `useProtocolLibrary.outputsFor(templateId)` are keyed per
`(projectId, templateId, token)` and consumed by both Plan and Act. So the
relocation is **UI-only** -- no store, migration (stays v6), or `outputsFor`
change.

## Decision

Two operator decisions (AskUserQuestion this session):

1. **Act behavior = read-only.** Remove the editing UI from Act, but keep
   `outputsFor(template.id)` wired into `ActProtocolDetailPane`'s card so Act
   still renders the IF/THEN with the Plan-configured threshold values
   substituted in (display only). The steward sets bounds in Plan; Act shows the
   live operating bound during execution.
2. **Component handling = rename + move.**
   `act/tier-shell/ActProtocolThresholdEditor.tsx` ->
   `plan/strata/ProtocolThresholdEditor.tsx`; default export
   `ActProtocolThresholdEditor` -> `ProtocolThresholdEditor`; testids
   `act-threshold-*` -> `protocol-threshold-*`; delete the Act test; add a Plan
   test driven through `ProtocolDetailColumn`.

### Changes

- **Move** `ActProtocolThresholdEditor.tsx` -> `plan/strata/ProtocolThresholdEditor.tsx`
  (git recorded it as a rename, 80% similar). Body and the pure
  `extractConditionTokens` export are unchanged; only the import paths
  (`../spine/autoFill.js`, `../spine/tokens.js`, `../../../store/planStratumStore.js`),
  the export name, the testids, and the leading comment (now Plan-framed) change.
- **`ProtocolDetailColumn.tsx`** -- props change from a single shared
  `outputs: Record<string,string>` to `projectId: string` +
  `outputsFor: (templateId) => Record<string,string>`. Each selected protocol's
  card now renders with its own per-protocol overrides
  (`outputs={outputsFor(t.id)}`), and `<ProtocolThresholdEditor projectId
  template={t} />` mounts under each card so the IF/THEN substitutes live as the
  steward types.
- **`PlanStratumShell.tsx`** -- passes `projectId` + `outputsFor` to
  `ProtocolDetailColumn` (was `outputs={protocolLib.outputs}`).
- **`ActProtocolDetailPane.tsx`** -- drops the editor import + mount; **keeps**
  `outputs={outputsFor(template.id)}` on the card (Act now displays Plan-set
  values read-only, with a comment noting the thresholds are edited on the Plan
  surface and shared via the per-project override slice).

## Consequences

- A steward in **Plan** Protocol mode selects a protocol whose condition carries
  `[token]`s, sees an "Adjust thresholds" editor under its card in
  `ProtocolDetailColumn`, types a per-protocol value into each input, and watches
  the card's IF/THEN substitute it live (gold); Reset returns the verbatim
  bracket and hides the control.
- The **Act** detail pane no longer offers the editor but still displays those
  Plan-set values substituted in (read-only).
- The store slice / v6 migration / `outputsFor` are unchanged -- the override a
  steward sets in Plan is the same one Act reads.
- `no-deletion-in-revamps` does **not** apply: this is a directed correction of a
  same-session local commit (`b79f8f50`), explicitly instructed ("not ACT").

## Amanah

Unchanged from the superseded ADR. Editing a numeric/interval threshold is the
steward setting their own approved operating bound -- no riba/gharar/`bay' ma
laysa 'indak` surface. The verbatim `scopeNotes` block stays rendered by
`ProtocolLibraryCard`, outside the editor
([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]).

## Verification

- web `tsc --noEmit` EXIT 0 (8GB heap).
- Bounded `vitest --pool=forks --testTimeout=20000`
  ([[feedback-vitest-bounded-runs]]) **26/26**:
  `planStratumStore.protocolOverrides` (12, unchanged) +
  `ProtocolThresholdEditor` (7, retargeted to `protocol-threshold-*`, driven
  through `ProtocolDetailColumn`) + `ProtocolDetailColumn` (3, updated to the new
  `projectId`/`outputsFor` signature) + `ActProtocolDetailPane` (4, still green --
  Act pane works without the editor, card still substitutes `outputsFor`).
- **Live DOM proof + screenshot** ([[project-screenshot-hang]]) on MTC
  `/v3/project/mtc/plan/stratum/s5-system-design` Protocol mode,
  `u-s5-water-store-low`: selecting the "Water Store Low" row mounted the editor
  under the card; typing "20% of capacity" substituted live into the card IF
  ("stored water falls below 20% of capacity", gold, bracket gone) --
  **screenshot confirmed**; clicking `protocol-threshold-reset` returned the
  verbatim `[reserve threshold]` and hid the control; store left net-zero.
- Commit `769074f2` ("refactor(protocol): relocate threshold editor from Act to
  Plan stage"), 6 files, +112/-92, two renames, explicit pathspec (foreign wiki
  WIP + `_tsc_review.txt` unstaged), **not pushed** ([[project-branch-rebase]]).

## Alternatives considered

- **Keep the editor in Act, add a duplicate in Plan:** rejected -- two editing
  surfaces for one per-project value invites drift and contradicts the
  stage-semantics correction (Plan decides, Act executes).
- **Leave Act editable, just label it "Plan-owned":** rejected -- the operator
  was explicit that editing does not belong in Act at all.
