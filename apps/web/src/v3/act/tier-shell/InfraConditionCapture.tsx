/**
 * InfraConditionCapture -- a multi-mode CONTROLLED (advisory) capture for the
 * ecovillage objective ev-s3-infra-condition ("Survey existing infrastructure
 * condition", 5 checklist items c1..c5). Ported from
 * olos_communal_infra_survey.html right-hand panels p1..p5. Catalogue item order
 * == mockup panel order:
 *
 *   c1 -> buildings   (mockup p1: 3-structure building register + condition)
 *   c2 -> compliance  (mockup p2: 3 compliance cards + friable-asbestos OH&S note)
 *   c3 -> utilities   (mockup p3: 5 utility rows + capacity warnings)
 *   c4 -> access      (mockup p4: 3 access-route cards + passability)
 *   c5 -> reuse       (mockup p5: 8-element reuse/renovate/demolish register)
 *
 * Structure mirrors FoodSystemCapture / SocialFabricCapture (the canonical
 * interactive advisory captures): an `infraConditionModeFor(itemId)` mapper plus
 * a single component that renders ONE mode body. The third-column host
 * (DecisionWorkingPanel) owns the eyebrow / title / hint / Record-Defer chrome;
 * this capture renders ONLY the scrollable mode body (the mockup's `.rb`).
 *
 * ADVISORY / pure: the model is always derived from decode(value) each render;
 * the full next model is emitted via onChange(encode(next)). The capture holds
 * NO local state for persisted values. NO projectId prop; writes NOTHING to any
 * store; reads NO siblings for computation (siblingValues is accepted for
 * signature uniformity but is never read to drive logic). decode is TOTAL /
 * defensive and SEEDS the register/selection defaults (the mockup ships
 * pre-populated example content).
 *
 * The REUSE mode (c5) is the one genuine record gate: every inventoried element
 * must carry a non-empty disposition. The mockup seeds two elements pending (old
 * dairy -- awaiting structural report; creek ford -- awaiting cost estimate), so
 * the gate starts INVALID until the steward resolves both. All other modes are
 * advisory and always valid (all selects carry verbatim defaults). The c2
 * friable-asbestos warning is SURFACED verbatim as an OH&S note, never enforced.
 *
 * Register-style multi-row sets serialize COLUMN-WISE as parallel string[]
 * (FormFieldValue is `string | string[]`; arrays of row-objects are not a legal
 * FormValue). Free-text scope fields are stored as RAW STRINGS.
 *
 * ASCII-only: em-dash -> " -- "; en-dash -> "-"; middot -> " - "; "m2" for m^2;
 * "~2-3"; building/utility/route glyphs -> lucide icons. Apostrophes use
 * double-quoted JS strings. Colors via --color-* tokens only.
 */

import * as React from 'react';
import {
  ArrowRight,
  Building2,
  Clock,
  Droplet,
  Flame,
  Recycle,
  Route,
  TriangleAlert,
  Warehouse,
  Wifi,
  Zap,
  type LucideIcon,
} from 'lucide-react';

import type { FormValue } from './actToolCatalog.js';
import { SectionEyebrow } from './captures/controls/index.js';
import css from './InfraConditionCapture.module.css';

// ---------------------------------------------------------------------------
// Mode mapper
// ---------------------------------------------------------------------------

export type InfraConditionMode =
  | 'buildings' // c1
  | 'compliance' // c2
  | 'utilities' // c3
  | 'access' // c4
  | 'reuse'; // c5

export const INFRA_CONDITION_PREFIX = 'ev-s3-infra-condition';
const PREFIX_DASH = INFRA_CONDITION_PREFIX + '-';

export function infraConditionModeFor(itemId: string): InfraConditionMode | null {
  if (!itemId.startsWith(PREFIX_DASH)) return null;
  const suffix = itemId.slice(PREFIX_DASH.length);
  switch (suffix) {
    case 'c1':
      return 'buildings';
    case 'c2':
      return 'compliance';
    case 'c3':
      return 'utilities';
    case 'c4':
      return 'access';
    case 'c5':
      return 'reuse';
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Verbatim canonical content (never reword; ASCII-normalized per task spec)
// ---------------------------------------------------------------------------

// -- buildings (c1) -- 3-structure register (mockup p1) --

export const CONDITION_OPTIONS: readonly string[] = [
  'Excellent',
  'Good',
  'Fair',
  'Poor',
  'Unsafe',
];

export interface BuildingSpec {
  key: string;
  Icon: LucideIcon;
  name: string;
  info: string;
  defCondition: string;
  detail: string;
}

export const BUILDINGS: readonly BuildingSpec[] = [
  {
    key: 'north-shed',
    Icon: Warehouse,
    name: 'North shed',
    info: 'Timber frame - 85 m2 - Est. 1972',
    defCondition: 'Fair',
    detail:
      'Corrugated iron roof with several rusted sheets requiring replacement. Timber cladding sound on east and south faces; deteriorated on west face (prevailing weather). Concrete slab floor, intact. Currently used for small equipment storage.',
  },
  {
    key: 'old-dairy',
    Icon: Building2,
    name: 'Old dairy / milking shed',
    info: 'Brick masonry - 180 m2 - Est. 1954',
    defCondition: 'Poor',
    detail:
      'Significant roof structure failure -- multiple purlin failures and partial ridge collapse on northern bay. Brick walls structurally intact but mortar erosion on south face. Asbestos ceiling sheeting identified (heavily deteriorated in north bay -- friable). Non-compliant electrical wiring throughout. Subject to structural report.',
  },
  {
    key: 'pumphouse',
    Icon: Building2,
    name: 'Dam pumphouse',
    info: 'Steel frame, box section - 12 m2 - 2005',
    defCondition: 'Good',
    detail:
      'Purpose-built housing for bore pump and pressure tank. Steel frame in good condition, no structural concerns. Single-phase power, RCD-protected. Adequate for current use. Access path from main driveway (gravel, 80m) in good order.',
  },
];
const BUILDINGS_LEN = BUILDINGS.length;

// -- compliance (c2) -- 3 compliance cards + OH&S note (mockup p2) --

export const COMPLIANCE_OVERALL_OPTIONS: readonly string[] = [
  'No compliance issues',
  'Minor issues',
  'Major -- assess before use',
];

type CompTone = 'ok' | 'warn' | 'alert' | 'info';
type FlagTone = 'ok' | 'warn' | 'risk';

export interface ComplianceItem {
  tone: CompTone;
  text: string;
  flag: string;
  flagTone: FlagTone;
}
export interface ComplianceCardSpec {
  key: string;
  Icon: LucideIcon;
  name: string;
  defOverall: string;
  items: readonly ComplianceItem[];
}

export const COMPLIANCE_CARDS: readonly ComplianceCardSpec[] = [
  {
    key: 'north-shed',
    Icon: Warehouse,
    name: 'North shed',
    defOverall: 'Minor issues',
    items: [
      {
        tone: 'warn',
        text: 'Structural: minor purlins and cladding replacement needed -- safe for continued use with maintenance',
        flag: 'Action',
        flagTone: 'warn',
      },
      {
        tone: 'warn',
        text: 'Asbestos: construction era (1972) indicates risk -- pre-demolition or pre-renovation asbestos survey required before any works',
        flag: 'Survey req.',
        flagTone: 'warn',
      },
      {
        tone: 'info',
        text: 'Building permit: likely no permit (pre-planning requirement era for rural sheds) -- check with council, may need to be regularised',
        flag: 'Verify',
        flagTone: 'warn',
      },
      {
        tone: 'ok',
        text: 'Electrical: no existing electrical installation in main shed -- clean slate for fit-out',
        flag: 'OK',
        flagTone: 'ok',
      },
    ],
  },
  {
    key: 'old-dairy',
    Icon: Building2,
    name: 'Old dairy / milking shed',
    defOverall: 'Major -- assess before use',
    items: [
      {
        tone: 'alert',
        text: 'Structural: partial roof collapse in north bay -- building is unsafe for occupation without structural remediation. Structural engineer assessment required.',
        flag: 'Unsafe',
        flagTone: 'risk',
      },
      {
        tone: 'alert',
        text: 'Asbestos: friable asbestos ceiling sheeting confirmed in north bay -- Class A (licensed) asbestos removal required. Do not disturb.',
        flag: 'Friable',
        flagTone: 'risk',
      },
      {
        tone: 'alert',
        text: 'Electrical: non-compliant wiring throughout (bare copper, missing earth, no RCD) -- must be fully replaced before any occupation',
        flag: 'Replace',
        flagTone: 'risk',
      },
      {
        tone: 'warn',
        text: 'Building permit: no permit on record -- regularisation or demolition approval required before any change of use',
        flag: 'Verify',
        flagTone: 'warn',
      },
    ],
  },
  {
    key: 'pumphouse',
    Icon: Building2,
    name: 'Dam pumphouse',
    defOverall: 'No compliance issues',
    items: [
      {
        tone: 'ok',
        text: 'Structural: sound -- steel frame, 2005, no issues',
        flag: 'OK',
        flagTone: 'ok',
      },
      {
        tone: 'ok',
        text: 'Electrical: RCD-protected single-phase -- compliant for current use',
        flag: 'OK',
        flagTone: 'ok',
      },
      {
        tone: 'info',
        text: 'Building permit: small rural outbuilding -- likely exempt from permit requirement at this scale, confirm with council',
        flag: 'Confirm',
        flagTone: 'warn',
      },
    ],
  },
];
const COMPLIANCE_LEN = COMPLIANCE_CARDS.length;

export const COMPLIANCE_OHS_LEAD = 'Old dairy -- friable asbestos:';
export const COMPLIANCE_OHS_BODY =
  'This is an occupational health and safety obligation independent of the reuse decision. Even if the building is demolished, licensed Class A removal must precede demolition. Act task generated on recording.';

// -- utilities (c3) -- 5 utility rows (mockup p3) --

export const UTILITY_STATUS_OPTIONS: readonly string[] = ['Active', 'Limited', 'None'];

export interface UtilitySpec {
  key: string;
  Icon: LucideIcon;
  name: string;
  defStatus: string;
  detail: string;
  /** capacity warning ("" if none) */
  capWarn: string;
}

export const UTILITIES: readonly UtilitySpec[] = [
  {
    key: 'electrical',
    Icon: Zap,
    name: 'Electrical supply',
    defStatus: 'Active',
    detail:
      'Single-phase 240V, 60A main breaker at road entry. Connection point: road boundary service pillar, 80m cable to shed. Meter in pumphouse.',
    capWarn:
      'Insufficient for 8 households -- 60A single-phase supports ~2-3 dwellings max. Upgrade to 3-phase 200A, or supplement with community solar + battery off-grid system before occupation.',
  },
  {
    key: 'bore-water',
    Icon: Droplet,
    name: 'Bore water system',
    defStatus: 'Active',
    detail:
      '80mm bore, 5,000 L/day yield (from Tier 1 water survey). Submersible pump, pressure tank, 25mm poly distribution to shed and trough. No mains connection. Water quality tested in Tier 2 -- compliant for all uses.',
    capWarn: '',
  },
  {
    key: 'wastewater',
    Icon: Recycle,
    name: 'Wastewater / drainage',
    defStatus: 'Limited',
    detail:
      'Single 3,000L concrete septic tank + single-bay absorption trench. Aged -- concrete lid cracked, trench likely saturated. Single-dwelling capacity only.',
    capWarn:
      'Assessed in waste & nutrient cycling objective (Tier 2) -- full replacement required for community scale. Include in waste system upgrade Act task.',
  },
  {
    key: 'communications',
    Icon: Wifi,
    name: 'Communications',
    defStatus: 'Active',
    detail:
      'NBN Fixed Wireless (Sky Muster satellite backup). 25/5 Mbps current service. -75 dBm signal from tower at Ridgeline Road. Modem in pumphouse, no structured cabling. Adequate for 1-2 users; community will require distribution infrastructure (Wi-Fi mesh or LAN cabling).',
    capWarn: '',
  },
  {
    key: 'gas',
    Icon: Flame,
    name: 'Gas',
    defStatus: 'None',
    detail:
      'No gas supply on site. LPG delivery available -- not currently present. Community energy plan assumes no gas supply.',
    capWarn: '',
  },
];
const UTILITIES_LEN = UTILITIES.length;
const UTILITY_CAPWARN_COUNT = UTILITIES.filter((u) => u.capWarn !== '').length;

// -- access (c4) -- 3 access-route cards (mockup p4) --

export const PASSABILITY_OPTIONS: readonly string[] = [
  'All-weather',
  'Dry season only',
  'Seasonally impassable',
];

export interface TrackSpec {
  key: string;
  name: string;
  defPassability: string;
  detail: string;
}

export const TRACKS: readonly TrackSpec[] = [
  {
    key: 'main-driveway',
    name: 'Main driveway -- road entry to shed',
    defPassability: 'All-weather',
    detail:
      'Compacted gravel surface, 4m wide, 250m length. Good condition throughout. Adequate for light trucks and emergency vehicles. Single lane with no passing bay -- add passing bay at mid-point before community occupation. Locked 5-bar gate at road boundary.',
  },
  {
    key: 'north-paddock-track',
    name: 'North paddock track',
    defPassability: 'Dry season only',
    detail:
      'Bare earth surface, 3m wide, 600m length. Passable May-November in dry conditions. Impassable after significant rain -- clay base becomes deeply rutted. Gates in poor condition (two hanging off hinges). Priority: grade and gravel for community access to north paddock and proposed housing area.',
  },
  {
    key: 'creek-ford',
    name: 'Creek ford crossing -- seasonal creek',
    defPassability: 'Seasonally impassable',
    detail:
      'Gravel ford, 4m wide. Adequate when creek is dry or low flow (September-May). Flood velocity during winter peak events makes crossing dangerous and impassable -- vehicle access to north paddock blocked for ~8-12 weeks/year. Design decision required: culvert/bridge vs. seasonal access management plan.',
  },
];
const TRACKS_LEN = TRACKS.length;

// -- reuse (c5) -- 8-element reuse/renovate/demolish register (mockup p5) --

export interface ReuseElementSpec {
  key: string;
  group: 'Buildings' | 'Utilities' | 'Access';
  etype: 'Building' | 'Utility' | 'Track';
  name: string;
  cond: string;
  options: readonly string[];
  /** seeded disposition; "" means pending (a genuine gate-blocking state). */
  defDisposition: string;
  defScope: string;
  /** the "keep as-is" option that generates no Act task ("" if every option does). */
  keepOption: string;
  /** shown when disposition is pending ("") */
  pendingHint: string;
  /** short name used in the dynamic pending-warning sentence */
  pendingName: string;
  /** verbatim seeded Act-task label ("" if none seeded) */
  taskLabel: string;
}

export const REUSE_ELEMENTS: readonly ReuseElementSpec[] = [
  {
    key: 'rc-shed',
    group: 'Buildings',
    etype: 'Building',
    name: 'North shed',
    cond: 'Fair - 85 m2',
    options: ['Reuse', 'Renovate', 'Demolish'],
    defDisposition: 'Renovate',
    defScope:
      'Replace west cladding - re-roof with new iron - asbestos survey - electrical fit-out for workshop use',
    keepOption: 'Reuse',
    pendingHint: '',
    pendingName: 'north shed',
    taskLabel: 'North shed -- renovation works',
  },
  {
    key: 'rc-dairy',
    group: 'Buildings',
    etype: 'Building',
    name: 'Old dairy / milking shed',
    cond: 'Poor - 180 m2 - Awaiting structural report',
    options: ['Reuse', 'Renovate', 'Demolish'],
    defDisposition: '',
    defScope: '',
    keepOption: 'Reuse',
    pendingHint: 'Awaiting structural engineer report before decision',
    pendingName: 'old dairy',
    taskLabel: '',
  },
  {
    key: 'rc-pump',
    group: 'Buildings',
    etype: 'Building',
    name: 'Dam pumphouse',
    cond: 'Good - 12 m2',
    options: ['Reuse', 'Renovate', 'Demolish'],
    defDisposition: 'Reuse',
    defScope: '',
    keepOption: 'Reuse',
    pendingHint: '',
    pendingName: 'dam pumphouse',
    taskLabel: '',
  },
  {
    key: 'rc-power',
    group: 'Utilities',
    etype: 'Utility',
    name: 'Electrical supply -- single-phase 60A',
    cond: 'Active - Capacity insufficient',
    options: ['Retain', 'Upgrade', 'Remove'],
    defDisposition: 'Upgrade',
    defScope:
      'Upgrade to 3-phase 200A service OR supplement with community solar + battery -- decision in energy strategy',
    keepOption: 'Retain',
    pendingHint: '',
    pendingName: 'electrical supply',
    taskLabel: 'Electrical supply -- upgrade to community scale',
  },
  {
    key: 'rc-septic',
    group: 'Utilities',
    etype: 'Utility',
    name: 'Septic tank + absorption trench',
    cond: 'Limited - Aged - Single-dwelling only',
    options: ['Retain', 'Upgrade', 'Remove'],
    defDisposition: 'Upgrade',
    defScope:
      'Full replacement as part of community waste system -- designed in waste & nutrient cycling objective',
    keepOption: 'Retain',
    pendingHint: '',
    pendingName: 'septic tank',
    taskLabel: 'Wastewater -- upgrade to community system',
  },
  {
    key: 'rc-drive',
    group: 'Access',
    etype: 'Track',
    name: 'Main driveway',
    cond: 'All-weather - Good',
    options: ['Reuse', 'Upgrade', 'Remove'],
    defDisposition: 'Reuse',
    defScope: '',
    keepOption: 'Reuse',
    pendingHint: '',
    pendingName: 'main driveway',
    taskLabel: '',
  },
  {
    key: 'rc-ntrack',
    group: 'Access',
    etype: 'Track',
    name: 'North paddock track',
    cond: 'Dry season only - Poor',
    options: ['Reuse', 'Upgrade', 'Remove'],
    defDisposition: 'Upgrade',
    defScope:
      'Grade and compact - gravel to 100mm depth - replace two gates with farm gates on new posts',
    keepOption: 'Reuse',
    pendingHint: '',
    pendingName: 'north paddock track',
    taskLabel: 'North track -- upgrade to all-weather standard',
  },
  {
    key: 'rc-ford',
    group: 'Access',
    etype: 'Track',
    name: 'Creek ford crossing',
    cond: 'Impassable Jun-Aug - Seasonal only',
    options: ['Manage seasonally', 'Install crossing', 'Remove'],
    defDisposition: '',
    defScope: '',
    keepOption: '',
    pendingHint: 'Decision pending -- cost vs. seasonal access management to be resolved',
    pendingName: 'creek ford crossing',
    taskLabel: '',
  },
];
const REUSE_LEN = REUSE_ELEMENTS.length;
const REUSE_GROUPS: readonly ReuseElementSpec['group'][] = ['Buildings', 'Utilities', 'Access'];

// ---------------------------------------------------------------------------
// Models (parallel arrays are positional string[]; free-text scope is RAW)
// ---------------------------------------------------------------------------

export interface BuildingsModel {
  kind: 'buildings';
  /** length === BUILDINGS.length */
  condition: string[];
}
export interface ComplianceModel {
  kind: 'compliance';
  /** length === COMPLIANCE_CARDS.length */
  overall: string[];
}
export interface UtilitiesModel {
  kind: 'utilities';
  /** length === UTILITIES.length */
  status: string[];
}
export interface AccessModel {
  kind: 'access';
  /** length === TRACKS.length */
  passability: string[];
}
export interface ReuseModel {
  kind: 'reuse';
  /** length === REUSE_ELEMENTS.length; "" === pending */
  disposition: string[];
  /** length === REUSE_ELEMENTS.length */
  scope: string[];
}

export type InfraConditionModel =
  | BuildingsModel
  | ComplianceModel
  | UtilitiesModel
  | AccessModel
  | ReuseModel;

// ---------------------------------------------------------------------------
// FormValue coercion helpers (mirror FoodSystemCapture)
// ---------------------------------------------------------------------------

function asStr(v: FormValue[string] | undefined): string {
  return typeof v === 'string' ? v : '';
}

function asStrArr(v: FormValue[string] | undefined): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string');
  return typeof v === 'string' && v !== '' ? [v] : [];
}

/** Constrain a raw value to the allowed set, else fallback. */
function constrain(raw: string, allowed: readonly string[], fallback: string): string {
  return allowed.includes(raw) ? raw : fallback;
}

/** Seeded column decode: a stored array (if present) wins; else the seed column. */
function seededCol(v: FormValue[string] | undefined, seed: readonly string[]): string[] {
  if (Array.isArray(v)) return asStrArr(v);
  return [...seed];
}

interface SlotSpec {
  options: readonly string[];
  def: string;
}

/**
 * Fixed-length parallel-select decode: each slot is constrained to its own
 * option set, falling back to that slot's verbatim default.
 */
function decodeSlots(v: FormValue[string] | undefined, specs: readonly SlotSpec[]): string[] {
  const stored = Array.isArray(v) ? asStrArr(v) : null;
  return specs.map((spec, i) => {
    const raw = stored ? stored[i] ?? '' : '';
    return stored ? constrain(raw, spec.options, spec.def) : spec.def;
  });
}

// ---------------------------------------------------------------------------
// decode: FormValue -> InfraConditionModel (TOTAL / defensive; SEEDS defaults;
// never throws)
// ---------------------------------------------------------------------------

export function decodeInfraCondition(
  mode: InfraConditionMode,
  value: FormValue,
): InfraConditionModel {
  switch (mode) {
    case 'buildings':
      return {
        kind: 'buildings',
        condition: decodeSlots(
          value.icBldgCondition,
          BUILDINGS.map((b) => ({ options: CONDITION_OPTIONS, def: b.defCondition })),
        ),
      };
    case 'compliance':
      return {
        kind: 'compliance',
        overall: decodeSlots(
          value.icCompOverall,
          COMPLIANCE_CARDS.map((c) => ({
            options: COMPLIANCE_OVERALL_OPTIONS,
            def: c.defOverall,
          })),
        ),
      };
    case 'utilities':
      return {
        kind: 'utilities',
        status: decodeSlots(
          value.icUtilStatus,
          UTILITIES.map((u) => ({ options: UTILITY_STATUS_OPTIONS, def: u.defStatus })),
        ),
      };
    case 'access':
      return {
        kind: 'access',
        passability: decodeSlots(
          value.icAccessPass,
          TRACKS.map((t) => ({ options: PASSABILITY_OPTIONS, def: t.defPassability })),
        ),
      };
    case 'reuse':
      return {
        kind: 'reuse',
        disposition: decodeSlots(
          value.icReuseDisp,
          REUSE_ELEMENTS.map((e) => ({ options: e.options, def: e.defDisposition })),
        ),
        scope: seededCol(
          value.icReuseScope,
          REUSE_ELEMENTS.map((e) => e.defScope),
        ),
      };
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown InfraConditionMode: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// encode: InfraConditionModel -> FormValue (lossless inverse of decode)
// ---------------------------------------------------------------------------

export function encodeInfraCondition(
  _mode: InfraConditionMode,
  model: InfraConditionModel,
): FormValue {
  switch (model.kind) {
    case 'buildings':
      return { icBldgCondition: [...model.condition] };
    case 'compliance':
      return { icCompOverall: [...model.overall] };
    case 'utilities':
      return { icUtilStatus: [...model.status] };
    case 'access':
      return { icAccessPass: [...model.passability] };
    case 'reuse':
      return {
        icReuseDisp: [...model.disposition],
        icReuseScope: [...model.scope],
      };
    default: {
      const _exhaustive: never = model;
      throw new Error(`Unknown InfraConditionModel kind: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

function pendingIndices(disposition: readonly string[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < REUSE_LEN; i++) {
    if ((disposition[i] ?? '').trim() === '') out.push(i);
  }
  return out;
}

/** Oxford-free "a, b and c" join used by the verbatim pending sentence. */
function joinAnd(names: readonly string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0] ?? '';
  const head = names.slice(0, -1).join(', ');
  const tail = names[names.length - 1] ?? '';
  return `${head} and ${tail}`;
}

// ---------------------------------------------------------------------------
// validity arms (sees own value only). Advisory; only REUSE gates.
//   buildings / compliance / utilities / access -> always valid (seeded)
//   reuse -> every element must carry a non-empty disposition
// ---------------------------------------------------------------------------

export function isInfraConditionValid(mode: InfraConditionMode, value: FormValue): boolean {
  switch (mode) {
    case 'buildings':
    case 'compliance':
    case 'utilities':
    case 'access':
      return true;
    case 'reuse': {
      const m = decodeInfraCondition('reuse', value) as ReuseModel;
      return pendingIndices(m.disposition).length === 0;
    }
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown InfraConditionMode: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// summaries (defensive; never throw; handle empty value). siblingValues is
// accepted for signature uniformity but unused (no cross-item reads).
// ---------------------------------------------------------------------------

export function summariseInfraCondition(
  mode: InfraConditionMode,
  value: FormValue,
  siblingValues?: Record<string, FormValue>,
): string {
  void siblingValues;
  switch (mode) {
    case 'buildings': {
      const m = decodeInfraCondition('buildings', value) as BuildingsModel;
      const flagged = m.condition.filter((c) => c === 'Poor' || c === 'Unsafe').length;
      return `${BUILDINGS_LEN} structures inventoried, ${flagged} flagged Poor/Unsafe`;
    }
    case 'compliance': {
      const m = decodeInfraCondition('compliance', value) as ComplianceModel;
      const major = m.overall.filter((o) => o === 'Major -- assess before use').length;
      const minor = m.overall.filter((o) => o === 'Minor issues').length;
      const clear = m.overall.filter((o) => o === 'No compliance issues').length;
      return `${major} major, ${minor} minor, ${clear} clear`;
    }
    case 'utilities': {
      const m = decodeInfraCondition('utilities', value) as UtilitiesModel;
      void m;
      return `${UTILITIES_LEN} utilities recorded, ${UTILITY_CAPWARN_COUNT} capacity warnings`;
    }
    case 'access': {
      const m = decodeInfraCondition('access', value) as AccessModel;
      const limited = m.passability.filter((p) => p !== 'All-weather').length;
      return `${TRACKS_LEN} routes assessed, ${limited} with passability limits`;
    }
    case 'reuse': {
      const m = decodeInfraCondition('reuse', value) as ReuseModel;
      const pending = pendingIndices(m.disposition).length;
      return pending === 0
        ? `All ${REUSE_LEN} elements have a disposition`
        : `${pending} of ${REUSE_LEN} elements pending disposition`;
    }
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown InfraConditionMode: ${String(_exhaustive)}`);
    }
  }
}

// ===========================================================================
// React component + 5 mode bodies (P1..P5)
// ===========================================================================

export interface InfraConditionCaptureProps {
  mode: InfraConditionMode;
  value: FormValue;
  onChange: (next: FormValue) => void;
  /** this capture's own checklist item id (e.g. ev-s3-infra-condition-c1). */
  itemId: string;
  /** full per-item FormValue map; reserved -- this capture reads no siblings. */
  siblingValues?: Record<string, FormValue>;
}

export function InfraConditionCapture({
  mode,
  value,
  onChange,
  itemId,
  siblingValues = {},
}: InfraConditionCaptureProps): React.JSX.Element {
  void itemId;
  void siblingValues;

  // -- P1: buildings --------------------------------------------------------
  if (mode === 'buildings') {
    const model = decodeInfraCondition('buildings', value) as BuildingsModel;
    const setCondition = (i: number, v: string): void => {
      const next = model.condition.slice();
      next[i] = v;
      onChange(encodeInfraCondition('buildings', { ...model, condition: next }));
    };
    return (
      <div className={css.root} data-ic-mode="buildings">
        <div>
          <div className={css.regHead}>
            <span className={css.regTitle}>Building register</span>
            <span className={css.regCount}>{BUILDINGS_LEN} structures</span>
          </div>
          {BUILDINGS.map((b, i) => {
            const Icon = b.Icon;
            return (
              <div key={b.key} className={css.bldgCard}>
                <div className={css.bldgHead}>
                  <span className={css.bldgIcon} aria-hidden="true">
                    <Icon size={15} />
                  </span>
                  <div className={css.bldgMeta}>
                    <div className={css.bldgName}>{b.name}</div>
                    <div className={css.bldgInfo}>{b.info}</div>
                  </div>
                  <FsSelect
                    className={css.condSel}
                    value={model.condition[i] ?? b.defCondition}
                    options={CONDITION_OPTIONS}
                    ariaLabel={`${b.name} condition`}
                    onChange={(v) => setCondition(i, v)}
                  />
                </div>
                <div className={css.bldgDetail}>{b.detail}</div>
              </div>
            );
          })}
        </div>
        <FeedsNote>
          Building inventory feeds the <strong>compliance assessment</strong> (item 2) and
          the <strong>reuse decision register</strong> (item 5). The old dairy&apos;s
          condition and asbestos risk will drive the most consequential reuse decision in
          this objective.
        </FeedsNote>
      </div>
    );
  }

  // -- P2: compliance -------------------------------------------------------
  if (mode === 'compliance') {
    const model = decodeInfraCondition('compliance', value) as ComplianceModel;
    const setOverall = (i: number, v: string): void => {
      const next = model.overall.slice();
      next[i] = v;
      onChange(encodeInfraCondition('compliance', { ...model, overall: next }));
    };
    return (
      <div className={css.root} data-ic-mode="compliance">
        <div>
          <SectionEyebrow>Structural & code compliance</SectionEyebrow>
          {COMPLIANCE_CARDS.map((c, i) => {
            const Icon = c.Icon;
            return (
              <div key={c.key} className={css.compCard}>
                <div className={css.compHead}>
                  <span className={css.compIcon} aria-hidden="true">
                    <Icon size={14} />
                  </span>
                  <span className={css.compName}>{c.name}</span>
                  <FsSelect
                    className={css.compSel}
                    value={model.overall[i] ?? c.defOverall}
                    options={COMPLIANCE_OVERALL_OPTIONS}
                    ariaLabel={`${c.name} compliance status`}
                    onChange={(v) => setOverall(i, v)}
                  />
                </div>
                <div className={css.compItems}>
                  {c.items.map((it) => (
                    <div key={it.text} className={css.ci}>
                      <span className={css.ciDot} data-tone={it.tone} aria-hidden="true" />
                      <span className={css.ciText}>{it.text}</span>
                      <span className={css.ciFlag} data-flag={it.flagTone}>
                        {it.flag}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className={css.ohsNote} role="note">
          <TriangleAlert size={14} className={css.ohsIcon} aria-hidden="true" />
          <div className={css.ohsTxt}>
            <strong>{COMPLIANCE_OHS_LEAD}</strong> {COMPLIANCE_OHS_BODY}
          </div>
        </div>
      </div>
    );
  }

  // -- P3: utilities --------------------------------------------------------
  if (mode === 'utilities') {
    const model = decodeInfraCondition('utilities', value) as UtilitiesModel;
    const setStatus = (i: number, v: string): void => {
      const next = model.status.slice();
      next[i] = v;
      onChange(encodeInfraCondition('utilities', { ...model, status: next }));
    };
    return (
      <div className={css.root} data-ic-mode="utilities">
        <div>
          <SectionEyebrow>Utility infrastructure register</SectionEyebrow>
          {UTILITIES.map((u, i) => {
            const Icon = u.Icon;
            return (
              <div key={u.key} className={css.utilRow} data-warn={u.capWarn !== ''}>
                <span className={css.utilIcon} aria-hidden="true">
                  <Icon size={15} />
                </span>
                <div className={css.utilBody}>
                  <div className={css.utilTop}>
                    <span className={css.utilType}>{u.name}</span>
                    <FsSelect
                      className={css.utilSel}
                      value={model.status[i] ?? u.defStatus}
                      options={UTILITY_STATUS_OPTIONS}
                      ariaLabel={`${u.name} status`}
                      onChange={(v) => setStatus(i, v)}
                    />
                  </div>
                  <div className={css.utilDetail}>{u.detail}</div>
                  {u.capWarn !== '' ? (
                    <div className={css.utilCapWarn}>
                      <TriangleAlert size={11} className={css.utilCapIcon} aria-hidden="true" />
                      <span>{u.capWarn}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
        <FeedsNote>
          Two utilities flagged insufficient for community scale: electrical supply (upgrade
          or solar offset) and drainage (full replacement). Both enter the{' '}
          <strong>reuse decision register</strong> (item 5) as infrastructure requiring
          upgrade.
        </FeedsNote>
      </div>
    );
  }

  // -- P4: access -----------------------------------------------------------
  if (mode === 'access') {
    const model = decodeInfraCondition('access', value) as AccessModel;
    const setPass = (i: number, v: string): void => {
      const next = model.passability.slice();
      next[i] = v;
      onChange(encodeInfraCondition('access', { ...model, passability: next }));
    };
    return (
      <div className={css.root} data-ic-mode="access">
        <div>
          <SectionEyebrow>Access route register</SectionEyebrow>
          {TRACKS.map((t, i) => (
            <div key={t.key} className={css.trackCard}>
              <div className={css.tcHead}>
                <span className={css.tcIcon} aria-hidden="true">
                  <Route size={14} />
                </span>
                <span className={css.tcName}>{t.name}</span>
                <FsSelect
                  className={css.tcSel}
                  value={model.passability[i] ?? t.defPassability}
                  options={PASSABILITY_OPTIONS}
                  ariaLabel={`${t.name} passability`}
                  onChange={(v) => setPass(i, v)}
                />
              </div>
              <div className={css.tcDetail}>{t.detail}</div>
            </div>
          ))}
        </div>
        <FeedsNote>
          Track conditions and passability constraints feed{' '}
          <strong>Tier 3: Spatial framework</strong> -- the north paddock seasonal access
          restriction affects where housing can be sited and what access is guaranteed
          year-round.
        </FeedsNote>
      </div>
    );
  }

  // -- P5: reuse ------------------------------------------------------------
  const model = decodeInfraCondition('reuse', value) as ReuseModel;
  const setDisposition = (i: number, v: string): void => {
    const next = model.disposition.slice();
    next[i] = v;
    onChange(encodeInfraCondition('reuse', { ...model, disposition: next }));
  };
  const setScope = (i: number, v: string): void => {
    const next = model.scope.slice();
    next[i] = v;
    onChange(encodeInfraCondition('reuse', { ...model, scope: next }));
  };

  const pending = pendingIndices(model.disposition);
  const pendingNames = pending.map((i) => REUSE_ELEMENTS[i]?.pendingName ?? '');

  return (
    <div className={css.root} data-ic-mode="reuse">
      {REUSE_GROUPS.map((group) => (
        <div key={group}>
          <SectionEyebrow>{group}</SectionEyebrow>
          {REUSE_ELEMENTS.map((e, i) => {
            if (e.group !== group) return null;
            const disp = model.disposition[i] ?? '';
            const isPending = disp === '';
            const isKeep = e.keepOption !== '' && disp === e.keepOption;
            const showScope = disp !== '' && !isKeep;
            const dataDisp = isPending ? 'pending' : isKeep ? 'keep' : 'action';
            return (
              <div key={e.key} className={css.reuseCard} data-disp={dataDisp}>
                <div className={css.rcHead}>
                  <span className={css.rcEtype} data-etype={e.etype}>
                    {e.etype}
                  </span>
                  <span className={css.rcName}>{e.name}</span>
                  <span className={css.rcCond}>{e.cond}</span>
                </div>
                <div className={css.rcBtns} role="group" aria-label={`${e.name} disposition`}>
                  {e.options.map((opt) => {
                    const on = disp === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        className={css.rdBtn}
                        data-on={on}
                        aria-pressed={on}
                        onClick={() => setDisposition(i, opt)}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {isPending && e.pendingHint !== '' ? (
                  <div className={css.pendingRow}>
                    <span className={css.pendingTag}>
                      <Clock size={9} aria-hidden="true" /> {e.pendingHint}
                    </span>
                  </div>
                ) : null}
                {showScope ? (
                  <div className={css.rcExpand}>
                    <input
                      type="text"
                      className={css.rcScopeInp}
                      value={model.scope[i] ?? ''}
                      placeholder="Disposition scope"
                      aria-label={`${e.name} disposition scope`}
                      onChange={(ev) => setScope(i, ev.target.value)}
                    />
                    <span className={css.taskPill}>
                      Act task: {e.taskLabel !== '' ? e.taskLabel : e.name}
                    </span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ))}

      {pending.length > 0 ? (
        <div className={css.pendingWarn} role="note">
          <strong>
            {pending.length} {pending.length === 1 ? 'element' : 'elements'} pending
            disposition
          </strong>{' '}
          -- {joinAnd(pendingNames)}{' '}
          {pending.length === 1 ? 'requires a decision' : 'require decisions'} before this
          gate can pass. Complete the structural report and cost estimate to enable these
          decisions.
        </div>
      ) : null}

      <FeedsNote>
        Reuse decisions feed <strong>Tier 3: Spatial framework</strong> (which elements can
        be assumed as existing usable infrastructure) and generate <strong>Act tasks</strong>{' '}
        for all renovation and upgrade work that must precede community occupation.
      </FeedsNote>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

/**
 * FsSelect -- a thin controlled native <select>. The mockup uses native selects;
 * the shared Dropdown control injects a placeholder "" option that would defeat
 * the verbatim default semantics here, so a plain themed <select> is used.
 */
function FsSelect({
  value,
  options,
  onChange,
  ariaLabel,
  className,
}: {
  value: string;
  options: readonly string[];
  onChange: (next: string) => void;
  ariaLabel: string;
  className?: string;
}): React.JSX.Element {
  return (
    <select
      className={className}
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function FeedsNote({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className={css.feedsBlock}>
      <ArrowRight size={13} className={css.feedsIcon} aria-hidden="true" />
      <div className={css.feedsTxt}>{children}</div>
    </div>
  );
}

export default InfraConditionCapture;
