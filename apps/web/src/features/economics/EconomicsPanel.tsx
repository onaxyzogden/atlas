/**
 * EconomicsPanel — Overview / Costs / Revenue tabs with charts and line items.
 * Matches the target design with total investment card, break-even, cashflow chart,
 * and detailed cost/revenue breakdowns.
 */

import { useState, useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { STRUCTURE_TEMPLATES } from '../structures/footprints.js';
import p from '../../styles/panel.module.css';
import s from './EconomicsPanel.module.css';

interface EconomicsPanelProps {
  project: LocalProject;
}

type Tab = 'overview' | 'costs' | 'revenue';

interface CostItem {
  name: string;
  phase: string;
  confidence: 'high' | 'medium' | 'low';
  category: string;
  lowK: number;
  highK: number;
}

interface RevenueItem {
  name: string;
  fromYear: number;
  confidence: 'high' | 'medium' | 'low';
  description: string;
  lowK: number;
  highK: number;
}

const COST_ITEMS: CostItem[] = [
  { name: 'Well & Water System', phase: 'Phase 1', confidence: 'medium', category: 'Infrastructure', lowK: 45, highK: 65 },
  { name: 'Road & Site Access', phase: 'Phase 1', confidence: 'medium', category: 'Infrastructure', lowK: 25, highK: 45 },
  { name: 'Off-Grid Solar System', phase: 'Phase 1', confidence: 'medium', category: 'Infrastructure', lowK: 38, highK: 58 },
  { name: 'Septic System', phase: 'Phase 1', confidence: 'low', category: 'Infrastructure', lowK: 18, highK: 32 },
  { name: 'Main Dwelling (Cabin)', phase: 'Phase 1', confidence: 'medium', category: 'Structures', lowK: 85, highK: 135 },
  { name: 'Fencing & Paddocks', phase: 'Phase 2', confidence: 'high', category: 'Agricultural', lowK: 18, highK: 28 },
  { name: 'Orchard Establishment', phase: 'Phase 2', confidence: 'medium', category: 'Agricultural', lowK: 12, highK: 22 },
  { name: 'Market Garden Setup', phase: 'Phase 2', confidence: 'medium', category: 'Agricultural', lowK: 15, highK: 25 },
  { name: 'Keyline Pond & Swales', phase: 'Phase 2', confidence: 'medium', category: 'Water', lowK: 35, highK: 55 },
  { name: 'Guest Cabins (4)', phase: 'Phase 3', confidence: 'medium', category: 'Structures', lowK: 120, highK: 200 },
  { name: 'Prayer Pavilion', phase: 'Phase 3', confidence: 'low', category: 'Structures', lowK: 45, highK: 75 },
  { name: 'Community Hall', phase: 'Phase 3', confidence: 'low', category: 'Structures', lowK: 80, highK: 140 },
];

const REVENUE_ITEMS: RevenueItem[] = [
  { name: 'CSA & Farm Sales', fromYear: 2, confidence: 'medium', description: '20-30 CSA shares, farmers market, direct farm sales', lowK: 18, highK: 28 },
  { name: 'Retreat & Hospitality', fromYear: 3, confidence: 'medium', description: '4 guest cabins @ $150-$250/night, 60-80% occupancy', lowK: 55, highK: 95 },
  { name: 'Educational Programs', fromYear: 3, confidence: 'medium', description: 'Permaculture design courses, farm tours, seasonal workshops', lowK: 12, highK: 22 },
  { name: 'Events & Gatherings', fromYear: 4, confidence: 'low', description: 'Community retreats, small weddings, faith gatherings', lowK: 15, highK: 30 },
  { name: 'Grants & Stewardship', fromYear: 2, confidence: 'low', description: 'OMAFRA EFP, Growing Forward 3, Conservation Halton stewardship programs', lowK: 8, highK: 20 },
];

const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'var(--color-confidence-high)',
  medium: 'var(--color-confidence-medium)',
  low: 'var(--color-confidence-low)',
};

const CAT_BAR_CLASSES: Record<string, string> = {
  Structures: 'catBarStructures',
  Water: 'catBarWater',
  Infrastructure: 'catBarInfrastructure',
  Agricultural: 'catBarAgricultural',
};

export default function EconomicsPanel({ project }: EconomicsPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Include placed structures in cost calculation
  const allStructures = useStructureStore((s) => s.structures);
  const projectStructures = useMemo(
    () => allStructures.filter((s) => s.projectId === project.id),
    [allStructures, project.id],
  );

  // Derive structure costs from actual placed structures using STRUCTURE_TEMPLATES cost ranges
  const structureCosts = useMemo(() => {
    let low = 0, high = 0;
    for (const st of projectStructures) {
      const tmpl = STRUCTURE_TEMPLATES[st.type];
      if (tmpl?.costRange) {
        low += tmpl.costRange[0] / 1000;
        high += tmpl.costRange[1] / 1000;
      } else {
        low += 25; high += 50; // fallback estimate
      }
    }
    return { low, high };
  }, [projectStructures]);

  // Base infrastructure costs (non-structure items)
  const infraCostLow = COST_ITEMS.filter((c) => c.category !== 'Structures').reduce((acc, c) => acc + c.lowK, 0);
  const infraCostHigh = COST_ITEMS.filter((c) => c.category !== 'Structures').reduce((acc, c) => acc + c.highK, 0);

  // Total = infrastructure + actual structures (or baseline if none placed)
  const baselineStructLow = COST_ITEMS.filter((c) => c.category === 'Structures').reduce((acc, c) => acc + c.lowK, 0);
  const baselineStructHigh = COST_ITEMS.filter((c) => c.category === 'Structures').reduce((acc, c) => acc + c.highK, 0);
  const totalCostLow = infraCostLow + (projectStructures.length > 0 ? structureCosts.low : baselineStructLow);
  const totalCostHigh = infraCostHigh + (projectStructures.length > 0 ? structureCosts.high : baselineStructHigh);
  const totalRevenueLow = REVENUE_ITEMS.reduce((acc, r) => acc + r.lowK, 0);
  const totalRevenueHigh = REVENUE_ITEMS.reduce((acc, r) => acc + r.highK, 0);

  // Simple cashflow projection
  const cashflow = useMemo(() => {
    const years: { year: number; cumulative: number }[] = [];
    let cum = 0;
    const avgCost = (totalCostLow + totalCostHigh) / 2;
    const avgRevenue = (totalRevenueLow + totalRevenueHigh) / 2;

    for (let y = 0; y <= 9; y++) {
      if (y === 0) cum -= avgCost * 0.4;
      else if (y === 1) cum -= avgCost * 0.3;
      else if (y === 2) cum -= avgCost * 0.2;
      else if (y === 3) cum -= avgCost * 0.1;

      if (y >= 2) cum += avgRevenue * Math.min(1, (y - 1) / 4);
      years.push({ year: y, cumulative: cum });
    }
    return years;
  }, [totalCostLow, totalCostHigh, totalRevenueLow, totalRevenueHigh]);

  const minCash = Math.min(...cashflow.map((c) => c.cumulative));
  const maxCash = Math.max(...cashflow.map((c) => c.cumulative));
  const range = maxCash - minCash || 1;

  // Category breakdown for bar chart
  const categoryTotals = useMemo(() => {
    const cats: Record<string, number> = {};
    for (const item of COST_ITEMS) {
      cats[item.category] = (cats[item.category] ?? 0) + (item.lowK + item.highK) / 2;
    }
    return Object.entries(cats).sort((a, b) => b[1] - a[1]);
  }, []);

  const maxCat = Math.max(...categoryTotals.map(([, v]) => v));

  return (
    <div className={p.container}>
      <h2 className={p.title}>
        Economic Planning
      </h2>

      {/* Summary cards */}
      <div className={s.summaryRow}>
        <div className={s.summaryCard}>
          <div className={s.summaryLabel}>Total Investment</div>
          <div className={`${s.summaryValue} ${s.summaryValueAccent}`}>${totalCostLow}K–${totalCostHigh}K</div>
        </div>
        <div className={s.summaryCard}>
          <div className={s.summaryLabel}>Break-Even</div>
          <div className={s.summaryValue}>Year {cashflow.find((c) => c.cumulative >= 0)?.year ?? '5+'}</div>
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
          {/* Cashflow chart */}
          <SectionLabel>Cumulative Cashflow (10yr)</SectionLabel>
          <div className={s.chartContainer}>
            {/* Y axis labels */}
            <div className={`${s.chartYLabel} ${s.chartYTop}`}>${Math.round(maxCash / 1000)}K</div>
            <div className={`${s.chartYLabel} ${s.chartYBottom}`}>-${Math.round(Math.abs(minCash) / 1000)}K</div>

            {/* Zero line */}
            <div
              className={s.chartZeroLine}
              style={{ top: `${12 + (1 - (0 - minCash) / range) * 110}px` }}
            />

            {/* Line chart */}
            <svg viewBox={`0 0 ${cashflow.length * 30} 120`} className={s.chartSvg}>
              <polyline
                fill="none"
                stroke="var(--color-confidence-medium)"
                strokeWidth="2"
                points={cashflow.map((c, i) => `${i * 30 + 5},${110 - ((c.cumulative - minCash) / range) * 110}`).join(' ')}
              />
              {cashflow.map((c, i) => (
                <circle
                  key={i}
                  cx={i * 30 + 5}
                  cy={110 - ((c.cumulative - minCash) / range) * 110}
                  r="3"
                  fill={c.cumulative >= 0 ? 'var(--color-confidence-high)' : 'var(--color-confidence-medium)'}
                  stroke="var(--color-panel-text)"
                  strokeWidth="1"
                />
              ))}
            </svg>

            {/* X axis labels */}
            <div className={s.chartXLabels}>
              {cashflow.map((c) => <span key={c.year}>Y{c.year}</span>)}
            </div>
          </div>

          {/* Category breakdown */}
          <SectionLabel>Investment by Category</SectionLabel>
          <div className={`${p.section} ${p.sectionGapLg}`}>
            {categoryTotals.map(([cat, val]) => (
              <div key={cat} className={s.catRow}>
                <span className={s.catLabel}>{cat}</span>
                <div className={s.catBarTrack}>
                  <div
                    className={`${s.catBarFill} ${s[CAT_BAR_CLASSES[cat] ?? 'catBarInfrastructure']}`}
                    style={{ width: `${(val / maxCat) * 100}%` }}
                  />
                </div>
                <span className={s.catValue}>${Math.round(val)}K</span>
              </div>
            ))}
          </div>

          {/* Placed structures value */}
          {projectStructures.length > 0 && (
            <div className={s.structuresCard}>
              <div className={`${s.summaryLabel} ${p.mb4}`}>Placed Structures ({projectStructures.length})</div>
              <div className={s.structuresValue}>
                ${projectStructures.reduce((acc, st) => {
                  const tmpl = STRUCTURE_TEMPLATES[st.type];
                  const avg = tmpl?.costRange ? (tmpl.costRange[0] + tmpl.costRange[1]) / 2 : 50000;
                  return acc + avg;
                }, 0).toLocaleString()}
              </div>
              <div className={s.summaryLabel}>estimated base cost</div>
            </div>
          )}
        </>
      )}

      {/* Costs tab */}
      {activeTab === 'costs' && (
        <div className={`${p.section} ${p.sectionGapLg}`}>
          {COST_ITEMS.map((item) => (
            <div key={item.name} className={p.card}>
              <div className={s.itemHeader}>
                <span className={s.itemName}>{item.name}</span>
                <span className={s.itemCostRange}>${item.lowK}K–${item.highK}K</span>
              </div>
              <div className={s.itemTags}>
                <span className={s.tagPhase}>{item.phase}</span>
                <span
                  className={s.tagConfidence}
                  style={{ background: `color-mix(in srgb, ${CONFIDENCE_COLORS[item.confidence]} 15%, transparent)`, color: CONFIDENCE_COLORS[item.confidence] }}
                >
                  {item.confidence} confidence
                </span>
                <span className={s.tagCategory}>{item.category}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Revenue tab */}
      {activeTab === 'revenue' && (
        <>
          <div className={`${p.section} ${p.sectionGapLg}`}>
            {REVENUE_ITEMS.map((item) => (
              <div key={item.name} className={p.card}>
                <div className={s.itemHeader}>
                  <span className={s.itemName}>{item.name}</span>
                  <span className={s.itemRevenueRange}>${item.lowK}K–${item.highK}K/yr</span>
                </div>
                <div className={`${s.itemTags} ${p.mb4}`}>
                  <span className={s.tagFromYear}>From Year {item.fromYear}</span>
                  <span
                    className={s.tagConfidence}
                    style={{ background: `color-mix(in srgb, ${CONFIDENCE_COLORS[item.confidence]} 15%, transparent)`, color: CONFIDENCE_COLORS[item.confidence] }}
                  >
                    {item.confidence} confidence
                  </span>
                </div>
                <div className={s.itemDesc}>{item.description}</div>
              </div>
            ))}
          </div>

          {/* Note */}
          <div className={s.revenueNote}>
            <div className={s.revenueNoteText}>
              <span className={s.revenueNoteLabel}>Note:</span>{' '}
              <span className={s.revenueNoteBody}>
                Revenue projections are estimates based on comparable operations. Local market conditions, permitting, and management skill will significantly impact actual results.
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className={p.sectionLabel}>
      {children}
    </h3>
  );
}
