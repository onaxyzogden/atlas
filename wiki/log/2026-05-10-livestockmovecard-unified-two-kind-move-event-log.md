# 2026-05-10 — LivestockMoveCard: unified two-kind move-event log


Closes the third and last deferred Phase-3 follow-up. The Act
structure popover writes `livestockMove` events with `structureId`
on `barn` / `animal_shelter`.

**Errata (post-merge audit).** This entry originally claimed
`useLivestockMoveLogStore` had "zero read consumers anywhere in
`apps/web/src/`" — wrong. `RotationScheduleCard.tsx:16, 109–116,
257–289` already imported the store and rendered a per-paddock
"Logged moves" section under each rotation row. The actual gaps
this card closes are: (a) **structure-source** events were truly
invisible — `eventsByPaddock()` is paddockId-keyed and silently
dropped them; (b) no self-service write affordance existed
anywhere (rotation card is read-only); (c) no at-a-glance unified
log across both source kinds plus structures.

Root cause of the framing error: false-negative grep in the
planning agent's first pass; planning trusted it without
spot-verifying `RotationScheduleCard` directly. See the ADR's
*Corrections* section.

New `LivestockMoveCard` (Act Livestock module, second tab between
*Yield log* and *Rotation schedule*) mirrors `MaintenanceLogCard`'s
mixed-source-kind shape: one card, two label resolvers
(`useStructureStore` + `STRUCTURE_TEMPLATES` for structure-source
events; `useLivestockStore.paddocks` for paddock-source), Feature-kind
selector in the form so both kinds can be logged self-service.
Picked unified-card over a structure-only sibling because the
event shape is identical across both kinds (the discriminant is just
"where the destination is") — `MaintenanceLogCard` pattern, not the
`HarvestLogCard` + `StructureYieldCard` split.

No schema or store changes; no persist version bump.

ADR:
[2026-05-10 Act Livestock — LivestockMoveCard](decisions/2026-05-10-atlas-act-livestock-move-card.md).
