# 2026-05-11 — Shared moduleNav + stageCard primitives; Observe full reskin; per-view design elements


**Motive.** Two parallel drifts surfaced on the same day. (1) Plan and Act
each carried their own bottom-anchored slide-up + tile-row pair
(`PlanModuleSlideUp/Bar.{tsx,module.css}` and the Act twins, already
visually aligned but living as parallel code; Observe a third diverged
copy). (2) Every Observe module page still rendered against the
22k-line monolithic `observe-port.css` (green `#15803D` buttons,
bespoke `module-hero-card` heroes, custom progress rings) while Plan
and Act shared 95% of one card CSS file. Both drifts made every
single visual tweak a 2- or 3-file edit.

In parallel, the per-view design-element model needed authoring
provenance — a structure dropped on *Vision* should not appear on
*Current Land*, and the reverse needs an opt-out — to support
upcoming year-1 / year-5 / 3D-terrain plan flows.

**Change.**

- **Shared moduleNav primitives.** New
  [`apps/web/src/v3/_shared/moduleNav/`](../apps/web/src/v3/_shared/moduleNav)
  hosts a generic `ModuleSlideUp` (scrim, sheet, eyebrow + title,
  grouped-tab row, focus trap via shared `useFocusTrap`, Suspense
  fallback, optional `headerExtra` slot) and `ModuleBar<TModule>` (tile
  row with shared click semantics + `renderTileIndicator?` render prop
  + `onTileInteraction(module, eventType)` telemetry hook). Plan and
  Act each become thin wrappers passing module list, label map, and
  lazy card imports. Four legacy CSS modules deleted
  (`PlanModuleSlideUp.module.css`, `PlanModuleBar.module.css`,
  `ActModuleSlideUp.module.css`, `ActModuleBar.module.css`).
- **Shared stageCard primitives.** New
  [`apps/web/src/v3/_shared/stageCard/`](../apps/web/src/v3/_shared/stageCard)
  promotes the Plan/Act card chrome (~165 + ~221 LOC, 95% identical)
  into one `stageCard.module.css` selected by a `data-stage` attribute
  on `.hero`. Hero gradient is per-stage CSS-var-driven
  (`--stage-hero-{a,mid,b}`): Plan bronze / Act violet / Observe new
  earth-green. `observeExtras.module.css` holds Observe-only conic
  gold `ring`, KPI grid, eyebrow chips, synthesis blocks, blockquote,
  capacity bar.
- **Observe full reskin (7/7).** All seven Observe modules
  (`human-context`, `built-environment`, `earth-water-ecology`,
  `macroclimate-hazards`, `sectors-zones`, `swot-synthesis`,
  `topography`) now render against `stageCard.module.css` +
  `observeExtras.module.css` with `data-stage="observe"`. Green
  `#15803D` inline buttons replaced with gold `.btn`. Shared
  `ProgressRing` left in place (still green for any future consumer)
  while a local gold `Ring()` helper using `conic-gradient(rgba(--color-gold-rgb))`
  is used in-module. (Note: the
  [Human Context reskin ADR](decisions/2026-05-11-atlas-observe-human-context-reskin.md)
  describes the other six modules as deferred — that was the
  intent at ADR-write time; subsequent passes shipped them in-session.
  Treat this log entry as the authoritative scope record.)
- **Per-view design elements.**
  [`designElementsStore`](../apps/web/src/store/designElementsStore.ts)
  gains `view?: PlanView` (authoring view; defaults to `'current'` on
  migrate) and `hiddenInViews?: PlanView[]`. New `update(projectId, id, patch)`
  and `setHiddenInView(projectId, id, view, hidden)` actions. Non-`current`
  elements are scoped to their authoring view; `current` elements show
  read-only on every other view unless hidden. Structure-class kinds
  remain owned by `builtEnvironmentStoreV2` and are passthrough here.
  Persist version bumped.
- **Plan schedule-move tool + supporting wiring.** New
  `PlanScheduleMoveTool.tsx` (Plan-stage scheduling of livestock
  rotations). Changes ripple through `PlanScheduledMovesOverlay`,
  `planVertexEditStore`, `PlanSelectionFloater`, `PlanDrawHost`,
  `InlineFeaturePopover.{tsx,module.css}`, `inlineEditSchemas.ts`,
  `inlineFormStore.ts`, `PlanVertexEditHandler.tsx`,
  `DesignToolRail.tsx`, `useDesignElementDrawTool.ts`,
  `DesignElementLayers.tsx`, `SectorOverlayCard.tsx`, `PlanTools.tsx`,
  and `PlanLayout.tsx`. `phaseStore`, `planSelectionStore` follow.

**Verification.** Preview restart on
[http://localhost:5200/](http://localhost:5200/) — Vite v6.4.1, ready
1259ms, 389 static-copy items collected, landing renders cleanly with
no console errors. Prior session's stale
`Plan3DSelectionHandler.tsx` HMR failure cleared with the cold start.
Pre-existing `<button>` nesting warning on
`apps/web/src/v3/observe/components/ObserveModuleBar.tsx:32` was
logged but is out-of-scope for this session.

**Deferred.**

- Plan + Act callsite migration off `features/plan/planCard.module.css`
  + `features/act/actCard.module.css` onto shared stageCard
  (mechanical but ~60 files; the legacy CSS files remain in place so
  Plan/Act consumers don't need TSX edits this session).
- `observe-port.css` selector pruning — defer until each individual
  selector has zero remaining consumers; risk of silently breaking a
  shared rule is real.
- Per-view design-element UI affordances (hide/show toggle in selection
  floater, view chip on element popovers) — store layer is in place,
  card-side UI is the next step.
- Observe `ObserveModuleBar` migration onto shared `ModuleBar<TModule>`
  — render-prop seam (`renderTileIndicator?`) is already shaped for
  Observe's per-task subseg pills.
