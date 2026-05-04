# ADR: Consolidate `siteAnnotationsStore` into 7 Scholar-aligned namespace stores

**Date:** 2026-04-30
**Status:** accepted
**Branch:** `feat/atlas-permaculture`
**Supersedes:** [`2026-04-29-site-annotations-store-extract-per-family.md`](2026-04-29-site-annotations-store-extract-per-family.md) (proposed; never landed)
**Predecessors:**
- [`2026-04-29-observe-stage-ia-restructure.md`](2026-04-29-observe-stage-ia-restructure.md) (created the store, v1)
- [`2026-04-29-plan-stage-ia-restructure.md`](2026-04-29-plan-stage-ia-restructure.md) (v1 → v2, +5 PLAN families)
- [`2026-04-29-act-stage-ia-restructure.md`](2026-04-29-act-stage-ia-restructure.md) (v2 → v3, +`wasteVectorRuns`,
  +`HazardEvent.mitigationSteps` / `linkedFeatureIds`)

## Context

`siteAnnotationsStore.ts` accumulated **13 user-authored families** in a
single Zustand `persist` blob keyed `ogden-site-annotations` v3 across the
three IA restructures (OBSERVE → PLAN → ACT). The "god-store" risk was
flagged in the PLAN ADR and acknowledged in the ACT ADR; with all three
stage IAs landed and the family list stable, the conditions for extraction
were met.

The originally-proposed follow-up (the 2026-04-29 *proposed* ADR being
superseded here) called for **13 per-family stores** — one store per
existing field. Before executing, the Permaculture Scholar reviewed the
cleavage planes and pushed back hard against pure file-level segregation,
citing **Holmgren P8 (Integrate Rather Than Segregate):** a 13-way split
encodes false dichotomies and severs the relational connections that make
the system a permaculture design tool rather than a snapshot tool.

**Scholar's specific reasoning:**

| Pair | Verdict | Source basis |
|---|---|---|
| Hazards + Sectors | **Merge** — hazards are extreme manifestations of sector energies | Mollison *Designers' Manual*: sectors include "storms, wildfire, frost" alongside sunshine and wind |
| Earthworks + StorageInfra | **Merge** — water movement and water storage are halves of one hydrological respiratory system | Yeomans Keyline Scales: "Water" is one foundational layer above all others |
| Guilds + SpeciesPicks | **Merge** — guilds compose from species; severing the palette from the assembly breaks the layered food forest | Holmgren P8 + PDC Week 7 polyculture material |
| WasteVectors + WasteVectorRuns + FertilityInfra | **Merge** — design intent + operational feedback + nutrient destinations form one closed loop | Holmgren P4 (Self-regulation & Feedback) + P6 (Produce No Waste) |
| Ecology + SuccessionStage | **Merge** — succession is the temporal dimension of ecology | PDC Week 8-10 succession material |
| Transects ↔ VerticalElements | **Split** — transect is OBSERVE topography, vertical elements are PLAN interventions; today's inline copies risked duplicating data already living in domain stores | Mollison cross-section + base-map equivalence |

SWOT remains its own namespace (strategic-reflection, not a permaculture
domain entity). VerticalElement decoupling was included in this work
(not deferred) so the legacy → new boot migration runs once.

## Decision

Replaced the monolithic `siteAnnotationsStore` with **7 namespace stores**
sitting peer-to-peer with the existing `phaseStore` / `cropStore` /
`zoneStore` / `structureStore` / `pathStore` family in
`apps/web/src/store/`:

| # | New store | Persist key (v1) | Holds |
|---|---|---|---|
| 1 | `useExternalForcesStore` (`externalForcesStore.ts`) | `ogden-external-forces` | `hazards: HazardEvent[]`, `sectors: SectorArrow[]` |
| 2 | `useTopographyStore` (`topographyStore.ts`) | `ogden-topography` | `transects: Transect[]` (with new `verticalRefs?: TransectVerticalRef[]`) |
| 3 | `useEcologyStore` (`ecologyStore.ts`) | `ogden-ecology` | `ecology: EcologyObservation[]`, `successionStageByProject: Record<string, SuccessionStage>` |
| 4 | `useWaterSystemsStore` (`waterSystemsStore.ts`) | `ogden-water-systems` | `earthworks: Earthwork[]`, `storageInfra: StorageInfra[]` |
| 5 | `usePolycultureStore` (`polycultureStore.ts`) | `ogden-polyculture` | `guilds: Guild[]`, `species: SpeciesPick[]` |
| 6 | `useClosedLoopStore` (`closedLoopStore.ts`) | `ogden-closed-loop` | `wasteVectors: WasteVector[]`, `wasteVectorRuns: WasteVectorRun[]`, `fertilityInfra: FertilityInfra[]` |
| 7 | `useSwotStore` (`swotStore.ts`) | `ogden-swot` | `swot: SwotEntry[]` |

The existing `structureStore` (map-drawing buildings registry) covers the
Scholar's "Human/Built Infrastructure" namespace — out of scope here.

### `Transect.verticalElements` → `Transect.verticalRefs` schema change

Old shape (inline copy):
```ts
interface VerticalElement {
  id: string;
  type: 'structure' | 'tree' | 'shrub' | 'swale' | 'pond';
  distanceAlongTransectM: number;
  heightM: number;
  label?: string;
}
// On Transect: verticalElements?: VerticalElement[]
```

New shape (Scholar P8 alignment — discriminated refs into domain stores,
with a `standalone` fallback for speculative pins):
```ts
type TransectVerticalRefKind =
  | 'standalone'    // synthetic pin (today's behavior)
  | 'water-system'  // refs Earthwork.id or StorageInfra.id
  | 'polyculture'   // refs SpeciesPick.id or Guild.id
  | 'closed-loop'   // refs FertilityInfra.id
  | 'structure';    // refs structureStore.Structure.id

interface TransectVerticalRef {
  id: string;
  distanceAlongTransectM: number;
  kind: TransectVerticalRefKind;
  refId?: string;                                // present unless kind === 'standalone'
  standalone?: { type: VerticalElementType; heightM: number; label?: string };
}
```

Migration of existing transects: every legacy
`VerticalElement { id, type, distanceAlongTransectM, heightM, label }`
becomes `{ id, distanceAlongTransectM, kind: 'standalone',
standalone: { type, heightM, label } }`. Lossless.

`TransectVerticalEditorCard` continues to create `kind: 'standalone'` pins
via its existing "Add element" form; render path is `kind === 'standalone'`
only and falls through for non-standalone refs (a future ADR adds the
"Link to existing element" affordance and resolves refs against the
appropriate domain store).

### One-time legacy-blob migrator

`apps/web/src/store/site-annotations-migrate.ts` exports
`migrateLegacyBlob(storage?: Storage)`, called from
`apps/web/src/main.tsx` **before** `<App />` renders. Synchronous,
single-pass over `localStorage`. Idempotent — a second run is a no-op
because the legacy key is gone, and `seed()` never overwrites a key that
has already rehydrated.

The legacy blob is **archived as `ogden-site-annotations.archived-v3`**,
not deleted, so a steward can roll back manually if a regression slips
through. A follow-up plan removes the archive after one stable release
cycle.

### Type re-exports + shared helper

`apps/web/src/store/site-annotations.ts` is a **type-only barrel** that
re-exports the canonical types from all 7 stores
(`HazardEvent`, `Transect`, `TransectVerticalRef`, `SectorArrow`,
`EcologyObservation`, `SuccessionStage`, `SwotEntry`, `Earthwork`,
`StorageInfra`, `Guild`, `WasteVector`, `WasteVectorRun`, `FertilityInfra`,
`SpeciesPick`, `VerticalElementType`, `StandaloneVerticalMarker`, …) plus
the `newAnnotationId(prefix)` helper relocated verbatim from the legacy
file. Hooks are **not** re-exported through this barrel — consumers
import each hook directly to keep the dependency graph explicit.

### Selector discipline

Every consumer continued to follow subscribe-then-derive (raw `state.x`
selectors + `useMemo` for filter/sort) per
[`2026-04-26-zustand-selector-stability.md`](2026-04-26-zustand-selector-stability.md).
No card needed new logic; only the import path + hook name changed.

## Consequences

**Positive**
- Each namespace isolated: edits to one don't trigger HMR / re-import on
  the other 6.
- Per-namespace persistence: a write to `swot` no longer rewrites
  `wasteVectors`. Lower localStorage churn.
- Selector autocomplete: `useExternalForcesStore` exposes ~6 actions
  instead of the 50+ on `useSiteAnnotationsStore`.
- Test isolation: vitest specs hydrate one namespace without ghost data
  from the other 6.
- Future schema changes are local: bumping `topographyStore` to v2
  doesn't require migrations on the other 6 stores.
- Cross-family invariants stay co-located in one store where Scholar
  judgment said they belong (e.g. `wasteVectorRuns[i].vectorId` ↔
  `wasteVectors[j].id` both live in `closedLoopStore`).
- Scholar-aligned IA matches PDC mental model: a steward looking for
  "water systems" finds movement + storage in one file.

**Risks accepted**
- One-time migration risk: `migrateLegacyBlob()` runs on every steward's
  next session. The archive-rather-than-delete strategy + `seed()`
  idempotency + the explicit `parsed.version !== 3` guard are the
  mitigations. A vitest spec
  ([`siteAnnotationsMigrate.test.ts`](../../apps/web/src/tests/siteAnnotationsMigrate.test.ts))
  covers full v3 blobs, idempotency, partial-rollout (don't overwrite
  an already-rehydrated key), non-v3 blobs left alone, and corrupt-blob
  recovery.
- 24 consumer files touched in one PR. Mitigation: tsc serves as the
  regression guard — any old `siteAnnotationsStore.js` import path now
  fails with TS2307 at compile time. (No project-level ESLint config
  exists; the repo's `lint` script runs `tsc --noEmit`. A future ADR
  may introduce `no-restricted-imports` if ESLint is added.)
- Cross-store refs introduced by `TransectVerticalRef.refId` →
  domain-store ids — but surfaced *explicitly* via the discriminated
  `kind` field, not implicit. Render today is `kind === 'standalone'`-only
  and falls through for other kinds; resolution lands in a follow-up.

**Out of scope**
- Backend persistence of any of the 7 namespaces (still
  `localStorage`-only).
- "Link to existing element" UX in `TransectVerticalEditorCard` — data
  shape supports it; form affordance lands in a follow-up.
- Splitting other multi-family stores (e.g. `phaseStore` carries
  `phases` + `tasks` + `comments`). Out of scope; addressed if and when
  the same pain emerges.
- ~~Removing the `ogden-site-annotations.archived-v3` archive entry —
  follow-up after one stable release cycle.~~ **Landed 2026-04-30** via
  [`2026-04-30-archive-v3-blob-cleanup.md`](2026-04-30-archive-v3-blob-cleanup.md).

## Verification (completed)

- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` — clean
  (twice: once after Phase A scaffolding, once after Phase C consumer
  migration).
- `npx vite build` — clean (22.68s; PWA precache 565 entries).
- `npx vitest run src/tests/siteAnnotationsMigrate.test.ts` — 8/8 green:
  full v3 → 7 namespaces seeding, `verticalElements` → `verticalRefs`
  shape transform, archive-rename, idempotency, partial-rollout
  protection, non-v3 left alone, missing-key silent return,
  corrupt-blob silent return.
- Pre-existing `computeScores.test.ts` failures (7) are unrelated to this
  work — score-count assertions for Tier 3 layers; verified untouched
  via `git status`.

## Files touched

**New (10):**
- `apps/web/src/store/externalForcesStore.ts`
- `apps/web/src/store/topographyStore.ts`
- `apps/web/src/store/ecologyStore.ts`
- `apps/web/src/store/waterSystemsStore.ts`
- `apps/web/src/store/polycultureStore.ts`
- `apps/web/src/store/closedLoopStore.ts`
- `apps/web/src/store/swotStore.ts`
- `apps/web/src/store/site-annotations.ts` — type-only barrel + `newAnnotationId`
- `apps/web/src/store/site-annotations-migrate.ts` — `migrateLegacyBlob()`
- `apps/web/src/tests/siteAnnotationsMigrate.test.ts` — vitest spec (8 tests)

**Modified:**
- `apps/web/src/main.tsx` — `migrateLegacyBlob()` invoked at top, before any store side-effect import
- 24 consumer files — import-path swaps (mechanical):
  - `features/act/`: `ActHub.tsx`, `HazardPlansCard.tsx`, `OngoingSwotCard.tsx`, `WasteRoutingChecklistCard.tsx`
  - `features/observe/`: `ObserveHub.tsx`, `CrossSectionTool.tsx`, `DiagnosisReportExport.tsx`, `FoodChainCard.tsx`, `HazardsLogCard.tsx`, `SectorCompassCard.tsx`, `SwotJournalCard.tsx`
  - `features/plan/`: `PlanHub.tsx`, `CanopySimulatorCard.tsx`, `GuildBuilderCard.tsx`, `HolmgrenChecklistCard.tsx`, `PermanenceScalesCard.tsx`, `PlantDatabaseCard.tsx`, `SoilFertilityDesignerCard.tsx`, `StorageInfraTool.tsx`, `SwaleDrainTool.tsx`, `TransectVerticalEditorCard.tsx` (+ schema swap to `verticalRefs`), `WasteVectorTool.tsx`
  - `features/map/`: `CrossSectionTool.tsx`, `SectorOverlay.tsx`

**Retired:**
- `apps/web/src/store/siteAnnotationsStore.ts` — deleted

**Wiki:**
- `wiki/decisions/2026-04-29-site-annotations-store-extract-per-family.md` — status flipped `proposed → superseded` (this ADR replaces it)
- `wiki/entities/site-annotations-store.md` — rewritten as an umbrella linking to the 7 namespaces
- `wiki/index.md` — ADR row added; old proposed row marked superseded
- `wiki/log.md` — session entry filed

## Rollback plan

If a regression surfaces post-deploy:
1. Revert the consumer-import PR.
2. Restore `siteAnnotationsStore.ts` from git history.
3. In `main.tsx`, replace `migrateLegacyBlob()` with a one-time
   `restoreLegacyBlob()` that reads `ogden-site-annotations.archived-v3`
   back to `ogden-site-annotations` and removes the 7 new keys.
4. The archive is retained for one full release cycle for exactly this
   reason.
