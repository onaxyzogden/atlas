/**
 * Feature Schedule PDF — all placed features with areas, costs, phase assignments.
 */

import type { ExportDataBag } from './index.js';
import { baseLayout, esc, fmtNumber, fmtDollars, fmtRange, notAvailable } from './baseLayout.js';

function computeArea(geojsonStr: string): number | null {
  try {
    const geom = JSON.parse(geojsonStr);
    if (geom.type === 'Polygon' || geom.type === 'MultiPolygon') {
      // Rough area from properties is preferred; geometry-based would need turf
      return null;
    }
    return null;
  } catch {
    return null;
  }
}

function computeLength(geojsonStr: string): number | null {
  try {
    const geom = JSON.parse(geojsonStr);
    if (geom.type === 'LineString') return null; // Would need turf
    return null;
  } catch {
    return null;
  }
}

export function renderFeatureSchedule(data: ExportDataBag): string {
  const { project: p, designFeatures: features, payload } = data;

  if (features.length === 0) {
    return baseLayout('Feature Schedule', p.name,
      notAvailable('No design features have been placed yet.'));
  }

  // Build cost lookup from financial payload
  const costMap = new Map<string, { low: number; mid: number; high: number }>();
  if (payload?.financial?.costLineItems) {
    for (const item of payload.financial.costLineItems) {
      costMap.set(item.name.toLowerCase(), item.cost);
    }
  }

  // Group by phase
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

  // Summary cards
  const totalZones = features.filter((f) => f.feature_type === 'zone').length;
  const totalStructures = features.filter((f) => f.feature_type === 'structure').length;
  const totalPaths = features.filter((f) => f.feature_type === 'path').length;
  const totalOther = features.length - totalZones - totalStructures - totalPaths;

  const summarySection = `
    <div class="section">
      <h2>Feature Summary</h2>
      <div class="card-grid">
        <div class="card">
          <div class="card-header">Zones</div>
          <div class="card-value">${totalZones}</div>
        </div>
        <div class="card">
          <div class="card-header">Structures</div>
          <div class="card-value">${totalStructures}</div>
        </div>
        <div class="card">
          <div class="card-header">Paths</div>
          <div class="card-value">${totalPaths}</div>
        </div>
      </div>
      ${payload?.financial ? `
        <div class="card-grid-2">
          <div class="card">
            <div class="card-header">Total Investment (est.)</div>
            <div class="card-value" style="font-size:16pt">${fmtRange(payload.financial.totalInvestment)}</div>
          </div>
          <div class="card">
            <div class="card-header">Revenue at Maturity (est.)</div>
            <div class="card-value" style="font-size:16pt">${fmtRange(payload.financial.annualRevenueAtMaturity)}</div>
          </div>
        </div>` : ''}
    </div>`;

  // Phase tables
  const phaseSections: string[] = [];
  for (const phase of phaseOrder) {
    const items = phases[phase];
    if (!items) continue;

    const rows = items.map((f) => {
      const areaM2 = (f.properties.areaM2 as number) ?? computeArea(f.geometry_json);
      const lengthM = (f.properties.lengthM as number) ?? computeLength(f.geometry_json);
      const costEntry = costMap.get((f.label ?? f.subtype ?? '').toLowerCase());

      return `<tr>
        <td><span class="badge badge-type">${esc(f.feature_type)}</span></td>
        <td>${esc(f.subtype?.replace(/_/g, ' ') ?? '—')}</td>
        <td>${esc(f.label ?? '—')}</td>
        <td>${areaM2 != null ? fmtNumber(areaM2, 0) + ' m²' : lengthM != null ? fmtNumber(lengthM, 0) + ' m' : '—'}</td>
        <td>${costEntry ? fmtRange(costEntry) : (f.properties.costEstimate ? fmtDollars(f.properties.costEstimate as number) : '—')}</td>
      </tr>`;
    }).join('');

    phaseSections.push(`
      <div class="section">
        <h2>${esc(phaseLabels[phase] ?? phase)}</h2>
        <p>${items.length} feature${items.length > 1 ? 's' : ''}</p>
        <table>
          <thead><tr><th>Type</th><th>Subtype</th><th>Name</th><th>Size</th><th>Cost (est.)</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`);
  }

  return baseLayout('Feature Schedule', p.name,
    summarySection + phaseSections.join(''));
}
