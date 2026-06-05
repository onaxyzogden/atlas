# Log: Plan protocol list gains a select/deselect-all toggle (2026-06-05)

**Branch:** `feat/atlas-permaculture` - **Commit:** `6cb15db6` (local-only, not pushed)
**Entity:** [[entities/act-tier-shell]] (Plan protocol surface)
**Follows:** [[log/2026-06-05-atlas-protocol-threshold-editor-plan-relocation]] (`769074f2`)

## What

Plan Protocol mode (`planMode === 'protocol'`) renders a center multi-select
list (`ProtocolColumn`) whose rows were toggled one at a time; selecting rows
stacks detail cards in `ProtocolDetailColumn`. There was no bulk affordance on
the Plan side (only the Act rail's "Apply to all"). This slice adds a single
"Select all" / "Deselect all" toggle to the column header so a steward can select
or clear every visible (stratum-scoped) protocol in one click.

## Changes (UI-only)

- **`ProtocolColumn.tsx`** - optional `onToggleAll?: () => void` prop (optional
  keeps the existing presentational tests back-compatible); computes
  `allSelected = templateCount > 0 && groups.every((g) => g.items.every((t) => selected.has(t.id)))`
  locally for the label/aria; the eyebrow header restructured to a
  `space-between` row with a right-aligned button (`protocol-select-all-toggle`,
  `aria-pressed={allSelected}`, label flips "Select all" <-> "Deselect all",
  gold accent + `CA('gold', 0.1)` wash when all selected). Rendered only when
  `onToggleAll && templateCount > 0` (hidden in the empty state).
- **`PlanStratumShell.tsx`** - `visibleProtocolIds` memo
  (`stratumProtocolGroups.flatMap((g) => g.items.map((t) => t.id))`) + a
  functional-updater `toggleAllProtocols` (select all visible, or clear if all
  already selected); wired as `onToggleAll`.

Selection state, `selectedTemplates` (detail stack), `useProtocolLibrary`, the
threshold editor, the store/persist layer, and the Act `ProtocolLayerPanel` are
all untouched - the detail stack updates for free because it derives from
`selectedProtocolIds`.

## Tests

`ProtocolColumn.test.tsx` +4 (now 10): hidden without `onToggleAll`; "Select all"
+ `aria-pressed="false"` fires `onToggleAll` when not all selected; "Deselect all"
+ `aria-pressed="true"` when every visible template is selected; hidden in the
empty state.

## Verification

- web `tsc --noEmit` EXIT 0 (8GB heap).
- Bounded `vitest --pool=forks --testTimeout=20000`
  ([[feedback-vitest-bounded-runs]]) **20/20**: `ProtocolColumn` (10) +
  `ProtocolDetailColumn` (3) + `ProtocolThresholdEditor` (7).
- Live DOM proof + **screenshot** ([[project-screenshot-hang]]) on MTC
  `/v3/project/mtc/plan/stratum/s5-system-design` Protocol mode (6 templates):
  header showed "Select all" (`aria-pressed=false`, 0 selected); clicking it
  marked all 6 rows `data-selected="true"`, stacked all 6 `protocol-template-card`
  in the detail column ("6 selected"), and flipped the button to "Deselect all"
  (`aria-pressed=true`); clicking again returned 0 selected / empty detail stack /
  "Select all". Left net-zero; no console errors.

## Commit

`6cb15db6` "feat(plan): add select/deselect-all toggle to Plan protocol list" -
3 files, +139/-17; explicit-pathspec `git commit -F` (foreign wiki WIP +
`2026-06-04-atlas-act-adopt-and-draw-snapping.md` etc. unstaged); branch 280
ahead / 0 behind, no divergence; **not pushed**
([[project-branch-rebase]], [[feedback-commit-immediately-on-rebased-branches]]).

## Amanah

Pure selection UI - no sales/finance surface, no riba/gharar/`bay' ma laysa
'indak`; verbatim `scopeNotes` still rendered by `ProtocolLibraryCard`, untouched
([[fiqh-csra-erased-2026-05-04]]). No ADR (incremental UI affordance on existing
multi-select machinery, no architectural change).
