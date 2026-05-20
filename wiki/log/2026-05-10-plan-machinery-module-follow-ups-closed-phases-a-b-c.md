# 2026-05-10 — Plan machinery module follow-ups closed (Phases A/B/C)


**Branch.** `feat/atlas-permaculture` (continues the 2026-05-09 machinery slice).

**Scope.** The five deferred items in
[2026-05-09-atlas-plan-machinery-module.md](decisions/2026-05-09-atlas-plan-machinery-module.md)
shipped across three phases:

- **Phase A** — Renamed livestock `MobileTractorZonesCard` → `AnimalTractorZonesCard`
  (animal-housing tractors, not equipment); section id `plan-livestock-tractor-zones`
  retained to avoid cascade. `featureManifest.ts` gained section 30
  (`machinery-equipment`) registering all four machinery cards.
- **Phase B** — Backend persistence: migration `025_machinery_items.sql` (mirrors
  `design_features` with `acquisition_year` + `lifecycle_years_estimate`); shared
  zod schemas in `packages/shared/src/schemas/machineryItem.schema.ts`; Fastify
  routes at `/api/v1/machinery-items`; web bridge hook `useServerMachineryInventory`
  mounted in `PlanLayout`. Client UUIDs (`crypto.randomUUID()`) round-trip via the
  optional `id` field on `CreateMachineryItemInput`. localStorage is now a cache;
  server-wins on first hydrate. Inventory card form exposes optional acquired-year
  and lifecycle-years inputs.
- **Phase C** — `noiseSectorOverlap.ts` builds a wedge polygon per dwelling from
  `sectorStore` noise compass + half-width and intersects it with
  `fuel-station` / `machinery-shed` / `equipment-yard` elements; flag list
  surfaces on `MachineryHousingFuelCard` when an upwind hit is detected.
  `EquipmentReplacementScheduleCard` (Phasing & Budgeting) joins
  `machineryInventoryStore` × `phaseStore` — items whose
  `acquisitionYear + lifecycleYearsEstimate` falls within a phase's parsed
  timeframe (handles `Year 0-1`, `Year 5+`) appear in that phase's row;
  incomplete-lifecycle items land in a "Lifecycle unknown" footer.

**Verification.** `cd apps/web && npx tsc --noEmit` clean for all touched
modules; the only remaining errors are two pre-existing
`actInteractionLog.test.ts` TS2532 warnings unrelated to machinery.

**Out of scope (unchanged).** `openapi.yaml` schemas (zod is the runtime source
of truth; openapi is doc-only); distance-based fuel coverage radius math; a
maintenance-event log table for machinery.

ADR amended with a `## Follow-ups closed` section.
