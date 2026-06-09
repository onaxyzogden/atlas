/**
 * ProvisionBalanceCapture -- a multi-mode CONTROLLED capture for objective
 * ev-s1-provision-balance (6 checklist items c1..c6). Ported verbatim from
 * olos_communal_private_provision.html right-hand panels p1..p6.
 *
 * Structure mirrors EvLegalGovernanceCapture (the canonical multi-mode capture):
 * a `provisionBalanceModeFor(itemId)` mapper plus a single component that
 * renders ONE mode body. The panel chrome (header / eyebrow / title / hint /
 * feeds / rationale / gate-note / Record-Defer footer) is owned by
 * DecisionWorkingPanel -- this capture renders ONLY the mode body blocks.
 *
 * Each mode persists its OWN keys in the per-item flat FormValue
 * (Record<string, string | string[]>). decode is TOTAL/defensive (non-array ->
 * empty; per-entry try/catch JSON.parse; drop text-less/non-JSON entries;
 * coerce to defaults; NEVER fabricate seed data). encode is the lossless
 * inverse and is exported.
 *
 * CONTROLLED / pure: the model is always derived from decode(value) each render;
 * the full next model is emitted via onChange(encode(next)). Stable per-entry
 * ids (ratify members) are minted by makeMemberId() in EVENT HANDLERS ONLY
 * (never in decode/render) and used as React keys (never array index).
 *
 * SIMPLIFICATIONS (intentional; per-item captures cannot read sibling items):
 *   - tension: the mockup auto-derives the 3 tensions from c1/c2/c3 selections;
 *     here they are a FIXED verbatim scaffold whose RESOLUTIONS persist.
 *   - ratify: the mockup shows seeded demo members; per "never fabricate seeds"
 *     this starts EMPTY with an "Add founding member" control.
 *
 * ASCII-only: em-dash -> " -- ", superscript-2 -> "2"; all icons are lucide.
 */

import * as React from 'react';
import { ArrowRight, CircleCheck, Info, Plus, X } from 'lucide-react';
import type { FormValue } from './actToolCatalog.js';
import css from './ProvisionBalanceCapture.module.css';

// ---------------------------------------------------------------------------
// Mode mapper
// ---------------------------------------------------------------------------

export type ProvisionBalanceMode =
  | 'matrix'
  | 'food'
  | 'financial'
  | 'entitlement'
  | 'tension'
  | 'ratify';

export function provisionBalanceModeFor(
  itemId: string,
): ProvisionBalanceMode | null {
  switch (itemId) {
    case 'ev-s1-provision-balance-c1':
      return 'matrix';
    case 'ev-s1-provision-balance-c2':
      return 'food';
    case 'ev-s1-provision-balance-c3':
      return 'financial';
    case 'ev-s1-provision-balance-c4':
      return 'entitlement';
    case 'ev-s1-provision-balance-c5':
      return 'tension';
    case 'ev-s1-provision-balance-c6':
      return 'ratify';
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Stable id factory (member rows). Module-scoped, pure -- no import-time
// side-effects; CALLED ONLY IN EVENT HANDLERS.
// ---------------------------------------------------------------------------

function makeMemberId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'mbr-' + Math.random().toString(36).slice(2, 10);
}

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

export type ProvisionCell = 'C' | 'H' | 'P';

export interface MatrixModel {
  kind: 'matrix';
  assignments: Record<string, ProvisionCell>;
}
export interface FoodModel {
  kind: 'food';
  foodSystem: string;
}
export interface FinancialModel {
  kind: 'financial';
  financialModel: string;
}
export interface EntitlementModel {
  kind: 'entitlement';
  floorArea: string;
  outdoor: string;
  garden: string;
  vehicle: string;
  privacy: string[];
  autonomy: string;
}
export interface TensionModel {
  kind: 'tension';
  /** keyed by tension id (t1/t2/t3) -> resolution text. */
  resolutions: Record<string, string>;
}
export type MemberStatus = 'pending' | 'confirmed' | 'offplatform';
export interface RatifyMember {
  id: string;
  name: string;
  status: MemberStatus;
  note: string;
}
export interface RatifyModel {
  kind: 'ratify';
  members: RatifyMember[];
}

export type ProvisionBalanceModel =
  | MatrixModel
  | FoodModel
  | FinancialModel
  | EntitlementModel
  | TensionModel
  | RatifyModel;

// ---------------------------------------------------------------------------
// Verbatim domain / card / tension data (copied from p1..p5)
// ---------------------------------------------------------------------------

const MATRIX_DOMAINS: ReadonlyArray<{ key: string; label: string }> = [
  { key: 'water', label: 'Water supply' },
  { key: 'energy', label: 'Energy' },
  { key: 'sanit', label: 'Sanitation & waste' },
  { key: 'bldg', label: 'Shared buildings' },
  { key: 'roads', label: 'Roads & access' },
  { key: 'comms', label: 'Communications' },
  { key: 'health', label: 'Healthcare & emergency' },
];
const MATRIX_DOMAIN_KEYS = new Set(MATRIX_DOMAINS.map((d) => d.key));
const PROVISION_CELLS: readonly ProvisionCell[] = ['C', 'H', 'P'];

interface FoodCard {
  id: string;
  title: string;
  desc: string;
  qualifier: string;
}
const FOOD_CARDS: readonly FoodCard[] = [
  {
    id: 'communal',
    title: 'Fully communal',
    desc: 'All food production is collective. Harvests are shared equally. Labour is pooled and scheduled. No individual gardens within the community land.',
    qualifier:
      'Requires strong shared governance of the food system, agreed labour rotas, and a process for unequal contribution.',
  },
  {
    id: 'hybrid',
    title: 'Hybrid -- communal zones + individual plots',
    desc: 'Shared orchards, bulk crops, and communal harvests alongside individual kitchen gardens each household manages for themselves.',
    qualifier:
      "Each household contributes a defined number of hours per week to communal production. Individual plots are the household's own responsibility.",
  },
  {
    id: 'individual',
    title: 'Individual plots -- each household responsible',
    desc: 'Each household has a dedicated growing area. Production, labour, and any harvest surplus belong to that household entirely.',
    qualifier:
      'Community connection around food is optional and informal. No shared food production obligations.',
  },
];
const FOOD_TITLE: Record<string, string> = Object.fromEntries(
  FOOD_CARDS.map((c) => [c.id, c.title]),
);

interface FinancialCard {
  id: string;
  title: string;
  desc: string;
  ref: string;
  qualifier?: string;
}
const FINANCIAL_CARDS: readonly FinancialCard[] = [
  {
    id: 'income',
    title: 'Full income sharing',
    desc: 'All household income flows into a common pool. All living costs are met from the pool. Complete economic equality -- and complete financial transparency.',
    ref: 'Used by: Twin Oaks, Acorn Community, many religious communities',
  },
  {
    id: 'contrib',
    title: 'Household contributions + shared cost pools',
    desc: 'Each household contributes a defined monthly amount to a communal fund covering shared infrastructure, maintenance, and community activities. Private finances remain separate.',
    ref: 'Used by: most urban ecovillages, many cohousing communities',
    qualifier:
      'Most common model for new communities. Requires agreement on contribution formula, cost allocation, and a process for missed contributions.',
  },
  {
    id: 'clt',
    title: 'Land equity + site fee model',
    desc: 'Land held collectively via a CLT or co-operative. Households pay an ongoing site fee. No individual equity stake in the land -- only in their own improvements.',
    ref: 'Used by: Findhorn Foundation, Earthsong Eco-Neighbourhood',
  },
  {
    id: 'sliding',
    title: 'Sliding scale solidarity fund',
    desc: 'Contributions are a percentage of household income -- higher earners contribute more, lower earners less. Financial disclosure is required. Solidarity is structural.',
    ref: 'Used by: some worker cooperatives, radical sharing communities',
  },
  {
    id: 'separate',
    title: 'Separate finances, equal cost split',
    desc: 'All finances are private. Shared costs are divided equally between households regardless of usage or capacity.',
    ref: 'Used by: most basic cohousing developments',
  },
];
const FINANCIAL_TITLE: Record<string, string> = Object.fromEntries(
  FINANCIAL_CARDS.map((c) => [c.id, c.title]),
);

const FINANCIAL_SCOPE_NOTE =
  'These are communal cost-sharing models among members who collectively own the asset -- not advance sale of future yield. Recorded verbatim per the 2026-05-29 encode-verbatim authorisation.';

interface EntRow {
  key: 'floorArea' | 'outdoor' | 'garden' | 'vehicle';
  label: string;
  unit: string;
  note?: string;
}
const ENT_ROWS: readonly EntRow[] = [
  {
    key: 'floorArea',
    label: 'Private floor area',
    unit: 'm2 per adult equivalent',
    note: 'Exclusive use -- no community access without invitation',
  },
  { key: 'outdoor', label: 'Private outdoor space', unit: 'm2 per household' },
  {
    key: 'garden',
    label: 'Individual kitchen garden',
    unit: 'm2 per household',
    note: 'Harvest from individual plots belongs to that household',
  },
  { key: 'vehicle', label: 'Vehicle storage', unit: 'bays per household' },
];

const PRIVACY_OPTIONS: ReadonlyArray<{ key: string; label: string }> = [
  {
    key: 'visual',
    label:
      'Visual privacy -- no sightlines from shared areas into private dwellings',
  },
  {
    key: 'acoustic',
    label:
      'Acoustic privacy -- dwellings meet minimum noise separation standard',
  },
  {
    key: 'quiet',
    label: 'Quiet hours -- communal areas quiet after 10pm, before 7am',
  },
  {
    key: 'visitor',
    label: 'Visitor autonomy -- households may have guests without community notice',
  },
];

interface TensionCard {
  id: string;
  title: string;
  sideA: string;
  sideB: string;
  desc: string;
}
const TENSION_CARDS: readonly TensionCard[] = [
  {
    id: 't1',
    title: 'Energy monitoring vs. household privacy',
    sideA: 'Hybrid energy system',
    sideB: 'Household autonomy',
    desc: 'Your hybrid energy arrangement requires monitoring to allocate shared costs fairly. Who can access individual household consumption data? Can a household opt out of usage monitoring?',
  },
  {
    id: 't2',
    title: 'Communal harvest vs. individual plots in shortage',
    sideA: 'Hybrid food system',
    sideB: 'Individual kitchen garden (25 m2)',
    desc: 'When communal production falls short in a given season, can households expand into communal growing zones without a community decision? Or does individual plot produce stay entirely separate?',
  },
  {
    id: 't3',
    title: 'Fixed contributions vs. variable household circumstances',
    sideA: 'Contributions + shared costs',
    sideB: 'Household financial autonomy',
    desc: 'Your financial model requires regular household contributions. What is the community process when a household temporarily cannot meet their contribution -- grace period, solidarity mechanism, or site access risk?',
  },
];
const TENSION_IDS = TENSION_CARDS.map((t) => t.id);

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
// decode: FormValue -> ProvisionBalanceModel (TOTAL / defensive; never throws,
// never fabricates seed data).
// ---------------------------------------------------------------------------

export function decodeProvisionBalance(
  mode: ProvisionBalanceMode,
  value: FormValue,
): ProvisionBalanceModel {
  switch (mode) {
    case 'matrix': {
      const assignments: Record<string, ProvisionCell> = {};
      for (const entry of asArr(value.provisionMatrix)) {
        if (typeof entry !== 'string') continue;
        const sep = entry.indexOf('::');
        if (sep <= 0) continue;
        const key = entry.slice(0, sep);
        const cell = entry.slice(sep + 2);
        if (cell !== 'C' && cell !== 'H' && cell !== 'P') continue;
        assignments[key] = cell;
      }
      return { kind: 'matrix', assignments };
    }
    case 'food':
      return { kind: 'food', foodSystem: asStr(value.foodSystem) };
    case 'financial':
      return { kind: 'financial', financialModel: asStr(value.financialModel) };
    case 'entitlement':
      return {
        kind: 'entitlement',
        floorArea: asStr(value.entFloorArea),
        outdoor: asStr(value.entOutdoor),
        garden: asStr(value.entGarden),
        vehicle: asStr(value.entVehicle),
        privacy: asArr(value.entPrivacy),
        autonomy: asStr(value.entAutonomy),
      };
    case 'tension': {
      const resolutions: Record<string, string> = {};
      for (const entry of asArr(value.tensionResolutions)) {
        if (typeof entry !== 'string') continue;
        const sep = entry.indexOf('::');
        if (sep <= 0) continue;
        const id = entry.slice(0, sep);
        const text = entry.slice(sep + 2);
        if (!TENSION_IDS.includes(id)) continue;
        resolutions[id] = text;
      }
      return { kind: 'tension', resolutions };
    }
    case 'ratify': {
      const members: RatifyMember[] = [];
      let index = 0;
      for (const entry of asArr(value.ratifyMembers)) {
        if (typeof entry !== 'string') {
          index++;
          continue;
        }
        try {
          const parsed: unknown = JSON.parse(entry);
          if (
            parsed === null ||
            typeof parsed !== 'object' ||
            typeof (parsed as { name?: unknown }).name !== 'string'
          ) {
            index++;
            continue;
          }
          const p = parsed as {
            id?: unknown;
            name: string;
            status?: unknown;
            note?: unknown;
          };
          const id: string =
            typeof p.id === 'string' && p.id !== '' ? p.id : 'legacy-' + index;
          const status: MemberStatus =
            p.status === 'confirmed'
              ? 'confirmed'
              : p.status === 'offplatform'
                ? 'offplatform'
                : 'pending';
          const note: string = typeof p.note === 'string' ? p.note : '';
          members.push({ id, name: p.name, status, note });
        } catch {
          // drop malformed entry
        }
        index++;
      }
      return { kind: 'ratify', members };
    }
  }
}

// ---------------------------------------------------------------------------
// encode: ProvisionBalanceModel -> FormValue (lossless inverse of decode).
// ---------------------------------------------------------------------------

export function encodeProvisionBalance(
  _mode: ProvisionBalanceMode,
  model: ProvisionBalanceModel,
): FormValue {
  switch (model.kind) {
    case 'matrix':
      return {
        provisionMatrix: Object.entries(model.assignments).map(
          ([k, v]) => `${k}::${v}`,
        ),
      };
    case 'food':
      return { foodSystem: model.foodSystem };
    case 'financial':
      return { financialModel: model.financialModel };
    case 'entitlement':
      return {
        entFloorArea: model.floorArea,
        entOutdoor: model.outdoor,
        entGarden: model.garden,
        entVehicle: model.vehicle,
        entPrivacy: [...model.privacy],
        entAutonomy: model.autonomy,
      };
    case 'tension':
      return {
        tensionResolutions: Object.entries(model.resolutions).map(
          ([id, text]) => `${id}::${text}`,
        ),
      };
    case 'ratify':
      return {
        ratifyMembers: model.members.map((m) => JSON.stringify(m)),
      };
  }
}

// ---------------------------------------------------------------------------
// validity gates (per mode)
// ---------------------------------------------------------------------------

export function isProvisionBalanceValid(
  _mode: ProvisionBalanceMode,
  model: ProvisionBalanceModel,
): boolean {
  switch (model.kind) {
    case 'matrix':
      return MATRIX_DOMAINS.every((d) => model.assignments[d.key] != null);
    case 'food':
      return model.foodSystem !== '';
    case 'financial':
      return model.financialModel !== '';
    case 'entitlement': {
      const n = Number.parseFloat(model.floorArea);
      return Number.isFinite(n) && n > 0;
    }
    case 'tension':
      return TENSION_IDS.every(
        (id) => (model.resolutions[id] ?? '').trim() !== '',
      );
    case 'ratify':
      return (
        model.members.length >= 1 &&
        model.members.every((m) => m.status !== 'pending')
      );
  }
}

// ---------------------------------------------------------------------------
// record-summary mirror (per mode)
// ---------------------------------------------------------------------------

export function summariseProvisionBalance(
  _mode: ProvisionBalanceMode,
  model: ProvisionBalanceModel,
): string {
  switch (model.kind) {
    case 'matrix': {
      const vals = Object.values(model.assignments);
      const c = vals.filter((v) => v === 'C').length;
      const h = vals.filter((v) => v === 'H').length;
      const p = vals.filter((v) => v === 'P').length;
      return `${c} communal, ${h} hybrid, ${p} household`;
    }
    case 'food':
      return FOOD_TITLE[model.foodSystem] ?? model.foodSystem;
    case 'financial':
      return FINANCIAL_TITLE[model.financialModel] ?? model.financialModel;
    case 'entitlement': {
      const n = model.privacy.length;
      const area = model.floorArea === '' ? '0' : model.floorArea;
      return `${area} m2/adult floor area, ${n} privacy standard(s)`;
    }
    case 'tension': {
      const resolved = TENSION_IDS.filter(
        (id) => (model.resolutions[id] ?? '').trim() !== '',
      ).length;
      return `${resolved}/3 tensions resolved`;
    }
    case 'ratify': {
      const total = model.members.length;
      const confirmed = model.members.filter(
        (m) => m.status !== 'pending',
      ).length;
      return `${confirmed}/${total} founding members confirmed`;
    }
  }
}

// ---------------------------------------------------------------------------
// Component (renders ONLY the body for the resolved mode).
// ---------------------------------------------------------------------------

export interface ProvisionBalanceCaptureProps {
  mode: ProvisionBalanceMode;
  value: FormValue;
  onChange: (next: FormValue) => void;
}

export function ProvisionBalanceCapture({
  mode,
  value,
  onChange,
}: ProvisionBalanceCaptureProps): React.JSX.Element {
  const model = decodeProvisionBalance(mode, value);
  const emit = (next: ProvisionBalanceModel): void =>
    onChange(encodeProvisionBalance(mode, next));

  if (model.kind === 'matrix') {
    const vals = Object.values(model.assignments);
    const c = vals.filter((v) => v === 'C').length;
    const h = vals.filter((v) => v === 'H').length;
    const p = vals.filter((v) => v === 'P').length;
    const setCell = (key: string, cell: ProvisionCell): void =>
      emit({
        kind: 'matrix',
        assignments: { ...model.assignments, [key]: cell },
      });
    return (
      <div className={css.root} data-pb-mode="matrix">
        <div className={css.legend}>
          <span className={css.legendItem}>
            <span className={css.dotC} aria-hidden="true" />
            Communal
          </span>
          <span className={css.legendItem}>
            <span className={css.dotH} aria-hidden="true" />
            Hybrid
          </span>
          <span className={css.legendItem}>
            <span className={css.dotP} aria-hidden="true" />
            Household
          </span>
        </div>
        <div className={css.matrixList}>
          {MATRIX_DOMAINS.map((d) => (
            <div key={d.key} className={css.matrixRow}>
              <span className={css.matrixDomain}>{d.label}</span>
              <div className={css.matrixOpts}>
                {PROVISION_CELLS.map((cell) => (
                  <button
                    key={cell}
                    type="button"
                    className={css.matrixOpt}
                    data-testid={`matrix-${d.key}-${cell}`}
                    data-cell={cell}
                    data-on={model.assignments[d.key] === cell ? 'true' : 'false'}
                    aria-pressed={model.assignments[d.key] === cell}
                    aria-label={`${d.label}: ${cell}`}
                    onClick={() => setCell(d.key, cell)}
                  >
                    {cell}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className={css.matrixSummary}>
          <div className={css.summaryItem}>
            <span className={css.summaryNumC}>{c}</span>
            <span className={css.summaryLblC}>Communal</span>
          </div>
          <div className={css.summaryItem}>
            <span className={css.summaryNumH}>{h}</span>
            <span className={css.summaryLblH}>Hybrid</span>
          </div>
          <div className={css.summaryItem}>
            <span className={css.summaryNumP}>{p}</span>
            <span className={css.summaryLblP}>Household</span>
          </div>
        </div>
        <div className={css.feedsBlock}>
          <ArrowRight size={13} className={css.feedsIcon} aria-hidden="true" />
          <div className={css.feedsTxt}>
            Communal infrastructure feeds{' '}
            <strong>Tier 4: Infrastructure design</strong> and the shared cost
            allocation formula. Hybrid items generate individual metering
            requirements.
          </div>
        </div>
      </div>
    );
  }

  if (model.kind === 'food') {
    const pick = (id: string): void =>
      emit({ kind: 'food', foodSystem: model.foodSystem === id ? '' : id });
    return (
      <div className={css.root} data-pb-mode="food">
        <div className={css.cardList}>
          {FOOD_CARDS.map((card) => {
            const on = model.foodSystem === card.id;
            return (
              <button
                key={card.id}
                type="button"
                className={css.choiceCard}
                data-testid={`food-card-${card.id}`}
                data-on={on ? 'true' : 'false'}
                aria-pressed={on}
                onClick={() => pick(card.id)}
              >
                <span className={css.cardDot} aria-hidden="true" />
                <span className={css.cardBody}>
                  <span className={css.cardTitle}>{card.title}</span>
                  <span className={css.cardDesc}>{card.desc}</span>
                  <span className={css.cardQualifier}>{card.qualifier}</span>
                </span>
              </button>
            );
          })}
        </div>
        <div className={css.feedsBlock}>
          <ArrowRight size={13} className={css.feedsIcon} aria-hidden="true" />
          <div className={css.feedsTxt}>
            Food system approach feeds{' '}
            <strong>Tier 5: Production zone design</strong> and determines how
            growing areas are allocated in the spatial framework.
          </div>
        </div>
      </div>
    );
  }

  if (model.kind === 'financial') {
    const pick = (id: string): void =>
      emit({
        kind: 'financial',
        financialModel: model.financialModel === id ? '' : id,
      });
    return (
      <div className={css.root} data-pb-mode="financial">
        {/* Amanah scope note (verbatim) -- communal cost-sharing, not advance sale of yield. */}
        <p className={css.scopeNote}>
          <Info size={13} className={css.scopeIcon} aria-hidden="true" />
          <span>{FINANCIAL_SCOPE_NOTE}</span>
        </p>
        <div className={css.cardList}>
          {FINANCIAL_CARDS.map((card) => {
            const on = model.financialModel === card.id;
            return (
              <button
                key={card.id}
                type="button"
                className={css.choiceCard}
                data-testid={`financial-card-${card.id}`}
                data-on={on ? 'true' : 'false'}
                aria-pressed={on}
                onClick={() => pick(card.id)}
              >
                <span className={css.cardDot} aria-hidden="true" />
                <span className={css.cardBody}>
                  <span className={css.cardTitle}>{card.title}</span>
                  <span className={css.cardDesc}>{card.desc}</span>
                  <span className={css.cardRef}>{card.ref}</span>
                  {card.qualifier ? (
                    <span className={css.cardQualifier}>{card.qualifier}</span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
        <div className={css.feedsBlock}>
          <ArrowRight size={13} className={css.feedsIcon} aria-hidden="true" />
          <div className={css.feedsTxt}>
            Financial model feeds <strong>Tier 6: Phasing &amp; resourcing</strong>{' '}
            and the legal entity structure recommendation for the project.
          </div>
        </div>
      </div>
    );
  }

  if (model.kind === 'entitlement') {
    const setField = (key: EntRow['key'], v: string): void =>
      emit({ ...model, [key]: v });
    const togglePrivacy = (key: string): void =>
      emit({
        ...model,
        privacy: model.privacy.includes(key)
          ? model.privacy.filter((x) => x !== key)
          : [...model.privacy, key],
      });
    return (
      <div className={css.root} data-pb-mode="entitlement">
        <div className={css.entList}>
          {ENT_ROWS.map((row) => (
            <div key={row.key} className={css.entItem}>
              <div className={css.entLabel}>{row.label}</div>
              <div className={css.entInputRow}>
                <input
                  type="number"
                  className={css.entInput}
                  data-testid={`ent-${row.key}`}
                  aria-label={row.label}
                  value={model[row.key]}
                  placeholder="0"
                  onChange={(e) => setField(row.key, e.target.value)}
                />
                <span className={css.entUnit}>{row.unit}</span>
              </div>
              {row.note ? <div className={css.entNote}>{row.note}</div> : null}
            </div>
          ))}
        </div>

        <div>
          <div className={css.secLbl}>Privacy standards</div>
          <div className={css.checkList}>
            {PRIVACY_OPTIONS.map((opt) => (
              <label key={opt.key} className={css.checkRow}>
                <input
                  type="checkbox"
                  className={css.checkbox}
                  data-testid={`privacy-${opt.key}`}
                  checked={model.privacy.includes(opt.key)}
                  onChange={() => togglePrivacy(opt.key)}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <div className={css.secLbl}>
            Additional autonomy provisions{' '}
            <span className={css.secOptional}>(optional)</span>
          </div>
          <textarea
            className={css.textarea}
            data-testid="ent-autonomy"
            aria-label="Additional autonomy provisions"
            value={model.autonomy}
            placeholder="Any other private entitlements the community has agreed on..."
            onChange={(e) => emit({ ...model, autonomy: e.target.value })}
          />
        </div>

        <div className={css.feedsBlock}>
          <ArrowRight size={13} className={css.feedsIcon} aria-hidden="true" />
          <div className={css.feedsTxt}>
            Entitlement register feeds{' '}
            <strong>Tier 4: Housing cluster design</strong> and generates the
            tension map in decision 5.
          </div>
        </div>
      </div>
    );
  }

  if (model.kind === 'tension') {
    const setResolution = (id: string, text: string): void =>
      emit({
        kind: 'tension',
        resolutions: { ...model.resolutions, [id]: text },
      });
    return (
      <div className={css.root} data-pb-mode="tension">
        {TENSION_CARDS.map((t) => {
          const resolution = model.resolutions[t.id] ?? '';
          const resolved = resolution.trim() !== '';
          return (
            <div key={t.id} className={css.tensionZone} data-resolved={resolved}>
              <div className={css.tensionTitle}>{t.title}</div>
              <div className={css.tensionVs}>
                <span className={css.tensionSideA}>{t.sideA}</span>
                <span className={css.tensionArrow} aria-hidden="true">
                  &lt;-&gt;
                </span>
                <span className={css.tensionSideB}>{t.sideB}</span>
              </div>
              <div className={css.tensionDesc}>{t.desc}</div>
              <div className={css.resolveLbl}>How we've agreed to handle this</div>
              <textarea
                className={css.resolveTa}
                data-testid={`tension-resolve-${t.id}`}
                aria-label={`Resolution for: ${t.title}`}
                value={resolution}
                placeholder="Document the resolution..."
                onChange={(e) => setResolution(t.id, e.target.value)}
              />
              {resolved ? (
                <div className={css.resolvedCheck}>
                  <CircleCheck size={12} aria-hidden="true" /> Tension resolved
                </div>
              ) : null}
            </div>
          );
        })}
        <div className={css.feedsBlock}>
          <ArrowRight size={13} className={css.feedsIcon} aria-hidden="true" />
          <div className={css.feedsTxt}>
            Tension resolutions are stored in the{' '}
            <strong>community agreement record</strong>. They inform governance
            structure design in the next Foundation Decision.
          </div>
        </div>
      </div>
    );
  }

  // ratify
  return (
    <RatifyBody
      model={model}
      onChange={(next) => emit(next)}
    />
  );
}

// ---------------------------------------------------------------------------
// Ratify body -- carries UI-only state (pending name input + open off-platform
// note rows). Member id minting happens here, in handlers only.
// ---------------------------------------------------------------------------

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function RatifyBody({
  model,
  onChange,
}: {
  model: RatifyModel;
  onChange: (next: RatifyModel) => void;
}): React.JSX.Element {
  const [nameInput, setNameInput] = React.useState('');
  const [openNotes, setOpenNotes] = React.useState<Set<string>>(
    () => new Set(),
  );

  const total = model.members.length;
  const confirmed = model.members.filter((m) => m.status !== 'pending').length;

  const addMember = (): void => {
    const name = nameInput.trim();
    if (name === '') return;
    onChange({
      kind: 'ratify',
      members: [
        ...model.members,
        { id: makeMemberId(), name, status: 'pending', note: '' },
      ],
    });
    setNameInput('');
  };

  const updateMember = (id: string, patch: Partial<RatifyMember>): void =>
    onChange({
      kind: 'ratify',
      members: model.members.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    });

  const removeMember = (id: string): void => {
    onChange({
      kind: 'ratify',
      members: model.members.filter((m) => m.id !== id),
    });
    setOpenNotes((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const toggleNote = (id: string): void =>
    setOpenNotes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const statusLabel = (m: RatifyMember): string =>
    m.status === 'confirmed'
      ? 'Confirmed'
      : m.status === 'offplatform'
        ? 'Confirmed off-platform'
        : 'Awaiting confirmation';

  return (
    <div className={css.root} data-pb-mode="ratify">
      <div className={css.ratifyHeaderRow}>
        <span className={css.secLbl}>Founding member confirmation</span>
        <span className={css.ratifyCount}>
          {confirmed}/{total} confirmed
        </span>
      </div>

      {total === 0 ? (
        <div className={css.ratifyEmpty} data-testid="ratify-empty">
          No founding members added yet. Add each founding household below.
        </div>
      ) : (
        <div className={css.memberList}>
          {model.members.map((m) => {
            const noteOpen = openNotes.has(m.id);
            return (
              <div key={m.id} className={css.memberRow} data-status={m.status}>
                <div className={css.memberHead}>
                  <span className={css.memberAvatar} aria-hidden="true">
                    {initials(m.name)}
                  </span>
                  <div className={css.memberInfo}>
                    <div className={css.memberName}>{m.name}</div>
                    <div className={css.memberStatus}>
                      {m.status !== 'pending' ? (
                        <CircleCheck size={11} aria-hidden="true" />
                      ) : null}{' '}
                      {statusLabel(m)}
                    </div>
                  </div>
                  <div className={css.memberActions}>
                    {m.status === 'pending' ? (
                      <>
                        <button
                          type="button"
                          className={css.memberBtn}
                          data-testid={`ratify-confirm-${m.id}`}
                          onClick={() => updateMember(m.id, { status: 'confirmed' })}
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          className={css.memberBtnOff}
                          data-testid={`ratify-offplat-${m.id}`}
                          onClick={() => toggleNote(m.id)}
                        >
                          Off-platform
                        </button>
                      </>
                    ) : null}
                    <button
                      type="button"
                      className={css.memberDel}
                      data-testid={`ratify-remove-${m.id}`}
                      aria-label={`Remove ${m.name}`}
                      onClick={() => removeMember(m.id)}
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
                {noteOpen && m.status === 'pending' ? (
                  <div className={css.offdocForm}>
                    <div className={css.offdocLbl}>
                      Record off-platform agreement
                    </div>
                    <textarea
                      className={css.offdocTa}
                      data-testid={`ratify-offnote-${m.id}`}
                      aria-label={`Off-platform note for ${m.name}`}
                      value={m.note}
                      placeholder="Date, format (meeting, signed document), and witness..."
                      onChange={(e) => updateMember(m.id, { note: e.target.value })}
                    />
                    <div className={css.offdocConfirm}>
                      <button
                        type="button"
                        className={css.offdocBtn}
                        data-testid={`ratify-offconfirm-${m.id}`}
                        onClick={() => {
                          updateMember(m.id, { status: 'offplatform' });
                          toggleNote(m.id);
                        }}
                      >
                        Mark as confirmed
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <div className={css.addMemberRow}>
        <input
          type="text"
          className={css.addMemberInput}
          data-testid="ratify-name-input"
          aria-label="Founding member name"
          value={nameInput}
          placeholder="Founding member name"
          onChange={(e) => setNameInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addMember();
            }
          }}
        />
        <button
          type="button"
          className={css.addMemberBtn}
          data-testid="ratify-add"
          onClick={addMember}
        >
          <Plus size={12} aria-hidden="true" /> Add founding member
        </button>
      </div>

      <div className={css.feedsBlock}>
        <ArrowRight size={13} className={css.feedsIcon} aria-hidden="true" />
        <div className={css.feedsTxt}>
          Ratified agreement is immutable once recorded. It becomes the founding
          document for all subsequent Act tasks involving communal
          infrastructure and shared costs.
        </div>
      </div>
    </div>
  );
}

export default ProvisionBalanceCapture;
