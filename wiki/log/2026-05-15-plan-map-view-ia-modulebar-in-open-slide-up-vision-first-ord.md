# 2026-05-15 — Plan map-view IA: ModuleBar in open slide-up + Vision-first order


**Objective.** Two Plan map-view IA papercuts: (1) the bottom ModuleBar is
fully covered by the module slide-up scrim, so the module navigator is
unreachable while a module page is open; (2) Current Land was both the first
tab and the load default, though Vision Layout is the primary surface.

**Change.** Added an optional `topBar?: ReactNode` slot to the shared
`ModuleSlideUp` (rendered as the first child of the sheet, above `<header>`,
new `.topBar` CSS wrapper). `PlanModuleSlideUp` forwards it through;
`PlanLayout` extracts the `<PlanModuleBar>` into a `moduleBar` const and feeds
the **same stateless element** into both `StageShell.bottomTray` (closed,
unchanged) and the slide-up `topBar` (open) — open/close + switch semantics
unchanged. Additive/backward-compatible: Act/Observe omit `topBar`, unchanged.
`PLAN_VIEWS` reordered `['vision','current','terrain3d']` (sole tab-order
driver) and `PlanLayout` default view `'current' → 'vision'`.

**Verification.** Browser preview (`mtc` → redirected project): closed → bar
at screen bottom; open → DOM child order `[_topBar,_header,_tabs,_body]` +
screenshot showing the bar under the app header and above the
"PLAN · MODULE / Goal Compass" header; in-sheet tile switches module with
sheet open; active-tile + ESC close; tabs render Vision → Current → 3D Terrain
with Vision active on load.

**Deferred.** Pre-existing `mtc` fallback-project redirect that resets
slide-up state on first module open (unrelated; left as-is). See ADR
`decisions/2026-05-15-atlas-plan-modulebar-in-slideup-and-view-order.md`.
