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
 * F1 is the PURE CONTRACT: types, mode mapper, decode/encode, validity gates,
 * summaries, and the verbatim constant tables.
 *
 * F2 (NOW LANDED, below the F1 exports) adds the controlled React component
 * `ForageCapture` plus its five mode bodies (P1..P5). The component renders
 * ONLY the scrollable mode body (the mockup's `.rb` inner content) -- the
 * third-column host (DecisionWorkingPanel) owns the eyebrow / title / hint /
 * feeds / Record-Defer chrome. Each body follows the same shape as
 * CarryingCapacityCapture: decode(value) -> set(patch) -> onChange(encode).
 * `projectId` is accepted (and consumed by F3 at Record time) but unused here.
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

import * as React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import type { FormValue } from './actToolCatalog.js';
import { DSE_PRESETS, type ConditionClass } from './forageZoneSync.js';
import type { LivestockSpecies } from '../../../store/livestockStore.js';
import {
  AmountRow,
  CapacityCeilingBlock,
  ChipSelect,
  ChoiceCardGrid,
  InterpretationBlock,
  MonthCalendarGrid,
  type MonthState,
  MONTH_NAMES,
  RegisterList,
  SectionEyebrow,
  StatusPill,
  type StatusPillTone,
} from './captures/controls/index.js';
import css from './ForageCapture.module.css';

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

// ===========================================================================
// F2 -- React component + 5 mode bodies (P1..P5)
// ===========================================================================

// Candidate livestock species labels (P1 selector). VERBATIM.
const SPECIES_LABELS: Record<LivestockSpecies, string> = {
  sheep: 'Sheep',
  cattle: 'Cattle',
  goats: 'Goats',
  poultry: 'Poultry',
  pigs: 'Pigs',
  horses: 'Horses',
  ducks_geese: 'Ducks & geese',
  rabbits: 'Rabbits',
  bees: 'Bees',
};
const SPECIES_ORDER: readonly LivestockSpecies[] = [
  'sheep',
  'cattle',
  'goats',
  'poultry',
  'pigs',
  'horses',
  'ducks_geese',
  'rabbits',
  'bees',
];

// Forage-type label <-> value maps (P1 ChipSelect uses labels as options).
const FORAGE_LABEL_BY_VALUE = new Map<string, string>(
  FORAGE_TYPES.map((t) => [t.value, t.label]),
);
const FORAGE_VALUE_BY_LABEL = new Map<string, string>(
  FORAGE_TYPES.map((t) => [t.label, t.value]),
);

// Condition-grade label <-> value maps (P1 ChipSelect).
const COND_LABEL_BY_VALUE = new Map<string, string>(
  CONDITION_GRADES.map((g) => [g.value, g.label]),
);
const COND_VALUE_BY_LABEL = new Map<string, string>(
  CONDITION_GRADES.map((g) => [g.label, g.value]),
);

// Condition-class label <-> value maps (P3 selector).
const CLASS_VALUE_BY_LABEL = new Map<string, ConditionClass>(
  (Object.keys(CONDITION_CLASS_LABELS) as ConditionClass[]).map((k) => [
    CONDITION_CLASS_LABELS[k],
    k,
  ]),
);

// All ConditionClass values (P3 fallback when a zone has no forageType).
const ALL_CONDITION_CLASSES = Object.keys(DSE_PRESETS) as ConditionClass[];

// Monotonic id counter -- stable within a session; ensures decode's positional
// fallback never collides. Component-scope (not a workflow script), so a plain
// counter is acceptable.
let _idCounter = 0;

// Tri-state toxic control buttons (P5).
const TOXIC_BUTTONS: readonly { state: ToxicState; label: string }[] = [
  { state: 'present', label: 'Present' },
  { state: 'absent', label: 'Absent' },
  { state: 'not-surveyed', label: 'Not surveyed' },
];

// Map model month int (0|1|2) -> MonthState for the 3-state seasonal cycle.
const SEASONAL_CYCLE: readonly MonthState[] = ['none', 'med', 'high'];

function monthsToRecord(months: number[]): Record<number, MonthState> {
  const rec: Record<number, MonthState> = {};
  for (let i = 0; i < 12; i++) {
    const m = months[i] ?? 0;
    rec[i] = m === 2 ? 'high' : m === 1 ? 'med' : 'none';
  }
  return rec;
}

function recordToMonths(rec: Record<number, MonthState>): number[] {
  const months: number[] = [];
  for (let i = 0; i < 12; i++) {
    const s = rec[i] ?? 'none';
    months.push(s === 'high' ? 2 : s === 'med' ? 1 : 0);
  }
  return months;
}

function toxicTone(risk: string): StatusPillTone {
  if (risk === 'HIGH') return 'error';
  if (risk.startsWith('Moderate')) return 'warn';
  return 'neutral';
}

/** Read the c1 zones model from siblings; empty model when absent. */
function readSiblingZones(
  siblingValues: Record<string, FormValue> | undefined,
): ForageZonesModel {
  const c1 = siblingValues?.[`${FORAGE_PREFIX}-c1`];
  if (!c1) return { kind: 'zones', zones: [], candidateSpecies: [] };
  return decodeForage('zones', c1) as ForageZonesModel;
}

export interface ForageCaptureProps {
  mode: ForageMode;
  value: FormValue;
  onChange: (next: FormValue) => void;
  /** this capture's own checklist item id (e.g. silv-sec-s3-forage-survey-c1). */
  itemId: string;
  /** full per-item FormValue map; the capture reads only the ids it needs. */
  siblingValues?: Record<string, FormValue>;
  /** owning project id; consumed by F3 at Record time, unused for rendering. */
  projectId: string;
}

export function ForageCapture({
  mode,
  value,
  onChange,
  itemId,
  siblingValues = {},
  projectId,
}: ForageCaptureProps): React.JSX.Element {
  void itemId;
  void projectId;

  if (mode === 'zones') {
    const model = decodeForage('zones', value) as ForageZonesModel;
    const set = (patch: Partial<ForageZonesModel>): void =>
      onChange(encodeForage('zones', { ...model, ...patch }));
    const totalHa = model.zones.reduce((sum, z) => sum + num(z.areaHa, 0), 0);
    const speciesOptions = SPECIES_ORDER.map((s) => ({
      id: s,
      title: SPECIES_LABELS[s],
    }));
    return (
      <div className={css.root} data-forage-mode="zones">
        <div>
          <SectionEyebrow>
            Forage zone register
            {model.zones.length > 0
              ? ` -- ${model.zones.length} ${
                  model.zones.length === 1 ? 'zone' : 'zones'
                } / ${totalHa.toFixed(1)} ha`
              : ''}
          </SectionEyebrow>
          <RegisterList<ForageZoneInput>
            items={model.zones}
            onChange={(next) => set({ zones: next })}
            makeEmpty={() => ({
              id: `forage-z-${++_idCounter}`,
              forageType: '',
              name: '',
              areaHa: '',
              condition: '',
              composition: '',
            })}
            addLabel="Add forage zone"
            emptyHint="No forage zones yet. Add each grazeable zone with its type, area, and condition."
            ariaLabel="Forage zones"
            renderRow={(zone, _index, update) => (
              <div className={css.fieldStack}>
                <div className={css.field}>
                  <span className={css.fieldLbl}>Forage type</span>
                  <ChipSelect
                    multi={false}
                    options={FORAGE_TYPES.map((t) => t.label)}
                    value={
                      zone.forageType !== '' &&
                      FORAGE_LABEL_BY_VALUE.has(zone.forageType)
                        ? [FORAGE_LABEL_BY_VALUE.get(zone.forageType) as string]
                        : []
                    }
                    onChange={(next) => {
                      const label = next[0];
                      update({
                        forageType:
                          label !== undefined
                            ? (FORAGE_VALUE_BY_LABEL.get(label) ?? '')
                            : '',
                      });
                    }}
                    ariaLabel="Forage type"
                  />
                </div>
                <div className={css.field}>
                  <span className={css.fieldLbl}>Zone name</span>
                  <input
                    type="text"
                    className={css.textInput}
                    value={zone.name}
                    placeholder="South paddock"
                    aria-label="Zone name"
                    onChange={(e) => update({ name: e.target.value })}
                  />
                </div>
                <AmountRow
                  label="Area"
                  value={zone.areaHa}
                  onChange={(v) => update({ areaHa: v })}
                  unit="ha"
                  placeholder="8.5"
                />
                <div className={css.field}>
                  <span className={css.fieldLbl}>Condition</span>
                  <ChipSelect
                    multi={false}
                    options={CONDITION_GRADES.map((g) => g.label)}
                    value={
                      zone.condition !== '' &&
                      COND_LABEL_BY_VALUE.has(zone.condition)
                        ? [COND_LABEL_BY_VALUE.get(zone.condition) as string]
                        : []
                    }
                    onChange={(next) => {
                      const label = next[0];
                      update({
                        condition:
                          label !== undefined
                            ? (COND_VALUE_BY_LABEL.get(label) ?? '')
                            : '',
                      });
                    }}
                    ariaLabel="Condition"
                  />
                </div>
                <div className={css.field}>
                  <span className={css.fieldLbl}>Species composition</span>
                  <textarea
                    className={`${css.textInput} ${css.textArea}`}
                    value={zone.composition}
                    placeholder="Ryegrass / sub-clover dominant; bare patches on west slope."
                    aria-label="Species composition"
                    onChange={(e) => update({ composition: e.target.value })}
                  />
                </div>
              </div>
            )}
          />
        </div>
        <div className={css.fdiv} aria-hidden="true" />
        <div>
          <SectionEyebrow>Candidate stock species</SectionEyebrow>
          <ChoiceCardGrid
            multi
            columns={3}
            options={speciesOptions}
            value={model.candidateSpecies}
            onChange={(next) =>
              set({ candidateSpecies: next as LivestockSpecies[] })
            }
            ariaLabel="Candidate stock species"
          />
        </div>
        <FeedsNote>
          Forage zones feed the <strong>live carrying capacity panel</strong>{' '}
          once DSE/ha values are assigned in item 3. Record all zones before
          completing the seasonal calendar.
        </FeedsNote>
      </div>
    );
  }

  if (mode === 'seasonal') {
    const model = decodeForage('seasonal', value) as ForageSeasonalModel;
    const zones = readSiblingZones(siblingValues).zones;
    const calById = new Map(model.calendars.map((c) => [c.zoneId, c.months]));

    const writeZone = (zoneId: string, months: number[]): void => {
      const calendars = zones.map((z) => ({
        zoneId: z.id,
        months:
          z.id === zoneId
            ? months
            : (calById.get(z.id) ?? new Array<number>(12).fill(0)),
      }));
      onChange(encodeForage('seasonal', { kind: 'seasonal', calendars }));
    };

    // Gap summary: per month, Math.min across all zones (worst zone).
    const gapMonths: string[] = [];
    if (zones.length > 0) {
      for (let m = 0; m < 12; m++) {
        const minState = Math.min(
          ...zones.map(
            (z) => (calById.get(z.id) ?? new Array<number>(12).fill(0))[m] ?? 0,
          ),
        );
        if (minState === 0) gapMonths.push(MONTH_NAMES[m]);
      }
    }

    return (
      <div className={css.root} data-forage-mode="seasonal">
        <div>
          <SectionEyebrow>Forage availability calendar</SectionEyebrow>
          {zones.length === 0 ? (
            <InterpretationBlock tone="info">
              No forage zones recorded yet. Add zones in item 1 to build the
              seasonal availability calendar.
            </InterpretationBlock>
          ) : (
            zones.map((z) => {
              const months = calById.get(z.id) ?? new Array<number>(12).fill(0);
              return (
                <div key={z.id} className={css.calZone}>
                  <span className={css.calZoneName}>{z.name || 'Forage zone'}</span>
                  <MonthCalendarGrid
                    value={monthsToRecord(months)}
                    cycle={SEASONAL_CYCLE}
                    onChange={(rec) => writeZone(z.id, recordToMonths(rec))}
                    ariaLabel={`Availability for ${z.name || 'forage zone'}`}
                  />
                </div>
              );
            })
          )}
          <div className={css.legend}>
            <span className={css.legendItem}>
              <span className={css.legendDot} data-state="high" aria-hidden="true" />
              Adequate
            </span>
            <span className={css.legendItem}>
              <span className={css.legendDot} data-state="med" aria-hidden="true" />
              Moderate
            </span>
            <span className={css.legendItem}>
              <span className={css.legendDot} data-state="none" aria-hidden="true" />
              Feed gap
            </span>
          </div>
        </div>
        {gapMonths.length > 0 ? (
          <InterpretationBlock tone="fail">
            Critical feed gap: {gapMonths.join(' / ')}. Supplementary feeding or
            destocking required across this period -- plan before stocking begins.
          </InterpretationBlock>
        ) : zones.length > 0 ? (
          <InterpretationBlock tone="pass">
            No critical feed gaps across zones.
          </InterpretationBlock>
        ) : null}
        <FeedsNote>
          Feed gap months feed the <strong>live calculations panel</strong> and
          generate an <strong>Act routine</strong> for supplementary feeding.
        </FeedsNote>
      </div>
    );
  }

  if (mode === 'capacity') {
    const model = decodeForage('capacity', value) as ForageCapacityModel;
    const zones = readSiblingZones(siblingValues).zones;
    const classById = new Map(
      model.classByZone.map((c) => [c.zoneId, c.conditionClass]),
    );

    const writeZone = (zoneId: string, cls: ConditionClass | ''): void => {
      const classByZone = zones.map((z) => ({
        zoneId: z.id,
        conditionClass:
          z.id === zoneId ? cls : (classById.get(z.id) ?? ''),
      }));
      onChange(encodeForage('capacity', { kind: 'capacity', classByZone }));
    };

    let grandTotal = 0;
    for (const z of zones) {
      const cls = classById.get(z.id) ?? '';
      if (cls !== '')
        grandTotal += Math.round(num(z.areaHa, 0) * DSE_PRESETS[cls]);
    }
    const cattle = Math.round(grandTotal / 8);

    return (
      <div className={css.root} data-forage-mode="capacity">
        <div>
          <SectionEyebrow>
            Zone carrying capacity -- 1 DSE ~ 1 Merino ewe or 50kg live weight
          </SectionEyebrow>
          {zones.length === 0 ? (
            <InterpretationBlock tone="info">
              No forage zones recorded yet. Add zones in item 1 to estimate
              per-zone carrying capacity.
            </InterpretationBlock>
          ) : (
            zones.map((z) => {
              const cls = classById.get(z.id) ?? '';
              const classes =
                z.forageType !== '' &&
                Object.prototype.hasOwnProperty.call(
                  CONDITION_CLASS_GROUPS,
                  z.forageType,
                )
                  ? CONDITION_CLASS_GROUPS[z.forageType as ForageType]
                  : ALL_CONDITION_CLASSES;
              const dse = cls !== '' ? DSE_PRESETS[cls] : 0;
              const area = num(z.areaHa, 0);
              const zoneDse = Math.round(area * dse);
              return (
                <div key={z.id} className={css.dseCard}>
                  <div className={css.dseHead}>
                    <span className={css.dseName}>
                      {z.name || 'Forage zone'} -- {area.toFixed(1)} ha
                    </span>
                    <span className={css.dseTotal}>
                      {zoneDse}
                      <span className={css.dseUnit}>DSE</span>
                    </span>
                  </div>
                  <ChipSelect
                    multi={false}
                    options={classes.map((c) => CONDITION_CLASS_LABELS[c])}
                    value={cls !== '' ? [CONDITION_CLASS_LABELS[cls]] : []}
                    onChange={(next) => {
                      const label = next[0];
                      writeZone(
                        z.id,
                        label !== undefined
                          ? (CLASS_VALUE_BY_LABEL.get(label) ?? '')
                          : '',
                      );
                    }}
                    ariaLabel={`Condition class for ${z.name || 'forage zone'}`}
                  />
                  <div className={css.dseCalc}>
                    <span>
                      {area.toFixed(1)} ha x {dse.toFixed(1)} DSE/ha
                    </span>
                    <span className={css.dseResult}>= {zoneDse} DSE</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <CapacityCeilingBlock
          label="Total conservative carrying capacity"
          value={grandTotal}
          unit="DSE"
          tone="pass"
          note={`approx ${grandTotal} Merino ewes at 1:1 DSE  /  approx ${cattle} cattle at 8 DSE/hd`}
        />
        <InterpretationBlock tone="info">
          The on-screen DSE total is a conservative working aid. OLOS computes
          the recorded baseline carrying capacity independently from zone area
          and candidate species.
        </InterpretationBlock>
        <FeedsNote>
          Zone DSE values update the <strong>live calculations panel</strong> in
          real time. Use the most constrained month to set the final stocking
          rate, not the annual average.
        </FeedsNote>
      </div>
    );
  }

  if (mode === 'constraints') {
    const model = decodeForage('constraints', value) as ForageConstraintsModel;
    const set = (rows: ForageConstraintRow[]): void =>
      onChange(encodeForage('constraints', { kind: 'constraints', rows }));
    const totalHa = readSiblingZones(siblingValues).zones.reduce(
      (sum, z) => sum + num(z.areaHa, 0),
      0,
    );
    const exclusionsHa = model.rows
      .filter((r) => r.kind === 'exclusion')
      .reduce((sum, r) => sum + Math.abs(num(r.areaHa, 0)), 0);
    const effective = Math.max(0, totalHa - exclusionsHa);

    return (
      <div className={css.root} data-forage-mode="constraints">
        <div>
          <SectionEyebrow>
            Shade, shelter & tree-protection constraints
          </SectionEyebrow>
          <RegisterList<ForageConstraintRow>
            items={model.rows}
            onChange={set}
            makeEmpty={() => ({
              id: `forage-c-${++_idCounter}`,
              kind: 'shelter',
              title: '',
              detail: '',
              areaHa: '',
            })}
            addLabel="Add constraint"
            emptyHint="No constraints recorded. Add shade/shelter resources or tree-protection exclusion zones."
            ariaLabel="Shade and shelter constraints"
            renderRow={(row, _index, update) => (
              <div className={css.fieldStack}>
                <div className={css.field}>
                  <span className={css.fieldLbl}>Kind</span>
                  <ChipSelect
                    multi={false}
                    options={['Shade / shelter', 'Tree-protection exclusion']}
                    value={
                      row.kind === 'exclusion'
                        ? ['Tree-protection exclusion']
                        : row.kind === 'shelter'
                          ? ['Shade / shelter']
                          : []
                    }
                    onChange={(next) =>
                      update({
                        kind:
                          next[0] === 'Tree-protection exclusion'
                            ? 'exclusion'
                            : 'shelter',
                      })
                    }
                    ariaLabel="Constraint kind"
                  />
                </div>
                <div className={css.field}>
                  <span className={css.fieldLbl}>Title</span>
                  <input
                    type="text"
                    className={css.textInput}
                    value={row.title}
                    placeholder="Scattered eucalypts"
                    aria-label="Constraint title"
                    onChange={(e) => update({ title: e.target.value })}
                  />
                </div>
                <div className={css.field}>
                  <span className={css.fieldLbl}>Detail</span>
                  <textarea
                    className={`${css.textInput} ${css.textArea}`}
                    value={row.detail}
                    placeholder="~25 mature grey box trees, average 12m canopy spread."
                    aria-label="Constraint detail"
                    onChange={(e) => update({ detail: e.target.value })}
                  />
                </div>
                <AmountRow
                  label="Area"
                  value={row.areaHa}
                  onChange={(v) => update({ areaHa: v })}
                  unit="ha"
                  placeholder="0.8"
                />
              </div>
            )}
          />
        </div>
        <div className={css.netBlock} data-testid="forage-net-grazeable">
          <div className={css.netLbl}>Net effective grazeable area</div>
          <div className={css.netRow}>
            <span className={css.netRowLbl}>Total land area</span>
            <span className={css.netRowVal}>{totalHa.toFixed(1)} ha</span>
          </div>
          <div className={css.netRow}>
            <span className={css.netRowLbl}>Exclusions</span>
            <span className={css.netRowVal}>{exclusionsHa.toFixed(1)} ha</span>
          </div>
          <div className={css.netTotal}>
            <span className={css.netTotalLbl}>Effective grazeable area</span>
            <span className={css.netTotalVal}>{effective.toFixed(1)} ha</span>
          </div>
        </div>
        <FeedsNote>
          Effective grazeable area feeds{' '}
          <strong>Tier 3: Grazing system design</strong>. Exclusion zones are
          fixed constraints; tree rows are progressive exclusions.
        </FeedsNote>
      </div>
    );
  }

  // toxic
  const model = decodeForage('toxic', value) as ForageToxicModel;
  const setToxicState = (index: number, next: ToxicState): void => {
    const states = model.states.slice();
    states[index] = next;
    onChange(encodeForage('toxic', { kind: 'toxic', states }));
  };
  const capePresent = model.states[0] === 'present';
  return (
    <div className={css.root} data-forage-mode="toxic">
      <div>
        <SectionEyebrow>Toxic & weed plants -- candidate stock</SectionEyebrow>
        {TOXIC_PLANTS.map((plant, i) => {
          const state = model.states[i] ?? 'not-surveyed';
          const isCape = i === 0 && plant.ecologyXref === true;
          return (
            <div
              key={plant.name}
              className={css.toxicRow}
              data-toxic-row=""
              data-risk={plant.risk === 'HIGH' ? 'HIGH' : 'other'}
            >
              <div className={css.toxicName}>
                <div className={css.toxicTitle}>
                  <strong>{plant.name}</strong>
                </div>
                <div className={css.toxicSci}>{plant.binomial}</div>
                {isCape && state === 'present' ? (
                  <div className={css.toxicXref}>
                    <ArrowLeft size={9} aria-hidden="true" /> Linked to ecology /
                    habitat survey
                  </div>
                ) : null}
              </div>
              <StatusPill label={plant.risk} tone={toxicTone(plant.risk)} />
              <div className={css.toxicBtns}>
                {TOXIC_BUTTONS.map((b) => {
                  const on = state === b.state;
                  return (
                    <button
                      key={b.state}
                      type="button"
                      className={css.toxicBtn}
                      data-on={on ? 'true' : 'false'}
                      data-tone={b.state}
                      aria-pressed={on}
                      onClick={() => setToxicState(i, b.state)}
                    >
                      {b.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {capePresent ? (
        <InterpretationBlock tone="fail">
          High risk -- Cape tulip present. Act task generated: Cape tulip control
          programme.
        </InterpretationBlock>
      ) : null}
      <FeedsNote>
        Each present toxic plant generates a{' '}
        <strong>priority Act weed control task</strong> that must complete before
        stocking begins.
      </FeedsNote>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared sub-component
// ---------------------------------------------------------------------------

function FeedsNote({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className={css.feedsBlock}>
      <ArrowRight size={13} className={css.feedsIcon} aria-hidden="true" />
      <div className={css.feedsTxt}>{children}</div>
    </div>
  );
}

export default ForageCapture;
