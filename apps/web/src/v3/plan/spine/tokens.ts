// tokens.ts
//
// The dark colour (`C`) and font (`F`) palettes from the olos_plan_spine.jsx
// prototype, transcribed VERBATIM. This surface is intentionally self-contained
// and does NOT consume the live tokens.css system — per the operator's
// pixel-for-pixel decision, the Plan Spine prototype reproduces its own dark
// aesthetic so it reads as a faithful copy of the design artifact.

export const C = {
  bg: '#0F0F0D',
  bg2: '#161613',
  bg3: '#1E1E1A',
  bg4: '#252520',
  border: '#2A2A25',
  borderLight: '#353530',
  textPrimary: '#EDE9E0',
  textSecondary: '#8A8680',
  textTertiary: '#4A4845',
  blue: '#4A8FD4',
  blueDim: '#1A2F45',
  blueMid: '#243C55',
  green: '#5AAF72',
  greenDim: '#162A1C',
  amber: '#D4944A',
  amberDim: '#2E1F0A',
  teal: '#3A9B8A',
  tealDim: '#0E2420',
  red: '#C45A4A',
  gold: '#C4A84A',
  goldDim: '#2A220A',
} as const;

export const F = {
  serif: "'Playfair Display', 'Georgia', serif",
  sans: "'DM Sans', 'system-ui', sans-serif",
  mono: "'DM Mono', 'Courier New', monospace",
} as const;
