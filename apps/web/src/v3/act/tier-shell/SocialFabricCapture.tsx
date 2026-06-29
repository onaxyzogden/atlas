/**
 * SocialFabricCapture -- a multi-mode CONTROLLED (advisory) capture for the
 * ecovillage objective ev-s2-social-fabric ("A clear read of community
 * relationships & social fabric", 6 checklist items c1..c6). Ported from
 * olos_social_fabric_survey.html right-hand panels p1..p6. Catalogue item order
 * == mockup panel order:
 *
 *   c1 -> relationships  (mockup p1: 4-household relationship map -- since / depth / co-hab)
 *   c2 -> experience     (mockup p2: 4-household experience chips + notes + tally)
 *   c3 -> priorattempts  (mockup p3: repeatable prior-attempt register + no-attempts confirm)
 *   c4 -> cohesion       (mockup p4: 6 cohesion domains, 4-way level + note, summary)
 *   c5 -> skills         (mockup p5: 6 skill domains, chip toggles, auto gap badge)
 *   c6 -> networks       (mockup p6: 6 external-network toggles + custom contact)
 *
 * Structure mirrors FoodSystemCapture / CultivarCapture (the canonical advisory
 * multi-mode captures): a `socialFabricModeFor(itemId)` mapper plus a single
 * component that renders ONE mode body. The third-column host
 * (DecisionWorkingPanel) owns the eyebrow / title / hint / Record-Defer chrome;
 * this capture renders ONLY the scrollable mode body (the mockup's `.rb`).
 *
 * ADVISORY / pure: the model is always derived from decode(value) each render;
 * the full next model is emitted via onChange(encode(next)). The capture holds
 * NO local state for persisted values. NO projectId prop; writes NOTHING to any
 * store; reads NO siblings for computation (siblingValues is accepted for
 * signature uniformity but is never read to drive logic). All modes are seeded
 * VALID from the mockup defaults; priorattempts is the only genuine gate (it
 * becomes invalid if every attempt is removed AND "no prior attempts" is left
 * unchecked).
 *
 * This is a SURVEY objective -- a Tier-0 observation that feeds Tier 3
 * feasibility and Tier 6 phasing. No decisions are committed here; there is no
 * sale / contribution copy and therefore no Amanah surface.
 *
 * Register-style multi-row sets serialize COLUMN-WISE as parallel string[]
 * (FormFieldValue is `string | string[]`; arrays of row-objects are not a legal
 * FormValue). Per-household chip sets (experience, skills) are stored under
 * indexed keys (sfExpChips0.. / sfSkills0..). Toggle / checkbox sets are stored
 * as parallel "on"/"" string[].
 *
 * ASCII-only: em-dash -> " -- "; en-dash -> "-"; middot -> " - "; ">=" / "<=";
 * accents folded (Aroha & James Ngai, Elif Yildiz); icon glyphs -> lucide.
 * Apostrophes use double-quoted JS strings. Colors via --color-* tokens only.
 */

import * as React from 'react';
import { ArrowRight, Check, Plus, X } from 'lucide-react';

import type { FormValue } from './actToolCatalog.js';
import type { FoundingHousehold } from './ConflictFrameworkCapture.js';
import { ChipSelect, SectionEyebrow } from './captures/controls/index.js';
import css from './SocialFabricCapture.module.css';

// ---------------------------------------------------------------------------
// Mode mapper
// ---------------------------------------------------------------------------

export type SocialFabricMode =
  | 'relationships' // c1
  | 'experience' // c2
  | 'priorattempts' // c3
  | 'cohesion' // c4
  | 'skills' // c5
  | 'networks'; // c6

export const SOCIAL_FABRIC_PREFIX = 'ev-s2-social-fabric';
const PREFIX_DASH = SOCIAL_FABRIC_PREFIX + '-';

export function socialFabricModeFor(itemId: string): SocialFabricMode | null {
  if (!itemId.startsWith(PREFIX_DASH)) return null;
  const suffix = itemId.slice(PREFIX_DASH.length);
  switch (suffix) {
    case 'c1':
      return 'relationships';
    case 'c2':
      return 'experience';
    case 'c3':
      return 'priorattempts';
    case 'c4':
      return 'cohesion';
    case 'c5':
      return 'skills';
    case 'c6':
      return 'networks';
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Verbatim canonical content (never reword; ASCII-normalized per task spec)
// ---------------------------------------------------------------------------

/** avatar tone slot 1..4 (success / info / stage-act / error) */
export type AvTone = '1' | '2' | '3' | '4';

const TONE_SLOTS: readonly AvTone[] = ['1', '2', '3', '4'];

// -- relationships (c1) -- 4-household relationship map (mockup p1) --

export const REL_SINCE_OPTIONS: readonly string[] = [
  'Less than 1 year',
  '1-2 years',
  '3-5 years',
  '6-10 years',
  '10+ years',
];
export const REL_DEPTH_OPTIONS: readonly string[] = [
  'Acquaintance',
  'Colleague',
  'Close friend',
  'Lifelong friend / family',
];
export const REL_COHAB_OPTIONS: readonly string[] = [
  'None',
  'Shared work project',
  'Flatmates / housemates',
  'Extended project >1 year',
];

export interface RelHouseholdSpec {
  key: string;
  initials: string;
  tone: AvTone;
  name: string;
  /** role / subtitle line; "" when only the household number is shown */
  role: string;
  /** mockup ships a note textarea for this household (EY has none) */
  hasNote: boolean;
  since: string;
  depth: string;
  cohab: string;
}
/** Derive household specs for c1 (relationships) from the real founding roster. */
export function relHouseholdsFrom(
  roster: readonly FoundingHousehold[],
): readonly RelHouseholdSpec[] {
  return roster.map((h, i) => ({
    key: h.id,
    initials: h.initials,
    tone: TONE_SLOTS[i % 4]!,
    name: h.name,
    role: i === 0 ? 'Primary steward - initiating member' : `Household ${i + 1}`,
    hasNote: true,
    since: '',
    depth: '',
    cohab: '',
  }));
}

export const REL_NOTE_PLACEHOLDER =
  'Notes on relationship history, conflicts resolved, shared values confirmed...';

// -- experience (c2) -- 4-household experience chips + notes (mockup p2) --

export const EXP_CHIPS: readonly string[] = [
  'Intentional community',
  'Cooperative living',
  'Housing co-op',
  'Permaculture project',
  'Farm collective',
  'Worker co-op',
  'Retreat centre',
  'None',
];
/** chips that count toward the "Co-op / collective" tally bucket */
const EXP_COOP_CHIPS: readonly string[] = [
  'Cooperative living',
  'Housing co-op',
  'Worker co-op',
  'Farm collective',
];

export interface ExpHouseholdSpec {
  key: string;
  initials: string;
  tone: AvTone;
  name: string;
  chipsOn: readonly string[];
  note: string;
}
/** Derive household specs for c2 (experience) from the real founding roster. */
export function expHouseholdsFrom(
  roster: readonly FoundingHousehold[],
): readonly ExpHouseholdSpec[] {
  return roster.map((h, i) => ({
    key: h.id,
    initials: h.initials,
    tone: TONE_SLOTS[i % 4]!,
    name: h.name,
    chipsOn: [],
    note: '',
  }));
}

export const EXP_NOTE_PLACEHOLDER =
  'Duration, location, role, what was learned or what failed...';

// -- priorattempts (c3) -- repeatable prior-attempt register (mockup p3) --

export const PA_BY_OPTIONS: readonly string[] = [
  'This group',
  'Previous land owner',
  'Related group / predecessor',
];
export const PA_LAND_OPTIONS: readonly string[] = ['Yes', 'No - different site'];
export const PA_DURATION_OPTIONS: readonly string[] = [
  'Less than 1 year',
  '1-3 years',
  '3-7 years',
  '7+ years',
];
export const PA_END_OPTIONS: readonly string[] = [
  'Still active',
  'Financial pressure',
  'Interpersonal breakdown',
  'External forced closure',
  'Successful completion - evolved into current project',
];

export interface AttemptSeed {
  by: string;
  land: string;
  duration: string;
  end: string;
  note: string;
}
/** the single seeded attempt shipped in the mockup (flag "Ended") */
export const PA_SEED: AttemptSeed = {
  by: 'This group',
  land: 'Yes',
  duration: '1-3 years',
  end: 'Interpersonal breakdown',
  note: 'The group attempted a land share arrangement in 2019 on a neighbouring property. Ended after 18 months due to disagreements over labour contribution. Key lesson: contribution expectations must be explicit and agreed before anyone moves onto land.',
};
/** defaults for a newly-added attempt row */
const PA_NEW: AttemptSeed = {
  by: 'This group',
  land: 'Yes',
  duration: 'Less than 1 year',
  end: 'Still active',
  note: '',
};

export const PA_NOTE_PLACEHOLDER =
  'Key lessons, unresolved dynamics, what this group is doing differently...';
export const PA_NO_ATTEMPTS_HINT =
  "If this land or group has no prior attempts, record that explicitly -- it's useful information for the feasibility assessment.";
export const PA_NO_ATTEMPTS_LABEL =
  'Confirmed - no prior attempts on this land or by this group';

// -- cohesion (c4) -- 6 cohesion domains, 4-way level (mockup p4) --

export const COH_LEVELS: readonly string[] = ['High', 'Medium', 'Low', 'Tension'];

export interface CohDomainSpec {
  key: string;
  name: string;
  level: string;
  note: string;
}
export const COH_DOMAINS: readonly CohDomainSpec[] = [
  {
    key: 'vision',
    name: 'Shared vision & purpose',
    level: 'High',
    note: 'All 4 households share the core regenerative land and intentional community vision. Strong alignment on ecological values.',
  },
  {
    key: 'pace',
    name: 'Pace & urgency expectations',
    level: 'Medium',
    note: 'SM and MD want to begin land work within 6 months. AJ and EY prefer a 12-18 month establishment period. Needs explicit resolution in phasing plan.',
  },
  {
    key: 'privacy',
    name: 'Privacy vs. communality balance',
    level: 'Medium',
    note: '',
  },
  {
    key: 'faith',
    name: 'Faith, spirituality & practice',
    level: 'High',
    note: 'All households share a Muslim faith foundation. Significant alignment on daily rhythms, halal food practices, and Ramadan observance.',
  },
  {
    key: 'financial',
    name: 'Financial capacity & expectations',
    level: 'Tension',
    note: 'Significant variation in household financial capacity. EY household has the most limited resources; SM household has the most. Contribution formula is an unresolved tension.',
  },
  {
    key: 'conflict',
    name: 'Conflict resolution comfort',
    level: 'Medium',
    note: 'Mixed. SM has formal facilitation training; other households have limited experience with structured conflict processes.',
  },
];
const COH_LEN = COH_DOMAINS.length;

export const COH_NOTE_PLACEHOLDER = 'Notes on alignment or divergence in this domain...';

// -- skills (c5) -- 6 skill domains, chip toggles, auto badge (mockup p5) --

export type SkillBadge = 'Covered' | 'Gap' | 'Critical gap';

export interface SkillDomainSpec {
  key: string;
  name: string;
  chips: readonly string[];
  chipsOn: readonly string[];
}
export const SKILL_DOMAINS: readonly SkillDomainSpec[] = [
  {
    key: 'gov',
    name: 'Governance & facilitation',
    chips: [
      'Consensus facilitation',
      'Conflict mediation',
      'Sociocracy / circle governance',
      'Meeting facilitation',
      'Community mediation (certified)',
    ],
    chipsOn: ['Consensus facilitation', 'Conflict mediation', 'Meeting facilitation'],
  },
  {
    key: 'build',
    name: 'Building & construction',
    chips: [
      'General carpentry',
      'Natural building (cob, straw bale)',
      'Electrical (licensed)',
      'Plumbing',
      'Project management',
    ],
    chipsOn: ['Project management'],
  },
  {
    key: 'land',
    name: 'Land & farming',
    chips: [
      'Permaculture design (PDC)',
      'Market gardening',
      'Soil biology',
      'Livestock management',
      'Orchard / food forest',
      'Water harvesting & earthworks',
    ],
    chipsOn: [
      'Permaculture design (PDC)',
      'Market gardening',
      'Soil biology',
      'Orchard / food forest',
    ],
  },
  {
    key: 'legal',
    name: 'Legal & governance structures',
    chips: [
      'Entity formation (CLT, co-op)',
      'Contract drafting',
      'Land tenure law',
      'Not-for-profit governance',
    ],
    chipsOn: [],
  },
  {
    key: 'fin',
    name: 'Financial management',
    chips: [
      'Bookkeeping',
      'Accountancy (CPA)',
      'Grant writing',
      'Capital formation / fundraising',
      'Budgeting & financial planning',
    ],
    chipsOn: ['Bookkeeping', 'Budgeting & financial planning'],
  },
  {
    key: 'health',
    name: 'Healthcare & community wellbeing',
    chips: [
      'First aid (certified)',
      'Mental health first aid',
      'Traditional / herbal medicine',
      'Disability access planning',
    ],
    chipsOn: ['First aid (certified)'],
  },
];
const SKILL_LEN = SKILL_DOMAINS.length;

/**
 * Auto gap badge (verbatim mockup logic, olos_social_fabric_survey.html
 * toggleSkill): zero skills on -> "Critical gap" when the domain name mentions
 * legal, else "Gap"; otherwise "Covered".
 */
export function skillBadgeFor(domainName: string, onCount: number): SkillBadge {
  if (onCount === 0) {
    const isCrit = ['Legal', 'legal'].some((w) => domainName.includes(w));
    return isCrit ? 'Critical gap' : 'Gap';
  }
  return 'Covered';
}

// -- networks (c6) -- 6 external-network toggles + custom (mockup p6) --

export interface NetworkSpec {
  key: string;
  name: string;
  desc: string;
  on: boolean;
}
export const NETWORKS: readonly NetworkSpec[] = [
  {
    key: 'gen',
    name: 'GEN Canada / Global Ecovillage Network',
    desc: 'Peer network of established ecovillages. Mentorship, site visits, and governance templates available to members.',
    on: true,
  },
  {
    key: 'oca',
    name: 'Ontario Co-operative Association (OCA)',
    desc: 'Technical assistance for co-operative formation, governance, and registration in Ontario.',
    on: false,
  },
  {
    key: 'pri',
    name: 'Permaculture Research Institute',
    desc: 'Design consultation, courses, and a network of practitioners across Canada for site design support.',
    on: true,
  },
  {
    key: 'clt',
    name: 'Community Land Trust Network of Canada',
    desc: 'Specialist support for CLT formation, legal structure advice, and resale formula development.',
    on: false,
  },
  {
    key: 'able',
    name: 'ABLE (Alliance for Beneficial Legal Expertise)',
    desc: 'Pro-bono or low-cost legal support for community land projects and non-profit entities.',
    on: false,
  },
  {
    key: 'mentor',
    name: 'Named individual mentor / advisor',
    desc: 'A specific person with intentional community experience who has agreed to advise this project.',
    on: true,
  },
];
const NET_LEN = NETWORKS.length;

export const NET_CUSTOM_LABEL = 'Add a specific contact, organisation, or relationship';
export const NET_CUSTOM_PLACEHOLDER =
  'Name of person, organisation, or network - describe the relationship...';

// ---------------------------------------------------------------------------
// Models (parallel arrays are positional string[]; toggle sets are parallel
// "on"/"" string[]; per-household chip sets are arrays-of-arrays)
// ---------------------------------------------------------------------------

export interface RelationshipsModel {
  kind: 'relationships';
  /** length === REL_LEN, parallel to REL_HOUSEHOLDS */
  since: string[];
  depth: string[];
  cohab: string[];
  notes: string[];
}

export interface ExperienceModel {
  kind: 'experience';
  /** length === EXP_LEN; chips[i] is household i's selected chip labels */
  chips: string[][];
  /** length === EXP_LEN */
  notes: string[];
}

export interface PriorAttemptsModel {
  kind: 'priorattempts';
  /** "on" when the founders confirm there are no prior attempts */
  noAttempts: string;
  /** parallel attempt columns; all four share one length */
  by: string[];
  land: string[];
  duration: string[];
  end: string[];
  note: string[];
}

export interface CohesionModel {
  kind: 'cohesion';
  /** length === COH_LEN */
  levels: string[];
  notes: string[];
}

export interface SkillsModel {
  kind: 'skills';
  /** length === SKILL_LEN; domains[i] is domain i's "on" chip labels */
  domains: string[][];
}

export interface NetworksModel {
  kind: 'networks';
  /** length === NET_LEN; "on" | "" */
  access: string[];
  custom: string;
}

export type SocialFabricModel =
  | RelationshipsModel
  | ExperienceModel
  | PriorAttemptsModel
  | CohesionModel
  | SkillsModel
  | NetworksModel;

// ---------------------------------------------------------------------------
// FormValue coercion helpers (mirror FoodSystemCapture)
// ---------------------------------------------------------------------------

function asStr(v: FormValue[string] | undefined): string {
  return typeof v === 'string' ? v : '';
}

function asStrArr(v: FormValue[string] | undefined): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string');
  return typeof v === 'string' && v !== '' ? [v] : [];
}

/** Constrain a raw value to the allowed set, else fallback. */
function constrain(raw: string, allowed: readonly string[], fallback: string): string {
  return allowed.includes(raw) ? raw : fallback;
}

/** Read a stored array for `key`, or null when no array is stored. */
function storedArr(value: FormValue, key: string): string[] | null {
  const v = value[key];
  return Array.isArray(v) ? asStrArr(v) : null;
}

// ---------------------------------------------------------------------------
// decode: FormValue -> SocialFabricModel (TOTAL / defensive; SEEDS the mockup
// defaults; never throws)
// ---------------------------------------------------------------------------

export function decodeSocialFabric(
  mode: SocialFabricMode,
  value: FormValue,
  roster: readonly FoundingHousehold[] = [],
): SocialFabricModel {
  switch (mode) {
    case 'relationships': {
      const hh = relHouseholdsFrom(roster);
      const sinceS = storedArr(value, 'sfRelSince');
      const depthS = storedArr(value, 'sfRelDepth');
      const cohabS = storedArr(value, 'sfRelCohab');
      const notesS = storedArr(value, 'sfRelNotes');
      return {
        kind: 'relationships',
        since: hh.map((h, i) =>
          sinceS ? constrain(sinceS[i] ?? '', REL_SINCE_OPTIONS, '') : h.since,
        ),
        depth: hh.map((h, i) =>
          depthS ? constrain(depthS[i] ?? '', REL_DEPTH_OPTIONS, '') : h.depth,
        ),
        cohab: hh.map((h, i) =>
          cohabS ? constrain(cohabS[i] ?? '', REL_COHAB_OPTIONS, '') : h.cohab,
        ),
        notes: hh.map((_, i) => (notesS ? (notesS[i] ?? '') : '')),
      };
    }
    case 'experience': {
      const hh = expHouseholdsFrom(roster);
      const notesS = storedArr(value, 'sfExpNotes');
      return {
        kind: 'experience',
        chips: hh.map((h, i) => {
          const raw = value[`sfExpChips${i}`];
          return Array.isArray(raw) ? asStrArr(raw) : [...h.chipsOn];
        }),
        notes: hh.map((h, i) => (notesS ? (notesS[i] ?? h.note) : h.note)),
      };
    }
    case 'priorattempts': {
      const byS = storedArr(value, 'sfPaBy');
      const noAttempts = value.sfPaNoAttempts === 'on' ? 'on' : '';
      if (!byS) {
        return {
          kind: 'priorattempts',
          noAttempts,
          by: [],
          land: [],
          duration: [],
          end: [],
          note: [],
        };
      }
      const n = byS.length;
      const landS = storedArr(value, 'sfPaLand') ?? [];
      const durS = storedArr(value, 'sfPaDuration') ?? [];
      const endS = storedArr(value, 'sfPaEnd') ?? [];
      const noteS = storedArr(value, 'sfPaNote') ?? [];
      const byDef = PA_BY_OPTIONS[0] ?? '';
      const landDef = PA_LAND_OPTIONS[0] ?? '';
      const durDef = PA_DURATION_OPTIONS[0] ?? '';
      const endDef = PA_END_OPTIONS[0] ?? '';
      return {
        kind: 'priorattempts',
        noAttempts,
        by: byS.map((v) => constrain(v, PA_BY_OPTIONS, byDef)),
        land: Array.from({ length: n }, (_, i) =>
          constrain(landS[i] ?? '', PA_LAND_OPTIONS, landDef),
        ),
        duration: Array.from({ length: n }, (_, i) =>
          constrain(durS[i] ?? '', PA_DURATION_OPTIONS, durDef),
        ),
        end: Array.from({ length: n }, (_, i) =>
          constrain(endS[i] ?? '', PA_END_OPTIONS, endDef),
        ),
        note: Array.from({ length: n }, (_, i) => noteS[i] ?? ''),
      };
    }
    case 'cohesion': {
      const lvlS = storedArr(value, 'sfCohLevels');
      const noteS = storedArr(value, 'sfCohNotes');
      return {
        kind: 'cohesion',
        levels: COH_DOMAINS.map((d, i) =>
          lvlS ? constrain(lvlS[i] ?? '', COH_LEVELS, d.level) : d.level,
        ),
        notes: COH_DOMAINS.map((d, i) => (noteS ? (noteS[i] ?? d.note) : d.note)),
      };
    }
    case 'skills':
      return {
        kind: 'skills',
        domains: SKILL_DOMAINS.map((d, i) => {
          const raw = value[`sfSkills${i}`];
          return Array.isArray(raw) ? asStrArr(raw) : [...d.chipsOn];
        }),
      };
    case 'networks': {
      const accS = storedArr(value, 'sfNetAccess');
      return {
        kind: 'networks',
        access: NETWORKS.map((n, i) =>
          accS ? (accS[i] === 'on' ? 'on' : '') : n.on ? 'on' : '',
        ),
        custom: value.sfNetCustom === undefined ? '' : asStr(value.sfNetCustom),
      };
    }
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown SocialFabricMode: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// encode: SocialFabricModel -> FormValue (lossless inverse of decode)
// ---------------------------------------------------------------------------

export function encodeSocialFabric(
  _mode: SocialFabricMode,
  model: SocialFabricModel,
): FormValue {
  switch (model.kind) {
    case 'relationships':
      return {
        sfRelSince: [...model.since],
        sfRelDepth: [...model.depth],
        sfRelCohab: [...model.cohab],
        sfRelNotes: [...model.notes],
      };
    case 'experience': {
      const out: FormValue = { sfExpNotes: [...model.notes] };
      model.chips.forEach((c, i) => {
        out[`sfExpChips${i}`] = [...c];
      });
      return out;
    }
    case 'priorattempts':
      return {
        sfPaNoAttempts: model.noAttempts,
        sfPaBy: [...model.by],
        sfPaLand: [...model.land],
        sfPaDuration: [...model.duration],
        sfPaEnd: [...model.end],
        sfPaNote: [...model.note],
      };
    case 'cohesion':
      return {
        sfCohLevels: [...model.levels],
        sfCohNotes: [...model.notes],
      };
    case 'skills': {
      const out: FormValue = {};
      model.domains.forEach((d, i) => {
        out[`sfSkills${i}`] = [...d];
      });
      return out;
    }
    case 'networks':
      return {
        sfNetAccess: [...model.access],
        sfNetCustom: model.custom,
      };
    default: {
      const _exhaustive: never = model;
      throw new Error(`Unknown SocialFabricModel kind: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

function countOn(arr: readonly string[]): number {
  return arr.filter((s) => s === 'on').length;
}

/** Experience tally: each household falls in exactly one bucket. */
export function expBuckets(chips: readonly string[][]): {
  intentional: number;
  coop: number;
  none: number;
} {
  let intentional = 0;
  let coop = 0;
  let none = 0;
  for (const row of chips) {
    if (row.includes('Intentional community')) intentional++;
    else if (EXP_COOP_CHIPS.some((c) => row.includes(c))) coop++;
    else none++;
  }
  return { intentional, coop, none };
}

/** Cohesion tally across the 6 domains. */
export function cohTally(levels: readonly string[]): {
  high: number;
  medium: number;
  low: number;
  tension: number;
} {
  return {
    high: levels.filter((l) => l === 'High').length,
    medium: levels.filter((l) => l === 'Medium').length,
    low: levels.filter((l) => l === 'Low').length,
    tension: levels.filter((l) => l === 'Tension').length,
  };
}

// ---------------------------------------------------------------------------
// validity arms (sees own value only). Advisory; generous. Only priorattempts
// is a real gate -- it needs at least one attempt OR the no-attempts confirm.
// ---------------------------------------------------------------------------

export function isSocialFabricValid(
  mode: SocialFabricMode,
  value: FormValue,
  roster: readonly FoundingHousehold[] = [],
): boolean {
  switch (mode) {
    case 'relationships': {
      const m = decodeSocialFabric('relationships', value, roster) as RelationshipsModel;
      return m.since.some((s) => s.trim() !== '');
    }
    case 'experience': {
      const m = decodeSocialFabric('experience', value, roster) as ExperienceModel;
      return m.chips.some((row) => row.length > 0);
    }
    case 'priorattempts': {
      const m = decodeSocialFabric('priorattempts', value) as PriorAttemptsModel;
      return m.noAttempts === 'on' || m.by.length > 0;
    }
    case 'cohesion': {
      const m = decodeSocialFabric('cohesion', value) as CohesionModel;
      return m.levels.some((l) => l.trim() !== '');
    }
    case 'skills': {
      const m = decodeSocialFabric('skills', value) as SkillsModel;
      return m.domains.some((d) => d.length > 0);
    }
    case 'networks': {
      const m = decodeSocialFabric('networks', value) as NetworksModel;
      return countOn(m.access) > 0 || m.custom.trim() !== '';
    }
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown SocialFabricMode: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// summaries (defensive; never throw; handle empty value). siblingValues is
// accepted for signature uniformity but unused (no cross-item reads).
// ---------------------------------------------------------------------------

export function summariseSocialFabric(
  mode: SocialFabricMode,
  value: FormValue,
  roster: readonly FoundingHousehold[] = [],
): string {
  switch (mode) {
    case 'relationships': {
      const m = decodeSocialFabric('relationships', value, roster) as RelationshipsModel;
      const n = m.since.filter((s) => s.trim() !== '').length;
      return `${n} of ${m.since.length} founding households mapped`;
    }
    case 'experience': {
      const m = decodeSocialFabric('experience', value, roster) as ExperienceModel;
      const b = expBuckets(m.chips);
      return `${b.intentional} intentional-community, ${b.coop} co-op/collective, ${b.none} no experience`;
    }
    case 'priorattempts': {
      const m = decodeSocialFabric('priorattempts', value) as PriorAttemptsModel;
      if (m.noAttempts === 'on' && m.by.length === 0) return 'No prior attempts confirmed';
      const n = m.by.length;
      return n === 1 ? '1 prior attempt recorded' : `${n} prior attempts recorded`;
    }
    case 'cohesion': {
      const m = decodeSocialFabric('cohesion', value) as CohesionModel;
      const t = cohTally(m.levels);
      return `${t.high} High, ${t.medium} Medium, ${t.low} Low, ${t.tension} Tension`;
    }
    case 'skills': {
      const m = decodeSocialFabric('skills', value) as SkillsModel;
      let covered = 0;
      for (let i = 0; i < SKILL_LEN; i++) {
        const dom = SKILL_DOMAINS[i];
        const on = m.domains[i] ?? [];
        if (dom && skillBadgeFor(dom.name, on.length) === 'Covered') covered++;
      }
      return `${covered} of ${SKILL_LEN} skill domains covered`;
    }
    case 'networks': {
      const m = decodeSocialFabric('networks', value) as NetworksModel;
      const on = countOn(m.access);
      const extra = m.custom.trim() !== '' ? ' (+ custom contact)' : '';
      return `${on} of ${NET_LEN} support networks accessible${extra}`;
    }
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown SocialFabricMode: ${String(_exhaustive)}`);
    }
  }
}

// ===========================================================================
// React component + 6 mode bodies (P1..P6)
// ===========================================================================

export interface SocialFabricCaptureProps {
  mode: SocialFabricMode;
  value: FormValue;
  onChange: (next: FormValue) => void;
  /** this capture's own checklist item id (e.g. ev-s2-social-fabric-c1). */
  itemId: string;
  /** full per-item FormValue map; reserved -- this capture reads no siblings. */
  siblingValues?: Record<string, FormValue>;
  /** founding households derived from the steward model; drives c1/c2 rosters. */
  roster?: readonly FoundingHousehold[];
}

export function SocialFabricCapture({
  mode,
  value,
  onChange,
  itemId,
  siblingValues = {},
  roster = [],
}: SocialFabricCaptureProps): React.JSX.Element {
  void itemId;
  void siblingValues;

  const relHH = relHouseholdsFrom(roster);
  const expHH = expHouseholdsFrom(roster);

  // -- P1: relationships ----------------------------------------------------
  if (mode === 'relationships') {
    const model = decodeSocialFabric('relationships', value, roster) as RelationshipsModel;
    const setCol = (col: 'since' | 'depth' | 'cohab' | 'notes', i: number, v: string): void => {
      const next = model[col].slice();
      next[i] = v;
      onChange(encodeSocialFabric('relationships', { ...model, [col]: next }));
    };
    return (
      <div className={css.root} data-sf-mode="relationships">
        <div>
          <SectionEyebrow>Per-household relationship profile</SectionEyebrow>
          {relHH.map((h, i) => (
            <div key={h.key} className={css.member}>
              <div className={css.memHead}>
                <span className={css.memAv} data-tone={h.tone}>
                  {h.initials}
                </span>
                <span className={css.memName}>{h.name}</span>
                {h.role ? <span className={css.memRole}>{h.role}</span> : null}
              </div>
              <div className={css.rows}>
                <div className={css.row}>
                  <span className={css.rowLbl}>Known to the group since</span>
                  <SfSelect
                    className={css.sfSel}
                    value={model.since[i] ?? h.since}
                    options={REL_SINCE_OPTIONS}
                    ariaLabel={`${h.name} known since`}
                    onChange={(v) => setCol('since', i, v)}
                  />
                </div>
                <div className={css.row}>
                  <span className={css.rowLbl}>Relationship depth</span>
                  <SfSelect
                    className={css.sfSel}
                    value={model.depth[i] ?? h.depth}
                    options={REL_DEPTH_OPTIONS}
                    ariaLabel={`${h.name} relationship depth`}
                    onChange={(v) => setCol('depth', i, v)}
                  />
                </div>
                <div className={css.row}>
                  <span className={css.rowLbl}>Prior co-habitation or co-working?</span>
                  <SfSelect
                    className={css.sfSel}
                    value={model.cohab[i] ?? h.cohab}
                    options={REL_COHAB_OPTIONS}
                    ariaLabel={`${h.name} prior co-habitation`}
                    onChange={(v) => setCol('cohab', i, v)}
                  />
                </div>
              </div>
              {h.hasNote ? (
                <textarea
                  className={css.note}
                  value={model.notes[i] ?? ''}
                  placeholder={REL_NOTE_PLACEHOLDER}
                  aria-label={`${h.name} relationship notes`}
                  onChange={(e) => setCol('notes', i, e.target.value)}
                />
              ) : null}
            </div>
          ))}
        </div>

        <FeedsNote>
          Relationship map feeds <strong>Stratum 4: Confirm project direction & feasibility</strong>.
          Groups where most members have known each other less than 2 years are flagged for
          additional trust-building activities before legal commitments are made.
        </FeedsNote>
      </div>
    );
  }

  // -- P2: experience -------------------------------------------------------
  if (mode === 'experience') {
    const model = decodeSocialFabric('experience', value, roster) as ExperienceModel;
    const setChips = (i: number, next: string[]): void => {
      const chips = model.chips.map((c, j) => (j === i ? next : c));
      onChange(encodeSocialFabric('experience', { ...model, chips }));
    };
    const setNote = (i: number, v: string): void => {
      const notes = model.notes.slice();
      notes[i] = v;
      onChange(encodeSocialFabric('experience', { ...model, notes }));
    };
    const b = expBuckets(model.chips);
    return (
      <div className={css.root} data-sf-mode="experience">
        <div>
          <SectionEyebrow>Per-household experience profile (tap to select all that apply)</SectionEyebrow>
          {expHH.map((h, i) => (
            <div key={h.key} className={css.member}>
              <div className={css.memHead}>
                <span className={css.memAv} data-tone={h.tone}>
                  {h.initials}
                </span>
                <span className={css.memName}>{h.name}</span>
              </div>
              <ChipSelect
                options={EXP_CHIPS}
                value={model.chips[i] ?? []}
                onChange={(next) => setChips(i, next)}
                ariaLabel={`${h.name} prior experience`}
              />
              <textarea
                className={css.note}
                value={model.notes[i] ?? ''}
                placeholder={EXP_NOTE_PLACEHOLDER}
                aria-label={`${h.name} experience notes`}
                onChange={(e) => setNote(i, e.target.value)}
              />
            </div>
          ))}
        </div>

        <div className={css.summary}>
          <div className={css.sumItem} data-tone="ok">
            <span className={css.sumN}>{b.intentional}</span>
            <span className={css.sumLbl}>Intentional community</span>
          </div>
          <div className={css.sumItem} data-tone="warn">
            <span className={css.sumN}>{b.coop}</span>
            <span className={css.sumLbl}>Co-op / collective</span>
          </div>
          <div className={css.sumItem} data-tone="mute">
            <span className={css.sumN}>{b.none}</span>
            <span className={css.sumLbl}>No experience</span>
          </div>
        </div>

        <FeedsNote>
          Experience register feeds <strong>Stratum 4: Confirm project direction & feasibility</strong>{' '}
          and shapes the onboarding and support requirements in Stratum 7 phasing.
        </FeedsNote>
      </div>
    );
  }

  // -- P3: priorattempts ----------------------------------------------------
  if (mode === 'priorattempts') {
    const model = decodeSocialFabric('priorattempts', value) as PriorAttemptsModel;
    const setCol = (
      col: 'by' | 'land' | 'duration' | 'end' | 'note',
      i: number,
      v: string,
    ): void => {
      const next = model[col].slice();
      next[i] = v;
      onChange(encodeSocialFabric('priorattempts', { ...model, [col]: next }));
    };
    const addAttempt = (): void => {
      onChange(
        encodeSocialFabric('priorattempts', {
          ...model,
          by: [...model.by, PA_NEW.by],
          land: [...model.land, PA_NEW.land],
          duration: [...model.duration, PA_NEW.duration],
          end: [...model.end, PA_NEW.end],
          note: [...model.note, PA_NEW.note],
        }),
      );
    };
    const removeAttempt = (i: number): void => {
      const drop = <T,>(arr: T[]): T[] => arr.filter((_, j) => j !== i);
      onChange(
        encodeSocialFabric('priorattempts', {
          ...model,
          by: drop(model.by),
          land: drop(model.land),
          duration: drop(model.duration),
          end: drop(model.end),
          note: drop(model.note),
        }),
      );
    };
    const toggleNoAttempts = (): void =>
      onChange(
        encodeSocialFabric('priorattempts', {
          ...model,
          noAttempts: model.noAttempts === 'on' ? '' : 'on',
        }),
      );
    return (
      <div className={css.root} data-sf-mode="priorattempts">
        <div>
          {model.by.map((_, i) => (
            <div key={i} className={css.attempt}>
              <div className={css.attHead}>
                <span className={css.attLbl}>Attempt {i + 1}</span>
                <span className={css.attFlag}>{model.end[i] ?? ''}</span>
                <button
                  type="button"
                  className={css.attRemove}
                  aria-label={`Remove attempt ${i + 1}`}
                  onClick={() => removeAttempt(i)}
                >
                  <X size={12} />
                </button>
              </div>
              <div className={css.attRows}>
                <div className={css.attRow}>
                  <span className={css.rowLbl}>By whom</span>
                  <SfSelect
                    className={css.sfSel}
                    value={model.by[i] ?? PA_NEW.by}
                    options={PA_BY_OPTIONS}
                    ariaLabel={`Attempt ${i + 1} by whom`}
                    onChange={(v) => setCol('by', i, v)}
                  />
                </div>
                <div className={css.attRow}>
                  <span className={css.rowLbl}>On this land?</span>
                  <SfSelect
                    className={css.sfSel}
                    value={model.land[i] ?? PA_NEW.land}
                    options={PA_LAND_OPTIONS}
                    ariaLabel={`Attempt ${i + 1} on this land`}
                    onChange={(v) => setCol('land', i, v)}
                  />
                </div>
                <div className={css.attRow}>
                  <span className={css.rowLbl}>Duration</span>
                  <SfSelect
                    className={css.sfSel}
                    value={model.duration[i] ?? PA_NEW.duration}
                    options={PA_DURATION_OPTIONS}
                    ariaLabel={`Attempt ${i + 1} duration`}
                    onChange={(v) => setCol('duration', i, v)}
                  />
                </div>
                <div className={css.attRow}>
                  <span className={css.rowLbl}>How did it end</span>
                  <SfSelect
                    className={css.sfSel}
                    value={model.end[i] ?? PA_NEW.end}
                    options={PA_END_OPTIONS}
                    ariaLabel={`Attempt ${i + 1} how it ended`}
                    onChange={(v) => setCol('end', i, v)}
                  />
                </div>
              </div>
              <textarea
                className={css.note}
                value={model.note[i] ?? ''}
                placeholder={PA_NOTE_PLACEHOLDER}
                aria-label={`Attempt ${i + 1} notes`}
                onChange={(e) => setCol('note', i, e.target.value)}
              />
            </div>
          ))}
        </div>

        <button type="button" className={css.addBtn} onClick={addAttempt}>
          <Plus size={12} aria-hidden="true" /> Record another prior attempt
        </button>

        <div className={css.noAttempt} data-on={model.noAttempts === 'on'}>
          <div className={css.naTitle}>No prior attempts</div>
          <div className={css.naHint}>{PA_NO_ATTEMPTS_HINT}</div>
          <button
            type="button"
            className={css.naRow}
            data-on={model.noAttempts === 'on'}
            aria-pressed={model.noAttempts === 'on'}
            onClick={toggleNoAttempts}
          >
            <span className={css.naChk} aria-hidden="true">
              {model.noAttempts === 'on' ? <Check size={11} /> : null}
            </span>
            <span className={css.naLbl}>{PA_NO_ATTEMPTS_LABEL}</span>
          </button>
        </div>

        <FeedsNote>
          Prior attempts feed <strong>Stratum 4: Feasibility assessment</strong>. Interpersonal
          breakdown as a cause generates a flagged review item in the governance design objective.
        </FeedsNote>
      </div>
    );
  }

  // -- P4: cohesion ---------------------------------------------------------
  if (mode === 'cohesion') {
    const model = decodeSocialFabric('cohesion', value) as CohesionModel;
    const setLevel = (i: number, v: string): void => {
      const levels = model.levels.slice();
      levels[i] = v;
      onChange(encodeSocialFabric('cohesion', { ...model, levels }));
    };
    const setNote = (i: number, v: string): void => {
      const notes = model.notes.slice();
      notes[i] = v;
      onChange(encodeSocialFabric('cohesion', { ...model, notes }));
    };
    const t = cohTally(model.levels);
    return (
      <div className={css.root} data-sf-mode="cohesion">
        <div>
          <SectionEyebrow>Domain alignment (High - Medium - Low - Tension)</SectionEyebrow>
          {COH_DOMAINS.map((d, i) => {
            const current = model.levels[i] ?? d.level;
            return (
              <div key={d.key} className={css.cohDomain}>
                <div className={css.cohName}>{d.name}</div>
                <div className={css.cohOpts}>
                  {COH_LEVELS.map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      className={css.cohBtn}
                      data-level={lvl}
                      data-on={current === lvl}
                      aria-pressed={current === lvl}
                      onClick={() => setLevel(i, lvl)}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
                <textarea
                  className={css.note}
                  value={model.notes[i] ?? ''}
                  placeholder={COH_NOTE_PLACEHOLDER}
                  aria-label={`${d.name} cohesion notes`}
                  onChange={(e) => setNote(i, e.target.value)}
                />
              </div>
            );
          })}
        </div>

        <div className={css.summary}>
          <div className={css.sumItem} data-tone="ok">
            <span className={css.sumN}>{t.high}</span>
            <span className={css.sumLbl}>High</span>
          </div>
          <div className={css.sumItem} data-tone="warn">
            <span className={css.sumN}>{t.medium}</span>
            <span className={css.sumLbl}>Medium</span>
          </div>
          <div className={css.sumItem} data-tone="mute">
            <span className={css.sumN}>{t.low}</span>
            <span className={css.sumLbl}>Low</span>
          </div>
          <div className={css.sumItem} data-tone="alert">
            <span className={css.sumN}>{t.tension}</span>
            <span className={css.sumLbl}>Tension</span>
          </div>
        </div>

        <FeedsNote>
          Tension domains feed <strong>governance design</strong> and{' '}
          <strong>community agreement priorities</strong> in Foundation Decisions. Financial
          tension automatically flags contribution model as a required agenda item.
        </FeedsNote>
      </div>
    );
  }

  // -- P5: skills -----------------------------------------------------------
  if (mode === 'skills') {
    const model = decodeSocialFabric('skills', value) as SkillsModel;
    const setDomain = (i: number, next: string[]): void => {
      const domains = model.domains.map((d, j) => (j === i ? next : d));
      onChange(encodeSocialFabric('skills', { ...model, domains }));
    };
    return (
      <div className={css.root} data-sf-mode="skills">
        <div>
          {SKILL_DOMAINS.map((d, i) => {
            const on = model.domains[i] ?? [];
            const badge = skillBadgeFor(d.name, on.length);
            return (
              <div key={d.key} className={css.skillDomain}>
                <div className={css.sdHead}>
                  <span className={css.sdName}>{d.name}</span>
                  <span className={css.sdBadge} data-state={badge}>
                    {badge}
                  </span>
                </div>
                <ChipSelect
                  options={d.chips}
                  value={on}
                  onChange={(next) => setDomain(i, next)}
                  ariaLabel={`${d.name} skills`}
                />
              </div>
            );
          })}
        </div>

        <FeedsNote>
          Critical gaps feed <strong>Stratum 7: Phasing & resourcing</strong> as required external
          support line items. Legal gap generates an automatic flag requiring professional
          engagement before entity registration.
        </FeedsNote>
      </div>
    );
  }

  // -- P6: networks ---------------------------------------------------------
  const model = decodeSocialFabric('networks', value) as NetworksModel;
  const toggleNet = (i: number): void => {
    const access = model.access.slice();
    access[i] = access[i] === 'on' ? '' : 'on';
    onChange(encodeSocialFabric('networks', { ...model, access }));
  };
  return (
    <div className={css.root} data-sf-mode="networks">
      <div>
        <SectionEyebrow>Networks & organisations (tap to mark as accessible)</SectionEyebrow>
        {NETWORKS.map((n, i) => {
          const on = model.access[i] === 'on';
          return (
            <button
              key={n.key}
              type="button"
              className={css.network}
              data-on={on}
              aria-pressed={on}
              onClick={() => toggleNet(i)}
            >
              <span className={css.niDot} aria-hidden="true" />
              <span className={css.niBody}>
                <span className={css.niName}>{n.name}</span>
                <span className={css.niDesc}>{n.desc}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className={css.customNet}>
        <div className={css.cnLbl}>{NET_CUSTOM_LABEL}</div>
        <input
          type="text"
          className={css.cnInp}
          value={model.custom}
          placeholder={NET_CUSTOM_PLACEHOLDER}
          aria-label="Add a custom contact or network"
          onChange={(e) =>
            onChange(encodeSocialFabric('networks', { ...model, custom: e.target.value }))
          }
        />
      </div>

      <FeedsNote>
        External networks feed <strong>Stratum 7: Phasing & resourcing</strong>. Accessible CLT or
        legal networks offset the critical legal gap flagged in the skills matrix.
      </FeedsNote>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

/**
 * SfSelect -- a thin controlled native <select>. The mockup uses native selects
 * throughout (rel-sel / att-sel); the shared Dropdown control injects a
 * placeholder "" option that would defeat the verbatim default semantics here,
 * so a plain themed <select> is used (mirrors FoodSystemCapture's FsSelect).
 */
function SfSelect({
  value,
  options,
  onChange,
  ariaLabel,
  className,
}: {
  value: string;
  options: readonly string[];
  onChange: (next: string) => void;
  ariaLabel: string;
  /** CSS-module class (typed string | undefined under this project's css.d.ts). */
  className?: string;
}): React.JSX.Element {
  return (
    <select
      className={className}
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

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

export default SocialFabricCapture;
