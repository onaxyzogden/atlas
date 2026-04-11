/**
 * InvestorSummaryExport — printable investor summary with economics data.
 * All financial values derived from the financial modeling engine.
 */

import type { LocalProject } from '../../store/projectStore.js';
import { useFinancialModel } from '../financial/hooks/useFinancialModel.js';

interface Props {
  project: LocalProject;
  onClose: () => void;
}

export default function InvestorSummaryExport({ project, onClose }: Props) {
  const model = useFinancialModel(project.id);

  const totalInvestmentStr = model
    ? `$${Math.round(model.totalInvestment.low / 1000)}K\u2013$${Math.round(model.totalInvestment.high / 1000)}K`
    : 'N/A';
  const breakEvenStr = model?.breakEven.breakEvenYear.mid != null
    ? `Year ${model.breakEven.breakEvenYear.mid}`
    : '10+';
  const roiStr = model
    ? `${model.breakEven.tenYearROI.low}\u2013${model.breakEven.tenYearROI.high}%`
    : 'N/A';

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
              OGDEN Land Design Atlas — Investor Summary (Estimate)
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>{project.name}</h1>
            {project.address && <p style={{ fontSize: 12, color: '#634c31', marginTop: 4 }}>{project.address}</p>}
          </div>

          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
            <SummaryCard label="Total Investment (est.)" value={totalInvestmentStr} />
            <SummaryCard label="Break-Even (est.)" value={breakEvenStr} />
            <SummaryCard label="10-Year ROI (est.)" value={roiStr} />
          </div>

          {/* Costs */}
          {model && model.costLineItems.length > 0 && (
            <>
              <h3 style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7d6140', marginBottom: 8, borderBottom: '1px solid #e4d9c6', paddingBottom: 4 }}>
                Capital Costs (Estimates)
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
                  {model.costLineItems.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f2ede3' }}>
                      <td style={{ padding: '4px 8px', fontWeight: 500 }}>{item.name}</td>
                      <td style={{ padding: '4px 8px', color: '#9a8a74' }}>{item.phaseName}</td>
                      <td style={{ padding: '4px 8px', color: '#9a8a74' }}>{item.category}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', fontFamily: 'monospace' }}>
                        ${Math.round(item.cost.low / 1000)}K–${Math.round(item.cost.high / 1000)}K
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* Revenue */}
          {model && model.revenueStreams.length > 0 && (
            <>
              <h3 style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7d6140', marginBottom: 8, borderBottom: '1px solid #e4d9c6', paddingBottom: 4 }}>
                Revenue Streams (Estimates)
              </h3>
              <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse', marginBottom: 24 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e4d9c6', textAlign: 'left' }}>
                    <th style={{ padding: '4px 8px', fontWeight: 600 }}>Stream</th>
                    <th style={{ padding: '4px 8px', fontWeight: 600 }}>Start</th>
                    <th style={{ padding: '4px 8px', fontWeight: 600, textAlign: 'right' }}>Annual (est.)</th>
                  </tr>
                </thead>
                <tbody>
                  {model.revenueStreams.map((stream) => (
                    <tr key={stream.id} style={{ borderBottom: '1px solid #f2ede3' }}>
                      <td style={{ padding: '4px 8px', fontWeight: 500 }}>{stream.name}</td>
                      <td style={{ padding: '4px 8px', color: '#9a8a74' }}>Year {stream.startYear}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', fontFamily: 'monospace' }}>
                        ${Math.round(stream.annualRevenue.low / 1000)}K–${Math.round(stream.annualRevenue.high / 1000)}K
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {!model && (
            <div style={{ padding: 16, textAlign: 'center', color: '#9a8a74', fontSize: 12 }}>
              No features placed yet. Add zones, structures, and other features to generate financial projections.
            </div>
          )}

          {/* Disclaimer */}
          <div style={{ padding: 12, background: '#faf8f4', borderRadius: 6, fontSize: 10, color: '#9a8a74', lineHeight: 1.6, marginBottom: 16 }}>
            <strong>Estimate Disclaimer:</strong> All projections are estimates based on regional benchmarks and comparable operations.
            Actual costs depend on site conditions, permitting, contractor availability, and market factors.
            Revenue estimates assume competent management and normal market conditions.
            These figures are for planning purposes only and do not constitute financial advice.
            {model && model.assumptions.length > 0 && (
              <details style={{ marginTop: 8 }}>
                <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Key Assumptions ({model.assumptions.length})</summary>
                <ul style={{ marginTop: 4, paddingLeft: 16 }}>
                  {model.assumptions.slice(0, 10).map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                  {model.assumptions.length > 10 && <li>...and {model.assumptions.length - 10} more</li>}
                </ul>
              </details>
            )}
          </div>

          <div style={{ fontSize: 9, color: '#9a8a74', textAlign: 'center', borderTop: '1px solid #e4d9c6', paddingTop: 12 }}>
            Generated by OGDEN Land Design Atlas — {new Date().toLocaleDateString()} — Estimates for planning purposes only
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
