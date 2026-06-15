/**
 * resolveFormPrefill -- pure, surface-neutral resolver that proposes
 * NON-DESTRUCTIVE pre-fill suggestions for a vision-form tool (the kind:'form'
 * tools opened by VisionFormsTabsModal), drawn from two sources:
 *
 *   1. the steward roster (StewardProfile rollups -- weekly hours, skills), and
 *   2. prior objectives that feed INTO the active objective (reverse `feedsInto`)
 *      or that the active objective lists as a `prerequisiteObjectiveIds`.
 *
 * It NEVER writes, NEVER marks a decision complete, and NEVER fabricates a value:
 * it only REPORTS candidate values. The modal renders them as inert "Use this"
 * rows (see PrefillRecap); a candidate is applied to the local draft only on an
 * explicit click. The clobber guard (hide a candidate whose draft slot already
 * holds a value) lives in the renderer -- this resolver always reports every
 * candidate it finds, so it stays pure and trivially testable.
 *
 * Amanah: convenience only. Sale/capital figures are never sourced here -- the
 * steward branch is shape-driven on the labour-form fields (`hoursPerWeek`,
 * `laborSkillsByType` skills) and nothing else; the prior-objective branch only
 * echoes a steward's own prior, explicitly-saved answer.
 *
 * Pure / deterministic. No React/store imports (types only). Safe in render and
 * in batch loops. Mirrors resolveAnswerSpec.ts (same directory, same posture).
 */

import type { PlanStratumObjective } from '@ogden/shared';
import type {
  ActTool,
  FormFieldSpec,
  FormValue,
} from '../act/tier-shell/actToolCatalog.js';

export type PrefillOrigin = 'steward' | 'prior-objective';

export interface PrefillSuggestion {
  /**
   * Target field key in the form's FormValue. `null` is reserved for a
   * fields-less (textarea) form; the resolver does not emit null-key
   * suggestions today (see resolveFormPrefill), but PrefillRecap honours it.
   */
  fieldKey: string | null;
  /** Human label for the recap row (the field being offered). */
  fieldLabel: string;
  /** Candidate value: a string for a leaf, a string[] for a repeatable. */
  value: string | string[];
  /** Where it came from -- "Steward roster", or an upstream objective title. */
  sourceLabel: string;
  origin: PrefillOrigin;
}

export interface FormPrefillResult {
  fromSteward: PrefillSuggestion[];
  fromPriorObjectives: PrefillSuggestion[];
}

/**
 * Structural subset of StewardProfile the resolver reads. Declared locally so
 * the resolver stays import-free of the store module (StewardProfile is
 * structurally assignable to this). Hours mirror `totalHoursPerWeek` /
 * `rosterCapacityHours` in the Human Context derivations.
 */
export interface StewardProfileLite {
  skills?: readonly string[];
  maintenanceHrsInitial?: number;
  maintenanceHrsOngoing?: number;
}

export interface PrefillContext {
  /** Roster profile overlays (one per steward). */
  profiles: readonly StewardProfileLite[];
  /** Full project objective spine -- used for the reverse-feedsInto traversal. */
  objectives: readonly PlanStratumObjective[];
  /** The objective whose tool group is open (owns the form being resolved). */
  activeObjectiveId: string | null;
  /** Saved structured form values: formId -> FormValue. */
  savedFormData: Readonly<Record<string, FormValue>>;
  /** Saved free-text / summary mirror: formId -> text. */
  savedFormText: Readonly<Record<string, string>>;
}

/* --------------------------------------------------------------------------
 * Field-shape recognition (steward branch is shape-driven, not formId-driven,
 * so it covers both `s1-vision-labour` and any mirrored per-type labour form).
 * ----------------------------------------------------------------------- */

/** The text leaf the steward roster's combined weekly hours can fill. */
const HOURS_FIELD_KEY = 'hoursPerWeek';
/** The repeatable's leaf option-set that marks a "skills" list. */
const SKILLS_OPTION_SET = 'laborSkillsByType';

type LeafField = Extract<FormFieldSpec, { kind: 'text' } | { kind: 'hybrid' }>;
type RepeatableField = Extract<FormFieldSpec, { kind: 'repeatable' }>;

function isLeaf(f: FormFieldSpec): f is LeafField {
  return f.kind === 'text' || f.kind === 'hybrid';
}
function isRepeatable(f: FormFieldSpec): f is RepeatableField {
  return f.kind === 'repeatable';
}

/** Combined weekly hours pledged across the roster (initial + ongoing). */
function rosterHours(profiles: readonly StewardProfileLite[]): number {
  return profiles.reduce(
    (acc, p) =>
      acc + (p.maintenanceHrsInitial ?? 0) + (p.maintenanceHrsOngoing ?? 0),
    0,
  );
}

/** De-duplicated union of every steward's skills (trimmed, order-stable). */
function rosterSkills(profiles: readonly StewardProfileLite[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of profiles) {
    for (const raw of p.skills ?? []) {
      const s = raw.trim();
      if (s && !seen.has(s)) {
        seen.add(s);
        out.push(s);
      }
    }
  }
  return out;
}

function stewardSuggestions(
  fields: readonly FormFieldSpec[],
  profiles: readonly StewardProfileLite[],
): PrefillSuggestion[] {
  const out: PrefillSuggestion[] = [];

  const hoursField = fields.find(
    (f): f is LeafField => isLeaf(f) && f.key === HOURS_FIELD_KEY,
  );
  if (hoursField) {
    const hours = rosterHours(profiles);
    if (hours > 0) {
      out.push({
        fieldKey: HOURS_FIELD_KEY,
        fieldLabel: hoursField.label ?? 'Hours per week',
        value: String(hours),
        sourceLabel: 'Steward roster',
        origin: 'steward',
      });
    }
  }

  const skillsField = fields.find(
    (f): f is RepeatableField =>
      isRepeatable(f) &&
      f.item.kind === 'hybrid' &&
      f.item.optionSetId === SKILLS_OPTION_SET,
  );
  if (skillsField) {
    const skills = rosterSkills(profiles).slice(0, skillsField.max);
    if (skills.length > 0) {
      out.push({
        fieldKey: skillsField.key,
        fieldLabel: skillsField.label,
        value: skills,
        sourceLabel: 'Steward roster',
        origin: 'steward',
      });
    }
  }

  return out;
}

/* --------------------------------------------------------------------------
 * Prior-objective branch -- conservative, single-shape only (mirrors
 * preSeedFromLabels): a saved upstream answer is surfaced only when the TARGET
 * form is an unambiguous single text/hybrid leaf or a single repeatable. Multi-
 * leaf forms (most homestead arms) have no unambiguous target, so they get no
 * prior-objective suggestion -- honest blank rather than a wrong cross-field fill.
 * ----------------------------------------------------------------------- */

/** When a FormValue has exactly one key whose value is an array, return it. */
function loneArrayValue(value: FormValue | undefined): string[] | null {
  if (!value) return null;
  const keys = Object.keys(value);
  const onlyKey = keys.length === 1 ? keys[0] : undefined;
  if (onlyKey === undefined) return null;
  const v = value[onlyKey];
  if (!Array.isArray(v)) return null;
  return v.filter((e) => typeof e === 'string' && e.trim() !== '');
}

function priorObjectiveSuggestions(
  fields: readonly FormFieldSpec[],
  formId: string,
  ctx: PrefillContext,
): PrefillSuggestion[] {
  const active = ctx.objectives.find((o) => o.id === ctx.activeObjectiveId);
  if (!active) return [];

  const prereq = new Set(active.prerequisiteObjectiveIds ?? []);
  const upstream = ctx.objectives.filter(
    (o) =>
      o.id !== active.id &&
      (prereq.has(o.id) ||
        (o.checklist ?? []).some((it) =>
          (it.feedsInto ?? []).includes(active.id),
        )),
  );
  if (upstream.length === 0) return [];

  const leaves = fields.filter(isLeaf);
  const repeatables = fields.filter(isRepeatable);
  // The target form must be unambiguous: exactly one text/hybrid leaf (with a
  // key), or exactly one repeatable -- nothing else gets a prior echo.
  const leaf =
    fields.length === 1 && leaves.length === 1 ? leaves[0] : undefined;
  const rep =
    fields.length === 1 && repeatables.length === 1
      ? repeatables[0]
      : undefined;
  const leafKey = leaf?.key;
  if (!leafKey && !rep) return [];

  const out: PrefillSuggestion[] = [];
  const seenValues = new Set<string>();

  for (const obj of upstream) {
    const sourceLabel = obj.shortTitle ?? obj.title;
    for (const item of obj.checklist ?? []) {
      if (item.id === formId) continue;

      if (leaf && leafKey) {
        const text = (ctx.savedFormText[item.id] ?? '').trim();
        if (!text || seenValues.has(text)) continue;
        seenValues.add(text);
        out.push({
          fieldKey: leafKey,
          fieldLabel: leaf.label ?? sourceLabel,
          value: text,
          sourceLabel,
          origin: 'prior-objective',
        });
      } else if (rep) {
        const arr = loneArrayValue(ctx.savedFormData[item.id]);
        if (!arr || arr.length === 0) continue;
        const value = arr.slice(0, rep.max);
        const key = value.join(' ');
        if (seenValues.has(key)) continue;
        seenValues.add(key);
        out.push({
          fieldKey: rep.key,
          fieldLabel: rep.label,
          value,
          sourceLabel,
          origin: 'prior-objective',
        });
      }
    }
  }

  // Keep the recap compact -- at most a handful of upstream echoes.
  return out.slice(0, 4);
}

/* --------------------------------------------------------------------------
 * Public API
 * ----------------------------------------------------------------------- */

const EMPTY_RESULT: FormPrefillResult = Object.freeze({
  fromSteward: [],
  fromPriorObjectives: [],
}) as FormPrefillResult;

/**
 * Resolve pre-fill suggestions for one form. `fields` is the arm's structured
 * spec (null/empty for a fields-less textarea form). Fields-less forms get no
 * suggestions today: the steward branch is field-shape-driven, and surfacing a
 * prior answer into a free textarea risks low-signal noise across the ~200
 * textarea forms -- kept honest and quiet until a concrete need appears.
 */
export function resolveFormPrefill(
  fields: readonly FormFieldSpec[] | null,
  formId: string,
  ctx: PrefillContext,
): FormPrefillResult {
  if (!fields || fields.length === 0) return EMPTY_RESULT;
  return {
    fromSteward: stewardSuggestions(fields, ctx.profiles),
    fromPriorObjectives: priorObjectiveSuggestions(fields, formId, ctx),
  };
}

/**
 * Loop the open group's form tools and key non-empty results by formId, so a
 * host wires pre-fill with a single memoised call + one prop on the modal.
 */
export function buildPrefillMap(
  tools: readonly ActTool[],
  ctx: PrefillContext,
): Record<string, FormPrefillResult> {
  const map: Record<string, FormPrefillResult> = {};
  for (const tool of tools) {
    if (tool.arm.kind !== 'form') continue;
    const result = resolveFormPrefill(tool.arm.fields ?? null, tool.arm.formId, ctx);
    if (result.fromSteward.length > 0 || result.fromPriorObjectives.length > 0) {
      map[tool.arm.formId] = result;
    }
  }
  return map;
}
