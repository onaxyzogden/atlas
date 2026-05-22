# 2026-05-21 — Map-sheet exports A5: base/zone web actions via sheet dropdown

**Branch:** `feat/atlas-permaculture`
**Commit:** `57a02bbb`
**ADR:** [[2026-05-21-atlas-master-plan-map-export]]
**Roadmap:** `~/.claude/plans/how-close-is-atlas-olos-lexical-metcalfe.md`

## What & why

Phase A shipped the full `master_plan` captured-map export end-to-end. The
server already delivered two thinner siblings — `renderBaseMapSheet`
(title "Base Map", PDC Week 2) and `renderZoneMapSheet` (title "Zone
Map", PDC Week 4) — registered in `TEMPLATE_REGISTRY`, with all three
ExportTypes in the shared union. The only gap was the **web action** to
capture the live map and POST these two types. A5 closes it.

## Approach (user-confirmed: single dropdown control)

Refactored the single-purpose `MasterPlanExportButton.tsx` →
`MapSheetExportControl.tsx`: one floating Plan-stage control whose trigger
opens a `MapControlPopover` (variant `dropdown`) listing Master Plan ·
Base Map · Zone Map. Retires one-button-per-type sprawl before it starts.

Extracted a pure, exported `buildMapSheetPayload(type, captured, zones)`
so the per-type payload branching is unit-testable with no map/DOM:

- `base_map_sheet` → `{ mapSheet: { mapImages:[img] } }` (bare site image)
- `zone_map_sheet` → `+ legend` (category legend, **no** `zones[]`)
- `master_plan`    → `+ legend + full zone roster`

The thin base/zone server templates ignore `mapSheet.zones`, so only
`master_plan` carries the roster. Caption embeds the sheet label + date.

## Slices

- **Refactor + dropdown** (`57a02bbb`) — rename/rewrite the control,
  `buildMapSheetPayload`, `MapControlPopover` dropdown, per-row
  generating/disabled state; DesignPage mount import + tag updated
  (one render-prop site, the only mount with the live map instance).
- **Test** (same commit) — `__tests__/MapSheetExportControl.test.ts`,
  5 specs on `buildMapSheetPayload` (master incl. roster+legend; zone
  legend-no-roster; base image-only; legend dedupes by category; caption
  + single image per type).

## Reuse (no new infra)

`captureMapImage`, `api.exports.generate`, `MapControlPopover`,
`buildLegend` + `useZoneStore`/`ZONE_CATEGORY_CONFIG`, tokens. No
api/shared changes — server templates + schema already done in Phase A.

## Verification

- 5/5 new unit specs green.
- Web typecheck via the 8 GB node `tsc` script: clean — only the 3 known
  pre-existing unrelated errors remain (`StepBoundary.tsx`,
  `HostUnionContextMenu.test.tsx`, `HostUnionDrilldownCard.test.tsx`),
  untouched by this change.
- **Deferred (stated, not claimed):** live-preview screenshot of the
  dropdown — reaching the Plan view needs auth + seeded project + headless
  WebGL + a MapTiler key, the same wall Phase A's e2e was explicitly
  deferred behind. This is a UI refactor of an already-verified pattern
  (Phase A proved the render path) covered by typecheck + unit tests.

## Follow-ups

- When a live preview env is available, screenshot the dropdown + each
  export → download (closes the deferred e2e for the whole captured-map
  family).
- **Phase B** — plant/guild/planting-plan layer (Weeks 7–8), independent.
- **Phase C** — finish Plan-stage authoring (Weeks 4/9).
