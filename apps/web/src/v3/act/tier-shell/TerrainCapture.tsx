/**
 * TerrainCapture -- a multi-mode CONTROLLED capture for objective s2-terrain
 * (5 checklist items c1..c5). Ported from olos_terrain_survey.html right-hand
 * panels p1..p5, re-ordered by SUBJECT (catalogue item order != mockup panel
 * order):
 *
 *   c1 -> mapSource  (mockup p1: primary data-source grid + dataset details)
 *   c2 -> slope      (mockup p3: slope distribution + aspects multi-select)
 *   c3 -> elevation  (mockup p2: highest/lowest + relief interp + drainage)
 *   c4 -> landform   (mockup p4: landform register add/list cards)
 *   c5 -> erosion    (mockup p5: erosion types + risk level + constraint box)
 *
 * Structure mirrors ProvisionBalanceCapture (the canonical multi-mode capture):
 * a `terrainModeFor(itemId)` mapper plus a single component that renders ONE
 * mode body. The panel chrome (header / eyebrow / title / hint / feeds /
 * gate-note / Record-Defer footer) is owned by DecisionWorkingPanel -- this
 * capture renders ONLY the mode body blocks.
 *
 * Each mode persists its OWN keys in the per-item flat FormValue
 * (Record<string, string | string[]>). decode is TOTAL/defensive (non-array ->
 * empty; per-entry try/catch JSON.parse for the landform feature list; drop
 * text-less/malformed entries; coerce to defaults; NEVER fabricate seed data --
 * the mockup shows seeded demo data, but this capture starts EMPTY).
 *
 * CONTROLLED / pure: the model is always derived from decode(value) each render;
 * the full next model is emitted via onChange(encode(next)). Stable per-entry
 * ids (landform features) are minted by makeFeatureId() in EVENT HANDLERS ONLY
 * (never in decode/render) and used as React keys (never array index).
 *
 * ASCII-only: em-dash -> " -- ", superscript-2 -> "2"; all icons are lucide.
 */

import * as React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Database,
  FileText,
  Plus,
  Ruler,
  Satellite,
  X,
} from 'lucide-react';
import type { FormValue } from './actToolCatalog.js';
import css from './TerrainCapture.module.css';

// ---------------------------------------------------------------------------
// Mode mapper
// ---------------------------------------------------------------------------

export type TerrainMode =
  | 'mapSource'
  | 'slope'
  | 'elevation'
  | 'landform'
  | 'erosion';

export function terrainModeFor(itemId: string): TerrainMode | null {
  switch (itemId) {
    case 's2-terrain-c1':
      return 'mapSource';
    case 's2-terrain-c2':
      return 'slope';
    case 's2-terrain-c3':
      return 'elevation';
    case 's2-terrain-c4':
      return 'landform';
    case 's2-terrain-c5':
      return 'erosion';
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Stable id factory (landform feature rows). Module-scoped, pure -- no
// import-time side-effects; CALLED ONLY IN EVENT HANDLERS.
// ---------------------------------------------------------------------------

function makeFeatureId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'lf-' + Math.random().toString(36).slice(2, 10);
}

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

export interface MapSourceModel {
  kind: 'mapSource';
  method: string;
  contourInterval: string;
  dataDate: string;
  accuracy: string;
  coverage: string;
}

export interface SlopeModel {
  kind: 'slope';
  /** keyed by slope class key -> percentage string. */
  allocations: Record<string, string>;
  aspects: string[];
}

export interface ElevationModel {
  kind: 'elevation';
  highest: string;
  lowest: string;
  drainageDir: string;
  divides: string[];
  dividesNote: string;
}

export type LandformType =
  | 'flat'
  | 'ridge'
  | 'saddle'
  | 'hollow'
  | 'valley'
  | 'bench';

export interface LandformFeature {
  id: string;
  type: LandformType;
  name: string;
  size: string;
  elevation: string;
}

export interface LandformModel {
  kind: 'landform';
  features: LandformFeature[];
}

export interface ErosionModel {
  kind: 'erosion';
  types: string[];
  massMovement: boolean;
  riskLevel: string;
  affected: string;
}

export type TerrainModel =
  | MapSourceModel
  | SlopeModel
  | ElevationModel
  | LandformModel
  | ErosionModel;

// ---------------------------------------------------------------------------
// Verbatim domain data (copied from the mockup p1..p5)
// ---------------------------------------------------------------------------

type MethodQuality = 'high' | 'highest' | 'med' | 'basic';

interface MethodCard {
  id: string;
  qualityLabel: string;
  quality: MethodQuality;
  icon: typeof Database;
  name: string;
  desc: string;
  when: string;
}

const METHOD_CARDS: readonly MethodCard[] = [
  {
    id: 'lidar',
    qualityLabel: 'High res',
    quality: 'high',
    icon: Database,
    name: 'LiDAR -- government dataset',
    desc: '1m or better resolution. Available free from Geoscience Australia, LINZ, or state portals.',
    when: 'Best if: site >= 2ha, area is mapped, budget limited',
  },
  {
    id: 'drone',
    qualityLabel: 'Highest res',
    quality: 'highest',
    icon: Satellite,
    name: 'Drone photogrammetry',
    desc: 'Sub-metre accuracy on complex terrain. Requires equipment, operator, or contractor.',
    when: 'Best if: complex terrain, budget allows',
  },
  {
    id: 'survey',
    qualityLabel: 'Certified',
    quality: 'highest',
    icon: Ruler,
    name: 'Professional survey',
    desc: 'Licensed surveyor produces certified topographic map. Required for some regulatory contexts.',
    when: 'Best if: development application, legal requirement',
  },
  {
    id: 'gps',
    qualityLabel: 'Medium res',
    quality: 'med',
    icon: Satellite,
    name: 'GPS field survey',
    desc: 'Walk key contours with GPS. Time-intensive but integrates direct field observation.',
    when: 'Best if: small site <= 2ha, field time available',
  },
  {
    id: 'existing',
    qualityLabel: 'Variable',
    quality: 'med',
    icon: FileText,
    name: 'Existing property survey',
    desc: 'Use existing cadastral or engineering survey documents. May have limited elevation coverage.',
    when: 'Best if: recent survey exists for this title',
  },
  {
    id: 'satellite',
    qualityLabel: 'Basic 30m',
    quality: 'basic',
    icon: Satellite,
    name: 'Satellite / SRTM data',
    desc: '30m SRTM terrain data freely available. Useful for preliminary planning only.',
    when: 'Best if: site > 50ha, scoping only',
  },
];
const METHOD_NAME: Record<string, string> = Object.fromEntries(
  METHOD_CARDS.map((c) => [c.id, c.name]),
);

interface DatasetField {
  key: 'contourInterval' | 'dataDate' | 'accuracy' | 'coverage';
  label: string;
  placeholder: string;
}
const DATASET_FIELDS: readonly DatasetField[] = [
  { key: 'contourInterval', label: 'Contour interval', placeholder: 'e.g. 0.5m, 1m, 5m' },
  { key: 'dataDate', label: 'Data date', placeholder: 'Year of data' },
  { key: 'accuracy', label: 'Horizontal accuracy', placeholder: 'e.g. +/-1m' },
  { key: 'coverage', label: 'Coverage', placeholder: 'Full / Partial' },
];

interface SlopeClass {
  key: string;
  label: string;
  sub: string;
  /** css var token for the fill / dot colour. */
  tone: 'flat' | 'gentle' | 'mod' | 'steep' | 'vsteep' | 'extreme';
}
const SLOPE_CLASSES: readonly SlopeClass[] = [
  { key: 'flat', label: 'Flat', sub: '0-2%', tone: 'flat' },
  { key: 'gentle', label: 'Gentle', sub: '2-5%', tone: 'gentle' },
  { key: 'moderate', label: 'Moderate', sub: '5-10%', tone: 'mod' },
  { key: 'steep', label: 'Steep', sub: '10-20%', tone: 'steep' },
  { key: 'vsteep', label: 'Very steep', sub: '20-30%', tone: 'vsteep' },
  { key: 'extreme', label: 'Extreme', sub: '>30%', tone: 'extreme' },
];
const SLOPE_KEYS = new Set(SLOPE_CLASSES.map((c) => c.key));

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

interface LandformTypeSpec {
  id: LandformType;
  label: string;
  tone: string;
  implication: string;
}
const LANDFORM_TYPES: readonly LandformTypeSpec[] = [
  {
    id: 'flat',
    label: 'Flat area',
    tone: 'flat',
    implication:
      'Most versatile zone -- suitable for buildings, intensive production, and vehicle turning. Monitor for waterlogging in wet conditions.',
  },
  {
    id: 'ridge',
    label: 'Ridgeline',
    tone: 'ridge',
    implication:
      'Maximum wind and temperature exposure. Good drainage and views. Avoid buildings without windbreak design. Fire risk elevated along ridge.',
  },
  {
    id: 'saddle',
    label: 'Saddle',
    tone: 'saddle',
    implication:
      'Natural crossing point -- ideal for tracks and fencing. Wind tunnel risk. Microclimate variable; observe before placing sensitive plantings.',
  },
  {
    id: 'hollow',
    label: 'Hollow',
    tone: 'hollow',
    implication:
      'Cold air drainage -- frost risk significantly above regional average. High moisture and biodiversity. Excellent for water harvesting. Avoid frost-sensitive plantings.',
  },
  {
    id: 'valley',
    label: 'Valley / Creek flat',
    tone: 'valley',
    implication:
      'High fertility from sediment accumulation. Flood risk -- determine 100-year flood level before infrastructure placement. Access constrained when wet.',
  },
  {
    id: 'bench',
    label: 'Bench / Terrace',
    tone: 'bench',
    implication:
      'Natural terracing, often indicating geological structure or prior land use. Good for track placement. May have constrained soil depth to rock.',
  },
];
const LANDFORM_LABEL: Record<string, string> = Object.fromEntries(
  LANDFORM_TYPES.map((t) => [t.id, t.label]),
);
const LANDFORM_TONE: Record<string, string> = Object.fromEntries(
  LANDFORM_TYPES.map((t) => [t.id, t.tone]),
);
const LANDFORM_IMPL: Record<string, string> = Object.fromEntries(
  LANDFORM_TYPES.map((t) => [t.id, t.implication]),
);
const LANDFORM_TYPE_SET = new Set<string>(LANDFORM_TYPES.map((t) => t.id));

const EROSION_TYPES: ReadonlyArray<{ key: string; label: string }> = [
  { key: 'sheet', label: 'Sheet erosion' },
  { key: 'rill', label: 'Rill erosion' },
  { key: 'gully', label: 'Gully erosion' },
  { key: 'tunnel', label: 'Tunnel / piping' },
];
const EROSION_TYPE_SET = new Set(EROSION_TYPES.map((e) => e.key));

interface RiskSpec {
  id: 'low' | 'mod' | 'hgh';
  label: string;
  main: string;
  detail: string;
}
const RISK_LEVELS: readonly RiskSpec[] = [
  {
    id: 'low',
    label: 'Low',
    main: 'Standard earthworks permitted',
    detail:
      'Appropriate revegetation and drainage required on disturbed soils. No restrictions on vehicle access or earthworks beyond standard practice.',
  },
  {
    id: 'mod',
    label: 'Moderate',
    main: 'Contour earthworks and soil protection required',
    detail:
      'No heavy vehicle access on identified slopes >15%. Swales, earthworks, and revegetation should precede productive use. Mulch or geofabric on any disturbed soil before first rain event.',
  },
  {
    id: 'hgh',
    label: 'High',
    main: 'Engineering assessment recommended',
    detail:
      'Slope stabilisation and revegetation must precede earthworks in risk areas. Minimum 20% vegetation cover before any soil disturbance. Consult geotechnical engineer for earthworks on slopes >20%.',
  },
];
const RISK_BY_ID: Record<string, RiskSpec> = Object.fromEntries(
  RISK_LEVELS.map((r) => [r.id, r]),
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

/** Relief interpretation for an elevation range (m). Pure; mirrors the mockup. */
export function reliefInterpretation(range: number): {
  text: string;
  tone: 'flat' | 'gentle' | 'mod' | 'steep' | 'extreme';
} {
  if (range < 5) {
    return {
      text: 'Flat site -- drainage is the primary design challenge',
      tone: 'flat',
    };
  }
  if (range < 25) {
    return { text: 'Gentle relief -- suitable for most uses', tone: 'gentle' };
  }
  if (range < 60) {
    return { text: 'Moderate relief -- slope work feasible', tone: 'mod' };
  }
  if (range < 120) {
    return {
      text: 'Significant relief -- slope management critical',
      tone: 'steep',
    };
  }
  return {
    text: 'High relief -- specialist earthworks required',
    tone: 'extreme',
  };
}

// ---------------------------------------------------------------------------
// decode: FormValue -> TerrainModel (TOTAL / defensive; never throws, never
// fabricates seed data).
// ---------------------------------------------------------------------------

export function decodeTerrain(mode: TerrainMode, value: FormValue): TerrainModel {
  switch (mode) {
    case 'mapSource':
      return {
        kind: 'mapSource',
        method: asStr(value.terrainMethod),
        contourInterval: asStr(value.terrainContourInterval),
        dataDate: asStr(value.terrainDataDate),
        accuracy: asStr(value.terrainAccuracy),
        coverage: asStr(value.terrainCoverage),
      };
    case 'slope': {
      const allocations: Record<string, string> = {};
      for (const entry of asArr(value.terrainSlope)) {
        if (typeof entry !== 'string') continue;
        const sep = entry.indexOf('::');
        if (sep <= 0) continue;
        const key = entry.slice(0, sep);
        const pct = entry.slice(sep + 2);
        if (!SLOPE_KEYS.has(key)) continue;
        allocations[key] = pct;
      }
      const aspects = asArr(value.terrainAspects).filter((a) =>
        COMPASS_SET.has(a),
      );
      return { kind: 'slope', allocations, aspects };
    }
    case 'elevation': {
      const divides = asArr(value.terrainDivides).filter(
        (d) => d === 'yes' || d === 'no',
      );
      return {
        kind: 'elevation',
        highest: asStr(value.terrainHighest),
        lowest: asStr(value.terrainLowest),
        drainageDir: COMPASS_SET.has(asStr(value.terrainDrainageDir))
          ? asStr(value.terrainDrainageDir)
          : '',
        divides,
        dividesNote: asStr(value.terrainDividesNote),
      };
    }
    case 'landform': {
      const features: LandformFeature[] = [];
      let index = 0;
      for (const entry of asArr(value.terrainLandforms)) {
        if (typeof entry !== 'string') {
          index++;
          continue;
        }
        try {
          const parsed: unknown = JSON.parse(entry);
          if (
            parsed === null ||
            typeof parsed !== 'object' ||
            typeof (parsed as { type?: unknown }).type !== 'string'
          ) {
            index++;
            continue;
          }
          const p = parsed as {
            id?: unknown;
            type: string;
            name?: unknown;
            size?: unknown;
            elevation?: unknown;
          };
          if (!LANDFORM_TYPE_SET.has(p.type)) {
            index++;
            continue;
          }
          const id: string =
            typeof p.id === 'string' && p.id !== '' ? p.id : 'legacy-' + index;
          features.push({
            id,
            type: p.type as LandformType,
            name: typeof p.name === 'string' ? p.name : '',
            size: typeof p.size === 'string' ? p.size : '',
            elevation: typeof p.elevation === 'string' ? p.elevation : '',
          });
        } catch {
          // drop malformed entry
        }
        index++;
      }
      return { kind: 'landform', features };
    }
    case 'erosion': {
      const types = asArr(value.terrainErosionTypes).filter((t) =>
        EROSION_TYPE_SET.has(t),
      );
      const riskLevel = asStr(value.terrainRiskLevel);
      return {
        kind: 'erosion',
        types,
        massMovement: asStr(value.terrainMassMovement) === 'true',
        riskLevel:
          riskLevel === 'low' || riskLevel === 'mod' || riskLevel === 'hgh'
            ? riskLevel
            : '',
        affected: asStr(value.terrainAffected),
      };
    }
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown TerrainMode: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// encode: TerrainModel -> FormValue (lossless inverse of decode).
// ---------------------------------------------------------------------------

export function encodeTerrain(model: TerrainModel): FormValue {
  switch (model.kind) {
    case 'mapSource':
      return {
        terrainMethod: model.method,
        terrainContourInterval: model.contourInterval,
        terrainDataDate: model.dataDate,
        terrainAccuracy: model.accuracy,
        terrainCoverage: model.coverage,
      };
    case 'slope':
      return {
        terrainSlope: Object.entries(model.allocations).map(
          ([k, v]) => `${k}::${v}`,
        ),
        terrainAspects: [...model.aspects],
      };
    case 'elevation':
      return {
        terrainHighest: model.highest,
        terrainLowest: model.lowest,
        terrainDrainageDir: model.drainageDir,
        terrainDivides: [...model.divides],
        terrainDividesNote: model.dividesNote,
      };
    case 'landform':
      return {
        terrainLandforms: model.features.map((f) => JSON.stringify(f)),
      };
    case 'erosion':
      return {
        terrainErosionTypes: [...model.types],
        terrainMassMovement: model.massMovement ? 'true' : 'false',
        terrainRiskLevel: model.riskLevel,
        terrainAffected: model.affected,
      };
  }
}

// ---------------------------------------------------------------------------
// validity gates (per mode)
// ---------------------------------------------------------------------------

/** Sum of slope allocations (NaN entries treated as 0). */
function slopeSum(allocations: Record<string, string>): number {
  return Object.values(allocations).reduce((acc, raw) => {
    const n = Number.parseFloat(raw);
    return acc + (Number.isFinite(n) ? n : 0);
  }, 0);
}

export function isTerrainValid(model: TerrainModel): boolean {
  switch (model.kind) {
    case 'mapSource':
      return model.method !== '';
    case 'slope':
      return Math.abs(slopeSum(model.allocations) - 100) <= 2;
    case 'elevation': {
      const hi = Number.parseFloat(model.highest);
      const lo = Number.parseFloat(model.lowest);
      return Number.isFinite(hi) && Number.isFinite(lo) && hi >= lo;
    }
    case 'landform':
      return model.features.length >= 1;
    case 'erosion':
      return model.riskLevel !== '' || model.massMovement;
  }
}

// ---------------------------------------------------------------------------
// record-summary mirror (per mode)
// ---------------------------------------------------------------------------

export function summariseTerrain(model: TerrainModel): string {
  switch (model.kind) {
    case 'mapSource':
      return METHOD_NAME[model.method] ?? model.method;
    case 'slope': {
      const sum = Math.round(slopeSum(model.allocations));
      return `${sum}% allocated, ${model.aspects.length} aspect(s)`;
    }
    case 'elevation': {
      const hi = Number.parseFloat(model.highest);
      const lo = Number.parseFloat(model.lowest);
      const range =
        Number.isFinite(hi) && Number.isFinite(lo)
          ? Math.max(0, hi - lo)
          : 0;
      const dir = model.drainageDir === '' ? 'undirected' : model.drainageDir;
      return `${range} m relief, drains ${dir}`;
    }
    case 'landform': {
      const n = model.features.length;
      const types = new Set(model.features.map((f) => f.type)).size;
      return `${n} feature(s), ${types} type(s)`;
    }
    case 'erosion': {
      if (model.massMovement) {
        return 'Mass movement flagged -- geotechnical assessment required';
      }
      const label =
        RISK_BY_ID[model.riskLevel]?.label ?? model.riskLevel;
      return `${label} erosion risk, ${model.types.length} type(s)`;
    }
  }
}

// ---------------------------------------------------------------------------
// Component (renders ONLY the body for the resolved mode).
// ---------------------------------------------------------------------------

export interface TerrainCaptureProps {
  mode: TerrainMode;
  value: FormValue;
  onChange: (next: FormValue) => void;
}

export function TerrainCapture({
  mode,
  value,
  onChange,
}: TerrainCaptureProps): React.JSX.Element {
  const model = decodeTerrain(mode, value);
  const emit = (next: TerrainModel): void => onChange(encodeTerrain(next));

  // ---------- mapSource (p1) ----------
  if (model.kind === 'mapSource') {
    const selectMethod = (id: string): void =>
      emit({ ...model, method: model.method === id ? '' : id });
    const setField = (key: DatasetField['key'], v: string): void =>
      emit({ ...model, [key]: v });
    const open = model.method !== '';
    return (
      <div className={css.root} data-terrain-mode="mapSource">
        <div>
          <div className={css.secLbl}>Primary data source</div>
          <div className={css.methodGrid}>
            {METHOD_CARDS.map((card) => {
              const on = model.method === card.id;
              const Icon = card.icon;
              return (
                <button
                  key={card.id}
                  type="button"
                  className={css.methodCard}
                  data-testid={`method-${card.id}`}
                  data-on={on ? 'true' : 'false'}
                  aria-pressed={on}
                  onClick={() => selectMethod(card.id)}
                >
                  <span
                    className={css.methodQuality}
                    data-quality={card.quality}
                  >
                    {card.qualityLabel}
                  </span>
                  <Icon size={14} className={css.methodIcon} aria-hidden="true" />
                  <span className={css.methodName}>{card.name}</span>
                  <span className={css.methodDesc}>{card.desc}</span>
                  <span className={css.methodWhen}>{card.when}</span>
                </button>
              );
            })}
          </div>
        </div>

        {open ? (
          <div className={css.methodDetail} data-testid="dataset-details">
            <div className={css.detailLbl}>Dataset details</div>
            <div className={css.detailFields}>
              {DATASET_FIELDS.map((f) => (
                <div key={f.key} className={css.detailField}>
                  <span className={css.detailFieldLbl}>{f.label}</span>
                  <input
                    type="text"
                    className={css.detailInput}
                    data-testid={`dataset-${f.key}`}
                    aria-label={f.label}
                    value={model[f.key]}
                    placeholder={f.placeholder}
                    onChange={(e) => setField(f.key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className={css.feedsBlock}>
          <ArrowRight size={13} className={css.feedsIcon} aria-hidden="true" />
          <div className={css.feedsTxt}>
            Data source and resolution are recorded with the topographic survey
            -- this informs how much confidence to place in the design precision
            of all slope and drainage decisions.
          </div>
        </div>
      </div>
    );
  }

  // ---------- slope (p3) ----------
  if (model.kind === 'slope') {
    const sum = slopeSum(model.allocations);
    const setAlloc = (key: string, v: string): void =>
      emit({
        kind: 'slope',
        allocations: { ...model.allocations, [key]: v },
        aspects: model.aspects,
      });
    const toggleAspect = (dir: string): void =>
      emit({
        kind: 'slope',
        allocations: model.allocations,
        aspects: model.aspects.includes(dir)
          ? model.aspects.filter((a) => a !== dir)
          : [...model.aspects, dir],
      });
    let sumTone: 'ok' | 'over' | 'under';
    let sumLabel: string;
    if (Math.abs(sum - 100) <= 2) {
      sumTone = 'ok';
      sumLabel = '100%';
    } else if (sum > 102) {
      sumTone = 'over';
      sumLabel = `${sum.toFixed(0)}% -- exceeds 100%`;
    } else {
      sumTone = 'under';
      sumLabel = `${sum.toFixed(0)}% -- ${(100 - sum).toFixed(0)}% remaining`;
    }
    return (
      <div className={css.root} data-terrain-mode="slope">
        <div>
          <div className={css.secLbl}>
            Slope distribution{' '}
            <span className={css.secOptional}>
              -- allocate site area across classes
            </span>
          </div>
          <div className={css.slopeRows}>
            {SLOPE_CLASSES.map((cls) => {
              const raw = model.allocations[cls.key] ?? '';
              const n = Number.parseFloat(raw);
              const fill = Number.isFinite(n) ? Math.min(Math.max(n, 0), 100) : 0;
              return (
                <div key={cls.key} className={css.slopeRow} data-tone={cls.tone}>
                  <span
                    className={css.slopeFill}
                    style={{ width: `${fill}%` }}
                    aria-hidden="true"
                  />
                  <span className={css.slopeDot} aria-hidden="true" />
                  <span className={css.slopeLbl}>
                    {cls.label} <span className={css.slopeSub}>{cls.sub}</span>
                  </span>
                  <input
                    type="number"
                    className={css.slopeInput}
                    data-testid={`slope-${cls.key}`}
                    aria-label={`${cls.label} percentage`}
                    value={raw}
                    min={0}
                    max={100}
                    placeholder="0"
                    onChange={(e) => setAlloc(cls.key, e.target.value)}
                  />
                  <span className={css.slopePct}>%</span>
                </div>
              );
            })}
          </div>
          <div className={css.slopeSumRow}>
            <span className={css.slopeSumLbl}>Total allocated</span>
            <span
              className={css.slopeSumVal}
              data-tone={sumTone}
              data-testid="slope-sum"
            >
              {sumLabel}
            </span>
          </div>
        </div>

        <div>
          <div className={css.secLbl}>
            Aspects present{' '}
            <span className={css.secOptional}>
              (tick all that exist on the site -- multi-select)
            </span>
          </div>
          <div className={css.aspectHint}>
            In the southern hemisphere, N-facing = warm/productive &middot;
            S-facing = cool/sheltered
          </div>
          <div className={css.dirChips} data-testid="aspect-chips">
            {COMPASS_DIRS.map((dir) => {
              const on = model.aspects.includes(dir);
              return (
                <button
                  key={dir}
                  type="button"
                  className={css.dirChip}
                  data-testid={`aspect-${dir}`}
                  data-on={on ? 'true' : 'false'}
                  aria-pressed={on}
                  onClick={() => toggleAspect(dir)}
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
            Slope distribution feeds <strong>Tier 3: Zone allocation</strong>.
            Areas over 20% slope are typically excluded from vehicle access and
            intensive production without earthworks assessment.
          </div>
        </div>
      </div>
    );
  }

  // ---------- elevation (p2) ----------
  if (model.kind === 'elevation') {
    const hi = Number.parseFloat(model.highest);
    const lo = Number.parseFloat(model.lowest);
    const haveRange = Number.isFinite(hi) && Number.isFinite(lo);
    const range = haveRange ? Math.max(0, hi - lo) : null;
    const interp = range !== null ? reliefInterpretation(range) : null;
    const setField = (
      key: 'highest' | 'lowest' | 'dividesNote',
      v: string,
    ): void => emit({ ...model, [key]: v });
    const setDir = (dir: string): void =>
      emit({ ...model, drainageDir: model.drainageDir === dir ? '' : dir });
    const setDivide = (v: 'yes' | 'no'): void =>
      emit({ ...model, divides: model.divides.includes(v) ? [] : [v] });
    return (
      <div className={css.root} data-terrain-mode="elevation">
        <div>
          <div className={css.secLbl}>Elevation</div>
          <div className={css.elevPair}>
            <div className={css.elevField}>
              <div className={css.elevFieldLbl}>Highest point</div>
              <input
                type="number"
                className={css.elevInput}
                data-testid="elev-highest"
                aria-label="Highest point"
                value={model.highest}
                placeholder="0"
                onChange={(e) => setField('highest', e.target.value)}
              />
              <span className={css.elevUnit}>m ASL</span>
            </div>
            <div className={css.elevField}>
              <div className={css.elevFieldLbl}>Lowest point</div>
              <input
                type="number"
                className={css.elevInput}
                data-testid="elev-lowest"
                aria-label="Lowest point"
                value={model.lowest}
                placeholder="0"
                onChange={(e) => setField('lowest', e.target.value)}
              />
              <span className={css.elevUnit}>m ASL</span>
            </div>
          </div>
          {interp ? (
            <div className={css.elevRange} data-testid="elev-range">
              <div>
                <span className={css.elevRangeLbl}>Total relief</span>{' '}
                <span className={css.elevRangeVal}>{range} m</span>
              </div>
              <span className={css.elevInterp} data-tone={interp.tone}>
                {interp.text}
              </span>
            </div>
          ) : null}
        </div>

        <div>
          <div className={css.secLbl}>
            Primary drainage direction{' '}
            <span className={css.secOptional}>(water flows toward)</span>
          </div>
          <div className={css.dirChips} data-testid="drainage-chips">
            {COMPASS_DIRS.map((dir) => {
              const on = model.drainageDir === dir;
              return (
                <button
                  key={dir}
                  type="button"
                  className={css.dirChip}
                  data-testid={`drainage-${dir}`}
                  data-on={on ? 'true' : 'false'}
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
          <div className={css.secLbl}>Drainage divides on site</div>
          <div className={css.divideChips}>
            <button
              type="button"
              className={css.divideChip}
              data-testid="divide-yes"
              data-on={model.divides.includes('yes') ? 'true' : 'false'}
              aria-pressed={model.divides.includes('yes')}
              onClick={() => setDivide('yes')}
            >
              Yes -- divide identified
            </button>
            <button
              type="button"
              className={css.divideChip}
              data-testid="divide-no"
              data-on={model.divides.includes('no') ? 'true' : 'false'}
              aria-pressed={model.divides.includes('no')}
              onClick={() => setDivide('no')}
            >
              No divide -- single catchment
            </button>
          </div>
          <textarea
            className={css.textarea}
            data-testid="divides-note"
            aria-label="Drainage divides note"
            value={model.dividesNote}
            placeholder="Note the location or description of any drainage divides..."
            onChange={(e) => setField('dividesNote', e.target.value)}
          />
        </div>

        <div className={css.feedsBlock}>
          <ArrowRight size={13} className={css.feedsIcon} aria-hidden="true" />
          <div className={css.feedsTxt}>
            Elevation range and drainage direction feed{' '}
            <strong>Tier 2: Water movement survey</strong> and determine where
            water enters and leaves the site.
          </div>
        </div>
      </div>
    );
  }

  // ---------- landform (p4) ----------
  if (model.kind === 'landform') {
    return <LandformBody model={model} onChange={emit} />;
  }

  // ---------- erosion (p5) ----------
  return <ErosionBody model={model} onChange={emit} />;
}

// ---------------------------------------------------------------------------
// Landform body -- carries UI-only state (the open add-form fields). Feature id
// minting happens here, in handlers only.
// ---------------------------------------------------------------------------

function LandformBody({
  model,
  onChange,
}: {
  model: LandformModel;
  onChange: (next: LandformModel) => void;
}): React.JSX.Element {
  const [formOpen, setFormOpen] = React.useState(false);
  const [draftType, setDraftType] = React.useState<LandformType>('flat');
  const [draftName, setDraftName] = React.useState('');
  const [draftSize, setDraftSize] = React.useState('');
  const [draftElev, setDraftElev] = React.useState('');

  const count = model.features.length;
  const typeCount = new Set(model.features.map((f) => f.type)).size;
  const haMapped = model.features.reduce((acc, f) => {
    const m = /([\d.]+)\s*ha/i.exec(f.size);
    return acc + (m ? Number.parseFloat(m[1]!) || 0 : 0);
  }, 0);

  const resetForm = (): void => {
    setDraftType('flat');
    setDraftName('');
    setDraftSize('');
    setDraftElev('');
  };

  const addFeature = (): void => {
    onChange({
      kind: 'landform',
      features: [
        ...model.features,
        {
          id: makeFeatureId(),
          type: draftType,
          name: draftName.trim(),
          size: draftSize.trim(),
          elevation: draftElev.trim(),
        },
      ],
    });
    resetForm();
    setFormOpen(false);
  };

  const removeFeature = (id: string): void =>
    onChange({
      kind: 'landform',
      features: model.features.filter((f) => f.id !== id),
    });

  return (
    <div className={css.root} data-terrain-mode="landform">
      <div>
        <div className={css.secLbl}>
          Landform register{' '}
          <span className={css.lfCount} data-testid="landform-count">
            {count} feature{count === 1 ? '' : 's'}
          </span>
        </div>

        {count === 0 ? (
          <div className={css.lfEmpty} data-testid="landform-empty">
            No landform features registered yet. Add each named landform below.
          </div>
        ) : (
          <div className={css.lfList}>
            {model.features.map((f) => {
              return (
                <div key={f.id} className={css.lfCard}>
                  <div className={css.lfHead}>
                    <span
                      className={css.lfType}
                      data-tone={LANDFORM_TONE[f.type] ?? 'bench'}
                    >
                      {LANDFORM_LABEL[f.type] ?? f.type}
                    </span>
                    <span className={css.lfName}>
                      {f.name || 'Unnamed feature'}
                    </span>
                    <span className={css.lfMeta}>
                      {f.size || '--'}
                      {f.elevation ? <> &middot; {f.elevation} m ASL</> : ''}
                    </span>
                    <button
                      type="button"
                      className={css.lfDel}
                      data-testid={`landform-remove-${f.id}`}
                      aria-label={`Remove ${f.name || 'feature'}`}
                      onClick={() => removeFeature(f.id)}
                    >
                      <X size={13} />
                    </button>
                  </div>
                  <div className={css.lfImpl}>
                    {LANDFORM_IMPL[f.type] ?? ''}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {formOpen ? (
          <div className={css.lfAddForm} data-testid="landform-form">
            <div className={css.afLbl}>Landform type</div>
            <select
              className={css.afSelect}
              data-testid="landform-type"
              aria-label="Landform type"
              value={draftType}
              onChange={(e) => setDraftType(e.target.value as LandformType)}
            >
              {LANDFORM_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            <div className={css.afLbl}>Name or reference</div>
            <input
              type="text"
              className={css.afInput}
              data-testid="landform-name"
              aria-label="Landform name"
              value={draftName}
              placeholder="e.g. West saddle, Lower creek flat"
              onChange={(e) => setDraftName(e.target.value)}
            />
            <div className={css.afGrid}>
              <div>
                <div className={css.afLbl}>Area or length</div>
                <input
                  type="text"
                  className={css.afInput}
                  data-testid="landform-size"
                  aria-label="Landform area or length"
                  value={draftSize}
                  placeholder="e.g. 3 ha, 400 m"
                  onChange={(e) => setDraftSize(e.target.value)}
                />
              </div>
              <div>
                <div className={css.afLbl}>Elevation (m ASL)</div>
                <input
                  type="number"
                  className={css.afInput}
                  data-testid="landform-elev"
                  aria-label="Landform elevation"
                  value={draftElev}
                  placeholder="0"
                  onChange={(e) => setDraftElev(e.target.value)}
                />
              </div>
            </div>
            <div className={css.afRow}>
              <button
                type="button"
                className={css.afAdd}
                data-testid="landform-add"
                onClick={addFeature}
              >
                Add to register
              </button>
              <button
                type="button"
                className={css.afCancel}
                data-testid="landform-cancel"
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
            data-testid="landform-open"
            onClick={() => setFormOpen(true)}
          >
            <Plus size={11} aria-hidden="true" /> Add another landform feature
          </button>
        )}
      </div>

      <div className={css.lfSummary}>
        <div className={css.lfsItem} data-tone="features">
          <span className={css.lfsNum}>{count}</span>
          <span className={css.lfsLbl}>Features</span>
        </div>
        <div className={css.lfsItem} data-tone="area">
          <span className={css.lfsNum}>{haMapped % 1 === 0 ? haMapped : haMapped.toFixed(1)}</span>
          <span className={css.lfsLbl}>ha mapped</span>
        </div>
        <div className={css.lfsItem} data-tone="types">
          <span className={css.lfsNum}>{typeCount}</span>
          <span className={css.lfsLbl}>types</span>
        </div>
      </div>

      <div className={css.feedsBlock}>
        <ArrowRight size={13} className={css.feedsIcon} aria-hidden="true" />
        <div className={css.feedsTxt}>
          Named landform features become the{' '}
          <strong>spatial vocabulary for all design decisions</strong> in Tier 3
          and beyond. Zone allocation is anchored to these named areas.
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Erosion body -- the mass-movement toggle swaps the standard-risk surface for a
// mandatory geotechnical warning (derived display only; both states persist).
// ---------------------------------------------------------------------------

function ErosionBody({
  model,
  onChange,
}: {
  model: ErosionModel;
  onChange: (next: ErosionModel) => void;
}): React.JSX.Element {
  const toggleType = (key: string): void =>
    onChange({
      ...model,
      types: model.types.includes(key)
        ? model.types.filter((t) => t !== key)
        : [...model.types, key],
    });
  const toggleMass = (): void =>
    onChange({ ...model, massMovement: !model.massMovement });
  const setRisk = (level: string): void =>
    onChange({ ...model, riskLevel: model.riskLevel === level ? '' : level });

  const constraint = model.riskLevel ? RISK_BY_ID[model.riskLevel] : undefined;

  return (
    <div className={css.root} data-terrain-mode="erosion">
      <div>
        <div className={css.secLbl}>
          Erosion types present{' '}
          <span className={css.secOptional}>(select all observed)</span>
        </div>
        <div className={css.erosionTypes}>
          {EROSION_TYPES.map((e) => {
            const on = model.types.includes(e.key);
            return (
              <button
                key={e.key}
                type="button"
                className={css.erosionChip}
                data-testid={`erosion-${e.key}`}
                data-on={on ? 'true' : 'false'}
                aria-pressed={on}
                onClick={() => toggleType(e.key)}
              >
                {e.label}
              </button>
            );
          })}
          <button
            type="button"
            className={css.erosionChipMass}
            data-testid="erosion-mass"
            data-on={model.massMovement ? 'true' : 'false'}
            aria-pressed={model.massMovement}
            onClick={toggleMass}
          >
            Mass movement / landslip
          </button>
        </div>
      </div>

      {model.massMovement ? (
        <div className={css.constraintBox} data-tone="mass" data-testid="mass-warning">
          <div className={css.cbLbl}>
            <AlertTriangle size={11} aria-hidden="true" /> Mass movement
            identified -- stop
          </div>
          <div className={css.cbMain}>Geotechnical assessment required</div>
          <div className={css.cbDetail}>
            No earthworks, tracks, or structures may be planned in the identified
            landslip zone until a qualified geotechnical engineer has assessed
            the site. Do not defer this assessment.
          </div>
        </div>
      ) : (
        <div data-testid="standard-risk">
          <div className={css.secLbl}>Overall erosion risk level</div>
          <div className={css.riskLevels}>
            {RISK_LEVELS.map((r) => {
              const on = model.riskLevel === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  className={css.riskBtn}
                  data-testid={`risk-${r.id}`}
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
      )}

      <div>
        <div className={css.secLbl}>Affected areas</div>
        <textarea
          className={css.textarea}
          data-testid="erosion-affected"
          aria-label="Affected areas"
          value={model.affected}
          placeholder="Describe where erosion or instability is present on the site -- which slopes, which aspects, which named landform features..."
          onChange={(e) => onChange({ ...model, affected: e.target.value })}
        />
      </div>

      {!model.massMovement && constraint ? (
        <div
          className={css.constraintBox}
          data-tone={constraint.id}
          data-testid="erosion-constraint"
        >
          <div className={css.cbLbl}>
            <Ruler size={11} aria-hidden="true" /> Design constraint
          </div>
          <div className={css.cbMain}>{constraint.main}</div>
          <div className={css.cbDetail}>{constraint.detail}</div>
        </div>
      ) : null}

      <div className={css.feedsBlock}>
        <ArrowRight size={13} className={css.feedsIcon} aria-hidden="true" />
        <div className={css.feedsTxt}>
          Erosion risk feeds <strong>Tier 4: Earthworks design</strong> and{' '}
          <strong>Tier 5: Revegetation priority</strong>. Risk areas are flagged
          in every Act task that involves soil disturbance.
        </div>
      </div>
    </div>
  );
}

export default TerrainCapture;
