# 2026-05-09 — Observe slide-up adopts Plan/Act peer-tab template


Restructured `ModuleSlideUp` from the legacy Dashboard/Detail-with-back-chip
pattern (`useDetailNav` view stack) to the flat peer-tab template Plan and
Act already use. Each module's pages — Dashboard plus every Detail — are
now independent peer tabs in a tabs row across the slide-up header. Page
bodies are preserved verbatim. Decision recorded in
[decisions/2026-05-09-atlas-observe-slide-up-tab-template.md](decisions/2026-05-09-atlas-observe-slide-up-tab-template.md).

### What shipped

- `OBSERVE_MODULE_FULL_LABEL` + `OBSERVE_MODULE_CARDS` constants in
  `apps/web/src/v3/observe/types.ts`. 22 cards across 7 modules; sectionId
  follows `observe-<module>-<page>`.
- `ModuleSlideUp.tsx` rewrite: 22 individual `lazy()` imports, one
  `renderCard(sectionId)` switch, `activeSectionId` state reset on module
  change + open transition, tabs row when `cards.length > 1`. Single-card
  Built Environment renders without a tabs row (Plan precedent).
- `ModuleSlideUp.module.css`: removed `.back` rule, added `.tabs`/`.tab`/
  `.tabActive` rules verbatim from `PlanModuleSlideUp.module.css`.
- 6 dashboard files (Topography, Macroclimate, Sectors, SWOT, HumanContext,
  EarthWaterEcology) stripped of `useDetailNav` import and every
  `nav.push(...)` handler. CTA buttons kept inert (option A from plan).
  `HumanContextDashboard` required callback props replaced with `() => {}`
  no-ops to keep types satisfied.
- Legacy `*Panel.tsx` files and `modules/types.ts` interfaces preserved
  per "no deletion in revamps" rule.

### Verification

- TypeScript: `tsc --noEmit` clean (after raising
  `--max-old-space-size=8192`).
- Dev preview at port 5200:
  - Topography slide-up shows four-tab row; body swaps to Dashboard /
    Terrain / Cartographic / Cross-section.
  - Built Environment suppresses the tabs row (single card).
  - ESC, backdrop, close button all dismiss.
  - `ObserveModuleBar` click semantics (inactive→navigate;
    active+closed→open; active+open→close) preserved.

### Risks accepted

- Dashboard CTAs are now inert (option A). Tabs row is the navigation
  surface; if the silent CTA clicks feel awkward in practice, option B
  (delete the buttons) is a one-pass follow-up.
- 22 lazy imports in one file are verbose; collapse to a lookup table only
  when a sixth Detail per module forces it.
