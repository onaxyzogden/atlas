/**
 * ClimateCapture -- a multi-mode CONTROLLED capture for objective s2-climate
 * (6 checklist items c1..c6). Ported from olos_climate_sectors.html right-hand
 * panels p1..p6, re-ordered by SUBJECT (catalogue item order != mockup panel
 * order):
 *
 *   c1 -> rainfall     (mockup p1: annual avg + seasonal bars + variability)
 *   c2 -> wind         (mockup p4: per-type prevailing wind direction selectors)
 *   c3 -> temperature  (mockup p2: min/max + frost calendar + heat events)
 *   c4 -> solar        (mockup p5: hemisphere + shade sources + growing face)
 *   c5 -> fire         (mockup p6: risk level + approach dir + position + fuel)
 *   c6 -> microclimate (mockup p3: feature checklist + observations textarea)
 *
 * Structure mirrors TerrainCapture / ProvisionBalanceCapture (the canonical
 * multi-mode captures): a `climateModeFor(itemId)` mapper plus a single
 * component that renders ONE mode body. The panel chrome (header / eyebrow /
 * title / hint / feeds / gate-note / Record-Defer footer) is owned by
 * DecisionWorkingPanel -- this capture renders ONLY the mode body blocks.
 *
 * Each mode persists its OWN keys in the per-item flat FormValue
 * (Record<string, string | string[]>). decode is TOTAL/defensive (non-array ->
 * empty; coerce bad types to defaults; NEVER fabricate seed data -- the mockup
 * shows seeded demo numbers, but this capture starts EMPTY).
 *
 * CONTROLLED / pure: the model is always derived from decode(value) each render;
 * the full next model is emitted via onChange(encode(next)). UI-derived display
 * (frost calendar, sun-path copy, APZ box) is computed in split-out sub-body
 * components. No mode here keeps a growable list, so no id factory is needed.
 *
 * Cross-item NOTE: the mockup derives several read-outs from cross-field state
 * the operator types into the SAME panel (rainfall pattern from 4 season
 * inputs; frost-free days from 2 month selectors; APZ from risk level). Those
 * derivations are intra-mode (within one item's own FormValue) and ARE
 * reproduced here. The mockup does NOT derive across separate catalogue items,
 * so there is no cross-item simplification to flag.
 *
 * ASCII-only: em-dash -> " -- ", degree -> " deg C", superscript-2 -> "2",
 * middot -> &middot; entity; all icons are lucide.
 */

import * as React from 'react';
import { ArrowRight, Ruler } from 'lucide-react';
import type { FormValue } from './actToolCatalog.js';
import css from './ClimateCapture.module.css';

// ---------------------------------------------------------------------------
// Mode mapper
// ---------------------------------------------------------------------------

export type ClimateMode =
  | 'rainfall'
  | 'wind'
  | 'temperature'
  | 'solar'
  | 'fire'
  | 'microclimate';

export function climateModeFor(itemId: string): ClimateMode | null {
  switch (itemId) {
    case 's2-climate-c1':
      return 'rainfall';
    case 's2-climate-c2':
      return 'wind';
    case 's2-climate-c3':
      return 'temperature';
    case 's2-climate-c4':
      return 'solar';
    case 's2-climate-c5':
      return 'fire';
    case 's2-climate-c6':
      return 'microclimate';
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

export interface RainfallModel {
  kind: 'rainfall';
  annual: string;
  /** keyed by season key (sum/aut/win/spr) -> mm string. */
  seasonal: Record<string, string>;
  cv: string;
}

export interface WindModel {
  kind: 'wind';
  /** keyed by wind-type key (summer/winter/hot/storm) -> compass dir. */
  directions: Record<string, string>;
}

export interface TemperatureModel {
  kind: 'temperature';
  minTemp: string;
  maxTemp: string;
  lastFrost: string;
  firstFrost: string;
  heatDays: string;
}

export interface SolarModel {
  kind: 'solar';
  hemisphere: string;
  shadeSources: string;
  growingFace: string;
}

export interface FireModel {
  kind: 'fire';
  riskLevel: string;
  approachDir: string;
  position: string;
  fuelType: string;
}

export interface MicroclimateModel {
  kind: 'microclimate';
  features: string[];
  observations: string;
}

export type ClimateModel =
  | RainfallModel
  | WindModel
  | TemperatureModel
  | SolarModel
  | FireModel
  | MicroclimateModel;

// ---------------------------------------------------------------------------
// Verbatim domain data (copied from the mockup p1..p6)
// ---------------------------------------------------------------------------

const COMPASS_DIRS: readonly string[] = [
  'N',
  'NE',
  'E',
  'SE',
  'S',
  'SW',
  'W',
  'NW',
];
const COMPASS_SET = new Set(COMPASS_DIRS);

interface SeasonSpec {
  key: string;
  label: string;
}
const SEASONS: readonly SeasonSpec[] = [
  { key: 'sum', label: 'Sum' },
  { key: 'aut', label: 'Aut' },
  { key: 'win', label: 'Win' },
  { key: 'spr', label: 'Spr' },
];
const SEASON_KEYS = new Set(SEASONS.map((s) => s.key));

interface WindTypeSpec {
  key: string;
  label: string;
  hint: string;
}
const WIND_TYPES: readonly WindTypeSpec[] = [
  {
    key: 'summer',
    label: 'Summer prevailing wind',
    hint: 'light -- regular -- dominant direction',
  },
  { key: 'winter', label: 'Winter prevailing wind', hint: '' },
  {
    key: 'hot',
    label: 'Hot / desiccating wind',
    hint: 'summer dry northerly, etc.',
  },
  {
    key: 'storm',
    label: 'Storm / extreme wind',
    hint: 'direction of worst events',
  },
];
const WIND_TYPE_KEYS = new Set(WIND_TYPES.map((w) => w.key));

interface FrostMonthOption {
  value: string;
  label: string;
}
// Month numbers 1-12; 0 == none/frost free. Mirrors the mockup selectors.
const LAST_FROST_OPTIONS: readonly FrostMonthOption[] = [
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '0', label: 'None -- frost free' },
];
const FIRST_FROST_OPTIONS: readonly FrostMonthOption[] = [
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '0', label: 'None -- frost free' },
];
const MONTH_LETTERS: readonly string[] = [
  'J',
  'F',
  'M',
  'A',
  'M',
  'J',
  'J',
  'A',
  'S',
  'O',
  'N',
  'D',
];

interface MicroFeatureSpec {
  key: string;
  label: string;
  note?: string;
}
const MICRO_FEATURES: readonly MicroFeatureSpec[] = [
  {
    key: 'frost-hollow',
    label: 'Frost hollows / cold air drainage',
    note: 'Low-lying areas where cold air pools overnight. Vulnerable to late frosts even when upslope sites are frost-free. Avoid frost-sensitive plantings.',
  },
  { key: 'wind-tunnel', label: 'Wind tunnel / exposed corridors' },
  {
    key: 'thermal-pocket',
    label: 'Sheltered thermal pockets',
    note: 'Areas protected by landform, dense vegetation, or structures that are noticeably warmer. High-value for frost-sensitive crops and early-season production.',
  },
  { key: 'moisture', label: 'Moisture accumulation zones' },
  {
    key: 'desiccating',
    label: 'Exposed ridgeline or desiccating zone',
    note: 'High exposure to desiccating winds. Soil moisture loss accelerated. Windbreak design is a priority before any productive plantings in this zone.',
  },
  { key: 'heat-trap', label: 'Heat trap / thermal mass accumulation' },
  { key: 'shadow', label: 'Shadow zone / shade-dominant area' },
];
const MICRO_FEATURE_KEYS = new Set(MICRO_FEATURES.map((f) => f.key));

interface RiskSpec {
  id: 'low' | 'mod' | 'hgh' | 'ext';
  label: string;
  tone: 'low' | 'high' | 'extreme';
  main: string;
  detail: string;
}
const FIRE_RISK_LEVELS: readonly RiskSpec[] = [
  {
    id: 'low',
    label: 'Low',
    tone: 'low',
    main: '10 m minimum APZ',
    detail:
      'Low risk. Standard construction likely permitted in most areas. Confirm with local bushfire overlay and planning scheme.',
  },
  {
    id: 'mod',
    label: 'Moderate',
    tone: 'high',
    main: '20 m minimum APZ',
    detail:
      'Moderate risk (BAL 12.5 may apply). APZ measured from building to fuel. Consult local authority for construction requirements.',
  },
  {
    id: 'hgh',
    label: 'High',
    tone: 'high',
    main: '29 m minimum APZ',
    detail:
      'High risk (BAL 19 or higher likely applies). APZ measured from structure to bushfire fuel. Building must comply with AS 3959. Confirm with local authority.',
  },
  {
    id: 'ext',
    label: 'Extreme',
    tone: 'extreme',
    main: '40 m+ APZ -- specialist assessment required',
    detail:
      'Extreme risk. Standard construction may not be permitted. Seek specialist fire safety consultant before any building siting decisions. Emergency egress is a primary design constraint.',
  },
];
const FIRE_RISK_BY_ID: Record<string, RiskSpec> = Object.fromEntries(
  FIRE_RISK_LEVELS.map((r) => [r.id, r]),
);
const FIRE_RISK_ID_SET: Set<string> = new Set(
  FIRE_RISK_LEVELS.map((r) => r.id),
);

const FIRE_POSITIONS: readonly string[] = [
  'Protected valley',
  'Midslope',
  'Exposed ridgeline',
  'Flat open',
];
const FIRE_POSITION_SET = new Set(FIRE_POSITIONS);

const FIRE_FUELS: readonly string[] = [
  'Grassland',
  'Mixed shrub & grass',
  'Forest / woodland',
  'Agricultural',
];
const FIRE_FUEL_SET = new Set(FIRE_FUELS);

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
// Pure interpretation helpers (mirror the mockup; reused by tests + render)
// ---------------------------------------------------------------------------

export function rainfallInterpretation(annual: number): {
  text: string;
  tone: 'pass' | 'warn' | 'info';
} {
  if (annual < 250) {
    return {
      tone: 'warn',
      text: `${annual} mm -- arid. Irrigation essential for all productive uses. Water harvesting is a Tier 1 priority.`,
    };
  }
  if (annual < 500) {
    return {
      tone: 'warn',
      text: `${annual} mm -- semi-arid. Drought-tolerant species and significant water harvesting required for most uses.`,
    };
  }
  if (annual < 750) {
    return {
      tone: 'info',
      text: `${annual} mm -- sub-humid. Seasonal supplemental irrigation likely needed in dry months.`,
    };
  }
  if (annual < 1000) {
    return {
      tone: 'pass',
      text: `${annual} mm -- humid. Most uses viable without irrigation. Plan for drainage and soil structure.`,
    };
  }
  return {
    tone: 'info',
    text: `${annual} mm -- high rainfall. Drainage is a primary design consideration. Soil compaction risk elevated.`,
  };
}

export function cvInterpretation(cv: number): {
  text: string;
  tone: 'pass' | 'warn';
} {
  if (cv < 20) {
    return {
      tone: 'pass',
      text: `${cv}% CV -- low variability. Reliable rainfall pattern. Water storage can be sized for single dry-year resilience.`,
    };
  }
  if (cv < 40) {
    return {
      tone: 'warn',
      text: `${cv}% CV -- medium variability. Drought years common. Size water storage for at least 2 dry-year sequences.`,
    };
  }
  return {
    tone: 'warn',
    text: `${cv}% CV -- high variability. Extreme dry years probable. Water storage and drought-adapted species are essential design elements.`,
  };
}

/** Seasonal rainfall pattern (southern-hemisphere months, mirrors the mockup). */
export function rainfallPattern(seasonal: Record<string, string>): string | null {
  const num = (k: string): number => {
    const n = Number.parseFloat(seasonal[k] ?? '');
    return Number.isFinite(n) ? n : 0;
  };
  const sum = num('sum');
  const aut = num('aut');
  const win = num('win');
  const spr = num('spr');
  const total = sum + aut + win + spr;
  if (total < 5) return null;
  const warm = sum + spr;
  const cool = aut + win;
  if (cool > warm * 1.4) {
    return 'Winter-dominant -- Mediterranean / temperate oceanic pattern. Dry summers drive irrigation need and raise fire risk from December to March.';
  }
  if (warm > cool * 1.4) {
    return 'Summer-dominant -- subtropical or monsoonal pattern. Wet summers with reliable tropical moisture. Dry winters are the irrigation challenge.';
  }
  return 'Year-round rainfall -- temperate oceanic pattern. Plan for drainage and erosion management in wetter months. Irrigation less critical.';
}

/** Frost-free month count from last-spring + first-autumn frost months. */
export function frostFreeMonths(lastFrost: string, firstFrost: string): number | null {
  const last = Number.parseInt(lastFrost, 10);
  const first = Number.parseInt(firstFrost, 10);
  if (!Number.isFinite(last) || !Number.isFinite(first)) return null;
  if (last <= 0 || first <= 0) return 12; // frost free
  let frostCount = 0;
  for (let mn = 1; mn <= 12; mn++) {
    const isFrost =
      first <= last ? mn >= first && mn <= last : mn >= first || mn <= last;
    if (isFrost) frostCount++;
  }
  return 12 - frostCount;
}

// ---------------------------------------------------------------------------
// decode: FormValue -> ClimateModel (TOTAL / defensive; never throws, never
// fabricates seed data).
// ---------------------------------------------------------------------------

export function decodeClimate(mode: ClimateMode, value: FormValue): ClimateModel {
  switch (mode) {
    case 'rainfall': {
      const seasonal: Record<string, string> = {};
      for (const entry of asArr(value.climateSeasonal)) {
        if (typeof entry !== 'string') continue;
        const sep = entry.indexOf('::');
        if (sep <= 0) continue;
        const key = entry.slice(0, sep);
        const mm = entry.slice(sep + 2);
        if (!SEASON_KEYS.has(key)) continue;
        seasonal[key] = mm;
      }
      return {
        kind: 'rainfall',
        annual: asStr(value.climateAnnual),
        seasonal,
        cv: asStr(value.climateCv),
      };
    }
    case 'wind': {
      const directions: Record<string, string> = {};
      for (const entry of asArr(value.climateWind)) {
        if (typeof entry !== 'string') continue;
        const sep = entry.indexOf('::');
        if (sep <= 0) continue;
        const key = entry.slice(0, sep);
        const dir = entry.slice(sep + 2);
        if (!WIND_TYPE_KEYS.has(key)) continue;
        if (!COMPASS_SET.has(dir)) continue;
        directions[key] = dir;
      }
      return { kind: 'wind', directions };
    }
    case 'temperature': {
      const lastFrost = asStr(value.climateLastFrost);
      const firstFrost = asStr(value.climateFirstFrost);
      const lastOk = LAST_FROST_OPTIONS.some((o) => o.value === lastFrost);
      const firstOk = FIRST_FROST_OPTIONS.some((o) => o.value === firstFrost);
      return {
        kind: 'temperature',
        minTemp: asStr(value.climateMinTemp),
        maxTemp: asStr(value.climateMaxTemp),
        lastFrost: lastOk ? lastFrost : '',
        firstFrost: firstOk ? firstFrost : '',
        heatDays: asStr(value.climateHeatDays),
      };
    }
    case 'solar': {
      const hemisphere = asStr(value.climateHemisphere);
      const growingFace = asStr(value.climateGrowingFace);
      return {
        kind: 'solar',
        hemisphere: hemisphere === 'N' || hemisphere === 'S' ? hemisphere : '',
        shadeSources: asStr(value.climateShadeSources),
        growingFace: COMPASS_SET.has(growingFace) ? growingFace : '',
      };
    }
    case 'fire': {
      const riskLevel = asStr(value.climateRiskLevel);
      const approachDir = asStr(value.climateApproachDir);
      const position = asStr(value.climatePosition);
      const fuelType = asStr(value.climateFuelType);
      return {
        kind: 'fire',
        riskLevel: FIRE_RISK_ID_SET.has(riskLevel) ? riskLevel : '',
        approachDir: COMPASS_SET.has(approachDir) ? approachDir : '',
        position: FIRE_POSITION_SET.has(position) ? position : '',
        fuelType: FIRE_FUEL_SET.has(fuelType) ? fuelType : '',
      };
    }
    case 'microclimate': {
      const features = asArr(value.climateFeatures).filter((f) =>
        MICRO_FEATURE_KEYS.has(f),
      );
      return {
        kind: 'microclimate',
        features,
        observations: asStr(value.climateObservations),
      };
    }
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown ClimateMode: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// encode: ClimateModel -> FormValue (lossless inverse of decode).
// ---------------------------------------------------------------------------

export function encodeClimate(model: ClimateModel): FormValue {
  switch (model.kind) {
    case 'rainfall':
      return {
        climateAnnual: model.annual,
        climateSeasonal: Object.entries(model.seasonal).map(
          ([k, v]) => `${k}::${v}`,
        ),
        climateCv: model.cv,
      };
    case 'wind':
      return {
        climateWind: Object.entries(model.directions).map(
          ([k, v]) => `${k}::${v}`,
        ),
      };
    case 'temperature':
      return {
        climateMinTemp: model.minTemp,
        climateMaxTemp: model.maxTemp,
        climateLastFrost: model.lastFrost,
        climateFirstFrost: model.firstFrost,
        climateHeatDays: model.heatDays,
      };
    case 'solar':
      return {
        climateHemisphere: model.hemisphere,
        climateShadeSources: model.shadeSources,
        climateGrowingFace: model.growingFace,
      };
    case 'fire':
      return {
        climateRiskLevel: model.riskLevel,
        climateApproachDir: model.approachDir,
        climatePosition: model.position,
        climateFuelType: model.fuelType,
      };
    case 'microclimate':
      return {
        climateFeatures: [...model.features],
        climateObservations: model.observations,
      };
  }
}

// ---------------------------------------------------------------------------
// validity gates (per mode)
// ---------------------------------------------------------------------------

export function isClimateValid(model: ClimateModel): boolean {
  switch (model.kind) {
    case 'rainfall':
      return Number.isFinite(Number.parseFloat(model.annual));
    case 'wind':
      return Object.keys(model.directions).length >= 1;
    case 'temperature': {
      const lo = Number.parseFloat(model.minTemp);
      const hi = Number.parseFloat(model.maxTemp);
      return Number.isFinite(lo) && Number.isFinite(hi);
    }
    case 'solar':
      return model.hemisphere !== '' && model.growingFace !== '';
    case 'fire':
      return model.riskLevel !== '';
    case 'microclimate':
      return model.features.length >= 1 || model.observations.trim() !== '';
  }
}

// ---------------------------------------------------------------------------
// record-summary mirror (per mode)
// ---------------------------------------------------------------------------

export function summariseClimate(model: ClimateModel): string {
  switch (model.kind) {
    case 'rainfall': {
      const ann = Number.parseFloat(model.annual);
      const annTxt = Number.isFinite(ann) ? `${ann} mm/yr` : 'no annual avg';
      const seasons = Object.keys(model.seasonal).length;
      return `${annTxt}, ${seasons} season(s)`;
    }
    case 'wind': {
      const n = Object.keys(model.directions).length;
      return `${n} wind type(s) mapped`;
    }
    case 'temperature': {
      const lo = Number.parseFloat(model.minTemp);
      const hi = Number.parseFloat(model.maxTemp);
      const range =
        Number.isFinite(lo) && Number.isFinite(hi)
          ? `${lo} to ${hi} deg C`
          : 'range unset';
      const ff = frostFreeMonths(model.lastFrost, model.firstFrost);
      const ffTxt = ff === null ? '' : `, ~${ff * 30} frost-free days`;
      return `${range}${ffTxt}`;
    }
    case 'solar': {
      const hemi = model.hemisphere === '' ? 'hemisphere unset' : `${model.hemisphere} hemisphere`;
      const face = model.growingFace === '' ? 'no face' : `${model.growingFace} face`;
      return `${hemi}, ${face}`;
    }
    case 'fire': {
      const label = FIRE_RISK_BY_ID[model.riskLevel]?.label ?? model.riskLevel;
      const apz = FIRE_RISK_BY_ID[model.riskLevel]?.main ?? '';
      return apz ? `${label} risk -- ${apz}` : `${label} risk`;
    }
    case 'microclimate': {
      const n = model.features.length;
      return `${n} feature(s) noted`;
    }
  }
}

// ---------------------------------------------------------------------------
// Component (renders ONLY the body for the resolved mode).
// ---------------------------------------------------------------------------

export interface ClimateCaptureProps {
  mode: ClimateMode;
  value: FormValue;
  onChange: (next: FormValue) => void;
}

export function ClimateCapture({
  mode,
  value,
  onChange,
}: ClimateCaptureProps): React.JSX.Element {
  const model = decodeClimate(mode, value);
  const emit = (next: ClimateModel): void => onChange(encodeClimate(next));

  // ---------- rainfall (p1) ----------
  if (model.kind === 'rainfall') {
    const annNum = Number.parseFloat(model.annual);
    const annInterp = Number.isFinite(annNum)
      ? rainfallInterpretation(annNum)
      : null;
    const cvNum = Number.parseFloat(model.cv);
    const cvInterp = Number.isFinite(cvNum) ? cvInterpretation(cvNum) : null;
    const pattern = rainfallPattern(model.seasonal);
    const seasonVals = SEASONS.map((s) => {
      const n = Number.parseFloat(model.seasonal[s.key] ?? '');
      return Number.isFinite(n) ? n : 0;
    });
    const maxSeason = Math.max(...seasonVals, 1);

    const setAnnual = (v: string): void => emit({ ...model, annual: v });
    const setCv = (v: string): void => emit({ ...model, cv: v });
    const setSeason = (key: string, v: string): void =>
      emit({
        ...model,
        seasonal: { ...model.seasonal, [key]: v },
      });

    return (
      <div className={css.root} data-climate-mode="rainfall">
        <div className={css.climateField}>
          <div className={css.cfTop}>
            <span className={css.cfLbl}>Annual average</span>
            <span className={css.cfSub}>mm / year</span>
          </div>
          <div className={css.cfInputRow}>
            <input
              type="number"
              className={css.cfInput}
              data-testid="rain-annual"
              aria-label="Annual average rainfall"
              value={model.annual}
              step={10}
              placeholder="0"
              onChange={(e) => setAnnual(e.target.value)}
            />
            <span className={css.cfUnit}>mm/yr</span>
          </div>
          {annInterp ? (
            <div
              className={css.cfInterp}
              data-tone={annInterp.tone}
              data-testid="rain-annual-interp"
            >
              {annInterp.text}
            </div>
          ) : null}
        </div>

        <div className={css.barsWrap}>
          <div className={css.barsLbl}>
            Seasonal distribution{' '}
            <span className={css.barsSub}>(mm per season)</span>
          </div>
          <div className={css.rainInputs}>
            {SEASONS.map((s) => (
              <div key={s.key} className={css.rainInpCol}>
                <span className={css.rainSeasonLbl}>{s.label}</span>
                <input
                  type="number"
                  className={css.rainInp}
                  data-testid={`rain-${s.key}`}
                  aria-label={`${s.label} rainfall`}
                  value={model.seasonal[s.key] ?? ''}
                  placeholder="0"
                  onChange={(e) => setSeason(s.key, e.target.value)}
                />
              </div>
            ))}
          </div>
          <div className={css.rainBars} aria-hidden="true">
            {SEASONS.map((s, i) => {
              const pct = Math.max(4, (seasonVals[i]! / maxSeason) * 100);
              return (
                <div key={s.key} className={css.rbarCol}>
                  <span className={css.rbar} style={{ height: `${pct}%` }} />
                  <span className={css.rbarNum}>{seasonVals[i]}</span>
                </div>
              );
            })}
          </div>
          {pattern ? (
            <div className={css.rainPattern} data-testid="rain-pattern">
              {pattern}
            </div>
          ) : null}
        </div>

        <div className={css.climateField}>
          <div className={css.cfTop}>
            <span className={css.cfLbl}>Rainfall variability</span>
            <span className={css.cfSub}>Coefficient of variation %</span>
          </div>
          <div className={css.cfInputRow}>
            <input
              type="number"
              className={css.cfInput}
              data-testid="rain-cv"
              aria-label="Rainfall variability coefficient"
              value={model.cv}
              step={1}
              min={0}
              max={100}
              placeholder="0"
              onChange={(e) => setCv(e.target.value)}
            />
            <span className={css.cfUnit}>CV %</span>
          </div>
          {cvInterp ? (
            <div
              className={css.cfInterp}
              data-tone={cvInterp.tone}
              data-testid="rain-cv-interp"
            >
              {cvInterp.text}
            </div>
          ) : null}
        </div>

        <div className={css.feedsBlock}>
          <ArrowRight size={13} className={css.feedsIcon} aria-hidden="true" />
          <div className={css.feedsTxt}>
            Rainfall data feeds <strong>Tier 3: Water strategy</strong> and all
            design decisions for water harvesting, storage sizing, and irrigation
            infrastructure.
          </div>
        </div>
      </div>
    );
  }

  // ---------- wind (p4) ----------
  if (model.kind === 'wind') {
    const setDir = (key: string, dir: string): void => {
      const next = { ...model.directions };
      if (next[key] === dir) {
        delete next[key];
      } else {
        next[key] = dir;
      }
      emit({ kind: 'wind', directions: next });
    };
    return (
      <div className={css.root} data-climate-mode="wind">
        <div className={css.windGroups}>
          {WIND_TYPES.map((w) => (
            <div key={w.key} className={css.dirSection}>
              <div className={css.dirSecLbl}>
                {w.label}
                {w.hint ? (
                  <span className={css.dirSecHint}> ({w.hint})</span>
                ) : null}
              </div>
              <div className={css.dirChips} data-testid={`wind-${w.key}`}>
                {COMPASS_DIRS.map((dir) => {
                  const on = model.directions[w.key] === dir;
                  return (
                    <button
                      key={dir}
                      type="button"
                      className={css.dirChip}
                      data-testid={`wind-${w.key}-${dir}`}
                      data-on={on ? 'true' : 'false'}
                      data-windtype={w.key}
                      aria-pressed={on}
                      onClick={() => setDir(w.key, dir)}
                    >
                      {dir}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className={css.feedsBlock}>
          <ArrowRight size={13} className={css.feedsIcon} aria-hidden="true" />
          <div className={css.feedsTxt}>
            Wind sectors feed <strong>Tier 3: Spatial framework</strong> and{' '}
            <strong>Tier 4: Windbreak &amp; shelter design</strong>. The
            hot/desiccating direction is the primary windbreak orientation.
          </div>
        </div>
      </div>
    );
  }

  // ---------- temperature (p2) ----------
  if (model.kind === 'temperature') {
    return <TemperatureBody model={model} onChange={emit} />;
  }

  // ---------- solar (p5) ----------
  if (model.kind === 'solar') {
    return <SolarBody model={model} onChange={emit} />;
  }

  // ---------- fire (p6) ----------
  if (model.kind === 'fire') {
    return <FireBody model={model} onChange={emit} />;
  }

  // ---------- microclimate (p3) ----------
  return <MicroclimateBody model={model} onChange={emit} />;
}

// ---------------------------------------------------------------------------
// Temperature body -- frost calendar is a derived display (frost-free months)
// computed from the two month selectors. Min/max + heat events persist flat.
// ---------------------------------------------------------------------------

function TemperatureBody({
  model,
  onChange,
}: {
  model: TemperatureModel;
  onChange: (next: TemperatureModel) => void;
}): React.JSX.Element {
  const setField = (
    key: 'minTemp' | 'maxTemp' | 'heatDays',
    v: string,
  ): void => onChange({ ...model, [key]: v });
  const setLast = (v: string): void => onChange({ ...model, lastFrost: v });
  const setFirst = (v: string): void => onChange({ ...model, firstFrost: v });

  const last = Number.parseInt(model.lastFrost, 10);
  const first = Number.parseInt(model.firstFrost, 10);
  const haveFrost =
    Number.isFinite(last) && Number.isFinite(first) && last > 0 && first > 0;
  const frostMonth = (mn: number): boolean => {
    if (!haveFrost) return false;
    return first <= last ? mn >= first && mn <= last : mn >= first || mn <= last;
  };
  const ffMonths = frostFreeMonths(model.lastFrost, model.firstFrost);

  const heatNum = Number.parseFloat(model.heatDays);
  const showHeat = Number.isFinite(heatNum) && heatNum > 0;

  return (
    <div className={css.root} data-climate-mode="temperature">
      <div className={css.tempPair}>
        <div className={css.climateField}>
          <div className={css.cfTop}>
            <span className={css.cfLbl}>Min temp</span>
            <span className={css.cfSub}>coldest month avg</span>
          </div>
          <div className={css.cfInputRow}>
            <input
              type="number"
              className={css.cfInput}
              data-testid="temp-min"
              aria-label="Minimum temperature"
              value={model.minTemp}
              step={0.5}
              placeholder="0"
              onChange={(e) => setField('minTemp', e.target.value)}
            />
            <span className={css.cfUnit}>deg C</span>
          </div>
        </div>
        <div className={css.climateField}>
          <div className={css.cfTop}>
            <span className={css.cfLbl}>Max temp</span>
            <span className={css.cfSub}>hottest month avg</span>
          </div>
          <div className={css.cfInputRow}>
            <input
              type="number"
              className={css.cfInput}
              data-testid="temp-max"
              aria-label="Maximum temperature"
              value={model.maxTemp}
              step={0.5}
              placeholder="0"
              onChange={(e) => setField('maxTemp', e.target.value)}
            />
            <span className={css.cfUnit}>deg C</span>
          </div>
        </div>
      </div>

      <div className={css.frostCal}>
        <div className={css.frostCalLbl}>Frost risk period</div>
        <div className={css.frostInputs}>
          <div className={css.frostInpRow}>
            <span className={css.fiLbl}>Last spring frost (approx month)</span>
            <select
              className={css.fiSel}
              data-testid="frost-last"
              aria-label="Last spring frost month"
              value={model.lastFrost}
              onChange={(e) => setLast(e.target.value)}
            >
              <option value="">Select...</option>
              {LAST_FROST_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className={css.frostInpRow}>
            <span className={css.fiLbl}>First autumn frost (approx month)</span>
            <select
              className={css.fiSel}
              data-testid="frost-first"
              aria-label="First autumn frost month"
              value={model.firstFrost}
              onChange={(e) => setFirst(e.target.value)}
            >
              <option value="">Select...</option>
              {FIRST_FROST_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className={css.monthRow} data-testid="frost-calendar">
          {MONTH_LETTERS.map((m, i) => {
            const on = frostMonth(i + 1);
            return (
              <span
                key={i}
                className={css.mth}
                data-frost={on ? 'true' : 'false'}
              >
                {m}
              </span>
            );
          })}
        </div>
        <div className={css.frostLegend}>
          <span>
            <span className={css.flDot} data-tone="frost" aria-hidden="true" />
            Frost risk
          </span>
          <span>
            <span className={css.flDot} data-tone="free" aria-hidden="true" />
            Frost-free
          </span>
        </div>
        {ffMonths !== null ? (
          <div className={css.frostFree} data-testid="frost-free">
            Frost-free growing period: ~{ffMonths * 30} days ({ffMonths} months)
          </div>
        ) : null}
      </div>

      <div className={css.climateField}>
        <div className={css.cfTop}>
          <span className={css.cfLbl}>Heat events</span>
          <span className={css.cfSub}>days above 40 deg C / year</span>
        </div>
        <div className={css.cfInputRow}>
          <input
            type="number"
            className={css.cfInput}
            data-testid="temp-heat"
            aria-label="Heat event days per year"
            value={model.heatDays}
            min={0}
            step={1}
            placeholder="0"
            onChange={(e) => setField('heatDays', e.target.value)}
          />
          <span className={css.cfUnit}>days/yr</span>
        </div>
        {showHeat ? (
          <div className={css.cfInterp} data-tone="warn" data-testid="heat-interp">
            {heatNum} days above 40 deg C -- plan shade cloth, root cooling, and
            irrigation scheduling for heat events.
          </div>
        ) : null}
      </div>

      <div className={css.feedsBlock}>
        <ArrowRight size={13} className={css.feedsIcon} aria-hidden="true" />
        <div className={css.feedsTxt}>
          Frost dates feed <strong>species selection</strong> and{' '}
          <strong>propagation timing</strong>. Heat event frequency feeds shade
          structure requirements in Tier 4.
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Solar body -- hemisphere drives the descriptive sun-path read-out (derived
// display only). Shade sources + preferred growing face persist flat.
// ---------------------------------------------------------------------------

interface SunCopy {
  summerDesc: string;
  summerDetail: string;
  winterDesc: string;
  winterDetail: string;
}
function sunCopyFor(hemisphere: string): SunCopy | null {
  if (hemisphere === 'S') {
    return {
      summerDesc:
        'High arc across the northern sky. Long days, short shadows. North-facing slopes receive maximum summer radiation.',
      summerDetail:
        'Sun path: E -- high arc to N (peak noon) -- W. Shadow ~0.3x height at noon.',
      winterDesc:
        'Low arc across the northern sky. Short days, long shadows. Hills and structures cast shadows significantly further south than in summer.',
      winterDetail:
        'Sun path: E -- low arc to N (peak noon) -- W. Shadow ~2-3x height at noon.',
    };
  }
  if (hemisphere === 'N') {
    return {
      summerDesc:
        'High arc across the southern sky. Long days, short shadows. South-facing slopes receive maximum summer radiation.',
      summerDetail:
        'Sun path: E -- high arc to S (peak noon) -- W. Shadow ~0.3x height at noon.',
      winterDesc:
        'Low arc across the southern sky. Short days, long shadows. Buildings and hills cast shadows significantly further north.',
      winterDetail:
        'Sun path: E -- low arc to S (peak noon) -- W. Shadow ~2-3x height at noon.',
    };
  }
  return null;
}

function SolarBody({
  model,
  onChange,
}: {
  model: SolarModel;
  onChange: (next: SolarModel) => void;
}): React.JSX.Element {
  const setHemi = (h: string): void =>
    onChange({ ...model, hemisphere: model.hemisphere === h ? '' : h });
  const setFace = (dir: string): void =>
    onChange({ ...model, growingFace: model.growingFace === dir ? '' : dir });
  const setShade = (v: string): void =>
    onChange({ ...model, shadeSources: v });

  const copy = sunCopyFor(model.hemisphere);

  return (
    <div className={css.root} data-climate-mode="solar">
      <div>
        <div className={css.secLbl}>Hemisphere</div>
        <div className={css.sunHemi}>
          <button
            type="button"
            className={css.hemiBtn}
            data-testid="hemi-S"
            data-on={model.hemisphere === 'S' ? 'true' : 'false'}
            aria-pressed={model.hemisphere === 'S'}
            onClick={() => setHemi('S')}
          >
            Southern hemisphere
          </button>
          <button
            type="button"
            className={css.hemiBtn}
            data-testid="hemi-N"
            data-on={model.hemisphere === 'N' ? 'true' : 'false'}
            aria-pressed={model.hemisphere === 'N'}
            onClick={() => setHemi('N')}
          >
            Northern hemisphere
          </button>
        </div>
      </div>

      {copy ? (
        <>
          <div className={css.sunPeriod} data-testid="sun-summer">
            <div className={css.spHead}>
              <span className={css.spDot} data-tone="summer" aria-hidden="true" />
              <span className={css.spLbl}>Summer sun</span>
            </div>
            <div className={css.spDesc}>{copy.summerDesc}</div>
            <div className={css.spDetail}>{copy.summerDetail}</div>
          </div>
          <div className={css.sunPeriod} data-testid="sun-winter">
            <div className={css.spHead}>
              <span className={css.spDot} data-tone="winter" aria-hidden="true" />
              <span className={css.spLbl}>Winter sun</span>
            </div>
            <div className={css.spDesc}>{copy.winterDesc}</div>
            <div className={css.spDetail}>{copy.winterDetail}</div>
          </div>
        </>
      ) : null}

      <div>
        <div className={css.secLbl}>Known shade sources on this site</div>
        <textarea
          className={css.textarea}
          data-testid="solar-shade"
          aria-label="Known shade sources"
          value={model.shadeSources}
          placeholder="e.g. Ridgeline to the NE casts shadow onto lower paddock from 3pm in winter. / Tall pines on south boundary shade kitchen garden from May to Aug."
          onChange={(e) => setShade(e.target.value)}
        />
      </div>

      <div>
        <div className={css.secLbl}>Preferred growing face</div>
        <div className={css.dirChips} data-testid="sun-face">
          {COMPASS_DIRS.map((dir) => {
            const on = model.growingFace === dir;
            return (
              <button
                key={dir}
                type="button"
                className={css.dirChip}
                data-testid={`sun-face-${dir}`}
                data-on={on ? 'true' : 'false'}
                aria-pressed={on}
                onClick={() => setFace(dir)}
              >
                {dir}
              </button>
            );
          })}
        </div>
      </div>

      <div className={css.feedsBlock}>
        <ArrowRight size={13} className={css.feedsIcon} aria-hidden="true" />
        <div className={css.feedsTxt}>
          Sun sectors feed <strong>Tier 3: Spatial framework</strong>,{' '}
          <strong>Tier 4: Building placement</strong>, and all growing zone
          orientation decisions.
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fire body -- risk level drives the computed APZ requirement box (derived
// display only). Approach direction, landscape position, and fuel type persist
// flat. Single-select chip groups for position + fuel.
// ---------------------------------------------------------------------------

function FireBody({
  model,
  onChange,
}: {
  model: FireModel;
  onChange: (next: FireModel) => void;
}): React.JSX.Element {
  const setRisk = (id: string): void =>
    onChange({ ...model, riskLevel: model.riskLevel === id ? '' : id });
  const setDir = (dir: string): void =>
    onChange({ ...model, approachDir: model.approachDir === dir ? '' : dir });
  const setPosition = (p: string): void =>
    onChange({ ...model, position: model.position === p ? '' : p });
  const setFuel = (f: string): void =>
    onChange({ ...model, fuelType: model.fuelType === f ? '' : f });

  const apz = model.riskLevel ? FIRE_RISK_BY_ID[model.riskLevel] : undefined;

  return (
    <div className={css.root} data-climate-mode="fire">
      <div>
        <div className={css.secLbl}>Fire risk level</div>
        <div className={css.riskLevels}>
          {FIRE_RISK_LEVELS.map((r) => {
            const on = model.riskLevel === r.id;
            return (
              <button
                key={r.id}
                type="button"
                className={css.riskBtn}
                data-testid={`fire-risk-${r.id}`}
                data-tone={r.id}
                data-on={on ? 'true' : 'false'}
                aria-pressed={on}
                onClick={() => setRisk(r.id)}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className={css.secLbl}>
          Primary fire approach direction{' '}
          <span className={css.secOptional}>
            (direction fire typically approaches FROM)
          </span>
        </div>
        <div className={css.dirChips} data-testid="fire-dir">
          {COMPASS_DIRS.map((dir) => {
            const on = model.approachDir === dir;
            return (
              <button
                key={dir}
                type="button"
                className={css.dirChip}
                data-testid={`fire-dir-${dir}`}
                data-on={on ? 'true' : 'false'}
                data-fire="true"
                aria-pressed={on}
                onClick={() => setDir(dir)}
              >
                {dir}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className={css.secLbl}>Landscape position</div>
        <div className={css.fireSelect} data-testid="fire-position">
          {FIRE_POSITIONS.map((p) => {
            const on = model.position === p;
            return (
              <button
                key={p}
                type="button"
                className={css.fireSelBtn}
                data-on={on ? 'true' : 'false'}
                aria-pressed={on}
                onClick={() => setPosition(p)}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className={css.secLbl}>Primary fuel type</div>
        <div className={css.fireSelect} data-testid="fire-fuel">
          {FIRE_FUELS.map((f) => {
            const on = model.fuelType === f;
            return (
              <button
                key={f}
                type="button"
                className={css.fireSelBtn}
                data-on={on ? 'true' : 'false'}
                aria-pressed={on}
                onClick={() => setFuel(f)}
              >
                {f}
              </button>
            );
          })}
        </div>
      </div>

      {apz ? (
        <div className={css.apzBox} data-tone={apz.tone} data-testid="apz-box">
          <div className={css.apzLbl}>
            <Ruler size={11} aria-hidden="true" /> Asset Protection Zone
            requirement
          </div>
          <div className={css.apzMain}>{apz.main}</div>
          <div className={css.apzDetail}>{apz.detail}</div>
        </div>
      ) : null}

      <div className={css.feedsBlock}>
        <ArrowRight size={13} className={css.feedsIcon} aria-hidden="true" />
        <div className={css.feedsTxt}>
          Fire risk feeds <strong>Tier 3: Spatial framework</strong> (building
          placement exclusion zones), <strong>Tier 4: Access design</strong>{' '}
          (emergency egress), and all fuel load management protocols.
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Microclimate body -- a feature checklist (multi-select) plus an observations
// textarea. Marked features reveal their design-implication note.
// ---------------------------------------------------------------------------

function MicroclimateBody({
  model,
  onChange,
}: {
  model: MicroclimateModel;
  onChange: (next: MicroclimateModel) => void;
}): React.JSX.Element {
  const toggleFeature = (key: string): void =>
    onChange({
      ...model,
      features: model.features.includes(key)
        ? model.features.filter((f) => f !== key)
        : [...model.features, key],
    });
  const setObservations = (v: string): void =>
    onChange({ ...model, observations: v });

  return (
    <div className={css.root} data-climate-mode="microclimate">
      <div>
        <div className={css.secLbl}>
          Identify which features are present{' '}
          <span className={css.secOptional}>(observe and mark)</span>
        </div>
        <div className={css.mcList}>
          {MICRO_FEATURES.map((f) => {
            const on = model.features.includes(f.key);
            return (
              <React.Fragment key={f.key}>
                <button
                  type="button"
                  className={css.mcItem}
                  data-testid={`micro-${f.key}`}
                  data-on={on ? 'true' : 'false'}
                  aria-pressed={on}
                  onClick={() => toggleFeature(f.key)}
                >
                  <span className={css.mcChk} aria-hidden="true" />
                  <span className={css.mcLbl}>{f.label}</span>
                </button>
                {on && f.note ? (
                  <div className={css.mcNote}>{f.note}</div>
                ) : null}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div>
        <div className={css.secLbl}>Observations &amp; notes</div>
        <textarea
          className={css.textarea}
          data-testid="micro-observations"
          aria-label="Microclimate observations"
          value={model.observations}
          placeholder="Any additional microclimate observations -- unusual frost events, wind channelling, waterlogging, etc."
          onChange={(e) => setObservations(e.target.value)}
        />
      </div>

      <div className={css.feedsBlock}>
        <ArrowRight size={13} className={css.feedsIcon} aria-hidden="true" />
        <div className={css.feedsTxt}>
          Microclimate features feed{' '}
          <strong>Tier 3: Spatial framework &amp; zone allocation</strong>.
          Frost hollows, shelter pockets, and heat traps are primary zone
          placement inputs.
        </div>
      </div>
    </div>
  );
}

export default ClimateCapture;
