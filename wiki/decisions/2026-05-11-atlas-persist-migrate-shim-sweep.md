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

Console verification (clear localStorage → reload → no "couldn't be
migrated" warnings) is left to the next operator boot; the change is
defensive and adds no behaviour.

## Out of scope

- Auditing whether each `version: N` declaration matches what's in the
  wild (i.e. whether a bump was forgotten somewhere). The sweep is
  about silencing the noise, not about catching latent schema drift —
  if a real migration is later needed, the no-op shim is the
  replacement target, not an obstacle.
- `connectivityStore` left versionless intentionally; bumping just to
  bring it in line would itself be a new migration target.
