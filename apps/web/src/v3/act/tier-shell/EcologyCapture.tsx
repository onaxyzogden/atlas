/**
 * EcologyCapture -- a multi-mode CONTROLLED capture for objective s2-ecology
 * (5 checklist items c1..c5). Ported from olos_ecology_habitat.html right-hand
 * panels p1..p5. Catalogue item order == mockup panel order (straightforward
 * 1:1):
 *
 *   c1 -> vegetation    (mockup p1: community-type register + % of site)
 *   c2 -> species       (mockup p2: native register + invasive weed register)
 *   c3 -> corridors     (mockup p3: corridor + nesting chip groups + notes)
 *   c4 -> connectivity  (mockup p4: 4-card single-select assessment)
 *   c5 -> waterHabitat  (mockup p5: water-dependent area register)
 *
 * Structure mirrors TerrainCapture / ClimateCapture (the canonical multi-mode
 * captures): an `ecologyModeFor(itemId)` mapper plus a single component that
 * renders ONE mode body. The panel chrome (header / eyebrow / title / hint /
 * feeds / gate-note / Record-Defer footer) is owned by DecisionWorkingPanel --
 * this capture renders ONLY the mode body blocks.
 *
 * IN SCOPE: the 5 universal panels ONLY. The mockup's two type-injected
 * "Orchard / Food Forest" panels (pollinator baseline p6, insectary plan p7)
 * carry the sec-inj-badge injection marker and belong to a separate
 * type-injected objective -- they are NOT part of this universal capture.
 *
 * Each mode persists its OWN keys in the per-item flat FormValue
 * (Record<string, string | string[]>). decode is TOTAL/defensive (non-array ->
 * empty; per-entry try/catch parse for growable lists; coerce bad types to
 * defaults; NEVER fabricate seed data -- the mockup shows seeded demo
 * communities/species/areas, but this capture starts EMPTY).
 *
 * CONTROLLED / pure: the model is always derived from decode(value) each render;
 * the full next model is emitted via onChange(encode(next)). Stable per-entry
 * ids (species rows, water-area rows) are minted by makeRowId() in EVENT
 * HANDLERS ONLY (never in decode/render) and used as React keys (never index).
 *
 * ASCII-only: em-dash -> " -- ", middot -> &middot; entity; all icons are
 * lucide. Apostrophes use double-quoted strings.
 */

import * as React from 'react';
import { ArrowRight, Plus, X } from 'lucide-react';
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
  | 'waterHabitat';

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
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Stable id factory (species + water-area rows). Module-scoped, pure -- no
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

export type SpeciesKind = 'tree' | 'shrub' | 'grass' | 'ground';
export type InvasivePriority = 'high' | 'mod' | 'low';

export interface NativeSpecies {
  id: string;
  scientific: string;
  common: string;
  speciesKind: SpeciesKind;
  abundance: string;
}

export interface InvasiveSpecies {
  id: string;
  name: string;
  scientific: string;
  priority: InvasivePriority;
  distribution: string;
}

export interface SpeciesModel {
  kind: 'species';
  natives: NativeSpecies[];
  invasives: InvasiveSpecies[];
}

export interface CorridorsModel {
  kind: 'corridors';
  corridorTypes: string[];
  nesting: string[];
  notes: string;
}

export type ConnectivityRating = 'connected' | 'partial' | 'fragmented' | 'none';

export interface ConnectivityModel {
  kind: 'connectivity';
  rating: ConnectivityRating | '';
}

export type WaterAreaType = 'creek' | 'dam' | 'wetland' | 'seep' | 'soak';

export interface WaterArea {
  id: string;
  areaType: WaterAreaType;
  name: string;
  description: string;
}

export interface WaterHabitatModel {
  kind: 'waterHabitat';
  areas: WaterArea[];
  nonePresent: boolean;
}

export type EcologyModel =
  | VegetationModel
  | SpeciesModel
  | CorridorsModel
  | ConnectivityModel
  | WaterHabitatModel;

// ---------------------------------------------------------------------------
// Verbatim domain data (copied from the mockup p1..p5)
// ---------------------------------------------------------------------------

interface CommunitySpec {
  key: string;
  label: string;
}
const VEG_COMMUNITIES: readonly CommunitySpec[] = [
  { key: 'cleared', label: 'Cleared / Improved pasture' },
  { key: 'native-grass', label: 'Native grassland / Natural pasture' },
  { key: 'grassy-woodland', label: 'Grassy woodland / Scattered trees' },
  { key: 'riparian', label: 'Riparian / Streamside vegetation' },
  { key: 'dense-woodland', label: 'Dense woodland / Closed canopy' },
  { key: 'shrubland', label: 'Shrubland / Heath' },
  { key: 'wetland', label: 'Wetland / Swamp' },
];
const VEG_COMMUNITY_KEYS = new Set(VEG_COMMUNITIES.map((c) => c.key));

interface SpeciesKindSpec {
  id: SpeciesKind;
  label: string;
}
const SPECIES_KINDS: readonly SpeciesKindSpec[] = [
  { id: 'tree', label: 'Tree' },
  { id: 'shrub', label: 'Shrub' },
  { id: 'grass', label: 'Grass' },
  { id: 'ground', label: 'Groundcover' },
];
const SPECIES_KIND_SET = new Set<string>(SPECIES_KINDS.map((s) => s.id));
const SPECIES_KIND_LABEL: Record<string, string> = Object.fromEntries(
  SPECIES_KINDS.map((s) => [s.id, s.label]),
);

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

interface ChipSpec {
  key: string;
  label: string;
}
const CORRIDOR_TYPES: readonly ChipSpec[] = [
  { key: 'creek-line', label: 'Creek line corridor' },
  { key: 'fence-line', label: 'Fence line trees' },
  { key: 'remnant-strip', label: 'Remnant vegetation strip' },
  { key: 'reveg-corridor', label: 'Revegetation corridor' },
  { key: 'none', label: 'None identified' },
];
const CORRIDOR_TYPE_KEYS = new Set(CORRIDOR_TYPES.map((c) => c.key));

const NESTING_FEATURES: readonly ChipSpec[] = [
  { key: 'tree-hollows', label: 'Tree hollows' },
  { key: 'dense-shrubs', label: 'Dense shrubs' },
  { key: 'fallen-logs', label: 'Fallen logs' },
  { key: 'rock-piles', label: 'Rock piles' },
  { key: 'ground-nesting', label: 'Ground nesting areas' },
];
const NESTING_FEATURE_KEYS = new Set(NESTING_FEATURES.map((n) => n.key));

interface ConnCardSpec {
  id: ConnectivityRating;
  tone: 'sg' | 'st' | 'sa' | 'sr';
  title: string;
  desc: string;
  impl: string;
}
const CONNECTIVITY_CARDS: readonly ConnCardSpec[] = [
  {
    id: 'connected',
    tone: 'sg',
    title: 'Well connected',
    desc: 'Continuous or near-continuous vegetation linking this site to surrounding landscape.',
    impl: 'Restoration will enhance an existing ecological network. Species colonisation likely without active translocation.',
  },
  {
    id: 'partial',
    tone: 'st',
    title: 'Partially connected',
    desc: 'Some corridors exist with gaps. Connectivity is fragmented but functional in places.',
    impl: 'Restoration should prioritise filling corridor gaps. Strategic revegetation linking remnants is the primary design objective.',
  },
  {
    id: 'fragmented',
    tone: 'sa',
    title: 'Fragmented',
    desc: 'Isolated remnants with limited functional connectivity to the broader landscape.',
    impl: 'On-site habitat value is important but the site cannot depend on immigration from outside. All target species must already be present or actively introduced.',
  },
  {
    id: 'none',
    tone: 'sr',
    title: 'No connectivity',
    desc: 'Site is an ecological island surrounded by cleared or heavily developed land.',
    impl: 'Restoration must be fully self-contained. Target biodiversity outcomes must be achievable without landscape connectivity.',
  },
];
const CONNECTIVITY_BY_ID: Record<string, ConnCardSpec> = Object.fromEntries(
  CONNECTIVITY_CARDS.map((c) => [c.id, c]),
);
const CONNECTIVITY_ID_SET = new Set<string>(CONNECTIVITY_CARDS.map((c) => c.id));

interface WaterTypeSpec {
  id: WaterAreaType;
  label: string;
}
const WATER_TYPES: readonly WaterTypeSpec[] = [
  { id: 'creek', label: 'Seasonal creek' },
  { id: 'dam', label: 'Constructed dam' },
  { id: 'wetland', label: 'Wetland / Swamp' },
  { id: 'seep', label: 'Seep / Spring' },
  { id: 'soak', label: 'Soak / Damp flat' },
];
const WATER_TYPE_SET = new Set<string>(WATER_TYPES.map((w) => w.id));
const WATER_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  WATER_TYPES.map((w) => [w.id, w.label]),
);

// ---------------------------------------------------------------------------
// FormValue coercion helpers
// ---------------------------------------------------------------------------

function asArr(v: FormValue[string] | undefined): string[] {
  return Array.isArray(v) ? v : [];
}
function asStr(v: FormValue[string] | undefined): string {
  return typeof v === 'string' ? v : '';
}

// ---------------------------------------------------------------------------
// decode: FormValue -> EcologyModel (TOTAL / defensive; never throws, never
// fabricates seed data).
// ---------------------------------------------------------------------------

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
      const natives: NativeSpecies[] = [];
      let nIndex = 0;
      for (const entry of asArr(value.ecologyNatives)) {
        if (typeof entry !== 'string') {
          nIndex++;
          continue;
        }
        try {
          const parsed: unknown = JSON.parse(entry);
          if (parsed === null || typeof parsed !== 'object') {
            nIndex++;
            continue;
          }
          const p = parsed as {
            id?: unknown;
            scientific?: unknown;
            common?: unknown;
            speciesKind?: unknown;
            abundance?: unknown;
          };
          const speciesKind =
            typeof p.speciesKind === 'string' && SPECIES_KIND_SET.has(p.speciesKind)
              ? (p.speciesKind as SpeciesKind)
              : 'tree';
          const id =
            typeof p.id === 'string' && p.id !== ''
              ? p.id
              : 'legacy-native-' + nIndex;
          natives.push({
            id,
            scientific: typeof p.scientific === 'string' ? p.scientific : '',
            common: typeof p.common === 'string' ? p.common : '',
            speciesKind,
            abundance: typeof p.abundance === 'string' ? p.abundance : '',
          });
        } catch {
          // drop malformed entry
        }
        nIndex++;
      }
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
      return { kind: 'species', natives, invasives };
    }
    case 'corridors': {
      const corridorTypes = asArr(value.ecologyCorridorTypes).filter((c) =>
        CORRIDOR_TYPE_KEYS.has(c),
      );
      const nesting = asArr(value.ecologyNesting).filter((n) =>
        NESTING_FEATURE_KEYS.has(n),
      );
      return {
        kind: 'corridors',
        corridorTypes,
        nesting,
        notes: asStr(value.ecologyNotes),
      };
    }
    case 'connectivity': {
      const rating = asStr(value.ecologyConnectivity);
      return {
        kind: 'connectivity',
        rating: CONNECTIVITY_ID_SET.has(rating)
          ? (rating as ConnectivityRating)
          : '',
      };
    }
    case 'waterHabitat': {
      const areas: WaterArea[] = [];
      let index = 0;
      for (const entry of asArr(value.ecologyWaterAreas)) {
        if (typeof entry !== 'string') {
          index++;
          continue;
        }
        try {
          const parsed: unknown = JSON.parse(entry);
          if (parsed === null || typeof parsed !== 'object') {
            index++;
            continue;
          }
          const p = parsed as {
            id?: unknown;
            areaType?: unknown;
            name?: unknown;
            description?: unknown;
          };
          const areaType =
            typeof p.areaType === 'string' && WATER_TYPE_SET.has(p.areaType)
              ? (p.areaType as WaterAreaType)
              : 'creek';
          const id =
            typeof p.id === 'string' && p.id !== ''
              ? p.id
              : 'legacy-water-' + index;
          areas.push({
            id,
            areaType,
            name: typeof p.name === 'string' ? p.name : '',
            description: typeof p.description === 'string' ? p.description : '',
          });
        } catch {
          // drop malformed entry
        }
        index++;
      }
      return {
        kind: 'waterHabitat',
        areas,
        nonePresent: asStr(value.ecologyWaterNone) === 'true',
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
        ecologyNatives: model.natives.map((n) => JSON.stringify(n)),
        ecologyInvasives: model.invasives.map((i) => JSON.stringify(i)),
      };
    case 'corridors':
      return {
        ecologyCorridorTypes: [...model.corridorTypes],
        ecologyNesting: [...model.nesting],
        ecologyNotes: model.notes,
      };
    case 'connectivity':
      return {
        ecologyConnectivity: model.rating,
      };
    case 'waterHabitat':
      return {
        ecologyWaterAreas: model.areas.map((a) => JSON.stringify(a)),
        ecologyWaterNone: model.nonePresent ? 'true' : 'false',
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
      return model.natives.length + model.invasives.length >= 1;
    case 'corridors':
      return model.corridorTypes.length + model.nesting.length >= 1;
    case 'connectivity':
      return model.rating !== '';
    case 'waterHabitat':
      return model.areas.length >= 1 || model.nonePresent;
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
      const nat = model.natives.length;
      const inv = model.invasives.length;
      return `${nat} native, ${inv} invasive species`;
    }
    case 'corridors': {
      const c = model.corridorTypes.length;
      const nst = model.nesting.length;
      return `${c} corridor(s), ${nst} nesting feature(s)`;
    }
    case 'connectivity': {
      const card = model.rating ? CONNECTIVITY_BY_ID[model.rating] : undefined;
      return card ? card.title : 'No classification';
    }
    case 'waterHabitat': {
      if (model.areas.length === 0 && model.nonePresent) {
        return 'No water-dependent areas present';
      }
      return `${model.areas.length} water-dependent area(s)`;
    }
  }
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

  // ---------- vegetation (p1) ----------
  if (model.kind === 'vegetation') {
    const toggleCommunity = (key: string): void => {
      const next = { ...model.communities };
      if (key in next) {
        delete next[key];
      } else {
        next[key] = '';
      }
      emit({ kind: 'vegetation', communities: next });
    };
    const setPct = (key: string, v: string): void =>
      emit({
        kind: 'vegetation',
        communities: { ...model.communities, [key]: v },
      });

    return (
      <div className={css.root} data-ecology-mode="vegetation">
        <div>
          <div className={css.secLbl}>
            Community types present{' '}
            <span className={css.secOptional}>-- % of site</span>
          </div>
          <div className={css.vegList} data-testid="veg-list">
            {VEG_COMMUNITIES.map((c) => {
              const on = c.key in model.communities;
              return (
                <div
                  key={c.key}
                  className={css.vegRow}
                  data-on={on ? 'true' : 'false'}
                >
                  <button
                    type="button"
                    className={css.vegToggle}
                    data-testid={`veg-${c.key}`}
                    data-on={on ? 'true' : 'false'}
                    aria-pressed={on}
                    onClick={() => toggleCommunity(c.key)}
                  >
                    <span className={css.vegChk} aria-hidden="true" />
                    <span className={css.vegName}>{c.label}</span>
                  </button>
                  <input
                    type="number"
                    className={css.vegPct}
                    data-testid={`veg-pct-${c.key}`}
                    aria-label={`${c.label} percent of site`}
                    value={model.communities[c.key] ?? ''}
                    min={0}
                    max={100}
                    placeholder="0"
                    disabled={!on}
                    onChange={(e) => setPct(c.key, e.target.value)}
                  />
                  <span className={css.vegUnit}>%</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className={css.feedsBlock}>
          <ArrowRight size={13} className={css.feedsIcon} aria-hidden="true" />
          <div className={css.feedsTxt}>
            Vegetation communities feed <strong>Tier 3: Zone allocation</strong>{' '}
            -- identifying where native vegetation should be retained, enhanced,
            or restored as a design priority.
          </div>
        </div>
      </div>
    );
  }

  // ---------- species (p2) ----------
  if (model.kind === 'species') {
    return <SpeciesBody model={model} onChange={emit} />;
  }

  // ---------- corridors (p3) ----------
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
    const setNotes = (v: string): void => emit({ ...model, notes: v });

    return (
      <div className={css.root} data-ecology-mode="corridors">
        <div>
          <div className={css.secLbl}>Corridor types present</div>
          <div className={css.chipGroup} data-testid="corridor-chips">
            {CORRIDOR_TYPES.map((c) => {
              const on = model.corridorTypes.includes(c.key);
              return (
                <button
                  key={c.key}
                  type="button"
                  className={css.selChip}
                  data-testid={`corridor-${c.key}`}
                  data-on={on ? 'true' : 'false'}
                  aria-pressed={on}
                  onClick={() => toggleCorridor(c.key)}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className={css.secLbl}>Nesting &amp; refuge habitat</div>
          <div className={css.chipGroup} data-testid="nesting-chips">
            {NESTING_FEATURES.map((n) => {
              const on = model.nesting.includes(n.key);
              return (
                <button
                  key={n.key}
                  type="button"
                  className={css.selChip}
                  data-testid={`nesting-${n.key}`}
                  data-on={on ? 'true' : 'false'}
                  data-nesting="true"
                  aria-pressed={on}
                  onClick={() => toggleNesting(n.key)}
                >
                  {n.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className={css.secLbl}>Notes on movement patterns</div>
          <textarea
            className={css.textarea}
            data-testid="corridor-notes"
            aria-label="Notes on movement patterns"
            value={model.notes}
            placeholder="Describe any observed movement corridors, seasonal migration, or predator/prey patterns..."
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className={css.feedsBlock}>
          <ArrowRight size={13} className={css.feedsIcon} aria-hidden="true" />
          <div className={css.feedsTxt}>
            Corridors and nesting sites are protected zones in{' '}
            <strong>Tier 3: Spatial framework</strong>. They constrain
            earthworks and planting design in Tier 4.
          </div>
        </div>
      </div>
    );
  }

  // ---------- connectivity (p4) ----------
  if (model.kind === 'connectivity') {
    const pick = (id: ConnectivityRating): void =>
      emit({ kind: 'connectivity', rating: model.rating === id ? '' : id });

    return (
      <div className={css.root} data-ecology-mode="connectivity">
        <div className={css.connCards} data-testid="conn-cards">
          {CONNECTIVITY_CARDS.map((c) => {
            const on = model.rating === c.id;
            return (
              <button
                key={c.id}
                type="button"
                className={css.connCard}
                data-testid={`conn-${c.id}`}
                data-tone={c.tone}
                data-on={on ? 'true' : 'false'}
                aria-pressed={on}
                onClick={() => pick(c.id)}
              >
                <span className={css.connDot} aria-hidden="true" />
                <span className={css.connBody}>
                  <span className={css.connTitle}>{c.title}</span>
                  <span className={css.connDesc}>{c.desc}</span>
                  {on ? <span className={css.connImpl}>{c.impl}</span> : null}
                </span>
              </button>
            );
          })}
        </div>

        <div className={css.feedsBlock}>
          <ArrowRight size={13} className={css.feedsIcon} aria-hidden="true" />
          <div className={css.feedsTxt}>
            Connectivity classification feeds{' '}
            <strong>Tier 3: Revegetation strategy</strong> and determines how
            ambitiously ecological targets can be set.
          </div>
        </div>
      </div>
    );
  }

  // ---------- waterHabitat (p5) ----------
  return <WaterHabitatBody model={model} onChange={emit} />;
}

// ---------------------------------------------------------------------------
// Species body -- two growable registers (natives + invasives). Row id minting
// happens here, in handlers only. UI-only add-form state lives in this body.
// ---------------------------------------------------------------------------

function SpeciesBody({
  model,
  onChange,
}: {
  model: SpeciesModel;
  onChange: (next: SpeciesModel) => void;
}): React.JSX.Element {
  const [nativeOpen, setNativeOpen] = React.useState(false);
  const [nSci, setNSci] = React.useState('');
  const [nCommon, setNCommon] = React.useState('');
  const [nKind, setNKind] = React.useState<SpeciesKind>('tree');
  const [nAbund, setNAbund] = React.useState('');

  const [invasiveOpen, setInvasiveOpen] = React.useState(false);
  const [iName, setIName] = React.useState('');
  const [iSci, setISci] = React.useState('');
  const [iPriority, setIPriority] = React.useState<InvasivePriority>('high');
  const [iDist, setIDist] = React.useState('');

  const resetNative = (): void => {
    setNSci('');
    setNCommon('');
    setNKind('tree');
    setNAbund('');
  };
  const resetInvasive = (): void => {
    setIName('');
    setISci('');
    setIPriority('high');
    setIDist('');
  };

  const addNative = (): void => {
    onChange({
      ...model,
      natives: [
        ...model.natives,
        {
          id: makeRowId(),
          scientific: nSci.trim(),
          common: nCommon.trim(),
          speciesKind: nKind,
          abundance: nAbund.trim(),
        },
      ],
    });
    resetNative();
    setNativeOpen(false);
  };
  const removeNative = (id: string): void =>
    onChange({ ...model, natives: model.natives.filter((n) => n.id !== id) });

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
        <div className={css.secLbl}>Native species -- key indicators</div>
        {model.natives.length === 0 ? (
          <div className={css.spEmpty} data-testid="native-empty">
            No native species recorded yet.
          </div>
        ) : (
          <div className={css.speciesRegister}>
            {model.natives.map((n) => (
              <div key={n.id} className={css.spRow}>
                <span className={css.spName}>
                  <span className={css.spSci}>
                    {n.scientific || "Unnamed species"}
                  </span>
                  {n.common ? (
                    <span className={css.spCommon}>{n.common}</span>
                  ) : null}
                </span>
                <span
                  className={css.spType}
                  data-kind={n.speciesKind}
                >
                  {SPECIES_KIND_LABEL[n.speciesKind] ?? n.speciesKind}
                </span>
                {n.abundance ? (
                  <span className={css.spAbund}>{n.abundance}</span>
                ) : null}
                <button
                  type="button"
                  className={css.spDel}
                  data-testid={`native-remove-${n.id}`}
                  aria-label={`Remove ${n.scientific || "native species"}`}
                  onClick={() => removeNative(n.id)}
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
        {nativeOpen ? (
          <div className={css.addForm} data-testid="native-form">
            <div className={css.afLbl}>Scientific name</div>
            <input
              type="text"
              className={css.afInput}
              data-testid="native-sci"
              aria-label="Native scientific name"
              value={nSci}
              placeholder="e.g. Eucalyptus microcarpa"
              onChange={(e) => setNSci(e.target.value)}
            />
            <div className={css.afLbl}>Common name</div>
            <input
              type="text"
              className={css.afInput}
              data-testid="native-common"
              aria-label="Native common name"
              value={nCommon}
              placeholder="e.g. Grey box"
              onChange={(e) => setNCommon(e.target.value)}
            />
            <div className={css.afGrid}>
              <div>
                <div className={css.afLbl}>Type</div>
                <select
                  className={css.afSelect}
                  data-testid="native-kind"
                  aria-label="Native species type"
                  value={nKind}
                  onChange={(e) => setNKind(e.target.value as SpeciesKind)}
                >
                  {SPECIES_KINDS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className={css.afLbl}>Abundance</div>
                <input
                  type="text"
                  className={css.afInput}
                  data-testid="native-abund"
                  aria-label="Native abundance"
                  value={nAbund}
                  placeholder="e.g. Common"
                  onChange={(e) => setNAbund(e.target.value)}
                />
              </div>
            </div>
            <div className={css.afRow}>
              <button
                type="button"
                className={css.afAdd}
                data-testid="native-add"
                onClick={addNative}
              >
                Add to register
              </button>
              <button
                type="button"
                className={css.afCancel}
                data-testid="native-cancel"
                onClick={() => {
                  resetNative();
                  setNativeOpen(false);
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
            data-testid="native-open"
            onClick={() => setNativeOpen(true)}
          >
            <Plus size={11} aria-hidden="true" /> Add native species
          </button>
        )}
      </div>

      <div className={css.fdiv} aria-hidden="true" />

      <div>
        <div className={css.secLbl}>Invasive species -- weed register</div>
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
              placeholder="e.g. Blackberry"
              onChange={(e) => setIName(e.target.value)}
            />
            <div className={css.afLbl}>Scientific name</div>
            <input
              type="text"
              className={css.afInput}
              data-testid="invasive-sci"
              aria-label="Invasive scientific name"
              value={iSci}
              placeholder="e.g. Rubus fruticosus agg."
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
                  placeholder="e.g. Creek banks, scattered"
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
                Add to register
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

      <div className={css.feedsBlock}>
        <ArrowRight size={13} className={css.feedsIcon} aria-hidden="true" />
        <div className={css.feedsTxt}>
          Each High-priority invasive generates a{' '}
          <strong>weed control Act task</strong>. Native indicator species
          inform <strong>revegetation species selection</strong> in Tier 4.
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Water habitat body -- a growable register of water-dependent areas plus a
// "none present" affirmation. Row id minting happens here, in handlers only.
// ---------------------------------------------------------------------------

function WaterHabitatBody({
  model,
  onChange,
}: {
  model: WaterHabitatModel;
  onChange: (next: WaterHabitatModel) => void;
}): React.JSX.Element {
  const [formOpen, setFormOpen] = React.useState(false);
  const [draftType, setDraftType] = React.useState<WaterAreaType>('creek');
  const [draftName, setDraftName] = React.useState('');
  const [draftDesc, setDraftDesc] = React.useState('');

  const resetForm = (): void => {
    setDraftType('creek');
    setDraftName('');
    setDraftDesc('');
  };

  const addArea = (): void => {
    onChange({
      ...model,
      nonePresent: false,
      areas: [
        ...model.areas,
        {
          id: makeRowId(),
          areaType: draftType,
          name: draftName.trim(),
          description: draftDesc.trim(),
        },
      ],
    });
    resetForm();
    setFormOpen(false);
  };
  const removeArea = (id: string): void =>
    onChange({ ...model, areas: model.areas.filter((a) => a.id !== id) });

  const toggleNone = (): void =>
    onChange({
      ...model,
      nonePresent: !model.nonePresent,
      areas: !model.nonePresent ? [] : model.areas,
    });

  return (
    <div className={css.root} data-ecology-mode="waterHabitat">
      <div>
        <div className={css.secLbl}>Water-dependent areas identified</div>
        {model.areas.length === 0 ? (
          <div className={css.spEmpty} data-testid="water-empty">
            No water-dependent areas registered yet.
          </div>
        ) : (
          <div className={css.waterList}>
            {model.areas.map((a) => (
              <div key={a.id} className={css.waterRow}>
                <div className={css.waterHead}>
                  <span className={css.waterType}>
                    {WATER_TYPE_LABEL[a.areaType] ?? a.areaType}
                  </span>
                  <span className={css.waterName}>
                    {a.name || "Unnamed area"}
                  </span>
                  <button
                    type="button"
                    className={css.spDel}
                    data-testid={`water-remove-${a.id}`}
                    aria-label={`Remove ${a.name || "water area"}`}
                    onClick={() => removeArea(a.id)}
                  >
                    <X size={13} />
                  </button>
                </div>
                {a.description ? (
                  <div className={css.waterDesc}>{a.description}</div>
                ) : null}
              </div>
            ))}
          </div>
        )}
        {formOpen ? (
          <div className={css.addForm} data-testid="water-form">
            <div className={css.afLbl}>Area type</div>
            <select
              className={css.afSelect}
              data-testid="water-type"
              aria-label="Water area type"
              value={draftType}
              onChange={(e) => setDraftType(e.target.value as WaterAreaType)}
            >
              {WATER_TYPES.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label}
                </option>
              ))}
            </select>
            <div className={css.afLbl}>Name or reference</div>
            <input
              type="text"
              className={css.afInput}
              data-testid="water-name"
              aria-label="Water area name"
              value={draftName}
              placeholder="e.g. SE boundary creek line"
              onChange={(e) => setDraftName(e.target.value)}
            />
            <div className={css.afLbl}>Description</div>
            <input
              type="text"
              className={css.afInput}
              data-testid="water-desc"
              aria-label="Water area description"
              value={draftDesc}
              placeholder="e.g. Flows Jun -- Oct, riparian fringe ~8m each side"
              onChange={(e) => setDraftDesc(e.target.value)}
            />
            <div className={css.afRow}>
              <button
                type="button"
                className={css.afAdd}
                data-testid="water-add"
                onClick={addArea}
              >
                Add to register
              </button>
              <button
                type="button"
                className={css.afCancel}
                data-testid="water-cancel"
                onClick={() => {
                  resetForm();
                  setFormOpen(false);
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
            data-testid="water-open"
            onClick={() => setFormOpen(true)}
          >
            <Plus size={11} aria-hidden="true" /> Add water-dependent area
          </button>
        )}
      </div>

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
          <strong>design-sensitive zones</strong> in Tier 3. They become
          exclusion zones for earthworks and intensive land use in Tier 4.
        </div>
      </div>
    </div>
  );
}

export default EcologyCapture;
