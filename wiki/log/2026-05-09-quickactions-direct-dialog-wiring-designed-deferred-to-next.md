# 2026-05-09 — QuickActions direct-dialog wiring (designed, deferred to next session)


Brainstormed the next deferred item from the 2026-05-08 redesign: the Act ops aside's `Create Field Task` / `Log Observation` buttons currently bounce through module selection + slide-up open, which is half a step. Investigation found that both [CreateFieldTaskDialog.tsx](apps/web/src/v3/components/CreateFieldTaskDialog.tsx) and [LogObservationDialog.tsx](apps/web/src/v3/components/LogObservationDialog.tsx) already exist (Phase 6.4) and are wired up in [OperatePage.tsx:186-202](apps/web/src/v3/pages/OperatePage.tsx:186) — they take `{ projectId, boundary, fallbackCenter, onClose }` and write directly to `useFieldTaskStore` (and the observation store). Approved design: pure-dialog approach (Option A) — `QuickActions` swaps `onSelectModule`/`onOpenSlideUp` props for `onCreateTask`/`onLogObservation` callbacks; `ActOpsAside` owns two `useState<boolean>` flags, reads `useV3Project(projectId)` to grab `project.location.boundary`, and mounts the two existing dialogs below the panel stack. No new files, no new stores, no schema changes; mirrors `OperatePage` verbatim. Implementation deferred — no code touched this session beyond reads.

### Deferred
- Implementation of the wiring above (small, mechanical; one component refactor + dialog mount in parent).
- Sibling sessions have unstaged edits in `apps/web/src/v3/act/ActTools.tsx`, `apps/web/src/v3/act/draw/ActDrawHost.tsx`, `apps/web/src/v3/observe/components/measure/useMapToolStore.ts`, `apps/web/src/v3/plan/layers/PlanDataLayers.tsx`, plus untracked `apps/web/src/store/livestockMoveLogStore.ts` and `apps/web/src/v3/act/draw/tools/LivestockMoveTool.tsx` — not from this session, not committed here.

### Recommended next session
- Implement the QuickActions direct-dialog wiring per the design above. After landing, `TodaysPriorities` will pick up newly-created tasks automatically since it already reads `useFieldTaskStore`.
