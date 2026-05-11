/**
 * Topography Report PDF — Observe Module 3 export.
 *
 * Renders the elevation summary, feature counts, drainage / slope / aspect
 * synthesis, transect inventory, and recommended next actions captured in
 * the Topography & Base Map dashboard.
 */

import type { ExportDataBag } from './index.js';
import { baseLayout, esc, fmtDate, fmtNumber, notAvailable } from './baseLayout.js';

interface TopoEntry {
  contours: { id: string; elevationM?: number; notes?: string; createdAt: string }[];
  highPoints: {
    id: string;
    position: [number, number];
    kind: 'high' | 'low';
    elevationM?: number;
    label?: string;
    notes?: string;
    createdAt: string;
  }[];
  drainageLines: { id: string; notes?: string; createdAt: string }[];
  transects: {
    id: string;
    name: string;
    pointA: [number, number];
    pointB: [number, number];
    sampledAt?: string;
    sourceApi?: string | null;
    confidence?: 'high' | 'medium' | 'low';
    totalDistanceM?: number;
    notes?: string;
  }[];
}

function fmtCoords(loc: [number, number]): string {
  return `${loc[1].toFixed(5)}°, ${loc[0].toFixed(5)}°`;
}

function severityForSlope(maxSlope: number | null | undefined): {
  label: string;
  color: string;
  background: string;
  detail: string;
} {
  if (maxSlope == null) {
    return {
      label: 'Slope unknown',
      color: '#6B7280',
      background: '#F3F4F6',
      detail: 'Sample a DEM transect to surface erosion-risk indicators.',
    };
  }
  if (maxSlope > 25) {
    return {
      label: 'Steep zones present',
      color: '#DC2626',
      background: '#FEE2E2',
      detail: `Max slope ${maxSlope.toFixed(1)}° — protect with vegetation; avoid cut/fill on these grades.`,
    };
  }
  if (maxSlope > 15) {
    return {
      label: 'Moderate slope',
      color: '#CA8A04',
      background: '#FEF3C7',
      detail: `Max slope ${maxSlope.toFixed(1)}° — manage with on-contour planting and keyline swales where flow concentrates.`,
    };
  }
  return {
    label: 'Low erosion risk',
    color: '#15803D',
    background: '#ECFDF5',
    detail: `Max slope ${maxSlope.toFixed(1)}° — gentle grades overall. Still protect ridge lines and swale entries.`,
  };
}

export function renderTopographyReport(data: ExportDataBag): string {
  const { project: p, payload } = data;
  const topo = payload?.topography;

  if (!topo) {
    return baseLayout(
      'Topography Report',
      p.name,
      notAvailable(
        'No topographic observations have been recorded yet. Use the Topography & Base Map module in the Observe stage to trace contours, pin high/low points, mark drainage, and run A–B transects.',
      ),
    );
  }

  const entry: TopoEntry = topo;
  const summary = topo.elevationSummary ?? null;
  const counts = {
    contours: entry.contours.length,
    highPoints: entry.highPoints.length,
    drainageLines: entry.drainageLines.length,
    transects: entry.transects.length,
  };
  const totalAnnotations = counts.contours + counts.highPoints + counts.drainageLines;

  const range =
    summary?.min_elevation_m != null && summary?.max_elevation_m != null
      ? Math.round(summary.max_elevation_m - summary.min_elevation_m)
      : null;
  const aspect = summary?.predominant_aspect ?? null;
  const meanSlope = summary?.mean_slope_deg ?? null;

  // ─── Hero ─────────────────────────────────────────────────────────
  const hero = `
    <div class="card" style="background:linear-gradient(135deg,#ECFDF5 0%,#FEF3C7 100%);border:none;padding:28px;text-align:center">
      <h2 style="border:none;margin:0 0 8px;color:#14532D;font-size:18pt">Terrain &amp; base-map synthesis</h2>
      <p style="font-size:11pt;color:#4B5563;max-width:540px;margin:0 auto">
        ${
          summary
            ? `${aspect ? `${esc(aspect)}-facing` : 'Site'} terrain with ${
                range != null ? `${range} m of relief` : 'partial relief data'
              }${meanSlope != null ? `, mean slope ${meanSlope.toFixed(1)}°` : ''}.`
            : `Elevation data pending — once a DEM is sampled, this section will summarise the site shape.`
        }
        ${
          totalAnnotations > 0 || counts.transects > 0
            ? `${totalAnnotations} field annotation${totalAnnotations === 1 ? '' : 's'} and ${counts.transects} transect${
                counts.transects === 1 ? '' : 's'
              } captured for ${esc(p.name)}.`
            : `Trace contours, drainage lines, or pin high/low points to start a base map for ${esc(p.name)}.`
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
    <h2>Elevation summary</h2>
    <div class="card-grid">
      ${kpiCard(
        'Mean slope',
        meanSlope != null ? `${meanSlope.toFixed(1)}°` : '—',
        '#15803D',
        meanSlope != null
          ? meanSlope > 15
            ? 'Above typical pasture grade'
            : 'Within typical pasture grade'
          : 'Sample a DEM to populate',
      )}
      ${kpiCard(
        'Max slope',
        summary?.max_slope_deg != null ? `${summary.max_slope_deg.toFixed(1)}°` : '—',
        summary?.max_slope_deg != null && summary.max_slope_deg > 25 ? '#DC2626' : '#CA8A04',
        summary?.max_slope_deg != null && summary.max_slope_deg > 25
          ? 'Erosion-prone — avoid cut/fill'
          : 'Low erosion risk overall',
      )}
      ${kpiCard(
        'Total relief',
        range != null ? `${range} m` : '—',
        '#0F766E',
        summary?.min_elevation_m != null && summary?.max_elevation_m != null
          ? `${fmtNumber(summary.min_elevation_m, 0)} – ${fmtNumber(summary.max_elevation_m, 0)} m above sea level`
          : 'Awaiting elevation sample',
      )}
      ${kpiCard(
        'Predominant aspect',
        aspect ?? '—',
        '#CA8A04',
        aspect ? 'Use to place sun-loving plants and passive-solar buildings' : 'Aspect emerges once DEM sampled',
      )}
    </div>`;

  // ─── Feature inventory ────────────────────────────────────────────
  const featureRow = (label: string, value: number, hint: string) => `
    <tr>
      <td style="width:160px"><strong>${esc(label)}</strong></td>
      <td style="width:80px;text-align:right"><span class="card-value" style="font-size:13pt;color:${value > 0 ? '#15803D' : '#9CA3AF'}">${value}</span></td>
      <td style="font-size:9.5pt;color:#4B5563">${esc(hint)}</td>
    </tr>`;

  const featureInventory = `
    <h2>Field annotation inventory</h2>
    <table>
      <thead>
        <tr>
          <th>Feature</th>
          <th style="text-align:right">Count</th>
          <th>What it unlocks</th>
        </tr>
      </thead>
      <tbody>
        ${featureRow('Contour lines', counts.contours, 'Anchors for swales, roads, and on-contour planting.')}
        ${featureRow('Elevation points', counts.highPoints, 'Buildable benches; storage and sighting anchors.')}
        ${featureRow('Drainage lines', counts.drainageLines, 'Plan swales, ponds, and infiltration where flow concentrates.')}
        ${featureRow('A–B transects', counts.transects, 'Sectional analysis — sun, drainage, cut/fill balance.')}
      </tbody>
    </table>`;

  // ─── Slope / drainage / aspect synthesis ──────────────────────────
  const slope = severityForSlope(summary?.max_slope_deg);
  const drainageNote =
    counts.drainageLines > 0
      ? `${counts.drainageLines} drainage line${counts.drainageLines === 1 ? '' : 's'} traced — design swales, ponds, and infiltration along these flow paths.`
      : 'No drainage lines traced yet. Walk the site after rain and mark seasonal runoff paths to plan water harvesting.';
  const aspectNote = aspect
    ? `Predominant aspect is ${aspect.toLowerCase()}-facing. Place sun-loving polycultures and passive-solar buildings to take advantage; orient frost-sensitive species away from cold-air drainage.`
    : 'Aspect not yet derived. Sample a DEM transect or pin high/low points to surface the predominant facing direction.';

  const synthesis = `
    <h2>Synthesis &amp; design implications</h2>
    <div class="card-grid-2">
      <div class="card" style="border-left:4px solid ${slope.color};background:${slope.background}">
        <h3 style="color:${slope.color};margin:0 0 6px">${esc(slope.label)}</h3>
        <p style="font-size:9.5pt;color:#4B5563;margin:0">${esc(slope.detail)}</p>
      </div>
      <div class="card" style="border-left:4px solid #0F766E;background:#ECFEFF">
        <h3 style="color:#0F766E;margin:0 0 6px">Water &amp; drainage</h3>
        <p style="font-size:9.5pt;color:#4B5563;margin:0">${esc(drainageNote)}</p>
      </div>
      <div class="card" style="border-left:4px solid #CA8A04;background:#FEF3C7">
        <h3 style="color:#CA8A04;margin:0 0 6px">Aspect &amp; solar</h3>
        <p style="font-size:9.5pt;color:#4B5563;margin:0">${esc(aspectNote)}</p>
      </div>
      <div class="card" style="border-left:4px solid #15803D;background:#ECFDF5">
        <h3 style="color:#15803D;margin:0 0 6px">Buildable anchors</h3>
        <p style="font-size:9.5pt;color:#4B5563;margin:0">
          ${
            counts.highPoints > 0
              ? `${counts.highPoints} elevation point${counts.highPoints === 1 ? '' : 's'} pinned — useful for siting buildings, water storage, and zone transitions.`
              : 'Pin high and low points to anchor buildings, storage, and zone boundaries on the map.'
          }
        </p>
      </div>
    </div>`;

  // ─── Transect inventory ───────────────────────────────────────────
  const transectTable =
    entry.transects.length === 0
      ? `<p style="font-size:9.5pt;color:#9CA3AF;font-style:italic">No transects drawn yet — use the cross-section tool to capture a sectional view.</p>`
      : `<table>
          <thead>
            <tr>
              <th>Name</th>
              <th>From → To</th>
              <th style="width:90px">Length</th>
              <th style="width:90px">Source</th>
              <th style="width:80px">Confidence</th>
              <th style="width:110px">Sampled</th>
            </tr>
          </thead>
          <tbody>
            ${entry.transects
              .map((t) => `
                <tr>
                  <td><strong>${esc(t.name)}</strong>${t.notes ? `<br/><span style="font-size:9pt;color:#4B5563">${esc(t.notes)}</span>` : ''}</td>
                  <td style="font-size:9pt;color:#4B5563">${esc(fmtCoords(t.pointA))}<br/>→ ${esc(fmtCoords(t.pointB))}</td>
                  <td>${t.totalDistanceM != null ? `${fmtNumber(t.totalDistanceM, 0)} m` : '<span style="color:#9CA3AF">—</span>'}</td>
                  <td style="font-size:9pt">${t.sourceApi ? esc(t.sourceApi) : '<span style="color:#9CA3AF">synthetic</span>'}</td>
                  <td>${
                    t.confidence
                      ? `<span class="badge" style="background:${t.confidence === 'high' ? '#15803D' : t.confidence === 'medium' ? '#CA8A04' : '#6B7280'};color:#fff">${esc(t.confidence)}</span>`
                      : '<span style="color:#9CA3AF">—</span>'
                  }</td>
                  <td>${t.sampledAt ? esc(fmtDate(t.sampledAt)) : '<span style="color:#9CA3AF">—</span>'}</td>
                </tr>`)
              .join('')}
          </tbody>
        </table>`;

  const transects = `
    <h2>Cross-section transects</h2>
    ${transectTable}`;

  // ─── High / low point inventory ───────────────────────────────────
  const highPointSection =
    entry.highPoints.length === 0
      ? ''
      : `
        <h2>Elevation pins</h2>
        <table>
          <thead>
            <tr>
              <th style="width:70px">Kind</th>
              <th>Label / notes</th>
              <th style="width:120px">Elevation</th>
              <th style="width:160px">Location</th>
              <th style="width:110px">Logged</th>
            </tr>
          </thead>
          <tbody>
            ${entry.highPoints
              .map((h) => `
                <tr>
                  <td>
                    <span class="badge" style="background:${h.kind === 'high' ? '#15803D' : '#0F766E'};color:#fff">
                      ${h.kind === 'high' ? 'High' : 'Low'}
                    </span>
                  </td>
                  <td>${h.label ? `<strong>${esc(h.label)}</strong>` : '<span style="color:#9CA3AF">—</span>'}${
                    h.notes ? `<br/><span style="font-size:9pt;color:#4B5563">${esc(h.notes)}</span>` : ''
                  }</td>
                  <td>${h.elevationM != null ? `${fmtNumber(h.elevationM, 1)} m` : '<span style="color:#9CA3AF">—</span>'}</td>
                  <td style="font-size:9pt;color:#4B5563">${esc(fmtCoords(h.position))}</td>
                  <td>${esc(fmtDate(h.createdAt))}</td>
                </tr>`)
              .join('')}
          </tbody>
        </table>`;

  // ─── Recommended actions ──────────────────────────────────────────
  const actions: Array<[string, string, string]> = [
    [
      counts.drainageLines === 0 ? 'Trace drainage lines' : 'Design water-harvesting system',
      'High',
      counts.drainageLines === 0
        ? 'Walk the site after rain; mark seasonal runoff paths on the map.'
        : 'Place swales / ponds along traced drainage to slow, sink, and spread runoff.',
    ],
    [
      counts.transects === 0 ? 'Draw an A–B transect' : 'Add another transect',
      'High',
      counts.transects === 0
        ? 'Run a cross-section across the steepest gradient to surface cut/fill and microclimate bands.'
        : 'Triangulate by adding a perpendicular transect to validate slope and aspect derivations.',
    ],
    [
      counts.highPoints === 0 ? 'Pin high and low points' : 'Identify building sites',
      'Medium',
      counts.highPoints === 0
        ? 'Anchors help locate buildings, zones, and water storage.'
        : 'Use pinned anchors to triangulate buildable benches and storage locations.',
    ],
    ['Walk the site to verify drainage', 'Medium', 'Ground-truth desktop derivations after the next significant rain.'],
    ['Estimate earthworks (cut/fill)', 'Low', 'Once transects are stable, run a balanced cut/fill estimate per phase.'],
  ];

  const actionsTable = `
    <h2>Recommended next actions</h2>
    <table>
      <thead>
        <tr>
          <th>Action</th>
          <th style="width:90px">Priority</th>
          <th>Rationale</th>
        </tr>
      </thead>
      <tbody>
        ${actions
          .map(([title, priority, rationale]) => `
            <tr>
              <td><strong>${esc(title)}</strong></td>
              <td>
                <span class="badge" style="background:${priority === 'High' ? '#DC2626' : priority === 'Medium' ? '#CA8A04' : '#6B7280'};color:#fff">
                  ${esc(priority)}
                </span>
              </td>
              <td style="font-size:9.5pt;color:#4B5563">${esc(rationale)}</td>
            </tr>`)
          .join('')}
      </tbody>
    </table>`;

  const body = `
    ${hero}
    ${kpiStrip}
    ${featureInventory}
    ${synthesis}
    ${transects}
    ${highPointSection}
    ${actionsTable}
    <div class="disclaimer">
      Topography report distilled from ${totalAnnotations} field annotation${totalAnnotations === 1 ? '' : 's'}, ${counts.transects} transect${counts.transects === 1 ? '' : 's'}, and the sampled DEM elevation summary. Designed to anchor swale, road, and structure-siting decisions in the Plan stage.
    </div>`;

  return baseLayout('Topography Report', p.name, body);
}
