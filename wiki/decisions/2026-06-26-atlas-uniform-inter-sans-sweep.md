# ADR: Uniform Inter sans across the whole platform -- retarget face tokens + sweep raw declarations

**Date:** 2026-06-26
**Status:** Accepted
**Scope:** `apps/web/src/styles/tokens.css` (the core), + 27 files (CycleWheel, observe-lens + compost `F` maps, ~18 `*.module.css` across dashboards/scenario/climate/crop/structures/landing, 3 inline-style `.tsx`)

## Context

In the Act Tier-0 StewardCapture, the steward saw three steward-name fields
(`.personName` / `.roleTitle` / `.tmName`) rendering in **italic serif**
(Cormorant Garamond) and asked what the platform rule on uniform font was. The
rule is on record in [[decisions/2026-05-30-atlas-plan-nav-v1.1-merge]]:
"Typography = keep current Inter sans (no Lora/serif titles, no italic planning
questions)." Over time, serif/display/mono faces had drifted back across many
files -- Cormorant Garamond, Playfair Display, Cinzel, DM Sans, DM Mono, Fira
Code, Fira Sans, JetBrains Mono, plus inline Georgia.

The steward chose an **"Everywhere (full sweep)"** scope, then confirmed two
policy points via question:

1. **Fold mono into sans too** -- ONE font family platform-wide; even the
   monospace numeric/code face collapses into the Inter sans stack.
2. **Font family only, leave all italics** -- the sweep changes `font-family`
   only; it touches **no** `font-style: italic`. The 413 italic sites are left
   exactly as-is, so the flagged names now render as italic **Inter** (uniform
   family) rather than italic serif.

## Decision

**1. Retarget the face tokens to the sans stack (the core fix)** --
`tokens.css`. Keep `--font-sans` as the canonical Inter stack; alias the other
three to it and add the previously-undefined `--font-heading` so
LevelNavigator's Cinzel fallback resolves without editing that file:

```css
--font-display: var(--font-sans);
--font-sans:    'Inter', 'Fira Sans', system-ui, -apple-system, sans-serif;
--font-serif:   var(--font-sans);
--font-mono:    var(--font-sans);
--font-heading: var(--font-sans);
```

`var()` resolves at use-time, so declaration order is irrelevant. This single
edit neutralizes **all 144** `var(--font-display|serif)` token-routed usages
across 68 CSS files **and** every `var(--font-mono)` / `var(--font-heading)`
consumer -- including the spine `F`-map (`v3/plan/spine/tokens.ts`, already
token-routed) -- with no per-file edits. The Google Fonts `@import` is trimmed
to load only Inter + Fira Sans.

**2. Normalize the raw, token-bypassing declarations** (per-site edits):
- CycleWheel literal `'Cinzel'` (x2) -> `var(--font-sans)`.
- observe-lens + compost JS `F` maps (`serif`/`sans`/`mono` set to Playfair /
  DM Sans / DM Mono) -> all three `'var(--font-sans)'`; `CompostWorkspace`
  `'DM Sans'` -> `var(--font-sans)`.
- Raw `'Fira Code'` mono, `'Fira Sans'` alt-sans, and `'JetBrains Mono'`
  primaries across ~18 `*.module.css` (dashboards, scenario/climate/crop cards,
  structures, landing sections) -> `var(--font-sans)`.
- Inline `fontFamily` in 3 `.tsx`: TriggerRecognitionSheet `Georgia` and
  PublicPortalShell `'Inter','Georgia',serif` -> literal `'Inter', system-ui,
  sans-serif`; the two export templates' `'Fira Code'` -> the **literal Inter
  stack** (a detached print/window render context would not resolve `var()`).
- Dead `@import` of Playfair/DM Sans/DM Mono dropped from ObserveLensDashboard.

### Explicitly NOT changed (deliberate)
- **No `font-style: italic`** anywhere (steward's "font only" choice).
- **Emoji map-marker fonts** (`CaptureMapMarkers`, `FieldFlagOverlay` Apple
  Color Emoji / Segoe UI Emoji) and the generic `sans-serif` HomesteadMarker --
  they need the emoji glyphs, not Latin uniformity.
- **`--font-sans` keeps `Fira Sans` as fallback #2** -- only fires if Inter
  fails to load; never renders while Inter is present.

## Consequences

### Positive
- Every Latin text surface in `apps/web` resolves to one family. Verified via
  preview `getComputedStyle`: all 5 face tokens, 5 injected probes (mimicking
  the flagged StewardCapture name, the spine mono number, a display title, the
  LevelNavigator Cinzel heading, a raw Fira Code site), and 5 live landing
  elements all compute to `Inter, "Fira Sans", system-ui, -apple-system,
  sans-serif`; grep-guard finds zero live non-sans Latin faces.
- The drift trap is closed: every face token now aliases `--font-sans`, so any
  future `var(--font-display|serif|mono|heading)` consumer gets Inter rather
  than reintroducing a serif/mono face.

### Negative / follow-up
- **Tabular alignment.** Numeric columns previously on the mono face fold into
  Inter (steward's explicit "fold mono in" choice). Inter has tabular-figure
  support (`font-feature-settings: "tnum"`) if alignment ever needs restoring;
  out of scope now.
- **Foreign WIP excluded from the commit.** `AppShell.tsx`,
  `RegenerationMonitorCard.tsx`, `syncManifest.ts`, `ModuleBar.tsx`,
  `ActTools.tsx`, `PortfolioProjectList.tsx` (+ `render.yaml`,
  `scripts/audit-out`, `.claude/launch.json`) sat uncommitted in the working
  tree from a parallel session; committed only the 28 font-sweep files via
  explicit pathspec ([[feedback-no-deletion]]).
- **Pre-existing tsc errors untouched.** 4 errors in
  `onboarding/__tests__/onboardingSteps.test.ts` (file at HEAD, not in the
  sweep) predate this change; the touched `.ts`/`.tsx` files compile clean.

## References
- [[decisions/2026-05-30-atlas-plan-nav-v1.1-merge]] -- the Inter-sans typography rule this enforces platform-wide
- [[decisions/2026-06-02-atlas-dark-ui-de-brown]] -- prior token-retarget + literal-sweep pattern this mirrors
- [[concepts/design-system]] -- token sources
- Commit `4262a0dc`; branch `fix/operational-role-layer`; `apps/web/src/styles/tokens.css` + 27 files
