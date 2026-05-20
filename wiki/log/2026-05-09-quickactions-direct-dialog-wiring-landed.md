# 2026-05-09 — QuickActions direct-dialog wiring landed


Executed the design captured in the earlier 2026-05-09 entry below. [QuickActions.tsx](apps/web/src/v3/act/ops/QuickActions.tsx) drops `onSelectModule` / `onOpenSlideUp` props and now accepts `onCreateTask` / `onLogObservation` callbacks; the two buttons just fire them. [ActOpsAside.tsx](apps/web/src/v3/act/ops/ActOpsAside.tsx) owns dialog state via two `useState<boolean>` flags, reads `useV3Project(projectId)` to grab `project.location.boundary`, and mounts [CreateFieldTaskDialog](apps/web/src/v3/components/CreateFieldTaskDialog.tsx) / [LogObservationDialog](apps/web/src/v3/components/LogObservationDialog.tsx) conditionally below the panel stack — same pattern as [OperatePage.tsx:186-202](apps/web/src/v3/pages/OperatePage.tsx). `disabled` on QuickActions extends to `!project` so the dialog never mounts without boundary data; `fallbackCenter` matches OperatePage's `[-78.20, 44.50]`. `ActChecklistAside` / `ActLayout` untouched (their `onSelectModule` / `onOpenSlideUp` props still arrive at `ActOpsAside`, they just no longer reach `QuickActions`). tsc clean (`NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit -p apps/web/tsconfig.json`).

### Verification

- `cd apps/web && tsc --noEmit` → exit 0.
- The Act ops aside no longer flips the active module or opens the slide-up when the steward clicks Create Field Task / Log Observation; the dialog opens directly. Saves write to `useFieldTaskStore` / observation store, which `TodaysPriorities` already reads.

### Deferred
- Module-aware defaults (e.g. pre-fill `category` from active module) — `FieldTaskCategory` enum (`ops/weather/regulation/team/education`) doesn't map onto Act modules cleanly.
- Map-click placement of new tasks/observations from inside the Act rail — out of parity scope.
- Sibling sessions have unstaged edits (`apps/web/src/v3/plan/PlanChecklistAside.tsx`, new `apps/web/src/store/planProjectTypeChecklistStore.ts`, new `apps/web/src/v3/plan/PlanProjectTypeCard*`, new `apps/web/src/v3/plan/data/`) — not from this session, not committed here.

### Recommended next session
- Audit other `*.module.css` for the `.foo.active`-on-compound-selector footgun spotted in V3LifecycleSidebar; convert any matches to `[data-active='true']` attribute selectors.
