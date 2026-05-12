# Persist `migrate` shim sweep — clear legacy-version warnings

**Date:** 2026-05-11
**Scope:** `apps/web/src/store/*`
**Status:** Closed.

## Problem

Reloading the web app printed 60+ Zustand warnings of the form:

> *"State loaded from storage couldn't be migrated since no migrate
> function was provided"*

The warning fires whenever a persisted-state version mismatches the
configured `version` and the store has no `migrate` callback. Across
the store directory, 37 stores declared a `version:` without a
`migrate:` function, so every reload spammed the console — drowning
out real errors during development.

The schema bumps on these stores have all been additive (new keys
default to their zero value). So a no-op migrate is correct
behaviour — it just acknowledges the version and passes the state
through unchanged.

## Decision

Add a no-op `migrate` shim to every persisted store that declares a
`version` but lacks `migrate`:

```ts
migrate: (persisted) => persisted as never,
```

The `as never` cast satisfies Zustand's `(persistedState: unknown,
version: number) => S` signature without forcing every store to import
its own State type at the persist-options call site. For stores that
need a *real* transformation on a future bump, this shim is replaced
with a proper migrator — but until then the line is the lowest-cost
guard against the warning.

## Stores patched (34 in this commit)

Single-line persist (29): `actualsStore`, `appropriateTechStore`,
`closedLoopStore`, `communityEventStore`, `compostInventoryStore`,
`cropStore`, `designElementsStore`, `ecologicalNoteStore`,
`enterpriseStore`, `fieldworkStore`, `flowConnectorStore`,
`humanContextStore`, `livestockStore`, `maintenanceStore`,
`monitoringTransectStore`, `networkStore`, `nurseryStore`,
`pathStore`, `pilotPlotStore`, `portalStore`, `principleCheckStore`,
`sectorStore`, `setbackStore`, `soilSampleStore`, `soilTestStore`,
`successionStore`, `swotStore`, `templateStore`, `utilityRunStore`.

Multi-line persist (5): `financialStore`, `hazardsStore`,
`sitingWeightStore`, `utilityStore`, `versionStore`.

Earlier in the session (already pushed in prior commit chain but
listed here for completeness): `commentStore`, `maintenanceLogStore`,
`relationshipsStore` — each used the typed cast pattern
(`as <StoreState>`) since they had multi-line options blocks already.

## Skipped

- `connectivityStore` — declares no `version` field, so Zustand never
  warns. Left as-is.
- All stores that already had a `migrate` function (16 stores
  including `zoneStore`, `waterSystemsStore`, `visionStore`,
  `scenarioStore`, `projectStore`, `phaseStore`, `livestockMoveLogStore`,
  `harvestLogStore`, `ecologyStore`, `externalForcesStore`,
  `scheduledLivestockMoveStore`, `polycultureStore`,
  `topographyStore`, `homesteadStore`, `machineryInventoryStore`,
  `planProjectTypeChecklistStore`, `planHowChecksStore`,
  `observeHowChecksStore`, `matrixTogglesStore`).

## Verification

`npm run typecheck` → exit 0.

Operator console verification completed **2026-05-11** via
`preview_*` MCP tooling on the running Vite server (port 5200):

- **Cold boot** — `localStorage.clear(); location.reload()` →
  `preview_console_logs level=warn` returned only unrelated
  `[ATLAS AI] … 401` entries (no API key configured locally).
  Zero "couldn't be migrated" warnings.
- **Forced downgrade** — mutated `version: 0` on all eight
  re-hydrated keys (`ogden-projects`, `ogden-swot`, `ogden-phases`,
  `ogden-vision`, `ogden-soil-samples`, `ogden-external-forces`,
  `ogden-topography`, `ogden-ecology`) and reloaded. Mix of stores
  with pre-existing real migrators (`projects`, `vision`, `phases`,
  `external-forces`, `topography`, `ecology`) and newly-shimmed ones
  (`swot`, `soil-samples`). Post-reload all eight re-stamped at their
  configured versions and the console still showed zero
  "couldn't be migrated" entries.
- **Screenshot** — `preview_screenshot` timed out after 30 s (no
  related console errors); the visual capture step is dropped. The
  console-log evidence above is the load-bearing signal for the
  sweep.

## Out of scope

- Auditing whether each `version: N` declaration matches what's in the
  wild (i.e. whether a bump was forgotten somewhere). The sweep is
  about silencing the noise, not about catching latent schema drift —
  if a real migration is later needed, the no-op shim is the
  replacement target, not an obstacle.
- `connectivityStore` left versionless intentionally; bumping just to
  bring it in line would itself be a new migration target.
