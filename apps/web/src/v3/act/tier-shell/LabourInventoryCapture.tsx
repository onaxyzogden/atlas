/**
 * LabourInventoryCapture -- a bespoke, CONTROLLED renderer for the "Inventory
 * available labour" Tier-0 decision. It implements the mockup's four blocks
 * (WHO single-select, weekly HOURS stepper + capacity signal, SEASONAL steppers
 * + annual-rhythm viz, and a type-aware SKILLS list) and renders ONLY the body
 * content + the footer gate copy -- NOT the panel header, the Record/Defer
 * buttons, or any panel chrome (those belong to the DecisionWorkingPanel, a
 * later task -- mirroring how SuccessCriteriaCapture omits panel chrome).
 *
 * --- Central contract: flat FormValue encoding ---
 * The component reasons with a rich `LabourModel` but the parent persists a FLAT
 * `FormValue` (Record<string, string | string[]>, type UNCHANGED):
 *   { who, hours, spring, summer, autumn, winter: string;  skills: string[] }
 * where every `skills` entry is `${name}::${level}`. `encode`/`decode` translate
 * between the two and round-trip losslessly. `decode` is TOTAL: missing/garbage
 * keys collapse to sensible defaults (seasonal 0, unknown level -> 'beginner',
 * NaN hours -> 0, a skill entry with no '::' -> level 'beginner').
 *
 * --- Defaults rule (controlled over a possibly-empty value) ---
 * `decode` returns a "truly empty" model (hours 0 / seasonal all-0) for an empty
 * value -- it never fabricates persisted data. The COMPONENT applies the
 * mockup's display defaults (hours 20; seasonal 25/20/30/10) only as a *display*
 * fallback when those fields are unset, and bakes them into the next persisted
 * model on the first edit (every onChange emits the fully-resolved model). This
 * keeps the encode/decode round-trip exact for any real persisted value.
 *
 * CONTROLLED / pure: who/hours/seasonal/skills are NEVER held in internal state;
 * they are derived from `decode(value)` each render and the full next model is
 * emitted via `onChange(encode(next))`. The only internal state is the transient
 * custom-skill input text (UI-only).
 */

import { useState } from 'react';
import {
  ArrowRight,
  Briefcase,
  Building2,
  Check,
  Minus,
  Plus,
  User,
  Users,
} from 'lucide-react';
import type { FormValue } from './actToolCatalog.js';
import css from './LabourInventoryCapture.module.css';

// --------------------------------------------------------------------------
// Model + contract types
// --------------------------------------------------------------------------

export type SkillLevel = 'beginner' | 'capable' | 'expert';

export interface LabourModel {
  /** Selected WHO card id, '' = none. */
  who: string;
  /** Weekly hours, 0 = unset. */
  hours: number;
  seasonal: { spring: number; summer: number; autumn: number; winter: number };
  skills: { name: string; level: SkillLevel }[];
}

const LEVELS: readonly SkillLevel[] = ['beginner', 'capable', 'expert'];
const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;
type Season = (typeof SEASONS)[number];

/** Display fallbacks from the mockup (applied only when a field is unset). */
const DEFAULT_HOURS = 20;
const DEFAULT_SEASONAL: LabourModel['seasonal'] = {
  spring: 25,
  summer: 20,
  autumn: 30,
  winter: 10,
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

function whoLabel(id: string): string {
  return WHO_CARDS.find((c) => c.id === id)?.label ?? 'Team';
}

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
  return {
    who: model.who,
    hours: String(model.hours),
    spring: String(model.seasonal.spring),
    summer: String(model.seasonal.summer),
    autumn: String(model.seasonal.autumn),
    winter: String(model.seasonal.winter),
    skills: model.skills.map((s) => `${s.name}::${s.level}`),
  };
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
  const rawSkills = Array.isArray(value.skills) ? value.skills : [];
  const skills = rawSkills
    .filter((s): s is string => typeof s === 'string' && s.length > 0)
    .map((entry) => {
      // Split on the LAST '::' so a custom name containing '::' round-trips
      // losslessly: the level token is always one of LEVELS (no '::'), so it
      // parses off the tail while any '::' inside the name is preserved.
      const idx = entry.lastIndexOf('::');
      if (idx === -1) return { name: entry, level: 'beginner' as SkillLevel };
      return {
        name: entry.slice(0, idx),
        level: toLevel(entry.slice(idx + 2)),
      };
    });
  return {
    who,
    hours: toNonNegInt(value.hours),
    seasonal: {
      spring: toNonNegInt(value.spring),
      summer: toNonNegInt(value.summer),
      autumn: toNonNegInt(value.autumn),
      winter: toNonNegInt(value.winter),
    },
    skills,
  };
}

// --------------------------------------------------------------------------
// summary + validity
// --------------------------------------------------------------------------

export function summariseLabour(model: LabourModel): string {
  const n = model.skills.length;
  const skillWord = n === 1 ? 'skill' : 'skills';
  return `${whoLabel(model.who)}, ${model.hours} hrs/wk, ${n} ${skillWord}`;
}

export function isLabourValid(model: LabourModel): boolean {
  return model.who !== '' && model.hours > 0 && model.skills.length >= 1;
}

// --------------------------------------------------------------------------
// Component
// --------------------------------------------------------------------------

export interface LabourInventoryCaptureProps {
  value: FormValue;
  onChange: (next: FormValue) => void;
  /** Resolved skill suggestions (parent calls resolveLabourSkills). */
  skillSuggestions: readonly string[];
}

const clampHours = (n: number): number => Math.max(5, Math.min(120, n));
const clampSeason = (n: number): number => Math.max(0, Math.min(80, n));

export default function LabourInventoryCapture({
  value,
  onChange,
  skillSuggestions,
}: LabourInventoryCaptureProps): JSX.Element {
  // UI-only transient state: the "add a skill not listed" composer.
  const [composerOpen, setComposerOpen] = useState(false);
  const [customName, setCustomName] = useState('');

  const decoded = decode(value);

  // Display-resolved model: substitute mockup defaults where a field is unset so
  // the surface is never blank, but never fabricate into persisted state until
  // the user edits (every emit below goes through this resolved baseline).
  const model: LabourModel = {
    who: decoded.who,
    hours: decoded.hours > 0 ? decoded.hours : DEFAULT_HOURS,
    seasonal: hasAnySeasonal(decoded.seasonal)
      ? decoded.seasonal
      : { ...DEFAULT_SEASONAL },
    skills: decoded.skills,
  };

  const emit = (next: LabourModel) => onChange(encode(next));

  // --- WHO ---
  const setWho = (id: string) => emit({ ...model, who: id });

  // --- HOURS ---
  const adjustHours = (delta: number) =>
    emit({ ...model, hours: clampHours(model.hours + delta) });
  const setHours = (h: number) => emit({ ...model, hours: clampHours(h) });

  const cap = getCapBand(model.hours);

  // --- SEASONAL ---
  const adjustSeason = (s: Season, delta: number) =>
    emit({
      ...model,
      seasonal: { ...model.seasonal, [s]: clampSeason(model.seasonal[s] + delta) },
    });
  const maxSeason = Math.max(
    model.seasonal.spring,
    model.seasonal.summer,
    model.seasonal.autumn,
    model.seasonal.winter,
    1,
  );

  // --- SKILLS ---
  const skillByName = new Map(model.skills.map((s) => [s.name, s]));
  // Rows = suggestions first, then any custom skills already in the model that
  // are not part of the suggestion list (preserves user-added entries).
  const customRows = model.skills
    .map((s) => s.name)
    .filter((name) => !skillSuggestions.includes(name));
  const rowNames = [...skillSuggestions, ...dedupe(customRows)];

  const toggleSkill = (name: string) => {
    if (skillByName.has(name)) {
      emit({ ...model, skills: model.skills.filter((s) => s.name !== name) });
    } else {
      emit({ ...model, skills: [...model.skills, { name, level: 'beginner' }] });
    }
  };

  const setLevel = (name: string, level: SkillLevel) =>
    emit({
      ...model,
      skills: model.skills.map((s) => (s.name === name ? { ...s, level } : s)),
    });

  const submitCustom = () => {
    const name = customName.trim();
    if (name === '' || skillByName.has(name)) {
      setCustomName('');
      setComposerOpen(false);
      return;
    }
    emit({ ...model, skills: [...model.skills, { name, level: 'beginner' }] });
    setCustomName('');
    setComposerOpen(false);
  };

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

      {/* ---------- 2. HOURS ---------- */}
      <div className={css.section}>
        <div className={css.secLabel}>
          Typical weekly hours
          <span className={css.secSub}>(whole team combined)</span>
        </div>
        <div className={css.hoursStepper}>
          <button
            type="button"
            className={css.stepBtn}
            aria-label="Decrease hours"
            onClick={() => adjustHours(-5)}
          >
            <Minus size={18} />
          </button>
          <span className={css.hoursVal}>
            <span className={css.hoursNum}>{model.hours}</span>
            <span className={css.hoursUnit}>hrs / week</span>
          </span>
          <button
            type="button"
            className={css.stepBtn}
            aria-label="Increase hours"
            onClick={() => adjustHours(5)}
          >
            <Plus size={18} />
          </button>
        </div>
        <div className={css.presets}>
          {[5, 10, 20, 40, 80].map((h) => (
            <button
              key={h}
              type="button"
              className={css.preset}
              data-active={model.hours === h ? 'true' : 'false'}
              onClick={() => setHours(h)}
            >
              {h}h
            </button>
          ))}
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
              style={{ width: `${cap.pct}%` }}
            />
          </div>
          <div className={css.capNote}>{cap.note.replace('{h}', String(model.hours))}</div>
        </div>
      </div>

      <div className={css.divider} />

      {/* ---------- 3. SEASONAL ---------- */}
      <div className={css.section}>
        <div className={css.secLabel}>Seasonal variation</div>
        <div className={css.seasonGrid}>
          {SEASONS.map((s) => (
            <div key={s} className={css.seasonCard}>
              <div className={css.seasonName}>
                <span>{capitalize(s)}</span>
              </div>
              <div className={css.seasonAdj}>
                <button
                  type="button"
                  className={css.seasonBtn}
                  aria-label={`Decrease ${s}`}
                  onClick={() => adjustSeason(s, -5)}
                >
                  <Minus size={14} />
                </button>
                <span className={css.seasonValWrap}>
                  <span className={css.seasonVal}>{model.seasonal[s]}</span>
                  <span className={css.seasonUnit}>h</span>
                </span>
                <button
                  type="button"
                  className={css.seasonBtn}
                  aria-label={`Increase ${s}`}
                  onClick={() => adjustSeason(s, 5)}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          ))}
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
                  <span className={css.rhythmColLbl}>{capitalize(s).slice(0, 3)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={css.divider} />

      {/* ---------- 4. SKILLS ---------- */}
      <div className={css.section}>
        <div className={css.secLabel}>Skill areas available</div>
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
                  aria-label={name}
                  onClick={() => toggleSkill(name)}
                >
                  <span className={css.skillCheck}>
                    {checked ? <Check size={11} /> : null}
                  </span>
                  <span className={css.skillName}>{name}</span>
                </button>
                <span className={css.levelDots}>
                  {LEVELS.map((lvl) => {
                    const litIdx = entry ? LEVELS.indexOf(entry.level) : -1;
                    const lit = entry != null && LEVELS.indexOf(lvl) <= litIdx;
                    return (
                      <button
                        key={lvl}
                        type="button"
                        className={css.lvlDot}
                        data-level={lvl}
                        data-lit={lit ? 'true' : 'false'}
                        aria-label={`Set ${name} to ${lvl}`}
                        onClick={() => {
                          if (checked) setLevel(name, lvl);
                        }}
                      />
                    );
                  })}
                </span>
              </div>
            );
          })}
        </div>
        <div className={css.legend}>
          {LEVELS.map((lvl) => (
            <span key={lvl} className={css.legendItem}>
              <span className={css.legendDot} data-level={lvl} />
              {capitalize(lvl)}
            </span>
          ))}
        </div>
        {composerOpen ? (
          <div className={css.addSkillForm}>
            <input
              className={css.addSkillInput}
              placeholder="Name the skill"
              value={customName}
              autoFocus
              onChange={(e) => setCustomName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitCustom();
                if (e.key === 'Escape') {
                  setCustomName('');
                  setComposerOpen(false);
                }
              }}
            />
            <button
              type="button"
              className={css.addSkillSubmit}
              disabled={customName.trim() === ''}
              onClick={submitCustom}
            >
              Add
            </button>
          </div>
        ) : (
          <button
            type="button"
            className={css.addSkill}
            onClick={() => setComposerOpen(true)}
          >
            <Plus size={11} />
            Add a skill not listed
          </button>
        )}
      </div>

      <div className={css.divider} />

      {/* ---------- feeds + gate copy ---------- */}
      <div className={css.feeds}>
        <span className={css.feedsIcon}>
          <ArrowRight size={11} />
        </span>
        <div className={css.feedsTxt}>
          This inventory feeds <strong>Act: Task assignment &amp; scheduling</strong>.
          Tasks will be paced to your weekly capacity. Skill gaps will surface
          contractor recommendations.
        </div>
      </div>

      <div className={css.gateNote} data-ready={ready ? 'true' : 'false'}>
        Team, hours, and at least one skill recorded -- ready
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
