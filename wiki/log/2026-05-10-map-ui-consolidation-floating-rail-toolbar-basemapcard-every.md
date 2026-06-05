# 2026-05-10 — Map UI consolidation: floating rail + toolbar + BaseMapCard everywhere


**Motive.** Three floating map UI components (`DesignToolRail`,
`MapToolbar`, `BaseMapCard`) were unevenly distributed across stages —
Plan/Vision had rail + card but no toolbar; Plan/Current and Observe had
toolbar but no rail or card. Standardize on all three in every Observe /
Plan / Act map view, with `BaseMapCard` top-left.

**Changes.**

- `BaseMapCard.module.css`: moved from `bottom-left` to `top-left`,
  widened to 260px, added scroll affordance + collapsible-overlays
  styling.
- `BaseMapCard.tsx`: absorbed the canonical 11-row map-overlays legend
  inline (basemap dropdown + collapsible overlay toggles in one card).
  `DEFAULT_OVERLAYS`, `MAP_OVERLAYS_COLLAPSE_KEY`, and `MapOverlayDef`
  now live here.
- `PlanLayout.tsx` (current view): mounted `DesignToolRail` + `BaseMapCard`.
- `VisionLayoutCanvas.tsx`: mounted `MapToolbar` alongside existing rail + card.
- `ObserveLayout.tsx`: mounted `DesignToolRail` + `BaseMapCard`; removed standalone `MapOverlaysLegend`.
- `ActLayout.tsx`: replaced standalone `MapOverlaysLegend` with `BaseMapCard`.
- **Deleted** `apps/web/src/v3/_shared/components/MapOverlaysLegend.{tsx,module.css}` — no remaining importers (grep clean).

**Verification.** DOM query across Observe / Plan (current, vision, phase-1,
phase-2, terrain3d) / Act confirmed: `BaseMapCard` present, 11 overlay
rows, 0 standalone legend instances. `useBasemapStore` +
`useMatrixTogglesStore` already shared across components, so basemap +
overlay state stay in sync everywhere without extra wiring.

**Deferred (non-blocking).**

- `MapToolbar` Basemap popover + `BaseMapCard` basemap dropdown are two
  affordances for the same store. Acceptable per explicit request;
  revisit if redundant in use.
- `DesignToolRail`'s Draw button is inert in Observe / Plan-Current (no
  design palette). Select / Pan / Zoom / Layers still useful. Wiring
  Draw to the Observe/Plan draw hosts is a separate task.
