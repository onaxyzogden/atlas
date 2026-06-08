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
