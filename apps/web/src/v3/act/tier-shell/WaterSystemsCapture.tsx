/**
 * WaterSystemsCapture -- a 6-mode ADVISORY pure-FormValue capture for the
 * universal objective s4-water-strategy ("A sound, resilient water strategy",
 * 6 checklist items c1..c6). Catalogue item order == mode order:
 *
 *   c1 -> demand     (enterprise + domestic water demand register, base total)
 *   c2 -> sources    (source options evaluated -- bore/rain/dam/municipal)
 *   c3 -> strategy   (primary + backup supply strategy choice)
 *   c4 -> storage    (storage capacity sizing -- autonomy x peak demand)
 *   c5 -> harvesting (water harvesting approach -- keyline/swale/roof/dam)
 *   c6 -> drought    (conservation priorities + 4-tier drought protocol)
 *
 * Structure mirrors SoilImprovementCapture / HusbandryCapture (the canonical
 * advisory multi-mode captures): a `waterSystemsModeFor(itemId)` mapper, the
 * `asStr` FormValue coercion helper, per-mode discriminated-union models,
 * decode/encode (encode is the lossless inverse of decode), is*Valid,
 * summarise*, the props interface, and a single component that renders ONE mode
 * body. Props are {mode, value, onChange, itemId, siblingValues?} -- NO
 * projectId, NO store writes. The panel chrome (eyebrow / title / hint /
 * Record-Defer footer) is owned by the third-column host.
 *
 * CONTROLLED / pure: the model is derived from decode(value) each render; the
 * full next model is emitted via onChange(encode(next)). The capture holds NO
 * local state for PERSISTED values.
 *
 * decode NEVER throws and NEVER fabricates seed data: every text field defaults
 * to EMPTY string (""). This capture is purely advisory -- no covenant gate
 * applies to a water strategy, so every mode is always recordable (isValid ===
 * true for all six).
 *
 * SOURCE: the reference content (enterprise demand register, source evaluation
 * rows, strategy cards, storage sizing, harvesting approaches, drought tiers)
 * is transcribed VERBATIM from the OLOS prototype
 * olos_water_systems_strategy.html (panels p1..p6, the universal base scope).
 * The p7..p10 panels are secondary (Orchard / Silvopasture) injections, NOT
 * part of s4-water-strategy, and are deliberately omitted. Where a base panel
 * forward-references a secondary item (e.g. "items 7 and 9"), that reference is
 * the base panel's own copy and is kept verbatim.
 *
 * ASCII-only: em-dash -> " - "; ">=" / "<=" for the inequality glyphs; "x" for
 * the multiply glyph; "->" for the arrow; "m2" for the squared glyph; "~" for
 * the approx glyph; no smart quotes; apostrophes use double-quoted JS strings.
 */

import * as React from 'react';

import type { FormValue } from './actToolCatalog.js';
import { InterpretationBlock, SectionEyebrow } from './captures/controls/index.js';
import css from './WaterSystemsCapture.module.css';

// ---------------------------------------------------------------------------
// Mode mapper
// ---------------------------------------------------------------------------

export type WaterSystemsMode =
  | 'demand' // c1
  | 'sources' // c2
  | 'strategy' // c3
  | 'storage' // c4
  | 'harvesting' // c5
  | 'drought'; // c6

export const WATER_SYSTEMS_PREFIX = 's4-water-strategy';
const PREFIX_DASH = WATER_SYSTEMS_PREFIX + '-';

export function waterSystemsModeFor(itemId: string): WaterSystemsMode | null {
  if (!itemId.startsWith(PREFIX_DASH)) return null;
  const suffix = itemId.slice(PREFIX_DASH.length);
  switch (suffix) {
    case 'c1':
      return 'demand';
    case 'c2':
      return 'sources';
    case 'c3':
      return 'strategy';
    case 'c4':
      return 'storage';
    case 'c5':
      return 'harvesting';
    case 'c6':
      return 'drought';
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Models (discriminated union by `kind`) -- each mode carries one notes field.
// ---------------------------------------------------------------------------

export interface DemandModel {
  kind: 'demand';
  notes: string;
}
export interface SourcesModel {
  kind: 'sources';
  notes: string;
}
export interface StrategyModel {
  kind: 'strategy';
  notes: string;
}
export interface StorageModel {
  kind: 'storage';
  notes: string;
}
export interface HarvestingModel {
  kind: 'harvesting';
  notes: string;
}
export interface DroughtModel {
  kind: 'drought';
  notes: string;
}

export type WaterSystemsModel =
  | DemandModel
  | SourcesModel
  | StrategyModel
  | StorageModel
  | HarvestingModel
  | DroughtModel;

// ---------------------------------------------------------------------------
// Verbatim constants (from olos_water_systems_strategy.html p1..p6)
// ---------------------------------------------------------------------------

interface DemandRow {
  label: string;
  value: string;
}

// c1 demand -- three enterprise demand rows + the base enterprise total.
const DEMAND_ROWS: readonly DemandRow[] = [
  { label: 'Domestic (household)', value: '800 L/day' },
  { label: 'Market garden (0.5 ha, peak summer)', value: '1,500 L/day' },
  { label: 'Nursery (summer operating days)', value: '320 L/day' },
];
const DEMAND_BASE_TOTAL = '2,620';

type RelTone = 'high' | 'mod' | 'low';

interface SourceRow {
  name: string;
  cap: string;
  relLabel: string;
  relTone: RelTone;
  body: string;
}

// c2 sources -- four source evaluation rows.
const SOURCE_ROWS: readonly SourceRow[] = [
  {
    name: 'Bore / groundwater',
    cap: '5,000 L/day',
    relLabel: 'High reliability',
    relTone: 'high',
    body:
      '80mm bore, submersible pump, pressure tank. Year-round supply. Water quality tested Tier 2 - pH 7.1, EC 0.8 mS/cm, iron elevated but treatable. Licence required for commercial use. Primary candidate for farm water supply.',
  },
  {
    name: 'Rooftop rainwater harvesting',
    cap: '~600 kL/year',
    relLabel: 'Seasonal',
    relTone: 'mod',
    body:
      '4 roof areas, ~600m2 combined. At 600mm annual rainfall with 0.85 coefficient: ~306,000 L/year (840 L/day average). Highly seasonal - 70% falls April-September. Tanks required for dry-season carry-over. Good quality, minimal treatment.',
  },
  {
    name: 'Seasonal creek / dam storage',
    cap: 'Variable',
    relLabel: 'Seasonal',
    relTone: 'mod',
    body:
      'Existing small dam (est. 150 kL capacity at full). Creek flows 3-4 months/year. Dam fills from winter creek flow - can carry limited storage into summer. Not reliable as primary source. Candidate for livestock trough supply via gravity.',
  },
  {
    name: 'Municipal mains water',
    cap: 'Unlimited (metered)',
    relLabel: 'Very high',
    relTone: 'high',
    body:
      'Available at road boundary. Connection cost: ~$8,000-12,000. Ongoing cost: $3.50-5.00/kL (rural commercial rate). High reliability but high cost. Appropriate as emergency backup only - not primary supply for productive enterprises.',
  },
];

interface StrategyCard {
  title: string;
  desc: string;
  selected: boolean;
}

// c3 strategy -- three strategic supply options (first is the selected option).
const STRATEGY_CARDS: readonly StrategyCard[] = [
  {
    title:
      'Bore primary - rainwater harvesting + dam secondary - municipal emergency',
    desc:
      'Bore supplies all year-round demand; rainwater and dam supplement in wet season and reduce bore pumping; municipal as emergency backup only. Best balance of cost, reliability and sovereignty.',
    selected: true,
  },
  {
    title: 'Rainwater + dam primary - bore backup',
    desc:
      'Maximise on-site water harvesting with storage-first approach. Bore as reliable backup when harvested supply depleted. Appropriate if bore licence is restricted or bore performance declines in dry seasons.',
    selected: false,
  },
  {
    title: 'Bore primary - municipal primary backup',
    desc:
      'Reliable dual-supply arrangement. Higher ongoing cost from mains water in drought periods. Appropriate if on-site harvesting infrastructure is not yet in place.',
    selected: false,
  },
];

interface StorageInput {
  label: string;
  value: string;
}

// c4 storage -- sizing inputs, result, existing + gap rows.
const STORAGE_INPUTS: readonly StorageInput[] = [
  { label: 'Peak daily demand (all enterprises)', value: '3,941 L/day' },
  { label: 'Required autonomy period', value: '60 days' },
  { label: 'Storage utilisation factor', value: '0.8 of vol.' },
];
const STORAGE_RESULT = '295,575';
const STORAGE_RESULT_NOTE =
  '~296 kL | 3 x 100,000 L polyethylene tanks recommended';
const STORAGE_EXISTING = '150,000 L';
const STORAGE_GAP = '~146,000 L';
const STORAGE_GAP_NOTE =
  '~146 kL of additional storage needed. Options: 2 x 75,000 L poly tanks (concrete pad required), expanded dam capacity (earthworks in wet season), or combination. Tier 4 infrastructure design.';

interface HarvestCard {
  title: string;
  desc: string;
  selected: boolean;
}

// c5 harvesting -- four harvesting approaches (first three selected).
const HARVEST_CARDS: readonly HarvestCard[] = [
  {
    title: 'Keyline pattern cultivation',
    desc:
      'Subsoiling on keyline (slightly off-contour) to move water from valleys toward ridgelines. Maximises infiltration across the whole land area. Requires tractor-mounted keyline plough. Highest landscape-scale water retention method.',
    selected: true,
  },
  {
    title: 'Swales on contour',
    desc:
      'Level-sill earthwork channels across slope. Appropriate in orchard and food forest zones to direct and slow water movement. Design in Tier 4 with survey-accurate contour mapping.',
    selected: true,
  },
  {
    title: 'Rooftop collection into storage tanks',
    desc:
      '~600m2 roof area, 600mm annual rainfall, 0.85 coefficient -> ~306,000 L/year. First-flush diversion essential. Most cost-effective for potable quality supplemental supply.',
    selected: true,
  },
  {
    title: 'Dam / earthwork water storage',
    desc:
      'Existing small dam - clean and raise embankment to increase capacity. Gravity feed to livestock troughs and lower zones. Permit required for dams above a defined storage volume.',
    selected: false,
  },
];

type DroughtTone = 'normal' | 'alert' | 'restriction' | 'emergency';

interface DroughtTier {
  level: string;
  name: string;
  body: string;
  tone: DroughtTone;
}

// c6 drought -- four-tier drought response protocol.
const DROUGHT_TIERS: readonly DroughtTier[] = [
  {
    level: 'Tier 1 - Normal',
    name: 'Full operation',
    body:
      'Dam >= 60% capacity and bore performing normally. All enterprises at full water allocation. No restrictions.',
    tone: 'normal',
  },
  {
    level: 'Tier 2 - Alert',
    name: 'Efficiency mode',
    body:
      'Dam 40-60% or rainfall 25% below monthly average. Market garden irrigation reduced to high-value beds only. Mulch all bare soil immediately. Monitor bore performance weekly. Nursery reduced to essential stock.',
    tone: 'alert',
  },
  {
    level: 'Tier 3 - Restriction',
    name: 'Essentials only',
    body:
      'Dam <= 40% or bore output declining. Domestic + essential seedling nursery + perennial tree establishment + livestock stock water only. Suspend market garden irrigation - rely on soil moisture only. Establish emergency municipal connection if not already done.',
    tone: 'restriction',
  },
  {
    level: 'Tier 4 - Emergency',
    name: 'Stock water priority',
    body:
      'Dam <= 20% or bore failure. Domestic + livestock stock water only. All other uses suspended. Begin destocking assessment if bore failure is sustained beyond 7 days. Municipal water as primary supply until bore is restored.',
    tone: 'emergency',
  },
];

// ---------------------------------------------------------------------------
// FormValue coercion helper (mirror Soil / Husbandry / Livestock convention)
// ---------------------------------------------------------------------------

function asStr(v: FormValue[string] | undefined): string {
  return typeof v === 'string' ? v : '';
}

// ---------------------------------------------------------------------------
// decode: FormValue -> WaterSystemsModel (TOTAL / defensive; never throws /
// fabricates seed data)
// ---------------------------------------------------------------------------

export function decodeWaterSystems(
  mode: WaterSystemsMode,
  value: FormValue,
): WaterSystemsModel {
  switch (mode) {
    case 'demand':
      return { kind: 'demand', notes: asStr(value.wtDemandNotes) };
    case 'sources':
      return { kind: 'sources', notes: asStr(value.wtSourcesNotes) };
    case 'strategy':
      return { kind: 'strategy', notes: asStr(value.wtStrategyNotes) };
    case 'storage':
      return { kind: 'storage', notes: asStr(value.wtStorageNotes) };
    case 'harvesting':
      return { kind: 'harvesting', notes: asStr(value.wtHarvestingNotes) };
    case 'drought':
      return { kind: 'drought', notes: asStr(value.wtDroughtNotes) };
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown WaterSystemsMode: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// encode: WaterSystemsModel -> FormValue (lossless inverse of decode)
// ---------------------------------------------------------------------------

export function encodeWaterSystems(
  _mode: WaterSystemsMode,
  model: WaterSystemsModel,
): FormValue {
  switch (model.kind) {
    case 'demand':
      return { wtDemandNotes: model.notes };
    case 'sources':
      return { wtSourcesNotes: model.notes };
    case 'strategy':
      return { wtStrategyNotes: model.notes };
    case 'storage':
      return { wtStorageNotes: model.notes };
    case 'harvesting':
      return { wtHarvestingNotes: model.notes };
    case 'drought':
      return { wtDroughtNotes: model.notes };
    default: {
      const _exhaustive: never = model;
      throw new Error(`Unknown WaterSystemsModel kind: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// validity gates (advisory: every mode is always recordable -- no covenant gate
// applies to a water strategy)
// ---------------------------------------------------------------------------

export function isWaterSystemsValid(
  _mode: WaterSystemsMode,
  _value: FormValue,
): boolean {
  return true;
}

// ---------------------------------------------------------------------------
// summaries (one line per mode; defensive)
// ---------------------------------------------------------------------------

export function summariseWaterSystems(
  mode: WaterSystemsMode,
  _value: FormValue,
): string {
  switch (mode) {
    case 'demand':
      return 'Enterprise water demand assessed (base 2,620 L/day)';
    case 'sources':
      return 'Water source options evaluated (4 sources)';
    case 'strategy':
      return 'Primary and backup supply strategy selected';
    case 'storage':
      return 'Storage capacity requirement defined';
    case 'harvesting':
      return 'Water harvesting approach selected';
    case 'drought':
      return 'Conservation priorities and drought protocol defined';
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown WaterSystemsMode: ${String(_exhaustive)}`);
    }
  }
}

// ===========================================================================
// React component + 6 mode bodies (c1..c6)
// ===========================================================================

export interface WaterSystemsCaptureProps {
  mode: WaterSystemsMode;
  value: FormValue;
  onChange: (next: FormValue) => void;
  /** this capture's own checklist item id (e.g. s4-water-strategy-c1). */
  itemId: string;
  /** full per-item FormValue map (unused -- no mode reads siblings here). */
  siblingValues?: Record<string, FormValue>;
}

function FeedsNote({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className={css.feedsBlock}>
      <div className={css.feedsTxt}>{children}</div>
    </div>
  );
}

function NotesField({
  id,
  label,
  placeholder,
  value,
  onChange,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (next: string) => void;
}): React.JSX.Element {
  return (
    <div>
      <label className={css.fieldLbl} htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        className={css.notesArea}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

export function WaterSystemsCapture({
  mode,
  value,
  onChange,
  itemId,
  siblingValues = {},
}: WaterSystemsCaptureProps): React.JSX.Element {
  void itemId;
  void siblingValues;

  // -- c1: demand ----------------------------------------------------------
  if (mode === 'demand') {
    const model = decodeWaterSystems('demand', value) as DemandModel;
    return (
      <div className={css.root} data-wt-mode="demand">
        <div>
          <SectionEyebrow>Enterprise demand register</SectionEyebrow>
          <div className={css.demandList}>
            {DEMAND_ROWS.map((r) => (
              <div key={r.label} className={css.demandRow}>
                <span className={css.demandLbl}>{r.label}</span>
                <span className={css.demandVal}>{r.value}</span>
              </div>
            ))}
            <div className={css.resultBox}>
              <span className={css.resultLbl}>Base enterprise demand</span>
              <span className={css.resultVal}>{DEMAND_BASE_TOTAL} L/day</span>
            </div>
          </div>
        </div>
        <InterpretationBlock tone="info">
          Livestock and perennial irrigation demands will be added to this total by
          secondary items 7 and 9. Record those decisions to see the complete farm
          water balance.
        </InterpretationBlock>
        <FeedsNote>
          Total demand feeds the <strong>storage calculation</strong> (item 4) and the{' '}
          <strong>live water balance panel</strong> in the centre column.
        </FeedsNote>
        <NotesField
          id="wt-demand-notes"
          label="Water demand notes"
          placeholder="Enterprise mix adjustments, seasonal peaks, measured vs estimated demand..."
          value={model.notes}
          onChange={(next) =>
            onChange(encodeWaterSystems('demand', { kind: 'demand', notes: next }))
          }
        />
      </div>
    );
  }

  // -- c2: sources ---------------------------------------------------------
  if (mode === 'sources') {
    const model = decodeWaterSystems('sources', value) as SourcesModel;
    return (
      <div className={css.root} data-wt-mode="sources">
        <div>
          <SectionEyebrow>Water source options</SectionEyebrow>
          <div className={css.srcList}>
            {SOURCE_ROWS.map((s) => (
              <div key={s.name} className={css.srcRow}>
                <div className={css.srcHead}>
                  <span className={css.srcName}>{s.name}</span>
                  <span className={css.srcCap}>{s.cap}</span>
                  <span className={`${css.srcRel} ${css[`rel_${s.relTone}`]}`}>
                    {s.relLabel}
                  </span>
                </div>
                <div className={css.srcBody}>{s.body}</div>
              </div>
            ))}
          </div>
        </div>
        <FeedsNote>
          Source evaluation feeds the <strong>primary/backup strategy</strong> (item 3).
          Bore is the clear primary; rainwater harvesting + dam are secondary; municipal
          is emergency backup only.
        </FeedsNote>
        <NotesField
          id="wt-sources-notes"
          label="Source evaluation notes"
          placeholder="Bore licence status, water-quality test results, source-specific risks..."
          value={model.notes}
          onChange={(next) =>
            onChange(encodeWaterSystems('sources', { kind: 'sources', notes: next }))
          }
        />
      </div>
    );
  }

  // -- c3: strategy --------------------------------------------------------
  if (mode === 'strategy') {
    const model = decodeWaterSystems('strategy', value) as StrategyModel;
    return (
      <div className={css.root} data-wt-mode="strategy">
        <div>
          <SectionEyebrow>Primary and backup supply strategy</SectionEyebrow>
          <div className={css.stratList}>
            {STRATEGY_CARDS.map((c) => (
              <div
                key={c.title}
                className={`${css.stratCard} ${c.selected ? css.stratCardSel : ''}`}
              >
                <div className={css.stratTitle}>{c.title}</div>
                <div className={css.stratDesc}>{c.desc}</div>
              </div>
            ))}
          </div>
        </div>
        <FeedsNote>
          Primary strategy informs the <strong>storage sizing</strong> (item 4) - a
          bore-primary strategy requires less storage than a harvesting-primary strategy.
        </FeedsNote>
        <NotesField
          id="wt-strategy-notes"
          label="Supply strategy notes"
          placeholder="Selected hierarchy, licence dependencies, sovereignty considerations..."
          value={model.notes}
          onChange={(next) =>
            onChange(encodeWaterSystems('strategy', { kind: 'strategy', notes: next }))
          }
        />
      </div>
    );
  }

  // -- c4: storage ---------------------------------------------------------
  if (mode === 'storage') {
    const model = decodeWaterSystems('storage', value) as StorageModel;
    return (
      <div className={css.root} data-wt-mode="storage">
        <div>
          <SectionEyebrow>Storage sizing</SectionEyebrow>
          <div className={css.dataList}>
            {STORAGE_INPUTS.map((r) => (
              <div key={r.label} className={css.dataRow}>
                <span className={css.drLbl}>{r.label}</span>
                <span className={css.drVal}>{r.value}</span>
              </div>
            ))}
            <div className={css.resultBox}>
              <span className={css.resultLbl}>Required storage capacity</span>
              <span className={css.resultVal}>{STORAGE_RESULT} L</span>
            </div>
            <div className={css.resultSub}>{STORAGE_RESULT_NOTE}</div>
            <div className={css.dataRow}>
              <span className={css.drLbl}>Existing: small dam (est. 150 kL)</span>
              <span className={css.drValAccent}>{STORAGE_EXISTING}</span>
            </div>
            <div className={css.dataRow}>
              <span className={css.drLbl}>Gap (additional storage required)</span>
              <span className={css.drValGap}>{STORAGE_GAP}</span>
            </div>
          </div>
        </div>
        <InterpretationBlock tone="warn">{STORAGE_GAP_NOTE}</InterpretationBlock>
        <FeedsNote>
          Storage shortfall becomes a <strong>Tier 4 infrastructure Act task</strong>. The
          peak daily demand figure here uses the secondary-inclusive total (3,941 L/day) -
          this is only accurate after items 7 and 9 are completed.
        </FeedsNote>
        <NotesField
          id="wt-storage-notes"
          label="Storage notes"
          placeholder="Tank vs dam trade-off, autonomy assumptions, infrastructure costings..."
          value={model.notes}
          onChange={(next) =>
            onChange(encodeWaterSystems('storage', { kind: 'storage', notes: next }))
          }
        />
      </div>
    );
  }

  // -- c5: harvesting ------------------------------------------------------
  if (mode === 'harvesting') {
    const model = decodeWaterSystems('harvesting', value) as HarvestingModel;
    return (
      <div className={css.root} data-wt-mode="harvesting">
        <div>
          <SectionEyebrow>Water harvesting approach</SectionEyebrow>
          <div className={css.stratList}>
            {HARVEST_CARDS.map((c) => (
              <div
                key={c.title}
                className={`${css.stratCard} ${c.selected ? css.stratCardSel : ''}`}
              >
                <div className={css.stratTitle}>{c.title}</div>
                <div className={css.stratDesc}>{c.desc}</div>
              </div>
            ))}
          </div>
        </div>
        <FeedsNote>
          Selected harvesting approaches feed <strong>Tier 3 spatial design</strong>{' '}
          (swale placement, keyline ripping schedule) and{' '}
          <strong>Tier 4 infrastructure design</strong> (tank specifications, dam works).
        </FeedsNote>
        <NotesField
          id="wt-harvesting-notes"
          label="Harvesting notes"
          placeholder="Terrain-matched approaches, permit requirements, design sequencing..."
          value={model.notes}
          onChange={(next) =>
            onChange(
              encodeWaterSystems('harvesting', { kind: 'harvesting', notes: next }),
            )
          }
        />
      </div>
    );
  }

  // -- c6: drought ---------------------------------------------------------
  const model = decodeWaterSystems('drought', value) as DroughtModel;
  return (
    <div className={css.root} data-wt-mode="drought">
      <div>
        <SectionEyebrow>4-tier drought response</SectionEyebrow>
        <div className={css.droughtList}>
          {DROUGHT_TIERS.map((t) => (
            <div key={t.level} className={`${css.droughtTier} ${css[`drought_${t.tone}`]}`}>
              <div className={css.dtHead}>
                <span className={css.dtLevel}>{t.level}</span>
                <span className={css.dtName}>{t.name}</span>
              </div>
              <div className={css.dtBody}>{t.body}</div>
            </div>
          ))}
        </div>
      </div>
      <FeedsNote>
        Drought tiers become <strong>Observe-layer monitoring thresholds</strong> - dam
        level and bore yield are recorded in the Observe stage and trigger automatic tier
        notifications when thresholds are crossed.
      </FeedsNote>
      <NotesField
        id="wt-drought-notes"
        label="Drought protocol notes"
        placeholder="Threshold confirmation, priority-of-use rules, community review status..."
        value={model.notes}
        onChange={(next) =>
          onChange(encodeWaterSystems('drought', { kind: 'drought', notes: next }))
        }
      />
    </div>
  );
}

export default WaterSystemsCapture;
