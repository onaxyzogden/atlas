# 2026-05-07 — Observe · Site Intelligence JSON Template Import


**Branch:** `feat/atlas-permaculture` · **Type:** feature

Added an alternative path into `siteDataStore` for stewards who lack
adapter coverage, hold higher-quality local data, or work offline.
Bottom-right Import floater on the Observe map (above `ExportButton`)
exposes Download / Upload of a JSON template scoped to the active
project. Tier-1 scope: 8 layer types + 7 project-note fields.

Template generator derives fillable fields from `LayerSummaryMap`
(single source of truth) and emits `__hint_<key>` documentation
siblings inline. Zod-strict top-level schema with superRefine for
`include=true` requirements; lenient on summary fields, normalised
through `@ogden/shared/scoring/normalizeSummary` at apply time.
Per-layer override merge — imported layers replace same-`layerType`
entries tagged `sourceApi: 'user_import'`; `enrichment` is dropped
and `enrichProject` re-fires.

Builtin projects (`isBuiltin === true`) show the Import button
disabled with tooltip "Read-only sample project."

Verified end-to-end via functional eval: tsc clean, template shape +
filename + prefilled notes, four validation paths (malformed JSON /
missing attribution / missing dataDate / projectId mismatch), apply
landing in `siteDataStore` and `projectStore`, builtin guard
disabled-state copy. Preview screenshot tooling unresponsive — DOM
state verified directly and noted in decision per CLAUDE.md.

ADR: [decisions/2026-05-07-atlas-observe-site-intel-import.md](decisions/2026-05-07-atlas-observe-site-intel-import.md)
