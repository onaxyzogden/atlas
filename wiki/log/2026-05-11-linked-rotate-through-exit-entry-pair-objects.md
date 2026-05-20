# 2026-05-11 — Linked `rotate_through` exit/entry pair objects


**Motive.** The 2026-05-10 livestock-move-event-v3 ADR flagged a
data-fidelity gap: rotations were persisted as one row with both
from/to fields, collapsing two operational acts ("herd left A
Monday", "herd arrived B Wednesday") into one date. The implicit
linkage blocked true per-leg variance and was the last
architectural follow-up on the rotation surface.

**Change.**
- `livestockMoveLogStore` v3→v4: added `linkedEventId?: string` to
  `LivestockMoveEvent`; migration splits every legacy
  `rotate_through` event into two cross-pointing legs
  (`${id}-out` + `${id}-in`); `removeEvent` cascades across pairs;
  new helpers `linkedPartner`, `getPair`, `buildRotatePair`.
- Inline-form-store gained a `visibleWhen?: (values) => boolean`
  predicate on `FieldSpec`; `InlineFeaturePopover` honors it in
  both render and required-field validation.
- Three write paths (`LivestockMoveCard.commit`,
  `ActStructurePopover.actions.startLivestockMoveLog`,
  `LivestockMoveTool`) branch on rotate_through to call
  `buildRotatePair` + `addEvent` twice. All three forms gain an
  optional `+ Different exit date` field (visible only when
  direction is rotate_through; empty → both legs share the entry
  date).
- `RotationScheduleCard.computeRestPairs` drops the legacy
  `direction === 'rotate_through'` clause from its exit predicate
  (after migration, nothing persists with that direction).
- Chain-link glyph (`🔗`) rendered before the direction label on
  logged-moves rows in `LivestockMoveCard` and `RotationScheduleCard`
  (per-paddock block + Structure-moves tail) whenever
  `e.linkedEventId` is set.

**Verification.** `tsc --noEmit` clean. Migration is idempotent via
deterministic suffix ids.

**ADR.** [2026-05-11-atlas-livestock-rotate-linked-pair](decisions/2026-05-11-atlas-livestock-rotate-linked-pair.md).
