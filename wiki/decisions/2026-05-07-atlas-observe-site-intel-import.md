# 2026-05-07 — Atlas Observe · Site Intelligence JSON Template Import

**Branch:** `feat/atlas-permaculture` · **Type:** feature

## Context

Atlas has historically populated site intelligence (climate, soils,
hydrology, zoning, etc.) only via country-specific external adapters
fetched when a parcel boundary is drawn. There was no path for stewards
to supply their own data when:

- adapters don't cover the region (gaps for non-US/CA countries),
- the steward has higher-quality local data (lab soil tests, on-site
  climate logs, expert knowledge),
- the steward is offline / in the field and needs to enter data later.

Existing imports only handle parcel boundaries (KML/KMZ/GeoJSON).
Existing exports cover annotations only. This feature fills the inverse
gap for layer/site-intel data.

## Decision

Add a download/upload JSON template flow as an **alternative** path
into `siteDataStore`, mounted next to `ExportButton` on the Observe map.

**Scope (Tier 1):**
- 8 layers: `elevation`, `soils`, `watershed`, `wetlands_flood`,
  `land_cover`, `climate`, `zoning`, `groundwater`.
- 7 project notes: `address`, `acreage`, `ownerNotes`, `zoningNotes`,
  `accessNotes`, `waterRightsNotes`, `visionStatement`.

**Merge mode:** per-layer override. A user-imported layer replaces the
fetched layer of the same `layerType` in `siteDataStore` (tagged
`sourceApi: 'user_import'`). Layers absent from the upload are left
untouched. Project notes overwrite the corresponding `projectStore`
fields when set.

**Validation:** Zod-strict at the top level (`__meta`, optional
`__instructions`, `projectNotes`, `layers`). Per-layer summaries are
lenient on unknown fields (stripped of `__hint_*` siblings, then run
through `normalizeSummary` from `@ogden/shared/scoring` at apply time).
Hard errors block apply: malformed JSON, `include=true` without
attribution or dataDate. Soft warnings surface but do not block:
schemaVersion mismatch, projectId mismatch, future dataDate, empty
template.

**Builtin guard:** `isBuiltin === true` projects show the Import button
disabled with tooltip "Read-only sample project."

**Enrichment refresh:** apply drops `enrichment` on the project's
`siteData` slice and calls `enrichProject(projectId)` so the AI layer
re-runs against the merged set.

## Implementation

- New: `apps/web/src/v3/observe/lib/siteIntelTemplate.ts` — template
  builder + `LAYER_TEMPLATE_FIELDS` map (single source of truth for
  per-layer fillable fields, derived from `LayerSummaryMap`); emits
  `__hint_<key>` documentation siblings inline so offline users have
  guidance without external docs.
- New: `apps/web/src/v3/observe/lib/siteIntelTemplate.schema.ts` — Zod
  schema, strict on top-level shape, with `superRefine` enforcing
  `attribution` + `dataDate` when `include=true`.
- New: `apps/web/src/v3/observe/lib/siteIntelTemplate.apply.ts` —
  `parseAndValidate`, `buildDiff`, `applyTemplate` with `MockLayerResult`
  construction tagged `sourceApi: 'user_import'`.
- New: `apps/web/src/v3/observe/components/ImportSiteIntelButton.tsx`
  + `.module.css` — bottom-right floater (sits 52 px above
  `ExportButton`); popover with Download / Upload actions; review
  modal showing layer + note diff with warnings (yellow) and errors
  (red); apply blocked when errors or empty diff.
- Edit: `apps/web/src/v3/observe/ObserveLayout.tsx` — mount alongside
  `ExportButton` in the canvas slot.

## Verification

- `tsc` exit 0.
- Functional eval against the running dev server confirmed: schemaVersion
  1; all 8 Tier 1 layer keys + 7 note keys present; soils summary
  contains the 13 expected fields with `__hint_*` siblings; filename
  pattern `atlas-site-intel-<slug>-<id8>-<YYYYMMDD>.json`; project notes
  prefilled from `LocalProject`.
- Validation paths: malformed JSON → parse error; `include=true` with
  empty attribution + null dataDate → both required-field errors;
  `__meta.projectId` mismatch → soft warning only.
- Apply: replaced soils layer (`sourceApi: 'user_import'`, pH 6.8,
  OM 4.2, attribution + dataDate preserved), wrote `ownerNotes` patch
  to `projectStore`, re-triggered enrichment.
- Builtin guard: on `351 House — Atlas Sample`, Import button is
  `disabled` with title "Read-only sample project."
- Screenshot via preview MCP timed out repeatedly; DOM-level checks
  documented above stand in lieu (per CLAUDE.md verification rule, the
  screenshot gap is called out rather than glossed over).

## Notes

- `Tier1ImportLayerType` is a literal union in `siteIntelTemplate.ts`
  rather than a re-export of `dataSources.Tier1LayerType` — explicit
  per the approved plan, scoped to the import surface.
- `dataDate` falls back to today on apply when missing, despite Zod
  rejecting that case at parse time (defensive belt + suspenders for
  any future schema relaxation).
- Pre-existing `validateDOMNesting(<button> in <button>)` warnings in
  `ObserveModuleBar` were observed during verification — unrelated to
  this work.
