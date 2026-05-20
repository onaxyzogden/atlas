# 2026-05-10 — Sectors & Zones export + EWE inert-CTA sweep


Seventh Observe-stage PDF export shipped — `sectors_zones_report` —
and the Earth · Water · Ecology dashboard's three inert CTA
surfaces removed in the same commit under the symmetric
delete-OR-wire rule.

`sectors_zones_report` follows the locked 4-file recipe:
`ExportType` enum + `SectorsZonesPayload` schema (sectors · zones ·
sectorCounts · zoneCounts · optional prevailingWind), a new
`sectorsZonesReport.ts` template (gradient hero `#ECFDF5 →
#EFF6FF`, 4-column KPI strip, sector inventory with bearing labels
and intensity badges, sectors-by-type mini-grid, area-sorted zone
inventory with PC-zone / invasive / succession columns,
zones-by-category grid, heuristic recommended actions for
fire-defensible buffers, windbreak buffers, sun-zone food
production, sector↔zone gaps, invasive intervention, and
`notAvailable()` empty state), registry entry, and an
`Export sectors report` button on `SectorsDashboard.tsx`. Payload
uses `pickTruthy` for string optionals and inline conditional
spreads for the four enum/numeric optionals where falsy-but-valid
semantics need preserving (matching the EWE precedent for
`hasJarTest` / `hasRoofCatchment`).

EWE sweep: `TabsAndActions` renamed `ExportActions` — six-tab
section nav (Overview / Soil / Water / Ecology / Lab Results /
Trends) deleted, `This season ▾` dropdown deleted, four-tab
species filter (All / Flora / Fauna / Fungi) inside `EcologyCard`
deleted. `EcologyCard` props simplified (`boundary`, `caption`
were unused after the strip). `CalendarDays` + `ChevronDown`
Lucide imports dropped. Live Export button preserved by promoting
it out of the doomed tabs row into its own actions row inside the
same `diagnostic-tabs-row` container — CSS layout unchanged.

tsc clean on apps/api and apps/web. Manual smoke (mtc project):
Sectors panel → dashboard → `Export sectors report` opens new tab
with PDF; EWE dashboard confirms zero inert CTAs and live Export
still works. Empty-state path: project with no sectors + no zones
renders the `notAvailable()` Sectors hint card.

Seven Observe exports now shipped across all five reviewed Observe
modules (SWOT trio cross-stage). Remaining unshipped Observe
surfaces — Module 1 Built Environment, Module 6 Resources &
Inputs, Module 7 Boundaries — are lower-density and can wait.

See [wiki/decisions/2026-05-10-atlas-sectors-zones-export.md](decisions/2026-05-10-atlas-sectors-zones-export.md).
