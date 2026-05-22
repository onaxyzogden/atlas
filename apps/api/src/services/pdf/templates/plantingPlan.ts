/**
 * Planting Plan PDF — captured crop-zone map + merged species schedule.
 *
 * The gradeable artifact for OSU PDC Weeks 7–8 (polyculture / guild design).
 * Composes the client-captured MapLibre canvas image(s) with a legend and a
 * species schedule table merged client-side from guilds (polycultureStore) and
 * crop areas (cropStore) — see `buildPlantingSchedule` on the web side.
 *
 * The map image arrives base64-encoded in `payload.plantingPlan` (captured on
 * the web client — no server-side map renderer). Mirrors the captured-map
 * pattern of `masterPlan.ts` / `mapSheet.ts`.
 */

import type { ExportDataBag } from './index.js';
import type { MapSheetImage, MapLegendEntry, PlantingScheduleRow } from '@ogden/shared';
import { baseLayout, esc, fmtDate, fmtNumber, notAvailable } from './baseLayout.js';

/** Guard: only emit an <img> for genuine inline image data URLs. */
function isImageDataUrl(s: string): boolean {
  return /^data:image\/(png|jpeg|jpg|webp);base64,/.test(s);
}

function renderMapImage(img: MapSheetImage, idx: number): string {
  if (!isImageDataUrl(img.dataUrl)) return '';
  const ratio =
    img.widthPx && img.heightPx && img.widthPx > 0
      ? (img.heightPx / img.widthPx) * 100
      : null;
  const frame =
    ratio != null
      ? `position:relative;width:100%;padding-bottom:${ratio.toFixed(2)}%`
      : 'position:relative;width:100%';
  const imgStyle =
    ratio != null
      ? 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:contain'
      : 'width:100%;height:auto;display:block';
  return `
    <figure class="card" style="padding:8px;page-break-inside:avoid;margin-bottom:14px">
      <div style="${frame};background:#0b132b;border-radius:4px;overflow:hidden">
        <img src="${img.dataUrl}" alt="Planting plan map sheet ${idx + 1}" style="${imgStyle}" />
      </div>
      ${
        img.caption
          ? `<figcaption style="font-size:9pt;color:#4B5563;text-align:center;margin-top:8px;font-style:italic">${esc(img.caption)}</figcaption>`
          : ''
      }
    </figure>`;
}

function renderLegend(legend: MapLegendEntry[]): string {
  if (legend.length === 0) return '';
  const swatch = (e: MapLegendEntry) => {
    const k = e.kind ?? 'fill';
    const base =
      k === 'line'
        ? `width:18px;height:0;border-top:3px solid ${esc(e.color)}`
        : k === 'point'
          ? `width:12px;height:12px;border-radius:50%;background:${esc(e.color)}`
          : `width:14px;height:14px;border-radius:3px;background:${esc(e.color)};opacity:0.85`;
    return `
      <div style="display:flex;align-items:center;gap:8px">
        <span style="display:inline-block;${base};flex:0 0 auto"></span>
        <span style="font-size:9.5pt;color:#374151">${esc(e.label)}</span>
      </div>`;
  };
  return `
    <h2>Legend</h2>
    <div class="card" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px 18px">
      ${legend.map(swatch).join('')}
    </div>`;
}

function fmtArea(m2: number): string {
  if (m2 >= 10000) return `${(m2 / 10000).toFixed(2)} ha`;
  return `${fmtNumber(m2, 0)} m²`;
}

function speciesCell(row: PlantingScheduleRow): string {
  const latin = row.latinName
    ? `<div style="font-size:8.5pt;color:#9CA3AF;font-style:italic">${esc(row.latinName)}</div>`
    : '';
  return `<td><strong>${esc(row.species)}</strong>${latin}</td>`;
}

function scheduleTable(rows: PlantingScheduleRow[]): string {
  if (rows.length === 0) {
    return `<p style="font-size:9.5pt;color:#9CA3AF;font-style:italic">No species scheduled yet — assemble a guild or assign species to a crop area in the Plan stage to populate the schedule.</p>`;
  }
  const sizeCell = (row: PlantingScheduleRow): string => {
    if (row.sourceKind === 'crop_area' && row.areaM2 != null) return fmtArea(row.areaM2);
    if (row.count != null) return `${row.count}×`;
    return '<span style="color:#9CA3AF">—</span>';
  };
  const renderRow = (row: PlantingScheduleRow): string => `
    <tr>
      ${speciesCell(row)}
      <td style="font-size:9pt;text-transform:capitalize">${row.layer ? esc(row.layer.replace(/_/g, ' ')) : '<span style="color:#9CA3AF">—</span>'}</td>
      <td style="font-size:9pt;color:#4B5563">${esc(row.source)}</td>
      <td>${row.spacingM != null ? `${fmtNumber(row.spacingM, 1)} m` : '<span style="color:#9CA3AF">—</span>'}</td>
      <td>${sizeCell(row)}</td>
    </tr>`;

  const head = `
    <thead>
      <tr>
        <th>Species</th>
        <th style="width:110px">Layer</th>
        <th style="width:150px">Source</th>
        <th style="width:80px">Spacing</th>
        <th style="width:90px">Area / Qty</th>
      </tr>
    </thead>`;

  const guildRows = rows.filter((r) => r.sourceKind === 'guild');
  const cropRows = rows.filter((r) => r.sourceKind === 'crop_area');
  const groupBody = (label: string, group: PlantingScheduleRow[]): string =>
    group.length === 0
      ? ''
      : `<tbody>
          <tr class="total-row"><td colspan="5" style="font-weight:600">${esc(label)}</td></tr>
          ${group.map(renderRow).join('')}
        </tbody>`;

  return `<table>${head}${groupBody('Guilds', guildRows)}${groupBody('Crop areas', cropRows)}</table>`;
}

export function renderPlantingPlan(data: ExportDataBag): string {
  const { project: p, payload } = data;
  const pp = payload?.plantingPlan;

  if (!pp || pp.mapImages.length === 0) {
    return baseLayout(
      'Planting Plan',
      p.name,
      notAvailable(
        'No map capture was supplied. Open the Plan stage, capture the crop-zone map, and assemble at least one guild or crop area, then use "Export sheet → Planting Plan".',
      ),
    );
  }

  const schedule = pp.schedule ?? [];
  const guildCount = new Set(
    schedule.filter((r) => r.sourceKind === 'guild').map((r) => r.source),
  ).size;
  const cropCount = new Set(
    schedule.filter((r) => r.sourceKind === 'crop_area').map((r) => r.source),
  ).size;
  const speciesCount = new Set(schedule.map((r) => r.species.toLowerCase())).size;

  const hero = `
    <div class="card" style="background:linear-gradient(135deg,#ECFDF5 0%,#EFF6FF 100%);border:none;padding:28px;text-align:center">
      <h2 style="border:none;margin:0 0 8px;color:#14532D;font-size:18pt">Planting plan</h2>
      <p style="font-size:11pt;color:#4B5563;max-width:580px;margin:0 auto">
        ${speciesCount} species across
        ${guildCount} guild${guildCount === 1 ? '' : 's'} ·
        ${cropCount} crop area${cropCount === 1 ? '' : 's'}
        for ${esc(p.name)}.
      </p>
    </div>`;

  const mapSection = `
    <h2>Planting map</h2>
    ${pp.mapImages.map((img, i) => renderMapImage(img, i)).join('')}`;

  const legendSection = renderLegend(pp.legend ?? []);

  const narrativeSection = pp.narrative
    ? `<h2>Planting narrative</h2>
       <div class="card">
         ${pp.narrative
           .split(/\n{2,}/)
           .map((para) => `<p style="font-size:10.5pt;color:#374151">${esc(para.trim())}</p>`)
           .join('')}
       </div>`
    : '';

  const scheduleSection = `
    <h2>Species schedule</h2>
    ${scheduleTable(schedule)}`;

  const footer = `
    <p style="font-size:8.5pt;color:#9CA3AF;text-align:center;margin-top:24px">
      Generated ${esc(fmtDate(data.generatedAt))} · Atlas Planting Plan export
    </p>`;

  return baseLayout(
    'Planting Plan',
    p.name,
    `${hero}${mapSection}${legendSection}${narrativeSection}${scheduleSection}${footer}`,
  );
}
