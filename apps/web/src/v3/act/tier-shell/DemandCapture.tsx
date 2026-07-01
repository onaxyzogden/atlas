/**
 * DemandCapture -- a two-mode CONTROLLED capture that upgrades two existing
 * checklist items of the universal objective s7-resource-plan ("A realistic
 * resource & capacity plan", ref U-S7.2) into structured Phase-1 DEMAND captures:
 *
 *   c1 -> labourDemand   (Phase 1 labour demand by task / season: a register of
 *                         {task, window, people, hoursPerWeek, sourcing} rows --
 *                         the demand side of the Tier-0 Capacity Bridge)
 *   c4 -> capitalDemand  (Phase 1 capital demand by category: a register of
 *                         {category, amount, channel} rows, channel constrained to
 *                         the closed CAPITAL_CHANNEL_LIST Amanah enum)
 *
 * These are the SAME two checklist ids that already exist on s7-resource-plan
 * (c1 in decision group dg1 "Labour & skills"; c4 in dg2 "Capital & procurement").
 * No checklist item is added or removed and no decision-group membership changes
 * -- the items are upgraded in place from free-text to structured captures, so the
 * objective's completion math is byte-identical. c2/c3/c5 keep their generic form
 * (demandModeFor returns null for them).
 *
 * Structure mirrors EcovillageCapitalPlanCapture: a `demandModeFor(itemId)` mapper
 * plus a single component that renders ONE mode body. The third-column host
 * (DecisionWorkingPanel) owns the eyebrow / title / hint / Record-Defer chrome and
 * the gate-note; this capture renders ONLY the scrollable mode body.
 *
 * ADVISORY / pure: the model is derived from decode(value) each render; the full
 * next model is emitted via onChange(encode(next)). NO local state for persisted
 * values, NO projectId, writes NOTHING to any store. The captured demand is read
 * back by the Plan-only Capacity Bridge (Stage 6) via the pure selector
 * `phase1DemandBaseline(labourValue, capitalValue)`, joined display-only against the
 * steward team's declared SUPPLY from Stratum 1 Objective 1.2.
 *
 * decode is TOTAL / defensive: never throws, never fabricates seed/demo data. An
 * empty FormValue yields empty registers. Register entries are JSON rows
 * (JSON.stringify / parse per entry, try/catch, legacy-<i> id fallback) mirroring
 * EcovillageCapitalPlanCapture.
 *
 * AMANAH / covenant (CSRA model erased 2026-05-04 on fiqh grounds -- bay" ma laysa
 * "indak): the capital-demand channel column reuses the closed CAPITAL_CHANNEL_LIST
 * enum + CAPITAL_SCOPE_NOTES VERBATIM from EcovillageCapitalPlanCapture (a single
 * Amanah source of truth). There is NO advance-purchase / member-share / salam
 * channel because none exists there; a foreign channel decodes to "" via the same
 * `constrain` guard. This capture records the steward's planned funding need within
 * permitted channels only -- it creates, prices, or sells no instrument.
 *
 * ASCII-only: em-dash -> " -- ". Apostrophes use double-quoted JS strings. All
 * icons are lucide.
 */

import * as React from 'react';
import { ArrowRight, ShieldAlert } from 'lucide-react';

import type { FormValue } from './actToolCatalog.js';
import {
  Dropdown,
  RegisterList,
  SectionEyebrow,
  StatusPill,
} from './captures/controls/index.js';
import { CAPITAL_CHANNEL_LIST, CAPITAL_SCOPE_NOTES } from './EcovillageCapitalPlanCapture.js';
import css from './DemandCapture.module.css';

// ---------------------------------------------------------------------------
// Mode mapper
// ---------------------------------------------------------------------------

export type DemandMode =
  | 'labourDemand' // c1
  | 'capitalDemand'; // c4

export const DEMAND_PREFIX = 's7-resource-plan';
const PREFIX_DASH = DEMAND_PREFIX + '-';

/** The two checklist ids upgraded to structured demand captures. */
export const LABOUR_DEMAND_ITEM_ID = 's7-resource-plan-c1';
export const CAPITAL_DEMAND_ITEM_ID = 's7-resource-plan-c4';

/**
 * Maps a checklist item id to its demand mode. ONLY c1 (labour) and c4 (capital)
 * are structured demand captures; c2/c3/c5 return null and keep their generic
 * form. Returns null for any non-s7-resource-plan id.
 */
export function demandModeFor(itemId: string): DemandMode | null {
  if (!itemId.startsWith(PREFIX_DASH)) return null;
  switch (itemId.slice(PREFIX_DASH.length)) {
    case 'c1':
      return 'labourDemand';
    case 'c4':
      return 'capitalDemand';
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Verbatim canonical content (never reword)
// ---------------------------------------------------------------------------

/**
 * Where each labour line is sourced from. A closed list (the demand capture does
 * not invent staffing arrangements); a foreign value decodes to "".
 */
export const LABOUR_SOURCING_LIST: readonly string[] = [
  'Existing steward team',
  'New hire',
  'Contractor',
  'Volunteer / community',
];

// ---------------------------------------------------------------------------
// Register row models (JSON-row persisted; see decode/encode)
// ---------------------------------------------------------------------------

export interface LabourDemandRow {
  id: string;
  /** Phase 1 task / activity requiring labour, e.g. "Bed preparation" */
  task: string;
  /** season or phase window the demand falls in, e.g. "Spring", "Phase 1 Q1" */
  window: string;
  /** headcount required for the task */
  people: number;
  /** labour-hours per week the task requires (the supply/demand join unit) */
  hoursPerWeek: number;
  /** where the labour is sourced (constrained to LABOUR_SOURCING_LIST) */
  sourcing: string;
}

export interface CapitalDemandRow {
  id: string;
  /** capital category, e.g. "Infrastructure", "Equipment", "Working capital" */
  category: string;
  /** capital required for the category (plain numeric; project currency) */
  amount: number;
  /** funding channel (constrained to the closed CAPITAL_CHANNEL_LIST Amanah enum) */
  channel: string;
}

// ---------------------------------------------------------------------------
// Mode models
// ---------------------------------------------------------------------------

export interface LabourDemandModel {
  kind: 'labourDemand';
  rows: LabourDemandRow[];
}

export interface CapitalDemandModel {
  kind: 'capitalDemand';
  rows: CapitalDemandRow[];
}

export type DemandModel = LabourDemandModel | CapitalDemandModel;

// ---------------------------------------------------------------------------
// FormValue coercion + JSON-row helpers
// ---------------------------------------------------------------------------

function asStr(v: FormValue[string] | undefined): string {
  return typeof v === 'string' ? v : '';
}

function asNum(v: FormValue[string] | undefined): number {
  const n = Number(asStr(v));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function asJsonArr(v: FormValue[string] | undefined): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string');
  if (typeof v === 'string' && v !== '') return [v];
  return [];
}

/** crypto.randomUUID id factory (handlers only -- never in decode). */
function makeRowId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `row-${Math.random().toString(36).slice(2, 10)}`;
  }
}

function constrain(raw: string, allowed: readonly string[]): string {
  return allowed.includes(raw) ? raw : '';
}

// ---------------------------------------------------------------------------
// JSON-row decode per register (try/catch per entry; legacy-<i> id fallback)
// ---------------------------------------------------------------------------

function decodeLabourRows(v: FormValue[string] | undefined): LabourDemandRow[] {
  const out: LabourDemandRow[] = [];
  asJsonArr(v).forEach((entry, i) => {
    try {
      const parsed = JSON.parse(entry) as Partial<LabourDemandRow>;
      const people = Number(parsed.people);
      const hoursPerWeek = Number(parsed.hoursPerWeek);
      out.push({
        id: typeof parsed.id === 'string' && parsed.id ? parsed.id : `legacy-${i}`,
        task: typeof parsed.task === 'string' ? parsed.task : '',
        window: typeof parsed.window === 'string' ? parsed.window : '',
        people: Number.isFinite(people) && people >= 0 ? people : 0,
        hoursPerWeek: Number.isFinite(hoursPerWeek) && hoursPerWeek >= 0 ? hoursPerWeek : 0,
        sourcing: constrain(
          typeof parsed.sourcing === 'string' ? parsed.sourcing : '',
          LABOUR_SOURCING_LIST,
        ),
      });
    } catch {
      out.push({
        id: `legacy-${i}`,
        task: entry,
        window: '',
        people: 0,
        hoursPerWeek: 0,
        sourcing: '',
      });
    }
  });
  return out;
}

function decodeCapitalRows(v: FormValue[string] | undefined): CapitalDemandRow[] {
  const out: CapitalDemandRow[] = [];
  asJsonArr(v).forEach((entry, i) => {
    try {
      const parsed = JSON.parse(entry) as Partial<CapitalDemandRow>;
      const amount = Number(parsed.amount);
      out.push({
        id: typeof parsed.id === 'string' && parsed.id ? parsed.id : `legacy-${i}`,
        category: typeof parsed.category === 'string' ? parsed.category : '',
        amount: Number.isFinite(amount) && amount >= 0 ? amount : 0,
        channel: constrain(
          typeof parsed.channel === 'string' ? parsed.channel : '',
          CAPITAL_CHANNEL_LIST,
        ),
      });
    } catch {
      out.push({ id: `legacy-${i}`, category: entry, amount: 0, channel: '' });
    }
  });
  return out;
}

// ---------------------------------------------------------------------------
// decode: FormValue -> DemandModel (TOTAL / defensive)
// ---------------------------------------------------------------------------

export function decodeDemand(mode: DemandMode, value: FormValue): DemandModel {
  switch (mode) {
    case 'labourDemand':
      return { kind: 'labourDemand', rows: decodeLabourRows(value.dmLabour) };
    case 'capitalDemand':
      return { kind: 'capitalDemand', rows: decodeCapitalRows(value.dmCapital) };
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown DemandMode: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// encode: DemandModel -> FormValue (lossless inverse of decode)
// ---------------------------------------------------------------------------

export function encodeDemand(model: DemandModel): FormValue {
  switch (model.kind) {
    case 'labourDemand':
      return { dmLabour: model.rows.map((r) => JSON.stringify(r)) };
    case 'capitalDemand':
      return { dmCapital: model.rows.map((r) => JSON.stringify(r)) };
    default: {
      const _exhaustive: never = model;
      throw new Error(`Unknown DemandModel kind: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// validity gates
// ---------------------------------------------------------------------------

export function isDemandValid(mode: DemandMode, value: FormValue): boolean {
  switch (mode) {
    case 'labourDemand': {
      const m = decodeDemand('labourDemand', value) as LabourDemandModel;
      // At least one labour line with a task and a positive weekly demand.
      return m.rows.some(
        (r) => r.task.trim() !== '' && (r.hoursPerWeek > 0 || r.people > 0),
      );
    }
    case 'capitalDemand': {
      const m = decodeDemand('capitalDemand', value) as CapitalDemandModel;
      // At least one capital line with a category, a positive amount, and a
      // permitted funding channel (the Amanah guardrail at the record gate).
      return m.rows.some(
        (r) => r.category.trim() !== '' && r.amount > 0 && r.channel !== '',
      );
    }
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown DemandMode: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// summaries (defensive; never throw; handle empty value)
// ---------------------------------------------------------------------------

export function summariseDemand(mode: DemandMode, value: FormValue): string {
  switch (mode) {
    case 'labourDemand': {
      const b = labourDemandFrom(value);
      return `${b.lineCount} labour line(s), ${b.weeklyHours} hrs/week, ${b.headcount} people`;
    }
    case 'capitalDemand': {
      const b = capitalDemandFrom(value);
      return `${b.lineCount} capital line(s), total ${b.total} across ${b.byChannel.length} channel(s)`;
    }
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown DemandMode: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Pure derived baselines (display-only; consumed by the Stage-6 Capacity Bridge)
// ---------------------------------------------------------------------------

export interface Phase1LabourDemand {
  /** total labour-hours per week required across all rows (the join unit) */
  weeklyHours: number;
  /** total headcount required across all rows (a peak estimate, may double-count) */
  headcount: number;
  /** number of labour lines with a non-empty task */
  lineCount: number;
  /** weekly-hours demand grouped by sourcing channel (permitted, non-empty only) */
  bySourcing: { sourcing: string; weeklyHours: number }[];
}

export interface Phase1CapitalDemand {
  /** total capital required across all rows (project currency) */
  total: number;
  /** number of capital lines with a non-empty category */
  lineCount: number;
  /** capital grouped by permitted funding channel (non-empty channels only) */
  byChannel: { channel: string; amount: number }[];
}

export interface Phase1DemandBaseline {
  labour: Phase1LabourDemand;
  capital: Phase1CapitalDemand;
  /** true once at least one labour OR capital line carries meaningful demand. */
  captured: boolean;
}

/** Labour demand rolled up from a c1 (labourDemand) FormValue. */
export function labourDemandFrom(labourValue: FormValue): Phase1LabourDemand {
  const rows = decodeLabourRows(labourValue.dmLabour);
  const named = rows.filter((r) => r.task.trim() !== '');
  const bySourcingMap = new Map<string, number>();
  named.forEach((r) => {
    if (r.sourcing === '') return;
    bySourcingMap.set(r.sourcing, (bySourcingMap.get(r.sourcing) ?? 0) + r.hoursPerWeek);
  });
  return {
    weeklyHours: named.reduce((s, r) => s + r.hoursPerWeek, 0),
    headcount: named.reduce((s, r) => s + r.people, 0),
    lineCount: named.length,
    bySourcing: Array.from(bySourcingMap, ([sourcing, weeklyHours]) => ({
      sourcing,
      weeklyHours,
    })),
  };
}

/** Capital demand rolled up from a c4 (capitalDemand) FormValue. */
export function capitalDemandFrom(capitalValue: FormValue): Phase1CapitalDemand {
  const rows = decodeCapitalRows(capitalValue.dmCapital);
  const named = rows.filter((r) => r.category.trim() !== '');
  const byChannelMap = new Map<string, number>();
  named.forEach((r) => {
    if (r.channel === '') return;
    byChannelMap.set(r.channel, (byChannelMap.get(r.channel) ?? 0) + r.amount);
  });
  return {
    total: named.reduce((s, r) => s + r.amount, 0),
    lineCount: named.length,
    byChannel: Array.from(byChannelMap, ([channel, amount]) => ({ channel, amount })),
  };
}

/**
 * The full Phase-1 demand baseline -- the join input for the Capacity Bridge.
 * Pure: takes the two persisted FormValues (s7-resource-plan-c1 labour,
 * s7-resource-plan-c4 capital) and rolls them up. `captured` is false when neither
 * side carries a meaningful line, so the bridge can render an honest
 * "demand not yet captured" reading rather than fabricate zeros as data.
 */
export function phase1DemandBaseline(
  labourValue: FormValue,
  capitalValue: FormValue,
): Phase1DemandBaseline {
  const labour = labourDemandFrom(labourValue);
  const capital = capitalDemandFrom(capitalValue);
  return {
    labour,
    capital,
    captured: labour.lineCount > 0 || capital.lineCount > 0,
  };
}

// ===========================================================================
// React component + 2 mode bodies
// ===========================================================================

export interface DemandCaptureProps {
  mode: DemandMode;
  value: FormValue;
  onChange: (next: FormValue) => void;
  /** this capture's own checklist item id (s7-resource-plan-c1 or -c4). */
  itemId: string;
}

export function DemandCapture({
  mode,
  value,
  onChange,
  itemId,
}: DemandCaptureProps): React.JSX.Element {
  void itemId;

  // -- c1: labourDemand -----------------------------------------------------
  if (mode === 'labourDemand') {
    const model = decodeDemand('labourDemand', value) as LabourDemandModel;
    const update = (rows: LabourDemandRow[]): void =>
      onChange(encodeDemand({ kind: 'labourDemand', rows }));
    const baseline = labourDemandFrom(value);
    return (
      <div className={css.root} data-dm-mode="labourDemand">
        <SectionEyebrow>
          Phase 1 labour demand{' '}
          <span className={css.hintInline}>(by task and season)</span>
        </SectionEyebrow>
        <p className={css.modeHint}>
          Record each Phase 1 task with the season it falls in, the headcount and
          weekly labour-hours it needs, and where that labour comes from. This is
          the demand side of the Stratum 1 Capacity Bridge.
        </p>
        <RegisterList<LabourDemandRow>
          items={model.rows}
          ariaLabel="Phase 1 labour demand"
          addLabel="Add labour line"
          emptyHint="No labour lines yet. Add each Phase 1 task with its season, headcount, weekly hours, and sourcing."
          makeEmpty={() => ({
            id: makeRowId(),
            task: '',
            window: '',
            people: 0,
            hoursPerWeek: 0,
            sourcing: '',
          })}
          onChange={update}
          renderRow={(row, _i, patch) => (
            <div className={css.labourRow}>
              <input
                type="text"
                className={css.regInput}
                value={row.task}
                placeholder="Task -- e.g. Bed preparation, Fencing, Nursery care"
                aria-label="Labour task"
                onChange={(e) => patch({ task: e.target.value })}
              />
              <div className={css.rowMeta}>
                <input
                  type="text"
                  className={css.regInput}
                  value={row.window}
                  placeholder="Season / window -- e.g. Spring, Phase 1 Q1"
                  aria-label="Season or window"
                  onChange={(e) => patch({ window: e.target.value })}
                />
                <input
                  type="text"
                  inputMode="numeric"
                  className={css.regNarrow}
                  value={row.people === 0 ? '' : String(row.people)}
                  placeholder="People"
                  aria-label="Headcount"
                  onChange={(e) => patch({ people: asNum(e.target.value) })}
                />
                <input
                  type="text"
                  inputMode="numeric"
                  className={css.regNarrow}
                  value={row.hoursPerWeek === 0 ? '' : String(row.hoursPerWeek)}
                  placeholder="Hrs/wk"
                  aria-label="Hours per week"
                  onChange={(e) => patch({ hoursPerWeek: asNum(e.target.value) })}
                />
              </div>
              <Dropdown
                options={LABOUR_SOURCING_LIST}
                value={row.sourcing}
                placeholder="Sourcing"
                ariaLabel="Labour sourcing"
                onChange={(v) => patch({ sourcing: v })}
              />
            </div>
          )}
        />

        <div className={css.derivedStrip} aria-label="Phase 1 labour demand (display only)">
          <div className={css.derivedItem}>
            <span className={css.derivedNum}>{baseline.weeklyHours}</span>
            <span className={css.derivedLbl}>Hrs / week</span>
          </div>
          <span className={css.derivedOp}>/</span>
          <div className={css.derivedItem}>
            <span className={css.derivedNum}>{baseline.headcount}</span>
            <span className={css.derivedLbl}>People</span>
          </div>
          <StatusPill
            tone={baseline.lineCount > 0 ? 'neutral' : 'warn'}
            label={
              baseline.lineCount > 0
                ? `${baseline.lineCount} line(s)`
                : 'no demand yet'
            }
          />
        </div>

        <FeedsNote>
          Phase 1 labour demand is joined against the steward team{"'"}s declared
          capacity (<strong>Stratum 1, Objective 1.2</strong>) in the Capacity Bridge.
        </FeedsNote>
      </div>
    );
  }

  // -- c4: capitalDemand (channel-tagged; closed Amanah enum) ---------------
  const model = decodeDemand('capitalDemand', value) as CapitalDemandModel;
  const update = (rows: CapitalDemandRow[]): void =>
    onChange(encodeDemand({ kind: 'capitalDemand', rows }));
  const baseline = capitalDemandFrom(value);
  return (
    <div className={css.root} data-dm-mode="capitalDemand">
      <div className={css.warnBlock}>
        <ShieldAlert size={15} className={css.warnIcon} aria-hidden="true" />
        <div className={css.warnTxt}>{CAPITAL_SCOPE_NOTES}</div>
      </div>

      <SectionEyebrow>
        Phase 1 capital demand{' '}
        <span className={css.hintInline}>(by category and funding channel)</span>
      </SectionEyebrow>
      <p className={css.modeHint}>
        Record each Phase 1 capital category with the amount required and the
        permitted funding channel it will be met from.
      </p>
      <RegisterList<CapitalDemandRow>
        items={model.rows}
        ariaLabel="Phase 1 capital demand"
        addLabel="Add capital line"
        emptyHint="No capital lines yet. Add each category with its amount and a permitted funding channel."
        makeEmpty={() => ({
          id: makeRowId(),
          category: '',
          amount: 0,
          channel: '',
        })}
        onChange={update}
        renderRow={(row, _i, patch) => (
          <div className={css.capitalRow}>
            <input
              type="text"
              className={css.regInput}
              value={row.category}
              placeholder="Category -- e.g. Infrastructure, Equipment, Working capital"
              aria-label="Capital category"
              onChange={(e) => patch({ category: e.target.value })}
            />
            <div className={css.rowMeta}>
              <input
                type="text"
                inputMode="decimal"
                className={css.regInput}
                value={row.amount === 0 ? '' : String(row.amount)}
                placeholder="Amount"
                aria-label="Capital amount"
                onChange={(e) => patch({ amount: asNum(e.target.value) })}
              />
              <Dropdown
                options={CAPITAL_CHANNEL_LIST}
                value={row.channel}
                placeholder="Funding channel"
                ariaLabel="Funding channel"
                onChange={(v) => patch({ channel: v })}
              />
            </div>
          </div>
        )}
      />

      <div className={css.derivedStrip} aria-label="Phase 1 capital demand (display only)">
        <div className={css.derivedItem}>
          <span className={css.derivedNum}>{baseline.total}</span>
          <span className={css.derivedLbl}>Total capital</span>
        </div>
        <StatusPill
          tone={baseline.lineCount > 0 ? 'neutral' : 'warn'}
          label={
            baseline.lineCount > 0
              ? `${baseline.lineCount} line(s), ${baseline.byChannel.length} channel(s)`
              : 'no demand yet'
          }
        />
      </div>

      <FeedsNote>
        Capital demand by category and funding channel feeds the{' '}
        <strong>Capacity Bridge</strong> alongside the labour demand and the
        steward team{"'"}s declared resources (Stratum 1, Objective 1.2).
      </FeedsNote>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

/** Feeds callout (mockup `.fb`). */
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

export default DemandCapture;
