# 2026-05-11 — BE tools dispatch in Plan 3D canvases


**Why.** Built-Environment tools (e.g. `plan.structures-subsystems.be.cabin`)
worked on the Plan Current 2D canvas but no-op'd on Vision / Phase 1 /
Phase 2 / Terrain3D. Root cause: 3D canvases route armed tools through
`useToolIdToElementKind` → `useDesignElementDrawTool`, whose
`findElementSpec()` lookup short-circuits for ~18 of the 31 BE kinds not
present in `elementCatalog`.

**What.** `useToolIdToElementKind.ts` now returns `null` for the BE prefix
(stops `DesignElementDrawHost` from pointlessly mounting). `VisionLayoutCanvas.tsx`
adds a sibling dispatch that mounts `<BeV2ExistingTool kind state="proposed" />`
whenever `activeTool` matches `plan.structures-subsystems.be.*` — mirrors
`PlanDrawHost`'s Current-canvas dispatch verbatim. The 3D layers
(`DesignElementExtrusionLayer`, `DesignElementScenegraphLayer`) already
default `stateFilter='all'` against `useBuiltEnvironmentStoreV2`, so
proposed placements render under pitch with no extra wiring. Follow-up
section appended to ADR
`wiki/decisions/2026-05-11-atlas-built-environment-rail-unification.md`.

**Open.** User also reports paddock click-to-select not firing in 3D. Added
then removed diagnostic console.debug from `Plan3DSelectionHandler`;
needs hands-on console output to triage (handler mounted? layer present?
features hit?). Deferred to next session.
