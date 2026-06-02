// tokens.ts — Observe lens surface (mock-backed; not yet wired to live data)
//
// Self-contained colour + font tokens for the observational-lens Observe
// concept. Kept verbatim from the source concept (olos_observe_dashboard.jsx)
// for pixel fidelity. This prototype is intentionally NOT wired to the app's
// tokens.css / tokens.ts — reskinning is a later integration decision.

export const C = {
  bg: '#0F0F0D', bg2: '#161613', bg3: '#1E1E1A', bg4: '#252520',
  border: '#2A2A25', borderLight: '#353530',
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
  serif: "'Playfair Display','Georgia',serif",
  sans: "'DM Sans','system-ui',sans-serif",
  mono: "'DM Mono','Courier New',monospace",
} as const;
