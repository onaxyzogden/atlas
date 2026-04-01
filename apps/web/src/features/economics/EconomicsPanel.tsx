/**
 * EconomicsPanel — Overview / Costs / Revenue tabs with charts and line items.
 * Matches the target design with total investment card, break-even, cashflow chart,
 * and detailed cost/revenue breakdowns.
 */

import { useState, useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { STRUCTURE_TEMPLATES } from '../structures/footprints.js';

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
  high: '#2d7a4f',
  medium: '#c4a265',
  low: '#c44e3f',
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
    for (const s of projectStructures) {
      const tmpl = STRUCTURE_TEMPLATES[s.type];
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
  const infraCostLow = COST_ITEMS.filter((c) => c.category !== 'Structures').reduce((s, c) => s + c.lowK, 0);
  const infraCostHigh = COST_ITEMS.filter((c) => c.category !== 'Structures').reduce((s, c) => s + c.highK, 0);

  // Total = infrastructure + actual structures (or baseline if none placed)
  const baselineStructLow = COST_ITEMS.filter((c) => c.category === 'Structures').reduce((s, c) => s + c.lowK, 0);
  const baselineStructHigh = COST_ITEMS.filter((c) => c.category === 'Structures').reduce((s, c) => s + c.highK, 0);
  const totalCostLow = infraCostLow + (projectStructures.length > 0 ? structureCosts.low : baselineStructLow);
  const totalCostHigh = infraCostHigh + (projectStructures.length > 0 ? structureCosts.high : baselineStructHigh);
  const totalRevenueLow = REVENUE_ITEMS.reduce((s, r) => s + r.lowK, 0);
  const totalRevenueHigh = REVENUE_ITEMS.reduce((s, r) => s + r.highK, 0);

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
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-panel-title)', marginBottom: 16 }}>
        Economic Planning
      </h2>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(196,162,101,0.2)', background: 'var(--color-panel-card)' }}>
          <div style={{ fontSize: 10, color: 'var(--color-panel-muted)' }}>Total Investment</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#c4a265' }}>${totalCostLow}K–${totalCostHigh}K</div>
        </div>
        <div style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(196,162,101,0.2)', background: 'var(--color-panel-card)' }}>
          <div style={{ fontSize: 10, color: 'var(--color-panel-muted)' }}>Break-Even</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-panel-text)' }}>Year {cashflow.find((c) => c.cumulative >= 0)?.year ?? '5+'}</div>
        </div>
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(196,162,101,0.2)' }}>
        {(['overview', 'costs', 'revenue'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1, padding: '9px 0', fontSize: 11,
              fontWeight: activeTab === tab ? 600 : 400,
              background: activeTab === tab ? 'rgba(196,162,101,0.12)' : 'transparent',
              border: 'none',
              color: activeTab === tab ? '#c4a265' : 'var(--color-panel-muted)',
              cursor: 'pointer', textTransform: 'capitalize',
            }}
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
          <div style={{ position: 'relative', height: 160, marginBottom: 20, background: 'var(--color-panel-card)', borderRadius: 8, padding: '12px 8px 24px', border: '1px solid var(--color-panel-card-border)' }}>
            {/* Y axis labels */}
            <div style={{ position: 'absolute', left: 4, top: 10, fontSize: 9, color: 'var(--color-panel-muted)' }}>${Math.round(maxCash / 1000)}K</div>
            <div style={{ position: 'absolute', left: 4, bottom: 22, fontSize: 9, color: 'var(--color-panel-muted)' }}>-${Math.round(Math.abs(minCash) / 1000)}K</div>

            {/* Zero line */}
            <div style={{
              position: 'absolute', left: 40, right: 8,
              top: `${12 + (1 - (0 - minCash) / range) * 110}px`,
              height: 1, background: 'rgba(196,162,101,0.2)',
            }} />

            {/* Line chart */}
            <svg viewBox={`0 0 ${cashflow.length * 30} 120`} style={{ width: '100%', height: '100%', paddingLeft: 40 }}>
              <polyline
                fill="none"
                stroke="#c4a265"
                strokeWidth="2"
                points={cashflow.map((c, i) => `${i * 30 + 5},${110 - ((c.cumulative - minCash) / range) * 110}`).join(' ')}
              />
              {cashflow.map((c, i) => (
                <circle
                  key={i}
                  cx={i * 30 + 5}
                  cy={110 - ((c.cumulative - minCash) / range) * 110}
                  r="3"
                  fill={c.cumulative >= 0 ? '#2d7a4f' : '#c4a265'}
                  stroke="#f2ede3"
                  strokeWidth="1"
                />
              ))}
            </svg>

            {/* X axis labels */}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: 40, paddingRight: 8, fontSize: 9, color: 'var(--color-panel-muted)' }}>
              {cashflow.map((c) => <span key={c.year}>Y{c.year}</span>)}
            </div>
          </div>

          {/* Category breakdown */}
          <SectionLabel>Investment by Category</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {categoryTotals.map(([cat, val]) => (
              <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <span style={{ width: 80, color: 'var(--color-panel-muted)', fontSize: 11, flexShrink: 0 }}>{cat}</span>
                <div style={{ flex: 1, height: 12, background: 'var(--color-panel-subtle)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${(val / maxCat) * 100}%`, height: '100%', background: cat === 'Structures' ? '#8B6E4E' : cat === 'Water' ? '#4A6B8A' : cat === 'Infrastructure' ? '#c4a265' : '#4A7C3F', borderRadius: 3 }} />
                </div>
                <span style={{ fontSize: 10, color: 'var(--color-panel-muted)', flexShrink: 0 }}>${Math.round(val)}K</span>
              </div>
            ))}
          </div>

          {/* Placed structures value */}
          {projectStructures.length > 0 && (
            <div style={{ marginTop: 16, padding: '10px 12px', borderRadius: 8, background: 'var(--color-panel-card)', border: '1px solid var(--color-panel-card-border)' }}>
              <div style={{ fontSize: 10, color: 'var(--color-panel-muted)', marginBottom: 4 }}>Placed Structures ({projectStructures.length})</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#c4a265' }}>
                ${projectStructures.reduce((s, st) => {
                  const tmpl = STRUCTURE_TEMPLATES[st.type];
                  const avg = tmpl?.costRange ? (tmpl.costRange[0] + tmpl.costRange[1]) / 2 : 50000;
                  return s + avg;
                }, 0).toLocaleString()}
              </div>
              <div style={{ fontSize: 10, color: 'var(--color-panel-muted)' }}>estimated base cost</div>
            </div>
          )}
        </>
      )}

      {/* Costs tab */}
      {activeTab === 'costs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {COST_ITEMS.map((item) => (
            <div key={item.name} style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--color-panel-card)', border: '1px solid var(--color-panel-card-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-panel-text)' }}>{item.name}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#c4a265', flexShrink: 0 }}>${item.lowK}K–${item.highK}K</span>
              </div>
              <div style={{ display: 'flex', gap: 6, fontSize: 10 }}>
                <span style={{ padding: '1px 6px', borderRadius: 3, background: 'rgba(196,162,101,0.1)', color: '#c4a265' }}>{item.phase}</span>
                <span style={{ padding: '1px 6px', borderRadius: 3, background: `${CONFIDENCE_COLORS[item.confidence]}15`, color: CONFIDENCE_COLORS[item.confidence] }}>{item.confidence} confidence</span>
                <span style={{ color: 'var(--color-panel-muted)' }}>{item.category}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Revenue tab */}
      {activeTab === 'revenue' && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {REVENUE_ITEMS.map((item) => (
              <div key={item.name} style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--color-panel-card)', border: '1px solid var(--color-panel-card-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-panel-text)' }}>{item.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#2d7a4f', flexShrink: 0 }}>${item.lowK}K–${item.highK}K/yr</span>
                </div>
                <div style={{ display: 'flex', gap: 6, fontSize: 10, marginBottom: 4 }}>
                  <span style={{ padding: '1px 6px', borderRadius: 3, background: 'rgba(45,122,79,0.1)', color: '#2d7a4f' }}>From Year {item.fromYear}</span>
                  <span style={{ padding: '1px 6px', borderRadius: 3, background: `${CONFIDENCE_COLORS[item.confidence]}15`, color: CONFIDENCE_COLORS[item.confidence] }}>{item.confidence} confidence</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-panel-muted)', lineHeight: 1.4 }}>{item.description}</div>
              </div>
            ))}
          </div>

          {/* Note */}
          <div style={{ marginTop: 16, padding: '10px 12px', borderRadius: 8, background: 'rgba(196,162,101,0.06)', border: '1px solid rgba(196,162,101,0.15)' }}>
            <div style={{ fontSize: 11, lineHeight: 1.5 }}>
              <span style={{ fontWeight: 600, color: '#c4a265' }}>Note:</span>{' '}
              <span style={{ color: 'var(--color-panel-muted)' }}>
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
    <h3 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-panel-section)', marginBottom: 8 }}>
      {children}
    </h3>
  );
}
