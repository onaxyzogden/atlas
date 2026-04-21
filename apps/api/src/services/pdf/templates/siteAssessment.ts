/**
 * Site Assessment PDF — property summary, scores, breakdowns, flags, data sources.
 */

import type { ExportDataBag } from './index.js';
import { baseLayout, esc, fmtNumber, scoreGauge, severityBadge, notAvailable } from './baseLayout.js';

export function renderSiteAssessment(data: ExportDataBag): string {
  const { project: p, assessment: a, layers } = data;

  // ─── Property Overview ────────────────────────────────────────
  const propertySection = `
    <div class="section">
      <h2>Property Overview</h2>
      <div class="card-grid-2">
        <div class="card">
          <div class="card-header">Property</div>
          <table>
            <tbody>
              <tr><td><strong>Name</strong></td><td>${esc(p.name)}</td></tr>
              <tr><td><strong>Type</strong></td><td>${esc(p.project_type?.replace(/_/g, ' ') ?? '—')}</td></tr>
              <tr><td><strong>Address</strong></td><td>${esc(p.address ?? '—')}</td></tr>
              <tr><td><strong>Parcel ID</strong></td><td>${esc(p.parcel_id ?? '—')}</td></tr>
              <tr><td><strong>Country</strong></td><td>${p.country === 'CA' ? 'Canada' : 'United States'}${p.province_state ? ` (${esc(p.province_state)})` : ''}</td></tr>
              <tr><td><strong>Acreage</strong></td><td>${p.acreage ? fmtNumber(p.acreage, 2) + ' acres' : '—'}</td></tr>
            </tbody>
          </table>
        </div>
        <div class="card">
          <div class="card-header">Site Context</div>
          <table>
            <tbody>
              <tr><td><strong>Climate Region</strong></td><td>${esc(p.climate_region ?? '—')}</td></tr>
              <tr><td><strong>Bioregion</strong></td><td>${esc(p.bioregion ?? '—')}</td></tr>
              <tr><td><strong>Data Completeness</strong></td><td>${p.data_completeness_score != null ? fmtNumber(p.data_completeness_score, 1) + '%' : '—'}</td></tr>
              <tr><td><strong>Restrictions</strong></td><td>${esc(p.restrictions_covenants ?? 'None noted')}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
      ${p.description ? `<p>${esc(p.description)}</p>` : ''}
    </div>`;

  // ─── Assessment Scores ────────────────────────────────────────
  // Shape note (post migration 009): `a.score_breakdown` is the canonical
  // ScoredResult[] from @ogden/shared/scoring. Each ScoredResult has
  // `{label, score, confidence, score_breakdown: ScoreComponent[], …}`.
  // Every per-label score comes from the array; `overall_score` is the
  // denormalised weighted mean.
  let scoresSection: string;
  if (!a) {
    scoresSection = notAvailable('Site Assessment Scores');
  } else {
    const breakdownArr = Array.isArray(a.score_breakdown) ? a.score_breakdown : [];

    // Top gauges: Overall first, then every per-label score in the order
    // the shared scorer emitted them.
    const overallGauge = a.overall_score != null
      ? scoreGauge(a.overall_score, 'Overall')
      : '';
    const labelGauges = breakdownArr
      .map((r) => scoreGauge(r.score, r.label))
      .join('');
    const gauges = overallGauge + labelGauges;

    // Per-label breakdown cards: iterate ScoredResult[], render a card per
    // label with its ScoreComponent[] factor table. Each ScoreComponent has
    // `{name, value, maxPossible, sourceLayer, confidence}` — we surface
    // name + value (points contributed) for readability.
    const breakdownHtml = breakdownArr
      .map((r) => {
        const components = Array.isArray(r.score_breakdown) ? r.score_breakdown : [];
        if (components.length === 0) return '';
        const rows = components
          .map((c) => `<tr><td>${esc(c.name.replace(/_/g, ' '))}</td><td>${fmtNumber(c.value, 1)}</td></tr>`)
          .join('');
        return `
          <div class="card" style="break-inside:avoid">
            <h4>${esc(r.label)}</h4>
            <table><thead><tr><th>Factor</th><th>Points</th></tr></thead>
            <tbody>${rows}</tbody></table>
          </div>`;
      })
      .join('');

    scoresSection = `
      <div class="section">
        <h2>Assessment Scores</h2>
        <p>Confidence level: <strong>${esc(a.confidence)}</strong>
        ${a.needs_site_visit ? ' &mdash; <span style="color:var(--warning)">Site visit recommended</span>' : ''}</p>
        <div class="score-row">${gauges}</div>
        ${breakdownHtml ? `<h3>Score Breakdowns</h3><div class="card-grid-2">${breakdownHtml}</div>` : ''}
      </div>`;
  }

  // ─── Flags (opportunities / constraints) ──────────────────────
  let flagsSection = '';
  if (a?.flags && a.flags.length > 0) {
    const grouped: Record<string, typeof a.flags> = {};
    for (const f of a.flags) {
      (grouped[f.severity] ??= []).push(f);
    }
    const order = ['critical', 'warning', 'info'];
    let flagRows = '';
    for (const sev of order) {
      for (const f of grouped[sev] ?? []) {
        flagRows += `<tr>
          <td>${severityBadge(f.severity)}</td>
          <td><span class="badge badge-type">${esc(f.type)}</span></td>
          <td>${esc(f.category)}</td>
          <td>${esc(f.message)}</td>
        </tr>`;
      }
    }
    flagsSection = `
      <div class="section">
        <h2>Opportunities &amp; Constraints</h2>
        <table>
          <thead><tr><th>Severity</th><th>Type</th><th>Category</th><th>Detail</th></tr></thead>
          <tbody>${flagRows}</tbody>
        </table>
      </div>`;
  }

  // ─── Data Sources ─────────────────────────────────────────────
  let sourcesSection = '';
  if (layers.length > 0) {
    const sourceRows = layers
      .filter((l) => l.fetch_status === 'complete')
      .map((l) => `<tr>
        <td>${esc(l.layer_type.replace(/_/g, ' '))}</td>
        <td>${esc(l.source_api ?? '—')}</td>
        <td>${esc(l.attribution_text ?? '—')}</td>
        <td>${esc(l.confidence)}</td>
      </tr>`)
      .join('');
    if (sourceRows) {
      sourcesSection = `
        <div class="section">
          <h2>Data Sources</h2>
          <table>
            <thead><tr><th>Layer</th><th>Source API</th><th>Attribution</th><th>Confidence</th></tr></thead>
            <tbody>${sourceRows}</tbody>
          </table>
        </div>`;
    }
  }

  return baseLayout('Site Assessment', p.name,
    propertySection + scoresSection + flagsSection + sourcesSection);
}
