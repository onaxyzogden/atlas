# Atlas — Macroclimate & Hazards Export + `pickDefined` helper lift
**Date:** 2026-05-10
**Status:** accepted

## Context

By the start of this session five Observe-stage PDF exports had shipped
(SWOT trio, Topography, Earth · Water · Ecology) following the locked
4-file recipe from the 2026-05-10 Topography ADR. Two open questions
from the EWE debrief:

1. Ship a sixth module to keep the inert-CTA backlog draining and
   exercise the recipe on a different Observe surface.
2. Lift the conditional-spread payload builder into a shared helper
   now that there are three callers (Topography · EWE · the next
   export). The "rule of three" was met — premature DRY no longer.

User chose **Macroclimate & Hazards** for module #6 (densest unshipped
Observe surface: climate-layer summary + full `Hazard` array + monthly
normals + solar opportunities) and **deferred the EWE inert-CTA
sweep** to a follow-up session.

## Decision

Ship a Macroclimate & Hazards export using the same recipe, and
simultaneously extract two small generic helpers — `pickDefined` and
`pickTruthy` — into `packages/shared/src/store-mirrors/pickHelpers.ts`.
Refactor the Topography and EWE dashboard payload builders to use
them so the parity of the abstraction is proven against existing
exports.

### Helpers

```ts
export function pickDefined<T extends object, K extends keyof T>(
  obj: T,
  keys: readonly K[],
): { [P in K]?: NonNullable<T[P]> } { /* skip null/undefined */ }

export function pickTruthy<T extends object, K extends keyof T>(
  obj: T,
  keys: readonly K[],
): { [P in K]?: T[P] } { /* skip falsy */ }
```

`pickDefined` covers the `!= null` branch used for numbers / coordinates
/ optional booleans where `false` is meaningful. `pickTruthy` covers
the strings-and-flags branch where `''`, `0`, `false` all mean "not
set." Two helpers — not one with a mode argument — because the
strict-optional Zod payloads use both semantics and a single function
would hide the choice at the call site.

### Why not lift the entire `toExportPayload()`?

SWOT exports pass entries through with zero transformation; Topography
+ EWE + Macroclimate use the same `{ ...required, ...pickDefined(obj,
[...]) }` shape but each over different field sets. A monolithic
`toExportPayload()` would either need a generic field-list parameter
(equivalent to `pickDefined`) or per-module wrappers (no shared
value). The two small helpers + a one-line spread at each call site
is the honest abstraction.

## Files

```
packages/shared/src/store-mirrors/pickHelpers.ts                    NEW — generic helpers
packages/shared/src/index.ts                                        re-export
packages/shared/src/schemas/export.schema.ts                        enum + MacroclimatePayload
apps/api/src/services/pdf/templates/macroclimateReport.ts           NEW template (~360 lines)
apps/api/src/services/pdf/templates/index.ts                        register
apps/web/src/v3/observe/modules/macroclimate-hazards/MacroclimateDashboard.tsx  handleExport + button
apps/web/src/v3/observe/modules/topography/TopographyDashboard.tsx              refactor → pickDefined
apps/web/src/v3/observe/modules/earth-water-ecology/EarthWaterEcologyDashboard.tsx  refactor → pickDefined
```

## Macroclimate template layout

- **Gradient hero** (`#ECFDF5 → #FEF3C7`, Earth Green → soft amber)
  summarising hardiness zone, hazard total, average mitigation %.
- **4-column KPI strip** — Hardiness zone · Annual precip · Solar
  radiation · Growing-season days.
- **Seasonal markers grid** — Last spring frost · First fall frost ·
  Prevailing wind (suppressed if all three are absent).
- **Monthly normals table** — month · precip · mean max · mean min
  (suppressed if empty).
- **Climate opportunities list** — derived `solarOpportunities()`.
- **Hazard inventory table** — kind · label · risk badge · trend
  arrow · status badge · mitigation % bar · window · notes. Sorted
  by `risk_weight − mitigation_pct/100` descending.
- **Hazard status grids** — Active vs Mitigated + Average mitigation,
  then by Risk and by Status (suppressed if zero hazards).
- **Recommended actions** — heuristic table covering frost-monitoring,
  high-risk under-mitigated flood, unresolved wind, active fire, plus
  a generic seasonal-review fallback.
- **`notAvailable()` empty state** if `payload.macroclimate` absent.

## Refactor parity

Two existing callers refactored:

- **TopographyDashboard.tsx** — four `.map()` blocks (`contours`,
  `highPoints`, `drainageLines`, `transects`) ~25 LOC removed.
  Behaviour change: `transect.sourceApi` previously used
  `!== undefined` (would have kept `null`); `pickDefined` strips
  `null` too. Stores never emit `null` for that field today, so
  payload-byte-identical for live data.
- **EarthWaterEcologyDashboard.tsx** — six `.map()` blocks across
  soil samples, water systems, ecology. ~50 LOC removed. The two
  computed-boolean cases (`hasJarTest`, `hasRoofCatchment`) stay
  inline since they remap field names — `pickDefined` doesn't apply.

Verified via tsc on `apps/web` after each refactor.

## Verification

1. `cd apps/api && tsc --noEmit` — exit 0.
2. `cd apps/web && tsc --noEmit` — exit 0 before and after the
   refactor.
3. Manual smoke (preview, `mtc` project):
   - `/v3/project/mtc/observe` → Macroclimate panel → dashboard →
     `Export macroclimate report`.
   - Label flips to `Generating…`; ~1–3 s later a new tab opens with
     the PDF. Hazard table populated; KPI strip renders.
4. Empty-state path: project with no hazards + no climate layer →
   PDF renders the `notAvailable()` card.
5. Parity: Topography and EWE PDFs export with the same content
   pre/post refactor.

## Consequences

- Macroclimate becomes the sixth Observe export; **six of nine Observe
  modules** now have shipped exports.
- Three callers share the same payload-builder primitive; future
  module exports drop straight onto `pickDefined`/`pickTruthy` without
  reinvention.
- The `inProgress` / `in_progress` casing mismatch between
  `hazardCounts()` and `MacroclimatePayload` is bridged at the call
  site (one explicit remap line). Acceptable — schema chose snake_case
  to align with the `HazardStatus` enum values.
- Deferred: EWE inert-CTA sweep (tabs, `This season ▾`, etc.) still
  pending — flagged for a follow-up session.

## References

- ADR 2026-05-10 (Topography export, recipe lock)
- ADR 2026-05-10 (Earth · Water · Ecology export)
- `packages/shared/src/store-mirrors/pickHelpers.ts`
- `apps/api/src/services/pdf/templates/macroclimateReport.ts`
