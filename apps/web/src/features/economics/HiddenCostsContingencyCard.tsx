/**
 * §22 HiddenCostsContingencyCard — surfaces budget categories that
 * are systematically under-modeled in feature-by-feature cost
 * estimators, and recommends a project-specific contingency budget
 * derived from complexity signals.
 *
 * Complements SensitivityAnalysisCard:
 *   - SensitivityAnalysisCard answers "how does the headline shift if
 *     my assumptions are wrong by ±X%?" (perturbation of known levers)
 *   - HiddenCostsContingencyCard answers "what's not in the budget
 *     yet, and how much should I hold back for the unknowns?"
 *     (omission detection + contingency sizing)
 *
 * Together these two close §22 manifest item
 * `cost-sensitivity-hidden-costs-contingency` (P3 planned → done).
 *
 * HEURISTIC: hidden-cost percentages are industry rules of thumb
 * (CSI MasterFormat Division 1 norms, owner-builder budget studies)
 * not regional benchmarks; the contingency formula is a heuristic
 * complexity scorer, not a Monte-Carlo simulation. Decision-support
 * for the steward, not engineering certification.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { useUtilityStore } from '../../store/utilityStore.js';
import type { FinancialModel } from '../financial/engine/types.js';
import s from './HiddenCostsContingencyCard.module.css';

interface Props {
  project: LocalProject;
  model: FinancialModel;
}

type HiddenCostStatus = 'covered' | 'under-modeled' | 'missing';

interface HiddenCost {
  key: string;
  label: string;
  /** Typical percent of the relevant base, expressed 0..1. */
  pct: number;
  /** Which slice of the model the percentage applies to. */
  base: 'totalInvestment' | 'structures' | 'utilities';
  status: HiddenCostStatus;
  rationale: string;
  estimatedDollars: number;
}

interface ContingencyDriver {
  key: string;
  label: string;
  pct: number;
  active: boolean;
  why: string;
}

const BASE_PCT = 0.10;
const CAP_PCT = 0.30;

const STATUS_LABEL: Record<HiddenCostStatus, string> = {
  covered: 'Covered',
  'under-modeled': 'Under-modeled',
  missing: 'Not budgeted',
};

const STATUS_ROW_CLASS: Record<HiddenCostStatus, string> = {
  covered: s.row_covered!,
  'under-modeled': s.row_under!,
  missing: s.row_missing!,
};

const STATUS_TAG_CLASS: Record<HiddenCostStatus, string> = {
  covered: s.tag_covered!,
  'under-modeled': s.tag_under!,
  missing: s.tag_missing!,
};

function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000) return `$${(n / 1000).toFixed(0)}K`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

function categoryHasMatch(model: FinancialModel, needles: string[]): boolean {
  const lc = needles.map((n) => n.toLowerCase());
  return model.costLineItems.some((li) => {
    const cat = li.category.toLowerCase();
    const name = li.name.toLowerCase();
    return lc.some((needle) => cat.includes(needle) || name.includes(needle));
  });
}

function sumByCategory(model: FinancialModel, predicate: (cat: string) => boolean): number {
  return model.costLineItems
    .filter((li) => predicate(li.category.toLowerCase()))
    .reduce((acc, li) => acc + li.cost.mid, 0);
}

export default function HiddenCostsContingencyCard({ project, model }: Props) {
  const allStructures = useStructureStore((st) => st.structures);
  const structures = useMemo(
    () => allStructures.filter((sx) => sx.projectId === project.id),
    [allStructures, project.id],
  );
  const allUtilities = useUtilityStore((st) => st.utilities);
  const utilities = useMemo(
    () => allUtilities.filter((u) => u.projectId === project.id),
    [allUtilities, project.id],
  );

  const totalMid = model.totalInvestment.mid;
  const structuresMid = useMemo(
    () => sumByCategory(model, (c) => c.includes('structure') || c.includes('building')),
    [model],
  );
  const utilitiesMid = useMemo(
    () => sumByCategory(model, (c) => c.includes('utility') || c.includes('infrastructure') || c.includes('energy') || c.includes('water')),
    [model],
  );

  const hiddenCosts: HiddenCost[] = useMemo(() => {
    const list: HiddenCost[] = [];

    // 1. Permits & approvals — typically 5–10% of structures cost.
    {
      const pct = 0.08;
      const base = structuresMid > 0 ? structuresMid : totalMid;
      const status: HiddenCostStatus = categoryHasMatch(model, ['permit', 'approval', 'fee'])
        ? 'covered'
        : 'missing';
      list.push({
        key: 'permits',
        label: 'Permits & approvals',
        pct,
        base: 'structures',
        status,
        rationale:
          'Building, septic, well, and electrical permits, plus zoning approvals and inspection fees. Typically 5–10% of structures cost; varies by jurisdiction.',
        estimatedDollars: base * pct,
      });
    }

    // 2. Mobilization & contractor markup — bid-import territory.
    {
      const pct = 0.10;
      const status: HiddenCostStatus = categoryHasMatch(model, ['mobilization', 'markup', 'general conditions', 'overhead'])
        ? 'covered'
        : 'under-modeled';
      list.push({
        key: 'mobilization',
        label: 'Mobilization & contractor markup',
        pct,
        base: 'totalInvestment',
        status,
        rationale:
          'General conditions, contractor overhead and profit, equipment mobilization. Owner-builder estimators routinely omit this; a contractor-built project carries 8–15% on top.',
        estimatedDollars: totalMid * pct,
      });
    }

    // 3. Site prep / clearing / grading — often baked into structures, not always.
    {
      const pct = 0.05;
      const base = totalMid;
      const status: HiddenCostStatus = categoryHasMatch(model, ['site prep', 'clearing', 'grading', 'excavation'])
        ? 'covered'
        : 'under-modeled';
      list.push({
        key: 'site_prep',
        label: 'Site prep, clearing & grading',
        pct,
        base: 'totalInvestment',
        status,
        rationale:
          'Tree clearing, stump removal, rough grading, access road cuts. Heuristically 3–7% of total project cost; rises sharply on slopes >10° or wooded sites.',
        estimatedDollars: base * pct,
      });
    }

    // 4. Soft costs — design, survey, legal, project management.
    {
      const pct = 0.07;
      const status: HiddenCostStatus = categoryHasMatch(model, ['design', 'survey', 'legal', 'engineering', 'architect'])
        ? 'covered'
        : 'missing';
      list.push({
        key: 'soft_costs',
        label: 'Soft costs (design, survey, legal)',
        pct,
        base: 'totalInvestment',
        status,
        rationale:
          'Architectural / regenerative-design fees, land survey, legal review, project management. Typically 5–10% of total — separate from construction.',
        estimatedDollars: totalMid * pct,
      });
    }

    // 5. Utility hookups & well-drilling overruns — only relevant when those
    //    utilities exist on the plan.
    {
      const hasWell = utilities.some((u) => u.type === 'well_pump');
      const hasSolar = utilities.some((u) => u.type === 'solar_panel');
      if (hasWell || hasSolar) {
        const pct = 0.12;
        const base = utilitiesMid > 0 ? utilitiesMid : totalMid * 0.15;
        list.push({
          key: 'utility_overruns',
          label: 'Utility hookups & drilling variance',
          pct,
          base: 'utilities',
          status: 'under-modeled',
          rationale:
            'Well drilling depth and yield are unknown until drilled — overruns of 20–40% on pump/well budgets are common. Solar arrays carry inverter and interconnect surprises. Hold ~12% of utility cost as a buffer.',
          estimatedDollars: base * pct,
        });
      }
    }

    // 6. Inflation contingency for multi-year phasing.
    const phaseSpan = Math.max(0, model.cashflow.length - 1);
    if (phaseSpan >= 2) {
      const pct = Math.min(0.10, 0.03 * (phaseSpan - 1));
      list.push({
        key: 'inflation',
        label: `Inflation across ${phaseSpan + 1}-year phasing`,
        pct,
        base: 'totalInvestment',
        status: 'under-modeled',
        rationale: `Construction-cost inflation has averaged 3–5% per year recently. Multi-year phasing exposes later phases to compounding price drift.`,
        estimatedDollars: totalMid * pct,
      });
    }

    return list;
  }, [model, structuresMid, utilitiesMid, totalMid, utilities]);

  const drivers: ContingencyDriver[] = useMemo(() => {
    const wellOrSolar = utilities.some((u) => u.type === 'well_pump' || u.type === 'solar_panel');
    const manyStructures = structures.length >= 5;
    const longPhasing = model.cashflow.length >= 5;
    const lowConfidence = model.costLineItems.some((li) => li.confidence === 'low');
    // Region defaults to ca-ontario in the financial store; treat anything
    // else as a signal that regional cost calibration is less mature.
    const offDefaultRegion = model.region !== 'ca-ontario';

    return [
      {
        key: 'baseline',
        label: 'Baseline contingency',
        pct: 0.10,
        active: true,
        why: 'Industry baseline for design-stage estimates with placed features but no contractor bids yet.',
      },
      {
        key: 'wells_solar',
        label: 'Drilled / install-variable utilities present',
        pct: 0.05,
        active: wellOrSolar,
        why: 'Wells and solar arrays are the two largest single-line variance drivers in owner-builder projects.',
      },
      {
        key: 'many_structures',
        label: '5+ structures placed',
        pct: 0.05,
        active: manyStructures,
        why: 'Compounding scope: each additional structure introduces independent cost variance.',
      },
      {
        key: 'long_phasing',
        label: 'Multi-year phasing (5+ years of cashflow)',
        pct: 0.05,
        active: longPhasing,
        why: 'Long timelines compound inflation and shift suppliers / labor markets between phases.',
      },
      {
        key: 'low_confidence',
        label: 'Low-confidence cost lines present',
        pct: 0.05,
        active: lowConfidence,
        why: 'At least one cost line is flagged low-confidence in the benchmark database — additional buffer warranted.',
      },
      {
        key: 'off_region',
        label: 'Non-default region',
        pct: 0.05,
        active: offDefaultRegion,
        why: 'Regional cost database is most calibrated for Ontario; other regions inherit higher-uncertainty placeholders.',
      },
    ];
  }, [structures, utilities, model]);

  const recommendedPct = useMemo(() => {
    const raw = drivers.filter((d) => d.active).reduce((acc, d) => acc + d.pct, 0);
    return Math.min(CAP_PCT, raw);
  }, [drivers]);

  const recommendedDollars = totalMid * recommendedPct;
  const totalHiddenDollars = hiddenCosts.reduce((acc, h) => acc + h.estimatedDollars, 0);
  const adjustedTotal = totalMid + recommendedDollars + totalHiddenDollars;

  return (
    <div className={s.card}>
      <div className={s.cardHead}>
        <div>
          <h3 className={s.cardTitle}>Hidden Costs &amp; Contingency</h3>
          <p className={s.cardHint}>
            Categories systematically under-modeled in feature-by-feature
            estimators, plus a project-specific contingency budget derived
            from complexity signals. <em>Held alongside</em> ±20%/±50%
            sensitivity sliders, not in place of them.
          </p>
        </div>
        <span className={s.heuristicBadge}>HEURISTIC</span>
      </div>

      <div className={s.headlineRow}>
        <div className={s.headlineBlock}>
          <span className={s.headlineLabel}>Modeled total (mid)</span>
          <span className={s.headlineValue}>{formatUsd(totalMid)}</span>
        </div>
        <div className={s.headlineBlock}>
          <span className={s.headlineLabel}>+ Hidden cost estimates</span>
          <span className={s.headlineValue}>{formatUsd(totalHiddenDollars)}</span>
        </div>
        <div className={s.headlineBlock}>
          <span className={s.headlineLabel}>+ Contingency ({Math.round(recommendedPct * 100)}%)</span>
          <span className={s.headlineValue}>{formatUsd(recommendedDollars)}</span>
        </div>
        <div className={`${s.headlineBlock} ${s.headlineEmphasis}`}>
          <span className={s.headlineLabel}>Adjusted total</span>
          <span className={s.headlineValue}>{formatUsd(adjustedTotal)}</span>
        </div>
      </div>

      <div className={s.contingencyBar} role="img" aria-label={`Recommended contingency ${Math.round(recommendedPct * 100)} percent of total`}>
        <div className={s.contingencyFill} style={{ width: `${(recommendedPct / CAP_PCT) * 100}%` }} />
        <div className={s.contingencyMark} style={{ left: `${(BASE_PCT / CAP_PCT) * 100}%` }} title="Baseline 10%" />
      </div>
      <p className={s.contingencyCaption}>
        Recommended contingency: <em>{Math.round(recommendedPct * 100)}%</em> of modeled total
        ({formatUsd(recommendedDollars)}). Capped at 30%; baseline tick at 10%.
      </p>

      <div className={s.sectionTitle}>Complexity Drivers</div>
      <ul className={s.driverList}>
        {drivers.map((d) => (
          <li
            key={d.key}
            className={`${s.driverRow} ${d.active ? s.driverActive : s.driverInactive}`}
          >
            <span className={s.driverPct}>{d.active ? `+${Math.round(d.pct * 100)}%` : '\u2014'}</span>
            <div className={s.driverBody}>
              <span className={s.driverLabel}>{d.label}</span>
              <span className={s.driverWhy}>{d.why}</span>
            </div>
          </li>
        ))}
      </ul>

      <div className={s.sectionTitle}>Hidden Cost Categories</div>
      <ul className={s.list}>
        {hiddenCosts.map((h) => (
          <li key={h.key} className={`${s.row} ${STATUS_ROW_CLASS[h.status]}`}>
            <div className={s.rowHead}>
              <span className={`${s.tag} ${STATUS_TAG_CLASS[h.status]}`}>{STATUS_LABEL[h.status]}</span>
              <span className={s.rowTitle}>{h.label}</span>
              <span className={s.rowEstimate}>
                ~{Math.round(h.pct * 100)}% &middot; {formatUsd(h.estimatedDollars)}
              </span>
            </div>
            <p className={s.rowRationale}>{h.rationale}</p>
          </li>
        ))}
      </ul>

      <p className={s.footnote}>
        Hidden-cost percentages are industry rules of thumb (CSI MasterFormat
        Division 1 norms, owner-builder budget studies) applied to the
        relevant slice of the modeled total. The contingency formula is a
        complexity scorer — baseline 10%, +5% per active driver, capped
        at 30%. This is decision-support for budget conversations and
        funder discussions, not a Monte-Carlo risk model.
      </p>
    </div>
  );
}
