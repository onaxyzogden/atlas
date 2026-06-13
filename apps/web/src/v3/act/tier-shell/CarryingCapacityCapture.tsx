/**
 * CarryingCapacityCapture -- a multi-mode CONTROLLED capture for the ecovillage
 * objective ev-s2-carrying-capacity ("Assess carrying capacity for intended
 * community", 7 checklist items c1..c7). Ported from olos_carrying_capacity.html
 * right-hand panels p1..p7. Catalogue item order == mockup panel order:
 *
 *   c1 -> water       (mockup p1: population anchor + water demand ceiling)
 *   c2 -> food        (mockup p2: growing area + intensity selector + ceiling)
 *   c3 -> waste       (mockup p3: composting capacity + nutrient ceiling)
 *   c4 -> energy      (mockup p4: demand + solar generation + ceiling)
 *   c5 -> space       (mockup p5: zone allocation + space ceiling)
 *   c6 -> synthesis   (mockup p6: min-across-domains binding-constraint table)
 *   c7 -> gate        (mockup p7: three-pathway carrying-capacity gate)
 *
 * Structure mirrors EcologyCapture / LandscapeContextCapture (the canonical
 * multi-mode captures): a `carryingCapacityModeFor(itemId)` mapper plus a single
 * component that renders ONE mode body. The panel chrome (header / eyebrow /
 * title / hint / feeds / gate-note / Record-Defer footer) is owned by
 * DecisionWorkingPanel -- this capture renders ONLY the mode body blocks (the
 * mockup's `.rb` inner content).
 *
 * CROSS-ITEM CONTRACT: the synthesis (c6) and gate (c7) modes need the OTHER
 * items' persisted inputs to compute the binding ceiling. The capture receives
 * the FULL per-item FormValue map via `siblingValues` and reads only the
 * `${PREFIX}-c1`..`-c5` entries it needs. Each pure ceiling fn is exported and
 * unit-tested in isolation (they are the cross-item core).
 *
 * CONTROLLED / pure: the model is always derived from decode(value) each render;
 * the full next model is emitted via onChange(encode(next)). The capture holds
 * NO local state for persisted values. This capture is fixed-field (no growable
 * rows), so no makeRowId() is needed.
 *
 * decode NEVER fabricates seed data: numeric raw fields default to EMPTY string;
 * the mockup's demo numbers (80, 1200, 5000, ...) are calc fallbacks ONLY,
 * applied inside the pure compute functions via the `num` helper -- which falls
 * back ONLY on empty / non-finite raw and PRESERVES a legitimate 0 (so e.g. 0%
 * external food does not snap back to a demo number).
 *
 * DELIBERATE DIVERGENCE: the mockup hardcodes `const total = 45` ha for site
 * area. We do NOT hardcode a site-specific number; instead `spaceTotalHa` is an
 * editable AmountRow on c5 defaulting to 45. This is the single intentional
 * divergence from the mockup.
 *
 * ASCII-only: em-dash -> " -- "; m2 spelled out; "~" and "-" for the household
 * range; all icons are lucide. Apostrophes use double-quoted strings.
 */

import * as React from 'react';
import {
  ArrowRight,
  Check,
  RefreshCw,
  ShieldCheck,
  Undo2,
  type LucideIcon,
} from 'lucide-react';
import type { FormValue } from './actToolCatalog.js';
import {
  AmountRow,
  CapacityCeilingBlock,
  InterpretationBlock,
} from './captures/controls/index.js';
import css from './CarryingCapacityCapture.module.css';

// ---------------------------------------------------------------------------
// Mode mapper
// ---------------------------------------------------------------------------

export type CarryingCapacityMode =
  | 'water'
  | 'food'
  | 'waste'
  | 'energy'
  | 'space'
  | 'synthesis'
  | 'gate';

export const CARRYING_CAPACITY_PREFIX = 'ev-s2-carrying-capacity';
const PREFIX_DASH = CARRYING_CAPACITY_PREFIX + '-';

export function carryingCapacityModeFor(
  itemId: string,
): CarryingCapacityMode | null {
  if (!itemId.startsWith(PREFIX_DASH)) return null;
  const suffix = itemId.slice(PREFIX_DASH.length);
  switch (suffix) {
    case 'c1':
      return 'water';
    case 'c2':
      return 'food';
    case 'c3':
      return 'waste';
    case 'c4':
      return 'energy';
    case 'c5':
      return 'space';
    case 'c6':
      return 'synthesis';
    case 'c7':
      return 'gate';
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Calc defaults (mockup fallbacks ONLY; NEVER persisted as seed data).
// ---------------------------------------------------------------------------

const DEF = {
  hh: 8,
  pph: 2.5,
  // water
  wDom: 80,
  wIrr: 1200,
  wLive: 400,
  wSupply: 5000,
  // food
  fArea: 20000,
  fExtern: 30,
  foodIntensity: 450,
  // waste
  nComp: 25,
  // energy
  eDemand: 8,
  eSolar: 20,
  // space
  spaceTotalHa: 45,
  sWild: 27,
  sFood: 4,
  sComm: 0.5,
  sHh: 0.5,
} as const;

const KCAL_PER_PERSON_YEAR = 730000; // 2000 kcal/day * 365
const WASTE_M3_PER_PERSON = 0.05; // ~50 kg organic waste/person/year
const SOLAR_PEAK_HOURS = 4.5;

// Food intensity options (verbatim labels from the mockup p2).
export interface FoodIntensitySpec {
  value: number;
  title: string;
  sub: string;
}
export const FOOD_INTENSITIES: readonly FoodIntensitySpec[] = [
  { value: 800, title: 'Intensive', sub: 'Market garden, deep beds' },
  { value: 450, title: 'Intermediate', sub: 'Mixed veg + perennials' },
  { value: 100, title: 'Extensive', sub: 'Pasture, food forest' },
];
const FOOD_INTENSITY_SET = new Set<number>(FOOD_INTENSITIES.map((f) => f.value));

// Pathway options (verbatim labels from the mockup p7).
export type PathwayId = 'confirm' | 'defer' | 'redesign';
const PATHWAY_SET = new Set<string>(['confirm', 'defer', 'redesign']);

export const BINDING_NAMES: readonly string[] = [
  'water supply',
  'food production',
  'waste & nutrients',
  'energy systems',
  'site space',
];

// The Stratum-1 escalation rule, surfaced verbatim (dashes ASCII-normalised).
export const ESCALATION_RULE =
  'If intended population exceeds carrying capacity on any dimension, this is a Stratum 1 vision revision - not a Stratum 5 design problem. Escalate immediately.';

// ---------------------------------------------------------------------------
// Models (raw text fields; the calc reads them via the `num` helper, which
// preserves a legitimate 0 and falls back only on empty / non-finite raw)
// ---------------------------------------------------------------------------

export interface WaterModel {
  kind: 'water';
  hh: string;
  pph: string;
  wDom: string;
  wIrr: string;
  wLive: string;
  wSupply: string;
}

export interface FoodModel {
  kind: 'food';
  hh: string;
  pph: string;
  fArea: string;
  fExtern: string;
  /** stored kcal/m2/yr intensity (one of FOOD_INTENSITIES values, as string). */
  foodIntensity: string;
}

export interface WasteModel {
  kind: 'waste';
  hh: string;
  pph: string;
  nComp: string;
}

export interface EnergyModel {
  kind: 'energy';
  hh: string;
  pph: string;
  eDemand: string;
  eSolar: string;
}

export interface SpaceModel {
  kind: 'space';
  hh: string;
  pph: string;
  spaceTotalHa: string;
  sWild: string;
  sFood: string;
  sComm: string;
  sHh: string;
}

export interface SynthesisModel {
  kind: 'synthesis';
}

export interface GateModel {
  kind: 'gate';
  hh: string;
  pph: string;
  pathway: PathwayId | null;
}

export type CarryingCapacityModel =
  | WaterModel
  | FoodModel
  | WasteModel
  | EnergyModel
  | SpaceModel
  | SynthesisModel
  | GateModel;

// ---------------------------------------------------------------------------
// FormValue coercion helpers
// ---------------------------------------------------------------------------

function asStr(v: FormValue[string] | undefined): string {
  return typeof v === 'string' ? v : '';
}

/**
 * Numeric coercion for every raw field. Falls back ONLY when raw is empty or
 * parses to a non-finite number; a legitimate 0 is PRESERVED (so e.g. 0%
 * external food or 0 ha irrigation does not silently snap back to a demo
 * number). NOTE: this is deliberately NOT `Number(raw) || DEFAULT` -- that
 * idiom would coerce a valid 0 to the fallback, which we explicitly avoid.
 * This is the single numeric coercion used for every field.
 */
function num(raw: string, fallback: number): number {
  if (raw.trim() === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

// ---------------------------------------------------------------------------
// decode: FormValue -> CarryingCapacityModel (TOTAL / defensive; never throws,
// never fabricates seed data -- numeric fields default to "").
// ---------------------------------------------------------------------------

export function decodeCarryingCapacity(
  mode: CarryingCapacityMode,
  value: FormValue,
): CarryingCapacityModel {
  switch (mode) {
    case 'water':
      return {
        kind: 'water',
        hh: asStr(value.hh),
        pph: asStr(value.pph),
        wDom: asStr(value.wDom),
        wIrr: asStr(value.wIrr),
        wLive: asStr(value.wLive),
        wSupply: asStr(value.wSupply),
      };
    case 'food': {
      const raw = asStr(value.ccFoodIntensity);
      const intensity = FOOD_INTENSITY_SET.has(Number(raw))
        ? raw
        : String(DEF.foodIntensity);
      return {
        kind: 'food',
        hh: asStr(value.hh),
        pph: asStr(value.pph),
        fArea: asStr(value.fArea),
        fExtern: asStr(value.fExtern),
        foodIntensity: intensity,
      };
    }
    case 'waste':
      return {
        kind: 'waste',
        hh: asStr(value.hh),
        pph: asStr(value.pph),
        nComp: asStr(value.nComp),
      };
    case 'energy':
      return {
        kind: 'energy',
        hh: asStr(value.hh),
        pph: asStr(value.pph),
        eDemand: asStr(value.eDemand),
        eSolar: asStr(value.eSolar),
      };
    case 'space':
      return {
        kind: 'space',
        hh: asStr(value.hh),
        pph: asStr(value.pph),
        spaceTotalHa: asStr(value.spaceTotalHa),
        sWild: asStr(value.sWild),
        sFood: asStr(value.sFood),
        sComm: asStr(value.sComm),
        sHh: asStr(value.sHh),
      };
    case 'synthesis':
      return { kind: 'synthesis' };
    case 'gate': {
      const raw = asStr(value.pathway);
      return {
        kind: 'gate',
        hh: asStr(value.hh),
        pph: asStr(value.pph),
        pathway: PATHWAY_SET.has(raw) ? (raw as PathwayId) : null,
      };
    }
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown CarryingCapacityMode: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// encode: CarryingCapacityModel -> FormValue (lossless inverse of decode).
// ---------------------------------------------------------------------------

export function encodeCarryingCapacity(
  mode: CarryingCapacityMode,
  model: CarryingCapacityModel,
): FormValue {
  void mode;
  switch (model.kind) {
    case 'water':
      return {
        hh: model.hh,
        pph: model.pph,
        wDom: model.wDom,
        wIrr: model.wIrr,
        wLive: model.wLive,
        wSupply: model.wSupply,
      };
    case 'food':
      return {
        hh: model.hh,
        pph: model.pph,
        fArea: model.fArea,
        fExtern: model.fExtern,
        ccFoodIntensity: model.foodIntensity,
      };
    case 'waste':
      return {
        hh: model.hh,
        pph: model.pph,
        nComp: model.nComp,
      };
    case 'energy':
      return {
        hh: model.hh,
        pph: model.pph,
        eDemand: model.eDemand,
        eSolar: model.eSolar,
      };
    case 'space':
      return {
        hh: model.hh,
        pph: model.pph,
        spaceTotalHa: model.spaceTotalHa,
        sWild: model.sWild,
        sFood: model.sFood,
        sComm: model.sComm,
        sHh: model.sHh,
      };
    case 'synthesis':
      return {};
    case 'gate':
      return {
        hh: model.hh,
        pph: model.pph,
        pathway: model.pathway ?? '',
      };
  }
}

// ---------------------------------------------------------------------------
// Pure compute functions (the cross-item core; exported + unit-tested).
// Each takes a decoded model and returns an integer ceiling.
// ---------------------------------------------------------------------------

export interface PopulationAnchor {
  hh: number;
  pph: number;
  intendedPeople: number;
}

/**
 * Read a numeric field from any model that may carry it (falling back via
 * `num` when the field is absent / empty / non-finite, preserving a valid 0).
 * The compute fns accept the BROAD union -- callers (and tests) pass
 * `decodeCarryingCapacity(...)` whose static type is the union -- so each fn
 * reads only the fields its formula needs via this accessor. NOTE: the
 * `Record<string, unknown>` cast trades away compile-time key safety (a typo'd
 * key silently yields the fallback); the keys are covered by the unit tests.
 */
function fld(
  model: CarryingCapacityModel,
  key: string,
  fallback: number,
): number {
  const raw = (model as unknown as Record<string, unknown>)[key];
  return num(typeof raw === 'string' ? raw : '', fallback);
}

/** Reads hh + pph from any model carrying those fields. */
export function computePopulation(
  model: CarryingCapacityModel,
): PopulationAnchor {
  const hh = fld(model, 'hh', DEF.hh);
  const pph = fld(model, 'pph', DEF.pph);
  return { hh, pph, intendedPeople: Math.round(hh * pph) };
}

/**
 * SINGLE SOURCE OF TRUTH for the population anchor. hh/pph are editable and
 * persisted ONLY on c1 (water); the c2-c5 echo displays and the c4 energy
 * ceiling must mirror that c1 anchor (not their own local model, which never
 * carries hh/pph and would always fall back to the demo defaults). This is the
 * same source `computeSynthesis` / the gate read, so every display agrees.
 */
export function computeAnchorFromSiblings(
  siblingValues: Record<string, FormValue>,
  prefix: string,
): PopulationAnchor {
  const v1 = siblingValues[`${prefix}-c1`] ?? {};
  const waterM = decodeCarryingCapacity('water', v1) as WaterModel;
  return computePopulation(waterM);
}

export function computeWaterCeiling(model: CarryingCapacityModel): number {
  const wDom = fld(model, 'wDom', DEF.wDom);
  const wIrr = fld(model, 'wIrr', DEF.wIrr);
  const wLive = fld(model, 'wLive', DEF.wLive);
  const wSupply = fld(model, 'wSupply', DEF.wSupply);
  if (wDom <= 0) return 0;
  const wFixed = wIrr + wLive;
  const wForPeople = wSupply - wFixed;
  return Math.max(0, Math.floor(wForPeople / wDom));
}

export function computeFoodCeiling(model: CarryingCapacityModel): number {
  const fArea = fld(model, 'fArea', DEF.fArea);
  const fExtern = fld(model, 'fExtern', DEF.fExtern);
  const foodIntensity = fld(model, 'foodIntensity', DEF.foodIntensity);
  const selfSuffRatio = (100 - fExtern) / 100;
  if (selfSuffRatio <= 0) return 0;
  return Math.floor(
    (fArea * foodIntensity) / (KCAL_PER_PERSON_YEAR * selfSuffRatio),
  );
}

export function computeWasteCeiling(model: CarryingCapacityModel): number {
  const nComp = fld(model, 'nComp', DEF.nComp);
  return Math.floor(nComp / WASTE_M3_PER_PERSON);
}

/** Energy needs pph from the population anchor (c1). */
export function computeEnergyCeiling(
  model: CarryingCapacityModel,
  pph: number,
): number {
  const eDemand = fld(model, 'eDemand', DEF.eDemand);
  const eSolar = fld(model, 'eSolar', DEF.eSolar);
  if (eDemand <= 0) return 0;
  const eGenDaily = eSolar * SOLAR_PEAK_HOURS;
  const eHHCeil = Math.floor(eGenDaily / eDemand);
  return Math.round(eHHCeil * pph);
}

/** Space ceiling is in HOUSEHOLDS (note unit differs from the other domains). */
export function computeSpaceCeiling(model: CarryingCapacityModel): number {
  const total = fld(model, 'spaceTotalHa', DEF.spaceTotalHa);
  const wild = fld(model, 'sWild', DEF.sWild);
  const food = fld(model, 'sFood', DEF.sFood);
  const comm = fld(model, 'sComm', DEF.sComm);
  const hhSize = fld(model, 'sHh', DEF.sHh);
  if (hhSize <= 0) return 0;
  const avail = Math.max(0, total - wild - food - comm);
  return Math.floor(avail / hhSize);
}

export function computeSpaceAvailable(model: CarryingCapacityModel): number {
  const total = fld(model, 'spaceTotalHa', DEF.spaceTotalHa);
  const wild = fld(model, 'sWild', DEF.sWild);
  const food = fld(model, 'sFood', DEF.sFood);
  const comm = fld(model, 'sComm', DEF.sComm);
  return Math.max(0, total - wild - food - comm);
}

// ---------------------------------------------------------------------------
// Synthesis aggregator: recompute all five ceilings from c1..c5 siblings, then
// derive the binding constraint, max population, and the gate comparison.
// ---------------------------------------------------------------------------

export interface SynthesisResult {
  waterCeiling: number;
  foodCeiling: number;
  wasteCeiling: number;
  energyCeiling: number;
  /** in households */
  spaceCeiling: number;
  /** space converted to people via pph */
  spacePeople: number;
  domainsInPeople: number[];
  minPeople: number;
  bindingIdx: number;
  bindingName: string;
  maxHH: number;
  hh: number;
  pph: number;
  intendedPeople: number;
  util: number;
  withinCapacity: boolean;
  exceedsBy: number;
}

export function computeSynthesis(
  siblingValues: Record<string, FormValue>,
  prefix: string,
): SynthesisResult {
  const v1 = siblingValues[`${prefix}-c1`] ?? {};
  const v2 = siblingValues[`${prefix}-c2`] ?? {};
  const v3 = siblingValues[`${prefix}-c3`] ?? {};
  const v4 = siblingValues[`${prefix}-c4`] ?? {};
  const v5 = siblingValues[`${prefix}-c5`] ?? {};

  const waterM = decodeCarryingCapacity('water', v1) as WaterModel;
  const foodM = decodeCarryingCapacity('food', v2) as FoodModel;
  const wasteM = decodeCarryingCapacity('waste', v3) as WasteModel;
  const energyM = decodeCarryingCapacity('energy', v4) as EnergyModel;
  const spaceM = decodeCarryingCapacity('space', v5) as SpaceModel;

  // Population anchor lives on c1 (water). Fall back to defaults if absent.
  const pop = computePopulation(waterM);
  const { hh, pph, intendedPeople } = pop;

  const waterCeiling = computeWaterCeiling(waterM);
  const foodCeiling = computeFoodCeiling(foodM);
  const wasteCeiling = computeWasteCeiling(wasteM);
  const energyCeiling = computeEnergyCeiling(energyM, pph);
  const spaceCeiling = computeSpaceCeiling(spaceM);
  const spacePeople = Math.round(spaceCeiling * pph);

  const domainsInPeople = [
    waterCeiling,
    foodCeiling,
    wasteCeiling,
    energyCeiling,
    spacePeople,
  ];
  const minPeople = Math.min(...domainsInPeople);
  const bindingIdx = domainsInPeople.indexOf(minPeople);
  const bindingName = BINDING_NAMES[bindingIdx] ?? BINDING_NAMES[0] ?? 'unknown';
  // Guard pph<=0 so maxHH never becomes Infinity/NaN (the synthesis note must
  // not render "~ Infinity-Infinity households"). util is already guarded by
  // minPeople>0 below.
  const maxHH = pph > 0 ? Math.floor(minPeople / pph) : 0;
  const util = minPeople > 0 ? Math.round((intendedPeople / minPeople) * 100) : 0;
  const withinCapacity = intendedPeople <= minPeople;
  const exceedsBy = Math.max(0, intendedPeople - minPeople);

  return {
    waterCeiling,
    foodCeiling,
    wasteCeiling,
    energyCeiling,
    spaceCeiling,
    spacePeople,
    domainsInPeople,
    minPeople,
    bindingIdx,
    bindingName,
    maxHH,
    hh,
    pph,
    intendedPeople,
    util,
    withinCapacity,
    exceedsBy,
  };
}

// ---------------------------------------------------------------------------
// "assessed?" predicate: distinguishes a real operator assessment from the
// always-computable demo fallback in computeSynthesis. computeSynthesis ALWAYS
// returns a number (empty fields fall back to DEF demo values), so a consumer
// that wants to adopt the derived ceiling must first confirm the operator has
// actually entered something. Returns true iff ANY tracked raw input across the
// c1..c5 sibling FormValues is a non-empty string. Pure; no decode side
// effects. Used by SettlementPlanCapture c6 to gate "derived replaces manual".
// ---------------------------------------------------------------------------

/** Raw FormValue keys the operator can fill across c1..c5 (the assessment signal). */
const CARRYING_CAPACITY_INPUT_KEYS: readonly string[] = [
  'hh',
  'pph',
  'wDom',
  'wIrr',
  'wLive',
  'wSupply',
  'fArea',
  'fExtern',
  'ccFoodIntensity',
  'nComp',
  'eDemand',
  'eSolar',
  'spaceTotalHa',
  'sWild',
  'sFood',
  'sComm',
  'sHh',
];

export function carryingCapacityAssessed(
  siblingValues: Record<string, FormValue>,
  prefix: string = CARRYING_CAPACITY_PREFIX,
): boolean {
  for (let c = 1; c <= 5; c += 1) {
    const v = siblingValues[`${prefix}-c${c}`];
    if (!v) continue;
    for (const key of CARRYING_CAPACITY_INPUT_KEYS) {
      const raw = v[key];
      if (typeof raw === 'string' && raw.trim() !== '') return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// validity gates (per mode)
// ---------------------------------------------------------------------------

export function isCarryingCapacityValid(
  mode: CarryingCapacityMode,
  value: FormValue,
): boolean {
  if (mode === 'gate') {
    const model = decodeCarryingCapacity('gate', value) as GateModel;
    return model.pathway !== null;
  }
  // Resource + synthesis modes are always computable (neutral defaults), so
  // recording is always permitted -- mirrors the mockup's always-ready footer.
  return true;
}

// ---------------------------------------------------------------------------
// record-summary mirror (per mode)
// ---------------------------------------------------------------------------

export function summariseCarryingCapacity(
  mode: CarryingCapacityMode,
  value: FormValue,
  siblingValues: Record<string, FormValue> = {},
  prefix: string = CARRYING_CAPACITY_PREFIX,
): string {
  switch (mode) {
    case 'water': {
      const m = decodeCarryingCapacity('water', value) as WaterModel;
      return `Water ceiling: ${computeWaterCeiling(m)} people`;
    }
    case 'food': {
      const m = decodeCarryingCapacity('food', value) as FoodModel;
      return `Food ceiling: ${computeFoodCeiling(m)} people`;
    }
    case 'waste': {
      const m = decodeCarryingCapacity('waste', value) as WasteModel;
      return `Nutrient cycling ceiling: ${computeWasteCeiling(m)} people`;
    }
    case 'energy': {
      const m = decodeCarryingCapacity('energy', value) as EnergyModel;
      // pph lives only on c1, so source it from the c1 sibling (same single
      // source of truth the c4 panel and synthesis use). Sourcing pph from the
      // local energy model would fall back to demo defaults and contradict the
      // panel's ceiling.
      const pop = computeAnchorFromSiblings(siblingValues, prefix);
      return `Energy ceiling: ${computeEnergyCeiling(m, pop.pph)} people`;
    }
    case 'space': {
      const m = decodeCarryingCapacity('space', value) as SpaceModel;
      return `Space ceiling: ${computeSpaceCeiling(m)} households`;
    }
    case 'synthesis': {
      const syn = computeSynthesis(siblingValues, prefix);
      return `Max sustainable population: ${syn.minPeople} people (binding: ${syn.bindingName})`;
    }
    case 'gate': {
      const m = decodeCarryingCapacity('gate', value) as GateModel;
      if (m.pathway === 'confirm') return 'Confirmed within capacity';
      if (m.pathway === 'defer') return 'Deferred - reduce population';
      if (m.pathway === 'redesign') return 'Redesign - expand capacity';
      return 'No pathway selected';
    }
  }
}

// ---------------------------------------------------------------------------
// Component (renders ONLY the body for the resolved mode).
// ---------------------------------------------------------------------------

export interface CarryingCapacityCaptureProps {
  mode: CarryingCapacityMode;
  value: FormValue;
  onChange: (next: FormValue) => void;
  /** this capture's own checklist item id (e.g. ev-s2-carrying-capacity-c6). */
  itemId: string;
  /** full per-item FormValue map; the capture reads only the ids it needs. */
  siblingValues?: Record<string, FormValue>;
}

export function CarryingCapacityCapture({
  mode,
  value,
  onChange,
  itemId,
  siblingValues = {},
}: CarryingCapacityCaptureProps): React.JSX.Element {
  void itemId;
  const prefix = CARRYING_CAPACITY_PREFIX;

  if (mode === 'water') {
    const model = decodeCarryingCapacity('water', value) as WaterModel;
    const set = (patch: Partial<WaterModel>): void =>
      onChange(encodeCarryingCapacity('water', { ...model, ...patch }));
    const pop = computePopulation(model);
    const ceiling = computeWaterCeiling(model);
    return (
      <div className={css.root} data-cc-mode="water">
        <PopulationAnchorEditable
          hh={model.hh}
          pph={model.pph}
          onHh={(v) => set({ hh: v })}
          onPph={(v) => set({ pph: v })}
          intendedPeople={pop.intendedPeople}
        />
        <div className={css.fdiv} aria-hidden="true" />
        <div>
          <div className={css.secLbl}>Water use inputs</div>
          <AmountRow
            label="Per-capita domestic water"
            value={model.wDom}
            onChange={(v) => set({ wDom: v })}
            unit="L/person/day"
            placeholder="80"
          />
          <AmountRow
            label="Irrigation & food production water"
            value={model.wIrr}
            onChange={(v) => set({ wIrr: v })}
            unit="L/day total"
            placeholder="1200"
          />
          <AmountRow
            label="Livestock & animal water"
            value={model.wLive}
            onChange={(v) => set({ wLive: v })}
            unit="L/day total"
            placeholder="400"
          />
        </div>
        <div>
          <div className={css.secLbl}>Available water supply (Tier 1 survey)</div>
          <AmountRow
            label="Combined bore + harvest yield"
            value={model.wSupply}
            onChange={(v) => set({ wSupply: v })}
            unit="L/day"
            placeholder="5000"
          />
        </div>
        <CapacityCeilingBlock
          label="Water ceiling"
          value={ceiling}
          unit="people"
          tone={ceiling >= pop.intendedPeople ? 'pass' : 'fail'}
        />
        <FeedsNote>
          Water ceiling feeds <strong>synthesis (item 6)</strong>. It is the
          maximum number of people this water supply can support at the given
          per-capita demand.
        </FeedsNote>
      </div>
    );
  }

  if (mode === 'food') {
    const model = decodeCarryingCapacity('food', value) as FoodModel;
    const set = (patch: Partial<FoodModel>): void =>
      onChange(encodeCarryingCapacity('food', { ...model, ...patch }));
    // Echo mirrors the c1 anchor (hh/pph live only on c1), not this local model.
    const pop = computeAnchorFromSiblings(siblingValues, prefix);
    const ceiling = computeFoodCeiling(model);
    const selectedIntensity = num(model.foodIntensity, DEF.foodIntensity);
    return (
      <div className={css.root} data-cc-mode="food">
        <PopulationEcho intendedPeople={pop.intendedPeople} />
        <div>
          <div className={css.secLbl}>Growing area</div>
          <AmountRow
            label="Available growing area"
            value={model.fArea}
            onChange={(v) => set({ fArea: v })}
            unit="m2"
            placeholder="20000"
          />
        </div>
        <div>
          <div className={css.secLbl}>Growing system intensity</div>
          <div className={css.intensityGrid} data-testid="cc-intensity-grid">
            {FOOD_INTENSITIES.map((opt) => {
              const on = selectedIntensity === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={css.intBtn}
                  data-on={on ? 'true' : 'false'}
                  data-testid={`cc-intensity-${opt.value}`}
                  aria-pressed={on}
                  onClick={() => set({ foodIntensity: String(opt.value) })}
                >
                  {opt.title}
                  <span className={css.intSub}>{opt.sub}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <div className={css.secLbl}>External food supplement</div>
          <AmountRow
            label="Share of diet externally sourced"
            value={model.fExtern}
            onChange={(v) => set({ fExtern: v })}
            unit="% of diet"
            placeholder="30"
          />
        </div>
        <CapacityCeilingBlock
          label="Food production ceiling"
          value={ceiling}
          unit="people"
          tone={ceiling >= pop.intendedPeople ? 'pass' : 'fail'}
        />
        <FeedsNote>
          Food ceiling feeds synthesis. If food is the binding constraint,
          expanding growing area or reducing external food supplement target can
          raise the ceiling.
        </FeedsNote>
      </div>
    );
  }

  if (mode === 'waste') {
    const model = decodeCarryingCapacity('waste', value) as WasteModel;
    const set = (patch: Partial<WasteModel>): void =>
      onChange(encodeCarryingCapacity('waste', { ...model, ...patch }));
    // Echo mirrors the c1 anchor (hh/pph live only on c1), not this local model.
    const pop = computeAnchorFromSiblings(siblingValues, prefix);
    const ceiling = computeWasteCeiling(model);
    return (
      <div className={css.root} data-cc-mode="waste">
        <PopulationEcho intendedPeople={pop.intendedPeople} />
        <div>
          <div className={css.secLbl}>Composting & organic waste</div>
          <AmountRow
            label="Composting system capacity"
            value={model.nComp}
            onChange={(v) => set({ nComp: v })}
            unit="m3/year"
            placeholder="25"
          />
        </div>
        <CapacityCeilingBlock
          label="Nutrient cycling ceiling"
          value={ceiling}
          unit="people"
          tone={ceiling >= pop.intendedPeople ? 'pass' : 'fail'}
        />
        <FeedsNote>
          Nutrient cycling feeds synthesis. Closed-loop composting systems are
          rarely the binding constraint -- but under-designed systems can be.
        </FeedsNote>
      </div>
    );
  }

  if (mode === 'energy') {
    const model = decodeCarryingCapacity('energy', value) as EnergyModel;
    const set = (patch: Partial<EnergyModel>): void =>
      onChange(encodeCarryingCapacity('energy', { ...model, ...patch }));
    // Echo AND energy ceiling mirror the c1 anchor (hh/pph live only on c1),
    // so the ceiling shown here matches the figure synthesis binds in c6/c7.
    const pop = computeAnchorFromSiblings(siblingValues, prefix);
    const ceiling = computeEnergyCeiling(model, pop.pph);
    return (
      <div className={css.root} data-cc-mode="energy">
        <PopulationEcho intendedPeople={pop.intendedPeople} hh={pop.hh} />
        <div>
          <div className={css.secLbl}>Demand</div>
          <AmountRow
            label="Per-household energy target"
            value={model.eDemand}
            onChange={(v) => set({ eDemand: v })}
            unit="kWh/household/day"
            placeholder="8"
          />
        </div>
        <div>
          <div className={css.secLbl}>Generation capacity</div>
          <AmountRow
            label="Solar PV installed or planned"
            value={model.eSolar}
            onChange={(v) => set({ eSolar: v })}
            unit="kW"
            placeholder="20"
          />
        </div>
        <CapacityCeilingBlock
          label="Energy ceiling"
          value={ceiling}
          unit="people"
          tone={ceiling >= pop.intendedPeople ? 'pass' : 'fail'}
        />
        <FeedsNote>
          Energy ceiling feeds synthesis. Solar PV is scalable -- if energy is
          the binding constraint, additional panels can raise the ceiling more
          directly than most other resources.
        </FeedsNote>
      </div>
    );
  }

  if (mode === 'space') {
    const model = decodeCarryingCapacity('space', value) as SpaceModel;
    const set = (patch: Partial<SpaceModel>): void =>
      onChange(encodeCarryingCapacity('space', { ...model, ...patch }));
    // Echo mirrors the c1 anchor (hh/pph live only on c1), not this local model.
    const pop = computeAnchorFromSiblings(siblingValues, prefix);
    const ceiling = computeSpaceCeiling(model);
    const avail = computeSpaceAvailable(model);
    return (
      <div className={css.root} data-cc-mode="space">
        <PopulationEcho intendedPeople={pop.intendedPeople} hh={pop.hh} />
        <div>
          <div className={css.secLbl}>Zone allocation</div>
          {/* DELIBERATE DIVERGENCE: the mockup hardcodes total = 45 ha. We
              expose it as an editable field (default 45) rather than hardcode a
              site-specific number. Wrapped so the testid lands on a stable node
              (AmountRow forwards `id` to the input element, not data-testid). */}
          <div data-testid="cc-space-total">
            <AmountRow
              label="Total site area"
              value={model.spaceTotalHa}
              onChange={(v) => set({ spaceTotalHa: v })}
              unit="ha"
              placeholder="45"
              id="cc-space-total-input"
            />
          </div>
          <AmountRow
            label="Wild / buffer / ecology zones"
            value={model.sWild}
            onChange={(v) => set({ sWild: v })}
            unit="ha"
            placeholder="27"
          />
          <AmountRow
            label="Food production zones"
            value={model.sFood}
            onChange={(v) => set({ sFood: v })}
            unit="ha"
            placeholder="4"
          />
          <AmountRow
            label="Communal buildings & infrastructure"
            value={model.sComm}
            onChange={(v) => set({ sComm: v })}
            unit="ha"
            placeholder="0.5"
          />
          <AmountRow
            label="Space per household (housing + garden)"
            value={model.sHh}
            onChange={(v) => set({ sHh: v })}
            unit="ha"
            placeholder="0.5"
          />
        </div>
        <InterpretationBlock tone="info">
          Available for housing clusters: <strong>{avail.toFixed(1)} ha</strong>
        </InterpretationBlock>
        <CapacityCeilingBlock
          label="Space ceiling"
          value={ceiling}
          unit="households"
          tone={ceiling >= pop.hh ? 'pass' : 'fail'}
        />
        <FeedsNote>
          Space ceiling feeds synthesis. With ample land, space is rarely the
          binding constraint for small ecovillages -- the resource constraints
          (water, food, energy) typically bind first.
        </FeedsNote>
      </div>
    );
  }

  if (mode === 'synthesis') {
    const syn = computeSynthesis(siblingValues, prefix);
    return <SynthesisBody syn={syn} />;
  }

  // gate
  const model = decodeCarryingCapacity('gate', value) as GateModel;
  const syn = computeSynthesis(siblingValues, prefix);
  const pick = (id: PathwayId): void => {
    if (id === 'confirm' && !syn.withinCapacity) return;
    onChange(
      encodeCarryingCapacity('gate', {
        ...model,
        pathway: model.pathway === id ? null : id,
      }),
    );
  };
  return <GateBody syn={syn} pathway={model.pathway} onPick={pick} />;
}

// ---------------------------------------------------------------------------
// Shared sub-components
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

function PopulationAnchorEditable({
  hh,
  pph,
  onHh,
  onPph,
  intendedPeople,
}: {
  hh: string;
  pph: string;
  onHh: (v: string) => void;
  onPph: (v: string) => void;
  intendedPeople: number;
}): React.JSX.Element {
  return (
    <div className={css.popAnchor} data-testid="cc-pop-anchor">
      <div className={css.popLbl}>Intended community</div>
      <div className={css.popGrid}>
        <div className={css.popField}>
          <span className={css.popFl}>Households at full build</span>
          <input
            type="text"
            inputMode="decimal"
            className={css.popInp}
            data-testid="cc-pop-hh"
            aria-label="Households at full build"
            value={hh}
            placeholder="8"
            onChange={(e) => onHh(e.target.value)}
          />
        </div>
        <div className={css.popField}>
          <span className={css.popFl}>People per household</span>
          <input
            type="text"
            inputMode="decimal"
            className={css.popInp}
            data-testid="cc-pop-pph"
            aria-label="People per household"
            value={pph}
            placeholder="2.5"
            onChange={(e) => onPph(e.target.value)}
          />
        </div>
      </div>
      <div className={css.popDerived}>
        <span className={css.popDLbl}>Total intended population</span>
        <span className={css.popDVal} data-testid="cc-pop-total">
          {intendedPeople}
        </span>
        <span className={css.popDUnit}>people</span>
      </div>
    </div>
  );
}

function PopulationEcho({
  intendedPeople,
  hh,
}: {
  intendedPeople: number;
  hh?: number;
}): React.JSX.Element {
  return (
    <div className={css.popAnchor} data-testid="cc-pop-echo">
      <div className={css.popDerived}>
        <span className={css.popDLbl}>Intended population</span>
        <span className={css.popDVal} data-testid="cc-pop-total">
          {intendedPeople}
        </span>
        <span className={css.popDUnit}>
          {hh !== undefined ? `people / ${hh} households` : 'people'}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Synthesis body (c6) -- the min-across-domains binding-constraint table.
// ---------------------------------------------------------------------------

interface SynRow {
  key: string;
  domain: string;
  display: string;
  idx: number;
}

function SynthesisBody({ syn }: { syn: SynthesisResult }): React.JSX.Element {
  const rows: SynRow[] = [
    { key: 'water', domain: 'Water supply', display: `${syn.waterCeiling} people`, idx: 0 },
    { key: 'food', domain: 'Food production', display: `${syn.foodCeiling} people`, idx: 1 },
    { key: 'waste', domain: 'Waste & nutrients', display: `${syn.wasteCeiling} people`, idx: 2 },
    { key: 'energy', domain: 'Energy systems', display: `${syn.energyCeiling} people`, idx: 3 },
    { key: 'space', domain: 'Site space', display: `${syn.spaceCeiling} households`, idx: 4 },
  ];
  return (
    <div className={css.root} data-cc-mode="synthesis">
      <div>
        <div className={css.secLbl}>Resource domain ceilings</div>
        <div className={css.synTable} data-testid="cc-syn-table">
          <div className={css.synHeader}>
            <span>Domain</span>
            <span>Ceiling</span>
            <span />
          </div>
          {rows.map((r) => {
            const binding = r.idx === syn.bindingIdx;
            return (
              <div
                key={r.key}
                className={css.synRow}
                data-binding={binding ? 'true' : 'false'}
                data-testid={`cc-syn-row-${r.key}`}
              >
                <span className={css.synDomain}>{r.domain}</span>
                <span className={css.synCeiling}>{r.display}</span>
                {binding ? (
                  <span className={css.synBind}>binding</span>
                ) : (
                  <span className={css.synOk} aria-label="within ceiling">
                    <Check size={11} />
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <CapacityCeilingBlock
        label="Maximum sustainable population"
        value={syn.minPeople}
        unit="people"
        tone={syn.withinCapacity ? 'pass' : 'fail'}
        note={
          <span data-testid="cc-syn-max">
            {`~ ${syn.maxHH}-${syn.maxHH + 1} households - binding constraint: ${syn.bindingName}`}
          </span>
        }
      />

      <InterpretationBlock tone={syn.withinCapacity ? 'pass' : 'fail'}>
        {syn.withinCapacity
          ? `Intended ${syn.intendedPeople} people -- within sustainable capacity (${syn.util}% utilisation).`
          : `Intended ${syn.intendedPeople} people -- exceeds ceiling by ${syn.exceedsBy} (${syn.util}% utilisation).`}
      </InterpretationBlock>

      <InterpretationBlock tone="warn">{ESCALATION_RULE}</InterpretationBlock>

      <FeedsNote>
        Maximum sustainable population feeds{' '}
        <strong>the carrying capacity confirmation</strong> (item 7). If the
        intended population exceeds this ceiling, design must change before
        proceeding.
      </FeedsNote>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Gate body (c7) -- three-pathway carrying-capacity gate.
// ---------------------------------------------------------------------------

interface PathwaySpec {
  id: PathwayId;
  tone: 'green' | 'amber' | 'blue';
  title: string;
  desc: string;
  icon: LucideIcon;
}
const PATHWAYS: readonly PathwaySpec[] = [
  {
    id: 'confirm',
    tone: 'green',
    title: 'Confirm within capacity',
    desc: 'Intended population is at or below the maximum sustainable ceiling. Community design can proceed on this basis.',
    icon: Check,
  },
  {
    id: 'defer',
    tone: 'amber',
    title: 'Defer - reduce population',
    desc: 'Intended population exceeds the ceiling. Return to founding member agreements and reduce the planned household count before proceeding.',
    icon: Undo2,
  },
  {
    id: 'redesign',
    tone: 'blue',
    title: 'Redesign - expand capacity',
    desc: 'Address the binding constraint by expanding the resource system (growing area, water storage, solar capacity) and re-assess before confirming population.',
    icon: RefreshCw,
  },
];

function GateBody({
  syn,
  pathway,
  onPick,
}: {
  syn: SynthesisResult;
  pathway: PathwayId | null;
  onPick: (id: PathwayId) => void;
}): React.JSX.Element {
  return (
    <div className={css.root} data-cc-mode="gate">
      <div className={css.gateCompare} data-testid="cc-gate-compare">
        <div className={css.gateCol}>
          <div className={css.gateColLbl}>Maximum sustainable</div>
          <div className={css.gateColVal}>{syn.minPeople} people</div>
        </div>
        <ArrowRight size={18} className={css.gateArrow} aria-hidden="true" />
        <div className={`${css.gateCol} ${css.gateColRight}`}>
          <div className={css.gateColLbl}>Intended population</div>
          <div className={css.gateColVal}>{syn.intendedPeople} people</div>
        </div>
      </div>

      <div>
        <div className={css.secLbl}>Select your pathway</div>
        <div className={css.pathwayList} data-testid="cc-pathway-list">
          {PATHWAYS.map((p) => {
            const disabled = p.id === 'confirm' && !syn.withinCapacity;
            const on = pathway === p.id;
            const Icon = p.icon;
            return (
              <button
                key={p.id}
                type="button"
                className={css.pathwayCard}
                data-tone={p.tone}
                data-on={on ? 'true' : 'false'}
                data-testid={`cc-pathway-${p.id}`}
                aria-pressed={on}
                disabled={disabled}
                onClick={() => onPick(p.id)}
              >
                <Icon size={16} aria-hidden={true} />
                <span className={css.pcBody}>
                  <span className={css.pcTitle}>{p.title}</span>
                  <span className={css.pcDesc}>{p.desc}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <InterpretationBlock tone="warn">{ESCALATION_RULE}</InterpretationBlock>

      <div className={css.gateGuard} data-testid="cc-gate-guard">
        <ShieldCheck size={13} className={css.feedsIcon} aria-hidden="true" />
        <div className={css.feedsTxt}>
          Pathway choice is recorded in the{' '}
          <strong>community foundation document</strong>. Confirm gates all
          subsequent community design. Defer and Redesign return to earlier
          decisions.
        </div>
      </div>
    </div>
  );
}

export default CarryingCapacityCapture;
