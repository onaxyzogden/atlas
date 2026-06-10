/**
 * LivestockIntentCapture -- a 5-mode ADVISORY pure-FormValue capture for the
 * silvopasture objective silv-sec-s1-livestock-intent ("Livestock intent: why,
 * what, and how it fits", 5 checklist items c1..c5). Ported from
 * olos_livestock_intent.html right-hand panels P1..P5. Catalogue item order ==
 * mockup panel order:
 *
 *   c1 -> rationale     (P1: why livestock -- single-select rationale)
 *   c2 -> species       (P2: candidate species multi-select with filter)
 *   c3 -> relationship  (P3: enterprise relationship -- single-select)
 *   c4 -> capacity      (P4: operator capacity self-assessment)
 *   c5 -> compat        (P5: compatibility review + confirm gate)
 *
 * Structure mirrors CarryingCapacityCapture / GrazingSystemCapture (the canonical
 * advisory multi-mode captures): a `livestockIntentModeFor(itemId)` mapper, the
 * `asStr`/`asArr`/`num` FormValue coercion helpers, per-mode discriminated-union
 * models, decode/encode (encode is the lossless inverse of decode), is*Valid,
 * summarise*, the props interface, and a single component that renders ONE mode
 * body. Props are {mode, value, onChange, itemId, siblingValues?} -- NO
 * projectId, NO store writes. The panel chrome (eyebrow / title / hint /
 * Record-Defer footer) is owned by the third-column host.
 *
 * CONTROLLED / pure: the model is derived from decode(value) each render; the
 * full next model is emitted via onChange(encode(next)). The capture holds NO
 * local state for PERSISTED values. The P2 filter is transient UI state only
 * (local useState), never persisted.
 *
 * decode NEVER throws and NEVER fabricates seed data: the careHours raw field
 * defaults to EMPTY string ("") -- the Stepper's 2.0 fallback is a DISPLAY
 * default applied only inside the body via `num`, exactly like CarryingCapacity.
 *
 * DELIBERATE DIVERGENCES FROM THE MOCKUP:
 *
 *  - P1 / P3 consequence text. The mockup renders all three option consequences
 *    inline beneath every card. Using the shared ChoiceCardGrid (single-select)
 *    we instead render only the SELECTED option's consequence in an
 *    InterpretationBlock below the grid. The consequence copy is preserved
 *    verbatim in a local map; nothing is lost, only the always-on layout
 *    differs. This is a control-composition divergence, not a copy change.
 *
 *  - P5 context rows. The mockup hardcodes demo site facts ("45 ha" site area,
 *    "Regen Farm" primary enterprise). Those are demo-only and project-specific,
 *    so we OMIT them. The context rows we render are derived purely from the
 *    operator's own c1/c2/c4 inputs via siblingValues.
 *
 *  - P5 compatibility checks are ADVISORY prompts (what to verify), NOT computed
 *    pass/fail. There is no compatibility engine wired into this pure capture;
 *    the authoritative paddock-design constraints are produced downstream at
 *    Tier 4. So these render as info/warn InterpretationBlocks, never as a gate.
 *
 * ASCII-only: em-dash -> " - "; ampersand "&" is literal ASCII in the skill
 * labels; no smart quotes. ChoiceCardGrid icons are OMITTED (the grid's icon
 * prop is optional and the species' emoji `icon` field in LIVESTOCK_SPECIES is
 * NEVER rendered). Apostrophes use double-quoted JS strings.
 */

import * as React from 'react';

import type { FormValue } from './actToolCatalog.js';
import {
  ChipSelect,
  ChoiceCardGrid,
  InterpretationBlock,
  SectionEyebrow,
  Stepper,
} from './captures/controls/index.js';
import type { ChoiceCardOption } from './captures/controls/index.js';
import { LIVESTOCK_SPECIES } from '../../../features/livestock/speciesData.js';
import type { LivestockSpecies } from '../../../store/livestockStore.js';
import css from './LivestockIntentCapture.module.css';

// ---------------------------------------------------------------------------
// Mode mapper
// ---------------------------------------------------------------------------

export type LivestockIntentMode =
  | 'rationale' // c1
  | 'species' // c2
  | 'relationship' // c3
  | 'capacity' // c4
  | 'compat'; // c5

export const LIVESTOCK_INTENT_PREFIX = 'silv-sec-s1-livestock-intent';
const PREFIX_DASH = LIVESTOCK_INTENT_PREFIX + '-';

export function livestockIntentModeFor(itemId: string): LivestockIntentMode | null {
  if (!itemId.startsWith(PREFIX_DASH)) return null;
  const suffix = itemId.slice(PREFIX_DASH.length);
  switch (suffix) {
    case 'c1':
      return 'rationale';
    case 'c2':
      return 'species';
    case 'c3':
      return 'relationship';
    case 'c4':
      return 'capacity';
    case 'c5':
      return 'compat';
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Models (discriminated union by `kind`)
// ---------------------------------------------------------------------------

export interface RationaleModel {
  kind: 'rationale';
  /** one rationale option id, or "" = none */
  rationale: string;
}
export interface SpeciesModel {
  kind: 'species';
  /** LivestockSpecies keys */
  species: string[];
}
export interface RelationshipModel {
  kind: 'relationship';
  /** one relationship option id, or "" = none */
  relationship: string;
}
export interface CapacityModel {
  kind: 'capacity';
  experience: string;
  priorSpecies: string[];
  /** RAW STRING; "" default. The Stepper's 2.0 is a display fallback only. */
  careHours: string;
  skills: string[];
  support: string[];
}
export interface CompatModel {
  kind: 'compat';
  confirmed: boolean;
}

export type LivestockIntentModel =
  | RationaleModel
  | SpeciesModel
  | RelationshipModel
  | CapacityModel
  | CompatModel;

// ---------------------------------------------------------------------------
// Verbatim constants (rationale + relationship options; never reword)
// ---------------------------------------------------------------------------

interface RationaleSpec {
  id: string;
  title: string;
  description: string;
  /** rendered only when this option is the selected one (see header divergence) */
  consequence: string;
}

export const RATIONALE_OPTIONS: readonly RationaleSpec[] = [
  {
    id: 'land-management',
    title: 'Land management tool',
    description:
      'Livestock manage vegetation, build soil biology, and cycle fertility. Ecological function is primary. Production output is real but secondary.',
    consequence:
      'Act tasks prioritise rotation design and soil monitoring. Yield targets will not be set as primary success criteria.',
  },
  {
    id: 'production',
    title: 'Production enterprise',
    description:
      'Livestock are a primary income source - meat, wool, eggs, or dairy. Ecological benefit is genuine but the enterprise must be financially viable on its own terms.',
    consequence:
      'Livestock appear in the core enterprise tier. Financial readiness criteria gate launch. Ecological impact monitoring is required throughout.',
  },
  {
    id: 'integrated',
    title: 'Integrated - ecological and economic equally',
    description:
      'Both objectives are explicitly co-designed to reinforce each other. Neither is sacrificed. This is the design brief.',
    consequence:
      'Enterprise integration matrix requires a confirmed waste-to-input loop between livestock and at least one other enterprise before Tier 5 gates.',
  },
];

interface RelationshipSpec {
  id: string;
  title: string;
  description: string;
  consequence: string;
}

export const RELATIONSHIP_OPTIONS: readonly RelationshipSpec[] = [
  {
    id: 'complementary',
    title: 'Complementary',
    description:
      'Livestock actively enhance the primary enterprise. Hens in orchard lanes for pest control, cattle following harvest for residue management, grazing cover crops between tree rows.',
    consequence:
      'Enterprise integration matrix maps specific waste-to-input loops. Sequencing is co-designed. At least one confirmed loop required before Tier 5 gates.',
  },
  {
    id: 'supplementary',
    title: 'Supplementary',
    description:
      'Livestock use spare capacity - marginal land, off-season paddocks, underutilised zones. No direct operational interaction with the primary enterprise.',
    consequence:
      'Livestock are scheduled around the primary enterprise calendar. No formal integration design required unless loops emerge.',
  },
  {
    id: 'competing',
    title: 'Competing - explicit trade-offs required',
    description:
      'Livestock directly compete for land, water, or labour. Not a disqualification - but it must be explicitly designed around before both can proceed.',
    consequence:
      'Tier 3 Spatial Framework must resolve the competition. Resource allocation must be formally decided before design begins.',
  },
];

const RATIONALE_BY_ID = new Map<string, RationaleSpec>(
  RATIONALE_OPTIONS.map((o) => [o.id, o]),
);
const RELATIONSHIP_BY_ID = new Map<string, RelationshipSpec>(
  RELATIONSHIP_OPTIONS.map((o) => [o.id, o]),
);
const RATIONALE_IDS = new Set<string>(RATIONALE_OPTIONS.map((o) => o.id));
const RELATIONSHIP_IDS = new Set<string>(RELATIONSHIP_OPTIONS.map((o) => o.id));

// Species keys + the P2 filter classification (ruminant / poultry / other).
const SPECIES_KEYS = Object.keys(LIVESTOCK_SPECIES) as LivestockSpecies[];
const SPECIES_KEY_SET = new Set<string>(SPECIES_KEYS);

type SpeciesGroup = 'ruminant' | 'poultry' | 'other';
const SPECIES_GROUP: Record<LivestockSpecies, SpeciesGroup> = {
  sheep: 'ruminant',
  cattle: 'ruminant',
  goats: 'ruminant',
  poultry: 'poultry',
  ducks_geese: 'poultry',
  pigs: 'other',
  horses: 'other',
  rabbits: 'other',
  bees: 'other',
};

type SpeciesFilter = 'all' | 'ruminant' | 'poultry' | 'other';
const SPECIES_FILTERS: readonly { id: SpeciesFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'ruminant', label: 'Ruminants' },
  { id: 'poultry', label: 'Poultry' },
  { id: 'other', label: 'Other' },
];

// Experience levels (id = lowercase title).
const EXPERIENCE_LEVELS: readonly { id: string; title: string }[] = [
  { id: 'novice', title: 'Novice' },
  { id: 'learning', title: 'Learning' },
  { id: 'experienced', title: 'Experienced' },
  { id: 'professional', title: 'Professional' },
];
const EXPERIENCE_TITLE_BY_ID = new Map<string, string>(
  EXPERIENCE_LEVELS.map((e) => [e.id, e.title]),
);

// Prior-species chip options: all species labels + a "None yet" sentinel.
const NONE_YET = 'None yet';
const PRIOR_SPECIES_OPTIONS: readonly string[] = [
  ...SPECIES_KEYS.map((k) => LIVESTOCK_SPECIES[k].label),
  NONE_YET,
];

// Skills + support options (verbatim).
const SKILL_OPTIONS: readonly string[] = [
  'Feeding, watering & daily observation',
  'Health monitoring & condition scoring',
  'Birthing, weaning & handling',
  'Processing or slaughter',
  'Fencing & paddock maintenance',
];
const SUPPORT_OPTIONS: readonly string[] = [
  'Mentorship',
  'Vet on call',
  'Training course',
  'Relief carer',
  'None needed',
];

const CARE_HOURS_DEFAULT = 2.0;

// ---------------------------------------------------------------------------
// FormValue coercion helpers (mirror Grazing / CarryingCapacity convention)
// ---------------------------------------------------------------------------

function asStr(v: FormValue[string] | undefined): string {
  return typeof v === 'string' ? v : '';
}

function asArr(v: FormValue[string] | undefined): string[] {
  if (Array.isArray(v)) return v;
  return typeof v === 'string' && v !== '' ? [v] : [];
}

/**
 * Numeric coercion. Falls back ONLY when raw is empty or parses to a non-finite
 * number; a legitimate 0 is PRESERVED. Mirrors the CarryingCapacity convention.
 */
function num(raw: string, fallback: number): number {
  if (raw.trim() === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

// ---------------------------------------------------------------------------
// decode: FormValue -> LivestockIntentModel (TOTAL / defensive; never throws /
// fabricates seed data -- numeric raw fields default to "")
// ---------------------------------------------------------------------------

export function decodeLivestockIntent(
  mode: LivestockIntentMode,
  value: FormValue,
): LivestockIntentModel {
  switch (mode) {
    case 'rationale': {
      const raw = asStr(value.liRationale);
      return { kind: 'rationale', rationale: RATIONALE_IDS.has(raw) ? raw : '' };
    }
    case 'species': {
      const species = asArr(value.liSpecies).filter((s) => SPECIES_KEY_SET.has(s));
      return { kind: 'species', species };
    }
    case 'relationship': {
      const raw = asStr(value.liRelationship);
      return {
        kind: 'relationship',
        relationship: RELATIONSHIP_IDS.has(raw) ? raw : '',
      };
    }
    case 'capacity':
      return {
        kind: 'capacity',
        experience: asStr(value.liExperience),
        priorSpecies: asArr(value.liPriorSpecies),
        careHours: asStr(value.liCareHours),
        skills: asArr(value.liSkills),
        support: asArr(value.liSupport),
      };
    case 'compat':
      return { kind: 'compat', confirmed: asStr(value.liConfirmed) === 'yes' };
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown LivestockIntentMode: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// encode: LivestockIntentModel -> FormValue (lossless inverse of decode)
// ---------------------------------------------------------------------------

export function encodeLivestockIntent(
  _mode: LivestockIntentMode,
  model: LivestockIntentModel,
): FormValue {
  switch (model.kind) {
    case 'rationale':
      return { liRationale: model.rationale };
    case 'species':
      return { liSpecies: [...model.species] };
    case 'relationship':
      return { liRelationship: model.relationship };
    case 'capacity':
      return {
        liExperience: model.experience,
        liPriorSpecies: [...model.priorSpecies],
        liCareHours: model.careHours,
        liSkills: [...model.skills],
        liSupport: [...model.support],
      };
    case 'compat':
      return { liConfirmed: model.confirmed ? 'yes' : '' };
    default: {
      const _exhaustive: never = model;
      throw new Error(`Unknown LivestockIntentModel kind: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// validity gates (advisory: only compat gates; the rest are always recordable)
// ---------------------------------------------------------------------------

export function isLivestockIntentValid(
  mode: LivestockIntentMode,
  value: FormValue,
): boolean {
  if (mode === 'compat') {
    return (decodeLivestockIntent('compat', value) as CompatModel).confirmed === true;
  }
  return true;
}

// ---------------------------------------------------------------------------
// summaries (one line per mode; defensive)
// ---------------------------------------------------------------------------

export function summariseLivestockIntent(
  mode: LivestockIntentMode,
  value: FormValue,
  siblingValues?: Record<string, FormValue>,
  prefix: string = LIVESTOCK_INTENT_PREFIX,
): string {
  void siblingValues;
  void prefix;
  switch (mode) {
    case 'rationale': {
      const m = decodeLivestockIntent('rationale', value) as RationaleModel;
      const spec = RATIONALE_BY_ID.get(m.rationale);
      return spec ? `Integration rationale: ${spec.title}` : 'No rationale selected';
    }
    case 'species': {
      const m = decodeLivestockIntent('species', value) as SpeciesModel;
      if (m.species.length === 0) return 'No species selected';
      const labels = m.species
        .map((k) => LIVESTOCK_SPECIES[k as LivestockSpecies]?.label ?? k)
        .join(', ');
      return `${m.species.length} candidate species: ${labels}`;
    }
    case 'relationship': {
      const m = decodeLivestockIntent('relationship', value) as RelationshipModel;
      const spec = RELATIONSHIP_BY_ID.get(m.relationship);
      return spec
        ? `Enterprise relationship: ${spec.title}`
        : 'No relationship selected';
    }
    case 'capacity': {
      const m = decodeLivestockIntent('capacity', value) as CapacityModel;
      const expLabel =
        m.experience !== '' ? EXPERIENCE_TITLE_BY_ID.get(m.experience) ?? m.experience : 'unset';
      const hrs = num(m.careHours, CARE_HOURS_DEFAULT);
      return `Experience: ${expLabel}; ${hrs} hrs/day daily care`;
    }
    case 'compat': {
      const m = decodeLivestockIntent('compat', value) as CompatModel;
      return m.confirmed
        ? 'Livestock intent confirmed compatible'
        : 'Compatibility not yet confirmed';
    }
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown LivestockIntentMode: ${String(_exhaustive)}`);
    }
  }
}

// ===========================================================================
// React component + 5 mode bodies (P1..P5)
// ===========================================================================

export interface LivestockIntentCaptureProps {
  mode: LivestockIntentMode;
  value: FormValue;
  onChange: (next: FormValue) => void;
  /** this capture's own checklist item id (e.g. silv-sec-s1-livestock-intent-c1). */
  itemId: string;
  /** full per-item FormValue map; only compat (c5) reads c1/c2/c4 siblings. */
  siblingValues?: Record<string, FormValue>;
}

export function LivestockIntentCapture({
  mode,
  value,
  onChange,
  itemId,
  siblingValues = {},
}: LivestockIntentCaptureProps): React.JSX.Element {
  void itemId;
  const prefix = LIVESTOCK_INTENT_PREFIX;

  // P2 filter is transient UI state only -- never persisted.
  const [speciesFilter, setSpeciesFilter] = React.useState<SpeciesFilter>('all');

  // -- P1: rationale --------------------------------------------------------
  if (mode === 'rationale') {
    const model = decodeLivestockIntent('rationale', value) as RationaleModel;
    const selected = RATIONALE_BY_ID.get(model.rationale);
    const options: ChoiceCardOption[] = RATIONALE_OPTIONS.map((o) => ({
      id: o.id,
      title: o.title,
      description: o.description,
    }));
    return (
      <div className={css.root} data-li-mode="rationale">
        <div>
          <SectionEyebrow>Why livestock on this site</SectionEyebrow>
          <ChoiceCardGrid
            options={options}
            value={model.rationale !== '' ? [model.rationale] : []}
            onChange={(next) =>
              onChange(
                encodeLivestockIntent('rationale', {
                  kind: 'rationale',
                  rationale: next[0] ?? '',
                }),
              )
            }
            columns={1}
            ariaLabel="Livestock rationale"
          />
        </div>
        {selected ? (
          <InterpretationBlock tone="info">{selected.consequence}</InterpretationBlock>
        ) : null}
        <FeedsNote>
          The rationale sets how livestock are tiered in the design. It drives the{' '}
          <strong>enterprise relationship (item 3)</strong> and the integration
          requirements that gate later tiers.
        </FeedsNote>
      </div>
    );
  }

  // -- P2: species ----------------------------------------------------------
  if (mode === 'species') {
    const model = decodeLivestockIntent('species', value) as SpeciesModel;
    const setSpecies = (species: string[]): void =>
      onChange(encodeLivestockIntent('species', { kind: 'species', species }));
    const visibleKeys = SPECIES_KEYS.filter(
      (k) => speciesFilter === 'all' || SPECIES_GROUP[k] === speciesFilter,
    );
    const options: ChoiceCardOption[] = visibleKeys.map((k) => {
      const info = LIVESTOCK_SPECIES[k];
      return {
        id: k,
        title: info.label,
        description: `Min ${info.minPaddockHa} ha - ~${info.typicalStocking} ${info.stockingUnit}/ha`,
      };
    });
    const selectedLabels = model.species.map(
      (k) => LIVESTOCK_SPECIES[k as LivestockSpecies]?.label ?? k,
    );
    return (
      <div className={css.root} data-li-mode="species">
        <div>
          <SectionEyebrow>Candidate species</SectionEyebrow>
          <div className={css.filterRow} role="group" aria-label="Species filter">
            {SPECIES_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={css.filterChip}
                data-on={speciesFilter === f.id}
                aria-pressed={speciesFilter === f.id}
                onClick={() => setSpeciesFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <ChoiceCardGrid
            options={options}
            value={model.species}
            onChange={setSpecies}
            multi
            columns={2}
            ariaLabel="Candidate species"
          />
        </div>
        {selectedLabels.length > 0 ? (
          <div>
            <div className={css.secLbl}>Selected</div>
            <div className={css.selChips}>
              {selectedLabels.map((label) => (
                <span key={label} className={css.selChip}>
                  {label}
                </span>
              ))}
            </div>
          </div>
        ) : null}
        <FeedsNote>
          Candidate species feed the{' '}
          <strong>carrying-capacity and forage survey</strong>: each species has
          its own stocking density, paddock minimum, and recovery window.
        </FeedsNote>
      </div>
    );
  }

  // -- P3: relationship -----------------------------------------------------
  if (mode === 'relationship') {
    const model = decodeLivestockIntent('relationship', value) as RelationshipModel;
    const selected = RELATIONSHIP_BY_ID.get(model.relationship);
    const options: ChoiceCardOption[] = RELATIONSHIP_OPTIONS.map((o) => ({
      id: o.id,
      title: o.title,
      description: o.description,
    }));
    return (
      <div className={css.root} data-li-mode="relationship">
        <div>
          <SectionEyebrow>Relationship to the primary enterprise</SectionEyebrow>
          <ChoiceCardGrid
            options={options}
            value={model.relationship !== '' ? [model.relationship] : []}
            onChange={(next) =>
              onChange(
                encodeLivestockIntent('relationship', {
                  kind: 'relationship',
                  relationship: next[0] ?? '',
                }),
              )
            }
            columns={1}
            ariaLabel="Enterprise relationship"
          />
        </div>
        {selected ? (
          <InterpretationBlock tone="info">{selected.consequence}</InterpretationBlock>
        ) : null}
        <FeedsNote>
          The relationship drives the{' '}
          <strong>enterprise integration matrix</strong>: complementary loops are
          co-designed, competing demands are resolved at Tier 3 before design
          begins.
        </FeedsNote>
      </div>
    );
  }

  // -- P4: capacity ---------------------------------------------------------
  if (mode === 'capacity') {
    const model = decodeLivestockIntent('capacity', value) as CapacityModel;
    const set = (patch: Partial<Omit<CapacityModel, 'kind'>>): void =>
      onChange(
        encodeLivestockIntent('capacity', { ...model, ...patch, kind: 'capacity' }),
      );
    const expOptions: ChoiceCardOption[] = EXPERIENCE_LEVELS.map((e) => ({
      id: e.id,
      title: e.title,
    }));
    const careHours = num(model.careHours, CARE_HOURS_DEFAULT);
    return (
      <div className={css.root} data-li-mode="capacity">
        <div>
          <SectionEyebrow>Experience level</SectionEyebrow>
          <ChoiceCardGrid
            options={expOptions}
            value={model.experience !== '' ? [model.experience] : []}
            onChange={(next) => set({ experience: next[0] ?? '' })}
            columns={2}
            ariaLabel="Experience level"
          />
        </div>
        <div>
          <SectionEyebrow>Prior species experience</SectionEyebrow>
          <ChipSelect
            options={PRIOR_SPECIES_OPTIONS}
            value={model.priorSpecies}
            onChange={(next) => set({ priorSpecies: next })}
            multi
            ariaLabel="Prior species experience"
          />
        </div>
        <div>
          <SectionEyebrow>Daily care hours available</SectionEyebrow>
          <Stepper
            value={careHours}
            onChange={(next) => set({ careHours: String(next) })}
            min={0.5}
            max={12}
            step={0.5}
            unit="hrs/day"
            ariaLabel="Daily care hours available"
          />
        </div>
        <div>
          <SectionEyebrow>Key skills available</SectionEyebrow>
          <ChipSelect
            options={SKILL_OPTIONS}
            value={model.skills}
            onChange={(next) => set({ skills: next })}
            multi
            ariaLabel="Key skills available"
          />
        </div>
        <div>
          <SectionEyebrow>Support or training needed</SectionEyebrow>
          <ChipSelect
            options={SUPPORT_OPTIONS}
            value={model.support}
            onChange={(next) => set({ support: next })}
            multi
            ariaLabel="Support or training needed"
          />
        </div>
        <FeedsNote>
          Operator capacity feeds the{' '}
          <strong>husbandry framework and labour plan</strong>. Daily care hours
          and skill gaps shape the support, training, and relief arrangements
          recorded later.
        </FeedsNote>
      </div>
    );
  }

  // -- P5: compat -----------------------------------------------------------
  const model = decodeLivestockIntent('compat', value) as CompatModel;
  const c1 = decodeLivestockIntent(
    'rationale',
    siblingValues[`${prefix}-c1`] ?? {},
  ) as RationaleModel;
  const c2 = decodeLivestockIntent(
    'species',
    siblingValues[`${prefix}-c2`] ?? {},
  ) as SpeciesModel;
  const c4 = decodeLivestockIntent(
    'capacity',
    siblingValues[`${prefix}-c4`] ?? {},
  ) as CapacityModel;

  const rationaleLabel = RATIONALE_BY_ID.get(c1.rationale)?.title ?? 'Not set';
  const speciesLabel =
    c2.species.length > 0
      ? c2.species
          .map((k) => LIVESTOCK_SPECIES[k as LivestockSpecies]?.label ?? k)
          .join(', ')
      : 'None selected';
  const careLabel =
    c4.careHours.trim() !== ''
      ? `${num(c4.careHours, CARE_HOURS_DEFAULT)} hrs/day`
      : 'Not set';

  const ctxRows: { label: string; value: string }[] = [
    { label: 'Integration rationale', value: rationaleLabel },
    { label: 'Candidate species', value: speciesLabel },
    { label: 'Daily care committed', value: careLabel },
  ];

  const toggleConfirm = (): void =>
    onChange(
      encodeLivestockIntent('compat', {
        kind: 'compat',
        confirmed: !model.confirmed,
      }),
    );

  return (
    <div className={css.root} data-li-mode="compat">
      <div>
        <SectionEyebrow>Based on your inputs</SectionEyebrow>
        <div className={css.ctxList}>
          {ctxRows.map((row) => (
            <div key={row.label} className={css.ctxRow}>
              <span className={css.ctxLbl}>{row.label}</span>
              <span className={css.ctxVal}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <SectionEyebrow>Compatibility checks</SectionEyebrow>
        <div className={css.checkList}>
          <InterpretationBlock tone="info">
            Confirm the planned land area can support the candidate species at a
            viable stocking density once the forage survey is complete.
          </InterpretationBlock>
          <InterpretationBlock tone="info">
            Confirm daily husbandry fits within the care hours committed in item
            4, including peak periods such as lambing or weaning.
          </InterpretationBlock>
          <InterpretationBlock tone="warn">
            Resolve any conflict with the primary enterprise for land, water, or
            labour before both proceed.
          </InterpretationBlock>
          <InterpretationBlock tone="info">
            Site-specific safety and welfare constraints become Tier 4
            paddock-design outputs - they are not decided here.
          </InterpretationBlock>
        </div>
      </div>
      <label className={css.confirmRow}>
        <input
          type="checkbox"
          className={css.confirmBox}
          checked={model.confirmed}
          onChange={toggleConfirm}
        />
        <span className={css.confirmTxt}>
          {"I've reviewed these factors and confirm livestock intent is compatible with this project's vision and site scale."}
        </span>
      </label>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared sub-component
// ---------------------------------------------------------------------------

function FeedsNote({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className={css.feedsBlock}>
      <div className={css.feedsTxt}>{children}</div>
    </div>
  );
}

export default LivestockIntentCapture;
