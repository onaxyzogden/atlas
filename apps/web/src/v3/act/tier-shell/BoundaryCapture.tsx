import * as React from 'react';
import css from './BoundaryCapture.module.css';
import { Plus, Trash2, Flag, MapPin } from 'lucide-react';
import type { FormValue } from './actToolCatalog.js';

// ---------------------------------------------------------------------------
// Modes (one bespoke body per re-decomposed s1-boundaries item).
// ---------------------------------------------------------------------------
export type BoundaryMode =
  | 'boundaryRegister' // c1
  | 'rowRegister' // c2
  | 'tenancyRegister' // c3
  | 'titleRestrictionChecker' // c4
  | 'landHistoryRegister'; // c5

export function boundaryModeFor(itemId: string): BoundaryMode {
  switch (itemId) {
    case 's1-boundaries-c1':
      return 'boundaryRegister';
    case 's1-boundaries-c2':
      return 'rowRegister';
    case 's1-boundaries-c3':
      return 'tenancyRegister';
    case 's1-boundaries-c4':
      return 'titleRestrictionChecker';
    case 's1-boundaries-c5':
      return 'landHistoryRegister';
    default:
      return 'boundaryRegister';
  }
}

// ---------------------------------------------------------------------------
// Models (decoded from the flat FormValue's parallel arrays).
// ---------------------------------------------------------------------------
export interface BoundarySection {
  direction: string;
  type: string;
  name: string;
  obligation: string;
  disputeFlag: boolean;
}
export interface BoundaryRegisterModel {
  kind: 'boundaryRegister';
  sections: BoundarySection[];
}
export interface RowOfWay {
  type: string;
  name: string;
  impact: string;
  holder: string;
  width: string;
  detail: string;
}
export interface RowRegisterModel {
  kind: 'rowRegister';
  rows: RowOfWay[];
}
export interface TenancyAgreement {
  type: string;
  name: string;
  expiry: string;
  flag: string;
  detail: string;
}
export interface TenancyRegisterModel {
  kind: 'tenancyRegister';
  rows: TenancyAgreement[];
}
export type TitleState = 'present' | 'absent' | 'unknown';
export interface TitleCheckerModel {
  kind: 'titleRestrictionChecker';
  categories: TitleState[]; // length 6, positional (TITLE_CATEGORIES order)
}
export interface HistoryRecord {
  era: string;
  type: string;
  name: string;
  body: string;
}
export interface LandHistoryModel {
  kind: 'landHistoryRegister';
  rows: HistoryRecord[];
  wasPriorIC: string;
  contamination: string[];
  notes: string;
}
export type BoundaryModel =
  | BoundaryRegisterModel
  | RowRegisterModel
  | TenancyRegisterModel
  | TitleCheckerModel
  | LandHistoryModel;

// ---------------------------------------------------------------------------
// Fixed title-restriction categories (REVIEW: labels/descriptions/consequences
// transcribed verbatim from olos_boundary_legal_survey.html, ASCII-normalised).
// ---------------------------------------------------------------------------
export interface TitleCategory {
  label: string;
  description: string;
  consequence: string; // shown when state === 'present'
  actNote: string; // "Act task will be created: ..." shown when present
}
export const TITLE_CATEGORIES: readonly TitleCategory[] = [
  {
    label: 'Zoning: Single residential only',
    description: 'Planning zone restricts this title to one dwelling unit',
    consequence:
      'The planning zone permits only one dwelling. Multi-dwelling or communal use requires rezoning or a planning permit before the community form is viable.',
    actNote:
      'Act task will be created: Investigate rezoning or permit pathway before finalising community form',
  },
  {
    label: 'Planning permit required for multiple dwellings',
    description: 'Rural zone - additional dwellings require planning approval',
    consequence:
      'Each additional dwelling beyond the existing one requires a planning permit from the relevant council. This is standard in rural zones - it does not prohibit the community, but it requires a permit application for every dwelling cluster. Applications typically take 3-9 months. Community design should be finalised in outline before permits are lodged.',
    actNote:
      'Act task will be created: Lodge planning permit applications for all dwellings before construction begins',
  },
  {
    label: 'Conservation covenant or land management agreement',
    description:
      'Voluntary or statutory conservation obligation on part of the title',
    consequence:
      'A conservation covenant may apply to part of the title. Restrictions can include no clearing of native vegetation, no structures within the covenant area, and no introduction of feral animals. A covenant runs with the land permanently and cannot be removed.',
    actNote:
      'Covenant boundary must be mapped and applied as a design exclusion zone before Tier 3 spatial framework',
  },
  {
    label: 'Title deed covenant restricting dwelling count',
    description:
      'Private covenant registered on title limiting number of structures or dwellings',
    consequence:
      'A private covenant registered on title may limit the number of structures or dwellings. Resolving or working within it requires legal advice before the community form is settled.',
    actNote:
      'Act task will be created: Obtain legal advice on the title-deed covenant restricting dwelling count',
  },
  {
    label: 'Heritage overlay or heritage listing',
    description:
      'State or local heritage protection restricting alterations to structures',
    consequence:
      'A heritage overlay or listing restricts alterations to protected structures and may constrain new works nearby. Heritage approval is required before affected works proceed.',
    actNote:
      'Act task will be created: Confirm heritage controls and approval pathway before affected works',
  },
  {
    label: 'Subdivision restriction',
    description: 'Title cannot be subdivided into multiple lots',
    consequence:
      'The title cannot be subdivided into multiple lots. Any tenure model relying on subdivision is not available and an alternative (e.g. company-title or community land trust) is required.',
    actNote:
      'Act task will be created: Confirm a non-subdivision tenure model with legal advice',
  },
];

// ---------------------------------------------------------------------------
// FormValue helpers.
// ---------------------------------------------------------------------------
// Scalar "" is treated as absent (zero-length array); only array form may carry empty-string slots.
function asArr(v: string | string[] | undefined): string[] {
  if (Array.isArray(v)) return v;
  return typeof v === 'string' && v !== '' ? [v] : [];
}
function asStr(v: string | string[] | undefined): string {
  return typeof v === 'string' ? v : '';
}
function zipLen(...arrs: string[][]): number {
  return arrs.length ? Math.min(...arrs.map((a) => a.length)) : 0;
}

// ---------------------------------------------------------------------------
// decode: FormValue -> BoundaryModel (totally defensive; never throws).
// ---------------------------------------------------------------------------
export function decodeBoundary(itemId: string, value: FormValue): BoundaryModel {
  const mode = boundaryModeFor(itemId);
  switch (mode) {
    case 'boundaryRegister': {
      const directions = asArr(value.directions);
      const secTypes = asArr(value.secTypes);
      const names = asArr(value.names);
      const obligations = asArr(value.obligations);
      const disputes = asArr(value.disputes);
      const n = zipLen(directions, secTypes, names, obligations, disputes);
      const sections: BoundarySection[] = [];
      for (let i = 0; i < n; i++) {
        sections.push({
          direction: directions[i] ?? '',
          type: secTypes[i] ?? '',
          name: names[i] ?? '',
          obligation: obligations[i] ?? '',
          disputeFlag: disputes[i] === 'true',
        });
      }
      return { kind: 'boundaryRegister', sections };
    }
    case 'rowRegister': {
      const rowTypes = asArr(value.rowTypes);
      const names = asArr(value.names);
      const impacts = asArr(value.impacts);
      const holders = asArr(value.holders);
      const widths = asArr(value.widths);
      const details = asArr(value.details);
      const n = zipLen(rowTypes, names, impacts, holders, widths, details);
      const rows: RowOfWay[] = [];
      for (let i = 0; i < n; i++) {
        rows.push({
          type: rowTypes[i] ?? '',
          name: names[i] ?? '',
          impact: impacts[i] ?? '',
          holder: holders[i] ?? '',
          width: widths[i] ?? '',
          detail: details[i] ?? '',
        });
      }
      return { kind: 'rowRegister', rows };
    }
    case 'tenancyRegister': {
      const tenTypes = asArr(value.tenTypes);
      const names = asArr(value.names);
      const expiries = asArr(value.expiries);
      const flags = asArr(value.flags);
      const details = asArr(value.details);
      const n = zipLen(tenTypes, names, expiries, flags, details);
      const rows: TenancyAgreement[] = [];
      for (let i = 0; i < n; i++) {
        rows.push({
          type: tenTypes[i] ?? '',
          name: names[i] ?? '',
          expiry: expiries[i] ?? '',
          flag: flags[i] ?? '',
          detail: details[i] ?? '',
        });
      }
      return { kind: 'tenancyRegister', rows };
    }
    case 'titleRestrictionChecker': {
      const raw = asArr(value.categories);
      const categories: TitleState[] = [];
      for (let i = 0; i < TITLE_CATEGORIES.length; i++) {
        const v = raw[i];
        categories.push(
          v === 'present' || v === 'absent' ? v : 'unknown',
        );
      }
      return { kind: 'titleRestrictionChecker', categories };
    }
    case 'landHistoryRegister': {
      const eras = asArr(value.eras);
      const histTypes = asArr(value.histTypes);
      const names = asArr(value.names);
      const bodies = asArr(value.bodies);
      const n = zipLen(eras, histTypes, names, bodies);
      const rows: HistoryRecord[] = [];
      for (let i = 0; i < n; i++) {
        rows.push({
          era: eras[i] ?? '',
          type: histTypes[i] ?? '',
          name: names[i] ?? '',
          body: bodies[i] ?? '',
        });
      }
      return {
        kind: 'landHistoryRegister',
        rows,
        wasPriorIC: asStr(value.wasPriorIC),
        contamination: asArr(value.contamination),
        notes: asStr(value.notes),
      };
    }
  }
}

// ---------------------------------------------------------------------------
// encode: BoundaryModel -> FormValue (exact inverse of decode).
// ---------------------------------------------------------------------------
function encodeBoundary(model: BoundaryModel): FormValue {
  switch (model.kind) {
    case 'boundaryRegister':
      return {
        directions: model.sections.map((s) => s.direction),
        secTypes: model.sections.map((s) => s.type),
        names: model.sections.map((s) => s.name),
        obligations: model.sections.map((s) => s.obligation),
        disputes: model.sections.map((s) => (s.disputeFlag ? 'true' : '')),
      };
    case 'rowRegister':
      return {
        rowTypes: model.rows.map((r) => r.type),
        names: model.rows.map((r) => r.name),
        impacts: model.rows.map((r) => r.impact),
        holders: model.rows.map((r) => r.holder),
        widths: model.rows.map((r) => r.width),
        details: model.rows.map((r) => r.detail),
      };
    case 'tenancyRegister':
      return {
        tenTypes: model.rows.map((r) => r.type),
        names: model.rows.map((r) => r.name),
        expiries: model.rows.map((r) => r.expiry),
        flags: model.rows.map((r) => r.flag),
        details: model.rows.map((r) => r.detail),
      };
    case 'titleRestrictionChecker':
      return { categories: [...model.categories] };
    case 'landHistoryRegister':
      return {
        eras: model.rows.map((r) => r.era),
        histTypes: model.rows.map((r) => r.type),
        names: model.rows.map((r) => r.name),
        bodies: model.rows.map((r) => r.body),
        wasPriorIC: model.wasPriorIC,
        contamination: [...model.contamination],
        notes: model.notes,
      };
  }
}

// ---------------------------------------------------------------------------
// validity gates.
// ---------------------------------------------------------------------------
export function isBoundaryValid(_itemId: string, model: BoundaryModel): boolean {
  switch (model.kind) {
    case 'boundaryRegister':
      // Valid when at least one section has a typed boundary; direction is informational, not gated.
      return model.sections.some((s) => s.type !== '');
    case 'rowRegister':
      return true; // zero rights of way is a valid answer
    case 'tenancyRegister':
      return true; // zero agreements is a valid answer
    case 'titleRestrictionChecker':
      return (
        model.categories.length === TITLE_CATEGORIES.length &&
        model.categories.every((s) => s !== 'unknown')
      );
    case 'landHistoryRegister':
      return true; // always recordable
  }
}

// ---------------------------------------------------------------------------
// record-summary mirror.
// ---------------------------------------------------------------------------
function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}
export function summariseBoundary(_itemId: string, model: BoundaryModel): string {
  switch (model.kind) {
    case 'boundaryRegister': {
      const flagged = model.sections.filter((s) => s.disputeFlag).length;
      const base = plural(model.sections.length, 'boundary section', 'boundary sections');
      return flagged ? `${base}, ${flagged} flagged` : base;
    }
    case 'rowRegister':
      return plural(model.rows.length, 'right of way', 'rights of way');
    case 'tenancyRegister': {
      const term = model.rows.filter(
        (r) => r.flag === 'Must terminate before community occupation',
      ).length;
      const base = plural(model.rows.length, 'agreement', 'agreements');
      return term ? `${base}, ${term} require termination` : base;
    }
    case 'titleRestrictionChecker': {
      const present = model.categories.filter((s) => s === 'present').length;
      const unknown = model.categories.filter((s) => s === 'unknown').length;
      if (unknown) return `${unknown} condition(s) unknown - resolve with legal advice`;
      return present
        ? `${plural(present, 'restriction present', 'restrictions present')}`
        : 'All conditions assessed - none present';
    }
    case 'landHistoryRegister': {
      const recs = plural(model.rows.length, 'historical record', 'historical records');
      const conc = model.contamination.filter((c) => c !== 'None known').length;
      return conc
        ? `${recs}, ${plural(conc, 'contamination concern', 'contamination concerns')}`
        : recs;
    }
  }
}

// ---------------------------------------------------------------------------
// Component contract (body fleshed out in BR5-BR7).
// ---------------------------------------------------------------------------
export interface BoundaryCaptureProps {
  itemId: string;
  value: FormValue;
  onChange: (next: FormValue) => void;
  resolveOptions: (optionSetId: string) => readonly string[];
}

export default function BoundaryCapture({
  itemId,
  value,
  onChange,
  resolveOptions,
}: BoundaryCaptureProps): JSX.Element {
  const model = decodeBoundary(itemId, value);
  const emit = (next: BoundaryModel) => emitBoundary(onChange, next);

  if (model.kind === 'boundaryRegister') {
    const directions = resolveOptions('boundaryDirection');
    const types = resolveOptions('boundarySectionType');
    const set = (i: number, patch: Partial<BoundarySection>) =>
      emit({
        ...model,
        sections: model.sections.map((s, j) => (j === i ? { ...s, ...patch } : s)),
      });
    return (
      <div className={css.root} data-boundary-mode="boundaryRegister">
        <MapStrip resolveOptions={resolveOptions} />
        <div className={css.regHead}>
          <span className={css.regTitle}>Boundary register</span>
          <span className={css.regCount}>
            {model.sections.length} sections
          </span>
        </div>
        {model.sections.map((s, i) => (
          <div
            key={i}
            className={css.row}
            data-dispute={s.disputeFlag ? 'true' : 'false'}
          >
            <select
              className={css.sel}
              data-testid={`section-dir-${i}`}
              aria-label={`Boundary ${i + 1} direction`}
              value={s.direction}
              onChange={(e) => set(i, { direction: e.target.value })}
            >
              <option value="">Direction</option>
              {directions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select
              className={css.sel}
              data-testid={`section-type-${i}`}
              aria-label={`Boundary ${i + 1} type`}
              value={s.type}
              onChange={(e) => set(i, { type: e.target.value })}
            >
              <option value="">Type</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              className={css.inp}
              data-testid={`section-name-${i}`}
              aria-label={`Boundary ${i + 1} name`}
              value={s.name}
              placeholder="Name / description"
              onChange={(e) => set(i, { name: e.target.value })}
            />
            <input
              className={css.inp}
              data-testid={`section-obligation-${i}`}
              aria-label={`Boundary ${i + 1} obligation`}
              value={s.obligation}
              placeholder="Obligation"
              onChange={(e) => set(i, { obligation: e.target.value })}
            />
            <button
              type="button"
              className={css.flagBtn}
              data-testid={`section-dispute-${i}`}
              aria-pressed={s.disputeFlag}
              onClick={() => set(i, { disputeFlag: !s.disputeFlag })}
            >
              <Flag size={13} aria-hidden="true" />
              {s.disputeFlag ? 'Dispute flagged' : 'Flag dispute'}
            </button>
            <button
              type="button"
              className={css.delBtn}
              data-testid={`section-remove-${i}`}
              aria-label={`Remove boundary ${i + 1}`}
              onClick={() =>
                emit({
                  ...model,
                  sections: model.sections.filter((_, j) => j !== i),
                })
              }
            >
              <Trash2 size={13} aria-hidden="true" />
            </button>
          </div>
        ))}
        <button
          type="button"
          className={css.addBtn}
          data-testid="section-add"
          onClick={() =>
            emit({
              ...model,
              sections: [
                ...model.sections,
                { direction: '', type: '', name: '', obligation: '', disputeFlag: false },
              ],
            })
          }
        >
          <Plus size={14} aria-hidden="true" /> Add boundary section
        </button>
      </div>
    );
  }

  if (model.kind === 'rowRegister') {
    const types = resolveOptions('boundaryRowType');
    const impacts = resolveOptions('boundaryRowImpact');
    const set = (i: number, patch: Partial<RowOfWay>) =>
      emit({
        ...model,
        rows: model.rows.map((r, j) => (j === i ? { ...r, ...patch } : r)),
      });
    return (
      <div className={css.root} data-boundary-mode="rowRegister">
        <MapStrip resolveOptions={resolveOptions} />
        <div className={css.regHead}>
          <span className={css.regTitle}>Rights of way register</span>
          <span className={css.regCount}>{model.rows.length} rights</span>
        </div>
        {model.rows.map((r, i) => (
          <div key={i} className={css.row}>
            <select
              className={css.sel}
              data-testid={`row-type-${i}`}
              aria-label={`Right of way ${i + 1} type`}
              value={r.type}
              onChange={(e) => set(i, { type: e.target.value })}
            >
              <option value="">Type</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              className={css.inp}
              data-testid={`row-name-${i}`}
              aria-label={`Right of way ${i + 1} name`}
              value={r.name}
              placeholder="Name / description"
              onChange={(e) => set(i, { name: e.target.value })}
            />
            <select
              className={css.sel}
              data-testid={`row-impact-${i}`}
              aria-label={`Right of way ${i + 1} impact`}
              value={r.impact}
              onChange={(e) => set(i, { impact: e.target.value })}
            >
              <option value="">Impact</option>
              {impacts.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <input
              className={css.inp}
              data-testid={`row-holder-${i}`}
              aria-label={`Right of way ${i + 1} holder`}
              value={r.holder}
              placeholder="Holder"
              onChange={(e) => set(i, { holder: e.target.value })}
            />
            <input
              className={css.inp}
              data-testid={`row-width-${i}`}
              aria-label={`Right of way ${i + 1} width`}
              value={r.width}
              placeholder="Width / route"
              onChange={(e) => set(i, { width: e.target.value })}
            />
            <button
              type="button"
              className={css.delBtn}
              data-testid={`row-remove-${i}`}
              aria-label={`Remove right of way ${i + 1}`}
              onClick={() =>
                emit({ ...model, rows: model.rows.filter((_, j) => j !== i) })
              }
            >
              <Trash2 size={13} aria-hidden="true" />
            </button>
          </div>
        ))}
        <button
          type="button"
          className={css.addBtn}
          data-testid="row-add"
          onClick={() =>
            emit({
              ...model,
              rows: [
                ...model.rows,
                { type: '', name: '', impact: '', holder: '', width: '', detail: '' },
              ],
            })
          }
        >
          <Plus size={14} aria-hidden="true" /> Add right of way
        </button>
      </div>
    );
  }

  if (model.kind === 'tenancyRegister') {
    const types = resolveOptions('boundaryTenancyType');
    const expiries = resolveOptions('boundaryTenancyExpiry');
    const flags = resolveOptions('boundaryTenancyFlag');
    const set = (i: number, patch: Partial<TenancyAgreement>) =>
      emit({
        ...model,
        rows: model.rows.map((r, j) => (j === i ? { ...r, ...patch } : r)),
      });
    return (
      <div className={css.root} data-boundary-mode="tenancyRegister">
        <div className={css.regHead}>
          <span className={css.regTitle}>Current agreements on the land</span>
          <span className={css.regCount}>{model.rows.length} agreements</span>
        </div>
        {model.rows.map((r, i) => (
          <div key={i} className={css.row}>
            <select
              className={css.sel}
              data-testid={`tenancy-type-${i}`}
              aria-label={`Agreement ${i + 1} type`}
              value={r.type}
              onChange={(e) => set(i, { type: e.target.value })}
            >
              <option value="">Type</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              className={css.inp}
              data-testid={`tenancy-name-${i}`}
              aria-label={`Agreement ${i + 1} name`}
              value={r.name}
              placeholder="Name / party"
              onChange={(e) => set(i, { name: e.target.value })}
            />
            <select
              className={css.sel}
              data-testid={`tenancy-expiry-${i}`}
              aria-label={`Agreement ${i + 1} expiry`}
              value={r.expiry}
              onChange={(e) => set(i, { expiry: e.target.value })}
            >
              <option value="">Expiry</option>
              {expiries.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
            <select
              className={css.sel}
              data-testid={`tenancy-flag-${i}`}
              aria-label={`Agreement ${i + 1} status`}
              value={r.flag}
              onChange={(e) => set(i, { flag: e.target.value })}
            >
              <option value="">Status</option>
              {flags.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={css.delBtn}
              data-testid={`tenancy-remove-${i}`}
              aria-label={`Remove agreement ${i + 1}`}
              onClick={() =>
                emit({ ...model, rows: model.rows.filter((_, j) => j !== i) })
              }
            >
              <Trash2 size={13} aria-hidden="true" />
            </button>
          </div>
        ))}
        <button
          type="button"
          className={css.addBtn}
          data-testid="tenancy-add"
          onClick={() =>
            emit({
              ...model,
              rows: [
                ...model.rows,
                { type: '', name: '', expiry: '', flag: '', detail: '' },
              ],
            })
          }
        >
          <Plus size={14} aria-hidden="true" /> Add tenancy or agreement
        </button>
      </div>
    );
  }

  if (model.kind === 'titleRestrictionChecker') {
    const states = resolveOptions('boundaryTitleState'); // Present/Absent/Unknown
    const stateKey = (label: string): TitleState =>
      label.toLowerCase() === 'present'
        ? 'present'
        : label.toLowerCase() === 'absent'
          ? 'absent'
          : 'unknown';
    const unknownCount = model.categories.filter((s) => s === 'unknown').length;
    const set = (i: number, next: TitleState) =>
      emit({
        ...model,
        categories: model.categories.map((s, j) => (j === i ? next : s)),
      });
    return (
      <div className={css.root} data-boundary-mode="titleRestrictionChecker">
        <div className={css.legalBanner}>
          Title documents should be reviewed with a solicitor familiar with
          community land models. Mark unknowns and address them before completing
          this objective.
        </div>
        {TITLE_CATEGORIES.map((cat, i) => {
          const state = model.categories[i] ?? 'unknown';
          return (
            <div
              key={i}
              className={css.titleCat}
              data-testid={`title-cat-${i}`}
              data-state={state}
            >
              <div className={css.titleCatHead}>
                <div className={css.titleCatLabel}>{cat.label}</div>
                <div className={css.triState}>
                  {states.map((label) => {
                    const k = stateKey(label);
                    return (
                      <button
                        key={label}
                        type="button"
                        className={css.triBtn}
                        data-testid={`title-cat-${i}-${k}`}
                        data-on={state === k ? 'true' : 'false'}
                        aria-pressed={state === k}
                        onClick={() => set(i, k)}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className={css.titleCatDesc}>{cat.description}</div>
              {state === 'present' ? (
                <div
                  className={css.consequence}
                  data-testid={`title-consequence-${i}`}
                >
                  <div className={css.consequenceText}>{cat.consequence}</div>
                  <div className={css.actNote}>{cat.actNote}</div>
                </div>
              ) : null}
            </div>
          );
        })}
        {unknownCount > 0 ? (
          <div className={css.unknownWarning} data-testid="title-unknown-warning">
            {unknownCount} condition(s) marked Unknown - resolve with legal advice
            before completing this objective
          </div>
        ) : null}
      </div>
    );
  }

  if (model.kind === 'landHistoryRegister') {
    const histTypes = resolveOptions('boundaryHistoryType');
    const contamOpts = resolveOptions('boundaryContamination');
    const priorOpts = resolveOptions('boundaryPriorCommunity');
    const setRow = (i: number, patch: Partial<HistoryRecord>) =>
      emit({
        ...model,
        rows: model.rows.map((r, j) => (j === i ? { ...r, ...patch } : r)),
      });
    const toggleContam = (c: string) =>
      emit({
        ...model,
        contamination: model.contamination.includes(c)
          ? model.contamination.filter((x) => x !== c)
          : [...model.contamination, c],
      });
    return (
      <div className={css.root} data-boundary-mode="landHistoryRegister">
        <div className={css.regHead}>
          <span className={css.regTitle}>Prior use history - known records</span>
          <span className={css.regCount}>{model.rows.length} records</span>
        </div>
        {model.rows.map((r, i) => (
          <div key={i} className={css.row}>
            <input
              className={css.inp}
              data-testid={`history-era-${i}`}
              aria-label={`Record ${i + 1} era`}
              value={r.era}
              placeholder="Era (e.g. 1960s-present)"
              onChange={(e) => setRow(i, { era: e.target.value })}
            />
            <select
              className={css.sel}
              data-testid={`history-type-${i}`}
              aria-label={`Record ${i + 1} type`}
              value={r.type}
              onChange={(e) => setRow(i, { type: e.target.value })}
            >
              <option value="">Type</option>
              {histTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              className={css.inp}
              data-testid={`history-name-${i}`}
              aria-label={`Record ${i + 1} name`}
              value={r.name}
              placeholder="Name / description"
              onChange={(e) => setRow(i, { name: e.target.value })}
            />
            <input
              className={css.inp}
              data-testid={`history-body-${i}`}
              aria-label={`Record ${i + 1} detail`}
              value={r.body}
              placeholder="Detail"
              onChange={(e) => setRow(i, { body: e.target.value })}
            />
            <button
              type="button"
              className={css.delBtn}
              data-testid={`history-remove-${i}`}
              aria-label={`Remove record ${i + 1}`}
              onClick={() =>
                emit({ ...model, rows: model.rows.filter((_, j) => j !== i) })
              }
            >
              <Trash2 size={13} aria-hidden="true" />
            </button>
          </div>
        ))}
        <button
          type="button"
          className={css.addBtn}
          data-testid="history-add"
          onClick={() =>
            emit({
              ...model,
              rows: [...model.rows, { era: '', type: '', name: '', body: '' }],
            })
          }
        >
          <Plus size={14} aria-hidden="true" /> Add historical record
        </button>

        <div className={css.field}>
          <span className={css.qLabel}>
            Was this land previously used as an intentional community?
          </span>
          <div className={css.chipRow}>
            {priorOpts.map((o) => (
              <button
                key={o}
                type="button"
                className={css.chip}
                data-testid={`prior-community-${o}`}
                data-on={model.wasPriorIC === o ? 'true' : 'false'}
                aria-pressed={model.wasPriorIC === o}
                onClick={() =>
                  emit({
                    ...model,
                    wasPriorIC: model.wasPriorIC === o ? '' : o,
                  })
                }
              >
                {o}
              </button>
            ))}
          </div>
        </div>

        <div className={css.field}>
          <span className={css.qLabel}>Contamination concerns</span>
          <div className={css.chipRow}>
            {contamOpts.map((c) => (
              <button
                key={c}
                type="button"
                className={css.chip}
                data-testid={`contam-${c}`}
                data-on={model.contamination.includes(c) ? 'true' : 'false'}
                aria-pressed={model.contamination.includes(c)}
                onClick={() => toggleContam(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <textarea
          className={css.notesTa}
          data-testid="history-notes"
          aria-label="Land history notes"
          value={model.notes}
          placeholder="Detail any contamination concerns..."
          onChange={(e) => emit({ ...model, notes: e.target.value })}
        />

        <div className={css.culturalBanner}>
          Site may be on the unceded Country of a Traditional Owner group.
          Cultural heritage assessment is recommended before any earthworks.
          Check the relevant cultural-heritage register for this cadastral parcel
          and consult the local Traditional Owner corporation about adjacent
          waterway corridors.
        </div>
      </div>
    );
  }

  // unreachable: every BoundaryMode has a branch above.
  return <div className={css.root} data-boundary-mode={(model as BoundaryModel).kind} />;
}

// Decorative, disabled map affordance (deferred rich I/O; boundary precedent).
function MapStrip({
  resolveOptions: _resolveOptions,
}: {
  resolveOptions: (id: string) => readonly string[];
}): JSX.Element {
  return (
    <div className={css.mapPreview}>
      <svg className={css.mapSvg} viewBox="0 0 320 90" aria-hidden="true">
        <rect x="6" y="6" width="308" height="78" rx="8" />
      </svg>
      <button
        type="button"
        className={css.mapBtn}
        data-testid="open-map"
        disabled
      >
        <MapPin size={13} aria-hidden="true" /> Open map - coming soon
      </button>
    </div>
  );
}

// emit helper used by the bodies in BR5-BR7
export function emitBoundary(
  onChange: (next: FormValue) => void,
  model: BoundaryModel,
): void {
  onChange(encodeBoundary(model));
}
