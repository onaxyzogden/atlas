/**
 * OGDEN Atlas Design Tokens — TypeScript Bridge
 *
 * Single source of truth for color values used in JS contexts:
 * - MapLibre GL layer paint properties
 * - Store/config color constants
 * - Export component inline styles
 * - Dynamic style calculations
 *
 * These MUST stay in sync with tokens.css / dark-mode.css.
 * Values here represent the LIGHT MODE defaults.
 */

// ── Color Palettes ──────────────────────────────────────────────────────────

export const earth = {
  50:  '#faf8f4',
  100: '#f2ede3',
  200: '#e4d9c6',
  300: '#cebda0',
  400: '#b49a74',
  500: '#9a7a53',
  600: '#7d6140',
  700: '#634c31',
  800: '#4a3823',
  900: '#312617',
} as const;

export const sage = {
  50:  '#f2f5f0',
  100: '#e2e9df',
  200: '#c5d4bf',
  300: '#a3ba9c',
  400: '#84a47e',
  500: '#6b8f6b',
  600: '#527852',
  700: '#3e5c3e',
  800: '#324a32',
  900: '#233323',
} as const;

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

export const sand = {
  50:  '#fdfbf7',
  100: '#f7f2e8',
  200: '#f2ede3',
} as const;

// ── Semantic Status Colors ──────────────────────────────────────────────────

export const success = {
  50:  '#f2f5f0',
  100: '#e2e9df',
  500: '#6b8f6b',
  600: '#527852',
  700: '#3e5c3e',
  DEFAULT: '#6b8f6b',
} as const;

export const warning = {
  50:  '#fefbf0',
  100: '#fef3c7',
  500: '#ca8a04',
  600: '#a16207',
  700: '#854d0e',
  DEFAULT: '#ca8a04',
} as const;

export const error = {
  50:  '#fdf5f3',
  100: '#fae8e4',
  500: '#c4493a',
  600: '#9b3a2a',
  700: '#7d2e22',
  DEFAULT: '#c4493a',
} as const;

export const info = {
  50:  '#eef5f8',
  100: '#d6e8ef',
  500: '#3d7f9e',
  600: '#2a6180',
  700: '#234f68',
  DEFAULT: '#3d7f9e',
} as const;

// ── Confidence Levels ───────────────────────────────────────────────────────

export const confidence = {
  high:   '#2d7a4f',
  medium: '#8a6d1e',
  low:    '#9b3a2a',
} as const;

// ── Dashboard Group Identity ────────────────────────────────────────────────

export const group = {
  livestock:  '#c4a265',
  forestry:   '#8a9a74',
  hydrology:  '#7a8a9a',
  finance:    '#7a9a8a',
  compliance: '#8a8a6a',
  reporting:  '#15803D',
  general:    '#9a7a8a',
} as const;

// ── Zone Category Identity ──────────────────────────────────────────────────

export const zone = {
  habitation:       '#8B6E4E',
  food_production:  '#4A7C3F',
  livestock:        '#7A6B3A',
  commons:          '#5B8A72',
  spiritual:        '#6B5B8A',
  education:        '#4A6B8A',
  retreat:          '#8A6B5B',
  conservation:     '#2D6B4F',
  water_retention:  '#3A7A9A',
  infrastructure:   '#6B6B6B',
  access:           '#8A7B4A',
  buffer:           '#9B8A6A',
  future_expansion: '#7A8A9A',
} as const;

// ── Structure Category Identity ─────────────────────────────────────────────

export const structure = {
  dwelling:       '#8B6E4E',
  agricultural:   '#4A7C3F',
  spiritual:      '#6B5B8A',
  gathering:      '#c4a265',
  utility:        '#4A6B8A',
  infrastructure: '#6B6B6B',
} as const;

// ── Path Type Identity ──────────────────────────────────────────────────────

export const path = {
  main_road:        '#8B6E4E',
  secondary_road:   '#7A6B3A',
  emergency_access: '#c44e3f',
  service_road:     '#6B6B6B',
  pedestrian_path:  '#8A9A74',
  trail:            '#5B8A72',
  farm_lane:        '#7A6B3A',
  animal_corridor:  '#8A7A4A',
  grazing_route:    '#6B8A4A',
  arrival_sequence: '#c4a265',
  quiet_route:      '#6B5B8A',
} as const;

// ── Utility Type Identity ───────────────────────────────────────────────────

export const utility = {
  solar_panel:    '#c4a265',
  battery_room:   '#8A9A74',
  generator:      '#c44e3f',
  water_tank:     '#4A90D9',
  well_pump:      '#3A7A9A',
  greywater:      '#6B8A9A',
  septic:         '#6B6B6B',
  rain_catchment: '#4A6B8A',
  lighting:       '#c4a265',
  firewood_storage: '#8B6E4E',
  waste_sorting:  '#6B6B6B',
  compost:        '#5B8A4A',
  biochar:        '#4A3823',
  tool_storage:   '#6B6B6B',
  laundry_station: '#7A8A9A',
} as const;

// ── Crop Type Identity ──────────────────────────────────────────────────────

export const crop = {
  orchard:          '#6B8E4E',
  row_crop:         '#8B7D3F',
  garden_bed:       '#5B8A4A',
  food_forest:      '#3A6B3A',
  windbreak:        '#4A7A5A',
  shelterbelt:      '#3A6A4A',
  silvopasture:     '#5A7A3A',
  nursery:          '#6A8A5A',
  market_garden:    '#7A6B3A',
  pollinator_strip: '#8A6A7A',
} as const;

// ── Phase Colors ────────────────────────────────────────────────────────────

export const phase = {
  1: '#c4a265',
  2: '#8a9a74',
  3: '#7a8a9a',
  4: '#9a7a8a',
} as const;

// ── Status Indicators (dashboard semantic) ──────────────────────────────────

export const status = {
  good:     '#8a9a74',
  moderate: '#c4a265',
  poor:     '#9a6a5a',
} as const;

// ── Role Badge Colors ───────────────────────────────────────────────────────

export const role = {
  owner:    '#CA8A04',
  designer: '#15803D',
  reviewer: '#7a8a9a',
  viewer:   '#9a8a7a',
} as const;

// ── Avatar Colors (presence) ────────────────────────────────────────────────

export const avatar = {
  sage:  '#5a7c5e',
  earth: '#7c6a5a',
  slate: '#5a6e7c',
  mauve: '#7c5a6e',
  olive: '#6e7c5a',
  teal:  '#5a7c72',
} as const;

// ── Chart / SVG Rendering ──────────────────────────────────────────────────

export const chart = {
  accent:  '#d4a843',   // gold stroke/fill for sun path, wind rose
  grid:    '#3d3328',   // axis lines, concentric rings
  muted:   '#6b5b4a',   // secondary labels (direction letters)
} as const;

// ── Map Rendering Defaults ──────────────────────────────────────────────────

export const map = {
  label:      '#f2ede3',
  labelHalo:  'rgba(26,22,17,0.8)',
  boundary:   '#7d6140',
  popupBg:    '#312617',
} as const;

// ── Semantic Shorthands (light mode) ────────────────────────────────────────

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

// ── Unified export ──────────────────────────────────────────────────────────

export const colors = {
  earth,
  sage,
  water,
  sand,
  success,
  warning,
  error,
  info,
  confidence,
  group,
  zone,
  structure,
  path,
  utility,
  crop,
  phase,
  status,
  role,
  avatar,
  chart,
  map,
  semantic,
} as const;

// ── Z-Index Scale ──────────────────────────────────────────────────────────
// Mirrors tokens.css --z-* custom properties for use in inline styles.

export const zIndex = {
  base:     0,
  dropdown: 100,
  sticky:   200,
  overlay:  300,
  modal:    400,
  toast:    500,
  tooltip:  600,
  max:      999,
} as const;
