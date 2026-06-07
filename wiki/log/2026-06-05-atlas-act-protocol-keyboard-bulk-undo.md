# 2026-06-05 -- Act Protocols: verb keyboard radiogroup + bulk-undo toast

**Branch.** `feat/atlas-permaculture` (clean explicit-path commit `ffb82bcf`,
6 files +435/-9; **not pushed**). Closes the two affordances the bulk-suspend/
deactivate slice (`35275a3c`) explicitly deferred: full keyboard operability on
the `[Activate / Suspend / Deactivate]` verb selector, and a one-click Undo for
any just-applied bulk action.

**Operator decisions (AskUserQuestion).** Undo surface = **toast with an Undo
action** (extend the shared `Toast.tsx`, which had no action support); verb a11y
= **upgrade to canonical `role="radiogroup"`/`role="radio"`/`aria-checked`**
(replacing `role="group"`/`aria-pressed`), arrow-key roving mirroring `Tabs.tsx`.

**Toast.** Added `interface ToastAction { label; onClick }`, `action?` on
`ToastItem`, a trailing `action?` arg on `add(type, message, duration?, action?)`
(all existing `toast.*` calls back-compat), and one public helper
`toast.action(type, msg, action, duration=8000)`. The button
(`data-testid="toast-action"`) renders after the message and
**`e.stopPropagation()`**s before `onClick` + `dismiss`, so the outer
click-to-dismiss never double-fires. `useToastStore` exported (additive, test
reset).

**Store.** New `protocolStore.restoreProtocolRecords(projectId,
affectedTemplateIds[], priorRecords[])` -- one uniform reverse primitive in a
single `set`: empty-list no-op, else remove **every** affected id for the project
then re-append `priorRecords`. `affectedTemplateIds` is the **full applied set**
(load-bearing: activate-of-new records are deleted on undo); `priorRecords` is
the pre-mutation snapshot (full shape incl. `deferredUntil`/`lastLoggedAt`),
restoring prior status / re-inserting removed records. No persist bump.

**Panel.** Verb group div -> `role="radiogroup"` + `verbGroupRef` +
`onVerbKeyDown`; each button -> `role="radio"`, `data-verb`, `aria-checked` (was
`aria-pressed`), roving `tabIndex`. `onVerbKeyDown` mirrors `Tabs.tsx`
(ArrowRight/Down `(idx+1)%n`, ArrowLeft/Up `(idx-1+n)%n`, Home/End, Escape exits
select-mode; `preventDefault(); next.focus(); setBulkAction(...)`). `onConfirm`
snapshots `priorRecords` (filter `records` by project + applied ids) **before**
dispatch, then fires `toast.action('success', '{Verbpast} N protocol(s)',
{ label:'Undo', onClick:() => restoreProtocolRecords(projectId, ids,
priorRecords) }, 8000)`. Undo offered for all three verbs. Testids/`BULK_VERBS`
unchanged; Plan rail + default Act rail byte-identical; single-protocol detail
flow untouched.

**Verified.** web `tsc` EXIT 0 (8GB heap); bounded `--pool=forks`
([[feedback-vitest-bounded-runs]]) 24/24 across the three touched suites -- new
`Toast` action-button (3), new `protocolStore.restoreProtocolRecords` (7: activate-
of-new->delete, suspend/activate-of-suspended->prior status, deactivate->full-
shape re-insert, empty no-op, project scoping, idempotent-twice), evolved
`ProtocolLayerPanel.bulk` (14: `aria-pressed`->`aria-checked` + radiogroup role,
5 keyboard cases, 1 undo round-trip). **Live DOM proof** on MTC S6 (8 cards):
ArrowRight moved focus+`aria-checked`+roving `tabIndex` Activate->Suspend and
recomputed `Apply to all (8)`->`(0)`; Activate `Apply to all (8)` -> confirm
`Activate 8` -> 8 records created -> toast `"Activated 8 protocols [Undo]"` ->
clicked Undo -> all 8 deleted, `mtcAfterUndo === mtcBefore` (store net-zero).
`preview_screenshot` skipped -- the dead-API preview was cycling between mounted
and empty (`#root` len 1815 <-> 0); DOM-asserted via `preview_eval` in a single
mount-poll IIFE ([[project-screenshot-hang]]).

**Discipline.** Explicit-pathspec commit of exactly 6 files via `git commit -F`;
foreign WIP (`apps/web/src/lib/apiClient.ts`, `syncManifest.ts`) left unstaged
([[feedback-commit-immediately-on-rebased-branches]]); fetched + confirmed branch
265 ahead / 0 behind upstream; **not pushed** ([[project-branch-rebase]]); ASCII
copy; CSRA untouched ([[fiqh-csra-erased-2026-05-04]]).

ADR [[decisions/2026-06-05-atlas-act-protocol-keyboard-bulk-undo]]; entity
[[entities/act-tier-shell]].
