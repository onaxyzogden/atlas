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
  primary:      '#b08a3a',
  primaryHover: '#9a771f',
  accent:       '#5a8a5a',
  accentHover:  '#46703f',
  bg:           '#f6f4ee',
  surface:      '#ffffff',
  text:         '#1f231e',
  textMuted:    '#565c63',
  textSubtle:   '#7a808a',
  border:       'rgba(84, 92, 100, 0.14)',
  borderSubtle: 'rgba(84, 92, 100, 0.08)',
  panelBg:      '#faf7ef',
  sidebarIcon:  '#7a808a',
  sidebarActive: '#d4af5f',
  white:        '#ffffff',
} as const;
