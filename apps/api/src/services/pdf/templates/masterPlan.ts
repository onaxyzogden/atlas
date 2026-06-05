/**
 * Master Plan PDF — composite design-map export (Plan stage).
 *
 * Renders the client-captured MapLibre canvas image(s) as the gradeable
 * visual artifact (OSU PDC Weeks 2/4/9/10), composed with a feature legend,
 * a zone roster, a phase breakdown, and an optional designer narrative.
 *
 * The map image arrives base64-encoded in `payload.mapSheet` (captured on the
 * web client — no server-side map renderer). The zone roster prefers the
 * client-supplied `zones` (areas computed via turf); when absent it falls
 * back to deriving a feature inventory from the project's persisted
 * `designFeatures`.
 */

import type { ExportDataBag, DesignFeatureRow } from './index.js';
import type { MapSheetImage, MapLegendEntry } from '@ogden/shared';
import { baseLayout, esc, fmtDate, fmtNumber, notAvailable } from './baseLayout.js';

const FEATURE_TYPE_LABEL: Record<string, string> = {
  zone: 'Zone',
  sector: 'Sector',
  structure: 'Structure',
  access: 'Access',
  utility: 'Utility',
  water: 'Water feature',
  planting: 'Planting',
  earthwork: 'Earthwork',
  paddock: 'Paddock',
};

function labelFeatureType(t: string): string {
  return FEATURE_TYPE_LABEL[t] ?? t.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

function fmtArea(m2: number): string {
  if (m2 >= 10000) return `${(m2 / 10000).toFixed(2)} ha`;
  return `${fmtNumber(m2, 0)} m²`;
}

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
        <img src="${img.dataUrl}" alt="Master plan map sheet ${idx + 1}" style="${imgStyle}" />
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

interface ZoneRosterRow {
  name: string;
  category: string;
  primaryUse?: string;
  areaM2?: number;
  permacultureZone?: number;
  phaseTag?: string;
}

function deriveZonesFromFeatures(features: DesignFeatureRow[]): ZoneRosterRow[] {
  return features
    .filter((f) => f.feature_type === 'zone')
    .map((f) => {
      const props = f.properties ?? {};
      const area = typeof props['areaM2'] === 'number' ? (props['areaM2'] as number) : undefined;
      const pcZone =
        typeof props['permacultureZone'] === 'number'
          ? (props['permacultureZone'] as number)
          : undefined;
      const primaryUse =
        typeof props['primaryUse'] === 'string' ? (props['primaryUse'] as string) : undefined;
      const category =
        f.subtype ??
        (typeof props['category'] === 'string' ? (props['category'] as string) : 'uncategorized');
      return {
        name: f.label ?? 'Unnamed zone',
        category,
        primaryUse,
        areaM2: area,
        permacultureZone: pcZone,
        phaseTag: f.phase_tag ?? undefined,
      };
    });
}

export function renderMasterPlan(data: ExportDataBag): string {
  const { project: p, payload, designFeatures } = data;
  const ms = payload?.mapSheet;

  if (!ms || ms.mapImages.length === 0) {
    return baseLayout(
      'Master Plan',
      p.name,
      notAvailable(
        'No map capture was supplied. Open the Plan stage, arrange the design canvas, and use "Export master plan" to capture the rendered map with its drawn zones, sectors, and structures.',
      ),
    );
  }

  // ─── Zone roster: prefer client payload, else derive from features ──
  const zones: ZoneRosterRow[] =
    ms.zones && ms.zones.length > 0
      ? ms.zones.map((z) => ({
          name: z.name,
          category: z.category,
          primaryUse: z.primaryUse,
          areaM2: z.areaM2,
          permacultureZone: z.permacultureZone,
          phaseTag: z.phaseTag,
        }))
      : deriveZonesFromFeatures(designFeatures);

  const totalZoneArea = zones.reduce((sum, z) => sum + (z.areaM2 ?? 0), 0);

  // ─── Feature inventory by type (from persisted design features) ────
  const typeCounts = new Map<string, number>();
  for (const f of designFeatures) {
    typeCounts.set(f.feature_type, (typeCounts.get(f.feature_type) ?? 0) + 1);
  }
  const typeEntries = [...typeCounts.entries()].sort((a, b) => b[1] - a[1]);

  // ─── Phase breakdown ───────────────────────────────────────────────
  const phaseCounts = new Map<string, number>();
  for (const f of designFeatures) {
    const tag = f.phase_tag ?? 'Unphased';
    phaseCounts.set(tag, (phaseCounts.get(tag) ?? 0) + 1);
  }
  const phaseEntries = [...phaseCounts.entries()].sort((a, b) => b[1] - a[1]);

  // ─── Hero ──────────────────────────────────────────────────────────
  const hero = `
    <div class="card" style="background:linear-gradient(135deg,#ECFDF5 0%,#EFF6FF 100%);border:none;padding:28px;text-align:center">
      <h2 style="border:none;margin:0 0 8px;color:#14532D;font-size:18pt">Master plan</h2>
      <p style="font-size:11pt;color:#4B5563;max-width:580px;margin:0 auto">
        ${designFeatures.length} design feature${designFeatures.length === 1 ? '' : 's'} ·
        ${zones.length} zone${zones.length === 1 ? '' : 's'}${totalZoneArea > 0 ? ` · ${fmtArea(totalZoneArea)} zoned` : ''}
        for ${esc(p.name)}.
        ${ms.prevailingWind ? `Prevailing wind from <strong>${esc(ms.prevailingWind)}</strong>.` : ''}
      </p>
    </div>`;

  // ─── Map sheet(s) ──────────────────────────────────────────────────
  const mapSection = `
    <h2>Design map</h2>
    ${ms.mapImages.map((img, i) => renderMapImage(img, i)).join('')}`;

  const legendSection = renderLegend(ms.legend ?? []);

  // ─── Narrative ─────────────────────────────────────────────────────
  const narrativeSection = ms.narrative
    ? `<h2>Design narrative</h2>
       <div class="card">
         ${ms.narrative
           .split(/\n{2,}/)
           .map((para) => `<p style="font-size:10.5pt;color:#374151">${esc(para.trim())}</p>`)
           .join('')}
       </div>`
    : '';

  // ─── Zone roster ───────────────────────────────────────────────────
  const zoneTable =
    zones.length === 0
      ? `<p style="font-size:9.5pt;color:#9CA3AF;font-style:italic">No zones outlined yet — draw functional zones in the Plan stage to populate the roster.</p>`
      : `<table>
          <thead>
            <tr>
              <th>Name</th>
              <th style="width:140px">Category</th>
              <th style="width:80px">Area</th>
              <th style="width:64px">PC zone</th>
              <th style="width:90px">Phase</th>
              <th>Primary use</th>
            </tr>
          </thead>
          <tbody>
            ${[...zones]
              .sort((a, b) => (b.areaM2 ?? 0) - (a.areaM2 ?? 0))
              .map(
                (z) => `
              <tr>
                <td><strong>${esc(z.name)}</strong></td>
                <td style="font-size:9pt;text-transform:capitalize">${esc(z.category.replace(/_/g, ' '))}</td>
                <td>${z.areaM2 != null ? fmtArea(z.areaM2) : '<span style="color:#9CA3AF">—</span>'}</td>
                <td>${z.permacultureZone != null ? `Z${z.permacultureZone}` : '<span style="color:#9CA3AF">—</span>'}</td>
                <td>${z.phaseTag ? `<span class="badge badge-phase">${esc(z.phaseTag)}</span>` : '<span style="color:#9CA3AF">—</span>'}</td>
                <td style="font-size:9pt;color:#4B5563">${z.primaryUse ? esc(z.primaryUse) : '<span style="color:#9CA3AF">—</span>'}</td>
              </tr>`,
              )
              .join('')}
          </tbody>
          ${
            totalZoneArea > 0
              ? `<tbody><tr class="total-row"><td colspan="2">Total zoned area</td><td>${fmtArea(totalZoneArea)}</td><td colspan="3"></td></tr></tbody>`
              : ''
          }
        </table>`;

  const zoneSection = `
    <h2>Zone roster</h2>
    ${zoneTable}`;

  // ─── Feature inventory ─────────────────────────────────────────────
  const kpiCard = (label: string, value: string, accent: string, note?: string) => `
    <div class="card" style="border-left:4px solid ${accent}">
      <div class="card-header">${esc(label)}</div>
      <div class="card-value" style="color:${accent}">${value}</div>
      ${note ? `<p style="font-size:9pt;color:#4B5563;margin:6px 0 0">${esc(note)}</p>` : ''}
    </div>`;

  const inventorySection =
    typeEntries.length === 0
      ? ''
      : `
        <h2>Feature inventory</h2>
        <div class="card-grid">
          ${typeEntries
            .map(([t, n]) => kpiCard(labelFeatureType(t), String(n), '#15803D', `${n} placed`))
            .join('')}
        </div>`;

  // ─── Phase breakdown ───────────────────────────────────────────────
  const phaseSection =
    phaseEntries.length <= 1
      ? ''
      : `
        <h2>Phasing</h2>
        <table>
          <thead><tr><th>Phase</th><th style="width:120px">Features</th></tr></thead>
          <tbody>
            ${phaseEntries
              .map(
                ([tag, n]) => `
              <tr>
                <td><strong>${esc(tag)}</strong></td>
                <td>${n}</td>
              </tr>`,
              )
              .join('')}
          </tbody>
        </table>`;

  const footer = `
    <p style="font-size:8.5pt;color:#9CA3AF;text-align:center;margin-top:24px">
      Generated ${esc(fmtDate(data.generatedAt))} · Atlas Master Plan export
    </p>`;

  return baseLayout(
    'Master Plan',
    p.name,
    `${hero}${mapSection}${legendSection}${narrativeSection}${zoneSection}${inventorySection}${phaseSection}${footer}`,
  );
}
