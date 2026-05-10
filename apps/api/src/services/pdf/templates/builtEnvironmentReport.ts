/**
 * Built Environment Report PDF — Observe Module 1 export.
 *
 * Renders the on-site infrastructure inventory across eight kinds
 * (buildings, wells, septics, power lines, buried utilities, fences,
 * gates, existing driveways) with kind/area/length totals, hazard +
 * implications grids, and a heuristic recommended-actions block.
 * Eighth Observe export following the locked 4-file recipe.
 */

import type { ExportDataBag } from './index.js';
import { baseLayout, esc, fmtDate, fmtNumber, notAvailable } from './baseLayout.js';

interface BuildingEntry {
  id: string;
  subtype: 'residence' | 'outbuilding' | 'agricultural' | 'other';
  label?: string;
  notes?: string;
  areaM2?: number;
  createdAt: string;
}
interface WellEntry {
  id: string;
  kind: 'drinking' | 'irrigation' | 'unknown';
  position: [number, number];
  depthM?: number;
  flowLpm?: number;
  label?: string;
  notes?: string;
  createdAt: string;
}
interface SepticEntry {
  id: string;
  kind: 'tank' | 'leach_field' | 'cesspool' | 'other';
  label?: string;
  notes?: string;
  areaM2?: number;
  createdAt: string;
}
interface PowerLineEntry {
  id: string;
  placement: 'overhead' | 'buried';
  lengthM: number;
  label?: string;
  notes?: string;
  createdAt: string;
}
interface BuriedUtilityEntry {
  id: string;
  kind: 'water_main' | 'gas' | 'fibre' | 'sewer' | 'other';
  lengthM: number;
  label?: string;
  notes?: string;
  createdAt: string;
}
interface FenceEntry {
  id: string;
  kind: 'barbed' | 'page_wire' | 'electric' | 'privacy' | 'other';
  lengthM: number;
  label?: string;
  notes?: string;
  createdAt: string;
}
interface GateEntry {
  id: string;
  position: [number, number];
  label?: string;
  notes?: string;
  createdAt: string;
}
interface DrivewayEntry {
  id: string;
  surface: 'gravel' | 'paved' | 'dirt' | 'other';
  lengthM: number;
  label?: string;
  notes?: string;
  createdAt: string;
}

interface BuiltEntry {
  buildings: BuildingEntry[];
  wells: WellEntry[];
  septics: SepticEntry[];
  powerLines: PowerLineEntry[];
  buriedUtilities: BuriedUtilityEntry[];
  fences: FenceEntry[];
  gates: GateEntry[];
  existingDriveways: DrivewayEntry[];
  counts: {
    total: number;
    buildings: number;
    wells: number;
    septics: number;
    powerLines: number;
    buriedUtilities: number;
    fences: number;
    gates: number;
    existingDriveways: number;
  };
  totals: {
    buildingAreaM2: number;
    septicAreaM2: number;
    powerLineLengthM: number;
    buriedUtilityLengthM: number;
    fenceLengthM: number;
    drivewayLengthM: number;
    meanWellDepthM: number | null;
    overheadPowerCount: number;
  };
  healthPct: number;
}

const BUILDING_LABEL: Record<BuildingEntry['subtype'], string> = {
  residence: 'Residence',
  outbuilding: 'Outbuilding',
  agricultural: 'Agricultural',
  other: 'Other',
};
const WELL_LABEL: Record<WellEntry['kind'], string> = {
  drinking: 'Drinking',
  irrigation: 'Irrigation',
  unknown: 'Unknown',
};
const SEPTIC_LABEL: Record<SepticEntry['kind'], string> = {
  tank: 'Tank',
  leach_field: 'Leach field',
  cesspool: 'Cesspool',
  other: 'Other',
};
const POWER_LABEL: Record<PowerLineEntry['placement'], string> = {
  overhead: 'Overhead',
  buried: 'Buried',
};
const BURIED_LABEL: Record<BuriedUtilityEntry['kind'], string> = {
  water_main: 'Water main',
  gas: 'Gas',
  fibre: 'Fibre',
  sewer: 'Sewer',
  other: 'Other',
};
const FENCE_LABEL: Record<FenceEntry['kind'], string> = {
  barbed: 'Barbed wire',
  page_wire: 'Page wire',
  electric: 'Electric',
  privacy: 'Privacy',
  other: 'Other',
};
const DRIVEWAY_LABEL: Record<DrivewayEntry['surface'], string> = {
  gravel: 'Gravel',
  paved: 'Paved',
  dirt: 'Dirt',
  other: 'Other',
};

function fmtLength(m: number): string {
  if (!m || m <= 0) return '0 m';
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
}
function fmtArea(m2: number): string {
  if (!m2 || m2 <= 0) return '0 m²';
  return m2 >= 10000 ? `${(m2 / 10000).toFixed(2)} ha` : `${fmtNumber(m2, 0)} m²`;
}

export function renderBuiltEnvironmentReport(data: ExportDataBag): string {
  const { project: p, payload } = data;
  const be = payload?.builtEnvironment;

  if (!be) {
    return baseLayout(
      'Built Environment Report',
      p.name,
      notAvailable(
        'No buildings, utilities, or access features have been traced yet. Use the Built Environment module in the Observe stage to map existing structures, wells, utilities, fences, gates, and driveways.',
      ),
    );
  }

  const entry: BuiltEntry = be;
  const c = entry.counts;
  const t = entry.totals;

  // ─── Hero ─────────────────────────────────────────────────────────
  const hero = `
    <div class="card" style="background:linear-gradient(135deg,#ECFDF5 0%,#FEF3C7 100%);border:none;padding:28px;text-align:center">
      <h2 style="border:none;margin:0 0 8px;color:#14532D;font-size:18pt">Built environment synthesis</h2>
      <p style="font-size:11pt;color:#4B5563;max-width:600px;margin:0 auto">
        ${c.total} asset${c.total === 1 ? '' : 's'} traced for ${esc(p.name)} ·
        ${fmtLength(t.powerLineLengthM + t.buriedUtilityLengthM)} of utilities ·
        ${fmtLength(t.drivewayLengthM + t.fenceLengthM)} of access &amp; boundary.
        ${
          c.total === 0
            ? 'Start by tracing buildings you can see, then wells, then walk the fence lines.'
            : `Module health <strong>${Math.round(entry.healthPct)}%</strong>.`
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
    <h2>Inventory at a glance</h2>
    <div class="card-grid">
      ${kpiCard(
        'Total assets',
        String(c.total),
        c.total === 0 ? '#6B7280' : '#15803D',
        c.total === 0 ? 'None traced yet' : `${entry.healthPct}% module health`,
      )}
      ${kpiCard(
        'Buildings',
        String(c.buildings),
        c.buildings === 0 ? '#6B7280' : '#15803D',
        c.buildings === 0 ? 'No structures pinned' : `${fmtArea(t.buildingAreaM2)} footprint`,
      )}
      ${kpiCard(
        'Water + waste',
        String(c.wells + c.septics),
        c.wells + c.septics === 0 ? '#6B7280' : '#1D4ED8',
        c.wells + c.septics === 0
          ? 'No water or septic'
          : `${c.wells} well${c.wells === 1 ? '' : 's'} · ${c.septics} septic`,
      )}
      ${kpiCard(
        'Utilities',
        fmtLength(t.powerLineLengthM + t.buriedUtilityLengthM),
        t.powerLineLengthM + t.buriedUtilityLengthM === 0 ? '#6B7280' : '#CA8A04',
        t.overheadPowerCount > 0
          ? `${t.overheadPowerCount} overhead run${t.overheadPowerCount === 1 ? '' : 's'}`
          : 'Power + buried lines',
      )}
    </div>`;

  // ─── Buildings table ──────────────────────────────────────────────
  const buildingTable =
    entry.buildings.length === 0
      ? `<p style="font-size:9.5pt;color:#9CA3AF;font-style:italic">No buildings traced yet — outline structures on the map to anchor the design.</p>`
      : `<table>
          <thead>
            <tr>
              <th>Label</th>
              <th style="width:130px">Subtype</th>
              <th style="width:90px">Area</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${[...entry.buildings]
              .sort((a, b) => (b.areaM2 ?? 0) - (a.areaM2 ?? 0))
              .map(
                (b) => `
              <tr>
                <td><strong>${esc(b.label ?? `Building ${b.id.slice(0, 6)}`)}</strong></td>
                <td>${esc(BUILDING_LABEL[b.subtype])}</td>
                <td>${b.areaM2 != null ? fmtArea(b.areaM2) : '<span style="color:#9CA3AF">—</span>'}</td>
                <td style="font-size:9pt;color:#4B5563">${b.notes ? esc(b.notes) : '<span style="color:#9CA3AF">—</span>'}</td>
              </tr>`,
              )
              .join('')}
          </tbody>
        </table>`;

  const buildingSection = `
    <h2>Buildings</h2>
    ${buildingTable}`;

  // ─── Water & waste — wells + septics ──────────────────────────────
  const wellRows =
    entry.wells.length === 0
      ? `<tr><td colspan="5" style="font-size:9.5pt;color:#9CA3AF;font-style:italic">No wells pinned.</td></tr>`
      : entry.wells
          .map(
            (w) => `
          <tr>
            <td><strong>${esc(w.label ?? `Well ${w.id.slice(0, 6)}`)}</strong></td>
            <td>${esc(WELL_LABEL[w.kind])}</td>
            <td>${w.depthM != null ? `${w.depthM.toFixed(1)} m` : '<span style="color:#9CA3AF">—</span>'}</td>
            <td>${w.flowLpm != null ? `${w.flowLpm.toFixed(0)} L/min` : '<span style="color:#9CA3AF">—</span>'}</td>
            <td style="font-size:9pt;color:#4B5563">${w.notes ? esc(w.notes) : '<span style="color:#9CA3AF">—</span>'}</td>
          </tr>`,
          )
          .join('');

  const septicRows =
    entry.septics.length === 0
      ? `<tr><td colspan="4" style="font-size:9.5pt;color:#9CA3AF;font-style:italic">No septic systems traced.</td></tr>`
      : entry.septics
          .map(
            (s) => `
          <tr>
            <td><strong>${esc(s.label ?? `Septic ${s.id.slice(0, 6)}`)}</strong></td>
            <td>${esc(SEPTIC_LABEL[s.kind])}</td>
            <td>${s.areaM2 != null ? fmtArea(s.areaM2) : '<span style="color:#9CA3AF">—</span>'}</td>
            <td style="font-size:9pt;color:#4B5563">${s.notes ? esc(s.notes) : '<span style="color:#9CA3AF">—</span>'}</td>
          </tr>`,
          )
          .join('');

  const waterWasteSection = `
    <h2>Water &amp; waste</h2>
    <h3 style="font-size:11pt;color:#1D4ED8;margin:12px 0 6px">Wells${
      t.meanWellDepthM != null
        ? ` <span style="font-size:9pt;color:#6B7280;font-weight:400">— mean depth ${t.meanWellDepthM.toFixed(1)} m</span>`
        : ''
    }</h3>
    <table>
      <thead>
        <tr>
          <th>Label</th>
          <th style="width:90px">Kind</th>
          <th style="width:80px">Depth</th>
          <th style="width:90px">Flow</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>${wellRows}</tbody>
    </table>
    <h3 style="font-size:11pt;color:#1D4ED8;margin:14px 0 6px">Septic</h3>
    <table>
      <thead>
        <tr>
          <th>Label</th>
          <th style="width:120px">Kind</th>
          <th style="width:90px">Area</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>${septicRows}</tbody>
    </table>`;

  // ─── Utilities — power + buried ──────────────────────────────────
  const powerRows =
    entry.powerLines.length === 0
      ? `<tr><td colspan="4" style="font-size:9.5pt;color:#9CA3AF;font-style:italic">No power runs traced.</td></tr>`
      : entry.powerLines
          .map(
            (pl) => `
          <tr>
            <td><strong>${esc(pl.label ?? `Run ${pl.id.slice(0, 6)}`)}</strong></td>
            <td>${esc(POWER_LABEL[pl.placement])}${pl.placement === 'overhead' ? ' <span style="font-size:8pt;color:#DC2626">⚠ fall zone</span>' : ''}</td>
            <td>${fmtLength(pl.lengthM)}</td>
            <td style="font-size:9pt;color:#4B5563">${pl.notes ? esc(pl.notes) : '<span style="color:#9CA3AF">—</span>'}</td>
          </tr>`,
          )
          .join('');

  const buriedRows =
    entry.buriedUtilities.length === 0
      ? `<tr><td colspan="4" style="font-size:9.5pt;color:#9CA3AF;font-style:italic">No buried utilities traced.</td></tr>`
      : entry.buriedUtilities
          .map(
            (u) => `
          <tr>
            <td><strong>${esc(u.label ?? `Line ${u.id.slice(0, 6)}`)}</strong></td>
            <td>${esc(BURIED_LABEL[u.kind])}</td>
            <td>${fmtLength(u.lengthM)}</td>
            <td style="font-size:9pt;color:#4B5563">${u.notes ? esc(u.notes) : '<span style="color:#9CA3AF">—</span>'}</td>
          </tr>`,
          )
          .join('');

  const utilitiesSection = `
    <h2>Utilities</h2>
    <h3 style="font-size:11pt;color:#CA8A04;margin:12px 0 6px">Power lines</h3>
    <table>
      <thead>
        <tr>
          <th>Label</th>
          <th style="width:140px">Placement</th>
          <th style="width:90px">Length</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>${powerRows}</tbody>
    </table>
    <h3 style="font-size:11pt;color:#CA8A04;margin:14px 0 6px">Buried utilities</h3>
    <p style="font-size:9pt;color:#DC2626;margin:0 0 6px;font-style:italic">⚠ Buried utility runs veto earthworks across them — surface on the Plan layer before excavation.</p>
    <table>
      <thead>
        <tr>
          <th>Label</th>
          <th style="width:120px">Kind</th>
          <th style="width:90px">Length</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>${buriedRows}</tbody>
    </table>`;

  // ─── Access & boundaries — fences, gates, driveways ──────────────
  const fenceRows =
    entry.fences.length === 0
      ? `<tr><td colspan="4" style="font-size:9.5pt;color:#9CA3AF;font-style:italic">No fences walked yet.</td></tr>`
      : entry.fences
          .map(
            (f) => `
          <tr>
            <td><strong>${esc(f.label ?? `Fence ${f.id.slice(0, 6)}`)}</strong></td>
            <td>${esc(FENCE_LABEL[f.kind])}</td>
            <td>${fmtLength(f.lengthM)}</td>
            <td style="font-size:9pt;color:#4B5563">${f.notes ? esc(f.notes) : '<span style="color:#9CA3AF">—</span>'}</td>
          </tr>`,
          )
          .join('');

  const drivewayRows =
    entry.existingDriveways.length === 0
      ? `<tr><td colspan="4" style="font-size:9.5pt;color:#9CA3AF;font-style:italic">No driveways traced.</td></tr>`
      : entry.existingDriveways
          .map(
            (d) => `
          <tr>
            <td><strong>${esc(d.label ?? `Driveway ${d.id.slice(0, 6)}`)}</strong></td>
            <td>${esc(DRIVEWAY_LABEL[d.surface])}</td>
            <td>${fmtLength(d.lengthM)}</td>
            <td style="font-size:9pt;color:#4B5563">${d.notes ? esc(d.notes) : '<span style="color:#9CA3AF">—</span>'}</td>
          </tr>`,
          )
          .join('');

  const gateRows =
    entry.gates.length === 0
      ? `<tr><td colspan="2" style="font-size:9.5pt;color:#9CA3AF;font-style:italic">No gate pins dropped.</td></tr>`
      : entry.gates
          .map(
            (g) => `
          <tr>
            <td><strong>${esc(g.label ?? `Gate ${g.id.slice(0, 6)}`)}</strong></td>
            <td style="font-size:9pt;color:#4B5563">${g.notes ? esc(g.notes) : '<span style="color:#9CA3AF">—</span>'}</td>
          </tr>`,
          )
          .join('');

  const accessSection = `
    <h2>Access &amp; boundaries</h2>
    <h3 style="font-size:11pt;color:#15803D;margin:12px 0 6px">Fences</h3>
    <table>
      <thead>
        <tr>
          <th>Label</th>
          <th style="width:130px">Kind</th>
          <th style="width:90px">Length</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>${fenceRows}</tbody>
    </table>
    <h3 style="font-size:11pt;color:#15803D;margin:14px 0 6px">Driveways</h3>
    <table>
      <thead>
        <tr>
          <th>Label</th>
          <th style="width:120px">Surface</th>
          <th style="width:90px">Length</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>${drivewayRows}</tbody>
    </table>
    <h3 style="font-size:11pt;color:#15803D;margin:14px 0 6px">Gates</h3>
    <table>
      <thead>
        <tr>
          <th>Label</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>${gateRows}</tbody>
    </table>`;

  // ─── Design implications (heuristic) ──────────────────────────────
  const implications: { title: string; note: string; tone: 'red' | 'gold' | 'green' }[] = [];

  if (entry.buriedUtilities.length > 0) {
    implications.push({
      title: 'Buried lines on record',
      note: `${entry.buriedUtilities.length} run${entry.buriedUtilities.length === 1 ? '' : 's'} totalling ${fmtLength(t.buriedUtilityLengthM)} — vetoes earthworks across them; show on Plan layer.`,
      tone: 'red',
    });
  }
  if (t.overheadPowerCount > 0) {
    implications.push({
      title: 'Overhead corridor',
      note: `${t.overheadPowerCount} overhead run${t.overheadPowerCount === 1 ? '' : 's'} on site — keep tall trees and structures clear of fall zones.`,
      tone: 'gold',
    });
  }
  if (entry.wells.length > 0) {
    implications.push({
      title: 'Well capacity sets irrigation budget',
      note:
        t.meanWellDepthM != null
          ? `Mean depth ${t.meanWellDepthM.toFixed(1)} m — record flow before sizing irrigation systems.`
          : 'Pin flow and depth before sizing irrigation systems.',
      tone: 'green',
    });
  }
  if (entry.fences.length > 0) {
    implications.push({
      title: 'Fence lines define livestock options',
      note: `${fmtLength(t.fenceLengthM)} of fencing walked — drives paddock subdivision possibilities.`,
      tone: 'green',
    });
  }
  if (implications.length === 0) {
    implications.push({
      title: 'Trace what is there first',
      note: 'The design starts from existing assets — buildings, utilities, fences, gates. Walk the property and log the obvious wins.',
      tone: 'gold',
    });
  }

  const implicationsSection = `
    <h2>Design implications</h2>
    <div class="card-grid">
      ${implications
        .map(
          (imp) => `
        <div class="card" style="border-left:4px solid ${imp.tone === 'red' ? '#DC2626' : imp.tone === 'gold' ? '#CA8A04' : '#15803D'}">
          <div class="card-header" style="color:${imp.tone === 'red' ? '#DC2626' : imp.tone === 'gold' ? '#CA8A04' : '#15803D'}">${esc(imp.title)}</div>
          <p style="font-size:9.5pt;color:#4B5563;margin:6px 0 0">${esc(imp.note)}</p>
        </div>`,
        )
        .join('')}
    </div>`;

  // ─── Recommended actions ──────────────────────────────────────────
  const actions: { title: string; note: string; priority: 'High' | 'Medium' | 'Low' }[] = [];

  if (c.buildings === 0) {
    actions.push({
      title: 'Trace existing buildings',
      note: 'No structures pinned — outline the residence and outbuildings first so the design has a reference frame.',
      priority: 'High',
    });
  }
  if (c.wells === 0) {
    actions.push({
      title: 'Pin wells and record flow',
      note: 'No wells on record — flow and depth set the irrigation budget for every downstream water-system decision.',
      priority: 'High',
    });
  }
  if (c.buriedUtilities === 0) {
    actions.push({
      title: 'Mark buried-utility easements',
      note: 'No buried lines mapped — even one missed line can veto an earthworks plan. Walk the meter to building runs and pull from utility records.',
      priority: 'High',
    });
  } else {
    actions.push({
      title: 'Cross-check easements on Plan layer',
      note: 'Buried lines mapped — verify they surface on the Plan-stage layer before any earthworks proposal.',
      priority: 'Medium',
    });
  }
  if (c.fences === 0) {
    actions.push({
      title: 'Walk fence lines',
      note: 'No fence segments traced — fence-line geometry drives livestock subdivision and paddock rotation options.',
      priority: 'Medium',
    });
  }
  if (c.gates === 0) {
    actions.push({
      title: 'Drop gate pins',
      note: 'No gates pinned — entry points define emergency access and daily circulation logic.',
      priority: 'Low',
    });
  }
  if (entry.healthPct >= 70 && actions.every((a) => a.priority !== 'High')) {
    actions.push({
      title: 'Feed inventory to Plan stage',
      note: 'Built-environment health ≥ 70% — ready to inform Plan-stage decisions for water systems, livestock paddocks, and access circulation.',
      priority: 'Medium',
    });
  }
  if (actions.length === 0) {
    actions.push({
      title: 'Keep the inventory current',
      note: 'Re-walk the site each season — fences degrade, wells shift, easements get added. The Observe surface stays useful only when it stays current.',
      priority: 'Low',
    });
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
      Generated ${esc(fmtDate(data.generatedAt))} · Atlas Built Environment export
    </p>`;

  return baseLayout(
    'Built Environment Report',
    p.name,
    `${hero}${kpiStrip}${buildingSection}${waterWasteSection}${utilitiesSection}${accessSection}${implicationsSection}${actionsSection}${footer}`,
  );
}
