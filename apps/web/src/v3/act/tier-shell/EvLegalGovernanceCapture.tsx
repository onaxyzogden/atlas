import * as React from 'react';
import css from './EvLegalGovernanceCapture.module.css';
import type { FormValue } from './actToolCatalog.js';

// ---------------------------------------------------------------------------
// Modes (one bespoke body per ev-s1-legal-governance checklist item). Faithful
// to olos_legal_entity_tenure_governance.html (8 decisions d1-d8). The c8
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
// Models (decoded from the flat FormValue). Interfaces preserved verbatim from
// SP1 LG3 to maintain encode/decode/validity test compatibility.
// ---------------------------------------------------------------------------
export interface LegalEntityPickerModel {
  kind: 'legalEntityPicker';
  entity: string; // comma-joined entity ids for multi-select cards
}
export interface JurisdictionModel {
  kind: 'jurisdiction';
  country: string; // repurposed: jurisdiction type (Ontario / Federal / Other)
  province: string; // repurposed: CRA charitable status
  regOffice: string; // unused in new UI but preserved for encode round-trip
}
export interface EntityDecisionRecordModel {
  kind: 'entityDecisionRecord';
  why: string; // textarea: land permanence rationale
  enables: string; // textarea: Islamic compatibility rationale
  constrains: string; // textarea: alternatives considered
}
export interface TenureModelModel {
  kind: 'tenureModel';
  tenure: string;
}
export interface DecisionFrameworkModel {
  kind: 'decisionFramework';
  framework: string; // defaults to 'three-tier-shura' in decode
  quorum: string; // spending authority threshold chosen by user
}
export interface FinancialGovernanceModel {
  kind: 'financialGovernance';
  banking: string; // auto-set on mount; validity gated on non-empty
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
  adviceScope: string[]; // 6 gate item ids; all 6 required for validity
  adviceWritten: string; // kept for round-trip compat; no longer checked by validity
  adviceDate: string; // kept for round-trip compat
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
        // Default to three-tier-shura so the panel is immediately record-ready
        // once the spending authority threshold is chosen. The validity gate is
        // framework !== '' which is always satisfied after this default.
        framework: asStr(value.framework) || 'three-tier-shura',
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
      // HARD GATE: all 6 advice-scope checkboxes must be confirmed.
      // adviceWritten is no longer checked (gate replaced by 6 explicit items).
      return model.adviceScope.length >= 6;
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
        : `${model.adviceScope.length} of 6 scope items cleared`;
  }
}

// ---------------------------------------------------------------------------
// emit helper used by the component bodies.
// ---------------------------------------------------------------------------
export function emitLegalGovernance(
  onChange: (next: FormValue) => void,
  model: LegalGovernanceModel,
): void {
  onChange(encodeLegalGovernance(model));
}

// ---------------------------------------------------------------------------
// Per-province jurisdiction note (preserved from prior implementation; no
// longer shown in the new Ontario-specific UI but kept for reference).
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
void JURISDICTION_NOTES; // preserved for reference; not rendered in updated UI

// ---------------------------------------------------------------------------
// Hardcoded panel data (verbatim from olos_legal_entity_tenure_governance.html
// panels p1-p8). ASCII-normalised: em-dashes -> " - ", curly quotes -> straight.
// ---------------------------------------------------------------------------

const ENTITIES = [
  {
    id: 'onca-corp',
    name: 'Non-profit corporation (ONCA)',
    compat: 'strong' as const,
    compatLabel: 'Strong fit',
    desc:
      'Incorporated under the Ontario Not-for-Profit Corporations Act 2010. Separate legal personality, perpetual succession, member-controlled. Can include asset lock on dissolution - any remaining assets go to a similar organisation, not to members. This approximates Waqf perpetuity within Canadian law.',
    bullets: [
      'Member voting rights + director election + annual general meeting',
      'Can apply for charitable status under CRA (separate from incorporation)',
      'Asset lock clause supports Waqf-compatible perpetual land holding',
    ],
  },
  {
    id: 'clt',
    name: 'Community land trust (CLT)',
    compat: 'strong' as const,
    compatLabel: 'Strong fit',
    desc:
      'Not a separate legal entity type - a CLT is typically incorporated as a non-profit corporation with a CLT operating model: the corporation holds land in perpetuity, separates land value from dwelling value, and leases land to residents on 99-year ground leases. Prevents land speculation. Structurally compatible with Waqf principles.',
    bullets: [
      'Land is never sold - held by the corporation forever',
      'Residents buy/own their dwelling only, not the land under it',
      'Ground lease resale price is capped - equity sharing formula limits extraction',
    ],
  },
  {
    id: 'co-op',
    name: 'Co-operative (housing or multi-stakeholder)',
    compat: 'conditional' as const,
    compatLabel: 'Conditional',
    desc:
      'Incorporated under the Ontario Co-operative Corporations Act. Member-owned and controlled. Housing co-ops give members occupancy rights, not equity. Risk: members can vote to dissolve the co-op, which could undermine the Waqf principle of perpetuity unless the articles include strong dissolution protections.',
    bullets: [
      'One member, one vote - democratic structure aligns with shura',
      'Dissolution requires supermajority vote - perpetuity protection is possible but not automatic',
      'Patronage dividends are permissible - not shareholder profit',
    ],
  },
  {
    id: 'charity',
    name: 'Charitable trust or non-profit corporation',
    compat: 'conditional' as const,
    compatLabel: 'Conditional',
    desc:
      'A registered charity under the Income Tax Act, incorporated as a non-profit. Can issue tax receipts. Stricter CRA requirements: must demonstrate exclusively charitable purposes (religious, educational, or relief of poverty). Managing a residential community has commercial elements that require careful structuring to maintain charitable status.',
    bullets: [
      'Tax receipts attract donations - useful for Waqf fundraising',
      'CRA scrutiny of non-charitable activities is ongoing compliance burden',
      'Assets on dissolution must go to another charity - strong Waqf alignment',
    ],
  },
  {
    id: 'company',
    name: 'Company (share or guarantee)',
    compat: 'incomp' as const,
    compatLabel: 'Not recommended',
    desc:
      'Ontario Business Corporations Act. Share capital structure means equity can be transferred, sold, and land value extracted by shareholders. Conflicts directly with Waqf principles of perpetual dedication and prohibition of speculative profit (gharar). Not suitable as the primary vehicle for a faith-rooted community land holding.',
    bullets: [
      'Shares can be sold to anyone - no community control of membership',
      'Land value appreciation flows to shareholders - speculative structure',
      'Incompatible with Waqf perpetuity - excluded from shortlist',
    ],
  },
] as const;

const JURIS_OPTS = [
  'Ontario - under ONCA (Ontario Not-for-Profit Corporations Act 2010)',
  'Federal - under CNCA (Canada Not-for-Profit Corporations Act)',
  'Other province - specify in notes',
] as const;

const CRA_OPTS = [
  'Apply as registered charity - religious and educational purposes',
  'Non-charitable non-profit - no CRA registration',
  'Not yet determined - legal advice required',
] as const;

const ENTITY_SELECT_OPTS = [
  'Non-profit corporation (ONCA) structured as a community land trust',
  'Non-profit corporation (ONCA) - standard model',
  'Co-operative (housing co-op)',
  'Registered charity (ONCA + CRA)',
] as const;

const TENURE_OPTS = [
  {
    id: 'waqf-perpetual',
    name: 'Waqf-compatible perpetual holding - corporation owns, members lease',
    badge: 'Waqf aligned',
    badgeClass: 'tobWaqf' as const,
    desc:
      'The non-profit corporation holds the land permanently. Individual households hold a long-term 99-year renewable ground lease from the corporation. The ground lease gives full use and occupancy rights but the land itself cannot be extracted. On exit, the household\'s lease is transferred to a new member household at the corporation\'s direction - the land never enters the open market. This is the most Waqf-compatible structure available under Ontario law.',
  },
  {
    id: 'equity-cap',
    name: 'Equity shares with redemption cap',
    badge: 'Hybrid',
    badgeClass: 'tobHybrid' as const,
    desc:
      'Members hold an equity share in the corporation proportional to their contribution. On exit, shares are redeemed at capped value (contribution + inflation only - no land appreciation). This prevents speculation but is less robustly Waqf-compatible: share equity is a form of ownership that creates riba-adjacent dynamics if shares ever appreciate beyond the cap.',
  },
  {
    id: 'collective',
    name: 'Collective ownership - all members own proportionally',
    badge: 'Standard',
    badgeClass: 'tobStandard' as const,
    desc:
      'All founding members hold proportional ownership of the land. On new members joining, ownership is redistributed. On exit, members receive their proportional share of land value. This is the most conventional model but is the least Waqf-compatible - land value can be extracted on exit, and a majority vote of future members could sell the land entirely.',
  },
] as const;

const TIERS = [
  {
    levelClass: 'tlSteward' as const,
    level: 'Steward authority',
    title: 'Individual steward acts within mandate',
    body: 'Operational decisions within an agreed mandate. No consultation required. Must be reported at next monthly gathering. Reversed only by committee resolution.',
    examples: ['Daily land management', 'Purchasing within budget', 'Scheduling', 'Emergency repairs'],
  },
  {
    levelClass: 'tlCommittee' as const,
    level: 'Committee decision',
    title: 'Relevant committee consults and decides',
    body: 'Decisions affecting a domain or group of households. Committee of 3+ households with affected parties consulted. Reversible by full shura within 30 days.',
    examples: ['Membership applications', 'Capital above threshold', 'Protocol changes', 'Land use changes'],
  },
  {
    levelClass: 'tlShura' as const,
    level: 'Full shura',
    title: 'All households participate - consensus required',
    body: 'Decisions affecting the whole community or any foundational commitment. All member households must participate. Consensus required. Supermajority (2/3) as fallback only when consensus is not achievable after three attempts.',
    examples: ['Land sale or encumbrance', 'Founding document change', 'New household admission', 'Exit of a household', 'Dissolution'],
  },
] as const;

const SPENDING_OPTS = [
  'Steward authority: up to $500 per item - Committee: $500-$5,000 - Shura: above $5,000',
  'Steward: up to $1,000 - Committee: up to $10,000 - Shura: above $10,000',
  'Custom thresholds - specify in community agreement',
] as const;

const FIN_RULES = [
  {
    iconColor: 'var(--color-info, #5b8eaf)',
    title: 'Bank accounts and signatories',
    detail:
      'Two accounts: operating account (daily expenses) and capital reserve (land-related capital). Both held with an Islamic banking institution or a non-interest-bearing credit union account. All transactions above $500 require two signatories. Amir and treasurer are primary signatories. Deputy selected annually as backup.',
  },
  {
    iconColor: 'var(--color-stage-act, #d9a036)',
    title: 'Spending authority levels',
    detail:
      'Steward: up to $500 per transaction without prior approval. Committee: $500-$5,000 with committee resolution. Full shura: above $5,000 or any land-related expenditure regardless of amount. Emergency exemption: up to 2x monthly operating fee without shura, reported within 7 days.',
  },
  {
    iconColor: 'var(--color-teal, #3a9b8a)',
    title: 'Reporting and audit',
    detail:
      'Quarterly financial report to all member households - income, expenditure, reserves, and any variances from budget. Annual independent review (not a full audit at early stage). CRA T3010 (charity return) filed annually if registered charity status is held. All records retained for minimum 7 years.',
  },
] as const;

const RIGHTS = [
  "Long-term occupancy right for the household's designated dwelling and land parcel, held under the corporation's ground lease",
  'Full voting rights in community shura - one household, one vote regardless of contribution amount',
  'Access to all communal facilities, food production areas, and shared infrastructure',
  'Participation in governance, committee work, and stewardship roles',
  "Right to exit - with six months' written notice and return of initial contribution minus any community-agreed deductions",
] as const;

const OBLIGATIONS = [
  'Monthly contribution to operating and capital costs - amount set annually by shura budget process',
  'Minimum communal labour participation - 8 hours per household per month, or equivalent in kind (agreed with steward)',
  "Adherence to the community covenant - Islamic values, halal conduct, participation in Jama'ah life",
  'Participation in annual review process and at least 80% of full shura sessions',
  "Six months' advance notice of exit - allows the community to identify and onboard a replacement household",
] as const;

// 6 gate item ids -- ALL must be present in adviceScope for isLegalGovernanceValid.
const GATE_ITEMS = [
  {
    id: 'gc1',
    label:
      'ONCA incorporation requirements - articles of incorporation, bylaws, and letters patent reviewed',
  },
  {
    id: 'gc2',
    label:
      'Waqf-compatible dissolution and asset lock clauses reviewed by both civil and Islamic law advisers',
  },
  {
    id: 'gc3',
    label:
      'Ground lease template reviewed - 99-year renewable lease terms, resale price cap formula, membership succession',
  },
  {
    id: 'gc4',
    label:
      'Land title and transfer implications - how the Waqf declaration deed attaches to the title in Ontario',
  },
  {
    id: 'gc5',
    label: 'Membership rights and exit terms reviewed for enforceability under Ontario law',
  },
  {
    id: 'gc6',
    label:
      'CRA charitable status application reviewed - eligible purposes confirmed or non-charitable path confirmed',
  },
] as const;

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
  resolveOptions: _resolveOptions,
}: EvLegalGovernanceCaptureProps): JSX.Element {
  const model = decodeLegalGovernance(itemId, value);
  const emit = (next: LegalGovernanceModel) => emitLegalGovernance(onChange, next);

  // Auto-initialise the financial governance panel. Since c5 is display-only
  // (no user inputs), the banking field needs to be set on mount so the Record
  // button enables immediately. Re-fires when the item changes.
  React.useEffect(() => {
    if (model.kind === 'financialGovernance' && model.banking === '') {
      emit({ ...model, banking: 'Islamic bank or credit union (riba-free)' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  // ---------------------------------------------------------------------------
  // P1 -- ENTITY PICKER (c1): multi-select rich cards.
  // entity stores comma-joined ids ('onca-corp,clt') for backward-compatible
  // string field; validity remains `entity !== ''`.
  // ---------------------------------------------------------------------------
  if (model.kind === 'legalEntityPicker') {
    const selected = model.entity ? model.entity.split(',').filter(Boolean) : [];
    const toggle = (id: string): void => {
      const next = selected.includes(id)
        ? selected.filter((x) => x !== id)
        : [...selected, id];
      emit({ ...model, entity: next.join(',') });
    };
    return (
      <div className={css.root} data-lg-mode="legalEntityPicker">
        <span className={css.secLabel}>
          Select the options under consideration - choose one or more
        </span>
        <div className={css.entityCards}>
          {ENTITIES.map((e) => {
            const isSel = selected.includes(e.id);
            const compatClass =
              e.compat === 'strong'
                ? css.eccStrong
                : e.compat === 'conditional'
                ? css.eccConditional
                : css.eccIncomp;
            return (
              <div
                key={e.id}
                className={css.entityCard}
                data-selected={isSel ? 'true' : 'false'}
                data-testid={`entity-card-${e.id}`}
                role="button"
                tabIndex={0}
                aria-pressed={isSel}
                onClick={() => toggle(e.id)}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' || ev.key === ' ') toggle(e.id);
                }}
              >
                <div className={css.ecHead}>
                  <span className={css.ecName}>{e.name}</span>
                  <span className={`${css.ecCompat} ${compatClass}`}>{e.compatLabel}</span>
                </div>
                <p className={css.ecDesc}>{e.desc}</p>
                <div className={css.ecBullets}>
                  {e.bullets.map((b, i) => (
                    <div key={i} className={css.ecBullet}>
                      {b}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // P2 -- JURISDICTION (c8): two selects + Ontario vs Federal comparison table.
  // country = jurisdiction type, province = CRA status (repurposed for new UI).
  // ---------------------------------------------------------------------------
  if (model.kind === 'jurisdiction') {
    return (
      <div className={css.root} data-lg-mode="jurisdiction">
        <div className={css.field}>
          <span className={css.qLabel}>Primary incorporation jurisdiction</span>
          <select
            className={css.sel}
            data-testid="jur-country"
            aria-label="Primary incorporation jurisdiction"
            value={model.country}
            onChange={(e) => emit({ ...model, country: e.target.value })}
          >
            <option value="">Select jurisdiction</option>
            {JURIS_OPTS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        <div className={css.field}>
          <span className={css.qLabel}>CRA charitable status (separate from incorporation)</span>
          <select
            className={css.sel}
            data-testid="jur-province"
            aria-label="CRA charitable status"
            value={model.province}
            onChange={(e) => emit({ ...model, province: e.target.value })}
          >
            <option value="">Select charitable status</option>
            {CRA_OPTS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        <div className={css.compSection}>
          <span className={css.secLabel}>Ontario vs. federal - key differences</span>
          <div className={css.compGrid}>
            <div className={css.compCol}>
              <div className={css.compColHead}>Ontario (ONCA)</div>
              <div className={css.compColText}>
                Governed by Ontario courts - simpler compliance for Ontario-based land - member
                bylaws and articles filed with Ontario government - standard choice for Ontario
                communities
              </div>
            </div>
            <div className={css.compCol}>
              <div className={css.compColHead}>Federal (CNCA)</div>
              <div className={css.compColText}>
                Operates across all provinces - more complex compliance - useful if community plans
                to hold assets in multiple provinces - rarely needed for single-site IC projects
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // P3 -- ENTITY DECISION RECORD (c2): entity select + 3 rationale textareas
  // + shura vote block. why/enables/constrains are the model fields (encoded);
  // entity select and shura vote are stored as extra FormValue keys.
  // ---------------------------------------------------------------------------
  if (model.kind === 'entityDecisionRecord') {
    const entitySelected = typeof value.ratEntitySel === 'string' ? value.ratEntitySel : '';
    const shuraH = typeof value.shuraH === 'string' ? value.shuraH : '';
    const shuraF = typeof value.shuraF === 'string' ? value.shuraF : '';
    const shuraA = typeof value.shuraA === 'string' ? value.shuraA : '';
    const shuraD = typeof value.shuraD === 'string' ? value.shuraD : '';

    // Preserve extra FormValue keys when emitting model changes.
    const emitRecord = (next: EntityDecisionRecordModel): void => {
      onChange({
        ...encodeLegalGovernance(next),
        ratEntitySel: entitySelected,
        shuraH,
        shuraF,
        shuraA,
        shuraD,
      });
    };
    const setExtra = (patch: Partial<Record<string, string>>): void => {
      onChange({
        ...encodeLegalGovernance(model),
        ratEntitySel: patch.ratEntitySel ?? entitySelected,
        shuraH: patch.shuraH ?? shuraH,
        shuraF: patch.shuraF ?? shuraF,
        shuraA: patch.shuraA ?? shuraA,
        shuraD: patch.shuraD ?? shuraD,
      });
    };

    return (
      <div className={css.root} data-lg-mode="entityDecisionRecord">
        <div className={css.field}>
          <span className={css.qLabel}>Entity structure selected</span>
          <select
            className={css.sel}
            data-testid="entity-select"
            aria-label="Entity structure selected"
            value={entitySelected}
            onChange={(e) => setExtra({ ratEntitySel: e.target.value })}
          >
            <option value="">Select entity</option>
            {ENTITY_SELECT_OPTS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        <span className={css.secLabel}>Rationale</span>
        <div className={css.field}>
          <span className={css.qLabel}>Primary reason - land permanence</span>
          <textarea
            className={css.notesTa}
            data-testid="rat-why"
            aria-label="Primary reason for land permanence"
            value={model.why}
            placeholder="Why this entity best protects permanent land dedication..."
            onChange={(e) => emitRecord({ ...model, why: e.target.value })}
          />
        </div>
        <div className={css.field}>
          <span className={css.qLabel}>Primary reason - Islamic compatibility</span>
          <textarea
            className={css.notesTa}
            data-testid="rat-enables"
            aria-label="Primary reason for Islamic compatibility"
            value={model.enables}
            placeholder="How this structure aligns with Islamic principles..."
            onChange={(e) => emitRecord({ ...model, enables: e.target.value })}
          />
        </div>
        <div className={css.field}>
          <span className={css.qLabel}>Alternatives considered and why rejected</span>
          <textarea
            className={css.notesTa}
            data-testid="rat-constrains"
            aria-label="Alternatives considered and why rejected"
            value={model.constrains}
            placeholder="Other options evaluated and their shortfalls..."
            onChange={(e) => emitRecord({ ...model, constrains: e.target.value })}
          />
        </div>
        <div className={css.shuraVote}>
          <div className={css.svTitle}>Shura vote outcome</div>
          <div className={css.svRow}>
            <span className={css.svLabel}>Households voting</span>
            <input
              type="number"
              className={css.svInput}
              aria-label="Households voting"
              value={shuraH}
              onChange={(e) => setExtra({ shuraH: e.target.value })}
            />
          </div>
          <div className={css.svRow}>
            <span className={css.svLabel}>In favour</span>
            <input
              type="number"
              className={css.svInput}
              aria-label="Households in favour"
              value={shuraF}
              onChange={(e) => setExtra({ shuraF: e.target.value })}
            />
          </div>
          <div className={css.svRow}>
            <span className={css.svLabel}>Abstentions</span>
            <input
              type="number"
              className={css.svInput}
              aria-label="Abstentions"
              value={shuraA}
              onChange={(e) => setExtra({ shuraA: e.target.value })}
            />
          </div>
          <div className={css.svRow}>
            <span className={css.svLabel}>Date of vote</span>
            <input
              type="text"
              className={css.svInput}
              aria-label="Date of vote"
              value={shuraD}
              placeholder="DD/MM/YY"
              onChange={(e) => setExtra({ shuraD: e.target.value })}
            />
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // P4 -- TENURE MODEL (c3): 3 radio-style option cards + Waqf amanah note.
  // ---------------------------------------------------------------------------
  if (model.kind === 'tenureModel') {
    return (
      <div className={css.root} data-lg-mode="tenureModel">
        <span className={css.secLabel}>Select the tenure structure</span>
        <div className={css.tenureOpts}>
          {TENURE_OPTS.map((t) => {
            const isSel = model.tenure === t.id;
            const badgeClass = css[t.badgeClass];
            return (
              <div
                key={t.id}
                className={css.tenureOpt}
                data-selected={isSel ? 'true' : 'false'}
                data-testid={`tenure-${t.id}`}
                role="radio"
                tabIndex={0}
                aria-checked={isSel}
                onClick={() => emit({ ...model, tenure: t.id })}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' || ev.key === ' ') emit({ ...model, tenure: t.id });
                }}
              >
                <div className={css.toHead}>
                  <span className={css.toName}>{t.name}</span>
                  <span className={`${css.toBadge} ${badgeClass}`}>{t.badge}</span>
                </div>
                <p className={css.toDesc}>{t.desc}</p>
              </div>
            );
          })}
        </div>
        <div className={css.waqfNote}>
          The concept of Waqf - land dedicated permanently for Allah&apos;s sake and the
          community&apos;s benefit - is the Islamic jurisprudential anchor for this decision.
          &quot;The Messenger of Allah said: When a man dies, his deeds come to an end except for
          three: a continuing charity (sadaqah jariyah)...&quot; (Muslim 1631). Land held in Waqf is
          the original continuing charity of Islamic civilization.
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // P5 -- DECISION FRAMEWORK (c4): Quran intro + 3 fixed tiers + spending
  // authority select. framework is always 'three-tier-shura' (defaulted in
  // decode); quorum stores the spending authority threshold.
  // ---------------------------------------------------------------------------
  if (model.kind === 'decisionFramework') {
    return (
      <div className={css.root} data-lg-mode="decisionFramework">
        <div className={css.shuraIntro}>
          <div className={css.siQr}>
            &quot;And those who conduct their affairs by mutual consultation [shura]&quot; -
            Ash-Shura 42:38 &middot; &quot;Consult them in the matter&quot; - Aal-Imran 3:159
          </div>
          <div className={css.siRef}>
            Shura is the governing principle - the tiers below determine when consultation is
            required of the few vs. the many, not whether it is required at all.
          </div>
        </div>
        <div className={css.tiers}>
          {TIERS.map((t) => (
            <div key={t.level} className={css.tier}>
              <div className={css.tierHead}>
                <span className={`${css.tierLevel} ${css[t.levelClass]}`}>{t.level}</span>
                <span className={css.tierTitle}>{t.title}</span>
              </div>
              <div className={css.tierBody}>
                {t.body}
                <div className={css.tierExamples}>
                  {t.examples.map((ex) => (
                    <span key={ex} className={css.tierExample}>
                      {ex}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className={css.field}>
          <span className={css.qLabel}>
            Decision threshold - spending authority before committee required
          </span>
          <select
            className={css.sel}
            data-testid="framework-quorum"
            aria-label="Spending authority threshold"
            value={model.quorum}
            onChange={(e) => emit({ ...model, quorum: e.target.value })}
          >
            <option value="">Select spending threshold</option>
            {SPENDING_OPTS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // P6 -- FINANCIAL GOVERNANCE (c5): display-only rule cards + riba note.
  // banking is auto-set via useEffect above; panel is always record-ready once
  // banking is non-empty. No user input on this panel.
  // ---------------------------------------------------------------------------
  if (model.kind === 'financialGovernance') {
    return (
      <div className={css.root} data-lg-mode="financialGovernance">
        <div className={css.finRules}>
          {FIN_RULES.map((r) => (
            <div key={r.title} className={css.finRule}>
              <span className={css.frIcon} style={{ color: r.iconColor }}>
                &#9632;
              </span>
              <div className={css.frBody}>
                <div className={css.frTitle}>{r.title}</div>
                <div className={css.frDetail}>{r.detail}</div>
              </div>
            </div>
          ))}
        </div>
        <div className={css.ribaNote}>
          Riba avoidance: no interest-bearing bank accounts, no conventional overdraft or credit
          facilities, no interest-bearing loans. If capital is needed beyond reserves, explore
          Islamic financing structures (murabaha, ijarah) or community Waqf fundraising before any
          conventional borrowing.
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // P7 -- MEMBERSHIP REGISTER (c6): display-only rights + obligations + exit
  // note. Always valid (zero is recordable).
  // ---------------------------------------------------------------------------
  if (model.kind === 'membershipRegister') {
    return (
      <div className={css.root} data-lg-mode="membershipRegister">
        <div className={css.memberSections}>
          <div className={css.memberSection}>
            <div className={`${css.msHead} ${css.msTitleR}`}>
              Membership rights - what being a member confers
            </div>
            {RIGHTS.map((r) => (
              <div key={r} className={css.msRow}>
                <div className={`${css.msDot} ${css.msDotR}`} />
                {r}
              </div>
            ))}
          </div>
          <div className={css.memberSection}>
            <div className={`${css.msHead} ${css.msTitleO}`}>
              Membership obligations - what being a member requires
            </div>
            {OBLIGATIONS.map((o) => (
              <div key={o} className={css.msRow}>
                <div className={`${css.msDot} ${css.msDotO}`} />
                {o}
              </div>
            ))}
          </div>
        </div>
        <div className={css.exitNote}>
          Exit terms: returning household receives their initial capital contribution adjusted for
          inflation (CPI), minus any outstanding obligations, minus any community-agreed improvement
          costs. No land value appreciation is returned - the land belongs to the Waqf, not to
          individual households. Households that leave do not leave with a profit from land
          speculation.
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // P8 -- LEGAL ADVICE GATE (c7): 6 checkboxes + adviser fields.
  // All 6 must be in adviceScope for isLegalGovernanceValid. adviceWritten and
  // adviceDate are preserved in model for round-trip but not checked by validity.
  // Adviser fields (firm, name, date, nature) are stored as extra FormValue keys.
  // ---------------------------------------------------------------------------
  if (model.kind === 'legalAdviceGate') {
    const advFirm = typeof value.advFirm === 'string' ? value.advFirm : '';
    const advName = typeof value.advName === 'string' ? value.advName : '';
    const advDate = typeof value.advDate === 'string' ? value.advDate : '';
    const advNature = typeof value.advNature === 'string' ? value.advNature : '';

    // Preserve adviser fields when emitting adviceScope changes.
    const emitGate = (next: LegalAdviceGateModel): void => {
      onChange({
        ...encodeLegalGovernance(next),
        advFirm,
        advName,
        advDate,
        advNature,
      });
    };
    const setAdviser = (patch: Partial<Record<string, string>>): void => {
      onChange({
        ...encodeLegalGovernance(model),
        advFirm: patch.advFirm ?? advFirm,
        advName: patch.advName ?? advName,
        advDate: patch.advDate ?? advDate,
        advNature: patch.advNature ?? advNature,
      });
    };
    const toggleScope = (id: string): void => {
      const next = model.adviceScope.includes(id)
        ? model.adviceScope.filter((x) => x !== id)
        : [...model.adviceScope, id];
      emitGate({ ...model, adviceScope: next });
    };

    const confirmed = model.adviceScope.length;
    const total = GATE_ITEMS.length;
    const allDone = confirmed >= total;

    return (
      <div className={css.root} data-lg-mode="legalAdviceGate">
        <div className={css.gateIntro}>
          This gate exists because the decisions made in this objective have binding legal and
          financial consequences for the community and its members. Proceeding without legal counsel
          is a governance risk that OLOS does not permit.
        </div>
        <span className={css.secLabel}>Confirm each item has been reviewed by legal counsel</span>
        <div className={css.gateChecks}>
          {GATE_ITEMS.map((g) => {
            const isChecked = model.adviceScope.includes(g.id);
            return (
              <div
                key={g.id}
                className={css.gateCheck}
                data-checked={isChecked ? 'true' : 'false'}
                data-testid={`gate-check-${g.id}`}
                role="checkbox"
                tabIndex={0}
                aria-checked={isChecked}
                onClick={() => toggleScope(g.id)}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' || ev.key === ' ') toggleScope(g.id);
                }}
              >
                <div className={css.gcBox} />
                <span className={css.gcText}>{g.label}</span>
              </div>
            );
          })}
        </div>
        <div className={allDone ? css.gateProgressDone : css.gateProgress}>
          {confirmed} / {total} items confirmed
        </div>
        <div className={css.adviserSection}>
          <span className={css.afLabel}>Legal adviser details</span>
          <input
            type="text"
            className={css.afInput}
            data-testid="adv-firm"
            aria-label="Law firm name"
            value={advFirm}
            placeholder="Firm name..."
            onChange={(e) => setAdviser({ advFirm: e.target.value })}
          />
          <input
            type="text"
            className={css.afInput}
            data-testid="adv-name"
            aria-label="Adviser name and call to bar"
            value={advName}
            placeholder="Adviser name and call to the bar..."
            onChange={(e) => setAdviser({ advName: e.target.value })}
          />
          <input
            type="text"
            className={css.afInput}
            data-testid="adv-date"
            aria-label="Date advice received"
            value={advDate}
            placeholder="Date advice received (DD/MM/YYYY)..."
            onChange={(e) => setAdviser({ advDate: e.target.value })}
          />
          <input
            type="text"
            className={css.afInput}
            data-testid="adv-nature"
            aria-label="Nature of advice"
            value={advNature}
            placeholder="Nature of advice - general guidance / formal opinion..."
            onChange={(e) => setAdviser({ advNature: e.target.value })}
          />
        </div>
      </div>
    );
  }

  // unreachable: every LegalGovernanceMode has a branch above.
  return (
    <div className={css.root} data-lg-mode={(model as LegalGovernanceModel).kind} />
  );
}
