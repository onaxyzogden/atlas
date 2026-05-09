# Plan rail — Project-Type Template Checklist card

**Date:** 2026-05-09
**Branch:** feat/atlas-permaculture
**Status:** Implemented (+ wizard-seed and cross-check follow-ups landed same day)

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

- ~~Wiring `project.projectType` from the wizard into the picker as a
  default seed.~~ — **Closed 2026-05-09** (see Follow-up below).
- ~~Cross-checking checklist progress against module progress (e.g.
  "you've ticked Conservation #2 'wildlife corridors' but Zone &
  Circulation has no Z5 polygon").~~ — **Closed 2026-05-09** (see
  Follow-up — cross-check chip below).
- Per-item linking to the module that satisfies the prompt (so a
  click jumps to that module's slide-up).

## Follow-up — wizard `projectType` wired as default seed (2026-05-09)

The picker now seeds from `project.projectType` (read from
`useProjectStore`) when the steward has not yet interacted with the
Plan-stage picker for that project. After any explicit interaction the
stored value wins, including an explicit clear back to "Select a
project type…" (`selectedType: null`) — the wizard default does not
re-seed.

### Precedence rule

`effectiveType = hasInteracted ? storedType : wizardSeed`, where
`hasInteracted` is `byProject[projectId] !== undefined` in
`planProjectTypeChecklistStore`. This makes presence-of-entry the
single source of truth for "the steward has touched this in Plan",
independent of whether the stored selection is a type or `null`.

### First-toggle lock-in

If the steward ticks a checkbox while the picker is showing the
wizard seed (no entry yet), `handleToggle` writes
`setSelectedType(projectId, effectiveType)` *before* the toggle. This
promotes the wizard seed into an explicit selection in the same gesture,
so a later wizard-side type change won't surprise the steward by
silently swapping their checklist.

Without this lock-in the toggle would create the entry with
`selectedType: null` (from the store's `EMPTY_PROJECT` default) and
only set `checks`, which would visually clear the picker — checks
without a type are unreachable.

### Files (this follow-up)

- Edited `apps/web/src/v3/plan/PlanProjectTypeCard.tsx` (added
  `wizardType` selector + `asPlanProjectTypeKey` guard +
  `effectiveType` derivation + first-toggle lock-in in `handleToggle`).

## Follow-up — cross-check chip on module cards (2026-05-09)

Each module's GuidanceCard now lights a small amber "↗ N refs" chip in its
header when one or more *ticked* project-type items reference that module
but their dependencies are not yet satisfied. The chip is the reciprocal
view of the project-type card's checklist: ticking a project-type item that
depends on (say) `water-management` how-checks 0 + 1 *and* a stored water
artifact lights a single chip on the Water card; closing those gaps clears
the chip. The chip exists only on module cards (not on the Project Type
card itself) — the project-type rail is the source, the module rail is the
mirror.

### `relatedWork` schema migration on `PlanProjectTypeItem`

`PLAN_PROJECT_TYPE_TEMPLATES[type].items` was previously
`readonly string[]`. It is now `readonly PlanProjectTypeItem[]`:

```ts
interface PlanProjectTypeItemRelatedWork {
  module: PlanModule;
  indexes: readonly number[];          // how-check indexes that satisfy this entry
  requiresArtifacts?: boolean;          // ALSO requires a stored map artifact for the module
}
interface PlanProjectTypeItem {
  text: string;
  relatedWork: readonly PlanProjectTypeItemRelatedWork[];
}
```

All 36 items (6 types × 6 each) ship with hand-authored `relatedWork`
arrays. An item can reference multiple modules (e.g. Homestead "Anchor
Z0/Z1 (house + kitchen garden)" depends on `zone-circulation` index 0 +
artifact, `structures-subsystems` artifact, AND `cross-section-solar`
indexes 0 + 1) — each referenced module gets its own chip independently.

`PlanProjectTypeCard.tsx` reads the new shape with `{item.text}` instead of
`{item}`; no other consumer touches `items`.

### "Either gap" chip rule

A reference is *satisfied* iff **all** declared `indexes` are ticked in
`planHowChecksStore` for the module **AND** (`!requiresArtifacts` OR the
module reports artifact presence). The chip stays lit while *either* gap
exists — strictest of the three rule options canvassed
(how-checks-only, artifacts-only, either-gap). Rationale: ticked items that
only have how-checks satisfied still represent unfinished work if the map
side is empty; collapsing the two would let the chip clear before the
design actually exists on the canvas.

The cross-check selector lives in
[`useModuleProjectTypeReferences.ts`](../../apps/web/src/v3/plan/hooks/useModuleProjectTypeReferences.ts)
and returns `{ referencedBy, openGaps }` per module per project. The chip
shows `↗ {openGaps} ref(s)` and renders only when `openGaps > 0`.

### Artifact-presence hook + Rules-of-Hooks fix

[`planModuleArtifactPresence.ts`](../../apps/web/src/v3/plan/data/planModuleArtifactPresence.ts)
exports `usePlanModuleArtifactPresence(module, projectId)` returning
boolean. It subscribes to **all 9 artifact stores unconditionally**
(`useWaterSystemsStore`, `useZoneStore`, `usePathStore`,
`useStructureStore`, `useLivestockStore`, `useCropStore`,
`usePolycultureStore`, `useClosedLoopStore`, `usePhaseStore`) and then
switches on `module` to decide which booleans to return. The first draft
returned `false` early for the three module keys that have no map artifact
(`dynamic-layering` / `cross-section-solar` / `principle-verification`)
*before* calling the hooks — a Rules-of-Hooks violation that surfaced as
"Rendered fewer hooks than expected" once a project-type item with mixed
dependencies was ticked. Subscribing all stores up-front is the simplest
fix (the Zustand selectors are cheap booleans).

### Shared `headerExtras` slot on `GuidanceCard`

[`GuidanceCard.tsx`](../../apps/web/src/v3/_shared/components/GuidanceCard.tsx)
gained an optional `headerExtras?: ReactNode` prop, rendered next to the
module label inside `.groupHeader` via a new `.groupHeaderExtras`
wrapper (`margin-left: auto` so it pushes to the right edge). This keeps
the chip a Plan-stage concern — Observe and Act don't pass it — while
reusing the universal card chrome. Plan's `PlanChecklistAside` is the only
caller for now; the `onClick / onKeyDown` stopPropagation on the chip
prevents card-level module-select / slide-up handlers from firing through
it.

### Drive-by: extracted wizard-seed selector for cross-stage reuse

The wizard-seed precedence logic added in the previous follow-up was inline
in `PlanProjectTypeCard.tsx`. It is now extracted to
[`useEffectivePlanProjectType.ts`](../../apps/web/src/v3/plan/hooks/useEffectivePlanProjectType.ts)
so the same `effectiveType = hasInteracted ? storedType : wizardSeed` rule
can be reused by Act stage Operations Hub panels (which need the project's
effective project-type lens for ranking, but not the first-toggle lock-in
behaviour). `asPlanProjectTypeKey` moved with the hook. `PlanProjectTypeCard`
is the only consumer in this commit; Act consumers land separately.

### Files (this follow-up)

- Created [`apps/web/src/v3/plan/data/planModuleArtifactPresence.ts`](../../apps/web/src/v3/plan/data/planModuleArtifactPresence.ts)
- Created [`apps/web/src/v3/plan/hooks/useModuleProjectTypeReferences.ts`](../../apps/web/src/v3/plan/hooks/useModuleProjectTypeReferences.ts)
- Created [`apps/web/src/v3/plan/hooks/useEffectivePlanProjectType.ts`](../../apps/web/src/v3/plan/hooks/useEffectivePlanProjectType.ts) (drive-by extraction)
- Edited [`apps/web/src/v3/plan/data/planProjectTypeTemplates.ts`](../../apps/web/src/v3/plan/data/planProjectTypeTemplates.ts) — `items: string[]` → `items: PlanProjectTypeItem[]`, all 36 items migrated with `relatedWork`
- Edited [`apps/web/src/v3/plan/PlanProjectTypeCard.tsx`](../../apps/web/src/v3/plan/PlanProjectTypeCard.tsx) — `{item}` → `{item.text}` + switched to the new `useEffectivePlanProjectType` hook
- Edited [`apps/web/src/v3/_shared/components/GuidanceCard.tsx`](../../apps/web/src/v3/_shared/components/GuidanceCard.tsx) — `headerExtras` prop + slot
- Edited [`apps/web/src/v3/_shared/components/GuidanceCard.module.css`](../../apps/web/src/v3/_shared/components/GuidanceCard.module.css) — `.groupHeaderExtras` rule
- Edited [`apps/web/src/v3/plan/PlanChecklistAside.tsx`](../../apps/web/src/v3/plan/PlanChecklistAside.tsx) — chip wiring on each module card
- Edited [`apps/web/src/v3/plan/PlanChecklistAside.module.css`](../../apps/web/src/v3/plan/PlanChecklistAside.module.css) — `.refChip` amber pill style

## Files

- Created `apps/web/src/v3/plan/PlanProjectTypeCard.tsx`
- Created `apps/web/src/v3/plan/PlanProjectTypeCard.module.css`
- Created `apps/web/src/v3/plan/data/planProjectTypeTemplates.ts`
- Created `apps/web/src/store/planProjectTypeChecklistStore.ts`
- Edited `apps/web/src/v3/plan/PlanChecklistAside.tsx`
