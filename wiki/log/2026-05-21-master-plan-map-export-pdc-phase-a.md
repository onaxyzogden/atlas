# 2026-05-21 — Master-plan / composite map export (PDC Phase A)

**Branch:** `feat/atlas-permaculture`
**ADR:** [[2026-05-21-atlas-master-plan-map-export]]
**Roadmap:** `~/.claude/plans/how-close-is-atlas-olos-lexical-metcalfe.md`

## What & why

Closed the #1 gap blocking Atlas from being the only tool a student
uses to produce an OSU PDC portfolio: there was **no rendered
design-map export**. Atlas drew every feature and fetched every layer
but exported only tables + narrative — yet the gradeable artifact for
Weeks 2 (Base Map), 4 (Map Current Zones), 9 (Zone 1 Design), and 10
(Final Project) is an annotated *map sheet*.

## Approach

Client-capture, not server-render (full rationale in the ADR). The web
client grabs the live MapLibre canvas to a base64 PNG and ships it in
the export `payload`; a new server template composes it with the zone
roster, legend, narrative, and feature inventory into the existing
Puppeteer HTML→A4 PDF→S3 pipeline. No new server infrastructure; the
PDF shows exactly the view the steward saw.

## Slices (each its own commit, per the rebased-branch rule)

- **A1** (`ffa66469`) — `captureMapImage.ts` util + `preserveDrawingBuffer: true` on the DesignMap MapLibre init (without it `toDataURL` returns blank). Forces a render frame before reading the canvas; downscales to ≤2400px longest edge.
- **A2/A3** (`b2c8c2f8`) — shared schema (`master_plan` / `base_map_sheet` / `zone_map_sheet` ExportTypes + `MasterPlanPayload`) and three templates (`masterPlan.ts`, `mapSheet.ts`) registered in the exhaustive `TEMPLATE_REGISTRY`.
- **A4** (`0d43ed51`) — `MasterPlanExportButton.tsx` mounted in the `DesignPage` DesignMap render-prop (only place with the live map instance; `ReportingPanel` has no map access).
- **Tests** (`972a7ae7`) — `masterPlan.pdfTemplate.test.ts`, 7 specs.

## Security

The captured `dataUrl` is interpolated unescaped into `<img src>`, so
both templates gate it through `isImageDataUrl` (regex allowing only
`data:image/(png|jpeg|jpg|webp);base64,`). Forged URLs like
`javascript:alert(1)` are dropped before reaching markup; captions and
narrative are `esc`-escaped. Locked by a unit test.

## Verification

- 7/7 template unit tests green (embed, derive-from-features fallback, injection guard, not-available path, map-sheet titles).
- All packages typecheck (3 pre-existing unrelated web errors confirmed untouched).
- Visual proof: a throwaway Puppeteer harness rendered a representative captured map through `renderMasterPlan` to a real A4 PDF + full-page PNG (same settings `PdfExportService` uses). Screenshot confirmed map image, legend, narrative, zone roster + totals, feature-inventory KPIs, and phasing table all render. Harness deleted (not committed).
- **Deferred:** true browser e2e (auth + seeded project + headless WebGL + MapTiler key) — judged high-risk/high-effort here; stated explicitly rather than assumed.

## Follow-ups

- **A5** — thin web buttons for `base_map_sheet` / `zone_map_sheet` (server side already delivered; reuse the same capture).
- **Phase B** — plant/guild/planting-plan layer (Weeks 7–8), independent, lowest urgency.
- **Phase C** — finish Plan-stage authoring (zone/structure/access/utility draw→label→persist) so the captured sheet is complete and clean (Weeks 4/9).
