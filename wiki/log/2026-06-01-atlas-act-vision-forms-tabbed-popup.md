# 2026-06-01 -- Act tools rail: single tabbed popup for Vision & Setup form tools

**Branch.** `feat/atlas-permaculture` (one explicit-path commit `99f98be8`, 4 files,
+443/-23; rebased out-of-band; **not pushed**, commit-only). UI refactor of the Act
tier-shell categorized tools rail. Amanah gate: land-stewardship planning UI, no
riba / gharar. Clean.

## Problem

In the Act tier-shell bottom rail, the "Vision & Setup" category shows seven
`kind:'form'` tiles (Primary purpose, Success criteria, Labour inventory, Capital
budget, Constraints, Vision elements, Assumptions). Each tile click opened a SEPARATE
single-textarea `VisionFormModal` -- to fill all seven, a steward had to open, save,
close, and re-open seven times. The operator asked for "one popup with tabs for each
of the text input field categories."

Two design decisions confirmed with the operator:
- **Entry point:** keep all seven tiles in the rail; clicking any tile opens the single
  tabbed popup focused on THAT tile's tab (discoverability preserved).
- **Scope:** generic -- clicking ANY `kind:'form'` tool opens a tabbed popup containing
  all the form tools in that SAME category, with the clicked one active. Not hard-coded
  to "Vision & Setup".

## What shipped

A contained refactor, not a rebuild -- reuses the existing `Modal` (focus-trap / Esc /
click-outside / portal-to-body) and compound `Tabs` (`Tabs.List` / `Tabs.Tab` /
`Tabs.Panel`, Arrow/Home/End + full ARIA). **Data model and persistence are UNCHANGED.**

1. `v3/act/tier-shell/VisionFormsTabsModal.tsx` (NEW): a tabbed text-capture popup. One
   `Tabs.Tab` per form tool (label + lucide icon + a small gold "captured" dot when the
   field already has saved text); one `Tabs.Panel` per tool with the `arm.prompt` hint +
   a `<textarea>` bound to a per-tab draft. Ctrl/Cmd+Enter saves the active tab. Footer
   Save (active tab only, disabled when empty) + Close. Saving does NOT close the popup --
   the steward continues to other tabs; Modal's Esc / click-outside / X close it. Per-tab
   `drafts` are keyed by `formId` and seeded from saved values only on the closed->open
   transition (tracked via a `wasOpen` ref), so saving one tab never reseeds/wipes unsaved
   edits in siblings. All hooks before any early return (Rules of Hooks).
2. `v3/act/tier-shell/VisionFormsTabsModal.module.css` (NEW): `.body` / `.prompt` /
   `.hint` / `.textarea` / `.footer` / `.cancelBtn` / `.saveBtn` ported from
   `VisionFormModal.module.css` (BentoBox token vocabulary, gold-brand `#c4a265` accent);
   plus `.tabList` (nowrap + overflow-x auto for seven tabs), `.tabLabel` (icon+text
   inline), `.capturedDot`. Tab chrome itself comes from `Tabs.module.css`.
3. `v3/act/tier-shell/ActTierShell.tsx` (MODIFIED): replaced single-form `openForm` state
   with a form GROUP `{ title, tools, activeFormId }`. The `handleActivateTool`
   `kind:'form'` branch now computes the sibling form tools in the clicked tool's category
   (`resolveActTools(getObjectiveActTools(selectedObjective))` filtered by
   `arm.kind==='form' && category`), resolves the category label via `ACT_TOOL_CATEGORIES`,
   and opens the group focused on the clicked `formId`. `handleFormSave` keeps
   `saveVisionForm` + `setItemComplete` but no longer closes the popup. Rail prop
   `activeFormId={openFormGroup?.activeFormId ?? null}` so the active tab's tile keeps the
   gold-border highlight. `VisionFormModal` import/mount swapped for `VisionFormsTabsModal`.
4. `v3/act/tier-shell/__tests__/VisionFormsTabsModal.test.tsx` (NEW): 6 component tests
   (happy-dom + testing-library; stub icons, no lucide mock needed since Modal/Tabs have no
   lucide dependency) -- one tab per form tool, active tab shows prompt + seeded value,
   clicking a tab calls `onTabChange(formId)`, Save disabled-when-empty/enabled-after-typing,
   Save calls `onSave(activeFormId, trimmedText)` and does NOT call `onClose`, Close calls
   `onClose`.

`VisionFormModal.tsx` remains on disk (no longer mounted) per the no-deletion rule.
`ActTierCategorizedToolsRail.tsx` is unchanged -- its `onActivate(tool)` contract and
`activeFormId` highlight are untouched; the shell does the grouping.

## Verification

- `apps/web` `tsc --noEmit` exit 0 (web + shared typecheck clean).
- Vitest `src/v3/act/tier-shell`: 7 files, 37 tests green -- the 6 new
  `VisionFormsTabsModal` tests plus all 31 pre-existing tier-shell tests (no regression).
- **Verification honesty note.** NOT live-verified on localhost. The component logic --
  tab render, prompt/value seeding, tab-switch callback, save-keeps-open, close -- is
  directly unit-covered by rendering the real component. The `ActTierShell` wiring
  (grouping, mount, rail prop) is typecheck-verified. A live end-to-end round-trip
  (wizard project -> Act tier-shell -> click a Vision tile -> one popup with seven tabs ->
  type + Ctrl+Enter -> persists + checklist item complete) was NOT driven: the full dev
  stack (native Postgres + API + Vite + wizard) is heavyweight and the working tree carries
  extensive uncommitted foreign WIP. Per the standing honesty gate this is recorded as
  unit/typecheck-verified, NOT live-verified -- no fabricated status. A live round-trip
  remains the recommended next-session check.

## Discipline

Explicit-path commit (`git add --` per file), `Compare-Object` confirmed staged ==
intended (4-file set, empty diff). Foreign-WIP never-edit list untouched -- the tree
carries substantial uncommitted foreign WIP (financial files, DesignMap/DiagnoseMap/
OperateMap, graphify-out, many plan/strata CSS modules, phasing-budgeting); none staged.
Committed immediately on the rebased branch, commit-only (no push). ASCII-only; JS/JSON
apostrophes double-quoted. No legacy component deleted (`VisionFormModal.tsx` kept).
