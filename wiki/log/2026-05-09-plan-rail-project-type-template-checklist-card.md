# 2026-05-09 — Plan rail: Project-Type Template Checklist card


Added a top-of-rail "Project Type" card to [`PlanChecklistAside`](apps/web/src/v3/plan/PlanChecklistAside.tsx) that lets the steward pick one of six project-type templates (Regenerative Farm / Retreat Center / Homestead / Educational Farm / Conservation / Multi-Enterprise) and tick through a tailored design-prompt checklist alongside the existing 10 module cards. Skeleton + content shipped together: NEW [`planProjectTypeTemplates.ts`](apps/web/src/v3/plan/data/planProjectTypeTemplates.ts) with `PLAN_PROJECT_TYPE_KEYS`, `PlanProjectTypeKey`, and `PLAN_PROJECT_TYPE_TEMPLATES: Record<PlanProjectTypeKey, { label, color, items: readonly string[] }>` — all six types populated with six action-prompt items each, grounded in Yeomans / Mollison / Holmgren, sequenced from earliest design move to latest. NEW [`planProjectTypeChecklistStore`](apps/web/src/store/planProjectTypeChecklistStore.ts) (persist key `ogden-atlas-plan-project-type-checklist`, version 1) mirrors the [`planHowChecksStore`](apps/web/src/store/planHowChecksStore.ts) shape but per-project state is `{ selectedType, checks: Record<type, number[]> }` so switching type doesn't lose per-type progress. NEW [`PlanProjectTypeCard.tsx`](apps/web/src/v3/plan/PlanProjectTypeCard.tsx) reuses `_shared/components/GuidanceCard.module.css` class names (`howBlock` / `howList` / `howCheck` / `howCheckDone` / `howText` / `blockLabel`) so check strikethrough behaviour matches the modules below verbatim; its own [`PlanProjectTypeCard.module.css`](apps/web/src/v3/plan/PlanProjectTypeCard.module.css) only adds picker styles. Unselected-type empty state copy: "Coming soon — checklist items for {label} are still being drafted." (now redundant since all types populated, but retained for future-added types). Picker is **independent of `project.projectType`** — stewards routinely revisit a parcel with a different vision; sourcing the checklist from a Plan-stage picker decouples intake-form data from "what design lens am I working through right now". `PlanChecklistAside` mounts `<PlanProjectTypeCard />` once at the top of the scroll column, before the `PLAN_MODULES.map(...)` block; the inactive-fade rule keys on `.group:not(.groupActive)` and the new card uses its own `.card` class so it stays full-saturation regardless of `data-has-active`. Preview-confirmed: card mounts above "Dynamic Layering"; picker exposes all 6 types; tick → strikethrough → persists in localStorage; switch type → return → check preserved; no console errors. ADR `2026-05-09-atlas-plan-project-type-checklist.md`.

### Verification

- All six types render six checkboxes each; first-item probe per type confirmed via DOM eval.
- Persistence key `ogden-atlas-plan-project-type-checklist` writes `{ state: { byProject: { [projectId]: { selectedType, checks: { [type]: [indices] } } } } }`.
- Card visible at top of right rail in screenshot (Multi-Enterprise selected).

### Deferred

- Wiring `project.projectType` from the wizard into the picker as a default seed.
- Cross-checking checklist progress against module progress (e.g. "you've ticked Conservation #2 'wildlife corridors' but Zone & Circulation has no Z5 polygon").
- Per-item linking to the module that satisfies the prompt (click → jump to that module's slide-up).
- Sibling unstaged edits in `apps/web/src/v3/act/ActTools.tsx`, `apps/web/src/v3/act/draw/ActDrawHost.tsx`, `apps/web/src/v3/observe/components/measure/useMapToolStore.ts`, `apps/web/src/v3/plan/layers/PlanDataLayers.tsx`, plus untracked `apps/web/src/store/livestockMoveLogStore.ts` and `apps/web/src/v3/act/draw/tools/LivestockMoveTool.tsx` — not from this session, not committed here.

### Recommended next session

- Wire the wizard's `project.projectType` as the picker's default seed when it's set, with the in-Plan picker still able to override.
