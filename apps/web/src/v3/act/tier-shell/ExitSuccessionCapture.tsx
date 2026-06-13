/* ExitSuccessionCapture.tsx
 *
 * Act-stage workbench third-column capture for the objective
 *   ev-s7-exit-succession (ref EV-S7.8 -- "A sound member exit & land
 *   succession protocol"), Ecovillage primary type, Stratum 7 (Phasing &
 *   Resourcing). Ported verbatim from the operator-supplied mockup
 *   Downloads/olos_exit_succession_act.html (panels p1..p5).
 *
 * Five modes, one per checklist item c1..c5:
 *   c1 exitProcess      -- 3 staged select groups (notice / settlement / payment)
 *   c2 dwellingTransfer -- pricing-model radio + transfer-mechanics selects
 *   c3 landReversion    -- tenure / reversion selects + agricultural contributions
 *   c4 dissolution      -- trigger / asset / liability selects + warning box
 *   c5 legalReview      -- 6 review-scope toggles + 4 selects
 *
 * Pure / controlled / no store / no projectId: decode(value) every render,
 * emit onChange(encode(next)). decode is TOTAL and defensive -- it never
 * throws and seeds only the mockup's recommended <option selected> defaults
 * (operator choices, not fabricated registry data). Panel chrome
 * (header / feeds banner / gate / footer) is owned by DecisionWorkingPanel;
 * this component renders ONLY the mode body. ASCII-only (em-dash -> " -- ",
 * middot -> " - ").
 *
 * Amanah note: the finance / asset-transfer copy here (buy-in settlement, CLT
 * resale formula, dissolution distribution) was pre-cleared by the operator
 * for verbatim transcription -- same co-owner cost-sharing domain as
 * ev-s1-provision-balance, no salam / advance-sale / CSRA framing present. The
 * objective already carries a scopeNote; copy is transcribed, never reworded.
 */

import * as React from 'react';
import { ArrowRight, AlertTriangle, Coins, FileText } from 'lucide-react';
import type { FormValue } from './actToolCatalog.js';
import css from './ExitSuccessionCapture.module.css';

/* ------------------------------------------------------------------ */
/* Mode mapping                                                        */
/* ------------------------------------------------------------------ */

export type ExitSuccessionMode =
  | 'exitProcess'
  | 'dwellingTransfer'
  | 'landReversion'
  | 'dissolution'
  | 'legalReview';

const ITEM_PREFIX = 'ev-s7-exit-succession-';

export function exitSuccessionModeFor(itemId: string): ExitSuccessionMode | null {
  if (!itemId.startsWith(ITEM_PREFIX)) return null;
  switch (itemId.slice(ITEM_PREFIX.length)) {
    case 'c1':
      return 'exitProcess';
    case 'c2':
      return 'dwellingTransfer';
    case 'c3':
      return 'landReversion';
    case 'c4':
      return 'dissolution';
    case 'c5':
      return 'legalReview';
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* Static mode configuration (verbatim mockup copy)                   */
/* ------------------------------------------------------------------ */

interface SelectRow {
  key: string;
  label: string;
  options: string[];
}

interface ExitStage {
  num: 1 | 2 | 3;
  title: string;
  timing: string;
  rows: SelectRow[];
}

interface PricingModel {
  key: string;
  title: string;
  desc: string;
  use: string;
}

interface DissolutionItem {
  icon: 'alert' | 'coin' | 'file';
  name: string;
  rows: SelectRow[];
}

// Exported so the community work-plan adapter (communityWorkInputs) can feed
// the legalReview toggles (key + name as label) to the generator's
// exit-succession source without replicating the roster. Additive export only.
export interface LegalToggle {
  key: string;
  name: string;
  desc: string;
  defaultOn: boolean;
}

const EXIT_STAGES: ExitStage[] = [
  {
    num: 1,
    title: 'Notice of intent to exit',
    timing: 'Written notice required',
    rows: [
      {
        key: 'noticePeriod',
        label: 'Notice period',
        options: [
          '6 months -- allows community to find replacement household',
          '3 months',
          '12 months',
        ],
      },
      {
        key: 'noticeDeliveredTo',
        label: 'Notice delivered to',
        options: [
          'Spokesperson -- written, to all founding members within 5 days',
          'Community meeting',
        ],
      },
      {
        key: 'emergencyExit',
        label: 'Emergency exit (welfare reason)',
        options: [
          'Notice period waived -- community works in good faith on settlement',
          'Minimum 1 month even in emergency',
        ],
      },
    ],
  },
  {
    num: 2,
    title: 'Financial settlement calculation',
    timing: 'During notice period',
    rows: [
      {
        key: 'buyInBasis',
        label: 'Buy-in return basis',
        options: [
          'Buy-in paid minus outstanding levies and obligations',
          'Full buy-in returned -- obligations waived',
          'CLT resale formula -- dwelling improvement value added',
        ],
      },
      {
        key: 'improvementsCredited',
        label: 'Dwelling improvements -- credited?',
        options: [
          'Yes -- approved improvements credited at cost, not market value',
          'No -- improvements remain with dwelling for community benefit',
        ],
      },
      {
        key: 'outstandingObligations',
        label: 'Outstanding obligations',
        options: [
          'Levy arrears, outstanding maintenance obligations, active commitments',
          'Levy arrears only',
        ],
      },
      {
        key: 'settlementVerification',
        label: 'Settlement verification',
        options: [
          'Legal advisor confirms calculation before payment',
          'Treasurer and spokesperson confirm',
        ],
      },
    ],
  },
  {
    num: 3,
    title: 'Settlement payment',
    timing: 'At or before departure date',
    rows: [
      {
        key: 'paymentTiming',
        label: 'Payment timing',
        options: [
          'On confirmed departure date -- simultaneous with dwelling handover',
          'Within 30 days of departure',
        ],
      },
      {
        key: 'ifCannotPay',
        label: 'If community cannot pay immediately',
        options: [
          'Payment plan agreed -- max 12 months, no interest',
          'Defer until replacement household buys in',
        ],
      },
    ],
  },
];

const PRICING_MODELS: PricingModel[] = [
  {
    key: 'clt',
    title: 'CLT resale formula -- community-controlled price',
    desc: 'Resale price = original buy-in + approved improvements at cost + inflation index. Community controls affordability -- no market speculation on communal land.',
    use: 'Recommended for Kinfolk Ridge. Consistent with CLT / co-operative land holding model.',
  },
  {
    key: 'market',
    title: 'Market value -- independent appraisal',
    desc: 'Dwelling appraised at current market value. Exiting household receives market price. Risk: prices may rise beyond reach of incoming households.',
    use: 'More generous to exiting household. May price out future community members.',
  },
  {
    key: 'buyin',
    title: 'Buy-in return only -- dwelling transfers at no additional cost',
    desc: 'Exiting household receives buy-in return only. Dwelling improvements transfer to community at no cost to incoming household.',
    use: "Simplest. Loses the exiting household's improvement investment -- may deter investment in dwellings.",
  },
];

const PRICING_SHORT: Record<string, string> = {
  clt: 'CLT resale formula',
  market: 'Market value',
  buyin: 'Buy-in return only',
};

const TRANSFER_MECHANICS: SelectRow[] = [
  {
    key: 'whoBuys',
    label: 'Who can buy the dwelling',
    options: [
      'Community identifies replacement -- new household must meet membership criteria',
      'Exiting household can propose buyer -- community approves',
      'Open to any approved applicant',
    ],
  },
  {
    key: 'transferMethod',
    label: 'Transfer method',
    options: [
      'Assignment of long-term lease agreement -- legal advisor manages',
      'New community membership agreement + buy-in from incoming household',
    ],
  },
  {
    key: 'ifNoReplacement',
    label: 'If no replacement found within notice period',
    options: [
      'Notice period extended -- max 6 additional months',
      'Community pays out from capital reserve',
    ],
  },
  {
    key: 'dwellingCondition',
    label: 'Dwelling condition at transfer',
    options: [
      'Exiting household returns dwelling to agreed base condition',
      'As-is -- incoming household accepts current condition',
    ],
  },
];

const REVERSION_ROWS: SelectRow[] = [
  {
    key: 'tenureModel',
    label: 'Land tenure model',
    options: [
      'CLT -- community land trust holds fee simple, household holds 99-year lease',
      'Co-operative -- shares represent occupancy rights, not land ownership',
      'Strata / freehold with conservation easement',
    ],
  },
  {
    key: 'revertTrigger',
    label: 'Land share reverts to community',
    options: [
      'On departure date -- automatically, per lease agreement',
      'On settlement payment completion',
    ],
  },
  {
    key: 'noticeRights',
    label: 'Exiting household rights during notice period',
    options: [
      'Full occupancy rights continue -- all systems access maintained',
      'Reduced rights -- advisory role only',
    ],
  },
  {
    key: 'privateZone',
    label: 'Private zone (dwelling area) boundary',
    options: [
      'Dwelling footprint + private garden -- per site plan on file',
      'Defined per household at move-in',
    ],
  },
  {
    key: 'communalAccess',
    label: 'Communal zone access -- post-departure',
    options: [
      'No access after departure date',
      'Guest access -- 30 days post-departure only',
    ],
  },
];

const REVERSION_AG_ROWS: SelectRow[] = [
  {
    key: 'perennials',
    label: 'Perennial plantings made by exiting household',
    options: [
      'Remain with the land -- benefit the community',
      'Valued and credited in settlement',
    ],
  },
  {
    key: 'seedSaving',
    label: 'Seed saving contributions',
    options: [
      'Remain with community seed library',
      'Household may take proportional share',
    ],
  },
  {
    key: 'activeProduction',
    label: 'Active food production at departure',
    options: [
      'Communal zones transfer to community immediately - private plot -- harvest season transition',
      'Immediate transfer of all zones',
    ],
  },
];

const DISSOLUTION_ITEMS: DissolutionItem[] = [
  {
    icon: 'alert',
    name: 'Trigger for dissolution consideration',
    rows: [
      {
        key: 'proposedBy',
        label: 'Dissolution can be proposed by',
        options: [
          'Any founding member -- formal written request',
          'Unanimous founding members only',
        ],
      },
      {
        key: 'decisionRequires',
        label: 'Decision to dissolve requires',
        options: [
          'Unanimous agreement of all current full members',
          'Supermajority (75%) vote',
        ],
      },
      {
        key: 'mediation',
        label: 'Mediation required before dissolution vote?',
        options: [
          'Yes -- external mediator attempted first',
          'No -- unanimous consent sufficient',
        ],
      },
    ],
  },
  {
    icon: 'coin',
    name: 'Asset distribution on dissolution',
    rows: [
      {
        key: 'landDisposition',
        label: 'Land disposition',
        options: [
          'CLT retains land -- cannot be distributed to individuals',
          'Sold -- proceeds distributed per buy-in proportion',
        ],
      },
      {
        key: 'dwellingValue',
        label: 'Dwelling value distribution',
        options: [
          'Each household receives CLT formula value of their dwelling',
          'Market value -- independent appraisal',
        ],
      },
      {
        key: 'communalAssets',
        label: 'Communal assets (equipment, vehicles, tools)',
        options: [
          'Sold -- proceeds distributed per buy-in proportion',
          'Members purchase at agreed valuation',
        ],
      },
      {
        key: 'capitalReserve',
        label: 'Capital reserve fund',
        options: [
          'Distributed per buy-in proportion after outstanding obligations settled',
          'Retained by CLT entity',
        ],
      },
    ],
  },
  {
    icon: 'file',
    name: 'Liabilities on dissolution',
    rows: [
      {
        key: 'mortgages',
        label: 'Outstanding mortgages or loans',
        options: [
          'Settled from asset sale proceeds before any distribution',
          'Pro-rated across member buy-in proportions',
        ],
      },
      {
        key: 'planningObligations',
        label: 'Planning obligations (conditions, covenants)',
        options: [
          'Legal advisor manages transfer or discharge -- all members responsible',
          'Landowner assumes all obligations',
        ],
      },
    ],
  },
];

export const LEGAL_TOGGLES: LegalToggle[] = [
  {
    key: 'exitEnforceable',
    name: 'Exit process -- notice period and settlement calculation are legally enforceable',
    desc: "Confirms the settlement formula is legally sound and won't create future disputes",
    defaultOn: true,
  },
  {
    key: 'resaleEmbedded',
    name: 'CLT resale formula embedded in lease agreement and governing documents',
    desc: 'Confirms the pricing model is documented and binding on all future transactions',
    defaultOn: true,
  },
  {
    key: 'reversionDocumented',
    name: 'Land reversion provisions in lease agreement -- automatic on departure',
    desc: 'Confirms the CLT retains fee simple and lease terminates as specified',
    defaultOn: true,
  },
  {
    key: 'dissolutionValid',
    name: 'Dissolution provisions in CLT constitution -- consistent with Ontario law',
    desc: 'Confirms the dissolution process is legally valid and will withstand a contested dissolution',
    defaultOn: true,
  },
  {
    key: 'membersSigned',
    name: 'All founding members have read, understood, and signed acknowledgement',
    desc: 'Signed record filed with legal advisor -- confirms no household signed without understanding',
    defaultOn: true,
  },
  {
    key: 'planningCompatible',
    name: 'Planning consent compatibility -- no covenant contradicts exit or transfer provisions',
    desc: 'Confirms the exit process is compatible with any planning conditions attached to the land',
    defaultOn: false,
  },
];

const LEGAL_SELECTS: SelectRow[] = [
  {
    key: 'advisor',
    label: 'Legal advisor',
    options: [
      'Same advisor as CLT registration -- continuity of knowledge',
      'Independent advisor for exit review',
    ],
  },
  {
    key: 'reviewBefore',
    label: 'Review completed before',
    options: [
      'Any founding household moves on-site -- hard gate',
      'Land purchase completion',
    ],
  },
  {
    key: 'whoSigns',
    label: 'All members sign acknowledgement?',
    options: [
      'Yes -- all founding household members (18+) sign',
      'Household representative signs',
    ],
  },
  {
    key: 'filedWith',
    label: 'Legal opinion filed with',
    options: [
      'Legal advisor + community shared drive + OLOS record',
      'Legal advisor only',
    ],
  },
];

const FEEDS_HTML: Record<ExitSuccessionMode, React.ReactNode> = {
  exitProcess: (
    <>
      Exit process feeds <strong>financial hardship protocol Tier 3</strong> in the financial
      contribution model -- they must use the same settlement calculation. Both documents must be
      consistent before legal review.
    </>
  ),
  dwellingTransfer: (
    <>
      Dwelling transfer process feeds the <strong>legal entity constitution</strong> -- the CLT
      resale formula must be embedded in the entity&apos;s governing documents before any household
      moves in.
    </>
  ),
  landReversion: (
    <>
      Land reversion terms must be reflected in the <strong>CLT lease agreement</strong> -- which is
      part of the legal review required in decision 5. The terms here feed the lease document
      directly.
    </>
  ),
  dissolution: (
    <>
      Dissolution provisions feed the <strong>legal entity constitution</strong> -- they must be
      embedded in the CLT governing documents and reviewed by the legal advisor in decision 5.
    </>
  ),
  legalReview: (
    <>
      Legal review completes the exit &amp; succession protocol and feeds the{' '}
      <strong>Phase 1 habitability checklist</strong> -- legal review confirmation is a required item
      on the arrival sign-off sheet.
    </>
  ),
};

/* ------------------------------------------------------------------ */
/* FormValue coercion helpers                                         */
/* ------------------------------------------------------------------ */

function asArr(v: string | string[] | undefined): string[] {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string' && v.length > 0) return [v];
  return [];
}

/** Row keys (with their default value) for a given mode, in render order. */
function rowDefaults(mode: ExitSuccessionMode): Record<string, string> {
  const out: Record<string, string> = {};
  switch (mode) {
    case 'exitProcess':
      for (const stage of EXIT_STAGES) {
        for (const row of stage.rows) out[row.key] = row.options[0] ?? '';
      }
      break;
    case 'dwellingTransfer':
      out.pricingModel = 'clt';
      for (const row of TRANSFER_MECHANICS) out[row.key] = row.options[0] ?? '';
      break;
    case 'landReversion':
      for (const row of [...REVERSION_ROWS, ...REVERSION_AG_ROWS]) out[row.key] = row.options[0] ?? '';
      break;
    case 'dissolution':
      for (const item of DISSOLUTION_ITEMS) {
        for (const row of item.rows) out[row.key] = row.options[0] ?? '';
      }
      break;
    case 'legalReview':
      for (const t of LEGAL_TOGGLES) out[t.key] = t.defaultOn ? 'on' : 'off';
      for (const row of LEGAL_SELECTS) out[row.key] = row.options[0] ?? '';
      break;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Model                                                              */
/* ------------------------------------------------------------------ */

export interface ExitSuccessionModel {
  mode: ExitSuccessionMode;
  choices: Record<string, string>;
}

/**
 * TOTAL / defensive decode. Reconstructs the per-row choice map from the flat
 * `esChoices` list (entries shaped `rowKey::value`), falling back to the
 * mockup's recommended default for any row the operator has not yet touched.
 * Never throws; unknown stored keys are ignored.
 */
export function decodeExitSuccession(mode: ExitSuccessionMode, value: FormValue): ExitSuccessionModel {
  const defaults = rowDefaults(mode);
  const choices: Record<string, string> = { ...defaults };
  for (const entry of asArr(value?.esChoices)) {
    const idx = entry.indexOf('::');
    if (idx < 0) continue;
    const key = entry.slice(0, idx);
    const val = entry.slice(idx + 2);
    if (key in defaults) choices[key] = val;
  }
  return { mode, choices };
}

export function encodeExitSuccession(model: ExitSuccessionModel): FormValue {
  const esChoices = Object.keys(model.choices).map((k) => `${k}::${model.choices[k]}`);
  return { esChoices };
}

/**
 * Every mode is record-ready by default -- the mockup seeds a recommended
 * option for every select / toggle and shows a green "ready to record" footer
 * on each panel. The gate is advisory, mirroring that behaviour.
 */
export function isExitSuccessionValid(mode: ExitSuccessionMode, value: FormValue): boolean {
  const model = decodeExitSuccession(mode, value);
  // A faithful, non-fabricating gate: at least the recommended defaults are
  // present for every row (decode guarantees this), so the protocol can always
  // be recorded once the operator has reviewed it.
  return Object.keys(model.choices).length > 0;
}

function firstClause(s: string): string {
  const head = s.split(' -- ')[0] ?? s;
  return (head.split(' - ')[0] ?? head).trim();
}

export function summariseExitSuccession(mode: ExitSuccessionMode, value: FormValue): string {
  const { choices } = decodeExitSuccession(mode, value);
  switch (mode) {
    case 'exitProcess':
      return `Exit process: ${firstClause(choices.noticePeriod ?? '')} notice`;
    case 'dwellingTransfer':
      return `${PRICING_SHORT[choices.pricingModel ?? ''] ?? 'Pricing model'} transfer`;
    case 'landReversion':
      return `Land reverts: ${firstClause(choices.revertTrigger ?? '')}`;
    case 'dissolution':
      return `Dissolution: ${firstClause(choices.decisionRequires ?? '')}`;
    case 'legalReview': {
      const on = LEGAL_TOGGLES.filter((t) => choices[t.key] === 'on').length;
      return `${on} / ${LEGAL_TOGGLES.length} review items confirmed`;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export interface ExitSuccessionCaptureProps {
  mode: ExitSuccessionMode;
  value: FormValue;
  onChange: (next: FormValue) => void;
}

const STAGE_NUM_CLASS = [css.stageNum1, css.stageNum2, css.stageNum3];

export function ExitSuccessionCapture({
  mode,
  value,
  onChange,
}: ExitSuccessionCaptureProps): React.JSX.Element {
  const model = decodeExitSuccession(mode, value);
  const { choices } = model;

  const set = (key: string, val: string): void => {
    onChange(encodeExitSuccession({ mode, choices: { ...choices, [key]: val } }));
  };

  const renderSelect = (row: SelectRow): React.JSX.Element => (
    <div key={row.key} className={css.row}>
      <span className={css.rowLbl}>{row.label}</span>
      <select
        className={css.select}
        data-testid={`es-select-${row.key}`}
        value={choices[row.key] ?? row.options[0]}
        onChange={(e) => set(row.key, e.target.value)}
      >
        {row.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );

  const renderStageRow = (row: SelectRow): React.JSX.Element => (
    <div key={row.key} className={css.stageRow}>
      <span className={css.stageRowLbl}>{row.label}</span>
      <select
        className={css.select}
        data-testid={`es-select-${row.key}`}
        value={choices[row.key] ?? row.options[0]}
        onChange={(e) => set(row.key, e.target.value)}
      >
        {row.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );

  const feeds = (
    <div className={css.feedsBlock}>
      <ArrowRight size={13} className={css.feedsIcon} aria-hidden />
      <div className={css.feedsTxt}>{FEEDS_HTML[mode]}</div>
    </div>
  );

  if (mode === 'exitProcess') {
    return (
      <div className={css.root} data-testid="exit-succession-exitProcess">
        {EXIT_STAGES.map((stage) => (
          <div key={stage.num} className={css.stage}>
            <div className={css.stageHead}>
              <div className={`${css.stageNum} ${STAGE_NUM_CLASS[stage.num - 1]}`}>{stage.num}</div>
              <span className={css.stageTitle}>{stage.title}</span>
              <span className={css.stageTiming}>{stage.timing}</span>
            </div>
            <div className={css.stageRows}>{stage.rows.map(renderStageRow)}</div>
          </div>
        ))}
        {feeds}
      </div>
    );
  }

  if (mode === 'dwellingTransfer') {
    const selected = choices.pricingModel ?? 'clt';
    return (
      <div className={css.root} data-testid="exit-succession-dwellingTransfer">
        <div>
          <div className={css.secLbl}>Transfer pricing model</div>
          <div className={css.pricingList}>
            {PRICING_MODELS.map((pm) => (
              <button
                key={pm.key}
                type="button"
                className={css.pricingCard}
                data-on={selected === pm.key}
                data-testid={`es-pricing-${pm.key}`}
                onClick={() => set('pricingModel', pm.key)}
              >
                <div className={css.pmHead}>
                  <span className={css.pmDot} />
                  <span className={css.pmTitle}>{pm.title}</span>
                </div>
                <div className={css.pmDesc}>{pm.desc}</div>
                <div className={css.pmUse}>{pm.use}</div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className={css.secLbl}>Transfer mechanics</div>
          {TRANSFER_MECHANICS.map(renderSelect)}
        </div>
        {feeds}
      </div>
    );
  }

  if (mode === 'landReversion') {
    return (
      <div className={css.root} data-testid="exit-succession-landReversion">
        <div>{REVERSION_ROWS.map(renderSelect)}</div>
        <div>
          <div className={css.secLbl}>Agricultural and food system contributions</div>
          {REVERSION_AG_ROWS.map(renderSelect)}
        </div>
        {feeds}
      </div>
    );
  }

  if (mode === 'dissolution') {
    const Icon = { alert: AlertTriangle, coin: Coins, file: FileText };
    return (
      <div className={css.root} data-testid="exit-succession-dissolution">
        <div>
          {DISSOLUTION_ITEMS.map((item) => {
            const ItemIcon = Icon[item.icon];
            return (
              <div key={item.name} className={css.dissItem}>
                <div className={css.dissHead}>
                  <ItemIcon size={14} className={css.dissIcon} aria-hidden />
                  <span className={css.dissName}>{item.name}</span>
                </div>
                <div className={css.dissRows}>{item.rows.map(renderStageRow)}</div>
              </div>
            );
          })}
        </div>
        <div className={css.warningBox}>
          <strong>Define this before the community needs it.</strong> Dissolution provisions embedded
          in the CLT constitution are far simpler to implement than provisions invented during the
          dissolution itself. Legal advisor must review these provisions.
        </div>
        {feeds}
      </div>
    );
  }

  // legalReview
  return (
    <div className={css.root} data-testid="exit-succession-legalReview">
      <div>
        <div className={css.secLbl}>
          Legal review scope{' '}
          <span className={css.secOptional}>(tap to confirm included)</span>
        </div>
        <div className={css.legalList}>
          {LEGAL_TOGGLES.map((t) => {
            const on = choices[t.key] === 'on';
            return (
              <button
                key={t.key}
                type="button"
                className={css.legalCheck}
                data-on={on}
                data-testid={`es-toggle-${t.key}`}
                onClick={() => set(t.key, on ? 'off' : 'on')}
              >
                <span className={css.lcDot} />
                <div className={css.lcBody}>
                  <div className={css.lcName}>{t.name}</div>
                  <div className={css.lcDesc}>{t.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <div>{LEGAL_SELECTS.map(renderSelect)}</div>
      {feeds}
    </div>
  );
}
