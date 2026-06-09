/**
 * LandscapeContextCapture -- a multi-mode CONTROLLED capture for the ecovillage
 * objective ev-s2-landscape-vectors ("A clear read of surrounding landscape &
 * vectors", 6 checklist items c1..c6). Ported from olos_landscape_context.html
 * right-hand panels p1..p6. Catalogue item order == mockup panel order:
 *
 *   c1 -> landUse     (mockup p1: surrounding land use register)
 *   c2 -> sprayRisk   (mockup p2: risk pathway register)
 *   c3 -> planning    (mockup p3: 4-card single-select planning environment)
 *   c4 -> community   (mockup p4: regional networks register)
 *   c5 -> disputes    (mockup p5: prior dispute register + lessons textarea)
 *   c6 -> catchment   (mockup p6: fixed 4-vector contamination scaffold)
 *
 * Structure mirrors EcologyCapture / TerrainCapture / ClimateCapture (the
 * canonical multi-mode captures): a `landscapeModeFor(itemId)` mapper plus a
 * single component that renders ONE mode body. The panel chrome (header /
 * eyebrow / title / hint / feeds callout / gate-note / Record-Defer footer) is
 * owned by DecisionWorkingPanel -- this capture renders ONLY the mode body
 * blocks (the mockup's `.rb` inner content).
 *
 * Each mode persists its OWN keys in the per-item flat FormValue
 * (Record<string, string | string[]>). decode is TOTAL/defensive (non-array ->
 * empty; per-entry try/catch parse for growable lists; coerce bad types to
 * defaults; NEVER fabricate seed data -- the mockup shows seeded demo rows, but
 * the growable registers start EMPTY; the catchment scaffold reconstructs its 4
 * FIXED generic vectors with persisted severity/monitoring merged in).
 *
 * CONTROLLED / pure: the model is always derived from decode(value) each render;
 * the full next model is emitted via onChange(encode(next)). Stable per-entry
 * ids (land-use rows, risk rows, network rows, dispute rows) are minted by
 * makeRowId() in EVENT HANDLERS ONLY (never in decode/render) and used as React
 * keys (never index).
 *
 * ASCII-only: em-dash -> " -- ", middot -> &middot; entity; m2 / deg spelled
 * out; all icons are lucide. Apostrophes use double-quoted strings.
 */

import * as React from 'react';
import { Plus, X } from 'lucide-react';
import type { FormValue } from './actToolCatalog.js';
import css from './LandscapeContextCapture.module.css';

// ---------------------------------------------------------------------------
// Mode mapper
// ---------------------------------------------------------------------------

export type LandscapeMode =
  | 'landUse'
  | 'sprayRisk'
  | 'planning'
  | 'community'
  | 'disputes'
  | 'catchment';

const LANDSCAPE_PREFIX = 'ev-s2-landscape-vectors-';

export function landscapeModeFor(itemId: string): LandscapeMode | null {
  if (!itemId.startsWith(LANDSCAPE_PREFIX)) return null;
  const suffix = itemId.slice(LANDSCAPE_PREFIX.length);
  switch (suffix) {
    case 'c1':
      return 'landUse';
    case 'c2':
      return 'sprayRisk';
    case 'c3':
      return 'planning';
    case 'c4':
      return 'community';
    case 'c5':
      return 'disputes';
    case 'c6':
      return 'catchment';
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Stable id factory (growable register rows). Module-scoped, pure -- no
// import-time side-effects; CALLED ONLY IN EVENT HANDLERS.
// ---------------------------------------------------------------------------

function makeRowId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'lsc-' + Math.random().toString(36).slice(2, 10);
}

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

export type LandUseRisk = 'high' | 'mod' | 'low' | 'none' | 'positive';

export interface LandUseEntry {
  id: string;
  direction: string;
  distanceKm: string;
  name: string;
  riskLevel: LandUseRisk;
  riskTag: string;
  detail: string;
}

export interface LandUseModel {
  kind: 'landUse';
  entries: LandUseEntry[];
}

export type RiskSeverity = 'high' | 'mod' | 'low';
export type RiskPathway = 'airborne' | 'water' | 'soil';

export interface RiskEntry {
  id: string;
  from: string;
  name: string;
  severity: RiskSeverity | null;
  pathways: RiskPathway[];
  note: string;
}

export interface SprayRiskModel {
  kind: 'sprayRisk';
  entries: RiskEntry[];
}

export type PlanningClass = 'favourable' | 'permissive' | 'uncertain' | 'challenging';

export interface PlanningModel {
  kind: 'planning';
  selected: PlanningClass | null;
}

export type Relationship = 'ally' | 'potential' | 'neutral' | 'monitor';

export interface NetworkEntry {
  id: string;
  relationship: Relationship;
  name: string;
  detail: string;
}

export interface CommunityModel {
  kind: 'community';
  entries: NetworkEntry[];
}

export type DisputeStatus = 'resolved' | 'ongoing' | 'dormant';

export interface DisputeEntry {
  id: string;
  year: string;
  status: DisputeStatus | null;
  name: string;
  detail: string;
}

export interface DisputesModel {
  kind: 'disputes';
  entries: DisputeEntry[];
  lessons: string;
}

export type CatchmentSeverity = 'high' | 'mod' | 'low' | 'nil';

export interface CatchmentVector {
  key: string;
  severity: CatchmentSeverity | null;
  monitoring: string;
}

export interface CatchmentModel {
  kind: 'catchment';
  vectors: CatchmentVector[];
}

export type LandscapeModel =
  | LandUseModel
  | SprayRiskModel
  | PlanningModel
  | CommunityModel
  | DisputesModel
  | CatchmentModel;

// ---------------------------------------------------------------------------
// Verbatim / fixed domain data (from the mockup p1..p6)
// ---------------------------------------------------------------------------

interface RiskTagSpec {
  id: LandUseRisk;
  label: string;
}
const LAND_USE_RISKS: readonly RiskTagSpec[] = [
  { id: 'high', label: 'High' },
  { id: 'mod', label: 'Moderate' },
  { id: 'low', label: 'Low' },
  { id: 'none', label: 'Minimal' },
  { id: 'positive', label: 'Positive' },
];
const LAND_USE_RISK_SET = new Set<string>(LAND_USE_RISKS.map((r) => r.id));

interface SeveritySpec {
  id: RiskSeverity;
  label: string;
}
const RISK_SEVERITIES: readonly SeveritySpec[] = [
  { id: 'high', label: 'High' },
  { id: 'mod', label: 'Moderate' },
  { id: 'low', label: 'Low' },
];
const RISK_SEVERITY_SET = new Set<string>(RISK_SEVERITIES.map((s) => s.id));

interface PathwaySpec {
  id: RiskPathway;
  label: string;
}
const RISK_PATHWAYS: readonly PathwaySpec[] = [
  { id: 'airborne', label: 'Airborne' },
  { id: 'water', label: 'Water' },
  { id: 'soil', label: 'Soil' },
];
const RISK_PATHWAY_SET = new Set<string>(RISK_PATHWAYS.map((p) => p.id));

interface PlanningCardSpec {
  id: PlanningClass;
  tone: 'fav' | 'perm' | 'unc' | 'chal';
  title: string;
  desc: string;
  action: string;
}
const PLANNING_CARDS: readonly PlanningCardSpec[] = [
  {
    id: 'favourable',
    tone: 'fav',
    title: 'Favourable',
    desc: 'Council has approved similar projects and has policy support for community-scale sustainable development.',
    action:
      'Proceed with confidence. Engage planning early and proactively. Precedent works in your favour.',
  },
  {
    id: 'permissive',
    tone: 'perm',
    title: 'Permissive',
    desc: 'No specific policy either way. Multi-dwelling development is theoretically possible under discretionary planning -- standard rules apply.',
    action:
      'Obtain current planning certificate and schedule a pre-application meeting with council. Establish clear precedent through similar approved projects in the region.',
  },
  {
    id: 'uncertain',
    tone: 'unc',
    title: 'Uncertain',
    desc: 'Mixed signals -- council has approved some alternative projects but contested others. Policy environment may be in flux or limited local precedent exists.',
    action:
      'Engage a planning consultant with local authority experience before committing design. Request pre-application meeting. Do not proceed to formal DA without consultant advice. Consider making first contact through an existing approved project as a reference point.',
  },
  {
    id: 'challenging',
    tone: 'chal',
    title: 'Challenging',
    desc: 'Council has resisted similar projects or is actively opposed to residential intensification on rural land. Strong local farming community opposition likely.',
    action:
      'Do not proceed to design without a full planning risk assessment by a specialist consultant. Consider rezoning application, advocate engagement, or reviewing alternative sites.',
  },
];
const PLANNING_BY_ID: Record<string, PlanningCardSpec> = Object.fromEntries(
  PLANNING_CARDS.map((c) => [c.id, c]),
);
const PLANNING_ID_SET = new Set<string>(PLANNING_CARDS.map((c) => c.id));

interface RelationshipSpec {
  id: Relationship;
  label: string;
  tone: 'ally' | 'pally' | 'neut' | 'opp';
}
const RELATIONSHIPS: readonly RelationshipSpec[] = [
  { id: 'ally', label: 'Ally', tone: 'ally' },
  { id: 'potential', label: 'Potential ally', tone: 'pally' },
  { id: 'neutral', label: 'Key contact', tone: 'neut' },
  { id: 'monitor', label: 'Monitor', tone: 'opp' },
];
const RELATIONSHIP_SET = new Set<string>(RELATIONSHIPS.map((r) => r.id));
const RELATIONSHIP_BY_ID: Record<string, RelationshipSpec> = Object.fromEntries(
  RELATIONSHIPS.map((r) => [r.id, r]),
);

interface DisputeStatusSpec {
  id: DisputeStatus;
  label: string;
  tone: 'res' | 'ong' | 'dorm';
}
const DISPUTE_STATUSES: readonly DisputeStatusSpec[] = [
  { id: 'resolved', label: 'Resolved', tone: 'res' },
  { id: 'ongoing', label: 'Ongoing', tone: 'ong' },
  { id: 'dormant', label: 'Dormant', tone: 'dorm' },
];
const DISPUTE_STATUS_SET = new Set<string>(DISPUTE_STATUSES.map((d) => d.id));
const DISPUTE_STATUS_BY_ID: Record<string, DisputeStatusSpec> =
  Object.fromEntries(DISPUTE_STATUSES.map((d) => [d.id, d]));

interface CatchmentSpec {
  key: string;
  title: string;
  desc: string;
}
// FIXED 4-vector scaffold -- GENERIC category content (NOT the mockup's
// site-specific prose). Only severity + monitoring persist per key.
const CATCHMENT_VECTORS: readonly CatchmentSpec[] = [
  {
    key: 'agRunoff',
    title: 'Upstream agricultural runoff',
    desc: 'Fertilisers, pesticides, herbicides entering surface water or groundwater from the catchment',
  },
  {
    key: 'roadRunoff',
    title: 'Road & infrastructure runoff',
    desc: 'Heavy metals, hydrocarbons, and road salt from sealed roads on the boundary',
  },
  {
    key: 'wildfireAsh',
    title: 'Wildfire ash wash',
    desc: 'Post-fire catchment contamination -- pH shift, heavy metals, pyrogenic carbon',
  },
  {
    key: 'industrialLegacy',
    title: 'Industrial or mining legacy',
    desc: 'Historic mining, processing, or industrial sites in the upper catchment',
  },
];
const CATCHMENT_SEVERITIES: readonly { id: CatchmentSeverity; label: string }[] = [
  { id: 'high', label: 'High' },
  { id: 'mod', label: 'Mod' },
  { id: 'low', label: 'Low' },
  { id: 'nil', label: 'Nil' },
];
const CATCHMENT_SEVERITY_SET = new Set<string>(
  CATCHMENT_SEVERITIES.map((s) => s.id),
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
// decode: FormValue -> LandscapeModel (TOTAL / defensive; never throws, never
// fabricates seed data).
// ---------------------------------------------------------------------------

export function decodeLandscape(
  mode: LandscapeMode,
  value: FormValue,
): LandscapeModel {
  switch (mode) {
    case 'landUse': {
      const entries: LandUseEntry[] = [];
      let index = 0;
      for (const entry of asArr(value.landscapeLandUses)) {
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
            direction?: unknown;
            distanceKm?: unknown;
            name?: unknown;
            riskLevel?: unknown;
            riskTag?: unknown;
            detail?: unknown;
          };
          const riskLevel =
            typeof p.riskLevel === 'string' && LAND_USE_RISK_SET.has(p.riskLevel)
              ? (p.riskLevel as LandUseRisk)
              : 'none';
          const id =
            typeof p.id === 'string' && p.id !== ''
              ? p.id
              : 'legacy-landscape-' + index;
          entries.push({
            id,
            direction: typeof p.direction === 'string' ? p.direction : '',
            distanceKm: typeof p.distanceKm === 'string' ? p.distanceKm : '',
            name: typeof p.name === 'string' ? p.name : '',
            riskLevel,
            riskTag: typeof p.riskTag === 'string' ? p.riskTag : '',
            detail: typeof p.detail === 'string' ? p.detail : '',
          });
        } catch {
          // drop malformed entry
        }
        index++;
      }
      return { kind: 'landUse', entries };
    }
    case 'sprayRisk': {
      const entries: RiskEntry[] = [];
      let index = 0;
      for (const entry of asArr(value.landscapeRisks)) {
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
            from?: unknown;
            name?: unknown;
            severity?: unknown;
            pathways?: unknown;
            note?: unknown;
          };
          const severity =
            typeof p.severity === 'string' && RISK_SEVERITY_SET.has(p.severity)
              ? (p.severity as RiskSeverity)
              : null;
          const pathways = Array.isArray(p.pathways)
            ? p.pathways.filter(
                (x): x is RiskPathway =>
                  typeof x === 'string' && RISK_PATHWAY_SET.has(x),
              )
            : [];
          const id =
            typeof p.id === 'string' && p.id !== ''
              ? p.id
              : 'legacy-landscape-' + index;
          entries.push({
            id,
            from: typeof p.from === 'string' ? p.from : '',
            name: typeof p.name === 'string' ? p.name : '',
            severity,
            pathways,
            note: typeof p.note === 'string' ? p.note : '',
          });
        } catch {
          // drop malformed entry
        }
        index++;
      }
      return { kind: 'sprayRisk', entries };
    }
    case 'planning': {
      const selected = asStr(value.landscapePlanning);
      return {
        kind: 'planning',
        selected: PLANNING_ID_SET.has(selected)
          ? (selected as PlanningClass)
          : null,
      };
    }
    case 'community': {
      const entries: NetworkEntry[] = [];
      let index = 0;
      for (const entry of asArr(value.landscapeNetworks)) {
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
            relationship?: unknown;
            name?: unknown;
            detail?: unknown;
          };
          const relationship =
            typeof p.relationship === 'string' &&
            RELATIONSHIP_SET.has(p.relationship)
              ? (p.relationship as Relationship)
              : 'neutral';
          const id =
            typeof p.id === 'string' && p.id !== ''
              ? p.id
              : 'legacy-landscape-' + index;
          entries.push({
            id,
            relationship,
            name: typeof p.name === 'string' ? p.name : '',
            detail: typeof p.detail === 'string' ? p.detail : '',
          });
        } catch {
          // drop malformed entry
        }
        index++;
      }
      return { kind: 'community', entries };
    }
    case 'disputes': {
      const entries: DisputeEntry[] = [];
      let index = 0;
      for (const entry of asArr(value.landscapeDisputes)) {
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
            year?: unknown;
            status?: unknown;
            name?: unknown;
            detail?: unknown;
          };
          const status =
            typeof p.status === 'string' && DISPUTE_STATUS_SET.has(p.status)
              ? (p.status as DisputeStatus)
              : null;
          const id =
            typeof p.id === 'string' && p.id !== ''
              ? p.id
              : 'legacy-landscape-' + index;
          entries.push({
            id,
            year: typeof p.year === 'string' ? p.year : '',
            status,
            name: typeof p.name === 'string' ? p.name : '',
            detail: typeof p.detail === 'string' ? p.detail : '',
          });
        } catch {
          // drop malformed entry
        }
        index++;
      }
      return {
        kind: 'disputes',
        entries,
        lessons: asStr(value.landscapeLessons),
      };
    }
    case 'catchment': {
      // Reconstruct all 4 FIXED vectors in fixed order, merging any persisted
      // severity/monitoring. Persisted shape is one JSON object per key.
      const byKey: Record<string, { severity: CatchmentSeverity | null; monitoring: string }> =
        {};
      for (const entry of asArr(value.landscapeCatchment)) {
        if (typeof entry !== 'string') continue;
        try {
          const parsed: unknown = JSON.parse(entry);
          if (parsed === null || typeof parsed !== 'object') continue;
          const p = parsed as {
            key?: unknown;
            severity?: unknown;
            monitoring?: unknown;
          };
          if (typeof p.key !== 'string') continue;
          const severity =
            typeof p.severity === 'string' && CATCHMENT_SEVERITY_SET.has(p.severity)
              ? (p.severity as CatchmentSeverity)
              : null;
          byKey[p.key] = {
            severity,
            monitoring: typeof p.monitoring === 'string' ? p.monitoring : '',
          };
        } catch {
          // drop malformed entry
        }
      }
      const vectors: CatchmentVector[] = CATCHMENT_VECTORS.map((spec) => {
        const stored = byKey[spec.key];
        return {
          key: spec.key,
          severity: stored ? stored.severity : null,
          monitoring: stored ? stored.monitoring : '',
        };
      });
      return { kind: 'catchment', vectors };
    }
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown LandscapeMode: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// encode: LandscapeModel -> FormValue (lossless inverse of decode).
// ---------------------------------------------------------------------------

export function encodeLandscape(
  mode: LandscapeMode,
  model: LandscapeModel,
): FormValue {
  void mode;
  switch (model.kind) {
    case 'landUse':
      return {
        landscapeLandUses: model.entries.map((e) => JSON.stringify(e)),
      };
    case 'sprayRisk':
      return {
        landscapeRisks: model.entries.map((e) => JSON.stringify(e)),
      };
    case 'planning':
      return {
        landscapePlanning: model.selected ?? '',
      };
    case 'community':
      return {
        landscapeNetworks: model.entries.map((e) => JSON.stringify(e)),
      };
    case 'disputes':
      return {
        landscapeDisputes: model.entries.map((e) => JSON.stringify(e)),
        landscapeLessons: model.lessons,
      };
    case 'catchment':
      return {
        landscapeCatchment: model.vectors.map((v) => JSON.stringify(v)),
      };
  }
}

// ---------------------------------------------------------------------------
// validity gates (per mode)
// ---------------------------------------------------------------------------

export function isLandscapeValid(
  mode: LandscapeMode,
  model: LandscapeModel,
): boolean {
  void mode;
  switch (model.kind) {
    case 'landUse':
      return model.entries.some((e) => e.name.trim() !== '');
    case 'sprayRisk':
      return model.entries.some(
        (e) => e.name.trim() !== '' && e.severity !== null,
      );
    case 'planning':
      return model.selected !== null;
    case 'community':
      return model.entries.some((e) => e.name.trim() !== '');
    case 'disputes':
      return (
        model.entries.some((e) => e.name.trim() !== '') ||
        model.lessons.trim() !== ''
      );
    case 'catchment':
      return model.vectors.some((v) => v.severity !== null);
  }
}

// ---------------------------------------------------------------------------
// record-summary mirror (per mode)
// ---------------------------------------------------------------------------

export function summariseLandscape(
  mode: LandscapeMode,
  model: LandscapeModel,
): string {
  void mode;
  switch (model.kind) {
    case 'landUse':
      return `${model.entries.length} land use(s) registered`;
    case 'sprayRisk':
      return `${model.entries.length} risk pathway(s) assessed`;
    case 'planning': {
      const card = model.selected ? PLANNING_BY_ID[model.selected] : undefined;
      return card ? card.title : 'No classification';
    }
    case 'community':
      return `${model.entries.length} organisation(s) registered`;
    case 'disputes':
      return `${model.entries.length} dispute(s) documented`;
    case 'catchment': {
      const assessed = model.vectors.filter((v) => v.severity !== null).length;
      return `${assessed} of 4 vector(s) assessed`;
    }
  }
}

// ---------------------------------------------------------------------------
// Component (renders ONLY the body for the resolved mode).
// ---------------------------------------------------------------------------

export interface LandscapeContextCaptureProps {
  mode: LandscapeMode;
  value: FormValue;
  onChange: (next: FormValue) => void;
}

export function LandscapeContextCapture({
  mode,
  value,
  onChange,
}: LandscapeContextCaptureProps): React.JSX.Element {
  const model = decodeLandscape(mode, value);
  const emit = (next: LandscapeModel): void =>
    onChange(encodeLandscape(mode, next));

  if (model.kind === 'landUse') {
    return <LandUseBody model={model} onChange={emit} />;
  }
  if (model.kind === 'sprayRisk') {
    return <SprayRiskBody model={model} onChange={emit} />;
  }
  if (model.kind === 'planning') {
    return <PlanningBody model={model} onChange={emit} />;
  }
  if (model.kind === 'community') {
    return <CommunityBody model={model} onChange={emit} />;
  }
  if (model.kind === 'disputes') {
    return <DisputesBody model={model} onChange={emit} />;
  }
  return <CatchmentBody model={model} onChange={emit} />;
}

// ---------------------------------------------------------------------------
// Land use body (p1) -- growable register of land-use cards.
// ---------------------------------------------------------------------------

function LandUseBody({
  model,
  onChange,
}: {
  model: LandUseModel;
  onChange: (next: LandUseModel) => void;
}): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  const [dir, setDir] = React.useState('');
  const [dist, setDist] = React.useState('');
  const [name, setName] = React.useState('');
  const [risk, setRisk] = React.useState<LandUseRisk>('none');
  const [tag, setTag] = React.useState('');
  const [detail, setDetail] = React.useState('');

  const reset = (): void => {
    setDir('');
    setDist('');
    setName('');
    setRisk('none');
    setTag('');
    setDetail('');
  };

  const add = (): void => {
    onChange({
      ...model,
      entries: [
        ...model.entries,
        {
          id: makeRowId(),
          direction: dir.trim(),
          distanceKm: dist.trim(),
          name: name.trim(),
          riskLevel: risk,
          riskTag: tag.trim(),
          detail: detail.trim(),
        },
      ],
    });
    reset();
    setOpen(false);
  };
  const remove = (id: string): void =>
    onChange({ ...model, entries: model.entries.filter((e) => e.id !== id) });

  return (
    <div className={css.root} data-landscape-mode="landUse">
      <div>
        <div className={css.secLbl}>
          Land use register{' '}
          <span className={css.secCount}>{model.entries.length} entries</span>
        </div>
        {model.entries.length === 0 ? (
          <div className={css.empty} data-testid="landuse-empty">
            No surrounding land uses registered yet.
          </div>
        ) : (
          <div className={css.cardList}>
            {model.entries.map((e) => (
              <div key={e.id} className={css.luCard}>
                <div className={css.luHead}>
                  <span className={css.luDir}>
                    {e.direction || "?"}
                    {e.distanceKm ? (
                      <>
                        {" "}
                        &middot; {e.distanceKm}
                      </>
                    ) : null}
                  </span>
                  <span className={css.luName}>{e.name || "Unnamed land use"}</span>
                  {e.riskTag ? (
                    <span className={css.luRiskTag} data-risk={e.riskLevel}>
                      {e.riskTag}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    className={css.del}
                    data-testid={`landuse-remove-${e.id}`}
                    aria-label={`Remove ${e.name || "land use"}`}
                    onClick={() => remove(e.id)}
                  >
                    <X size={13} />
                  </button>
                </div>
                {e.detail ? <div className={css.luType}>{e.detail}</div> : null}
              </div>
            ))}
          </div>
        )}
        {open ? (
          <div className={css.addForm} data-testid="landuse-form">
            <div className={css.afGrid}>
              <div>
                <div className={css.afLbl}>Direction</div>
                <input
                  type="text"
                  className={css.afInput}
                  data-testid="landuse-dir"
                  aria-label="Land use direction"
                  value={dir}
                  placeholder="e.g. W"
                  onChange={(ev) => setDir(ev.target.value)}
                />
              </div>
              <div>
                <div className={css.afLbl}>Distance</div>
                <input
                  type="text"
                  className={css.afInput}
                  data-testid="landuse-dist"
                  aria-label="Land use distance"
                  value={dist}
                  placeholder="e.g. 0.8km"
                  onChange={(ev) => setDist(ev.target.value)}
                />
              </div>
            </div>
            <div className={css.afLbl}>Land use name</div>
            <input
              type="text"
              className={css.afInput}
              data-testid="landuse-name"
              aria-label="Land use name"
              value={name}
              placeholder="e.g. Conventional broadacre cropping"
              onChange={(ev) => setName(ev.target.value)}
            />
            <div className={css.afGrid}>
              <div>
                <div className={css.afLbl}>Risk level</div>
                <select
                  className={css.afSelect}
                  data-testid="landuse-risk"
                  aria-label="Land use risk level"
                  value={risk}
                  onChange={(ev) => setRisk(ev.target.value as LandUseRisk)}
                >
                  {LAND_USE_RISKS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className={css.afLbl}>Risk tag</div>
                <input
                  type="text"
                  className={css.afInput}
                  data-testid="landuse-tag"
                  aria-label="Land use risk tag"
                  value={tag}
                  placeholder="e.g. Spray drift"
                  onChange={(ev) => setTag(ev.target.value)}
                />
              </div>
            </div>
            <div className={css.afLbl}>Detail</div>
            <input
              type="text"
              className={css.afInput}
              data-testid="landuse-detail"
              aria-label="Land use detail"
              value={detail}
              placeholder="e.g. ~180 ha wheat/canola rotation, known aerial spraying"
              onChange={(ev) => setDetail(ev.target.value)}
            />
            <div className={css.afRow}>
              <button
                type="button"
                className={css.afAdd}
                data-testid="landuse-add"
                onClick={add}
              >
                Add to register
              </button>
              <button
                type="button"
                className={css.afCancel}
                data-testid="landuse-cancel"
                onClick={() => {
                  reset();
                  setOpen(false);
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
            data-testid="landuse-open"
            onClick={() => setOpen(true)}
          >
            <Plus size={11} aria-hidden="true" /> Add land use
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Spray risk body (p2) -- growable register of risk-pathway cards. Each card
// has inline severity (single-select) + pathway (multi-toggle) + note.
// ---------------------------------------------------------------------------

function SprayRiskBody({
  model,
  onChange,
}: {
  model: SprayRiskModel;
  onChange: (next: SprayRiskModel) => void;
}): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  const [from, setFrom] = React.useState('');
  const [name, setName] = React.useState('');

  const reset = (): void => {
    setFrom('');
    setName('');
  };

  const add = (): void => {
    onChange({
      ...model,
      entries: [
        ...model.entries,
        {
          id: makeRowId(),
          from: from.trim(),
          name: name.trim(),
          severity: null,
          pathways: [],
          note: '',
        },
      ],
    });
    reset();
    setOpen(false);
  };
  const remove = (id: string): void =>
    onChange({ ...model, entries: model.entries.filter((e) => e.id !== id) });
  const update = (id: string, patch: Partial<RiskEntry>): void =>
    onChange({
      ...model,
      entries: model.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    });
  const setSeverity = (e: RiskEntry, sev: RiskSeverity): void =>
    update(e.id, { severity: e.severity === sev ? null : sev });
  const togglePathway = (e: RiskEntry, path: RiskPathway): void =>
    update(e.id, {
      pathways: e.pathways.includes(path)
        ? e.pathways.filter((p) => p !== path)
        : [...e.pathways, path],
    });

  return (
    <div className={css.root} data-landscape-mode="sprayRisk">
      <div>
        <div className={css.secLbl}>Risk pathway register</div>
        {model.entries.length === 0 ? (
          <div className={css.empty} data-testid="risk-empty">
            No risk pathways assessed yet.
          </div>
        ) : (
          <div className={css.cardList}>
            {model.entries.map((e) => (
              <div key={e.id} className={css.riskCard}>
                <div className={css.riskHead}>
                  {e.from ? <span className={css.rcFrom}>{e.from}</span> : null}
                  <span className={css.rcName}>{e.name || "Unnamed risk"}</span>
                  <button
                    type="button"
                    className={css.del}
                    data-testid={`risk-remove-${e.id}`}
                    aria-label={`Remove ${e.name || "risk"}`}
                    onClick={() => remove(e.id)}
                  >
                    <X size={13} />
                  </button>
                </div>
                <div className={css.rcRow}>
                  <span className={css.rcLbl}>Severity</span>
                  <div className={css.rcBtns}>
                    {RISK_SEVERITIES.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className={css.rcBtn}
                        data-sev={e.severity === s.id ? s.id : 'off'}
                        data-testid={`risk-sev-${e.id}-${s.id}`}
                        aria-pressed={e.severity === s.id}
                        onClick={() => setSeverity(e, s.id)}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className={css.rcRow}>
                  <span className={css.rcLbl}>Pathway</span>
                  <div className={css.rcBtns}>
                    {RISK_PATHWAYS.map((p) => {
                      const on = e.pathways.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          className={css.rcBtn}
                          data-path={on ? 'on' : 'off'}
                          data-testid={`risk-path-${e.id}-${p.id}`}
                          aria-pressed={on}
                          onClick={() => togglePathway(e, p.id)}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <textarea
                  className={css.rcNote}
                  data-testid={`risk-note-${e.id}`}
                  aria-label={`Note for ${e.name || "risk"}`}
                  value={e.note}
                  placeholder="Mitigation, buffer, or monitoring notes for this risk pathway..."
                  onChange={(ev) => update(e.id, { note: ev.target.value })}
                />
              </div>
            ))}
          </div>
        )}
        {open ? (
          <div className={css.addForm} data-testid="risk-form">
            <div className={css.afLbl}>From (direction &amp; distance)</div>
            <input
              type="text"
              className={css.afInput}
              data-testid="risk-from"
              aria-label="Risk source direction and distance"
              value={from}
              placeholder="e.g. W &middot; 0.8km"
              onChange={(ev) => setFrom(ev.target.value)}
            />
            <div className={css.afLbl}>Risk name</div>
            <input
              type="text"
              className={css.afInput}
              data-testid="risk-name"
              aria-label="Risk name"
              value={name}
              placeholder="e.g. Conventional cropping -- spray drift"
              onChange={(ev) => setName(ev.target.value)}
            />
            <div className={css.afRow}>
              <button
                type="button"
                className={css.afAdd}
                data-testid="risk-add"
                onClick={add}
              >
                Add to register
              </button>
              <button
                type="button"
                className={css.afCancel}
                data-testid="risk-cancel"
                onClick={() => {
                  reset();
                  setOpen(false);
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
            data-testid="risk-open"
            onClick={() => setOpen(true)}
          >
            <Plus size={11} aria-hidden="true" /> Add risk assessment
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Planning body (p3) -- 4 fixed single-select cards with reveal-on-select
// action block.
// ---------------------------------------------------------------------------

function PlanningBody({
  model,
  onChange,
}: {
  model: PlanningModel;
  onChange: (next: PlanningModel) => void;
}): React.JSX.Element {
  const pick = (id: PlanningClass): void =>
    onChange({ kind: 'planning', selected: model.selected === id ? null : id });

  return (
    <div className={css.root} data-landscape-mode="planning">
      <div>
        <div className={css.secLbl}>Planning environment classification</div>
        <div className={css.planCards} data-testid="plan-cards">
          {PLANNING_CARDS.map((c) => {
            const on = model.selected === c.id;
            return (
              <button
                key={c.id}
                type="button"
                className={css.planCard}
                data-tone={c.tone}
                data-on={on ? 'true' : 'false'}
                data-testid={`plan-${c.id}`}
                aria-pressed={on}
                onClick={() => pick(c.id)}
              >
                <span className={css.pcDot} aria-hidden="true" />
                <span className={css.planBody}>
                  <span className={css.planTitle}>{c.title}</span>
                  <span className={css.planDesc}>{c.desc}</span>
                  {on ? (
                    <span className={css.planAction}>{c.action}</span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Community body (p4) -- growable register of regional network cards.
// ---------------------------------------------------------------------------

function CommunityBody({
  model,
  onChange,
}: {
  model: CommunityModel;
  onChange: (next: CommunityModel) => void;
}): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  const [rel, setRel] = React.useState<Relationship>('ally');
  const [name, setName] = React.useState('');
  const [detail, setDetail] = React.useState('');

  const reset = (): void => {
    setRel('ally');
    setName('');
    setDetail('');
  };

  const add = (): void => {
    onChange({
      ...model,
      entries: [
        ...model.entries,
        {
          id: makeRowId(),
          relationship: rel,
          name: name.trim(),
          detail: detail.trim(),
        },
      ],
    });
    reset();
    setOpen(false);
  };
  const remove = (id: string): void =>
    onChange({ ...model, entries: model.entries.filter((e) => e.id !== id) });

  return (
    <div className={css.root} data-landscape-mode="community">
      <div>
        <div className={css.secLbl}>Regional networks register</div>
        {model.entries.length === 0 ? (
          <div className={css.empty} data-testid="network-empty">
            No regional networks registered yet.
          </div>
        ) : (
          <div className={css.cardList}>
            {model.entries.map((e) => {
              const spec = RELATIONSHIP_BY_ID[e.relationship];
              return (
                <div key={e.id} className={css.networkCard}>
                  <div className={css.ncHead}>
                    <span className={css.ncRel} data-tone={spec ? spec.tone : 'neut'}>
                      {spec ? spec.label : e.relationship}
                    </span>
                    <span className={css.ncName}>
                      {e.name || "Unnamed organisation"}
                    </span>
                    <button
                      type="button"
                      className={css.del}
                      data-testid={`network-remove-${e.id}`}
                      aria-label={`Remove ${e.name || "organisation"}`}
                      onClick={() => remove(e.id)}
                    >
                      <X size={13} />
                    </button>
                  </div>
                  {e.detail ? (
                    <div className={css.ncBody}>{e.detail}</div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
        {open ? (
          <div className={css.addForm} data-testid="network-form">
            <div className={css.afLbl}>Relationship</div>
            <select
              className={css.afSelect}
              data-testid="network-rel"
              aria-label="Relationship"
              value={rel}
              onChange={(ev) => setRel(ev.target.value as Relationship)}
            >
              {RELATIONSHIPS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
            <div className={css.afLbl}>Organisation or contact name</div>
            <input
              type="text"
              className={css.afInput}
              data-testid="network-name"
              aria-label="Organisation name"
              value={name}
              placeholder="e.g. Regional food systems network"
              onChange={(ev) => setName(ev.target.value)}
            />
            <div className={css.afLbl}>Detail</div>
            <input
              type="text"
              className={css.afInput}
              data-testid="network-detail"
              aria-label="Organisation detail"
              value={detail}
              placeholder="e.g. Active network of small farms, contact via website"
              onChange={(ev) => setDetail(ev.target.value)}
            />
            <div className={css.afRow}>
              <button
                type="button"
                className={css.afAdd}
                data-testid="network-add"
                onClick={add}
              >
                Add to register
              </button>
              <button
                type="button"
                className={css.afCancel}
                data-testid="network-cancel"
                onClick={() => {
                  reset();
                  setOpen(false);
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
            data-testid="network-open"
            onClick={() => setOpen(true)}
          >
            <Plus size={11} aria-hidden="true" /> Add organisation or contact
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Disputes body (p5) -- growable register of dispute cards + lessons textarea.
// ---------------------------------------------------------------------------

function DisputesBody({
  model,
  onChange,
}: {
  model: DisputesModel;
  onChange: (next: DisputesModel) => void;
}): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  const [year, setYear] = React.useState('');
  const [status, setStatus] = React.useState<DisputeStatus>('resolved');
  const [name, setName] = React.useState('');
  const [detail, setDetail] = React.useState('');

  const reset = (): void => {
    setYear('');
    setStatus('resolved');
    setName('');
    setDetail('');
  };

  const add = (): void => {
    onChange({
      ...model,
      entries: [
        ...model.entries,
        {
          id: makeRowId(),
          year: year.trim(),
          status,
          name: name.trim(),
          detail: detail.trim(),
        },
      ],
    });
    reset();
    setOpen(false);
  };
  const remove = (id: string): void =>
    onChange({ ...model, entries: model.entries.filter((e) => e.id !== id) });
  const setLessons = (v: string): void => onChange({ ...model, lessons: v });

  return (
    <div className={css.root} data-landscape-mode="disputes">
      <div>
        <div className={css.secLbl}>Prior planning disputes in the region</div>
        {model.entries.length === 0 ? (
          <div className={css.empty} data-testid="dispute-empty">
            No prior disputes documented yet.
          </div>
        ) : (
          <div className={css.cardList}>
            {model.entries.map((e) => {
              const spec = e.status ? DISPUTE_STATUS_BY_ID[e.status] : undefined;
              return (
                <div key={e.id} className={css.disputeCard}>
                  <div className={css.dcHead}>
                    {e.year ? <span className={css.dcYear}>{e.year}</span> : null}
                    {spec ? (
                      <span className={css.dcStatus} data-tone={spec.tone}>
                        {spec.label}
                      </span>
                    ) : null}
                    <span className={css.dcName}>{e.name || "Unnamed dispute"}</span>
                    <button
                      type="button"
                      className={css.del}
                      data-testid={`dispute-remove-${e.id}`}
                      aria-label={`Remove ${e.name || "dispute"}`}
                      onClick={() => remove(e.id)}
                    >
                      <X size={13} />
                    </button>
                  </div>
                  {e.detail ? (
                    <div className={css.dcBody}>{e.detail}</div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
        {open ? (
          <div className={css.addForm} data-testid="dispute-form">
            <div className={css.afGrid}>
              <div>
                <div className={css.afLbl}>Year(s)</div>
                <input
                  type="text"
                  className={css.afInput}
                  data-testid="dispute-year"
                  aria-label="Dispute year"
                  value={year}
                  placeholder="e.g. 2019-2021"
                  onChange={(ev) => setYear(ev.target.value)}
                />
              </div>
              <div>
                <div className={css.afLbl}>Status</div>
                <select
                  className={css.afSelect}
                  data-testid="dispute-status"
                  aria-label="Dispute status"
                  value={status}
                  onChange={(ev) => setStatus(ev.target.value as DisputeStatus)}
                >
                  {DISPUTE_STATUSES.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className={css.afLbl}>Dispute name</div>
            <input
              type="text"
              className={css.afInput}
              data-testid="dispute-name"
              aria-label="Dispute name"
              value={name}
              placeholder="e.g. Multi-household community, 8 households"
              onChange={(ev) => setName(ev.target.value)}
            />
            <div className={css.afLbl}>Detail</div>
            <input
              type="text"
              className={css.afInput}
              data-testid="dispute-detail"
              aria-label="Dispute detail"
              value={detail}
              placeholder="e.g. Opposition from landholders, approved with conditions"
              onChange={(ev) => setDetail(ev.target.value)}
            />
            <div className={css.afRow}>
              <button
                type="button"
                className={css.afAdd}
                data-testid="dispute-add"
                onClick={add}
              >
                Add to register
              </button>
              <button
                type="button"
                className={css.afCancel}
                data-testid="dispute-cancel"
                onClick={() => {
                  reset();
                  setOpen(false);
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
            data-testid="dispute-open"
            onClick={() => setOpen(true)}
          >
            <Plus size={11} aria-hidden="true" /> Add dispute record
          </button>
        )}
      </div>

      <div className={css.fdiv} aria-hidden="true" />

      <div>
        <div className={css.secLbl}>Key lessons from prior disputes</div>
        <textarea
          className={css.textarea}
          data-testid="dispute-lessons"
          aria-label="Key lessons from prior disputes"
          value={model.lessons}
          placeholder="What do prior disputes teach about engagement sequence, framing, and which objections to pre-empt?"
          onChange={(e) => setLessons(e.target.value)}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Catchment body (p6) -- FIXED 4-vector scaffold. Static title/desc per key;
// only severity (single-select) + monitoring (textarea) persist. No add/remove.
// ---------------------------------------------------------------------------

function CatchmentBody({
  model,
  onChange,
}: {
  model: CatchmentModel;
  onChange: (next: CatchmentModel) => void;
}): React.JSX.Element {
  const specByKey: Record<string, CatchmentSpec> = Object.fromEntries(
    CATCHMENT_VECTORS.map((v) => [v.key, v]),
  );

  const update = (key: string, patch: Partial<CatchmentVector>): void =>
    onChange({
      ...model,
      vectors: model.vectors.map((v) =>
        v.key === key ? { ...v, ...patch } : v,
      ),
    });
  const setSeverity = (v: CatchmentVector, sev: CatchmentSeverity): void =>
    update(v.key, { severity: v.severity === sev ? null : sev });

  return (
    <div className={css.root} data-landscape-mode="catchment">
      <div>
        <div className={css.secLbl}>Contamination vectors</div>
        <div className={css.cardList} data-testid="catchment-list">
          {model.vectors.map((v) => {
            const spec = specByKey[v.key];
            return (
              <div key={v.key} className={css.catchmentRow}>
                <div className={css.crTop}>
                  <div className={css.crName}>
                    <div className={css.crTitle}>{spec ? spec.title : v.key}</div>
                    {spec ? (
                      <div className={css.crDesc}>{spec.desc}</div>
                    ) : null}
                  </div>
                  <div className={css.crSevBtns}>
                    {CATCHMENT_SEVERITIES.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className={css.crBtn}
                        data-sev={v.severity === s.id ? s.id : 'off'}
                        data-testid={`catchment-sev-${v.key}-${s.id}`}
                        aria-pressed={v.severity === s.id}
                        onClick={() => setSeverity(v, s.id)}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  className={css.crMonitor}
                  data-testid={`catchment-monitor-${v.key}`}
                  aria-label={`Monitoring approach for ${spec ? spec.title : v.key}`}
                  value={v.monitoring}
                  placeholder="Monitoring approach for this vector..."
                  onChange={(ev) => update(v.key, { monitoring: ev.target.value })}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default LandscapeContextCapture;
