# Plan · Module 5 · WasteVectorTool — Dashboard view (visual shell)

**Date:** 2026-05-21
**Stage:** Plan
**Module:** 5 — Soil Fertility & Closed-Loop
**Status:** Landed (visual shell, sample data)
**Branch:** `feat/atlas-permaculture`

## Context

The user supplied a high-fidelity mockup of a "Waste-to-resource vectors"
dashboard (KPI strip, sources → processing → destinations flow map, side rails
for stream inventory / processing methods / risks / interventions, closed-loop
scenarios carousel, and a footer action bar). They want it to be **one of the
layouts** for Module 5's slide-up — not a replacement for the existing
authoring or closed-loop visualisations.

## Decision

Add a `List | Dashboard` segmented control **inside `WasteVectorTool.tsx`**
(no new tab in `apps/web/src/v3/plan/types.ts`). The existing authoring form +
flat list is lifted verbatim into `WasteVectorListView.tsx` and rendered when
`view === 'list'`; a new `WasteVectorDashboardView.tsx` renders the bento
overview when `view === 'dashboard'`. Default view remains `list` so first-
load behaviour is preserved.

### Rationale

- **No new tab.** Module 5 already carries 10 tabs after the 2026-05-12 hoist
  of `fertility-colocation` to index 0; adding an 11th tab for a read-mostly
  overview would crowd the bar and obscure the authoring intent. The view
  switcher keeps authoring and overview side-by-side under one tab.
- **No replacement of `ClosedLoopGraphCard`.** That card lives at tab index 3
  with a Scholar-validated ring/spatial layout (2026-05-07). The new
  dashboard's flow map is a different artefact (Sankey-style, sample data) and
  the two coexist intentionally.
- **No top sub-nav.** The mockup's `Understand / Map / Design / Integrate /
  Optimize` strip conflicts with Atlas's Observe / Plan / Act IA and was
  dropped entirely. Replicating it would invent a new pattern the rest of the
  app does not honour.
- **Visual shell first.** All metrics, streams, processors, destinations,
  flows, risks, interventions and scenarios are hardcoded sample data inside
  `WasteVectorDashboardView.tsx`. Wiring to `closedLoopStore.materialFlows` /
  `compostInventoryStore` is the subject of a follow-up plan so the layout
  can be reviewed in isolation from data semantics.

## Layout

Within the 880px `stageCard.module.css` `.page` constraint:

1. **KPI strip** — 3×2 (responsive 2×3 / 1×6) chip grid for 6 KPIs (organic
   waste captured, compost output, NPK recovery, water reuse, energy value,
   loop efficiency); each chip has a Lucide icon, value+unit, cadence label
   and trend delta.
2. **Resource flow map** — full-width SVG with three vertical columns
   (Sources, Processing nodes, Destinations) wired by curved Bézier paths
   coloured from `MATERIAL_KIND_CONFIG`; a loop-efficiency badge sits in the
   bottom-right.
3. **Stream inventory + Processing methods** — two-column row.
4. **Risks & constraints + Recommended interventions** — two-column row using
   the existing `.pillUnmet` / `.pillPartial` / `.pillMet` semantics from
   `stageCard.module.css`.
5. **Closed-loop scenarios** — CSS scroll-snap carousel with 5 scenario tiles.
6. **Footer action bar** — three full-width buttons: "Edit vectors" (flips
   back to List view via `onSwitchToList`), "Run simulations" (disabled
   placeholder), "Export closed-loop report" (disabled placeholder).

The bento collapses to a single column under 640px, and the SVG can scroll
horizontally inside its 8px-padded wrap when the viewport drops below 560px.

## Files

**Modified:**
- `apps/web/src/features/plan/WasteVectorTool.tsx` — body replaced with hero
  + view-switcher chrome + branched view render.

**Added:**
- `apps/web/src/features/plan/WasteVectorListView.tsx` — lifted authoring
  form + list (behaviour-identical to pre-2026-05-21 `WasteVectorTool`).
- `apps/web/src/features/plan/WasteVectorTool.module.css` — segmented
  control chrome.
- `apps/web/src/features/plan/WasteVectorDashboardView.tsx` — six-panel
  bento shell.
- `apps/web/src/features/plan/WasteVectorDashboardView.module.css` — bento
  grid, KPI chip, SVG node, scenario scroll-snap and action-bar styles.

## Verification

- `tsc --noEmit` clean for all five files (the one pre-existing TS2322 in
  `StepBoundary.tsx:365` is out-of-scope).
- Vite HMR processed the new files with zero transform errors
  (`preview_logs` shows only ECONNREFUSED proxy errors against the API,
  which is a separate dev-env issue).
- Visual verification in-browser was not possible this session: the dev
  preview is locked behind `/login`, which can't complete because the local
  `@ogden/api` service is not running.

## Follow-ups (out of scope this session)

- Replace `// SAMPLE DATA` block in `WasteVectorDashboardView.tsx` with
  `closedLoopStore.materialFlows` + `compostInventoryStore` selectors, with
  derived `useMemo` per the 2026-04-26 selector-stability rule.
- Source KPI deltas from a future time-series store; today's `12% vs last
  month` etc. are decorative placeholders.
- Decide whether "Run simulations" and "Export closed-loop report" become
  real actions or are removed (the latter could route to the existing PDF
  export service per `wiki/entities/pdf-export-service.md`).
- Re-evaluate panel ordering once the dashboard renders with live data — the
  KPI strip may need to fold to two rows of three at 880px, and the scenarios
  row may want to absorb the action bar's "Run simulations" affordance.
