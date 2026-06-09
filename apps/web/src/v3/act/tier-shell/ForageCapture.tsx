/**
 * ForageCapture -- a multi-mode CONTROLLED capture for the silvopasture
 * objective silv-sec-s3-forage-survey ("Forage / pasture survey", 5 checklist
 * items c1..c5). Ported from the forage-survey mockup right-hand panels p1..p5:
 *
 *   c1 -> zones        (forage zone register: type, area, condition, composition)
 *   c2 -> seasonal     (per-zone 12-month feed-availability calendar)
 *   c3 -> capacity     (per-zone DSE condition-class assignment -> carrying cap)
 *   c4 -> constraints  (shelter / grazing-exclusion register)
 *   c5 -> toxic        (toxic / weed plant survey for candidate stock)
 *
 * F1 (THIS FILE) is the PURE CONTRACT ONLY: types, mode mapper, decode/encode,
 * validity gates, summaries, and the verbatim constant tables. There is NO
 * React component body and no per-mode JSX yet -- the `ForageCapture` component
 * and the five mode bodies (P1..P5) arrive in F2. This file compiles as a
 * module of pure exports.
 *
 * Serialization mirrors BoundaryCapture exactly: growable rows are stored as
 * parallel string[] register-arrays (asArr / zipLen), positional
 * checkers as a single positional string[]. Numeric raw fields are stored as
 * RAW STRINGS and coerced via `num` (CarryingCapacity convention -- preserves a
 * legitimate 0, falls back only on empty / non-finite). decode is TOTAL: it
 * never throws and never fabricates seed data (empty FormValue -> empty
 * zones/rows/calendars, toxic all "not-surveyed").
 *
 * ASCII-only: em-dash -> " -- "; "m2" spelled out; no smart quotes; all icons
 * are lucide (none referenced here). Apostrophes use double-quoted JS strings.
 */

import type { FormValue } from './actToolCatalog.js';
import { DSE_PRESETS, type ConditionClass } from './forageZoneSync.js';
import type { LivestockSpecies } from '../../../store/livestockStore.js';

// ---------------------------------------------------------------------------
// Mode mapper
// ---------------------------------------------------------------------------

export type ForageMode = 'zones' | 'seasonal' | 'capacity' | 'constraints' | 'toxic';

export const FORAGE_PREFIX = 'silv-sec-s3-forage-survey';
const PREFIX_DASH = FORAGE_PREFIX + '-';

export function forageModeFor(itemId: string): ForageMode | null {
  if (!itemId.startsWith(PREFIX_DASH)) return null;
  const suffix = itemId.slice(PREFIX_DASH.length);
  switch (suffix) {
    case 'c1':
      return 'zones';
    case 'c2':
      return 'seasonal';
    case 'c3':
      return 'capacity';
    case 'c4':
      return 'constraints';
    case 'c5':
      return 'toxic';
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Domain string unions
// ---------------------------------------------------------------------------

export type ForageType = 'improved' | 'native' | 'mixed' | 'riparian' | 'degraded';
export type ConditionGrade = 'good' | 'fair' | 'poor';
export type ToxicState = 'present' | 'absent' | 'not-surveyed';

// ---------------------------------------------------------------------------
// Models (kind-discriminated; numeric fields stored as RAW STRINGS)
// ---------------------------------------------------------------------------

export interface ForageZoneInput {
  /** stable; used downstream for deterministic paddock ids */
  id: string;
  /** raw; one of ForageType or "" (defensive) */
  forageType: string;
  name: string;
  /** raw numeric string */
  areaHa: string;
  /** raw; one of ConditionGrade or "" */
  condition: string;
  /** free text body / composition note */
  composition: string;
}
export interface ForageZonesModel {
  kind: 'zones';
  zones: ForageZoneInput[];
  candidateSpecies: LivestockSpecies[];
}

export interface ForageSeasonalModel {
  kind: 'seasonal';
  /** one entry per zone; months is exactly 12 ints each 0|1|2 (0=gap,1=moderate,2=adequate) */
  calendars: { zoneId: string; months: number[] }[];
}

export interface ForageCapacityModel {
  kind: 'capacity';
  /** per-zone DSE condition-class assignment; "" = unassigned */
  classByZone: { zoneId: string; conditionClass: ConditionClass | '' }[];
}

export interface ForageConstraintRow {
  id: string;
  /** "shelter" | "exclusion" (raw string, defensive) */
  kind: string;
  title: string;
  detail: string;
  /** raw numeric string; exclusions may be signed/negative or non-numeric ("TBD") */
  areaHa: string;
}
export interface ForageConstraintsModel {
  kind: 'constraints';
  rows: ForageConstraintRow[];
}

export interface ForageToxicModel {
  kind: 'toxic';
  /** length === TOXIC_PLANTS.length, positional, default "not-surveyed" */
  states: ToxicState[];
}

export type ForageModel =
  | ForageZonesModel
  | ForageSeasonalModel
  | ForageCapacityModel
  | ForageConstraintsModel
  | ForageToxicModel;

// ---------------------------------------------------------------------------
// Verbatim constants (cultural / scientific references; never reword / omit)
// ---------------------------------------------------------------------------

export interface ForageTypeSpec {
  value: ForageType;
  label: string;
}
export const FORAGE_TYPES: readonly ForageTypeSpec[] = [
  { value: 'improved', label: 'Improved pasture' },
  { value: 'native', label: 'Native grassland' },
  { value: 'mixed', label: 'Mixed' },
  { value: 'riparian', label: 'Riparian / Browse' },
  { value: 'degraded', label: 'Degraded' },
];

export interface ConditionGradeSpec {
  value: ConditionGrade;
  label: string;
}
export const CONDITION_GRADES: readonly ConditionGradeSpec[] = [
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
];

// Per-forage-type DSE condition-class option groups for the P3 selector.
// Keys are ForageType; values are the ConditionClass options shown for that type.
// (Verbatim from the mockup's per-zone DSE buttons, grouped by base type.)
export const CONDITION_CLASS_GROUPS: Record<ForageType, ConditionClass[]> = {
  improved: ['improved-excellent', 'improved-good', 'improved-fair', 'improved-poor'],
  native: ['native-good', 'native-fair', 'native-poor'],
  mixed: ['mixed-good', 'mixed-fair'],
  riparian: ['riparian-good', 'riparian-fair', 'riparian-browse', 'riparian-bare'],
  degraded: ['degraded'],
};

// Human labels for each ConditionClass selector button (verbatim from mockup, ASCII " -- " for the middot).
export const CONDITION_CLASS_LABELS: Record<ConditionClass, string> = {
  'improved-excellent': 'Improved -- Excellent / 15 DSE/ha',
  'improved-good': 'Improved -- Good / 10',
  'improved-fair': 'Improved -- Fair / 6',
  'improved-poor': 'Improved -- Poor / 3',
  'native-good': 'Native -- Good / 6',
  'native-fair': 'Native -- Fair / 3',
  'native-poor': 'Native -- Poor / 1.5',
  'mixed-good': 'Mixed -- Good / 8',
  'mixed-fair': 'Mixed -- Fair / 4',
  'riparian-good': 'Riparian -- Good / 2',
  'riparian-fair': 'Riparian -- Fair / 1',
  'riparian-browse': 'Browse -- Moderate / 1.5',
  'riparian-bare': 'Bare / degraded / 0.5',
  degraded: 'Degraded / 0.8',
};

// Toxic/weed plants relevant to candidate stock (Merino sheep). VERBATIM names + binomials.
export interface ToxicPlantSpec {
  name: string;
  /** scientific name + any qualifier, verbatim */
  binomial: string;
  /** risk tag, verbatim */
  risk: string;
  /** has an ecology cross-reference */
  ecologyXref?: boolean;
}
export const TOXIC_PLANTS: readonly ToxicPlantSpec[] = [
  { name: 'Cape tulip', binomial: 'Moraea flaccida -- previously Homeria flaccida', risk: 'HIGH', ecologyXref: true },
  { name: "Patterson's curse / Salvation Jane", binomial: 'Echium plantagineum', risk: 'Moderate' },
  { name: 'Fireweed', binomial: 'Senecio madagascariensis -- pyrrolizidine alkaloids -- liver toxicity', risk: 'Moderate' },
  { name: 'Pimelea / Flaxweed', binomial: 'Pimelea spp. -- swelling disease in sheep on perennial pasture', risk: 'Low-Moderate' },
  { name: 'Serrated tussock', binomial: 'Nassella trichotoma -- low nutrition, high fibre -- causes nutritional scour', risk: 'Nutritional' },
];

// ---------------------------------------------------------------------------
// FormValue coercion helpers (mirror BoundaryCapture / CarryingCapacity)
// ---------------------------------------------------------------------------

// Scalar "" is treated as absent (zero-length array); only array form may carry empty-string slots.
function asArr(v: FormValue[string] | undefined): string[] {
  if (Array.isArray(v)) return v;
  return typeof v === 'string' && v !== '' ? [v] : [];
}
function zipLen(...arrs: string[][]): number {
  return arrs.length ? Math.min(...arrs.map((a) => a.length)) : 0;
}

/**
 * Numeric coercion for every raw field. Falls back ONLY when raw is empty or
 * parses to a non-finite number; a legitimate 0 is PRESERVED. Mirrors the
 * CarryingCapacity convention (deliberately NOT `Number(raw) || fallback`).
 */
function num(raw: string, fallback: number): number {
  if (raw.trim() === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

// Valid LivestockSpecies, used to drop unknown candidate-species entries.
const SPECIES_SET = new Set<string>([
  'sheep',
  'cattle',
  'goats',
  'poultry',
  'pigs',
  'horses',
  'ducks_geese',
  'rabbits',
  'bees',
]);

/** Parse a 12-char digit string into a 12-length number[] of 0|1|2 (clamp invalid -> 0). */
function parseMonths(raw: string): number[] {
  const months: number[] = [];
  for (let i = 0; i < 12; i++) {
    const ch = raw[i];
    const n = ch === '1' ? 1 : ch === '2' ? 2 : 0;
    months.push(n);
  }
  return months;
}

// ---------------------------------------------------------------------------
// decode: FormValue -> ForageModel (TOTAL / defensive; never throws, never
// fabricates seed data)
// ---------------------------------------------------------------------------

export function decodeForage(mode: ForageMode, value: FormValue): ForageModel {
  switch (mode) {
    case 'zones': {
      const zoneIds = asArr(value.zoneIds);
      const forageTypes = asArr(value.forageTypes);
      const zoneNames = asArr(value.zoneNames);
      const areaHas = asArr(value.areaHas);
      const conditions = asArr(value.conditions);
      const compositions = asArr(value.compositions);
      const n = zipLen(zoneIds, forageTypes, zoneNames, areaHas, conditions, compositions);
      const zones: ForageZoneInput[] = [];
      for (let i = 0; i < n; i++) {
        const rawId = zoneIds[i] ?? '';
        zones.push({
          id: rawId !== '' ? rawId : `zone-${i}`,
          forageType: forageTypes[i] ?? '',
          name: zoneNames[i] ?? '',
          areaHa: areaHas[i] ?? '',
          condition: conditions[i] ?? '',
          composition: compositions[i] ?? '',
        });
      }
      const candidateSpecies = asArr(value.candidateSpecies).filter((s) =>
        SPECIES_SET.has(s),
      ) as LivestockSpecies[];
      return { kind: 'zones', zones, candidateSpecies };
    }
    case 'seasonal': {
      const calZoneIds = asArr(value.calZoneIds);
      const calMonths = asArr(value.calMonths);
      const n = zipLen(calZoneIds, calMonths);
      const calendars: { zoneId: string; months: number[] }[] = [];
      for (let i = 0; i < n; i++) {
        calendars.push({ zoneId: calZoneIds[i] ?? '', months: parseMonths(calMonths[i] ?? '') });
      }
      return { kind: 'seasonal', calendars };
    }
    case 'capacity': {
      const capZoneIds = asArr(value.capZoneIds);
      const capClasses = asArr(value.capClasses);
      const n = zipLen(capZoneIds, capClasses);
      const classByZone: { zoneId: string; conditionClass: ConditionClass | '' }[] = [];
      for (let i = 0; i < n; i++) {
        const raw = capClasses[i] ?? '';
        const conditionClass = Object.prototype.hasOwnProperty.call(DSE_PRESETS, raw)
          ? (raw as ConditionClass)
          : '';
        classByZone.push({ zoneId: capZoneIds[i] ?? '', conditionClass });
      }
      return { kind: 'capacity', classByZone };
    }
    case 'constraints': {
      const conIds = asArr(value.conIds);
      const conKinds = asArr(value.conKinds);
      const conTitles = asArr(value.conTitles);
      const conDetails = asArr(value.conDetails);
      const conAreas = asArr(value.conAreas);
      const n = zipLen(conIds, conKinds, conTitles, conDetails, conAreas);
      const rows: ForageConstraintRow[] = [];
      for (let i = 0; i < n; i++) {
        const rawId = conIds[i] ?? '';
        rows.push({
          id: rawId !== '' ? rawId : `con-${i}`,
          kind: conKinds[i] ?? '',
          title: conTitles[i] ?? '',
          detail: conDetails[i] ?? '',
          areaHa: conAreas[i] ?? '',
        });
      }
      return { kind: 'constraints', rows };
    }
    case 'toxic': {
      const raw = asArr(value.toxicStates);
      const states: ToxicState[] = [];
      for (let i = 0; i < TOXIC_PLANTS.length; i++) {
        const v = raw[i];
        states.push(v === 'present' || v === 'absent' ? v : 'not-surveyed');
      }
      return { kind: 'toxic', states };
    }
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown ForageMode: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// encode: ForageModel -> FormValue (lossless inverse of decode)
// ---------------------------------------------------------------------------

export function encodeForage(mode: ForageMode, model: ForageModel): FormValue {
  switch (model.kind) {
    case 'zones':
      return {
        zoneIds: model.zones.map((z) => z.id),
        forageTypes: model.zones.map((z) => z.forageType),
        zoneNames: model.zones.map((z) => z.name),
        areaHas: model.zones.map((z) => z.areaHa),
        conditions: model.zones.map((z) => z.condition),
        compositions: model.zones.map((z) => z.composition),
        candidateSpecies: [...model.candidateSpecies],
      };
    case 'seasonal':
      return {
        calZoneIds: model.calendars.map((c) => c.zoneId),
        calMonths: model.calendars.map((c) =>
          c.months.map((m) => String(m === 1 || m === 2 ? m : 0)).join(''),
        ),
      };
    case 'capacity':
      return {
        capZoneIds: model.classByZone.map((c) => c.zoneId),
        capClasses: model.classByZone.map((c) => c.conditionClass),
      };
    case 'constraints':
      return {
        conIds: model.rows.map((r) => r.id),
        conKinds: model.rows.map((r) => r.kind),
        conTitles: model.rows.map((r) => r.title),
        conDetails: model.rows.map((r) => r.detail),
        conAreas: model.rows.map((r) => r.areaHa),
      };
    case 'toxic':
      return { toxicStates: [...model.states] };
    default: {
      const _exhaustive: never = model;
      throw new Error(`Unknown ForageModel kind: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// validity gates (sees own value only, NOT siblings)
// ---------------------------------------------------------------------------

export function isForageValid(mode: ForageMode, value: FormValue): boolean {
  switch (mode) {
    case 'zones': {
      const model = decodeForage('zones', value) as ForageZonesModel;
      const hasSubstantiveZone = model.zones.some(
        (z) => z.forageType !== '' && num(z.areaHa, 0) > 0,
      );
      return hasSubstantiveZone && model.candidateSpecies.length >= 1;
    }
    case 'seasonal':
      return true; // assessing gaps; a partial / empty calendar is still recordable
    case 'capacity':
      return true; // computed / auto-satisfied by a formula elsewhere
    case 'constraints':
      return true; // zero constraints is a valid answer
    case 'toxic':
      return true; // "not surveyed" is an explicit, legitimate recordable state
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown ForageMode: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// summaries (may read sibling c1 zones via siblingValues)
// ---------------------------------------------------------------------------

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function oneDecimal(n: number): string {
  return n.toFixed(1);
}

/** Read the c1 zones model from siblings; returns an empty zones model when absent. */
function siblingZones(
  siblingValues: Record<string, FormValue> | undefined,
  prefix: string,
): ForageZonesModel {
  const c1 = siblingValues?.[`${prefix}-c1`];
  if (!c1) return { kind: 'zones', zones: [], candidateSpecies: [] };
  return decodeForage('zones', c1) as ForageZonesModel;
}

export function summariseForage(
  mode: ForageMode,
  value: FormValue,
  siblingValues?: Record<string, FormValue>,
  prefix: string = FORAGE_PREFIX,
): string {
  switch (mode) {
    case 'zones': {
      const model = decodeForage('zones', value) as ForageZonesModel;
      const n = model.zones.length;
      if (n === 0) return 'No forage zones recorded';
      const totalHa = model.zones.reduce((sum, z) => sum + num(z.areaHa, 0), 0);
      const species = model.candidateSpecies.length;
      return `${plural(n, 'forage zone', 'forage zones')}, ${oneDecimal(totalHa)} ha, ${plural(
        species,
        'candidate species',
        'candidate species',
      )}`;
    }
    case 'seasonal': {
      const model = decodeForage('seasonal', value) as ForageSeasonalModel;
      if (model.calendars.length === 0) return 'No feed gaps across zones';
      let gaps = 0;
      for (let m = 0; m < 12; m++) {
        const minState = Math.min(...model.calendars.map((c) => c.months[m] ?? 0));
        if (minState === 0) gaps++;
      }
      if (gaps === 0) return 'No feed gaps across zones';
      return plural(gaps, 'feed-gap month', 'feed-gap months');
    }
    case 'capacity': {
      const model = decodeForage('capacity', value) as ForageCapacityModel;
      const zones = siblingZones(siblingValues, prefix);
      const areaById = new Map<string, string>();
      for (const z of zones.zones) areaById.set(z.id, z.areaHa);
      let total = 0;
      let classified = 0;
      for (const entry of model.classByZone) {
        if (entry.conditionClass === '') continue;
        classified++;
        const areaHa = num(areaById.get(entry.zoneId) ?? '', 0);
        total += Math.round(areaHa * DSE_PRESETS[entry.conditionClass]);
      }
      if (classified === 0) return 'Carrying capacity not yet estimated';
      const cattle = Math.round(total / 8);
      return `~${total} DSE total (~${total} ewes / ${cattle} cattle)`;
    }
    case 'constraints': {
      const model = decodeForage('constraints', value) as ForageConstraintsModel;
      const n = model.rows.length;
      if (n === 0) return 'No grazeable-area constraints';
      const exclusionsHa = model.rows
        .filter((r) => r.kind === 'exclusion')
        .reduce((sum, r) => sum + Math.abs(num(r.areaHa, 0)), 0);
      const totalHa = siblingZones(siblingValues, prefix).zones.reduce(
        (sum, z) => sum + num(z.areaHa, 0),
        0,
      );
      const effective = Math.max(0, totalHa - exclusionsHa);
      return `${plural(n, 'constraint', 'constraints')}, ${oneDecimal(
        exclusionsHa,
      )} ha excluded, ${oneDecimal(effective)} ha effective`;
    }
    case 'toxic': {
      const model = decodeForage('toxic', value) as ForageToxicModel;
      const present = model.states.filter((s) => s === 'present').length;
      const absent = model.states.filter((s) => s === 'absent').length;
      const notSurveyed = model.states.filter((s) => s === 'not-surveyed').length;
      const prefixStr = model.states[0] === 'present' ? 'High risk -- Cape tulip present. ' : '';
      return `${prefixStr}${present} present, ${absent} absent, ${notSurveyed} not surveyed`;
    }
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown ForageMode: ${String(_exhaustive)}`);
    }
  }
}
