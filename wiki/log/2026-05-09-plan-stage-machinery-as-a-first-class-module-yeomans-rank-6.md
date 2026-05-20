# 2026-05-09 — Plan stage: Machinery as a first-class module (Yeomans rank 6)


Added `machinery` as the 5th right-rail Plan module, slotted between
`structures-subsystems` (rank 5) and `livestock` (rank 6+). Decision
recorded in
[decisions/2026-05-09-atlas-plan-machinery-module.md](decisions/2026-05-09-atlas-plan-machinery-module.md).
`PLAN_MODULES` grows from 10 to 11.

### What shipped

- **Types & palette.** `'machinery'` added to `PlanModule`, `PLAN_MODULES`,
  `PLAN_MODULE_LABEL` ("Machinery"), `PLAN_MODULE_FULL_LABEL`
  ("Machinery & Equipment"), `MODULE_CARDS` (3 sub-cards). Module dot
  `#6a6a6a` added to the shared `planModulePalette.ts`.
- **Right-rail guidance card** in `PlanChecklistAside.tsx`: copy grounded
  in Mollison ch.13 + Holmgren P9 (*Use small and slow solutions*).
- **Three slide-up cards** under `apps/web/src/v3/plan/cards/machinery/`:
  Inventory (CRUD over `machineryInventoryStore`), Access fit (verdicts
  cross-checking widths / turn radii against drawn paths/roads/gates/
  turnarounds), and Housing & fuel (housing assignment + fuel-station
  coverage flag). Wired into `PlanModuleSlideUp.tsx`.
- **Local-persist store** `machineryInventoryStore` (zustand + persist;
  key `ogden-atlas-machinery-inventory-v1`).
- **Four new Vision-Layout canvas elements** under a new `machinery`
  design category in `canvas/elementCatalog.ts`: `machinery-shed`,
  `equipment-yard`, `fuel-station` (`phase: 'buildings'`), and
  `turnaround` (`phase: 'access'`, surfaces in Year-1 phase-1 view).
- **Cross-stage wiring.** Artifact-presence selector now treats
  Structures presence as a proxy for machinery artifacts;
  `planProjectTypeTemplates.ts` adds machinery `relatedWork` entries on
  the affected Regenerative-Farm / Retreat-Center / Educational-Farm
  project-type bullets so the cross-check chip lights and the per-item
  jump chips reach the new module.

### Out of scope (deferred)

- Backend API persistence (local-only in this slice).
- Feature manifest entry in `packages/shared/src/featureManifest.ts`.
- Renaming livestock's `MobileTractorZonesCard` for clarity (separate task).
- Distance-based fuel-station coverage radius math (Phasing & Budgeting).
