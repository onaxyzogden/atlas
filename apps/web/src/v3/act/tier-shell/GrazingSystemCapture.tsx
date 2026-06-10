/**
 * GrazingSystemCapture -- a multi-mode CONTROLLED capture for the silvopasture
 * objective silv-sec-s4-grazing-design ("A sound grazing system & rotation
 * framework", ref SILV-S4.20). Ported from the grazing-system mockup right-hand
 * panels P1..P6:
 *
 *   c1 -> grazingMethod    (method cards + rationale)
 *   c2 -> paddockLayout    (paddock register + mob size)
 *   c3 -> grazeRest        (4-season graze/rest targets)
 *   c4 -> treeProtection   (3-stage tree-protection rules + per-stage notes)
 *   c5 -> contingency      (4-tier feed-gap contingency)
 *   c6 -> stockingDensity  (advisory designed-flock breakdown)
 *
 * This file follows ForageCapture exactly: the pure CONTRACT (types, mode
 * mapper, decode/encode, validity gates, summaries, verbatim constant tables)
 * then the controlled React component plus its six mode bodies. The component
 * renders ONLY the scrollable mode body (the mockup's `.rb` inner content) --
 * the third-column host owns the eyebrow / title / hint / Record-Defer chrome.
 *
 * Editable-vs-canonical split (mirrors ForageCapture): universal agronomic
 * facts (what each grazing method IS, the 4 season badges + recovery-indicator
 * guidance, the 3-stage tree-protection biological rules, the 4-tier severity
 * ladder) are CANONICAL verbatim constants rendered as fixed reference content;
 * farm-specific example values (the rationale, paddock list, dam %, per-tier
 * triggers/actions, flock breakdown) are EDITABLE fields whose mockup text is
 * used ONLY as input placeholders. decode of an empty FormValue returns
 * empty/"" -- it never fabricates the demo farm's data.
 *
 * UNLIKE ForageCapture: GrazingSystemCapture takes NO projectId prop and writes
 * NOTHING to any store. c6 is ADVISORY only -- a separate formula
 * (paddock-stocking-density) computes the authoritative check from the store
 * independently. This is a pure FormValue capture.
 *
 * Numeric raw fields are stored as RAW STRINGS and coerced via `num`
 * (CarryingCapacity convention -- preserves a legitimate 0). decode is TOTAL:
 * it never throws and never fabricates seed data.
 *
 * ASCII-only: em-dash -> " -- "; en-dash in date ranges -> "-"; "x" not the
 * multiplication glyph; ">=" not the inequality glyph; no smart quotes; all
 * icons are lucide. Apostrophes use double-quoted JS strings.
 */

import * as React from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

import type { FormValue } from './actToolCatalog.js';
import {
  AmountRow,
  Dropdown,
  InterpretationBlock,
  RegisterList,
  SectionEyebrow,
} from './captures/controls/index.js';
import css from './GrazingSystemCapture.module.css';

// ---------------------------------------------------------------------------
// Mode mapper
// ---------------------------------------------------------------------------

export type GrazingMode =
  | 'grazingMethod' // c1
  | 'paddockLayout' // c2
  | 'grazeRest' // c3
  | 'treeProtection' // c4
  | 'contingency' // c5
  | 'stockingDensity'; // c6

export const GRAZING_PREFIX = 'silv-sec-s4-grazing-design';
const PREFIX_DASH = GRAZING_PREFIX + '-';

export function grazingModeFor(itemId: string): GrazingMode | null {
  if (!itemId.startsWith(PREFIX_DASH)) return null;
  const suffix = itemId.slice(PREFIX_DASH.length);
  switch (suffix) {
    case 'c1':
      return 'grazingMethod';
    case 'c2':
      return 'paddockLayout';
    case 'c3':
      return 'grazeRest';
    case 'c4':
      return 'treeProtection';
    case 'c5':
      return 'contingency';
    case 'c6':
      return 'stockingDensity';
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Domain string unions
// ---------------------------------------------------------------------------

export type GrazingMethodKey = 'rotational' | 'cell' | 'set-stocking';
export type PaddockStatus = 'ok' | 'seasonal';

// ---------------------------------------------------------------------------
// Models (kind-discriminated; numeric fields stored as RAW STRINGS)
// ---------------------------------------------------------------------------

export interface GrazingMethodModel {
  kind: 'grazingMethod';
  /** raw; one of GrazingMethodKey or "" (defensive) */
  method: string;
  rationale: string;
}

export interface PaddockInput {
  /** stable; deterministic id for keying */
  id: string;
  name: string;
  /** raw numeric string */
  areaHa: string;
  /** "ok" | "seasonal" (raw string, defensive) */
  status: string;
}
export interface PaddockLayoutModel {
  kind: 'paddockLayout';
  paddocks: PaddockInput[];
  /** raw numeric string */
  mobSize: string;
}

export interface SeasonTarget {
  grazePeriod: string;
  restPeriod: string;
  indicator: string;
}
export interface GrazeRestModel {
  kind: 'grazeRest';
  /** length === GRAZING_SEASONS.length (4), positional */
  seasons: SeasonTarget[];
}

export interface TreeProtectionModel {
  kind: 'treeProtection';
  /** length === TREE_STAGES.length (3), positional per-stage site notes */
  stageNotes: string[];
}

export interface ContingencyTierInput {
  trigger: string;
  action: string;
}
export interface ContingencyModel {
  kind: 'contingency';
  /** length === CONTINGENCY_TIERS.length (4), positional */
  tiers: ContingencyTierInput[];
}

export interface FlockClassInput {
  id: string;
  label: string;
  /** raw numeric string */
  head: string;
  /** raw numeric string */
  dsePerHead: string;
}
export interface StockingDensityModel {
  kind: 'stockingDensity';
  flock: FlockClassInput[];
}

export type GrazingModel =
  | GrazingMethodModel
  | PaddockLayoutModel
  | GrazeRestModel
  | TreeProtectionModel
  | ContingencyModel
  | StockingDensityModel;

// ---------------------------------------------------------------------------
// Verbatim constants (universal agronomic / biological references; never reword)
// ---------------------------------------------------------------------------

export interface GrazingMethodSpec {
  key: GrazingMethodKey;
  title: string;
  desc: string;
  /** false renders a de-emphasised, not-selectable card (mockup's disabled red) */
  recommended: boolean;
}
// Title + desc verbatim from mockup lines 227-228 / 235-236 / 243-244.
export const GRAZING_METHODS: readonly GrazingMethodSpec[] = [
  {
    key: 'rotational',
    title: 'Rotational grazing',
    desc: "Animals move between paddocks on defined graze/rest cycles. Rest periods allow pasture recovery. Adaptive: move when recovery indicators are met, not by calendar alone.",
    recommended: true,
  },
  {
    key: 'cell',
    title: 'Cell grazing (Holistic Planned Grazing)',
    desc: "Very high-density, short-duration grazing in small cells (daily to weekly moves). Requires many subdivisions and intensive management. 60-180+ day rest periods. Best outcomes for land but highest infrastructure cost.",
    recommended: true,
  },
  {
    key: 'set-stocking',
    title: 'Set-stocking -- not recommended',
    desc: "Animals remain in one paddock continuously. No rest periods. Simple management, low infrastructure.",
    recommended: false,
  },
];

export interface GrazingSeasonSpec {
  key: 'autumn' | 'winter' | 'spring' | 'summer';
  badge: string;
  feedGap: boolean;
  defaultGraze: string;
  defaultRest: string;
  defaultIndicator: string;
}
// Badges + recovery indicators verbatim from mockup lines 324-345 (ASCII en-dash -> "-").
export const GRAZING_SEASONS: readonly GrazingSeasonSpec[] = [
  {
    key: 'autumn',
    badge: 'Autumn Apr-Jun',
    feedGap: false,
    defaultGraze: '3-4 wks',
    defaultRest: '6-8 wks',
    defaultIndicator:
      "Pasture regrows to 20-25cm (boot height) -- legumes actively nodulating -- new growth is lush",
  },
  {
    key: 'winter',
    badge: 'Winter Jul-Sep',
    feedGap: false,
    defaultGraze: '2-3 wks',
    defaultRest: '7-9 wks',
    defaultIndicator:
      "Slower recovery in cool season -- wait for 20cm+ regrowth regardless of time elapsed -- ryegrass tiller density as indicator",
  },
  {
    key: 'spring',
    badge: 'Spring Oct-Dec',
    feedGap: false,
    defaultGraze: '1-2 wks',
    defaultRest: '3-4 wks',
    defaultIndicator:
      "Fast spring growth -- move before seed set. Target 25cm height, move at 35cm to prevent rank stemmy growth. Prevent over-resting in spring or pasture becomes unpalatable.",
  },
  {
    key: 'summer',
    badge: 'Summer Jan-Mar',
    feedGap: true,
    defaultGraze: 'Feed gap',
    defaultRest: '--',
    defaultIndicator:
      "Feed gap period (Jan-Mar) -- no rotation target. Supplementary feeding or contingency protocol applies. See item 5.",
  },
];

export interface TreeStageSpec {
  badge: 'EXCLUDED' | 'CONTROLLED' | 'INTEGRATED';
  tone: 'excluded' | 'controlled' | 'integrated';
  name: string;
  years: string;
  rules: readonly string[];
}
// VERBATIM from mockup lines 370-393 (universal silvopasture biological principles).
export const TREE_STAGES: readonly TreeStageSpec[] = [
  {
    badge: 'EXCLUDED',
    tone: 'excluded',
    name: 'Stage 1 -- Establishment',
    years: 'Years 0-3',
    rules: [
      "Stock-proof fencing around all new plantings before any trees are planted. No exceptions.",
      "Sheep will bark-strip and browse any accessible young tree. A single day's access can kill a 2-year-old tree.",
      "Drip irrigation and establishment care occurs through fenced exclusion zone only.",
      "Exclusion maintained until ALL trees in the block have hardened bark and are above the sheep browse line (minimum 2m clear stem).",
    ],
  },
  {
    badge: 'CONTROLLED',
    tone: 'controlled',
    name: 'Stage 2 -- Consolidation',
    years: 'Years 4-7',
    rules: [
      "Access permitted outside spring flush (October-December). New spring growth is tender and vulnerable to browsing even in Stage 2 trees.",
      "Maximum 2-week graze period under trees. Inspect bark condition before each access event.",
      "Browse limit: sheep may graze understorey foliage below 1.5m. Remove sheep immediately if bark stripping observed on any tree.",
      "Monitor root zone compaction under drip line -- move sheep on if soil hardens. Aerate under-tree soil if compaction is observed.",
    ],
  },
  {
    badge: 'INTEGRATED',
    tone: 'integrated',
    name: 'Stage 3 -- Full silvopasture',
    years: 'Years 8+',
    rules: [
      "Sheep graze freely under full canopy. Trees are mature enough to withstand normal grazing activity.",
      "Maintain rotational rotation -- sheep still move on recovery indicators. Even mature trees benefit from rest periods without grazing pressure.",
      "Annual check: inspect canopy condition, root zone soil structure, bark integrity. Note any decline in tree health that may indicate overgrazing stress.",
      "Fruit drop grazing: allow sheep under orchard trees during harvest season -- they clean up fallen fruit (pest cycle interruption) and return nutrients via manure.",
    ],
  },
];

export interface ContingencyTierSpec {
  level: 'Normal' | 'Tier 1 -- Alert' | 'Tier 2 -- Restriction' | 'Tier 3 -- Emergency';
  name: string;
  tone: 'pass' | 'warn' | 'fail';
  /** "" when none (Normal has no water cross-ref) */
  waterXref: string;
  triggerPlaceholder: string;
  actionPlaceholder: string;
}
// Level + name + water cross-ref + trigger/action placeholders verbatim from mockup lines 417-438.
export const CONTINGENCY_TIERS: readonly ContingencyTierSpec[] = [
  {
    level: 'Normal',
    name: 'Full winter/spring rotation -- Jan approaches',
    tone: 'pass',
    waterXref: '',
    triggerPlaceholder:
      "All three paddocks at expected condition entering December -- dam >= 60% -- bore performing normally",
    actionPlaceholder:
      "No contingency action needed. Harvest any unused fodder from north paddock in Dec for hay baling. Target: 2-3 months supplementary hay stored before Jan 1.",
  },
  {
    level: 'Tier 1 -- Alert',
    name: 'Supplementary feeding begins',
    tone: 'warn',
    waterXref: "Connects to water strategy drought Tier 2 -- same trigger conditions",
    triggerPlaceholder:
      "Pasture below maintenance level in January -- dam 40-60% or below monthly average rainfall for 4+ weeks",
    actionPlaceholder:
      "Begin supplementary hay feeding in north paddock (largest area, most rest). Feed at 1.5% body weight dry matter per day (1.5kg DM/ewe/day). Monitor condition score weekly -- if score falls below 2.5, escalate to Tier 2.",
  },
  {
    level: 'Tier 2 -- Restriction',
    name: 'Partial destocking',
    tone: 'fail',
    waterXref: "Connects to water strategy drought Tier 3",
    triggerPlaceholder:
      "Extended dry >= 6 weeks in Jan-Feb -- condition score falling despite supplementary feeding -- dam <= 35%",
    actionPlaceholder:
      "Sell or agist 30-40% of ewes (draft on condition score -- sell poorest first). Retain: best-conditioned ewes, any pregnant/lactating ewes, rams. Reduces supplementary feed cost by 35-40%. Consider contacting agistment network before this tier is triggered -- lead time required.",
  },
  {
    level: 'Tier 3 -- Emergency',
    name: 'Emergency destocking',
    tone: 'fail',
    waterXref: "Connects to water strategy drought Tier 4",
    triggerPlaceholder:
      "Bore yield declining -- dam below 20% -- no agistment available -- condition scores deteriorating across whole mob",
    actionPlaceholder:
      "Emergency sale or agistment of full mob except core breeding animals (20-30 retained if any feed source remains). Welfare obligation: do not let animals reach condition score 1. Contact saleyards for emergency consignment slots 2 weeks ahead if possible.",
  },
];

// ---------------------------------------------------------------------------
// FormValue coercion helpers (mirror ForageCapture)
// ---------------------------------------------------------------------------

function asArr(v: FormValue[string] | undefined): string[] {
  if (Array.isArray(v)) return v;
  return typeof v === 'string' && v !== '' ? [v] : [];
}
function zipLen(...arrs: string[][]): number {
  return arrs.length ? Math.min(...arrs.map((a) => a.length)) : 0;
}

/** Scalar field as string ("" when absent / array). */
function asStr(v: FormValue[string] | undefined): string {
  return typeof v === 'string' ? v : '';
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

/** Positional fixed-length string[] from a possibly-short / scalar array. */
function fixedStrings(v: FormValue[string] | undefined, len: number): string[] {
  const arr = asArr(v);
  const out: string[] = [];
  for (let i = 0; i < len; i++) out.push(arr[i] ?? '');
  return out;
}

// ---------------------------------------------------------------------------
// decode: FormValue -> GrazingModel (TOTAL / defensive; never throws/fabricates)
// ---------------------------------------------------------------------------

export function decodeGrazing(mode: GrazingMode, value: FormValue): GrazingModel {
  switch (mode) {
    case 'grazingMethod': {
      const raw = asStr(value.grazingMethod);
      const method =
        raw === 'rotational' || raw === 'cell' || raw === 'set-stocking' ? raw : '';
      return { kind: 'grazingMethod', method, rationale: asStr(value.grazingRationale) };
    }
    case 'paddockLayout': {
      const padIds = asArr(value.padIds);
      const padNames = asArr(value.padNames);
      const padAreas = asArr(value.padAreas);
      const padStatuses = asArr(value.padStatuses);
      const n = zipLen(padIds, padNames, padAreas, padStatuses);
      const paddocks: PaddockInput[] = [];
      for (let i = 0; i < n; i++) {
        const rawId = padIds[i] ?? '';
        const rawStatus = padStatuses[i] ?? '';
        paddocks.push({
          id: rawId !== '' ? rawId : `pad-${i}`,
          name: padNames[i] ?? '',
          areaHa: padAreas[i] ?? '',
          status: rawStatus === 'ok' || rawStatus === 'seasonal' ? rawStatus : 'ok',
        });
      }
      return { kind: 'paddockLayout', paddocks, mobSize: asStr(value.mobSize) };
    }
    case 'grazeRest': {
      const graze = fixedStrings(value.seasonGraze, GRAZING_SEASONS.length);
      const rest = fixedStrings(value.seasonRest, GRAZING_SEASONS.length);
      const indicator = fixedStrings(value.seasonIndicator, GRAZING_SEASONS.length);
      const seasons: SeasonTarget[] = [];
      for (let i = 0; i < GRAZING_SEASONS.length; i++) {
        seasons.push({
          grazePeriod: graze[i] ?? '',
          restPeriod: rest[i] ?? '',
          indicator: indicator[i] ?? '',
        });
      }
      return { kind: 'grazeRest', seasons };
    }
    case 'treeProtection': {
      return {
        kind: 'treeProtection',
        stageNotes: fixedStrings(value.treeStageNotes, TREE_STAGES.length),
      };
    }
    case 'contingency': {
      const trigger = fixedStrings(value.contTrigger, CONTINGENCY_TIERS.length);
      const action = fixedStrings(value.contAction, CONTINGENCY_TIERS.length);
      const tiers: ContingencyTierInput[] = [];
      for (let i = 0; i < CONTINGENCY_TIERS.length; i++) {
        tiers.push({ trigger: trigger[i] ?? '', action: action[i] ?? '' });
      }
      return { kind: 'contingency', tiers };
    }
    case 'stockingDensity': {
      const flockIds = asArr(value.flockIds);
      const flockLabels = asArr(value.flockLabels);
      const flockHeads = asArr(value.flockHeads);
      const flockDse = asArr(value.flockDse);
      const n = zipLen(flockIds, flockLabels, flockHeads, flockDse);
      const flock: FlockClassInput[] = [];
      for (let i = 0; i < n; i++) {
        const rawId = flockIds[i] ?? '';
        flock.push({
          id: rawId !== '' ? rawId : `flock-${i}`,
          label: flockLabels[i] ?? '',
          head: flockHeads[i] ?? '',
          dsePerHead: flockDse[i] ?? '',
        });
      }
      return { kind: 'stockingDensity', flock };
    }
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown GrazingMode: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// encode: GrazingModel -> FormValue (lossless inverse of decode)
// ---------------------------------------------------------------------------

export function encodeGrazing(_mode: GrazingMode, model: GrazingModel): FormValue {
  switch (model.kind) {
    case 'grazingMethod':
      return { grazingMethod: model.method, grazingRationale: model.rationale };
    case 'paddockLayout':
      return {
        padIds: model.paddocks.map((p) => p.id),
        padNames: model.paddocks.map((p) => p.name),
        padAreas: model.paddocks.map((p) => p.areaHa),
        padStatuses: model.paddocks.map((p) => p.status),
        mobSize: model.mobSize,
      };
    case 'grazeRest':
      return {
        seasonGraze: model.seasons.map((s) => s.grazePeriod),
        seasonRest: model.seasons.map((s) => s.restPeriod),
        seasonIndicator: model.seasons.map((s) => s.indicator),
      };
    case 'treeProtection':
      return { treeStageNotes: [...model.stageNotes] };
    case 'contingency':
      return {
        contTrigger: model.tiers.map((t) => t.trigger),
        contAction: model.tiers.map((t) => t.action),
      };
    case 'stockingDensity':
      return {
        flockIds: model.flock.map((f) => f.id),
        flockLabels: model.flock.map((f) => f.label),
        flockHeads: model.flock.map((f) => f.head),
        flockDse: model.flock.map((f) => f.dsePerHead),
      };
    default: {
      const _exhaustive: never = model;
      throw new Error(`Unknown GrazingModel kind: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// validity gates (sees own value only)
// ---------------------------------------------------------------------------

export function isGrazingValid(mode: GrazingMode, value: FormValue): boolean {
  switch (mode) {
    case 'grazingMethod': {
      const model = decodeGrazing('grazingMethod', value) as GrazingMethodModel;
      return model.method !== '' && model.rationale.trim() !== '';
    }
    case 'paddockLayout':
      return true;
    case 'grazeRest':
      return true;
    case 'treeProtection':
      return true;
    case 'contingency':
      return true;
    case 'stockingDensity':
      return true; // advisory / computed elsewhere
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown GrazingMode: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// summaries
// ---------------------------------------------------------------------------

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

const METHOD_TITLE_BY_KEY = new Map<string, string>([
  ['rotational', 'Rotational grazing'],
  ['cell', 'Cell grazing'],
  ['set-stocking', 'Set-stocking'],
]);

export function summariseGrazing(
  mode: GrazingMode,
  value: FormValue,
  siblingValues?: Record<string, FormValue>,
  prefix: string = GRAZING_PREFIX,
): string {
  void siblingValues;
  void prefix;
  switch (mode) {
    case 'grazingMethod': {
      const model = decodeGrazing('grazingMethod', value) as GrazingMethodModel;
      if (model.method === '') return 'No grazing method selected';
      const title = METHOD_TITLE_BY_KEY.get(model.method) ?? model.method;
      return `${title} -- rationale recorded`;
    }
    case 'paddockLayout': {
      const model = decodeGrazing('paddockLayout', value) as PaddockLayoutModel;
      const n = model.paddocks.length;
      if (n === 0) return 'No paddock layout recorded';
      const mob = model.mobSize.trim();
      return `${plural(n, 'paddock', 'paddocks')}${mob !== '' ? `, mob size ${mob}` : ''}`;
    }
    case 'grazeRest': {
      const model = decodeGrazing('grazeRest', value) as GrazeRestModel;
      const set = model.seasons.filter((s) => s.grazePeriod.trim() !== '').length;
      return `Graze/rest targets set for ${set} of ${GRAZING_SEASONS.length} seasons`;
    }
    case 'treeProtection': {
      const model = decodeGrazing('treeProtection', value) as TreeProtectionModel;
      const notes = model.stageNotes.filter((s) => s.trim() !== '').length;
      return `3-stage tree-protection framework${
        notes > 0 ? ` (${plural(notes, 'stage note', 'stage notes')})` : ''
      }`;
    }
    case 'contingency': {
      const model = decodeGrazing('contingency', value) as ContingencyModel;
      const defined = model.tiers.filter((t) => t.trigger.trim() !== '').length;
      return `4-tier feed-gap contingency${defined > 0 ? ` -- ${defined} defined` : ''}`;
    }
    case 'stockingDensity': {
      const model = decodeGrazing('stockingDensity', value) as StockingDensityModel;
      const n = model.flock.length;
      if (n === 0) return 'No designed flock recorded';
      const total = model.flock.reduce(
        (sum, f) => sum + num(f.head, 0) * num(f.dsePerHead, 0),
        0,
      );
      const totalStr = Number.isInteger(total) ? String(total) : total.toFixed(1);
      return `~${totalStr} DSE designed across ${plural(
        n,
        'flock class',
        'flock classes',
      )}`;
    }
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown GrazingMode: ${String(_exhaustive)}`);
    }
  }
}

// ===========================================================================
// React component + 6 mode bodies (P1..P6)
// ===========================================================================

// Monotonic id counter -- stable within a session; decode's positional fallback
// never collides. Component-scope, so a plain counter is acceptable.
let _idCounter = 0;

const STATUS_LABELS: readonly { value: PaddockStatus; label: string }[] = [
  { value: 'ok', label: 'OK' },
  { value: 'seasonal', label: 'Seasonal' },
];
const STATUS_LABEL_BY_VALUE = new Map<string, string>(
  STATUS_LABELS.map((s) => [s.value, s.label]),
);
const STATUS_VALUE_BY_LABEL = new Map<string, PaddockStatus>(
  STATUS_LABELS.map((s) => [s.label, s.value]),
);

export interface GrazingSystemCaptureProps {
  mode: GrazingMode;
  value: FormValue;
  onChange: (next: FormValue) => void;
  /** this capture's own checklist item id (e.g. silv-sec-s4-grazing-design-c1). */
  itemId: string;
  /** full per-item FormValue map; reserved -- this capture reads no siblings. */
  siblingValues?: Record<string, FormValue>;
}

export function GrazingSystemCapture({
  mode,
  value,
  onChange,
  itemId,
  siblingValues = {},
}: GrazingSystemCaptureProps): React.JSX.Element {
  void itemId;
  void siblingValues;

  // -- P1: grazingMethod ----------------------------------------------------
  if (mode === 'grazingMethod') {
    const model = decodeGrazing('grazingMethod', value) as GrazingMethodModel;
    const set = (patch: Partial<GrazingMethodModel>): void =>
      onChange(encodeGrazing('grazingMethod', { ...model, ...patch }));
    return (
      <div className={css.root} data-grazing-mode="grazingMethod">
        <div>
          <SectionEyebrow>Grazing method</SectionEyebrow>
          {GRAZING_METHODS.map((m) => {
            const selected = model.method === m.key;
            const disabled = !m.recommended;
            return (
              <button
                key={m.key}
                type="button"
                className={css.methodCard}
                data-selected={selected}
                data-disabled={disabled}
                aria-pressed={selected}
                disabled={disabled}
                onClick={() => {
                  if (!disabled) set({ method: m.key });
                }}
              >
                <span className={css.methodDot} aria-hidden="true" />
                <span className={css.methodBody}>
                  <span className={css.methodTitle}>
                    {m.title}
                    {selected ? (
                      <Check size={12} className={css.methodCheck} aria-hidden="true" />
                    ) : null}
                  </span>
                  <span className={css.methodDesc}>{m.desc}</span>
                </span>
              </button>
            );
          })}
        </div>
        <div className={css.field}>
          <span className={css.fieldLbl}>Rationale</span>
          <textarea
            className={`${css.textInput} ${css.textArea}`}
            value={model.rationale}
            aria-label="Rationale"
            placeholder="Best fit for this farm: existing paddocks, silvopasture integration, limited infrastructure investment needed. Reduces selective grazing and weed pressure vs. set-stocking. Compatible with tree establishment exclusion zones."
            onChange={(e) => set({ rationale: e.target.value })}
          />
        </div>
        <FeedsNote>
          The grazing method drives the <strong>paddock layout decision</strong>{' '}
          in item 2. Record the method and its rationale before defining the
          layout.
        </FeedsNote>
      </div>
    );
  }

  // -- P2: paddockLayout ----------------------------------------------------
  if (mode === 'paddockLayout') {
    const model = decodeGrazing('paddockLayout', value) as PaddockLayoutModel;
    const setPaddocks = (paddocks: PaddockInput[]): void =>
      onChange(encodeGrazing('paddockLayout', { ...model, paddocks }));
    const setMob = (mobSize: string): void =>
      onChange(encodeGrazing('paddockLayout', { ...model, mobSize }));
    return (
      <div className={css.root} data-grazing-mode="paddockLayout">
        <div>
          <SectionEyebrow>
            Paddock / cell register
            {model.paddocks.length > 0
              ? ` -- ${plural(model.paddocks.length, 'paddock', 'paddocks')}`
              : ''}
          </SectionEyebrow>
          <RegisterList<PaddockInput>
            items={model.paddocks}
            onChange={setPaddocks}
            makeEmpty={() => ({
              id: `grz-pad-${++_idCounter}`,
              name: '',
              areaHa: '',
              status: 'ok',
            })}
            addLabel="Add paddock"
            emptyHint="No paddocks yet. Add each paddock in the rotation with its effective area and access status."
            ariaLabel="Paddock register"
            renderRow={(pad, _index, update) => (
              <div className={css.fieldStack}>
                <div className={css.field}>
                  <span className={css.fieldLbl}>Paddock name</span>
                  <input
                    type="text"
                    className={css.textInput}
                    value={pad.name}
                    placeholder="South paddock"
                    aria-label="Paddock name"
                    onChange={(e) => update({ name: e.target.value })}
                  />
                </div>
                <AmountRow
                  label="Effective area"
                  value={pad.areaHa}
                  onChange={(v) => update({ areaHa: v })}
                  unit="ha"
                  placeholder="8.5"
                />
                <div className={css.field}>
                  <span className={css.fieldLbl}>Status</span>
                  <Dropdown
                    options={STATUS_LABELS.map((s) => s.label)}
                    value={
                      STATUS_LABEL_BY_VALUE.has(pad.status)
                        ? (STATUS_LABEL_BY_VALUE.get(pad.status) as string)
                        : ''
                    }
                    onChange={(label) => {
                      update({
                        status:
                          label !== ''
                            ? (STATUS_VALUE_BY_LABEL.get(label) ?? 'ok')
                            : 'ok',
                      });
                    }}
                    ariaLabel="Paddock status"
                  />
                </div>
              </div>
            )}
          />
        </div>
        <div className={css.fdiv} aria-hidden="true" />
        <AmountRow
          label="Target mob size per move"
          value={model.mobSize}
          onChange={setMob}
          unit="head"
          placeholder="100"
          inputMode="numeric"
        />
        <InterpretationBlock tone="info">
          Instantaneous stocking pressure during the short graze period is higher
          than the annual average; this is normal for rotational grazing -- short
          duration, high impact, full recovery.
        </InterpretationBlock>
        <FeedsNote>
          Paddock layout feeds the <strong>graze/rest period design</strong> in
          item 3 -- each paddock needs an adequate rest window per rotation.
        </FeedsNote>
      </div>
    );
  }

  // -- P3: grazeRest --------------------------------------------------------
  if (mode === 'grazeRest') {
    const model = decodeGrazing('grazeRest', value) as GrazeRestModel;
    const setSeason = (i: number, patch: Partial<SeasonTarget>): void => {
      const seasons = model.seasons.map((s, idx) => (idx === i ? { ...s, ...patch } : s));
      onChange(encodeGrazing('grazeRest', { kind: 'grazeRest', seasons }));
    };
    return (
      <div className={css.root} data-grazing-mode="grazeRest">
        <InterpretationBlock tone="info">
          <ArrowLeft size={10} aria-hidden="true" /> Feed gap months (Jan-Mar)
          from: forage carrying capacity survey (Tier 2)
        </InterpretationBlock>
        <div>
          <SectionEyebrow>Seasonal graze/rest targets</SectionEyebrow>
          {GRAZING_SEASONS.map((season, i) => {
            const s = model.seasons[i] ?? { grazePeriod: '', restPeriod: '', indicator: '' };
            return (
              <div
                key={season.key}
                className={css.seasonCard}
                data-feedgap={season.feedGap}
              >
                <div className={css.seasonHead}>
                  <span className={css.seasonBadge} data-feedgap={season.feedGap}>
                    {season.badge}
                  </span>
                </div>
                {season.feedGap ? (
                  <div className={css.feedGapNote}>{season.defaultIndicator}</div>
                ) : (
                  <>
                    <div className={css.seasonPeriods}>
                      <AmountRow
                        label="Graze period"
                        id={`grz-graze-${season.key}`}
                        value={s.grazePeriod}
                        onChange={(v) => setSeason(i, { grazePeriod: v })}
                        placeholder={season.defaultGraze}
                        inputMode="decimal"
                      />
                      <AmountRow
                        label="Rest period"
                        id={`grz-rest-${season.key}`}
                        value={s.restPeriod}
                        onChange={(v) => setSeason(i, { restPeriod: v })}
                        placeholder={season.defaultRest}
                        inputMode="decimal"
                      />
                    </div>
                    <div className={css.field}>
                      <span className={css.fieldLbl}>Recovery indicator -- move when</span>
                      <textarea
                        className={`${css.textInput} ${css.textArea}`}
                        value={s.indicator}
                        aria-label="Recovery indicator"
                        placeholder={season.defaultIndicator}
                        onChange={(e) => setSeason(i, { indicator: e.target.value })}
                      />
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
        <InterpretationBlock tone="info">
          Key principle: the recovery indicator, not the calendar, triggers the
          move. A paddock that hasn't reached 20cm regrowth after 9 weeks stays
          resting -- moving animals onto under-recovered pasture compounds the
          damage.
        </InterpretationBlock>
        <FeedsNote>
          Seasonal graze/rest targets become{' '}
          <strong>Observe-stage monitoring records</strong>: pasture height,
          recovery state, and move dates are recorded each rotation.
        </FeedsNote>
      </div>
    );
  }

  // -- P4: treeProtection ---------------------------------------------------
  if (mode === 'treeProtection') {
    const model = decodeGrazing('treeProtection', value) as TreeProtectionModel;
    const setNote = (i: number, note: string): void => {
      const stageNotes = model.stageNotes.slice();
      stageNotes[i] = note;
      onChange(encodeGrazing('treeProtection', { kind: 'treeProtection', stageNotes }));
    };
    return (
      <div className={css.root} data-grazing-mode="treeProtection">
        <div>
          <SectionEyebrow>Tree-protection stages</SectionEyebrow>
          {TREE_STAGES.map((stage, i) => (
            <div key={stage.badge} className={css.stageCard}>
              <div className={css.stageHead}>
                <span className={css.stageBadge} data-tone={stage.tone}>
                  {stage.badge}
                </span>
                <span className={css.stageName}>{stage.name}</span>
                <span className={css.stageYears}>{stage.years}</span>
              </div>
              <div className={css.stageBody}>
                {stage.rules.map((rule, ri) => (
                  <div key={ri} className={css.stageRule} data-tone={stage.tone}>
                    <span className={css.stageRuleDot} aria-hidden="true" />
                    {rule}
                  </div>
                ))}
                <div className={`${css.field} ${css.stageNote}`}>
                  <span className={css.fieldLbl}>Site-specific adjustments</span>
                  <textarea
                    className={`${css.textInput} ${css.textArea}`}
                    value={model.stageNotes[i] ?? ''}
                    aria-label="Site-specific adjustments"
                    placeholder="Optional: note any site-specific adjustment to this stage's rules."
                    onChange={(e) => setNote(i, e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <FeedsNote>
          Stage transitions are recorded in the <strong>Observe layer</strong> --
          each year the tree stage register is updated as blocks progress through
          establishment.
        </FeedsNote>
      </div>
    );
  }

  // -- P5: contingency ------------------------------------------------------
  if (mode === 'contingency') {
    const model = decodeGrazing('contingency', value) as ContingencyModel;
    const setTier = (i: number, patch: Partial<ContingencyTierInput>): void => {
      const tiers = model.tiers.map((t, idx) => (idx === i ? { ...t, ...patch } : t));
      onChange(encodeGrazing('contingency', { kind: 'contingency', tiers }));
    };
    return (
      <div className={css.root} data-grazing-mode="contingency">
        <InterpretationBlock tone="info">
          <ArrowLeft size={10} aria-hidden="true" /> Feed gap months Jan-Mar from
          forage survey -- drought tiers cross-reference water strategy
        </InterpretationBlock>
        <div>
          <SectionEyebrow>Feed-gap contingency tiers</SectionEyebrow>
          {CONTINGENCY_TIERS.map((tier, i) => {
            const t = model.tiers[i] ?? { trigger: '', action: '' };
            return (
              <div key={tier.level} className={css.tierCard} data-tone={tier.tone}>
                <div className={css.tierHead}>
                  <span className={css.tierLevel} data-tone={tier.tone}>
                    {tier.level}
                  </span>
                  <span className={css.tierName}>{tier.name}</span>
                </div>
                <div className={css.tierFields}>
                  <div className={css.field}>
                    <span className={css.fieldLbl}>Trigger</span>
                    <textarea
                      className={`${css.textInput} ${css.textArea}`}
                      value={t.trigger}
                      aria-label="Trigger"
                      placeholder={tier.triggerPlaceholder}
                      onChange={(e) => setTier(i, { trigger: e.target.value })}
                    />
                  </div>
                  <div className={css.field}>
                    <span className={css.fieldLbl}>Action</span>
                    <textarea
                      className={`${css.textInput} ${css.textArea}`}
                      value={t.action}
                      aria-label="Action"
                      placeholder={tier.actionPlaceholder}
                      onChange={(e) => setTier(i, { action: e.target.value })}
                    />
                  </div>
                </div>
                {tier.waterXref !== '' ? (
                  <div className={css.tierRef}>{tier.waterXref}</div>
                ) : null}
              </div>
            );
          })}
        </div>
        <FeedsNote>
          Contingency tiers become{' '}
          <strong>Observe-layer monitoring thresholds</strong>. Dam level,
          pasture condition score, and ewe body condition trigger tier
          notifications when thresholds are crossed.
        </FeedsNote>
      </div>
    );
  }

  // -- P6: stockingDensity (advisory) ---------------------------------------
  const model = decodeGrazing('stockingDensity', value) as StockingDensityModel;
  const setFlock = (flock: FlockClassInput[]): void =>
    onChange(encodeGrazing('stockingDensity', { kind: 'stockingDensity', flock }));
  const totalDse = model.flock.reduce(
    (sum, f) => sum + num(f.head, 0) * num(f.dsePerHead, 0),
    0,
  );
  return (
    <div className={css.root} data-grazing-mode="stockingDensity">
      <div className={css.densityRef}>
        <ArrowLeft size={10} aria-hidden="true" /> Survey data from forage
        carrying capacity assessment (Tier 2)
      </div>
      <div>
        <SectionEyebrow>Designed flock breakdown</SectionEyebrow>
        <RegisterList<FlockClassInput>
          items={model.flock}
          onChange={setFlock}
          makeEmpty={() => ({
            id: `grz-flk-${++_idCounter}`,
            label: '',
            head: '',
            dsePerHead: '',
          })}
          addLabel="Add flock class"
          emptyHint="No designed flock yet. Add each class (base flock, rams, replacements) with head count and DSE per head."
          ariaLabel="Designed flock breakdown"
          renderRow={(f, _index, update) => (
            <div className={css.fieldStack}>
              <div className={css.field}>
                <span className={css.fieldLbl}>Class</span>
                <input
                  type="text"
                  className={css.textInput}
                  value={f.label}
                  placeholder="Base flock"
                  aria-label="Flock class label"
                  onChange={(e) => update({ label: e.target.value })}
                />
              </div>
              <AmountRow
                label="Head"
                value={f.head}
                onChange={(v) => update({ head: v })}
                unit="head"
                placeholder="100"
                inputMode="numeric"
              />
              <AmountRow
                label="DSE per head"
                value={f.dsePerHead}
                onChange={(v) => update({ dsePerHead: v })}
                unit="DSE"
                placeholder="1.0"
              />
            </div>
          )}
        />
      </div>
      <div className={css.densityRef} data-testid="grazing-designed-dse-total">
        Total designed DSE: {Math.round(totalDse * 10) / 10} DSE
      </div>
      <InterpretationBlock tone="info">
        The on-screen designed-DSE total is a conservative working aid. OLOS
        computes the authoritative stocking-density check from the surveyed
        paddocks (Tier 2 forage survey) independently.
      </InterpretationBlock>
      <FeedsNote>
        This designed breakdown is an advisory working aid. The capacity gate is
        confirmed by the <strong>paddock stocking-density check</strong>, which
        runs against the surveyed Tier 2 figures.
      </FeedsNote>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared sub-component
// ---------------------------------------------------------------------------

function FeedsNote({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className={css.feedsBlock}>
      <ArrowRight size={13} className={css.feedsIcon} aria-hidden="true" />
      <div className={css.feedsTxt}>{children}</div>
    </div>
  );
}

export default GrazingSystemCapture;
