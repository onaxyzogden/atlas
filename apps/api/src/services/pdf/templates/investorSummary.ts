/**
 * Investor Summary PDF — financial highlights, cashflow, break-even, mission scoring.
 */

import type { ExportDataBag } from './index.js';
import {
  baseLayout, esc, fmtNumber, fmtDollars, fmtRange, fmtPercent,
  scoreGauge, notAvailable,
} from './baseLayout.js';

function missionRadar(scores: { overall: number; financial: number; ecological: number; spiritual: number; community: number }): string {
  // 4-axis radar chart as inline SVG
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const r = 70;
  const axes = [
    { label: 'Financial', value: scores.financial, angle: -90 },
    { label: 'Ecological', value: scores.ecological, angle: 0 },
    { label: 'Spiritual', value: scores.spiritual, angle: 90 },
    { label: 'Community', value: scores.community, angle: 180 },
  ];

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  // Grid rings
  const rings = [25, 50, 75, 100];
  const gridLines = rings.map((pct) => {
    const pr = (pct / 100) * r;
    const points = axes.map((a) => {
      const x = cx + pr * Math.cos(toRad(a.angle));
      const y = cy + pr * Math.sin(toRad(a.angle));
      return `${x},${y}`;
    }).join(' ');
    return `<polygon points="${points}" fill="none" stroke="#E5E7EB" stroke-width="0.5" />`;
  }).join('');

  // Axis lines
  const axisLines = axes.map((a) => {
    const x2 = cx + r * Math.cos(toRad(a.angle));
    const y2 = cy + r * Math.sin(toRad(a.angle));
    return `<line x1="${cx}" y1="${cy}" x2="${x2}" y2="${y2}" stroke="#E5E7EB" stroke-width="0.5" />`;
  }).join('');

  // Data polygon
  const dataPoints = axes.map((a) => {
    const pr = (a.value / 100) * r;
    const x = cx + pr * Math.cos(toRad(a.angle));
    const y = cy + pr * Math.sin(toRad(a.angle));
    return `${x},${y}`;
  }).join(' ');

  // Labels
  const labels = axes.map((a) => {
    const lr = r + 20;
    const x = cx + lr * Math.cos(toRad(a.angle));
    const y = cy + lr * Math.sin(toRad(a.angle));
    return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central"
      font-family="'Fira Sans', sans-serif" font-size="8" fill="#4B5563">${a.label} (${Math.round(a.value)})</text>`;
  }).join('');

  return `
    <div style="text-align:center">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        ${gridLines}${axisLines}
        <polygon points="${dataPoints}" fill="rgba(21,128,61,0.15)" stroke="#15803D" stroke-width="2" />
        ${labels}
      </svg>
    </div>`;
}

export function renderInvestorSummary(data: ExportDataBag): string {
  const { project: p, assessment: a, payload } = data;
  const fin = payload?.financial;

  // ─── Property Context ─────────────────────────────────────────
  const propertySection = `
    <div class="section">
      <h2>Property Overview</h2>
      <div class="card-grid">
        <div class="card">
          <div class="card-header">Project</div>
          <div class="card-value" style="font-size:14pt">${esc(p.name)}</div>
          <p style="font-size:8pt;color:var(--text-secondary);margin-top:4px">${esc(p.project_type?.replace(/_/g, ' ') ?? '')}</p>
        </div>
        <div class="card">
          <div class="card-header">Acreage</div>
          <div class="card-value" style="font-size:14pt">${p.acreage ? fmtNumber(p.acreage, 2) : '—'}</div>
        </div>
        <div class="card">
          <div class="card-header">Site Score</div>
          <div class="card-value" style="font-size:14pt">${a?.overall_score != null ? fmtNumber(a.overall_score, 0) + '/100' : '—'}</div>
        </div>
      </div>
      ${p.description ? `<p>${esc(p.description)}</p>` : ''}
    </div>`;

  if (!fin) {
    return baseLayout('Investor Summary', p.name,
      propertySection + notAvailable('Financial Model — Export from the Financial Planning tab to include investment analysis, cashflow projections, and mission scoring.'));
  }

  // ─── Financial Highlights ─────────────────────────────────────
  const breakEvenLabel = fin.breakEven.breakEvenYear.mid != null
    ? `Year ${fin.breakEven.breakEvenYear.mid}` : '10+';

  const highlightsSection = `
    <div class="section">
      <h2>Financial Highlights</h2>
      <div class="card-grid">
        <div class="card">
          <div class="card-header">Total Investment (est.)</div>
          <div class="card-value" style="font-size:16pt">${fmtRange(fin.totalInvestment)}</div>
        </div>
        <div class="card">
          <div class="card-header">Break-Even (est.)</div>
          <div class="card-value" style="font-size:16pt">${breakEvenLabel}</div>
        </div>
        <div class="card">
          <div class="card-header">10-Year ROI</div>
          <div class="card-value" style="font-size:16pt">${fmtPercent(fin.breakEven.tenYearROI.mid)}</div>
          <p style="font-size:8pt;color:var(--text-muted)">${fmtPercent(fin.breakEven.tenYearROI.low)} – ${fmtPercent(fin.breakEven.tenYearROI.high)}</p>
        </div>
      </div>
      <div class="card-grid-2">
        <div class="card">
          <div class="card-header">Annual Revenue at Maturity</div>
          <div class="card-value" style="font-size:14pt">${fmtRange(fin.annualRevenueAtMaturity)}</div>
        </div>
        <div class="card">
          <div class="card-header">Enterprises</div>
          <p>${fin.enterprises.map((e) => `<span class="badge badge-type" style="margin:2px">${esc(e)}</span>`).join(' ')}</p>
        </div>
      </div>
    </div>`;

  // ─── Capital Costs ────────────────────────────────────────────
  let costsSection = '';
  if (fin.costLineItems.length > 0) {
    const rows = fin.costLineItems.map((item) => `<tr>
      <td>${esc(item.name)}</td>
      <td><span class="badge badge-phase">${esc(item.phase)}</span></td>
      <td>${esc(item.category)}</td>
      <td style="text-align:right">${fmtRange(item.cost)}</td>
    </tr>`).join('');

    costsSection = `
      <div class="section">
        <h2>Capital Costs</h2>
        <table>
          <thead><tr><th>Item</th><th>Phase</th><th>Category</th><th style="text-align:right">Estimate</th></tr></thead>
          <tbody>${rows}
            <tr class="total-row">
              <td colspan="3">Total</td>
              <td style="text-align:right">${fmtRange(fin.totalInvestment)}</td>
            </tr>
          </tbody>
        </table>
      </div>`;
  }

  // ─── Revenue Streams ──────────────────────────────────────────
  let revenueSection = '';
  if (fin.revenueStreams.length > 0) {
    const rows = fin.revenueStreams.map((s) => `<tr>
      <td>${esc(s.name)}</td>
      <td>${esc(s.enterprise)}</td>
      <td>${s.startYear != null ? `Year ${s.startYear}` : '—'}</td>
      <td style="text-align:right">${fmtRange(s.annualRevenue)}/yr</td>
    </tr>`).join('');

    revenueSection = `
      <div class="section">
        <h2>Revenue Streams</h2>
        <table>
          <thead><tr><th>Stream</th><th>Enterprise</th><th>Start</th><th style="text-align:right">Annual (est.)</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  // ─── Cashflow Projection ──────────────────────────────────────
  let cashflowSection = '';
  if (fin.cashflow.length > 0) {
    const rows = fin.cashflow.map((yr) => `<tr>
      <td>Year ${yr.year}</td>
      <td style="text-align:right">${fmtDollars(yr.capitalCosts.mid)}</td>
      <td style="text-align:right">${fmtDollars(yr.revenue.mid)}</td>
      <td style="text-align:right;color:${yr.netCashflow.mid >= 0 ? 'var(--earth-green)' : 'var(--danger)'}">${fmtDollars(yr.netCashflow.mid)}</td>
      <td style="text-align:right;color:${yr.cumulativeCashflow.mid >= 0 ? 'var(--earth-green)' : 'var(--danger)'}">${fmtDollars(yr.cumulativeCashflow.mid)}</td>
    </tr>`).join('');

    cashflowSection = `
      <div class="section">
        <h2>10-Year Cashflow Projection (Mid Estimate)</h2>
        <table>
          <thead><tr><th>Year</th><th style="text-align:right">Capital</th><th style="text-align:right">Revenue</th><th style="text-align:right">Net</th><th style="text-align:right">Cumulative</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  // ─── Mission Alignment ────────────────────────────────────────
  const missionSection = `
    <div class="section">
      <h2>Mission Alignment</h2>
      <div class="card-grid-2">
        <div>
          ${missionRadar(fin.missionScore)}
        </div>
        <div>
          ${scoreGauge(fin.missionScore.overall, 'Overall Mission Score', 100)}
          <div style="margin-top:12px">
            <table>
              <tbody>
                <tr><td>Financial</td><td>${fmtNumber(fin.missionScore.financial, 0)}/100</td></tr>
                <tr><td>Ecological</td><td>${fmtNumber(fin.missionScore.ecological, 0)}/100</td></tr>
                <tr><td>Spiritual</td><td>${fmtNumber(fin.missionScore.spiritual, 0)}/100</td></tr>
                <tr><td>Community</td><td>${fmtNumber(fin.missionScore.community, 0)}/100</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>`;

  // ─── Assumptions & Disclaimer ─────────────────────────────────
  const assumptionsList = fin.assumptions.length > 0
    ? `<ul>${fin.assumptions.slice(0, 15).map((a) => `<li>${esc(a)}</li>`).join('')}</ul>`
    : '<p>No assumptions recorded.</p>';

  const disclaimerSection = `
    <div class="section">
      <h2>Assumptions</h2>
      ${assumptionsList}
      <div class="disclaimer">
        <strong>Estimate Disclaimer:</strong> All financial projections are estimates based on regional
        benchmarks and design inputs. Actual costs and revenues will vary based on market conditions,
        contractor availability, site-specific factors, and management decisions. These figures are
        intended for planning purposes and should not be treated as guarantees. Professional financial
        and agricultural advice is recommended before committing capital.
      </div>
    </div>`;

  return baseLayout('Investor Summary', p.name,
    propertySection + highlightsSection + costsSection + revenueSection +
    cashflowSection + missionSection + disclaimerSection);
}
