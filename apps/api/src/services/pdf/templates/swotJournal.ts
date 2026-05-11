/**
 * SWOT Journal PDF — chronological capture of strengths, weaknesses,
 * opportunities, and threats with optional GPS pins and tags.
 */

import type { ExportDataBag } from './index.js';
import { baseLayout, esc, fmtDate, notAvailable } from './baseLayout.js';

const BUCKET_LABELS: Record<string, string> = {
  S: 'Strength',
  W: 'Weakness',
  O: 'Opportunity',
  T: 'Threat',
};

const BUCKET_COLORS: Record<string, string> = {
  S: '#15803D', // earth green
  W: '#6B7280', // slate
  O: '#CA8A04', // harvest gold
  T: '#DC2626', // crimson
};

function bucketBadge(bucket: string): string {
  const bg = BUCKET_COLORS[bucket] ?? '#6B7280';
  return `<span class="badge" style="background:${bg};color:#fff">${esc(BUCKET_LABELS[bucket] ?? bucket)}</span>`;
}

function fmtCoords(loc: [number, number]): string {
  return `${loc[1].toFixed(5)}°, ${loc[0].toFixed(5)}°`;
}

export function renderSwotJournal(data: ExportDataBag): string {
  const { project: p, payload } = data;
  const swot = payload?.swot;

  if (!swot || swot.entries.length === 0) {
    return baseLayout(
      'SWOT Journal',
      p.name,
      notAvailable(
        'No SWOT entries have been recorded yet. Use the SWOT Journal in the Observe stage to capture strengths, weaknesses, opportunities, and threats.',
      ),
    );
  }

  const entries = [...swot.entries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  // ─── Bucket counts ────────────────────────────────────────────
  const counts: Record<string, number> = { S: 0, W: 0, O: 0, T: 0 };
  for (const e of entries) counts[e.bucket] = (counts[e.bucket] ?? 0) + 1;

  const summary = `
    <div class="card-grid">
      <div class="card">
        <div class="card-header">Total Entries</div>
        <div class="card-value">${entries.length}</div>
      </div>
      <div class="card">
        <div class="card-header">Strengths · Weaknesses</div>
        <div class="card-value" style="color:#15803D">${counts.S}<span style="color:#9CA3AF"> · </span><span style="color:#6B7280">${counts.W}</span></div>
      </div>
      <div class="card">
        <div class="card-header">Opportunities · Threats</div>
        <div class="card-value" style="color:#CA8A04">${counts.O}<span style="color:#9CA3AF"> · </span><span style="color:#DC2626">${counts.T}</span></div>
      </div>
    </div>`;

  // ─── Entries table ────────────────────────────────────────────
  const rows = entries
    .map((e) => {
      const tags = (e.tags ?? []).map((t) => `<span class="badge badge-type">${esc(t)}</span>`).join(' ');
      const coords = e.position ? esc(fmtCoords(e.position)) : '<span style="color:#9CA3AF">—</span>';
      const body = e.body ? `<br/><span style="font-size:9pt;color:#4B5563">${esc(e.body)}</span>` : '';
      return `
        <tr>
          <td>${bucketBadge(e.bucket)}</td>
          <td><strong>${esc(e.title)}</strong>${body}</td>
          <td>${tags || '<span style="color:#9CA3AF">—</span>'}</td>
          <td>${coords}</td>
          <td>${esc(fmtDate(e.createdAt))}</td>
        </tr>`;
    })
    .join('');

  const table = `
    <h2>Journal entries</h2>
    <table>
      <thead>
        <tr>
          <th style="width:90px">Bucket</th>
          <th>Title &amp; notes</th>
          <th style="width:140px">Tags</th>
          <th style="width:140px">Location</th>
          <th style="width:110px">Logged</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;

  const body = `
    <h2>Summary</h2>
    ${summary}
    ${table}
    <div class="disclaimer">
      Journal entries are exported in chronological order (newest first). GPS pins reflect where the entry was tagged on the site map; entries without a pin are non-spatial observations.
    </div>`;

  return baseLayout('SWOT Journal', p.name, body);
}
