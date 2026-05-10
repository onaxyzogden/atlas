# PDF Export Service
**Type:** service
**Status:** active
**Path:** `apps/api/src/services/pdf/`

## Purpose
Server-side PDF generation for project reports. Renders HTML templates to PDF via Puppeteer, uploads to S3/local storage, records in `project_exports` table.

## Architecture
```
POST /api/v1/projects/:id/exports
  → PdfExportService.generate()
    → Parallel DB queries (project, assessment, layers, features)
    → Template selection from TEMPLATE_REGISTRY
    → Template function → HTML string
    → Puppeteer page.setContent() + page.pdf() → Buffer
    → StorageProvider.upload() → URL
    → INSERT into project_exports
    → Return { id, storageUrl, exportType, generatedAt }
```

## Key Files
- `browserManager.ts` — Puppeteer browser singleton (lazy init, `--no-sandbox`, cleanup on server close)
- `PdfExportService.ts` — Orchestrator class (data gathering, template dispatch, render, upload)
- `templates/baseLayout.ts` — Shared CSS (design system tokens), score gauges, utility helpers
- `templates/index.ts` — Template registry + `ExportDataBag` type definition
- `templates/*.ts` — 7 individual template functions

## Export Types
| Type | Data Source | Description |
|------|------------|-------------|
| `site_assessment` | DB only | Property summary, 5 scores with breakdowns, flags, data sources |
| `design_brief` | DB only | Vision, zone allocation, structure inventory, phasing |
| `feature_schedule` | DB + payload.financial | Full feature table with areas, costs, phases |
| `field_notes` | payload.fieldNotes | Chronological entries, GPS, photos, walk routes, punch list |
| `investor_summary` | DB + payload.financial | Financial highlights, cashflow, break-even, mission radar |
| `scenario_comparison` | payload.scenarios | Side-by-side scenario diff with recommendation |
| `educational_booklet` | DB only | Plain-language property guide, glossary, next steps |
| `swot_journal` | payload.swot | Full per-entry SWOT log — bucket badges, tags, GPS, dates |
| `swot_diagnosis_report` | payload.swot | Stage bar, executive summary, quadrant overview, prioritised findings, S+O / W+T action pairs |
| `swot_synthesis` | payload.swot | Lighter narrative — hero, four-lenses card, equations, tag cloud |
| `topography_report` | payload.topography | Observe Module 3 — elevation KPI strip, feature inventory, slope/drainage/aspect synthesis, transect + elevation-pin tables, recommended actions |
| `earth_water_ecology_report` | payload.earthWaterEcology | Observe Module 4 — soil-sample roster, field-test mini-grid, water-systems trio (earthworks · storage · watercourses), ecology observations + zones, 2×2 site-layer synthesis (watershed · wetlands · critical habitat · soils), recommended actions |
| `macroclimate_report` | payload.macroclimate | Observe Module 2 — climate KPI strip (hardiness zone · annual precip · solar · growing season), seasonal markers, monthly normals table, climate-opportunity list, hazard inventory sorted by risk × mitigation, status mini-grids, heuristic recommended actions |
| `sectors_zones_report` | payload.sectorsZones | Observe Module 5 — sector arrows (type · bearing · arc · intensity), zones by area (category · PC zone · invasive · succession), sector-by-type and zone-by-category mini-grids, heuristic actions covering fire-buffer · windbreak · sun-zone food · sector↔zone gaps |
| `built_environment_report` | payload.builtEnvironment | Observe Module 1 — full eight-kind asset inventory (buildings · wells · septics · power lines · buried utilities · fences · gates · driveways), water-system mean-depth callout, overhead-power fall-zone flag, buried-utility earthworks-veto warning, design-implications cards, heuristic actions covering pin-missing-kinds · fence-walk · Plan-stage handoff |
| `human_context_report` | payload.humanContext | Observe Module 1 (people) — module-health KPI strip (people · place · vision · milestones), steward profile + archetype card, indigenous & regional context chips (place-names · strengths · challenges · local network), vision detail (statement · core functions · experience goals · success metrics · principles · guiding values · constraints), phased intent table, milestones table, heuristic actions covering survey gaps · network seeding · vision statement · phased sketch |

## Design System
- Earth Green `#15803D`, Harvest Gold `#CA8A04`, Background `#F0FDF4`
- Fira Code (headings), Fira Sans (body) — loaded via Google Fonts
- A4 format, print backgrounds, header/footer with page numbers

## Request Format
```json
{
  "exportType": "investor_summary",
  "payload": {
    "financial": { "totalInvestment": {...}, "cashflow": [...], ... },
    "scenarios": [...],
    "fieldNotes": { "entries": [...], ... }
  }
}
```
`payload` is optional — templates degrade gracefully when data is missing.

## Dependencies
- `puppeteer` — Chromium-based PDF rendering
- `StorageProvider` — S3 or local filesystem (via `getStorageProvider()`)
- `project_exports` DB table

## Notes
- Browser singleton reused across requests (new page per render, ~500ms vs 3s cold start)
- 50MB body limit on POST route to support embedded photos in field notes
- `PUPPETEER_EXECUTABLE_PATH` env var for custom Chrome binary (Docker deployments)
- Frontend integration: SWOT trio (Journal · Diagnosis Report · Synthesis) + Topography Report + Earth · Water · Ecology Report + Macroclimate & Hazards Report + Sectors & Zones Report + Built Environment Report wired via `api.exports.generate()` + `window.open(data.storageUrl)`; remaining Observe panels (Resources & Inputs, Boundaries) still use `window.print()`
- Payload-builder helpers `pickDefined` / `pickTruthy` live in `packages/shared/src/store-mirrors/pickHelpers.ts` and are reused across Topography, EWE, and Macroclimate dashboard handlers (rule-of-three lift, see 2026-05-10 Macroclimate ADR)
