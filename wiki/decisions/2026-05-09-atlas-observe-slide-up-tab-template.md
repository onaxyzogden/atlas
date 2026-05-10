# Atlas Observe Stage — Slide-up adopts Plan/Act peer-tab template

**Date:** 2026-05-09
**Status:** Accepted
**Context:** Atlas (`atlas/` submodule) — Observe stage `ModuleSlideUp`

---

## Decision

The Observe `ModuleSlideUp` is restructured to mirror the Plan/Act tabs-of-cards
template. Each module's pages — the existing Dashboard plus every Detail —
become independent peer tabs in a tabs row across the slide-up header. The
former `Dashboard` portal, in-sheet view stack, back chip, and `useDetailNav`
context are removed from the user-facing flow.

Page bodies are preserved verbatim — they are still functionalized,
store-wired, and styled by `observe-port.css`. What changed is the slide-up
chrome that hosts them and the dashboard tile-card buttons that previously
called `nav.push(...)`.

## Why

Plan and Act stages converged earlier on a flat peer-tab template
(`PlanModuleSlideUp` / `ActModuleSlideUp`) — sub-tools sit side-by-side under
a tab row, not nested beneath a Dashboard portal. Observe was the last stage
on the older Dashboard/Detail-with-back-chip pattern. Adopting the Plan/Act
template gives the operator a uniform mental model across all three stages:
the slide-up always shows peer cards, never a multi-level drill.

## Scope

- New constants in `apps/web/src/v3/observe/types.ts`:
  - `OBSERVE_MODULE_FULL_LABEL: Record<ObserveModule, string>` — parity
    with `PLAN_MODULE_FULL_LABEL`.
  - `OBSERVE_MODULE_CARDS: Record<ObserveModule, Array<{ label, sectionId }>>`
    — 22 cards across 7 modules (sectionId follows
    `observe-<module>-<page>` convention).
- Rewrite of `apps/web/src/v3/observe/components/ModuleSlideUp.tsx`:
  - 22 individual `lazy()` imports for Dashboard + each Detail.
  - Single `renderCard(sectionId)` switch.
  - `activeSectionId` state, reset on `module` change and on `open`
    transition.
  - Tabs row when `cards.length > 1`; suppressed for single-card modules
    (Built Environment) — same affordance as Plan modules with one card.
  - Keeps `observe-port` className + `import '../styles/observe-port.css'`
    so OLOS-port body styling continues to cascade unchanged.
- `ModuleSlideUp.module.css`: removed `.back` rule; added `.tabs`, `.tab`,
  `.tabActive` rules verbatim from `PlanModuleSlideUp.module.css`.
- 6 dashboard files — `useDetailNav` import and every `nav.push(...)` site
  removed; `HumanContextDashboard` callback props (`onAction`, `onSelect`)
  replaced with `() => {}` no-ops to keep types satisfied.

## Per-module cards

| Module | Cards |
|---|---|
| `human-context` | Dashboard · Steward Survey · Indigenous & Regional · Vision |
| `built-environment` | Dashboard (only) |
| `macroclimate-hazards` | Dashboard · Solar & Climate · Hazards Log |
| `topography` | Dashboard · Terrain · Cartographic · Cross-section |
| `earth-water-ecology` | Dashboard · Hydrology · Ecological · Jar / Perc / Roof |
| `sectors-zones` | Dashboard · Sector Compass · Cartographic |
| `swot-synthesis` | Dashboard · Journal · Diagnosis Report |

`CartographicDetail` is reused by both Topography and Sectors — one lazy
import wired to two `sectionId` cases (same dedup the legacy
`*Panel.tsx` manifests already encoded).

## Why preserve the legacy `*Panel.tsx` files

Per the user's "no deletion in revamps" rule (`memory/feedback_no_deletion.md`),
the seven `apps/web/src/v3/observe/modules/*Panel.tsx` manifests and the
`ModulePanel` / `DetailNavApi` interfaces in `modules/types.ts` are kept
in place even though `ModuleSlideUp` no longer imports them. They document
the canonical Dashboard/Detail mapping per module and remain available
should a future stage want to reintroduce the Dashboard-as-portal pattern.

## Why dashboard CTA buttons stay inert (option A)

The Dashboard tile cards (`TerrainToolCard`, `CrossSectionToolCard`, etc.)
double as portal buttons in the legacy flow. Two options were on the table
for the now-redundant CTAs:

- **A. Inert (chosen):** strip `onClick` handlers but keep the buttons
  visible. Lowest-risk diff, preserves the OLOS-port aesthetic, leaves
  the textual call to the next page intact.
- **B. Remove:** delete each tile card's CTA button entirely. Cleaner but
  bigger diff and risks dropping content the user wants visible.

Option A shipped first (commit `acabaec`); option B followed in
commit `4105ba4` after the operator confirmed the silent CTAs felt
like dead weight. All 14 inert buttons removed, plus the
`FooterTabs` helper and the `action`/`onAction` props on
`ModuleCardShell` in `HumanContextDashboard`. 110 lines deleted.

## Verification

- TypeScript: `tsc --noEmit` clean (with raised `--max-old-space-size`).
- Dev preview (port 5200):
  - Topography slide-up renders the four-tab row; clicking each tab swaps
    the body to Dashboard / Terrain / Cartographic / Cross-section.
  - Built Environment slide-up suppresses the tabs row (single card).
  - ESC, backdrop click, and close button all dismiss the sheet.
  - No console error about `useDetailNav must be used inside ModuleSlideUp`.
- Click semantics on the bottom `ObserveModuleBar` tile (inactive →
  navigate; active+closed → open slide-up; active+open → close) preserved.

## Risks accepted

- The 22 lazy imports in one file are verbose; if the page set grows further,
  collapse via a `Record<sectionId, () => Promise<...>>` lookup table —
  deferred until a sixth Detail per module forces it.
- Dashboard CTAs are inert (option A). If an operator clicks them expecting
  navigation, the affordance is silent. Tabs above the body are the new
  navigation surface.

## Files changed

```
apps/web/src/v3/observe/components/ModuleSlideUp.tsx        (rewrite)
apps/web/src/v3/observe/components/ModuleSlideUp.module.css (tabs rules + back removed)
apps/web/src/v3/observe/types.ts                            (FULL_LABEL + CARDS constants)
apps/web/src/v3/observe/modules/topography/TopographyDashboard.tsx              (strip useDetailNav)
apps/web/src/v3/observe/modules/macroclimate-hazards/MacroclimateDashboard.tsx  (strip useDetailNav)
apps/web/src/v3/observe/modules/sectors-zones/SectorsDashboard.tsx              (strip useDetailNav)
apps/web/src/v3/observe/modules/swot-synthesis/SwotDashboard.tsx                (strip useDetailNav)
apps/web/src/v3/observe/modules/human-context/HumanContextDashboard.tsx         (strip useDetailNav + no-op props)
apps/web/src/v3/observe/modules/earth-water-ecology/EarthWaterEcologyDashboard.tsx (strip useDetailNav)
```

Legacy `*Panel.tsx` files and `modules/types.ts` interfaces preserved.
