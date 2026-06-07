# 2026-06-04 -- Act: SectorsEditorPanel arc-direction glyph + notes field

**Branch.** `feat/atlas-permaculture` (one explicit-path commit `9cafb5c3`, **not
pushed**). Follow-up to the SectorCompass -> right-rail editor (`d914473c`,
[[log/2026-06-04-atlas-act-sector-compass-rail-editor]]). Entity:
[[entities/act-tier-shell]]. Plan:
`~/.claude/plans/elements-of-this-concept-toasty-ember.md`. No ADR
(presentational extension reusing the existing data layer).

## Change

The operator asked to extend `SectorsEditorPanel` with an arc-direction visual
hint **and** a notes field (confirmed both, via AskUserQuestion). Two authoring
gaps: bearing/arc were bare numbers (no sense of which way / how wide), and the
`SectorArrow.notes?` field existed in the model but had no UI. One file changed:
`apps/web/src/v3/act/sectors/SectorsEditorPanel.tsx`.

- **Arc-direction glyph.** New leading **"Dir"** column. A local
  `SectorArcGlyph` helper renders a 22px SVG (faint disc + gold north tick + one
  type-tinted wedge) from the row's `bearingDeg/arcDeg/type`, mirroring
  `SectorCompassDiagram`'s `(deg - 90)` polar mapping + large-arc-flag logic at
  small scale. Those diagram helpers are module-local + hardcoded to a 300px
  canvas, so rather than refactor an unrelated file the math is re-implemented
  locally (a `SECTOR_COLORS` copy of `MANUAL_COLORS`). The glyph reads the same
  store fields the cells edit, so it updates live. `role="img"` +
  `aria-label="Faces N degrees, A degree arc"`.
- **Notes field.** A full-width second `<tr>` beneath each manual row holds a
  text `<input aria-label="Sector notes">` bound to `s.notes ?? ''`, writing
  `updateSector(s.id, { notes: e.target.value || undefined })`. Keeps the narrow
  rail readable vs a 7th cramped column. No schema/store change -- `notes?`
  already existed on `SectorArrow`.
- **Computed rows.** Read-only wind/solar rows get a muted leading Dir cell; the
  "Computed climate layers" divider `colSpan` bumped 5 -> 6 for alignment.

Inline styles only (`dirCellStyle`, `computedDirCellStyle`, `notesInputStyle`) --
the `.module.css` needed no change, so the slice stayed a single file.

## Verification

- **tsc:** `apps/web` `npx tsc --noEmit` -- the only errors were 4 pre-existing
  TS18048 in `observe/lens/lensData/__tests__/observeMap.test.ts` (foreign WIP, a
  file not touched here); **zero** reference the edited file.
- **vitest** (bounded, `--pool=forks --testTimeout=20000`): `src/v3/act/sectors`
  + `src/v3/act/asBuilt` -> **36 passed** (incl. `actSectorsEditorStore`).
- **Live preview** (project "Baseline Test Homestead", `/v3/project/8a815400-.../act`,
  matrix `sectors` on): opened the editor + seeded one sector. DOM proof:
  6-column header (`Direction/Bearing/Sector/Arc/Intensity/Remove`); glyph
  `svg[role="img"]` present and its `aria-label`/`path` updated live from
  "Faces 270 degrees, 60 degree arc" to "Faces 90 degrees, 120 degree arc" after
  an `updateSector` bearing/arc edit; notes input present and a `notes`
  round-trip persisted store->input; notes sub-row `colSpan=5` after the leading
  cell (6 total); **Done** reverted the rail
  (`actSectorsEditorStore.active === false`, glyph gone). Computed rows were
  empty here (this project has no boundary centroid, so `computedSectorRows`
  returned `[]`) -- the read-only branch's colSpan/cell change is static and tsc-
  verified but not exercised by this project's data. `preview_screenshot` hung
  ([[project-screenshot-hang]], WebGL map); relied on DOM proof.

## Process / covenant

One explicit-path commit (`9cafb5c3`; staged the single edited file by name,
`git diff --cached --name-only` confirmed exactly one path against a tree full of
foreign WIP, left untouched). Message BOM-free UTF-8 via
`[System.IO.File]::WriteAllText` + `git commit -F`, ASCII-only,
`Co-Authored-By: Claude Opus 4.8`. Branch fetched + divergence-checked
(0 behind / 214 ahead), **not pushed** ([[project-branch-rebase]]). No-deletion
respected (diagram file untouched; glyph math copied, not moved). Commit-on-verify
([[feedback-commit-immediately-on-rebased-branches]]).
