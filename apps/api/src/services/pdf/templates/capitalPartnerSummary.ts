/**
 * Capital Partner Summary PDF — capital plan, cashflow projection, mission scoring.
 *
 * Audience: capital partners & allies considering charitable donation, restricted
 * donation, qard ḥasan, in-kind contribution, or sponsorship. The financial
 * analysis is informational (planning estimate), not a sale of future returns.
 */

import type { FinancialPayload } from '@ogden/shared';
import type { ExportDataBag } from './index.js';
import {
  baseLayout, esc, fmtNumber, fmtDollars, fmtRange, fmtPercent,
  scoreGauge, notAvailable,
} from './baseLayout.js';

type JCurvePayload = NonNullable<FinancialPayload['jCurve']>;

/**
 * §D.7 — Render the J-curve as inline SVG for PDF embed. Mirrors the
 * in-app `<JCurveChart>` visual contract: cumulative net cashflow as
 * the primary y-axis, optional cumulative natural-capital appreciation
 * as a secondary axis, with trough + breakeven markers and phase bands.
 *
 * Covenant: appreciation of stewarded land value, not investor yield.
 */
function renderJCurveSvg(jCurve: JCurvePayload | undefined): string {
  if (!jCurve || jCurve.transitionYears.length === 0) return '';

  // If the client pre-rendered the chart (future option), use it verbatim.
  if (jCurve.chartSvg) return jCurve.chartSvg;

  const rows = jCurve.transitionYears;
  const W = 480;
  const H = 220;
  const padL = 44;
  const padR = 48;
  const padT = 24;
  const padB = 26;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const primaryValues = rows.map((r) => r.cumulativeNetCashflow);
  const primaryMin = Math.min(0, ...primaryValues);
  const primaryMax = Math.max(0, ...primaryValues);
  const primaryRange = primaryMax - primaryMin || 1;

  const natCap = jCurve.naturalCapitalAppreciationByYear ?? null;
  const natCapYears = natCap ? Object.keys(natCap).map(Number).sort((a, b) => a - b) : [];
  const hasSecondary = natCapYears.length > 0;
  const secondaryMax = hasSecondary
    ? Math.max(0, ...natCapYears.map((y) => natCap![y] ?? 0)) || 1
    : 1;

  const slotW = innerW / Math.max(1, rows.length - 1);
  const xFor = (idx: number) => padL + slotW * idx;
  const yPrimary = (v: number) => padT + innerH - ((v - primaryMin) / primaryRange) * innerH;
  const ySecondary = (v: number) => padT + innerH - (v / secondaryMax) * innerH;
  const zeroY = yPrimary(0);

  // Phase bands.
  const bands: Array<{ phase: 'establishment' | 'build-up' | 'maturation'; startIdx: number; endIdx: number }> = [];
  if (rows.length > 0) {
    let cur = { phase: rows[0]!.phase, startIdx: 0, endIdx: 0 };
    for (let i = 1; i < rows.length; i++) {
      if (rows[i]!.phase === cur.phase) {
        cur.endIdx = i;
      } else {
        bands.push(cur);
        cur = { phase: rows[i]!.phase, startIdx: i, endIdx: i };
      }
    }
    bands.push(cur);
  }
  const bandFill: Record<string, string> = {
    'establishment': 'rgba(196, 162, 101, 0.10)',
    'build-up': 'rgba(45, 122, 79, 0.10)',
    'maturation': 'rgba(21, 87, 36, 0.12)',
  };
  const bandLabel: Record<string, string> = {
    'establishment': 'Establishment',
    'build-up': 'Build-up',
    'maturation': 'Maturation',
  };

  const bandSvg = bands.map((b) => {
    const x0 = Math.max(padL, xFor(b.startIdx) - slotW / 2);
    const x1 = Math.min(W - padR, xFor(b.endIdx) + slotW / 2);
    const w = Math.max(0, x1 - x0);
    const labelX = x0 + w / 2;
    return `
      <rect x="${x0}" y="${padT}" width="${w}" height="${innerH}" fill="${bandFill[b.phase]}" />
      <text x="${labelX}" y="${padT - 8}" text-anchor="middle" font-size="9" fill="#5b6354">${bandLabel[b.phase]}</text>
    `;
  }).join('');

  const primaryPath = rows
    .map((r, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yPrimary(r.cumulativeNetCashflow)}`)
    .join(' ');

  const secondaryPath = hasSecondary
    ? rows
        .map((r, i) => {
          const v = natCap![r.year] ?? 0;
          return `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${ySecondary(v)}`;
        })
        .join(' ')
    : '';

  const troughIdx = jCurve.troughYear != null
    ? rows.findIndex((r) => r.year === jCurve.troughYear)
    : -1;
  const beIdx = jCurve.breakevenYear != null
    ? rows.findIndex((r) => r.year === jCurve.breakevenYear)
    : -1;

  const fmtSvgUsd = (n: number) => {
    const abs = Math.abs(n);
    const sign = n < 0 ? '−' : '';
    if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
    return `${sign}$${abs.toFixed(0)}`;
  };

  const lastYear = rows[rows.length - 1]!.year;
  const natCapFinal = hasSecondary ? natCap![lastYear] ?? 0 : 0;

  return `
    <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:520px;height:auto;display:block;margin:0 auto">
      ${bandSvg}
      <line x1="${padL}" x2="${W - padR}" y1="${padT}" y2="${padT}" stroke="#d8d8c5" stroke-width="0.5" />
      <line x1="${padL}" x2="${W - padR}" y1="${padT + innerH}" y2="${padT + innerH}" stroke="#d8d8c5" stroke-width="0.5" />
      <line x1="${padL}" x2="${W - padR}" y1="${zeroY}" y2="${zeroY}" stroke="#8b9484" stroke-width="0.8" stroke-dasharray="2 2" />

      <text x="6" y="${padT + 4}" font-size="8" fill="#5b6354">${fmtSvgUsd(primaryMax)}</text>
      <text x="6" y="${zeroY + 3}" font-size="8" fill="#5b6354">$0</text>
      <text x="6" y="${padT + innerH}" font-size="8" fill="#5b6354">${fmtSvgUsd(primaryMin)}</text>

      ${hasSecondary ? `
        <text x="${W - 4}" y="${padT + 4}" font-size="8" fill="#2d7a4f" text-anchor="end">${fmtSvgUsd(secondaryMax)}</text>
        <text x="${W - 4}" y="${padT + innerH}" font-size="8" fill="#2d7a4f" text-anchor="end">$0</text>
      ` : ''}

      ${troughIdx >= 0 ? `
        <line x1="${xFor(troughIdx)}" x2="${xFor(troughIdx)}" y1="${padT}" y2="${padT + innerH}" stroke="#a23b3b" stroke-width="0.8" stroke-dasharray="3 2" />
        <text x="${xFor(troughIdx) + 4}" y="${padT + innerH - 6}" font-size="8" fill="#a23b3b">Trough Yr ${jCurve.troughYear} · ${fmtSvgUsd(jCurve.troughValue)}</text>
      ` : ''}

      ${beIdx >= 0 ? `
        <line x1="${xFor(beIdx)}" x2="${xFor(beIdx)}" y1="${padT}" y2="${padT + innerH}" stroke="#2d7a4f" stroke-width="0.8" stroke-dasharray="3 2" />
        <text x="${xFor(beIdx) + 4}" y="${padT + 12}" font-size="8" fill="#2d7a4f">BE Yr ${jCurve.breakevenYear}</text>
      ` : ''}

      ${secondaryPath ? `<path d="${secondaryPath}" fill="none" stroke="#2d7a4f" stroke-width="1.5" stroke-dasharray="4 2" />` : ''}
      <path d="${primaryPath}" fill="none" stroke="#8a6d1e" stroke-width="2" />

      ${rows.map((r, i) => `<circle cx="${xFor(i)}" cy="${yPrimary(r.cumulativeNetCashflow)}" r="1.8" fill="#8a6d1e" />`).join('')}

      ${rows.map((r, i) => `<text x="${xFor(i)}" y="${H - 8}" font-size="7" fill="#5b6354" text-anchor="middle">${r.year}</text>`).join('')}

      ${hasSecondary ? `<text x="${W - padR}" y="${H - 8}" font-size="7" fill="#2d7a4f" text-anchor="end">Nat-cap @ Yr ${lastYear}: ${fmtSvgUsd(natCapFinal)}</text>` : ''}
    </svg>
  `;
}

function missionRadar(scores: { overall: number; financial: number; ecological: number; spiritual: number; community: number }): string {
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

  const axisLines = axes.map((a) => {
    const x2 = cx + r * Math.cos(toRad(a.angle));
    const y2 = cy + r * Math.sin(toRad(a.angle));
    return `<line x1="${cx}" y1="${cy}" x2="${x2}" y2="${y2}" stroke="#E5E7EB" stroke-width="0.5" />`;
  }).join('');

  const dataPoints = axes.map((a) => {
    const pr = (a.value / 100) * r;
    const x = cx + pr * Math.cos(toRad(a.angle));
    const y = cy + pr * Math.sin(toRad(a.angle));
    return `${x},${y}`;
  }).join(' ');

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

export function renderCapitalPartnerSummary(data: ExportDataBag): string {
  const { project: p, assessment: a, payload } = data;
  const fin = payload?.financial;

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
    return baseLayout('Capital Partner Summary', p.name,
      propertySection + notAvailable('Financial Model — Export from the Financial Planning tab to include capital plan, cashflow projection, and mission scoring.'));
  }

  const breakEvenLabel = fin.breakEven.breakEvenYear.mid != null
    ? `Year ${fin.breakEven.breakEvenYear.mid}` : '10+';

  const highlightsSection = `
    <div class="section">
      <h2>Capital Plan Highlights</h2>
      <div class="card-grid">
        <div class="card">
          <div class="card-header">Total Capital Required (est.)</div>
          <div class="card-value" style="font-size:16pt">${fmtRange(fin.totalInvestment)}</div>
        </div>
        <div class="card">
          <div class="card-header">Operating Self-Sufficiency (est.)</div>
          <div class="card-value" style="font-size:16pt">${breakEvenLabel}</div>
        </div>
        <div class="card">
          <div class="card-header">Operating Estimate at Maturity (Year 10)</div>
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

  // §D.7 — J-curve section: regeneration trajectory from establishment
  // through build-up to maturation, with trough + breakeven annotations
  // and optional cumulative natural-capital appreciation overlay.
  let jCurveSection = '';
  if (fin.jCurve && fin.jCurve.transitionYears.length > 0) {
    const jc = fin.jCurve;
    const troughLabel = jc.troughYear != null
      ? `Year ${jc.troughYear} (${fmtDollars(jc.troughValue)})`
      : '—';
    const beLabel = jc.breakevenYear != null
      ? `Year ${jc.breakevenYear}`
      : 'Beyond 10-year horizon';
    const lastYear = jc.transitionYears[jc.transitionYears.length - 1]!.year;
    const natCapAtMaturity = jc.naturalCapitalAppreciationByYear?.[lastYear] ?? null;
    jCurveSection = `
      <div class="section">
        <h2>Regeneration Trajectory (J-curve)</h2>
        <p style="font-size:9pt;color:var(--text-muted);margin-bottom:8px">
          The early-year regeneration spend (establishment) is the lowest point of
          the operating profile. Build-up rebuilds soil capacity; maturation
          surfaces the operating bridge. The dashed secondary line, when shown,
          is cumulative <strong>appreciation of stewarded land value</strong> —
          the value of carbon sequestered into the soil. This is informational
          appreciation of stewardship, <em>not</em> a yield to capital partners.
        </p>
        ${renderJCurveSvg(jc)}
        <div class="card-grid" style="margin-top:12px">
          <div class="card">
            <div class="card-header">Trough (lowest cumulative)</div>
            <div class="card-value" style="font-size:12pt">${esc(troughLabel)}</div>
          </div>
          <div class="card">
            <div class="card-header">Operating Breakeven</div>
            <div class="card-value" style="font-size:12pt">${esc(beLabel)}</div>
          </div>
          ${natCapAtMaturity != null ? `
          <div class="card">
            <div class="card-header">Nat-Cap Appreciation @ Yr ${lastYear}</div>
            <div class="card-value" style="font-size:12pt">${fmtDollars(natCapAtMaturity)}</div>
          </div>` : ''}
        </div>
      </div>`;
  }

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

  // L.1 — first 15 assumptions render on page 1; any remainder continues on a
  // dedicated page-2 section with continuous numbering (<ol start="16">) so the
  // full list is surfaced rather than silently truncated.
  const FIRST_PAGE_ASSUMPTIONS = 15;
  const firstPageAssumptions = fin.assumptions.slice(0, FIRST_PAGE_ASSUMPTIONS);
  const continuationAssumptions = fin.assumptions.slice(FIRST_PAGE_ASSUMPTIONS);

  const assumptionsList = fin.assumptions.length > 0
    ? `<ul>${firstPageAssumptions.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>`
    : '<p>No assumptions recorded.</p>';

  const nc = fin.naturalCapital;
  const dominantLabelMap: Record<string, string> = {
    carbonStorage: 'carbon sequestration',
    pollination: 'pollination services',
    waterRegulation: 'flood attenuation & baseflow',
    waterQuality: 'water quality regulation',
    habitatProvision: 'habitat provision',
    erosionControl: 'erosion control',
    recreation: 'recreation & aesthetic value',
  };
  const naturalCapitalSection = nc ? `
    <div class="section">
      <h2>Natural-Capital Appreciation (informational)</h2>
      <p style="font-size:9pt;color:var(--text-muted);margin-bottom:8px">
        Annualized ecosystem-services value of the stewarded land, derived from
        on-site biophysical layers (canopy, wetlands, soils) using de Groot /
        Costanza per-biome coefficients. This is <strong>appreciation of
        stewardship value</strong>, not revenue to capital partners and not a
        yield on contributed capital.
      </p>
      <div class="card-grid">
        <div class="card">
          <div class="card-header">Per-Hectare Value</div>
          <div class="card-value" style="font-size:14pt">${fmtDollars(nc.totalUsdHaYr)}/ha/yr</div>
        </div>
        <div class="card">
          <div class="card-header">Site Total (annualized)</div>
          <div class="card-value" style="font-size:14pt">${nc.totalUsdYr != null ? fmtDollars(nc.totalUsdYr) + '/yr' : '—'}</div>
        </div>
        <div class="card">
          <div class="card-header">Dominant Service</div>
          <div class="card-value" style="font-size:12pt">${esc(dominantLabelMap[nc.dominantService] ?? nc.dominantService)}</div>
        </div>
      </div>
      <p style="font-size:9pt;margin-top:8px">${esc(nc.narrative)}</p>
    </div>` : '';

  const capitalChannelsSection = `
    <div class="section">
      <h2>Permitted Capital Channels</h2>
      <p>This project accepts capital under the following structures:</p>
      <ul>
        <li><strong>Charitable donation</strong> — unrestricted gift to the project sponsor.</li>
        <li><strong>Restricted donation</strong> — gift earmarked for a specific project component or phase.</li>
        <li><strong>Qarḍ ḥasan</strong> — interest-free loan, repaid from project cashflow on agreed terms.</li>
        <li><strong>In-kind contribution</strong> — materials, labor, equipment, or land use.</li>
        <li><strong>Sponsorship</strong> — naming or recognition of project elements in exchange for support.</li>
      </ul>
      <p style="font-size:9pt;color:var(--text-muted);margin-top:8px">
        A future post-acquisition yield-share for capital partners is contemplated as a
        <em>membership benefit</em> (entitlement of belonging), not as a return on advance purchase.
        Any such structure is subject to Scholar Council review prior to offering.
      </p>
    </div>`;

  const disclaimerSection = `
    <div class="section">
      <h2>Assumptions</h2>
      ${assumptionsList}
      <div class="disclaimer">
        <strong>Estimate Disclaimer:</strong> All financial projections are estimates based on regional
        benchmarks and design inputs. Actual costs and revenues will vary based on market conditions,
        contractor availability, site-specific factors, and management decisions. These figures are
        intended for planning purposes and should not be treated as guarantees or as an offer to sell
        future returns. Professional financial and agricultural advice is recommended before
        committing capital.
      </div>
    </div>`;

  // L.1 — page-2 continuation for assumptions beyond the first 15. Reuses the
  // existing `.cover { page-break-after: always }` machinery via an explicit
  // page-break-before so the list starts on a fresh page; numbering resumes at
  // 16 so readers don't lose count.
  const assumptionsContinuationSection = continuationAssumptions.length > 0
    ? `
    <section class="cover" style="page-break-before: always;">
      <div class="section">
        <h2>Assumptions (continued)</h2>
        <ol start="${FIRST_PAGE_ASSUMPTIONS + 1}">
          ${continuationAssumptions.map((a) => `<li>${esc(a)}</li>`).join('')}
        </ol>
      </div>
    </section>`
    : '';

  return baseLayout('Capital Partner Summary', p.name,
    propertySection + highlightsSection + costsSection + revenueSection +
    cashflowSection + jCurveSection + missionSection + naturalCapitalSection +
    capitalChannelsSection + disclaimerSection + assumptionsContinuationSection);
}
