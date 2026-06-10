/**
 * ConflictFrameworkCapture -- a multi-mode CONTROLLED capture for the ecovillage
 * objective ev-s1-conflict-framework ("A sound conflict resolution & community
 * agreement framework", 7 checklist items c1..c7). Ported from the governance
 * mockup (olos_governance_decision_dispute.html) right-hand panels p1..p7:
 *
 *   c1 -> decisionProcess     (decision model + numbered steps + quorum)
 *   c2 -> disputePathway      (3-tier escalation: informal / internal / external)
 *   c3 -> communityAgreements (4 sections of toggleable house rules + inline selects)
 *   c4 -> exitProcess         (5 member-exit selects + info callout)
 *   c5 -> dissolution         (6 dissolution selects + warn box)
 *   c6 -> reviewCadence       (5 cadence selects + 3 record-keeping selects)
 *   c7 -> signOff             (4 founding-household sign cards + pre-land-work HARD GATE)
 *
 * Validation follows the FORAGE style: isConflictFrameworkValid(mode, value)
 * decodes the flat FormValue internally and gates off it -- there is no separate
 * decoded-model prop threaded through DecisionWorkingPanel. decode/encode are
 * exported for the conformance tests (round-trip) and are TOTAL / defensive:
 * they never throw and never fabricate seed data (an empty FormValue decodes to
 * every select unset, no agreements enabled, every household "pending").
 *
 * SIMPLIFICATIONS (deferred follow-ups, by design, confirmed with the operator
 * 2026-06-09):
 *   - c7 sign-off roster is the mockup's 4 STATIC founding households
 *     (FOUNDING_HOUSEHOLDS). Wiring it to the project's real member roster is a
 *     deferred follow-up.
 *   - Mockup-default toggle/select states are NOT pre-seeded (decode never
 *     fabricates). The surface starts blank and the steward chooses; the
 *     validity gate makes the headline decisions mandatory before Record.
 *
 * ASCII-only: em-dash -> " -- "; no smart quotes; apostrophes use double-quoted
 * JS strings; all icons are lucide. FormValue keys are mode-namespaced ("cf*").
 */

import * as React from 'react';
import { ArrowRight, Check, Info, Lock, ShieldCheck, TriangleAlert } from 'lucide-react';

import type { FormValue } from './actToolCatalog.js';
import {
  Dropdown,
  InterpretationBlock,
  SectionEyebrow,
  StatusPill,
} from './captures/controls/index.js';
import css from './ConflictFrameworkCapture.module.css';

// ---------------------------------------------------------------------------
// Mode mapper
// ---------------------------------------------------------------------------

export type ConflictFrameworkMode =
  | 'decisionProcess'
  | 'disputePathway'
  | 'communityAgreements'
  | 'exitProcess'
  | 'dissolution'
  | 'reviewCadence'
  | 'signOff';

export const CONFLICT_FRAMEWORK_PREFIX = 'ev-s1-conflict-framework';
const PREFIX_DASH = CONFLICT_FRAMEWORK_PREFIX + '-';

export function conflictFrameworkModeFor(
  itemId: string,
): ConflictFrameworkMode | null {
  if (!itemId.startsWith(PREFIX_DASH)) return null;
  const suffix = itemId.slice(PREFIX_DASH.length);
  switch (suffix) {
    case 'c1':
      return 'decisionProcess';
    case 'c2':
      return 'disputePathway';
    case 'c3':
      return 'communityAgreements';
    case 'c4':
      return 'exitProcess';
    case 'c5':
      return 'dissolution';
    case 'c6':
      return 'reviewCadence';
    case 'c7':
      return 'signOff';
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Founding households (c7). VERBATIM from the mockup sign-off cards. Names are
// transliterated to ASCII per the project ASCII-only constraint. STATIC roster
// (real members-wiring is a deferred follow-up).
// ---------------------------------------------------------------------------

export type SignatureStatus = 'signed' | 'reservations' | 'pending';

export interface FoundingHousehold {
  id: string;
  initials: string;
  name: string;
  /** avatar palette slot (av1..av4) -> CSS data-avatar attribute */
  avatar: 'av1' | 'av2' | 'av3' | 'av4';
}

export const FOUNDING_HOUSEHOLDS: readonly FoundingHousehold[] = [
  { id: 'mc1', initials: 'SM', name: 'Sarah Mitchell', avatar: 'av1' },
  { id: 'mc2', initials: 'MD', name: 'Marcus Delacroix', avatar: 'av3' },
  { id: 'mc3', initials: 'AJ', name: 'Aroha & James Ngai', avatar: 'av2' },
  { id: 'mc4', initials: 'EY', name: 'Elif Yildiz & family', avatar: 'av4' },
];

const SIGNATURE_ACK =
  'I have read, understood, and agree to be bound by the community agreement ' +
  'framework including all dispute resolution and exit provisions.';

// c7 intro: the 5-item summary of what is being signed off (verbatim).
export const SIGNOFF_CHECKLIST: readonly string[] = [
  'Decision-making process with quorum requirements',
  'Dispute resolution pathway -- 3 tiers',
  'Community agreements -- noise, visitors, spaces, halal kitchen',
  'Member exit process -- 6-month notice, CLT settlement',
  'Dissolution protocol and review schedule',
];

// ---------------------------------------------------------------------------
// Verbatim select / toggle specs (per panel)
// ---------------------------------------------------------------------------

export interface SelectSpec {
  key: string;
  label: string;
  options: readonly string[];
}
interface StepSpec {
  num: number;
  title: string;
  desc: string;
  select?: SelectSpec;
}
interface TierSpec {
  id: string;
  title: string;
  trigger: string;
  selects: readonly SelectSpec[];
}
interface AgreementItem {
  id: string;
  label: string;
  select?: SelectSpec;
}
interface AgreementSection {
  title: string;
  items: readonly AgreementItem[];
}

// ---- c1 decisionProcess -------------------------------------------------

const DECISION_MODEL_SELECTS: readonly SelectSpec[] = [
  {
    key: 'cfPrimaryModel',
    label: 'Primary model',
    options: [
      'Consent -- "I can live with this" (not unanimous approval)',
      'Consensus -- everyone must agree',
      'Majority vote -- 3 of 4',
    ],
  },
  {
    key: 'cfMajorDecisions',
    label: 'Major decisions (land, finances, membership)',
    options: [
      'Consent of all founding households -- no unresolved objections',
      'Unanimous approval required',
    ],
  },
  {
    key: 'cfOperationalDecisions',
    label: 'Operational decisions',
    options: [
      'Spokesperson or steward role -- reports to community',
      'Vote at weekly check-in',
    ],
  },
];

const DECISION_STEPS: readonly StepSpec[] = [
  {
    num: 1,
    title: 'Proposal',
    desc: 'Any founding member can bring a proposal. Written proposals circulated before major decisions.',
    select: {
      key: 'cfStep1Notice',
      label: 'Notice period',
      options: [
        '48-hour notice for major decisions',
        '7-day notice',
        'Same-meeting proposals allowed',
      ],
    },
  },
  {
    num: 2,
    title: 'Clarifying questions only',
    desc: 'No advocacy -- ensure everyone understands before discussion begins.',
  },
  {
    num: 3,
    title: 'Discussion & amendments -- time-boxed',
    desc: 'Amendments can be proposed. Facilitator holds the time.',
    select: {
      key: 'cfStep3Time',
      label: 'Time box',
      options: ['30 minutes maximum', '60 minutes', 'No time limit'],
    },
  },
  {
    num: 4,
    title: 'Consent check',
    desc: 'Each household: Consent / Consent with concerns noted / Standstill (blocks decision). Standstill must be explained and is time-limited.',
    select: {
      key: 'cfStep4Standstill',
      label: 'Standstill rule',
      options: [
        'Standstill max 2 meetings -- then escalate to dispute pathway',
        'Standstill blocks indefinitely',
      ],
    },
  },
  {
    num: 5,
    title: 'Record & communicate',
    desc: 'Decision recorded with date, outcome, attendees. Filed in OLOS.',
  },
];

const QUORUM_SELECT: SelectSpec = {
  key: 'cfQuorum',
  label: 'Quorum',
  options: ['All 4 founding households', '3 of 4 (proxy allowed)'],
};

const QUORUM_NOTE =
  'All 4 required for: new membership, financial commitments over $2,500, land ' +
  'use changes, agreement amendments.';

// ---- c2 disputePathway --------------------------------------------------

const DISPUTE_TIERS: readonly TierSpec[] = [
  {
    id: 't1',
    title: 'Tier 1 -- Informal -- direct conversation',
    trigger: 'First response - always',
    selects: [
      {
        key: 'cfT1Who',
        label: 'Who resolves',
        options: [
          'Parties in dispute -- direct conversation within 5 days',
          'Buddy/mentor facilitates if requested',
        ],
      },
      {
        key: 'cfT1Timeline',
        label: 'Timeline',
        options: ['5 days - Tier 2 if unresolved', '7 days'],
      },
      {
        key: 'cfT1Doc',
        label: 'Documentation',
        options: ['No -- informal stays informal', 'Brief note filed'],
      },
    ],
  },
  {
    id: 't2',
    title: 'Tier 2 -- Internal facilitation',
    trigger: 'Tier 1 unresolved after 5 days',
    selects: [
      {
        key: 'cfT2Facilitator',
        label: 'Facilitator',
        options: [
          'SM -- consensus facilitation training',
          'Any non-involved founding member',
        ],
      },
      {
        key: 'cfT2Format',
        label: 'Format',
        options: [
          'Structured conversation -- facilitator holds process',
          'Written submissions first',
        ],
      },
      {
        key: 'cfT2Timeline',
        label: 'Timeline',
        options: ['Within 14 days of Tier 1 failure', 'Within 7 days'],
      },
      {
        key: 'cfT2Outcome',
        label: 'Outcome documented?',
        options: [
          'Yes -- resolution or escalation rationale filed in OLOS',
          'Only if community decision required',
        ],
      },
    ],
  },
  {
    id: 't3',
    title: 'Tier 3 -- External mediation or arbitration',
    trigger: 'Tier 2 unresolved or either party requests',
    selects: [
      {
        key: 'cfT3Mediator',
        label: 'External mediator',
        options: [
          'Community Mediation Services Ontario (pre-identified)',
          'Legal advisor nominates',
          'Joint selection',
        ],
      },
      {
        key: 'cfT3Cost',
        label: 'Cost of mediation',
        options: [
          'Shared equally between parties',
          'Community fund -- recovered from responsible party',
        ],
      },
      {
        key: 'cfT3Binding',
        label: 'Arbitration binding?',
        options: [
          'Yes -- outcome embedded in community agreement',
          'Advisory only',
        ],
      },
      {
        key: 'cfT3Fails',
        label: 'If Tier 3 fails or is refused',
        options: [
          'Exit process may be triggered per community agreement',
          "Legal action -- parties' own cost",
        ],
      },
    ],
  },
];

// ---- c3 communityAgreements --------------------------------------------

const AGREEMENT_SECTIONS: readonly AgreementSection[] = [
  {
    title: 'Noise & quiet hours',
    items: [
      {
        id: 'noise-quiet',
        label: 'Quiet hours -- no power tools or loud music',
        select: {
          key: 'cfQuietHours',
          label: 'Window',
          options: ['10pm-7am daily', '9pm-8am'],
        },
      },
      {
        id: 'noise-construction',
        label: 'Construction noise window',
        select: {
          key: 'cfConstructionWindow',
          label: 'Window',
          options: ['7am-7pm weekdays only', '7am-5pm'],
        },
      },
      {
        id: 'noise-exceptions',
        label: 'Exceptions require 48-hour notice to all households',
      },
    ],
  },
  {
    title: 'Visitors & guests',
    items: [
      {
        id: 'visitors-overnight',
        label: 'Overnight guests -- notify community',
        select: {
          key: 'cfOvernightNotify',
          label: 'When',
          options: ['If staying 3+ nights', 'Every overnight'],
        },
      },
      {
        id: 'visitors-extended',
        label: 'Extended guests (14+ nights) -- community consent required',
      },
      {
        id: 'visitors-halal',
        label:
          'Halal food standards observed in communal kitchen -- applies to all communal food preparation',
      },
    ],
  },
  {
    title: 'Shared spaces',
    items: [
      {
        id: 'spaces-kitchen',
        label: 'Communal kitchen -- clean after every use',
        select: {
          key: 'cfKitchenClean',
          label: 'By when',
          options: ['Same day', 'Within 24 hours'],
        },
      },
      {
        id: 'spaces-tools',
        label: 'Communal tools -- return to designated location same day',
      },
      {
        id: 'spaces-private',
        label: 'Private zone boundaries respected -- no entry without invitation',
      },
    ],
  },
  {
    title: 'Communication standards',
    items: [
      {
        id: 'comms-urgent',
        label: 'Urgent messages -- respond within 2 hours during waking hours',
      },
      {
        id: 'comms-concerns',
        label:
          'Concerns about a household -- raise directly with them first (not via others)',
      },
      {
        id: 'comms-social',
        label:
          'No external community commentary on social media without spokesperson confirmation',
      },
    ],
  },
];

const AGREEMENT_IDS: readonly string[] = AGREEMENT_SECTIONS.flatMap((s) =>
  s.items.map((i) => i.id),
);
const AGREEMENT_ID_SET = new Set<string>(AGREEMENT_IDS);
const AGREEMENT_SELECT_KEYS: readonly string[] = AGREEMENT_SECTIONS.flatMap((s) =>
  s.items.filter((i) => i.select).map((i) => i.select!.key),
);

// ---- c4 exitProcess -----------------------------------------------------

const EXIT_SELECTS: readonly SelectSpec[] = [
  {
    key: 'cfExitNotice',
    label: 'Written notice from exiting household',
    options: [
      '6 months -- time to find replacement household',
      '3 months',
      '12 months',
    ],
  },
  {
    key: 'cfExitSettlement',
    label: 'Financial settlement basis',
    options: [
      'Buy-in paid minus outstanding obligations',
      'Buy-in returned in full',
    ],
  },
  {
    key: 'cfExitDwelling',
    label: 'Dwelling transition',
    options: [
      'Community identifies replacement -- CLT transfer process',
      'Open market (not permitted in CLT model)',
    ],
  },
  {
    key: 'cfExitMembership',
    label: 'Membership rights during notice period',
    options: ['Full rights maintained -- levy continues', 'Advisory role -- no vote'],
  },
  {
    key: 'cfExitEmergency',
    label: 'Emergency exit (welfare or safety)',
    options: [
      'Notice period waived -- community acts in good faith on settlement',
      'Minimum 1 month even in emergency',
    ],
  },
];

const EXIT_NOTE =
  'Exit and succession run in parallel during the notice period: buy-in ' +
  'settlement, dwelling transfer, and the replacement-household search proceed ' +
  'together so the community is never left short.';

// ---- c5 dissolution -----------------------------------------------------

const DISSOLUTION_SELECTS: readonly SelectSpec[] = [
  {
    key: 'cfDisProposedBy',
    label: 'Dissolution can be proposed by',
    options: ['Any founding member -- written notice to all', 'Majority of members'],
  },
  {
    key: 'cfDisDecision',
    label: 'Decision to dissolve requires',
    options: ['Unanimous agreement of all full members', 'Supermajority (75%)'],
  },
  {
    key: 'cfDisMediation',
    label: 'External mediation before dissolution vote',
    options: ['Required -- all members must participate', 'Recommended -- not required'],
  },
  {
    key: 'cfDisLand',
    label: 'Land disposition',
    options: [
      'CLT retains land -- cannot be distributed to individuals',
      'Sold -- proceeds distributed pro-rata',
    ],
  },
  {
    key: 'cfDisDwelling',
    label: 'Dwelling value returned to each household',
    options: ['CLT resale formula value', 'Market value -- independent appraisal'],
  },
  {
    key: 'cfDisAssets',
    label: 'Communal assets',
    options: [
      'Sold -- proceeds per buy-in proportion after obligations',
      'Members purchase at agreed valuation',
    ],
  },
];

const DISSOLUTION_WARN =
  'Define this before the community needs it. Dissolution provisions in the CLT ' +
  'constitution are far simpler to implement than provisions invented during ' +
  'dissolution itself.';

// ---- c6 reviewCadence ---------------------------------------------------

const CADENCE_SELECTS: readonly SelectSpec[] = [
  {
    key: 'cfCadCheckin',
    label: 'Community check-in -- wellbeing & operations',
    options: ['Weekly', 'Fortnightly', 'Monthly'],
  },
  {
    key: 'cfCadGovernance',
    label: 'Governance check -- agreements & decisions',
    options: ['Monthly', 'Quarterly', 'Biannual'],
  },
  {
    key: 'cfCadAnnual',
    label: 'Annual management review -- land + community health',
    options: ['Annually (February)', 'Annually (September)'],
  },
  {
    key: 'cfCadFull',
    label: 'Full agreement review & revision',
    options: ['Every 2 years', 'Annually', 'Every 5 years'],
  },
  {
    key: 'cfCadFiveYear',
    label: '5-year comprehensive review -- Stratum 1 vision',
    options: ['Year 5 then every 5 years'],
  },
];

const RECORDKEEPING_SELECTS: readonly SelectSpec[] = [
  {
    key: 'cfRecIn',
    label: 'Formal decisions recorded in',
    options: [
      'OLOS -- community governance log',
      'Community shared drive',
      'Both',
    ],
  },
  {
    key: 'cfRecIncludes',
    label: 'Each decision record includes',
    options: [
      'Date - what decided - who present - any dissent',
      'Date and outcome only',
    ],
  },
  {
    key: 'cfRecAmendments',
    label: 'Agreement amendments -- how proposed',
    options: [
      'Written proposal + 7-day notice + consent model',
      'Raise at any community meeting',
    ],
  },
];

// ---------------------------------------------------------------------------
// Per-mode SELECT key sets (drive decode / encode / validity) + required subset
// ---------------------------------------------------------------------------

const DECISION_PROCESS_KEYS: readonly string[] = [
  ...DECISION_MODEL_SELECTS.map((s) => s.key),
  ...DECISION_STEPS.filter((s) => s.select).map((s) => s.select!.key),
  QUORUM_SELECT.key,
];
const DISPUTE_KEYS: readonly string[] = DISPUTE_TIERS.flatMap((t) =>
  t.selects.map((s) => s.key),
);
const EXIT_KEYS: readonly string[] = EXIT_SELECTS.map((s) => s.key);
const DISSOLUTION_KEYS: readonly string[] = DISSOLUTION_SELECTS.map((s) => s.key);
const CADENCE_KEYS: readonly string[] = [
  ...CADENCE_SELECTS.map((s) => s.key),
  ...RECORDKEEPING_SELECTS.map((s) => s.key),
];

/** Every persisted select key for a select-only mode. */
const SELECT_KEYS_BY_MODE: Record<string, readonly string[]> = {
  decisionProcess: DECISION_PROCESS_KEYS,
  disputePathway: DISPUTE_KEYS,
  exitProcess: EXIT_KEYS,
  dissolution: DISSOLUTION_KEYS,
  reviewCadence: CADENCE_KEYS,
};

/** Headline selects that must be chosen before Record (subset of the above). */
const REQUIRED_KEYS_BY_MODE: Record<string, readonly string[]> = {
  decisionProcess: ['cfPrimaryModel', 'cfQuorum'],
  disputePathway: ['cfT1Who', 'cfT2Facilitator', 'cfT3Mediator'],
  exitProcess: EXIT_KEYS,
  dissolution: DISSOLUTION_KEYS,
  reviewCadence: CADENCE_SELECTS.map((s) => s.key),
};

// ---------------------------------------------------------------------------
// Models (kind-discriminated)
// ---------------------------------------------------------------------------

export interface SelectModeModel {
  kind: 'decisionProcess' | 'disputePathway' | 'exitProcess' | 'dissolution' | 'reviewCadence';
  /** every key in SELECT_KEYS_BY_MODE[kind]; unset -> "" */
  sel: Record<string, string>;
}
export interface CommunityAgreementsModel {
  kind: 'communityAgreements';
  /** enabled agreement ids (subset of AGREEMENT_IDS) */
  enabled: string[];
  /** the four inline-select values; unset -> "" */
  sel: Record<string, string>;
}
export interface SignOffModel {
  kind: 'signOff';
  /** household id -> status; households absent from the map are "pending" */
  signatures: Record<string, SignatureStatus>;
}
export type ConflictFrameworkModel =
  | SelectModeModel
  | CommunityAgreementsModel
  | SignOffModel;

// ---------------------------------------------------------------------------
// FormValue coercion helpers
// ---------------------------------------------------------------------------

function asStr(v: FormValue[string] | undefined): string {
  return typeof v === 'string' ? v : '';
}
function asArr(v: FormValue[string] | undefined): string[] {
  if (Array.isArray(v)) return v;
  return typeof v === 'string' && v !== '' ? [v] : [];
}

function selFrom(keys: readonly string[], value: FormValue): Record<string, string> {
  const sel: Record<string, string> = {};
  for (const k of keys) sel[k] = asStr(value[k]);
  return sel;
}

function isSelectMode(
  mode: ConflictFrameworkMode,
): mode is SelectModeModel['kind'] {
  return (
    mode === 'decisionProcess' ||
    mode === 'disputePathway' ||
    mode === 'exitProcess' ||
    mode === 'dissolution' ||
    mode === 'reviewCadence'
  );
}

// ---------------------------------------------------------------------------
// decode: FormValue -> ConflictFrameworkModel (TOTAL / defensive)
// ---------------------------------------------------------------------------

export function decodeConflictFramework(
  mode: ConflictFrameworkMode,
  value: FormValue,
): ConflictFrameworkModel {
  if (isSelectMode(mode)) {
    return { kind: mode, sel: selFrom(SELECT_KEYS_BY_MODE[mode] ?? [], value) };
  }
  if (mode === 'communityAgreements') {
    const enabled = asArr(value.cfAgreements).filter((id) =>
      AGREEMENT_ID_SET.has(id),
    );
    return {
      kind: 'communityAgreements',
      enabled,
      sel: selFrom(AGREEMENT_SELECT_KEYS, value),
    };
  }
  // signOff
  const signatures: Record<string, SignatureStatus> = {};
  for (const entry of asArr(value.cfSignatures)) {
    const idx = entry.indexOf('::');
    if (idx < 0) continue;
    const id = entry.slice(0, idx);
    const raw = entry.slice(idx + 2);
    if (!FOUNDING_HOUSEHOLDS.some((h) => h.id === id)) continue;
    if (raw === 'signed' || raw === 'reservations' || raw === 'pending') {
      signatures[id] = raw;
    }
  }
  return { kind: 'signOff', signatures };
}

// ---------------------------------------------------------------------------
// encode: ConflictFrameworkModel -> FormValue (lossless inverse of decode)
// ---------------------------------------------------------------------------

export function encodeConflictFramework(
  model: ConflictFrameworkModel,
): FormValue {
  if (model.kind === 'communityAgreements') {
    const out: FormValue = { cfAgreements: [...model.enabled] };
    for (const k of AGREEMENT_SELECT_KEYS) out[k] = model.sel[k] ?? '';
    return out;
  }
  if (model.kind === 'signOff') {
    const cfSignatures = FOUNDING_HOUSEHOLDS.filter(
      (h) => (model.signatures[h.id] ?? 'pending') !== 'pending',
    ).map((h) => `${h.id}::${model.signatures[h.id]}`);
    return { cfSignatures };
  }
  const out: FormValue = {};
  for (const k of SELECT_KEYS_BY_MODE[model.kind] ?? []) out[k] = model.sel[k] ?? '';
  return out;
}

// ---------------------------------------------------------------------------
// validity (FORAGE style: decodes internally, sees own value only)
// ---------------------------------------------------------------------------

/** A household has signed when it is "signed" OR "signed with reservations". */
export function statusFor(
  signatures: Record<string, SignatureStatus>,
  householdId: string,
): SignatureStatus {
  return signatures[householdId] ?? 'pending';
}

export function isConflictFrameworkValid(
  mode: ConflictFrameworkMode,
  value: FormValue,
): boolean {
  if (mode === 'communityAgreements') {
    const model = decodeConflictFramework('communityAgreements', value) as CommunityAgreementsModel;
    return model.enabled.length >= 1;
  }
  if (mode === 'signOff') {
    const model = decodeConflictFramework('signOff', value) as SignOffModel;
    return FOUNDING_HOUSEHOLDS.every((h) => {
      const s = statusFor(model.signatures, h.id);
      return s === 'signed' || s === 'reservations';
    });
  }
  const required = REQUIRED_KEYS_BY_MODE[mode] ?? [];
  return required.every((k) => asStr(value[k]).trim() !== '');
}

// ---------------------------------------------------------------------------
// summaries
// ---------------------------------------------------------------------------

/** First segment of an option label (before the " -- " qualifier). */
function head(option: string): string {
  const i = option.indexOf(' -- ');
  return (i >= 0 ? option.slice(0, i) : option).trim();
}

export function summariseConflictFramework(
  mode: ConflictFrameworkMode,
  value: FormValue,
): string {
  switch (mode) {
    case 'decisionProcess': {
      const sel = selFrom(DECISION_PROCESS_KEYS, value);
      const primary = sel.cfPrimaryModel ? head(sel.cfPrimaryModel) : 'unset';
      const quorum = sel.cfQuorum || 'quorum unset';
      return `${primary} model -- ${quorum}`;
    }
    case 'disputePathway': {
      const set = DISPUTE_KEYS.filter((k) => asStr(value[k]).trim() !== '').length;
      if (set >= DISPUTE_KEYS.length) return '3-tier dispute pathway defined';
      return `Dispute pathway -- ${set} of ${DISPUTE_KEYS.length} options set`;
    }
    case 'communityAgreements': {
      const model = decodeConflictFramework('communityAgreements', value) as CommunityAgreementsModel;
      const n = model.enabled.length;
      return `${n} community ${n === 1 ? 'agreement' : 'agreements'} adopted`;
    }
    case 'exitProcess': {
      const notice = asStr(value.cfExitNotice);
      return notice
        ? `Exit process -- ${head(notice)} notice`
        : 'Exit process defined';
    }
    case 'dissolution': {
      const land = asStr(value.cfDisLand);
      return land
        ? `Dissolution protocol -- ${head(land)}`
        : 'Dissolution protocol defined';
    }
    case 'reviewCadence': {
      const checkin = asStr(value.cfCadCheckin);
      return checkin
        ? `Review cadence -- ${checkin} check-in`
        : 'Review cadence defined';
    }
    case 'signOff': {
      const model = decodeConflictFramework('signOff', value) as SignOffModel;
      let signed = 0;
      let reservations = 0;
      for (const h of FOUNDING_HOUSEHOLDS) {
        const s = statusFor(model.signatures, h.id);
        if (s === 'signed' || s === 'reservations') signed++;
        if (s === 'reservations') reservations++;
      }
      const base = `${signed}/${FOUNDING_HOUSEHOLDS.length} households signed`;
      return reservations > 0 ? `${base} (${reservations} with reservations)` : base;
    }
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown ConflictFrameworkMode: ${String(_exhaustive)}`);
    }
  }
}

// ===========================================================================
// React component + 7 mode bodies
// ===========================================================================

export interface ConflictFrameworkCaptureProps {
  mode: ConflictFrameworkMode;
  value: FormValue;
  onChange: (next: FormValue) => void;
  /** this capture's own checklist item id (e.g. ev-s1-conflict-framework-c1). */
  itemId: string;
  /** owning project id; consumed at Record time, unused for rendering. */
  projectId: string;
}

/** Labelled single-select row backed by Dropdown (stores the chosen label). */
function SelectRow({
  spec,
  value,
  onChange,
}: {
  spec: SelectSpec;
  value: string;
  onChange: (next: string) => void;
}): React.JSX.Element {
  return (
    <div className={css.field}>
      <span className={css.fieldLbl}>{spec.label}</span>
      <Dropdown
        options={spec.options}
        value={value}
        onChange={onChange}
        ariaLabel={spec.label}
      />
    </div>
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

export function ConflictFrameworkCapture({
  mode,
  value,
  onChange,
  itemId,
  projectId,
}: ConflictFrameworkCaptureProps): React.JSX.Element {
  void itemId;
  void projectId;

  // ----- shared select-mode emitter -----
  const setSelect = (key: string, next: string): void => {
    onChange({ ...value, [key]: next });
  };

  // ===================== c1 decisionProcess =====================
  if (mode === 'decisionProcess') {
    return (
      <div className={css.root} data-cf-mode="decisionProcess">
        <div className={css.group}>
          <SectionEyebrow>Decision model</SectionEyebrow>
          {DECISION_MODEL_SELECTS.map((spec) => (
            <SelectRow
              key={spec.key}
              spec={spec}
              value={asStr(value[spec.key])}
              onChange={(next) => setSelect(spec.key, next)}
            />
          ))}
        </div>
        <div className={css.fdiv} aria-hidden="true" />
        <div className={css.group}>
          <SectionEyebrow>Decision steps</SectionEyebrow>
          {DECISION_STEPS.map((step) => (
            <div key={step.num} className={css.stepRow}>
              <span className={css.stepNum}>{step.num}</span>
              <div className={css.stepBody}>
                <div className={css.stepTitle}>{step.title}</div>
                <div className={css.stepDesc}>{step.desc}</div>
                {step.select ? (
                  <SelectRow
                    spec={step.select}
                    value={asStr(value[step.select.key])}
                    onChange={(next) => setSelect(step.select!.key, next)}
                  />
                ) : null}
              </div>
            </div>
          ))}
        </div>
        <div className={css.fdiv} aria-hidden="true" />
        <div className={css.group}>
          <SectionEyebrow>Quorum</SectionEyebrow>
          <SelectRow
            spec={QUORUM_SELECT}
            value={asStr(value[QUORUM_SELECT.key])}
            onChange={(next) => setSelect(QUORUM_SELECT.key, next)}
          />
          <div className={css.infoNote}>
            <Info size={13} className={css.infoIcon} aria-hidden="true" />
            <span>{QUORUM_NOTE}</span>
          </div>
        </div>
        <FeedsNote>
          The decision model and quorum feed the{' '}
          <strong>spokesperson / steward role</strong> and every recorded
          community decision.
        </FeedsNote>
      </div>
    );
  }

  // ===================== c2 disputePathway =====================
  if (mode === 'disputePathway') {
    return (
      <div className={css.root} data-cf-mode="disputePathway">
        {DISPUTE_TIERS.map((tier) => (
          <div key={tier.id} className={css.tierCard} data-tier={tier.id}>
            <div className={css.tierHead}>
              <span className={css.tierTitle}>{tier.title}</span>
              <span className={css.tierTrigger}>{tier.trigger}</span>
            </div>
            {tier.selects.map((spec) => (
              <SelectRow
                key={spec.key}
                spec={spec}
                value={asStr(value[spec.key])}
                onChange={(next) => setSelect(spec.key, next)}
              />
            ))}
          </div>
        ))}
        <FeedsNote>
          The dispute pathway feeds the <strong>community agreement</strong> and
          the <strong>member exit process</strong> -- Tier 3 may trigger exit.
        </FeedsNote>
      </div>
    );
  }

  // ===================== c3 communityAgreements =====================
  if (mode === 'communityAgreements') {
    const model = decodeConflictFramework('communityAgreements', value) as CommunityAgreementsModel;
    const enabled = new Set(model.enabled);
    const toggle = (id: string): void => {
      const next = new Set(enabled);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      onChange(
        encodeConflictFramework({
          kind: 'communityAgreements',
          enabled: AGREEMENT_IDS.filter((aid) => next.has(aid)),
          sel: model.sel,
        }),
      );
    };
    return (
      <div className={css.root} data-cf-mode="communityAgreements">
        {AGREEMENT_SECTIONS.map((section) => (
          <div key={section.title} className={css.group}>
            <SectionEyebrow>{section.title}</SectionEyebrow>
            {section.items.map((item) => {
              const on = enabled.has(item.id);
              return (
                <div
                  key={item.id}
                  className={css.agreementRow}
                  data-on={on ? 'true' : 'false'}
                  data-agreement-id={item.id}
                >
                  <button
                    type="button"
                    className={css.agreeCheck}
                    data-on={on ? 'true' : 'false'}
                    aria-pressed={on}
                    aria-label={item.label}
                    onClick={() => toggle(item.id)}
                  >
                    {on ? <Check size={12} /> : null}
                  </button>
                  <div className={css.agreeBody}>
                    <div className={css.agreeTitle}>{item.label}</div>
                    {item.select && on ? (
                      <SelectRow
                        spec={item.select}
                        value={asStr(value[item.select.key])}
                        onChange={(next) => setSelect(item.select!.key, next)}
                      />
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <FeedsNote>
          Adopted agreements become the <strong>community charter</strong> that
          every founding household signs off in the final decision.
        </FeedsNote>
      </div>
    );
  }

  // ===================== c4 exitProcess =====================
  if (mode === 'exitProcess') {
    return (
      <div className={css.root} data-cf-mode="exitProcess">
        <div className={css.group}>
          <SectionEyebrow>Member exit process</SectionEyebrow>
          {EXIT_SELECTS.map((spec) => (
            <SelectRow
              key={spec.key}
              spec={spec}
              value={asStr(value[spec.key])}
              onChange={(next) => setSelect(spec.key, next)}
            />
          ))}
        </div>
        <InterpretationBlock tone="info">{EXIT_NOTE}</InterpretationBlock>
        <FeedsNote>
          The exit process feeds the <strong>CLT settlement</strong> and the
          replacement-household search.
        </FeedsNote>
      </div>
    );
  }

  // ===================== c5 dissolution =====================
  if (mode === 'dissolution') {
    return (
      <div className={css.root} data-cf-mode="dissolution">
        <div className={css.group}>
          <SectionEyebrow>Dissolution protocol</SectionEyebrow>
          {DISSOLUTION_SELECTS.map((spec) => (
            <SelectRow
              key={spec.key}
              spec={spec}
              value={asStr(value[spec.key])}
              onChange={(next) => setSelect(spec.key, next)}
            />
          ))}
        </div>
        <div className={css.warnBox} role="note">
          <TriangleAlert size={14} className={css.warnIcon} aria-hidden="true" />
          <span>{DISSOLUTION_WARN}</span>
        </div>
        <FeedsNote>
          Dissolution provisions belong in the <strong>CLT constitution</strong>{' '}
          -- record them here before the community needs them.
        </FeedsNote>
      </div>
    );
  }

  // ===================== c6 reviewCadence =====================
  if (mode === 'reviewCadence') {
    return (
      <div className={css.root} data-cf-mode="reviewCadence">
        <div className={css.group}>
          <SectionEyebrow>Review cadence</SectionEyebrow>
          {CADENCE_SELECTS.map((spec) => (
            <SelectRow
              key={spec.key}
              spec={spec}
              value={asStr(value[spec.key])}
              onChange={(next) => setSelect(spec.key, next)}
            />
          ))}
        </div>
        <div className={css.fdiv} aria-hidden="true" />
        <div className={css.group}>
          <SectionEyebrow>Decision record-keeping</SectionEyebrow>
          {RECORDKEEPING_SELECTS.map((spec) => (
            <SelectRow
              key={spec.key}
              spec={spec}
              value={asStr(value[spec.key])}
              onChange={(next) => setSelect(spec.key, next)}
            />
          ))}
        </div>
        <FeedsNote>
          The review cadence feeds the <strong>Act routine schedule</strong> --
          each cadence generates a recurring governance check.
        </FeedsNote>
      </div>
    );
  }

  // ===================== c7 signOff =====================
  const model = decodeConflictFramework('signOff', value) as SignOffModel;
  const setStatus = (id: string, status: SignatureStatus): void => {
    const current = statusFor(model.signatures, id);
    const next: Record<string, SignatureStatus> = { ...model.signatures };
    // Clicking the active state again clears it back to pending.
    next[id] = current === status ? 'pending' : status;
    onChange(encodeConflictFramework({ kind: 'signOff', signatures: next }));
  };

  let signedCount = 0;
  let reservationsCount = 0;
  for (const h of FOUNDING_HOUSEHOLDS) {
    const s = statusFor(model.signatures, h.id);
    if (s === 'signed' || s === 'reservations') signedCount++;
    if (s === 'reservations') reservationsCount++;
  }
  const allSigned = signedCount === FOUNDING_HOUSEHOLDS.length;
  const unlocked = allSigned;

  let gateTone: 'pass' | 'warn' | 'info' = 'info';
  let gateText: string;
  if (!allSigned) {
    gateText =
      'Awaiting all 4 household signatures. No land work -- groundworks, ' +
      'construction, or infrastructure -- begins until all members have signed.';
  } else if (reservationsCount > 0) {
    gateTone = 'warn';
    gateText =
      'One or more members have noted reservations. Discuss before proceeding. ' +
      'Land work can begin if all accept the framework with reservations noted.';
  } else {
    gateTone = 'pass';
    gateText =
      'All 4 founding households have signed. Community agreement framework is ' +
      'complete. Land work may now begin.';
  }

  const pillFor = (s: SignatureStatus): React.JSX.Element => {
    if (s === 'signed') return <StatusPill label="Signed" tone="success" />;
    if (s === 'reservations')
      return <StatusPill label="Signed w/ reservations" tone="warn" />;
    return <StatusPill label="Pending" tone="neutral" />;
  };

  return (
    <div className={css.root} data-cf-mode="signOff">
      <div className={css.checkList}>
        <div className={css.checkListLbl}>Framework being signed off</div>
        {SIGNOFF_CHECKLIST.map((line) => (
          <div key={line} className={css.checkItem}>
            <Check size={12} className={css.checkItemIcon} aria-hidden="true" />
            <span>{line}</span>
          </div>
        ))}
      </div>

      {FOUNDING_HOUSEHOLDS.map((h) => {
        const s = statusFor(model.signatures, h.id);
        return (
          <div
            key={h.id}
            className={css.signCard}
            data-household-id={h.id}
            data-status={s}
          >
            <div className={css.signHead}>
              <span className={css.avatar} data-avatar={h.avatar} aria-hidden="true">
                {h.initials}
              </span>
              <span className={css.signName}>{h.name}</span>
              {pillFor(s)}
            </div>
            <div className={css.signAck}>{SIGNATURE_ACK}</div>
            <div className={css.signBtns}>
              <button
                type="button"
                className={css.signBtn}
                data-tone="signed"
                data-on={s === 'signed' ? 'true' : 'false'}
                aria-pressed={s === 'signed'}
                onClick={() => setStatus(h.id, 'signed')}
              >
                <Check size={13} />
                Signed -- I agree
              </button>
              <button
                type="button"
                className={css.signBtn}
                data-tone="reservations"
                data-on={s === 'reservations' ? 'true' : 'false'}
                aria-pressed={s === 'reservations'}
                onClick={() => setStatus(h.id, 'reservations')}
              >
                Signed with reservations
              </button>
            </div>
          </div>
        );
      })}

      <div className={css.gateBox} data-tone={gateTone} data-unlocked={unlocked ? 'true' : 'false'} role="note">
        <span className={css.gateIcon} aria-hidden="true">
          {unlocked ? <ShieldCheck size={15} /> : <Lock size={15} />}
        </span>
        <div className={css.gateBody}>
          <div className={css.gateStatus}>
            {signedCount}/{FOUNDING_HOUSEHOLDS.length} households signed
          </div>
          <div className={css.gateTxt}>{gateText}</div>
        </div>
      </div>

      <FeedsNote>
        All 4 founding households must sign before <strong>land work</strong>{' '}
        -- groundworks, construction, or infrastructure -- unlocks.
      </FeedsNote>
    </div>
  );
}

export default ConflictFrameworkCapture;
