/**
 * Scenario Comparison PDF — side-by-side comparison of design scenarios.
 */

import type { ExportDataBag } from './index.js';
import { baseLayout, esc, fmtNumber, fmtDollars, fmtPercent, scoreGauge, notAvailable } from './baseLayout.js';

export function renderScenarioComparison(data: ExportDataBag): string {
  const { project: p, payload } = data;
  const scenarios = payload?.scenarios;

  if (!scenarios || scenarios.length === 0) {
    return baseLayout('Scenario Comparison', p.name,
      notAvailable('No scenarios to compare. Create scenarios in the Scenario panel and include them when requesting this export.'));
  }

  // Sort: baseline first, then alphabetical
  const sorted = [...scenarios].sort((a, b) => {
    if (a.isBaseline && !b.isBaseline) return -1;
    if (!a.isBaseline && b.isBaseline) return 1;
    return a.name.localeCompare(b.name);
  });

  // ─── Overview ─────────────────────────────────────────────────
  const overviewSection = `
    <div class="section">
      <h2>Scenarios Overview</h2>
      <p>Comparing ${sorted.length} scenario${sorted.length > 1 ? 's' : ''} for <strong>${esc(p.name)}</strong>.</p>
      <div class="card-grid">
        ${sorted.map((s) => `
          <div class="card">
            <div class="card-header">${s.isBaseline ? '★ BASELINE' : 'VARIANT'}</div>
            <div class="card-value" style="font-size:13pt">${esc(s.name)}</div>
            <p style="font-size:8pt;color:var(--text-secondary);margin-top:4px">${esc(s.description)}</p>
          </div>`).join('')}
      </div>
    </div>`;

  // ─── Design Comparison Table ──────────────────────────────────
  const cols = sorted.map((s) => `<th>${esc(s.name)}</th>`).join('');
  const designRows = [
    { label: 'Zones', values: sorted.map((s) => String(s.zoneCount)) },
    { label: 'Structures', values: sorted.map((s) => String(s.structureCount)) },
    { label: 'Paddocks', values: sorted.map((s) => String(s.paddockCount ?? '—')) },
    { label: 'Crops', values: sorted.map((s) => String(s.cropCount ?? '—')) },
    { label: 'Enterprises', values: sorted.map((s) => s.enterprises.join(', ') || '—') },
  ];

  const designTable = designRows.map((row) => `<tr>
    <td><strong>${row.label}</strong></td>
    ${row.values.map((v) => `<td>${esc(v)}</td>`).join('')}
  </tr>`).join('');

  const designSection = `
    <div class="section">
      <h2>Design Comparison</h2>
      <table>
        <thead><tr><th>Metric</th>${cols}</tr></thead>
        <tbody>${designTable}</tbody>
      </table>
    </div>`;

  // ─── Zone Category Breakdown ──────────────────────────────────
  const allCategories = new Set<string>();
  for (const s of sorted) {
    for (const cat of Object.keys(s.zoneCategories)) allCategories.add(cat);
  }

  let zoneCatSection = '';
  if (allCategories.size > 0) {
    const catRows = [...allCategories].sort().map((cat) => `<tr>
      <td>${esc(cat.replace(/_/g, ' '))}</td>
      ${sorted.map((s) => `<td>${s.zoneCategories[cat] ?? 0}</td>`).join('')}
    </tr>`).join('');

    zoneCatSection = `
      <div class="section">
        <h2>Zone Category Breakdown</h2>
        <table>
          <thead><tr><th>Category</th>${cols}</tr></thead>
          <tbody>${catRows}</tbody>
        </table>
      </div>`;
  }

  // ─── Financial Comparison ─────────────────────────────────────
  const finRows = [
    { label: 'Total Capital (mid)', values: sorted.map((s) => fmtDollars(s.totalCapitalMid)) },
    { label: 'Break-Even Year', values: sorted.map((s) => s.breakEvenYear != null ? `Year ${s.breakEvenYear}` : '10+') },
    { label: 'Annual Revenue (mid)', values: sorted.map((s) => fmtDollars(s.annualRevenueMid)) },
    { label: 'Year 5 Cumulative', values: sorted.map((s) => fmtDollars(s.year5Cashflow)) },
    { label: 'Year 10 Cumulative', values: sorted.map((s) => fmtDollars(s.year10Cashflow)) },
    { label: '10-Year ROI', values: sorted.map((s) => fmtPercent(s.tenYearROI)) },
  ];

  const finTable = finRows.map((row) => `<tr>
    <td><strong>${row.label}</strong></td>
    ${row.values.map((v) => `<td>${v}</td>`).join('')}
  </tr>`).join('');

  const financialSection = `
    <div class="section">
      <h2>Financial Comparison</h2>
      <table>
        <thead><tr><th>Metric</th>${cols}</tr></thead>
        <tbody>${finTable}</tbody>
      </table>
    </div>`;

  // ─── Mission Scores ───────────────────────────────────────────
  const missionGauges = sorted.map((s) => `
    <div style="text-align:center;margin-bottom:16px">
      <h4>${esc(s.name)}</h4>
      ${scoreGauge(s.missionScore.overall, 'Overall', 70)}
      <table style="font-size:8pt;margin-top:8px">
        <tbody>
          <tr><td>Financial</td><td>${fmtNumber(s.missionScore.financial, 0)}</td></tr>
          <tr><td>Ecological</td><td>${fmtNumber(s.missionScore.ecological, 0)}</td></tr>
          <tr><td>Spiritual</td><td>${fmtNumber(s.missionScore.spiritual, 0)}</td></tr>
          <tr><td>Community</td><td>${fmtNumber(s.missionScore.community, 0)}</td></tr>
        </tbody>
      </table>
    </div>`).join('');

  const missionSection = `
    <div class="section">
      <h2>Mission Alignment</h2>
      <div class="card-grid">${missionGauges}</div>
    </div>`;

  // ─── Recommendation ───────────────────────────────────────────
  const first = sorted[0]!;
  const bestROI = sorted.reduce((best, s) => s.tenYearROI > best.tenYearROI ? s : best, first);
  const bestMission = sorted.reduce((best, s) => s.missionScore.overall > best.missionScore.overall ? s : best, first);

  const recommendSection = `
    <div class="section">
      <h2>Recommendation Summary</h2>
      <div class="card-grid-2">
        <div class="card">
          <div class="card-header">Highest Financial Return</div>
          <div class="card-value" style="font-size:14pt">${esc(bestROI.name)}</div>
          <p style="font-size:9pt;color:var(--text-secondary)">10-Year ROI: ${fmtPercent(bestROI.tenYearROI)}</p>
        </div>
        <div class="card">
          <div class="card-header">Best Mission Alignment</div>
          <div class="card-value" style="font-size:14pt">${esc(bestMission.name)}</div>
          <p style="font-size:9pt;color:var(--text-secondary)">Mission Score: ${fmtNumber(bestMission.missionScore.overall, 0)}/100</p>
        </div>
      </div>
      <div class="disclaimer">
        Scenario comparison is based on design inputs and regional benchmarks. All projections
        are estimates and should be validated with professional advice before implementation.
      </div>
    </div>`;

  return baseLayout('Scenario Comparison', p.name,
    overviewSection + designSection + zoneCatSection + financialSection +
    missionSection + recommendSection);
}
