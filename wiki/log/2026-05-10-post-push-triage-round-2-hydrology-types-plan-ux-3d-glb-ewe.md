# 2026-05-10 — Post-push triage round 2 (Hydrology types · Plan UX · 3D GLB · EWE export)


Second triage pass of the dirty working tree after the earlier 8-commit
push. Tree mutated repeatedly mid-session as parallel work landed
upstream; adapted by re-reading `git status` before each stage. Seven
thematic commits, all green under
`cd apps/web && NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit`:

- `543d4ee` — HydrologyRightPanel: replace two no-op `buildLive`/`buildMetrics`
  stub functions (whose only purpose was feeding `ReturnType<typeof …>`)
  with named `HydrologyLive` / `HydrologyMetrics` type aliases. Type-only.
- `426d303` — InlineFeaturePopover: outside-click handler skips clicks
  inside `[role="toolbar"][aria-label="Plan selection actions"]` so the
  inline form stays open while the steward reaches for Edit / Delete /
  Clear on the Plan selection floater.
- `197de9d` — PlanTools `*.module.css` mirrors the ObserveTools fix
  (`overflow-x: hidden`, `repeat(3, minmax(0, 1fr))`, `min-width: 0` on
  grid children + tool items, `overflow-wrap: anywhere` on labels).
  ObserveTools also gains the `overflow-x: hidden` guard on the panel.
- `b39b3eb` — `ExportType` enum + `EarthWaterEcologyPayload` zod schema
  in `packages/shared/src/schemas/export.schema.ts`. Schema-only.
- `f6c2f80` — Earth/Water/Ecology PDF template
  (`apps/api/src/services/pdf/templates/earthWaterEcologyReport.ts`,
  registered in `TEMPLATE_REGISTRY`) + dashboard Export button wires up
  the four payload slices (soil samples / water systems / ecology /
  site layers).
- `de71aaa` — Plan 3D GLB renderer thread (deferred from prior session
  when the renderer file was missing — now landed):
    - `DesignElementGlbLayer.tsx` (429 LOC, three.js custom MapLibre
      layer; GLTFLoader; per-spec scale to `heightM`, optional
      `glbRotationDeg` / `glbAnchorOffsetM`).
    - `elementHeights.ts` switches every kind to `mode: 'glb'` pointing
      at `GENERIC_BOX_GLB_URL`.
    - `DesignElementExtrusionLayer.tsx` skips `mode === 'glb'` kinds so
      the two layers don't double-draw; remains mounted as fallback.
    - `VisionLayoutCanvas.tsx` mounts the GLB layer alongside extrusion.
    - `scripts/gen-generic-box-glb.mjs` hand-encodes a unit-cube GLB
      (registered as `pnpm gen:models`) →
      `public/models/structures/_generic_box.glb` + `NOTICE.md`
      attribution ledger.
    - deps: `three ^0.169.0`, `@types/three ^0.169.0`, `lucide-react`
      bumped to `^1.14.0`.
- `da8e82a` — GlbLayer follow-up: guard `noUncheckedIndexedAccess` on
  GeoJSON `Position` access in `polygonCentroid` and `polygonExtentsM`
  (skip undefined ring entries instead of asserting).

### Deferred / not committed
None this round — every dirty thread was either committed or already
authored upstream by the user in parallel.

### Parallel-authored upstream during the session (out of my hands)
`13245fd` (EWE wiki ADR + entity + index), `d4f3838` (Plan+Act Livestock
scaffold log entry), `b42c347` (MaintenanceLogCard structure-source ADR
+ log), `7871622` (api numeric→float8 cast), `d890785` (3D extrusions),
plus three further dirty files appearing post-push
(`PlanLayout.tsx`, `PlanSelectionFloater.tsx`,
`V3LifecycleSidebar.test.tsx`) — those belong to the next round, not
this session.
