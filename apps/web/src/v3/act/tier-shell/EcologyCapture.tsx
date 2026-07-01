/**
 * EcologyCapture -- a multi-mode CONTROLLED capture for objective s2-ecology
 * (Stratum 2, "Existing Ecology & Habitat"). Rebuilt from
 * olos_ecology_habitat_act.html (the OLOS Act-view decision workbench). The
 * left rail order == catalogue item order:
 *
 *   c1     -> vegetation    (draw-on-map community survey; see note below)
 *   c2     -> species       (native-category checklist + invasive register + SAR)
 *   c3     -> corridors     (feature + nesting checklists + 4-step quality score)
 *   c4     -> connectivity  (feature + barrier checklists + score + distance)
 *   c5     -> waterHabitat  (habitat checklist + 2 setback dropdowns + none toggle)
 *   orch-1 -> pollinator    (4 guild cards + 4-step provision score)
 *   orch-2 -> insectary     (bloom-window table + nesting checklist + bed dropdown)
 *
 * Structure mirrors TerrainCapture / ClimateCapture (the canonical multi-mode
 * captures): an `ecologyModeFor(itemId)` mapper plus a single component that
 * renders ONE mode body. The panel chrome (header / eyebrow / title / hint /
 * feeds / gate-note / Record-Defer footer) is owned by DecisionWorkingPanel --
 * this capture renders ONLY the mode body blocks.
 *
 * SCOPE: c1-c5 are UNIVERSAL (U-S2.3). pollinator (orch-1) and insectary
 * (orch-2) are injected into THIS objective by the orchard / food-forest type
 * patch (ORCH>U-S2.3) -- so they are part of this capture, rendered only when
 * the project carries the orchard type.
 *
 * CONTENT is region-NEUTRAL by operator decision: the mockup's controls
 * (checklists, score chips, guild cards, bloom table, dropdowns) are reproduced
 * but vocabulary is generic -- no region-specific weed names, species-at-risk
 * lists, fixed setback metres, or named bloom months. The c1 vegetation survey
 * intentionally diverges from the mockup's zone-form: it is drawn on the map
 * (see VegetationSurveyPanel) and left unchanged here.
 *
 * Each mode persists its OWN keys in the per-item flat FormValue
 * (Record<string, string | string[]>). decode is TOTAL/defensive (non-array ->
 * empty; per-entry try/catch parse for the invasive register; unknown checklist
 * keys / out-of-range scores / unknown dropdown values coerced to empty; NEVER
 * fabricate seed data -- empty FormValue yields an empty model).
 *
 * CONTROLLED / pure: the model is always derived from decode(value) each render;
 * the full next model is emitted via onChange(encode(next)). Stable per-entry
 * ids (invasive rows) are minted by makeRowId() in EVENT HANDLERS ONLY (never in
 * decode/render) and used as React keys (never index).
 *
 * ASCII-only: em-dash -> " -- "; all icons are lucide. Apostrophes use
 * double-quoted strings.
 */

import * as React from 'react';
import { ArrowRight, Check, Plus, X } from 'lucide-react';
import type { FormValue } from './actToolCatalog.js';
import css from './EcologyCapture.module.css';

// ---------------------------------------------------------------------------
// Mode mapper
// ---------------------------------------------------------------------------

export type EcologyMode =
  | 'vegetation'
  | 'species'
  | 'corridors'
  | 'connectivity'
  | 'waterHabitat'
  | 'pollinator'
  | 'insectary';

export function ecologyModeFor(itemId: string): EcologyMode | null {
  switch (itemId) {
    case 's2-ecology-c1':
      return 'vegetation';
    case 's2-ecology-c2':
      return 'species';
    case 's2-ecology-c3':
      return 'corridors';
    case 's2-ecology-c4':
      return 'connectivity';
    case 's2-ecology-c5':
      return 'waterHabitat';
    case 's2-ecology-orch-1':
      return 'pollinator';
    case 's2-ecology-orch-2':
      return 'insectary';
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Stable id factory (invasive register rows). Module-scoped, pure -- no
// import-time side-effects; CALLED ONLY IN EVENT HANDLERS.
// ---------------------------------------------------------------------------

function makeRowId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'eco-' + Math.random().toString(36).slice(2, 10);
}

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

export interface VegetationModel {
  kind: 'vegetation';
  /** keyed by community key -> percent-of-site string. Presence of the key
   * means the community is ticked. */
  communities: Record<string, string>;
}

export type InvasivePriority = 'high' | 'mod' | 'low';

export interface InvasiveSpecies {
  id: string;
  name: string;
  scientific: string;
  priority: InvasivePriority;
  distribution: string;
}

export interface SpeciesModel {
  kind: 'species';
  /** keys from NATIVE_CATEGORIES that are ticked */
  nativeCats: string[];
  /** operator-grown invasive watchlist (region-neutral -- they name their own) */
  invasives: InvasiveSpecies[];
  /** SAR_OPTIONS value, or '' when not assessed */
  sar: string;
}

export interface CorridorsModel {
  kind: 'corridors';
  /** keys from CORRIDOR_FEATURES */
  corridorTypes: string[];
  /** keys from NESTING_OBSERVED */
  nesting: string[];
  /** '' | '1'..'4' (CORRIDOR_SCORES) */
  score: string;
}

export interface ConnectivityModel {
  kind: 'connectivity';
  /** keys from CONN_FEATURES */
  features: string[];
  /** keys from CONN_BARRIERS */
  barriers: string[];
  /** '' | '1'..'4' (CONN_SCORES) */
  score: string;
  /** CONN_DISTANCE value, or '' */
  distance: string;
}

export interface WaterHabitatModel {
  kind: 'waterHabitat';
  /** keys from WATER_HABITATS */
  habitats: string[];
  /** SETBACK_COND value, or '' */
  setbackCond: string;
  /** SETBACK_TARGET value, or '' */
  setbackTarget: string;
  nonePresent: boolean;
}

export interface PollinatorModel {
  kind: 'pollinator';
  honeybee: string;
  bumbleSpecies: string;
  bumbleAbund: string;
  solitaryGround: string;
  solitaryMason: string;
  hoverfly: string;
  /** '' | '1'..'4' (POLL_SCORES) */
  score: string;
}

export interface InsectaryModel {
  kind: 'insectary';
  bloomEarly: string;
  bloomMid: string;
  bloomLate: string;
  bloomGaps: string;
  /** keys from INSECTARY_NESTING */
  nesting: string[];
  /** INSECTARY_BED value, or '' */
  bed: string;
}

export type EcologyModel =
  | VegetationModel
  | SpeciesModel
  | CorridorsModel
  | ConnectivityModel
  | WaterHabitatModel
  | PollinatorModel
  | InsectaryModel;

// ---------------------------------------------------------------------------
// Domain data (region-neutral structures ported from the mockup right panels)
// ---------------------------------------------------------------------------

interface CheckSpec {
  key: string;
  label: string;
  sub?: string;
}
interface OptionSpec {
  value: string;
  label: string;
}
interface ScoreSpec {
  score: string;
  label: string;
}

export interface CommunitySpec {
  key: string;
  label: string;
}
// Single source of truth for the 7 vegetation community keys + labels. Exported
// so the draw-on-map survey (vegetationSurveyStore / VegetationSurveyPanel /
// VegetationSurveyLayer) reuses the exact same keys + labels rather than
// duplicating them. The c1 survey is drawn on the map (% auto-computed from
// polygon acreage); this list still defines the canonical taxonomy.
export const VEG_COMMUNITIES: readonly CommunitySpec[] = [
  { key: 'cleared', label: 'Cleared / Improved pasture' },
  { key: 'native-grass', label: 'Native grassland / Natural pasture' },
  { key: 'grassy-woodland', label: 'Grassy woodland / Scattered trees' },
  { key: 'riparian', label: 'Riparian / Streamside vegetation' },
  { key: 'dense-woodland', label: 'Dense woodland / Closed canopy' },
  { key: 'shrubland', label: 'Shrubland / Heath' },
  { key: 'wetland', label: 'Wetland / Swamp' },
];
const VEG_COMMUNITY_KEYS = new Set(VEG_COMMUNITIES.map((c) => c.key));

// --- species (c2) ---
const NATIVE_CATEGORIES: readonly CheckSpec[] = [
  { key: 'canopy', label: 'Native canopy trees' },
  { key: 'shrub', label: 'Native shrubs / hedgerow' },
  { key: 'grass', label: 'Native grasses & sedges' },
  { key: 'wildflower', label: 'Native wildflowers / forbs' },
  { key: 'riparian', label: 'Riparian / wetland-edge species' },
];
const NATIVE_CATEGORY_KEYS = new Set(NATIVE_CATEGORIES.map((c) => c.key));

const SAR_OPTIONS: readonly OptionSpec[] = [
  { value: '', label: 'Not assessed' },
  { value: 'none', label: 'None observed' },
  { value: 'yes', label: 'Yes -- professional survey required' },
  { value: 'uncertain', label: 'Uncertain -- further survey recommended' },
];

interface PrioritySpec {
  id: InvasivePriority;
  label: string;
}
const INVASIVE_PRIORITIES: readonly PrioritySpec[] = [
  { id: 'high', label: 'High' },
  { id: 'mod', label: 'Moderate' },
  { id: 'low', label: 'Low' },
];
const INVASIVE_PRIORITY_SET = new Set<string>(
  INVASIVE_PRIORITIES.map((p) => p.id),
);
const INVASIVE_PRIORITY_LABEL: Record<string, string> = Object.fromEntries(
  INVASIVE_PRIORITIES.map((p) => [p.id, p.label]),
);

// --- corridors (c3) ---
const CORRIDOR_FEATURES: readonly CheckSpec[] = [
  { key: 'watercourse', label: 'Watercourse corridor' },
  { key: 'hedgerow', label: 'Hedgerow / fenceline to adjacent land' },
  { key: 'woodland-edge', label: 'Woodland edge / treeline on or near boundary' },
  { key: 'grassland-route', label: 'Open grassland movement route' },
];
const CORRIDOR_FEATURE_KEYS = new Set(CORRIDOR_FEATURES.map((c) => c.key));

const NESTING_OBSERVED: readonly CheckSpec[] = [
  { key: 'dense-shrub', label: 'Dense hedgerow / shrub' },
  { key: 'tree-cavities', label: 'Mature trees with cavities' },
  { key: 'bare-banks', label: 'Bare south-facing soil banks', sub: 'ground-nesting bees' },
  { key: 'deadwood', label: 'Deadwood / hollow stems / standing dead trees' },
  { key: 'riparian-margin', label: 'Riparian margin', sub: 'waterfowl / amphibian' },
];
const NESTING_OBSERVED_KEYS = new Set(NESTING_OBSERVED.map((n) => n.key));

const CORRIDOR_SCORES: readonly ScoreSpec[] = [
  { score: '1', label: 'Broken' },
  { score: '2', label: 'Fragmented' },
  { score: '3', label: 'Functional' },
  { score: '4', label: 'High quality' },
];

// --- connectivity (c4) ---
const CONN_FEATURES: readonly CheckSpec[] = [
  { key: 'hedgerow-network', label: 'Continuous hedgerow to neighbours' },
  { key: 'riparian-extends', label: 'Riparian corridor extends past boundary both ways' },
  { key: 'woodland-block', label: 'Woodland block within ~500 m', sub: 'colonisation source' },
  { key: 'low-intensity', label: 'Adjacent land is low-intensity / natural' },
];
const CONN_FEATURE_KEYS = new Set(CONN_FEATURES.map((c) => c.key));

const CONN_BARRIERS: readonly CheckSpec[] = [
  { key: 'road', label: 'Road / highway movement break' },
  { key: 'intensive-ag', label: 'Intensive agriculture on boundary' },
  { key: 'fencing', label: 'Dense impermeable fencing' },
];
const CONN_BARRIER_KEYS = new Set(CONN_BARRIERS.map((b) => b.key));

const CONN_SCORES: readonly ScoreSpec[] = [
  { score: '1', label: 'Isolated' },
  { score: '2', label: 'Partial' },
  { score: '3', label: 'Connected' },
  { score: '4', label: 'Well connected' },
];
const CONN_SCORE_TITLE: Record<string, string> = Object.fromEntries(
  CONN_SCORES.map((s) => [s.score, s.label]),
);

const CONN_DISTANCE: readonly OptionSpec[] = [
  { value: '', label: 'Not assessed' },
  { value: 'lt100', label: 'Less than 100 m' },
  { value: '100-500', label: '100 -- 500 m' },
  { value: '500-1000', label: '500 m -- 1 km' },
  { value: 'gt1000', label: 'More than 1 km' },
];

// --- waterHabitat (c5) ---
const WATER_HABITATS: readonly CheckSpec[] = [
  { key: 'watercourse', label: 'Watercourse' },
  { key: 'riparian-margin', label: 'Riparian margin', sub: 'native bank vegetation' },
  { key: 'wet-meadow', label: 'Wet meadow / seasonally wet area' },
  { key: 'seep', label: 'Seep / groundwater discharge' },
  { key: 'ephemeral-pool', label: 'Ephemeral pool', sub: 'wet season only' },
];
const WATER_HABITAT_KEYS = new Set(WATER_HABITATS.map((w) => w.key));

const SETBACK_COND: readonly OptionSpec[] = [
  { value: '', label: 'Not assessed' },
  { value: 'degraded', label: 'Degraded' },
  { value: 'mixed', label: 'Mixed' },
  { value: 'good', label: 'Good' },
  { value: 'excellent', label: 'Excellent' },
];

const SETBACK_TARGET: readonly OptionSpec[] = [
  { value: '', label: 'Not assessed' },
  { value: 'planting', label: 'Native riparian planting' },
  { value: 'succession', label: 'Natural succession' },
  { value: 'none', label: 'No intervention' },
];

// --- pollinator (orch-1) ---
const POLL_HONEYBEE: readonly OptionSpec[] = [
  { value: '', label: 'Not assessed' },
  { value: 'absent', label: 'Absent' },
  { value: 'feral', label: 'Present -- feral or unknown' },
  { value: 'managed', label: 'Present -- managed hives nearby' },
];
const POLL_BUMBLE_SPECIES: readonly OptionSpec[] = [
  { value: '', label: 'Not assessed' },
  { value: 'none', label: 'None observed' },
  { value: '1', label: '1 species' },
  { value: '2-3', label: '2 -- 3 species' },
  { value: '4+', label: '4+ species' },
];
const POLL_BUMBLE_ABUND: readonly OptionSpec[] = [
  { value: '', label: 'Not assessed' },
  { value: 'rare', label: 'Rare' },
  { value: 'frequent', label: 'Frequent' },
  { value: 'abundant', label: 'Abundant' },
];
const POLL_SOLITARY_GROUND: readonly OptionSpec[] = [
  { value: '', label: 'Not assessed' },
  { value: 'none', label: 'None observed' },
  { value: 'present', label: 'Present -- bare-soil nesting' },
  { value: 'abundant', label: 'Abundant' },
];
const POLL_SOLITARY_MASON: readonly OptionSpec[] = [
  { value: '', label: 'Not assessed' },
  { value: 'none', label: 'None observed' },
  { value: 'present', label: 'Present' },
  { value: 'abundant', label: 'Abundant -- good habitat' },
];
const POLL_HOVERFLY: readonly OptionSpec[] = [
  { value: '', label: 'Not assessed' },
  { value: 'none', label: 'None observed' },
  { value: 'occasional', label: 'Occasional' },
  { value: 'frequent', label: 'Frequent' },
];
const POLL_SCORES: readonly ScoreSpec[] = [
  { score: '1', label: 'Very low' },
  { score: '2', label: 'Low' },
  { score: '3', label: 'Adequate' },
  { score: '4', label: 'Good' },
];
const POLL_SCORE_TITLE: Record<string, string> = Object.fromEntries(
  POLL_SCORES.map((s) => [s.score, s.label]),
);

// --- insectary (orch-2) ---
interface BloomWindowSpec {
  key: 'early' | 'mid' | 'late' | 'gaps';
  window: string;
  crops: string;
}
const BLOOM_WINDOWS: readonly BloomWindowSpec[] = [
  { key: 'early', window: 'Early', crops: 'Early-flowering crops' },
  { key: 'mid', window: 'Mid', crops: 'Mid-season crops' },
  { key: 'late', window: 'Late', crops: 'Late-flowering crops' },
  { key: 'gaps', window: 'Gaps', crops: 'Post-bloom -- colony provisioning' },
];
const BLOOM_SUPPORT: readonly OptionSpec[] = [
  { value: '', label: 'Not yet planned' },
  { value: 'early-pollen', label: 'Native early-pollen shrubs' },
  { value: 'understory', label: 'Native flowering understory shrubs' },
  { value: 'wildflower', label: 'Mixed native wildflower sward' },
  { value: 'composites', label: 'Late-season native composites' },
  { value: 'annual-strip', label: 'Annual insectary strip' },
];

const INSECTARY_NESTING: readonly CheckSpec[] = [
  { key: 'bare-bank', label: 'Bare south-facing soil bank', sub: 'ground-nesting' },
  { key: 'stem-bundle', label: 'Hollow-stem bundle / insect hotel', sub: 'stem nesters' },
  { key: 'deadwood', label: 'Standing deadwood retained', sub: 'cavity nesters' },
  { key: 'hive', label: 'Managed bee hive on site', sub: 'planned' },
];
const INSECTARY_NESTING_KEYS = new Set(INSECTARY_NESTING.map((n) => n.key));

const INSECTARY_BED: readonly OptionSpec[] = [
  { value: '', label: 'Not planned' },
  { value: 'integrated', label: 'Yes -- integrated into productive understory' },
  { value: 'dedicated', label: 'Yes -- separate dedicated bed' },
  { value: 'strips', label: 'No -- wildflower strips only' },
];

// ---------------------------------------------------------------------------
// FormValue coercion helpers
// ---------------------------------------------------------------------------

function asArr(v: FormValue[string] | undefined): string[] {
  return Array.isArray(v) ? v : [];
}
function asStr(v: FormValue[string] | undefined): string {
  return typeof v === 'string' ? v : '';
}
function asScore(v: FormValue[string] | undefined): string {
  const s = asStr(v);
  return s === '1' || s === '2' || s === '3' || s === '4' ? s : '';
}
function valueSet(opts: readonly OptionSpec[]): Set<string> {
  return new Set(opts.filter((o) => o.value !== '').map((o) => o.value));
}
function asOneOf(v: FormValue[string] | undefined, set: Set<string>): string {
  const s = asStr(v);
  return set.has(s) ? s : '';
}

const SAR_VALUES = valueSet(SAR_OPTIONS);
const CONN_DISTANCE_VALUES = valueSet(CONN_DISTANCE);
const SETBACK_COND_VALUES = valueSet(SETBACK_COND);
const SETBACK_TARGET_VALUES = valueSet(SETBACK_TARGET);
const POLL_HONEYBEE_VALUES = valueSet(POLL_HONEYBEE);
const POLL_BUMBLE_SPECIES_VALUES = valueSet(POLL_BUMBLE_SPECIES);
const POLL_BUMBLE_ABUND_VALUES = valueSet(POLL_BUMBLE_ABUND);
const POLL_SOLITARY_GROUND_VALUES = valueSet(POLL_SOLITARY_GROUND);
const POLL_SOLITARY_MASON_VALUES = valueSet(POLL_SOLITARY_MASON);
const POLL_HOVERFLY_VALUES = valueSet(POLL_HOVERFLY);
const BLOOM_SUPPORT_VALUES = valueSet(BLOOM_SUPPORT);
const INSECTARY_BED_VALUES = valueSet(INSECTARY_BED);

// ---------------------------------------------------------------------------
// decode: FormValue -> EcologyModel (TOTAL / defensive; never throws, never
// fabricates seed data).
// ---------------------------------------------------------------------------

function decodeInvasives(value: FormValue): InvasiveSpecies[] {
  const invasives: InvasiveSpecies[] = [];
  let iIndex = 0;
  for (const entry of asArr(value.ecologyInvasives)) {
    if (typeof entry !== 'string') {
      iIndex++;
      continue;
    }
    try {
      const parsed: unknown = JSON.parse(entry);
      if (parsed === null || typeof parsed !== 'object') {
        iIndex++;
        continue;
      }
      const p = parsed as {
        id?: unknown;
        name?: unknown;
        scientific?: unknown;
        priority?: unknown;
        distribution?: unknown;
      };
      const priority =
        typeof p.priority === 'string' && INVASIVE_PRIORITY_SET.has(p.priority)
          ? (p.priority as InvasivePriority)
          : 'mod';
      const id =
        typeof p.id === 'string' && p.id !== ''
          ? p.id
          : 'legacy-invasive-' + iIndex;
      invasives.push({
        id,
        name: typeof p.name === 'string' ? p.name : '',
        scientific: typeof p.scientific === 'string' ? p.scientific : '',
        priority,
        distribution: typeof p.distribution === 'string' ? p.distribution : '',
      });
    } catch {
      // drop malformed entry
    }
    iIndex++;
  }
  return invasives;
}

export function decodeEcology(mode: EcologyMode, value: FormValue): EcologyModel {
  switch (mode) {
    case 'vegetation': {
      const communities: Record<string, string> = {};
      for (const entry of asArr(value.ecologyCommunities)) {
        if (typeof entry !== 'string') continue;
        const sep = entry.indexOf('::');
        if (sep <= 0) continue;
        const key = entry.slice(0, sep);
        const pct = entry.slice(sep + 2);
        if (!VEG_COMMUNITY_KEYS.has(key)) continue;
        communities[key] = pct;
      }
      return { kind: 'vegetation', communities };
    }
    case 'species': {
      const nativeCats = asArr(value.ecologyNativeCats).filter((c) =>
        NATIVE_CATEGORY_KEYS.has(c),
      );
      return {
        kind: 'species',
        nativeCats,
        invasives: decodeInvasives(value),
        sar: asOneOf(value.ecologySar, SAR_VALUES),
      };
    }
    case 'corridors': {
      const corridorTypes = asArr(value.ecologyCorridorTypes).filter((c) =>
        CORRIDOR_FEATURE_KEYS.has(c),
      );
      const nesting = asArr(value.ecologyNesting).filter((n) =>
        NESTING_OBSERVED_KEYS.has(n),
      );
      return {
        kind: 'corridors',
        corridorTypes,
        nesting,
        score: asScore(value.ecologyCorridorScore),
      };
    }
    case 'connectivity': {
      const features = asArr(value.ecologyConnFeatures).filter((c) =>
        CONN_FEATURE_KEYS.has(c),
      );
      const barriers = asArr(value.ecologyConnBarriers).filter((b) =>
        CONN_BARRIER_KEYS.has(b),
      );
      return {
        kind: 'connectivity',
        features,
        barriers,
        score: asScore(value.ecologyConnScore),
        distance: asOneOf(value.ecologyConnDistance, CONN_DISTANCE_VALUES),
      };
    }
    case 'waterHabitat': {
      const habitats = asArr(value.ecologyWaterHabitats).filter((h) =>
        WATER_HABITAT_KEYS.has(h),
      );
      return {
        kind: 'waterHabitat',
        habitats,
        setbackCond: asOneOf(value.ecologyWaterSetbackCond, SETBACK_COND_VALUES),
        setbackTarget: asOneOf(
          value.ecologyWaterSetbackTarget,
          SETBACK_TARGET_VALUES,
        ),
        nonePresent: asStr(value.ecologyWaterNone) === 'true',
      };
    }
    case 'pollinator': {
      return {
        kind: 'pollinator',
        honeybee: asOneOf(value.ecologyPollHoneybee, POLL_HONEYBEE_VALUES),
        bumbleSpecies: asOneOf(
          value.ecologyPollBumbleSpecies,
          POLL_BUMBLE_SPECIES_VALUES,
        ),
        bumbleAbund: asOneOf(
          value.ecologyPollBumbleAbund,
          POLL_BUMBLE_ABUND_VALUES,
        ),
        solitaryGround: asOneOf(
          value.ecologyPollSolitaryGround,
          POLL_SOLITARY_GROUND_VALUES,
        ),
        solitaryMason: asOneOf(
          value.ecologyPollSolitaryMason,
          POLL_SOLITARY_MASON_VALUES,
        ),
        hoverfly: asOneOf(value.ecologyPollHoverfly, POLL_HOVERFLY_VALUES),
        score: asScore(value.ecologyPollScore),
      };
    }
    case 'insectary': {
      const nesting = asArr(value.ecologyInsectaryNesting).filter((n) =>
        INSECTARY_NESTING_KEYS.has(n),
      );
      return {
        kind: 'insectary',
        bloomEarly: asOneOf(value.ecologyBloomEarly, BLOOM_SUPPORT_VALUES),
        bloomMid: asOneOf(value.ecologyBloomMid, BLOOM_SUPPORT_VALUES),
        bloomLate: asOneOf(value.ecologyBloomLate, BLOOM_SUPPORT_VALUES),
        bloomGaps: asOneOf(value.ecologyBloomGaps, BLOOM_SUPPORT_VALUES),
        nesting,
        bed: asOneOf(value.ecologyInsectaryBed, INSECTARY_BED_VALUES),
      };
    }
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown EcologyMode: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// encode: EcologyModel -> FormValue (lossless inverse of decode).
// ---------------------------------------------------------------------------

export function encodeEcology(model: EcologyModel): FormValue {
  switch (model.kind) {
    case 'vegetation':
      return {
        ecologyCommunities: Object.entries(model.communities).map(
          ([k, v]) => `${k}::${v}`,
        ),
      };
    case 'species':
      return {
        ecologyNativeCats: [...model.nativeCats],
        ecologyInvasives: model.invasives.map((i) => JSON.stringify(i)),
        ecologySar: model.sar,
      };
    case 'corridors':
      return {
        ecologyCorridorTypes: [...model.corridorTypes],
        ecologyNesting: [...model.nesting],
        ecologyCorridorScore: model.score,
      };
    case 'connectivity':
      return {
        ecologyConnFeatures: [...model.features],
        ecologyConnBarriers: [...model.barriers],
        ecologyConnScore: model.score,
        ecologyConnDistance: model.distance,
      };
    case 'waterHabitat':
      return {
        ecologyWaterHabitats: [...model.habitats],
        ecologyWaterSetbackCond: model.setbackCond,
        ecologyWaterSetbackTarget: model.setbackTarget,
        ecologyWaterNone: model.nonePresent ? 'true' : 'false',
      };
    case 'pollinator':
      return {
        ecologyPollHoneybee: model.honeybee,
        ecologyPollBumbleSpecies: model.bumbleSpecies,
        ecologyPollBumbleAbund: model.bumbleAbund,
        ecologyPollSolitaryGround: model.solitaryGround,
        ecologyPollSolitaryMason: model.solitaryMason,
        ecologyPollHoverfly: model.hoverfly,
        ecologyPollScore: model.score,
      };
    case 'insectary':
      return {
        ecologyBloomEarly: model.bloomEarly,
        ecologyBloomMid: model.bloomMid,
        ecologyBloomLate: model.bloomLate,
        ecologyBloomGaps: model.bloomGaps,
        ecologyInsectaryNesting: [...model.nesting],
        ecologyInsectaryBed: model.bed,
      };
  }
}

// ---------------------------------------------------------------------------
// validity gates (per mode)
// ---------------------------------------------------------------------------

export function isEcologyValid(model: EcologyModel): boolean {
  switch (model.kind) {
    case 'vegetation':
      return Object.keys(model.communities).length >= 1;
    case 'species':
      return model.nativeCats.length + model.invasives.length >= 1;
    case 'corridors':
      return model.corridorTypes.length + model.nesting.length >= 1;
    case 'connectivity':
      return model.score !== '';
    case 'waterHabitat':
      return model.habitats.length >= 1 || model.nonePresent;
    case 'pollinator':
      return (
        model.score !== '' ||
        model.honeybee !== '' ||
        model.bumbleSpecies !== '' ||
        model.bumbleAbund !== '' ||
        model.solitaryGround !== '' ||
        model.solitaryMason !== '' ||
        model.hoverfly !== ''
      );
    case 'insectary':
      return (
        model.bloomEarly !== '' ||
        model.bloomMid !== '' ||
        model.bloomLate !== '' ||
        model.bloomGaps !== '' ||
        model.nesting.length >= 1 ||
        model.bed !== ''
      );
  }
}

// ---------------------------------------------------------------------------
// record-summary mirror (per mode)
// ---------------------------------------------------------------------------

export function summariseEcology(model: EcologyModel): string {
  switch (model.kind) {
    case 'vegetation': {
      const n = Object.keys(model.communities).length;
      return `${n} community type(s) recorded`;
    }
    case 'species': {
      const nat = model.nativeCats.length;
      const inv = model.invasives.length;
      return `${nat} native group(s), ${inv} invasive`;
    }
    case 'corridors': {
      const c = model.corridorTypes.length;
      const nst = model.nesting.length;
      return `${c} corridor(s), ${nst} nesting feature(s)`;
    }
    case 'connectivity': {
      return model.score
        ? CONN_SCORE_TITLE[model.score] ?? 'Classified'
        : 'No classification';
    }
    case 'waterHabitat': {
      if (model.habitats.length === 0 && model.nonePresent) {
        return 'No water-dependent areas present';
      }
      return `${model.habitats.length} water habitat(s)`;
    }
    case 'pollinator': {
      if (model.score) {
        return `Provision: ${POLL_SCORE_TITLE[model.score] ?? "rated"}`;
      }
      const guilds = [
        model.honeybee,
        model.bumbleSpecies,
        model.bumbleAbund,
        model.solitaryGround,
        model.solitaryMason,
        model.hoverfly,
      ].filter((g) => g !== '').length;
      return `${guilds} guild observation(s)`;
    }
    case 'insectary': {
      const planned = [
        model.bloomEarly,
        model.bloomMid,
        model.bloomLate,
        model.bloomGaps,
      ].filter((b) => b !== '').length;
      return `${planned} bloom window(s), ${model.nesting.length} nesting provision(s)`;
    }
  }
}

// ---------------------------------------------------------------------------
// Shared body subcomponents (region-neutral, ported from mockup controls)
// ---------------------------------------------------------------------------

function CheckRow({
  spec,
  on,
  tone,
  onToggle,
  testid,
}: {
  spec: CheckSpec;
  on: boolean;
  tone?: 'warn';
  onToggle: () => void;
  testid: string;
}): React.JSX.Element {
  return (
    <button
      type="button"
      className={css.ckItem}
      data-testid={testid}
      data-on={on ? 'true' : 'false'}
      data-tone={tone ?? 'on'}
      aria-pressed={on}
      onClick={onToggle}
    >
      <span className={css.ckBox} aria-hidden="true">
        {on ? <Check size={10} className={css.ckTick} /> : null}
      </span>
      <span className={css.ckBody}>
        <span className={css.ckName}>{spec.label}</span>
        {spec.sub ? <span className={css.ckSub}>{spec.sub}</span> : null}
      </span>
    </button>
  );
}

function ScoreChips({
  options,
  value,
  group,
  onPick,
}: {
  options: readonly ScoreSpec[];
  value: string;
  group: string;
  onPick: (score: string) => void;
}): React.JSX.Element {
  return (
    <div className={css.scoreRow} data-testid={`${group}-score`}>
      {options.map((o) => {
        const on = value === o.score;
        return (
          <button
            key={o.score}
            type="button"
            className={css.scoreChip}
            data-testid={`${group}-score-${o.score}`}
            data-score={o.score}
            data-on={on ? 'true' : 'false'}
            aria-pressed={on}
            onClick={() => onPick(on ? '' : o.score)}
          >
            <span className={css.scoreNum}>{o.score}</span>
            <span className={css.scoreLabel}>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function ObsNotice({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <div className={css.obsNotice}>{children}</div>;
}

function SelRow({
  label,
  value,
  options,
  testid,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly OptionSpec[];
  testid: string;
  onChange: (v: string) => void;
}): React.JSX.Element {
  return (
    <div className={css.row}>
      <span className={css.rowLbl}>{label}</span>
      <select
        className={css.sel}
        data-testid={testid}
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value || '__empty'} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function GuildCard({
  name,
  tone,
  testid,
  children,
}: {
  name: string;
  tone: string;
  testid: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className={css.guildCard} data-testid={testid}>
      <div className={css.gcHead}>
        <span className={css.gcIcon} data-tone={tone} aria-hidden="true" />
        <span className={css.gcName}>{name}</span>
      </div>
      <div className={css.gcRows}>{children}</div>
    </div>
  );
}

function GuildSel({
  label,
  value,
  options,
  testid,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly OptionSpec[];
  testid: string;
  onChange: (v: string) => void;
}): React.JSX.Element {
  return (
    <div className={css.gcRow}>
      <span className={css.gcLbl}>{label}</span>
      <select
        className={css.gcSel}
        data-testid={testid}
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value || '__empty'} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component (renders ONLY the body for the resolved mode).
// ---------------------------------------------------------------------------

export interface EcologyCaptureProps {
  mode: EcologyMode;
  value: FormValue;
  onChange: (next: FormValue) => void;
}

export function EcologyCapture({
  mode,
  value,
  onChange,
}: EcologyCaptureProps): React.JSX.Element {
  const model = decodeEcology(mode, value);
  const emit = (next: EcologyModel): void => onChange(encodeEcology(next));

  // ---------- vegetation (c1) ----------
  // Vegetation cover is surveyed by DRAWING community extents on the Act map
  // (VegetationSurveyPanel + VegetationSurveyDrawHost), with % of site computed
  // automatically from polygon acreage -- no manual toggle/percent entry here.
  // In the inline workbench, DecisionWorkingPanel routes vegetation mode to
  // <VegetationSurveySummary> (which owns the "Open map survey" action); this
  // branch is a read-only fallback display of whatever percentages have been
  // recorded, kept so the controlled component still renders for that mode.
  if (model.kind === 'vegetation') {
    const recorded = VEG_COMMUNITIES.filter((c) => c.key in model.communities);
    return (
      <div className={css.root} data-ecology-mode="vegetation">
        <div>
          <div className={css.secLbl}>
            Community types recorded{' '}
            <span className={css.secOptional}>-- % of site (drawn on map)</span>
          </div>
          {recorded.length === 0 ? (
            <div className={css.spEmpty} data-testid="veg-empty">
              No community extents drawn yet. Open the map survey to draw each
              community and have its percentage computed automatically.
            </div>
          ) : (
            <div className={css.vegList} data-testid="veg-list">
              {recorded.map((c) => {
                const pct = model.communities[c.key] ?? '';
                return (
                  <div key={c.key} className={css.vegRow} data-on="true">
                    <span className={css.vegName}>{c.label}</span>
                    <span className={css.vegUnit}>{pct === '' ? '0' : pct}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className={css.feedsBlock}>
          <ArrowRight size={13} className={css.feedsIcon} aria-hidden="true" />
          <div className={css.feedsTxt}>
            Vegetation communities feed <strong>Stratum 4: Zone allocation</strong>{' '}
            -- identifying where native vegetation should be retained, enhanced,
            or restored as a design priority.
          </div>
        </div>
      </div>
    );
  }

  // ---------- species (c2) ----------
  if (model.kind === 'species') {
    return <SpeciesBody model={model} onChange={emit} />;
  }

  // ---------- corridors (c3) ----------
  if (model.kind === 'corridors') {
    const toggleCorridor = (key: string): void =>
      emit({
        ...model,
        corridorTypes: model.corridorTypes.includes(key)
          ? model.corridorTypes.filter((c) => c !== key)
          : [...model.corridorTypes, key],
      });
    const toggleNesting = (key: string): void =>
      emit({
        ...model,
        nesting: model.nesting.includes(key)
          ? model.nesting.filter((n) => n !== key)
          : [...model.nesting, key],
      });
    const setScore = (s: string): void => emit({ ...model, score: s });

    return (
      <div className={css.root} data-ecology-mode="corridors">
        <ObsNotice>
          The watercourse setback area is typically the highest-value wildlife
          corridor on a site. Confirm corridor continuity in the field before
          designing crossings or plantings.
        </ObsNotice>

        <div>
          <div className={css.secLbl}>Corridor features present</div>
          <div className={css.ckGroup} data-testid="corridor-checks">
            {CORRIDOR_FEATURES.map((c) => (
              <CheckRow
                key={c.key}
                spec={c}
                on={model.corridorTypes.includes(c.key)}
                testid={`corridor-${c.key}`}
                onToggle={() => toggleCorridor(c.key)}
              />
            ))}
          </div>
        </div>

        <div>
          <div className={css.secLbl}>Nesting habitat observed</div>
          <div className={css.ckGroup} data-testid="nesting-checks">
            {NESTING_OBSERVED.map((n) => (
              <CheckRow
                key={n.key}
                spec={n}
                on={model.nesting.includes(n.key)}
                testid={`nesting-${n.key}`}
                onToggle={() => toggleNesting(n.key)}
              />
            ))}
          </div>
        </div>

        <div>
          <div className={css.secLbl}>Corridor quality</div>
          <ScoreChips
            options={CORRIDOR_SCORES}
            value={model.score}
            group="corridor"
            onPick={setScore}
          />
        </div>

        <div className={css.feedsBlock}>
          <ArrowRight size={13} className={css.feedsIcon} aria-hidden="true" />
          <div className={css.feedsTxt}>
            Corridors and nesting sites are protected zones in{' '}
            <strong>Stratum 4: Spatial framework</strong>. They constrain
            earthworks and planting design in Stratum 5.
          </div>
        </div>
      </div>
    );
  }

  // ---------- connectivity (c4) ----------
  if (model.kind === 'connectivity') {
    const toggleFeature = (key: string): void =>
      emit({
        ...model,
        features: model.features.includes(key)
          ? model.features.filter((c) => c !== key)
          : [...model.features, key],
      });
    const toggleBarrier = (key: string): void =>
      emit({
        ...model,
        barriers: model.barriers.includes(key)
          ? model.barriers.filter((b) => b !== key)
          : [...model.barriers, key],
      });
    const setScore = (s: string): void => emit({ ...model, score: s });
    const setDistance = (d: string): void => emit({ ...model, distance: d });

    return (
      <div className={css.root} data-ecology-mode="connectivity">
        <div>
          <div className={css.secLbl}>Connectivity features (adjacent landscape)</div>
          <div className={css.ckGroup} data-testid="conn-feature-checks">
            {CONN_FEATURES.map((c) => (
              <CheckRow
                key={c.key}
                spec={c}
                on={model.features.includes(c.key)}
                testid={`conn-feature-${c.key}`}
                onToggle={() => toggleFeature(c.key)}
              />
            ))}
          </div>
        </div>

        <div>
          <div className={css.secLbl}>Barriers to movement</div>
          <div className={css.ckGroup} data-testid="conn-barrier-checks">
            {CONN_BARRIERS.map((b) => (
              <CheckRow
                key={b.key}
                spec={b}
                tone="warn"
                on={model.barriers.includes(b.key)}
                testid={`conn-barrier-${b.key}`}
                onToggle={() => toggleBarrier(b.key)}
              />
            ))}
          </div>
        </div>

        <div>
          <div className={css.secLbl}>Connectivity score</div>
          <ScoreChips
            options={CONN_SCORES}
            value={model.score}
            group="conn"
            onPick={setScore}
          />
        </div>

        <SelRow
          label="Distance to nearest woodland / natural area"
          value={model.distance}
          options={CONN_DISTANCE}
          testid="conn-distance"
          onChange={setDistance}
        />

        <div className={css.feedsBlock}>
          <ArrowRight size={13} className={css.feedsIcon} aria-hidden="true" />
          <div className={css.feedsTxt}>
            Connectivity classification feeds{' '}
            <strong>Stratum 4: Revegetation strategy</strong> and determines how
            ambitiously ecological targets can be set.
          </div>
        </div>
      </div>
    );
  }

  // ---------- waterHabitat (c5) ----------
  if (model.kind === 'waterHabitat') {
    const toggleHabitat = (key: string): void =>
      emit({
        ...model,
        nonePresent: false,
        habitats: model.habitats.includes(key)
          ? model.habitats.filter((h) => h !== key)
          : [...model.habitats, key],
      });
    const setCond = (v: string): void => emit({ ...model, setbackCond: v });
    const setTarget = (v: string): void => emit({ ...model, setbackTarget: v });
    const toggleNone = (): void =>
      emit({
        ...model,
        nonePresent: !model.nonePresent,
        habitats: !model.nonePresent ? [] : model.habitats,
      });

    return (
      <div className={css.root} data-ecology-mode="waterHabitat">
        <ObsNotice>
          Visit in the wet season where possible. The watercourse setback is a
          protected zone -- document its ecological character before any works.
        </ObsNotice>

        <div>
          <div className={css.secLbl}>Water-dependent habitats present</div>
          <div className={css.ckGroup} data-testid="water-checks">
            {WATER_HABITATS.map((w) => (
              <CheckRow
                key={w.key}
                spec={w}
                on={model.habitats.includes(w.key)}
                testid={`water-${w.key}`}
                onToggle={() => toggleHabitat(w.key)}
              />
            ))}
          </div>
        </div>

        <SelRow
          label="Setback condition"
          value={model.setbackCond}
          options={SETBACK_COND}
          testid="water-setback-cond"
          onChange={setCond}
        />
        <SelRow
          label="Setback targeted for"
          value={model.setbackTarget}
          options={SETBACK_TARGET}
          testid="water-setback-target"
          onChange={setTarget}
        />

        <button
          type="button"
          className={css.noneAffirm}
          data-testid="water-none"
          data-on={model.nonePresent ? 'true' : 'false'}
          aria-pressed={model.nonePresent}
          onClick={toggleNone}
        >
          <span className={css.vegChk} aria-hidden="true" />
          No water-dependent areas present on this site
        </button>

        <div className={css.feedsBlock}>
          <ArrowRight size={13} className={css.feedsIcon} aria-hidden="true" />
          <div className={css.feedsTxt}>
            Water-dependent habitat areas are flagged as{' '}
            <strong>design-sensitive zones</strong> in Stratum 4. They become
            exclusion zones for earthworks and intensive land use in Stratum 5.
          </div>
        </div>
      </div>
    );
  }

  // ---------- pollinator (orch-1) ----------
  if (model.kind === 'pollinator') {
    const set = (patch: Partial<PollinatorModel>): void =>
      emit({ ...model, ...patch });

    return (
      <div className={css.root} data-ecology-mode="pollinator">
        <ObsNotice>
          Observe during the active bloom window, on a warm still day, for a
          representative read of the pollinator community.
        </ObsNotice>

        <div className={css.guildGrid} data-testid="pollinator-guilds">
          <GuildCard name="Honeybee (managed / social)" tone="act" testid="guild-honeybee">
            <GuildSel
              label="Presence"
              value={model.honeybee}
              options={POLL_HONEYBEE}
              testid="poll-honeybee"
              onChange={(v) => set({ honeybee: v })}
            />
          </GuildCard>

          <GuildCard name="Bumblebees" tone="success" testid="guild-bumble">
            <GuildSel
              label="Species seen"
              value={model.bumbleSpecies}
              options={POLL_BUMBLE_SPECIES}
              testid="poll-bumble-species"
              onChange={(v) => set({ bumbleSpecies: v })}
            />
            <GuildSel
              label="Abundance"
              value={model.bumbleAbund}
              options={POLL_BUMBLE_ABUND}
              testid="poll-bumble-abund"
              onChange={(v) => set({ bumbleAbund: v })}
            />
          </GuildCard>

          <GuildCard name="Solitary bees (native)" tone="info" testid="guild-solitary">
            <GuildSel
              label="Ground-nesting"
              value={model.solitaryGround}
              options={POLL_SOLITARY_GROUND}
              testid="poll-solitary-ground"
              onChange={(v) => set({ solitaryGround: v })}
            />
            <GuildSel
              label="Mason / leafcutter"
              value={model.solitaryMason}
              options={POLL_SOLITARY_MASON}
              testid="poll-solitary-mason"
              onChange={(v) => set({ solitaryMason: v })}
            />
          </GuildCard>

          <GuildCard name="Hoverflies / syrphid flies" tone="info" testid="guild-hoverfly">
            <GuildSel
              label="Presence"
              value={model.hoverfly}
              options={POLL_HOVERFLY}
              testid="poll-hoverfly"
              onChange={(v) => set({ hoverfly: v })}
            />
          </GuildCard>
        </div>

        <div>
          <div className={css.secLbl}>Overall pollination provision</div>
          <ScoreChips
            options={POLL_SCORES}
            value={model.score}
            group="poll"
            onPick={(s) => set({ score: s })}
          />
        </div>

        <div className={css.feedsBlock}>
          <ArrowRight size={13} className={css.feedsIcon} aria-hidden="true" />
          <div className={css.feedsTxt}>
            Pollinator baseline feeds <strong>Stratum 5: Guild design</strong> --
            low provision flags a need for dedicated insectary and forage
            plantings in the orchard understory.
          </div>
        </div>
      </div>
    );
  }

  // ---------- insectary (orch-2) ----------
  const insectary = model;
  const setBloom = (key: BloomWindowSpec['key'], v: string): void => {
    if (key === 'early') emit({ ...insectary, bloomEarly: v });
    else if (key === 'mid') emit({ ...insectary, bloomMid: v });
    else if (key === 'late') emit({ ...insectary, bloomLate: v });
    else emit({ ...insectary, bloomGaps: v });
  };
  const bloomValue = (key: BloomWindowSpec['key']): string => {
    if (key === 'early') return insectary.bloomEarly;
    if (key === 'mid') return insectary.bloomMid;
    if (key === 'late') return insectary.bloomLate;
    return insectary.bloomGaps;
  };
  const toggleNesting = (key: string): void =>
    emit({
      ...insectary,
      nesting: insectary.nesting.includes(key)
        ? insectary.nesting.filter((n) => n !== key)
        : [...insectary.nesting, key],
    });
  const setBed = (v: string): void => emit({ ...insectary, bed: v });

  return (
    <div className={css.root} data-ecology-mode="insectary">
      <div>
        <div className={css.secLbl}>Bloom-window coverage</div>
        <div className={css.bloomTable} data-testid="bloom-table">
          <div className={css.bloomHead}>
            <span>Window</span>
            <span>Crop demand</span>
            <span>Support planting</span>
          </div>
          {BLOOM_WINDOWS.map((b) => (
            <div key={b.key} className={css.bloomRow}>
              <span className={css.bloomWindow}>{b.window}</span>
              <span className={css.bloomCrops}>{b.crops}</span>
              <select
                className={css.bloomSel}
                data-testid={`bloom-${b.key}`}
                aria-label={`${b.window} bloom-window support planting`}
                value={bloomValue(b.key)}
                onChange={(e) => setBloom(b.key, e.target.value)}
              >
                {BLOOM_SUPPORT.map((o) => (
                  <option key={o.value || '__empty'} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className={css.secLbl}>Nesting-habitat provision</div>
        <div className={css.ckGroup} data-testid="insectary-nesting-checks">
          {INSECTARY_NESTING.map((n) => (
            <CheckRow
              key={n.key}
              spec={n}
              on={insectary.nesting.includes(n.key)}
              testid={`insectary-nesting-${n.key}`}
              onToggle={() => toggleNesting(n.key)}
            />
          ))}
        </div>
      </div>

      <SelRow
        label="Dedicated insectary bed or zone"
        value={insectary.bed}
        options={INSECTARY_BED}
        testid="insectary-bed"
        onChange={setBed}
      />

      <div className={css.feedsBlock}>
        <ArrowRight size={13} className={css.feedsIcon} aria-hidden="true" />
        <div className={css.feedsTxt}>
          The insectary plan feeds <strong>Stratum 5: Understory planting</strong>
          {' '}-- bloom-window gaps become explicit planting prescriptions to
          carry beneficial insects through the season.
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Species body -- native-category checklist + growable invasive watchlist
// (region-neutral: operator names their own weeds) + species-of-concern
// dropdown. Invasive row id minting happens here, in handlers only; UI-only
// add-form state lives in this body.
// ---------------------------------------------------------------------------

function SpeciesBody({
  model,
  onChange,
}: {
  model: SpeciesModel;
  onChange: (next: SpeciesModel) => void;
}): React.JSX.Element {
  const [invasiveOpen, setInvasiveOpen] = React.useState(false);
  const [iName, setIName] = React.useState('');
  const [iSci, setISci] = React.useState('');
  const [iPriority, setIPriority] = React.useState<InvasivePriority>('high');
  const [iDist, setIDist] = React.useState('');

  const resetInvasive = (): void => {
    setIName('');
    setISci('');
    setIPriority('high');
    setIDist('');
  };

  const toggleNative = (key: string): void =>
    onChange({
      ...model,
      nativeCats: model.nativeCats.includes(key)
        ? model.nativeCats.filter((c) => c !== key)
        : [...model.nativeCats, key],
    });

  const setSar = (v: string): void => onChange({ ...model, sar: v });

  const addInvasive = (): void => {
    onChange({
      ...model,
      invasives: [
        ...model.invasives,
        {
          id: makeRowId(),
          name: iName.trim(),
          scientific: iSci.trim(),
          priority: iPriority,
          distribution: iDist.trim(),
        },
      ],
    });
    resetInvasive();
    setInvasiveOpen(false);
  };
  const removeInvasive = (id: string): void =>
    onChange({
      ...model,
      invasives: model.invasives.filter((i) => i.id !== id),
    });

  return (
    <div className={css.root} data-ecology-mode="species">
      <div>
        <div className={css.secLbl}>Native species present</div>
        <div className={css.ckGroup} data-testid="native-checks">
          {NATIVE_CATEGORIES.map((c) => (
            <CheckRow
              key={c.key}
              spec={c}
              on={model.nativeCats.includes(c.key)}
              testid={`native-${c.key}`}
              onToggle={() => toggleNative(c.key)}
            />
          ))}
        </div>
      </div>

      <div className={css.fdiv} aria-hidden="true" />

      <div>
        <div className={css.secLbl}>Invasive species watchlist</div>
        {model.invasives.length === 0 ? (
          <div className={css.spEmpty} data-testid="invasive-empty">
            No invasive species recorded yet.
          </div>
        ) : (
          <div className={css.invList}>
            {model.invasives.map((i) => (
              <div key={i.id} className={css.invRow}>
                <div className={css.invHead}>
                  <span className={css.invName}>{i.name || "Unnamed weed"}</span>
                  {i.scientific ? (
                    <span className={css.invSci}>{i.scientific}</span>
                  ) : null}
                  <span
                    className={css.invPriority}
                    data-priority={i.priority}
                  >
                    {INVASIVE_PRIORITY_LABEL[i.priority] ?? i.priority}
                  </span>
                  <button
                    type="button"
                    className={css.spDel}
                    data-testid={`invasive-remove-${i.id}`}
                    aria-label={`Remove ${i.name || "invasive species"}`}
                    onClick={() => removeInvasive(i.id)}
                  >
                    <X size={13} />
                  </button>
                </div>
                {i.distribution ? (
                  <div className={css.invDist}>{i.distribution}</div>
                ) : null}
              </div>
            ))}
          </div>
        )}
        {invasiveOpen ? (
          <div className={css.addForm} data-testid="invasive-form">
            <div className={css.afLbl}>Common name</div>
            <input
              type="text"
              className={css.afInput}
              data-testid="invasive-name"
              aria-label="Invasive common name"
              value={iName}
              placeholder="name the species observed on this site"
              onChange={(e) => setIName(e.target.value)}
            />
            <div className={css.afLbl}>Scientific name</div>
            <input
              type="text"
              className={css.afInput}
              data-testid="invasive-sci"
              aria-label="Invasive scientific name"
              value={iSci}
              placeholder="optional"
              onChange={(e) => setISci(e.target.value)}
            />
            <div className={css.afGrid}>
              <div>
                <div className={css.afLbl}>Priority</div>
                <select
                  className={css.afSelect}
                  data-testid="invasive-priority"
                  aria-label="Invasive priority"
                  value={iPriority}
                  onChange={(e) =>
                    setIPriority(e.target.value as InvasivePriority)
                  }
                >
                  {INVASIVE_PRIORITIES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className={css.afLbl}>Distribution</div>
                <input
                  type="text"
                  className={css.afInput}
                  data-testid="invasive-dist"
                  aria-label="Invasive distribution"
                  value={iDist}
                  placeholder="e.g. watercourse banks, scattered"
                  onChange={(e) => setIDist(e.target.value)}
                />
              </div>
            </div>
            <div className={css.afRow}>
              <button
                type="button"
                className={css.afAdd}
                data-testid="invasive-add"
                onClick={addInvasive}
              >
                Add to watchlist
              </button>
              <button
                type="button"
                className={css.afCancel}
                data-testid="invasive-cancel"
                onClick={() => {
                  resetInvasive();
                  setInvasiveOpen(false);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className={css.addBtn}
            data-testid="invasive-open"
            onClick={() => setInvasiveOpen(true)}
          >
            <Plus size={11} aria-hidden="true" /> Add invasive species
          </button>
        )}
      </div>

      <SelRow
        label="Species of conservation concern"
        value={model.sar}
        options={SAR_OPTIONS}
        testid="species-sar"
        onChange={setSar}
      />

      <div className={css.feedsBlock}>
        <ArrowRight size={13} className={css.feedsIcon} aria-hidden="true" />
        <div className={css.feedsTxt}>
          Each High-priority invasive generates a{' '}
          <strong>weed control Act task</strong>. Native indicator groups inform{' '}
          <strong>revegetation species selection</strong> in Stratum 5.
        </div>
      </div>
    </div>
  );
}

export default EcologyCapture;
