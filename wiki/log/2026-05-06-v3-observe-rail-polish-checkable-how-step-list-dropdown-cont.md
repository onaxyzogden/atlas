# 2026-05-06 — v3 Observe rail polish + checkable How-step list + dropdown contrast (+ selection halo carry-over)


**Trigger.** Multi-turn iterative pass on `/v3/project/<id>/observe` after the field-test loop landed in `99f30ba`. User worked through ten micro-asks: mount Site Intelligence in the right rail, restore the Earth/Water/Ecology guidance card at narrower viewports, give each tool group its own bento, uppercase + tighten the bottom module-bar tile labels, lift the right-rail surface to match the left, retire the "Hide modules" toggle, ring-circle the tool icons, increase native `<select>` option contrast, and turn the WHY/HOW/PITFALL "How" steps into a persisted checklist. The checklist work then crashed the page with `Maximum update depth exceeded` and was fixed in the same session.

### What landed

**1. Site Intelligence in the observe rail.** [apps/web/src/v3/components/DecisionRail.tsx](apps/web/src/v3/components/DecisionRail.tsx)

- `lazy(() => import('../../components/panels/SiteIntelligencePanel.js'))` + a tiny inline `ObserveSiteIntelligenceRail` wrapper that looks up the `LocalProject` by id from `useProjectStore` and renders the panel inside `<Suspense>` (or a placeholder for the MTC fixture, which has no `LocalProject`). Mirrors the lazy-import pattern in `MapView.tsx:74,686`.
- Outer `<header>` suppressed when `stage === 'observe'` so the panel's own `<h2>Site Intelligence</h2>` is the sole title (no stuttered "Observe" / "Site Intelligence" stack). Other stages' eyebrow + title untouched.

**2. Layout breakpoints corrected.** [apps/web/src/v3/observe/ObserveLayout.module.css](apps/web/src/v3/observe/ObserveLayout.module.css)

- Old rules hid `.right` at <1200 px and `.left` at <900 px via `display:none`. Replaced with a shrink-then-hide cascade: 1200 → `220/1fr/240`; 1000 → `200/1fr/220`; 820 → single column (both side rails hidden). Restores the EARTH, WATER & ECOLOGY guidance card on typical laptop viewports.

**3. Tools rail bento + lifted surfaces.** [apps/web/src/v3/observe/tools/ObserveTools.module.css](apps/web/src/v3/observe/tools/ObserveTools.module.css), [apps/web/src/v3/observe/components/ObserveChecklistAside.module.css](apps/web/src/v3/observe/components/ObserveChecklistAside.module.css)

- `.toolbox` is now a transparent column; each `.group` is a discrete card with surface, border, radius, padding, and a per-module `--group-dot` accent. After overshooting on contrast, the lift was dialed back to ~30%: `color-mix(... 96%, #fff)` background, 88/12 white-mixed border, `0 1px 2px rgba(0,0,0,0.10)` shadow.
- `.toolItem` (the tool buttons): default opacity bumped 0.85 → 1, faint black-mix on the well bg (91/9), brighter border (85/15 white-mix), so each tile reads as a recessed surface inside its card.
- New `.toolGlyph` ring: 28×28 circle, group-color tint at 12% over the page bg, 30%-opacity ring of the same dot color — Human Context green, Macroclimate yellow, Topography green-yellow, etc.
- Right rail (`.checklistBox`) reuses the same 96/12/shadow treatment so the left and right columns read as the same elevation tier.

**4. Module bar simplification + UPPERCASE tile labels.** [apps/web/src/v3/observe/components/ObserveModuleBar.tsx](apps/web/src/v3/observe/components/ObserveModuleBar.tsx) + [.module.css](apps/web/src/v3/observe/components/ObserveModuleBar.module.css)

- Removed the "HIDE MODULES" collapse toggle entirely: dropped `useEffect`/`useState`, `ChevronUp`/`ChevronDown` imports, the `STORAGE_KEY` + `readCollapsed` / `writeCollapsed` helpers, the persisted collapsed state, and the `<button className={css.handle}>` row. Tile row renders unconditionally. Dead `.rail.collapsed`, `.handle`, `.handle:hover`, `.handleLabel` rules deleted.
- `.tileLabel` uppercased with `text-transform: uppercase; letter-spacing: 0.06em`. Min-height 64 → 44, `justify-content: space-between` so progress bar pins to the top and label drops to the bottom of the (now shorter) bento.

**5. Checkable How-step list + persistence store.** [apps/web/src/v3/observe/components/ObserveChecklistAside.tsx](apps/web/src/v3/observe/components/ObserveChecklistAside.tsx) + [.module.css](apps/web/src/v3/observe/components/ObserveChecklistAside.module.css), new [apps/web/src/store/observeHowChecksStore.ts](apps/web/src/store/observeHowChecksStore.ts)

- `<ol>` replaced with `<ul>` of `<label>` rows wrapping `<input type="checkbox">` + step text. Custom 14×14 checkbox tinted with the per-module `--group-dot`; checked state fills with the dot color and draws a CSS pseudo-element checkmark; checked rows get strikethrough + muted color.
- New `useObserveHowChecksStore` (zustand + persist) keyed `byProject[projectId][module] = number[]` of checked step indices. Pattern mirrors `homesteadStore.ts`. Persists under localStorage key `ogden-atlas-observe-how-checks`.

**6. Render-loop fix (critical).** Same file as #5.

- First version of the selector was `useObserveHowChecksStore((s) => projectId ? s.byProject[projectId]?.[module] ?? [] : [])`. The `?? []` returns a fresh literal each call → zustand v5's `Object.is` flagged it as a state change → infinite re-render → "Maximum update depth exceeded" overlay.
- Fix: hoisted module-level `const EMPTY_CHECKS: readonly number[] = []`; selector now falls back to that stable reference. Doc-comment on the constant warns future editors not to inline `?? []` in selectors. This sits inside the precedent set by [`2026-04-26 Zustand Selector Discipline`](decisions/2026-04-26-zustand-selector-discipline.md) — same root cause, fourth recurrence — so no new ADR; the existing one already names the trap.

**7. Dropdown contrast.** [apps/web/src/v3/observe/components/draw/ObserveDrawHost.module.css](apps/web/src/v3/observe/components/draw/ObserveDrawHost.module.css)

- `.input,.select,.textarea` background tint 0.06 → 0.10, border opacity 0.2 → 0.4, color brightened to `#f8f4ea`. New hover (border 0.6) and focus (gold-brand border + 0.14 fill) states.
- New `.select option` rules explicitly setting `background:#1a1a1a; color:#f8f4ea` so the native popup no longer inherits a low-contrast grey under the dark theme. Selected/hovered option uses `--color-gold-brand` with dark text. Used by SunWindWedgeTool's Type + Intensity selects; benefits any other tool form sharing the module.

### Carry-over (pre-existing untracked work also committed)

- New [apps/web/src/store/observeSelectionStore.ts](apps/web/src/store/observeSelectionStore.ts) — ephemeral, non-persisted multi-select store (kind+id pairs).
- [apps/web/src/v3/observe/components/layers/ObserveAnnotationLayers.tsx](apps/web/src/v3/observe/components/layers/ObserveAnnotationLayers.tsx) — adds a halo source/layers (circle + line) driven by `useObserveSelectionStore.selected`, with `#c4a265` gold ring + dark outline; click toggles selection (cmd/ctrl-click extends), background click clears. Bridges the SelectionFloater / drag-reposition / vertex-edit follow-ups deferred from `2026-05-06 Atlas OBSERVE Edit/Delete Loop`.

### Verification

- `npx pnpm --filter @ogden/web typecheck` clean.
- Live preview at `/v3/project/mtc/observe/topography`:
  - No error overlay (was: "Maximum update depth exceeded" before the EMPTY_CHECKS fix).
  - 3 checkboxes mount; clicking the first persists `{"mtc":{"topography":[0]}}` to localStorage and applies the strikethrough class.
  - Landing state (no module) renders all 6 cards / 15 total checkboxes without looping.
- Site Intelligence panel renders inside the rail for a real project; MTC shows the placeholder copy.

### Deferred

- The selection-halo carry-over ships the visual layer but the SelectionFloater action bar and AnnotationDragHandler are still TODO (the store + halo are in; the consumers from the 2026-05-06 ADR's deferred list are not).
- `useShallow` migration across other stores — not warranted by this session; the EMPTY-fallback pattern is sufficient and matches existing precedent.
- `/v3/project/mtc/observe` fixture has no `LocalProject`, so the Site Intelligence panel can't render for it; placeholder copy remains.

### Recommended next session

- Wire SelectionFloater + AnnotationDragHandler now that the selection store + halo layer are in.
- Or pick up the broader Observe → Plan handoff: surface How-checklist progress inside the bottom `ObserveModuleBar` tile (e.g. count of checked steps next to the existing PillarTask sub-segments).
