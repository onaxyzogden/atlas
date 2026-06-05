# 2026-04-25 — §20 ExtractedPatternsCard shipped (commit `c02ee84`)


Feature → "Patterns from this site" card mounted on `TemplatePanel` above
the library list (when no template is selected). Renders six bundles +
a phase-structure row derived purely from the active project's stores —
no new entities, no shared-package math. Frames the project as a future
template by surfacing what would carry over: palettes, mixes, sets.

**Files:**
- `apps/web/src/features/templates/ExtractedPatternsCard.tsx` (~390 lines)
- `apps/web/src/features/templates/ExtractedPatternsCard.module.css` (~200 lines)
- `apps/web/src/features/templates/TemplatePanel.tsx` — import + mount
- `packages/shared/src/featureManifest.ts` —
  `saved-bundles-rules-hotspots-phases-costs` (§20, P3) `planned` → `partial`

**Bundles surfaced:**
- **Zone palette** — count per `ZoneCategory` with color swatches
- **Structure mix** — count per `StructureType` + cost rollup ($K total,
  with "X of Y priced" caveat when some structures lack costEstimate)
- **Path palette** — count per `PathType` with total length per class
- **Livestock set** — distinct species across paddocks + avg head/ha
- **Crop polyculture** — top 8 distinct species across crop areas
- **Utility kit** — count per `UtilityType`
- **Phase structure** — ordered chips with timeframe + completion tone

Empty-project path: shows the explanatory header + "no design content
yet" hint. Header badge tallies all placed items as "{N} ITEMS".

Read-only inventory; the actual save-as-template / locking flow remains
follow-on work tracked under `template-duplication-locking-governance`
(§20, also `partial`).

**Verification:** `cd apps/web && NODE_OPTIONS=--max-old-space-size=8192
npx tsc --noEmit` exits clean. Selective stage of 4 files only — the
parallel-session WIP stash (`stash@{0}: pre-sync stash`) was kept aside.
