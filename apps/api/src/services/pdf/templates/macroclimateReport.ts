/**
 * Macroclimate & Hazards Report PDF — Observe Module 2 export.
 *
 * Renders the climate-layer summary KPI strip, monthly normals table,
 * solar opportunities, the full hazards inventory with risk × mitigation
 * sort, hazard counts mini-grids, and a heuristic Recommended Actions
 * block. Sixth Observe export following the locked 4-file recipe.
 */

import type { ExportDataBag } from './index.js';
import { baseLayout, esc, fmtDate, fmtNumber, notAvailable } from './baseLayout.js';

type RiskLevel = 'low' | 'moderate' | 'high';
type TrendDir = 'up' | 'flat' | 'down';
type StatusKind = 'monitoring' | 'planned' | 'in_progress' | 'mitigated';

interface HazardEntry {
  id: string;
  kind: string;
  label: string;
  risk: RiskLevel;
  trend: TrendDir;
  status: StatusKind;
  mitigationPct: number;
  window?: string;
  notes?: string;
  lat?: number;
  lng?: number;
  createdAt: number;
  updatedAt: number;
}

interface MacroEntry {
  climateSummary?: Record<string, unknown>;
  monthlyNormals?: { month: string; precipMm?: number; meanMaxC?: number; meanMinC?: number }[];
  solarOpportunities?: [string, string][];
  hazards: HazardEntry[];
  hazardCounts: {
    total: number;
    active: number;
    mitigated: number;
    monitoring: number;
    in_progress: number;
    planned: number;
    highRisk: number;
    moderateRisk: number;
    lowRisk: number;
    averageMitigationPct: number;
  };
}

const RISK_COLOR: Record<RiskLevel, string> = {
  low: '#15803D',
  moderate: '#CA8A04',
  high: '#DC2626',
};
const RISK_LABEL: Record<RiskLevel, string> = {
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
};
const TREND_ARROW: Record<TrendDir, string> = { up: '↑', flat: '→', down: '↓' };
const TREND_COLOR: Record<TrendDir, string> = {
  up: '#DC2626',
  flat: '#6B7280',
  down: '#15803D',
};
const STATUS_LABEL: Record<StatusKind, string> = {
  monitoring: 'Monitoring',
  planned: 'Planned',
  in_progress: 'In progress',
  mitigated: 'Mitigated',
};
const STATUS_COLOR: Record<StatusKind, string> = {
  monitoring: '#CA8A04',
  planned: '#0F766E',
  in_progress: '#1D4ED8',
  mitigated: '#15803D',
};
const RISK_WEIGHT: Record<RiskLevel, number> = { low: 1, moderate: 2, high: 3 };

function pickStr(s: Record<string, unknown> | undefined, key: string): string | null {
  const v = s?.[key];
  return typeof v === 'string' ? v : null;
}
function pickNum(s: Record<string, unknown> | undefined, key: string): number | null {
  const v = s?.[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

export function renderMacroclimateReport(data: ExportDataBag): string {
  const { project: p, payload } = data;
  const macro = payload?.macroclimate;

  if (!macro) {
    return baseLayout(
      'Macroclimate & Hazards Report',
      p.name,
      notAvailable(
        'No macroclimate context has been captured yet. Use the Macroclimate & Hazards module in the Observe stage to fetch a climate layer and log natural hazards.',
      ),
    );
  }

  const entry: MacroEntry = macro;
  const summary = entry.climateSummary;
  const hazards = [...entry.hazards].sort((a, b) => {
    const ra = RISK_WEIGHT[a.risk] - (a.mitigationPct || 0) / 100;
    const rb = RISK_WEIGHT[b.risk] - (b.mitigationPct || 0) / 100;
    return rb - ra;
  });
  const counts = entry.hazardCounts;
  const normals = entry.monthlyNormals ?? [];
  const opportunities = entry.solarOpportunities ?? [];

  const hardinessZone = pickStr(summary, 'hardiness_zone');
  const precipMm = pickNum(summary, 'annual_precip_mm');
  const solarKwh = pickNum(summary, 'solar_radiation_kwh_m2_day');
  const seasonDays = pickNum(summary, 'growing_season_days');
  const prevailingWind = pickStr(summary, 'prevailing_wind');
  const lastFrost = pickStr(summary, 'last_frost_date');
  const firstFrost = pickStr(summary, 'first_frost_date');

  // ─── Hero ─────────────────────────────────────────────────────────
  const hero = `
    <div class="card" style="background:linear-gradient(135deg,#ECFDF5 0%,#FEF3C7 100%);border:none;padding:28px;text-align:center">
      <h2 style="border:none;margin:0 0 8px;color:#14532D;font-size:18pt">Macroclimate & Hazards synthesis</h2>
      <p style="font-size:11pt;color:#4B5563;max-width:560px;margin:0 auto">
        ${hardinessZone ? `Hardiness zone <strong>${esc(hardinessZone)}</strong> · ` : ''}
        ${counts.total} hazard${counts.total === 1 ? '' : 's'} logged ·
        ${counts.averageMitigationPct}% average mitigation
        captured for ${esc(p.name)}.
        ${
          counts.highRisk > 0
            ? `${counts.highRisk} high-risk item${counts.highRisk === 1 ? '' : 's'} need attention.`
            : counts.total === 0
              ? 'No hazards yet — log frost, wind, flood and fire risks to start the picture.'
              : 'No high-risk items outstanding.'
        }
      </p>
    </div>`;

  // ─── KPI strip ────────────────────────────────────────────────────
  const kpiCard = (label: string, value: string, accent: string, note?: string) => `
    <div class="card" style="border-left:4px solid ${accent}">
      <div class="card-header">${esc(label)}</div>
      <div class="card-value" style="color:${accent}">${value}</div>
      ${note ? `<p style="font-size:9pt;color:#4B5563;margin:6px 0 0">${esc(note)}</p>` : ''}
    </div>`;

  const kpiStrip = `
    <h2>Climate summary</h2>
    <div class="card-grid">
      ${kpiCard(
        'Hardiness zone',
        hardinessZone ?? '—',
        hardinessZone ? '#0F766E' : '#6B7280',
        'USDA classification',
      )}
      ${kpiCard(
        'Annual precip',
        precipMm != null ? `${fmtNumber(precipMm, 0)} mm` : '—',
        precipMm != null ? '#1D4ED8' : '#6B7280',
        precipMm != null ? 'Long-term mean' : 'No layer fetched yet',
      )}
      ${kpiCard(
        'Solar radiation',
        solarKwh != null ? `${solarKwh.toFixed(1)} kWh/m²/d` : '—',
        solarKwh != null ? '#CA8A04' : '#6B7280',
        solarKwh != null ? 'Daily average' : 'Sun data pending',
      )}
      ${kpiCard(
        'Growing season',
        seasonDays != null ? `${Math.round(seasonDays)} days` : '—',
        seasonDays != null ? '#15803D' : '#6B7280',
        'Frost-free window',
      )}
    </div>`;

  // ─── Monthly normals table ────────────────────────────────────────
  const normalsSection =
    normals.length === 0
      ? ''
      : `
        <h2>Monthly climate normals</h2>
        <table>
          <thead>
            <tr>
              <th style="width:90px">Month</th>
              <th style="width:100px">Precip</th>
              <th style="width:100px">Mean max</th>
              <th style="width:100px">Mean min</th>
            </tr>
          </thead>
          <tbody>
            ${normals
              .map(
                (n) => `
              <tr>
                <td><strong>${esc(n.month)}</strong></td>
                <td>${n.precipMm != null ? `${fmtNumber(n.precipMm, 0)} mm` : '<span style="color:#9CA3AF">—</span>'}</td>
                <td>${n.meanMaxC != null ? `${n.meanMaxC.toFixed(1)}°C` : '<span style="color:#9CA3AF">—</span>'}</td>
                <td>${n.meanMinC != null ? `${n.meanMinC.toFixed(1)}°C` : '<span style="color:#9CA3AF">—</span>'}</td>
              </tr>`,
              )
              .join('')}
          </tbody>
        </table>`;

  // ─── Hazard inventory table ───────────────────────────────────────
  const riskBadge = (r: RiskLevel) => `
    <span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:8.5pt;font-weight:600;color:white;background:${RISK_COLOR[r]}">${RISK_LABEL[r]}</span>`;
  const statusBadge = (s: StatusKind) => `
    <span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:8.5pt;font-weight:600;color:white;background:${STATUS_COLOR[s]}">${STATUS_LABEL[s]}</span>`;
  const trendIcon = (t: TrendDir) => `<span style="color:${TREND_COLOR[t]};font-weight:600">${TREND_ARROW[t]}</span>`;
  const mitigationBar = (pct: number) => `
    <div style="display:flex;align-items:center;gap:6px">
      <div style="flex:1;height:6px;background:#E5E7EB;border-radius:3px;overflow:hidden">
        <div style="width:${Math.max(0, Math.min(100, pct))}%;height:100%;background:#15803D"></div>
      </div>
      <span style="font-size:9pt;color:#4B5563">${Math.round(pct)}%</span>
    </div>`;

  const hazardTable =
    hazards.length === 0
      ? `<p style="font-size:9.5pt;color:#9CA3AF;font-style:italic">No hazards logged yet — open the Macroclimate module to add one.</p>`
      : `<table>
          <thead>
            <tr>
              <th style="width:80px">Kind</th>
              <th>Label</th>
              <th style="width:75px">Risk</th>
              <th style="width:40px">Trend</th>
              <th style="width:90px">Status</th>
              <th style="width:120px">Mitigation</th>
              <th style="width:80px">Window</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${hazards
              .map(
                (h) => `
              <tr>
                <td style="font-size:9pt;text-transform:capitalize">${esc(h.kind)}</td>
                <td><strong>${esc(h.label)}</strong></td>
                <td>${riskBadge(h.risk)}</td>
                <td>${trendIcon(h.trend)}</td>
                <td>${statusBadge(h.status)}</td>
                <td>${mitigationBar(h.mitigationPct)}</td>
                <td style="font-size:9pt">${h.window ? esc(h.window) : '<span style="color:#9CA3AF">—</span>'}</td>
                <td style="font-size:9pt;color:#4B5563">${h.notes ? esc(h.notes) : '<span style="color:#9CA3AF">—</span>'}</td>
              </tr>`,
              )
              .join('')}
          </tbody>
        </table>`;

  const hazardSection = `
    <h2>Hazard inventory</h2>
    ${hazardTable}`;

  // ─── Hazard counts mini-grids ─────────────────────────────────────
  const countCard = (label: string, value: number | string, accent: string, note?: string) => `
    <div class="card" style="border-left:4px solid ${accent}">
      <div class="card-header">${esc(label)}</div>
      <div class="card-value" style="color:${accent}">${value}</div>
      ${note ? `<p style="font-size:9pt;color:#4B5563;margin:6px 0 0">${esc(note)}</p>` : ''}
    </div>`;

  const countsGrid =
    counts.total === 0
      ? ''
      : `
        <h2>Hazard status</h2>
        <div class="card-grid">
          ${countCard('Active', counts.active, counts.active > 0 ? '#DC2626' : '#15803D', 'Not yet mitigated')}
          ${countCard('Mitigated', counts.mitigated, '#15803D', 'Closed out')}
          ${countCard('Average mitigation', `${counts.averageMitigationPct}%`, '#0F766E', 'Across all hazards')}
        </div>
        <h2>By risk &amp; status</h2>
        <div class="card-grid">
          ${countCard('High risk', counts.highRisk, counts.highRisk > 0 ? '#DC2626' : '#6B7280')}
          ${countCard('Moderate', counts.moderateRisk, counts.moderateRisk > 0 ? '#CA8A04' : '#6B7280')}
          ${countCard('Low risk', counts.lowRisk, '#15803D')}
          ${countCard('Monitoring', counts.monitoring, '#CA8A04')}
          ${countCard('In progress', counts.in_progress, '#1D4ED8')}
          ${countCard('Planned', counts.planned, '#0F766E')}
        </div>`;

  // ─── Solar / climate opportunities list ───────────────────────────
  const oppsSection =
    opportunities.length === 0
      ? ''
      : `
        <h2>Climate opportunities</h2>
        <ul style="margin:0;padding:0 0 0 18px">
          ${opportunities
            .map(
              ([label, value]) => `
            <li style="margin-bottom:6px;font-size:10pt">
              <strong>${esc(label)}</strong>
              <span style="color:#6B7280"> — ${esc(value)}</span>
            </li>`,
            )
            .join('')}
        </ul>`;

  // ─── Frost windows (if available) ─────────────────────────────────
  const frostBlock =
    lastFrost || firstFrost || prevailingWind
      ? `
        <h2>Seasonal markers</h2>
        <div class="card-grid">
          ${countCard('Last spring frost', lastFrost ?? '—', lastFrost ? '#0F766E' : '#6B7280', 'Average date')}
          ${countCard('First fall frost', firstFrost ?? '—', firstFrost ? '#0F766E' : '#6B7280', 'Average date')}
          ${countCard('Prevailing wind', prevailingWind ?? '—', prevailingWind ? '#15803D' : '#6B7280', 'Site exposure')}
        </div>`
      : '';

  // ─── Recommended actions (heuristic) ──────────────────────────────
  const actions: { title: string; note: string; priority: 'High' | 'Medium' | 'Low' }[] = [];

  const frostMonitoring = hazards.find(
    (h) => h.kind === 'frost' && h.status === 'monitoring',
  );
  if (frostMonitoring) {
    actions.push({
      title: 'Build a frost-protection plan',
      note: `${frostMonitoring.label} is still in monitoring — promote it to planned with row covers, cold frames, or sprinkler frost protection.`,
      priority: 'High',
    });
  }

  const floodActive = hazards.find(
    (h) => h.kind === 'flood' && h.risk === 'high' && h.mitigationPct < 25,
  );
  if (floodActive) {
    actions.push({
      title: 'Plan flood diversion',
      note: `${floodActive.label} is high-risk with only ${Math.round(floodActive.mitigationPct)}% mitigation — design swales, berms, or an overflow channel.`,
      priority: 'High',
    });
  }

  const windActive = hazards.find(
    (h) => h.kind === 'wind' && h.status !== 'mitigated',
  );
  if (windActive) {
    actions.push({
      title: 'Add windbreak',
      note: `${windActive.label} is unresolved — plant a multi-row shelterbelt aligned to the ${prevailingWind ?? 'prevailing'} wind.`,
      priority: 'Medium',
    });
  }

  const fireActive = hazards.find(
    (h) => h.kind === 'fire' && h.status !== 'mitigated',
  );
  if (fireActive) {
    actions.push({
      title: 'Establish a defensible-space zone',
      note: `${fireActive.label} is still active — clear flammable fuel inside 30 m of structures and rehearse the evacuation path.`,
      priority: 'High',
    });
  }

  if (actions.length === 0) {
    if (counts.total === 0) {
      actions.push({
        title: 'Start a hazard log',
        note: 'Open the Macroclimate & Hazards module and record at least the dominant frost, wind, and flood risks for the site.',
        priority: 'High',
      });
    } else {
      actions.push({
        title: 'Schedule a seasonal hazard review',
        note: 'Walk the property each shoulder season and refresh status, trend, and mitigation % for every logged hazard.',
        priority: 'Medium',
      });
    }
  }

  const actionsSection = `
    <h2>Recommended actions</h2>
    <table>
      <thead>
        <tr>
          <th>Action</th>
          <th>Rationale</th>
          <th style="width:80px">Priority</th>
        </tr>
      </thead>
      <tbody>
        ${actions
          .map(
            (a) => `
          <tr>
            <td><strong>${esc(a.title)}</strong></td>
            <td style="font-size:9.5pt;color:#4B5563">${esc(a.note)}</td>
            <td><span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:8.5pt;font-weight:600;color:white;background:${a.priority === 'High' ? '#DC2626' : a.priority === 'Medium' ? '#CA8A04' : '#0F766E'}">${a.priority}</span></td>
          </tr>`,
          )
          .join('')}
      </tbody>
    </table>`;

  const footer = `
    <p style="font-size:8.5pt;color:#9CA3AF;text-align:center;margin-top:24px">
      Generated ${esc(fmtDate(data.generatedAt))} · Atlas Macroclimate & Hazards export
    </p>`;

  return baseLayout(
    'Macroclimate & Hazards Report',
    p.name,
    `${hero}${kpiStrip}${frostBlock}${normalsSection}${oppsSection}${hazardSection}${countsGrid}${actionsSection}${footer}`,
  );
}
