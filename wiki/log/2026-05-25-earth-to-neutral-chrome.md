# 2026-05-25 — Neutralize Earth UI chrome to cool grey (grey + gold)

**Branch.** `feat/atlas-permaculture` (62 files; palette rename + bundled readout).

Steward request: neutralize the warm-brown **Earth** UI chrome to a **cool neutral
grey** so the app reads as **grey + gold**, while keeping (a) estate gold + sage as the
brand/primary/active identity and (b) the biophilic **map-data** palette untouched
(zone/structure/path browns, parcel boundary `#7d6140`, map label/halo) per the
UX-Scholar "map data ≠ chrome" rule.

**Approach — rename, not redefine.** `--color-earth-*` → `--color-neutral-*` (CSS) and
the TS `earth` export → `neutral`. A rename makes any missed consumer fail loudly
(undefined var / missing export) rather than silently render the wrong hue. New cool-grey
ramp (`-50 #f7f8f9` … `-900 #181b1e`, `-600 #545c64` ≈ 7:1 on white) defined only in
`:root` so both themes inherit it. Chrome casts retuned: borders `rgba(82,72,52)` →
`rgba(84,92,100)`, shadows `rgba(49,38,23)` → `rgba(24,27,30)`, muted/subtle text to cool
greys. Mirrored in `lib/tokens.ts` (`chart`, `semantic`) and `scoring/tokens.ts`
(`semantic` block aligned to estate values).

**Kept (map-data, not chrome):** `zone/structure/path/crop` browns, `map.boundary`
`#7d6140`, `map.label` `#f2ede3` + halo, `avatar.earth`, gold + sage, `group/status/
confidence` data hues, PDF `--earth-green` `#15803D` (a green).

**Entanglement.** `MapCanvas.tsx` mixed the rename with an unrelated `MapCoordinateReadout`
feature (new untracked component + test). Single-file hunks can't be split
non-interactively, and the `earth`→`neutral` export rename makes the old import
non-compiling — so the readout component + test were bundled into the same commit to keep
HEAD buildable (steward-confirmed). Other unrelated working-tree changes (ScaleControl on
the v3 maps, CommandCentreShell grid fix, financial/economics/capital-partner/material-
substitution edits) were left **out** of the commit.

**Also.** `apps/web/package.json` `lint` script gained `--max-old-space-size=8192` (it was
plain `tsc --noEmit` and OOM-crashed at exit 134; now matches `typecheck`). Committed
separately.

**Verification.** Typecheck exit 0; lint exit 0 (OOM gone); web tests (249 files) +
shared tests (347/347) green. Color correctness confirmed via live computed-style
inspection (`preview_eval`) — the preview **screenshot tool was unresponsive**, disclosed
rather than assumed. Light + dark `:root`: zero orphaned `--color-earth-*`, chrome cool
grey, gold primary (`#b08a3a` / `oklch(75% 0.10 82)`) intact, map browns preserved
(`#7d6140`, `#8B6E4E`).

**Deferred.** Phase 4 — ~40 hardcoded warm literals bypassing the token system in
map-overlay chrome (dark glass `rgba(31,29,26)`, `#1a1611`, parchment hairlines). High
churn / low delta; revisit only if the grey-vs-brown difference reads in preview.

ADR [[decisions/2026-05-25-atlas-earth-to-neutral-chrome]]. Updates
[[concepts/design-system]].
