# Observe Stage

This folder hosts the Atlas **Observe** stage of the 3-stage lifecycle (Observe
/ Plan / Act). Phase A delivered the shell. Phase B (May 2026) filled the six
module surfaces with real ported pages — 18 dashboards/details totaling ~3,500
LOC of TypeScript, sourced from the OLOS reference design.

## Layout

```
observe/
├── ObserveLayout.tsx           Route component for /v3/project/$id/observe/$module
├── ObserveLayout.module.css
├── types.ts                    LifecycleLevel + ObserveModule + label/registry
├── assets/                     Per-module PNGs imported by detail components
├── components/
│   ├── ObserveBottomRail.tsx   6 module tiles (collapsible, persisted)
│   ├── ObserveBottomRail.module.css
│   ├── ModuleSlideUp.tsx       Bottom-anchored sheet hosting per-module pages
│   └── ModuleSlideUp.module.css
├── modules/
│   ├── types.ts                ModulePanel<DetailKey> contract
│   ├── HumanContextPanel.tsx          ─┐
│   ├── MacroclimateHazardsPanel.tsx    │  Six manifest entry points,
│   ├── TopographyPanel.tsx             │  one per module, exporting a
│   ├── EarthWaterEcologyPanel.tsx      │  ModulePanel<DetailKey>.
│   ├── SectorsZonesPanel.tsx           │
│   ├── SwotSynthesisPanel.tsx         ─┘
│   ├── human-context/                 Dashboard + 3 details
│   ├── macroclimate-hazards/          Dashboard + 2 details
│   ├── topography/                    Dashboard + 3 details (Cartographic shared with Sectors)
│   ├── earth-water-ecology/           Dashboard + 3 details
│   ├── sectors-zones/                 Dashboard + 1 detail (+ shared Cartographic)
│   └── swot-synthesis/                Dashboard + 2 details
├── rails/
│   ├── ObserveRail.tsx         Right-rail content (checklist + notes tab strip)
│   └── ObserveRail.module.css
└── tools/
    ├── ObserveTools.tsx        Left tools panel (module-aware)
    └── ObserveTools.module.css
```

## Module manifest contract

Every module exports a `ModulePanel<DetailKey>` from
`modules/<Module>Panel.tsx`:

```ts
import type { ModulePanel } from './types.js';
import Dashboard from './topography/TopographyDashboard.js';
import TerrainDetail from './topography/TerrainDetail.js';
// …

type DetailKey = 'terrain-detail' | 'cartographic-detail' | 'cross-section';

const panel: ModulePanel<DetailKey> = {
  Dashboard,
  details: {
    'terrain-detail': TerrainDetail,
    'cartographic-detail': CartographicDetail,
    'cross-section': CrossSectionDetail,
  },
  detailLabels: {
    'terrain-detail': 'Terrain Detail',
    'cartographic-detail': 'Cartographic Detail',
    'cross-section': 'Cross-section Tool',
  },
};
export default panel;
```

The slide-up host (`components/ModuleSlideUp.tsx`) lazy-imports each manifest,
mounts `Dashboard` by default, and renders `details[key]` when the dashboard
calls `useDetailNav().push(key)`. URL stays at `/observe/$module` — detail
navigation is local-state only, intentional.

## Module registry

The module list is defined once in `types.ts`:

```ts
export const OBSERVE_MODULES = [
  'human-context',
  'macroclimate-hazards',
  'topography',
  'earth-water-ecology',
  'sectors-zones',
  'swot-synthesis',
] as const;
```

Three places consume the registry. **All three must stay in sync** when adding,
removing, or renaming a module:

1. **`OBSERVE_MODULES` / `OBSERVE_MODULE_LABEL` in `types.ts`** — the source of
   truth.
2. **`MODULE_ICON` in `components/ObserveBottomRail.tsx`** — Lucide icon per
   module slug.
3. **`MODULE_PANELS` in `components/ModuleSlideUp.tsx`** — lazy-import map of
   manifests.

## Active module is URL-driven; details are local

The active module comes from the `$module` route param. The slide-up open/
close state and the active **detail** within that module are local to the
slide-up host. Closing the sheet **does not navigate** — the URL stays at
`/observe/<module>` and the canvas + tools + rail keep reflecting that module.

Clicking a tile in `ObserveBottomRail` both navigates and opens the sheet.

## Cross-module sharing

`topography/CartographicDetail` is shared: the Sectors & Zones manifest imports
the same component and registers it under its own detail key. This was an
intentional trade — the OLOS source had two near-identical cartographic detail
pages, and one canonical TS implementation is easier to evolve than two.

## Styling

Each component owns a co-located CSS Module (`Foo.module.css`) imported by
its TSX. Shared tokens (`--olos-*`, fonts, `--olos-focus-ring`, etc.) live
in the global OLOS token sheet; see app-level styles for the source of
truth.

The original wholesale OLOS port (`styles/observe-port.css` scoped under
`.observe-port` via `scripts/scope-observe-styles.mjs`) was retired once
every consumed selector had been migrated into a co-located module. The
22 k-line generated stylesheet, the `.observe-port` wrapper on the slide-
up root, and the generator script are all gone.

See [wiki/decisions/2026-05-06-atlas-observe-port-styling.md](../../../../../../wiki/decisions/2026-05-06-atlas-observe-port-styling.md)
for the original wholesale-port decision (historical) and the follow-up
migration to per-component CSS Modules.

## What lives where outside this folder

- **LevelNavigator** — `apps/web/src/components/LevelNavigator/` — the top-of-
  content level switcher. Mounted by `ObserveLayout` (not by the outer shell)
  so legacy 7-stage routes that still mount under `V3ProjectLayout` remain
  unaffected.
- **DecisionRail** — `apps/web/src/v3/components/DecisionRail.tsx` — dispatches
  to `ObserveRail` when stage is `'observe'`.
- **Routes** — `apps/web/src/routes/index.tsx` — `v3ObserveModuleRoute`,
  `v3ObserveIndexRoute` (redirect to `human-context`), `v3PlanRoute`, and
  `v3ActRoute`. Legacy `discover` and `diagnose` routes redirect to
  `observe/human-context`.

## Legacy components — preserved on purpose

The remaining 7-stage components (`DesignPage`, `ProvePage`, `BuildPage`,
`OperatePage`, `ReportPage`, their rails, and `LifecycleProgressRing`)
**remain in the repo**. They are candidates for reuse inside Plan and Act
surfaces in Phase C. Do not delete them.

`DiscoverPage` and `DiagnosePage` were retired on 2026-05-21 — their
content had already been reshaped into Observe modules and the routes
had been redirecting to `observe/human-context` for some time; the dead
page components plus their unique siblings (`DiagnosePage.module.css`,
`WindSectorsOverlay`, `SectorsOverlay`) were removed in the same session
that consolidated the `wind` / `hazards` / `views` matrix-toggle keys
into the unified `sectors` key. See ADR
[`wiki/decisions/2026-05-21-atlas-observe-sector-compass-hud.md`](../../../../wiki/decisions/2026-05-21-atlas-observe-sector-compass-hud.md).

The legacy `design`/`prove`/`build`/`operate`/`report` routes are still
preserved and continue to mount their existing components.
