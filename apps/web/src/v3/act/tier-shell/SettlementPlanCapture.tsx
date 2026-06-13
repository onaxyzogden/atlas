/**
 * SettlementPlanCapture -- a multi-mode CONTROLLED capture for the ecovillage
 * objective ev-s7-settlement-plan ("A ready phased settlement implementation
 * plan", ref EV-S7.4, 6 checklist items). Catalogue checklist order is
 * c1,c2,c3,c4,c6,c5 but the mode mapper keys by EXACT item-id slice, not array
 * position. Six modes, one per checklist item:
 *
 *   c1 -> cohort        (founding cohort composition + arrival date)
 *   c2 -> thresholds    (exact habitability threshold-item register)
 *   c3 -> criteria      (arrival criteria checklist; display-only seeded from c2,
 *                        bakes on first edit -- steward decision 6)
 *   c4 -> schedule      (subsequent cohort arrivals vs. infra milestones)
 *   c6 -> capacityFit   (manual max population + display-only derived cohort
 *                        strip via siblings + confirm toggle -- steward decision 5)
 *   c5 -> enforcement   (who enforces habitability thresholds + NOT-self-reported
 *                        hard-gate acknowledgement -- steward decision 3)
 *
 * Structure mirrors AdaptiveManagementCapture / ProvisionBalanceCapture: a
 * `settlementPlanModeFor(itemId)` mapper plus a single component that renders ONE
 * mode body. The third-column host (DecisionWorkingPanel) owns the eyebrow /
 * title / hint / Record-Defer chrome and the gate-note; this capture renders ONLY
 * the scrollable mode body.
 *
 * ADVISORY / pure: the model is derived from decode(value) each render; the full
 * next model is emitted via onChange(encode(next)). NO local state for persisted
 * values, NO projectId, writes NOTHING to any store. Sibling-aware modes (c3
 * reads c2; c6 reads c2) decode the relevant sibling FormValue from the
 * `siblingValues` prop.
 *
 * decode is TOTAL / defensive: never throws, never fabricates seed/demo data. An
 * empty FormValue yields empty registers, all toggles off, blank selects, and an
 * un-acknowledged c5 gate. Register entries are JSON rows (JSON.stringify/parse
 * per entry, try/catch, legacy-<i> id fallback) mirroring ProvisionBalanceCapture.
 *
 * Display-only-seed-then-bake (steward decisions 5/6): c3 criteria and c6 derived
 * cohort strip seed FROM siblings ONLY until the operator first edits; once a
 * persisted array exists in this capture's own FormValue, the persisted value --
 * even emptied -- always wins over the seed.
 *
 * Amanah / covenant: the habitability + inclusion strings are transcribed
 * VERBATIM. The c5 NOT-self-reported enforcement is a hard gate (steward decision
 * 3): the capture's own validity returns false until the acknowledgement toggle is
 * on, which surfaces the verbatim scopeNotes warn block in the host gate-note. No
 * advance-sale / salam / CSRA framing anywhere -- this objective carries none.
 *
 * Pure adapter export `settlementPhasesFrom(value)` produces
 * CommunitySettlementPhaseInput[] for generateCommunityWorkPlan (Phase 4 consumer);
 * shape is { id, label, dateISO?, complete? }.
 *
 * ASCII-only: em-dash -> " -- ". Apostrophes use double-quoted JS strings. All
 * icons are lucide.
 */

import * as React from 'react';
import { ArrowRight, Check, ShieldAlert, Users } from 'lucide-react';

import { VerifierRole } from '@ogden/shared';
import type { CommunitySettlementPhaseInput, ProofSignatory } from '@ogden/shared';
import type { FormValue } from './actToolCatalog.js';
import {
  Dropdown,
  RegisterList,
  SectionEyebrow,
  StatusPill,
  Stepper,
} from './captures/controls/index.js';
import {
  CARRYING_CAPACITY_PREFIX,
  carryingCapacityAssessed,
  computeSynthesis,
} from './CarryingCapacityCapture.js';
import css from './SettlementPlanCapture.module.css';

// ---------------------------------------------------------------------------
// Mode mapper
// ---------------------------------------------------------------------------

export type SettlementPlanMode =
  | 'cohort' // c1
  | 'thresholds' // c2
  | 'criteria' // c3
  | 'schedule' // c4
  | 'capacityFit' // c6
  | 'enforcement'; // c5

export const SETTLEMENT_PLAN_PREFIX = 'ev-s7-settlement-plan';
const PREFIX_DASH = SETTLEMENT_PLAN_PREFIX + '-';

export function settlementPlanModeFor(itemId: string): SettlementPlanMode | null {
  if (!itemId.startsWith(PREFIX_DASH)) return null;
  switch (itemId.slice(PREFIX_DASH.length)) {
    case 'c1':
      return 'cohort';
    case 'c2':
      return 'thresholds';
    case 'c3':
      return 'criteria';
    case 'c4':
      return 'schedule';
    case 'c6':
      return 'capacityFit';
    case 'c5':
      return 'enforcement';
    default:
      return null;
  }
}

/** Sibling item ids the capacityFit / criteria modes read. */
export const SETTLEMENT_THRESHOLDS_ITEM_ID = 'ev-s7-settlement-plan-c2';

// ---------------------------------------------------------------------------
// Verbatim canonical content (never reword)
// ---------------------------------------------------------------------------

/** EV-S7.4 scopeNotes -- verbatim from ecovillage.ts (c5 enforcement warn). */
export const SETTLEMENT_SCOPE_NOTES =
  'Habitability thresholds must be verified by someone other than the arriving household. Self-certification is not sufficient.';

/** The four named habitability domains from the c2 catalogue prose. */
export const HABITABILITY_DOMAINS: readonly string[] = [
  'Potable water',
  'Shelter',
  'Sanitation',
  'Emergency communications',
];

/** Who-enforces options (c5) -- not self-reported by arriving households. */
export const ENFORCER_OPTION_LIST: readonly string[] = [
  'Independent verifier -- someone other than the arriving household',
  'Steward for the relevant system -- confirms before move-in',
  'Two founding members jointly sign off',
];

/** Recognised verifier roles for the c5 sign-off, EXCLUDING 'self' -- scopeNotes
 *  require habitability be verified by someone OTHER than the arriving household,
 *  so self-certification can never satisfy this gate. Values are VerifierRole
 *  enum slugs (System-1 vocabulary) so the attestation is machine-recognisable. */
export const VERIFIER_ROLE_LIST: readonly string[] = VerifierRole.options.filter(
  (r) => r !== 'self',
);

/** Human labels for the slugs above (display only; the slug is what persists). */
const VERIFIER_ROLE_LABEL: Record<string, string> = {
  peer: 'Peer household',
  steward: 'System steward',
  'external-adviser': 'External adviser',
  independent: 'Independent verifier',
};
const VERIFIER_ROLE_LABEL_LIST: readonly string[] = VERIFIER_ROLE_LIST.map(
  (r) => VERIFIER_ROLE_LABEL[r] ?? r,
);
const SLUG_FOR_VERIFIER_LABEL: Record<string, string> = {};
for (const slug of VERIFIER_ROLE_LIST) {
  SLUG_FOR_VERIFIER_LABEL[VERIFIER_ROLE_LABEL[slug] ?? slug] = slug;
}

/** What the named third-party verifier attests to when they sign the c5 gate. */
const ENFORCEMENT_ATTESTATION =
  'I have verified that the habitability thresholds for this dwelling are met, as ' +
  'someone other than the arriving household. Self-certification was not relied upon.';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

/** Current instant as an ISO-8601 string. Stamped when the verifier signs so the
 *  attestation carries a verifiable time -- upgrading the toggle to a signature. */
function nowIso(): string {
  return new Date().toISOString();
}

/** Format an ISO timestamp's calendar date as "13 Jun 2026" WITHOUT building a
 *  Date (avoids timezone day-shift): reads the YYYY-MM-DD head directly. */
function formatSignedDate(iso: string): string {
  const head = iso.slice(0, 10);
  const [y, m, d] = head.split('-');
  const mi = Number(m) - 1;
  if (!y || !d || Number.isNaN(mi) || mi < 0 || mi > 11) return head;
  return `${Number(d)} ${MONTHS[mi]} ${y}`;
}

// ---------------------------------------------------------------------------
// Register row models (JSON-row persisted; see decode/encode)
// ---------------------------------------------------------------------------

export interface ThresholdRow {
  id: string;
  /** habitability domain (one of HABITABILITY_DOMAINS) or free text */
  domain: string;
  /** the exact threshold item -- verbatim operator text */
  item: string;
}

export interface CriterionRow {
  id: string;
  /** the arrival-criteria line */
  text: string;
  /** confirmed complete + tested + signed off */
  signedOff: boolean;
}

export interface ScheduleRow {
  id: string;
  /** cohort label, e.g. "Cohort 2" */
  cohort: string;
  /** scheduled arrival date YYYY-MM-DD (drives settlement-milestone work) */
  dateISO: string;
  /** household count in this cohort */
  size: number;
  /** infrastructure completion milestone gating this arrival */
  milestone: string;
  /** milestone already reached -> no work generated */
  complete: boolean;
}

// ---------------------------------------------------------------------------
// Mode models
// ---------------------------------------------------------------------------

export interface CohortModel {
  kind: 'cohort';
  /** founding cohort composition (free text / household summary) */
  composition: string;
  /** founding arrival date YYYY-MM-DD */
  arrivalISO: string;
  /** founding household count */
  households: number;
}

export interface ThresholdsModel {
  kind: 'thresholds';
  rows: ThresholdRow[];
}

export interface CriteriaModel {
  kind: 'criteria';
  rows: CriterionRow[];
  /** true once the operator has touched this register (persisted exists). */
  baked: boolean;
}

export interface ScheduleModel {
  kind: 'schedule';
  rows: ScheduleRow[];
}

export interface CapacityFitModel {
  kind: 'capacityFit';
  /** manual Stratum-2 maximum sustainable population (steward decision 5). */
  maxPopulation: number;
  /** operator confirms scheduled sizes stay within the maximum. */
  confirmed: boolean;
}

export interface EnforcementModel {
  kind: 'enforcement';
  /** who enforces habitability thresholds (constrained to ENFORCER list). */
  enforcer: string;
  /** hard-gate acknowledgement (steward decision 3): NOT self-reported. */
  notSelfReportedAck: boolean;
  /** F1: the named third-party verifier who signs the habitability check. */
  verifierName: string;
  /** F1: the verifier's role (VerifierRole enum slug; never 'self'). */
  verifierRole: string;
  /** F1: ISO timestamp stamped in-app when the verifier signs. */
  verifiedAt: string;
}

export type SettlementPlanModel =
  | CohortModel
  | ThresholdsModel
  | CriteriaModel
  | ScheduleModel
  | CapacityFitModel
  | EnforcementModel;

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

function decodeThresholdRows(v: FormValue[string] | undefined): ThresholdRow[] {
  const out: ThresholdRow[] = [];
  asJsonArr(v).forEach((entry, i) => {
    try {
      const parsed = JSON.parse(entry) as Partial<ThresholdRow>;
      out.push({
        id: typeof parsed.id === 'string' && parsed.id ? parsed.id : `legacy-${i}`,
        domain: typeof parsed.domain === 'string' ? parsed.domain : '',
        item: typeof parsed.item === 'string' ? parsed.item : '',
      });
    } catch {
      out.push({ id: `legacy-${i}`, domain: '', item: entry });
    }
  });
  return out;
}

function decodeCriterionRows(v: FormValue[string] | undefined): CriterionRow[] {
  const out: CriterionRow[] = [];
  asJsonArr(v).forEach((entry, i) => {
    try {
      const parsed = JSON.parse(entry) as Partial<CriterionRow>;
      out.push({
        id: typeof parsed.id === 'string' && parsed.id ? parsed.id : `legacy-${i}`,
        text: typeof parsed.text === 'string' ? parsed.text : '',
        signedOff: parsed.signedOff === true,
      });
    } catch {
      out.push({ id: `legacy-${i}`, text: entry, signedOff: false });
    }
  });
  return out;
}

function decodeScheduleRows(v: FormValue[string] | undefined): ScheduleRow[] {
  const out: ScheduleRow[] = [];
  asJsonArr(v).forEach((entry, i) => {
    try {
      const parsed = JSON.parse(entry) as Partial<ScheduleRow>;
      const size = Number(parsed.size);
      out.push({
        id: typeof parsed.id === 'string' && parsed.id ? parsed.id : `legacy-${i}`,
        cohort: typeof parsed.cohort === 'string' ? parsed.cohort : '',
        dateISO: typeof parsed.dateISO === 'string' ? parsed.dateISO : '',
        size: Number.isFinite(size) && size >= 0 ? size : 0,
        milestone: typeof parsed.milestone === 'string' ? parsed.milestone : '',
        complete: parsed.complete === true,
      });
    } catch {
      out.push({
        id: `legacy-${i}`,
        cohort: entry,
        dateISO: '',
        size: 0,
        milestone: '',
        complete: false,
      });
    }
  });
  return out;
}

// ---------------------------------------------------------------------------
// Seed builders (display-only; consumed only until the operator first edits)
// ---------------------------------------------------------------------------

/**
 * Seed arrival-criteria rows (c3) FROM the c2 threshold register: one criterion
 * per recorded threshold item, all un-signed-off. Display-only -- never written
 * unless the operator edits (see decodeSettlementPlan 'criteria').
 */
export function criteriaSeedFrom(thresholdsValue: FormValue): CriterionRow[] {
  return decodeThresholdRows(thresholdsValue.spThresholds).map((t, i) => ({
    id: `seed-${i}`,
    text:
      t.domain && t.item
        ? `${t.domain}: ${t.item} -- confirmed complete, tested, signed off`
        : (t.item || t.domain || '') + ' -- confirmed complete, tested, signed off',
    signedOff: false,
  }));
}

/** Total scheduled household count derived from a c4 schedule FormValue. */
export function scheduledPopulationFrom(scheduleValue: FormValue): number {
  return decodeScheduleRows(scheduleValue.spSchedule).reduce(
    (sum, r) => sum + (Number.isFinite(r.size) ? r.size : 0),
    0,
  );
}

/**
 * c6 effective maximum sustainable population. "Derived replaces manual"
 * (R3 P1): when the Stratum 2 ev-s2-carrying-capacity assessment carries real
 * operator inputs, the synthesised ceiling (minPeople, with its binding
 * constraint) is authoritative and the manual stepper is hidden; otherwise fall
 * back to the hand-entered spMaxPopulation. The derived value is RECOMPUTED ON
 * READ from the carrying-capacity siblings -- never persisted into
 * spMaxPopulation -- so it can never go stale against a later carrying-capacity
 * edit (same display-only-derived discipline as the c3/c6 strips). We gate on
 * carryingCapacityAssessed (NOT on computeSynthesis returning a number, which it
 * always does via demo-fallback defaults) so a fresh project never inherits the
 * carrying-capacity demo ceiling. Pure: no store, no Date.now().
 */
export function capacityFitEffectiveMax(
  value: FormValue,
  siblingValues: Record<string, FormValue> = {},
): { max: number; derived: boolean; bindingName?: string } {
  if (carryingCapacityAssessed(siblingValues, CARRYING_CAPACITY_PREFIX)) {
    const syn = computeSynthesis(siblingValues, CARRYING_CAPACITY_PREFIX);
    return { max: syn.minPeople, derived: true, bindingName: syn.bindingName };
  }
  return { max: asNum(value.spMaxPopulation), derived: false };
}

// ---------------------------------------------------------------------------
// decode: FormValue -> SettlementPlanModel (TOTAL / defensive)
// ---------------------------------------------------------------------------

export function decodeSettlementPlan(
  mode: SettlementPlanMode,
  value: FormValue,
  siblingValues: Record<string, FormValue> = {},
): SettlementPlanModel {
  switch (mode) {
    case 'cohort':
      return {
        kind: 'cohort',
        composition: asStr(value.spComposition),
        arrivalISO: asStr(value.spArrivalISO),
        households: asNum(value.spHouseholds),
      };
    case 'thresholds':
      return { kind: 'thresholds', rows: decodeThresholdRows(value.spThresholds) };
    case 'criteria': {
      // Display-only seed (steward decision 6): the persisted value -- even an
      // emptied array -- always wins over the seed once it exists.
      const persisted = Array.isArray(value.spCriteria);
      if (persisted) {
        return {
          kind: 'criteria',
          rows: decodeCriterionRows(value.spCriteria),
          baked: true,
        };
      }
      const siblingThresholds = siblingValues[SETTLEMENT_THRESHOLDS_ITEM_ID] ?? {};
      return {
        kind: 'criteria',
        rows: criteriaSeedFrom(siblingThresholds),
        baked: false,
      };
    }
    case 'schedule':
      return { kind: 'schedule', rows: decodeScheduleRows(value.spSchedule) };
    case 'capacityFit':
      return {
        kind: 'capacityFit',
        maxPopulation: asNum(value.spMaxPopulation),
        confirmed: asBool(value.spCapacityConfirmed),
      };
    case 'enforcement':
      return {
        kind: 'enforcement',
        enforcer: constrain(asStr(value.spEnforcer), ENFORCER_OPTION_LIST),
        notSelfReportedAck: asBool(value.spNotSelfReportedAck),
        verifierName: asStr(value.spVerifierName),
        // constrain drops any unknown / legacy / 'self' value to '' (gate fails).
        verifierRole: constrain(asStr(value.spVerifierRole), VERIFIER_ROLE_LIST),
        verifiedAt: asStr(value.spVerifiedAt),
      };
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown SettlementPlanMode: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// encode: SettlementPlanModel -> FormValue (lossless inverse of decode)
// ---------------------------------------------------------------------------

export function encodeSettlementPlan(model: SettlementPlanModel): FormValue {
  switch (model.kind) {
    case 'cohort':
      return {
        spComposition: model.composition,
        spArrivalISO: model.arrivalISO,
        spHouseholds: String(model.households),
      };
    case 'thresholds':
      return { spThresholds: model.rows.map((r) => JSON.stringify(r)) };
    case 'criteria':
      // Writing the register bakes it (persisted array now exists).
      return { spCriteria: model.rows.map((r) => JSON.stringify(r)) };
    case 'schedule':
      return { spSchedule: model.rows.map((r) => JSON.stringify(r)) };
    case 'capacityFit':
      return {
        spMaxPopulation: String(model.maxPopulation),
        spCapacityConfirmed: model.confirmed ? 'on' : 'off',
      };
    case 'enforcement':
      return {
        spEnforcer: model.enforcer,
        spNotSelfReportedAck: model.notSelfReportedAck ? 'on' : 'off',
        spVerifierName: model.verifierName,
        spVerifierRole: model.verifierRole,
        spVerifiedAt: model.verifiedAt,
      };
    default: {
      const _exhaustive: never = model;
      throw new Error(`Unknown SettlementPlanModel kind: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// validity gates (sibling-aware where the mode reads siblings)
// ---------------------------------------------------------------------------

export function isSettlementPlanValid(
  mode: SettlementPlanMode,
  value: FormValue,
  siblingValues: Record<string, FormValue> = {},
): boolean {
  switch (mode) {
    case 'cohort': {
      const m = decodeSettlementPlan('cohort', value) as CohortModel;
      return m.composition.trim() !== '' && m.arrivalISO !== '';
    }
    case 'thresholds': {
      const m = decodeSettlementPlan('thresholds', value) as ThresholdsModel;
      return m.rows.some((r) => r.item.trim() !== '' || r.domain.trim() !== '');
    }
    case 'criteria': {
      const m = decodeSettlementPlan('criteria', value, siblingValues) as CriteriaModel;
      return m.rows.some((r) => r.text.trim() !== '');
    }
    case 'schedule': {
      const m = decodeSettlementPlan('schedule', value) as ScheduleModel;
      return m.rows.some((r) => r.cohort.trim() !== '' || r.dateISO !== '');
    }
    case 'capacityFit': {
      const m = decodeSettlementPlan('capacityFit', value) as CapacityFitModel;
      // "Derived replaces manual" (R3 P1): the maximum comes from the
      // carrying-capacity synthesis when that assessment exists, else the manual
      // stepper. Either way the confirm toggle still gates recording.
      const { max } = capacityFitEffectiveMax(value, siblingValues);
      return max > 0 && m.confirmed;
    }
    case 'enforcement': {
      const m = decodeSettlementPlan('enforcement', value) as EnforcementModel;
      // Steward decision 3 HARD GATE (F1): not recordable until an enforcer is
      // chosen, the not-self-reported acknowledgement is on, AND a NAMED
      // third-party verifier (a recognised non-self role) has signed the
      // habitability check in-app. scopeNotes: "verified by someone other than the
      // arriving household. Self-certification is not sufficient."
      return (
        m.enforcer !== '' &&
        m.notSelfReportedAck &&
        m.verifierName.trim() !== '' &&
        m.verifierRole !== '' &&
        m.verifierRole !== 'self' &&
        m.verifiedAt !== ''
      );
    }
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown SettlementPlanMode: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// summaries (defensive; never throw; handle empty value)
// ---------------------------------------------------------------------------

export function summariseSettlementPlan(
  mode: SettlementPlanMode,
  value: FormValue,
  siblingValues: Record<string, FormValue> = {},
): string {
  switch (mode) {
    case 'cohort': {
      const m = decodeSettlementPlan('cohort', value) as CohortModel;
      return `Founding cohort: ${m.households} household(s), arriving ${m.arrivalISO || 'TBD'}`;
    }
    case 'thresholds': {
      const m = decodeSettlementPlan('thresholds', value) as ThresholdsModel;
      const filled = m.rows.filter((r) => r.item.trim() !== '').length;
      return `${filled} habitability threshold item(s) listed`;
    }
    case 'criteria': {
      const m = decodeSettlementPlan('criteria', value, siblingValues) as CriteriaModel;
      const signed = m.rows.filter((r) => r.signedOff).length;
      return `${m.rows.length} arrival criteria, ${signed} signed off`;
    }
    case 'schedule': {
      const m = decodeSettlementPlan('schedule', value) as ScheduleModel;
      const dated = m.rows.filter((r) => r.dateISO !== '' && !r.complete).length;
      return `${m.rows.length} cohort(s) scheduled, ${dated} with a dated milestone`;
    }
    case 'capacityFit': {
      const m = decodeSettlementPlan('capacityFit', value) as CapacityFitModel;
      const { max, derived, bindingName } = capacityFitEffectiveMax(
        value,
        siblingValues,
      );
      const scheduled = scheduledPopulationFrom(
        siblingValues['ev-s7-settlement-plan-c4'] ?? {},
      );
      const src = derived
        ? `from carrying capacity${bindingName ? ` -- binding: ${bindingName}` : ''}`
        : 'manual';
      return `Max ${max} (${src}); scheduled ${scheduled}; ${
        m.confirmed ? 'within maximum confirmed' : 'not confirmed'
      }`;
    }
    case 'enforcement': {
      const m = decodeSettlementPlan('enforcement', value) as EnforcementModel;
      const head = m.enforcer ? firstClause(m.enforcer) : 'No enforcer';
      const ack = m.notSelfReportedAck ? ' -- not self-reported acknowledged' : '';
      const verified =
        m.verifierName.trim() !== '' && m.verifiedAt !== ''
          ? ` -- verified by ${m.verifierName.trim()}`
          : '';
      return `${head}${ack}${verified}`;
    }
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown SettlementPlanMode: ${String(_exhaustive)}`);
    }
  }
}

function firstClause(s: string): string {
  return (s.split(' -- ')[0] ?? s).trim();
}

/** The signature proof captured by the c5 enforcement gate: the named third-party
 *  verifier's timestamped attestation that habitability was checked by someone
 *  OTHER than the arriving household. System-2 (decision-capture) analogue of a
 *  ProofRecord{kind:'signature'} carrying a VerifierRole. Returns null until a
 *  non-self verifier is named AND has signed in-app (entries with no timestamp,
 *  no role, or a dropped 'self' role are not signature proofs). */
export function enforcementSignatory(value: FormValue): ProofSignatory | null {
  const m = decodeSettlementPlan('enforcement', value) as EnforcementModel;
  if (
    m.verifierName.trim() === '' ||
    m.verifierRole === '' ||
    m.verifierRole === 'self' ||
    m.verifiedAt === ''
  ) {
    return null;
  }
  return {
    signerName: m.verifierName.trim(),
    signerRole: m.verifierRole,
    attestation: ENFORCEMENT_ATTESTATION,
    signedAt: m.verifiedAt,
  };
}

// ---------------------------------------------------------------------------
// Pure adapter export -> generateCommunityWorkPlan settlementPhases input
// ---------------------------------------------------------------------------

/**
 * settlementPhasesFrom -- map the c4 schedule register (and, optionally, the c1
 * founding cohort) onto CommunitySettlementPhaseInput[] for the engine. Each
 * dated cohort arrival is a settlement milestone; the founding arrival is
 * included when it has a date. Pure: no store, no Date.now().
 *
 *   { id, label, dateISO?, complete? }
 *
 * - The engine SKIPS phases that are complete or undated (settlementRules), so
 *   we pass dateISO through verbatim (including '') and let the engine filter.
 * - complete is carried through from the schedule row; the founding cohort is
 *   never auto-completed.
 */
export function settlementPhasesFrom(
  scheduleValue: FormValue,
  cohortValue?: FormValue,
): CommunitySettlementPhaseInput[] {
  const phases: CommunitySettlementPhaseInput[] = [];

  // Founding cohort (c1) -- one milestone when it carries a date.
  if (cohortValue) {
    const cohort = decodeSettlementPlan('cohort', cohortValue) as CohortModel;
    if (cohort.arrivalISO !== '') {
      phases.push({
        id: 'founding',
        label:
          cohort.composition.trim() !== ''
            ? `Founding cohort arrival -- ${cohort.composition.trim()}`
            : 'Founding cohort arrival',
        dateISO: cohort.arrivalISO,
        complete: false,
      });
    }
  }

  // Subsequent cohorts (c4 schedule).
  for (const row of decodeScheduleRows(scheduleValue.spSchedule)) {
    const label = row.cohort.trim() !== '' ? row.cohort.trim() : 'Cohort arrival';
    phases.push({
      id: row.id,
      label:
        row.milestone.trim() !== ''
          ? `${label} -- ${row.milestone.trim()}`
          : label,
      dateISO: row.dateISO,
      complete: row.complete,
    });
  }

  return phases;
}

// ===========================================================================
// React component + 6 mode bodies
// ===========================================================================

export interface SettlementPlanCaptureProps {
  mode: SettlementPlanMode;
  value: FormValue;
  onChange: (next: FormValue) => void;
  /** this capture's own checklist item id (e.g. ev-s7-settlement-plan-c1). */
  itemId: string;
  /** full per-item FormValue map; criteria (c3) + capacityFit (c6) read it. */
  siblingValues?: Record<string, FormValue>;
}

export function SettlementPlanCapture({
  mode,
  value,
  onChange,
  itemId,
  siblingValues = {},
}: SettlementPlanCaptureProps): React.JSX.Element {
  void itemId;

  // -- c1: cohort -----------------------------------------------------------
  if (mode === 'cohort') {
    const model = decodeSettlementPlan('cohort', value) as CohortModel;
    const set = (patch: Partial<CohortModel>): void =>
      onChange(encodeSettlementPlan({ ...model, ...patch }));
    return (
      <div className={css.root} data-sp-mode="cohort">
        <SectionEyebrow>Founding cohort composition</SectionEyebrow>
        <textarea
          className={css.textarea}
          value={model.composition}
          placeholder="Which households form the founding cohort? Names, sizes, roles."
          aria-label="Founding cohort composition"
          rows={3}
          onChange={(e) => set({ composition: e.target.value })}
        />
        <div className={css.rowGroup}>
          <div className={css.row}>
            <span className={css.rowLbl}>Founding arrival date</span>
            <input
              type="date"
              className={css.dateInput}
              value={model.arrivalISO}
              aria-label="Founding arrival date"
              onChange={(e) => set({ arrivalISO: e.target.value })}
            />
          </div>
          <div className={css.row}>
            <span className={css.rowLbl}>Founding households</span>
            <Stepper
              value={model.households}
              min={0}
              ariaLabel="Founding household count"
              onChange={(n) => set({ households: n })}
            />
          </div>
        </div>
        <FeedsNote>
          The founding cohort and its arrival date anchor the{' '}
          <strong>settlement milestone schedule</strong> -- a dated founding
          arrival becomes a settlement-milestone work item.
        </FeedsNote>
      </div>
    );
  }

  // -- c2: thresholds -------------------------------------------------------
  if (mode === 'thresholds') {
    const model = decodeSettlementPlan('thresholds', value) as ThresholdsModel;
    const update = (rows: ThresholdRow[]): void =>
      onChange(encodeSettlementPlan({ kind: 'thresholds', rows }));
    return (
      <div className={css.root} data-sp-mode="thresholds">
        <SectionEyebrow>
          Exact habitability threshold items{' '}
          <span className={css.hintInline}>
            (potable water, shelter, sanitation, emergency communications)
          </span>
        </SectionEyebrow>
        <RegisterList<ThresholdRow>
          items={model.rows}
          ariaLabel="Habitability threshold items"
          addLabel="Add threshold item"
          emptyHint="No threshold items yet. Add the exact, testable items the founding cohort needs before move-in."
          makeEmpty={() => ({ id: makeRowId(), domain: '', item: '' })}
          onChange={update}
          renderRow={(row, _i, patch) => (
            <div className={css.regRow}>
              <Dropdown
                options={HABITABILITY_DOMAINS}
                value={row.domain}
                placeholder="Domain"
                ariaLabel="Habitability domain"
                onChange={(v) => patch({ domain: v })}
              />
              <input
                type="text"
                className={css.regInput}
                value={row.item}
                placeholder="Exact threshold item -- e.g. 20 L/person/day potable, tested"
                aria-label="Threshold item"
                onChange={(e) => patch({ item: e.target.value })}
              />
            </div>
          )}
        />
        <FeedsNote>
          These exact items seed the <strong>arrival criteria checklist</strong>{' '}
          -- thresholds defined as testable items, not aspirational descriptions.
        </FeedsNote>
      </div>
    );
  }

  // -- c3: criteria (display-only seed; bakes on first edit) ----------------
  if (mode === 'criteria') {
    const model = decodeSettlementPlan(
      'criteria',
      value,
      siblingValues,
    ) as CriteriaModel;
    const update = (rows: CriterionRow[]): void =>
      onChange(encodeSettlementPlan({ kind: 'criteria', rows, baked: true }));
    return (
      <div className={css.root} data-sp-mode="criteria">
        <SectionEyebrow>
          Arrival criteria checklist{' '}
          {!model.baked && model.rows.length > 0 ? (
            <StatusPill tone="info" label="seeded from threshold items" />
          ) : null}
        </SectionEyebrow>
        <p className={css.modeHint}>
          Each criterion must be confirmed complete, tested, and signed off before
          any household moves in.
        </p>
        <RegisterList<CriterionRow>
          items={model.rows}
          ariaLabel="Arrival criteria"
          addLabel="Add criterion"
          emptyHint="No arrival criteria yet. Record the threshold items first, or add criteria here."
          makeEmpty={() => ({ id: makeRowId(), text: '', signedOff: false })}
          onChange={update}
          renderRow={(row, _i, patch) => (
            <div className={css.regRow}>
              <input
                type="text"
                className={css.regInput}
                value={row.text}
                placeholder="Arrival criterion -- confirmed complete, tested, signed off"
                aria-label="Arrival criterion"
                onChange={(e) => patch({ text: e.target.value })}
              />
              <button
                type="button"
                className={css.signOff}
                data-on={row.signedOff}
                aria-pressed={row.signedOff}
                onClick={() => patch({ signedOff: !row.signedOff })}
              >
                <span className={css.signDot} aria-hidden="true" />
                Signed off
              </button>
            </div>
          )}
        />
        <FeedsNote>
          The arrival criteria checklist is the sign-off sheet enforced in{' '}
          <strong>threshold enforcement</strong> (decision 5) -- not self-reported
          by the arriving household.
        </FeedsNote>
      </div>
    );
  }

  // -- c4: schedule ---------------------------------------------------------
  if (mode === 'schedule') {
    const model = decodeSettlementPlan('schedule', value) as ScheduleModel;
    const update = (rows: ScheduleRow[]): void =>
      onChange(encodeSettlementPlan({ kind: 'schedule', rows }));
    return (
      <div className={css.root} data-sp-mode="schedule">
        <SectionEyebrow>
          Subsequent cohort arrivals vs. infrastructure milestones
        </SectionEyebrow>
        <RegisterList<ScheduleRow>
          items={model.rows}
          ariaLabel="Cohort arrival schedule"
          addLabel="Add cohort arrival"
          emptyHint="No subsequent cohorts scheduled. Add each cohort with its arrival date and the infrastructure milestone that gates it."
          makeEmpty={() => ({
            id: makeRowId(),
            cohort: '',
            dateISO: '',
            size: 0,
            milestone: '',
            complete: false,
          })}
          onChange={update}
          renderRow={(row, _i, patch) => (
            <div className={css.scheduleRow}>
              <input
                type="text"
                className={css.regInput}
                value={row.cohort}
                placeholder="Cohort label -- e.g. Cohort 2"
                aria-label="Cohort label"
                onChange={(e) => patch({ cohort: e.target.value })}
              />
              <input
                type="text"
                className={css.regInput}
                value={row.milestone}
                placeholder="Gating infrastructure milestone"
                aria-label="Gating milestone"
                onChange={(e) => patch({ milestone: e.target.value })}
              />
              <div className={css.scheduleMeta}>
                <input
                  type="date"
                  className={css.dateInput}
                  value={row.dateISO}
                  aria-label="Arrival date"
                  onChange={(e) => patch({ dateISO: e.target.value })}
                />
                <Stepper
                  value={row.size}
                  min={0}
                  ariaLabel="Cohort size"
                  onChange={(n) => patch({ size: n })}
                />
                <button
                  type="button"
                  className={css.signOff}
                  data-on={row.complete}
                  aria-pressed={row.complete}
                  onClick={() => patch({ complete: !row.complete })}
                >
                  <span className={css.signDot} aria-hidden="true" />
                  Complete
                </button>
              </div>
            </div>
          )}
        />
        <FeedsNote>
          Each dated, incomplete cohort arrival becomes a{' '}
          <strong>settlement-milestone work item</strong> in the community work
          plan.
        </FeedsNote>
      </div>
    );
  }

  // -- c6: capacityFit (derived OR manual max + display-only strip + confirm) -
  if (mode === 'capacityFit') {
    const model = decodeSettlementPlan('capacityFit', value) as CapacityFitModel;
    const set = (patch: Partial<CapacityFitModel>): void =>
      onChange(encodeSettlementPlan({ ...model, ...patch }));
    // "Derived replaces manual" (R3 P1): the ceiling is the carrying-capacity
    // synthesis when ev-s2-carrying-capacity has been assessed, else the manual
    // stepper value. Recomputed on read; never persisted.
    const { max, derived, bindingName } = capacityFitEffectiveMax(
      value,
      siblingValues,
    );
    // Display-only derived strip (steward decision 5): read scheduled population
    // from the c4 sibling -- NO live coupling, NO write.
    const scheduled = scheduledPopulationFrom(
      siblingValues['ev-s7-settlement-plan-c4'] ?? {},
    );
    const founding = (
      decodeSettlementPlan(
        'cohort',
        siblingValues['ev-s7-settlement-plan-c1'] ?? {},
      ) as CohortModel
    ).households;
    const totalPlanned = scheduled + founding;
    const within = max > 0 && totalPlanned <= max;
    return (
      <div className={css.root} data-sp-mode="capacityFit">
        <div className={css.row}>
          <span className={css.rowLbl}>
            Stratum 2 maximum sustainable population
          </span>
          {derived ? (
            <span
              className={css.derivedMaxVal}
              aria-label="Maximum sustainable population (derived from carrying capacity)"
            >
              {max}
            </span>
          ) : (
            <Stepper
              value={model.maxPopulation}
              min={0}
              ariaLabel="Maximum sustainable population"
              onChange={(n) => set({ maxPopulation: n })}
            />
          )}
        </div>

        {derived ? (
          <p className={css.modeHint}>
            {`From the Stratum 2 carrying capacity assessment -- binding constraint: ${
              bindingName ?? 'unknown'
            }.`}
          </p>
        ) : (
          <p className={css.modeHint}>
            Stratum 2 carrying capacity not yet assessed -- complete
            ev-s2-carrying-capacity for an automatic ceiling, or enter a maximum
            here.
          </p>
        )}

        <div className={css.derivedStrip} aria-label="Planned population (display only)">
          <div className={css.derivedItem}>
            <span className={css.derivedNum}>{founding}</span>
            <span className={css.derivedLbl}>Founding</span>
          </div>
          <span className={css.derivedOp}>+</span>
          <div className={css.derivedItem}>
            <span className={css.derivedNum}>{scheduled}</span>
            <span className={css.derivedLbl}>Scheduled</span>
          </div>
          <span className={css.derivedOp}>=</span>
          <div className={css.derivedItem}>
            <span className={css.derivedNum}>{totalPlanned}</span>
            <span className={css.derivedLbl}>Planned total</span>
          </div>
          <StatusPill
            tone={max === 0 ? 'neutral' : within ? 'success' : 'warn'}
            label={
              max === 0
                ? 'set a maximum'
                : within
                  ? 'within maximum'
                  : 'exceeds maximum'
            }
          />
        </div>
        <p className={css.modeHint}>
          Derived figures are display-only -- they read the founding cohort and
          scheduled arrivals but never change them.
        </p>

        <button
          type="button"
          className={css.confirmRow}
          data-on={model.confirmed}
          aria-pressed={model.confirmed}
          onClick={() => set({ confirmed: !model.confirmed })}
        >
          <span className={css.signDot} aria-hidden="true" />
          <span>
            Confirm scheduled cohort sizes keep total population within the
            maximum sustainable population
          </span>
        </button>

        <FeedsNote>
          This confirmation gates the settlement plan -- scheduled growth must not
          exceed the Stratum 2 carrying capacity.
        </FeedsNote>
      </div>
    );
  }

  // -- c5: enforcement (hard gate -- steward decision 3) --------------------
  const model = decodeSettlementPlan('enforcement', value) as EnforcementModel;
  const set = (patch: Partial<EnforcementModel>): void =>
    onChange(encodeSettlementPlan({ ...model, ...patch }));
  return (
    <div className={css.root} data-sp-mode="enforcement">
      <div className={css.warnBlock}>
        <ShieldAlert size={15} className={css.warnIcon} aria-hidden="true" />
        <div className={css.warnTxt}>{SETTLEMENT_SCOPE_NOTES}</div>
      </div>

      <SectionEyebrow>Who enforces habitability thresholds</SectionEyebrow>
      <div className={css.row}>
        <span className={css.rowLbl}>
          <Users size={13} aria-hidden="true" /> Enforcer
        </span>
        <Dropdown
          options={ENFORCER_OPTION_LIST}
          value={model.enforcer}
          placeholder="Choose who enforces -- not the arriving household"
          ariaLabel="Habitability threshold enforcer"
          onChange={(v) => set({ enforcer: v })}
        />
      </div>

      <button
        type="button"
        className={css.ackRow}
        data-on={model.notSelfReportedAck}
        aria-pressed={model.notSelfReportedAck}
        onClick={() => set({ notSelfReportedAck: !model.notSelfReportedAck })}
      >
        <span className={css.signDot} aria-hidden="true" />
        <span>
          I confirm habitability thresholds are NOT self-reported by arriving
          households -- they are verified by the enforcer above.
        </span>
      </button>

      <SectionEyebrow>Who signed the verification</SectionEyebrow>
      <div className={css.row}>
        <span className={css.rowLbl}>
          <Users size={13} aria-hidden="true" /> Verifier
        </span>
        <input
          type="text"
          className={css.signInput}
          data-testid="sp-verifier-name"
          aria-label="Name of the verifier (not the arriving household)"
          value={model.verifierName}
          placeholder="Verifier name..."
          onChange={(e) => set({ verifierName: e.target.value, verifiedAt: '' })}
        />
      </div>
      <div className={css.row}>
        <span className={css.rowLbl}>Verifier role</span>
        <Dropdown
          options={VERIFIER_ROLE_LABEL_LIST}
          value={VERIFIER_ROLE_LABEL[model.verifierRole] ?? ''}
          placeholder="Role -- never the arriving household"
          ariaLabel="Verifier role"
          onChange={(label) =>
            set({ verifierRole: SLUG_FOR_VERIFIER_LABEL[label] ?? '', verifiedAt: '' })
          }
        />
      </div>

      <div className={css.signBlock}>
        <div className={css.signAck}>{ENFORCEMENT_ATTESTATION}</div>
        {model.verifiedAt ? (
          <div className={css.signMeta} data-testid="sp-verified">
            <Check size={13} aria-hidden="true" />
            Verified by {model.verifierName.trim() || 'verifier'} on{' '}
            {formatSignedDate(model.verifiedAt)}
          </div>
        ) : (
          <button
            type="button"
            className={css.signBtn}
            data-testid="sp-verify-sign"
            disabled={model.verifierName.trim() === '' || model.verifierRole === ''}
            onClick={() => set({ verifiedAt: nowIso() })}
          >
            <Check size={13} aria-hidden="true" />
            Sign verification
          </button>
        )}
      </div>

      <FeedsNote>
        Enforcement closes the arrival sign-off loop -- the criteria checklist
        (decision 3) is verified by someone other than the arriving household.
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

export default SettlementPlanCapture;
