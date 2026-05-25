# Neutralize the Earth UI-chrome ramp to cool grey (grey + gold identity)

**Date:** 2026-05-25
**Status:** Accepted
**Scope:** `apps/web/src/styles/tokens.css`, `apps/web/src/lib/tokens.ts`, `packages/shared/src/scoring/tokens.ts`, ~58 CSS/TSX consumers

## Context

The estate design system shipped a warm-brown **Earth ramp** (`--color-earth-50..900`)
that dressed *UI chrome* — panel/card backgrounds, borders, inputs, footers, muted
text, sparkline grid — across ~58 files. The steward wanted that warm-brown chrome
neutralized to a **cool neutral grey** so the UI reads as **grey + gold**, while
keeping two things intact:

1. The estate **gold** (`#d4af5f` / `#b08a3a` / `#c4a265`) and **sage** accents as the
   brand / primary / active identity.
2. The deliberate **biophilic map-data palette**. Per the UX-Scholar rule (2026-04-23,
   documented in [[concepts/design-system]]), earth hues are *reserved for map data* —
   they are data signifiers, not chrome. The brown zone/structure/path identity colors,
   the parcel-boundary line (`#7d6140`), and the map label/halo tokens are **not** UI
   chrome and stay as-is.

## Decision

**Rename, don't redefine.** `--color-earth-*` → `--color-neutral-*` (CSS) and the TS
`earth` export → `neutral`, rather than redefining the earth values in place. Cleaner
semantics (the token name now matches its role), at the cost of a larger but mechanical
diff. A rename also makes any *missed* consumer fail loudly (undefined var / missing
export) instead of silently rendering the wrong hue.

**Cool-grey ramp** (mode-agnostic; defined only in `:root`, *not* overridden in
`dark-mode.css`, so both themes inherit it). `-600` lands at ~7:1 on white to match how
`earth-600 #7d6140` was used for text/buttons:

```
--color-neutral-50:#f7f8f9 100:#eef0f2 200:#dde1e5 300:#c3c9cf 400:#99a1a9
            500:#6f777f 600:#545c64 700:#3f464d 800:#2b3035 900:#181b1e
--color-neutral-600-rgb: 84, 92, 100
```

**Chrome tokens retuned** off the warm-brown casts: borders `rgba(82,72,52,…)` →
`rgba(84,92,100,…)`; shadows `rgba(49,38,23,A)` → `rgba(24,27,30,A)` (alphas kept);
`--color-text #1f231e→#1b1e22`, `--color-text-muted #5a5443→#565c63`,
`--color-text-subtle #7d7864→#7a808a`. Mirrored in the two TS bridges
(`lib/tokens.ts` `chart.grid/muted` + `semantic.*`; `scoring/tokens.ts` `semantic`
block aligned to estate values — `primary #b08a3a`, `accent #5a8a5a`).

**Explicitly kept (map-data, not chrome):** `--color-zone-*`, `--color-structure-*`,
`--color-path-*`, `--color-crop-*`, `--color-map-boundary` (`#7d6140`), `--color-map-label`
(`#f2ede3`) + halo, `avatar.earth`, all gold + sage tokens, `group.*`/`status.*`/
`confidence.*` data hues, and the PDF `--earth-green` (`#15803D`, actually a green).

## Consequences

### Positive
- UI chrome reads cool grey in both light and dark; gold/sage identity and the biophilic
  map layers are visually unchanged.
- The token name now states its role (`neutral` chrome vs reserved map-data browns),
  reducing the chance a future consumer reaches for an earth ramp to paint chrome.

### Negative / follow-up
- **One entangled file:** `MapCanvas.tsx` carried both the palette rename *and* an
  unrelated `MapCoordinateReadout` feature (new untracked component). Because the rename
  of the `earth` export makes the old import fail to compile, the palette change in that
  file is load-bearing for the commit; the readout component + its test were bundled into
  the same commit to keep HEAD green. Minor scope bleed, recorded here.
- **Phase 4 deferred:** ~40 hardcoded warm literals that *bypass* the token system in
  map-overlay chrome (dark glass panels `rgba(31,29,26,A)`, near-black `#1a1611`,
  parchment hairlines `rgba(242,237,227,A)`). Near-black/near-white with a faint warm
  cast — high churn, low visual delta, several border on map rendering. Defer unless the
  grey-vs-brown delta is noticeable in preview.
- **Verification gap:** color correctness was confirmed via live computed-style
  inspection (`preview_eval`), not screenshots — the preview screenshot tool was
  unresponsive in this environment. Light + dark `:root` confirmed zero orphaned
  `--color-earth-*` refs; chrome cool grey; gold primary intact; map browns preserved.

## References
- [[concepts/design-system]] — token sources, the map-data reservation rule
- [[decisions/2026-04-23-oklch-token-migration]] — the dark-mode/semantic token system this rides on
- `apps/web/src/styles/tokens.css`, `apps/web/src/lib/tokens.ts`, `packages/shared/src/scoring/tokens.ts`
