# 2026-04-30 — Site-annotations store consolidated into 7 Scholar-aligned namespace stores


### Done

Decomposed the 13-family `siteAnnotationsStore.ts` v3 god-store (flagged in the PLAN ADR; made real by ACT) into **7 Scholar-aligned namespace Zustand stores** under `apps/web/src/store/`. Permaculture Scholar review redirected the originally-proposed 13-per-family split (proposed ADR `2026-04-29-site-annotations-store-extract-per-family.md`) toward Holmgren P8 (*Integrate Rather Than Segregate*): hazards+sectors merge (Mollison sectors), earthworks+storageInfra merge (Yeomans water scale), guilds+species merge (PDC W7), wasteVectors+wasteVectorRuns+fertilityInfra merge (Holmgren P4+P6 closed loop), ecology+successionStage merge (PDC W8-10 succession-as-temporal-ecology). SWOT remains its own namespace (strategic-reflection, not a permaculture domain entity).

**New (10):** `externalForcesStore.ts`, `topographyStore.ts`, `ecologyStore.ts`, `waterSystemsStore.ts`, `polycultureStore.ts`, `closedLoopStore.ts`, `swotStore.ts` — 7 Zustand+persist stores, keys `ogden-{external-forces,topography,ecology,water-systems,polyculture,closed-loop,swot}` v1; `site-annotations.ts` type-only barrel + `newAnnotationId(prefix)` helper relocated verbatim; `site-annotations-migrate.ts` exporting `migrateLegacyBlob(storage = localStorage)`; `tests/siteAnnotationsMigrate.test.ts` — 8/8 green (full v3 → 7-namespace seeding, `verticalElements` → `verticalRefs` shape transform, archive-rename, idempotency, partial-rollout protection, non-v3 left alone, missing-key silent return, corrupt-blob silent return).

**Schema change:** `Transect.verticalElements?: VerticalElement[]` → `Transect.verticalRefs?: TransectVerticalRef[]`, a discriminated union over `kind: 'standalone' | 'water-system' | 'polyculture' | 'closed-loop' | 'structure'` with optional `refId` (domain-store id) and optional `standalone: { type, heightM, label? }` fallback. Migrator transforms every legacy element into a `kind: 'standalone'` ref — lossless. `TransectVerticalEditorCard` continues to create `kind: 'standalone'` pins via its existing form; render path is `kind === 'standalone'`-only and falls through for non-standalone refs (a follow-up ADR adds the "Link to existing element" affordance and resolves refs against the appropriate domain store).

**Migrator wiring:** `apps/web/src/main.tsx` calls `migrateLegacyBlob()` at the top, **before** any store side-effect import. Synchronous, single-pass, idempotent — re-running is a no-op because the legacy key is gone. The legacy blob is **archived as `ogden-site-annotations.archived-v3`** (rename, not delete) for manual rollback. `seed()` never overwrites a key that has already rehydrated, so partial-rollout is safe.

**24 consumer files migrated (mechanical import-swap):**
- `features/act/`: `ActHub`, `HazardPlansCard`, `OngoingSwotCard`, `WasteRoutingChecklistCard`
- `features/observe/`: `ObserveHub`, `CrossSectionTool`, `DiagnosisReportExport`, `FoodChainCard`, `HazardsLogCard`, `SectorCompassCard`, `SwotJournalCard`
- `features/plan/`: `PlanHub`, `CanopySimulatorCard`, `GuildBuilderCard`, `HolmgrenChecklistCard`, `PermanenceScalesCard`, `PlantDatabaseCard`, `SoilFertilityDesignerCard`, `StorageInfraTool`, `SwaleDrainTool`, `TransectVerticalEditorCard` (+ schema swap to `verticalRefs`), `WasteVectorTool`
- `features/map/`: `CrossSectionTool`, `SectorOverlay`

Hub views (`ActHub` / `ObserveHub` / `PlanHub`) and `PermanenceScalesCard` (Yeomans Keyline, inherently cross-namespace) import 3-7 stores; single-purpose cards each touch one namespace. Selector discipline (subscribe-then-derive, ADR `2026-04-26-zustand-selector-stability`) carried over unchanged.

**Retired:** `apps/web/src/store/siteAnnotationsStore.ts` deleted (476 lines). tsc serves as the regression guard against re-introducing the old import path (TS2307 on the deleted module).

**Verification:** `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` clean (twice — once after Phase A scaffolding, once after Phase C consumer migration); `npx vite build` clean (22.68 s, 565 PWA precache entries); `npx vitest run src/tests/siteAnnotationsMigrate.test.ts` 8/8 green. Pre-existing 7 `computeScores.test.ts` failures verified unrelated via `git status` (untouched files).

### Risks accepted
- One-time migration risk on every steward's next session — mitigated by archive-not-delete + `seed()` idempotency + explicit `parsed.version !== 3` guard + corrupt-blob try/catch + 8-test vitest coverage.
- 24 consumer files touched in one pass — mitigated by tsc compile-error as regression guard (no project-level ESLint config exists; `npm run lint` runs `tsc --noEmit`).
- `TransectVerticalRef.refId` introduces explicit cross-store refs — surfaced via discriminated `kind` field, not implicit; render today is `kind === 'standalone'`-only, resolution deferred.

ADR: [`wiki/decisions/2026-04-30-site-annotations-store-scholar-aligned-namespaces.md`](decisions/2026-04-30-site-annotations-store-scholar-aligned-namespaces.md) (status accepted). Supersedes: [`wiki/decisions/2026-04-29-site-annotations-store-extract-per-family.md`](decisions/2026-04-29-site-annotations-store-extract-per-family.md) (proposed → superseded; never landed).
