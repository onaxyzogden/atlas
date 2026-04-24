# Atlas/OLOS — Information Architecture & Panel Conventions

**Date:** 2026-04-24 (revised; see Revision history)
**Status:** Accepted. Codifies UX Scholar audit §§1 + 3 (P2).
**Audience:** Contributors adding a new surface (panel, popover, modal, toolbar) to the Atlas web app.
**Sibling docs:** [`ui-ux-scholar-audit.md`](./ui-ux-scholar-audit.md), [`MASTER.md`](./MASTER.md), [`impl-plan-oklch-tooltip.md`](./impl-plan-oklch-tooltip.md)

---

## Why this document

The UX Scholar audit flagged two gaps that were explicitly scoped as **documentation, not code**:

- **§1 Information Architecture** — the perimeter strategy is implemented but never written down, so every new feature re-derives "where does this go?"
- **§3 Panel System** — rail / popover / modal primitives all exist, but with no decision matrix contributors default to "another floating panel." Several ad-hoc controls have accumulated in `features/map/` as a result.

This spec is the shared rulebook. Consult it **before** adding a panel, popover, modal, or floating toolbar. If your need doesn't fit an existing row, raise it — don't invent a new chrome pattern.

---

## 1. Perimeter strategy — the five zones

Atlas/OLOS follows a **map-as-hero** layout. UI recedes to a perimeter; the map fills everything else.

```
┌──────────────────────────────────────────────────────────────────┐
│ TOP CHROME — AppShell header (non-project routes only)           │  ← --z-sticky (200)
├──┬────────────────────────────────────────────────────┬──────────┤
│  │                                                    │          │
│  │                                                    │          │
│  │                                                    │          │
│  │                                                    │  RIGHT   │
│LS│              MAP HERO (MapCanvas)                  │  RAIL    │
│  │              [tool spine floats at top-left]       │          │
│  │                                                    │          │
│  │         [DomainFloatingToolbar bottom-center]      │          │
│  │                                                    │          │
└──┴────────────────────────────────────────────────────┴──────────┘
 LS = IconSidebar                               Command palette = Ctrl+K (global)
```

### Zone ownership

| Zone | Component | File | Width / Height | Z-index | Lives on |
|---|---|---|---|---|---|
| Top chrome | `AppShell` header | [`apps/web/src/app/AppShell.tsx:34-105`](../../apps/web/src/app/AppShell.tsx) | 48 px | `--z-sticky` (200) | Non-project routes only |
| Left spine | `IconSidebar` | [`apps/web/src/components/IconSidebar.tsx`](../../apps/web/src/components/IconSidebar.tsx) | 56 / 280 px | 6 | All authed routes |
| Map hero | `MapCanvas` | [`apps/web/src/features/map/MapCanvas.tsx`](../../apps/web/src/features/map/MapCanvas.tsx) | flex-fill | local scale 1–50 | `/project/*` |
| Floating tool spine | `LeftToolSpine` | [`apps/web/src/features/map/LeftToolSpine.tsx:66-85`](../../apps/web/src/features/map/LeftToolSpine.tsx) | 48 px, `top: 132px; left: 12px` | local 2 | `/project/*` map |
| Right rail | `RailPanelShell` | [`apps/web/src/components/ui/RailPanelShell.tsx`](../../apps/web/src/components/ui/RailPanelShell.tsx) | 32 / 340 px | sticky header only | `/project/*` |
| Command palette | `CommandPalette` | [`apps/web/src/components/CommandPalette.tsx:129-226`](../../apps/web/src/components/CommandPalette.tsx) | 480 px centered | `--z-overlay` (300) | Global (Ctrl+K) |

### Invariants

- **No top bar on `/project/*`.** This is intentional. Project routes are map-centric; the IconSidebar handles domain nav and the right rail handles domain depth. Do not add a horizontal chrome bar on project routes.
- **One right rail at a time.** `RailPanelShell` renders only when `activeView` is set; never stack a second rail beside it.
- **Tool spine is floating, not structural.** `LeftToolSpine` sits inside `.mapArea` with `position: absolute`; it must never push map pixels.
- **Top-right of the map = mode/style controls.** Top-left (of the map) = selection/project identity. Bottom-center = domain actions. Anything else belongs in the rail or a popover.

### Public route exception (Landing)

The unauthed landing page at `/` is the one route that **does not** follow the perimeter strategy — it is a standalone marketing surface with its own chrome. Authenticated visitors are redirected to `/home` by the route's `beforeLoad` guard, so no authed user ever sees this layout.

- **Shell:** [`apps/web/src/features/landing/LandingPage.tsx`](../../apps/web/src/features/landing/LandingPage.tsx) composes its own sections — **it does not wrap in `AppShell`**.
- **Nav:** [`sections/LandingNav.tsx`](../../apps/web/src/features/landing/sections/LandingNav.tsx) renders a sticky **64 px** translucent-to-solid top bar. This is the only top bar allowed in the app.
- **Styling:** reuses `styles/tokens.css` exclusively — no landing-specific palette.
- **Rule:** Do not extend the Landing nav pattern to any authed route. If you need chrome on an authed public-ish surface (portal, share link, embedded view), prefer `PublicPortalShell` and raise the case — don't copy `LandingNav`.

---

## 2. Z-index scale (global + map sub-scale)

Two tiers. The map canvas has its own isolated stacking context so its children don't collide with global chrome.

### Global scale

Source: [`apps/web/src/lib/tokens.ts:303-312`](../../apps/web/src/lib/tokens.ts). CSS mirror in `styles/tokens.css` as `--z-*`.

```
base      0
dropdown  100
sticky    200  ← AppShell header, RailPanelShell sticky header
overlay   300  ← CommandPalette backdrop
modal     400  ← Modal, SlideUpPanel backdrop
toast     500  ← Toast notifications
tooltip   600  ← Tooltip, DelayedTooltip
max       999  (emergency fallback only)
```

**Rule:** Above 10, always use `var(--z-*)` or `zIndex.*`. Never an inline magic number.

### Map-canvas sub-scale

Documented in the `MapView.module.css` header comment ([`apps/web/src/features/map/MapView.module.css:3-10`](../../apps/web/src/features/map/MapView.module.css)) — isolated by `.mapArea { position: relative }`, so it does not collide with the global scale.

```
1–3   base overlays (Cesium 3D terrain)
5     map controls, floating cards, inline legends (GAEZ, Soil, Terrain, project card)
10    floating toolbar (DomainFloatingToolbar)
40    mobile bar, loading overlays
50    top-level map controls
```

**Rule:** Inline `zIndex: 2 / 5 / 10` on map children is acceptable **only** when the ancestor is `.mapArea`. Outside `.mapArea`, use the global scale.

---

## 3. Panel decision matrix

Pick the row that matches your need. If none fit, ask before inventing.

| Need | Pattern | Primitive | When to use | When NOT |
|---|---|---|---|---|
| Persistent domain inspector | **Right rail** | `RailPanelShell` + route-driven `activeView` ([`RailPanelShell.tsx`](../../apps/web/src/components/ui/RailPanelShell.tsx)) | Scores/flags, layer metadata, long-lived domain content | Ephemeral actions, interrupting dialogs |
| Mobile right-panel fallback | **Bottom sheet** | `SlideUpPanel` ([`SlideUpPanel.tsx`](../../apps/web/src/components/ui/SlideUpPanel.tsx)) | Mobile breakpoint mirror of the rail | Desktop |
| Interrupting task (confirm, form) | **Modal** | `Modal` ([`Modal.tsx`](../../apps/web/src/components/ui/Modal.tsx)) | Destructive confirms, property editors (`StructurePropertiesModal`), multi-step forms | Anything tethered to the map |
| Map-tethered control (legend, filter, picker) | **Map control popover** | `MapControlPopover` ([`MapControlPopover.tsx`](../../apps/web/src/components/ui/MapControlPopover.tsx)) — `variant="panel" \| "dropdown"` | GAEZ / Soil / Terrain / Historical-Imagery / OSM-Vector controls | Global actions |
| Context-sensitive tool actions | **Floating toolbar** | `DomainFloatingToolbar` ([`DomainFloatingToolbar.tsx`](../../apps/web/src/features/map/DomainFloatingToolbar.tsx)) | Bottom-center, domain-colored, collapsible | Persistent navigation |
| Global command entry | **Command palette** | `CommandPalette` (Ctrl+K) | Cross-domain search, quick nav, actions | Replacement for sidebar nav |
| Async feedback | **Toast** | `Toast` ([`Toast.tsx`](../../apps/web/src/components/ui/Toast.tsx)) | Success / error / info after user action | Blocking info |
| Hover hint on icon-only control | **DelayedTooltip** | `DelayedTooltip` ([`DelayedTooltip.tsx`](../../apps/web/src/components/ui/DelayedTooltip.tsx)) | Every icon-only button (800 ms delay) | Rich interactive content |
| Keep a key KPI visible when the rail scrolls | **Sticky mini-header** | `StickyMiniScore` ([`StickyMiniScore.tsx`](../../apps/web/src/components/panels/StickyMiniScore.tsx)) — `IntersectionObserver` on the primary KPI card; slides in only once that card scrolls above the viewport | The panel's "heart" metric (Site Intelligence suitability, any future single-score panel) | Secondary stats, anything with more than ~40 px height, scroll-handler-driven variants |
| Inline section-scoped form inside a rail card | **Disclosure form** | Local `useState` toggle + form component (pattern example: [`RegenerationTimelineCard.tsx`](../../apps/web/src/features/regeneration/RegenerationTimelineCard.tsx) + [`LogEventForm.tsx`](../../apps/web/src/features/regeneration/LogEventForm.tsx)) | Adding a new item to a list the card already shows (events, milestones, notes) | Destructive edits (use `Modal`), multi-step flows (use `Modal`), cross-section input (use `Modal` or a dedicated page) |
| Compact KPI / supply-vs-demand strip | **Rollup** | Pattern example: [`EnergyDemandRollup.tsx`](../../apps/web/src/features/utilities/EnergyDemandRollup.tsx) — 3-stat grid + per-category bars, lives inline inside a panel/dashboard section | Condensing a multi-row list into a single-glance summary at the top of a section | Replacement for the detail rows — always render beside the full list, never alone |

### Anti-patterns (don't do)

- **Re-invented modals.** Hand-rolled `position: fixed; inset: 0; background: rgba(0,0,0,0.5)` — use `Modal` instead.
- **Full-screen overlays that aren't modals.** If it isn't interrupting, it doesn't belong at `--z-modal`.
- **Custom z-index numbers > 10 without a token.** The global scale is 8 steps; anything else is drift.
- **A second right rail.** `RailPanelShell` is singleton-by-contract.
- **A top bar on `/project/*`.** Project routes are deliberately top-chrome-free.
- **Native `title=` tooltips on icon-only controls.** Wrap with `DelayedTooltip` (see [ADR 2026-04-23](../../wiki/decisions/2026-04-23-delayed-tooltip-primitive.md)). Retrofit completed 2026-04-24 across 28 files (commit `29bf499`).
- **Hand-rolled floating toggles with inline `backdropFilter`.** A map-tethered toggle button is either (a) a spine-btn inside `LeftToolSpine`, (b) a `MapControlPopover` caller, or (c) a member of `DomainFloatingToolbar`. It is **not** a one-off inline-styled `<button>` in a feature file.

### Known violations (follow-up backlog)

These ship in the codebase today and have been flagged for later migration. Do not copy their pattern; when you touch these files, migrate them.

- [`BiodiversityCorridorOverlay.tsx:265-287`](../../apps/web/src/features/map/BiodiversityCorridorOverlay.tsx) — the non-compact toggle renders a hand-rolled `backdropFilter` button. The compact path (lines 240–263) correctly uses a spine-btn. Fix = move all chrome into `MapControlPopover` with `variant="dropdown"` and delete the inline style block.
- **Broader map-overlay migration.** Grep `backdropFilter` in `apps/web/src/features/map/**` currently hits 10 files; only 5 (GAEZ, Soil, Terrain, HistoricalImagery, OSMVector) went through the c276c51 `MapControlPopover` migration. The rest (e.g., `AgroforestryOverlay`, `CrossSectionTool`, `MeasureTools`, `MicroclimateOverlay`, `MulchCompostCovercropOverlay`) still ship the pre-primitive chrome and should be audited for popover vs spine-btn vs no-chrome classification.

---

## 4. Current map-tethered floating inventory

These already exist, share the glass-chrome pattern, and set precedent. If you're adding a new map control, match this chrome rather than inventing new styling:

- [`features/map/GaezOverlay.tsx`](../../apps/web/src/features/map/GaezOverlay.tsx) — GAEZ map controls (top-right, `z:5`)
- [`features/map/SoilOverlay.tsx`](../../apps/web/src/features/map/SoilOverlay.tsx) — SoilGrids property picker + legend
- [`features/map/TerrainControls.tsx`](../../apps/web/src/features/map/TerrainControls.tsx) — 2D / 2.5D / 3D toggle
- [`features/map/HistoricalImageryControl.tsx`](../../apps/web/src/features/map/HistoricalImageryControl.tsx)
- [`features/map/OsmVectorOverlay.tsx`](../../apps/web/src/features/map/OsmVectorOverlay.tsx)
- [`features/map/SplitScreenCompare.tsx`](../../apps/web/src/features/map/SplitScreenCompare.tsx)
- [`features/map/DomainFloatingToolbar.tsx`](../../apps/web/src/features/map/DomainFloatingToolbar.tsx) — bottom-center, `z:10`
- Mounted through `LeftToolSpine` slots: `ViewshedOverlay`, `MicroclimateOverlay`, `WindbreakOverlay`, `MeasureTools`, `CrossSectionTool`

**Paint-only overlays (no chrome of their own):** mount a MapLibre source/layer pair via effect hooks and render `null` — visibility is driven by a parent toggle (spine-btn or domain-toolbar entry). These are the cleanest overlay pattern; prefer this shape when a layer has no per-overlay controls.

- [`features/map/PollinatorHabitatStateOverlay.tsx`](../../apps/web/src/features/map/PollinatorHabitatStateOverlay.tsx) — §7 zone-centroid habitat classification; pure paint.
- [`features/map/BiodiversityCorridorOverlay.tsx`](../../apps/web/src/features/map/BiodiversityCorridorOverlay.tsx) (paint portion, lines 1–234) — §7 dijkstra LCP corridor band; the toggle UI below it is the §3 known violation.

**Shared chrome (de facto pattern):**

```
background:       var(--color-chrome-bg-translucent);
backdrop-filter:  blur(8–10px);
border:           1px solid rgba(125, 97, 64, 0.4);     /* warm-gold edge */
border-radius:    10px;
```

Plus an inset highlight for depth. **Landed 2026-04-24** as [`MapControlPopover`](../../apps/web/src/components/ui/MapControlPopover.tsx) — two variants (`panel` / `dropdown`) capture the panel-vs-dropdown border/radius/padding split. Callers own position + z-index via `style`; the primitive handles the shared chrome only. See [ADR 2026-04-24](../../wiki/decisions/2026-04-24-map-control-popover-and-mapzindex.md).

---

## 5. Deferred / forward guidance

These are explicitly **out of scope** for this spec. Flagged so contributors know they're planned work, not opportunities to freelance:

- **`MapControlPopover` primitive — Landed 2026-04-24.** Extracted at [`apps/web/src/components/ui/MapControlPopover.tsx`](../../apps/web/src/components/ui/MapControlPopover.tsx) with `panel` and `dropdown` variants. All five consumers (GAEZ, Soil, Terrain, Historical Imagery, OSM Vector) migrated. New map controls must use this primitive — do not copy the chrome.
- **Map z-index token export — Landed 2026-04-24.** Sub-scale lives in [`lib/tokens.ts`](../../apps/web/src/lib/tokens.ts) as `mapZIndex` (TS) mirrored by `--z-map-*` custom properties in [`styles/tokens.css`](../../apps/web/src/styles/tokens.css). Keys: `spine (2)`, `baseOverlay (3)`, `splitPane (3)`, `dropdown (4)`, `panel (5)`, `tooltip (6)`, `loadingChip (9)`, `toolbar (10)`, `mobileBar (40)`, `top (50)`. Inline `zIndex: <n>` literals in `features/map/**` are forbidden.
- **Top-chrome conventions on `/project/*`.** Currently *intentionally absent*. Before proposing a top bar on project routes, revisit this doc — the rationale is that domain nav belongs in the IconSidebar and domain depth belongs in the right rail, not a horizontal bar competing with the map.
- **Map-overlay chrome migration completion.** 5 of ~10 `backdropFilter`-bearing files went through the `MapControlPopover` migration in c276c51; the rest (see §3 Known violations) remain. Schedule: opportunistic — migrate when touching the file for a feature change, don't spin a dedicated refactor session.
- **Landing-route tokens.** Landing uses the warm-neutral token set but hasn't been audited against the OKLCH elevation scale. Revisit when the OKLCH scale is extended past the four currently-defined L tiers.

---

## References

- UX Scholar audit §§1 + 3: [`ui-ux-scholar-audit.md`](./ui-ux-scholar-audit.md) (lines 18–32, 58–72)
- Design-system master: [`MASTER.md`](./MASTER.md)
- OKLCH token ADR: [`wiki/decisions/2026-04-23-oklch-token-migration.md`](../../wiki/decisions/2026-04-23-oklch-token-migration.md)
- DelayedTooltip ADR: [`wiki/decisions/2026-04-23-delayed-tooltip-primitive.md`](../../wiki/decisions/2026-04-23-delayed-tooltip-primitive.md)
- MapControlPopover + mapZIndex ADR: [`wiki/decisions/2026-04-24-map-control-popover-and-mapzindex.md`](../../wiki/decisions/2026-04-24-map-control-popover-and-mapzindex.md)

---

## Revision history

- **2026-04-24 (initial)** — Authored alongside the `MapControlPopover` + `mapZIndex` work (commit `c276c51`). Codified the 5-zone perimeter, the two-tier z-index scale, the 8-row panel decision matrix, and the map-tethered inventory.
- **2026-04-24 (refresh)** — Post-c276c51 freshness pass:
  - §1 added the "Public route exception (Landing)" block for the new `LandingPage` + `LandingNav` surface.
  - §3 matrix gained three rows: sticky mini-header (`StickyMiniScore`), inline disclosure form (`RegenerationTimelineCard` + `LogEventForm`), and rollup strip (`EnergyDemandRollup`).
  - §3 anti-patterns gained a "hand-rolled floating toggle" entry + a **Known violations** sub-section flagging `BiodiversityCorridorOverlay.tsx:265-287` and the broader 5-file map-overlay migration backlog.
  - §4 gained a "Paint-only overlays" sub-list for `PollinatorHabitatStateOverlay` and the paint portion of `BiodiversityCorridorOverlay`.
  - §5 retired the "MapControlPopover primitive — Landed" and "Map z-index token export — Landed" items (now reflected in the body); added migration-completion + landing-OKLCH items.
  - Validates (no doc change): 28-file `title=` → `DelayedTooltip` retrofit in commit `29bf499` confirms the §3 DelayedTooltip row.
