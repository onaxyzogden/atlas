# 2026-04-22 — Country 'INTL' bucket + NasaPowerAdapter registration

**Status:** Accepted
**Audit item:** §6 #15 — "Register `NasaPowerAdapter` in `ADAPTER_REGISTRY`
under a new `INTL` country bucket so non-US/non-CA projects route somewhere
other than `ManualFlagAdapter` for climate."

## Context

`ADAPTER_REGISTRY` was typed `Record<Tier1LayerType, Record<Country, AdapterConfig>>`
with `Country = z.enum(['US', 'CA'])`. Every Tier-1 layer had exactly two
slots. That made the registry shape satisfying for coverage audits but
locked the orchestrator to US/CA — any third country would silently route
through `ManualFlagAdapter` for all eight Tier-1 layers, producing empty
`site_assessments` rows with confidence `low`.

`NasaPowerAdapter` had been written on 2026-04-20 as a globally-valid
climatology source (grid-interpolated, keyless, CC-licensed), implementing
`DataSourceAdapter` with `layerType: 'climate'` and confidence `'medium'`.
The 04-20 ADR explicitly deferred registration pending the Country
extension — so the adapter sat unrouted for two days while the 04-21 audit
accumulated a backlog.

The `fetchNasaPowerSummary` helper (shared by `NoaaClimateAdapter` and
`EcccClimateAdapter` for solar/wind/RH enrichment of their primary
station-based normals) is an orthogonal concern and not affected by
registry registration.

## Decision

**Extend `Country` to `['US', 'CA', 'INTL']`, relax `ADAPTER_REGISTRY` to
`Partial<Record<Country, AdapterConfig>>`, register `NasaPowerAdapter`
under `climate.INTL` only, and add a DB `CHECK (country IN ('US','CA','INTL'))`
constraint via migration 011.**

### Shape change

```ts
// Before
export const ADAPTER_REGISTRY:
  Record<Tier1LayerType, Record<Country, AdapterConfig>> = { … };

// After
export const ADAPTER_REGISTRY:
  Record<Tier1LayerType, Partial<Record<Country, AdapterConfig>>> = { … };
```

Partial is type-correct because `resolveAdapter()` already uses
`ADAPTER_REGISTRY[layerType]?.[country]` with a `ManualFlagAdapter`
fallback when `config` is undefined. Relaxation adds zero runtime risk.

### Registry additions

Only one new entry:
```ts
climate: {
  US: { adapter: 'NoaaClimateAdapter', source: 'noaa_normals' },
  CA: { adapter: 'EcccClimateAdapter', source: 'eccc_normals' },
  INTL: { adapter: 'NasaPowerAdapter', source: 'nasa_power' },
},
```

All seven other Tier-1 layers (`elevation`, `soils`, `watershed`,
`wetlands_flood`, `land_cover`, `zoning`, `groundwater`) leave `INTL`
undefined. Each carries an inline comment naming the future global source
candidate (SRTM/ALOS, SoilGrids 250m, HydroSHEDS, GloRiC, ESA WorldCover,
manual-only for zoning, WHYMAP/IGRAC).

### DB migration

```sql
-- 011_country_intl_support.sql
ALTER TABLE projects
  ALTER COLUMN country TYPE text
  USING rtrim(country);

ALTER TABLE projects
  ALTER COLUMN country SET DEFAULT 'US';

ALTER TABLE projects
  ADD CONSTRAINT projects_country_chk
  CHECK (country IN ('US', 'CA', 'INTL'));
```

**Gotcha caught during apply:** the original `projects.country` column was
`character(2)` (fixed-width 2 chars — from the 001 schema's initial design
for ISO 3166-1 alpha-2 codes). A CHECK constraint against `'INTL'` would
attach cleanly but every `UPDATE … country = 'INTL'` would fail at runtime
with `value too long for type character(2)`. The migration therefore
widens the column to `text` first, using `rtrim()` in the `USING` clause
to strip the fixed-width trailing-space padding from existing `'US '`/
`'CA '` values so the CHECK compares against literal `'US'`/`'CA'`.
Default is re-set on the widened column so new inserts still land on `'US'`.

CHECK over ENUM TYPE because:
- Widening later is `DROP CONSTRAINT + ADD CONSTRAINT`, no `ALTER TYPE … ADD VALUE` dance.
- CHECK doesn't require recreating the column or temporary intermediate types.
- An ENUM type migration would still need to address the `character(2) → text`
  widening; CHECK keeps the change atomic and reversible.

### Schema de-duplication (bonus)

`AssessmentFlag.country` was previously `z.enum(['US', 'CA', 'all'])` —
a redundant local enum flagged in the 04-19 audit. Replaced with
`z.union([Country, z.literal('all')])` so the shared `Country` enum is
now the single source of truth.

## Consequences

- **Non-US/non-CA projects now run the climate layer end-to-end** through
  NasaPowerAdapter → Tier-3 writer → `site_assessments` row with a real
  climate summary (solar radiation, wind speed, relative humidity).
- **Other Tier-1 layers fall through to ManualFlagAdapter for INTL** —
  documented gap, not a regression. Rural test harness already validates
  this path (zero `OntarioMunicipalAdapter` candidates → rural behavior
  unchanged).
- **US/CA station-based primaries are untouched.** `fetchNasaPowerSummary`
  still enriches NOAA/ECCC outputs for solar/wind/RH; INTL registration is
  orthogonal.
- **Adding a new INTL adapter is now zero-code in the registry.** Append
  `INTL: { adapter: 'Foo', source: 'foo' }` under the relevant layer +
  add a `resolveAdapter` branch.
- **Wizard UX**: `StepBasicInfo` gains a third country option "International".
  Financial engine's `SiteContext.country` widened to include `'INTL'` —
  INTL reuses US-Midwest regional cost defaults (documented cheapest-safe
  fallback; a follow-up bundle can return `confidence: 'low'` explicitly
  for INTL projects if desired).

## Files

- `packages/shared/src/schemas/project.schema.ts` — `Country` enum `['US', 'CA', 'INTL']`.
- `packages/shared/src/schemas/assessment.schema.ts` — dedupe: `AssessmentFlag.country`
  reuses shared `Country`; `AIEnrichmentRequest.country` too.
- `packages/shared/src/constants/dataSources.ts` — registry shape relaxed to
  `Partial<Record<Country, AdapterConfig>>`; `climate.INTL` added.
- `packages/shared/src/tests/schemas.test.ts` — parse `'INTL'` succeeds, `'MX'` fails.
- `apps/api/src/db/migrations/011_country_intl_support.sql` — CHECK constraint.
- `apps/api/src/services/pipeline/DataPipelineOrchestrator.ts` — import
  `NasaPowerAdapter`, add `resolveAdapter` branch.
- `apps/api/src/tests/NasaPowerIntlRouting.test.ts` — registry-surface guard (4 tests).
- `apps/web/src/pages/NewProjectPage.tsx` — `WizardData.country: Country`.
- `apps/web/src/features/project/wizard/StepBasicInfo.tsx` — third option.
- `apps/web/src/features/financial/engine/types.ts` — `SiteContext.country` widened.
- `apps/web/src/features/dashboard/pages/{Ecological,Stewardship}Dashboard.tsx` —
  drop unsafe `as 'US' | 'CA'` narrowing casts.
- `apps/web/src/lib/syncService.ts` — widen the two `as` casts.

## Tests

- Shared suite: **68/68 green** (added INTL parse test).
- API suite: **490/490 green** (was 486; added 4 INTL routing tests).
- All three packages `tsc --noEmit` clean.

## Alternatives considered

- **Open-end `Country` to `z.string()`** — rejected; loses Zod validation,
  loses exhaustiveness checks in scoring + adapters.
- **Multiple international buckets per region (EU/AFR/ASIA)** — rejected;
  no registry entry currently differentiates by continent. Single `'INTL'`
  bucket keeps the shape flat; region-specific adapters (e.g. EU Copernicus)
  can be added when they exist.
- **ENUM type migration instead of CHECK** — rejected; data rewrite + higher
  rollback risk for no added value.
- **Auto-register every `DataSourceAdapter` class** — rejected; explicit
  registry is easier to audit and version-control than reflection.

## Follow-up

- Global adapters for the remaining seven Tier-1 layers (SRTM/ALOS elevation,
  SoilGrids 250m soils, HydroSHEDS watershed, etc.) — one bundle per source
  once licensing is verified.
- Optional: INTL-specific financial cost tables vs reusing US-Midwest
  defaults. Current behavior is documented in `SiteContext.country` inline
  comment; promote to explicit `CostSource.confidence: 'low'` when a user
  reports confusion.
