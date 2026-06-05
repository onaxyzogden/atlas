/**
 * Map Sheet PDFs — thin captured-map exports (Plan stage).
 *
 * `base_map_sheet` (OSU PDC Week 2) and `zone_map_sheet` (Week 4) are the
 * single-artifact siblings of the full `master_plan`: a client-captured
 * MapLibre canvas image plus an optional legend and caption, with no
 * inventory tables. Both share `payload.mapSheet` (MasterPlanPayload).
 */

import type { ExportDataBag } from './index.js';
import type { MapSheetImage, MapLegendEntry } from '@ogden/shared';
import { baseLayout, esc, fmtDate, notAvailable } from './baseLayout.js';

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
        <img src="${img.dataUrl}" alt="Map sheet ${idx + 1}" style="${imgStyle}" />
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

function renderSheet(data: ExportDataBag, title: string, emptyHint: string): string {
  const { project: p, payload } = data;
  const ms = payload?.mapSheet;

  if (!ms || ms.mapImages.length === 0) {
    return baseLayout(title, p.name, notAvailable(emptyHint));
  }

  const mapSection = ms.mapImages.map((img, i) => renderMapImage(img, i)).join('');
  const legendSection = renderLegend(ms.legend ?? []);
  const narrativeSection = ms.narrative
    ? `<div class="card"><p style="font-size:10.5pt;color:#374151">${esc(ms.narrative)}</p></div>`
    : '';
  const footer = `
    <p style="font-size:8.5pt;color:#9CA3AF;text-align:center;margin-top:24px">
      Generated ${esc(fmtDate(data.generatedAt))} · Atlas ${esc(title)} export
    </p>`;

  return baseLayout(title, p.name, `${mapSection}${legendSection}${narrativeSection}${footer}`);
}

export function renderBaseMapSheet(data: ExportDataBag): string {
  return renderSheet(
    data,
    'Base Map',
    'No map capture was supplied. Open the Plan stage and use "Export base map" to capture the parcel basemap with its boundary.',
  );
}

export function renderZoneMapSheet(data: ExportDataBag): string {
  return renderSheet(
    data,
    'Zone Map',
    'No map capture was supplied. Open the Plan stage, draw your current zones, and use "Export zone map" to capture the annotated zone sheet.',
  );
}
