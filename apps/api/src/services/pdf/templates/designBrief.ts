/**
 * Design Brief PDF — vision statement, zone allocation, key decisions, phasing.
 */

import type { ExportDataBag } from './index.js';
import { baseLayout, esc, fmtNumber, notAvailable } from './baseLayout.js';

export function renderDesignBrief(data: ExportDataBag): string {
  const { project: p, designFeatures: features } = data;

  // ─── Vision ───────────────────────────────────────────────────
  const visionSection = `
    <div class="section">
      <h2>Vision Statement</h2>
      ${p.description
        ? `<p style="font-size:12pt;font-style:italic;color:var(--earth-green);line-height:1.8">${esc(p.description)}</p>`
        : `<p>No vision statement has been defined for this project yet.</p>`}
      <div class="card-grid">
        <div class="card">
          <div class="card-header">Project Type</div>
          <div class="card-value" style="font-size:14pt">${esc(p.project_type?.replace(/_/g, ' ') ?? '—')}</div>
        </div>
        <div class="card">
          <div class="card-header">Acreage</div>
          <div class="card-value" style="font-size:14pt">${p.acreage ? fmtNumber(p.acreage, 2) : '—'}</div>
        </div>
        <div class="card">
          <div class="card-header">Location</div>
          <div class="card-value" style="font-size:14pt">${esc(p.address ?? p.province_state ?? '—')}</div>
        </div>
      </div>
    </div>`;

  if (features.length === 0) {
    return baseLayout('Design Brief', p.name,
      visionSection + notAvailable('Design Features — No zones, structures, or paths have been placed yet.'));
  }

  // ─── Zone Allocation ──────────────────────────────────────────
  const zones = features.filter((f) => f.feature_type === 'zone');
  let zoneSection = '';
  if (zones.length > 0) {
    const bySubtype: Record<string, { count: number; totalArea: number }> = {};
    for (const z of zones) {
      const key = z.subtype ?? 'unspecified';
      const entry = (bySubtype[key] ??= { count: 0, totalArea: 0 });
      entry.count++;
      const area = (z.properties?.areaM2 as number) ?? 0;
      entry.totalArea += area;
    }

    const rows = Object.entries(bySubtype)
      .sort((a, b) => b[1].totalArea - a[1].totalArea)
      .map(([subtype, info]) => `<tr>
        <td>${esc(subtype.replace(/_/g, ' '))}</td>
        <td>${info.count}</td>
        <td>${fmtNumber(info.totalArea, 0)} m&sup2;</td>
        <td>${fmtNumber(info.totalArea / 10_000, 2)} ha</td>
      </tr>`)
      .join('');

    zoneSection = `
      <div class="section">
        <h2>Zone Allocation</h2>
        <p>${zones.length} zone${zones.length > 1 ? 's' : ''} defined across ${Object.keys(bySubtype).length} categor${Object.keys(bySubtype).length > 1 ? 'ies' : 'y'}.</p>
        <table>
          <thead><tr><th>Category</th><th>Count</th><th>Total Area</th><th>Hectares</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  // ─── Structure Inventory ──────────────────────────────────────
  const structures = features.filter((f) => f.feature_type === 'structure');
  let structureSection = '';
  if (structures.length > 0) {
    const byType: Record<string, number> = {};
    for (const s of structures) byType[s.subtype ?? 'unspecified'] = (byType[s.subtype ?? 'unspecified'] ?? 0) + 1;

    const rows = Object.entries(byType)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => `<tr><td>${esc(type.replace(/_/g, ' '))}</td><td>${count}</td></tr>`)
      .join('');

    structureSection = `
      <div class="section">
        <h2>Structure Inventory</h2>
        <table>
          <thead><tr><th>Type</th><th>Count</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  // ─── Phasing Overview ─────────────────────────────────────────
  const phases: Record<string, typeof features> = {};
  for (const f of features) {
    const phase = f.phase_tag ?? 'unassigned';
    (phases[phase] ??= []).push(f);
  }

  const phaseOrder = ['p1', 'p2', 'p3', 'p4', 'unassigned'];
  const phaseLabels: Record<string, string> = {
    p1: 'Phase 1 — Foundation', p2: 'Phase 2 — Development',
    p3: 'Phase 3 — Expansion', p4: 'Phase 4 — Maturity', unassigned: 'Unassigned',
  };

  let phasingSection = '';
  const phaseParts: string[] = [];
  for (const phase of phaseOrder) {
    const items = phases[phase];
    if (!items) continue;
    const rows = items
      .map((f) => `<tr>
        <td><span class="badge badge-type">${esc(f.feature_type)}</span></td>
        <td>${esc(f.label ?? f.subtype ?? '—')}</td>
      </tr>`)
      .join('');
    phaseParts.push(`
      <div class="card" style="break-inside:avoid">
        <h4>${esc(phaseLabels[phase] ?? phase)}</h4>
        <table><thead><tr><th>Type</th><th>Name</th></tr></thead><tbody>${rows}</tbody></table>
      </div>`);
  }
  if (phaseParts.length > 0) {
    phasingSection = `
      <div class="section">
        <h2>Phasing Overview</h2>
        ${phaseParts.join('')}
      </div>`;
  }

  // ─── Notes ────────────────────────────────────────────────────
  const notes = [
    { label: 'Owner Notes', value: p.owner_notes },
    { label: 'Zoning Notes', value: p.zoning_notes },
    { label: 'Access Notes', value: p.access_notes },
    { label: 'Water Rights', value: p.water_rights_notes },
  ].filter((n) => n.value);

  let notesSection = '';
  if (notes.length > 0) {
    notesSection = `
      <div class="section">
        <h2>Key Decisions &amp; Notes</h2>
        ${notes.map((n) => `<div class="card"><h4>${esc(n.label)}</h4><p>${esc(n.value!)}</p></div>`).join('')}
      </div>`;
  }

  return baseLayout('Design Brief', p.name,
    visionSection + zoneSection + structureSection + phasingSection + notesSection);
}
