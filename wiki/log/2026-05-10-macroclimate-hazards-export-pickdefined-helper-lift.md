# 2026-05-10 — Macroclimate & Hazards export + `pickDefined` helper lift


Sixth Observe-stage PDF export shipped, plus the conditional-spread
payload builder lifted into a shared helper at the rule-of-three.

`macroclimate_report` follows the locked 4-file recipe — `ExportType`
enum + `MacroclimatePayload` schema, a new `macroclimateReport.ts`
template (gradient hero, 4-column climate KPI strip, seasonal-marker
grid, monthly normals table, climate-opportunity list, hazard
inventory sorted by risk × mitigation, status mini-grids, heuristic
recommended actions, `notAvailable()` empty state), registry entry,
and an `Export macroclimate report` button on
`MacroclimateDashboard.tsx`.

Two generic helpers — `pickDefined` (skip `!= null` fields) and
`pickTruthy` (skip falsy fields) — extracted to
`packages/shared/src/store-mirrors/pickHelpers.ts` and re-exported
from `@ogden/shared`. Three callers now share the same primitive:
the new Macroclimate handler plus refactored Topography (4 `.map()`
blocks, ~25 LOC removed) and EWE (6 `.map()` blocks, ~50 LOC
removed) handlers. Decided against a monolithic `toExportPayload()`
because SWOT does pass-through and each module touches a different
field set — two small helpers + a one-line spread per call site is
the honest abstraction.

Verification: `tsc --noEmit` on `apps/api` and `apps/web` clean
before and after the refactor.

Deferred: EWE inert-CTA sweep (tabs, `This season ▾`, …) — picked
up in a follow-up session.

ADR:
[2026-05-10 Atlas Macroclimate Export](decisions/2026-05-10-atlas-macroclimate-export.md).
