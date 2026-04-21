/**
 * Scoring-specific colour constants extracted from apps/web/src/lib/tokens.ts.
 *
 * Only the slices consumed by the scoring module live here:
 *   - `water`     — used by computeScores.ts for water-category narrative colouring
 *   - `confidence` — used by computeScores.ts for confidence-level colouring
 *   - `semantic`  — used by computeScores.ts for narrative chrome
 *   - `status`    — used by hydrologyMetrics.ts to tag status of flood/drought bands
 *
 * The full UI palette (sage, earth, sand, chart, map, role, etc.) stays in
 * apps/web/src/lib/tokens.ts. The two copies must stay in sync for these four
 * named exports — a future sprint can lift the whole palette if it becomes a
 * maintenance burden.
 */

export const water = {
  50:  '#eef5f8',
  100: '#d6e8ef',
  200: '#b0d2e0',
  300: '#86b8ce',
  400: '#5b9db8',
  500: '#3d7f9e',
  600: '#2a6180',
  700: '#234f68',
  800: '#1d3f53',
  900: '#142c3a',
} as const;

export const confidence = {
  high:   '#2d7a4f',
  medium: '#8a6d1e',
  low:    '#9b3a2a',
} as const;

export const status = {
  good:     '#8a9a74',
  moderate: '#c4a265',
  poor:     '#9a6a5a',
} as const;

export const semantic = {
  primary:      '#7d6140',
  primaryHover: '#634c31',
  accent:       '#527852',
  accentHover:  '#3e5c3e',
  bg:           '#fdfbf7',
  surface:      '#ffffff',
  text:         '#312617',
  textMuted:    '#7d6140',
  textSubtle:   '#b49a74',
  border:       '#e4d9c6',
  borderSubtle: '#f2ede3',
  panelBg:      '#fdfbf7',
  sidebarIcon:  '#9a8a74',
  sidebarActive: '#c4a265',
  white:        '#ffffff',
} as const;
