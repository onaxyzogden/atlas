/**
 * FinancialModelCapture -- a 6-mode ADVISORY pure-FormValue capture for the
 * ecovillage objective ev-s4-financial-model ("A sound financial contribution &
 * shared economics model", 6 checklist items c1..c6). Catalogue item order ==
 * mode order (and matches the catalogue `mode` badges verbatim):
 *
 *   c1 -> buyin     (member buy-in contribution -- capital to join)
 *   c2 -> levy      (ongoing communal cost contributions -- monthly levy)
 *   c3 -> fundgov   (communal fund governance -- held, authorised, audited)
 *   c4 -> hardship  (financial hardship protocol -- support in difficulty)
 *   c5 -> reserves  (capital reserve strategy -- infrastructure renewal)
 *   c6 -> ratify    (member agreement -- all founding members, pre-build gate)
 *
 * Structure mirrors SettlementCapture / EnergyCapture / WaterSystemsCapture (the
 * canonical advisory multi-mode captures): a `financialModelModeFor(itemId)`
 * mapper, the `asStr` FormValue coercion helper, per-mode discriminated-union
 * models, decode/encode (encode is the lossless inverse of decode), is*Valid,
 * summarise*, the props interface, and a single component that renders ONE mode
 * body. Props are {mode, value, onChange, itemId, siblingValues?} -- NO
 * projectId, NO store writes. The panel chrome (eyebrow / title / hint /
 * Record-Defer footer) is owned by the third-column host.
 *
 * CONTROLLED / pure: the model is derived from decode(value) each render; the
 * full next model is emitted via onChange(encode(next)). The capture holds NO
 * local state for PERSISTED values.
 *
 * decode NEVER throws and NEVER fabricates seed data: every text field defaults
 * to EMPTY string (""). This capture is purely advisory -- every mode is always
 * recordable (isValid === true for all six).
 *
 * MEMBER-AGREEMENT GATE (catalogue scopeNotes): the objective declares that all
 * Stratum 5 infrastructure design gates on this financial model being confirmed
 * by every founding household before any construction begins. As with the
 * SettlementCapture habitability hard gates, the advisory pattern does NOT
 * introduce a blocking mechanism (isValid stays true); instead the gate framing
 * is surfaced PROMINENTLY as a warn InterpretationBlock in the ratify (c6) mode,
 * honouring the operator intent without inventing a gate the advisory contract
 * cannot enforce.
 *
 * AMANAH (reviewed CLEAN at Phase 3f kickoff): every recorded mechanism here is
 * ordinary co-owner cost-sharing among community members -- NOT riba, NOT
 * gharar, NOT bay` ma laysa `indak, and NOT advance-purchase / CSRA / salam
 * framing. Buy-in is equity in the commons (a share of land + Phase 1
 * infrastructure + a community-fund deposit), not advance-purchase of future
 * yield. The levy funds shared operations. The hardship Tier-1 deferral is
 * interest-free ("deferred without penalty"), a qard-hasan-like forbearance.
 * The reserve is pooled communal savings. No capital-channel or sale-channel
 * construct requiring the "capital partners & allies" label is present, so no
 * scopeNotes flag is required. Content transcribed verbatim per the standing
 * directive (never reword/omit). Note (downstream, not a capture concern): if a
 * community bank/credit-union account accrues deposit interest, that interest
 * must be purified/donated -- an operating matter, not a recorded figure here.
 *
 * SOURCE: the reference content (buy-in components + household table, levy
 * components + household table, fund-governance selections, three hardship
 * tiers, reserve target/triggers/draw thresholds, ratification summary +
 * founding-member roster) is transcribed VERBATIM from the OLOS prototype
 * olos_financial_contribution_model.html (panels p1..p6, "Kinfolk Ridge
 * Ecovillage"). The prototype's editable inputs/selects are presented here as
 * STATIC reference figures (the worked example, as-authored -- some worked
 * figures are internally loose); the advisory capture records the steward's
 * narrative, not recomputed numbers.
 *
 * ASCII-only: em-dash -> " - "; "2x" for the multiply glyph; "->" for the arrow;
 * "~" for the approx glyph; no smart quotes; apostrophes use double-quoted JS
 * strings; non-ASCII names transliterated (Elif Yildiz, Ngai).
 */

import * as React from 'react';

import type { FormValue } from './actToolCatalog.js';
import { InterpretationBlock, SectionEyebrow } from './captures/controls/index.js';
import css from './FinancialModelCapture.module.css';

// ---------------------------------------------------------------------------
// Mode mapper
// ---------------------------------------------------------------------------

export type FinancialModelMode =
  | 'buyin' // c1
  | 'levy' // c2
  | 'fundgov' // c3
  | 'hardship' // c4
  | 'reserves' // c5
  | 'ratify'; // c6

export const FINANCIAL_MODEL_PREFIX = 'ev-s4-financial-model';
const PREFIX_DASH = FINANCIAL_MODEL_PREFIX + '-';

export function financialModelModeFor(itemId: string): FinancialModelMode | null {
  if (!itemId.startsWith(PREFIX_DASH)) return null;
  const suffix = itemId.slice(PREFIX_DASH.length);
  switch (suffix) {
    case 'c1':
      return 'buyin';
    case 'c2':
      return 'levy';
    case 'c3':
      return 'fundgov';
    case 'c4':
      return 'hardship';
    case 'c5':
      return 'reserves';
    case 'c6':
      return 'ratify';
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Models (discriminated union by `kind`) -- each mode carries one notes field.
// ---------------------------------------------------------------------------

export interface BuyinModel {
  kind: 'buyin';
  notes: string;
}
export interface LevyModel {
  kind: 'levy';
  notes: string;
}
export interface FundgovModel {
  kind: 'fundgov';
  notes: string;
}
export interface HardshipModel {
  kind: 'hardship';
  notes: string;
}
export interface ReservesModel {
  kind: 'reserves';
  notes: string;
}
export interface RatifyModel {
  kind: 'ratify';
  notes: string;
}

export type FinancialModelModel =
  | BuyinModel
  | LevyModel
  | FundgovModel
  | HardshipModel
  | ReservesModel
  | RatifyModel;

// ---------------------------------------------------------------------------
// Verbatim constants (from olos_financial_contribution_model.html p1..p6)
// ---------------------------------------------------------------------------

interface KvRow {
  label: string;
  value: string;
}

type AvIdx = '1' | '2' | '3' | '4';

interface HouseholdRow {
  initials: string;
  name: string;
  av: AvIdx;
  amount: string;
  basis: string;
  reduced: boolean;
}

interface HouseholdTotal {
  label: string;
  value: string;
}

// ---- c1: buy-in ----
const BUYIN_COMPONENTS: readonly KvRow[] = [
  { label: 'Land purchase share (per household)', value: '75,000 CAD' },
  { label: 'Phase 1 communal infrastructure share', value: '22,500 CAD' },
  { label: 'Community fund seed deposit', value: '5,000 CAD' },
];

const BUYIN_COMPONENTS_NOTE =
  'Total per-household buy-in: $102,500. Founding member buy-in applies to all 4 households; Phase 3 entrants may pay a different rate set at that time.';

const BUYIN_TABLE_HEAD = { name: 'Household', amount: 'Buy-in (CAD)', basis: 'Adjustment' };
const BUYIN_TABLE: readonly HouseholdRow[] = [
  { initials: 'SM', name: 'Sarah Mitchell', av: '1', amount: '102,500', basis: 'Standard', reduced: false },
  { initials: 'MD', name: 'Marcus Delacroix', av: '3', amount: '102,500', basis: 'Standard', reduced: false },
  { initials: 'AJ', name: 'Aroha & James', av: '2', amount: '102,500', basis: 'Standard', reduced: false },
  { initials: 'EY', name: 'Elif Yildiz', av: '4', amount: '82,000', basis: 'Reduced', reduced: true },
];
const BUYIN_TOTAL: HouseholdTotal = { label: 'Total community capitalisation', value: '$389,500' };

const BUYIN_SCHEDULE: readonly KvRow[] = [
  { label: 'Buy-in payment method', value: '3 tranches - on signing, on land purchase, on build start' },
  { label: 'Non-payment within grace period', value: 'Community decision - case by case' },
];

// ---- c2: levy ----
const LEVY_COMPONENTS: readonly KvRow[] = [
  { label: 'Shared infrastructure maintenance', value: '280 CAD / mo' },
  { label: 'Communal insurance (property & liability)', value: '120 CAD / mo' },
  { label: 'Capital reserve contribution', value: '200 CAD / mo' },
  { label: 'Community operations fund', value: '100 CAD / mo' },
];

const LEVY_COMPONENTS_NOTE =
  'Baseline monthly levy (equal split): $700/household. Total monthly inflow across 4 households: $2,800.';

const LEVY_TABLE_HEAD = { name: 'Household', amount: 'Monthly (CAD)', basis: 'Basis' };
const LEVY_TABLE: readonly HouseholdRow[] = [
  { initials: 'SM', name: 'Sarah Mitchell', av: '1', amount: '700', basis: 'Equal share', reduced: false },
  { initials: 'MD', name: 'Marcus Delacroix', av: '3', amount: '700', basis: 'Equal share', reduced: false },
  { initials: 'AJ', name: 'Aroha & James', av: '2', amount: '700', basis: 'Equal share', reduced: false },
  { initials: 'EY', name: 'Elif Yildiz', av: '4', amount: '560', basis: 'Reduced 80%', reduced: true },
];
const LEVY_TOTAL: HouseholdTotal = { label: 'Total monthly inflow', value: '$2,660 / mo' };

const LEVY_REVIEW: readonly KvRow[] = [
  { label: 'Levy review frequency', value: 'Annual - first quarter each year' },
  { label: 'Levy increase - requires', value: 'Consent of all households' },
  { label: 'Year 1 levy - establishment period', value: '50% levy for first 6 months' },
];

// ---- c3: fund governance ----
interface FundSection {
  label: string;
  rows: readonly KvRow[];
  note?: string;
}

const FUND_SECTIONS: readonly FundSection[] = [
  {
    label: 'Banking & custody',
    rows: [
      { label: 'Funds held by', value: 'Community legal entity (CLT / co-op)' },
      { label: 'Banking institution', value: 'Credit union - member-owned' },
      { label: 'Signatories required', value: '2 of 4 founding members' },
    ],
  },
  {
    label: 'Spending authority - by amount',
    rows: [
      { label: 'Up to $500', value: 'Treasurer role - no approval needed' },
      { label: '$500 - $2,500', value: '2 founding member signatories' },
      { label: '$2,500 - $10,000', value: 'Consent of all founding households' },
      { label: 'Over $10,000', value: 'Community vote - unanimous founding members' },
    ],
  },
  {
    label: 'Transparency & audit',
    rows: [
      { label: 'Financial reporting frequency', value: 'Quarterly statement - full breakdown' },
      { label: 'Access to accounts', value: 'All founding members - read access' },
      { label: 'Annual audit / review', value: 'External bookkeeper - annual' },
    ],
    note:
      'Transparency is non-negotiable in a shared-finance community. Every household should be able to see exactly how shared funds move, without requiring a formal request.',
  },
];

// ---- c4: hardship protocol ----
type TierIdx = '1' | '2' | '3';

interface HardshipTier {
  num: TierIdx;
  title: string;
  trigger: string;
  active: boolean;
  rows: readonly KvRow[];
  note: string;
}

const HARDSHIP_TIERS: readonly HardshipTier[] = [
  {
    num: '1',
    title: 'Short-term difficulty',
    trigger: 'Up to 3 months',
    active: true,
    rows: [
      { label: 'Levy treatment', value: 'Deferred - repaid over 6 months' },
      { label: 'Notification required', value: 'Inform treasurer only' },
      { label: 'Membership rights during deferral', value: 'Unchanged - full rights maintained' },
    ],
    note:
      'Household notifies the treasurer. Levy is deferred without penalty for up to 3 months. Deferral is confidential unless the household chooses to share with the wider community.',
  },
  {
    num: '2',
    title: 'Extended hardship',
    trigger: '3 - 12 months',
    active: false,
    rows: [
      { label: 'Levy treatment', value: 'Reduced levy - community-agreed amount' },
      { label: 'Community discussion', value: 'Private meeting with all founding households' },
      { label: 'Repayment plan required?', value: 'Yes - agreed written plan' },
    ],
    note:
      'If a household reaches 3 months of deferred levy without a clear path to resolution, the founding group meets privately to discuss a reduced levy arrangement. Repayment plan is formalised in writing. Confidentiality is maintained unless the household consents to broader sharing.',
  },
  {
    num: '3',
    title: 'Irresolvable financial exit',
    trigger: 'Beyond 12 months or by mutual agreement',
    active: false,
    rows: [
      { label: 'Process', value: 'Exit process per community agreement' },
      { label: 'Buy-in return to exiting household', value: 'Buy-in minus outstanding levies' },
    ],
    note:
      "The community's goal is to support any household through financial difficulty before exit is considered. Tier 3 is a last resort, not an automatic outcome. The exiting household retains dignity, and the community retains its commitment to the land.",
  },
];

// ---- c5: capital reserves ----
const RESERVE_TARGET: readonly KvRow[] = [
  { label: 'Capital Reserve Fund target', value: '$124,800' },
  { label: 'Total Phase 1 asset value (est.)', value: '624,000 CAD' },
  { label: 'Target reserve as % of asset value', value: '20%' },
  { label: 'Target reached in', value: '~7.8 yrs' },
];

interface ReserveStat {
  value: string;
  label: string;
}
const RESERVE_SUMMARY: readonly ReserveStat[] = [
  { value: '$2,400', label: 'Monthly contributions' },
  { value: '$28,800', label: 'Annual build' },
  { value: '$124,800', label: 'Target' },
];

interface TriggerItem {
  txt: string;
  on: boolean;
}
const RESERVE_TRIGGERS: readonly TriggerItem[] = [
  { txt: 'Major infrastructure failure - repair cost exceeds 2x monthly levy inflow', on: true },
  { txt: 'End-of-life infrastructure replacement - water system, sanitation, energy array', on: true },
  { txt: 'Natural disaster or force majeure event affecting communal assets', on: true },
  { txt: 'Legal costs - entity governance or member dispute requiring professional support', on: false },
  { txt: 'Phase 3 infrastructure expansion - voted by community', on: false },
];

const RESERVE_DRAW: readonly KvRow[] = [
  { label: 'Draw up to $5,000', value: 'Consent of all founding households' },
  { label: 'Draw above $5,000', value: 'Unanimous founding member vote' },
];

// ---- c6: ratification ----
const RATIFY_GATE_WARN =
  'This is the final gate before construction. No dwelling or communal infrastructure construction begins until every founding household has confirmed this financial model. All Stratum 5 infrastructure design also gates on this model being confirmed - do not proceed to design without it.';

type RbTone = 'ok' | 'warn';
interface RatifyBriefRow {
  key: string;
  value: string;
  tone: RbTone;
}

const RATIFY_BRIEF_HEADER = 'Kinfolk Ridge - Financial Contribution Model';
const RATIFY_BRIEF: readonly RatifyBriefRow[] = [
  { key: 'Buy-in range', value: '$82,000 - $102,500 per household', tone: 'ok' },
  { key: 'Total capitalisation', value: '$389,500', tone: 'ok' },
  { key: 'Monthly levy', value: '$560 - $700 per household', tone: 'ok' },
  { key: 'Total monthly inflow', value: '$2,660 / month', tone: 'ok' },
  { key: 'Capital reserve target', value: '$124,800 · ~7.8 year build', tone: 'warn' },
  { key: 'Fund governance', value: '2-of-4 signatories · credit union · quarterly reporting', tone: 'ok' },
  { key: 'Hardship protocol', value: '3-tier · deferral -> reduction -> exit', tone: 'ok' },
];

interface MemberRow {
  initials: string;
  name: string;
  av: AvIdx;
}
const RATIFY_MEMBERS: readonly MemberRow[] = [
  { initials: 'SM', name: 'Sarah Mitchell', av: '1' },
  { initials: 'MD', name: 'Marcus Delacroix', av: '3' },
  { initials: 'AJ', name: 'Aroha & James Ngai', av: '2' },
  { initials: 'EY', name: 'Elif Yildiz & family', av: '4' },
];
const RATIFY_MEMBER_OPTIONS: readonly string[] = [
  'Agreed - proceed to construction',
  'Reservations - notes below',
  'Confirmed off-platform',
];
const RATIFY_MEMBER_STATUS = 'Pending';
const RATIFY_GATE_NOTE =
  'Awaiting confirmation from all 4 founding households. No construction activity can begin until all members have confirmed or recorded their position.';

// ---------------------------------------------------------------------------
// FormValue coercion helper (mirror Settlement / Energy / Water convention)
// ---------------------------------------------------------------------------

function asStr(v: FormValue[string] | undefined): string {
  return typeof v === 'string' ? v : '';
}

// ---------------------------------------------------------------------------
// decode: FormValue -> FinancialModelModel (TOTAL / defensive; never throws /
// fabricates seed data)
// ---------------------------------------------------------------------------

export function decodeFinancialModel(
  mode: FinancialModelMode,
  value: FormValue,
): FinancialModelModel {
  switch (mode) {
    case 'buyin':
      return { kind: 'buyin', notes: asStr(value.fiBuyinNotes) };
    case 'levy':
      return { kind: 'levy', notes: asStr(value.fiLevyNotes) };
    case 'fundgov':
      return { kind: 'fundgov', notes: asStr(value.fiFundgovNotes) };
    case 'hardship':
      return { kind: 'hardship', notes: asStr(value.fiHardshipNotes) };
    case 'reserves':
      return { kind: 'reserves', notes: asStr(value.fiReservesNotes) };
    case 'ratify':
      return { kind: 'ratify', notes: asStr(value.fiRatifyNotes) };
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown FinancialModelMode: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// encode: FinancialModelModel -> FormValue (lossless inverse of decode)
// ---------------------------------------------------------------------------

export function encodeFinancialModel(
  _mode: FinancialModelMode,
  model: FinancialModelModel,
): FormValue {
  switch (model.kind) {
    case 'buyin':
      return { fiBuyinNotes: model.notes };
    case 'levy':
      return { fiLevyNotes: model.notes };
    case 'fundgov':
      return { fiFundgovNotes: model.notes };
    case 'hardship':
      return { fiHardshipNotes: model.notes };
    case 'reserves':
      return { fiReservesNotes: model.notes };
    case 'ratify':
      return { fiRatifyNotes: model.notes };
    default: {
      const _exhaustive: never = model;
      throw new Error(`Unknown FinancialModelModel kind: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// validity gates (advisory: every mode is always recordable -- the
// member-agreement gate is SURFACED as guidance, not enforced as a blocking
// validity gate)
// ---------------------------------------------------------------------------

export function isFinancialModelValid(_mode: FinancialModelMode, _value: FormValue): boolean {
  return true;
}

// ---------------------------------------------------------------------------
// summaries (one line per mode; defensive)
// ---------------------------------------------------------------------------

export function summariseFinancialModel(mode: FinancialModelMode, _value: FormValue): string {
  switch (mode) {
    case 'buyin':
      return 'Member buy-in defined (3-component capital contribution)';
    case 'levy':
      return 'Monthly levy structure defined (shared operating costs)';
    case 'fundgov':
      return 'Communal fund governance defined (banking, authority, audit)';
    case 'hardship':
      return 'Financial hardship protocol defined (3-tier response)';
    case 'reserves':
      return 'Capital reserve strategy defined (target + trigger events)';
    case 'ratify':
      return 'Financial model member-agreement gate (all founding households)';
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown FinancialModelMode: ${String(_exhaustive)}`);
    }
  }
}

// ===========================================================================
// React component + 6 mode bodies (c1..c6)
// ===========================================================================

export interface FinancialModelCaptureProps {
  mode: FinancialModelMode;
  value: FormValue;
  onChange: (next: FormValue) => void;
  /** this capture's own checklist item id (e.g. ev-s4-financial-model-c1). */
  itemId: string;
  /** full per-item FormValue map (unused -- no mode reads siblings here). */
  siblingValues?: Record<string, FormValue>;
}

function FeedsNote({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className={css.feedsBlock}>
      <div className={css.feedsTxt}>{children}</div>
    </div>
  );
}

function NotesField({
  id,
  label,
  placeholder,
  value,
  onChange,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (next: string) => void;
}): React.JSX.Element {
  return (
    <div>
      <label className={css.fieldLbl} htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        className={css.notesArea}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function DataRows({ rows }: { rows: readonly KvRow[] }): React.JSX.Element {
  return (
    <div className={css.dataList}>
      {rows.map((r) => (
        <div key={r.label} className={css.dataRow}>
          <span className={css.drLbl}>{r.label}</span>
          <span className={css.drVal}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}

function HouseholdTable({
  head,
  rows,
  total,
}: {
  head: { name: string; amount: string; basis: string };
  rows: readonly HouseholdRow[];
  total: HouseholdTotal;
}): React.JSX.Element {
  return (
    <div className={css.hhTable}>
      <div className={css.hhHeader}>
        <span className={css.hhHName}>{head.name}</span>
        <span className={css.hhHAmt}>{head.amount}</span>
        <span className={css.hhHBasis}>{head.basis}</span>
      </div>
      {rows.map((r) => (
        <div key={r.name} className={css.hhRow}>
          <span className={css.hhNameCell}>
            <span className={`${css.hhAv} ${css[`av_${r.av}`]}`}>{r.initials}</span>
            <span className={css.hhNm}>{r.name}</span>
          </span>
          <span className={css.hhAmt}>{r.amount}</span>
          <span className={`${css.hhBasis} ${r.reduced ? css.hhReduced : ''}`}>{r.basis}</span>
        </div>
      ))}
      <div className={css.hhTotalRow}>
        <span className={css.hhTotalLbl}>{total.label}</span>
        <span className={css.hhTotalVal}>{total.value}</span>
      </div>
    </div>
  );
}

export function FinancialModelCapture({
  mode,
  value,
  onChange,
  itemId,
  siblingValues = {},
}: FinancialModelCaptureProps): React.JSX.Element {
  void itemId;
  void siblingValues;

  // -- c1: buyin -----------------------------------------------------------
  if (mode === 'buyin') {
    const model = decodeFinancialModel('buyin', value) as BuyinModel;
    return (
      <div className={css.root} data-fi-mode="buyin">
        <div>
          <SectionEyebrow>Buy-in components - what it covers</SectionEyebrow>
          <DataRows rows={BUYIN_COMPONENTS} />
          <div className={css.refNote}>{BUYIN_COMPONENTS_NOTE}</div>
        </div>
        <div>
          <SectionEyebrow>Per-household buy-in (capacity-adjusted)</SectionEyebrow>
          <HouseholdTable head={BUYIN_TABLE_HEAD} rows={BUYIN_TABLE} total={BUYIN_TOTAL} />
        </div>
        <div>
          <SectionEyebrow>Payment schedule</SectionEyebrow>
          <DataRows rows={BUYIN_SCHEDULE} />
        </div>
        <FeedsNote>
          Buy-in totals feed the <strong>capital reserve strategy</strong> (item 5) and the{' '}
          <strong>member-agreement summary</strong> (item 6). The reduced contribution for the EY
          household feeds the <strong>hardship protocol</strong> (item 4).
        </FeedsNote>
        <NotesField
          id="fi-buyin-notes"
          label="Buy-in notes"
          placeholder="Per-household amounts, what the buy-in entitles each household to, payment tranches, grace-period handling..."
          value={model.notes}
          onChange={(next) =>
            onChange(encodeFinancialModel('buyin', { kind: 'buyin', notes: next }))
          }
        />
      </div>
    );
  }

  // -- c2: levy ------------------------------------------------------------
  if (mode === 'levy') {
    const model = decodeFinancialModel('levy', value) as LevyModel;
    return (
      <div className={css.root} data-fi-mode="levy">
        <div>
          <SectionEyebrow>Monthly levy - what it covers</SectionEyebrow>
          <DataRows rows={LEVY_COMPONENTS} />
          <div className={css.refNote}>{LEVY_COMPONENTS_NOTE}</div>
        </div>
        <div>
          <SectionEyebrow>Per-household monthly levy</SectionEyebrow>
          <HouseholdTable head={LEVY_TABLE_HEAD} rows={LEVY_TABLE} total={LEVY_TOTAL} />
        </div>
        <div>
          <SectionEyebrow>Review & adjustment</SectionEyebrow>
          <DataRows rows={LEVY_REVIEW} />
        </div>
        <FeedsNote>
          The monthly levy structure feeds the <strong>capital reserve projection</strong> (item 5)
          and the <strong>hardship protocol</strong> (item 4). The Year 1 establishment-period
          reduction is a transitional cost-sharing measure, not a loan.
        </FeedsNote>
        <NotesField
          id="fi-levy-notes"
          label="Levy notes"
          placeholder="Levy component amounts, per-household basis, review cadence, increase-consent rule, establishment-period terms..."
          value={model.notes}
          onChange={(next) => onChange(encodeFinancialModel('levy', { kind: 'levy', notes: next }))}
        />
      </div>
    );
  }

  // -- c3: fundgov ---------------------------------------------------------
  if (mode === 'fundgov') {
    const model = decodeFinancialModel('fundgov', value) as FundgovModel;
    return (
      <div className={css.root} data-fi-mode="fundgov">
        <div>
          <SectionEyebrow>How communal funds are held, authorised, and audited</SectionEyebrow>
          <div className={css.fundList}>
            {FUND_SECTIONS.map((s) => (
              <div key={s.label} className={css.fundSection}>
                <div className={css.fsLbl}>{s.label}</div>
                <DataRows rows={s.rows} />
                {s.note ? <div className={css.refNote}>{s.note}</div> : null}
              </div>
            ))}
          </div>
        </div>
        <FeedsNote>
          Fund governance feeds the <strong>legal entity constitution</strong> and the{' '}
          <strong>community agreement framework</strong>. Spending thresholds must be consistent
          with the ownership-matrix decisions in the infrastructure strategy.
        </FeedsNote>
        <NotesField
          id="fi-fundgov-notes"
          label="Fund governance notes"
          placeholder="Custody entity + banking institution, signatory rule, spending-authority thresholds, reporting cadence, audit arrangement..."
          value={model.notes}
          onChange={(next) =>
            onChange(encodeFinancialModel('fundgov', { kind: 'fundgov', notes: next }))
          }
        />
      </div>
    );
  }

  // -- c4: hardship --------------------------------------------------------
  if (mode === 'hardship') {
    const model = decodeFinancialModel('hardship', value) as HardshipModel;
    return (
      <div className={css.root} data-fi-mode="hardship">
        <div>
          <SectionEyebrow>Three-tier response - by duration and severity</SectionEyebrow>
          <div className={css.tierList}>
            {HARDSHIP_TIERS.map((t) => (
              <div
                key={t.num}
                className={`${css.hardshipTier} ${t.active ? css.tierActive : ''}`}
              >
                <div className={css.htHead}>
                  <span className={`${css.htNum} ${css[`htNum_${t.num}`]}`}>{t.num}</span>
                  <span className={css.htTitle}>{t.title}</span>
                  <span className={css.htTrigger}>{t.trigger}</span>
                </div>
                <DataRows rows={t.rows} />
                <div className={css.htNote}>{t.note}</div>
              </div>
            ))}
          </div>
        </div>
        <FeedsNote>
          The hardship protocol feeds the <strong>community agreement framework</strong> and must
          be consistent with the <strong>member exit process</strong>. The Tier 1 deferral is
          interest-free forbearance - a community courtesy, not a loan with a markup.
        </FeedsNote>
        <NotesField
          id="fi-hardship-notes"
          label="Hardship protocol notes"
          placeholder="Per-tier triggers, levy treatment, notification + discussion process, repayment terms, exit handling..."
          value={model.notes}
          onChange={(next) =>
            onChange(encodeFinancialModel('hardship', { kind: 'hardship', notes: next }))
          }
        />
      </div>
    );
  }

  // -- c5: reserves --------------------------------------------------------
  if (mode === 'reserves') {
    const model = decodeFinancialModel('reserves', value) as ReservesModel;
    return (
      <div className={css.root} data-fi-mode="reserves">
        <div>
          <SectionEyebrow>Reserve fund target & contributions</SectionEyebrow>
          <DataRows rows={RESERVE_TARGET} />
          <div className={css.reserveSummary}>
            {RESERVE_SUMMARY.map((s) => (
              <div key={s.label} className={css.rsItem}>
                <span className={css.rsN}>{s.value}</span>
                <span className={css.rsLbl}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <SectionEyebrow>When reserves can be drawn - trigger events</SectionEyebrow>
          <div className={css.triggerList}>
            {RESERVE_TRIGGERS.map((t) => (
              <div key={t.txt} className={`${css.triggerItem} ${t.on ? css.triOn : ''}`}>
                <span className={css.triDot} />
                <span className={css.triTxt}>{t.txt}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <SectionEyebrow>Reserve draw - approval required</SectionEyebrow>
          <DataRows rows={RESERVE_DRAW} />
        </div>
        <FeedsNote>
          The reserve strategy produces a projected build-to-target timeline that feeds the{' '}
          <strong>member-agreement summary</strong> (item 6). The reserve is pooled communal savings
          held against major infrastructure renewal.
        </FeedsNote>
        <NotesField
          id="fi-reserves-notes"
          label="Capital reserve notes"
          placeholder="Reserve target + % basis, monthly contribution, trigger events, draw-approval thresholds..."
          value={model.notes}
          onChange={(next) =>
            onChange(encodeFinancialModel('reserves', { kind: 'reserves', notes: next }))
          }
        />
      </div>
    );
  }

  // -- c6: ratify ----------------------------------------------------------
  const model = decodeFinancialModel('ratify', value) as RatifyModel;
  return (
    <div className={css.root} data-fi-mode="ratify">
      <InterpretationBlock tone="warn">{RATIFY_GATE_WARN}</InterpretationBlock>
      <div>
        <SectionEyebrow>Financial model summary</SectionEyebrow>
        <div className={css.ratifyBrief}>
          <div className={css.rbHeader}>{RATIFY_BRIEF_HEADER}</div>
          {RATIFY_BRIEF.map((r) => (
            <div key={r.key} className={css.rbRow}>
              <span className={css.rbKey}>{r.key}</span>
              <span className={`${css.rbVal} ${r.tone === 'warn' ? css.rbWarn : css.rbOk}`}>
                {r.value}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <SectionEyebrow>Founding member confirmation</SectionEyebrow>
        <div className={css.memberList}>
          {RATIFY_MEMBERS.map((m) => (
            <div key={m.name} className={css.memberSign}>
              <div className={css.msHead}>
                <span className={`${css.hhAv} ${css[`av_${m.av}`]}`}>{m.initials}</span>
                <span className={css.msName}>{m.name}</span>
                <span className={css.msStatus}>{RATIFY_MEMBER_STATUS}</span>
              </div>
              <div className={css.msOptions}>
                {RATIFY_MEMBER_OPTIONS.map((o) => (
                  <span key={o} className={css.msOpt}>
                    {o}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className={css.ratifyGate}>{RATIFY_GATE_NOTE}</div>
      </div>
      <FeedsNote>
        Member ratification gates the <strong>start of construction</strong> and confirms the
        Stratum 5 infrastructure design can proceed. Each founding household records its own
        position; construction begins only once all have confirmed.
      </FeedsNote>
      <NotesField
        id="fi-ratify-notes"
        label="Member agreement notes"
        placeholder="Per-household confirmation status, recorded reservations, off-platform confirmations, date the gate was met..."
        value={model.notes}
        onChange={(next) =>
          onChange(encodeFinancialModel('ratify', { kind: 'ratify', notes: next }))
        }
      />
    </div>
  );
}

export default FinancialModelCapture;
