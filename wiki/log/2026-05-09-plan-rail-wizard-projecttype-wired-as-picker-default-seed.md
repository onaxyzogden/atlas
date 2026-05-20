# 2026-05-09 — Plan rail: wizard `projectType` wired as picker default seed


Closed the first follow-up listed under [yesterday's project-type checklist ADR](decisions/2026-05-09-atlas-plan-project-type-checklist.md) "Out of scope" section. [PlanProjectTypeCard.tsx](apps/web/src/v3/plan/PlanProjectTypeCard.tsx) now reads `project.projectType` from `useProjectStore` and uses it as the picker's default seed when the steward has not yet interacted with the Plan-stage picker for that project. Precedence rule: `effectiveType = hasInteracted ? storedType : wizardSeed`, where `hasInteracted = byProject[projectId] !== undefined` in [planProjectTypeChecklistStore](apps/web/src/store/planProjectTypeChecklistStore.ts) — presence-of-entry is the single source of truth for "the steward has touched this in Plan", independent of whether the stored selection is a type or `null`. After any explicit interaction the stored value wins, including an explicit clear back to "Select a project type…" (stored `selectedType: null`) — the wizard default does not re-seed. First-toggle lock-in: if the steward ticks a checkbox while the picker is showing the wizard seed (no entry yet), `handleToggle` writes `setSelectedType(projectId, effectiveType)` *before* the toggle so the seed is promoted to an explicit selection in the same gesture; without it the toggle would create the entry with `selectedType: null` from the store's `EMPTY_PROJECT` default and visually clear the picker. New helper `asPlanProjectTypeKey(value)` guards against unrecognised wizard values (e.g. gated `moontrance` or future codes the Plan card hasn't shipped templates for).

### Verification

- Cleared `ogden-atlas-plan-project-type-checklist` localStorage + reloaded → picker correctly defaulted to the project's wizard `projectType` (`'homestead'`), Homestead bullets rendered, first item "Anchor Z0/Z1 (house + kitchen garden) on a sun-facing aspect with year-round solar access."
- Ticked checkbox index 2 → store entry created `{ d515a80b-...: { selectedType: 'homestead', checks: { homestead: [2] } } }` confirming first-toggle lock-in (selectedType was promoted from null to 'homestead' in the same gesture).
- Picked "Select a project type…" → stored `selectedType: null`, picker cleared, placeholder rendered ("Pick a template to see project-type-specific design prompts."), Homestead checks retained but hidden — explicit user choice beats wizard seed on subsequent renders.

### Deferred

- Cross-checking checklist progress against module progress (e.g. "you've ticked Conservation #2 'wildlife corridors' but Zone & Circulation has no Z5 polygon").
- Per-item linking to the module that satisfies the prompt (click → jump to that module's slide-up).
- Sibling unstaged edits in `apps/web/src/v3/act/ActTools.tsx`, `apps/web/src/v3/act/draw/ActDrawHost.tsx`, `apps/web/src/v3/observe/components/measure/useMapToolStore.ts`, `apps/web/src/v3/plan/layers/PlanDataLayers.tsx`, plus untracked `apps/web/src/store/livestockMoveLogStore.ts` and `apps/web/src/v3/act/draw/tools/LivestockMoveTool.tsx` — not from this session, not committed here.

### Recommended next session

- Cross-check checklist progress against module progress (the second deferred item from the original ADR), or pick up the unrelated WIP files listed in Deferred.
