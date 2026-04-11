/**
 * InvestorSummaryExport — investor-facing summary with real financial data.
 * Pulls from useFinancialModel, useSiteDataStore, visionStore, projectStore.
 * Generates PDF via POST /api/v1/projects/:id/exports.
 */

import { useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useFinancialModel } from '../financial/hooks/useFinancialModel.js';
import { useSiteDataStore } from '../../store/siteDataStore.js';
import { useVisionStore } from '../../store/visionStore.js';
import { api } from '../../lib/apiClient.js';

interface Props {
  project: LocalProject;
  onClose: () => void;
}

export default function InvestorSummaryExport({ project, onClose }: Props) {
  const model = useFinancialModel(project.id);
  const siteData = useSiteDataStore((s) => s.dataByProject[project.id]);
  const visionData = useVisionStore((s) => s.getVisionData(project.id));

  const [status, setStatus] = useState<'idle' | 'generating' | 'done' | 'error'>('idle');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalInvestmentStr = model
    ? `$${Math.round(model.totalInvestment.low / 1000)}K\u2013$${Math.round(model.totalInvestment.high / 1000)}K`
    : 'N/A';
  const breakEvenStr = model?.breakEven.breakEvenYear.mid != null
    ? `Year ${model.breakEven.breakEvenYear.mid}`
    : '10+';
  const roiStr = model
    ? `${model.breakEven.tenYearROI.low}\u2013${model.breakEven.tenYearROI.high}%`
    : 'N/A';

  const handleGenerate = async () => {
    if (!model) return;
    setStatus('generating');
    setError(null);
    try {
      const { data } = await api.exports.generate(project.id, {
        exportType: 'investor_summary',
        payload: {
          financial: {
            region: model.region,
            totalInvestment: model.totalInvestment,
            annualRevenueAtMaturity: model.annualRevenueAtMaturity,
            costLineItems: model.costLineItems.map((item) => ({
              name: item.name,
              category: item.category,
              phase: item.phaseName,
              cost: item.cost,
            })),
            revenueStreams: model.revenueStreams.map((stream) => ({
              name: stream.name,
              enterprise: stream.enterprise,
              annualRevenue: stream.annualRevenue,
              startYear: stream.startYear,
            })),
            cashflow: model.cashflow,
            breakEven: model.breakEven,
            enterprises: model.enterprises,
            missionScore: model.missionScore,
            assumptions: model.assumptions,
          },
        },
      });
      setDownloadUrl(data.storageUrl);
      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
      setStatus('error');
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 720, maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: 12, color: '#14532D' }}>
        {/* Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid rgba(21,128,61,0.15)' }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>Investor Summary</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {status === 'idle' && (
              <button
                onClick={handleGenerate}
                disabled={!model}
                style={{
                  padding: '6px 16px', fontSize: 12, border: 'none', borderRadius: 6,
                  background: model ? '#15803D' : '#d1d5db',
                  color: model ? '#fff' : '#9ca3af',
                  cursor: model ? 'pointer' : 'not-allowed', fontWeight: 500,
                }}
              >
                Generate PDF
              </button>
            )}
            {status === 'generating' && (
              <span style={{ padding: '6px 16px', fontSize: 12, color: '#CA8A04', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CA8A04" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                  <line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" />
                  <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" /><line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                  <line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" />
                  <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" /><line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
                </svg>
                Generating PDF...
              </span>
            )}
            {status === 'done' && downloadUrl && (
              <>
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ padding: '6px 16px', fontSize: 12, border: 'none', borderRadius: 6, background: '#15803D', color: '#fff', textDecoration: 'none', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download PDF
                </a>
                <button
                  onClick={handleGenerate}
                  style={{ padding: '6px 12px', fontSize: 12, border: '1px solid rgba(202,138,4,0.25)', borderRadius: 6, background: 'transparent', color: '#CA8A04', cursor: 'pointer', fontWeight: 500 }}
                >
                  Regenerate
                </button>
              </>
            )}
            {status === 'error' && (
              <button
                onClick={handleGenerate}
                style={{ padding: '6px 16px', fontSize: 12, border: 'none', borderRadius: 6, background: '#15803D', color: '#fff', cursor: 'pointer', fontWeight: 500 }}
              >
                Retry
              </button>
            )}
            <button onClick={onClose} style={{ padding: '6px 12px', fontSize: 14, border: '1px solid rgba(21,128,61,0.15)', borderRadius: 6, background: 'transparent', color: '#6b7280', cursor: 'pointer' }}>
              {'\u00D7'}
            </button>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div style={{ margin: '12px 20px 0', padding: '8px 12px', background: 'rgba(220,38,38,0.06)', borderRadius: 6, fontSize: 11, color: '#dc2626' }}>
            {error}
          </div>
        )}

        <div style={{ padding: '24px 32px' }}>
          {/* Header */}
          <div style={{ borderBottom: '2px solid #15803D', paddingBottom: 12, marginBottom: 24 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.12em', color: '#CA8A04', textTransform: 'uppercase', marginBottom: 4, fontWeight: 600 }}>
              OGDEN Land Design Atlas — Investor Summary (Estimate)
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, fontFamily: "'Fira Code', monospace", color: '#14532D' }}>{project.name}</h1>
            {project.address && <p style={{ fontSize: 12, color: '#15803D', marginTop: 4 }}>{project.address}</p>}
            {visionData?.phaseNotes?.[0]?.notes && (
              <p style={{ fontSize: 11, color: '#6b7280', marginTop: 4, fontStyle: 'italic' }}>
                {visionData.phaseNotes[0]!.notes}
              </p>
            )}
          </div>

          {/* Key Investor Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
            <MetricCard label="Total Investment (est.)" value={totalInvestmentStr} color="#15803D" />
            <MetricCard label="Break-Even (est.)" value={breakEvenStr} color="#CA8A04" />
            <MetricCard label="10-Year ROI (est.)" value={roiStr} color="#15803D" />
          </div>

          {/* Year 5 / Year 10 cashflow preview */}
          {model && model.cashflow.length >= 5 && model.cashflow[4] && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              <MetricCard
                label="Year 5 Cashflow"
                value={`$${Math.round(model.cashflow[4].cumulativeCashflow.mid / 1000)}K`}
                color={model.cashflow[4].cumulativeCashflow.mid >= 0 ? '#15803D' : '#dc2626'}
              />
              {model.cashflow.length >= 10 && model.cashflow[9] && (
                <MetricCard
                  label="Year 10 Cashflow"
                  value={`$${Math.round(model.cashflow[9].cumulativeCashflow.mid / 1000)}K`}
                  color={model.cashflow[9].cumulativeCashflow.mid >= 0 ? '#15803D' : '#dc2626'}
                />
              )}
            </div>
          )}

          {/* Mission Scores */}
          {model && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#CA8A04', marginBottom: 10, borderBottom: '1px solid rgba(21,128,61,0.15)', paddingBottom: 4, fontFamily: "'Fira Code', monospace" }}>
                Mission Alignment Scores
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                <ScoreBar label="Financial" value={model.missionScore.financial} />
                <ScoreBar label="Ecological" value={model.missionScore.ecological} />
                <ScoreBar label="Spiritual" value={model.missionScore.spiritual} />
                <ScoreBar label="Community" value={model.missionScore.community} />
              </div>
              <div style={{ textAlign: 'center', marginTop: 8, fontSize: 11, fontWeight: 600, color: '#15803D' }}>
                Overall: {Math.round(model.missionScore.overall)}/100
              </div>
            </div>
          )}

          {/* Site context */}
          {siteData && siteData.status === 'complete' && (
            <div style={{ marginBottom: 24, padding: 12, background: '#F0FDF4', borderRadius: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#15803D', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                Site Context
              </div>
              <div style={{ fontSize: 11, color: '#14532D', lineHeight: 1.6 }}>
                {project.acreage && <span>Acreage: {project.acreage} ac. </span>}
                Data layers fetched: {siteData.layers.length} ({siteData.liveCount} live).
                {siteData.enrichment?.siteSynthesis && (
                  <span style={{ display: 'block', marginTop: 4, fontStyle: 'italic', opacity: 0.8 }}>
                    {siteData.enrichment.siteSynthesis.slice(0, 200)}
                    {siteData.enrichment.siteSynthesis.length > 200 ? '...' : ''}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Costs */}
          {model && model.costLineItems.length > 0 && (
            <>
              <h3 style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#CA8A04', marginBottom: 8, borderBottom: '1px solid rgba(21,128,61,0.15)', paddingBottom: 4, fontFamily: "'Fira Code', monospace" }}>
                Capital Costs (Estimates)
              </h3>
              <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse', marginBottom: 24 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(21,128,61,0.15)', textAlign: 'left' }}>
                    <th style={{ padding: '4px 8px', fontWeight: 600, color: '#14532D' }}>Item</th>
                    <th style={{ padding: '4px 8px', fontWeight: 600, color: '#14532D' }}>Phase</th>
                    <th style={{ padding: '4px 8px', fontWeight: 600, color: '#14532D' }}>Category</th>
                    <th style={{ padding: '4px 8px', fontWeight: 600, color: '#14532D', textAlign: 'right' }}>Estimate</th>
                  </tr>
                </thead>
                <tbody>
                  {model.costLineItems.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid rgba(21,128,61,0.06)' }}>
                      <td style={{ padding: '4px 8px', fontWeight: 500 }}>{item.name}</td>
                      <td style={{ padding: '4px 8px', color: '#6b7280' }}>{item.phaseName}</td>
                      <td style={{ padding: '4px 8px', color: '#6b7280' }}>{item.category}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', fontFamily: "'Fira Code', monospace" }}>
                        ${Math.round(item.cost.low / 1000)}K\u2013${Math.round(item.cost.high / 1000)}K
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
              <h3 style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#CA8A04', marginBottom: 8, borderBottom: '1px solid rgba(21,128,61,0.15)', paddingBottom: 4, fontFamily: "'Fira Code', monospace" }}>
                Revenue Streams (Estimates)
              </h3>
              <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse', marginBottom: 24 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(21,128,61,0.15)', textAlign: 'left' }}>
                    <th style={{ padding: '4px 8px', fontWeight: 600, color: '#14532D' }}>Stream</th>
                    <th style={{ padding: '4px 8px', fontWeight: 600, color: '#14532D' }}>Start</th>
                    <th style={{ padding: '4px 8px', fontWeight: 600, color: '#14532D', textAlign: 'right' }}>Annual (est.)</th>
                  </tr>
                </thead>
                <tbody>
                  {model.revenueStreams.map((stream) => (
                    <tr key={stream.id} style={{ borderBottom: '1px solid rgba(21,128,61,0.06)' }}>
                      <td style={{ padding: '4px 8px', fontWeight: 500 }}>{stream.name}</td>
                      <td style={{ padding: '4px 8px', color: '#6b7280' }}>Year {stream.startYear}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', fontFamily: "'Fira Code', monospace" }}>
                        ${Math.round(stream.annualRevenue.low / 1000)}K\u2013${Math.round(stream.annualRevenue.high / 1000)}K
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {!model && (
            <div style={{ padding: 16, textAlign: 'center', color: '#6b7280', fontSize: 12 }}>
              No features placed yet. Add zones, structures, and other features to generate financial projections.
            </div>
          )}

          {/* Disclaimer */}
          <div style={{ padding: 12, background: '#F0FDF4', borderRadius: 8, fontSize: 10, color: '#6b7280', lineHeight: 1.6, marginBottom: 16 }}>
            <strong style={{ color: '#14532D' }}>Estimate Disclaimer:</strong> All projections are estimates based on regional benchmarks and comparable operations.
            Actual costs depend on site conditions, permitting, contractor availability, and market factors.
            Revenue estimates assume competent management and normal market conditions.
            These figures are for planning purposes only and do not constitute financial advice.
            {model && model.assumptions.length > 0 && (
              <details style={{ marginTop: 8 }}>
                <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#14532D' }}>Key Assumptions ({model.assumptions.length})</summary>
                <ul style={{ marginTop: 4, paddingLeft: 16 }}>
                  {model.assumptions.slice(0, 10).map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                  {model.assumptions.length > 10 && <li>...and {model.assumptions.length - 10} more</li>}
                </ul>
              </details>
            )}
          </div>

          <div style={{ fontSize: 9, color: '#6b7280', textAlign: 'center', borderTop: '1px solid rgba(21,128,61,0.15)', paddingTop: 12 }}>
            Generated by OGDEN Land Design Atlas \u2014 {new Date().toLocaleDateString()} \u2014 Estimates for planning purposes only
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Helper components ──────────────────────────────────────────────────────

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ padding: 12, border: '1px solid rgba(21,128,61,0.15)', borderRadius: 10, textAlign: 'center', background: '#F0FDF4' }}>
      <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600, color, fontFamily: "'Fira Code', monospace" }}>{value}</div>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div>
      <div style={{ fontSize: 9, color: '#6b7280', marginBottom: 3, textAlign: 'center' }}>{label}</div>
      <div style={{ height: 6, background: 'rgba(21,128,61,0.1)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: '#15803D', borderRadius: 3, transition: 'width 0.3s' }} />
      </div>
      <div style={{ fontSize: 9, color: '#15803D', textAlign: 'center', marginTop: 2, fontWeight: 600 }}>{Math.round(value)}</div>
    </div>
  );
}
