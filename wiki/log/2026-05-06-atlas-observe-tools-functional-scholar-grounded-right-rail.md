# 2026-05-06 — Atlas OBSERVE tools functional + Scholar-grounded right rail


Closed the OBSERVE-stage spec by making all 16 module-specific left-rail tools
functional end-to-end and replacing the static right-rail checklist with a
Permaculture-Scholar-grounded WHY/HOW/Pitfall card per module.

Scholar consultation: notebook `5aa3dcf3-e1de-44ac-82b8-bad5e94e6c4b`,
conversation `48a34396-...`, turn 1 (six modules × four-part response:
purpose, WHY, HOW 2–3 steps, Pitfall, with citations to Holmgren P1/P2/P4/P7,
Mollison Designer's Manual, OSU PDC).

**What landed:**
- Right rail (`ObserveChecklistAside.tsx`) renders Scholar guidance per module;
  six-card stacked accordion at the OBSERVE landing.
- Seven-namespace consolidation (ADR 2026-04-30) filled in: NEW
  `humanContextStore` (neighbours/households/accessRoads/permacultureZones);
  topography v1→v2 (contours/highPoints/drainageLines); externalForces v1→v2
  (frost hazard + optional polygon geometry); waterSystems v1→v2
  (watercourses); ecology v1→v2 (ecologyZones); swot (optional position).
- Tool activation: `useMapToolStore.MapToolId` widened with 17
  `'observe.<module>.<tool>'` ids; `ObserveTools.tsx` toggle + active-state
  highlight; project-required gate; homestead-required gate for
  `permaculture` zone tool.
- 14 draw-tool components under `apps/web/src/v3/observe/components/draw/`
  delegating to a shared `useMapboxDrawTool` lifecycle hook (~30–90 LOC each);
  switchboard `ObserveDrawHost` mounts the appropriate tool based on
  `activeTool`. Two non-MapboxDraw variants (SunWindWedgeTool,
  PermacultureZoneTool) are popover-form-only because their geometries are
  angular wedges or concentric rings.
- Persistent annotation rendering: NEW `ObserveAnnotationLayers.tsx`
  subscribes to all seven annotation namespaces + soilSamples + homesteadStore,
  builds 8 sources / 11+ layers (Earth-Green palette, module-coded), re-applies
  after every `style.load`. Master toggle `observeAnnotations` added to
  `matrixTogglesStore` v6→v7 + Overlays popover.
- MapLibre GL constraint: `line-dasharray` cannot be a data-driven expression
  — split human-roads / topography-lines / water-lines into per-kind filtered
  layers (footpath/drainage/ephemeral get static dasharray; perennial/contour
  stay solid).

**Verification:** typecheck clean (8 GB heap); preview at
`/v3/project/.../observe/topography` showed 16 enabled tools + 1
homestead-gated, Topography WHY/HOW/Pitfall card in the right rail, active-tool
toggle + popover render confirmed via DOM. Seven persisted localStorage keys
survive a hard reload.

**ADR:** [wiki/decisions/2026-05-06-atlas-observe-tools-functional.md](decisions/2026-05-06-atlas-observe-tools-functional.md)

**Files:** 12 edited, 18 created (humanContextStore + 14 draw tools +
ObserveDrawHost + ObserveAnnotationLayers + ADR).

**Deferred:** edit/delete UX for placed annotations beyond popover-active
session, per-module sub-toggles, project-level annotation export, lucide-style
SVG sprites, PLAN/ACT tool palettes.
