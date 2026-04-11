/**
 * Field Notes PDF — chronological entries with GPS, photos, walk routes, punch list.
 */

import type { ExportDataBag } from './index.js';
import { baseLayout, esc, fmtNumber, fmtDate, notAvailable } from './baseLayout.js';

const TYPE_LABELS: Record<string, string> = {
  soil_sample: 'Soil Sample', water_issue: 'Water Issue', structure_issue: 'Structure Issue',
  measurement: 'Measurement', annotation: 'Annotation', observation: 'Observation',
  question: 'Question', issue: 'Issue',
};

function fmtCoords(loc: [number, number]): string {
  return `${loc[1].toFixed(6)}°N, ${loc[0].toFixed(6)}°W`;
}

function fmtDuration(ms: number): string {
  const mins = Math.round(ms / 60_000);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

export function renderFieldNotes(data: ExportDataBag): string {
  const { project: p, payload } = data;
  const fieldNotes = payload?.fieldNotes;

  if (!fieldNotes || fieldNotes.entries.length === 0) {
    return baseLayout('Field Notes', p.name,
      notAvailable('No field notes have been recorded. Use the Fieldwork panel to capture observations, measurements, and photos on-site.'));
  }

  const entries = [...fieldNotes.entries].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  // ─── Summary ──────────────────────────────────────────────────
  const typeCounts: Record<string, number> = {};
  for (const e of entries) typeCounts[e.type] = (typeCounts[e.type] ?? 0) + 1;

  const summaryCards = Object.entries(typeCounts)
    .map(([type, count]) => `
      <div class="card">
        <div class="card-header">${esc(TYPE_LABELS[type] ?? type)}</div>
        <div class="card-value">${count}</div>
      </div>`)
    .join('');

  const summarySection = `
    <div class="section">
      <h2>Summary</h2>
      <p>${entries.length} field note${entries.length > 1 ? 's' : ''} recorded.</p>
      <div class="card-grid">${summaryCards}</div>
    </div>`;

  // ─── Entries ──────────────────────────────────────────────────
  const entryCards = entries.map((e) => {
    const photos = e.photos
      .filter((url) => url.startsWith('data:'))
      .map((url) => `<img src="${url}" style="max-width:200px;max-height:150px;border-radius:4px;margin:4px" />`)
      .join('');

    return `
      <div class="card" style="break-inside:avoid">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span class="badge badge-type">${esc(TYPE_LABELS[e.type] ?? e.type)}</span>
          <span style="font-size:8pt;color:var(--text-muted)">${fmtDate(e.timestamp)}</span>
        </div>
        <p style="font-size:8pt;color:var(--text-secondary)">
          GPS: ${fmtCoords(e.location)}
          ${e.noteType ? ` &bull; ${esc(e.noteType)}` : ''}
        </p>
        ${e.notes ? `<p>${esc(e.notes)}</p>` : ''}
        ${photos ? `<div style="margin-top:8px">${photos}</div>` : ''}
      </div>`;
  }).join('');

  const entriesSection = `
    <div class="section">
      <h2>Field Entries</h2>
      ${entryCards}
    </div>`;

  // ─── Walk Routes ──────────────────────────────────────────────
  let walkSection = '';
  if (fieldNotes.walkRoutes && fieldNotes.walkRoutes.length > 0) {
    const rows = fieldNotes.walkRoutes.map((r) => `<tr>
      <td>${esc(r.name)}</td>
      <td>${fmtNumber(r.distanceM, 0)} m</td>
      <td>${fmtDuration(r.durationMs)}</td>
      <td>${fmtDate(r.startedAt)}</td>
      <td>${r.annotations.length} note${r.annotations.length !== 1 ? 's' : ''}</td>
    </tr>`).join('');

    walkSection = `
      <div class="section">
        <h2>Walk Routes</h2>
        <table>
          <thead><tr><th>Route</th><th>Distance</th><th>Duration</th><th>Date</th><th>Annotations</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  // ─── Punch List ───────────────────────────────────────────────
  let punchSection = '';
  if (fieldNotes.punchList && fieldNotes.punchList.length > 0) {
    const statusColors: Record<string, string> = {
      verified: '#15803D', discrepancy: '#DC2626', not_checked: '#9CA3AF',
    };
    const rows = fieldNotes.punchList.map((item) => {
      const color = statusColors[item.status] ?? '#6B7280';
      return `<tr>
        <td>${esc(item.featureName)}</td>
        <td>${esc(item.featureType)}</td>
        <td><span class="badge" style="background:${color};color:#fff">${esc(item.status.replace(/_/g, ' '))}</span></td>
        <td>${esc(item.notes)}</td>
      </tr>`;
    }).join('');

    punchSection = `
      <div class="section">
        <h2>Verification Checklist</h2>
        <table>
          <thead><tr><th>Feature</th><th>Type</th><th>Status</th><th>Notes</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  return baseLayout('Field Notes', p.name,
    summarySection + entriesSection + walkSection + punchSection);
}
