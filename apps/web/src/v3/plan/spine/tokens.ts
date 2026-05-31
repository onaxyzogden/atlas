// tokens.ts
//
// The Plan Spine prototype's colour (`C`) and font (`F`) palettes. Originally
// transcribed VERBATIM from olos_plan_spine.jsx as hardcoded hex + DM-Sans/
// Playfair/DM-Mono. As of the pre-promotion polish pass these constants are
// repointed at CSS custom properties so the surface is theme-aware: the
// concrete values live in `spine-theme.css` (dark default + light override
// keyed to the app's `data-theme` attribute, scoped to `.olos-spine-root`),
// and the fonts now resolve to the production `--font-*` stack (Inter /
// Cormorant Garamond / JetBrains Mono) instead of the prototype-only web fonts.
//
// IMPORTANT: because these values are now `var(--x)` strings, you can NOT build
// a translucent colour by string-concatenating a hex-alpha suffix
// (e.g. `C.amber + '55'` -> `var(--spine-amber)55`, invalid CSS). Use the
// `CA(token, alpha)` helper, which resolves to `rgba(var(--spine-x-rgb), a)`.

export const C = {
  bg: 'var(--spine-bg)',
  bg2: 'var(--spine-bg2)',
  bg3: 'var(--spine-bg3)',
  bg4: 'var(--spine-bg4)',
  border: 'var(--spine-border)',
  borderLight: 'var(--spine-border-light)',
  textPrimary: 'var(--spine-text-primary)',
  textSecondary: 'var(--spine-text-secondary)',
  textTertiary: 'var(--spine-text-tertiary)',
  blue: 'var(--spine-blue)',
  blueDim: 'var(--spine-blue-dim)',
  blueMid: 'var(--spine-blue-mid)',
  green: 'var(--spine-green)',
  greenDim: 'var(--spine-green-dim)',
  amber: 'var(--spine-amber)',
  amberDim: 'var(--spine-amber-dim)',
  teal: 'var(--spine-teal)',
  tealDim: 'var(--spine-teal-dim)',
  red: 'var(--spine-red)',
  gold: 'var(--spine-gold)',
  goldDim: 'var(--spine-gold-dim)',
} as const;

export const F = {
  serif: 'var(--font-display)', // production display face (Cormorant Garamond)
  sans: 'var(--font-sans)', //    production sans (Inter)
  mono: 'var(--font-mono)', //    production mono (JetBrains Mono)
} as const;

// Translucent colour helper. `var(--spine-x)` cannot take a hex-alpha suffix,
// so for any colour that needs an alpha channel we read a parallel rgb-triplet
// custom property and wrap it in rgba(). Keys map to `--spine-<key>-rgb` vars
// defined in spine-theme.css.
const RGB = {
  blue: '--spine-blue-rgb',
  green: '--spine-green-rgb',
  amber: '--spine-amber-rgb',
  teal: '--spine-teal-rgb',
  border: '--spine-border-rgb',
  gold: '--spine-gold-rgb',
} as const;

export const CA = (token: keyof typeof RGB, alpha: number): string =>
  `rgba(var(${RGB[token]}), ${alpha})`;
