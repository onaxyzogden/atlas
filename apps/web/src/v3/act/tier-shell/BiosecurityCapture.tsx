/**
 * BiosecurityCapture -- a multi-mode CONTROLLED capture for the nursery
 * objective nur-sec-s2-biosecurity-survey ("Survey disease, pest & biosecurity
 * risks", 5 checklist items c1..c5). Ported from olos_biosecurity_risk.html
 * right-hand panels p1..p5. Catalogue item order == mockup panel order:
 *
 *   c1 -> soilDisease   (mockup p1: site risk factors + disease risk rows)
 *   c2 -> insectPest    (mockup p2: prop environment + pest presence register)
 *   c3 -> weedMedia     (mockup p3: media source contamination register)
 *   c4 -> ingress       (mockup p4: ingress pathways register)
 *   c5 -> sanitation    (mockup p5: protocol builder + generated document) GATE
 *
 * Structure mirrors GrazingSystemCapture / CarryingCapacityCapture (the
 * canonical multi-mode captures): a `biosecurityModeFor(itemId)` mapper plus a
 * single component that renders ONE mode body. The third-column host owns the
 * eyebrow / title / hint / Record-Defer chrome; this capture renders ONLY the
 * scrollable mode body (the mockup's `.rb` inner content).
 *
 * CONTROLLED / pure: the model is always derived from decode(value) each render;
 * the full next model is emitted via onChange(encode(next)). The capture holds
 * NO local state for persisted values. NO projectId prop; writes NOTHING to any
 * store. c1..c4 are ADVISORY (always valid); c5 (sanitation) is the GATE --
 * valid only when all three protocol sections are selected (mirrors
 * CarryingCapacity's `gate` mode).
 *
 * decode NEVER fabricates seed/demo defaults: every rating / selection defaults
 * to EMPTY string. The mockup's pre-highlighted demo ratings are NOT persisted.
 * Risk-rating rows are positional fixed-length arrays (one slot per canonical
 * disease/pest/source); a blank slot means "not yet rated".
 *
 * ASCII-only: middot -> " / "; em-dash -> " -- "; degC -> "C". All disease /
 * pest Latin binomials and guidance text are fidelity-critical verbatim
 * constants -- never reword. All icons are lucide. Apostrophes use double-quoted
 * JS strings.
 */

import * as React from 'react';
import { ArrowRight, ClipboardCheck } from 'lucide-react';

import type { FormValue } from './actToolCatalog.js';
import {
  ChipSelect,
  InterpretationBlock,
  SectionEyebrow,
} from './captures/controls/index.js';
import css from './BiosecurityCapture.module.css';

// ---------------------------------------------------------------------------
// Mode mapper
// ---------------------------------------------------------------------------

export type BiosecurityMode =
  | 'soilDisease' // c1
  | 'insectPest' // c2
  | 'weedMedia' // c3
  | 'ingress' // c4
  | 'sanitation'; // c5

export const BIOSECURITY_PREFIX = 'nur-sec-s2-biosecurity-survey';
const PREFIX_DASH = BIOSECURITY_PREFIX + '-';

export function biosecurityModeFor(itemId: string): BiosecurityMode | null {
  if (!itemId.startsWith(PREFIX_DASH)) return null;
  const suffix = itemId.slice(PREFIX_DASH.length);
  switch (suffix) {
    case 'c1':
      return 'soilDisease';
    case 'c2':
      return 'insectPest';
    case 'c3':
      return 'weedMedia';
    case 'c4':
      return 'ingress';
    case 'c5':
      return 'sanitation';
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Rating tones (red/amber/green treatment shared with sibling captures)
// ---------------------------------------------------------------------------

type Tone = 'high' | 'mod' | 'low' | 'neg';

// 4-state disease / weed / ingress risk rating.
const RISK4 = ['High', 'Moderate', 'Low', 'Negligible'] as const;
// 3-state pest presence rating.
const PRESENCE3 = ['Present', 'Probable', 'Unlikely'] as const;

function riskTone(rating: string): Tone | null {
  switch (rating) {
    case 'High':
      return 'high';
    case 'Moderate':
      return 'mod';
    case 'Low':
      return 'low';
    case 'Negligible':
      return 'neg';
    default:
      return null;
  }
}

function presenceTone(rating: string): Tone | null {
  switch (rating) {
    case 'Present':
      return 'high';
    case 'Probable':
      return 'mod';
    case 'Unlikely':
      return 'low';
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Verbatim canonical content (never reword; ASCII-normalized per task spec)
// ---------------------------------------------------------------------------

// -- soilDisease (c1) --
export interface SiteFactorSpec {
  label: string;
  options: readonly string[];
}
export const SOIL_SITE_FACTORS: readonly SiteFactorSpec[] = [
  { label: 'Drainage quality', options: ['Poor', 'Moderate', 'Good'] },
  {
    label: 'Previous horticulture or cropping',
    options: ['Yes', 'No / unknown'],
  },
  { label: 'Known Phytophthora in region', options: ['Yes', 'Not known'] },
];

export interface DiseaseSpec {
  title: string;
  binomial: string;
  /** consequence note shown when rated High or Moderate; "" = no note */
  consequence: string;
}
export const SOIL_DISEASES: readonly DiseaseSpec[] = [
  {
    title: 'Phytophthora root rot',
    binomial: 'Phytophthora cinnamomi / P. nicotianae',
    consequence:
      'Poor drainage + prior horticulture = critical risk. Use 100% fresh certified media in all propagation beds -- no field soil. Install raised beds or impermeable base layer. Prophylactic phosphonate treatment (Agri-Fos, Aliette) for susceptible species. Test irrigation water source for Phytophthora before using dam or surface water.',
  },
  {
    title: 'Damping off',
    binomial: 'Pythium spp. / Rhizoctonia solani',
    consequence:
      'Manageable with good cultural practice. Ensure adequate drainage and avoid overwatering -- allow media surface to partially dry between irrigations. Use misting over flood irrigation for germinating seed. Consider Trichoderma-based biological fungicide (Trichoderma harzianum) as preventative treatment.',
  },
  {
    title: 'Crown and root rot',
    binomial: 'Fusarium oxysporum / Sclerotinia spp.',
    consequence: '',
  },
];

// -- insectPest (c2) --
export const PEST_ENVIRONMENTS: readonly string[] = [
  'Enclosed glasshouse',
  'Shade house',
  'Open / mixed',
];

export interface PestSpec {
  title: string;
  note: string;
  /** control line shown when Present/Probable; "" = no control line */
  control: string;
}
export const INSECT_PESTS: readonly PestSpec[] = [
  {
    title: 'Fungus gnats',
    note: 'Bradysia spp. / larvae damage roots/cuttings in moist media',
    control:
      'Control: yellow sticky traps + Bacillus thuringiensis israelensis (Bti) drench. Reduce overwatering -- larval habitat is moist media surface. Neem-based soil drench as preventative.',
  },
  {
    title: 'Aphids',
    note: 'Multiple species / sap-sucking / virus vectors on young growth',
    control:
      'Monitor weekly on new cuttings and soft growth. Introduce Aphidius colemani parasitoids when detected. Spot-treat with pyrethrin or insecticidal soap as backup.',
  },
  {
    title: 'Scale insects',
    note: 'Soft and armoured scale / stock plants at risk',
    control:
      'Inspect all incoming plant material. Horticultural oil (white oil) on any detection. Targeted removal for armoured scale. Introduce Cryptolaemus montouzieri (mealybug destroyer) if mealybug also present.',
  },
  {
    title: 'Spider mites',
    note: 'Tetranychus urticae / cell damage to young growth in hot/dry conditions',
    control: '',
  },
  {
    title: 'Thrips',
    note: 'Frankliniella occidentalis / flower damage / TSWV vectors',
    control: '',
  },
];

// -- weedMedia (c3) --
export interface WeedSourceSpec {
  tag: string;
  tagTone: 'commercial' | 'onsite' | 'sourced';
  name: string;
  action: string;
}
export const WEED_SOURCES: readonly WeedSourceSpec[] = [
  {
    tag: 'Commercial',
    tagTone: 'commercial',
    name: 'Debco/Osmocote potting mix',
    action:
      'Sealed, heat-treated certified product. Use directly from sealed bags. Reject and return any bag with damaged seal, discolouration, or visible mould. Check batch certification date -- reject stock older than 18 months.',
  },
  {
    tag: 'On-site compost',
    tagTone: 'onsite',
    name: 'Compost from on-site bays',
    action:
      'Current composting system does not consistently reach 55C for 3+ days. Raw compost cannot be used in propagation media. Either: (a) install thermophilic composting protocols and record temperature logs, (b) heat-treat finished compost at 82C for 30 minutes in a soil steriliser before use, or (c) exclude from propagation media entirely.',
  },
  {
    tag: 'Sourced',
    tagTone: 'sourced',
    name: 'Leaf mould (external supplier)',
    action:
      'Risk depends on source vegetation and composting maturity. Request batch documentation. Heat-treat at 82C for 30 minutes before use in propagation beds. Do not use if source vegetation includes known weed species (oxalis, cape weed, onion weed).',
  },
  {
    tag: 'Commercial',
    tagTone: 'commercial',
    name: 'Perlite / vermiculite',
    action:
      'Inert mineral substrate -- no viable weed seed risk. Use directly. Store in sealed bags off the ground to prevent contamination from surrounding soil splash.',
  },
];

// -- ingress (c4) --
export interface IngressSpec {
  tag: string;
  tagTone: 'returned' | 'internal' | 'external';
  name: string;
  action: string;
}
export const INGRESS_PATHWAYS: readonly IngressSpec[] = [
  {
    tag: 'Returned stock',
    tagTone: 'returned',
    name: 'Unsold nursery stock returned from markets / pop-ups',
    action:
      'Highest-risk ingress pathway. Stock circulated through markets is exposed to unknown pest and disease environments. Under no circumstances should returned stock re-enter the propagation area without a minimum 14-day quarantine in an isolated area. Any pest or disease detected during quarantine requires investigation before wider release.',
  },
  {
    tag: 'Source plants',
    tagTone: 'internal',
    name: 'On-site stock plants used for cutting material',
    action:
      'Stock plants should be formally inspected every 3 months. Maintain inspection records. Any plant with unexplained die-back, leaf discolouration, or pest evidence must be removed to quarantine before any cuttings are taken. Do not assume symptoms are abiotic until pest/disease cause is ruled out.',
  },
  {
    tag: 'External material',
    tagTone: 'external',
    name: 'Plants or cuttings sourced from external properties',
    action:
      '7-day minimum quarantine before entering propagation space. Visually inspect on receipt for scale, aphid colonies, and unusual leaf symptoms. If sourced from a property with known Phytophthora, do not accept material without phytosanitary documentation.',
  },
  {
    tag: 'Adjacent vegetation',
    tagTone: 'internal',
    name: 'Wild or ornamental plants adjacent to propagation areas',
    action:
      'Establish a 1m clear zone between wild vegetation and propagation areas. Remove any plants known to host aphids, scale, or whitefly within 3m of the propagation boundary. Particularly: ornamental roses, citrus, and broad-leaf ornamentals are common scale and aphid reservoirs.',
  },
];

// -- sanitation (c5) protocol builder --
export interface ProtoOptionSpec {
  title: string;
  desc: string;
  /** the value token stored in FormValue (Entry stores High/Standard/Basic) */
  value: string;
}
export interface ProtoSectionSpec {
  label: string;
  /** FormValue key for this section's selected value */
  key: 'bsEntry' | 'bsTools' | 'bsContainer';
  options: readonly ProtoOptionSpec[];
}
export const PROTO_SECTIONS: readonly ProtoSectionSpec[] = [
  {
    label: 'Entry & exit protocol',
    key: 'bsEntry',
    options: [
      {
        title: 'Strict -- foot bath + hand wash + zone tools',
        desc: 'Boot disinfectant tray at all entry points / dedicated tools per zone / no cross-zone movement without sanitisation',
        value: 'High',
      },
      {
        title: 'Standard -- foot bath + hand wash on entry',
        desc: 'Foot bath with Phytoclean or bleach solution at main entry / hand wash station / general tools cleaned between zones',
        value: 'Standard',
      },
      {
        title: 'Basic -- hand wash only',
        desc: 'Hand wash station at propagation area entry / no footwear requirement',
        value: 'Basic',
      },
    ],
  },
  {
    label: 'Tool & equipment sterilisation',
    key: 'bsTools',
    options: [
      {
        title: 'Bleach 5% solution -- dip, rinse, dry',
        desc: '20-second dip in 5% sodium hypochlorite. Effective for most bacteria and fungi including Phytophthora. Rinse to prevent phytotoxicity.',
        value: '5% sodium hypochlorite (bleach) -- dip, rinse, air-dry',
      },
      {
        title: 'Phytoclean -- registered disinfectant',
        desc: 'Commercial product approved for horticultural biosecurity. More gentle on tools. Higher cost.',
        value: 'Phytoclean (approved disinfectant)',
      },
      {
        title: '70% methylated spirits -- wipe or dip',
        desc: 'Effective for blades and small tools. Risk of fire near flammable materials. Less effective than bleach for Phytophthora.',
        value: '70% methylated spirits -- wipe and flame',
      },
    ],
  },
  {
    label: 'Container standard',
    key: 'bsContainer',
    options: [
      {
        title: 'New containers only',
        desc: 'Highest biosecurity standard. No reuse permitted in propagation beds. High cost but eliminates container-borne risk entirely.',
        value: 'New containers only -- no reuse',
      },
      {
        title: 'Bleach-washed reuse',
        desc: 'Physical scrub to remove media residue, then 5% bleach soak for 10 minutes, air-dry before use. Adequate standard for most operations.',
        value: 'Bleach-washed reuse -- physical scrub + 5% bleach soak 10 min + air-dry',
      },
      {
        title: 'Autoclave sterilisation',
        desc: 'Thermal sterilisation at 121C. Highest standard for reused containers. Requires autoclave equipment.',
        value: 'Autoclave sterilisation for reuse',
      },
    ],
  },
];

// Entry-token -> generated protocol document line.
const ENTRY_DOC_MAP: Record<string, string> = {
  High: 'Entry: Strict -- foot bath + hand wash + dedicated tools per propagation zone, no cross-zone movement without sanitisation',
  Standard:
    'Entry: Standard -- foot bath with Phytoclean/bleach at main entry, hand wash on entry, tools cleaned between zones',
  Basic: 'Entry: Basic -- hand wash station at propagation area entrance',
};

const FIXED_DOC_LINES: readonly string[] = [
  'Returned stock: 14-day quarantine in isolated area before re-entry',
  'On-site compost: Not approved for direct use -- sterilisation required before any media incorporation',
];

// ---------------------------------------------------------------------------
// Models (numeric/selection fields stored as RAW STRINGS; ratings positional)
// ---------------------------------------------------------------------------

export interface SoilDiseaseModel {
  kind: 'soilDisease';
  drainage: string;
  priorHort: string;
  knownPhytophthora: string;
  /** length === SOIL_DISEASES.length (3); "" = not yet rated */
  ratings: string[];
}

export interface InsectPestModel {
  kind: 'insectPest';
  environment: string;
  /** length === INSECT_PESTS.length (5) */
  ratings: string[];
}

export interface WeedMediaModel {
  kind: 'weedMedia';
  /** length === WEED_SOURCES.length (4) */
  ratings: string[];
}

export interface IngressModel {
  kind: 'ingress';
  /** length === INGRESS_PATHWAYS.length (4) */
  ratings: string[];
}

export interface SanitationModel {
  kind: 'sanitation';
  entry: string;
  tools: string;
  container: string;
}

export type BiosecurityModel =
  | SoilDiseaseModel
  | InsectPestModel
  | WeedMediaModel
  | IngressModel
  | SanitationModel;

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

/** Positional fixed-length string[] from a possibly-short / scalar array. */
function fixedStrings(v: FormValue[string] | undefined, len: number): string[] {
  const arr = asArr(v);
  const out: string[] = [];
  for (let i = 0; i < len; i++) out.push(arr[i] ?? '');
  return out;
}

/** Constrain a raw rating to the allowed set, else "". */
function constrain(raw: string, allowed: readonly string[]): string {
  return allowed.includes(raw) ? raw : '';
}

function constrainAll(arr: string[], allowed: readonly string[]): string[] {
  return arr.map((r) => constrain(r, allowed));
}

// ---------------------------------------------------------------------------
// decode: FormValue -> BiosecurityModel (TOTAL / defensive; never throws,
// never fabricates seed/demo defaults)
// ---------------------------------------------------------------------------

export function decodeBiosecurity(
  mode: BiosecurityMode,
  value: FormValue,
): BiosecurityModel {
  switch (mode) {
    case 'soilDisease':
      return {
        kind: 'soilDisease',
        drainage: constrain(
          asStr(value.bsDrainage),
          SOIL_SITE_FACTORS[0]?.options ?? [],
        ),
        priorHort: constrain(
          asStr(value.bsPriorHort),
          SOIL_SITE_FACTORS[1]?.options ?? [],
        ),
        knownPhytophthora: constrain(
          asStr(value.bsKnownPhyto),
          SOIL_SITE_FACTORS[2]?.options ?? [],
        ),
        ratings: constrainAll(
          fixedStrings(value.bsDiseaseRatings, SOIL_DISEASES.length),
          RISK4,
        ),
      };
    case 'insectPest':
      return {
        kind: 'insectPest',
        environment: constrain(asStr(value.bsPestEnv), PEST_ENVIRONMENTS),
        ratings: constrainAll(
          fixedStrings(value.bsPestRatings, INSECT_PESTS.length),
          PRESENCE3,
        ),
      };
    case 'weedMedia':
      return {
        kind: 'weedMedia',
        ratings: constrainAll(
          fixedStrings(value.bsMediaRatings, WEED_SOURCES.length),
          RISK4,
        ),
      };
    case 'ingress':
      return {
        kind: 'ingress',
        ratings: constrainAll(
          fixedStrings(value.bsIngressRatings, INGRESS_PATHWAYS.length),
          RISK4,
        ),
      };
    case 'sanitation': {
      const entryVals = (PROTO_SECTIONS[0]?.options ?? []).map((o) => o.value);
      const toolVals = (PROTO_SECTIONS[1]?.options ?? []).map((o) => o.value);
      const containerVals = (PROTO_SECTIONS[2]?.options ?? []).map(
        (o) => o.value,
      );
      return {
        kind: 'sanitation',
        entry: constrain(asStr(value.bsEntry), entryVals),
        tools: constrain(asStr(value.bsTools), toolVals),
        container: constrain(asStr(value.bsContainer), containerVals),
      };
    }
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown BiosecurityMode: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// encode: BiosecurityModel -> FormValue (lossless inverse of decode)
// ---------------------------------------------------------------------------

export function encodeBiosecurity(
  _mode: BiosecurityMode,
  model: BiosecurityModel,
): FormValue {
  switch (model.kind) {
    case 'soilDisease':
      return {
        bsDrainage: model.drainage,
        bsPriorHort: model.priorHort,
        bsKnownPhyto: model.knownPhytophthora,
        bsDiseaseRatings: [...model.ratings],
      };
    case 'insectPest':
      return {
        bsPestEnv: model.environment,
        bsPestRatings: [...model.ratings],
      };
    case 'weedMedia':
      return { bsMediaRatings: [...model.ratings] };
    case 'ingress':
      return { bsIngressRatings: [...model.ratings] };
    case 'sanitation':
      return {
        bsEntry: model.entry,
        bsTools: model.tools,
        bsContainer: model.container,
      };
    default: {
      const _exhaustive: never = model;
      throw new Error(`Unknown BiosecurityModel kind: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// validity gates (sees own value only)
// ---------------------------------------------------------------------------

export function isBiosecurityValid(
  mode: BiosecurityMode,
  value: FormValue,
): boolean {
  if (mode === 'sanitation') {
    const m = decodeBiosecurity('sanitation', value) as SanitationModel;
    return m.entry !== '' && m.tools !== '' && m.container !== '';
  }
  // soilDisease / insectPest / weedMedia / ingress are advisory -- always valid.
  return true;
}

// ---------------------------------------------------------------------------
// summaries (defensive; never throw; handle empty value)
// ---------------------------------------------------------------------------

export function summariseBiosecurity(
  mode: BiosecurityMode,
  value: FormValue,
  siblingValues?: Record<string, FormValue>,
): string {
  void siblingValues;
  switch (mode) {
    case 'soilDisease': {
      const m = decodeBiosecurity('soilDisease', value) as SoilDiseaseModel;
      const high = m.ratings.filter((r) => r === 'High').length;
      const drainage =
        m.drainage !== '' ? ` -- drainage ${m.drainage.toLowerCase()}` : '';
      return `${SOIL_DISEASES.length} diseases rated, ${high} high-risk${drainage}`;
    }
    case 'insectPest': {
      const m = decodeBiosecurity('insectPest', value) as InsectPestModel;
      const flagged = m.ratings.filter(
        (r) => r === 'Present' || r === 'Probable',
      ).length;
      const env = m.environment !== '' ? ` (${m.environment})` : '';
      return `${flagged} present/probable of ${INSECT_PESTS.length} pests${env}`;
    }
    case 'weedMedia': {
      const m = decodeBiosecurity('weedMedia', value) as WeedMediaModel;
      const high = m.ratings.filter((r) => r === 'High').length;
      return `${WEED_SOURCES.length} sources assessed, ${high} high-risk`;
    }
    case 'ingress': {
      const m = decodeBiosecurity('ingress', value) as IngressModel;
      const rated = m.ratings.filter((r) => r !== '').length;
      return `${rated} of ${INGRESS_PATHWAYS.length} pathways rated`;
    }
    case 'sanitation': {
      const m = decodeBiosecurity('sanitation', value) as SanitationModel;
      if (m.entry !== '' && m.tools !== '' && m.container !== '') {
        return 'Entry / Tools / Container selected';
      }
      return 'Sanitation baseline incomplete';
    }
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown BiosecurityMode: ${String(_exhaustive)}`);
    }
  }
}

// ===========================================================================
// React component + 5 mode bodies (P1..P5)
// ===========================================================================

export interface BiosecurityCaptureProps {
  mode: BiosecurityMode;
  value: FormValue;
  onChange: (next: FormValue) => void;
  /** this capture's own checklist item id (e.g. nur-sec-s2-biosecurity-survey-c1). */
  itemId: string;
  /** full per-item FormValue map; reserved -- this capture reads no siblings. */
  siblingValues?: Record<string, FormValue>;
}

export function BiosecurityCapture({
  mode,
  value,
  onChange,
  itemId,
  siblingValues = {},
}: BiosecurityCaptureProps): React.JSX.Element {
  void itemId;
  void siblingValues;

  // -- P1: soilDisease ------------------------------------------------------
  if (mode === 'soilDisease') {
    const model = decodeBiosecurity('soilDisease', value) as SoilDiseaseModel;
    const set = (patch: Partial<SoilDiseaseModel>): void =>
      onChange(encodeBiosecurity('soilDisease', { ...model, ...patch }));
    const setRating = (i: number, rating: string): void => {
      const ratings = model.ratings.slice();
      ratings[i] = ratings[i] === rating ? '' : rating;
      set({ ratings });
    };
    const factorValue = (i: number): string =>
      i === 0 ? model.drainage : i === 1 ? model.priorHort : model.knownPhytophthora;
    const setFactor = (i: number, v: string): void => {
      if (i === 0) set({ drainage: v });
      else if (i === 1) set({ priorHort: v });
      else set({ knownPhytophthora: v });
    };
    return (
      <div className={css.root} data-bs-mode="soilDisease">
        <div className={css.siteFactors}>
          <div className={css.siteFactorsLbl}>Site risk factors</div>
          {SOIL_SITE_FACTORS.map((factor, i) => (
            <div key={factor.label} className={css.sfRow}>
              <span className={css.sfName}>{factor.label}</span>
              <ChipSelect
                multi={false}
                options={factor.options}
                value={factorValue(i) !== '' ? [factorValue(i)] : []}
                onChange={(next) => setFactor(i, next[0] ?? '')}
                ariaLabel={factor.label}
              />
            </div>
          ))}
        </div>

        <div>
          <SectionEyebrow>Disease risk assessment</SectionEyebrow>
          {SOIL_DISEASES.map((disease, i) => {
            const rating = model.ratings[i] ?? '';
            const tone = riskTone(rating);
            const showConsequence =
              disease.consequence !== '' &&
              (rating === 'High' || rating === 'Moderate');
            return (
              <div
                key={disease.title}
                className={css.diseaseRow}
                data-tone={tone ?? 'none'}
              >
                <div className={css.diseaseTop}>
                  <div className={css.diseaseName}>
                    <div className={css.diseaseTitle}>{disease.title}</div>
                    <div className={css.diseaseSci}>{disease.binomial}</div>
                  </div>
                  <div className={css.ratingBtns}>
                    {RISK4.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        className={css.ratingBtn}
                        data-tone={riskTone(opt) ?? 'none'}
                        data-on={rating === opt}
                        aria-pressed={rating === opt}
                        onClick={() => setRating(i, opt)}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
                {showConsequence ? (
                  <div className={css.consequence} data-tone={tone ?? 'none'}>
                    {disease.consequence}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <FeedsNote>
          High disease ratings generate <strong>Act pre-conditions</strong>:
          media certification check, raised bed construction, and water source
          testing must complete before propagation begins.
        </FeedsNote>
      </div>
    );
  }

  // -- P2: insectPest -------------------------------------------------------
  if (mode === 'insectPest') {
    const model = decodeBiosecurity('insectPest', value) as InsectPestModel;
    const set = (patch: Partial<InsectPestModel>): void =>
      onChange(encodeBiosecurity('insectPest', { ...model, ...patch }));
    const setRating = (i: number, rating: string): void => {
      const ratings = model.ratings.slice();
      ratings[i] = ratings[i] === rating ? '' : rating;
      set({ ratings });
    };
    return (
      <div className={css.root} data-bs-mode="insectPest">
        <div>
          <SectionEyebrow>Propagation environment</SectionEyebrow>
          <ChipSelect
            multi={false}
            options={PEST_ENVIRONMENTS}
            value={model.environment !== '' ? [model.environment] : []}
            onChange={(next) => set({ environment: next[0] ?? '' })}
            ariaLabel="Propagation environment"
          />
        </div>

        <div>
          <SectionEyebrow>Pest presence register</SectionEyebrow>
          {INSECT_PESTS.map((pest, i) => {
            const rating = model.ratings[i] ?? '';
            const tone = presenceTone(rating);
            const showControl =
              pest.control !== '' &&
              (rating === 'Present' || rating === 'Probable');
            return (
              <div key={pest.title} className={css.pestBlock}>
                <div className={css.pestRow} data-tone={tone ?? 'none'}>
                  <div className={css.pestName}>
                    <div className={css.pestTitle}>{pest.title}</div>
                    <div className={css.pestNote}>{pest.note}</div>
                  </div>
                  <div className={css.ratingBtns}>
                    {PRESENCE3.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        className={css.ratingBtn}
                        data-tone={presenceTone(opt) ?? 'none'}
                        data-on={rating === opt}
                        aria-pressed={rating === opt}
                        onClick={() => setRating(i, opt)}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
                {showControl ? (
                  <div className={css.pestControl} data-tone={tone ?? 'none'}>
                    {pest.control}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <FeedsNote>
          Pest presence data feeds <strong>the nursery IPM programme</strong> --
          biological controls are ordered before establishment, not reactively
          after detection.
        </FeedsNote>
      </div>
    );
  }

  // -- P3: weedMedia --------------------------------------------------------
  if (mode === 'weedMedia') {
    const model = decodeBiosecurity('weedMedia', value) as WeedMediaModel;
    const setRating = (i: number, rating: string): void => {
      const ratings = model.ratings.slice();
      ratings[i] = ratings[i] === rating ? '' : rating;
      onChange(encodeBiosecurity('weedMedia', { kind: 'weedMedia', ratings }));
    };
    return (
      <div className={css.root} data-bs-mode="weedMedia">
        <div>
          <SectionEyebrow>Media source contamination register</SectionEyebrow>
          {WEED_SOURCES.map((source, i) => {
            const rating = model.ratings[i] ?? '';
            const tone = riskTone(rating);
            return (
              <div
                key={source.name}
                className={css.sourceRow}
                data-tone={tone ?? 'none'}
              >
                <div className={css.sourceTop}>
                  <span
                    className={css.sourceTag}
                    data-tag-tone={source.tagTone}
                  >
                    {source.tag}
                  </span>
                  <span className={css.sourceName}>{source.name}</span>
                </div>
                <div className={css.ratingBtns}>
                  {RISK4.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className={css.ratingBtn}
                      data-tone={riskTone(opt) ?? 'none'}
                      data-on={rating === opt}
                      aria-pressed={rating === opt}
                      onClick={() => setRating(i, opt)}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                <div className={css.sourceAction} data-tone={tone ?? 'none'}>
                  {source.action}
                </div>
              </div>
            );
          })}
        </div>

        <FeedsNote>
          High-risk media sources generate <strong>Act pre-conditions</strong>:
          sterilisation equipment must be in place and protocols confirmed before
          those sources can be used in any propagation mix.
        </FeedsNote>
      </div>
    );
  }

  // -- P4: ingress ----------------------------------------------------------
  if (mode === 'ingress') {
    const model = decodeBiosecurity('ingress', value) as IngressModel;
    const setRating = (i: number, rating: string): void => {
      const ratings = model.ratings.slice();
      ratings[i] = ratings[i] === rating ? '' : rating;
      onChange(encodeBiosecurity('ingress', { kind: 'ingress', ratings }));
    };
    return (
      <div className={css.root} data-bs-mode="ingress">
        <div>
          <SectionEyebrow>Ingress pathways register</SectionEyebrow>
          {INGRESS_PATHWAYS.map((path, i) => {
            const rating = model.ratings[i] ?? '';
            const tone = riskTone(rating);
            return (
              <div
                key={path.name}
                className={css.sourceRow}
                data-tone={tone ?? 'none'}
              >
                <div className={css.sourceTop}>
                  <span
                    className={css.ingressTag}
                    data-ingress-tone={path.tagTone}
                  >
                    {path.tag}
                  </span>
                  <span className={css.sourceName}>{path.name}</span>
                </div>
                <div className={css.ratingBtns}>
                  {RISK4.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className={css.ratingBtn}
                      data-tone={riskTone(opt) ?? 'none'}
                      data-on={rating === opt}
                      aria-pressed={rating === opt}
                      onClick={() => setRating(i, opt)}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                <div className={css.sourceAction} data-tone={tone ?? 'none'}>
                  {path.action}
                </div>
              </div>
            );
          })}
        </div>

        <FeedsNote>
          Returned stock quarantine and stock plant inspection protocols become{' '}
          <strong>standing Act routines</strong> in the Observe layer --
          generated from this biosecurity assessment.
        </FeedsNote>
      </div>
    );
  }

  // -- P5: sanitation (GATE -- protocol builder + generated document) -------
  const model = decodeBiosecurity('sanitation', value) as SanitationModel;
  const selected: Record<ProtoSectionSpec['key'], string> = {
    bsEntry: model.entry,
    bsTools: model.tools,
    bsContainer: model.container,
  };
  const pick = (key: ProtoSectionSpec['key'], optValue: string): void => {
    const next: SanitationModel = { ...model };
    if (key === 'bsEntry') next.entry = next.entry === optValue ? '' : optValue;
    else if (key === 'bsTools')
      next.tools = next.tools === optValue ? '' : optValue;
    else next.container = next.container === optValue ? '' : optValue;
    onChange(encodeBiosecurity('sanitation', next));
  };

  const docLines: string[] = [];
  if (model.entry !== '' && ENTRY_DOC_MAP[model.entry] !== undefined) {
    docLines.push(ENTRY_DOC_MAP[model.entry] as string);
  }
  if (model.tools !== '') docLines.push(`Tools: ${model.tools}`);
  if (model.container !== '') docLines.push(`Containers: ${model.container}`);
  for (const line of FIXED_DOC_LINES) docLines.push(line);

  return (
    <div className={css.root} data-bs-mode="sanitation">
      {PROTO_SECTIONS.map((section) => (
        <div key={section.key} className={css.protoSection}>
          <div className={css.protoLbl}>{section.label}</div>
          <div className={css.protoOptions}>
            {section.options.map((opt) => {
              const on = selected[section.key] === opt.value;
              return (
                <button
                  key={opt.title}
                  type="button"
                  className={css.protoOption}
                  data-on={on}
                  aria-pressed={on}
                  onClick={() => pick(section.key, opt.value)}
                >
                  <span className={css.protoRadio} aria-hidden="true">
                    <span className={css.protoRadioDot} />
                  </span>
                  <span className={css.protoOptBody}>
                    <span className={css.protoOptTitle}>{opt.title}</span>
                    <span className={css.protoOptDesc}>{opt.desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className={css.protoOutput} data-testid="bs-proto-doc">
        <div className={css.poHeader}>
          <span className={css.poLbl}>
            <ClipboardCheck size={11} aria-hidden="true" /> Sanitation baseline
          </span>
        </div>
        <div className={css.poTitle}>Propagation Area Sanitation Standard</div>
        <div className={css.poItems}>
          {docLines.map((line, i) => (
            <div key={i} className={css.poItem}>
              <span className={css.poDot} aria-hidden="true" />
              <span className={css.poText}>{line}</span>
            </div>
          ))}
        </div>
      </div>

      <InterpretationBlock tone="info">
        This protocol document is referenced in every propagation Act task as the
        minimum hygiene standard. Any deviation requires a protocol update and
        re-approval gate.
      </InterpretationBlock>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared sub-component
// ---------------------------------------------------------------------------

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

export default BiosecurityCapture;
