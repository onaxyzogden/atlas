# 2026-05-12 — Observe `Ring` helper lifted to shared component


**Closed.** Closes deferred follow-up 3 from the 2026-05-11 Human Context
reskin ADR. The gold conic-gradient `Ring({ value })` helper existed as
14 byte-identical local copies across every Observe dashboard and detail
page — same JSX, same `--progress` CSS variable, same
`observeExtras.module.css` `.ring` rule, distinguished only by which
local alias (`obsx` vs `hc`) the CSS module was imported under. New
`apps/web/src/v3/_shared/stageCard/Ring.tsx` exports the component as
default; each consumer dropped its local `function Ring(...)` block plus
the now-unused `type CSSProperties` React import and added
`import Ring from '../../../_shared/stageCard/Ring.js'`. The 14 files
touched: BuiltEnvironment / EarthWaterEcology / Ecological / Hydrology /
JarPercRoof / HumanContext / StewardSurvey / Macroclimate /
SectorCompass / Sectors / Swot{Dashboard,DiagnosisReport,Journal} /
Topography. Net −126 lines of duplicated boilerplate, +12 in the shared
component. `pnpm --filter @ogden/web typecheck` clean (exit 0). Visual
end-to-end confirmation of the Ring inside an open dashboard was
blocked — demo project's Observe dashboards are data-gated ("Site
Intelligence is available for real projects. The MTC sample ships with
mock data only.") so the lazy `ModuleSlideUp` dashboards never mount on
the preview's mock data. Lift is mechanically pure-refactor.
