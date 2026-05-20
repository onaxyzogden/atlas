# 2026-05-11 — DesignToolRail Draw button wired to useMapToolStore


**Motive.** Follow-up to the 2026-05-10 map-UI consolidation: in
Observe and Plan-Current, `DesignToolRail` was mounted with
`activeKind={null}` so the pencil was permanently disabled. Wire it
to `useMapToolStore` so the rail reflects what `MapToolbar` arms.

**Changes.**

- `ObserveLayout.tsx`: read `activeTool` + `setActiveTool`; pass
  `armedDrawKind` (filtered to `observe.*` prefix) and an
  `onDisarmDraw` that calls `setActiveTool(null)`.
- `PlanLayout.tsx` (current view only — Vision keeps its local
  `activeKind` path): same wiring with `plan.*` prefix filter.
- Measure tools (`distance`, `elevation-*`, `area`, `boundary`,
  `overlays`, `basemap`) are not stage-prefixed, so they don't light
  up the pencil. Intentional.

**Verification.** Typecheck exit 0. DOM probe on `/observe` confirmed
initial pencil state: `disabled=true`, `data-active="false"` (no tool
armed). Wiring follows existing Vision pattern (`activeKind != null
→ drawArmed`) so a click on a draw tool in MapToolbar will flow
through Zustand subscription and re-render the rail.

**Deferred (non-blocking).**

- Act stage doesn't mount the rail at all — separate task to add it,
  then this same `act.*` wiring would apply.
- Rail's Select mode in Observe/Plan-Current is still effectively a
  no-op (no `design-el-*` layers); cursor goes crosshair, click does
  nothing. Either hide Select in non-Vision contexts or wire it to
  Observe/Plan selection stores — separate task.
- Two reverts mid-session (same pattern as 2026-05-10): some external
  process restored ObserveLayout / PlanLayout to their pre-edit state
  after typecheck. Re-applied and committed immediately. Root cause
  not investigated.
