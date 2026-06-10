/**
 * LabourInventoryCapture -- a bespoke, CONTROLLED renderer for the "Inventory
 * available labour" Tier-0 decision. It implements the mockup's four blocks
 * (WHO single-select, weekly HOURS stepper + capacity signal, SEASONAL steppers
 * + annual-rhythm viz, and a type-aware SKILLS list) and renders ONLY the body
 * content + the footer gate copy -- NOT the panel header, the Record/Defer
 * buttons, or any panel chrome (those belong to the DecisionWorkingPanel, a
 * later task -- mirroring how SuccessCriteriaCapture omits panel chrome).
 *
 * --- Per-person roster (2026-06) ---
 * Availability is captured PER PERSON, not as a single guessed team aggregate.
 * The `roster` array is the source of truth: each `PersonAvailability` carries
 * that person's weekly `hours`, their own four-season curve, and their own
 * skill+level list. The "whole team combined" hours, the team seasonal curve,
 * and the union skill list become DERIVED read-only totals (`deriveTeam`) that
 * feed the unchanged Capacity signal + annual-rhythm viz.
 *
 * --- Central contract: flat FormValue encoding ---
 * The component reasons with a rich `LabourModel` but the parent persists a FLAT
 * `FormValue` (Record<string, string | string[]>, type UNCHANGED). The roster is
 * stored as index-aligned parallel `string[]` arrays (mirroring StewardCapture):
 *   rosterNames/rosterRoles/rosterHours/rosterSpring/rosterSummer/rosterAutumn/
 *   rosterWinter, plus rosterSkills (ONE packed cell per person -- that person's
 *   `${name}::${level}` skills joined by ASCII Unit Separator U+001F, which is
 *   unreachable from a keyboard so `::`/`;`/`|` inside a custom name round-trip
 *   safely; each token still splits its level on the LAST '::').
 * The LEGACY keys { who, hours, spring..winter: string; skills: string[] } are
 * STILL emitted, now computed from the roster via `deriveTeam`, so any downstream
 * consumer reading the flat team totals keeps working unchanged.
 * `decode` is TOTAL and BACK-COMPAT: a value with no `rosterNames` (an old saved
 * decision) collapses its combined hours/seasonal/skills into a SINGLE synthetic
 * `primary` person, so existing decisions render and re-encode without drift.
 *
 * --- Defaults rule (controlled over a possibly-empty value) ---
 * `decode` never fabricates persisted data. When no roster exists yet the COMPONENT
 * resolves a display roster (persisted > steward seed > WHO-band default rows) and
 * bakes it into persistence only on the first edit (every onChange emits the
 * fully-resolved model). This keeps the encode/decode round-trip exact.
 *
 * CONTROLLED / pure: who/roster/derived totals are NEVER held in internal state;
 * they are derived from `decode(value)` each render and the full next model is
 * emitted via `onChange(encode(next))`. The only internal state is UI-only
 * (which rows are expanded + the per-row custom-skill composer text).
 */

import { useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Briefcase,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  Minus,
  Plus,
  User,
  Users,
  X,
} from 'lucide-react';
import type { FormValue } from './actToolCatalog.js';
import type { StewardModel } from './StewardCapture.js';
import css from './LabourInventoryCapture.module.css';

// --------------------------------------------------------------------------
// Model + contract types
// --------------------------------------------------------------------------

export type SkillLevel = 'beginner' | 'capable' | 'expert';

/**
 * Person role. The first four mirror StewardCapture's roles (so a roster row can
 * be seeded from an invite); `'primary'` is the always-present "You" row that has
 * no invite behind it and cannot be removed.
 */
export type PersonRole =
  | 'team_member'
  | 'contractor'
  | 'landowner'
  | 'primary';

/** One person's availability -- the per-person unit of the roster. */
export interface PersonAvailability {
  name: string;
  role?: PersonRole;
  /** This person's weekly hours, 0 = unset. */
  hours: number;
  seasonal: { spring: number; summer: number; autumn: number; winter: number };
  skills: { name: string; level: SkillLevel }[];
}

export interface LabourModel {
  /** Selected WHO band id, '' = none. Context + initial row-count seed only. */
  who: string;
  /** Source of truth: per-person availability rows. */
  roster: PersonAvailability[];
  // --- DERIVED from `roster` on encode; kept as fields for back-compat reads. ---
  /** Whole-team combined weekly hours = sum of roster[].hours. */
  hours: number;
  /** Per-season sum across the roster. */
  seasonal: { spring: number; summer: number; autumn: number; winter: number };
  /** Union of roster skills by name, keeping the HIGHEST level. */
  skills: { name: string; level: SkillLevel }[];
}

const LEVELS: readonly SkillLevel[] = ['beginner', 'capable', 'expert'];
const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;
type Season = (typeof SEASONS)[number];

/**
 * Per-season labour-trend direction arrow + colour, mirroring the mockup's
 * season-card glyphs (Spring up/green, Summer right/amber, Autumn up-right/gold,
 * Winter down/blue). Unicode arrows in the mockup are rendered here as lucide
 * icons; colour is applied via the matching CSS class on the wrapper.
 */
const SEASON_TREND: Record<
  Season,
  { Arrow: typeof ArrowUp; dir: 'up' | 'right' | 'up-right' | 'down' }
> = {
  spring: { Arrow: ArrowUp, dir: 'up' },
  summer: { Arrow: ArrowRight, dir: 'right' },
  autumn: { Arrow: ArrowUpRight, dir: 'up-right' },
  winter: { Arrow: ArrowDown, dir: 'down' },
};

/** Per-person seasonal default (mockup curve), used to seed a fresh roster row. */
const DEFAULT_SEASONAL: LabourModel['seasonal'] = {
  spring: 25,
  summer: 20,
  autumn: 30,
  winter: 10,
};

/**
 * Per-person starting hours for a freshly-seeded roster row -- deliberately LOW
 * so that seeding N people does not balloon the derived team total past the old
 * single-20h default before the steward has entered real numbers.
 */
const DEFAULT_PERSON_HOURS = 10;

/**
 * Skill delimiter inside a single person's packed `rosterSkills` cell. ASCII Unit
 * Separator (U+001F): non-printable and unreachable from a keyboard, so `::`,
 * `;`, or `|` inside a custom skill name round-trip safely.
 */
const SKILL_SEP = String.fromCharCode(0x1f);

/**
 * How many blank rows a WHO band seeds when there is no persisted roster and no
 * steward data to pre-fill from. (The first row is always the primary "You".)
 */
const WHO_ROW_COUNT: Record<string, number> = {
  'who-solo': 1,
  'who-family': 3,
  'who-small': 4,
  'who-large': 6,
};

interface WhoCard {
  id: string;
  label: string;
  sub: string;
  Icon: typeof User;
}

const WHO_CARDS: readonly WhoCard[] = [
  { id: 'who-solo', label: 'Solo steward', sub: 'Just me', Icon: User },
  { id: 'who-family', label: 'Family or volunteers', sub: 'Informal team', Icon: Users },
  { id: 'who-small', label: 'Small paid team', sub: '2-5 people', Icon: Briefcase },
  { id: 'who-large', label: 'Larger team', sub: '6+ people', Icon: Building2 },
];

// --------------------------------------------------------------------------
// Capacity band map (keyed by upper hour thresholds 8/15/25/40/60/999)
// --------------------------------------------------------------------------

type Band = 'red' | 'amber' | 'teal' | 'green';

interface CapBand {
  max: number;
  pct: number;
  band: Band;
  sig: string;
  note: string; // {h} is replaced with the live hour count
}

const CAP_MAP: readonly CapBand[] = [
  {
    max: 8,
    pct: 12,
    band: 'red',
    sig: 'Very light -- 1 small task per week',
    note: 'At {h} hrs/week, only maintenance-level tasks will be recommended. Major surveys will need longer windows.',
  },
  {
    max: 15,
    pct: 22,
    band: 'amber',
    sig: 'Light -- foundational tasks only',
    note: 'At {h} hrs/week, OLOS will sequence Tier 1 surveys slowly -- expect 8-10 weeks for Land Reading.',
  },
  {
    max: 25,
    pct: 38,
    band: 'amber',
    sig: 'Medium -- 1-2 major tasks per week',
    note: 'At {h} hrs/week, OLOS will pace Act tasks to avoid overload. Tier 1 surveys will be sequenced across 4-6 weeks.',
  },
  {
    max: 40,
    pct: 55,
    band: 'teal',
    sig: 'Good -- solid delivery pace',
    note: 'At {h} hrs/week, Tier 1 Land Reading can complete in 3-4 weeks. Multiple parallel tasks will be recommended.',
  },
  {
    max: 60,
    pct: 72,
    band: 'green',
    sig: 'Strong -- full implementation possible',
    note: 'At {h} hrs/week, you can run parallel objectives across tiers. Implementation work can begin while surveys finish.',
  },
  {
    max: 999,
    pct: 92,
    band: 'green',
    sig: 'Full-time operation',
    note: 'At {h} hrs/week, OLOS will recommend aggressive parallel scheduling. Consider contractor capacity planning.',
  },
];

function getCapBand(h: number): CapBand {
  return CAP_MAP.find((b) => h <= b.max) ?? CAP_MAP[CAP_MAP.length - 1]!;
}

// --------------------------------------------------------------------------
// encode / decode -- the flat-FormValue contract
// --------------------------------------------------------------------------

export function encode(model: LabourModel): FormValue {
  // The legacy team-total fields are RECOMPUTED from the roster on every encode
  // so the flat { hours, spring..winter, skills } any downstream consumer reads
  // is always the live derived sum -- never a stale guessed aggregate.
  const team = deriveTeam(model.roster);
  return {
    who: model.who,
    hours: String(team.hours),
    spring: String(team.seasonal.spring),
    summer: String(team.seasonal.summer),
    autumn: String(team.seasonal.autumn),
    winter: String(team.seasonal.winter),
    skills: team.skills.map((s) => `${s.name}::${s.level}`),
    // --- per-person roster, index-aligned parallel arrays ---
    rosterNames: model.roster.map((p) => p.name),
    rosterRoles: model.roster.map((p) => p.role ?? ''),
    rosterHours: model.roster.map((p) => String(p.hours)),
    rosterSpring: model.roster.map((p) => String(p.seasonal.spring)),
    rosterSummer: model.roster.map((p) => String(p.seasonal.summer)),
    rosterAutumn: model.roster.map((p) => String(p.seasonal.autumn)),
    rosterWinter: model.roster.map((p) => String(p.seasonal.winter)),
    rosterSkills: model.roster.map((p) => packSkills(p.skills)),
  };
}

/**
 * Sum a roster into the whole-team totals: hours and each season add up; skills
 * union by name, keeping the HIGHEST level (LEVELS index order
 * beginner < capable < expert).
 */
export function deriveTeam(roster: PersonAvailability[]): {
  hours: number;
  seasonal: LabourModel['seasonal'];
  skills: { name: string; level: SkillLevel }[];
} {
  const seasonal = { spring: 0, summer: 0, autumn: 0, winter: 0 };
  let hours = 0;
  const byName = new Map<string, SkillLevel>();
  for (const p of roster) {
    hours += p.hours;
    seasonal.spring += p.seasonal.spring;
    seasonal.summer += p.seasonal.summer;
    seasonal.autumn += p.seasonal.autumn;
    seasonal.winter += p.seasonal.winter;
    for (const s of p.skills) {
      const existing = byName.get(s.name);
      if (existing == null || LEVELS.indexOf(s.level) > LEVELS.indexOf(existing)) {
        byName.set(s.name, s.level);
      }
    }
  }
  const skills = Array.from(byName, ([name, level]) => ({ name, level }));
  return { hours, seasonal, skills };
}

/** Mirrors StewardCapture's tolerant string[] reader. */
function asArray(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => (typeof x === 'string' ? x : '')) : [];
}

function toRole(raw: string): PersonRole | undefined {
  return raw === 'team_member' ||
    raw === 'contractor' ||
    raw === 'landowner' ||
    raw === 'primary'
    ? raw
    : undefined;
}

/** Parse one `${name}::${level}` token; split on the LAST '::' (lossless name). */
function parseSkillToken(entry: string): { name: string; level: SkillLevel } {
  const idx = entry.lastIndexOf('::');
  if (idx === -1) return { name: entry, level: 'beginner' };
  return { name: entry.slice(0, idx), level: toLevel(entry.slice(idx + 2)) };
}

/** Pack one person's skills into a single U+001F-delimited cell. */
function packSkills(skills: { name: string; level: SkillLevel }[]): string {
  return skills.map((s) => `${s.name}::${s.level}`).join(SKILL_SEP);
}

/** Inverse of packSkills; an empty cell yields zero skills. */
function unpackSkills(cell: string): { name: string; level: SkillLevel }[] {
  if (cell === '') return [];
  return cell
    .split(SKILL_SEP)
    .filter((t) => t.length > 0)
    .map(parseSkillToken);
}

function toNonNegInt(raw: unknown): number {
  if (typeof raw !== 'string') return 0;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function toLevel(raw: string): SkillLevel {
  return (LEVELS as readonly string[]).includes(raw) ? (raw as SkillLevel) : 'beginner';
}

export function decode(value: FormValue): LabourModel {
  const who = typeof value.who === 'string' ? value.who : '';
  const names = asArray(value.rosterNames);

  let roster: PersonAvailability[];
  if (names.length > 0) {
    // New shape: reconstruct each person from the index-aligned parallel arrays.
    const roles = asArray(value.rosterRoles);
    const hoursArr = asArray(value.rosterHours);
    const springArr = asArray(value.rosterSpring);
    const summerArr = asArray(value.rosterSummer);
    const autumnArr = asArray(value.rosterAutumn);
    const winterArr = asArray(value.rosterWinter);
    const skillsArr = asArray(value.rosterSkills);
    roster = names.map((name, i) => ({
      name,
      role: toRole(roles[i] ?? ''),
      hours: toNonNegInt(hoursArr[i]),
      seasonal: {
        spring: toNonNegInt(springArr[i]),
        summer: toNonNegInt(summerArr[i]),
        autumn: toNonNegInt(autumnArr[i]),
        winter: toNonNegInt(winterArr[i]),
      },
      skills: unpackSkills(skillsArr[i] ?? ''),
    }));
  } else {
    // Legacy back-compat: an old saved decision has no `rosterNames`. Collapse
    // its combined hours/seasonal/skills into ONE synthetic `primary` person so
    // it renders as a 1-person roster and re-encodes to identical derived fields.
    const rawSkills = Array.isArray(value.skills) ? value.skills : [];
    const skills = rawSkills
      .filter((s): s is string => typeof s === 'string' && s.length > 0)
      .map(parseSkillToken);
    const legacyHours = toNonNegInt(value.hours);
    const legacySeasonal = {
      spring: toNonNegInt(value.spring),
      summer: toNonNegInt(value.summer),
      autumn: toNonNegInt(value.autumn),
      winter: toNonNegInt(value.winter),
    };
    const hasLegacy =
      legacyHours > 0 || skills.length > 0 || hasAnySeasonal(legacySeasonal);
    roster = hasLegacy
      ? [{ name: '', role: 'primary', hours: legacyHours, seasonal: legacySeasonal, skills }]
      : [];
  }

  const team = deriveTeam(roster);
  return { who, roster, hours: team.hours, seasonal: team.seasonal, skills: team.skills };
}

/** A fresh, empty roster row (used by the "Add a person" control). */
function blankPerson(role: PersonRole = 'team_member'): PersonAvailability {
  return {
    name: '',
    role,
    hours: DEFAULT_PERSON_HOURS,
    seasonal: { ...DEFAULT_SEASONAL },
    skills: [],
  };
}

/** Short chip label for a person's role. */
function roleLabel(role: PersonRole | undefined): string {
  switch (role) {
    case 'primary':
      return 'You';
    case 'contractor':
      return 'Contractor';
    case 'landowner':
      return 'Landowner';
    case 'team_member':
    default:
      return 'Team';
  }
}

/**
 * Build a seed roster from the sibling StewardCapture decision: an always-present
 * `primary` "You" row plus one row per invited team_member/contractor (landowners
 * are skipped -- they steward the land, they are not labour). Each seeded row
 * starts at the low DEFAULT_PERSON_HOURS so seeding does not balloon the derived
 * team total before the steward enters real numbers.
 */
export function rosterSeedFrom(steward: StewardModel): PersonAvailability[] {
  const primary: PersonAvailability = {
    name: 'You',
    role: 'primary',
    hours: DEFAULT_PERSON_HOURS,
    seasonal: { ...DEFAULT_SEASONAL },
    skills: [],
  };
  const rows = steward.invites
    .filter((inv) => inv.role === 'team_member' || inv.role === 'contractor')
    .map((inv) => ({
      name: inv.name,
      role: inv.role as PersonRole,
      hours: DEFAULT_PERSON_HOURS,
      seasonal: { ...DEFAULT_SEASONAL },
      skills: [] as { name: string; level: SkillLevel }[],
    }));
  return [primary, ...rows];
}

// --------------------------------------------------------------------------
// summary + validity
// --------------------------------------------------------------------------

export function summariseLabour(model: LabourModel): string {
  const people = model.roster.length;
  const personWord = people === 1 ? 'person' : 'people';
  const skillCount = model.skills.length;
  const skillWord = skillCount === 1 ? 'skill' : 'skills';
  return `${people} ${personWord}, ${model.hours} hrs/wk combined, ${skillCount} ${skillWord}`;
}

export function isLabourValid(model: LabourModel): boolean {
  // Ready once at least one person carries real hours and at least one skill.
  return model.roster.some((p) => p.hours > 0 && p.skills.length >= 1);
}

// --------------------------------------------------------------------------
// Component
// --------------------------------------------------------------------------

export interface LabourInventoryCaptureProps {
  value: FormValue;
  onChange: (next: FormValue) => void;
  /** Resolved skill suggestions (parent calls resolveLabourSkills). */
  skillSuggestions: readonly string[];
  /**
   * Optional seed roster (parent builds via `rosterSeedFrom(decodeSteward(...))`).
   * Shown when no roster is persisted yet; bakes into persistence on first edit.
   */
  rosterSeed?: PersonAvailability[];
}

const clampPersonHours = (n: number): number => Math.max(0, Math.min(120, n));
const clampSeason = (n: number): number => Math.max(0, Math.min(80, n));

/** Default blank rows for a WHO band when no roster is persisted and no seed. */
function defaultRowsForWho(who: string): PersonAvailability[] {
  const count = WHO_ROW_COUNT[who] ?? 1;
  return Array.from({ length: count }, (_, i) =>
    blankPerson(i === 0 ? 'primary' : 'team_member'),
  );
}

export default function LabourInventoryCapture({
  value,
  onChange,
  skillSuggestions,
  rosterSeed,
}: LabourInventoryCaptureProps): JSX.Element {
  // UI-only transient state: which rows are expanded + the per-row skill composer.
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set([0]));
  const [composerRow, setComposerRow] = useState<number | null>(null);
  const [customName, setCustomName] = useState('');

  const decoded = decode(value);
  const hasSeed = !!(rosterSeed && rosterSeed.length > 0);

  // Display-resolved roster: persisted > steward seed > WHO-band default rows.
  // Never fabricates into persisted state until the user edits (every emit goes
  // through this baseline, so the seed/default bakes only on the first change).
  const roster: PersonAvailability[] =
    decoded.roster.length > 0
      ? decoded.roster
      : hasSeed
        ? rosterSeed!
        : defaultRowsForWho(decoded.who);

  const team = deriveTeam(roster);
  const model: LabourModel = {
    who: decoded.who,
    roster,
    hours: team.hours,
    seasonal: team.seasonal,
    skills: team.skills,
  };

  const emit = (next: LabourModel) => onChange(encode(next));

  // --- WHO (now seeds the default row count when nothing is persisted/seeded) ---
  const setWho = (id: string) => {
    if (decoded.roster.length === 0 && !hasSeed) {
      emit({ ...model, who: id, roster: defaultRowsForWho(id) });
    } else {
      emit({ ...model, who: id });
    }
  };

  // --- per-person mutations (re-emit whole model; deriveTeam recomputes totals) ---
  const updatePerson = (i: number, patch: Partial<PersonAvailability>) =>
    emit({
      ...model,
      roster: model.roster.map((p, j) => (j === i ? { ...p, ...patch } : p)),
    });
  const addPerson = () => {
    const nextIndex = model.roster.length;
    emit({ ...model, roster: [...model.roster, blankPerson('team_member')] });
    setExpanded((prev) => new Set(prev).add(nextIndex));
  };
  const removePerson = (i: number) =>
    emit({ ...model, roster: model.roster.filter((_, j) => j !== i) });

  const adjustPersonHours = (i: number, delta: number) =>
    updatePerson(i, { hours: clampPersonHours(model.roster[i]!.hours + delta) });

  const adjustPersonSeason = (i: number, s: Season, delta: number) => {
    const p = model.roster[i]!;
    updatePerson(i, {
      seasonal: { ...p.seasonal, [s]: clampSeason(p.seasonal[s] + delta) },
    });
  };

  const togglePersonSkill = (i: number, name: string) => {
    const p = model.roster[i]!;
    const has = p.skills.some((s) => s.name === name);
    updatePerson(i, {
      skills: has
        ? p.skills.filter((s) => s.name !== name)
        : [...p.skills, { name, level: 'beginner' }],
    });
  };
  const setPersonLevel = (i: number, name: string, level: SkillLevel) => {
    const p = model.roster[i]!;
    updatePerson(i, {
      skills: p.skills.map((s) => (s.name === name ? { ...s, level } : s)),
    });
  };
  const submitPersonCustom = (i: number) => {
    const name = customName.trim();
    const p = model.roster[i]!;
    if (name !== '' && !p.skills.some((s) => s.name === name)) {
      updatePerson(i, { skills: [...p.skills, { name, level: 'beginner' }] });
    }
    setCustomName('');
    setComposerRow(null);
  };

  const toggleExpand = (i: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const personRowNames = (p: PersonAvailability): string[] => {
    const custom = p.skills
      .map((s) => s.name)
      .filter((n) => !skillSuggestions.includes(n));
    return [...skillSuggestions, ...dedupe(custom)];
  };

  const cap = getCapBand(model.hours);
  const maxSeason = Math.max(
    model.seasonal.spring,
    model.seasonal.summer,
    model.seasonal.autumn,
    model.seasonal.winter,
    1,
  );

  const ready = isLabourValid(model);

  return (
    <div className={css.root}>
      {/* ---------- 1. WHO ---------- */}
      <div className={css.section}>
        <div className={css.secLabel}>Who is the stewardship team?</div>
        <div className={css.whoGrid}>
          {WHO_CARDS.map(({ id, label, sub, Icon }) => {
            const active = model.who === id;
            return (
              <button
                key={id}
                type="button"
                className={css.whoCard}
                data-active={active ? 'true' : 'false'}
                onClick={() => setWho(id)}
              >
                <span className={css.whoIcon}>
                  <Icon size={15} />
                </span>
                <span className={css.whoLbl}>{label}</span>
                <span className={css.whoSub}>{sub}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={css.divider} />

      {/* ---------- 2. ROSTER -- availability per person ---------- */}
      <div className={css.section}>
        <div className={css.secLabel}>
          Stewardship team
          <span className={css.secSub}>availability per person</span>
        </div>
        <div className={css.roster}>
          {model.roster.map((p, i) => {
            const open = expanded.has(i);
            const skillByName = new Map(p.skills.map((s) => [s.name, s]));
            const rowNames = personRowNames(p);
            return (
              <div
                key={i}
                className={css.rosterRow}
                data-open={open ? 'true' : 'false'}
                data-testid="roster-row"
              >
                <div className={css.rosterRowHead}>
                  <button
                    type="button"
                    className={css.rosterChevron}
                    aria-label={open ? 'Collapse person' : 'Expand person'}
                    aria-expanded={open}
                    onClick={() => toggleExpand(i)}
                  >
                    {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                  </button>
                  <span
                    className={css.personRole}
                    data-role={p.role ?? 'team_member'}
                  >
                    {roleLabel(p.role)}
                  </span>
                  <input
                    className={css.personName}
                    placeholder={p.role === 'primary' ? 'You' : 'Name'}
                    value={p.name}
                    onChange={(e) => updatePerson(i, { name: e.target.value })}
                  />
                  <span className={css.rosterStats}>
                    {p.hours}h/wk &middot; {p.skills.length}{' '}
                    {p.skills.length === 1 ? 'skill' : 'skills'}
                  </span>
                  {p.role === 'primary' ? null : (
                    <button
                      type="button"
                      className={css.rosterRemove}
                      aria-label={`Remove ${p.name || 'person'}`}
                      onClick={() => removePerson(i)}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {open ? (
                  <div className={css.rosterRowBody}>
                    <div className={css.subLabel}>Weekly hours</div>
                    <div className={css.hoursStepper}>
                      <button
                        type="button"
                        className={css.stepBtn}
                        aria-label={`Decrease hours for ${p.name || 'person'}`}
                        onClick={() => adjustPersonHours(i, -5)}
                      >
                        <Minus size={18} />
                      </button>
                      <span className={css.hoursVal}>
                        <span className={css.hoursNum}>{p.hours}</span>
                        <span className={css.hoursUnit}>hrs / week</span>
                      </span>
                      <button
                        type="button"
                        className={css.stepBtn}
                        aria-label={`Increase hours for ${p.name || 'person'}`}
                        onClick={() => adjustPersonHours(i, 5)}
                      >
                        <Plus size={18} />
                      </button>
                    </div>

                    <div className={css.subLabel}>Seasonal availability</div>
                    <div className={css.seasonGrid}>
                      {SEASONS.map((s) => {
                        const { Arrow, dir } = SEASON_TREND[s];
                        return (
                          <div key={s} className={css.seasonCard}>
                            <div className={css.seasonName}>
                              <span>{capitalize(s)}</span>
                              <span
                                className={css.seasonTrend}
                                data-season={s}
                                aria-label={`${capitalize(s)} labour trend ${dir}`}
                              >
                                <Arrow size={12} />
                              </span>
                            </div>
                            <div className={css.seasonAdj}>
                              <button
                                type="button"
                                className={css.seasonBtn}
                                aria-label={`Decrease ${s} for ${p.name || 'person'}`}
                                onClick={() => adjustPersonSeason(i, s, -5)}
                              >
                                <Minus size={14} />
                              </button>
                              <span className={css.seasonValWrap}>
                                <span className={css.seasonVal}>{p.seasonal[s]}</span>
                                <span className={css.seasonUnit}>h</span>
                              </span>
                              <button
                                type="button"
                                className={css.seasonBtn}
                                aria-label={`Increase ${s} for ${p.name || 'person'}`}
                                onClick={() => adjustPersonSeason(i, s, 5)}
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className={css.subLabel}>Skill areas</div>
                    <div className={css.skillsList}>
                      {rowNames.map((name) => {
                        const entry = skillByName.get(name);
                        const checked = entry != null;
                        return (
                          <div
                            key={name}
                            className={css.skillRow}
                            data-testid="skill-row"
                            data-checked={checked ? 'true' : 'false'}
                          >
                            <button
                              type="button"
                              className={css.skillToggle}
                              aria-pressed={checked}
                              aria-label={`${name} for ${p.name || 'person'}`}
                              onClick={() => togglePersonSkill(i, name)}
                            >
                              <span className={css.skillCheck}>
                                {checked ? <Check size={11} /> : null}
                              </span>
                              <span className={css.skillName}>{name}</span>
                            </button>
                            <span className={css.levelDots}>
                              {LEVELS.map((lvl) => {
                                const litIdx = entry ? LEVELS.indexOf(entry.level) : -1;
                                const lit =
                                  entry != null && LEVELS.indexOf(lvl) <= litIdx;
                                return (
                                  <button
                                    key={lvl}
                                    type="button"
                                    className={css.lvlDot}
                                    data-level={lvl}
                                    data-lit={lit ? 'true' : 'false'}
                                    aria-label={`Set ${name} to ${lvl}`}
                                    onClick={() => {
                                      if (checked) setPersonLevel(i, name, lvl);
                                    }}
                                  />
                                );
                              })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {composerRow === i ? (
                      <div className={css.addSkillForm}>
                        <input
                          className={css.addSkillInput}
                          placeholder="Name the skill"
                          value={customName}
                          autoFocus
                          onChange={(e) => setCustomName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') submitPersonCustom(i);
                            if (e.key === 'Escape') {
                              setCustomName('');
                              setComposerRow(null);
                            }
                          }}
                        />
                        <button
                          type="button"
                          className={css.addSkillSubmit}
                          disabled={customName.trim() === ''}
                          onClick={() => submitPersonCustom(i)}
                        >
                          Add
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className={css.addSkill}
                        onClick={() => {
                          setCustomName('');
                          setComposerRow(i);
                        }}
                      >
                        <Plus size={11} />
                        Add a skill not listed
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
        <button type="button" className={css.rosterAdd} onClick={addPerson}>
          <Plus size={13} />
          Add a person
        </button>
      </div>

      <div className={css.divider} />

      {/* ---------- 3. WHOLE TEAM (derived, read-only) ---------- */}
      <div className={css.section}>
        <div className={css.secLabel}>Whole team combined</div>
        <div className={css.teamSummary}>
          <div className={css.teamTotalLine}>
            <span className={css.teamTotalNum}>{model.hours}</span>
            <span className={css.teamTotalUnit}>hrs / week combined</span>
            <span className={css.teamTotalNote}>
              summed across {model.roster.length}{' '}
              {model.roster.length === 1 ? 'person' : 'people'}
            </span>
          </div>
          <div className={css.capWrap}>
            <div className={css.capRow}>
              <span>Capacity signal</span>
              <span className={css.capSig} data-band={cap.band}>
                {cap.sig}
              </span>
            </div>
            <div className={css.capBar}>
              <div
                className={css.capBarFill}
                data-band={cap.band}
                data-testid="cap-bar-fill"
                style={{ width: `${cap.pct}%` }}
              />
            </div>
            <div className={css.capNote}>
              {cap.note.replace('{h}', String(model.hours))}
            </div>
          </div>
          <div className={css.rhythm}>
            <div className={css.rhythmLbl}>Annual rhythm</div>
            <div className={css.rhythmBars}>
              {SEASONS.map((s) => {
                const pct = Math.max(
                  4,
                  Math.round((model.seasonal[s] / maxSeason) * 100),
                );
                return (
                  <div key={s} className={css.rhythmCol}>
                    <div
                      className={css.rhythmBar}
                      data-season={s}
                      data-testid={`rhythm-bar-${s}`}
                      style={{ height: `${pct}%` }}
                    />
                    <span className={css.rhythmColLbl}>
                      {capitalize(s).slice(0, 3)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className={css.divider} />

      {/* ---------- feeds + gate copy ---------- */}
      <div className={css.feeds}>
        <span className={css.feedsIcon}>
          <ArrowRight size={11} />
        </span>
        <div className={css.feedsTxt}>
          This inventory feeds <strong>Act: Task assignment &amp; scheduling</strong>.
          Tasks will be paced to your team's combined weekly capacity. Skill gaps
          will surface contractor recommendations.
        </div>
      </div>

      <div className={css.gateNote} data-ready={ready ? 'true' : 'false'}>
        At least one person with weekly hours and a skill -- ready
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// small helpers
// --------------------------------------------------------------------------

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function dedupe(list: readonly string[]): string[] {
  return Array.from(new Set(list));
}

function hasAnySeasonal(s: LabourModel['seasonal']): boolean {
  return s.spring > 0 || s.summer > 0 || s.autumn > 0 || s.winter > 0;
}
