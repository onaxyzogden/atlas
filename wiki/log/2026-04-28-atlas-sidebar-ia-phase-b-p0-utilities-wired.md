# 2026-04-28 — Atlas Sidebar IA: Phase B P0 utilities wired


### Done
Closed the "P0 footer buttons have no destination" carry-forward from the Phase B Shape-4 ship. The two P0 sidebar utilities now point at real surfaces:

- **Ethics & Principles** → static reference page at `/v3/reference/ethics`. New page: [apps/web/src/v3/pages/EthicsReferencePage.tsx](../apps/web/src/v3/pages/EthicsReferencePage.tsx) lists the three permaculture ethics (Earth Care / People Care / Fair Share) and Holmgren's twelve principles, content sourced from [wiki/concepts/permaculture-alignment.md](concepts/permaculture-alignment.md). Route registered as a child of `appShellRoute` so it inherits the LandOsShell chrome.
- **Matrix Toggles** → popover ([apps/web/src/v3/components/MatrixTogglesPopover.tsx](../apps/web/src/v3/components/MatrixTogglesPopover.tsx)) backed by a new `matrixTogglesStore` ([apps/web/src/store/matrixTogglesStore.ts](../apps/web/src/store/matrixTogglesStore.ts)). Three booleans — Topography / Sectors / Zones — persisted to `localStorage` (zustand `persist`, version 1, key `ogden-atlas-matrix-toggles`). Sidebar shows an active-count badge when any overlay is on. Click-outside / Escape closes the popover.
- **Sidebar wiring** ([V3LifecycleSidebar.tsx](../apps/web/src/v3/components/V3LifecycleSidebar.tsx)): Ethics row renders as `<Link to="/v3/reference/ethics">`, Matrix row as `<button>` with `aria-expanded` + `aria-haspopup="dialog"`. P1 rows (Plant DB, Climate Tools) stay disabled. Footer is now `position: relative` to anchor the popover, and `.utilityBtn` carries `text-decoration: none; color: inherit` so the Link looks identical to the buttons.
- **Render coverage** ([V3LifecycleSidebar.test.tsx](../apps/web/src/v3/components/__tests__/V3LifecycleSidebar.test.tsx)): six-test smoke suite covering phase groups, renamed labels, the Ethics link target, popover open-on-click, the active-count badge, and P1 disabled state. Added `*.test.tsx` to the vitest include glob.

### Verification
- `pnpm vitest run src/v3/components/__tests__/V3LifecycleSidebar.test.tsx` — 6/6 pass.
- `tsc --noEmit -p apps/web/tsconfig.json` — clean on touched files (Ethics page, sidebar, store, popover, route registration). Pre-existing v3 typecheck errors (FiltersBar, DiagnoseRail, HomeRail, OperateRail) remain untouched and unrelated.

### Carries forward
- Map-overlay layer that consumes `matrixTogglesStore` ships in v3.1 — toggles persist today but render no overlays yet. The popover surfaces a "Overlay layer ships in v3.1" note so the affordance isn't read as broken.
- A live ethics scorer that grades the active project against each principle is still deferred per Phase A's open-questions list.
