/**
 * SoilImprovementCapture -- a 5-mode ADVISORY pure-FormValue capture for the
 * universal objective s5-soil-improvement ("A sound soil improvement strategy",
 * 5 checklist items c1..c5). Catalogue item order == mode order:
 *
 *   c1 -> fertility  (zone-by-zone fertility programme -- compost/mulch/cover)
 *   c2 -> schedule   (application rates and timing per zone)
 *   c3 -> equipment  (machinery and equipment requirements -- have/hire/buy)
 *   c4 -> priority   (priority zones for first-cycle improvement, ranked)
 *   c5 -> baseline   (soil health monitoring baseline + 5-year targets)
 *
 * Structure mirrors HusbandryCapture / LivestockIntentCapture (the canonical
 * advisory multi-mode captures): a `soilImprovementModeFor(itemId)` mapper, the
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
 * applies to soil fertility, so every mode is always recordable (isValid ===
 * true for all five).
 *
 * SOURCE: the reference content (zone programmes, application table, equipment,
 * priority ranking, baseline table) is transcribed VERBATIM from the OLOS
 * prototype olos_soil_fertility_programme.html (panels p1..p5, the universal
 * base scope). The p6..p9 panels are secondary (Orchard / Silvopasture)
 * injections, NOT part of s5-soil-improvement, and are deliberately omitted.
 *
 * ASCII-only: em-dash -> " - "; no smart quotes; apostrophes use double-quoted
 * JS strings.
 */

import * as React from 'react';

import type { FormValue } from './actToolCatalog.js';
import { InterpretationBlock, SectionEyebrow } from './captures/controls/index.js';
import css from './SoilImprovementCapture.module.css';

// ---------------------------------------------------------------------------
// Mode mapper
// ---------------------------------------------------------------------------

export type SoilImprovementMode =
  | 'fertility' // c1
  | 'schedule' // c2
  | 'equipment' // c3
  | 'priority' // c4
  | 'baseline'; // c5

export const SOIL_IMPROVEMENT_PREFIX = 's5-soil-improvement';
const PREFIX_DASH = SOIL_IMPROVEMENT_PREFIX + '-';

export function soilImprovementModeFor(itemId: string): SoilImprovementMode | null {
  if (!itemId.startsWith(PREFIX_DASH)) return null;
  const suffix = itemId.slice(PREFIX_DASH.length);
  switch (suffix) {
    case 'c1':
      return 'fertility';
    case 'c2':
      return 'schedule';
    case 'c3':
      return 'equipment';
    case 'c4':
      return 'priority';
    case 'c5':
      return 'baseline';
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Models (discriminated union by `kind`) -- each mode carries one notes field.
// ---------------------------------------------------------------------------

export interface FertilityModel {
  kind: 'fertility';
  notes: string;
}
export interface ScheduleModel {
  kind: 'schedule';
  notes: string;
}
export interface EquipmentModel {
  kind: 'equipment';
  notes: string;
}
export interface PriorityModel {
  kind: 'priority';
  notes: string;
}
export interface BaselineModel {
  kind: 'baseline';
  notes: string;
}

export type SoilImprovementModel =
  | FertilityModel
  | ScheduleModel
  | EquipmentModel
  | PriorityModel
  | BaselineModel;

// ---------------------------------------------------------------------------
// Verbatim constants (from olos_soil_fertility_programme.html p1..p5)
// ---------------------------------------------------------------------------

type ZoneTone = 'intensive' | 'moderate' | 'minimal' | 'none';

interface ZoneMethod {
  label: string;
  text: string;
}
interface ZoneProgramme {
  code: string;
  name: string;
  intensity: string;
  tone: ZoneTone;
  methods: readonly ZoneMethod[];
}

// c1 fertility -- five zone programmes (Z1..Z5).
const ZONE_PROGRAMMES: readonly ZoneProgramme[] = [
  {
    code: 'Z1',
    name: 'Market garden',
    intensity: 'Intensive',
    tone: 'intensive',
    methods: [
      {
        label: 'Compost',
        text:
          'On-site thermophilic compost, 3-5cm surface layer. Pre-season incorporation + annual topdress. ~30t/ha equivalent. Worm castings in seedling beds.',
      },
      {
        label: 'Mulch',
        text:
          'Straw mulch between crops during growing season. 5cm depth. Source: local hay supplier or farm-baled.',
      },
      {
        label: 'Cover crops',
        text:
          'Winter: rye/vetch blend for nitrogen + biomass. Pre-season: mustard biofumigant to suppress soil-borne pathogens. Terminated before planting.',
      },
    ],
  },
  {
    code: 'Z2',
    name: 'Food forest under-storey',
    intensity: 'Moderate',
    tone: 'moderate',
    methods: [
      {
        label: 'Compost',
        text:
          'Annual topdress under canopy plants, 3cm layer. From on-site compost surplus (98% of production goes here - see growing media surface).',
      },
      {
        label: 'Mulch',
        text:
          'Arborist wood chip for paths and bare areas. 10cm depth once established. Refreshed as needed.',
      },
      {
        label: 'Accumulators',
        text:
          'Dynamic accumulators (comfrey, yarrow, borage) allowed to naturalize and self-mulch. Chop and drop biomass returns nutrients in situ.',
      },
    ],
  },
  {
    code: 'Z3',
    name: 'Orchard / silvopasture zone',
    intensity: 'Moderate',
    tone: 'moderate',
    methods: [
      {
        label: 'Pre-plant',
        text:
          'One-time deep ripping + organic matter incorporation before tree planting. See item 6 for full specification.',
      },
      {
        label: 'Ongoing',
        text:
          'Mulch rings under trees, compost topdress, living mulch between rows. Sheep manure return from silvopasture. See item 7.',
      },
    ],
  },
  {
    code: 'Z4',
    name: 'Extensive silvopasture',
    intensity: 'Minimal',
    tone: 'minimal',
    methods: [
      {
        label: 'Legumes',
        text:
          'Oversowing with subterranean clover + annual medics (nitrogen-fixing) in north paddock (priority zone). Autumn broadcast seeding. 15-20 kg/ha blend.',
      },
      {
        label: 'Lime',
        text:
          'If soil pH drops below 5.5 - dolomite lime at 1-2t/ha. Check Zone 4 pH annually in Observe layer.',
      },
      {
        label: 'Manure',
        text:
          'Sheep manure return during grazing - self-fertilising system. No external inputs beyond oversowing.',
      },
    ],
  },
  {
    code: 'Z5',
    name: 'Conservation',
    intensity: 'None',
    tone: 'none',
    methods: [
      {
        label: 'Approach',
        text:
          'Zero inputs. Natural fertility cycling through leaf litter, deadwood, and creek nutrient deposition. Management = restraint.',
      },
    ],
  },
];

type ScheduleTone = 'intensive' | 'moderate' | 'minimal';

interface ApplicationRow {
  zone: string;
  tone: ScheduleTone;
  input: string;
  rate: string;
  timing: string;
}

// c2 schedule -- nine application rows.
const APPLICATION_ROWS: readonly ApplicationRow[] = [
  { zone: 'Z1', tone: 'intensive', input: 'On-site compost (topdress)', rate: '30 t/ha', timing: 'Pre-season x2' },
  { zone: 'Z1', tone: 'intensive', input: 'Straw mulch', rate: '5 t/ha', timing: 'After planting' },
  { zone: 'Z1', tone: 'intensive', input: 'Cover crop seed (rye/vetch)', rate: '60 kg/ha', timing: 'April-May' },
  { zone: 'Z2', tone: 'moderate', input: 'Compost topdress', rate: '3 cm layer', timing: 'Autumn' },
  { zone: 'Z2', tone: 'moderate', input: 'Wood chip mulch', rate: '10 cm depth', timing: 'Establish + refresh' },
  { zone: 'Z3', tone: 'moderate', input: 'Compost per tree', rate: '3-5 L/tree', timing: 'Spring' },
  { zone: 'Z3', tone: 'moderate', input: 'Mulch rings (wood chip)', rate: '1.5m radius, 15cm', timing: 'Establish + refresh' },
  { zone: 'Z4', tone: 'minimal', input: 'Legume oversowing', rate: '18 kg/ha', timing: 'Autumn (April)' },
  { zone: 'Z4', tone: 'minimal', input: 'Dolomite lime (if needed)', rate: '1.5 t/ha', timing: 'Autumn, pH-triggered' },
];

type EquipTone = 'have' | 'hire' | 'buy';

interface EquipmentItem {
  title: string;
  detail: string;
  status: string;
  tone: EquipTone;
}

// c3 equipment -- five equipment rows.
const EQUIPMENT_ITEMS: readonly EquipmentItem[] = [
  {
    title: 'Tractor (compact utility, 30-50 hp)',
    detail:
      'Zone 4 lime spreading, Zone 3 pre-plant subsoiling (tow implement), Zone 2-3 wood chip hauling. Existing on-site or hire from neighbour for specific operations.',
    status: 'Hire/existing',
    tone: 'hire',
  },
  {
    title: 'Subsoiler / deep ripper',
    detail:
      'One-time operation before orchard planting in Zone 3. Rip to 50-60cm depth. Contract operator or hire implement for 1-day pass across 3 ha. Critical - do not skip this step if Zone 3 has compaction from previous cattle use.',
    status: 'Contract',
    tone: 'hire',
  },
  {
    title: 'Small broadcast seeder (1-2m)',
    detail:
      'Zone 1 cover crop seeding and Zone 4 legume oversowing. 3-point linkage or standalone. Purchase or share with neighbouring farm.',
    status: 'Purchase',
    tone: 'buy',
  },
  {
    title: 'Broadfork / soil aerator',
    detail:
      'Zone 1 market garden bed preparation - non-cultivating soil loosening to 30cm. No tractor needed. Low-cost, long-lasting tool. Also used under orchard tree drip lines if compaction develops.',
    status: 'Purchase',
    tone: 'buy',
  },
  {
    title: 'Ute / trailer for compost and mulch',
    detail:
      'Distribution of compost and wood chip within zones. Existing vehicle + trailer adequate for small loads. Larger deliveries (wood chip, straw) arranged as bulk drops.',
    status: 'Available',
    tone: 'have',
  },
];

type PriorityTone = 'go' | 'info' | 'defer' | 'later';

interface PriorityZone {
  rank: string;
  name: string;
  rationale: string;
  target: string;
  tone: PriorityTone;
}

// c4 priority -- four ranked zones.
const PRIORITY_ZONES: readonly PriorityZone[] = [
  {
    rank: '1',
    name: 'Zone 1 - Market garden (0.5 ha)',
    rationale:
      'Immediate productivity need. Planting starts in Cycle 1. Soil improvement must be complete before first crop - no deferred option.',
    target:
      'Target: OM 2.8% -> 4.0% over 2 years - pH maintain 6.4 - intensive compost + cover crop programme',
    tone: 'go',
  },
  {
    rank: '2',
    name: 'Zone 3 - Orchard pre-plant (3 ha)',
    rationale:
      'One-time opportunity: pre-plant soil preparation is the single highest-leverage soil investment. A compaction layer not broken before planting will limit tree roots for decades.',
    target:
      'Action: deep ripping + compost incorporation before first tree planted - non-negotiable',
    tone: 'info',
  },
  {
    rank: '3',
    name: 'Zone 4 North - Native pasture (12 ha, Fair condition)',
    rationale:
      'The binding constraint on flock expansion. North paddock at 3 DSE/ha limits total capacity to 122.6 DSE - only 2.1 DSE above the designed flock. Improvement to Good condition (+1.5 DSE/ha) would add 18 DSE capacity.',
    target:
      'Cycle 2 priority: oversow with legumes in Autumn Year 2 - monitor recovery with NDVI or visual condition scoring',
    tone: 'defer',
  },
  {
    rank: '4',
    name: 'Zone 2 - Food forest under-storey',
    rationale:
      'Will improve naturally as Zone 3 food forest matures and provides leaf litter, root activity, and biological cycling. Minimal intervention needed in Cycle 1.',
    target: 'Cycle 2: establish compost topdress programme once canopy begins closing',
    tone: 'later',
  },
];

interface BaselineRow {
  indicator: string;
  isTarget: boolean;
  z1: string;
  z3: string;
  z4n: string;
}

// c5 baseline -- six monitoring rows (current + 5-year targets).
const BASELINE_ROWS: readonly BaselineRow[] = [
  { indicator: 'Organic matter %', isTarget: false, z1: '2.8%', z3: '1.9%', z4n: '1.8%' },
  { indicator: 'Target (5-yr)', isTarget: true, z1: '4.0%', z3: '3.0%', z4n: '2.5%' },
  { indicator: 'Soil pH', isTarget: false, z1: '6.4', z3: '6.2', z4n: '6.0' },
  { indicator: 'Target pH', isTarget: true, z1: '6.2-6.8', z3: '6.0-6.8', z4n: '6.0-6.5' },
  { indicator: 'Ground cover %', isTarget: false, z1: 'N/A', z3: 'N/A', z4n: '68%' },
  { indicator: 'Target ground cover', isTarget: true, z1: '-', z3: '-', z4n: '>80%' },
];

const BASELINE_REF = 'Year 0 data from: soil profile survey (Tier 2)';
const BASELINE_METHOD =
  'Annual monitoring method: spot soil test (3 composite samples per zone) + visual ground cover assessment + worm count per zone (5 x 30cm cube, count per cube). Record in Observe layer at same time each year (April - post-summer rest, pre-winter growth).';

// ---------------------------------------------------------------------------
// FormValue coercion helper (mirror Husbandry / Livestock convention)
// ---------------------------------------------------------------------------

function asStr(v: FormValue[string] | undefined): string {
  return typeof v === 'string' ? v : '';
}

// ---------------------------------------------------------------------------
// decode: FormValue -> SoilImprovementModel (TOTAL / defensive; never throws /
// fabricates seed data)
// ---------------------------------------------------------------------------

export function decodeSoilImprovement(
  mode: SoilImprovementMode,
  value: FormValue,
): SoilImprovementModel {
  switch (mode) {
    case 'fertility':
      return { kind: 'fertility', notes: asStr(value.siFertilityNotes) };
    case 'schedule':
      return { kind: 'schedule', notes: asStr(value.siScheduleNotes) };
    case 'equipment':
      return { kind: 'equipment', notes: asStr(value.siEquipmentNotes) };
    case 'priority':
      return { kind: 'priority', notes: asStr(value.siPriorityNotes) };
    case 'baseline':
      return { kind: 'baseline', notes: asStr(value.siBaselineNotes) };
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown SoilImprovementMode: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// encode: SoilImprovementModel -> FormValue (lossless inverse of decode)
// ---------------------------------------------------------------------------

export function encodeSoilImprovement(
  _mode: SoilImprovementMode,
  model: SoilImprovementModel,
): FormValue {
  switch (model.kind) {
    case 'fertility':
      return { siFertilityNotes: model.notes };
    case 'schedule':
      return { siScheduleNotes: model.notes };
    case 'equipment':
      return { siEquipmentNotes: model.notes };
    case 'priority':
      return { siPriorityNotes: model.notes };
    case 'baseline':
      return { siBaselineNotes: model.notes };
    default: {
      const _exhaustive: never = model;
      throw new Error(`Unknown SoilImprovementModel kind: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// validity gates (advisory: every mode is always recordable -- no covenant gate
// applies to soil fertility)
// ---------------------------------------------------------------------------

export function isSoilImprovementValid(
  _mode: SoilImprovementMode,
  _value: FormValue,
): boolean {
  return true;
}

// ---------------------------------------------------------------------------
// summaries (one line per mode; defensive)
// ---------------------------------------------------------------------------

export function summariseSoilImprovement(
  mode: SoilImprovementMode,
  value: FormValue,
): string {
  switch (mode) {
    case 'fertility':
      return 'Zone fertility programme defined (5 zones)';
    case 'schedule':
      return 'Application rates and timing specified per zone';
    case 'equipment':
      return 'Machinery and equipment requirements defined';
    case 'priority': {
      void value;
      return 'Priority zones ranked for first-cycle improvement';
    }
    case 'baseline':
      return 'Soil health monitoring baseline established';
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown SoilImprovementMode: ${String(_exhaustive)}`);
    }
  }
}

// ===========================================================================
// React component + 5 mode bodies (c1..c5)
// ===========================================================================

export interface SoilImprovementCaptureProps {
  mode: SoilImprovementMode;
  value: FormValue;
  onChange: (next: FormValue) => void;
  /** this capture's own checklist item id (e.g. s5-soil-improvement-c1). */
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

export function SoilImprovementCapture({
  mode,
  value,
  onChange,
  itemId,
  siblingValues = {},
}: SoilImprovementCaptureProps): React.JSX.Element {
  void itemId;
  void siblingValues;

  // -- c1: fertility -------------------------------------------------------
  if (mode === 'fertility') {
    const model = decodeSoilImprovement('fertility', value) as FertilityModel;
    return (
      <div className={css.root} data-si-mode="fertility">
        <div>
          <SectionEyebrow>Soil improvement programme by zone</SectionEyebrow>
          <div className={css.zoneList}>
            {ZONE_PROGRAMMES.map((z) => (
              <div key={z.code} className={`${css.zoneCard} ${css[`zone_${z.tone}`]}`}>
                <div className={css.zoneHead}>
                  <span className={css.zoneBadge}>{z.code}</span>
                  <span className={css.zoneName}>{z.name}</span>
                  <span className={css.zoneIntensity}>{z.intensity}</span>
                </div>
                <div className={css.zoneBody}>
                  {z.methods.map((m) => (
                    <div key={m.label} className={css.zoneRow}>
                      <span className={css.zoneMethod}>{m.label}</span>
                      <span className={css.zoneText}>{m.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <InterpretationBlock tone="info">
          Each zone gets a fertility programme matched to its management intensity.
          Zone 1 receives the most intensive inputs; Zone 5 receives none.
        </InterpretationBlock>
        <FeedsNote>
          Zone fertility programme feeds <strong>application rates</strong> (item 2) and{' '}
          <strong>equipment requirements</strong> (item 3). On-site compost surplus from
          the nursery growing media surface is the primary source for Zones 1-3.
        </FeedsNote>
        <NotesField
          id="si-fertility-notes"
          label="Fertility programme notes"
          placeholder="Zone-specific adjustments, input sources, compost supply..."
          value={model.notes}
          onChange={(next) =>
            onChange(
              encodeSoilImprovement('fertility', { kind: 'fertility', notes: next }),
            )
          }
        />
      </div>
    );
  }

  // -- c2: schedule --------------------------------------------------------
  if (mode === 'schedule') {
    const model = decodeSoilImprovement('schedule', value) as ScheduleModel;
    return (
      <div className={css.root} data-si-mode="schedule">
        <div>
          <SectionEyebrow>Application rates and timing</SectionEyebrow>
          <div className={css.appTable}>
            <div className={css.atHeader}>
              <span>Zone</span>
              <span>Input</span>
              <span>Rate</span>
              <span>Timing</span>
            </div>
            {APPLICATION_ROWS.map((r, i) => (
              <div key={`${r.zone}-${r.input}-${i}`} className={css.atRow}>
                <span className={`${css.atZone} ${css[`zone_${r.tone}`]}`}>{r.zone}</span>
                <span className={css.atInput}>{r.input}</span>
                <span className={css.atRate}>{r.rate}</span>
                <span className={css.atTiming}>{r.timing}</span>
              </div>
            ))}
          </div>
        </div>
        <FeedsNote>
          Application rates become <strong>scheduled Act tasks</strong> in the Observe
          layer - compost topdress, cover crop seeding, and legume oversowing are annual
          tasks triggered at the correct month each year.
        </FeedsNote>
        <NotesField
          id="si-schedule-notes"
          label="Application schedule notes"
          placeholder="Input cost estimates, supplier lead times, scheduling adjustments..."
          value={model.notes}
          onChange={(next) =>
            onChange(
              encodeSoilImprovement('schedule', { kind: 'schedule', notes: next }),
            )
          }
        />
      </div>
    );
  }

  // -- c3: equipment -------------------------------------------------------
  if (mode === 'equipment') {
    const model = decodeSoilImprovement('equipment', value) as EquipmentModel;
    return (
      <div className={css.root} data-si-mode="equipment">
        <div>
          <SectionEyebrow>Machinery and equipment</SectionEyebrow>
          <div className={css.equipList}>
            {EQUIPMENT_ITEMS.map((e) => (
              <div key={e.title} className={css.equipRow}>
                <div className={css.equipBody}>
                  <div className={css.equipTitle}>{e.title}</div>
                  <div className={css.equipDetail}>{e.detail}</div>
                </div>
                <span className={`${css.equipStatus} ${css[`status_${e.tone}`]}`}>
                  {e.status}
                </span>
              </div>
            ))}
          </div>
        </div>
        <FeedsNote>
          Equipment requirements feed <strong>Tier 4 infrastructure procurement</strong> -
          subsoiler hire and seeder purchase are the two items requiring advance planning.
          Subsoiler must be booked before Zone 3 tree planting commences.
        </FeedsNote>
        <NotesField
          id="si-equipment-notes"
          label="Equipment notes"
          placeholder="Contractor sourcing, hire bookings, shared-equipment arrangements..."
          value={model.notes}
          onChange={(next) =>
            onChange(
              encodeSoilImprovement('equipment', { kind: 'equipment', notes: next }),
            )
          }
        />
      </div>
    );
  }

  // -- c4: priority --------------------------------------------------------
  if (mode === 'priority') {
    const model = decodeSoilImprovement('priority', value) as PriorityModel;
    return (
      <div className={css.root} data-si-mode="priority">
        <div>
          <SectionEyebrow>Priority zones for first-cycle improvement</SectionEyebrow>
          <div className={css.priorityList}>
            {PRIORITY_ZONES.map((p) => (
              <div key={p.rank} className={css.priorityRow}>
                <span className={css.priorityRank}>{p.rank}</span>
                <div className={css.priorityBody}>
                  <div className={css.priorityName}>{p.name}</div>
                  <div className={css.priorityRationale}>{p.rationale}</div>
                  <div className={`${css.priorityTarget} ${css[`prio_${p.tone}`]}`}>
                    {p.target}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <FeedsNote>
          North paddock (Priority 3) improvement is the{' '}
          <strong>Cycle 2 soil programme priority</strong> - it is the direct unlock for
          safe flock expansion identified in the grazing system density check.
        </FeedsNote>
        <NotesField
          id="si-priority-notes"
          label="Priority notes"
          placeholder="Labour allocation, cycle sequencing, resource constraints..."
          value={model.notes}
          onChange={(next) =>
            onChange(
              encodeSoilImprovement('priority', { kind: 'priority', notes: next }),
            )
          }
        />
      </div>
    );
  }

  // -- c5: baseline --------------------------------------------------------
  const model = decodeSoilImprovement('baseline', value) as BaselineModel;
  return (
    <div className={css.root} data-si-mode="baseline">
      <div>
        <SectionEyebrow>Soil health monitoring baseline</SectionEyebrow>
        <div className={css.baselineRef}>{BASELINE_REF}</div>
        <div className={css.baselineTable}>
          <div className={css.btHeader}>
            <span>Indicator</span>
            <span className={css.btNum}>Zone 1</span>
            <span className={css.btNum}>Zone 3</span>
            <span className={css.btNum}>Zone 4 N</span>
          </div>
          {BASELINE_ROWS.map((r) => (
            <div
              key={r.indicator}
              className={`${css.btRow} ${r.isTarget ? css.btTargetRow : ''}`}
            >
              <span className={css.btIndicator}>{r.indicator}</span>
              <span className={css.btNum}>{r.z1}</span>
              <span className={css.btNum}>{r.z3}</span>
              <span className={css.btNum}>{r.z4n}</span>
            </div>
          ))}
        </div>
        <div className={css.methodNote}>{BASELINE_METHOD}</div>
      </div>
      <FeedsNote>
        Baseline feeds the <strong>Observe-layer soil health dashboard</strong>.
        Year-on-year improvement tracking is how the grazing system, orchard floor
        management, and fertility programme are validated - or where they need adjustment.
      </FeedsNote>
      <NotesField
        id="si-baseline-notes"
        label="Baseline notes"
        placeholder="Sampling method confirmation, worm-count methodology, monitoring cadence..."
        value={model.notes}
        onChange={(next) =>
          onChange(
            encodeSoilImprovement('baseline', { kind: 'baseline', notes: next }),
          )
        }
      />
    </div>
  );
}

export default SoilImprovementCapture;
