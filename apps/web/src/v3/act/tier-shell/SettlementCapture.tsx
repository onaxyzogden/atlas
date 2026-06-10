/**
 * SettlementCapture -- a 6-mode ADVISORY pure-FormValue capture for the
 * ecovillage objective ev-s4-settlement-strategy ("Define a phased settlement
 * strategy", 6 checklist items c1..c6). Catalogue item order == mode order:
 *
 *   c1 -> cohort     (founding cohort + subsequent phase composition)
 *   c2 -> threshold  (infrastructure habitability thresholds per cohort)
 *   c3 -> sequence   (cohort arrivals sequenced against infra milestones)
 *   c4 -> trial      (trial residency period before full membership)
 *   c5 -> capacity   (maximum population aligned with carrying capacity)
 *   c6 -> gates      (go/no-go criteria per settlement phase -- hard gates)
 *
 * Structure mirrors EnergyCapture / WaterSystemsCapture / SoilImprovementCapture
 * (the canonical advisory multi-mode captures): a `settlementModeFor(itemId)`
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
 * to EMPTY string (""). This capture is purely advisory -- no covenant gate
 * applies to a settlement-phasing assessment, so every mode is always
 * recordable (isValid === true for all six).
 *
 * HABITABILITY HARD GATES (catalogue scopeNotes): the objective declares that
 * cohort arrival is governed by HARD gates -- no household moves onto the land
 * until potable water, weathertight shelter, sanitation, and emergency
 * communications are confirmed for their phase. The advisory pattern does NOT
 * introduce a blocking mechanism (isValid stays true); instead the hard-gate
 * framing is surfaced PROMINENTLY as a warn InterpretationBlock in the
 * threshold (c2) and gates (c6) modes, honouring the operator intent without
 * inventing a gate the advisory contract cannot enforce.
 *
 * SOURCE: the reference content (cohort cards, threshold lists, milestone
 * sequence, trial terms, carrying-capacity figures, go/no-go criteria) is
 * transcribed VERBATIM from the OLOS prototype olos_phased_settlement.html
 * (panels p1..p6, "Kinfolk Ridge Ecovillage"). The prototype's editable inputs
 * are presented here as STATIC reference figures (the worked example); the
 * advisory capture records the steward's narrative, not recomputed numbers.
 *
 * ASCII-only: em-dash -> " - "; ">=" / "<=" for the inequality glyphs; "->" for
 * the arrow; "~" for the approx glyph; no smart quotes; apostrophes use
 * double-quoted JS strings.
 */

import * as React from 'react';

import type { FormValue } from './actToolCatalog.js';
import { InterpretationBlock, SectionEyebrow } from './captures/controls/index.js';
import css from './SettlementCapture.module.css';

// ---------------------------------------------------------------------------
// Mode mapper
// ---------------------------------------------------------------------------

export type SettlementMode =
  | 'cohort' // c1
  | 'threshold' // c2
  | 'sequence' // c3
  | 'trial' // c4
  | 'capacity' // c5
  | 'gates'; // c6

export const SETTLEMENT_PREFIX = 'ev-s4-settlement-strategy';
const PREFIX_DASH = SETTLEMENT_PREFIX + '-';

export function settlementModeFor(itemId: string): SettlementMode | null {
  if (!itemId.startsWith(PREFIX_DASH)) return null;
  const suffix = itemId.slice(PREFIX_DASH.length);
  switch (suffix) {
    case 'c1':
      return 'cohort';
    case 'c2':
      return 'threshold';
    case 'c3':
      return 'sequence';
    case 'c4':
      return 'trial';
    case 'c5':
      return 'capacity';
    case 'c6':
      return 'gates';
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Models (discriminated union by `kind`) -- each mode carries one notes field.
// ---------------------------------------------------------------------------

export interface CohortModel {
  kind: 'cohort';
  notes: string;
}
export interface ThresholdModel {
  kind: 'threshold';
  notes: string;
}
export interface SequenceModel {
  kind: 'sequence';
  notes: string;
}
export interface TrialModel {
  kind: 'trial';
  notes: string;
}
export interface CapacityModel {
  kind: 'capacity';
  notes: string;
}
export interface GatesModel {
  kind: 'gates';
  notes: string;
}

export type SettlementModel =
  | CohortModel
  | ThresholdModel
  | SequenceModel
  | TrialModel
  | CapacityModel
  | GatesModel;

// ---------------------------------------------------------------------------
// Verbatim constants (from olos_phased_settlement.html p1..p6)
// ---------------------------------------------------------------------------

interface KvRow {
  label: string;
  value: string;
}

// ---- c1: cohort cards ----
type CohortTone = 'active' | 'pending';

interface CohortCard {
  badge: string;
  title: string;
  status: string;
  statusTone: CohortTone;
  rows: readonly KvRow[];
  members?: readonly string[];
  note: string;
}

const COHORT_CARDS: readonly CohortCard[] = [
  {
    badge: 'P1',
    title: 'Phase 1 - Founding cohort',
    status: 'Active',
    statusTone: 'active',
    rows: [
      { label: 'Number of households', value: '2 households' },
      { label: 'Estimated adults', value: '4 adults' },
      { label: 'Children & dependants', value: '2 people' },
      { label: 'Membership status', value: 'Founding members' },
    ],
    members: ['Sarah Mitchell', 'Marcus Delacroix', 'Aroha & James', 'Elif & family'],
    note:
      "SM and MD move in first - legal entity registered, water system operational, and Phase 1 dwellings complete. SM's prior ecovillage experience anchors the first season.",
  },
  {
    badge: 'P2',
    title: 'Phase 2 - Second cohort',
    status: 'Pending Phase 1 gate',
    statusTone: 'pending',
    rows: [
      { label: 'Households joining', value: '2 households' },
      { label: 'Entry criteria', value: 'Habitability gate + 6-month Phase 1 review' },
    ],
    members: ['Aroha & James', 'Elif & family'],
    note:
      'Phase 1 6-month review passed with no unresolved disputes. Water system confirmed for 4-household load. Phase 2 dwelling cluster complete.',
  },
  {
    badge: 'P3',
    title: 'Phase 3 - Open membership',
    status: 'Future - criteria TBD',
    statusTone: 'pending',
    rows: [{ label: 'Opens when', value: 'Population cap not reached' }],
    note:
      'External applicants may apply after community has operated for 12+ months. Trial residency period applies to all incoming households.',
  },
];

// ---- c2: habitability thresholds ----
type ThresholdType = 'Hard' | 'Soft';

interface ThresholdItem {
  txt: string;
  type: ThresholdType;
}

interface ThresholdPhase {
  badge: string;
  title: string;
  items: readonly ThresholdItem[];
}

const THRESHOLD_HARDGATE =
  'These are hard gates. A cohort does not move in until every hard threshold for their phase is verified. No household moves onto the land before potable water, weathertight shelter, sanitation, and emergency communications are confirmed.';

const THRESHOLD_PHASES: readonly ThresholdPhase[] = [
  {
    badge: 'Phase 1 - 2 households',
    title: 'Must be complete before SM & MD arrive',
    items: [
      { txt: 'Legal entity registered and land title transferred to entity', type: 'Hard' },
      {
        txt: 'Potable water system operational with iron filtration - spring yield confirmed >= Phase 1 demand',
        type: 'Hard',
      },
      { txt: 'Phase 1 dwellings weathertight, connected to water and sanitation', type: 'Hard' },
      { txt: 'Community agreement framework signed by all 4 founding households', type: 'Hard' },
      {
        txt: 'Emergency access route confirmed - neighbour consent obtained for shared driveway traffic',
        type: 'Soft',
      },
      { txt: 'Market garden operational - Phase 1 vegetable growing area prepared', type: 'Soft' },
    ],
  },
  {
    badge: 'Phase 2 - +2 households',
    title: 'Must be complete before AJ & EY arrive',
    items: [
      {
        txt: 'Phase 1 6-month review completed - no unresolved disputes or governance failures',
        type: 'Hard',
      },
      { txt: 'Water system confirmed to carry 4-household load through one dry season', type: 'Hard' },
      { txt: 'Phase 2 dwelling cluster weathertight and connected to communal systems', type: 'Hard' },
      { txt: 'Community fund solvent and contributions current from Phase 1 households', type: 'Hard' },
      { txt: 'Soil rehabilitation program underway - Year 1 plantings establishing', type: 'Soft' },
    ],
  },
];

// ---- c3: arrival sequence ----
type MilestoneBadge = 'legal' | 'infra' | 'social' | 'land';

interface Milestone {
  txt: string;
  badge: MilestoneBadge;
  complete: boolean;
}

interface SeqPhase {
  num: string;
  title: string;
  timing: string;
  milestones: readonly Milestone[];
  connector?: string;
}

const MILESTONE_LABEL: Record<MilestoneBadge, string> = {
  legal: 'Legal',
  infra: 'Infra',
  social: 'Social',
  land: 'Land',
};

const SEQ_PHASES: readonly SeqPhase[] = [
  {
    num: '1',
    title: 'Legal & infrastructure establishment',
    timing: 'Months 1-8 (est.)',
    milestones: [
      { txt: 'Legal entity registered - CLT or co-op structure confirmed', badge: 'legal', complete: true },
      { txt: 'Land title transferred - purchase complete, entity holds title', badge: 'legal', complete: true },
      { txt: 'Phase 1 dwelling cluster - 2 units weathertight and connected', badge: 'infra', complete: false },
      { txt: 'Communal water system with iron filtration - operational, tested', badge: 'infra', complete: false },
    ],
    connector: 'Phase 1 thresholds passed -> cohort 1 arrives',
  },
  {
    num: '2',
    title: 'Phase 1 settlement & soil program',
    timing: 'Months 9-18 (est.)',
    milestones: [
      { txt: 'Community agreement framework signed by all 4 founding households', badge: 'social', complete: false },
      { txt: '6-month Phase 1 review - no unresolved disputes, governance functioning', badge: 'social', complete: false },
      { txt: 'Soil rehabilitation in progress - cover crop establishing on degraded pasture', badge: 'land', complete: false },
      { txt: 'Phase 2 dwelling cluster - 2 additional units weathertight and connected', badge: 'infra', complete: false },
    ],
    connector: 'Phase 2 thresholds passed -> cohort 2 arrives',
  },
  {
    num: '3',
    title: 'Full community & Phase 3 prep',
    timing: 'Months 19-36 (est.)',
    milestones: [
      { txt: 'All 4 households on land - full governance regime active', badge: 'social', complete: false },
      { txt: 'Soil organic matter target reached in rehabilitated zones', badge: 'land', complete: false },
      { txt: 'Population capacity assessment - spring yield confirmed for current load', badge: 'infra', complete: false },
    ],
  },
];

// ---- c4: trial residency ----
const TRIAL_TERMS: readonly KvRow[] = [
  { label: 'Trial period duration', value: '12 months' },
  { label: 'Applies to', value: 'All incoming households' },
  { label: 'Legal commitment during trial', value: 'Provisional lease only' },
  { label: 'Financial commitment during trial', value: 'Reduced contribution (50%)' },
  { label: 'Voting rights during trial', value: 'Advisory voice, no vote' },
];

interface TrialCriterion {
  txt: string;
  on: boolean;
}

const TRIAL_CRITERIA_LABEL = 'The community evaluates each household against:';
const TRIAL_CRITERIA: readonly TrialCriterion[] = [
  { txt: 'Active participation in shared work rotas and communal maintenance', on: true },
  { txt: 'Contributions current and meeting obligations defined in membership terms', on: true },
  { txt: 'No unresolved conflicts carried forward from the trial period', on: true },
  { txt: 'Genuine alignment with community values and governance approach demonstrated', on: true },
  { txt: 'Active contribution to at least one collective project during the trial period', on: false },
  { txt: 'Children and dependants integrated into community life without ongoing friction', on: false },
];

const TRIAL_OUTCOME_LABEL = 'The community and household each have a voice in this outcome:';
type OutcomeTone = 'pass' | 'extend' | 'decline';
interface TrialOutcome {
  txt: string;
  tone: OutcomeTone;
}
const TRIAL_OUTCOMES: readonly TrialOutcome[] = [
  { txt: 'Pass -> Full membership', tone: 'pass' },
  { txt: 'Extend trial', tone: 'extend' },
  { txt: 'Decline -> Exit process', tone: 'decline' },
];

// ---- c5: carrying capacity ----
type CapTone = 'ok' | 'limit';

interface CapResource {
  name: string;
  status: string;
  statusTone: CapTone;
  rows: readonly KvRow[];
}

const CAP_RESOURCES: readonly CapResource[] = [
  {
    name: 'Water - spring yield',
    status: 'Adequate for 4 households',
    statusTone: 'ok',
    rows: [
      { label: 'Confirmed spring yield (dry season)', value: '3800 L/day' },
      { label: 'Per-person demand (with filtration)', value: '120 L/person/day' },
      { label: 'Maximum people supported', value: '~31 people' },
    ],
  },
  {
    name: 'Land - productive area',
    status: 'Limiting at > 6 households',
    statusTone: 'limit',
    rows: [
      { label: 'Total productive land (post-setback)', value: '5.1 ha' },
      { label: 'Minimum land per adult equivalent', value: '0.25 ha/person' },
      { label: 'Maximum adults supported', value: '~20 adults' },
    ],
  },
  {
    name: 'Governance - community scale',
    status: 'Recommended max at 8 households',
    statusTone: 'limit',
    rows: [
      { label: 'Decision-making model', value: 'Modified consensus' },
      { label: 'Recommended household maximum', value: '6-8 households' },
      { label: 'Above this: governance redesign required', value: 'Elected circle structure' },
    ],
  },
];

interface CapSummaryItem {
  value: string;
  label: string;
}
const CAP_SUMMARY: readonly CapSummaryItem[] = [
  { value: '6', label: 'Max households' },
  { value: '~14', label: 'Max people' },
  { value: 'Land', label: 'Limiting factor' },
];

// ---- c6: go/no-go gates ----
type GateTone = 'open' | 'blocked' | 'pending';
type CriterionState = 'pass' | 'fail' | 'pending';

interface GateCriterion {
  txt: string;
  state: CriterionState;
}

interface GatePhase {
  title: string;
  state: string;
  stateTone: GateTone;
  criteria: readonly GateCriterion[];
}

const GATES_HARDGATE =
  'These are hard gates, not aspirational targets. A phase cannot begin until every hard criterion is passed - these are non-negotiable.';

const GATE_PHASES: readonly GatePhase[] = [
  {
    title: 'Phase 1 gate - Founding cohort arrival',
    state: 'Open',
    stateTone: 'open',
    criteria: [
      { txt: 'Legal entity registered and land title transferred', state: 'pass' },
      {
        txt: 'Potable water system operational and tested - iron filtration confirmed working',
        state: 'pass',
      },
      {
        txt: 'Phase 1 dwellings weathertight, connected, and legally permitted for habitation',
        state: 'pass',
      },
      { txt: 'Community agreement framework signed by all 4 founding households', state: 'pass' },
    ],
  },
  {
    title: 'Phase 2 gate - Second cohort arrival',
    state: 'Blocked - 4 criteria unmet',
    stateTone: 'blocked',
    criteria: [
      {
        txt: 'Phase 1 6-month review complete - governance functioning, no unresolved disputes',
        state: 'fail',
      },
      {
        txt: 'Water system confirmed to carry 4-household load - tested through one dry season minimum',
        state: 'fail',
      },
      { txt: 'Phase 2 dwelling cluster weathertight, connected, and legally permitted', state: 'fail' },
      {
        txt: 'Community fund solvent - contributions current, capital reserve at agreed minimum',
        state: 'fail',
      },
    ],
  },
  {
    title: 'Phase 3 gate - Open membership',
    state: 'Not yet active',
    stateTone: 'pending',
    criteria: [
      { txt: 'All 4 founding households on land and stable for 12+ consecutive months', state: 'pending' },
      {
        txt: 'Population below carrying capacity ceiling - vacancy exists within agreed maximum',
        state: 'pending',
      },
      { txt: 'Community vote approving Phase 3 opening - supermajority required', state: 'pending' },
      {
        txt: 'Trial residency process formally documented and ratified by all founding members',
        state: 'pending',
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// FormValue coercion helper (mirror Energy / Water / Soil convention)
// ---------------------------------------------------------------------------

function asStr(v: FormValue[string] | undefined): string {
  return typeof v === 'string' ? v : '';
}

// ---------------------------------------------------------------------------
// decode: FormValue -> SettlementModel (TOTAL / defensive; never throws /
// fabricates seed data)
// ---------------------------------------------------------------------------

export function decodeSettlement(mode: SettlementMode, value: FormValue): SettlementModel {
  switch (mode) {
    case 'cohort':
      return { kind: 'cohort', notes: asStr(value.stCohortNotes) };
    case 'threshold':
      return { kind: 'threshold', notes: asStr(value.stThresholdNotes) };
    case 'sequence':
      return { kind: 'sequence', notes: asStr(value.stSequenceNotes) };
    case 'trial':
      return { kind: 'trial', notes: asStr(value.stTrialNotes) };
    case 'capacity':
      return { kind: 'capacity', notes: asStr(value.stCapacityNotes) };
    case 'gates':
      return { kind: 'gates', notes: asStr(value.stGatesNotes) };
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown SettlementMode: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// encode: SettlementModel -> FormValue (lossless inverse of decode)
// ---------------------------------------------------------------------------

export function encodeSettlement(_mode: SettlementMode, model: SettlementModel): FormValue {
  switch (model.kind) {
    case 'cohort':
      return { stCohortNotes: model.notes };
    case 'threshold':
      return { stThresholdNotes: model.notes };
    case 'sequence':
      return { stSequenceNotes: model.notes };
    case 'trial':
      return { stTrialNotes: model.notes };
    case 'capacity':
      return { stCapacityNotes: model.notes };
    case 'gates':
      return { stGatesNotes: model.notes };
    default: {
      const _exhaustive: never = model;
      throw new Error(`Unknown SettlementModel kind: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// validity gates (advisory: every mode is always recordable -- the habitability
// hard gates are SURFACED as guidance, not enforced as a blocking validity gate)
// ---------------------------------------------------------------------------

export function isSettlementValid(_mode: SettlementMode, _value: FormValue): boolean {
  return true;
}

// ---------------------------------------------------------------------------
// summaries (one line per mode; defensive)
// ---------------------------------------------------------------------------

export function summariseSettlement(mode: SettlementMode, _value: FormValue): string {
  switch (mode) {
    case 'cohort':
      return 'Founding cohort and phased composition defined (3 phases)';
    case 'threshold':
      return 'Habitability thresholds defined per cohort (hard gates)';
    case 'sequence':
      return 'Arrival sequence mapped to infrastructure milestones';
    case 'trial':
      return 'Trial residency terms defined (12-month provisional)';
    case 'capacity':
      return 'Carrying capacity established (6 households / ~14 people)';
    case 'gates':
      return 'Go/no-go gates defined per settlement phase (hard gates)';
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown SettlementMode: ${String(_exhaustive)}`);
    }
  }
}

// ===========================================================================
// React component + 6 mode bodies (c1..c6)
// ===========================================================================

export interface SettlementCaptureProps {
  mode: SettlementMode;
  value: FormValue;
  onChange: (next: FormValue) => void;
  /** this capture's own checklist item id (e.g. ev-s4-settlement-strategy-c1). */
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

export function SettlementCapture({
  mode,
  value,
  onChange,
  itemId,
  siblingValues = {},
}: SettlementCaptureProps): React.JSX.Element {
  void itemId;
  void siblingValues;

  // -- c1: cohort ----------------------------------------------------------
  if (mode === 'cohort') {
    const model = decodeSettlement('cohort', value) as CohortModel;
    return (
      <div className={css.root} data-st-mode="cohort">
        <div>
          <SectionEyebrow>Founding cohort and subsequent phases</SectionEyebrow>
          <div className={css.cohortList}>
            {COHORT_CARDS.map((c) => (
              <div
                key={c.badge}
                className={`${css.cohortCard} ${c.statusTone === 'active' ? css.cohortActive : ''}`}
              >
                <div className={css.ccHead}>
                  <span className={`${css.ccBadge} ${css[`ccBadge_${c.badge}`]}`}>{c.badge}</span>
                  <span className={css.ccTitle}>{c.title}</span>
                  <span className={`${css.ccStatus} ${css[`ccs_${c.statusTone}`]}`}>{c.status}</span>
                </div>
                {c.rows.map((r) => (
                  <div key={r.label} className={css.dataRow}>
                    <span className={css.drLbl}>{r.label}</span>
                    <span className={css.drVal}>{r.value}</span>
                  </div>
                ))}
                {c.members ? (
                  <div className={css.ccMembers}>
                    {c.members.map((m) => (
                      <span key={m} className={css.ccMember}>
                        {m}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className={css.ccNote}>{c.note}</div>
              </div>
            ))}
          </div>
        </div>
        <FeedsNote>
          Cohort composition feeds <strong>habitability threshold sizing</strong> (item 2),{' '}
          <strong>water demand calculations</strong> (item 5), and{' '}
          <strong>infrastructure design</strong> in Tier 4.
        </FeedsNote>
        <NotesField
          id="st-cohort-notes"
          label="Cohort plan notes"
          placeholder="Phase composition, household entry criteria, founding-member roles..."
          value={model.notes}
          onChange={(next) => onChange(encodeSettlement('cohort', { kind: 'cohort', notes: next }))}
        />
      </div>
    );
  }

  // -- c2: threshold -------------------------------------------------------
  if (mode === 'threshold') {
    const model = decodeSettlement('threshold', value) as ThresholdModel;
    return (
      <div className={css.root} data-st-mode="threshold">
        <InterpretationBlock tone="warn">{THRESHOLD_HARDGATE}</InterpretationBlock>
        <div>
          <SectionEyebrow>Infrastructure habitability thresholds</SectionEyebrow>
          {THRESHOLD_PHASES.map((p) => (
            <div key={p.badge} className={css.htPhase}>
              <div className={css.htHead}>
                <span className={css.htPhaseBadge}>{p.badge}</span>
                <span className={css.htTitle}>{p.title}</span>
              </div>
              <div className={css.thresholdList}>
                {p.items.map((it) => (
                  <div key={it.txt} className={css.thresholdItem}>
                    <span
                      className={`${css.thrDot} ${it.type === 'Hard' ? css.thrDotHard : css.thrDotSoft}`}
                    />
                    <span className={css.thrTxt}>{it.txt}</span>
                    <span
                      className={`${css.thrType} ${it.type === 'Hard' ? css.thrHard : css.thrSoft}`}
                    >
                      {it.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <FeedsNote>
          Habitability thresholds become <strong>Act task verification criteria</strong> - each
          hard gate generates a required sign-off before the corresponding cohort arrival can be
          logged.
        </FeedsNote>
        <NotesField
          id="st-threshold-notes"
          label="Threshold notes"
          placeholder="Per-phase hard/soft threshold confirmation, sign-off owners, verification method..."
          value={model.notes}
          onChange={(next) =>
            onChange(encodeSettlement('threshold', { kind: 'threshold', notes: next }))
          }
        />
      </div>
    );
  }

  // -- c3: sequence --------------------------------------------------------
  if (mode === 'sequence') {
    const model = decodeSettlement('sequence', value) as SequenceModel;
    return (
      <div className={css.root} data-st-mode="sequence">
        <div>
          <SectionEyebrow>Cohort arrivals against infrastructure milestones</SectionEyebrow>
          {SEQ_PHASES.map((p) => (
            <React.Fragment key={p.num}>
              <div className={css.seqPhase}>
                <div className={css.spHead}>
                  <span className={`${css.spNum} ${css[`spNum_${p.num}`]}`}>{p.num}</span>
                  <span className={css.spTitle}>{p.title}</span>
                  <span className={css.spTiming}>{p.timing}</span>
                </div>
                {p.milestones.map((m) => (
                  <div
                    key={m.txt}
                    className={`${css.milestoneItem} ${m.complete ? css.msComplete : ''}`}
                  >
                    <span className={css.msDot} />
                    <span className={css.msTxt}>{m.txt}</span>
                    <span className={`${css.msBadge} ${css[`ms_${m.badge}`]}`}>
                      {MILESTONE_LABEL[m.badge]}
                    </span>
                  </div>
                ))}
              </div>
              {p.connector ? <div className={css.seqConnector}>{p.connector}</div> : null}
            </React.Fragment>
          ))}
        </div>
        <FeedsNote>
          Milestone sequence feeds <strong>Act task scheduling</strong> and the{' '}
          <strong>Phase 1 implementation plan</strong>. Milestone completion triggers cohort
          arrival readiness reviews.
        </FeedsNote>
        <NotesField
          id="st-sequence-notes"
          label="Sequence notes"
          placeholder="Milestone ordering, dependency confirmation, estimated timing caveats..."
          value={model.notes}
          onChange={(next) =>
            onChange(encodeSettlement('sequence', { kind: 'sequence', notes: next }))
          }
        />
      </div>
    );
  }

  // -- c4: trial -----------------------------------------------------------
  if (mode === 'trial') {
    const model = decodeSettlement('trial', value) as TrialModel;
    return (
      <div className={css.root} data-st-mode="trial">
        <div>
          <SectionEyebrow>Trial period terms</SectionEyebrow>
          <div className={css.dataList}>
            {TRIAL_TERMS.map((r) => (
              <div key={r.label} className={css.dataRow}>
                <span className={css.drLbl}>{r.label}</span>
                <span className={css.drVal}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <SectionEyebrow>Evaluation criteria at trial end</SectionEyebrow>
          <div className={css.tcLbl}>{TRIAL_CRITERIA_LABEL}</div>
          <div className={css.tcList}>
            {TRIAL_CRITERIA.map((t) => (
              <div key={t.txt} className={`${css.tcItem} ${t.on ? css.tcOn : ''}`}>
                <span className={css.tcChk} />
                <span className={css.tcTxt}>{t.txt}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <SectionEyebrow>Possible trial outcomes</SectionEyebrow>
          <div className={css.toLbl}>{TRIAL_OUTCOME_LABEL}</div>
          <div className={css.outcomeBtns}>
            {TRIAL_OUTCOMES.map((o) => (
              <span key={o.txt} className={`${css.outBtn} ${css[`out_${o.tone}`]}`}>
                {o.txt}
              </span>
            ))}
          </div>
        </div>
        <FeedsNote>
          Trial residency terms feed the <strong>membership agreement document</strong> and the{' '}
          <strong>legal entity structure</strong>. A decline outcome triggers the exit process
          defined in Foundation Decisions.
        </FeedsNote>
        <NotesField
          id="st-trial-notes"
          label="Trial residency notes"
          placeholder="Duration, financial/legal/voting terms during trial, evaluation criteria, outcome process..."
          value={model.notes}
          onChange={(next) => onChange(encodeSettlement('trial', { kind: 'trial', notes: next }))}
        />
      </div>
    );
  }

  // -- c5: capacity --------------------------------------------------------
  if (mode === 'capacity') {
    const model = decodeSettlement('capacity', value) as CapacityModel;
    return (
      <div className={css.root} data-st-mode="capacity">
        <div>
          <SectionEyebrow>Maximum population by limiting resource</SectionEyebrow>
          <div className={css.capList}>
            {CAP_RESOURCES.map((c) => (
              <div key={c.name} className={css.capResource}>
                <div className={css.capHead}>
                  <span className={css.capName}>{c.name}</span>
                  <span className={`${css.capStatus} ${css[`cap_${c.statusTone}`]}`}>
                    {c.status}
                  </span>
                </div>
                {c.rows.map((r) => (
                  <div key={r.label} className={css.dataRow}>
                    <span className={css.drLbl}>{r.label}</span>
                    <span className={css.drVal}>{r.value}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className={css.capSummary}>
            {CAP_SUMMARY.map((s) => (
              <div key={s.label} className={css.csItem}>
                <span className={css.csN}>{s.value}</span>
                <span className={css.csLbl}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
        <FeedsNote>
          Population ceiling feeds <strong>go/no-go gate design</strong> (item 6) and becomes a
          hard cap on Phase 3 open membership. Any revision requires a formal community decision.
        </FeedsNote>
        <NotesField
          id="st-capacity-notes"
          label="Carrying capacity notes"
          placeholder="Limiting-resource confirmation, demand assumptions, governance-scale ceiling..."
          value={model.notes}
          onChange={(next) =>
            onChange(encodeSettlement('capacity', { kind: 'capacity', notes: next }))
          }
        />
      </div>
    );
  }

  // -- c6: gates -----------------------------------------------------------
  const model = decodeSettlement('gates', value) as GatesModel;
  return (
    <div className={css.root} data-st-mode="gates">
      <InterpretationBlock tone="warn">{GATES_HARDGATE}</InterpretationBlock>
      <div>
        <SectionEyebrow>Go/no-go criteria per settlement phase</SectionEyebrow>
        <div className={css.gateList}>
          {GATE_PHASES.map((g) => (
            <div key={g.title} className={`${css.gatePhase} ${css[`gate_${g.stateTone}`]}`}>
              <div className={css.gpHead}>
                <span className={css.gpTitle}>{g.title}</span>
                <span className={`${css.gpState} ${css[`gps_${g.stateTone}`]}`}>{g.state}</span>
              </div>
              <div className={css.gateCriteria}>
                {g.criteria.map((c) => (
                  <div key={c.txt} className={`${css.gcItem} ${css[`gc_${c.state}`]}`}>
                    <span className={css.gcDot} />
                    <span className={css.gcTxt}>{c.txt}</span>
                    <span className={css.gcHard}>Hard</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <FeedsNote>
        Go/no-go criteria generate <strong>Act verification tasks</strong> for each phase gate.
        Each hard criterion becomes a required sign-off in the Act checklist before the phase
        transition is recorded.
      </FeedsNote>
      <NotesField
        id="st-gates-notes"
        label="Go/no-go gate notes"
        placeholder="Per-phase hard criteria, current pass/fail status, founding-group approval..."
        value={model.notes}
        onChange={(next) => onChange(encodeSettlement('gates', { kind: 'gates', notes: next }))}
      />
    </div>
  );
}

export default SettlementCapture;
