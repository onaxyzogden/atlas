# 2026-05-22 — Typed-promotion of access paths + utility points (PDC Phase C, C1–C2)

**Branch:** `feat/atlas-permaculture`
**Commits:** `cf6fcbfc` (C1 paths) · `f2607703` (C2 utilities)
**ADR:** [[2026-05-22-atlas-typed-promotion-access-utility]]
**Roadmap:** `~/.claude/plans/how-close-is-atlas-olos-lexical-metcalfe.md`

## What & why

Phase C of the OSU-PDC roadmap is "finish Plan-stage authoring (Weeks 4/9)."
Exploration overturned the roadmap's "P2 emerging, finish drawing" premise:
all four PDC feature types (zone / structure / access / utility) **already**
draw → label → persist → reload → appear in the master-plan capture. The
genuine remaining gaps were narrower. User (2026-05-22) chose **maximal scope
on both axes**: "Broader authoring polish" + "Promote to typed
`design_features`."

The first concrete gap: access paths (`pathStore` / `ogden-paths`) and utility
points (`utilityStore` / `ogden-utilities`) persisted as opaque
`versioned-blob`s. They reloaded cross-device but were **not server-queryable
and never appeared in the master-plan PDF feature-roster table** — only inside
the captured map image. C1 + C2 promote both onto the typed `design_features`
path so they round-trip like zones/structures and are counted in the PDF
"Feature inventory" section.

## Two facts that made this web-side-only (verified, not assumed)

- **API needs ZERO changes.** `DesignFeatureType` already includes `'path'` and
  `'point'` (`designFeature.schema.ts:8`); the route `:type` enum lists them
  (`design-features/index.ts:11`); POST/PATCH/DELETE don't restrict by
  `featureType`.
- **master-plan template needs ZERO changes.** Its feature inventory counts
  every `feature_type` (`masterPlan.ts:162`) and already special-cases `point`
  (`:79`). Paths/utilities appear in the PDF roster automatically once they land
  as `path`/`point`.

So each promotion is a pure web-side mirror of the zone/structure pattern.

## C1 — access paths → `featureType: 'path'` (commit `cf6fcbfc`)

- `featureMapping.ts` — `pathToDesignFeature` / `designFeatureToPath` (carries
  `localId, color, lengthM, usageFrequency, accessible, isTemporary,
  seasonalMonths, enterprise, restPointAnchors, notes`; `phaseTag` from
  `phase || undefined`; `style.color`).
- `pathStore.ts` — `serverId?` on `DesignPath`.
- `syncService.ts` — `syncPathCreate/Update/Delete` (write `serverId` back via
  `updatePath`), `subscribeToPaths`, a paths fetch-merge-push block in
  `mergeDesignFeatures`, the `'path'` `executeQueuedOp` case, and registration
  in `start()` (always-on like zones/structures).
- `syncQueue.ts` — `'path'` + `'point'` added to `SyncStoreType`.
- `syncManifest.ts` — `ogden-paths` moved out of the `blob(...)` list into the
  `typed-design-feature` block (removed the now-unused `usePathStore` import) so
  the blob loop no longer double-syncs it.
- Test: `featureMappingPath.test.ts` (4 specs, round-trip + phase-omit +
  serverId carry).

## C2 — utility points → `featureType: 'point'` (commit `f2607703`)

- Same pattern, same files. `utilityToDesignFeature` emits
  `geometry: { type:'Point', coordinates: center }`; `designFeatureToPoint`
  falls back to `geometry.coordinates` when `properties.center` is absent.
  Properties carry `localId, center, demandKwhPerDay, capacityGal, isTemporary,
  seasonalMonths, notes`.
- `utilityStore.ts` — `serverId?` on `Utility`.
- `syncService.ts` — `syncUtility*` + `subscribeToUtilities` + utilities
  merge block + `'point'` queued-op case + registration.
- `syncManifest.ts` — `ogden-utilities` reclassified to `typed-design-feature`
  (removed unused `useUtilityStore` import). **`ogden-utility-runs` (connector
  lines) stays a `versioned-blob`** — not the PDC "utility points" deliverable.
- Test: `featureMappingUtility.test.ts` (5 specs, incl. geometry-coordinate
  fallback).

## Verification

- **web vitest** — `featureMappingPath` 4/4, `featureMappingUtility` 5/5.
- **web tsc** (8 GB node script) after each slice — only the 3 known
  pre-existing unrelated errors remain (`StepBoundary.tsx`,
  `HostUnionContextMenu.test.tsx`, `HostUnionDrilldownCard.test.tsx`).
- **Deferred (stated, not claimed):** live Plan-view draw → reload → POST
  `/design-features` round-trip → master-plan PDF roster screenshot — same wall
  as Phase A/A5/B (auth + seeded project + headless WebGL + MapTiler key).
  Covered meanwhile by the mapper unit tests + typecheck.
- **Rebase note:** the branch was rebased out-of-band twice mid-session; both
  slice commits survived (committed immediately per
  [[feedback-commit-immediately-on-rebased-branches]]). Each slice staged its
  files by name; foreign uncommitted WIP in the working tree
  (`capitalPartnerSummary.ts`, `EconomicsPanel*`, `ZoneSomSidebar*`,
  `PlanTools.tsx`, `BaseMapCard.tsx`, …) was preserved, not committed.

## Deferred to follow-up sessions (Phase C remainder)

- **C3** — fix the `landDesign` no-sync bug: `ogden-atlas-design-elements` is
  classified `typed-design-feature` in `syncManifest.ts` but has **no transport
  wired** → localStorage-only, silently won't sync. Minimal correct fix:
  reclassify to `versioned-blob` with `byKey('byProject', null, [])` (the store
  is a `byProject: Record<projectId, DesignElement[]>` map, schemaVersion 2, not
  temporal) + add the `useLandDesignStore` import.
- **C4** — consolidate overlapping access/utility authoring (canonical
  ownership: designed access → `pathStore`, designed utility → `utilityStore`,
  BE driveway/power/well/septic = Observe record of existing infra, `landDesign`
  path/road kinds = freeform sketch) + UI clarity in `elementCatalog.ts`. No
  destructive migration.
- **C5** — properties-panel polish: structure `rotationDeg` field + live
  orientation indicator (`inlineFormStore.ts` `FieldSpec` +
  `inlineEditSchemas.ts`); confirm path/utility edit fields present.
- **C6** — full e2e verify + session ADR for the consolidation.
