# 2026-04-30 — TransectVerticalRef non-standalone resolution + "Link to existing element"


### Done

Closed the only deferred follow-up from the morning's namespace-consolidation ADR. `TransectVerticalEditorCard` (PLAN Module 6) now resolves all four non-standalone `TransectVerticalRefKind` values (`water-system | polyculture | closed-loop | structure`) against their domain stores at render time, and the add-element form gains a "Link to existing element" mode alongside the existing standalone-sketch flow.

**Resolver (memoized over the 5 underlying project-filtered arrays):**
- `water-system` → `useWaterSystemsStore` (earthworks ∪ storageInfra); height via type-default lookup (swale 0.5 m / diversion 0.5 m / french_drain 0.3 m / cistern 2.5 m / pond 1.0 m / rain_garden 0.5 m); label = `notes ?? type`.
- `polyculture` → `usePolycultureStore` (guilds ∪ species); guild height = anchor species `matureHeightM` from `PLANT_DATABASE`; species height = species `matureHeightM`; label = `Guild.name` or species `commonName`.
- `closed-loop` → `useClosedLoopStore.fertilityInfra`; type-default lookup (composter 1.5 m / hugelkultur 1.2 m / biochar 0.8 m / worm_bin 0.5 m).
- `structure` → `useStructureStore`; height = `Structure.heightM ?? 3 m`; label = `name ?? type`.

**Render path:** SVG triangles get per-kind colour (amber/blue/green/brown/grey); resolved label printed above each triangle. Missing refs (orphaned `refId`s) render at a kind-default height with `(missing X)` label and an amber `⚠` warning in the elements list — no auto-remove (audit-trail convention, same as `actualsStore` ↔ `phaseStore.tasks`).

**Add-form:** Mode radio toggle. Standalone mode unchanged. Link mode: `Namespace` dropdown → kind-keyed `Element` dropdown populated from project-filtered store contents; per-kind empty-state messaging when the project has no candidates; Add disabled until `linkRefId` is selected.

**Verification:** `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` clean; `npx vite build` clean (24.58 s, 565 PWA precache entries). Single file modified, no schema/migration changes.

### Risks accepted
- Card now imports 5 stores (topography + waterSystems + polyculture + closedLoop + structure). Selector discipline preserved — each contributes one raw-array selector + one project-filter `useMemo`.
- Default heights are type-keyed constants, not per-instance fields. Override via standalone pin until/unless a steward requests per-instance `heightM` on `Earthwork` / `StorageInfra` / `FertilityInfra`.

ADR: [`wiki/decisions/2026-04-30-transect-vertical-ref-resolver.md`](decisions/2026-04-30-transect-vertical-ref-resolver.md). Closes the deferred follow-up from [`2026-04-30-site-annotations-store-scholar-aligned-namespaces.md`](decisions/2026-04-30-site-annotations-store-scholar-aligned-namespaces.md).
