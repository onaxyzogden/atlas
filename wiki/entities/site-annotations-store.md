# Site Annotations — 7 Scholar-Aligned Namespace Stores
**Type:** Zustand store family
**Status:** active
**Path:** `apps/web/src/store/{externalForces,topography,ecology,waterSystems,polyculture,closedLoop,swot}Store.ts`

## Purpose
Persisted user-authored annotations across the OBSERVE / PLAN / ACT IA
cycle, decomposed into seven Scholar-aligned namespaces. Replaces the
v3 monolithic `siteAnnotationsStore.ts` per
[2026-04-30 Scholar-Aligned Namespaces](../decisions/2026-04-30-site-annotations-store-scholar-aligned-namespaces.md).

## Stores

| # | Store | Persist key (v1) | Holds | Permaculture basis |
|---|---|---|---|---|
| 1 | `useExternalForcesStore` | `ogden-external-forces` | `hazards`, `sectors` | Mollison: hazards = extreme manifestations of sector energies |
| 2 | `useTopographyStore` | `ogden-topography` | `transects` (with new `verticalRefs?: TransectVerticalRef[]`) | OBSERVE base-map equivalence |
| 3 | `useEcologyStore` | `ogden-ecology` | `ecology`, `successionStageByProject` | PDC W8-10: succession is the temporal dimension of ecology |
| 4 | `useWaterSystemsStore` | `ogden-water-systems` | `earthworks`, `storageInfra` | Yeomans Keyline: water as one foundational scale |
| 5 | `usePolycultureStore` | `ogden-polyculture` | `guilds`, `species` | Holmgren P8 + PDC W7: palette ↔ assembly |
| 6 | `useClosedLoopStore` | `ogden-closed-loop` | `wasteVectors`, `wasteVectorRuns`, `fertilityInfra` | Holmgren P4 + P6: design intent + feedback + nutrient destinations |
| 7 | `useSwotStore` | `ogden-swot` | `swot` | Strategic-reflection (kept separate per user decision) |

## Key Files
- The 7 store files above — each ~40-100 lines; Zustand `persist`,
  `useXStore.persist.rehydrate()` at module bottom.
- `site-annotations.ts` — type-only barrel re-exporting all canonical
  types + the shared `newAnnotationId(prefix)` helper relocated from
  the legacy file. Hooks are *not* re-exported.
- `site-annotations-migrate.ts` — exports `migrateLegacyBlob(storage?)`.
  Called from `apps/web/src/main.tsx` before mount. Idempotent;
  archives the legacy blob as `ogden-site-annotations.archived-v3`
  rather than deleting.

## `Transect.verticalRefs` schema (Topography store)

Replaces legacy inline `verticalElements`. Discriminated union refs
into the appropriate domain store:

```ts
type TransectVerticalRefKind =
  | 'standalone'    // synthetic pin (today's UX)
  | 'water-system'  // refs Earthwork / StorageInfra
  | 'polyculture'   // refs Guild / SpeciesPick
  | 'closed-loop'   // refs FertilityInfra
  | 'structure';    // refs structureStore.Structure

interface TransectVerticalRef {
  id: string;
  distanceAlongTransectM: number;
  kind: TransectVerticalRefKind;
  refId?: string;                                // present unless 'standalone'
  standalone?: { type: VerticalElementType; heightM: number; label?: string };
}
```

Migrator transforms each legacy `VerticalElement` into a `kind:
'standalone'` ref. Lossless. `TransectVerticalEditorCard` continues to
create `kind: 'standalone'` pins and renders them; non-standalone
resolution is deferred to a follow-up ADR.

## Dependencies
- `zustand` + `zustand/middleware/persist`
- Read by 24 consumer surfaces across `features/act/`,
  `features/observe/`, `features/plan/`, `features/map/`. Hub views
  (`ActHub`, `ObserveHub`, `PlanHub`) and `PermanenceScalesCard` are
  inherently cross-namespace and import 3-7 stores; single-purpose
  cards each touch one namespace.
- Independent of `siteDataStore` (fetch-driven layer cache) and
  `soilSampleStore`.

## Migration

`migrateLegacyBlob()` runs once at boot:
1. Reads `ogden-site-annotations` blob (or returns silently if absent
   / non-v3 / corrupt).
2. Distributes the 13 fields across the 7 new keys via `seed()`
   (which never overwrites a key that has already rehydrated).
3. Renames the legacy key to `ogden-site-annotations.archived-v3` for
   manual rollback.

Vitest spec: `apps/web/src/tests/siteAnnotationsMigrate.test.ts` (8 tests).

## Notes
- All entries project-scoped via `projectId`; consumers filter via
  subscribe-then-derive (raw store array → `useMemo` filter) per
  [2026-04-26 Zustand Selector Stability](../decisions/2026-04-26-zustand-selector-stability.md).
- Cross-namespace integrity is the consumer's responsibility (e.g.
  `wasteVectorRuns[i].vectorId` ↔ `wasteVectors[j].id` — both live
  in `closedLoopStore`, so no cross-store FK).
- The Scholar's "Human/Built Infrastructure" namespace is covered by
  the existing `structureStore` (map-drawing buildings registry) —
  not part of this family.
- The legacy `siteAnnotationsStore.ts` is deleted; tsc serves as the
  regression guard against re-introducing the old import path.
