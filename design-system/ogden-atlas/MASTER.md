# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** OGDEN Atlas (OLOS)
**Category:** Geospatial / Land-Design Tooling
**Generated:** 2026-04-01 (initial scaffold)
**Revised:** 2026-04-24 (palette refresh; see Revision history)

**Sibling docs:**
- [`ia-and-panel-conventions.md`](./ia-and-panel-conventions.md) — IA, panel decision matrix, mapZIndex, perimeter zones
- [`ui-ux-scholar-audit.md`](./ui-ux-scholar-audit.md) — driving UX audit
- [`accessibility-audit.md`](./accessibility-audit.md) — WCAG 2.1 AA findings
- [`impl-plan-oklch-tooltip.md`](./impl-plan-oklch-tooltip.md) — OKLCH + tooltip implementation plan

**Anchoring ADRs:**
- [OKLCH token migration (2026-04-23)](../../wiki/decisions/2026-04-23-oklch-token-migration.md)
- [DelayedTooltip primitive (2026-04-23)](../../wiki/decisions/2026-04-23-delayed-tooltip-primitive.md)
- [MapControlPopover + mapZIndex (2026-04-24)](../../wiki/decisions/2026-04-24-map-control-popover-and-mapzindex.md)

---

## Global Rules

### Color Palette

The shipping palette is a **warm-neutral dark-chrome** system: earth-tinted neutrals frame the UI so they don't compete with biophilic map data. Brand moments use earth-gold; active-state UI uses a higher-chroma gold for AA contrast on dark chrome.

The source of truth is [`apps/web/src/styles/tokens.css`](../../apps/web/src/styles/tokens.css). Reference variables — never hard-code hex values in component CSS.

#### OKLCH primitives (elevation + semantic)

OKLCH is perceptually uniform: equal L → equal perceived brightness. Held chroma + hue, varying L gives a derivable elevation ladder. See the [OKLCH ADR](../../wiki/decisions/2026-04-23-oklch-token-migration.md) for the full rationale and `@supports` gating.

**Elevation ladder** (`tokens.css:21-26`):

| Token | Value | Usage |
|------|-----|--------------|
| `--l-bg` | `15.5%` | Page background |
| `--l-surface` | `21%` | Card / panel surface |
| `--l-raised` | `26.5%` | Raised surface (hover, popover) |
| `--l-popover` | `33%` | (Reserved — not yet mapped) |
| `--c-warm-neutral` | `0.010` | Chroma anchor (all elevation tiers) |
| `--h-warm-neutral` | `60` | Hue anchor (warm yellow-brown) |

**Semantic hue channels** (`tokens.css:29-34`):

| Channel | L | C | H |
|------|---|---|---|
| Primary | 72% | 0.08 | 80 |
| Accent | 60% | 0.05 | 145 |
| Success | 64% | 0.10 | 150 |
| Warning | 72% | 0.13 | 85 |
| Error | 59% | 0.15 | 30 |
| Info | 68% | 0.07 | 235 |

`oklch(...)` overrides land in `dark-mode.css` behind `@supports (color: oklch(0 0 0))`. On older engines the hex semantic tokens below remain authoritative (Chromium 111+ / Safari 15.4+ / Firefox 113+ have OKLCH).

#### Earth, Sage, Water, Sand ramps

The four foundational ramps. **50** is lightest, **900** is darkest.

**Earth (warm browns)** — chrome anchor, brand moments, panel-text on light surfaces:
`--color-earth-50` `#faf8f4` → `--color-earth-100` `#f2ede3` → `…200` `#e4d9c6` → `…300` `#cebda0` → `…400` `#b49a74` → `…500` `#9a7a53` → `…600` `#7d6140` → `…700` `#634c31` → `…800` `#4a3823` → `…900` `#312617`

**Sage (organic greens)** — accent / vegetation / map polygons:
`…50 #f2f5f0 → …100 #e2e9df → …200 #c5d4bf → …300 #a3ba9c → …400 #84a47e → …500 #6b8f6b → …600 #527852 → …700 #3e5c3e → …800 #324a32 → …900 #233323`

**Water (slate blues)** — hydrology overlays, water zone identity:
`…50 #eef5f8 → …100 #d6e8ef → …200 #b0d2e0 → …300 #86b8ce → …400 #5b9db8 → …500 #3d7f9e → …600 #2a6180 → …700 #234f68 → …800 #1d3f53 → …900 #142c3a`

**Sand (warm neutrals)** — page bg, cool surfaces:
`…50 #fdfbf7 → …100 #f7f2e8 → …200 #f2ede3` (lightweight ramp; deeper tiers fold into Earth)

#### Semantic tokens (consume the ramps)

| Role | Token | Light-mode value |
|------|-----|--------------|
| Page bg | `--color-bg` | `var(--color-sand-50)` |
| Surface | `--color-surface` | `#ffffff` |
| Surface raised | `--color-surface-raised` | `#ffffff` |
| Border | `--color-border` | `var(--color-earth-200)` |
| Border subtle | `--color-border-subtle` | `var(--color-earth-100)` |
| Text | `--color-text` | `var(--color-earth-900)` |
| Text muted | `--color-text-muted` | `var(--color-earth-600)` (≈4.8:1; AA for ≥14px or bold ≥11px) |
| Text subtle | `--color-text-subtle` | `var(--color-earth-400)` |
| Primary | `--color-primary` | `var(--color-earth-600)` |
| Primary hover | `--color-primary-hover` | `var(--color-earth-700)` |
| Accent | `--color-accent` | `var(--color-sage-600)` |
| Accent hover | `--color-accent-hover` | `var(--color-sage-700)` |
| Focus ring | `--color-focus-ring` | `rgba(82, 120, 82, 0.45)` |

**Status semantics** (light mode): `--color-success` / `--color-warning` / `--color-error` / `--color-info` map to the `*-500` tier of their respective scales; each has a matching `*-muted` rgba at 0.15 alpha for soft backgrounds.

**Info-blue is intentionally distinct from water-blue:** biophilic hues are reserved for map polygons; UI signifiers (info chips, badges) use `--color-info-500 #5b8eaf` so "Map Data ≠ UI Signifier."

#### Chrome neutrals (UX Scholar 2026-04-23)

Earth-tinted neutrals anchor the dark chrome that frames the map. Keep brown ramps for brand moments only.

| Token | Value | Usage |
|------|-----|--------------|
| `--color-chrome-bg` | `#1f1d1a` | Solid chrome surface |
| `--color-chrome-bg-translucent` | `rgba(31, 29, 26, 0.97)` | Header / sidebar / panel chrome |
| `--color-chrome-bg-overlay` | `rgba(31, 29, 26, 0.72)` | Modal scrim, async-load dim (lower opacity so map remains partially legible) |
| `--color-elevation-highlight` | `rgba(255, 255, 255, 0.06)` | Inset highlight for depth |

#### Two-gold convention

Earth-gold (`#c4a265`) fails WCAG AA at small sizes on dark brown chrome. So:

| Token | Value | Usage |
|------|-----|--------------|
| `--color-gold-brand` | `#c4a265` | Brand moments only (logos, hero accents on light surfaces) |
| `--color-gold-active` | `#e0b56d` | Active-state UI on dark chrome (selected sidebar item, active-toggle ring, etc.) |

Active states on dark chrome **must** use `--color-gold-active`, not `--color-gold-brand`.

#### Identity scales (categorical)

These are **categorical** (not semantic) — each value identifies a kind of thing. Don't substitute one scale for another (e.g. don't use a zone color for a structure category).

**Zone (13)** — `tokens.css:198-210`: habitation `#8B6E4E`, food-production `#4A7C3F`, livestock `#7A6B3A`, commons `#5B8A72`, spiritual `#6B5B8A`, education `#4A6B8A`, retreat `#8A6B5B`, conservation `#2D6B4F`, water-retention `#3A7A9A`, infrastructure `#6B6B6B`, access `#8A7B4A`, buffer `#9B8A6A`, future-expansion `#7A8A9A`.

**Structure (6)** — `tokens.css:216-221`: dwelling, agricultural, spiritual, gathering, utility, infrastructure.

**Path (11)** — `tokens.css:227-237`: main-road, secondary-road, emergency-access, service-road, pedestrian, trail, farm-lane, animal-corridor, grazing-route, arrival-sequence, quiet-route.

**Group (7)** — dashboard-page identity: livestock, forestry, hydrology, finance, compliance, reporting, general.

**Confidence (3)** — high `#2d7a4f`, medium `#8a6d1e`, low `#9b3a2a`.

**Status indicator (3)** — good `#8a9a74`, moderate `#c4a265`, poor `#9a6a5a`.

#### Map rendering defaults

| Token | Value |
|------|-----|
| `--color-map-label` | `#f2ede3` |
| `--color-map-label-halo` | `rgba(26, 22, 17, 0.8)` |
| `--color-map-boundary` | `#7d6140` |
| `--color-map-popup-bg` | `#312617` |

#### RGB channel variants

Most palette tokens have an `--{name}-rgb` companion (e.g. `--color-gold-rgb: 196, 162, 101`) for `rgba(var(--color-gold-rgb), 0.5)` opacity manipulation. Full list in `tokens.css:260-280` — consume them rather than hex-coding alpha.

---

### Typography

Authoritative per `tokens.css:287-289`:

| Role | Token | Value |
|------|-----|--------------|
| Display (headings, hero) | `--font-display` | `'Fira Code', monospace` |
| Body | `--font-sans` | `'Fira Sans', system-ui, -apple-system, sans-serif` |
| Serif (currently aliased to display) | `--font-serif` | `'Fira Code', monospace` |
| Mono (code) | `--font-mono` | `'JetBrains Mono', ui-monospace, monospace` |

**Mood:** dashboard, data, analytics, technical, precise.

**Google Fonts:** [Fira Code + Fira Sans](https://fonts.google.com/share?selection.family=Fira+Code:wght@400;500;600;700|Fira+Sans:wght@300;400;500;600;700) (imported at the top of `tokens.css:6`).

**Type scale** (`tokens.css:293-301`): `--text-xs 11px → --text-sm 13px → --text-base 14px → --text-md 15px → --text-lg 18px → --text-xl 20px → --text-2xl 24px → --text-3xl 30px → --text-4xl 36px`.

**Line heights:** `--leading-tight 1.25 / --leading-normal 1.5 / --leading-relaxed 1.75`.
**Weights:** `--font-light 300 / --font-normal 400 / --font-medium 500 / --font-semibold 600 / --font-bold 700`.

#### Known drift — `'Lora'` fallback in ~20+ files

Approximately 20+ component CSS modules currently declare:

```css
font-family: var(--font-display, 'Lora', Georgia, serif);
```

The `'Lora'` fallback chain implies a historical intent of Lora as the display serif, but `--font-display` is set to `'Fira Code'` so the fallback never fires. Per the 2026-04-24 typography decision, **Fira Code / Fira Sans (per `tokens.css`) are authoritative**; the Lora fallbacks are drift to be removed in a separate sweep (see §5 Deferred). Do not add new `'Lora'` fallbacks.

---

### Spacing Variables

4px base grid (`tokens.css:324-339`). Keys are **multiples of the base unit**, not t-shirt sizes.

| Token | Value | Usage |
|-------|-------|-------|
| `--space-px` | `1px` | Hairline border |
| `--space-0\.5` | `2px` | Micro-tight |
| `--space-1` | `4px` | Tight gaps |
| `--space-2` | `8px` | Icon gaps, inline spacing |
| `--space-3` | `12px` | |
| `--space-4` | `16px` | Standard padding |
| `--space-5` | `20px` | Panel padding (consumed by `panel.module.css .container`) |
| `--space-6` | `24px` | Section padding |
| `--space-8` | `32px` | Large gaps |
| `--space-10` | `40px` | |
| `--space-12` | `48px` | Section margins |
| `--space-16` | `64px` | Hero padding |

(t-shirt aliases like `--space-xs / --space-sm / --space-md / --space-lg / --space-xl` are **not** present in `tokens.css`. Use the numeric scale.)

---

### Border Radius

`tokens.css:345-351`: `--radius-none 0 / --radius-sm 4px / --radius-md 8px / --radius-lg 12px / --radius-xl 16px / --radius-2xl 24px / --radius-full 9999px`.

Map-control popovers land at `--radius-lg` (panel variant) or `--radius-md` (dropdown variant). Spine buttons are `--radius-md`.

---

### Shadow Depths

Earth-tinted shadows (`tokens.css:357-366`) — `rgba(49, 38, 23, …)` for organic warmth instead of cool-grey defaults.

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-xs` | `0 1px 2px rgba(49, 38, 23, 0.05)` | Hairline lift |
| `--shadow-sm` | `0 1px 3px rgba(49, 38, 23, 0.08), 0 1px 2px rgba(49, 38, 23, 0.04)` | Subtle lift |
| `--shadow-md` | `0 4px 6px …, 0 2px 4px …` | Cards, buttons |
| `--shadow-lg` | `0 10px 15px …, 0 4px 6px …` | Modals, dropdowns |
| `--shadow-xl` | `0 20px 25px …, 0 8px 10px …` | Hero, featured cards |
| `--shadow-inner` | `inset 0 2px 4px rgba(49, 38, 23, 0.05)` | Pressed / inset surfaces |

Map-tethered surfaces (popovers, legends) prefer **max-blur translucency** + warm-gold hairline border over heavy shadow — see the chrome convention captured in `MapControlPopover`.

---

### Z-Index Scale

Two scales — a global one and a map-canvas sub-scale. Detailed rules and the inline-`zIndex`-literal forbidden-list live in [ia-and-panel-conventions.md §3](./ia-and-panel-conventions.md). Tokens at `tokens.css:372-392`:

**Global:** `--z-base 0 / --z-dropdown 100 / --z-sticky 200 / --z-overlay 300 / --z-modal 400 / --z-toast 500 / --z-tooltip 600 / --z-max 999`.

**Map sub-scale** (safe inside `.mapArea { position: relative }` only): `--z-map-spine 2 / --z-map-base-overlay 3 / --z-map-split-pane 3 / --z-map-dropdown 4 / --z-map-panel 5 / --z-map-tooltip 6 / --z-map-loading-chip 9 / --z-map-toolbar 10 / --z-map-mobile-bar 40 / --z-map-top 50`.

The map sub-scale is mirrored in TS as `mapZIndex` in [`apps/web/src/lib/tokens.ts`](../../apps/web/src/lib/tokens.ts). Inline `zIndex: <n>` literals in `features/map/**` are **forbidden** — use the token.

---

### Transitions

`--duration-fast 100ms` and `--duration-*` tokens defined at `tokens.css:399+`. Default UI motion is **150–300ms**. Respect `prefers-reduced-motion` on every transition.

---

## Component Specs

The literal `.btn-primary` / `.card` / `.input` / `.modal` blocks that lived here in the 2026-04-01 scaffold **were never adopted by the shipping app**. The actual system is dark-chrome over biophilic map data, not green-on-white organic-wellness chrome. Below points at the canonical shipping primitives — clone these patterns rather than re-deriving from MASTER.md.

### Panel chrome

[`apps/web/src/styles/panel.module.css`](../../apps/web/src/styles/panel.module.css) `.container` is the shared panel scroll container — themed scrollbar (`scrollbar-color: rgba(180, 165, 140, 0.18) transparent`), `padding: var(--space-5)`, `--color-panel-text` color. Right-rail panels and dashboard panels both compose this. Don't roll your own scroll container.

### Map controls

[`apps/web/src/components/ui/MapControlPopover.tsx`](../../apps/web/src/components/ui/MapControlPopover.tsx) — two variants (`panel` | `dropdown`):

- **panel:** top-right, warm-gold hairline border, `--radius-lg`, deeper padding. For legends, layer pickers, collapsible groups.
- **dropdown:** lighter border, `--radius-md`, tighter padding. For inline pickers tethered to a button.

The primitive owns the shared chrome (background, border, blur, inset highlight); callers own position + z-index via `style`. **All five migrated callers** (GAEZ, Soil, Terrain, HistoricalImagery, OSMVector) consume this — see [MapControlPopover ADR](../../wiki/decisions/2026-04-24-map-control-popover-and-mapzindex.md). Five remaining `backdropFilter`-bearing files in `features/map/**` are pre-primitive and queued for opportunistic migration ([ia-and-panel-conventions.md §3 Known violations](./ia-and-panel-conventions.md)).

### Tooltips

[`apps/web/src/components/ui/DelayedTooltip.tsx`](../../apps/web/src/components/ui/DelayedTooltip.tsx) — the canonical hover-tooltip primitive. Native `title=` attributes are an **anti-pattern** (no positioning control, no styling, no aria-describedby, fires immediately). The 2026-04-23 audit flagged 70+ sites; commit `29bf499` migrated 28 in one sweep. Use `<DelayedTooltip label="…" position="top|right|bottom|left">…</DelayedTooltip>`.

### Spine buttons

`.spine-btn` (global class, used by `LeftToolSpine` slots) — 38×40 toggle button, gold-active shimmer when `data-active`. Pattern reference: `BiodiversityCorridorOverlay.tsx` `BiodiversityCorridorToggle`.

### Modals + slide-up panels

[`apps/web/src/components/ui/Modal.tsx`](../../apps/web/src/components/ui/Modal.tsx) + `SlideUpPanel.tsx` (mobile sheet). Modal dim uses `--color-chrome-bg-overlay` (lower opacity than `chrome-bg-translucent` so async loads remain partially legible).

---

## Style Guidelines

**Positioning:** *Warm-neutral chrome over biophilic map data. Brand moments in earth-gold; OKLCH-derived elevation; minimal shadow, max-blur translucency for map-tethered surfaces.*

**Keywords:** warm-neutral, earth-tinted, OKLCH-derived, dark-chrome, max-blur, gold-accent.

**Best for:** Geospatial workspaces where map imagery is the primary signal and chrome must recede. The chrome's job is to frame, not compete.

**Key effects:** Earth-tinted shadows; `backdrop-filter: blur(8–10px)` on chrome containers; warm-gold hairline borders at `rgba(125, 97, 64, 0.4)` for elevated surfaces; OKLCH-uniform elevation steps in dark mode.

### Page Patterns

Atlas has two structural surface families — see [ia-and-panel-conventions.md §1](./ia-and-panel-conventions.md) for the 5-zone perimeter strategy and the 8-row panel decision matrix. Briefly:

- **Authed routes (`/project/*`)**: IconSidebar + MapCanvas + right rail. No top-chrome (intentionally). Domain depth lives in the right rail; domain nav lives in the IconSidebar.
- **Public routes (`/`, landing)**: `LandingPage` + `LandingNav`; warm-neutral tokens but explicitly **not** subject to the dark-chrome rules ("Public route exception" in ia-and-panel-conventions.md).

---

## Anti-Patterns (Do NOT Use)

### Foundational

- ❌ Generic / undifferentiated design
- ❌ Ignored accessibility (see [accessibility-audit.md](./accessibility-audit.md) for current WCAG 2.1 AA findings)
- ❌ AI purple/pink gradients
- ❌ **Emojis as icons** — Use SVG icons (Lucide is the canonical set; Heroicons / Simple Icons acceptable)
- ❌ **Missing `cursor: pointer`** — All clickable elements must have it
- ❌ **Layout-shifting hovers** — Avoid scale transforms that shift surrounding layout
- ❌ **Low contrast text** — Maintain WCAG AA: 4.5:1 minimum for body text, 3:1 for large
- ❌ **Instant state changes** — Always use transitions (150–300ms)
- ❌ **Invisible focus states** — Focus indicators must be visible for keyboard a11y

### Atlas-specific (from [ia-and-panel-conventions.md §3](./ia-and-panel-conventions.md))

- ❌ **Hand-rolled `backdropFilter` chrome** on map controls — use [`MapControlPopover`](../../apps/web/src/components/ui/MapControlPopover.tsx) (`panel` or `dropdown` variant) instead of inline `style={{ background: 'var(--color-chrome-bg-translucent)', backdropFilter: 'blur(8px)', … }}`.
- ❌ **Bare `title=` tooltips** — use [`DelayedTooltip`](../../apps/web/src/components/ui/DelayedTooltip.tsx) per [ADR 2026-04-23](../../wiki/decisions/2026-04-23-delayed-tooltip-primitive.md).
- ❌ **Raw `zIndex: <n>` literals** in `apps/web/src/features/map/**` — consume `mapZIndex` from `lib/tokens.ts` or the `--z-map-*` CSS custom properties.
- ❌ **Hard-coded font-family** like `'Fira Code'` / `'Lora'` / `'Fira Sans'` — use `var(--font-display)` / `var(--font-sans)` / `var(--font-mono)`. Don't add new `'Lora'` fallback chains.
- ❌ **Hard-coded earth/sage/water/sand hex literals** in component CSS — use semantic tokens (`var(--color-text)`, `var(--color-accent)`, etc.) or ramp tokens (`var(--color-earth-600)`).
- ❌ **`--color-gold-brand` for active-state UI on dark chrome** — fails WCAG AA at small sizes; use `--color-gold-active` instead.
- ❌ **`<div onClick>` for true interactive controls** — use `<button>` (or `role="button" tabIndex={0}` + `onKeyDown` with visible focus) per [accessibility-audit.md §2](./accessibility-audit.md).

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] No emojis used as icons (use Lucide / Heroicons SVG)
- [ ] All icons from a consistent icon set
- [ ] `cursor: pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150–300ms)
- [ ] Light mode: text contrast 4.5:1 minimum (3:1 for ≥18pt or bold ≥14pt)
- [ ] Dark mode: same contrast targets verified at OKLCH and hex fallback paths
- [ ] Focus states visible for keyboard navigation (`:focus-visible` rule, not removed by `outline: none` without replacement)
- [ ] `prefers-reduced-motion` respected on every transition
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile
- [ ] **OKLCH parity:** dark-mode `@supports (color: oklch(0 0 0))` block visually matches the hex fallback at expected elevation steps
- [ ] **Two-gold convention:** active-state UI on dark chrome uses `--color-gold-active`, not `--color-gold-brand`
- [ ] **Map z-index:** any `features/map/**` work uses `mapZIndex` tokens, not raw `zIndex: <n>` literals
- [ ] **Tooltip primitive:** any new hover-tooltip uses `DelayedTooltip`, not native `title=`
- [ ] **Panel chrome:** new panels compose `panel.module.css .container`, not a hand-rolled scroll container
- [ ] **Verification in dev preview:** confirm with `preview_eval` reading computed styles (per [accessibility-audit.md](./accessibility-audit.md) workflow); screenshots are ground truth for layout, not for color/font tokens

---

## References

- Source of truth: [`apps/web/src/styles/tokens.css`](../../apps/web/src/styles/tokens.css)
- Dark-mode overrides: [`apps/web/src/styles/dark-mode.css`](../../apps/web/src/styles/dark-mode.css)
- TS-side z-index mirror: [`apps/web/src/lib/tokens.ts`](../../apps/web/src/lib/tokens.ts)
- IA + panel matrix: [`ia-and-panel-conventions.md`](./ia-and-panel-conventions.md)
- UX Scholar audit: [`ui-ux-scholar-audit.md`](./ui-ux-scholar-audit.md)
- Accessibility audit (WCAG 2.1 AA): [`accessibility-audit.md`](./accessibility-audit.md)
- OKLCH ADR: [`wiki/decisions/2026-04-23-oklch-token-migration.md`](../../wiki/decisions/2026-04-23-oklch-token-migration.md)
- DelayedTooltip ADR: [`wiki/decisions/2026-04-23-delayed-tooltip-primitive.md`](../../wiki/decisions/2026-04-23-delayed-tooltip-primitive.md)
- MapControlPopover + mapZIndex ADR: [`wiki/decisions/2026-04-24-map-control-popover-and-mapzindex.md`](../../wiki/decisions/2026-04-24-map-control-popover-and-mapzindex.md)

---

## Deferred / Forward guidance

These are explicitly **out of scope** for this Master file. Flagged so contributors know they're planned work, not opportunities to freelance:

- **Lora-fallback removal sweep.** ~20+ component CSS modules carry a `'Lora'` fallback in `font-family: var(--font-display, 'Lora', Georgia, serif)`. Per the 2026-04-24 typography decision, Fira Code / Fira Sans are authoritative; the Lora fallbacks are drift to be removed in a separate session. Mechanical sweep — grep `'Lora'` in `apps/web/src/**/*.module.css` and replace `var(--font-display, 'Lora', Georgia, serif)` with `var(--font-display)`.
- **Map-overlay chrome migration completion.** 5 of ~10 `backdropFilter`-bearing files in `features/map/**` migrated to `MapControlPopover` in commit `c276c51`; the rest (`AgroforestryOverlay`, `CrossSectionTool`, `MeasureTools`, `MicroclimateOverlay`, `MulchCompostCovercropOverlay`) remain. Schedule: opportunistic — migrate when touching the file for a feature change.
- **OKLCH semantic uniformity tuning.** Current OKLCH L values were reverse-computed from existing hex for visual parity, not yet tuned for perceptual uniformity. A future pass should tighten `--l-success` / `--l-warning` so they read at equal weight per the OKLCH ADR §Consequences.
- **`--l-popover` mapping.** Defined at `33%` but not yet bound to a `--color-*` surface. Wait until a popover surface needs it; don't introduce speculatively.
- **`design-system/pages/`.** The MASTER.md routing logic at the top references this dir for page-specific overrides. The dir does not yet exist. Create it the first time a page needs a Master-overriding spec.
- **Landing-route OKLCH audit.** `LandingPage` uses warm-neutral tokens but hasn't been audited against the OKLCH elevation scale. Revisit when the OKLCH scale extends past the four currently-defined L tiers.

---

## Revision history

- **2026-04-01 (initial scaffold)** — Auto-generated. Documented a generic green-on-white "Earth green + harvest gold" palette (`#15803D` primary, `#F0FDF4` background) with bright button/card specs and Community/Forum landing pattern. Did not match the shipping codebase.
- **2026-04-24 (palette refresh)** — Surgical rewrite to reflect the warm-neutral OKLCH dark-chrome system actually shipping in `tokens.css`. Replaced the 5-row hex palette with the OKLCH primitives + earth/sage/water/sand ramps + chrome neutrals + two-gold convention + identity scales (zone/structure/path/group/confidence/status) + map rendering defaults. Codified Fira Code / Fira Sans typography per `tokens.css:287-289`; flagged ~20+ files' `'Lora'` fallback as drift in §Deferred. Replaced literal `.btn-primary` / `.card` / `.input` / `.modal` blocks (never adopted) with pointers to canonical shipping primitives (`panel.module.css`, `MapControlPopover`, `DelayedTooltip`, `.spine-btn`). Added `mapZIndex` and z-index conventions cross-referenced to `ia-and-panel-conventions.md`. Anti-patterns gained six Atlas-specific entries (hand-rolled chrome, bare `title=`, raw `zIndex` literals, hard-coded font/hex, gold-brand on dark chrome, `<div onClick>`). Pre-delivery checklist gained OKLCH parity / two-gold / mapZIndex / DelayedTooltip / panel-chrome / `preview_eval` verification steps. Sibling docs + three ADRs cross-referenced.
