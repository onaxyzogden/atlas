# 2026-05-11 — Shared module-nav primitives (Plan + Act)


**Motive.** Plan and Act stages each carried parallel copies of the
bottom-anchored module slide-up and module-bar tile row. Visuals
were already aligned but the code was duplicated, drift was setting
in (Observe, the third stage built off the same template, had
already diverged on tab grouping and tile chrome), and every CSS
tweak meant editing two or three files.

**Change.** Extracted two generic primitives into
`apps/web/src/v3/_shared/moduleNav/`:
- **`ModuleSlideUp`** — scrim, sheet, header, grouped-tab row,
  focus trap, Suspense fallback. Card body via `renderCard` render
  prop. Tab grouping renders a gold uppercase group label when
  `card.group` changes vs. previous tab, plus a faint gold
  underline on grouped tabs.
- **`ModuleBar<TModule>`** — generic tile row. Click semantics
  shared. Status indicator inside the tile is a render prop
  (`renderTileIndicator?`) so a future Observe migration keeps its
  per-task subseg pills inside shared tile chrome. Telemetry via
  `onTileInteraction(module, eventType)`.

Plan and Act wrappers (`PlanModuleSlideUp`, `PlanModuleBar`,
`ActModuleSlideUp`, `ActModuleBar`) now own only their lazy card
imports, `renderCard` switch, and stage label. Four legacy CSS
modules deleted (Plan + Act × slide-up + bar).

**Observe deferred.** Steward reverted the Observe wrapper edits
mid-implementation. Observe stays on its local legacy
`v3/observe/components/ModuleSlideUp.{tsx,module.css}` and
`ObserveModuleBar.{tsx,module.css}`. The shared primitives are
already shaped to accept Observe whenever that migration is picked
back up — `renderTileIndicator` is the seam for the task-status
subsegments and `OBSERVE_MODULE_CARDS` can gain optional `group?`
fields without breaking.

**Verification.** `tsc --noEmit` clean for all touched files;
preexisting branch errors (`matrixTogglesStore`,
`DesignElementGlbLayer` removal, `MapToolId` enum work) unrelated.
Pixel-level browser verification recommended pre-merge but not run
to completion in-session (screenshot tool timeouts); shared CSS is
copied byte-for-byte from the Plan source, so visible delta is
expected to be zero for Plan and Act.

**Decision filed:** [2026-05-11-atlas-shared-module-nav.md](decisions/2026-05-11-atlas-shared-module-nav.md)
