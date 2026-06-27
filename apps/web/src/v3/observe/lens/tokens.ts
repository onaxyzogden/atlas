// tokens.ts — Observe lens surface (mock-backed; not yet wired to live data)
//
// Self-contained colour + font tokens for the observational-lens Observe
// concept. The grayscale ladder (bg/bg2/bg3/bg4/border/borderLight) was retuned
// 2026-06-03 from the source concept's WARM olive grays (#0F0F0D / #161613 /
// #2A2A25 ...) to the app's COOL slate ladder, so the Observe rails/cards stop
// reading brownish next to the cool app shell and the spine/detail-rail (which
// use var(--color-surface) = #14191f). Values mirror the app's dark-mode.css
// surface ladder (bg2 == --color-surface, bg3 == --color-surface-alt, bg4 ==
// --color-surface-raised, border == --color-border). Accent hues
// (blue/green/amber/...) and fonts are unchanged.

export const C = {
  bg: '#0B0D10', bg2: '#14191F', bg3: '#1A2027', bg4: '#1C232B',
  border: '#242F3D', borderLight: '#33404E',
  textPrimary: '#EDE9E0', textSecondary: '#8A8680', textTertiary: '#4A4845',
  blue: '#4A8FD4', blueDim: '#1A2F45',
  green: '#5AAF72', greenDim: '#162A1C',
  amber: '#D4944A', amberDim: '#2E1F0A',
  teal: '#3A9B8A', tealDim: '#0E2420',
  red: '#C45A4A', redDim: '#2A0E0A',
  gold: '#C4A84A', goldDim: '#2A220A',
  sage: '#7A9E6E', sageDim: '#1A2618',
  water: '#4A82A4', waterDim: '#0E2030',
  earth: '#9E7A4A', earthDim: '#261A0A',
  violet: '#8A6AB4', violetDim: '#1E1630',
} as const;

export const F = {
  serif: 'var(--font-sans)',
  sans: 'var(--font-sans)',
  mono: 'var(--font-sans)',
} as const;
