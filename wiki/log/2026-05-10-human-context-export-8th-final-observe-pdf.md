# 2026-05-10 — Human Context export (8th + final Observe PDF)


Shipped the 8th and final Observe-stage PDF export — Module 1 Human
Context — closing the Observe export backlog. Follows the locked
4-file recipe established in the Topography ADR
(`2026-05-10-atlas-topography-export.md`) and refined across the
seven prior modules.

**Shipped:**
- `packages/shared/src/schemas/export.schema.ts` — `'human_context_report'`
  added to `ExportType` enum; new `HumanContextPayload` schema (steward
  profile · regional context · phase notes · milestones · archetype ·
  totals); wired into `CreateExportInput.payload`.
- `apps/api/src/services/pdf/templates/humanContextReport.ts` — new
  ~380-line template. Gradient hero (Earth Green → Harvest Gold) with
  overall-health label; 4-column KPI strip (people · place · vision ·
  milestones); steward profile table + archetype card; chip-style
  rosters for skills · place-names · strengths · challenges · core
  functions · experience goals · success metrics · principles ·
  guiding values · constraints; vision-statement blockquote; local
  network table; phased-intent table; milestones table; heuristic
  recommended-actions covering survey gaps · network seeding ·
  vision statement · core-function definition · phased sketch.
- `apps/api/src/services/pdf/templates/index.ts` — `renderHumanContextReport`
  imported + registered.
- `apps/web/src/v3/observe/modules/human-context/HumanContextDashboard.tsx`
  — `useState` + `Download` + `api` + `pickTruthy` imports; new
  `handleExport` async function that derives all four completeness
  percentages locally via the existing `derivations.ts` helpers and
  ships the payload (excluding the bulky moodboard image data URLs —
  only the count goes through); export button injected into
  `HumanHero` below the description, styled to match the Sectors
  pattern.

**Verification:** `tsc --noEmit` exit 0 on `packages/shared`,
`apps/api`, `apps/web`.

**Observe export backlog: closed.** All eight Observe modules now have
a server-rendered PDF export:

| # | Module | Type |
|---|---|---|
| 1 | Human Context | `human_context_report` (this session) |
| 2 | Macroclimate & Hazards | `macroclimate_report` |
| 3 | Topography | `topography_report` |
| 4 | Earth · Water · Ecology | `earth_water_ecology_report` |
| 5 | Sectors, Microclimates & Zones | `sectors_zones_report` |
| 6 | Built Environment | `built_environment_report` |
| 7 | SWOT synthesis | `swot_synthesis` / `swot_diagnosis_report` / `swot_journal` |
| 8 | Resources & Inputs | *— no Observe module in current build_*; covered by Plan-stage `feature_schedule` until a dedicated module ships. |

Frontend Resources & Inputs + Boundaries surfaces still use
`window.print()`, but those live outside the Observe rail — out of
scope for this backlog.
