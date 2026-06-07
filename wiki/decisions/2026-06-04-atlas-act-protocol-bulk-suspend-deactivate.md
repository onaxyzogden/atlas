# ADR: Act tier-shell Protocols — bulk suspend / deactivate verbs

**Date:** 2026-06-04
**Status:** accepted
**Project:** Atlas / OLOS · branch `feat/atlas-permaculture`
**Commit:** `35275a3c` (6 files, +453/-67, local-only, not pushed)
**Related:** [[entities/act-tier-shell]] · [[decisions/2026-06-04-atlas-act-protocol-url-persist-bulk-activate]] · [[decisions/2026-06-04-atlas-act-protocol-stratum-scope-detail]] · [[fiqh-csra-erased-2026-05-04]] · [[feedback-csa-in-catalogues]]

## Context

The bulk-activation slice ([[decisions/2026-06-04-atlas-act-protocol-url-persist-bulk-activate]], commit `2f2012a0`) gave the Act Protocols rail a select-mode toolbar that only **activated** ("Activate all (N)" / "Activate selected (M)"). The single-protocol detail pane already supported deactivate + suspend (`protocolStore.deactivateProtocol` removes the record; `suspendProtocol` sets status `'suspended'`), but there was no bulk path for them. That slice's own "Deferred" note flagged bulk suspend/deactivate as the next step. This slice completes the symmetry.

## Operator decisions (this session, AskUserQuestion)

- **Toolbar layout → verb selector + Apply all/selected.** A segmented toggle `[Activate · Suspend · Deactivate]` picks the action; two buttons "Apply to all (N)" / "Apply to selected (M)" compute N/M against that verb's eligibility. Replaces the two activate-specific buttons.
- **Confirmation → all three confirm.** Every bulk action shows the confirmation overlay; the Amanah verbatim-`scopeNotes` block renders for **activate only** (disengaging a protocol carries no fiqh risk).

## Decision

### Store — two batch actions
- `suspendProtocols(projectId, templateIds[])` — one `set()` mapping **existing** matching records to `status:'suspended'`; never creates a record (suspending an unactivated protocol is a no-op, same as the singular `suspendProtocol`).
- `deactivateProtocols(projectId, templateIds[])` — one `set()` filtering out every matching record (batch of the record-removing `deactivateProtocol`).
- Both: empty-list no-op, project-scoped, **no persist version bump** (record shape unchanged).

### Overlay — generalized to a verb
- `ProtocolBulkConfirmOverlay` gains `action?: 'activate'|'suspend'|'deactivate'`, **default `'activate'`** (existing overlay tests pass no prop → stay green). `ACTION_META` keys per-verb title/subtitle/confirm styling: activate green (`C.green`+`CA('green',.16)`), suspend amber (`C.amber`+`CA('amber',.14)`), deactivate danger (`C.red` border+text on `transparent` — `CA` exposes no `red` triplet, so no fill tint).
- The Amanah block is gated `action === 'activate' && flagged.length > 0`. Suspend/deactivate disengage a protocol (the **safe direction**) and carry no fiqh risk → no Amanah surface. Verbatim `scopeNotes` is still rendered, unchanged, before any **activation** ([[feedback-csa-in-catalogues]], [[fiqh-csra-erased-2026-05-04]]).

### Panel — verb selector + per-verb eligibility
- New local `bulkAction` state (default `'activate'`); a `BULK_VERBS` constant drives the segmented toggle (`protocol-bulk-verb-{activate|suspend|deactivate}`, `aria-pressed`, calling `setBulkAction`).
- `eligibleTemplates` memo now keys on the verb over the visible, `filterProtocolGroups`-scoped templates: **activate** = `status !== 'active'` (idempotent; resumes suspended/triggered); **suspend** = `status === 'active' || status === 'triggered'` (existing record, not already suspended); **deactivate** = `status !== undefined` (any existing record). `eligibleIds`/`selectedEligibleCount` recompute off it, so "Apply to selected (M)" updates when the verb changes.
- The two activate buttons were renamed to `protocol-bulk-apply-all` ("Apply to all (N)") / `protocol-bulk-apply-selected` ("Apply to selected (M)"). `beginBulk(ids)` is unchanged (sets `pending = eligible ∩ ids`, opens overlay). The overlay mount passes `action={bulkAction}`; `onConfirm` dispatches `activateProtocols` / `suspendProtocols` / `deactivateProtocols` by verb, then exits select-mode.
- Card select-mode wiring unchanged (a card is just "selected"; the verb decides the effect). `bulkEnabled` gate keeps Plan rail + default Act rail byte-identical.

## Consequences

- **Positive:** A steward can suspend or deactivate a whole stratum's protocols in one gesture, with the verb's eligibility surfaced live in the N/M counts; each routes through the confirmation overlay. Additive — overlay `action` defaults to `'activate'`, Plan + default Act rails + single-detail flow unchanged; only my own bulk testids/tests evolved.
- **Amanah preserved:** verbatim `scopeNotes` still surfaces before any activation; the disengaging verbs correctly omit it; nothing reworded.
- **No persist bump:** record shape unchanged; persisted `ogden-protocols` state stays compatible.

## Verification

web `tsc` EXIT 0 (8GB heap); bounded `--pool=forks --testTimeout=20000` 76/76 — new `protocolStore.bulkSuspendDeactivate` (9: suspend/deactivate batches + empty/scoping/no-op-on-nonexistent), extended `ProtocolBulkConfirmOverlay` (6: Amanah absent for suspend/deactivate even when `flagged` non-empty; present for explicit activate), evolved `ProtocolLayerPanel.bulk` (8: new testids + suspend/deactivate verb flows), plus untouched Plan/Act parity + leaf suites. **Live DOM proof** ([[project-screenshot-hang]]) on MTC S6 (8 cards): verb toggle drove per-verb eligibility (Activate=8 / Suspend=0 / Deactivate=0 with no records), then a full **activate → suspend → deactivate** lifecycle — Apply-all activated 8; Suspend recomputed to 8 and flipped all to `data-protocol-status="suspended"` with **no** Amanah block; Deactivate removed all 8 (status back to `none`); store left net-zero. `preview_screenshot` hung (transient — dead API + open modal); DOM-asserted via `preview_eval` instead.

## Deferred

- No new visual screenshot (preview screenshot hang); `preview_eval` DOM assertions stand in.
- Per-verb keyboard affordances / bulk undo not in scope.
