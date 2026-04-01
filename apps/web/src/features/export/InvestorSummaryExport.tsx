/**
 * InvestorSummaryExport — printable investor summary with economics data.
 */

import type { LocalProject } from '../../store/projectStore.js';

interface Props {
  project: LocalProject;
  onClose: () => void;
}

const COST_ITEMS = [
  { name: 'Well & Water System', range: '$45K\u2013$65K', phase: 'Phase 1', category: 'Infrastructure' },
  { name: 'Road & Site Access', range: '$25K\u2013$45K', phase: 'Phase 1', category: 'Infrastructure' },
  { name: 'Off-Grid Solar System', range: '$38K\u2013$58K', phase: 'Phase 1', category: 'Infrastructure' },
  { name: 'Main Dwelling', range: '$85K\u2013$135K', phase: 'Phase 1', category: 'Structures' },
  { name: 'Fencing & Paddocks', range: '$18K\u2013$28K', phase: 'Phase 2', category: 'Agricultural' },
  { name: 'Orchard Establishment', range: '$12K\u2013$22K', phase: 'Phase 2', category: 'Agricultural' },
  { name: 'Guest Cabins (4)', range: '$160K\u2013$240K', phase: 'Phase 3', category: 'Hospitality' },
  { name: 'Community Hall', range: '$80K\u2013$120K', phase: 'Phase 3', category: 'Community' },
];

const REVENUE_ITEMS = [
  { name: 'CSA & Farm Sales', range: '$18K\u2013$28K/yr', startYear: 2, confidence: 'medium' },
  { name: 'Retreat & Hospitality', range: '$55K\u2013$95K/yr', startYear: 3, confidence: 'medium' },
  { name: 'Educational Programs', range: '$12K\u2013$22K/yr', startYear: 3, confidence: 'medium' },
  { name: 'Events & Gatherings', range: '$15K\u2013$30K/yr', startYear: 4, confidence: 'low' },
  { name: 'Grants & Stewardship', range: '$8K\u2013$20K/yr', startYear: 2, confidence: 'low' },
];

export default function InvestorSummaryExport({ project, onClose }: Props) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 720, maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: 12, color: '#312617' }}>
        {/* Controls */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #e4d9c6' }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>Investor Summary</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => window.print()} style={{ padding: '6px 16px', fontSize: 12, border: 'none', borderRadius: 6, background: '#7d6140', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>
              Print / Save PDF
            </button>
            <button onClick={onClose} style={{ padding: '6px 12px', fontSize: 14, border: '1px solid #e4d9c6', borderRadius: 6, background: 'transparent', color: '#9a8a74', cursor: 'pointer' }}>
              {'\u00D7'}
            </button>
          </div>
        </div>

        <div style={{ padding: '24px 32px' }}>
          {/* Header */}
          <div style={{ borderBottom: '2px solid #7d6140', paddingBottom: 12, marginBottom: 24 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.12em', color: '#9a8a74', textTransform: 'uppercase', marginBottom: 4 }}>
              OGDEN Land Design Atlas — Investor Summary
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>{project.name}</h1>
            {project.address && <p style={{ fontSize: 12, color: '#634c31', marginTop: 4 }}>{project.address}</p>}
          </div>

          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
            <SummaryCard label="Total Investment" value="$525K\u2013$843K" />
            <SummaryCard label="Break-Even" value="Year 4" />
            <SummaryCard label="10-Year ROI" value="145\u2013210%" />
          </div>

          {/* Costs */}
          <h3 style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7d6140', marginBottom: 8, borderBottom: '1px solid #e4d9c6', paddingBottom: 4 }}>
            Capital Costs
          </h3>
          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse', marginBottom: 24 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e4d9c6', textAlign: 'left' }}>
                <th style={{ padding: '4px 8px', fontWeight: 600 }}>Item</th>
                <th style={{ padding: '4px 8px', fontWeight: 600 }}>Phase</th>
                <th style={{ padding: '4px 8px', fontWeight: 600 }}>Category</th>
                <th style={{ padding: '4px 8px', fontWeight: 600, textAlign: 'right' }}>Estimate</th>
              </tr>
            </thead>
            <tbody>
              {COST_ITEMS.map((item) => (
                <tr key={item.name} style={{ borderBottom: '1px solid #f2ede3' }}>
                  <td style={{ padding: '4px 8px', fontWeight: 500 }}>{item.name}</td>
                  <td style={{ padding: '4px 8px', color: '#9a8a74' }}>{item.phase}</td>
                  <td style={{ padding: '4px 8px', color: '#9a8a74' }}>{item.category}</td>
                  <td style={{ padding: '4px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{item.range}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Revenue */}
          <h3 style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7d6140', marginBottom: 8, borderBottom: '1px solid #e4d9c6', paddingBottom: 4 }}>
            Revenue Streams
          </h3>
          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse', marginBottom: 24 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e4d9c6', textAlign: 'left' }}>
                <th style={{ padding: '4px 8px', fontWeight: 600 }}>Stream</th>
                <th style={{ padding: '4px 8px', fontWeight: 600 }}>Start</th>
                <th style={{ padding: '4px 8px', fontWeight: 600, textAlign: 'right' }}>Annual</th>
              </tr>
            </thead>
            <tbody>
              {REVENUE_ITEMS.map((item) => (
                <tr key={item.name} style={{ borderBottom: '1px solid #f2ede3' }}>
                  <td style={{ padding: '4px 8px', fontWeight: 500 }}>{item.name}</td>
                  <td style={{ padding: '4px 8px', color: '#9a8a74' }}>Year {item.startYear}</td>
                  <td style={{ padding: '4px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{item.range}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Disclaimer */}
          <div style={{ padding: 12, background: '#faf8f4', borderRadius: 6, fontSize: 10, color: '#9a8a74', lineHeight: 1.6, marginBottom: 16 }}>
            <strong>Note:</strong> All projections are estimates based on comparable operations in the region. Actual costs depend on site conditions, permitting, and market factors. Revenue estimates assume competent management and normal market conditions.
          </div>

          <div style={{ fontSize: 9, color: '#9a8a74', textAlign: 'center', borderTop: '1px solid #e4d9c6', paddingTop: 12 }}>
            Generated by OGDEN Land Design Atlas — {new Date().toLocaleDateString()} — For planning purposes only
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: 12, border: '1px solid #e4d9c6', borderRadius: 8, textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: '#9a8a74', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600, color: '#7d6140' }}>{value}</div>
    </div>
  );
}
