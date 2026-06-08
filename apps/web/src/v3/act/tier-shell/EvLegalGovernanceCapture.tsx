import * as React from 'react';
import css from './BoundaryCapture.module.css';
import type { FormValue } from './actToolCatalog.js';

// ---------------------------------------------------------------------------
// Modes (one bespoke body per ev-s1-legal-governance checklist item). Faithful
// to olos_legal_entity_tenure_financial.html (8 decisions d1-d8). The c8
// jurisdiction item was added to the catalogue in SP1 LG0 (slot 2 of dg1).
// ---------------------------------------------------------------------------
export type LegalGovernanceMode =
  | 'legalEntityPicker' // c1
  | 'jurisdiction' // c8
  | 'entityDecisionRecord' // c2
  | 'tenureModel' // c3
  | 'decisionFramework' // c4
  | 'financialGovernance' // c5
  | 'membershipRegister' // c6
  | 'legalAdviceGate'; // c7 (HARD GATE)

export function legalGovernanceModeFor(itemId: string): LegalGovernanceMode {
  switch (itemId) {
    case 'ev-s1-legal-governance-c1':
      return 'legalEntityPicker';
    case 'ev-s1-legal-governance-c8':
      return 'jurisdiction';
    case 'ev-s1-legal-governance-c2':
      return 'entityDecisionRecord';
    case 'ev-s1-legal-governance-c3':
      return 'tenureModel';
    case 'ev-s1-legal-governance-c4':
      return 'decisionFramework';
    case 'ev-s1-legal-governance-c5':
      return 'financialGovernance';
    case 'ev-s1-legal-governance-c6':
      return 'membershipRegister';
    case 'ev-s1-legal-governance-c7':
      return 'legalAdviceGate';
    default:
      return 'legalEntityPicker';
  }
}

// ---------------------------------------------------------------------------
// Models (decoded from the flat FormValue).
// ---------------------------------------------------------------------------
export interface LegalEntityPickerModel {
  kind: 'legalEntityPicker';
  entity: string;
}
export interface JurisdictionModel {
  kind: 'jurisdiction';
  country: string;
  province: string;
  regOffice: string;
}
export interface EntityDecisionRecordModel {
  kind: 'entityDecisionRecord';
  why: string;
  enables: string;
  constrains: string;
}
export interface TenureModelModel {
  kind: 'tenureModel';
  tenure: string;
}
export interface DecisionFrameworkModel {
  kind: 'decisionFramework';
  framework: string;
  quorum: string;
}
export interface FinancialGovernanceModel {
  kind: 'financialGovernance';
  banking: string;
  authSingle: string;
  authDouble: string;
  authVote: string;
  fyEnd: string;
}
export interface MembershipRegisterModel {
  kind: 'membershipRegister';
  rights: string[];
  obligations: string[];
}
export interface LegalAdviceGateModel {
  kind: 'legalAdviceGate';
  adviceScope: string[];
  adviceWritten: string;
  adviceDate: string;
}
export type LegalGovernanceModel =
  | LegalEntityPickerModel
  | JurisdictionModel
  | EntityDecisionRecordModel
  | TenureModelModel
  | DecisionFrameworkModel
  | FinancialGovernanceModel
  | MembershipRegisterModel
  | LegalAdviceGateModel;

// ---------------------------------------------------------------------------
// FormValue helpers (copied verbatim from BoundaryCapture).
// ---------------------------------------------------------------------------
function asArr(v: string | string[] | undefined): string[] {
  if (Array.isArray(v)) return v;
  return typeof v === 'string' && v !== '' ? [v] : [];
}
function asStr(v: string | string[] | undefined): string {
  return typeof v === 'string' ? v : '';
}

// ---------------------------------------------------------------------------
// decode: FormValue -> LegalGovernanceModel (totally defensive; never throws).
// ---------------------------------------------------------------------------
export function decodeLegalGovernance(
  itemId: string,
  value: FormValue,
): LegalGovernanceModel {
  const mode = legalGovernanceModeFor(itemId);
  switch (mode) {
    case 'legalEntityPicker':
      return { kind: 'legalEntityPicker', entity: asStr(value.entity) };
    case 'jurisdiction':
      return {
        kind: 'jurisdiction',
        country: asStr(value.country),
        province: asStr(value.province),
        regOffice: asStr(value.regOffice),
      };
    case 'entityDecisionRecord':
      return {
        kind: 'entityDecisionRecord',
        why: asStr(value.ratWhy),
        enables: asStr(value.ratEnables),
        constrains: asStr(value.ratConstrains),
      };
    case 'tenureModel':
      return { kind: 'tenureModel', tenure: asStr(value.tenure) };
    case 'decisionFramework':
      return {
        kind: 'decisionFramework',
        framework: asStr(value.framework),
        quorum: asStr(value.quorum),
      };
    case 'financialGovernance':
      return {
        kind: 'financialGovernance',
        banking: asStr(value.banking),
        authSingle: asStr(value.authSingle),
        authDouble: asStr(value.authDouble),
        authVote: asStr(value.authVote),
        fyEnd: asStr(value.fyEnd),
      };
    case 'membershipRegister':
      // rights/obligations are INDEPENDENT multi-selects (not zipped rows).
      return {
        kind: 'membershipRegister',
        rights: asArr(value.rights),
        obligations: asArr(value.obligations),
      };
    case 'legalAdviceGate':
      return {
        kind: 'legalAdviceGate',
        adviceScope: asArr(value.adviceScope),
        adviceWritten: asStr(value.adviceWritten),
        adviceDate: asStr(value.adviceDate),
      };
  }
}

// ---------------------------------------------------------------------------
// encode: LegalGovernanceModel -> FormValue (exact inverse of decode).
// ---------------------------------------------------------------------------
function encodeLegalGovernance(model: LegalGovernanceModel): FormValue {
  switch (model.kind) {
    case 'legalEntityPicker':
      return { entity: model.entity };
    case 'jurisdiction':
      return {
        country: model.country,
        province: model.province,
        regOffice: model.regOffice,
      };
    case 'entityDecisionRecord':
      return {
        ratWhy: model.why,
        ratEnables: model.enables,
        ratConstrains: model.constrains,
      };
    case 'tenureModel':
      return { tenure: model.tenure };
    case 'decisionFramework':
      return { framework: model.framework, quorum: model.quorum };
    case 'financialGovernance':
      return {
        banking: model.banking,
        authSingle: model.authSingle,
        authDouble: model.authDouble,
        authVote: model.authVote,
        fyEnd: model.fyEnd,
      };
    case 'membershipRegister':
      return {
        rights: [...model.rights],
        obligations: [...model.obligations],
      };
    case 'legalAdviceGate':
      return {
        adviceScope: [...model.adviceScope],
        adviceWritten: model.adviceWritten,
        adviceDate: model.adviceDate,
      };
  }
}

// ---------------------------------------------------------------------------
// validity gates.
// ---------------------------------------------------------------------------
export function isLegalGovernanceValid(
  _itemId: string,
  model: LegalGovernanceModel,
): boolean {
  switch (model.kind) {
    case 'legalEntityPicker':
      return model.entity !== '';
    case 'jurisdiction':
      return model.country !== '' && model.province !== '';
    case 'entityDecisionRecord':
      return (
        model.why.trim().length > 20 &&
        model.enables.trim().length > 5 &&
        model.constrains.trim().length > 5
      );
    case 'tenureModel':
      return model.tenure !== '';
    case 'decisionFramework':
      return model.framework !== '';
    case 'financialGovernance':
      // Amanah: custody/authorisation/reporting only - no riba, no gharar.
      return model.banking !== '';
    case 'membershipRegister':
      return true; // zero is recordable
    case 'legalAdviceGate':
      // HARD GATE: all 5 advice-scope items cleared AND written advice obtained.
      return model.adviceScope.length >= 5 && model.adviceWritten === 'yes';
  }
}

// ---------------------------------------------------------------------------
// record-summary mirror.
// ---------------------------------------------------------------------------
function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}
export function summariseLegalGovernance(
  _itemId: string,
  model: LegalGovernanceModel,
): string {
  switch (model.kind) {
    case 'legalEntityPicker':
      return model.entity;
    case 'jurisdiction':
      return `${model.province}, ${model.country}`;
    case 'entityDecisionRecord':
      return isLegalGovernanceValid(_itemId, model)
        ? 'Rationale documented'
        : 'Rationale incomplete';
    case 'tenureModel':
      return model.tenure;
    case 'decisionFramework':
      return model.quorum
        ? `${model.framework} (quorum ${model.quorum})`
        : model.framework;
    case 'financialGovernance':
      return model.banking;
    case 'membershipRegister':
      return `${plural(model.rights.length, 'right', 'rights')}, ${plural(
        model.obligations.length,
        'obligation',
        'obligations',
      )}`;
    case 'legalAdviceGate':
      return isLegalGovernanceValid(_itemId, model)
        ? 'Legal advice confirmed'
        : `${model.adviceScope.length} of 5 scope items cleared`;
  }
}

// ---------------------------------------------------------------------------
// emit helper used by the component bodies (LG5).
// ---------------------------------------------------------------------------
export function emitLegalGovernance(
  onChange: (next: FormValue) => void,
  model: LegalGovernanceModel,
): void {
  onChange(encodeLegalGovernance(model));
}

// ---------------------------------------------------------------------------
// Per-province jurisdiction note (keyed by the province option label).
// Transcribed from olos_legal_entity_tenure_financial.html jurNotes (lines
// 1076-1083), ASCII-normalised (em-dashes -> " - ", accented Quebec/Reseau
// folded to ASCII).
// ---------------------------------------------------------------------------
const JURISDICTION_NOTES: Record<string, string> = {
  Ontario:
    'Ontario: Co-operative Corporations Act (RSO 1990), Charities Accounting Act, and Land Titles Act are the primary legislation. Registration via ServiceOntario. Annual financial filing required for registered charities.',
  'British Columbia':
    'British Columbia: Co-operative Association Act (RSBC 1996), Societies Act (SBC 2015), and Land Title Act. Registration via BC Registries. Societies Act provides a modern, flexible non-profit framework.',
  Alberta:
    'Alberta: Co-operatives Act (SA 2001), Societies Act (RSA 2000). Alberta has one of the more developed CLT legislative frameworks in Canada - contact the Alberta CLT Association for guidance.',
  Quebec:
    'Quebec: Loi sur les cooperatives (RLRQ c C-67.2), Code civil du Quebec governs land transactions. Bilingual registration requirements. Strong history of community land projects via the Reseau des cooperatives.',
  'Nova Scotia':
    'Nova Scotia: Co-operative Associations Act (RSNS 1989), Societies Act (RSNS 1989). Nova Scotia has active CLT precedents - the Ecology Action Centre can provide referrals to experienced solicitors.',
  Other:
    'Consult your provincial registrar and a solicitor experienced in the entity type selected. Legislation varies significantly by province.',
};

// ---------------------------------------------------------------------------
// Component contract (self-routing; controlled over a flat FormValue).
// ---------------------------------------------------------------------------
export interface EvLegalGovernanceCaptureProps {
  itemId: string;
  value: FormValue;
  onChange: (next: FormValue) => void;
  resolveOptions: (optionSetId: string) => readonly string[];
}

export default function EvLegalGovernanceCapture({
  itemId,
  value,
  onChange,
  resolveOptions,
}: EvLegalGovernanceCaptureProps): JSX.Element {
  const model = decodeLegalGovernance(itemId, value);
  const emit = (next: LegalGovernanceModel) => emitLegalGovernance(onChange, next);

  if (model.kind === 'legalEntityPicker') {
    const opts = resolveOptions('legalEntityOptions');
    return (
      <div className={css.root} data-lg-mode="legalEntityPicker">
        <div className={css.field}>
          <span className={css.qLabel}>Evaluate legal entity options</span>
          <div className={css.chipRow}>
            {opts.map((o) => (
              <button
                key={o}
                type="button"
                className={css.chip}
                data-testid={`entity-${o}`}
                data-on={model.entity === o ? 'true' : 'false'}
                aria-pressed={model.entity === o}
                onClick={() => emit({ ...model, entity: model.entity === o ? '' : o })}
              >
                {o}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (model.kind === 'jurisdiction') {
    const countries = resolveOptions('legalJurisdictionCountry');
    const provinces = resolveOptions('legalJurisdictionProvince');
    const offices = resolveOptions('legalRegisteredOffice');
    const note = JURISDICTION_NOTES[model.province];
    return (
      <div className={css.root} data-lg-mode="jurisdiction">
        <div className={css.field}>
          <span className={css.qLabel}>Confirm governing jurisdiction</span>
          <select
            className={css.sel}
            data-testid="jur-country"
            aria-label="Governing country"
            value={model.country}
            onChange={(e) => emit({ ...model, country: e.target.value })}
          >
            <option value="">Country</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            className={css.sel}
            data-testid="jur-province"
            aria-label="Governing province or territory"
            value={model.province}
            onChange={(e) => emit({ ...model, province: e.target.value })}
          >
            <option value="">Province / territory</option>
            {provinces.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        {note ? (
          <div className={css.legalBanner} data-testid="jur-note">
            {note}
          </div>
        ) : null}
        <div className={css.field}>
          <span className={css.qLabel}>Registered office</span>
          <select
            className={css.sel}
            data-testid="jur-office"
            aria-label="Registered office location"
            value={model.regOffice}
            onChange={(e) => emit({ ...model, regOffice: e.target.value })}
          >
            <option value="">Select</option>
            {offices.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  if (model.kind === 'entityDecisionRecord') {
    return (
      <div className={css.root} data-lg-mode="entityDecisionRecord">
        <div className={css.field}>
          <span className={css.qLabel}>Why was this entity chosen?</span>
          <textarea
            className={css.notesTa}
            data-testid="rat-why"
            aria-label="Why this entity was chosen"
            value={model.why}
            placeholder="Document the reasoning for the chosen legal entity..."
            onChange={(e) => emit({ ...model, why: e.target.value })}
          />
        </div>
        <div className={css.field}>
          <span className={css.qLabel}>What does this entity enable?</span>
          <textarea
            className={css.notesTa}
            data-testid="rat-enables"
            aria-label="What this entity enables"
            value={model.enables}
            placeholder="What this structure makes possible..."
            onChange={(e) => emit({ ...model, enables: e.target.value })}
          />
        </div>
        <div className={css.field}>
          <span className={css.qLabel}>What does this entity constrain?</span>
          <textarea
            className={css.notesTa}
            data-testid="rat-constrains"
            aria-label="What this entity constrains"
            value={model.constrains}
            placeholder="Limitations or trade-offs accepted..."
            onChange={(e) => emit({ ...model, constrains: e.target.value })}
          />
        </div>
      </div>
    );
  }

  if (model.kind === 'tenureModel') {
    const opts = resolveOptions('legalTenureModel');
    return (
      <div className={css.root} data-lg-mode="tenureModel">
        <div className={css.field}>
          <span className={css.qLabel}>Define land tenure model</span>
          <div className={css.chipRow}>
            {opts.map((o) => (
              <button
                key={o}
                type="button"
                className={css.chip}
                data-testid={`tenure-${o}`}
                data-on={model.tenure === o ? 'true' : 'false'}
                aria-pressed={model.tenure === o}
                onClick={() => emit({ ...model, tenure: model.tenure === o ? '' : o })}
              >
                {o}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (model.kind === 'decisionFramework') {
    const frameworks = resolveOptions('legalDecisionFramework');
    const quorums = resolveOptions('legalQuorum');
    return (
      <div className={css.root} data-lg-mode="decisionFramework">
        <div className={css.field}>
          <span className={css.qLabel}>Define decision-making framework</span>
          <div className={css.chipRow}>
            {frameworks.map((o) => (
              <button
                key={o}
                type="button"
                className={css.chip}
                data-testid={`framework-${o}`}
                data-on={model.framework === o ? 'true' : 'false'}
                aria-pressed={model.framework === o}
                onClick={() =>
                  emit({ ...model, framework: model.framework === o ? '' : o })
                }
              >
                {o}
              </button>
            ))}
          </div>
        </div>
        <div className={css.field}>
          <span className={css.qLabel}>Quorum</span>
          <select
            className={css.sel}
            data-testid="framework-quorum"
            aria-label="Decision quorum"
            value={model.quorum}
            onChange={(e) => emit({ ...model, quorum: e.target.value })}
          >
            <option value="">Select quorum</option>
            {quorums.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  if (model.kind === 'financialGovernance') {
    // Amanah: custody/authorisation/reporting only - no interest-bearing
    // instrument (riba) and no speculative sale (gharar).
    const banking = resolveOptions('legalBankingStructure');
    const single = resolveOptions('legalAuthSingle');
    const double = resolveOptions('legalAuthDouble');
    const vote = resolveOptions('legalAuthVote');
    const fyEnds = resolveOptions('legalFinancialYearEnd');
    const threshold = (
      label: string,
      testid: string,
      key: 'authSingle' | 'authDouble' | 'authVote',
      opts: readonly string[],
    ): JSX.Element => (
      <div className={css.field}>
        <span className={css.qLabel}>{label}</span>
        <select
          className={css.sel}
          data-testid={testid}
          aria-label={label}
          value={model[key]}
          onChange={(e) => emit({ ...model, [key]: e.target.value })}
        >
          <option value="">Select</option>
          {opts.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
    );
    return (
      <div className={css.root} data-lg-mode="financialGovernance">
        <div className={css.field}>
          <span className={css.qLabel}>How are community funds held?</span>
          <div className={css.chipRow}>
            {banking.map((o) => (
              <button
                key={o}
                type="button"
                className={css.chip}
                data-testid={`banking-${o}`}
                data-on={model.banking === o ? 'true' : 'false'}
                aria-pressed={model.banking === o}
                onClick={() =>
                  emit({ ...model, banking: model.banking === o ? '' : o })
                }
              >
                {o}
              </button>
            ))}
          </div>
        </div>
        {threshold('Single-signatory authorisation up to', 'auth-single', 'authSingle', single)}
        {threshold('Double-signatory authorisation up to', 'auth-double', 'authDouble', double)}
        {threshold('Full membership vote required above', 'auth-vote', 'authVote', vote)}
        <div className={css.field}>
          <span className={css.qLabel}>Financial year end</span>
          <select
            className={css.sel}
            data-testid="fy-end"
            aria-label="Financial year end"
            value={model.fyEnd}
            onChange={(e) => emit({ ...model, fyEnd: e.target.value })}
          >
            <option value="">Select</option>
            {fyEnds.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  if (model.kind === 'membershipRegister') {
    const rights = resolveOptions('legalMembershipRights');
    const obligations = resolveOptions('legalMembershipObligations');
    const toggle = (
      list: 'rights' | 'obligations',
      item: string,
    ): void => {
      const cur = model[list];
      emit({
        ...model,
        [list]: cur.includes(item)
          ? cur.filter((x) => x !== item)
          : [...cur, item],
      });
    };
    return (
      <div className={css.root} data-lg-mode="membershipRegister">
        <div className={css.field}>
          <span className={css.qLabel}>Membership rights</span>
          <div className={css.chipRow}>
            {rights.map((o) => (
              <button
                key={o}
                type="button"
                className={css.chip}
                data-testid={`right-${o}`}
                data-on={model.rights.includes(o) ? 'true' : 'false'}
                aria-pressed={model.rights.includes(o)}
                onClick={() => toggle('rights', o)}
              >
                {o}
              </button>
            ))}
          </div>
        </div>
        <div className={css.field}>
          <span className={css.qLabel}>Membership obligations</span>
          <div className={css.chipRow}>
            {obligations.map((o) => (
              <button
                key={o}
                type="button"
                className={css.chip}
                data-testid={`obligation-${o}`}
                data-on={model.obligations.includes(o) ? 'true' : 'false'}
                aria-pressed={model.obligations.includes(o)}
                onClick={() => toggle('obligations', o)}
              >
                {o}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (model.kind === 'legalAdviceGate') {
    const scope = resolveOptions('legalAdviceScope');
    const written = resolveOptions('legalWrittenAdvice');
    const gateCleared = isLegalGovernanceValid(itemId, model);
    const toggleScope = (item: string): void =>
      emit({
        ...model,
        adviceScope: model.adviceScope.includes(item)
          ? model.adviceScope.filter((x) => x !== item)
          : [...model.adviceScope, item],
      });
    return (
      <div className={css.root} data-lg-mode="legalAdviceGate">
        <div className={css.legalBanner}>
          The chosen structure must be reviewed in writing by a solicitor
          experienced in community land models before this objective can be
          recorded. Confirm each item below has been covered by that advice.
        </div>
        <div className={css.field}>
          <span className={css.qLabel}>Advice scope covered</span>
          <div className={css.chipRow}>
            {scope.map((o) => (
              <button
                key={o}
                type="button"
                className={css.chip}
                data-testid={`advice-${o}`}
                data-on={model.adviceScope.includes(o) ? 'true' : 'false'}
                aria-pressed={model.adviceScope.includes(o)}
                onClick={() => toggleScope(o)}
              >
                {o}
              </button>
            ))}
          </div>
        </div>
        <div className={css.field}>
          <span className={css.qLabel}>Written advice obtained?</span>
          <select
            className={css.sel}
            data-testid="advice-written"
            aria-label="Written advice obtained"
            value={model.adviceWritten}
            onChange={(e) => emit({ ...model, adviceWritten: e.target.value })}
          >
            <option value="">Select</option>
            {written.map((o) => (
              <option key={o} value={o.toLowerCase()}>
                {o}
              </option>
            ))}
          </select>
        </div>
        <div className={css.field}>
          <span className={css.qLabel}>Date advice received</span>
          <input
            className={css.inp}
            type="date"
            data-testid="advice-date"
            aria-label="Date advice received"
            value={model.adviceDate}
            onChange={(e) => emit({ ...model, adviceDate: e.target.value })}
          />
        </div>
        {!gateCleared ? (
          <div className={css.unknownWarning} data-testid="advice-gate-warning">
            Clear all {scope.length} advice-scope items and confirm written advice
            before this decision can be recorded.
          </div>
        ) : null}
      </div>
    );
  }

  // unreachable: every LegalGovernanceMode has a branch above.
  return (
    <div className={css.root} data-lg-mode={(model as LegalGovernanceModel).kind} />
  );
}
