/**
 * SWOT Diagnosis Report PDF — strategic synthesis of journal entries
 * organized as quadrants, prioritized findings, and recommended actions.
 */

import type { ExportDataBag } from './index.js';
import { baseLayout, esc, notAvailable } from './baseLayout.js';

const BUCKET_LABELS: Record<string, string> = {
  S: 'Strengths',
  W: 'Weaknesses',
  O: 'Opportunities',
  T: 'Threats',
};

const BUCKET_COLORS: Record<string, string> = {
  S: '#15803D',
  W: '#6B7280',
  O: '#CA8A04',
  T: '#DC2626',
};

const BUCKET_BG: Record<string, string> = {
  S: '#ECFDF5',
  W: '#F3F4F6',
  O: '#FEF3C7',
  T: '#FEE2E2',
};

interface Entry {
  id: string;
  bucket: 'S' | 'W' | 'O' | 'T';
  title: string;
  body?: string | undefined;
  tags?: string[] | undefined;
  createdAt: string;
}

function quadrantCard(bucket: string, entries: Entry[]): string {
  const color = BUCKET_COLORS[bucket];
  const bg = BUCKET_BG[bucket];
  const top = entries.slice(0, 3);
  const more = entries.length > 3 ? `<p style="color:${color};font-size:9pt;margin-top:6px"><em>+${entries.length - 3} more</em></p>` : '';
  const items = top.length > 0
    ? top.map((e) => `<li><strong>${esc(e.title)}</strong></li>`).join('')
    : '<li style="color:#9CA3AF">No entries logged.</li>';

  return `
    <div class="card" style="background:${bg};border-left:4px solid ${color}">
      <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:8px">
        <h3 style="color:${color};margin:0">${esc(BUCKET_LABELS[bucket])}</h3>
        <span class="card-value" style="font-size:18pt;color:${color}">${entries.length}</span>
      </div>
      <ul style="padding-left:18px;font-size:9.5pt;color:#374151">${items}</ul>
      ${more}
    </div>`;
}

function priorityRow(rank: number, e: Entry): string {
  const color = BUCKET_COLORS[e.bucket];
  const tagList = (e.tags ?? []).slice(0, 4).join(' · ');
  return `
    <tr>
      <td style="width:40px;text-align:center"><strong style="font-family:'Fira Code',monospace;color:${color}">${rank}</strong></td>
      <td><strong>${esc(e.title)}</strong>${e.body ? `<br/><span style="font-size:9pt;color:#4B5563">${esc(e.body)}</span>` : ''}</td>
      <td style="width:90px"><span class="badge" style="background:${color};color:#fff">${esc(BUCKET_LABELS[e.bucket])}</span></td>
      <td style="width:160px;font-size:9pt;color:#6B7280">${esc(tagList) || '—'}</td>
    </tr>`;
}

export function renderSwotDiagnosisReport(data: ExportDataBag): string {
  const { project: p, payload } = data;
  const swot = payload?.swot;

  if (!swot || swot.entries.length === 0) {
    return baseLayout(
      'SWOT Diagnosis Report',
      p.name,
      notAvailable(
        'No SWOT entries available for diagnosis. Capture strengths, weaknesses, opportunities, and threats in the SWOT Journal first.',
      ),
    );
  }

  const entries: Entry[] = swot.entries;

  // ─── Bucket grouping ──────────────────────────────────────────
  const byBucket: Record<'S' | 'W' | 'O' | 'T', Entry[]> = { S: [], W: [], O: [], T: [] };
  for (const e of entries) byBucket[e.bucket].push(e);

  // ─── Tag frequency for prioritisation ─────────────────────────
  const tagFreq: Record<string, number> = {};
  for (const e of entries) for (const t of e.tags ?? []) tagFreq[t] = (tagFreq[t] ?? 0) + 1;

  const score = (e: Entry) => (e.tags ?? []).reduce((acc, t) => acc + (tagFreq[t] ?? 0), 0);
  const prioritized = [...entries].sort((a, b) => score(b) - score(a)).slice(0, 8);

  // ─── Breadcrumb + stage bar ───────────────────────────────────
  const stageBar = `
    <div style="display:flex;gap:8px;justify-content:center;margin:20px 0;font-family:'Fira Code',monospace;font-size:9pt">
      <span style="color:#15803D">Observe ✓</span>
      <span style="color:#9CA3AF">·</span>
      <span style="color:#15803D">Record ✓</span>
      <span style="color:#9CA3AF">·</span>
      <span style="color:#15803D">Analyse ✓</span>
      <span style="color:#9CA3AF">·</span>
      <span style="color:#CA8A04;font-weight:700">Synthesize ●</span>
    </div>`;

  // ─── Executive summary ────────────────────────────────────────
  const totals = {
    S: byBucket.S.length,
    W: byBucket.W.length,
    O: byBucket.O.length,
    T: byBucket.T.length,
  };
  const dominant = (Object.keys(totals) as Array<keyof typeof totals>).reduce(
    (best, k) => (totals[k] > totals[best] ? k : best),
    'S' as keyof typeof totals,
  );

  const exec = `
    <div class="card">
      <h3>Executive summary</h3>
      <p>
        This synthesis covers <strong>${entries.length}</strong> SWOT observations across the
        ${esc(p.name)} site. The dominant bucket is <strong style="color:${BUCKET_COLORS[dominant]}">${esc(BUCKET_LABELS[dominant])}</strong>
        (${totals[dominant]} entries). Pair internal strengths with external opportunities (S+O)
        to set design priorities; pair internal weaknesses with external threats (W+T) to set
        mitigation priorities.
      </p>
    </div>`;

  // ─── Quadrant grid ────────────────────────────────────────────
  const quadrants = `
    <h2>Quadrant overview</h2>
    <div class="card-grid-2">
      ${quadrantCard('S', byBucket.S)}
      ${quadrantCard('W', byBucket.W)}
      ${quadrantCard('O', byBucket.O)}
      ${quadrantCard('T', byBucket.T)}
    </div>`;

  // ─── Prioritised findings ─────────────────────────────────────
  const findings = `
    <h2>Prioritised findings</h2>
    <p style="color:#4B5563;font-size:9.5pt">Ordered by tag-frequency weight — entries that share themes with many other observations rank highest.</p>
    <table>
      <thead>
        <tr>
          <th style="width:40px">#</th>
          <th>Finding</th>
          <th>Bucket</th>
          <th>Tags</th>
        </tr>
      </thead>
      <tbody>
        ${prioritized.map((e, i) => priorityRow(i + 1, e)).join('')}
      </tbody>
    </table>`;

  // ─── Recommended actions ──────────────────────────────────────
  const actions = `
    <h2>Recommended actions</h2>
    <div class="card-grid-2">
      <div class="card" style="border-left:4px solid #15803D">
        <h3 style="color:#15803D">S + O — Maximise</h3>
        <p>Use ${totals.S} strength${totals.S === 1 ? '' : 's'} to pursue ${totals.O} opportunit${totals.O === 1 ? 'y' : 'ies'}. Identify pairings where an existing asset directly enables an external trend.</p>
      </div>
      <div class="card" style="border-left:4px solid #DC2626">
        <h3 style="color:#DC2626">W + T — Mitigate</h3>
        <p>Address ${totals.W} weakness${totals.W === 1 ? '' : 'es'} that overlap with ${totals.T} threat${totals.T === 1 ? '' : 's'}. Prioritise mitigations where an internal gap compounds an external risk.</p>
      </div>
    </div>`;

  const body = `
    <p style="text-align:center;color:#6B7280;font-size:9pt;margin-bottom:8px">
      Module 6 → SWOT Synthesis → <strong style="color:#14532D">Diagnosis report</strong>
    </p>
    ${stageBar}
    ${exec}
    ${quadrants}
    ${findings}
    ${actions}
    <div class="disclaimer">
      Findings are weighted by tag-frequency and are intended as a planning aid. Cross-check with the SWOT Journal export for full context on each entry.
    </div>`;

  return baseLayout('SWOT Diagnosis Report', p.name, body);
}
