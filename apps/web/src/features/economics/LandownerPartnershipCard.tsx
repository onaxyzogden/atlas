/**
 * §22 LandownerPartnershipCard — split-of-interest summary between the
 * landowner-steward and the outside capital partner (investor / CSRA
 * member / fund).
 *
 * The InvestorSummaryExport modal already covers the investor-facing
 * pitch (totalInvestment, breakEven, ROI). This card answers the
 * complementary partnership question: "if a landowner brings the land
 * and a capital partner brings the money, who funds what, who carries
 * what risk, and who reaps which revenue stream?"
 *
 * HEURISTIC: there is no entity-level partnership tag in the data
 * model. The card classifies each cost line item by category and each
 * revenue stream by enterprise into landowner-aligned, investor-aligned,
 * or shared buckets, using a presentational rule-of-thumb:
 *
 *   - Land Preparation       → landowner-led (stewardship of their land)
 *   - Structures             → investor-led  (capital for revenue assets)
 *   - Agricultural           → investor-led  (operating capital)
 *   - Infrastructure         → shared        (both benefit)
 *
 *   - carbon / grants / education / community-mission revenue
 *                            → landowner-aligned (mission income)
 *   - livestock / orchard / market_garden / retreat / agritourism
 *                            → investor-aligned (commercial income)
 *
 * Risk lens: the partner who carries the cumulative deficit in early
 * years is flagged as the "early-stage risk holder" — typically the
 * investor, since landowner contribution is largely the land itself.
 *
 * Pure presentation rollup over the existing FinancialModel. No shared
 * math, no entity edits, no new partnership data model.
 *
 * Closes manifest §22 `investor-summary-landowner-partnership` (P3)
 * partial -> done.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import type { FinancialModel, EnterpriseType } from '../financial/engine/types.js';
import s from './LandownerPartnershipCard.module.css';

interface Props {
  project: LocalProject;
  model: FinancialModel;
}

type Side = 'landowner' | 'investor' | 'shared';

const COST_CATEGORY_SIDE: Record<string, Side> = {
  'Land Preparation': 'landowner',
  Infrastructure: 'shared',
  Structures: 'investor',
  Agricultural: 'investor',
};

const REVENUE_ENTERPRISE_SIDE: Record<EnterpriseType, Side> = {
  carbon: 'landowner',
  grants: 'landowner',
  education: 'landowner',
  livestock: 'investor',
  orchard: 'investor',
  market_garden: 'investor',
  retreat: 'investor',
  agritourism: 'investor',
};

interface SideTotals {
  landowner: number;
  investor: number;
  shared: number;
}

function emptyTotals(): SideTotals {
  return { landowner: 0, investor: 0, shared: 0 };
}

function pct(n: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((n / total) * 100);
}

function fmtUsdK(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '$0';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  return `$${Math.round(n / 1000)}K`;
}

export default function LandownerPartnershipCard({ project, model }: Props) {
  void project;

  const { costSplit, revenueSplit, totalCost, totalRevenue, earlyRiskYear, peakDeficit } =
    useMemo(() => {
      const costTotals = emptyTotals();
      for (const item of model.costLineItems) {
        const side = COST_CATEGORY_SIDE[item.category] ?? 'shared';
        costTotals[side] += item.cost.mid;
      }

      const revenueTotals = emptyTotals();
      for (const stream of model.revenueStreams) {
        const side = REVENUE_ENTERPRISE_SIDE[stream.enterprise] ?? 'shared';
        revenueTotals[side] += stream.annualRevenue.mid;
      }

      const tCost = costTotals.landowner + costTotals.investor + costTotals.shared;
      const tRev = revenueTotals.landowner + revenueTotals.investor + revenueTotals.shared;

      // Early-stage risk holder: which year does cumulative cashflow
      // bottom out? The investor carries the cashflow deficit from
      // year 0 to that point.
      let trough = { year: 0, value: 0 };
      for (const yr of model.cashflow) {
        if (yr.cumulativeCashflow.mid < trough.value) {
          trough = { year: yr.year, value: yr.cumulativeCashflow.mid };
        }
      }

      return {
        costSplit: costTotals,
        revenueSplit: revenueTotals,
        totalCost: tCost,
        totalRevenue: tRev,
        earlyRiskYear: trough.year,
        peakDeficit: Math.abs(trough.value),
      };
    }, [model]);

  const noData = totalCost <= 0 && totalRevenue <= 0;
  if (noData) {
    return (
      <section className={s.card} aria-label="Landowner partnership summary">
        <header className={s.cardHead}>
          <div>
            <h3 className={s.cardTitle}>Landowner & Investor Partnership</h3>
            <p className={s.cardHint}>
              Split-of-interest view: who funds what, who carries what risk, who reaps which
              revenue stream. Place features and revenue streams to populate.
            </p>
          </div>
          <span className={s.heuristicBadge}>HEURISTIC</span>
        </header>
        <p className={s.empty}>No cost or revenue data yet.</p>
      </section>
    );
  }

  return (
    <section className={s.card} aria-label="Landowner partnership summary">
      <header className={s.cardHead}>
        <div>
          <h3 className={s.cardTitle}>Landowner & Investor Partnership</h3>
          <p className={s.cardHint}>
            Split-of-interest view classifying each cost and revenue stream as
            landowner-aligned, investor-aligned, or shared. A presentational rule-of-thumb to
            frame partnership conversations {'\u2014'} not a legal allocation.
          </p>
        </div>
        <span className={s.heuristicBadge}>HEURISTIC</span>
      </header>

      <div className={s.splitGrid}>
        <SplitBlock
          title="Capital outlay"
          totalLabel={fmtUsdK(totalCost)}
          totalHint="Total mid-case investment"
          totals={costSplit}
          total={totalCost}
        />
        <SplitBlock
          title="Annual revenue at maturity"
          totalLabel={fmtUsdK(totalRevenue)}
          totalHint="Mid-case income mix"
          totals={revenueSplit}
          total={totalRevenue}
        />
      </div>

      <div className={s.riskBlock}>
        <div className={s.riskHead}>
          <span className={s.riskLabel}>Early-stage risk holder</span>
          <span className={s.riskBadge}>INVESTOR</span>
        </div>
        <p className={s.riskBody}>
          Cumulative cashflow troughs at <strong>Year {earlyRiskYear}</strong> with a peak
          deficit of <strong>{fmtUsdK(peakDeficit)}</strong>. Until that point, the capital
          partner carries the cashflow gap; the landowner carries land-tenure and
          legacy-stewardship risk that this model does not price.
        </p>
      </div>

      <ul className={s.ruleList}>
        <li>
          <span className={s.rulePill} data-side="landowner">Landowner</span>
          <span>
            Land Preparation costs {'\u2014'} carbon, grant, and education revenue (mission
            income).
          </span>
        </li>
        <li>
          <span className={s.rulePill} data-side="investor">Investor</span>
          <span>
            Structures and Agricultural costs {'\u2014'} livestock, orchard, market garden,
            retreat, agritourism revenue (commercial income).
          </span>
        </li>
        <li>
          <span className={s.rulePill} data-side="shared">Shared</span>
          <span>
            Infrastructure costs {'\u2014'} both partners benefit from utilities, paths, and
            shared site systems.
          </span>
        </li>
      </ul>

      <p className={s.footnote}>
        This is a framing tool, not a contract. Real partnership terms (land lease, profit
        share, exit clauses, succession) live in the agreement, not in the model.
      </p>
    </section>
  );
}

interface SplitBlockProps {
  title: string;
  totalLabel: string;
  totalHint: string;
  totals: SideTotals;
  total: number;
}

function SplitBlock({ title, totalLabel, totalHint, totals, total }: SplitBlockProps) {
  const lP = pct(totals.landowner, total);
  const iP = pct(totals.investor, total);
  const sP = Math.max(0, 100 - lP - iP);
  return (
    <div className={s.split}>
      <div className={s.splitHead}>
        <span className={s.splitTitle}>{title}</span>
        <div className={s.splitTotals}>
          <span className={s.splitTotal}>{totalLabel}</span>
          <span className={s.splitTotalHint}>{totalHint}</span>
        </div>
      </div>
      <div className={s.bar} role="img" aria-label={`${lP}% landowner, ${iP}% investor, ${sP}% shared`}>
        {lP > 0 && (
          <span className={`${s.barSeg} ${s.barLandowner}`} style={{ width: `${lP}%` }}>
            {lP >= 12 ? `${lP}%` : ''}
          </span>
        )}
        {iP > 0 && (
          <span className={`${s.barSeg} ${s.barInvestor}`} style={{ width: `${iP}%` }}>
            {iP >= 12 ? `${iP}%` : ''}
          </span>
        )}
        {sP > 0 && (
          <span className={`${s.barSeg} ${s.barShared}`} style={{ width: `${sP}%` }}>
            {sP >= 12 ? `${sP}%` : ''}
          </span>
        )}
      </div>
      <div className={s.splitLegend}>
        <span className={s.legendItem}>
          <span className={`${s.legendSwatch} ${s.barLandowner}`} aria-hidden="true" />
          Landowner {fmtUsdK(totals.landowner)}
        </span>
        <span className={s.legendItem}>
          <span className={`${s.legendSwatch} ${s.barInvestor}`} aria-hidden="true" />
          Investor {fmtUsdK(totals.investor)}
        </span>
        <span className={s.legendItem}>
          <span className={`${s.legendSwatch} ${s.barShared}`} aria-hidden="true" />
          Shared {fmtUsdK(totals.shared)}
        </span>
      </div>
    </div>
  );
}
