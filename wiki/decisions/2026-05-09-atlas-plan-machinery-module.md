# Atlas Plan Stage — Machinery as a First-Class Module

**Date:** 2026-05-09
**Status:** Accepted
**Context:** Atlas (`atlas/` submodule) — Plan stage right-rail modules

---

## Decision

Machinery is added as the 5th right-rail Plan module, slotted between
`structures-subsystems` (rank 5) and `livestock` (rank 6+) in the Yeomans Scale
of Permanence ordering. Form: guidance card with `why` + 4 how-checks, three
slide-up sub-cards (Inventory · Access fit · Housing & fuel), and four new
Vision-Layout canvas elements under a new `machinery` design category.

## Why a separate module — not folded into Structures or Livestock

- **Structures-subsystems** covers buildings as shelter for *people and goods*.
  Machinery has distinct concerns: width-of-access, turn-radius, fuel logistics,
  and the smallest-tool-discipline that protects soil structure. Folding these
  into structures would dilute both modules.
- **Livestock** already has a `MobileTractorZonesCard`, but that card is about
  **animal-housing tractors** (chicken / pig tractors as mobile cells). It is
  *not* equipment. Renaming or repurposing it would lose that distinction. The
  new module is the equipment module.

## Why Yeomans rank 6 (between structures and livestock)

Mollison ch.13 and Holmgren P9 (*Use small and slow solutions*) both argue
that equipment sizing constrains access lines, structures, and fuel logistics
laid down at ranks 4–5. Sizing equipment to parcel acreage and slope before
drawing tracks or sheds avoids retrofits and protects soil structure. Placing
machinery *after* structures (rank 5) and *before* livestock (rank 6) honours
this dependency: tracks and sheds first, then equipment that consumes them,
then animals whose paddocks ride on the access geometry.

## Scope

- New right-rail guidance card, copy grounded in Mollison ch.13 + Holmgren P9.
- Three slide-up cards: Inventory (CRUD), Access fit (verdicts cross-checking
  widths / turn radii against drawn paths/roads/gates/turnarounds), and
  Housing & fuel (housing assignment + fuel-station coverage flag).
- Four new canvas elements in a `machinery` category: `machinery-shed`,
  `equipment-yard`, `fuel-station` (all `phase: 'buildings'`), and
  `turnaround` (`phase: 'access'` so it surfaces in Year-1 phase-1 view).
- Local-persist store `machineryInventoryStore` (zustand + persist; key
  `ogden-atlas-machinery-inventory-v1`).

## Out of scope

- Backend API persistence (local-only in this slice).
- Feature manifest entry in `packages/shared/src/featureManifest.ts`.
- Renaming livestock's `MobileTractorZonesCard` for clarity (separate task).
- Wind-rose / sector buffer integration with machinery siting.
- Equipment-replacement-schedule card in Phasing & Budgeting.
- Distance-based fuel-station coverage radius math (binary check only;
  Phasing & Budgeting is the place for spatial coverage analysis).

## Consequences

- `PLAN_MODULES` grows from 10 to 11 modules. `planHowChecksStore`
  auto-handles the new `'machinery'` key without changes.
- Designers must declare equipment inventory before access-fit verdicts can
  return signal — empty inventory yields warn-level "no widths declared" rows.
- `useDesignElementDrawTool` needs no changes; it reads from `findElementSpec`
  and writes to `designElementsStore` polymorphically over `kind`.
