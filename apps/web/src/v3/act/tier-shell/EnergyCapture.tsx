/**
 * EnergyCapture -- a 6-mode ADVISORY pure-FormValue capture for the ecovillage
 * objective ev-s3-energy-potential ("Assess energy systems potential", 6
 * checklist items c1..c6). Catalogue item order == mode order:
 *
 *   c1 -> solar        (rooftop + ground-mount solar generation potential)
 *   c2 -> wind         (wind generation potential + regulatory constraints)
 *   c3 -> hydro        (conditional micro-hydro potential)
 *   c4 -> biomass      (biomass / wood-fuel thermal capacity)
 *   c5 -> demand       (community energy demand by end-use category)
 *   c6 -> distribution (generation/demand balance + distribution architecture)
 *
 * Structure mirrors WaterSystemsCapture / SoilImprovementCapture (the canonical
 * advisory multi-mode captures): an `energyModeFor(itemId)` mapper, the `asStr`
 * FormValue coercion helper, per-mode discriminated-union models, decode/encode
 * (encode is the lossless inverse of decode), is*Valid, summarise*, the props
 * interface, and a single component that renders ONE mode body. Props are
 * {mode, value, onChange, itemId, siblingValues?} -- NO projectId, NO store
 * writes. The panel chrome (eyebrow / title / hint / Record-Defer footer) is
 * owned by the third-column host.
 *
 * CONTROLLED / pure: the model is derived from decode(value) each render; the
 * full next model is emitted via onChange(encode(next)). The capture holds NO
 * local state for PERSISTED values.
 *
 * decode NEVER throws and NEVER fabricates seed data: every text field defaults
 * to EMPTY string (""). This capture is purely advisory -- no covenant gate
 * applies to an energy-systems assessment, so every mode is always recordable
 * (isValid === true for all six). The c3 hydro mode is CONDITIONAL in the
 * prototype (record as not-applicable if no watercourse) -- it still does not
 * block the gate, so it stays always-valid here.
 *
 * SOURCE: the reference content (solar zones, wind regulatory tiers, hydro
 * sizing, biomass yield, demand categories, generation/demand balance, battery
 * recommendation, distribution-architecture options) is transcribed VERBATIM
 * from the OLOS prototype olos_energy_systems.html (panels p1..p6). The
 * prototype's live calculators are presented here as STATIC reference figures
 * (the worked example for Kinfolk Ridge); the advisory capture records the
 * steward's narrative, not recomputed numbers.
 *
 * ASCII-only: em-dash -> " - "; ">=" / "<=" for the inequality glyphs; "x" for
 * the multiply glyph; "->" for the arrow; "m2"/"m3" for the squared/cubed
 * glyphs; "~" for the approx glyph; no smart quotes; apostrophes use
 * double-quoted JS strings.
 */

import * as React from 'react';

import type { FormValue } from './actToolCatalog.js';
import { InterpretationBlock, SectionEyebrow } from './captures/controls/index.js';
import css from './EnergyCapture.module.css';

// ---------------------------------------------------------------------------
// Mode mapper
// ---------------------------------------------------------------------------

export type EnergyMode =
  | 'solar' // c1
  | 'wind' // c2
  | 'hydro' // c3
  | 'biomass' // c4
  | 'demand' // c5
  | 'distribution'; // c6

export const ENERGY_PREFIX = 'ev-s3-energy-potential';
const PREFIX_DASH = ENERGY_PREFIX + '-';

export function energyModeFor(itemId: string): EnergyMode | null {
  if (!itemId.startsWith(PREFIX_DASH)) return null;
  const suffix = itemId.slice(PREFIX_DASH.length);
  switch (suffix) {
    case 'c1':
      return 'solar';
    case 'c2':
      return 'wind';
    case 'c3':
      return 'hydro';
    case 'c4':
      return 'biomass';
    case 'c5':
      return 'demand';
    case 'c6':
      return 'distribution';
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Models (discriminated union by `kind`) -- each mode carries one notes field.
// ---------------------------------------------------------------------------

export interface SolarModel {
  kind: 'solar';
  notes: string;
}
export interface WindModel {
  kind: 'wind';
  notes: string;
}
export interface HydroModel {
  kind: 'hydro';
  notes: string;
}
export interface BiomassModel {
  kind: 'biomass';
  notes: string;
}
export interface DemandModel {
  kind: 'demand';
  notes: string;
}
export interface DistributionModel {
  kind: 'distribution';
  notes: string;
}

export type EnergyModel =
  | SolarModel
  | WindModel
  | HydroModel
  | BiomassModel
  | DemandModel
  | DistributionModel;

// ---------------------------------------------------------------------------
// Verbatim constants (from olos_energy_systems.html p1..p6)
// ---------------------------------------------------------------------------

type SolarTone = 'good' | 'warn' | 'bad';

interface SolarZone {
  name: string;
  kw: string;
  area: string;
  shade: string;
  interp: string;
  interpTone: SolarTone;
  gen: string;
}

// c1 solar -- rooftop + ground-mount zones.
const SOLAR_ZONES: readonly SolarZone[] = [
  {
    name: 'Rooftop solar',
    kw: '28.6 kW',
    area: '240 m2',
    shade: '12%',
    interp:
      '12% shading - acceptable. Standard string inverter suitable. Minor shading loss accounted for in generation estimate.',
    interpTone: 'good',
    gen: '36,700 kWh/yr',
  },
  {
    name: 'Ground-mount solar',
    kw: '46.2 kW',
    area: '400 m2',
    shade: '5%',
    interp:
      '5% shading - minimal. Open ground-mount zones are well-suited to full solar exposure.',
    interpTone: 'good',
    gen: '59,200 kWh/yr',
  },
];
const SOLAR_PEAK_SUN = '4.5 h/day';
const SOLAR_PEAK_SUN_NOTE =
  'From climate sectors survey (Stratum 2). Temperate southern Australia: 4.0-5.0 h/day typical.';
const SOLAR_TOTAL_KW = '74.8 kW installed';
const SOLAR_TOTAL_GEN = '95,900 kWh/yr';

const WIND_SPEED = '4.2 m/s';
const WIND_INTERP =
  '4.2 m/s - marginal. Small turbines (1-3 kW) viable but poor economics. Solar is a more cost-effective generation source at this wind speed. Large community turbines not recommended.';
const WIND_CONTRIBUTION = '~2,500 kWh/yr';

type RegTone = 'bad' | 'warn' | 'good';

interface RegRow {
  title: string;
  body: string;
  tone: RegTone;
}

// c2 wind -- three regulatory constraint tiers.
const WIND_REGS_HEADER = 'Regulatory constraints - Kinfolk Ridge (45 ha)';
const WIND_REGS: readonly RegRow[] = [
  {
    title: 'Large turbines (>= 50 kW, >= 30m tower):',
    body:
      ' Require 500m-2km setback from nearest dwelling. With 8 dwellings planned across a 45 ha site, maintaining 500m clearance to the boundary while remaining inside the property is likely not achievable. Planning permit required. EPA noise limits (35 dB(A) at nearest dwelling) further constrain placement.',
    tone: 'bad',
  },
  {
    title: 'Small turbines (<= 10 kW, <= 15m tower):',
    body:
      ' Smaller setback requirements - typically 50m from boundary. Potentially viable at exposed sites on the property. Planning permit may still be required at this scale in rural zone.',
    tone: 'warn',
  },
  {
    title: 'Micro-turbines (<= 1 kW):',
    body:
      ' Generally exempt from planning requirements below certain tower heights. Suitable for direct-use applications (water pumping, battery charging). Modest contribution to community energy mix.',
    tone: 'good',
  },
];

interface DataRow {
  label: string;
  value: string;
}

// c3 hydro -- sizing inputs (conditional on running water present).
const HYDRO_INPUTS: readonly DataRow[] = [
  { label: 'Available head', value: '4 m' },
  { label: 'Minimum flow rate (dry season)', value: '12 L/s' },
  { label: 'Available months per year', value: '7 months' },
];
const HYDRO_RESULT = '0.33 kW';
const HYDRO_RESULT_NOTE = '~1,700 kWh/yr';
const HYDRO_WARN =
  'Head x flow at this scale generates < 1 kW. Micro-hydro at Kinfolk Ridge is a supplementary source only - suitable for low-draw direct applications (stock water pressure, LED circuits) rather than primary generation. Not worth engineering complexity for community energy supply at this scale.';
const HYDRO_NOT_APPLICABLE =
  'If no permanent or reliable seasonal watercourse is present on this site, record micro-hydro as not applicable. This does not block the objective completion gate.';

// c4 biomass -- woodland area, yield, thermal equivalent.
const BIOMASS_WOODLAND: readonly DataRow[] = [
  { label: 'Total woodland / scrubland area', value: '8 ha' },
  { label: 'Under conservation covenant (excluded)', value: '0 ha' },
  { label: 'Available for managed production', value: '8.0 ha' },
];
const BIOMASS_YIELD_RATE = '1.2 m3/ha/yr';
const BIOMASS_YIELD_RATE_NOTE =
  'Native grassy woodland: 0.8-1.5 m3/ha/yr sustainable thinning. Productive plantation: 5-15 m3/ha/yr.';
const BIOMASS_YIELD_TOTAL = '9.6 m3/yr';
const BIOMASS_ENERGY = '34,600 kWh/yr (thermal)';
const BIOMASS_NOTE =
  'Biomass is a thermal fuel - it reduces electrical demand for space heating and hot water rather than contributing to the kWh electricity generation total. 9.6 m3/year could supply space heating for 4-6 households through a combined wood/solar hot water system, reducing electrical demand by ~8,000-12,000 kWh/year.';

// c5 demand -- six end-use categories + total.
const DEMAND_HEADER = 'Demand by category - 8 households, 20 people';
const DEMAND_ROWS: readonly DataRow[] = [
  { label: 'Domestic electricity (lighting, appliances, cooking)', value: '32 kWh/day' },
  { label: 'Space heating & cooling (after biomass offset)', value: '10 kWh/day' },
  { label: 'Hot water (solar backup electric)', value: '4 kWh/day' },
  { label: 'Communal buildings (common house, workshop)', value: '10 kWh/day' },
  { label: 'Productive equipment (pumps, workshop, electric tools)', value: '8 kWh/day' },
  { label: 'Electric vehicles / mobility (charge per day)', value: '6 kWh/day' },
];
const DEMAND_TOTAL_DAY = '70';
const DEMAND_TOTAL_YEAR = '25,550';
const DEMAND_NOTE =
  'Largest demand category: domestic electricity (32 kWh/day, 46% of total). Efficiency-first approach to appliance selection and passive solar building design could reduce this by 20-35%, significantly reducing battery sizing requirements.';

interface BalanceRow {
  source: string;
  kwh: string;
  pct: string;
  variant?: 'total' | 'demand';
}

// c6 distribution -- generation/demand balance table.
const BALANCE_ROWS: readonly BalanceRow[] = [
  { source: 'Rooftop solar', kwh: '36,700', pct: '144%' },
  { source: 'Ground-mount solar', kwh: '59,200', pct: '232%' },
  { source: 'Wind (supplementary)', kwh: '2,500', pct: '10%' },
  { source: 'Micro-hydro (seasonal)', kwh: '1,700', pct: '7%' },
  { source: 'Total generation', kwh: '100,100', pct: '392%', variant: 'total' },
  { source: 'Community demand', kwh: '25,550', pct: '-', variant: 'demand' },
];
const SURPLUS_MAIN = '3.9x community demand';
const SURPLUS_SUB =
  '~74,550 kWh/year surplus above community need - available for grid export (revenue), productive uses, or EV charging at expanded community scale.';
const BATTERY_MAIN = '175-220 kWh capacity';
const BATTERY_DETAIL =
  '2-day autonomy at 70 kWh/day demand, 80% depth of discharge. Approximately 4-6 x 48V 100Ah battery banks or 1-2 commercial ESS units (e.g. Tesla Powerwall Commercial, Sonnen). Required whether grid-connected or off-grid.';

interface DistribCard {
  title: string;
  desc: string;
  selected: boolean;
}

// c6 distribution -- four architecture options (first is the selected option).
const DISTRIB_CARDS: readonly DistribCard[] = [
  {
    title: 'Community micro-grid - shared generation and storage',
    desc:
      'All generation and storage assets shared across the community. Internal metering for equitable use. Most capital-efficient approach for a community with aligned interests and shared values. Highest design complexity.',
    selected: true,
  },
  {
    title: 'Off-grid - solar + battery, no grid connection',
    desc:
      'Full energy sovereignty. No ongoing grid fees or export revenue. System must be sized for worst-case winter generation. Appropriate if grid connection cost is high or energy sovereignty is a core community value.',
    selected: false,
  },
  {
    title: 'Grid-connected with export - sell surplus at FiT rate',
    desc:
      '3.9x surplus makes grid export attractive as a community revenue stream. Reduces battery sizing requirement (grid as virtual backup). Trade-off: energy costs subject to grid pricing changes.',
    selected: false,
  },
  {
    title: 'Off-grid primary with grid emergency backup',
    desc:
      'Day-to-day off-grid operation with grid connection available for extreme weather or system failure. Common approach for communities wanting sovereignty with resilience. Connection fee but minimal ongoing consumption.',
    selected: false,
  },
];

// ---------------------------------------------------------------------------
// FormValue coercion helper (mirror Water / Soil convention)
// ---------------------------------------------------------------------------

function asStr(v: FormValue[string] | undefined): string {
  return typeof v === 'string' ? v : '';
}

// ---------------------------------------------------------------------------
// decode: FormValue -> EnergyModel (TOTAL / defensive; never throws /
// fabricates seed data)
// ---------------------------------------------------------------------------

export function decodeEnergy(mode: EnergyMode, value: FormValue): EnergyModel {
  switch (mode) {
    case 'solar':
      return { kind: 'solar', notes: asStr(value.enSolarNotes) };
    case 'wind':
      return { kind: 'wind', notes: asStr(value.enWindNotes) };
    case 'hydro':
      return { kind: 'hydro', notes: asStr(value.enHydroNotes) };
    case 'biomass':
      return { kind: 'biomass', notes: asStr(value.enBiomassNotes) };
    case 'demand':
      return { kind: 'demand', notes: asStr(value.enDemandNotes) };
    case 'distribution':
      return { kind: 'distribution', notes: asStr(value.enDistributionNotes) };
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown EnergyMode: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// encode: EnergyModel -> FormValue (lossless inverse of decode)
// ---------------------------------------------------------------------------

export function encodeEnergy(_mode: EnergyMode, model: EnergyModel): FormValue {
  switch (model.kind) {
    case 'solar':
      return { enSolarNotes: model.notes };
    case 'wind':
      return { enWindNotes: model.notes };
    case 'hydro':
      return { enHydroNotes: model.notes };
    case 'biomass':
      return { enBiomassNotes: model.notes };
    case 'demand':
      return { enDemandNotes: model.notes };
    case 'distribution':
      return { enDistributionNotes: model.notes };
    default: {
      const _exhaustive: never = model;
      throw new Error(`Unknown EnergyModel kind: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// validity gates (advisory: every mode is always recordable -- no covenant gate
// applies to an energy-systems assessment)
// ---------------------------------------------------------------------------

export function isEnergyValid(_mode: EnergyMode, _value: FormValue): boolean {
  return true;
}

// ---------------------------------------------------------------------------
// summaries (one line per mode; defensive)
// ---------------------------------------------------------------------------

export function summariseEnergy(mode: EnergyMode, _value: FormValue): string {
  switch (mode) {
    case 'solar':
      return 'Solar generation potential assessed (74.8 kW, 95,900 kWh/yr)';
    case 'wind':
      return 'Wind generation potential assessed (marginal, supplementary)';
    case 'hydro':
      return 'Micro-hydro potential assessed (conditional)';
    case 'biomass':
      return 'Biomass / wood-fuel capacity assessed (thermal)';
    case 'demand':
      return 'Community energy demand estimated (25,550 kWh/yr)';
    case 'distribution':
      return 'Distribution architecture selected (balance confirmed)';
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown EnergyMode: ${String(_exhaustive)}`);
    }
  }
}

// ===========================================================================
// React component + 6 mode bodies (c1..c6)
// ===========================================================================

export interface EnergyCaptureProps {
  mode: EnergyMode;
  value: FormValue;
  onChange: (next: FormValue) => void;
  /** this capture's own checklist item id (e.g. ev-s3-energy-potential-c1). */
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

export function EnergyCapture({
  mode,
  value,
  onChange,
  itemId,
  siblingValues = {},
}: EnergyCaptureProps): React.JSX.Element {
  void itemId;
  void siblingValues;

  // -- c1: solar -----------------------------------------------------------
  if (mode === 'solar') {
    const model = decodeEnergy('solar', value) as SolarModel;
    return (
      <div className={css.root} data-en-mode="solar">
        <div>
          <SectionEyebrow>Solar generation potential</SectionEyebrow>
          <div className={css.zoneList}>
            {SOLAR_ZONES.map((z) => (
              <div key={z.name} className={css.zoneCard}>
                <div className={css.zoneHead}>
                  <span className={css.zoneName}>{z.name}</span>
                  <span className={css.zoneKw}>{z.kw}</span>
                </div>
                <div className={css.dataRow}>
                  <span className={css.drLbl}>Available area</span>
                  <span className={css.drVal}>{z.area}</span>
                </div>
                <div className={css.dataRow}>
                  <span className={css.drLbl}>Shading</span>
                  <span className={css.drVal}>{z.shade}</span>
                </div>
                <div className={`${css.zoneInterp} ${css[`itone_${z.interpTone}`]}`}>
                  {z.interp}
                </div>
                <div className={css.dataRow}>
                  <span className={css.drLbl}>Annual generation</span>
                  <span className={css.drValAccent}>{z.gen}</span>
                </div>
              </div>
            ))}
            <div className={css.dataRow}>
              <span className={css.drLbl}>Site peak sun hours</span>
              <span className={css.drVal}>{SOLAR_PEAK_SUN}</span>
            </div>
            <div className={css.resultSub}>{SOLAR_PEAK_SUN_NOTE}</div>
            <div className={css.resultBox}>
              <span className={css.resultLbl}>Total solar potential ({SOLAR_TOTAL_KW})</span>
              <span className={css.resultVal}>{SOLAR_TOTAL_GEN}</span>
            </div>
          </div>
        </div>
        <FeedsNote>
          Solar generation feeds the <strong>generation/demand balance</strong> (item 6). On
          45 ha with ample ground-mount zones, solar is almost certainly the dominant and
          sufficient generation source.
        </FeedsNote>
        <NotesField
          id="en-solar-notes"
          label="Solar assessment notes"
          placeholder="Roof/ground-mount zone confirmation, detailed shading analysis, inverter selection..."
          value={model.notes}
          onChange={(next) =>
            onChange(encodeEnergy('solar', { kind: 'solar', notes: next }))
          }
        />
      </div>
    );
  }

  // -- c2: wind ------------------------------------------------------------
  if (mode === 'wind') {
    const model = decodeEnergy('wind', value) as WindModel;
    return (
      <div className={css.root} data-en-mode="wind">
        <div>
          <SectionEyebrow>Wind generation potential</SectionEyebrow>
          <div className={css.dataRow}>
            <span className={css.drLbl}>Average annual wind speed</span>
            <span className={css.drVal}>{WIND_SPEED}</span>
          </div>
          <div className={`${css.zoneInterp} ${css.itone_warn}`}>{WIND_INTERP}</div>
          <div className={css.regsHeader}>{WIND_REGS_HEADER}</div>
          <div className={css.regList}>
            {WIND_REGS.map((r) => (
              <div key={r.title} className={css.regRow}>
                <span className={`${css.regDot} ${css[`rtone_${r.tone}`]}`} />
                <span className={css.regText}>
                  <strong>{r.title}</strong>
                  {r.body}
                </span>
              </div>
            ))}
          </div>
          <div className={css.resultBox}>
            <span className={css.resultLbl}>Estimated wind contribution</span>
            <span className={css.resultVal}>{WIND_CONTRIBUTION}</span>
          </div>
        </div>
        <FeedsNote>
          Wind is a supplementary rather than primary source at this site. The regulatory
          constraint on large turbines, combined with marginal wind speeds, means{' '}
          <strong>solar should carry the primary generation load</strong>.
        </FeedsNote>
        <NotesField
          id="en-wind-notes"
          label="Wind assessment notes"
          placeholder="Measured wind data, exposed-site candidates, turbine scale decision, permit status..."
          value={model.notes}
          onChange={(next) =>
            onChange(encodeEnergy('wind', { kind: 'wind', notes: next }))
          }
        />
      </div>
    );
  }

  // -- c3: hydro (conditional) --------------------------------------------
  if (mode === 'hydro') {
    const model = decodeEnergy('hydro', value) as HydroModel;
    return (
      <div className={css.root} data-en-mode="hydro">
        <div>
          <SectionEyebrow>Micro-hydro potential (conditional)</SectionEyebrow>
          <div className={css.dataList}>
            {HYDRO_INPUTS.map((r) => (
              <div key={r.label} className={css.dataRow}>
                <span className={css.drLbl}>{r.label}</span>
                <span className={css.drVal}>{r.value}</span>
              </div>
            ))}
            <div className={css.resultBox}>
              <span className={css.resultLbl}>Micro-hydro potential</span>
              <span className={css.resultVal}>{HYDRO_RESULT}</span>
            </div>
            <div className={css.resultSub}>{HYDRO_RESULT_NOTE}</div>
          </div>
        </div>
        <InterpretationBlock tone="warn">{HYDRO_WARN}</InterpretationBlock>
        <InterpretationBlock tone="info">{HYDRO_NOT_APPLICABLE}</InterpretationBlock>
        <FeedsNote>
          Hydro potential feeds the <strong>generation/demand balance</strong>. At this output
          it is supplementary - but its continuity (running when solar is low in winter) has
          qualitative value beyond the kWh figure.
        </FeedsNote>
        <NotesField
          id="en-hydro-notes"
          label="Micro-hydro notes"
          placeholder="Watercourse present yes/no, flow measurement status, supplementary use case..."
          value={model.notes}
          onChange={(next) =>
            onChange(encodeEnergy('hydro', { kind: 'hydro', notes: next }))
          }
        />
      </div>
    );
  }

  // -- c4: biomass ---------------------------------------------------------
  if (mode === 'biomass') {
    const model = decodeEnergy('biomass', value) as BiomassModel;
    return (
      <div className={css.root} data-en-mode="biomass">
        <div>
          <SectionEyebrow>Biomass and wood-fuel capacity</SectionEyebrow>
          <div className={css.dataList}>
            {BIOMASS_WOODLAND.map((r) => (
              <div key={r.label} className={css.dataRow}>
                <span className={css.drLbl}>{r.label}</span>
                <span className={css.drVal}>{r.value}</span>
              </div>
            ))}
            <div className={css.dataRow}>
              <span className={css.drLbl}>Sustainable yield rate</span>
              <span className={css.drVal}>{BIOMASS_YIELD_RATE}</span>
            </div>
            <div className={css.resultSub}>{BIOMASS_YIELD_RATE_NOTE}</div>
            <div className={css.dataRow}>
              <span className={css.drLbl}>Annual wood fuel yield</span>
              <span className={css.drVal}>{BIOMASS_YIELD_TOTAL}</span>
            </div>
            <div className={css.resultBox}>
              <span className={css.resultLbl}>Heating energy equivalent</span>
              <span className={css.resultVal}>{BIOMASS_ENERGY}</span>
            </div>
          </div>
        </div>
        <InterpretationBlock tone="info">{BIOMASS_NOTE}</InterpretationBlock>
        <FeedsNote>
          Biomass feeds <strong>demand-side reduction</strong> in item 5 - wood fuel reduces
          the electrical heating/hot water demand entered in the demand calculator.
        </FeedsNote>
        <NotesField
          id="en-biomass-notes"
          label="Biomass notes"
          placeholder="Woodland survey status, covenant exclusions, managed-thinning plan, heating end-uses..."
          value={model.notes}
          onChange={(next) =>
            onChange(encodeEnergy('biomass', { kind: 'biomass', notes: next }))
          }
        />
      </div>
    );
  }

  // -- c5: demand ----------------------------------------------------------
  if (mode === 'demand') {
    const model = decodeEnergy('demand', value) as DemandModel;
    return (
      <div className={css.root} data-en-mode="demand">
        <div>
          <SectionEyebrow>{DEMAND_HEADER}</SectionEyebrow>
          <div className={css.dataList}>
            {DEMAND_ROWS.map((r) => (
              <div key={r.label} className={css.dataRow}>
                <span className={css.drLbl}>{r.label}</span>
                <span className={css.drVal}>{r.value}</span>
              </div>
            ))}
            <div className={css.resultBox}>
              <span className={css.resultLbl}>Total daily demand</span>
              <span className={css.resultVal}>
                {DEMAND_TOTAL_DAY} kWh/day = {DEMAND_TOTAL_YEAR} kWh/yr
              </span>
            </div>
          </div>
        </div>
        <InterpretationBlock tone="info">{DEMAND_NOTE}</InterpretationBlock>
        <FeedsNote>
          Total demand feeds the <strong>generation/demand balance</strong> (item 6). Lower
          demand reduces required battery capacity and may enable a smaller, less expensive
          generation system.
        </FeedsNote>
        <NotesField
          id="en-demand-notes"
          label="Demand notes"
          placeholder="Per-category adjustments, efficiency measures, passive-design assumptions..."
          value={model.notes}
          onChange={(next) =>
            onChange(encodeEnergy('demand', { kind: 'demand', notes: next }))
          }
        />
      </div>
    );
  }

  // -- c6: distribution ----------------------------------------------------
  const model = decodeEnergy('distribution', value) as DistributionModel;
  return (
    <div className={css.root} data-en-mode="distribution">
      <div>
        <SectionEyebrow>Generation vs. demand - synthesis</SectionEyebrow>
        <div className={css.balanceTable}>
          <div className={css.btHeader}>
            <span>Source</span>
            <span className={css.btNum}>kWh/yr</span>
            <span className={css.btNum}>% demand</span>
          </div>
          {BALANCE_ROWS.map((r) => (
            <div
              key={r.source}
              className={`${css.btRow} ${
                r.variant === 'total'
                  ? css.btTotal
                  : r.variant === 'demand'
                    ? css.btDemand
                    : ''
              }`}
            >
              <span className={css.btSource}>{r.source}</span>
              <span className={css.btKwh}>{r.kwh}</span>
              <span className={css.btPct}>{r.pct}</span>
            </div>
          ))}
        </div>
      </div>
      <div className={css.surplusBox}>
        <span className={css.surplusLbl}>Generation surplus</span>
        <span className={css.surplusMain}>{SURPLUS_MAIN}</span>
        <span className={css.surplusSub}>{SURPLUS_SUB}</span>
      </div>
      <div className={css.batteryBox}>
        <span className={css.batteryLbl}>Battery storage recommendation</span>
        <span className={css.batteryMain}>{BATTERY_MAIN}</span>
        <span className={css.batteryDetail}>{BATTERY_DETAIL}</span>
      </div>
      <div>
        <SectionEyebrow>Distribution architecture</SectionEyebrow>
        <div className={css.stratList}>
          {DISTRIB_CARDS.map((c) => (
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
        Distribution architecture feeds <strong>Stratum 4: Infrastructure siting</strong>{' '}
        (inverter room, battery bank, distribution switchgear) and{' '}
        <strong>Stratum 5: Connection design</strong> for each household.
      </FeedsNote>
      <NotesField
        id="en-distribution-notes"
        label="Distribution strategy notes"
        placeholder="Selected architecture, community consensus status, surplus-use intent, metering approach..."
        value={model.notes}
        onChange={(next) =>
          onChange(
            encodeEnergy('distribution', { kind: 'distribution', notes: next }),
          )
        }
      />
    </div>
  );
}

export default EnergyCapture;
