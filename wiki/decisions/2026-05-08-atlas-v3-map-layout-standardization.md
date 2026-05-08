# 2026-05-08 — v3 Map Layout Standardization (Observe / Plan / Act parity)

## Context

The v3 atlas has three map-based stages — Observe, Plan, Act — that share `StageShell` but diverged on three affordances:

1. **Map overlays UI.** Observe used a bottom-left popover triggered from `MapToolbar`; Plan and Act had no overlay UI at all.
2. **Right-rail auto-scroll.** Observe scrolled the active module's guidance card into view; Plan and Act did not.
3. **Action-item checkboxes.** Observe rendered each `how[]` step as a checkbox with strikethrough + persistence (`observeHowChecksStore`); Plan and Act rendered the same `how[]` strings as a static bullet list.

Goal: bring Plan and Act to parity with Observe by lifting the shared affordances into reusable primitives and wiring per-stage stores.

## Decision

- **Legend position.** Top-left, **collapsible** panel mounted as a sibling of `<MapToolbar>` inside the `DiagnoseMap` child render. Collapse state persists in localStorage key `atlas.v3.mapOverlaysLegend.collapsed`. Replaces the Observe `MapToolbar` overlays popover (popover code removed; the `'overlays'` `MapToolId` is now unused but left in the type union to avoid churn).
- **Action items.** Reuse the existing `how: string[]` arrays in `PlanChecklistAside` / `ActChecklistAside` as checkbox indices — no content migration, no prose splitting.
- **State stores.** **Per-stage** stores (`planHowChecksStore.ts`, `actHowChecksStore.ts`) cloned verbatim from `observeHowChecksStore.ts` with renamed exports + storage keys (`ogden-atlas-plan-how-checks`, `ogden-atlas-act-how-checks`). Symmetric with the existing one-store-per-stage convention; isolates blast radius.

## Implementation

### New shared primitives (`apps/web/src/v3/_shared/`)

- **`hooks/useAutoScrollToActiveModule.ts`** — extracted from the inline `useEffect` in `ObserveChecklistAside.tsx` (former lines 219–236). Honours `prefers-reduced-motion`; uses `scrollIntoView({ block: 'nearest', behavior })`.
- **`components/MapOverlaysLegend.tsx` + `.module.css`** — top-left absolute-positioned glass panel (`rgba(31, 29, 26, 0.92)`); `<button aria-controls="map-overlays-list" aria-expanded={...}>` header with chevron; reads/writes `useMatrixTogglesStore` for the same six overlays as the legacy popover (topography, sectors, zones, wind, water, observeAnnotations).

### New stores

- **`store/planHowChecksStore.ts`** — `byProject[projectId][module] = number[]` (indices into `how[]`).
- **`store/actHowChecksStore.ts`** — same shape.

Both: zustand `persist` middleware, stable empty-array reference pattern (`EMPTY_CHECKS`) at consumption side to avoid `Object.is` infinite-render loops.

### Modified

- `v3/observe/components/ObserveChecklistAside.tsx` — replaced inline `useEffect` with `useAutoScrollToActiveModule(activeModule, asideRef)` (zero-behaviour-change refactor).
- `v3/observe/components/MapToolbar.tsx` — removed `Layers` icon import, `useMatrixTogglesStore` import, `OverlayDef` interface, `OVERLAYS` constant, the overlays toggle button, and the `{activeTool === 'overlays' && ...}` popover JSX. All draw tools preserved.
- `v3/observe/ObserveLayout.tsx`, `v3/plan/PlanLayout.tsx`, `v3/act/ActLayout.tsx` — mount `<MapOverlaysLegend />` next to `<MapToolbar>` inside the `DiagnoseMap` branch. PlanLayout's `VisionLayoutCanvas` branch is untouched.
- `v3/plan/PlanChecklistAside.tsx` + `v3/act/ActChecklistAside.tsx` — extracted `GuidanceCard` subcomponent (matches Observe pattern); each `how[]` step now renders a `<label>`-wrapped checkbox with `onClick={(e) => e.stopPropagation()}` so toggling does not open the slide-up; `disabled={!projectId}`; `css.howCheckDone` applies strikethrough.
- `v3/plan/PlanChecklistAside.module.css` + `v3/act/ActChecklistAside.module.css` — removed the `.howItem::before` bullet (replaced by the checkbox affordance); cloned `.howCheck`, checkbox states (`:hover`, `:checked`, `:checked::after`, `:disabled`), `.howText`, `.howCheckDone .howText { text-decoration: line-through }` from Observe.

### Bug fix surfaced en route

`ACT_MODULES` in `v3/act/types.ts` declares 6 modules (`build`, `maintain`, `livestock`, `harvest`, `review`, `network`) but the original `ACT_MODULE_GUIDANCE` dict only had 5 entries — `livestock` was missing. Latent because Act's old read-only rail never crashed on a missing key; the new `GuidanceCard` flow surfaced a runtime "Cannot read properties of undefined (reading 'why')". Added a permaculture-grounded livestock entry (Holmgren P8 + Mollison ch.8) and the matching `--group-dot: #e6c34a` CSS dot. Updated JSDoc "5 module guidance cards" → "6 module guidance cards". `noUncheckedIndexedAccess: true` would have caught this at compile time but the existing dict access was unguarded.

## Verification

- **Typecheck:** zero new errors. Pre-existing errors persist in `plan/canvas/elementCatalog.ts` + `plan/canvas/layers/DesignElementLayers.tsx` from the unrelated `feat(atlas-plan): feature-state highlight on selected design element` commit (`e76c966`).
- **Tests:** 586/610 pass; 24 failures across 5 files (`computeScores`, `DiagnoseCategoryDrawer`, `useSiteIntelligenceMetrics`, `V3LifecycleSidebar`, `useAssessment`) all in files this change does not touch — pre-existing.
- **Preview walkthrough:** legend renders top-left on Observe + Plan + Act; collapse state persists across reload; checkbox toggle on Plan applies `text-decoration-line: line-through` and survives navigation away + back; right-rail scrolled to bottom + reload-with-active-module brings the active card into view.

## Deferred / Out of scope

- Unifying `ModuleBar` task-color/sub-segment logic across stages (Observe has it, Plan/Act don't).
- Generalizing `ModuleSlideUp` (Observe uses `DetailNavContext`, Plan/Act use tab nav).
- Extracting a unified `<GuidanceCard>` shared component (currently duplicated identical-shape inside Observe/Plan/Act ChecklistAsides).
- Removing the now-dead `'overlays'` value from `MapToolId` in `MapToolbar`.
- Pre-existing test failures in `V3LifecycleSidebar` etc. — unrelated to this work.
