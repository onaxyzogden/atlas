# ADR: Act Protocols bulk toolbar -- verb keyboard radiogroup + bulk-undo toast

- **Date:** 2026-06-05
- **Status:** Accepted
- **Branch:** `feat/atlas-permaculture` (commit `ffb82bcf`, local-only, not pushed)
- **Entity:** [[entities/act-tier-shell]]
- **Supersedes/extends:** [[decisions/2026-06-04-atlas-act-protocol-bulk-suspend-deactivate]] (which explicitly deferred "per-verb keyboard affordances / bulk undo")

## Context

The Act tier-shell Protocols bulk toolbar reached three verbs (`[Activate /
Suspend / Deactivate]`) on 2026-06-04 (`35275a3c`). Two gaps were deferred:

1. **Keyboard:** the segmented verb toggle was mouse-only `role="group"` /
   `aria-pressed` buttons -- a keyboard steward could not arrow between verbs,
   and the control was not announced as a single-select group.
2. **Undo:** bulk actions are easy to fat-finger across a whole stratum, and
   `deactivateProtocols` *removes* records outright -- irreversible once applied.
   No recovery affordance existed.

## Decision

Two operator decisions (AskUserQuestion this session):

1. **Undo surface = a toast with an Undo action button.** Extend the shared
   `apps/web/src/components/Toast.tsx` store (no action support previously) with
   an optional action; fire an ~8s undo toast after every bulk apply. (Chosen
   over an inline toolbar undo / snackbar bar -- "best UX option".)
2. **Verb a11y = canonical `role="radiogroup"` / `role="radio"` /
   `aria-checked`** (replacing `role="group"` / `aria-pressed`), with arrow-key
   roving mirroring `apps/web/src/components/ui/Tabs.tsx`. (Chosen over keeping
   `aria-pressed` + adding only key handlers -- "upgrade to radiogroup/radio".)

### Reverse primitive (the crux)

A single store action reverses all three verbs uniformly:

```ts
restoreProtocolRecords: (projectId, affectedTemplateIds, priorRecords) =>
  set((s) => {
    if (affectedTemplateIds.length === 0) return {};       // no-op
    const affected = new Set(affectedTemplateIds);
    const kept = s.records.filter(
      (r) => !(r.projectId === projectId && affected.has(r.templateId)),
    );
    return { records: [...kept, ...priorRecords] };
  }),
```

- `affectedTemplateIds` = the **full applied id set** (NOT just the ids that had
  a prior record). This is load-bearing: it means activate-of-new records get
  *deleted* on undo (they are removed by the filter and have no prior to
  re-append).
- `priorRecords` = the pre-mutation snapshot of the subset that *had* a record,
  captured in `onConfirm` **before** dispatch (full shape incl. `deferredUntil`
  / `lastLoggedAt`). Re-appending them restores prior status (suspend /
  activate-of-suspended) or re-inserts removed records (deactivate).
- No persist version bump -- record shape is unchanged.

### Toast action button

`Toast.tsx` gains `interface ToastAction { label; onClick }`, `action?` on
`ToastItem`, a trailing `action?` arg on `add(...)` (back-compat), and one public
helper `toast.action(type, msg, action, duration=8000)`. The button
(`data-testid="toast-action"`) **`e.stopPropagation()`**s before running
`onClick` then `dismiss(item.id)`, so the outer click-to-dismiss never
double-fires.

### Keyboard handler

`onVerbKeyDown` on the `role="radiogroup"` container mirrors `Tabs.tsx`: query
`button[role="radio"]`, find `document.activeElement`, ArrowRight/Down
`(idx+1)%n`, ArrowLeft/Up `(idx-1+n)%n` (wraps), Home `[0]`, End `[n-1]`,
`Escape` -> `exitSelectMode()`; on match `preventDefault(); next.focus();
setBulkAction(next.dataset.verb)`. Roving `tabIndex` keeps a single tab stop;
`data-verb` carries the value.

## Consequences

- A keyboard-only steward can Tab into the verb selector and move/select
  Activate/Suspend/Deactivate with Arrow/Home/End; the control is announced as a
  radiogroup with the checked verb.
- Any bulk apply is reversible in one click via the toast Undo for ~8s --
  re-creating removed records (deactivate), restoring prior status
  (suspend / activate-of-suspended), or deleting freshly-created records
  (activate-of-new).
- Additive only: Plan rail + default Act rail byte-identical; single-protocol
  detail flow untouched; existing `toast.*` callers untouched; no persist bump.

## Amanah

Undo only ever *removes* an activation or *restores* a disengaged state -- both
safe directions; no Amanah `scopeNotes` surface is touched, no sales/finance
instrument introduced ([[fiqh-csra-erased-2026-05-04]]).

## Verification

- web `tsc --noEmit` EXIT 0 (8GB heap).
- Bounded `vitest --pool=forks --testTimeout=20000` ([[feedback-vitest-bounded-runs]]):
  `Toast` action-button (3), `protocolStore.restoreProtocolRecords` (7),
  `ProtocolLayerPanel.bulk` (14, incl. 5 keyboard + 1 undo round-trip) -- all green.
- Live DOM proof on MTC S6 via `preview_eval` (screenshot skipped, transient
  dead-API unmount cycling -- [[project-screenshot-hang]]): ArrowRight moved
  focus+`aria-checked`+roving `tabIndex` and recomputed the count; Activate
  Apply-all -> Undo toast -> restored, store net-zero.

## Alternatives considered

- **Inline toolbar undo** (a persistent "Undo last" button): rejected -- the
  toast is transient/non-intrusive and the operator chose it.
- **Keep `aria-pressed`, add only key handlers:** rejected -- a multi-button
  single-select control is canonically a radiogroup; `aria-pressed` mis-announces
  it as independent toggles.
- **Per-verb reverse actions** (`undoActivate` / `undoSuspend` / `undoDeactivate`):
  rejected -- one snapshot-restore primitive is simpler and provably uniform.
