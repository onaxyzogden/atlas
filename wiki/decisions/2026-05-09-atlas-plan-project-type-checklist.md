# Plan rail — Project-Type Template Checklist card

**Date:** 2026-05-09
**Branch:** feat/atlas-permaculture
**Status:** Implemented

## Decision

Add a top-of-rail "Project Type" card to `PlanChecklistAside` that lets
the steward pick one of six project-type templates (Regenerative Farm,
Retreat Center, Homestead, Educational Farm, Conservation,
Multi-Enterprise) and tick through a tailored design-prompt checklist
alongside the universal 10-module guidance cards below.

## Why a separate card, not extra "How" bullets per module

Project-type concerns are cross-module. A retreat center's privacy
buffer touches Zones, Structures, and Phasing all at once; folding it
into any one of those modules buries it. A single rail-top card keeps
type-specific guidance visible without diluting the per-module
permaculture-Scholar voice.

## Why an in-Plan picker, not `project.projectType` from the wizard

The wizard's `project.projectType` is currently consumed only for
labels. Stewards routinely revisit a parcel with a different vision in
mind (e.g. acquired as a homestead, redesigned as an educational
farm). Sourcing the checklist from a Plan-stage picker decouples
"what was on the intake form" from "what design lens am I working
through right now," and avoids a silent dependency between the wizard
and the Plan rail.

## Card semantics

- Single `<select>` of the six user-facing types (the gated
  `moontrance` template is excluded).
- When a type is selected, render its `items: readonly string[]` as
  GuidanceCard-styled checkable bullets. Unselected types render
  "Coming soon — checklist items for {label} are still being drafted."
- Per-type checks scoped per project — switching type does not lose
  progress on the previous type. State persisted via new
  `usePlanProjectTypeChecklistStore` mirroring `planHowChecksStore`'s
  shape (persist key `ogden-atlas-plan-project-type-checklist`,
  version 1).
- Card stays full-saturation regardless of `data-has-active` because
  it is not a module card; the inactive-fade rule keys on
  `.group:not(.groupActive)` and the new card uses its own `.card`
  class.

## Content

All six types now ship populated (six action-prompt items each,
grounded in Yeomans / Mollison / Holmgren). Items are single sentences
in the imperative, sequenced from earliest design move to latest:

- **Regenerative Farm** — cash-crop fit → livestock-pasture ratio →
  keyline access → swale staging → orchard placement → fertility loop.
- **Retreat Center** — guest-vs-service path separation → cabin
  view-shed/sound shielding → quiet-zone Z3-Z4 placement →
  utility-clustered accommodations → arrival sequence → emergency
  egress.
- **Homestead** — Z0/Z1 sun anchor → poultry adjacency → off-grid week
  water budget → orchard within wheelbarrow distance → single
  fertility loop → kitchen-co-located storage.
- **Educational Farm** — visitor arrival funnel → loop teaching path →
  double-fenced animal interaction → graded accessibility → shared
  utility trench → Z4-Z5 reference zone.
- **Conservation** — ecological-asset audit → corridor connection →
  Z4/Z5 sized to keystone home range → structures on disturbed ground
  → invasives transect → indicator-species baseline.
- **Multi-Enterprise** — Yeomans-rank-per-enterprise mapping → shared
  infrastructure design → buffer noise/visitor enterprises →
  capital-deployment sequencing → cross-enterprise yields →
  single-point-of-failure stress test.

## Render

`PlanChecklistAside` mounts `<PlanProjectTypeCard />` once at the top
of the existing scroll column, before the `PLAN_MODULES.map(...)`
block. The card reuses `_shared/components/GuidanceCard.module.css`
class names (`howBlock`, `howList`, `howCheck`, `howCheckDone`,
`howText`, `blockLabel`) for the bullet/check layout so check
strikethrough + dot palette behaviour match the modules below
verbatim.

## Out of scope (follow-ups)

- Wiring `project.projectType` from the wizard into the picker as a
  default seed.
- Cross-checking checklist progress against module progress (e.g.
  "you've ticked Conservation #2 'wildlife corridors' but Zone &
  Circulation has no Z5 polygon").
- Per-item linking to the module that satisfies the prompt (so a
  click jumps to that module's slide-up).

## Files

- Created `apps/web/src/v3/plan/PlanProjectTypeCard.tsx`
- Created `apps/web/src/v3/plan/PlanProjectTypeCard.module.css`
- Created `apps/web/src/v3/plan/data/planProjectTypeTemplates.ts`
- Created `apps/web/src/store/planProjectTypeChecklistStore.ts`
- Edited `apps/web/src/v3/plan/PlanChecklistAside.tsx`
