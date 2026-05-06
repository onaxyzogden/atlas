# ADR: Atlas Observe Phase B Port — Styling via Wholesale-Scoped Port

**Date:** 2026-05-06
**Status:** accepted — closed (option 1 selected and shipped same day)
**Branch:** `feat/atlas-permaculture`
**Plan:** `~/.claude/plans/develop-a-version-of-hidden-truffle.md` (Phase B
extension on top of the Phase A scaffold plan)

## Context

Phase A (April 2026) shipped the Observe stage shell — `LandOsShell` re-frame,
`LevelNavigator` port, the slide-up sheet host, the bottom module-tile rail,
six placeholder module panels, and the `ModulePanel<DetailKey>` manifest
contract. Each placeholder rendered "Module pages arrive in Phase B" inside
the slide-up.

Phase B was the substance pass: replace those six placeholders with the real
ported pages from the OLOS reference build at
`C:\Users\MY OWN AXIS\Documents\OGDEN Land Operating System\src\pages` (~4,264
LOC of JSX across 18 dashboards/details).

Three scope decisions, confirmed before work began:

1. **Port to TypeScript.** No JSX-in-place — every page becomes `.tsx` under
   strict mode (`noUncheckedIndexedAccess`).
2. **Slide-up hosts the dashboard.** The slide-up (formerly empty) now mounts
   the per-module dashboard. Tiles are not "open a separate page" — they are
   "open this module's surface." URL stays at `/observe/$module`.
3. **Sub-navigation to details.** The OLOS source had a separate route per
   detail page (`/observe/topography/terrain-detail`, etc.). Atlas collapses
   that into a view-stack inside the sheet via `useDetailNav().push(key)` —
   the dashboard renders by default; pushing a key swaps in `details[key]`;
   the sheet header shows a back chip. No URL change.

A fourth standing instruction also bound this work: **"Do not delete anything
deprecated. It may be used in the other two stages."** All legacy 7-stage
components (`Discover`/`Diagnose` rails, `LifecycleProgressRing`, etc.) stay
in the repo as candidates for reuse by Plan and Act in Phase C.

## Decision

### What Phase B ported

| Module | Files |
|---|---|
| Human Context | `HumanContextDashboard` + `StewardSurveyDetail`, `IndigenousRegionalContextDetail`, `VisionDetail` |
| Macroclimate & Hazards | `MacroclimateDashboard` + `SolarClimateDetail`, `HazardsLogDetail` |
| Topography | `TopographyDashboard` + `TerrainDetail`, `CartographicDetail`, `CrossSectionDetail` |
| Earth, Water & Ecology | `EarthWaterEcologyDashboard` + `HydrologyDetail`, `EcologicalDetail`, `JarPercRoofDetail` |
| Sectors & Zones | `SectorsDashboard` + `SectorCompassDetail` (and shares `topography/CartographicDetail`) |
| SWOT Synthesis | `SwotDashboard` + `SwotJournal`, `SwotDiagnosisReport` |

Six manifest entry points (`modules/<Module>Panel.tsx`) export
`ModulePanel<DetailKey>` records. `ModuleSlideUp.tsx` lazy-imports them; the
existing slide-up plumbing required no changes.

### What was stripped from each OLOS source page

The reference pages each carry an internal app-shell (`AppShell`, `SideRail`,
`TopStageBar`, `QaOverlay`, `screenCatalog` lookups, plus a
`<footer className="diagnostics-footer">` strip with sync state). All of that
was removed during the port — it duplicates atlas chrome. Each dashboard root
collapses to `<div className="detail-page <module>-page">` with the page's
own internal sections preserved.

The SWOT pages additionally had three independent invented shells
(`swot-suite-shell`/`SwotSuiteRail`, `terralens-shell`/`TerraLensRail`,
`verdean-shell`/`VerdeanRail`) plus stage-bar / breadcrumb / process navs.
All three rails were stripped; only the centre content remains.

Per-page back-links (`<button className="back-link">Back to …</button>`) were
also dropped since the slide-up provides a back chip via `nav.pop()`.

### Cross-module sharing

`topography/CartographicDetail` is referenced by both `TopographyPanel` and
`SectorsZonesPanel`. The OLOS source had two near-identical cartographic
detail pages; collapsing to one canonical TS implementation reduces drift
risk and ~150 LOC of duplication.

### Detail-key naming inconsistency

We did not normalize detail keys. They follow the OLOS source segment names:

- B3 Topography: `terrain-detail`, `cartographic-detail`, `cross-section`
  (mostly `-detail` suffix)
- B4 Earth/Water/Ecology: `hydrology`, `ecological`, `jar-perc-roof` (no
  suffix)
- B5 Sectors: `sector-compass`, `cartographic` (no suffix)
- B6 SWOT: `journal`, `diagnosis-report` (no suffix)

This is keys-as-internal-state, not user-visible URLs. Acceptable now;
revisit if/when Phase C promotes details to URL segments (see Open Question).

## Styling — closed via option 1

Three options were enumerated:

1. **Port the OLOS stylesheet wholesale** and scope under `.observe-port`.
2. **Rewrite from atlas tokens.**
3. **Hybrid.** Scope the ported sheet, then progressively swap tokens.

**Decision:** option 1 — wholesale port, scoped — shipped same day.

### Implementation

A one-shot brace-walking transformer at
[scripts/scope-observe-styles.mjs](../../scripts/scope-observe-styles.mjs)
reads `C:/Users/MY OWN AXIS/Documents/OGDEN Land Operating System/src/styles.css`
and emits
[apps/web/src/v3/observe/styles/observe-port.css](../../apps/web/src/v3/observe/styles/observe-port.css).
The transform:

- Prefixes every top-level rule's selector list with `.observe-port`
  (comma-split, trim, prepend wrapper). 4,091 scoped rules in the output.
- Recurses into `@media` / `@supports` blocks; preserves nested rules with
  the same prefix.
- Rewrites the leading `:root { ... }` block as `.observe-port { ... }` so
  `--olos-*` tokens scope to the wrapper instead of cascading globally.
- **Strips three declarations** from the rewritten root block —
  `font-family: var(--olos-font-ui)`, `color: var(--olos-cream)`,
  `background: var(--olos-bg)` — which would have leaked outside the sheet
  via cascade if they remained on `.observe-port` itself. Inner OLOS rules
  apply the same tokens to specific descendants where needed.
- **Drops 3 rule blocks** with selectors `*` / `html` / `body` — atlas owns
  the document root.
- Preserves the leading `@import` (Cormorant Garamond + Inter via Google
  Fonts) untouched.

[ModuleSlideUp.tsx:34](../../apps/web/src/v3/observe/components/ModuleSlideUp.tsx)
imports `observe-port.css` once; the sheet root carries
`className={`${css.sheet} observe-port`}` so the cascade reaches every
ported dashboard and detail.

### Re-run after a reference-side update

```
node scripts/scope-observe-styles.mjs
```

### Verification

- `npx pnpm --filter @ogden/web typecheck` clean (re-run after styling pass).
- Dev preview: Topography dashboard, Terrain Detail, and SWOT Synthesis
  dashboard all render with full OLOS visual fidelity (Cormorant Garamond
  display, gold/green accents, dark forest-green canvas) inside the sheet.
- No leakage to atlas chrome (top app shell, decision rail, bottom tile
  rail) outside the sheet.

### Trade-offs accepted

- **Two design systems in the same app.** OLOS tokens (`--olos-*`) coexist
  with atlas's tokens. Acceptable while Observe is the only consumer.
- **Re-run cost on reference updates.** If the OLOS reference design
  changes, the script must be re-run; the diff is committed wholesale, not
  per-file. Acceptable while the reference design is frozen.
- **Token reconciliation deferred.** Option 3's progressive token-swap
  remains available as a follow-up if visual consistency between Observe
  and Plan/Act becomes a goal in later phases.

## Verification

- `npx pnpm --filter @ogden/web typecheck` clean after each B-step.
- All six manifests resolve through the `ModulePanel<DetailKey>` contract.
- No legacy components deleted or modified.

## Out of scope

- Wiring detail keys to URL segments (Phase C if deep-linking is required).
- Plan / Act stage content — still placeholders.
- Token reconciliation between OLOS and atlas (deferred — option 3
  available as follow-up).
