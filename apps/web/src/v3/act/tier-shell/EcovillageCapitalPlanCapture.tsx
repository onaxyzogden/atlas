/**
 * EcovillageCapitalPlanCapture -- a multi-mode CONTROLLED capture for the
 * ecovillage objective ev-s7-financial-plan ("A sound communal financial plan &
 * contribution schedule", ref EV-S7.5, 6 checklist items). Catalogue checklist
 * order is c1,c2,c3,c4,c6,c5 but the mode mapper keys by EXACT item-id slice, not
 * array position. Six modes, one per checklist item:
 *
 *   c1 -> capitalRequirement   (total Phase 1 capital requirement + optional
 *                               line-item breakdown register)
 *   c2 -> contributionSchedule (per-contributor schedule: source label, capital
 *                               channel, amount, payment date, default consequence;
 *                               display-only "scheduled vs required" strip from c1)
 *   c3 -> fundStructure        (communal fund holding structure + control note)
 *   c4 -> reportingSchedule    (reporting cadence + recipients + format)
 *   c6 -> governanceConfirm    (confirm fund holding + reporting follow the
 *                               Stratum 1 financial governance rules -- soft gate)
 *   c5 -> contributionCommitment (confirm ALL founding member contributions are
 *                               committed before construction begins -- HARD gate)
 *
 * Structure mirrors SettlementPlanCapture / OnboardingCapture: a
 * `capitalPlanModeFor(itemId)` mapper plus a single component that renders ONE
 * mode body. The third-column host (DecisionWorkingPanel) owns the eyebrow /
 * title / hint / Record-Defer chrome and the gate-note; this capture renders ONLY
 * the scrollable mode body.
 *
 * ADVISORY / pure: the model is derived from decode(value) each render; the full
 * next model is emitted via onChange(encode(next)). NO local state for persisted
 * values, NO projectId, writes NOTHING to any store. The c2 mode reads the c1
 * sibling FormValue (display-only "scheduled vs required" strip) from the
 * `siblingValues` prop -- no live coupling, no write.
 *
 * decode is TOTAL / defensive: never throws, never fabricates seed/demo data. An
 * empty FormValue yields an empty requirement, empty registers, blank selects, and
 * un-acknowledged c5/c6 gates. Register entries are JSON rows (JSON.stringify /
 * parse per entry, try/catch, legacy-<i> id fallback) mirroring SettlementPlan.
 *
 * AMANAH / covenant (CSRA model erased 2026-05-04 on fiqh grounds -- bay" ma laysa
 * "indak): the capital-channel enum is the STRUCTURAL guardrail. It carries ONLY
 * the permitted channels transcribed verbatim from the CSRA-erasure record
 * (wiki/decisions/2026-05-09-atlas-csra-erasure.md): communal member contribution
 * (cost-share among co-owners), charitable donation, restricted donation, qard
 * hasan (interest-free loan), in-kind contribution, sponsorship. There is NO
 * advance-purchase / member-share / salam option anywhere in the type -- it cannot
 * be selected because it does not exist. CAPITAL_SCOPE_NOTES restates that boundary
 * verbatim (member contributions are cost-sharing among co-owners, NOT advance sale
 * of future yield; any future yield-share is a membership benefit under Scholar
 * Council review). The public-facing label for capital contributors -- "capital
 * partners & allies" -- is used verbatim. No instrument is created, priced, or sold;
 * the capture records the operator's plan.
 *
 * ASCII-only: em-dash -> " -- ". Apostrophes use double-quoted JS strings. All
 * icons are lucide.
 */

import * as React from 'react';
import { ArrowRight, Landmark, ShieldAlert } from 'lucide-react';

import type { FormValue } from './actToolCatalog.js';
import {
  AmountRow,
  Dropdown,
  RegisterList,
  SectionEyebrow,
  StatusPill,
} from './captures/controls/index.js';
import css from './EcovillageCapitalPlanCapture.module.css';

// ---------------------------------------------------------------------------
// Mode mapper
// ---------------------------------------------------------------------------

export type CapitalPlanMode =
  | 'capitalRequirement' // c1
  | 'contributionSchedule' // c2
  | 'fundStructure' // c3
  | 'reportingSchedule' // c4
  | 'governanceConfirm' // c6
  | 'contributionCommitment'; // c5

export const CAPITAL_PLAN_PREFIX = 'ev-s7-financial-plan';
const PREFIX_DASH = CAPITAL_PLAN_PREFIX + '-';

export function capitalPlanModeFor(itemId: string): CapitalPlanMode | null {
  if (!itemId.startsWith(PREFIX_DASH)) return null;
  switch (itemId.slice(PREFIX_DASH.length)) {
    case 'c1':
      return 'capitalRequirement';
    case 'c2':
      return 'contributionSchedule';
    case 'c3':
      return 'fundStructure';
    case 'c4':
      return 'reportingSchedule';
    case 'c6':
      return 'governanceConfirm';
    case 'c5':
      return 'contributionCommitment';
    default:
      return null;
  }
}

/** Sibling item id the contributionSchedule mode reads for its display strip. */
export const CAPITAL_REQUIREMENT_ITEM_ID = 'ev-s7-financial-plan-c1';

// ---------------------------------------------------------------------------
// Verbatim canonical content (never reword)
// ---------------------------------------------------------------------------

/**
 * Amanah boundary -- assembled VERBATIM from the CSRA-erasure record
 * (wiki/decisions/2026-05-09-atlas-csra-erasure.md) and the global covenant. NOT
 * an objective scopeNote (ev-s7-financial-plan carries none); this is the covenant
 * guardrail restated at the capital-channel surface.
 */
export const CAPITAL_SCOPE_NOTES =
  'Member contributions are cost-sharing among members who collectively own the asset -- not advance sale of future yield. Permitted channels only: communal member contribution, charitable donation, restricted donation, qard hasan (interest-free loan), in-kind contribution, sponsorship. Any future yield-share is a membership benefit under Scholar Council review, never an advance purchase.';

/**
 * Permitted capital channels -- transcribed VERBATIM from the CSRA-erasure record
 * (charitable donation, restricted donation, qard hasan, in-kind contribution,
 * sponsorship) plus the ecovillage communal member contribution (cost-share among
 * co-owners). This list is the STRUCTURAL Amanah guardrail: there is NO
 * advance-purchase / member-share / salam channel because none exists here.
 */
export const CAPITAL_CHANNEL_LIST: readonly string[] = [
  'Member contribution -- communal cost-share',
  'Charitable donation',
  'Restricted donation',
  'Qard hasan -- interest-free loan',
  'In-kind contribution',
  'Sponsorship',
];

/** Communal fund holding structures (c3) -- verbatim from the catalogue label. */
export const FUND_STRUCTURE_LIST: readonly string[] = [
  'Dedicated communal bank account',
  'Trust',
  'Escrow account',
];

/** Financial reporting cadences to members (c4). */
export const REPORTING_CADENCE_LIST: readonly string[] = [
  'Monthly',
  'Quarterly',
  'Twice yearly',
  'Annually',
];

// ---------------------------------------------------------------------------
// Register row models (JSON-row persisted; see decode/encode)
// ---------------------------------------------------------------------------

export interface BreakdownRow {
  id: string;
  /** capital line item, e.g. "Water system", "Access road" */
  label: string;
  /** line-item cost (plain numeric; project currency) */
  amount: number;
}

export interface ContributionRow {
  id: string;
  /** contributing party -- a founding member, or a capital partner / ally */
  contributor: string;
  /** capital channel (constrained to CAPITAL_CHANNEL_LIST) */
  channel: string;
  /** committed contribution amount (plain numeric; project currency) */
  amount: number;
  /** scheduled payment date YYYY-MM-DD */
  dateISO: string;
  /** stated consequence of a missed / defaulted contribution */
  consequence: string;
}

// ---------------------------------------------------------------------------
// Mode models
// ---------------------------------------------------------------------------

export interface CapitalRequirementModel {
  kind: 'capitalRequirement';
  /** total Phase 1 capital requirement (plain numeric; project currency) */
  total: number;
  /** optional line-item breakdown that composes the total */
  rows: BreakdownRow[];
}

export interface ContributionScheduleModel {
  kind: 'contributionSchedule';
  rows: ContributionRow[];
}

export interface FundStructureModel {
  kind: 'fundStructure';
  /** holding structure (constrained to FUND_STRUCTURE_LIST) */
  structure: string;
  /** who controls / signs on the communal fund */
  control: string;
}

export interface ReportingScheduleModel {
  kind: 'reportingSchedule';
  /** reporting cadence (constrained to REPORTING_CADENCE_LIST) */
  cadence: string;
  /** who receives the reports (defaults to all members) */
  recipients: string;
  /** what each report contains */
  format: string;
}

export interface GovernanceConfirmModel {
  kind: 'governanceConfirm';
  /** confirm fund holding + reporting follow Stratum 1 financial governance. */
  confirmed: boolean;
}

export interface ContributionCommitmentModel {
  kind: 'contributionCommitment';
  /** HARD gate: ALL founding member contributions committed before construction. */
  allCommitted: boolean;
}

export type CapitalPlanModel =
  | CapitalRequirementModel
  | ContributionScheduleModel
  | FundStructureModel
  | ReportingScheduleModel
  | GovernanceConfirmModel
  | ContributionCommitmentModel;

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

function asBool(v: FormValue[string] | undefined): boolean {
  return asStr(v) === 'on';
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

function decodeBreakdownRows(v: FormValue[string] | undefined): BreakdownRow[] {
  const out: BreakdownRow[] = [];
  asJsonArr(v).forEach((entry, i) => {
    try {
      const parsed = JSON.parse(entry) as Partial<BreakdownRow>;
      const amount = Number(parsed.amount);
      out.push({
        id: typeof parsed.id === 'string' && parsed.id ? parsed.id : `legacy-${i}`,
        label: typeof parsed.label === 'string' ? parsed.label : '',
        amount: Number.isFinite(amount) && amount >= 0 ? amount : 0,
      });
    } catch {
      out.push({ id: `legacy-${i}`, label: entry, amount: 0 });
    }
  });
  return out;
}

function decodeContributionRows(v: FormValue[string] | undefined): ContributionRow[] {
  const out: ContributionRow[] = [];
  asJsonArr(v).forEach((entry, i) => {
    try {
      const parsed = JSON.parse(entry) as Partial<ContributionRow>;
      const amount = Number(parsed.amount);
      out.push({
        id: typeof parsed.id === 'string' && parsed.id ? parsed.id : `legacy-${i}`,
        contributor: typeof parsed.contributor === 'string' ? parsed.contributor : '',
        channel: constrain(
          typeof parsed.channel === 'string' ? parsed.channel : '',
          CAPITAL_CHANNEL_LIST,
        ),
        amount: Number.isFinite(amount) && amount >= 0 ? amount : 0,
        dateISO: typeof parsed.dateISO === 'string' ? parsed.dateISO : '',
        consequence: typeof parsed.consequence === 'string' ? parsed.consequence : '',
      });
    } catch {
      out.push({
        id: `legacy-${i}`,
        contributor: entry,
        channel: '',
        amount: 0,
        dateISO: '',
        consequence: '',
      });
    }
  });
  return out;
}

// ---------------------------------------------------------------------------
// Pure derived helpers (display-only; consumed by the c2 "vs required" strip)
// ---------------------------------------------------------------------------

/** Total Phase 1 capital requirement decoded from a c1 FormValue. */
export function capitalRequiredFrom(requirementValue: FormValue): number {
  return asNum(requirementValue.cpTotal);
}

/** Total scheduled contributions decoded from a c2 FormValue. */
export function scheduledContributionsFrom(scheduleValue: FormValue): number {
  return decodeContributionRows(scheduleValue.cpSchedule).reduce(
    (sum, r) => sum + (Number.isFinite(r.amount) ? r.amount : 0),
    0,
  );
}

// ---------------------------------------------------------------------------
// decode: FormValue -> CapitalPlanModel (TOTAL / defensive)
// ---------------------------------------------------------------------------

export function decodeCapitalPlan(
  mode: CapitalPlanMode,
  value: FormValue,
): CapitalPlanModel {
  switch (mode) {
    case 'capitalRequirement':
      return {
        kind: 'capitalRequirement',
        total: asNum(value.cpTotal),
        rows: decodeBreakdownRows(value.cpBreakdown),
      };
    case 'contributionSchedule':
      return {
        kind: 'contributionSchedule',
        rows: decodeContributionRows(value.cpSchedule),
      };
    case 'fundStructure':
      return {
        kind: 'fundStructure',
        structure: constrain(asStr(value.cpStructure), FUND_STRUCTURE_LIST),
        control: asStr(value.cpControl),
      };
    case 'reportingSchedule':
      return {
        kind: 'reportingSchedule',
        cadence: constrain(asStr(value.cpCadence), REPORTING_CADENCE_LIST),
        recipients: asStr(value.cpRecipients),
        format: asStr(value.cpFormat),
      };
    case 'governanceConfirm':
      return {
        kind: 'governanceConfirm',
        confirmed: asBool(value.cpGovernanceAck),
      };
    case 'contributionCommitment':
      return {
        kind: 'contributionCommitment',
        allCommitted: asBool(value.cpCommitmentAck),
      };
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown CapitalPlanMode: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// encode: CapitalPlanModel -> FormValue (lossless inverse of decode)
// ---------------------------------------------------------------------------

export function encodeCapitalPlan(model: CapitalPlanModel): FormValue {
  switch (model.kind) {
    case 'capitalRequirement':
      return {
        cpTotal: String(model.total),
        cpBreakdown: model.rows.map((r) => JSON.stringify(r)),
      };
    case 'contributionSchedule':
      return { cpSchedule: model.rows.map((r) => JSON.stringify(r)) };
    case 'fundStructure':
      return { cpStructure: model.structure, cpControl: model.control };
    case 'reportingSchedule':
      return {
        cpCadence: model.cadence,
        cpRecipients: model.recipients,
        cpFormat: model.format,
      };
    case 'governanceConfirm':
      return { cpGovernanceAck: model.confirmed ? 'on' : 'off' };
    case 'contributionCommitment':
      return { cpCommitmentAck: model.allCommitted ? 'on' : 'off' };
    default: {
      const _exhaustive: never = model;
      throw new Error(`Unknown CapitalPlanModel kind: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// validity gates
// ---------------------------------------------------------------------------

export function isCapitalPlanValid(
  mode: CapitalPlanMode,
  value: FormValue,
): boolean {
  switch (mode) {
    case 'capitalRequirement': {
      const m = decodeCapitalPlan('capitalRequirement', value) as CapitalRequirementModel;
      // The total (or, failing that, a positive breakdown) must be set.
      return m.total > 0 || m.rows.some((r) => r.amount > 0);
    }
    case 'contributionSchedule': {
      const m = decodeCapitalPlan('contributionSchedule', value) as ContributionScheduleModel;
      return m.rows.some((r) => r.contributor.trim() !== '' && r.channel !== '');
    }
    case 'fundStructure': {
      const m = decodeCapitalPlan('fundStructure', value) as FundStructureModel;
      return m.structure !== '';
    }
    case 'reportingSchedule': {
      const m = decodeCapitalPlan('reportingSchedule', value) as ReportingScheduleModel;
      return m.cadence !== '';
    }
    case 'governanceConfirm': {
      const m = decodeCapitalPlan('governanceConfirm', value) as GovernanceConfirmModel;
      // Soft gate: cannot record until the Stratum 1 governance rules are confirmed.
      return m.confirmed;
    }
    case 'contributionCommitment': {
      const m = decodeCapitalPlan('contributionCommitment', value) as ContributionCommitmentModel;
      // HARD gate: not recordable until ALL founding contributions are committed.
      return m.allCommitted;
    }
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown CapitalPlanMode: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// summaries (defensive; never throw; handle empty value)
// ---------------------------------------------------------------------------

export function summariseCapitalPlan(
  mode: CapitalPlanMode,
  value: FormValue,
  siblingValues: Record<string, FormValue> = {},
): string {
  switch (mode) {
    case 'capitalRequirement': {
      const m = decodeCapitalPlan('capitalRequirement', value) as CapitalRequirementModel;
      const lined = m.rows.filter((r) => r.label.trim() !== '').length;
      return `Total Phase 1 capital ${m.total}; ${lined} line item(s)`;
    }
    case 'contributionSchedule': {
      const m = decodeCapitalPlan('contributionSchedule', value) as ContributionScheduleModel;
      const scheduled = scheduledContributionsFrom(value);
      const required = capitalRequiredFrom(siblingValues[CAPITAL_REQUIREMENT_ITEM_ID] ?? {});
      const required_clause = required > 0 ? ` of ${required} required` : '';
      return `${m.rows.length} contribution(s), scheduled ${scheduled}${required_clause}`;
    }
    case 'fundStructure': {
      const m = decodeCapitalPlan('fundStructure', value) as FundStructureModel;
      return m.structure ? `Communal fund held via ${m.structure}` : 'No fund structure chosen';
    }
    case 'reportingSchedule': {
      const m = decodeCapitalPlan('reportingSchedule', value) as ReportingScheduleModel;
      const to = m.recipients.trim() !== '' ? m.recipients.trim() : 'all members';
      return m.cadence ? `${m.cadence} reporting to ${to}` : 'No reporting cadence set';
    }
    case 'governanceConfirm': {
      const m = decodeCapitalPlan('governanceConfirm', value) as GovernanceConfirmModel;
      return m.confirmed
        ? 'Stratum 1 financial governance rules confirmed'
        : 'Stratum 1 financial governance rules not yet confirmed';
    }
    case 'contributionCommitment': {
      const m = decodeCapitalPlan('contributionCommitment', value) as ContributionCommitmentModel;
      return m.allCommitted
        ? 'All founding contributions committed before construction'
        : 'Founding contributions not yet all committed';
    }
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown CapitalPlanMode: ${String(_exhaustive)}`);
    }
  }
}

// ===========================================================================
// React component + 6 mode bodies
// ===========================================================================

export interface EcovillageCapitalPlanCaptureProps {
  mode: CapitalPlanMode;
  value: FormValue;
  onChange: (next: FormValue) => void;
  /** this capture's own checklist item id (e.g. ev-s7-financial-plan-c1). */
  itemId: string;
  /** full per-item FormValue map; contributionSchedule (c2) reads c1. */
  siblingValues?: Record<string, FormValue>;
}

export function EcovillageCapitalPlanCapture({
  mode,
  value,
  onChange,
  itemId,
  siblingValues = {},
}: EcovillageCapitalPlanCaptureProps): React.JSX.Element {
  void itemId;

  // -- c1: capitalRequirement ----------------------------------------------
  if (mode === 'capitalRequirement') {
    const model = decodeCapitalPlan('capitalRequirement', value) as CapitalRequirementModel;
    const set = (patch: Partial<CapitalRequirementModel>): void =>
      onChange(encodeCapitalPlan({ ...model, ...patch }));
    const update = (rows: BreakdownRow[]): void =>
      onChange(encodeCapitalPlan({ ...model, rows }));
    const breakdownTotal = model.rows.reduce((s, r) => s + r.amount, 0);
    return (
      <div className={css.root} data-cp-mode="capitalRequirement">
        <SectionEyebrow>Total Phase 1 capital requirement</SectionEyebrow>
        <AmountRow
          label="Total founding infrastructure capital required"
          value={model.total === 0 ? '' : String(model.total)}
          onChange={(raw) => set({ total: asNum(raw) })}
          placeholder="0"
          interpretation={
            breakdownTotal > 0 && breakdownTotal !== model.total ? (
              <span className={css.modeHint}>
                Line items sum to {breakdownTotal} -- adjust the total or the
                breakdown so they agree.
              </span>
            ) : null
          }
        />
        <SectionEyebrow>
          Capital line items{' '}
          <span className={css.hintInline}>(optional breakdown of the total)</span>
        </SectionEyebrow>
        <RegisterList<BreakdownRow>
          items={model.rows}
          ariaLabel="Capital line items"
          addLabel="Add line item"
          emptyHint="No line items yet. Break the total into the infrastructure items it funds, or leave it as a single total."
          makeEmpty={() => ({ id: makeRowId(), label: '', amount: 0 })}
          onChange={update}
          renderRow={(row, _i, patch) => (
            <div className={css.regRow}>
              <input
                type="text"
                className={css.regInput}
                value={row.label}
                placeholder="Capital line item -- e.g. Water system, Access road"
                aria-label="Capital line item"
                onChange={(e) => patch({ label: e.target.value })}
              />
              <input
                type="text"
                inputMode="decimal"
                className={css.regInput}
                value={row.amount === 0 ? '' : String(row.amount)}
                placeholder="Cost"
                aria-label="Line item cost"
                onChange={(e) => patch({ amount: asNum(e.target.value) })}
              />
            </div>
          )}
        />
        <FeedsNote>
          The total capital requirement anchors the{' '}
          <strong>contribution schedule</strong> -- scheduled contributions are
          checked against it.
        </FeedsNote>
      </div>
    );
  }

  // -- c2: contributionSchedule (channel-tagged; vs-required strip) ---------
  if (mode === 'contributionSchedule') {
    const model = decodeCapitalPlan('contributionSchedule', value) as ContributionScheduleModel;
    const update = (rows: ContributionRow[]): void =>
      onChange(encodeCapitalPlan({ kind: 'contributionSchedule', rows }));
    const scheduled = scheduledContributionsFrom(value);
    const required = capitalRequiredFrom(siblingValues[CAPITAL_REQUIREMENT_ITEM_ID] ?? {});
    const covered = required > 0 && scheduled >= required;
    return (
      <div className={css.root} data-cp-mode="contributionSchedule">
        <div className={css.warnBlock}>
          <ShieldAlert size={15} className={css.warnIcon} aria-hidden="true" />
          <div className={css.warnTxt}>{CAPITAL_SCOPE_NOTES}</div>
        </div>

        <SectionEyebrow>
          Contribution schedule{' '}
          <span className={css.hintInline}>
            (founding members and capital partners &amp; allies)
          </span>
        </SectionEyebrow>
        <p className={css.modeHint}>
          Record each contribution with its capital channel, amount, payment date,
          and the stated consequence of a missed contribution.
        </p>
        <RegisterList<ContributionRow>
          items={model.rows}
          ariaLabel="Contribution schedule"
          addLabel="Add contribution"
          emptyHint="No contributions scheduled yet. Add each founding member or capital partner with their channel, amount, and payment date."
          makeEmpty={() => ({
            id: makeRowId(),
            contributor: '',
            channel: '',
            amount: 0,
            dateISO: '',
            consequence: '',
          })}
          onChange={update}
          renderRow={(row, _i, patch) => (
            <div className={css.scheduleRow}>
              <input
                type="text"
                className={css.regInput}
                value={row.contributor}
                placeholder="Contributor -- founding member, or capital partner / ally"
                aria-label="Contributor"
                onChange={(e) => patch({ contributor: e.target.value })}
              />
              <Dropdown
                options={CAPITAL_CHANNEL_LIST}
                value={row.channel}
                placeholder="Capital channel"
                ariaLabel="Capital channel"
                onChange={(v) => patch({ channel: v })}
              />
              <div className={css.scheduleMeta}>
                <input
                  type="text"
                  inputMode="decimal"
                  className={css.regInput}
                  value={row.amount === 0 ? '' : String(row.amount)}
                  placeholder="Amount"
                  aria-label="Contribution amount"
                  onChange={(e) => patch({ amount: asNum(e.target.value) })}
                />
                <input
                  type="date"
                  className={css.dateInput}
                  value={row.dateISO}
                  aria-label="Payment date"
                  onChange={(e) => patch({ dateISO: e.target.value })}
                />
              </div>
              <input
                type="text"
                className={css.regInput}
                value={row.consequence}
                placeholder="Default consequence -- what happens if this contribution is missed"
                aria-label="Default consequence"
                onChange={(e) => patch({ consequence: e.target.value })}
              />
            </div>
          )}
        />

        <div className={css.derivedStrip} aria-label="Scheduled vs required (display only)">
          <div className={css.derivedItem}>
            <span className={css.derivedNum}>{scheduled}</span>
            <span className={css.derivedLbl}>Scheduled</span>
          </div>
          <span className={css.derivedOp}>/</span>
          <div className={css.derivedItem}>
            <span className={css.derivedNum}>{required}</span>
            <span className={css.derivedLbl}>Required</span>
          </div>
          <StatusPill
            tone={required === 0 ? 'neutral' : covered ? 'success' : 'warn'}
            label={
              required === 0
                ? 'set the requirement in c1'
                : covered
                  ? 'fully covered'
                  : 'shortfall'
            }
          />
        </div>

        <FeedsNote>
          Each dated contribution is checked against the{' '}
          <strong>commitment gate</strong> -- all founding contributions must be
          committed before construction begins.
        </FeedsNote>
      </div>
    );
  }

  // -- c3: fundStructure ----------------------------------------------------
  if (mode === 'fundStructure') {
    const model = decodeCapitalPlan('fundStructure', value) as FundStructureModel;
    const set = (patch: Partial<FundStructureModel>): void =>
      onChange(encodeCapitalPlan({ ...model, ...patch }));
    return (
      <div className={css.root} data-cp-mode="fundStructure">
        <SectionEyebrow>Communal fund holding structure</SectionEyebrow>
        <div className={css.row}>
          <span className={css.rowLbl}>
            <Landmark size={13} aria-hidden="true" /> Holding structure
          </span>
          <Dropdown
            options={FUND_STRUCTURE_LIST}
            value={model.structure}
            placeholder="Bank account, trust, or escrow"
            ariaLabel="Communal fund holding structure"
            onChange={(v) => set({ structure: v })}
          />
        </div>
        <SectionEyebrow>Control &amp; signatories</SectionEyebrow>
        <textarea
          className={css.textarea}
          value={model.control}
          placeholder="Who controls and signs on the communal fund? Signatory rules, dual-control, thresholds."
          aria-label="Fund control and signatories"
          rows={3}
          onChange={(e) => set({ control: e.target.value })}
        />
        <FeedsNote>
          Fund holding and signatory control must follow the{' '}
          <strong>Stratum 1 financial governance rules</strong> (confirmed in c6).
        </FeedsNote>
      </div>
    );
  }

  // -- c4: reportingSchedule ------------------------------------------------
  if (mode === 'reportingSchedule') {
    const model = decodeCapitalPlan('reportingSchedule', value) as ReportingScheduleModel;
    const set = (patch: Partial<ReportingScheduleModel>): void =>
      onChange(encodeCapitalPlan({ ...model, ...patch }));
    return (
      <div className={css.root} data-cp-mode="reportingSchedule">
        <SectionEyebrow>Financial reporting schedule to all members</SectionEyebrow>
        <div className={css.row}>
          <span className={css.rowLbl}>Reporting cadence</span>
          <Dropdown
            options={REPORTING_CADENCE_LIST}
            value={model.cadence}
            placeholder="How often"
            ariaLabel="Reporting cadence"
            onChange={(v) => set({ cadence: v })}
          />
        </div>
        <div className={css.rowGroup}>
          <span className={css.rowLbl}>Recipients</span>
          <input
            type="text"
            className={css.regInput}
            value={model.recipients}
            placeholder="Who receives the report -- defaults to all members"
            aria-label="Report recipients"
            onChange={(e) => set({ recipients: e.target.value })}
          />
        </div>
        <div className={css.rowGroup}>
          <span className={css.rowLbl}>Report contents</span>
          <textarea
            className={css.textarea}
            value={model.format}
            placeholder="What each report contains -- fund balance, contributions received, expenditure, reserves."
            aria-label="Report contents"
            rows={3}
            onChange={(e) => set({ format: e.target.value })}
          />
        </div>
        <FeedsNote>
          Transparent reporting to all members is part of the{' '}
          <strong>Stratum 1 financial governance rules</strong> (confirmed in c6).
        </FeedsNote>
      </div>
    );
  }

  // -- c6: governanceConfirm (soft gate) ------------------------------------
  if (mode === 'governanceConfirm') {
    const model = decodeCapitalPlan('governanceConfirm', value) as GovernanceConfirmModel;
    const set = (patch: Partial<GovernanceConfirmModel>): void =>
      onChange(encodeCapitalPlan({ ...model, ...patch }));
    return (
      <div className={css.root} data-cp-mode="governanceConfirm">
        <SectionEyebrow>Stratum 1 financial governance alignment</SectionEyebrow>
        <button
          type="button"
          className={css.confirmRow}
          data-on={model.confirmed}
          aria-pressed={model.confirmed}
          onClick={() => set({ confirmed: !model.confirmed })}
        >
          <span className={css.signDot} aria-hidden="true" />
          <span>
            I confirm fund holding and reporting follow the Stratum 1 financial
            governance rules.
          </span>
        </button>
        <FeedsNote>
          This confirmation binds the fund structure (c3) and reporting schedule
          (c4) to the <strong>Stratum 1 financial governance rules</strong>.
        </FeedsNote>
      </div>
    );
  }

  // -- c5: contributionCommitment (HARD gate) -------------------------------
  const model = decodeCapitalPlan('contributionCommitment', value) as ContributionCommitmentModel;
  const set = (patch: Partial<ContributionCommitmentModel>): void =>
    onChange(encodeCapitalPlan({ ...model, ...patch }));
  return (
    <div className={css.root} data-cp-mode="contributionCommitment">
      <div className={css.warnBlock}>
        <ShieldAlert size={15} className={css.warnIcon} aria-hidden="true" />
        <div className={css.warnTxt}>{CAPITAL_SCOPE_NOTES}</div>
      </div>

      <SectionEyebrow>Contribution commitment before construction</SectionEyebrow>
      <button
        type="button"
        className={css.ackRow}
        data-on={model.allCommitted}
        aria-pressed={model.allCommitted}
        onClick={() => set({ allCommitted: !model.allCommitted })}
      >
        <span className={css.signDot} aria-hidden="true" />
        <span>
          I confirm ALL founding member contributions are committed before
          construction begins.
        </span>
      </button>
      <FeedsNote>
        This is the hard commitment gate -- construction does not start on
        partial funding.
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

export default EcovillageCapitalPlanCapture;
