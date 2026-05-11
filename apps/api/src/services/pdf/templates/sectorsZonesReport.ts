/**
 * Sectors, Microclimates & Zones Report PDF — Observe Module 5 export.
 *
 * Renders the sector-arrow inventory (with intensity / arc / bearing),
 * the land-zone roster with area + category, count summaries by sector
 * type and by zone category, and a heuristic recommended-actions block.
 * Seventh Observe export following the locked 4-file recipe.
 */

import type { ExportDataBag } from './index.js';
import { baseLayout, esc, fmtDate, fmtNumber, notAvailable } from './baseLayout.js';

type Intensity = 'low' | 'med' | 'high';

interface SectorEntry {
  id: string;
  type: string;
  bearingDeg: number;
  arcDeg: number;
  intensity?: Intensity;
  notes?: string;
}

interface ZoneEntry {
  id: string;
  name: string;
  category: string;
  primaryUse?: string;
  secondaryUse?: string;
  notes?: string;
  areaM2: number;
  invasivePressure?: string;
  successionStage?: string;
  seasonality?: string;
  permacultureZone?: number;
}

interface SectorsZonesEntry {
  sectors: SectorEntry[];
  zones: ZoneEntry[];
  sectorCounts: {
    total: number;
    wind: number;
    sun: number;
    fire: number;
    noise: number;
    wildlife: number;
    view: number;
  };
  zoneCounts: {
    total: number;
    byCategory: Record<string, number>;
    totalAreaM2: number;
  };
  prevailingWind?: string;
}

const INTENSITY_COLOR: Record<Intensity, string> = {
  low: '#15803D',
  med: '#CA8A04',
  high: '#DC2626',
};
const INTENSITY_LABEL: Record<Intensity, string> = {
  low: 'Low',
  med: 'Medium',
  high: 'High',
};

const SECTOR_TYPE_LABEL: Record<string, string> = {
  sun_summer: 'Summer sun',
  sun_winter: 'Winter sun',
  wind_prevailing: 'Prevailing wind',
  wind_storm: 'Storm wind',
  fire: 'Fire',
  noise: 'Noise',
  wildlife: 'Wildlife',
  view: 'View',
};

const ZONE_CATEGORY_LABEL: Record<string, string> = {
  habitation: 'Habitation',
  food_production: 'Food production',
  livestock: 'Livestock',
  commons: 'Commons',
  spiritual: 'Spiritual',
  education: 'Education',
  retreat: 'Retreat',
  conservation: 'Conservation',
  water_retention: 'Water retention',
  infrastructure: 'Infrastructure',
  access: 'Access',
  buffer: 'Buffer',
  future_expansion: 'Future expansion',
};

function bearingLabel(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const idx = Math.round((((deg % 360) + 360) % 360) / 45) % 8;
  return dirs[idx]!;
}

function fmtArea(m2: number): string {
  if (m2 >= 10000) return `${(m2 / 10000).toFixed(2)} ha`;
  return `${fmtNumber(m2, 0)} m²`;
}

function labelSector(t: string): string {
  return SECTOR_TYPE_LABEL[t] ?? t.replace(/_/g, ' ');
}
function labelZoneCategory(c: string): string {
  return ZONE_CATEGORY_LABEL[c] ?? c.replace(/_/g, ' ');
}

export function renderSectorsZonesReport(data: ExportDataBag): string {
  const { project: p, payload } = data;
  const sz = payload?.sectorsZones;

  if (!sz) {
    return baseLayout(
      'Sectors, Microclimates & Zones Report',
      p.name,
      notAvailable(
        'No sector arrows or land zones have been captured yet. Use the Sectors, Microclimates & Zones module in the Observe stage to place sector arrows on the compass and outline functional zones on the property.',
      ),
    );
  }

  const entry: SectorsZonesEntry = sz;
  const sectors = entry.sectors;
  const zones = entry.zones;
  const sc = entry.sectorCounts;
  const zc = entry.zoneCounts;

  // ─── Hero ─────────────────────────────────────────────────────────
  const hero = `
    <div class="card" style="background:linear-gradient(135deg,#ECFDF5 0%,#EFF6FF 100%);border:none;padding:28px;text-align:center">
      <h2 style="border:none;margin:0 0 8px;color:#14532D;font-size:18pt">Sectors &amp; Zones synthesis</h2>
      <p style="font-size:11pt;color:#4B5563;max-width:560px;margin:0 auto">
        ${sc.total} sector arrow${sc.total === 1 ? '' : 's'} mapped ·
        ${zc.total} zone${zc.total === 1 ? '' : 's'} outlined ·
        ${fmtArea(zc.totalAreaM2)} total zoned area
        for ${esc(p.name)}.
        ${
          entry.prevailingWind
            ? `Prevailing wind from <strong>${esc(entry.prevailingWind)}</strong>.`
            : sc.total === 0
              ? 'Place wind, sun, fire and view arrows on the compass to start the picture.'
              : ''
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
    <h2>Site forces &amp; zoning summary</h2>
    <div class="card-grid">
      ${kpiCard(
        'Sector arrows',
        String(sc.total),
        sc.total === 0 ? '#6B7280' : '#0F766E',
        sc.total === 0 ? 'None yet' : 'Placed on site compass',
      )}
      ${kpiCard(
        'Zones outlined',
        String(zc.total),
        zc.total === 0 ? '#6B7280' : '#15803D',
        zc.total === 0 ? 'None yet' : `${fmtArea(zc.totalAreaM2)} total`,
      )}
      ${kpiCard(
        'High-risk sectors',
        String(sc.fire),
        sc.fire === 0 ? '#15803D' : '#DC2626',
        sc.fire === 0 ? 'No fire sectors logged' : 'Fire / hazard arrows',
      )}
      ${kpiCard(
        'Prevailing wind',
        entry.prevailingWind ?? '—',
        entry.prevailingWind ? '#1D4ED8' : '#6B7280',
        entry.prevailingWind ? 'From climate layer' : 'Awaiting climate data',
      )}
    </div>`;

  // ─── Sector inventory table ───────────────────────────────────────
  const intensityBadge = (i: Intensity) => `
    <span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:8.5pt;font-weight:600;color:white;background:${INTENSITY_COLOR[i]}">${INTENSITY_LABEL[i]}</span>`;

  const sectorTable =
    sectors.length === 0
      ? `<p style="font-size:9.5pt;color:#9CA3AF;font-style:italic">No sector arrows placed yet — use the compass tool to log incoming forces.</p>`
      : `<table>
          <thead>
            <tr>
              <th style="width:120px">Type</th>
              <th style="width:70px">Bearing</th>
              <th style="width:60px">Arc</th>
              <th style="width:80px">Intensity</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${sectors
              .map(
                (s) => `
              <tr>
                <td><strong>${esc(labelSector(s.type))}</strong></td>
                <td>${bearingLabel(s.bearingDeg)} <span style="font-size:9pt;color:#6B7280">(${Math.round(s.bearingDeg)}°)</span></td>
                <td>${Math.round(s.arcDeg)}°</td>
                <td>${s.intensity ? intensityBadge(s.intensity) : '<span style="color:#9CA3AF">—</span>'}</td>
                <td style="font-size:9pt;color:#4B5563">${s.notes ? esc(s.notes) : '<span style="color:#9CA3AF">—</span>'}</td>
              </tr>`,
              )
              .join('')}
          </tbody>
        </table>`;

  const sectorSection = `
    <h2>Sector inventory</h2>
    ${sectorTable}`;

  // ─── Sector counts by type ────────────────────────────────────────
  const sectorCountsGrid =
    sc.total === 0
      ? ''
      : `
        <h2>Sectors by type</h2>
        <div class="card-grid">
          ${kpiCard('Wind', String(sc.wind), sc.wind > 0 ? '#1D4ED8' : '#6B7280', 'Prevailing + storm')}
          ${kpiCard('Sun', String(sc.sun), sc.sun > 0 ? '#CA8A04' : '#6B7280', 'Summer + winter arcs')}
          ${kpiCard('Fire', String(sc.fire), sc.fire > 0 ? '#DC2626' : '#6B7280', 'Wildfire vectors')}
          ${kpiCard('View', String(sc.view), sc.view > 0 ? '#15803D' : '#6B7280', 'Beneficial views')}
          ${kpiCard('Noise', String(sc.noise), sc.noise > 0 ? '#CA8A04' : '#6B7280', 'Acoustic intrusion')}
          ${kpiCard('Wildlife', String(sc.wildlife), sc.wildlife > 0 ? '#15803D' : '#6B7280', 'Animal corridors')}
        </div>`;

  // ─── Zone inventory table ─────────────────────────────────────────
  const zoneTable =
    zones.length === 0
      ? `<p style="font-size:9.5pt;color:#9CA3AF;font-style:italic">No zones outlined yet — use the zone tool to draw functional areas.</p>`
      : `<table>
          <thead>
            <tr>
              <th>Name</th>
              <th style="width:130px">Category</th>
              <th style="width:80px">Area</th>
              <th style="width:60px">PC zone</th>
              <th style="width:90px">Invasive</th>
              <th style="width:100px">Succession</th>
              <th>Use</th>
            </tr>
          </thead>
          <tbody>
            ${[...zones]
              .sort((a, b) => b.areaM2 - a.areaM2)
              .map(
                (z) => `
              <tr>
                <td><strong>${esc(z.name)}</strong></td>
                <td style="font-size:9pt">${esc(labelZoneCategory(z.category))}</td>
                <td>${fmtArea(z.areaM2)}</td>
                <td>${z.permacultureZone != null ? `Z${z.permacultureZone}` : '<span style="color:#9CA3AF">—</span>'}</td>
                <td style="font-size:9pt;text-transform:capitalize">${z.invasivePressure ? esc(z.invasivePressure) : '<span style="color:#9CA3AF">—</span>'}</td>
                <td style="font-size:9pt;text-transform:capitalize">${z.successionStage ? esc(z.successionStage) : '<span style="color:#9CA3AF">—</span>'}</td>
                <td style="font-size:9pt;color:#4B5563">${
                  z.primaryUse
                    ? esc(z.primaryUse) + (z.secondaryUse ? ` / ${esc(z.secondaryUse)}` : '')
                    : '<span style="color:#9CA3AF">—</span>'
                }</td>
              </tr>`,
              )
              .join('')}
          </tbody>
        </table>`;

  const zoneSection = `
    <h2>Zone inventory</h2>
    ${zoneTable}`;

  // ─── Zone counts by category ──────────────────────────────────────
  const categoryEntries = Object.entries(zc.byCategory).sort((a, b) => b[1] - a[1]);
  const zoneCategoryGrid =
    categoryEntries.length === 0
      ? ''
      : `
        <h2>Zones by category</h2>
        <div class="card-grid">
          ${categoryEntries
            .map(([cat, n]) =>
              kpiCard(labelZoneCategory(cat), String(n), '#15803D', `${n} zone${n === 1 ? '' : 's'}`),
            )
            .join('')}
        </div>`;

  // ─── Recommended actions (heuristic) ──────────────────────────────
  const actions: { title: string; note: string; priority: 'High' | 'Medium' | 'Low' }[] = [];

  if (sc.fire > 0) {
    actions.push({
      title: 'Plan a fire-defensible buffer',
      note: `${sc.fire} fire sector${sc.fire === 1 ? '' : 's'} logged — site structures and tree cover so prevailing fire vectors meet a buffer, not a fuel load.`,
      priority: 'High',
    });
  }

  if (sc.wind > 0 && zones.filter((z) => z.category === 'buffer').length === 0) {
    actions.push({
      title: 'Outline windbreak buffer zones',
      note: `${sc.wind} wind sector${sc.wind === 1 ? '' : 's'} mapped but no buffer zones outlined — design a multi-row shelterbelt along the prevailing direction.`,
      priority: 'High',
    });
  }

  if (sc.sun > 0 && zones.filter((z) => z.category === 'food_production').length === 0) {
    actions.push({
      title: 'Place food production in sunny pockets',
      note: 'Solar arcs are mapped but no food-production zones are outlined yet — locate annual beds and orchards in the warmest, longest-light pockets.',
      priority: 'Medium',
    });
  }

  if (sc.total > 0 && zc.total === 0) {
    actions.push({
      title: 'Translate sectors into zones',
      note: 'Sector arrows are placed but no functional zones outlined — draft habitation, food-production, and conservation zones using the sector picture as the input.',
      priority: 'High',
    });
  }

  if (zc.total > 0 && sc.total === 0) {
    actions.push({
      title: 'Map the forces around the zones',
      note: 'Zones are outlined but no sector arrows are placed yet — log wind, sun, fire and view arrows so each zone can be evaluated against the forces acting on it.',
      priority: 'High',
    });
  }

  const highInvasive = zones.filter(
    (z) => z.invasivePressure === 'high' || z.invasivePressure === 'medium',
  );
  if (highInvasive.length > 0) {
    actions.push({
      title: 'Schedule invasive-species intervention',
      note: `${highInvasive.length} zone${highInvasive.length === 1 ? '' : 's'} flagged with medium-or-higher invasive pressure — sequence a removal + replanting plan.`,
      priority: 'Medium',
    });
  }

  if (actions.length === 0) {
    if (sc.total === 0 && zc.total === 0) {
      actions.push({
        title: 'Start the sector + zone picture',
        note: 'Open the Sectors, Microclimates & Zones module and place a first wind arrow plus a primary habitation zone to seed the analysis.',
        priority: 'High',
      });
    } else {
      actions.push({
        title: 'Cross-walk sectors against zones',
        note: 'Walk each zone in turn and confirm every relevant force (wind, sun, fire, noise, wildlife, view) is reflected in the design intent.',
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
      Generated ${esc(fmtDate(data.generatedAt))} · Atlas Sectors, Microclimates &amp; Zones export
    </p>`;

  return baseLayout(
    'Sectors, Microclimates & Zones Report',
    p.name,
    `${hero}${kpiStrip}${sectorSection}${sectorCountsGrid}${zoneSection}${zoneCategoryGrid}${actionsSection}${footer}`,
  );
}
