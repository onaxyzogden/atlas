# 2026-05-10 — Built Environment export (8th Observe export)


Eighth Observe-stage PDF export shipped — `built_environment_report` —
covering the full eight-kind asset inventory across the Observe
Module 1 surface (buildings · wells · septics · power lines · buried
utilities · fences · gates · existing driveways).

Locked 4-file recipe: `ExportType` enum + `BuiltEnvironmentPayload`
schema (eight typed arrays + counts + totals + healthPct), new
`builtEnvironmentReport.ts` template (gradient hero, 4-column KPI
strip, buildings table, water+waste section with mean-well-depth
callout, utilities section with overhead fall-zone flag and explicit
buried-utility earthworks-veto warning, access+boundaries section,
design-implications cards coloured by tone, heuristic recommended
actions covering pin-missing-kinds / fence walks / Plan-stage
handoff at health ≥ 70%, `notAvailable()` empty state), registry
entry, and an `Export built-environment report` button in
`BuiltEnvironmentDashboard.tsx`. Payload uses `pickTruthy` for
`label`/`notes` pairs and inline conditional spreads for the
zero-is-meaningful numeric optionals (`areaM2`, `depthM`, `flowLpm`).

Wired against the V1 reader shape (`useBuiltEnvironmentStore`); the
parallel V2 unification thread mid-flight on disk preserves V1
subscription shapes by design, so the export survives the V2 land
unchanged.

tsc clean on apps/api. apps/web has only pre-existing WIP errors in
the V2-facade `builtEnvironmentStore.ts` — not introduced by this
session, not in scope.

Eight Observe exports now shipped. Remaining unshipped Observe
surfaces: Module 6 Resources & Inputs, Module 7 Boundaries.

See [wiki/decisions/2026-05-10-atlas-built-environment-export.md](decisions/2026-05-10-atlas-built-environment-export.md).
