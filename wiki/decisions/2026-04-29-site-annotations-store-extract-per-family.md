# ADR: Extract `siteAnnotationsStore` into per-family stores (v3 → v4 split)

**Date:** 2026-04-29
**Status:** superseded by [`2026-04-30-site-annotations-store-scholar-aligned-namespaces.md`](2026-04-30-site-annotations-store-scholar-aligned-namespaces.md) — Permaculture Scholar review redirected the architecture from 13 per-family stores (pure file segregation) to 7 Scholar-aligned namespace stores (Holmgren P8: Integrate Rather Than Segregate). This file retained for historical reference only.
**Branch:** `feat/atlas-permaculture` (or follow-up branch after ACT lands)
**Predecessors:**
- `2026-04-29-observe-stage-ia-restructure.md` (created the store, v1)
- `2026-04-29-plan-stage-ia-restructure.md` (v1 → v2, +5 PLAN families)
- `2026-04-29-act-stage-ia-restructure.md` (v2 → v3, +`wasteVectorRuns`,
  +`HazardEvent.mitigationSteps` / `linkedFeatureIds`)

## Context

`siteAnnotationsStore.ts` was introduced as the canonical home for
user-authored OBSERVE-stage annotations and grew across the three IA
restructures (OBSERVE → PLAN → ACT). It now holds **12 families** in a
single Zustand `persist` blob keyed `ogden-site-annotations` v3:

| # | Family | Stage | Shape |
|---|---|---|---|
| 1 | `hazards` | OBSERVE (+ACT mitigation overlay) | `HazardEvent[]` |
| 2 | `transects` | OBSERVE | `Transect[]` |
| 3 | `sectors` | OBSERVE | `SectorArrow[]` |
| 4 | `ecology` | OBSERVE | `EcologyObservation[]` |
| 5 | `successionStageByProject` | OBSERVE | `Record<projectId, SuccessionStage>` |
| 6 | `swot` | OBSERVE (+ACT continuous lens) | `SwotEntry[]` |
| 7 | `waterFlows` | PLAN | `WaterFlow[]` |
| 8 | `pollutionSources` | PLAN | `PollutionSource[]` |
| 9 | `structures` | PLAN | `SiteStructure[]` |
| 10 | `foodInfra` | PLAN | `FoodInfraNode[]` |
| 11 | `wasteVectors` | PLAN | `WasteVector[]` |
| 12 | `wasteVectorRuns` | ACT | `WasteVectorRun[]` |

The risk was flagged in the PLAN ADR ("god-store") and acknowledged again
in the ACT ADR ("now real"). With all three stage IAs landed and the
family list stable, the conditions for extraction are met:

**Concrete pain points:**
- File length: 476 lines, ~140 of which are `migrate()` v1→v2→v3 plumbing.
  Adding a 13th family means another version bump on the entire blob.
- Blast radius: 26 consumer files import from one module; any change to
  the file (even a typo in an unrelated family) triggers the entire
  module's HMR re-evaluation in dev and a full re-import in prod.
- Selector surface: `useSiteAnnotationsStore` exposes 50+ actions in a
  single namespace; IDE autocomplete is noisy.
- Test isolation: vitest specs that hydrate one family currently rehydrate
  the whole blob.
- Persistence churn: any write to any family rewrites the entire
  serialised blob to localStorage (single `setItem` per change).

**Why now (vs. earlier):**
- Family list is stable. No spec-driven additions queued — OBSERVE/PLAN/ACT
  surfaces are complete.
- Migration shapes are known. The v1→v2→v3 paths are already in the file,
  so the v3→split forward path can be derived mechanically from them.
- Selector discipline (subscribe-then-derive, ADR
  `2026-04-26-zustand-selector-stability`) is in force across all 26
  consumers; per-family stores follow the same pattern with no consumer
  rewrites beyond import-path updates.

## Decision

Split `siteAnnotationsStore` into **12 per-family stores**, all under
`apps/web/src/store/site-annotations/`. Each new store is a thin Zustand
`persist` module with its own key and version. The umbrella file is
deleted; consumers import the specific store they need.

### New store files (one per family)

All paths under `apps/web/src/store/site-annotations/`:

| File | Persist key | Hook | Shape |
|---|---|---|---|
| `hazardsStore.ts` | `ogden-hazards` v1 | `useHazardsStore` | `{ hazards: HazardEvent[] }` |
| `transectsStore.ts` | `ogden-transects` v1 | `useTransectsStore` | `{ transects: Transect[] }` |
| `sectorsStore.ts` | `ogden-sectors` v1 | `useSectorsStore` | `{ sectors: SectorArrow[] }` |
| `ecologyStore.ts` | `ogden-ecology` v1 | `useEcologyStore` | `{ ecology: EcologyObservation[] }` |
| `successionStageStore.ts` | `ogden-succession-stage` v1 | `useSuccessionStageStore` | `{ byProject: Record<string, SuccessionStage> }` |
| `swotStore.ts` | `ogden-swot` v1 | `useSwotStore` | `{ swot: SwotEntry[] }` |
| `waterFlowsStore.ts` | `ogden-water-flows` v1 | `useWaterFlowsStore` | `{ waterFlows: WaterFlow[] }` |
| `pollutionStore.ts` | `ogden-pollution` v1 | `usePollutionStore` | `{ sources: PollutionSource[] }` |
| `structuresAnnotationsStore.ts` | `ogden-structures-annotations` v1 | `useStructuresAnnotationsStore` | `{ structures: SiteStructure[] }` |
| `foodInfraStore.ts` | `ogden-food-infra` v1 | `useFoodInfraStore` | `{ nodes: FoodInfraNode[] }` |
| `wasteVectorsStore.ts` | `ogden-waste-vectors` v1 | `useWasteVectorsStore` | `{ vectors: WasteVector[] }` |
| `wasteVectorRunsStore.ts` | `ogden-waste-vector-runs` v1 | `useWasteVectorRunsStore` | `{ runs: WasteVectorRun[] }` |

Naming notes:
- `structuresAnnotationsStore` is named to disambiguate from the existing
  `structureStore` (drawn-on-map structures); the two never merge.
- `successionStageStore` keeps its top-level field renamed `byProject` to
  match the rest of the codebase's project-keyed-record convention.

### Type re-exports
A shim file `apps/web/src/store/site-annotations/index.ts` re-exports every
type (`HazardEvent`, `HazardType`, `Transect`, `SectorArrow`, ...) so
consumers can do `import type { HazardEvent } from '../../store/site-annotations'`
without coupling to a specific store file. Hooks are *not* re-exported
through the barrel — consumers import each hook directly to keep the
dependency graph explicit.

### Migration path (one-time, runs on first load after deploy)

A new module `apps/web/src/store/site-annotations/migrateV3Split.ts`
exports `migrateLegacyBlob()`, which runs **once** at app boot before any
of the new stores rehydrate:

```ts
export function migrateLegacyBlob() {
  const raw = localStorage.getItem('ogden-site-annotations');
  if (!raw) return; // already migrated or never used
  try {
    const parsed = JSON.parse(raw) as { state: LegacyV3State; version: number };
    if (parsed.version !== 3) return; // safety: don't touch non-v3 blobs
    const s = parsed.state;

    seed('ogden-hazards',                { hazards: s.hazards ?? [] });
    seed('ogden-transects',              { transects: s.transects ?? [] });
    seed('ogden-sectors',                { sectors: s.sectors ?? [] });
    seed('ogden-ecology',                { ecology: s.ecology ?? [] });
    seed('ogden-succession-stage',       { byProject: s.successionStageByProject ?? {} });
    seed('ogden-swot',                   { swot: s.swot ?? [] });
    seed('ogden-water-flows',            { waterFlows: s.waterFlows ?? [] });
    seed('ogden-pollution',              { sources: s.pollutionSources ?? [] });
    seed('ogden-structures-annotations', { structures: s.structures ?? [] });
    seed('ogden-food-infra',             { nodes: s.foodInfra ?? [] });
    seed('ogden-waste-vectors',          { vectors: s.wasteVectors ?? [] });
    seed('ogden-waste-vector-runs',      { runs: s.wasteVectorRuns ?? [] });

    // Rename — don't delete — for rollback safety.
    localStorage.setItem('ogden-site-annotations.archived-v3', raw);
    localStorage.removeItem('ogden-site-annotations');
  } catch {
    // Corrupt blob — leave it alone; new stores rehydrate empty.
  }
}

function seed(key: string, state: unknown) {
  // Only seed if the per-family key is empty — never overwrite a store
  // that has already rehydrated (idempotent + safe on partial rollouts).
  if (localStorage.getItem(key) !== null) return;
  localStorage.setItem(key, JSON.stringify({ state, version: 1 }));
}
```

Wired in `apps/web/src/main.tsx` (or equivalent boot module) **before**
`<App />` renders. Synchronous, single-pass over `localStorage`. Idempotent
— a second run is a no-op because the legacy key is gone.

The legacy blob is **renamed** to `ogden-site-annotations.archived-v3`, not
deleted, so a steward can roll back manually if a regression slips through.
A follow-up plan removes the archive after one stable release cycle.

### Consumer updates (26 files)

Mechanical search-and-replace across the 26 consumer files identified
during the ACT restructure. Pattern:

```ts
// Before
import { useSiteAnnotationsStore, type HazardEvent } from '../../store/siteAnnotationsStore.js';
const hazards = useSiteAnnotationsStore((s) => s.hazards);
const addHazard = useSiteAnnotationsStore((s) => s.addHazard);

// After
import { useHazardsStore } from '../../store/site-annotations/hazardsStore.js';
import type { HazardEvent } from '../../store/site-annotations';
const hazards = useHazardsStore((s) => s.hazards);
const addHazard = useHazardsStore((s) => s.addHazard);
```

Selector-stability rules (raw `state.x` + `useMemo`) carry over
unchanged. No card needs new logic.

### Files retired
- `apps/web/src/store/siteAnnotationsStore.ts` — deleted after the 26
  consumers are migrated and tests are green.

## Consequences

**Positive**
- Each family isolated: edits to one don't trigger HMR / re-import on the
  other 11.
- Per-family persistence: a write to `swot` no longer rewrites
  `wasteVectors`. Lower localStorage churn.
- Selector autocomplete: `useHazardsStore` exposes ~6 actions instead of
  the 50+ on `useSiteAnnotationsStore`.
- Test isolation: vitest specs hydrate one family without ghost data from
  the other 11.
- Future schema changes are local: bumping `hazardsStore` to v2 doesn't
  require a migration on the other 11 stores.
- The `entities/site-annotations-store.md` wiki page can split into 12
  per-family pages (or one umbrella page that links to the stores), giving
  finer-grained graphify ingestion.

**Risks accepted**
- One-time migration risk: `migrateLegacyBlob()` runs on every steward's
  next session. The archive-rather-than-delete strategy + idempotency +
  the explicit `parsed.version !== 3` guard are the mitigations. A test
  fixture covers v3 blobs from each of the OBSERVE/PLAN/ACT shapes.
- 26 consumer files touched in one PR (or batched per-family across a
  short series). Mitigation: the ESLint `no-restricted-imports` rule on
  the old `siteAnnotationsStore` path catches stragglers.
- Type-export barrel risk: `site-annotations/index.ts` is import-cycle-free
  by construction (types only, no hook re-exports), but a future
  contributor could break it. Mitigation: a vitest spec asserts the
  barrel re-exports exactly the documented type names.
- Cross-family invariants (e.g. `wasteVectorRuns[i].vectorId` references
  a `wasteVectors[j].id`) now span two stores. Today these are validated
  at read-time by the consumer card (`WasteRoutingChecklistCard`); no
  store-level FK enforcement is added in this ADR. Cross-store integrity
  remains the consumer's responsibility — same as the existing
  `actualsStore` ↔ `phaseStore.tasks` relationship.

**Out of scope**
- Backend persistence of any of the 12 families (still `localStorage`-only).
- Splitting other multi-family stores (e.g. `phaseStore` carries `phases` +
  `tasks` + `comments`). Out of scope; addressed if and when the same
  pain emerges.
- Renaming `structureStore` ↔ `structuresAnnotationsStore` to remove the
  near-collision. Considered, deferred — `structureStore` is map-drawing,
  `structuresAnnotationsStore` is OBSERVE/PLAN annotation; they serve
  different surfaces and the suffix already disambiguates.

## Verification (planned)

- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` — zero new errors.
- `npx vite build` — clean.
- `npx vitest run` — green; new specs:
  - `migrateV3Split.test.ts` — feeds a v3 blob with all 12 families
    populated, asserts each new key is seeded and the old key is renamed;
    asserts idempotency (second run is no-op); asserts non-v3 blobs are
    left alone.
  - `barrel-types.test.ts` — asserts the documented type names are
    exported from `site-annotations/index.ts`.
- Manual walkthrough on a fresh project + a project with all 12 families
  populated:
  - Steward with v3 data sees zero data loss after first reload post-deploy.
  - DevTools → Application → Local Storage shows 12 new `ogden-*` keys +
    one `ogden-site-annotations.archived-v3` archive entry.
  - All 26 consumer surfaces render unchanged.
- ESLint rule added to `eslint.config.js`:
  ```js
  'no-restricted-imports': ['error', {
    paths: [{
      name: '../../store/siteAnnotationsStore',
      message: 'Import from store/site-annotations/<family>Store instead.',
    }],
  }]
  ```

## Files touched (planned)

**New (14):**
- `apps/web/src/store/site-annotations/index.ts` — type-only barrel.
- `apps/web/src/store/site-annotations/migrateV3Split.ts` — one-time
  legacy-blob migrator.
- `apps/web/src/store/site-annotations/hazardsStore.ts`,
  `transectsStore.ts`, `sectorsStore.ts`, `ecologyStore.ts`,
  `successionStageStore.ts`, `swotStore.ts`, `waterFlowsStore.ts`,
  `pollutionStore.ts`, `structuresAnnotationsStore.ts`,
  `foodInfraStore.ts`, `wasteVectorsStore.ts`, `wasteVectorRunsStore.ts`.

**Modified:**
- `apps/web/src/main.tsx` — call `migrateLegacyBlob()` before mount.
- `eslint.config.js` — `no-restricted-imports` guard on the deleted path.
- 26 consumer files — import-path swaps (no logic changes).

**Retired:**
- `apps/web/src/store/siteAnnotationsStore.ts` — deleted.

**Wiki:**
- `wiki/entities/site-annotations-store.md` — replaced by 12 per-family
  pages under `wiki/entities/site-annotations/` (or condensed to one
  umbrella linking to all 12).
- `wiki/entities/web-app.md` — store list updated.
- `wiki/log.md` — session entry filed on landing.
- `wiki/index.md` — ADR row added (status flipped `proposed → accepted`).

## Rollback plan

If a regression surfaces post-deploy:
1. Revert the consumer-import PR.
2. Restore `siteAnnotationsStore.ts` from git history.
3. In `main.tsx`, replace `migrateLegacyBlob()` with a one-time
   `restoreLegacyBlob()` that reads `ogden-site-annotations.archived-v3`
   back to `ogden-site-annotations` and removes the 12 new keys.
4. The archive is retained for one full release cycle for exactly this
   reason.
