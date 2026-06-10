/**
 * PropagationInfraCapture -- a multi-mode CONTROLLED capture for the nursery
 * objective nur-sec-s1-propagation-infra-survey ("A clear read of propagation
 * infrastructure & media resources", 5 checklist items c1..c5). Ported from
 * olos_propagation_infra.html right-hand panels p1..p5. Catalogue item order ==
 * mockup panel order:
 *
 *   c1 -> infraInventory   (mockup p1: structure-type chips + register + summary)
 *   c2 -> condition        (mockup p2: per-structure condition + capacity summary)
 *   c3 -> mediaInputs       (mockup p3: on-site media checklist + annual volume)
 *   c4 -> compostCapacity   (mockup p4: LIVE compost-capacity calculator)
 *   c5 -> mediaSourcing     (mockup p5: off-site component sourcing register)
 *
 * Structure mirrors BiosecurityCapture / CarryingCapacityCapture (the canonical
 * multi-mode captures): a `propagationInfraModeFor(itemId)` mapper plus a single
 * component that renders ONE mode body. The third-column host (DecisionWorking-
 * Panel) owns the eyebrow / title / hint / Record-Defer chrome; this capture
 * renders ONLY the scrollable mode body (the mockup's `.rb` inner content).
 *
 * ADVISORY / pure: the model is always derived from decode(value) each render;
 * the full next model is emitted via onChange(encode(next)). The capture holds
 * NO local state for persisted values. NO projectId prop; writes NOTHING to any
 * store. All five modes are ADVISORY (no Stratum gate). Each validity arm checks
 * only the capture's own FormValue (no sibling reads).
 *
 * decode is TOTAL / defensive: never throws, never fabricates seed/demo data.
 * Register rows decode from a possibly-malformed array to a clean typed array;
 * numeric fields are stored as RAW STRINGS (preserving "0"); the compost
 * calculator's demo numbers (3 bays / 1.4 m3 / 8 weeks) are calc FALLBACKS only,
 * applied inside the pure compute fn via the `num` helper (which preserves a
 * legitimate 0). The c4 calculator is the single LIVE compute mode -- it mirrors
 * CarryingCapacity's ceiling pattern (compute then render a CapacityCeilingBlock
 * + InterpretationBlock). Compost need threshold is ~20 m3/yr (mockup p4).
 *
 * ASCII-only: middot -> " / "; em-dash -> " -- "; m2 / m3 spelled out; degree
 * symbols dropped. All component / structure-type names and sample sourcing copy
 * are fidelity-critical verbatim constants -- never reword. The cost figures are
 * supplier-sourcing references (NOT finance engineering) -- fiqh-clear,
 * transcribed verbatim. All icons are lucide. Apostrophes use double-quoted JS
 * strings.
 */

import * as React from 'react';
import { ArrowRight } from 'lucide-react';

import type { FormValue } from './actToolCatalog.js';
import {
  AmountRow,
  CapacityCeilingBlock,
  ChipSelect,
  InterpretationBlock,
  RegisterList,
  SectionEyebrow,
  Stepper,
} from './captures/controls/index.js';
import css from './PropagationInfraCapture.module.css';

// ---------------------------------------------------------------------------
// Mode mapper
// ---------------------------------------------------------------------------

export type PropagationInfraMode =
  | 'infraInventory' // c1
  | 'condition' // c2
  | 'mediaInputs' // c3
  | 'compostCapacity' // c4
  | 'mediaSourcing'; // c5

export const PROPAGATION_INFRA_PREFIX = 'nur-sec-s1-propagation-infra-survey';
const PREFIX_DASH = PROPAGATION_INFRA_PREFIX + '-';

export function propagationInfraModeFor(
  itemId: string,
): PropagationInfraMode | null {
  if (!itemId.startsWith(PREFIX_DASH)) return null;
  const suffix = itemId.slice(PREFIX_DASH.length);
  switch (suffix) {
    case 'c1':
      return 'infraInventory';
    case 'c2':
      return 'condition';
    case 'c3':
      return 'mediaInputs';
    case 'c4':
      return 'compostCapacity';
    case 'c5':
      return 'mediaSourcing';
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Verbatim canonical content (never reword; ASCII-normalized per task spec)
// ---------------------------------------------------------------------------

// -- infraInventory (c1) -- structure-type chips (mockup p1) --
export const STRUCTURE_TYPES: readonly string[] = [
  'Glasshouse',
  'Shade house',
  'Polytunnel',
  'Prop. bench',
  'Mist unit',
  'Cold frame',
  'Hotbed',
];

// -- condition (c2) -- 4-state condition rating (mockup p2) --
export const CONDITION_RATINGS: readonly string[] = ['Ex', 'Good', 'Fair', 'Poor'];

type CondTone = 'ex' | 'gd' | 'fr' | 'pr';
function condTone(rating: string): CondTone | null {
  switch (rating) {
    case 'Ex':
      return 'ex';
    case 'Good':
      return 'gd';
    case 'Fair':
      return 'fr';
    case 'Poor':
      return 'pr';
    default:
      return null;
  }
}

// -- mediaInputs (c3) -- on-site media checklist (mockup p3) --
export const ONSITE_MEDIA: readonly string[] = [
  'Compost (in active production)',
  'Woodchip / wood fibre',
  'Leaf mould',
  'Topsoil (from site)',
  'Worm castings',
  'Biochar (self-produced)',
  'Sand / grit (from site)',
];

// -- compostCapacity (c4) -- feedstock chips + calc defaults (mockup p4) --
export const COMPOST_FEEDSTOCKS: readonly string[] = [
  'Garden waste',
  'Kitchen scraps',
  'Woodchip',
  'Collected leaves',
];

// Calc fallbacks (mockup p4 defaults). NEVER persisted as seed data; applied
// only inside computeCompost via the `num` helper.
const DEF_BAYS = 3;
const DEF_VOL_PER_BAY = 1.4;
const DEF_WEEKS = 8;
// Rough: a ~36 m2 usable propagation space needs ~20 m3/yr compost (mockup p4).
const COMPOST_NEED = 20;

// -- mediaSourcing (c5) -- off-site component register (mockup p5) --
export type AvailState = 's' | 'a' | 'o';
export const AVAIL_STATES: readonly AvailState[] = ['s', 'a', 'o'];
export interface SourceComponentSpec {
  name: string;
  supplier: string;
  cost: string;
  /** demo availability in the mockup; NOT persisted (decode defaults to ""). */
}
export const SOURCE_COMPONENTS: readonly SourceComponentSpec[] = [
  {
    name: 'Perlite',
    supplier: 'Nursery supplies wholesaler -- 50 km',
    cost: '~$140/m3',
  },
  {
    name: 'Coir (coconut fibre)',
    supplier: 'Online specialist -- good shelf life as compressed blocks',
    cost: '~$80/m3',
  },
  {
    name: 'Sharp sand / horticultural grit',
    supplier: 'Local quarry -- 12 km, year-round supply',
    cost: '~$45/m3',
  },
  {
    name: 'Biochar (external)',
    supplier: 'Specialist producer -- no local source identified',
    cost: '~$320/m3',
  },
  {
    name: 'Bark fines (commercial grade)',
    supplier: 'Local tree surgery contractor -- off-cuts available',
    cost: 'Low / free',
  },
  {
    name: 'Vermiculite',
    supplier: 'Online / nursery supplier -- order in advance',
    cost: '~$160/m3',
  },
];

const AVAIL_LABEL: Record<AvailState, string> = {
  s: 'In stock',
  a: 'Seasonal',
  o: 'Order req.',
};

// ---------------------------------------------------------------------------
// Models (register rows are typed objects; numeric/selection fields are RAW
// STRINGS preserving "0"; availability ratings are positional fixed-length)
// ---------------------------------------------------------------------------

export interface StructureRow {
  /** one of STRUCTURE_TYPES, or "" */
  type: string;
  name: string;
  /** floor / bench area, m2 (raw string) */
  area: string;
  /** approx. year built (raw string) */
  year: string;
}

export interface ConditionRow {
  name: string;
  /** one of CONDITION_RATINGS, or "" */
  rating: string;
  /** usable propagation area, m2 (raw string) */
  usable: string;
  notes: string;
}

export interface InfraInventoryModel {
  kind: 'infraInventory';
  structures: StructureRow[];
}

export interface ConditionModel {
  kind: 'condition';
  rows: ConditionRow[];
}

export interface MediaInputsModel {
  kind: 'mediaInputs';
  /** present media labels (subset of ONSITE_MEDIA) */
  present: string[];
  /** length === ONSITE_MEDIA.length; per-media annual volume m3/yr (raw string) */
  volumes: string[];
}

export interface CompostCapacityModel {
  kind: 'compostCapacity';
  bays: string;
  volPerBay: string;
  weeks: string;
  /** selected feedstock labels (subset of COMPOST_FEEDSTOCKS) */
  feedstock: string[];
}

export interface MediaSourcingModel {
  kind: 'mediaSourcing';
  /** length === SOURCE_COMPONENTS.length; "" | "s" | "a" | "o" */
  availability: string[];
}

export type PropagationInfraModel =
  | InfraInventoryModel
  | ConditionModel
  | MediaInputsModel
  | CompostCapacityModel
  | MediaSourcingModel;

// ---------------------------------------------------------------------------
// FormValue coercion helpers
// ---------------------------------------------------------------------------

function asStr(v: FormValue[string] | undefined): string {
  return typeof v === 'string' ? v : '';
}

function asStrArr(v: FormValue[string] | undefined): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string');
  return typeof v === 'string' && v !== '' ? [v] : [];
}

/** Positional fixed-length string[] from a possibly-short / scalar array. */
function fixedStrings(v: FormValue[string] | undefined, len: number): string[] {
  const arr = asStrArr(v);
  const out: string[] = [];
  for (let i = 0; i < len; i++) out.push(arr[i] ?? '');
  return out;
}

/** Constrain a raw value to the allowed set, else "". */
function constrain(raw: string, allowed: readonly string[]): string {
  return allowed.includes(raw) ? raw : '';
}

function constrainAll(arr: string[], allowed: readonly string[]): string[] {
  return arr.map((r) => constrain(r, allowed));
}

/**
 * Numeric coercion for the compost calculator. Falls back ONLY when raw is empty
 * or parses to a non-finite number; a legitimate 0 is PRESERVED. NOT
 * `Number(raw) || fallback` -- that idiom would coerce a valid 0 to the fallback.
 */
function num(raw: string, fallback: number): number {
  if (raw.trim() === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Register rows are stored COLUMN-WISE as parallel string[] (FormFieldValue is
 * `string | string[]` -- arrays of row-objects are not a legal FormValue, so we
 * cannot persist row records directly; we transpose to one array per field, the
 * BiosecurityCapture-compatible shape). Row count is the max column length;
 * short columns pad with "". A fully-empty row collapses out on the next encode.
 */
function maxLen(...cols: string[][]): number {
  return cols.reduce((m, c) => Math.max(m, c.length), 0);
}

function decodeStructureRows(value: FormValue): StructureRow[] {
  const types = asStrArr(value.piStructTypes);
  const names = asStrArr(value.piStructNames);
  const areas = asStrArr(value.piStructAreas);
  const years = asStrArr(value.piStructYears);
  const n = maxLen(types, names, areas, years);
  const rows: StructureRow[] = [];
  for (let i = 0; i < n; i++) {
    rows.push({
      type: constrain(types[i] ?? '', STRUCTURE_TYPES),
      name: names[i] ?? '',
      area: areas[i] ?? '',
      year: years[i] ?? '',
    });
  }
  return rows;
}

function decodeConditionRows(value: FormValue): ConditionRow[] {
  const names = asStrArr(value.piCondNames);
  const ratings = asStrArr(value.piCondRatings);
  const usable = asStrArr(value.piCondUsable);
  const notes = asStrArr(value.piCondNotes);
  const n = maxLen(names, ratings, usable, notes);
  const rows: ConditionRow[] = [];
  for (let i = 0; i < n; i++) {
    rows.push({
      name: names[i] ?? '',
      rating: constrain(ratings[i] ?? '', CONDITION_RATINGS),
      usable: usable[i] ?? '',
      notes: notes[i] ?? '',
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// decode: FormValue -> PropagationInfraModel (TOTAL / defensive; never throws,
// never fabricates seed/demo defaults)
// ---------------------------------------------------------------------------

export function decodePropagationInfra(
  mode: PropagationInfraMode,
  value: FormValue,
): PropagationInfraModel {
  switch (mode) {
    case 'infraInventory':
      return {
        kind: 'infraInventory',
        structures: decodeStructureRows(value),
      };
    case 'condition':
      return {
        kind: 'condition',
        rows: decodeConditionRows(value),
      };
    case 'mediaInputs':
      return {
        kind: 'mediaInputs',
        present: asStrArr(value.piMediaPresent).filter((m) =>
          ONSITE_MEDIA.includes(m),
        ),
        volumes: fixedStrings(value.piMediaVolumes, ONSITE_MEDIA.length),
      };
    case 'compostCapacity':
      return {
        kind: 'compostCapacity',
        bays: asStr(value.piBays),
        volPerBay: asStr(value.piVolPerBay),
        weeks: asStr(value.piWeeks),
        feedstock: asStrArr(value.piFeedstock).filter((f) =>
          COMPOST_FEEDSTOCKS.includes(f),
        ),
      };
    case 'mediaSourcing':
      return {
        kind: 'mediaSourcing',
        availability: constrainAll(
          fixedStrings(value.piAvailability, SOURCE_COMPONENTS.length),
          AVAIL_STATES,
        ),
      };
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown PropagationInfraMode: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// encode: PropagationInfraModel -> FormValue (lossless inverse of decode)
// ---------------------------------------------------------------------------

export function encodePropagationInfra(
  _mode: PropagationInfraMode,
  model: PropagationInfraModel,
): FormValue {
  switch (model.kind) {
    case 'infraInventory':
      return {
        piStructTypes: model.structures.map((s) => s.type),
        piStructNames: model.structures.map((s) => s.name),
        piStructAreas: model.structures.map((s) => s.area),
        piStructYears: model.structures.map((s) => s.year),
      };
    case 'condition':
      return {
        piCondNames: model.rows.map((r) => r.name),
        piCondRatings: model.rows.map((r) => r.rating),
        piCondUsable: model.rows.map((r) => r.usable),
        piCondNotes: model.rows.map((r) => r.notes),
      };
    case 'mediaInputs':
      return {
        piMediaPresent: [...model.present],
        piMediaVolumes: [...model.volumes],
      };
    case 'compostCapacity':
      return {
        piBays: model.bays,
        piVolPerBay: model.volPerBay,
        piWeeks: model.weeks,
        piFeedstock: [...model.feedstock],
      };
    case 'mediaSourcing':
      return { piAvailability: [...model.availability] };
    default: {
      const _exhaustive: never = model;
      throw new Error(
        `Unknown PropagationInfraModel kind: ${String(_exhaustive)}`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Pure compute (the c4 LIVE calculator; exported + unit-tested in isolation)
// ---------------------------------------------------------------------------

export interface CompostResult {
  bays: number;
  volPerBay: number;
  weeks: number;
  turnovers: number;
  annual: number;
  /** 'pass' when >= need, 'warn' when below */
  tone: 'pass' | 'warn';
  formula: string;
  interpretation: string;
}

export function computeCompost(model: CompostCapacityModel): CompostResult {
  const bays = num(model.bays, DEF_BAYS);
  const volPerBay = num(model.volPerBay, DEF_VOL_PER_BAY);
  const weeks = num(model.weeks, DEF_WEEKS);
  const turnovers = weeks > 0 ? Math.floor(52 / weeks) : 0;
  const annualRaw = bays * volPerBay * turnovers;
  // Round to one decimal place (mirrors the mockup's toFixed(1)).
  const annual = Math.round(annualRaw * 10) / 10;
  const formula = `${bays} bays x ${volPerBay} m3 x ${turnovers} turnovers/yr`;

  let tone: 'pass' | 'warn';
  let interpretation: string;
  if (annual >= COMPOST_NEED * 1.1) {
    tone = 'pass';
    const ratio = (annual / COMPOST_NEED).toFixed(1);
    interpretation = `Surplus -- approximately ${ratio}x estimated need for a ~36 m2 usable space. Excess can supply other site uses.`;
  } else if (annual >= COMPOST_NEED) {
    tone = 'pass';
    interpretation =
      'Adequate -- close to estimated requirement for a ~36 m2 propagation footprint. Monitor usage carefully through first season.';
  } else {
    tone = 'warn';
    const pct = ((annual / COMPOST_NEED) * 100).toFixed(0);
    interpretation = `Insufficient -- approximately ${pct}% of estimated need. Additional bays, shorter cycles, or purchased compost will be required.`;
  }
  return {
    bays,
    volPerBay,
    weeks,
    turnovers,
    annual,
    tone,
    formula,
    interpretation,
  };
}

// ---------------------------------------------------------------------------
// validity gates (sees own value only)
// ---------------------------------------------------------------------------

export function isPropagationInfraValid(
  mode: PropagationInfraMode,
  value: FormValue,
): boolean {
  switch (mode) {
    case 'infraInventory': {
      const m = decodePropagationInfra('infraInventory', value) as InfraInventoryModel;
      return m.structures.length >= 1;
    }
    case 'condition': {
      const m = decodePropagationInfra('condition', value) as ConditionModel;
      return m.rows.some((r) => r.rating !== '');
    }
    case 'mediaInputs': {
      const m = decodePropagationInfra('mediaInputs', value) as MediaInputsModel;
      return m.present.length >= 1;
    }
    case 'compostCapacity':
      // The calculator always yields output with defaults -- always recordable.
      return true;
    case 'mediaSourcing': {
      const m = decodePropagationInfra('mediaSourcing', value) as MediaSourcingModel;
      return m.availability.some((a) => a !== '');
    }
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown PropagationInfraMode: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// summaries (defensive; never throw; handle empty value)
// ---------------------------------------------------------------------------

export function summarisePropagationInfra(
  mode: PropagationInfraMode,
  value: FormValue,
  siblingValues?: Record<string, FormValue>,
): string {
  void siblingValues;
  switch (mode) {
    case 'infraInventory': {
      const m = decodePropagationInfra('infraInventory', value) as InfraInventoryModel;
      const total = m.structures.reduce((sum, s) => sum + num(s.area, 0), 0);
      return `${m.structures.length} structures recorded, ${total} m2 total`;
    }
    case 'condition': {
      const m = decodePropagationInfra('condition', value) as ConditionModel;
      const rated = m.rows.filter((r) => r.rating !== '').length;
      const usable = m.rows.reduce((sum, r) => sum + num(r.usable, 0), 0);
      return `${rated} of ${m.rows.length} structures assessed, ${usable} m2 usable`;
    }
    case 'mediaInputs': {
      const m = decodePropagationInfra('mediaInputs', value) as MediaInputsModel;
      return `${m.present.length} of ${ONSITE_MEDIA.length} on-site media available`;
    }
    case 'compostCapacity': {
      const m = decodePropagationInfra('compostCapacity', value) as CompostCapacityModel;
      const r = computeCompost(m);
      return `Compost capacity: ${r.annual} m3/year`;
    }
    case 'mediaSourcing': {
      const m = decodePropagationInfra('mediaSourcing', value) as MediaSourcingModel;
      const set = m.availability.filter((a) => a !== '').length;
      return `${set} of ${SOURCE_COMPONENTS.length} components sourced`;
    }
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown PropagationInfraMode: ${String(_exhaustive)}`);
    }
  }
}

// ===========================================================================
// React component + 5 mode bodies (P1..P5)
// ===========================================================================

export interface PropagationInfraCaptureProps {
  mode: PropagationInfraMode;
  value: FormValue;
  onChange: (next: FormValue) => void;
  /** this capture's own checklist item id (e.g. nur-sec-s1-propagation-infra-survey-c1). */
  itemId: string;
  /** full per-item FormValue map; reserved -- this capture reads no siblings. */
  siblingValues?: Record<string, FormValue>;
}

export function PropagationInfraCapture({
  mode,
  value,
  onChange,
  itemId,
  siblingValues = {},
}: PropagationInfraCaptureProps): React.JSX.Element {
  void itemId;
  void siblingValues;

  // -- P1: infraInventory ---------------------------------------------------
  if (mode === 'infraInventory') {
    const model = decodePropagationInfra('infraInventory', value) as InfraInventoryModel;
    const setRows = (structures: StructureRow[]): void =>
      onChange(encodePropagationInfra('infraInventory', { kind: 'infraInventory', structures }));
    const total = model.structures.reduce((sum, s) => sum + num(s.area, 0), 0);
    return (
      <div className={css.root} data-pi-mode="infraInventory">
        <div>
          <SectionEyebrow>Structures in register</SectionEyebrow>
          <RegisterList<StructureRow>
            items={model.structures}
            onChange={setRows}
            makeEmpty={() => ({ type: '', name: '', area: '', year: '' })}
            addLabel="Add another structure"
            emptyHint="No structures yet. Record every structure that could be used for propagation -- even those in poor condition."
            ariaLabel="Propagation structures register"
            renderRow={(row, _i, update) => (
              <div className={css.structRow}>
                <div className={css.structTypeRow}>
                  <span className={css.structFl}>Structure type</span>
                  <ChipSelect
                    multi={false}
                    options={STRUCTURE_TYPES}
                    value={row.type !== '' ? [row.type] : []}
                    onChange={(next) => update({ type: next[0] ?? '' })}
                    ariaLabel="Structure type"
                  />
                </div>
                <label className={css.structField}>
                  <span className={css.structFl}>Name or reference</span>
                  <input
                    type="text"
                    className={css.structInp}
                    value={row.name}
                    placeholder="e.g. Main glasshouse, North shade house"
                    onChange={(e) => update({ name: e.target.value })}
                  />
                </label>
                <div className={css.structPair}>
                  <AmountRow
                    label="Floor / bench area"
                    value={row.area}
                    onChange={(v) => update({ area: v })}
                    unit="m2"
                    placeholder="0"
                  />
                  <AmountRow
                    label="Approx. year built"
                    value={row.year}
                    onChange={(v) => update({ year: v })}
                    placeholder="e.g. 2005"
                    inputMode="numeric"
                  />
                </div>
              </div>
            )}
          />
        </div>

        <div className={css.summaryStrip} data-testid="pi-infra-summary">
          <div className={css.sumItem}>
            <span className={css.sumN}>{model.structures.length}</span>
            <span className={css.sumLbl}>Structures</span>
          </div>
          <div className={css.sumItem}>
            <span className={css.sumN}>{total}</span>
            <span className={css.sumLbl}>m2 total</span>
          </div>
          <div className={css.sumItem}>
            <span className={css.sumN}>0</span>
            <span className={css.sumLbl}>assessed</span>
          </div>
        </div>

        <FeedsNote>
          This register feeds directly into item 2 (condition assessment) and{' '}
          <strong>Tier 3: propagation capacity design</strong>.
        </FeedsNote>
      </div>
    );
  }

  // -- P2: condition --------------------------------------------------------
  if (mode === 'condition') {
    const model = decodePropagationInfra('condition', value) as ConditionModel;
    const setRows = (rows: ConditionRow[]): void =>
      onChange(encodePropagationInfra('condition', { kind: 'condition', rows }));
    const totalUsable = model.rows.reduce((sum, r) => sum + num(r.usable, 0), 0);
    const needAttention = model.rows.filter(
      (r) => r.rating === 'Fair' || r.rating === 'Poor',
    ).length;
    return (
      <div className={css.root} data-pi-mode="condition">
        <div>
          <SectionEyebrow>Structures from your inventory</SectionEyebrow>
          <RegisterList<ConditionRow>
            items={model.rows}
            onChange={setRows}
            makeEmpty={() => ({ name: '', rating: '', usable: '', notes: '' })}
            addLabel="Add a structure to assess"
            emptyHint="No structures assessed yet. Add each structure, rate its condition, and record its usable propagation area."
            ariaLabel="Condition assessment rows"
            renderRow={(row, _i, update) => {
              const tone = condTone(row.rating);
              return (
                <div className={css.assessRow} data-tone={tone ?? 'none'}>
                  <label className={css.structField}>
                    <span className={css.structFl}>Structure name</span>
                    <input
                      type="text"
                      className={css.structInp}
                      value={row.name}
                      placeholder="e.g. Main glasshouse"
                      onChange={(e) => update({ name: e.target.value })}
                    />
                  </label>
                  <div className={css.condBtns}>
                    {CONDITION_RATINGS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        className={css.condBtn}
                        data-tone={condTone(opt) ?? 'none'}
                        data-on={row.rating === opt}
                        aria-pressed={row.rating === opt}
                        onClick={() =>
                          update({ rating: row.rating === opt ? '' : opt })
                        }
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                  <AmountRow
                    label="Usable propagation area"
                    value={row.usable}
                    onChange={(v) => update({ usable: v })}
                    unit="m2 usable"
                    placeholder="0"
                  />
                  <label className={css.structField}>
                    <span className={css.structFl}>Notes</span>
                    <input
                      type="text"
                      className={css.structInp}
                      value={row.notes}
                      placeholder="Notes on repairs or limitations..."
                      onChange={(e) => update({ notes: e.target.value })}
                    />
                  </label>
                </div>
              );
            }}
          />
        </div>

        <div className={css.assessSummary} data-testid="pi-cond-summary">
          <div className={css.assLbl}>Capacity summary</div>
          <div className={css.assRow}>
            <span className={css.assKey}>Usable propagation area</span>
            <span className={css.assVal}>{totalUsable} m2</span>
          </div>
          <div className={css.assRow}>
            <span className={css.assKey}>Structures needing attention</span>
            <span className={css.assVal} data-attn>
              {needAttention}
            </span>
          </div>
        </div>

        <FeedsNote>
          Usable capacity feeds <strong>Tier 3: propagation system design</strong>.
          Fair/Poor structures generate capital requirement flags in the Tier 4
          infrastructure plan.
        </FeedsNote>
      </div>
    );
  }

  // -- P3: mediaInputs ------------------------------------------------------
  if (mode === 'mediaInputs') {
    const model = decodePropagationInfra('mediaInputs', value) as MediaInputsModel;
    const set = (patch: Partial<MediaInputsModel>): void =>
      onChange(encodePropagationInfra('mediaInputs', { ...model, ...patch }));
    const toggle = (label: string): void => {
      const present = model.present.includes(label)
        ? model.present.filter((m) => m !== label)
        : [...model.present, label];
      set({ present });
    };
    const setVolume = (i: number, v: string): void => {
      const volumes = model.volumes.slice();
      volumes[i] = v;
      set({ volumes });
    };
    return (
      <div className={css.root} data-pi-mode="mediaInputs">
        <div>
          <SectionEyebrow>Available on-site (estimated annual volume)</SectionEyebrow>
          {ONSITE_MEDIA.map((label, i) => {
            const present = model.present.includes(label);
            return (
              <div
                key={label}
                className={css.mediaRow}
                data-present={present}
              >
                <button
                  type="button"
                  className={css.mediaChk}
                  data-on={present}
                  aria-pressed={present}
                  aria-label={label}
                  onClick={() => toggle(label)}
                >
                  <span className={css.mediaChkMark} aria-hidden="true" />
                </button>
                <span className={css.mediaName}>{label}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  className={css.mediaQty}
                  value={model.volumes[i] ?? ''}
                  placeholder="0"
                  disabled={!present}
                  aria-label={`${label} annual volume`}
                  onChange={(e) => setVolume(i, e.target.value)}
                />
                <span className={css.mediaUnit}>m3/yr</span>
              </div>
            );
          })}
        </div>

        <FeedsNote>
          On-site inputs feed <strong>Tier 3: growing media specification</strong>.
          Higher on-site availability reduces reliance on purchased components.
        </FeedsNote>
      </div>
    );
  }

  // -- P4: compostCapacity (LIVE calculator) --------------------------------
  if (mode === 'compostCapacity') {
    const model = decodePropagationInfra('compostCapacity', value) as CompostCapacityModel;
    const set = (patch: Partial<CompostCapacityModel>): void =>
      onChange(encodePropagationInfra('compostCapacity', { ...model, ...patch }));
    const result = computeCompost(model);
    return (
      <div className={css.root} data-pi-mode="compostCapacity">
        <div>
          <div className={css.calcLbl}>Number of active compost bays</div>
          <Stepper
            value={result.bays}
            onChange={(v) => set({ bays: String(v) })}
            min={1}
            max={20}
            step={1}
            unit="bays"
            ariaLabel="Number of active compost bays"
          />
        </div>

        <AmountRow
          label="Bay volume (each)"
          value={model.volPerBay}
          onChange={(v) => set({ volPerBay: v })}
          unit="m3 per bay"
          placeholder="1.4"
        />

        <div>
          <div className={css.calcLbl}>Maturation time</div>
          <Stepper
            value={result.weeks}
            onChange={(v) => set({ weeks: String(v) })}
            min={4}
            max={52}
            step={2}
            unit="weeks (hot compost)"
            ariaLabel="Maturation time in weeks"
          />
        </div>

        <div>
          <div className={css.calcLbl}>Feedstock availability</div>
          <ChipSelect
            multi
            options={COMPOST_FEEDSTOCKS}
            value={model.feedstock}
            onChange={(next) => {
              // ChipSelect emits the full next selection; mirror it directly.
              set({ feedstock: next.filter((f) => COMPOST_FEEDSTOCKS.includes(f)) });
            }}
            ariaLabel="Feedstock availability"
          />
        </div>

        <CapacityCeilingBlock
          label="Annual compost production"
          value={result.annual}
          unit="m3/year"
          tone={result.tone}
          note={<span data-testid="pi-comp-formula">{result.formula}</span>}
        />

        <InterpretationBlock tone={result.tone}>
          {result.interpretation}
        </InterpretationBlock>

        <FeedsNote>
          Annual production feeds{' '}
          <strong>Tier 3: growing media mix specification</strong> and determines
          how much perlite, coir, or other purchased components are needed to
          supplement.
        </FeedsNote>
      </div>
    );
  }

  // -- P5: mediaSourcing ----------------------------------------------------
  const model = decodePropagationInfra('mediaSourcing', value) as MediaSourcingModel;
  const setAvail = (i: number, state: AvailState): void => {
    const availability = model.availability.slice();
    availability[i] = availability[i] === state ? '' : state;
    onChange(
      encodePropagationInfra('mediaSourcing', {
        kind: 'mediaSourcing',
        availability,
      }),
    );
  };
  return (
    <div className={css.root} data-pi-mode="mediaSourcing">
      <div>
        <SectionEyebrow>Component availability &amp; sources</SectionEyebrow>
        {SOURCE_COMPONENTS.map((comp, i) => {
          const current = model.availability[i] ?? '';
          return (
            <div key={comp.name} className={css.sourceRow}>
              <div className={css.srHead}>
                <span className={css.srName}>{comp.name}</span>
                <div className={css.srAvailRow}>
                  {AVAIL_STATES.map((state) => (
                    <button
                      key={state}
                      type="button"
                      className={css.srAvBtn}
                      data-avail={state}
                      data-on={current === state}
                      aria-pressed={current === state}
                      onClick={() => setAvail(i, state)}
                    >
                      {AVAIL_LABEL[state]}
                    </button>
                  ))}
                </div>
              </div>
              <div className={css.srBody}>
                <span className={css.srSupplier}>{comp.supplier}</span>
                <span className={css.srCost}>{comp.cost}</span>
              </div>
            </div>
          );
        })}
      </div>

      <FeedsNote>
        Sourcing data feeds{' '}
        <strong>Tier 3: growing media mix specification</strong> and the cost
        model for media production. High-cost or order-required components become
        substitution priorities in mix design.
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

export default PropagationInfraCapture;
