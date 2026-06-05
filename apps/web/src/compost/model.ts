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
  serif: "'DM Sans', 'system-ui', sans-serif",
  sans: "'DM Sans', 'system-ui', sans-serif",
  mono: "'DM Sans', 'system-ui', sans-serif",
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
