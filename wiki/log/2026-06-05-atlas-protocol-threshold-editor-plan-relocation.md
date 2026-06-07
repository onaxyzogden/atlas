# Log: Relocate protocol threshold editor from Act to Plan (2026-06-05)

**Branch:** `feat/atlas-permaculture` · **Commit:** `769074f2` (local-only, not pushed)
**Entity:** [[entities/act-tier-shell]] · **ADR:** [[decisions/2026-06-05-atlas-protocol-threshold-editor-plan-relocation]]
**Supersedes (placement):** [[decisions/2026-06-05-atlas-act-protocol-threshold-editor]] (`b79f8f50`)

## What

Operator correction: "the protocols are supposed to be editable in **Plan**
stage, not ACT." The per-protocol threshold editor (bracketed `[token]` values
in a standing protocol's trigger condition) shipped in `b79f8f50` was mounted in
the Act detail pane; this slice moved it to the Plan protocol-detail surface and
left Act displaying the Plan-set values read-only.

## Changes

- **Moved** `act/tier-shell/ActProtocolThresholdEditor.tsx` ->
  `plan/strata/ProtocolThresholdEditor.tsx` (git rename, 80%): export
  `ActProtocolThresholdEditor` -> `ProtocolThresholdEditor`; testids
  `act-threshold-*` -> `protocol-threshold-*`; import paths fixed for the Plan
  location; Plan-framed comment. Body + pure `extractConditionTokens` unchanged.
- **`ProtocolDetailColumn.tsx`**: props `outputs` -> `projectId` + `outputsFor`;
  each card renders `outputsFor(t.id)` and mounts `<ProtocolThresholdEditor>`
  under it (live substitution as the steward types).
- **`PlanStratumShell.tsx`**: passes `projectId` + `outputsFor` to the column.
- **`ActProtocolDetailPane.tsx`**: dropped the editor import + mount; kept
  `outputs={outputsFor(template.id)}` on the card (read-only display of Plan-set
  values).
- **Tests**: deleted the Act editor test (renamed into) the new Plan
  `ProtocolThresholdEditor.test.tsx` (7, retargeted to `protocol-threshold-*`,
  driven through `ProtocolDetailColumn`); updated the pre-existing
  `ProtocolDetailColumn.test.tsx` (3) to the new `projectId`/`outputsFor`
  signature -- this committed test had been left on the old `outputs` prop and
  was breaking tsc until fixed.

Store slice (v6), `outputsFor` merge, `useProtocolLibrary`, shared
`ProtocolLibraryCard`/`renderConditionSegments`, and `packages/shared` all
untouched -- the relocation is UI-only.

## Verification

- web `tsc --noEmit` EXIT 0 (8GB heap).
- Bounded `vitest --pool=forks --testTimeout=20000` **26/26**:
  `planStratumStore.protocolOverrides` (12) + `ProtocolThresholdEditor` (7) +
  `ProtocolDetailColumn` (3) + `ActProtocolDetailPane` (4).
- Live DOM proof + **screenshot** on MTC
  `/v3/project/mtc/plan/stratum/s5-system-design` Protocol mode,
  `u-s5-water-store-low`: typing "20% of capacity" substituted live into the
  Plan card IF (gold, bracket gone); `protocol-threshold-reset` returned
  `[reserve threshold]` and hid the control; store left net-zero.

## Commit

`769074f2` "refactor(protocol): relocate threshold editor from Act to Plan
stage" -- 6 files, +112/-92, two renames; explicit pathspec (foreign wiki WIP +
`_tsc_review.txt` unstaged); **not pushed** ([[project-branch-rebase]]).

## Amanah

Unchanged: editing a threshold is the steward's own approved operating bound (no
riba/gharar/`bay' ma laysa 'indak`); verbatim `scopeNotes` still rendered by
`ProtocolLibraryCard`, outside the editor.
