# 2026-05-22 — Typed-promotion of access paths + utility points (PDC Phase C, C1–C2)

**Status.** Accepted. Phase C of the "make Atlas the only tool a student
uses to produce an OSU PDC portfolio" roadmap
(`~/.claude/plans/how-close-is-atlas-olos-lexical-metcalfe.md`).

**Branch.** `feat/atlas-permaculture`

**Commits.** `cf6fcbfc` (C1 access paths) · `f2607703` (C2 utility points)

## Context

Phase C is "finish Plan-stage authoring (PDC Weeks 4/9)." Exploration
(2026-05-22) overturned the roadmap's "P2 emerging, finish drawing"
premise: all four PDC feature types — zone / structure / access / utility —
**already** draw → label → persist → reload → appear in the captured
master-plan image. The genuine remaining gaps were narrower than "finish
drawing." The user chose **maximal scope on both axes**: "Broader authoring
polish" *and* "Promote to typed `design_features`."

The first concrete gap this ADR closes: access paths (`pathStore` /
`ogden-paths`) and utility points (`utilityStore` / `ogden-utilities`)
persisted as opaque `versioned-blob` rows. They reloaded cross-device, but
were **not server-queryable** and **never appeared in the master-plan PDF
feature-roster table** — they existed only inside the captured map image.
Zones and structures, by contrast, round-trip through the typed
`design_features` table and are counted in the PDF "Feature inventory."

## The load-bearing decision: promote paths/utilities onto `design_features`, web-side only

Both promotions are a **pure web-side mirror** of the existing
zone/structure pattern. Two facts (verified by direct read, not assumed)
make this require **zero** API and **zero** PDF-template change:

- **API needs ZERO changes.** `DesignFeatureType` already includes `'path'`
  and `'point'` (`designFeature.schema.ts:8`); the route `:type` enum lists
  them (`design-features/index.ts:11`); POST/PATCH/DELETE never restrict by
  `featureType`. The typed table and its endpoints already accept both.
- **master-plan template needs ZERO changes.** Its feature inventory counts
  every `feature_type` (`masterPlan.ts:162`) and already special-cases
  `point` (`:79`). Paths/utilities appear in the PDF roster automatically
  the moment they land as `path`/`point` rows.

So each slice is: a mapper pair in `featureMapping.ts` + a `serverId?` field
on the store record + create/update/delete sync handlers + a `subscribeTo*`
+ a fetch-merge-push block in `mergeDesignFeatures` + a one-line reclassify
in `syncManifest.ts`. No schema migration, no new endpoint, no template edit.

### Why feature types

- **Access paths → `featureType: 'path'`.** Line geometry
  (`geometry.type: 'LineString'`); `subtype` carries the path kind.
- **Utility points → `featureType: 'point'`.** Point geometry
  (`geometry: { type: 'Point', coordinates: center }`); `subtype` carries
  the utility kind. `designFeatureToPoint` falls back to
  `geometry.coordinates` when `properties.center` is absent, so a row
  authored elsewhere still restores a usable center.

### Why `ogden-utility-runs` stays a `versioned-blob`

The PDC "utility points" deliverable is the **point** infrastructure
(tanks, wells, solar arrays, …). The connector **lines** between them
(`ogden-utility-runs`) are a presentation aid, not a gradeable point
inventory, and have no natural `design_features` feature_type. They stay an
opaque `versioned-blob` — promoting them would add roster noise without a
PDC payoff.

### Reclassify, don't double-sync

`syncManifest.ts` runs a blob loop over every `versioned-blob` descriptor.
Leaving `ogden-paths` / `ogden-utilities` in that list **and** adding the
typed transport would sync each store twice on two divergent paths. Each
slice therefore **removes** the `blob(...)` descriptor (and its now-unused
store import) at the same time it adds the `typed-design-feature` entry, so
exactly one transport owns each store.

## Implementation

### C1 — access paths (`cf6fcbfc`)

- `featureMapping.ts` — `pathToDesignFeature` / `designFeatureToPath`
  (carries `localId, color, lengthM, usageFrequency, accessible,
  isTemporary, seasonalMonths, enterprise, restPointAnchors, notes`;
  `phaseTag` from `phase || undefined`; `style.color`).
- `pathStore.ts` — `serverId?` on `DesignPath`.
- `syncService.ts` — `syncPathCreate/Update/Delete` (write `serverId` back
  via `updatePath`), `subscribeToPaths`, a paths fetch-merge-push block in
  `mergeDesignFeatures`, the `'path'` `executeQueuedOp` case, registration
  in `start()` (always-on like zones/structures).
- `syncQueue.ts` — `'path'` + `'point'` added to `SyncStoreType`.
- `syncManifest.ts` — `ogden-paths` moved out of the `blob(...)` list into
  the `typed-design-feature` block (removed the now-unused `usePathStore`
  import).
- Test: `featureMappingPath.test.ts` (4/4 — round-trip + phase-omit +
  serverId carry).

### C2 — utility points (`f2607703`)

- Same pattern, same files. `utilityToDesignFeature` emits
  `geometry: { type:'Point', coordinates: center }`; `designFeatureToPoint`
  falls back to `geometry.coordinates` when `properties.center` is absent.
  Properties carry `localId, center, demandKwhPerDay, capacityGal,
  isTemporary, seasonalMonths, notes`.
- `utilityStore.ts` — `serverId?` on `Utility`.
- `syncService.ts` — `syncUtility*` + `subscribeToUtilities` + utilities
  merge block + `'point'` queued-op case + registration.
- `syncManifest.ts` — `ogden-utilities` reclassified to
  `typed-design-feature` (removed unused `useUtilityStore` import).
  `ogden-utility-runs` left a `versioned-blob` (see above).
- Test: `featureMappingUtility.test.ts` (5/5 — incl. geometry-coordinate
  fallback).

## Tests / verification

- **web vitest** — `featureMappingPath` 4/4, `featureMappingUtility` 5/5.
- **web tsc** (8 GB node script) after each slice — only the 3 known
  pre-existing unrelated errors remain (`StepBoundary.tsx`,
  `HostUnionContextMenu.test.tsx`, `HostUnionDrilldownCard.test.tsx`).

## Verification deferrals

- **Live Plan-view draw → reload → POST `/design-features` round-trip →
  master-plan PDF roster screenshot** — same wall as Phase A/A5/B (auth +
  seeded project + headless WebGL + MapTiler key). Stated, not claimed (per
  project CLAUDE.md). Covered meanwhile by the mapper unit tests + typecheck.

## Phase C remainder

- **C3 — `landDesign` no-sync bug. DONE (commit `15612b75`,
  2026-05-22).** `ogden-atlas-design-elements` was classified
  `typed-design-feature` in `syncManifest.ts` but had **no transport wired**
  → localStorage-only, silently never synced. The store is a
  `byProject: Record<projectId, DesignElement[]>` map (schemaVersion 2, not
  temporal). Fixed by reclassifying to `versioned-blob` with
  `byKey('byProject', null, [])` + the `useLandDesignStore` import (no
  `syncService` change — the generic blob loop handles it). A
  `versioned-blob` (not a second typed promotion) because the freeform sketch
  kinds it holds have no clean `design_features` feature_type and are not a
  PDC roster deliverable. The C3 commit also fixed a C1 test regression (the
  `syncManifest.test.ts` round-trip example still used `ogden-paths`, now
  `typed-design-feature` with no `selectForProject` → runtime throw; repointed
  to `ogden-utility-runs`). Verified `syncManifest` 77/77 + tsc at baseline.
  Log: [[log/2026-05-22-landdesign-no-sync-fix-pdc-phase-c3]].
- **C4** — canonical access/utility ownership + reach the C2 utility-point
  promotion. **DONE (commit `b498fe8a`, 2026-05-22).** The C2 promotion was
  **unreachable** — `utilityStore` had no Plan draw tool and no v3 render
  layer, so a utility point could be neither drawn nor seen even though it
  round-tripped through sync. C4 wires a new `UtilityPointTool` (mode
  `plan.structures-subsystems.utility-point`, mounts on Current + Vision) +
  renders utility points in `PlanDataLayers`, and resolves the
  overlapping-authoring confusion via a **type-split**: the new tool offers
  **only the 11 non-BE utility types**; the 4 BE-overlapping kinds
  (solar/tank/well/septic) are authored via the existing `be.*` tools (BE V2
  canonical per the 2026-05-10 BE-unification ADR). A pure
  `utilityPointTypes.ts` module holds `BE_OWNED_UTILITY_TYPES` (the 4) +
  `UTILITY_POINT_TYPES` (derived = all minus BE-owned), pinned by a 5/5
  partition test. **No data moves** — clarity + wiring, not a migration.
  `elementCatalog.ts` got a clarity comment only. Log:
  [[log/2026-05-22-canonical-feature-ownership-c4]]; ADR:
  [[decisions/2026-05-22-atlas-canonical-feature-ownership-c4]].
- **C5** — properties-panel polish. **DONE (commit `5ad3c3b4`,
  2026-05-22).** Exploration found `rotationDeg` already fully wired (draw +
  edit forms, with `createFootprintPolygon` regeneration), so the two genuine
  gaps were narrower: a selected-structure **orientation chevron** (rotation
  was invisible unless the edit form was open) and **utility-point v3 edit
  parity** (`'utility-point'` `PlanSelectionKind` + `buildUtilityPointEditSchema`
  + a dedicated click-to-edit listener — utility points rendered but were
  neither selectable nor editable). Log:
  [[log/2026-05-22-c5-structure-orientation-utility-edit-parity]].
- **C6** — full e2e verify + consolidation ADR. **DONE (2026-05-22).** Phase C
  unit surface re-confirmed green + web tsc at baseline; live DOM regression
  check (`/v3/project/mtc/plan` loads with a canvas, no C5 console errors); the
  live-WebGL chevron/edit-form visual stays deferred (stated, not claimed). ADR:
  [[decisions/2026-05-22-atlas-phase-c-consolidation]]; log:
  [[log/2026-05-22-c6-phase-c-consolidation]]. **Phase C complete.**

## Related

- Log: [[log/2026-05-22-typed-promotion-access-paths-utility-points-pdc-phase-c]]
- Phase B ADR: [[decisions/2026-05-22-atlas-planting-plan-merged-schedule]]
- Phase A ADR: [[decisions/2026-05-21-atlas-master-plan-map-export]]
- Entity: [[entities/pdf-export-service]]
