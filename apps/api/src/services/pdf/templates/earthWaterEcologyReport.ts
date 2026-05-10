/**
 * Earth · Water · Ecology Report PDF — Observe Module 4 export.
 *
 * Renders the soil-sample lab roster, water-systems inventory (earthworks /
 * storage / watercourses), ecology observations + zones, and a site-layer
 * synthesis covering watershed, wetlands, and critical habitat — all from
 * the EWE Diagnostics dashboard.
 */

import type { ExportDataBag } from './index.js';
import { baseLayout, esc, fmtDate, fmtNumber, notAvailable } from './baseLayout.js';

interface SoilSampleEntry {
  id: string;
  sampleDate: string;
  label: string;
  depth: string;
  ph?: number;
  organicMatterPct?: number;
  texture?: string;
  cecMeq100g?: number;
  ecDsM?: number;
  bulkDensityGCm3?: number;
  biologicalActivity?: string;
  percolationInPerHr?: number;
  depthToBedrockM?: number;
  hasJarTest?: boolean;
  hasRoofCatchment?: boolean;
  notes?: string;
  lab?: string;
  location?: [number, number];
}

interface EweEntry {
  soilSamples: SoilSampleEntry[];
  waterSystems: {
    earthworks: { id: string; type: string; lengthM?: number; notes?: string; createdAt: string }[];
    storageInfra: {
      id: string;
      type: string;
      center: [number, number];
      capacityL?: number;
      notes?: string;
      createdAt: string;
    }[];
    watercourses: { id: string; kind: string; perennial?: boolean; notes?: string; createdAt: string }[];
  };
  ecology: {
    observations: {
      id: string;
      species: string;
      trophicLevel?: string;
      notes?: string;
      observedAt: string;
      location?: [number, number];
    }[];
    zones: { id: string; dominantStage: string; label?: string; notes?: string; createdAt: string }[];
    successionStage?: string;
  };
  siteLayers?: {
    watershed?: Record<string, unknown>;
    wetlandsPresent?: boolean;
    criticalHabitatPresent?: boolean;
    soilsSummary?: Record<string, unknown>;
  };
}

function phTone(avgPh: number | null): { value: string; color: string; note: string } {
  if (avgPh == null) return { value: '—', color: '#6B7280', note: 'No soil samples yet' };
  const v = avgPh.toFixed(1);
  if (avgPh < 5.5 || avgPh > 8) return { value: v, color: '#DC2626', note: 'Outside typical range — amend before planting' };
  if (avgPh < 6 || avgPh > 7.5) return { value: v, color: '#CA8A04', note: 'Mildly off-neutral — monitor sensitive crops' };
  return { value: v, color: '#15803D', note: 'Near-neutral — most crops will tolerate' };
}

function omTone(avgOm: number | null): { value: string; color: string; note: string } {
  if (avgOm == null) return { value: '—', color: '#6B7280', note: 'No OM readings yet' };
  const v = `${avgOm.toFixed(1)}%`;
  if (avgOm >= 4) return { value: v, color: '#15803D', note: 'Healthy biology and water-holding' };
  if (avgOm >= 2) return { value: v, color: '#CA8A04', note: 'Build with cover crops and mulch' };
  return { value: v, color: '#DC2626', note: 'Low — prioritise carbon and microbial inputs' };
}

function avgOf(arr: (number | undefined)[]): number | null {
  const vals = arr.filter((v): v is number => v != null);
  return vals.length === 0 ? null : vals.reduce((a, b) => a + b, 0) / vals.length;
}

function fmtCoords(loc: [number, number]): string {
  return `${loc[1].toFixed(5)}°, ${loc[0].toFixed(5)}°`;
}

export function renderEarthWaterEcologyReport(data: ExportDataBag): string {
  const { project: p, payload } = data;
  const ewe = payload?.earthWaterEcology;

  if (!ewe) {
    return baseLayout(
      'Earth · Water · Ecology Report',
      p.name,
      notAvailable(
        'No Earth · Water · Ecology observations have been recorded yet. Use the Earth, Water & Ecology Diagnostics module in the Observe stage to log soil samples, map water features (earthworks / storage / watercourses), and record species observations.',
      ),
    );
  }

  const entry: EweEntry = ewe;
  const samples = entry.soilSamples;
  const water = entry.waterSystems;
  const ecology = entry.ecology;
  const layers = entry.siteLayers ?? {};

  const waterCount = water.earthworks.length + water.storageInfra.length + water.watercourses.length;
  const avgPh = avgOf(samples.map((s) => s.ph));
  const avgOm = avgOf(samples.map((s) => s.organicMatterPct));
  const ph = phTone(avgPh);
  const om = omTone(avgOm);

  const jarCount = samples.filter((s) => s.hasJarTest).length;
  const percSamples = samples.filter((s) => s.percolationInPerHr != null);
  const percAvg = avgOf(percSamples.map((s) => s.percolationInPerHr));
  const roofCount = samples.filter((s) => s.hasRoofCatchment).length;

  // ─── Hero ─────────────────────────────────────────────────────────
  const hero = `
    <div class="card" style="background:linear-gradient(135deg,#ECFDF5 0%,#ECFEFF 100%);border:none;padding:28px;text-align:center">
      <h2 style="border:none;margin:0 0 8px;color:#14532D;font-size:18pt">Earth · Water · Ecology synthesis</h2>
      <p style="font-size:11pt;color:#4B5563;max-width:560px;margin:0 auto">
        ${samples.length} soil sample${samples.length === 1 ? '' : 's'} ·
        ${waterCount} water feature${waterCount === 1 ? '' : 's'} ·
        ${ecology.observations.length} ecology observation${ecology.observations.length === 1 ? '' : 's'}
        captured for ${esc(p.name)}.
        ${
          ecology.successionStage
            ? `Site-wide successional stage: <strong>${esc(ecology.successionStage)}</strong>.`
            : 'Set a site-wide succession stage to track ecological trajectory over time.'
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
    <h2>Diagnostics summary</h2>
    <div class="card-grid">
      ${kpiCard('Average soil pH', ph.value, ph.color, ph.note)}
      ${kpiCard('Organic matter', om.value, om.color, om.note)}
      ${kpiCard(
        'Water features',
        String(waterCount),
        waterCount === 0 ? '#6B7280' : '#0F766E',
        waterCount === 0
          ? 'Map swales, ponds, and streams to start'
          : `${water.earthworks.length} earthwork · ${water.storageInfra.length} storage · ${water.watercourses.length} watercourse`,
      )}
      ${kpiCard(
        'Ecology observations',
        String(ecology.observations.length),
        ecology.observations.length === 0 ? '#6B7280' : '#15803D',
        ecology.observations.length === 0
          ? 'Log species sightings via the ecology tools'
          : `${ecology.zones.length} ecology zone${ecology.zones.length === 1 ? '' : 's'} mapped`,
      )}
    </div>`;

  // ─── Soil sample table ────────────────────────────────────────────
  const soilTable =
    samples.length === 0
      ? `<p style="font-size:9.5pt;color:#9CA3AF;font-style:italic">No soil samples yet — drop one with the soil-sample tool.</p>`
      : `<table>
          <thead>
            <tr>
              <th style="width:90px">Date</th>
              <th>Label</th>
              <th style="width:80px">Depth</th>
              <th style="width:50px">pH</th>
              <th style="width:60px">OM%</th>
              <th style="width:90px">Texture</th>
              <th style="width:80px">Bio activity</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${samples
              .map(
                (s) => `
              <tr>
                <td>${esc(fmtDate(s.sampleDate))}</td>
                <td><strong>${esc(s.label)}</strong>${s.lab ? `<br/><span style="font-size:9pt;color:#6B7280">${esc(s.lab)}</span>` : ''}</td>
                <td style="font-size:9pt">${esc(s.depth)}</td>
                <td>${s.ph != null ? `<span style="color:${phTone(s.ph).color}">${s.ph.toFixed(1)}</span>` : '<span style="color:#9CA3AF">—</span>'}</td>
                <td>${s.organicMatterPct != null ? `${s.organicMatterPct.toFixed(1)}%` : '<span style="color:#9CA3AF">—</span>'}</td>
                <td style="font-size:9pt">${s.texture ? esc(s.texture) : '<span style="color:#9CA3AF">—</span>'}</td>
                <td style="font-size:9pt">${s.biologicalActivity ? esc(s.biologicalActivity) : '<span style="color:#9CA3AF">—</span>'}</td>
                <td style="font-size:9pt;color:#4B5563">${s.notes ? esc(s.notes) : '<span style="color:#9CA3AF">—</span>'}</td>
              </tr>`,
              )
              .join('')}
          </tbody>
        </table>`;

  const soilSection = `
    <h2>Soil samples</h2>
    ${soilTable}`;

  // ─── Lab-test mini-grid ───────────────────────────────────────────
  const labGrid = `
    <h2>Field-test inventory</h2>
    <div class="card-grid">
      ${kpiCard(
        'Jar tests',
        String(jarCount),
        jarCount === 0 ? '#6B7280' : '#15803D',
        jarCount === 0 ? 'Run a jar test to confirm texture' : `${jarCount} of ${samples.length} samples`,
      )}
      ${kpiCard(
        'Percolation',
        percSamples.length === 0 ? '—' : `${percSamples.length} test${percSamples.length === 1 ? '' : 's'}`,
        percSamples.length === 0 ? '#6B7280' : '#0F766E',
        percAvg != null ? `Avg ${percAvg.toFixed(2)} in/hr` : 'No perc tests recorded',
      )}
      ${kpiCard(
        'Roof catchment',
        String(roofCount),
        roofCount === 0 ? '#6B7280' : '#0F766E',
        roofCount === 0 ? 'No roof-catchment context' : `${roofCount} sample${roofCount === 1 ? '' : 's'} tied to a roof`,
      )}
    </div>`;

  // ─── Water systems table ──────────────────────────────────────────
  const earthworksTable =
    water.earthworks.length === 0
      ? `<p style="font-size:9.5pt;color:#9CA3AF;font-style:italic">No earthworks mapped yet.</p>`
      : `<table>
          <thead>
            <tr>
              <th>Type</th>
              <th style="width:90px">Length</th>
              <th>Notes</th>
              <th style="width:110px">Logged</th>
            </tr>
          </thead>
          <tbody>
            ${water.earthworks
              .map(
                (e) => `
              <tr>
                <td><strong>${esc(e.type)}</strong></td>
                <td>${e.lengthM != null ? `${fmtNumber(e.lengthM, 0)} m` : '<span style="color:#9CA3AF">—</span>'}</td>
                <td style="font-size:9.5pt;color:#4B5563">${e.notes ? esc(e.notes) : '<span style="color:#9CA3AF">—</span>'}</td>
                <td>${esc(fmtDate(e.createdAt))}</td>
              </tr>`,
              )
              .join('')}
          </tbody>
        </table>`;

  const storageTable =
    water.storageInfra.length === 0
      ? `<p style="font-size:9.5pt;color:#9CA3AF;font-style:italic">No storage infrastructure mapped yet.</p>`
      : `<table>
          <thead>
            <tr>
              <th>Type</th>
              <th style="width:110px">Capacity</th>
              <th style="width:160px">Location</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${water.storageInfra
              .map(
                (s) => `
              <tr>
                <td><strong>${esc(s.type)}</strong></td>
                <td>${s.capacityL != null ? `${fmtNumber(s.capacityL, 0)} L` : '<span style="color:#9CA3AF">—</span>'}</td>
                <td style="font-size:9pt;color:#4B5563">${esc(fmtCoords(s.center))}</td>
                <td style="font-size:9.5pt;color:#4B5563">${s.notes ? esc(s.notes) : '<span style="color:#9CA3AF">—</span>'}</td>
              </tr>`,
              )
              .join('')}
          </tbody>
        </table>`;

  const watercoursesTable =
    water.watercourses.length === 0
      ? `<p style="font-size:9.5pt;color:#9CA3AF;font-style:italic">No watercourses traced yet — walk the site after rain.</p>`
      : `<table>
          <thead>
            <tr>
              <th>Kind</th>
              <th style="width:90px">Perennial?</th>
              <th>Notes</th>
              <th style="width:110px">Logged</th>
            </tr>
          </thead>
          <tbody>
            ${water.watercourses
              .map(
                (w) => `
              <tr>
                <td><strong>${esc(w.kind)}</strong></td>
                <td>${w.perennial == null ? '<span style="color:#9CA3AF">—</span>' : w.perennial ? 'Yes' : 'Seasonal'}</td>
                <td style="font-size:9.5pt;color:#4B5563">${w.notes ? esc(w.notes) : '<span style="color:#9CA3AF">—</span>'}</td>
                <td>${esc(fmtDate(w.createdAt))}</td>
              </tr>`,
              )
              .join('')}
          </tbody>
        </table>`;

  const waterSection = `
    <h2>Water systems</h2>
    <h3 style="font-size:11pt;color:#0F766E;margin:14px 0 6px">Earthworks</h3>
    ${earthworksTable}
    <h3 style="font-size:11pt;color:#0F766E;margin:14px 0 6px">Storage infrastructure</h3>
    ${storageTable}
    <h3 style="font-size:11pt;color:#0F766E;margin:14px 0 6px">Watercourses</h3>
    ${watercoursesTable}`;

  // ─── Ecology section ──────────────────────────────────────────────
  const obsTable =
    ecology.observations.length === 0
      ? `<p style="font-size:9.5pt;color:#9CA3AF;font-style:italic">No species observations yet — log fauna, flora, and fungi as you walk the site.</p>`
      : `<table>
          <thead>
            <tr>
              <th>Species</th>
              <th style="width:110px">Trophic level</th>
              <th style="width:110px">Observed</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${ecology.observations
              .map(
                (o) => `
              <tr>
                <td><strong>${esc(o.species)}</strong></td>
                <td style="font-size:9.5pt;color:#4B5563">${o.trophicLevel ? esc(o.trophicLevel) : '<span style="color:#9CA3AF">—</span>'}</td>
                <td>${esc(fmtDate(o.observedAt))}</td>
                <td style="font-size:9.5pt;color:#4B5563">${o.notes ? esc(o.notes) : '<span style="color:#9CA3AF">—</span>'}</td>
              </tr>`,
              )
              .join('')}
          </tbody>
        </table>`;

  const ecologySection = `
    <h2>Ecology observations &amp; zones</h2>
    ${obsTable}
    ${
      ecology.zones.length === 0
        ? ''
        : `<p style="font-size:9.5pt;color:#4B5563;margin:10px 0 0">
            <strong>${ecology.zones.length}</strong> ecology zone${ecology.zones.length === 1 ? '' : 's'} mapped${
              ecology.successionStage ? ` · site stage: <strong>${esc(ecology.successionStage)}</strong>` : ''
            }.
          </p>`
    }`;

  // ─── Site-layer synthesis (2×2) ───────────────────────────────────
  const watershedSummary = layers.watershed ?? null;
  const flowDir =
    watershedSummary && typeof watershedSummary === 'object'
      ? (watershedSummary as Record<string, unknown>).flow_direction
      : null;
  const nearestStream =
    watershedSummary && typeof watershedSummary === 'object'
      ? (watershedSummary as Record<string, unknown>).nearest_stream_m
      : null;

  const soilsSummary = layers.soilsSummary ?? null;
  const soilsTexture =
    soilsSummary && typeof soilsSummary === 'object'
      ? (soilsSummary as Record<string, unknown>).predominant_texture
      : null;
  const soilsDrainage =
    soilsSummary && typeof soilsSummary === 'object'
      ? (soilsSummary as Record<string, unknown>).drainage_class
      : null;

  const synthesis = `
    <h2>Site-layer synthesis</h2>
    <div class="card-grid-2">
      <div class="card" style="border-left:4px solid #0F766E;background:#ECFEFF">
        <h3 style="color:#0F766E;margin:0 0 6px">Watershed &amp; flow</h3>
        <p style="font-size:9.5pt;color:#4B5563;margin:0">
          ${
            watershedSummary
              ? `${flowDir ? `Flow direction: <strong>${esc(String(flowDir))}</strong>. ` : ''}${
                  nearestStream != null ? `Nearest stream: ${esc(String(nearestStream))} m.` : ''
                }${!flowDir && nearestStream == null ? 'Watershed layer present — drill in via the site-data inspector.' : ''}`
              : 'No watershed layer attached — fetch the watershed site-data layer to populate.'
          }
        </p>
      </div>
      <div class="card" style="border-left:4px solid #15803D;background:#ECFDF5">
        <h3 style="color:#15803D;margin:0 0 6px">Wetlands proximity</h3>
        <p style="font-size:9.5pt;color:#4B5563;margin:0">
          ${
            layers.wetlandsPresent
              ? 'Wetlands intersect the site footprint — design a riparian buffer and avoid disturbance in regulated zones.'
              : 'No mapped wetlands on or adjacent to the site footprint.'
          }
        </p>
      </div>
      <div class="card" style="border-left:4px solid ${layers.criticalHabitatPresent ? '#DC2626' : '#6B7280'};background:${layers.criticalHabitatPresent ? '#FEE2E2' : '#F3F4F6'}">
        <h3 style="color:${layers.criticalHabitatPresent ? '#DC2626' : '#6B7280'};margin:0 0 6px">Critical habitat</h3>
        <p style="font-size:9.5pt;color:#4B5563;margin:0">
          ${
            layers.criticalHabitatPresent
              ? 'Critical habitat is present on or near the site — coordinate with regulators before earthworks.'
              : 'No critical-habitat overlap detected on the current layers.'
          }
        </p>
      </div>
      <div class="card" style="border-left:4px solid #CA8A04;background:#FEF3C7">
        <h3 style="color:#CA8A04;margin:0 0 6px">Soils layer</h3>
        <p style="font-size:9.5pt;color:#4B5563;margin:0">
          ${
            soilsSummary
              ? `${soilsTexture ? `Predominant texture: <strong>${esc(String(soilsTexture))}</strong>. ` : ''}${
                  soilsDrainage ? `Drainage class: <strong>${esc(String(soilsDrainage))}</strong>.` : ''
                }${!soilsTexture && !soilsDrainage ? 'Soils layer attached — drill in via the site-data inspector.' : ''}`
              : 'No soils layer attached — fetch SSURGO / SoilGrids to populate.'
          }
        </p>
      </div>
    </div>`;

  // ─── Recommended actions ──────────────────────────────────────────
  const actions: Array<[string, string, string]> = [];
  if (water.watercourses.length === 0)
    actions.push([
      'Trace watercourses',
      'High',
      'Walk the site after rain and mark perennial / seasonal flow paths on the map.',
    ]);
  if (jarCount < samples.length)
    actions.push([
      'Run jar tests on remaining samples',
      'Medium',
      'Texture confirmation guides drainage, percolation, and structural decisions.',
    ]);
  if (layers.wetlandsPresent)
    actions.push([
      'Map riparian buffer',
      'High',
      'Wetlands present — define a setback line and re-vegetate with natives before earthworks.',
    ]);
  if (water.earthworks.length === 0)
    actions.push([
      'Design a contour swale',
      'High',
      'Capture runoff before it concentrates into erosion channels.',
    ]);
  if (ecology.zones.length === 0)
    actions.push([
      'Outline ecology zones',
      'Medium',
      'Patch-by-patch mapping anchors successional planning and zone transitions.',
    ]);
  if (actions.length === 0)
    actions.push([
      'Walk the site to verify ecology zones',
      'Medium',
      'Ground-truth desktop derivations and update zone polygons accordingly.',
    ]);

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
          .map(
            ([title, priority, rationale]) => `
          <tr>
            <td><strong>${esc(title)}</strong></td>
            <td>
              <span class="badge" style="background:${priority === 'High' ? '#DC2626' : priority === 'Medium' ? '#CA8A04' : '#6B7280'};color:#fff">
                ${esc(priority)}
              </span>
            </td>
            <td style="font-size:9.5pt;color:#4B5563">${esc(rationale)}</td>
          </tr>`,
          )
          .join('')}
      </tbody>
    </table>`;

  const body = `
    ${hero}
    ${kpiStrip}
    ${soilSection}
    ${labGrid}
    ${waterSection}
    ${ecologySection}
    ${synthesis}
    ${actionsTable}
    <div class="disclaimer">
      Earth · Water · Ecology report distilled from ${samples.length} soil sample${samples.length === 1 ? '' : 's'}, ${waterCount} water feature${waterCount === 1 ? '' : 's'}, and ${ecology.observations.length} ecology observation${ecology.observations.length === 1 ? '' : 's'}. Pre-site-visit narrative — verify with on-site walks and lab confirmations before committing to designs.
    </div>`;

  return baseLayout('Earth · Water · Ecology Report', p.name, body);
}
