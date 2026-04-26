/**
 * EconomicsPanel — Overview / Costs / Revenue tabs with charts and line items.
 * All financial data is computed from placed features via the financial engine.
 */

import { useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useFinancialStore } from '../../store/financialStore.js';
import { useFinancialModel } from '../financial/hooks/useFinancialModel.js';
import { useSiteData, getLayerSummary } from '../../store/siteDataStore.js';
import { REGION_LABELS, type CostRegion } from '../financial/engine/types.js';
import { zone } from '../../lib/tokens.js';
import { formatKRange, formatUsdRange } from '../../lib/formatRange.js';
import p from '../../styles/panel.module.css';
import s from './EconomicsPanel.module.css';
import OperatingRunwayCard from './OperatingRunwayCard.js';
import EnterpriseRevenueMixCard from './EnterpriseRevenueMixCard.js';
import RevenueRampProjectionCard from './RevenueRampProjectionCard.js';
import OverbuiltForRevenueWarningCard from './OverbuiltForRevenueWarningCard.js';
import SensitivityAnalysisCard from './SensitivityAnalysisCard.js';
import HiddenCostsContingencyCard from './HiddenCostsContingencyCard.js';

interface EconomicsPanelProps {
  project: LocalProject;
}

type Tab = 'overview' | 'costs' | 'revenue';

const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'var(--color-confidence-high)',
  medium: 'var(--color-confidence-medium)',
  low: 'var(--color-confidence-low)',
};

const REGION_OPTIONS: CostRegion[] = [
  'ca-ontario', 'ca-bc', 'ca-prairies',
  'us-midwest', 'us-northeast', 'us-southeast', 'us-west',
];

interface SoilRegenSummary {
  carbonSequestration?: { meanSeqPotential?: number };
  organicMatter?: { mean?: number };
}

interface LandCoverSummary {
  canopy_pct?: number;
}

interface ClimateSummary {
  annual_precip_mm?: number;
}

export default function EconomicsPanel({ project }: EconomicsPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const model = useFinancialModel(project.id);
  const region = useFinancialStore((st) => st.region);
  const setRegion = useFinancialStore((st) => st.setRegion);
  const siteData = useSiteData(project.id);

  if (!model) {
    return (
      <div className={p.container}>
        <h2 className={p.title}>Economic Planning</h2>
        <div className={p.empty}>
          Place zones, structures, paths, or other features on the map to see cost and revenue estimates.
        </div>
      </div>
    );
  }

  const { costLineItems, revenueStreams, totalInvestment, annualRevenueAtMaturity, cashflow, breakEven } = model;

  // Cashflow chart — compute cumulative costs and revenue lines
  const cumulativeCosts = cashflow.map((_, i) =>
    cashflow.slice(0, i + 1).reduce((sum, c) => sum + c.capitalCosts.mid + c.operatingCosts.mid, 0),
  );
  const cumulativeRevenue = cashflow.map((_, i) =>
    cashflow.slice(0, i + 1).reduce((sum, c) => sum + c.revenue.mid, 0),
  );

  const allValues = [
    ...cashflow.map((c) => c.cumulativeCashflow.low),
    ...cashflow.map((c) => c.cumulativeCashflow.high),
    ...cumulativeCosts,
    ...cumulativeRevenue,
  ];
  const minCash = Math.min(...allValues);
  const maxCash = Math.max(...allValues);
  const range = maxCash - minCash || 1;

  // Category breakdown
  const categoryTotals = new Map<string, number>();
  for (const item of costLineItems) {
    categoryTotals.set(item.category, (categoryTotals.get(item.category) ?? 0) + item.cost.mid);
  }
  const catEntries = [...categoryTotals.entries()].sort((a, b) => b[1] - a[1]);
  const maxCat = Math.max(...catEntries.map(([, v]) => v), 1);

  const CAT_BAR_CLASSES: Record<string, string> = {
    Structures: 'catBarStructures',
    Water: 'catBarWater',
    Infrastructure: 'catBarInfrastructure',
    Agricultural: 'catBarAgricultural',
    'Land Preparation': 'catBarAgricultural',
  };

  const breakEvenYear = breakEven.breakEvenYear.mid;

  // Grant readiness
  const grantItems = computeGrantReadiness(model.enterprises, project);

  // Carbon revenue
  const carbonData = computeCarbonRevenue(siteData, project.acreage);

  // Chart helper: y position from value
  const yPos = (v: number) => 110 - ((v - minCash) / range) * 110;
  const xPos = (i: number) => i * 30 + 5;
  const svgWidth = cashflow.length * 30;

  // Range band polygon points (low→high cumulative cashflow)
  const rangeBandPoints = [
    ...cashflow.map((c, i) => `${xPos(i)},${yPos(c.cumulativeCashflow.high)}`),
    ...cashflow.map((_c, i) => {
      const idx = cashflow.length - 1 - i;
      const cf = cashflow[idx]!;
      return `${xPos(idx)},${yPos(cf.cumulativeCashflow.low)}`;
    }),
  ].join(' ');

  return (
    <div className={p.container}>
      <h2 className={p.title}>Economic Planning</h2>

      {/* Region selector */}
      <div style={{ marginBottom: 'var(--space-3)' }}>
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value as CostRegion)}
          className={p.input}
          style={{ fontSize: 11 }}
        >
          {REGION_OPTIONS.map((r) => (
            <option key={r} value={r}>{REGION_LABELS[r]}</option>
          ))}
        </select>
      </div>

      {/* Summary cards */}
      <div className={s.summaryRow}>
        <div className={s.summaryCard}>
          <div className={s.summaryLabel}>Total Investment (est.)</div>
          <div className={`${s.summaryValue} ${s.summaryValueAccent}`}>
            {formatKRange(totalInvestment.low, totalInvestment.high)}
          </div>
        </div>
        <div className={s.summaryCard}>
          <div className={s.summaryLabel}>Break-Even (est.)</div>
          <div className={s.summaryValue}>
            {breakEvenYear != null ? `Year ${breakEvenYear}` : '10+'}
          </div>
        </div>
      </div>

      {/* Tab switcher */}
      <div className={s.tabBar}>
        {(['overview', 'costs', 'revenue'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`${s.tab} ${activeTab === tab ? s.tabActive : ''}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab === 'overview' && (
        <>
          {/* Enhanced cashflow chart */}
          <SectionLabel>Cumulative Cashflow (10yr est.)</SectionLabel>
          <div className={s.chartContainer}>
            <div className={`${s.chartYLabel} ${s.chartYTop}`}>${Math.round(maxCash / 1000)}K</div>
            <div className={`${s.chartYLabel} ${s.chartYBottom}`}>-${Math.round(Math.abs(minCash) / 1000)}K</div>

            <div
              className={s.chartZeroLine}
              style={{ top: `${12 + (1 - (0 - minCash) / range) * 110}px` }}
            />

            <svg viewBox={`0 0 ${svgWidth} 120`} className={s.chartSvg}>
              {/* Range band: low→high scenario area */}
              <polygon
                points={rangeBandPoints}
                fill="rgba(196, 162, 101, 0.12)"
                stroke="none"
              />

              {/* Cumulative costs line (brown) */}
              <polyline
                fill="none"
                stroke={zone.habitation}
                strokeWidth="1.5"
                strokeDasharray="4 3"
                points={cumulativeCosts.map((v, i) => `${xPos(i)},${yPos(-v)}`).join(' ')}
              />

              {/* Cumulative revenue line (sage green) */}
              <polyline
                fill="none"
                stroke="var(--color-confidence-high)"
                strokeWidth="1.5"
                strokeDasharray="4 3"
                points={cumulativeRevenue.map((v, i) => `${xPos(i)},${yPos(v)}`).join(' ')}
              />

              {/* Mid cumulative cashflow line (gold) */}
              <polyline
                fill="none"
                stroke="var(--color-confidence-medium)"
                strokeWidth="2"
                points={cashflow.map((c, i) => `${xPos(i)},${yPos(c.cumulativeCashflow.mid)}`).join(' ')}
              />

              {/* Break-even marker */}
              {breakEvenYear != null && breakEvenYear <= 10 && (
                <>
                  <line
                    x1={xPos(breakEvenYear)}
                    y1={0}
                    x2={xPos(breakEvenYear)}
                    y2={120}
                    stroke="var(--color-confidence-high)"
                    strokeWidth="1"
                    strokeDasharray="3 2"
                  />
                  <text
                    x={xPos(breakEvenYear) + 3}
                    y={12}
                    fill="var(--color-confidence-high)"
                    fontSize="7"
                    fontWeight="600"
                  >
                    BE
                  </text>
                </>
              )}

              {/* Data points */}
              {cashflow.map((c, i) => (
                <circle
                  key={i}
                  cx={xPos(i)}
                  cy={yPos(c.cumulativeCashflow.mid)}
                  r="3"
                  fill={c.cumulativeCashflow.mid >= 0 ? 'var(--color-confidence-high)' : 'var(--color-confidence-medium)'}
                  stroke="var(--color-panel-text)"
                  strokeWidth="1"
                />
              ))}
            </svg>

            <div className={s.chartXLabels}>
              {cashflow.map((c) => <span key={c.year}>Y{c.year}</span>)}
            </div>
          </div>

          {/* Chart legend */}
          <div className={s.chartLegend}>
            <span className={s.legendItem}><span className={s.legendDot} style={{ background: 'var(--color-confidence-medium)' }} /> Net Cashflow</span>
            <span className={s.legendItem}><span className={s.legendDot} style={{ background: zone.habitation }} /> Costs</span>
            <span className={s.legendItem}><span className={s.legendDot} style={{ background: 'var(--color-confidence-high)' }} /> Revenue</span>
            <span className={s.legendItem}><span className={s.legendDot} style={{ background: 'rgba(196, 162, 101, 0.3)', width: 12, height: 8, borderRadius: 2 }} /> Range</span>
          </div>

          {/* Scenario comparison */}
          <SectionLabel>Scenario Comparison (est.)</SectionLabel>
          <div className={s.scenarioRow}>
            <ScenarioCard
              label="Conservative"
              breakEvenYear={breakEven.breakEvenYear.low}
              roi={breakEven.tenYearROI.low}
              peakNeg={breakEven.peakNegativeCashflow.low}
            />
            <ScenarioCard
              label="Expected"
              breakEvenYear={breakEven.breakEvenYear.mid}
              roi={breakEven.tenYearROI.mid}
              peakNeg={breakEven.peakNegativeCashflow.mid}
              highlighted
            />
            <ScenarioCard
              label="Optimistic"
              breakEvenYear={breakEven.breakEvenYear.high}
              roi={breakEven.tenYearROI.high}
              peakNeg={breakEven.peakNegativeCashflow.high}
            />
          </div>

          {/* Operating runway — annual revenue vs cost burn-down */}
          <OperatingRunwayCard cashflow={cashflow} breakEven={breakEven} />

          {/* §22 Sensitivity by assumption — how do ±20% / ±50% lever shifts move headline metrics? */}
          <SensitivityAnalysisCard model={model} />

          {/* §22 Hidden cost flags + contingency recommendation
              (cost-sensitivity-hidden-costs-contingency). */}
          <HiddenCostsContingencyCard project={project} model={model} />

          {/* Category breakdown */}
          <SectionLabel>Investment by Category</SectionLabel>
          <div className={`${p.section} ${p.sectionGapLg}`}>
            {catEntries.map(([cat, val]) => (
              <div key={cat} className={s.catRow}>
                <span className={s.catLabel}>{cat}</span>
                <div className={s.catBarTrack}>
                  <div
                    className={`${s.catBarFill} ${s[CAT_BAR_CLASSES[cat] ?? 'catBarInfrastructure']}`}
                    style={{ width: `${(val / maxCat) * 100}%` }}
                  />
                </div>
                <span className={s.catValue}>${Math.round(val / 1000)}K</span>
              </div>
            ))}
          </div>

          {/* Grant readiness */}
          {grantItems.length > 0 && (
            <>
              <SectionLabel>Grant Readiness</SectionLabel>
              <div className={`${p.section} ${p.sectionGapLg}`}>
                {grantItems.map((item) => (
                  <div key={item.name} className={s.grantRow}>
                    <span className={s.grantName}>{item.name}</span>
                    <span
                      className={s.grantStatus}
                      style={{
                        color: item.status === 'ready' ? 'var(--color-confidence-high)' : item.status === 'partial' ? 'var(--color-confidence-medium)' : 'var(--color-text-muted)',
                        background: item.status === 'ready' ? 'rgba(45,122,79,0.1)' : item.status === 'partial' ? 'rgba(138,109,30,0.1)' : 'transparent',
                      }}
                    >
                      {item.status === 'ready' ? 'Ready' : item.status === 'partial' ? 'Partial' : 'N/A'}
                    </span>
                    <span className={s.grantReason}>{item.reason}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Carbon revenue potential */}
          {carbonData && (
            <>
              <SectionLabel>Carbon Revenue Potential (est.)</SectionLabel>
              <div className={s.carbonCard}>
                <div className={s.carbonMetrics}>
                  <div className={s.carbonMetric}>
                    <span className={s.carbonMetricLabel}>Sequestration Rate</span>
                    <span className={s.carbonMetricValue}>{carbonData.seqRate.toFixed(1)} tCO2/ha/yr</span>
                  </div>
                  <div className={s.carbonMetric}>
                    <span className={s.carbonMetricLabel}>Annual Total</span>
                    <span className={s.carbonMetricValue}>{carbonData.annualTonnes.toFixed(1)} tCO2</span>
                  </div>
                  <div className={s.carbonMetric}>
                    <span className={s.carbonMetricLabel}>Credit Revenue</span>
                    <span className={s.carbonMetricValue}>{formatUsdRange(carbonData.revenueLow, carbonData.revenueHigh, '/yr')}</span>
                  </div>
                </div>
                <div className={s.carbonNote}>
                  Based on ${carbonData.priceRange} carbon credit prices. Actual sequestration depends on management practices and verification.
                </div>
              </div>
            </>
          )}

          {/* Mission alignment */}
          <SectionLabel>Mission Alignment</SectionLabel>
          <div className={s.structuresCard}>
            {/* Overall score circle */}
            <div className={s.missionOverall}>
              <div
                className={`${p.scoreCircle} ${model.missionScore.overall >= 60 ? p.scoreCircleHigh : model.missionScore.overall >= 35 ? p.scoreCircleMed : p.scoreCircleLow}`}
              >
                {model.missionScore.overall}
              </div>
              <span className={s.missionOverallLabel}>Overall</span>
            </div>

            {/* Dimension scores */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {(['financial', 'ecological', 'spiritual', 'community'] as const).map((dim) => (
                <div key={dim} style={{ textAlign: 'center', flex: '1 0 60px' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: model.missionScore[dim] >= 60 ? 'var(--color-confidence-high)' : 'var(--color-confidence-medium)' }}>
                    {model.missionScore[dim]}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--color-panel-muted)', textTransform: 'capitalize' }}>{dim}</div>
                </div>
              ))}
            </div>

            {/* Mission-financial tradeoff */}
            <div className={s.missionTradeoff}>
              {getMissionTradeoffText(model.missionScore)}
            </div>
          </div>

          {/* Enterprises detected */}
          {model.enterprises.length > 0 && (
            <>
              <SectionLabel>Detected Enterprises</SectionLabel>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 'var(--space-3)' }}>
                {model.enterprises.map((e) => (
                  <span key={e} className={s.tagPhase} style={{ fontSize: 10 }}>{e.replace('_', ' ')}</span>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Costs tab */}
      {activeTab === 'costs' && (
        <div className={`${p.section} ${p.sectionGapLg}`}>
          {costLineItems.length === 0 && (
            <div className={p.empty}>No cost items. Place features on the map.</div>
          )}
          {costLineItems.map((item) => (
            <div key={item.id} className={p.card}>
              <div className={s.itemHeader}>
                <span className={s.itemName}>{item.name}</span>
                <span className={s.itemCostRange}>
                  {formatKRange(item.cost.low, item.cost.high)}
                </span>
              </div>
              <div className={s.itemTags}>
                <span className={s.tagPhase}>{item.phaseName}</span>
                <span
                  className={s.tagConfidence}
                  style={{ background: `color-mix(in srgb, ${CONFIDENCE_COLORS[item.confidence]} 15%, transparent)`, color: CONFIDENCE_COLORS[item.confidence] }}
                >
                  {item.confidence} confidence
                </span>
                <span className={s.tagCategory}>{item.category}</span>
              </div>
              {item.unitCost && (
                <div className={s.itemDesc}>
                  ${item.unitCost.amount.toLocaleString()} {item.unitCost.unit} x {item.unitCost.quantity}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Revenue tab */}
      {activeTab === 'revenue' && (
        <>
          <EnterpriseRevenueMixCard projectId={project.id} />
          <RevenueRampProjectionCard projectId={project.id} />
          <OverbuiltForRevenueWarningCard projectId={project.id} />
          <div className={`${p.section} ${p.sectionGapLg}`}>
            {revenueStreams.length === 0 && (
              <div className={p.empty}>
                No revenue streams detected. Place retreat zones with cabins, crop areas, paddocks with livestock, or other enterprise features.
              </div>
            )}
            {revenueStreams.map((stream) => (
              <div key={stream.id} className={p.card}>
                <div className={s.itemHeader}>
                  <span className={s.itemName}>{stream.name}</span>
                  <span className={s.itemRevenueRange}>
                    {formatKRange(stream.annualRevenue.low, stream.annualRevenue.high, '/yr')}
                  </span>
                </div>
                <div className={`${s.itemTags} ${p.mb4}`}>
                  <span className={s.tagFromYear}>From Year {stream.startYear}</span>
                  <span
                    className={s.tagConfidence}
                    style={{ background: `color-mix(in srgb, ${CONFIDENCE_COLORS[stream.confidence]} 15%, transparent)`, color: CONFIDENCE_COLORS[stream.confidence] }}
                  >
                    {stream.confidence} confidence
                  </span>
                </div>
                <div className={s.itemDesc}>{stream.description}</div>
              </div>
            ))}
          </div>

          {revenueStreams.length > 0 && (
            <div className={s.revenueNote}>
              <div className={s.revenueNoteText}>
                <span className={s.revenueNoteLabel}>Estimate Disclaimer:</span>{' '}
                <span className={s.revenueNoteBody}>
                  Revenue projections are estimates based on comparable operations and regional benchmarks.
                  Local market conditions, permitting, and management skill will significantly impact actual results.
                  {annualRevenueAtMaturity.mid > 0 && (
                    <> Combined annual revenue at maturity: {formatKRange(annualRevenueAtMaturity.low, annualRevenueAtMaturity.high)}.</>
                  )}
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className={p.sectionLabel}>
      {children}
    </h3>
  );
}

function ScenarioCard({
  label,
  breakEvenYear,
  roi,
  peakNeg,
  highlighted,
}: {
  label: string;
  breakEvenYear: number | null;
  roi: number;
  peakNeg: number;
  highlighted?: boolean;
}) {
  return (
    <div className={`${s.scenarioCard} ${highlighted ? s.scenarioCardHighlighted : ''}`}>
      <div className={s.scenarioLabel}>{label}</div>
      <div className={s.scenarioMetric}>
        <span className={s.scenarioMetricLabel}>Break-Even</span>
        <span className={s.scenarioMetricValue}>{breakEvenYear != null ? `Yr ${breakEvenYear}` : '10+'}</span>
      </div>
      <div className={s.scenarioMetric}>
        <span className={s.scenarioMetricLabel}>10yr ROI</span>
        <span className={s.scenarioMetricValue}>{roi}%</span>
      </div>
      <div className={s.scenarioMetric}>
        <span className={s.scenarioMetricLabel}>Peak Outlay</span>
        <span className={s.scenarioMetricValue}>-${Math.round(Math.abs(peakNeg) / 1000)}K</span>
      </div>
    </div>
  );
}

// ─── Logic ───────────────────────────────────────────────────────────────

interface GrantItem {
  name: string;
  status: 'ready' | 'partial' | 'na';
  reason: string;
}

function computeGrantReadiness(
  enterprises: string[],
  project: LocalProject,
): GrantItem[] {
  const items: GrantItem[] = [];
  const type = project.projectType;

  // Agricultural grants
  const hasAgEnterprise = enterprises.some((e) => e === 'livestock' || e === 'orchard' || e === 'market_garden');
  items.push({
    name: 'Agricultural Grants',
    status: hasAgEnterprise ? 'ready' : 'na',
    reason: hasAgEnterprise ? 'Active agricultural enterprises detected' : 'No agricultural enterprises',
  });

  // Conservation grants
  const hasConservation = enterprises.includes('carbon');
  items.push({
    name: 'Conservation Grants',
    status: hasConservation ? 'ready' : 'na',
    reason: hasConservation ? 'Carbon/conservation enterprise detected' : 'No conservation zones or carbon enterprise',
  });

  // Renewable energy
  items.push({
    name: 'Renewable Energy',
    status: 'partial',
    reason: 'Solar/renewable readiness depends on utility placement',
  });

  // Rural development
  const isRuralType = type === 'homestead' || type === 'regenerative_farm';
  items.push({
    name: 'Rural Development',
    status: isRuralType ? 'ready' : 'partial',
    reason: isRuralType ? 'Project type qualifies for rural development programs' : 'May qualify depending on project scope',
  });

  // Agritourism
  const hasHospitality = enterprises.some((e) => e === 'retreat' || e === 'agritourism');
  items.push({
    name: 'Agritourism Programs',
    status: hasHospitality ? 'ready' : 'na',
    reason: hasHospitality ? 'Retreat or agritourism enterprise detected' : 'No hospitality enterprises',
  });

  return items;
}

interface CarbonData {
  seqRate: number;
  annualTonnes: number;
  revenueLow: number;
  revenueHigh: number;
  priceRange: string;
}

function computeCarbonRevenue(
  siteData: ReturnType<typeof useSiteData>,
  acreage: number | null,
): CarbonData | null {
  if (!siteData || !acreage) return null;

  const soilRegen = getLayerSummary<SoilRegenSummary>(siteData, 'soil_regeneration');
  const landCover = getLayerSummary<LandCoverSummary>(siteData, 'land_cover');
  const climate = getLayerSummary<ClimateSummary>(siteData, 'climate');
  const soils = getLayerSummary<{ organic_matter?: number }>(siteData, 'soils');

  let seqRate = 0;

  if (soilRegen?.carbonSequestration?.meanSeqPotential) {
    seqRate = soilRegen.carbonSequestration.meanSeqPotential;
  } else {
    // Fallback: derive from land cover + soils + climate
    const canopy = landCover?.canopy_pct ?? 0;
    const om = soils?.organic_matter ?? 3;
    const precip = climate?.annual_precip_mm ?? 800;
    seqRate = (canopy / 100 * 35) + (om / 10 * 12) + (precip / 1000 * 5);
    if (seqRate <= 0) return null;
  }

  const hectares = acreage * 0.4047;
  const annualTonnes = seqRate * hectares;
  const priceLow = 30;
  const priceHigh = 50;

  return {
    seqRate,
    annualTonnes,
    revenueLow: Math.round(annualTonnes * priceLow),
    revenueHigh: Math.round(annualTonnes * priceHigh),
    priceRange: formatUsdRange(priceLow, priceHigh, '/tonne'),
  };
}

function getMissionTradeoffText(missionScore: { overall: number; financial: number; ecological: number; spiritual: number; community: number }): string {
  if (missionScore.financial >= 70 && missionScore.ecological >= 70) {
    return 'Strong alignment between financial returns and ecological stewardship.';
  }
  if (missionScore.financial >= 60 && missionScore.ecological < 40) {
    return 'Financial strength is high but ecological dimension needs attention \u2014 consider adding conservation zones.';
  }
  if (missionScore.ecological >= 60 && missionScore.financial < 40) {
    return 'Strong ecological design but financial returns are limited \u2014 consider adding revenue-generating enterprises.';
  }
  if (missionScore.spiritual >= 60 && missionScore.community >= 60) {
    return 'Excellent spiritual and community dimensions. Financial viability may need enterprise diversification.';
  }
  return 'Balanced design with room for improvement across dimensions.';
}
