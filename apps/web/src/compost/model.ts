/**
 * Compost vertical — shared model: palette tokens, helpers, and the textbook
 * seed data ported verbatim from the `compost_olos.jsx` prototype.
 *
 * This is the single source the three bespoke screens (Plan / Act / Observe)
 * and the Zustand store import from. It is a *distinct lightweight vertical*:
 * it reuses the OLOS Plan/Act/Observe language but NOT the land-use taxonomy,
 * catalogue, or parcel machinery (see wiki ADR — compost vertical).
 *
 * The prototype hard-codes the OLOS dark palette in its `C` / `F` objects and
 * derives many colours from data at render time (temperature → phase colour,
 * SVG chart fills). Those JS-driven colours cannot live in CSS alone, so the
 * palette is the token system for this vertical and is mirrored 1:1 in
 * `compostTokens.module.css` for the structural styling. Keep the two in sync.
 */

// ─── Palette (ported from prototype `C`) ──────────────────────────────────────
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
  redDim: '#2A1210',
  gold: '#C4A84A',
  goldDim: '#2A220A',
  // compost-specific
  heat: '#E06B3A',
  heatDim: '#2D1508',
  mesophilic: '#7B9E6A',
  thermophilic: '#E06B3A',
  curing: '#4A8FD4',
} as const;

export const F = {
  serif: 'var(--font-sans)',
  sans: 'var(--font-sans)',
  mono: 'var(--font-sans)',
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────
export type LayerType = 'brown' | 'green';

export interface RecipeLayer {
  id: string;
  type: LayerType;
  name: string;
  depth: string;
  cnApprox: number;
  status: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export type ObjectiveStatus = 'complete' | 'available' | 'locked';

export interface PlanObjective {
  id: string;
  tier: number;
  title: string;
  status: ObjectiveStatus;
  gate: string;
}

export interface PlanRecipe {
  pileName: string;
  site: string;
  cycle: string;
  dimensions: { l: number; w: number; h: number };
  volumeCuFt: number;
  cnRatio: number;
  targetMoisture: number;
  targetTempMin: number;
  targetTempMax: number;
  layers: RecipeLayer[];
  checklist: ChecklistItem[];
  objectives: PlanObjective[];
}

export interface Reading {
  id: string;
  day: number;
  date: string;
  /** Internal temperature is stored in °F (matches the prototype); UI shows °C. */
  temp: number;
  moisture: number;
  turned: boolean;
  note: string;
  proofPhoto: boolean;
}

export type ActTaskStatus = 'verified' | 'in_progress' | 'not_started';

export interface ActChecklistItem {
  label: string;
  done: boolean;
}

export interface ActTask {
  id: string;
  title: string;
  status: ActTaskStatus;
  phase: string;
  proofItems: number;
  proofRequired: number;
  desc: string;
  checklistItems: ActChecklistItem[];
}

export interface PhaseComparisonRow {
  id: string;
  name: string;
  color: string;
  days: string;
  peakTemp: number;
  avgMoisture: number;
  readings: number;
  desc: string;
}

// ─── Plan: recipe configuration (locked-in "textbook example") ────────────────
export const PLAN_RECIPE: PlanRecipe = {
  pileName: 'Batch 1 — Spring Build',
  site: 'Millbrook Farm · Compost Yard',
  cycle: 'Cycle 1',
  dimensions: { l: 4, w: 4, h: 3 },
  volumeCuFt: 48,
  cnRatio: 30,
  targetMoisture: 50,
  targetTempMin: 131,
  targetTempMax: 160,
  layers: [
    { id: 'l1', type: 'brown', name: 'Dry straw', depth: '4 in', cnApprox: 80, status: 'complete' },
    { id: 'l2', type: 'green', name: 'Kitchen scraps & coffee grounds', depth: '2 in', cnApprox: 15, status: 'complete' },
    { id: 'l3', type: 'brown', name: 'Wood shavings (fine)', depth: '3 in', cnApprox: 400, status: 'complete' },
    { id: 'l4', type: 'green', name: 'Grass clippings (fresh)', depth: '2 in', cnApprox: 20, status: 'complete' },
    { id: 'l5', type: 'brown', name: 'Dried leaves (shredded)', depth: '4 in', cnApprox: 60, status: 'complete' },
    { id: 'l6', type: 'green', name: 'Vegetable scraps + manure', depth: '2 in', cnApprox: 12, status: 'complete' },
    { id: 'l7', type: 'brown', name: 'Straw cap layer', depth: '3 in', cnApprox: 80, status: 'complete' },
  ],
  checklist: [
    { id: 'c1', label: 'Site selected & cleared (min 3 ft from structures)', done: true },
    { id: 'c2', label: 'Pile dimensions confirmed ≥ 3×3×3 ft', done: true },
    { id: 'c3', label: 'Feedstocks sourced — browns & greens inventoried', done: true },
    { id: 'c4', label: 'C:N ratio calculated and confirmed ≈ 30:1', done: true },
    { id: 'c5', label: 'Water source available within 30 ft', done: true },
    { id: 'c6', label: 'Aeration method decided (manual turning, 3-day interval)', done: true },
    { id: 'c7', label: 'Thermometer probe acquired (min 20 in stem)', done: true },
    { id: 'c8', label: 'Temperature log sheet prepared', done: true },
  ],
  objectives: [
    {
      id: 'po1', tier: 0, title: 'Define pile purpose & success criteria',
      status: 'complete', gate: 'Purpose defined, minimum threshold temperatures and curing timeline agreed.',
    },
    {
      id: 'po2', tier: 1, title: 'Select site & confirm critical mass',
      status: 'complete', gate: 'Site cleared, dimensions confirm ≥ 1 cubic yard (27 cu ft). Actual: 48 cu ft.',
    },
    {
      id: 'po3', tier: 1, title: 'Design feedstock recipe & C:N ratio',
      status: 'complete', gate: 'Layer plan approved. Blended C:N ratio within 25:1–35:1 target band.',
    },
    {
      id: 'po4', tier: 2, title: 'Specify monitoring protocol',
      status: 'complete', gate: 'Temperature probe locations marked (centre, edge). Turning schedule set to every 3 days when temp > 145°F.',
    },
    {
      id: 'po5', tier: 3, title: 'Plan curing & application',
      status: 'available', gate: 'Curing site identified. End-use application mapped to land zone.',
    },
  ],
};

// ─── Act: textbook temperature log over ~35 days ──────────────────────────────
// Day 0 = build day. Turnings on days 3, 6, 9, 14, 20, 27.
export const READINGS: Reading[] = [
  { id: 'r0', day: 0, date: 'Mar 04', temp: 68, moisture: 52, turned: false, note: 'Pile built. Ambient 54°F.', proofPhoto: true },
  { id: 'r1', day: 1, date: 'Mar 05', temp: 95, moisture: 51, turned: false, note: 'Rapid mesophilic climb.', proofPhoto: false },
  { id: 'r2', day: 2, date: 'Mar 06', temp: 118, moisture: 50, turned: false, note: 'Entering thermophilic zone.', proofPhoto: true },
  { id: 'r3', day: 3, date: 'Mar 07', temp: 143, moisture: 49, turned: true, note: 'Turn 1. Strong ammonia smell — microbial activity high. Added 1 gal water.', proofPhoto: true },
  { id: 'r4', day: 4, date: 'Mar 08', temp: 155, moisture: 49, turned: false, note: 'Peak temperature zone. Pathogen kill threshold sustained.', proofPhoto: false },
  { id: 'r5', day: 5, date: 'Mar 09', temp: 158, moisture: 48, turned: false, note: 'Maximum recorded. Interior steaming visibly.', proofPhoto: true },
  { id: 'r6', day: 6, date: 'Mar 10', temp: 149, moisture: 47, turned: true, note: 'Turn 2. Outer material moved to centre. Earthy smell beginning.', proofPhoto: true },
  { id: 'r7', day: 7, date: 'Mar 11', temp: 152, moisture: 47, turned: false, note: 'Second peak after turning.', proofPhoto: false },
  { id: 'r8', day: 8, date: 'Mar 12', temp: 148, moisture: 46, turned: false, note: 'Slight decline — food source depletion beginning.', proofPhoto: false },
  { id: 'r9', day: 9, date: 'Mar 13', temp: 141, moisture: 46, turned: true, note: 'Turn 3. Pile visibly smaller. Material coarser.', proofPhoto: true },
  { id: 'r10', day: 10, date: 'Mar 14', temp: 144, moisture: 45, turned: false, note: 'Rebound post-turn.', proofPhoto: false },
  { id: 'r11', day: 11, date: 'Mar 15', temp: 139, moisture: 45, turned: false, note: 'Gradual cooling trend.', proofPhoto: false },
  { id: 'r12', day: 12, date: 'Mar 16', temp: 133, moisture: 44, turned: false, note: 'Still above pasteurisation threshold.', proofPhoto: false },
  { id: 'r13', day: 13, date: 'Mar 17', temp: 127, moisture: 44, turned: false, note: '', proofPhoto: false },
  { id: 'r14', day: 14, date: 'Mar 18', temp: 122, moisture: 43, turned: true, note: 'Turn 4. Fungal threads (actinomycetes) visible — good sign.', proofPhoto: true },
  { id: 'r15', day: 15, date: 'Mar 19', temp: 131, moisture: 43, turned: false, note: 'Brief rebound after turn.', proofPhoto: false },
  { id: 'r16', day: 16, date: 'Mar 20', temp: 124, moisture: 43, turned: false, note: '', proofPhoto: false },
  { id: 'r17', day: 17, date: 'Mar 21', temp: 117, moisture: 42, turned: false, note: 'Approaching cooling phase.', proofPhoto: false },
  { id: 'r18', day: 18, date: 'Mar 22', temp: 109, moisture: 42, turned: false, note: '', proofPhoto: false },
  { id: 'r19', day: 19, date: 'Mar 23', temp: 102, moisture: 41, turned: false, note: '', proofPhoto: false },
  { id: 'r20', day: 20, date: 'Mar 24', temp: 97, moisture: 41, turned: true, note: 'Turn 5. Material dark brown, crumbly. Earthy odour dominant.', proofPhoto: true },
  { id: 'r21', day: 21, date: 'Mar 25', temp: 91, moisture: 41, turned: false, note: 'Curing phase begins.', proofPhoto: false },
  { id: 'r22', day: 22, date: 'Mar 26', temp: 85, moisture: 40, turned: false, note: '', proofPhoto: false },
  { id: 'r23', day: 23, date: 'Mar 27', temp: 80, moisture: 40, turned: false, note: '', proofPhoto: false },
  { id: 'r24', day: 24, date: 'Mar 28', temp: 77, moisture: 39, turned: false, note: '', proofPhoto: false },
  { id: 'r25', day: 25, date: 'Mar 29', temp: 74, moisture: 39, turned: false, note: '', proofPhoto: false },
  { id: 'r26', day: 26, date: 'Mar 30', temp: 72, moisture: 39, turned: false, note: '', proofPhoto: false },
  { id: 'r27', day: 27, date: 'Mar 31', temp: 70, moisture: 38, turned: true, note: 'Turn 6 — final turn. Earthworms visible at pile base. Curing confirmed.', proofPhoto: true },
  { id: 'r28', day: 28, date: 'Apr 01', temp: 72, moisture: 38, turned: false, note: '', proofPhoto: false },
  { id: 'r29', day: 29, date: 'Apr 02', temp: 70, moisture: 38, turned: false, note: '', proofPhoto: false },
  { id: 'r30', day: 30, date: 'Apr 03', temp: 68, moisture: 37, turned: false, note: '', proofPhoto: false },
  { id: 'r31', day: 31, date: 'Apr 04', temp: 67, moisture: 37, turned: false, note: '', proofPhoto: false },
  { id: 'r32', day: 32, date: 'Apr 05', temp: 66, moisture: 37, turned: false, note: '', proofPhoto: false },
  { id: 'r33', day: 33, date: 'Apr 06', temp: 65, moisture: 36, turned: false, note: '', proofPhoto: false },
  { id: 'r34', day: 34, date: 'Apr 07', temp: 64, moisture: 36, turned: false, note: 'Pile stable near ambient. Curing complete. Ready for maturation move.', proofPhoto: true },
];

// ─── Act tasks ────────────────────────────────────────────────────────────────
export const ACT_TASKS: ActTask[] = [
  {
    id: 't1', title: 'Build pile to spec',
    status: 'verified', phase: 'mesophilic',
    proofItems: 3, proofRequired: 3,
    desc: 'Layer feedstocks per recipe. Confirm dimensions and moisture before first reading.',
    checklistItems: [
      { label: 'Clear site, mark 4×4 ft footprint', done: true },
      { label: 'Layer feedstocks per recipe (7 layers)', done: true },
      { label: 'Water each layer to wrung-sponge moisture', done: true },
      { label: 'Insert thermometer probe — mark centre & edge positions', done: true },
    ],
  },
  {
    id: 't2', title: 'Monitor & log temperatures (Days 1–6)',
    status: 'verified', phase: 'mesophilic',
    proofItems: 4, proofRequired: 3,
    desc: 'Daily temperature readings, both centre and edge. Record moisture by squeeze-test.',
    checklistItems: [
      { label: 'Morning reading — centre probe (record °F)', done: true },
      { label: 'Morning reading — edge probe (record °F)', done: true },
      { label: 'Moisture check — squeeze test (target: no drip, damp)', done: true },
      { label: 'Note any odour, colour, or structural changes', done: true },
    ],
  },
  {
    id: 't3', title: 'Turn 1–3: Thermophilic management',
    status: 'verified', phase: 'thermophilic',
    proofItems: 5, proofRequired: 4,
    desc: 'Turn pile every 3 days when centre temp exceeds 145°F. Move outer material to core.',
    checklistItems: [
      { label: 'Pre-turn: confirm centre temp > 145°F', done: true },
      { label: 'Fork pile — move outer to centre, centre to outside', done: true },
      { label: 'Add water if squeeze test shows dryness', done: true },
      { label: 'Post-turn: re-insert thermometer, log rebound temp after 4 hrs', done: true },
    ],
  },
  {
    id: 't4', title: 'Monitor cooling phase (Days 15–26)',
    status: 'verified', phase: 'thermophilic',
    proofItems: 3, proofRequired: 2,
    desc: 'Track declining temperature. Watch for actinomycetes, fungal threads — signs of maturation.',
    checklistItems: [
      { label: 'Daily temp readings — flag if rebound to > 113°F (turn needed)', done: true },
      { label: 'Visual inspection — note actinomycetes, fungi, worm presence', done: true },
      { label: 'Check pile structure — confirm volume reduction', done: true },
      { label: 'Moisture check — add water if below 35%', done: true },
    ],
  },
  {
    id: 't5', title: 'Turns 4–6 & curing confirmation',
    status: 'verified', phase: 'curing',
    proofItems: 4, proofRequired: 3,
    desc: 'Final turns as temp drops below 113°F. Confirm curing criteria: earthy smell, dark colour, crumbly texture, earthworms present.',
    checklistItems: [
      { label: 'Turn 4 — move all material, check for uniformity', done: true },
      { label: 'Turn 5 — final aeration before curing rest', done: true },
      { label: 'Turn 6 — final inspection: smell, texture, colour, biology', done: true },
      { label: 'Record curing confirmation criteria met', done: true },
    ],
  },
  {
    id: 't6', title: 'Final maturation & application readiness',
    status: 'in_progress', phase: 'curing',
    proofItems: 1, proofRequired: 3,
    desc: 'Move mature compost to curing bay. Allow 2–4 weeks final stabilisation before application.',
    checklistItems: [
      { label: 'Move pile to curing bay / covered area', done: true },
      { label: 'Perform germination test (cress seeds in compost sample)', done: false },
      { label: 'Document final volume & estimated weight', done: false },
      { label: 'Confirm application zone per Plan objective po5', done: false },
    ],
  },
];

// ─── Observe: phase comparison (temporal view) ────────────────────────────────
export const PHASE_COMPARISON: PhaseComparisonRow[] = [
  {
    id: 'meso', name: 'Mesophilic', color: C.mesophilic,
    days: '1–2', peakTemp: 118, avgMoisture: 51, readings: 3,
    desc: 'Rapid mesophilic climb from ambient to threshold. Sugars and amino acids consumed.',
  },
  {
    id: 'thermo', name: 'Thermophilic', color: C.heat,
    days: '3–19', peakTemp: 158, avgMoisture: 46, readings: 17,
    desc: 'Sustained thermophilic activity with 6 turns. Pathogens eliminated. Complex organics broken down.',
  },
  {
    id: 'curing', name: 'Cooling & Curing', color: C.curing,
    days: '20–34', peakTemp: 97, avgMoisture: 38, readings: 15,
    desc: 'Cooling as high-energy substrates deplete. Mesophilic organisms return. Actinomycetes and earthworms observed.',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function getPhase(temp: number): 'mesophilic' | 'thermophilic' | 'danger' {
  if (temp < 113) return 'mesophilic';
  if (temp <= 160) return 'thermophilic';
  return 'danger';
}

export function getPhaseMeta(temp: number): { label: string; color: string } {
  if (temp < 68) return { label: 'Ambient', color: C.textTertiary };
  if (temp < 113) return { label: 'Mesophilic', color: C.mesophilic };
  if (temp <= 145) return { label: 'Thermophilic', color: C.heat };
  if (temp <= 160) return { label: 'Peak / Pasteurising', color: '#FF7043' };
  return { label: 'Too Hot', color: C.red };
}

export function daysAbovePasteurisation(readings: Reading[]): number {
  return readings.filter((r) => r.temp >= 131).length;
}

/** °F → °C, rounded to 1 decimal. */
export function fToC(f: number): number {
  return Math.round(((f - 32) * 5) / 9 * 10) / 10;
}

export function fToCStr(f: number): string {
  return `${fToC(f)}°C`;
}

// ─── Recipe Maker — data + pure helpers (ported from prototype) ────────────────
// An interactive recipe builder for the Plan stage's "recipe" section. This is a
// LOCAL planning calculator: nothing here touches the store or API. Values are in
// 5-gallon buckets (1 bucket ≈ 18.9 L). 35 buckets = a standard 1 m³ hand-turned
// pile. Two templates sourced from Doug Weatherbee / the-compost-gardener.com.

export type RecipeTemplateKey = 'bacteria' | 'fungi';

export interface RecipeTemplate {
  highN: number;
  green: number;
  brown: number;
  label: string;
  color: string;
}

export interface PlantType {
  id: string;
  label: string;
  icon: string;
  desc: string;
  cnMin: number;
  cnMax: number;
  recipe: RecipeTemplateKey;
  note: string;
}

export type FeedstockCategory = 'highN' | 'green' | 'brown';

export interface Feedstock {
  id: string;
  name: string;
  /** C:N ratio (dry-weight basis, NRAES-54 mid-range). cn === 999 = no nitrogen. */
  cn: number;
  /** Bulk density kg/L (as-received, per NRAES-54 / CREF). */
  bd: number;
  /** Moisture fraction 0–1 (typical, per NRAES-54). */
  mf: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  note: string;
}

export interface RatioBreakdown {
  highN: number;
  green: number;
  brown: number;
  total: number;
  highNPct: number;
  greenPct: number;
  brownPct: number;
}

export type MaterialInputs = Record<string, number>;

/** 35 buckets = standard 1 m³ hand-turned pile. */
export const TARGET_BUCKETS = 35;
/** 1 five-gallon bucket ≈ 18.9 L. */
export const BUCKET_L = 18.9;

export const TEMPLATES: Record<RecipeTemplateKey, RecipeTemplate> = {
  bacteria: { highN: 0.2, green: 0.45, brown: 0.35, label: 'Bacteria-Dominant', color: '#4A8FD4' },
  fungi: { highN: 0.15, green: 0.35, brown: 0.5, label: 'Fungi-Dominant', color: '#5AAF72' },
};

// Plant types — the recipe field pre-selects the appropriate template.
export const PLANT_TYPES: PlantType[] = [
  { id: 'leafy_veg', label: 'Leafy Vegetables', icon: '🥬', desc: 'Lettuce, spinach, chard, kale', cnMin: 12, cnMax: 18, recipe: 'bacteria', note: 'High-N demand; bacteria-dominant compost drives rapid leaf growth.' },
  { id: 'brassicas', label: 'Brassicas', icon: '🥦', desc: 'Cabbage, broccoli, cauliflower', cnMin: 15, cnMax: 20, recipe: 'bacteria', note: 'Heavy feeders; bacteria-dominant recipe suits their high N demands.' },
  { id: 'lawn', label: 'Lawn / Turf', icon: '🌱', desc: 'Ornamental or sports turf', cnMin: 20, cnMax: 30, recipe: 'bacteria', note: 'Bacteria-dominant topdress improves water retention and turf density.' },
  { id: 'fruiting_veg', label: 'Fruiting Vegetables', icon: '🍅', desc: 'Tomatoes, peppers, squash', cnMin: 20, cnMax: 25, recipe: 'fungi', note: 'Balanced compost; avoid excess N at fruiting stage.' },
  { id: 'root_veg', label: 'Root Vegetables', icon: '🥕', desc: 'Carrots, beets, parsnips', cnMin: 20, cnMax: 28, recipe: 'fungi', note: 'Lower N encourages root development over leafy growth.' },
  { id: 'fruit_trees', label: 'Fruit Trees', icon: '🍎', desc: 'Apple, pear, cherry, plum', cnMin: 20, cnMax: 28, recipe: 'fungi', note: 'Fungi-dominant compost supports mycorrhizal networks under orchard canopy.' },
  { id: 'berry_shrubs', label: 'Berry Shrubs', icon: '🫐', desc: 'Raspberry, blueberry, currant', cnMin: 22, cnMax: 30, recipe: 'fungi', note: 'Fungi-dominant suits perennial root systems; blueberries prefer slightly acidic.' },
  { id: 'grains', label: 'Grains & Cereals', icon: '🌾', desc: 'Wheat, oats, corn, rye', cnMin: 25, cnMax: 35, recipe: 'fungi', note: 'Carbon-heavy compost mimics natural grassland soil inputs.' },
  { id: 'perennial_pasture', label: 'Perennial Pasture', icon: '🌿', desc: 'Grass, clover, meadow mixes', cnMin: 25, cnMax: 35, recipe: 'fungi', note: 'High C:N builds humus and supports long-term soil structure.' },
  { id: 'trees_shrubs', label: 'Trees & Shrubs', icon: '🌳', desc: 'Ornamentals, hedgerows, woodland edge', cnMin: 28, cnMax: 40, recipe: 'fungi', note: 'Woody plants benefit from fungi-dominant compost. Apply as mulch.' },
];

// Feedstock library in 5-gallon buckets. cn:999 = no nitrogen (excluded from C:N calc).
export const FEEDSTOCK_LIBRARY: Record<FeedstockCategory, Feedstock[]> = {
  highN: [
    { id: 'blood_meal', name: 'Blood meal', cn: 3, bd: 0.56, mf: 0.12, unit: 'bkt', min: 0, max: 2, step: 0.5, note: 'Very high N — max 1–2 buckets per batch' },
    { id: 'fish_meal', name: 'Fish meal', cn: 5, bd: 0.64, mf: 0.1, unit: 'bkt', min: 0, max: 2, step: 0.5, note: 'Fast-release N; can attract pests' },
    { id: 'chicken_manure', name: 'Chicken manure (fresh)', cn: 7, bd: 0.56, mf: 0.65, unit: 'bkt', min: 0, max: 6, step: 0.5, note: 'Hot and fast; excellent activator' },
    { id: 'rabbit_manure', name: 'Rabbit manure', cn: 10, bd: 0.45, mf: 0.55, unit: 'bkt', min: 0, max: 5, step: 0.5, note: 'Cool manure; safe to add without burning' },
    { id: 'cow_manure', name: 'Cow manure', cn: 17, bd: 0.88, mf: 0.8, unit: 'bkt', min: 0, max: 10, step: 0.5, note: 'Slow steady N; ideal volume manure' },
    { id: 'horse_manure', name: 'Horse manure', cn: 25, bd: 0.5, mf: 0.7, unit: 'bkt', min: 0, max: 10, step: 0.5, note: 'Common and plentiful; may contain weed seeds' },
  ],
  green: [
    { id: 'grass_clippings', name: 'Grass clippings', cn: 17, bd: 0.27, mf: 0.82, unit: 'bkt', min: 0, max: 12, step: 0.5, note: 'Mat if thick; mix well with browns' },
    { id: 'kitchen_scraps', name: 'Kitchen scraps', cn: 15, bd: 0.48, mf: 0.73, unit: 'bkt', min: 0, max: 8, step: 0.5, note: 'Mixed fruit & veg; excludes meat/dairy' },
    { id: 'veg_garden_waste', name: 'Vegetable garden waste', cn: 19, bd: 0.22, mf: 0.78, unit: 'bkt', min: 0, max: 8, step: 0.5, note: 'Stalks, leaves, pulled plants' },
    { id: 'coffee_grounds', name: 'Coffee grounds', cn: 20, bd: 0.56, mf: 0.63, unit: 'bkt', min: 0, max: 3, step: 0.5, note: 'Slightly acidic; worms love it' },
    { id: 'seaweed', name: 'Seaweed / kelp', cn: 19, bd: 0.4, mf: 0.78, unit: 'bkt', min: 0, max: 4, step: 0.5, note: 'Rich in trace minerals' },
    { id: 'alfalfa', name: 'Alfalfa hay', cn: 25, bd: 0.14, mf: 0.1, unit: 'bkt', min: 0, max: 6, step: 0.5, note: 'Good activator; high in N and growth hormones' },
  ],
  brown: [
    { id: 'straw', name: 'Wheat / oat straw', cn: 75, bd: 0.05, mf: 0.12, unit: 'bkt', min: 0, max: 16, step: 0.5, note: 'Classic bulking agent; aeration channels' },
    { id: 'dry_leaves', name: 'Dried leaves (shredded)', cn: 50, bd: 0.08, mf: 0.35, unit: 'bkt', min: 0, max: 12, step: 0.5, note: 'Shred for faster breakdown' },
    { id: 'wood_chips', name: 'Wood chips (fine)', cn: 400, bd: 0.24, mf: 0.4, unit: 'bkt', min: 0, max: 6, step: 0.5, note: 'Very slow breakdown; use sparingly' },
    { id: 'cardboard', name: 'Cardboard (torn, wet)', cn: 350, bd: 0.08, mf: 0.2, unit: 'bkt', min: 0, max: 4, step: 0.5, note: 'Remove tape; soak before adding' },
    { id: 'corn_stalks', name: 'Corn stalks (chopped)', cn: 60, bd: 0.11, mf: 0.12, unit: 'bkt', min: 0, max: 8, step: 0.5, note: 'Chop finely; bulky if left whole' },
    { id: 'straw_bedding', name: 'Animal bedding / straw', cn: 80, bd: 0.1, mf: 0.25, unit: 'bkt', min: 0, max: 8, step: 0.5, note: 'Often mixed with manure — check blend' },
    { id: 'dry_bracken', name: 'Bracken / dried ferns', cn: 45, bd: 0.07, mf: 0.2, unit: 'bkt', min: 0, max: 6, step: 0.5, note: 'Good middle-ground carbon source' },
    { id: 'wood_ash', name: 'Wood ash', cn: 999, bd: 0.72, mf: 0.05, unit: 'bkt', min: 0, max: 1, step: 0.5, note: 'No nitrogen; raises pH. Max 1 bucket.' },
  ],
};

export const ALL_MATERIALS: Feedstock[] = [
  ...FEEDSTOCK_LIBRARY.highN,
  ...FEEDSTOCK_LIBRARY.green,
  ...FEEDSTOCK_LIBRARY.brown,
];

export const ZERO_INPUTS: MaterialInputs = Object.fromEntries(
  ALL_MATERIALS.map((m) => [m.id, 0]),
);

export function buildTemplateInputs(templateKey: RecipeTemplateKey): MaterialInputs {
  const t = TEMPLATES[templateKey];
  const targets = {
    highN: Math.round(TARGET_BUCKETS * t.highN * 2) / 2,
    green: Math.round(TARGET_BUCKETS * t.green * 2) / 2,
    brown: Math.round(TARGET_BUCKETS * t.brown * 2) / 2,
  };
  const spread = (catKey: FeedstockCategory, total: number): MaterialInputs => {
    const mats = FEEDSTOCK_LIBRARY[catKey];
    const perMat = Math.round((total / mats.length) * 2) / 2;
    return Object.fromEntries(
      mats.map((m, i) => {
        const val =
          i === mats.length - 1
            ? Math.round((total - perMat * (mats.length - 1)) * 2) / 2
            : perMat;
        return [m.id, Math.min(Math.max(val, m.min), m.max)];
      }),
    );
  };
  return {
    ...ZERO_INPUTS,
    ...spread('highN', targets.highN),
    ...spread('green', targets.green),
    ...spread('brown', targets.brown),
  };
}

// Dry-mass weighted harmonic mean — Cornell Waste Management Institute formula.
// D_i = buckets × 18.9 L × bd (kg/L) × (1 − mf); R_mix = ΣD_i / Σ(D_i / cn_i).
// Simple arithmetic averaging is a documented error (compost.tools methodology).
export function calcBlendedCN(inputs: MaterialInputs): number | null {
  let sumDryMass = 0;
  let sumDryMassOverCN = 0;
  Object.entries(inputs).forEach(([id, qty]) => {
    if (!qty || qty <= 0) return;
    const mat = ALL_MATERIALS.find((m) => m.id === id);
    if (!mat || mat.cn === 999) return;
    const dryMass = qty * BUCKET_L * mat.bd * (1 - mat.mf);
    sumDryMass += dryMass;
    sumDryMassOverCN += dryMass / mat.cn;
  });
  if (sumDryMassOverCN === 0) return null;
  return Math.round(sumDryMass / sumDryMassOverCN);
}

export function calcRatios(inputs: MaterialInputs): RatioBreakdown {
  const sum = (cat: FeedstockCategory): number =>
    FEEDSTOCK_LIBRARY[cat].reduce((s, m) => s + (inputs[m.id] || 0), 0);
  const highN = sum('highN');
  const green = sum('green');
  const brown = sum('brown');
  const total = highN + green + brown;
  return {
    highN,
    green,
    brown,
    total,
    highNPct: total > 0 ? highN / total : 0,
    greenPct: total > 0 ? green / total : 0,
    brownPct: total > 0 ? brown / total : 0,
  };
}
