# 2026-05-09 — Plan rail: cross-check chip on module cards (project-type ↔ module progress)


Closed the second follow-up listed under [yesterday's project-type checklist ADR](decisions/2026-05-09-atlas-plan-project-type-checklist.md) "Out of scope" section. Each module's GuidanceCard in [`PlanChecklistAside`](apps/web/src/v3/plan/PlanChecklistAside.tsx) now renders a small amber "↗ N refs" chip in its header when one or more *ticked* project-type items reference that module but their declared dependencies are unmet. The chip is the reciprocal mirror of the project-type rail above: ticking Homestead item 2 ("Size water storage to a full off-grid week...") with its `relatedWork: [{ module: 'water-management', indexes: [0, 1], requiresArtifacts: true }]` lights "↗ 1 ref" on the Water Management card; closing both gaps (ticking Water how-checks 0 + 1 AND adding any earthwork / storage / waterNode / watercourse for the project) clears the chip. Multi-module items light chips on multiple cards independently — Homestead item 0 ("Anchor Z0/Z1") has `relatedWork` entries for `zone-circulation`, `structures-subsystems`, AND `cross-section-solar`, and ticking it lights all three independently.

### Schema migration

`PLAN_PROJECT_TYPE_TEMPLATES[type].items` changed from `readonly string[]` to `readonly PlanProjectTypeItem[]` where each item is `{ text: string, relatedWork: readonly { module: PlanModule, indexes: readonly number[], requiresArtifacts?: boolean }[] }`. All 36 items (6 types × 6 each) hand-authored with `relatedWork` mappings in [`planProjectTypeTemplates.ts`](apps/web/src/v3/plan/data/planProjectTypeTemplates.ts). Sole consumer change: [`PlanProjectTypeCard.tsx`](apps/web/src/v3/plan/PlanProjectTypeCard.tsx) reads `{item.text}` instead of `{item}`.

### "Either gap" chip rule

A reference is *satisfied* iff **all** declared `indexes` are ticked in [`planHowChecksStore`](apps/web/src/store/planHowChecksStore.ts) for the module **AND** (`!requiresArtifacts` OR the module reports artifact presence). Strictest of the three rule options canvassed (how-checks-only, artifacts-only, either-gap) — picked because ticked items with how-checks satisfied but no map artifact still represent unfinished design work. Implemented in NEW [`useModuleProjectTypeReferences`](apps/web/src/v3/plan/hooks/useModuleProjectTypeReferences.ts) hook which iterates `PLAN_PROJECT_TYPE_KEYS` × ticked-indices, filters each item's `relatedWork` to the current module, and returns `{ referencedBy, openGaps }` per module per project. Chip renders only when `openGaps > 0`.

### Artifact-presence hook + Rules-of-Hooks fix

NEW [`planModuleArtifactPresence.ts`](apps/web/src/v3/plan/data/planModuleArtifactPresence.ts) exports `usePlanModuleArtifactPresence(module, projectId)` returning a boolean. It subscribes to all 9 artifact stores unconditionally (`useWaterSystemsStore`, `useZoneStore`, `usePathStore`, `useStructureStore`, `useLivestockStore`, `useCropStore`, `usePolycultureStore`, `useClosedLoopStore`, `usePhaseStore`) and then switches on `module` to decide which booleans to combine. First draft returned `false` early for the three modules with no map artifact (`dynamic-layering` / `cross-section-solar` / `principle-verification`) *before* calling the hooks — a Rules-of-Hooks violation that surfaced as "Rendered fewer hooks than expected" once an item with mixed dependencies was ticked. Subscribing all stores up-front is the simplest fix; the Zustand selectors are cheap booleans (`s.X.some(x => x.projectId === projectId)`).

### Drive-by: extracted wizard-seed selector

The inline wizard-seed precedence logic from yesterday's follow-up was lifted into NEW [`useEffectivePlanProjectType`](apps/web/src/v3/plan/hooks/useEffectivePlanProjectType.ts) so the same `effectiveType = hasInteracted ? storedType : wizardSeed` rule can be reused by Act stage panels in a future commit; `asPlanProjectTypeKey` moved with it. `PlanProjectTypeCard.tsx` is the only consumer in this commit.

### Shared `headerExtras` slot on `GuidanceCard`

[`GuidanceCard.tsx`](apps/web/src/v3/_shared/components/GuidanceCard.tsx) gained an optional `headerExtras?: ReactNode` prop, rendered next to the module label via a new `.groupHeaderExtras` wrapper (`margin-left: auto` so it right-aligns). This keeps the chip a Plan-stage concern — Observe and Act don't pass `headerExtras` — while reusing the universal card chrome. The chip itself uses `onClick / onKeyDown` stopPropagation in [`PlanChecklistAside.tsx`](apps/web/src/v3/plan/PlanChecklistAside.tsx) so a click on it doesn't trigger the section's module-select / slide-up handler. Chip styling lives in [`PlanChecklistAside.module.css`](apps/web/src/v3/plan/PlanChecklistAside.module.css) (`.refChip` — amber pill, `color-mix(... #d97706 14%, var(--color-bg))` background).

### Verification

Verified at `/v3/project/d515a80b-02fc-489a-b4c1-94da467fa578/plan` (351 House — Atlas Sample, projectType: `homestead`) via DOM probes through `preview_eval` + `preview_snapshot` (screenshot tool was unresponsive — renderer was busy with proxied API failures, noted as a verification limitation rather than success):

- **Single-item, both gaps unmet** → chip "↗ 1 ref" appeared on `water-management` after ticking Homestead item 2 (which only references that module).
- **How-checks ticked, artifact missing** → chip stayed lit after ticking Water how-checks [0, 1] but with no stored earthworks/storage/nodes/watercourses, proving the "either gap" rule.
- **Both gaps closed** → chip cleared after injecting a synthetic earthwork into `useWaterSystemsStore` (then cleaned up via localStorage filter to `earthworksRemaining: 0`).
- **Multi-module item** → ticking Homestead item 0 lit chips independently on `zone-circulation`, `structures-subsystems`, and `cross-section-solar` — each at "↗ 1 ref" — confirming chips count references per-module rather than per-item.

### Deferred

- Per-item linking to the module that satisfies the prompt (click → jump to that module's slide-up) — last item from the original ADR's "Out of scope" list, intentionally left for a future pass.
- 30+ unrelated WIP files in the working tree (api openapi, dashboard router/sidebar, reporting export, store edits, observe dashboards, V3 act/plan layers, schemas tests, untracked capital-partner-summary export, untracked `planVertexEditStore` + inline-edit handlers) — not from this session, not committed here.

### Recommended next session

- Per-item module-jump linking (the last remaining "Out of scope" item from the project-type checklist ADR), or pick up the unrelated WIP listed in Deferred.
