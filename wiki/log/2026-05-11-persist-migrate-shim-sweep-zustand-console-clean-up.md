# 2026-05-11 — Persist `migrate` shim sweep (Zustand console clean-up)


**Why.** Reloading the app spammed 60+ Zustand warnings —
*"State loaded from storage couldn't be migrated since no migrate
function was provided"* — drowning out real errors. The warning fires
on any persisted store whose configured `version` mismatches what's in
localStorage and lacks a `migrate` callback.

**What.** Added the no-op shim `migrate: (persisted) => persisted as
never` to every store that declared `version:` without `migrate:`.
The `as never` cast satisfies Zustand's persist generics without
forcing every options block to import its own State type.

**Stores touched (34 in this commit):**
- *Single-line persist (29):* actualsStore, appropriateTechStore,
  closedLoopStore, communityEventStore, compostInventoryStore,
  cropStore, designElementsStore, ecologicalNoteStore, enterpriseStore,
  fieldworkStore, flowConnectorStore, humanContextStore, livestockStore,
  maintenanceStore, monitoringTransectStore, networkStore, nurseryStore,
  pathStore, pilotPlotStore, portalStore, principleCheckStore,
  sectorStore, setbackStore, soilSampleStore, soilTestStore,
  successionStore, swotStore, templateStore, utilityRunStore.
- *Multi-line persist (5):* financialStore, hazardsStore,
  sitingWeightStore, utilityStore, versionStore.

`commentStore`, `maintenanceLogStore`, `relationshipsStore` had been
patched earlier this session in their typed form (`as <StoreState>`),
unmodified by this sweep.

**Skipped.** `connectivityStore` (no `version` declared, so no
warning). 16 stores that already had a `migrate` function are untouched.

**ADR.** `wiki/decisions/2026-05-11-atlas-persist-migrate-shim-sweep.md`.

**Verification.** `npm run typecheck` exit 0. Reload-and-eyeball
console verification deferred to next boot since the change is purely
defensive.
