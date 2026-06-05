# 2026-05-15 — Map cursor: single authority closed via intent channel


**Branch.** `claude/jovial-mccarthy-bb516f`.

**What.** Executed the deferred follow-up from
`decisions/2026-05-15-atlas-map-cursor-authoritative.md`: resolved the
~30 ad-hoc `map.getCanvas().style.cursor = X` writers so the codebase
has exactly one cursor authority (`useMapCursor`).

- **Deleted (redundant):** `crosshair` writers in
  `AdoptBasemapBuildingTool`, `SunWindWedgeTool`, `useDimensionDrawTool`
  (all gated by `drawArmed`); pure pointer `mouseenter`/`mouseleave`
  pairs in `PlanDataLayers` (×3) and `PlanScheduledMovesOverlay`
  (covered by the hover probe; added `plan-scheduled-moves-` to
  `INTERACTIVE_LAYER_PREFIXES`).
- **Preserved by extending the priority model:** new
  `mapCursorIntentStore.ts` (Zustand; `grabbing | move | grab`) consulted
  by `useMapCursor` at priority 2 (below `drawArmed`, above hover/pan);
  the hook subscribes and re-applies. `PlanDataLayers` (×5),
  `AnnotationDragHandler`, `AnnotationSectorHandles` now call
  `setCursorIntent(...)`/`setCursorIntent(null)` instead of writing the
  canvas directly. This revives the `move`/`grab`/`grabbing` affordances
  the prior ADR's observer had been overriding.

**Verification.** `pnpm --filter web typecheck` exit 0. Live on a
worktree-dedicated dev server (`web-wt`, port 5210, confirmed serving
this branch). Observe + Plan: pan rest `grab !important`; draw armed
(Swale / Adopt-from-map / Sun-summer) `crosshair !important`; real
`mapCursorIntentStore` driven via the Vite dev graph →
`grabbing`/`move`/`grab` each `!important`, clear → `grab !important`.
Only a pre-existing `ObserveModuleBar.tsx:32` DOM-nesting warning and
the expected placeholder-key MapTiler `403` in console — no cursor /
MutationObserver / recursion errors.

**Added.** `web-wt` (`--strictPort` 5210) launch config in
`.claude/launch.json` for collision-free worktree preview. ADR:
`decisions/2026-05-15-atlas-map-cursor-intent-channel.md`.
