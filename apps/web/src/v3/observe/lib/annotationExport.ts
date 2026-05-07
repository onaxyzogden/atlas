/**
 * annotationExport — pure functions to roll the seven OBSERVE namespace
 * stores up into a project-scoped FeatureCollection and serialise that
 * collection to GeoJSON, KML, or multi-section CSV.
 *
 * No React, no MapLibre — safe to call from a button handler or a unit
 * test. Every function is synchronous; large projects (>500 features)
 * remain comfortably under 100 ms because we use array `.join('\n')`
 * instead of incremental string concatenation.
 *
 * Geometry coverage (v1):
 *   Point:       neighbour, household, highPoint, soilSample, swot,
 *                storageInfra
 *   LineString:  accessRoad, contour, drainageLine, watercourse,
 *                earthwork, transect (synthesised from pointA/pointB)
 *   Polygon:     hazard (when geometry present), ecologyZone
 *   No geometry: ecologyObservation, permacultureZone, sector
 *                — these are CSV-only (KML / GeoJSON omit them).
 */

import * as turf from '@turf/turf';
import { useHumanContextStore } from '../../../store/humanContextStore.js';
import { useTopographyStore } from '../../../store/topographyStore.js';
import { useExternalForcesStore } from '../../../store/externalForcesStore.js';
import { useWaterSystemsStore } from '../../../store/waterSystemsStore.js';
import { useEcologyStore } from '../../../store/ecologyStore.js';
import { useSwotStore } from '../../../store/swotStore.js';
import { useSoilSampleStore } from '../../../store/soilSampleStore.js';
import { useProjectStore } from '../../../store/projectStore.js';

/** Outer radius (metres) for synthesised sector wedges. Mirrors the
 *  hard-coded value used by the OBSERVE renderer in
 *  `ObserveAnnotationLayers.wedgePolygon` so an exported sector overlays
 *  the on-map wedge. Centralised here so a future change is one line. */
const SECTOR_RADIUS_M = 250;

// ── Kind taxonomy ──────────────────────────────────────────────────────────────

/** All exportable kinds across the seven namespace stores. */
export type ExportKind =
  | 'neighbour'
  | 'household'
  | 'accessRoad'
  | 'permacultureZone'
  | 'hazard'
  | 'sector'
  | 'contour'
  | 'highPoint'
  | 'drainageLine'
  | 'transect'
  | 'earthwork'
  | 'storageInfra'
  | 'watercourse'
  | 'ecologyObservation'
  | 'ecologyZone'
  | 'swot'
  | 'soilSample';

const ALL_KINDS: ExportKind[] = [
  'neighbour',
  'household',
  'accessRoad',
  'permacultureZone',
  'hazard',
  'sector',
  'contour',
  'highPoint',
  'drainageLine',
  'transect',
  'earthwork',
  'storageInfra',
  'watercourse',
  'ecologyObservation',
  'ecologyZone',
  'swot',
  'soilSample',
];

/** Display label for each kind, used by KML folders and CSV section headers. */
const KIND_LABELS: Record<ExportKind, string> = {
  neighbour: 'Neighbour',
  household: 'Household',
  accessRoad: 'Access road',
  permacultureZone: 'Permaculture zone',
  hazard: 'Hazard',
  sector: 'Sector',
  contour: 'Contour',
  highPoint: 'High/low point',
  drainageLine: 'Drainage line',
  transect: 'Transect',
  earthwork: 'Earthwork',
  storageInfra: 'Storage infrastructure',
  watercourse: 'Watercourse',
  ecologyObservation: 'Ecology observation',
  ecologyZone: 'Ecology zone',
  swot: 'SWOT tag',
  soilSample: 'Soil sample',
};

// ── Collection ─────────────────────────────────────────────────────────────────

export interface ProjectAnnotations {
  projectId: string;
  /** ISO timestamp when the snapshot was taken. */
  exportedAt: string;
  /** Total record count across all kinds (including geometry-less ones). */
  totalCount: number;
  /** Per-kind record arrays. Missing keys mean "no records of that kind". */
  byKind: Partial<Record<ExportKind, Array<Record<string, unknown>>>>;
}

/** Pull every project-matching record from every namespace store. Pure
 *  read — does not subscribe; safe to call outside React. */
export function collectProjectAnnotations(
  projectId: string,
): ProjectAnnotations {
  const human = useHumanContextStore.getState();
  const topo = useTopographyStore.getState();
  const ext = useExternalForcesStore.getState();
  const water = useWaterSystemsStore.getState();
  const eco = useEcologyStore.getState();
  const swot = useSwotStore.getState();
  const soil = useSoilSampleStore.getState();

  // Filter by project AND widen to a generic record so the cross-kind
  // collection can live behind one type without losing the fields. Each
  // accessor (`geometryFor`, `propsFor`) re-narrows what it actually reads.
  const here = <T extends { projectId: string }>(
    arr: T[],
  ): Array<Record<string, unknown>> =>
    arr.filter((r) => r.projectId === projectId) as unknown as Array<
      Record<string, unknown>
    >;

  const byKind: ProjectAnnotations['byKind'] = {
    neighbour: here(human.neighbours),
    household: here(human.households),
    accessRoad: here(human.accessRoads),
    permacultureZone: here(human.permacultureZones),
    hazard: here(ext.hazards),
    sector: here(ext.sectors),
    contour: here(topo.contours),
    highPoint: here(topo.highPoints),
    drainageLine: here(topo.drainageLines),
    transect: here(topo.transects),
    earthwork: here(water.earthworks),
    storageInfra: here(water.storageInfra),
    watercourse: here(water.watercourses),
    ecologyObservation: here(eco.ecology),
    ecologyZone: here(eco.ecologyZones),
    swot: here(swot.swot),
    soilSample: here(soil.samples),
  };

  let total = 0;
  for (const k of ALL_KINDS) total += byKind[k]?.length ?? 0;

  return {
    projectId,
    exportedAt: new Date().toISOString(),
    totalCount: total,
    byKind,
  };
}

// ── GeoJSON ────────────────────────────────────────────────────────────────────

type Geom = GeoJSON.Geometry | null;

/** Per-export context computed once by the serialiser entry points and
 *  threaded through `geometryFor`. Holds project-resolved data that would
 *  otherwise force a per-record store walk. */
interface ExportContext {
  /** Anchor point (`[lng, lat]`) for synthesising sector wedges, or
   *  `null` when no homestead and no parcel boundary are available. */
  sectorAnchor: [number, number] | null;
}

/** Build a wedge (sector) polygon anchored at `center`, opening along
 *  `bearingDeg` ± `arcDeg/2`, with outer radius `radiusM`. Lifted verbatim
 *  from `ObserveAnnotationLayers.wedgePolygon` so the exported polygon
 *  overlays the on-map sector pixel-for-pixel. */
function wedgePolygon(
  center: [number, number],
  bearingDeg: number,
  arcDeg: number,
  radiusM: number,
  steps = 24,
): GeoJSON.Polygon {
  const half = arcDeg / 2;
  const start = bearingDeg - half;
  const end = bearingDeg + half;
  const ring: [number, number][] = [center];
  for (let i = 0; i <= steps; i++) {
    const b = start + ((end - start) * i) / steps;
    const dest = turf.destination(turf.point(center), radiusM / 1000, b, {
      units: 'kilometers',
    });
    const c = dest.geometry.coordinates as [number, number];
    ring.push(c);
  }
  ring.push(center);
  return { type: 'Polygon', coordinates: [ring] };
}

/** Resolve the anchor for sector-wedge synthesis. Mirrors the renderer's
 *  preference order: first homestead in the project, then the parcel
 *  boundary centroid, else `null` (sectors fall back to CSV-only). */
function resolveSectorAnchor(
  projectId: string,
): [number, number] | null {
  const homestead = useHumanContextStore
    .getState()
    .households.find(
      (h) =>
        h.projectId === projectId &&
        Array.isArray(h.position) &&
        h.position.length === 2,
    );
  if (homestead?.position) {
    return [homestead.position[0], homestead.position[1]];
  }
  const project = useProjectStore
    .getState()
    .projects.find((p) => p.id === projectId);
  const boundary = project?.parcelBoundaryGeojson;
  if (boundary && boundary.features.length > 0) {
    try {
      const c = turf.centroid(boundary);
      const coords = c.geometry.coordinates;
      if (
        Array.isArray(coords) &&
        coords.length >= 2 &&
        Number.isFinite(coords[0]) &&
        Number.isFinite(coords[1])
      ) {
        return [coords[0] as number, coords[1] as number];
      }
    } catch {
      // turf.centroid throws on degenerate input — fall through to null.
    }
  }
  return null;
}

/** Map a record of any kind to a GeoJSON geometry, or `null` if the record
 *  has no spatial geometry available for export.
 *
 *  When `ctx.sectorAnchor` is non-null, `'sector'` synthesises a wedge
 *  `Polygon` at `SECTOR_RADIUS_M` metres, anchored at the project's
 *  homestead (or parcel-boundary centroid). Otherwise sectors return
 *  `null` and remain CSV-only. `permacultureZone` and `ecologyObservation`
 *  always return `null` — they have no geometry to synthesise from. */
function geometryFor(
  kind: ExportKind,
  r: Record<string, unknown>,
  ctx: ExportContext,
): Geom {
  const g = (r as { geometry?: GeoJSON.Geometry }).geometry;
  switch (kind) {
    case 'neighbour':
    case 'household':
    case 'highPoint': {
      const pos = (r as { position?: [number, number] }).position;
      return pos ? { type: 'Point', coordinates: pos } : null;
    }
    case 'soilSample': {
      const loc = (r as { location?: [number, number] | null }).location;
      return loc ? { type: 'Point', coordinates: loc } : null;
    }
    case 'swot': {
      const pos = (r as { position?: [number, number] }).position;
      return pos ? { type: 'Point', coordinates: pos } : null;
    }
    case 'storageInfra': {
      const c = (r as { center?: [number, number] }).center;
      return c ? { type: 'Point', coordinates: c } : null;
    }
    case 'accessRoad':
    case 'contour':
    case 'drainageLine':
    case 'watercourse':
    case 'earthwork':
      return g ?? null;
    case 'transect': {
      const a = (r as { pointA?: [number, number] }).pointA;
      const b = (r as { pointB?: [number, number] }).pointB;
      return a && b
        ? { type: 'LineString', coordinates: [a, b] }
        : null;
    }
    case 'hazard':
    case 'ecologyZone':
      return g ?? null;
    case 'sector': {
      const anchor = ctx.sectorAnchor;
      if (!anchor) return null;
      const bearingDeg = Number(
        (r as { bearingDeg?: number }).bearingDeg,
      );
      const arcDeg = Number((r as { arcDeg?: number }).arcDeg);
      if (!Number.isFinite(bearingDeg) || !Number.isFinite(arcDeg)) {
        return null;
      }
      return wedgePolygon(anchor, bearingDeg, arcDeg, SECTOR_RADIUS_M);
    }
    case 'permacultureZone':
    case 'ecologyObservation':
      return null;
  }
}

/** Strip out geometry / projectId — the rest of the record becomes feature
 *  properties. Keeps `id` and `createdAt`. */
function propsFor(
  kind: ExportKind,
  r: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { kind };
  for (const [k, v] of Object.entries(r)) {
    if (k === 'geometry' || k === 'projectId') continue;
    out[k] = v;
  }
  return out;
}

/** Roll the project annotations into a single GeoJSON FeatureCollection.
 *  Records without exportable geometry are silently skipped. */
export function toGeoJSON(p: ProjectAnnotations): GeoJSON.FeatureCollection {
  const ctx: ExportContext = {
    sectorAnchor: resolveSectorAnchor(p.projectId),
  };
  const features: GeoJSON.Feature[] = [];
  for (const kind of ALL_KINDS) {
    const arr = p.byKind[kind] ?? [];
    for (const r of arr) {
      const geom = geometryFor(kind, r, ctx);
      if (!geom) continue;
      features.push({
        type: 'Feature',
        properties: propsFor(kind, r),
        geometry: geom,
      });
    }
  }
  return { type: 'FeatureCollection', features };
}

// ── KML ────────────────────────────────────────────────────────────────────────

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function coordPair(c: GeoJSON.Position): string {
  // KML expects lon,lat[,alt]. We stay 2D.
  return `${c[0]},${c[1]}`;
}

function geomToKml(g: GeoJSON.Geometry): string {
  switch (g.type) {
    case 'Point':
      return `<Point><coordinates>${coordPair(g.coordinates)}</coordinates></Point>`;
    case 'LineString':
      return `<LineString><coordinates>${g.coordinates.map(coordPair).join(' ')}</coordinates></LineString>`;
    case 'Polygon': {
      const [outer, ...holes] = g.coordinates;
      const outerEl = `<outerBoundaryIs><LinearRing><coordinates>${(outer ?? []).map(coordPair).join(' ')}</coordinates></LinearRing></outerBoundaryIs>`;
      const holeEls = holes
        .map(
          (h) =>
            `<innerBoundaryIs><LinearRing><coordinates>${h.map(coordPair).join(' ')}</coordinates></LinearRing></innerBoundaryIs>`,
        )
        .join('');
      return `<Polygon>${outerEl}${holeEls}</Polygon>`;
    }
    default:
      // MultiPoint / MultiLineString / MultiPolygon / GeometryCollection
      // are not produced by any current OBSERVE store. Emit nothing
      // rather than crash — the steward sees a count gap they can debug.
      return '';
  }
}

function placemarkXml(
  kind: ExportKind,
  r: Record<string, unknown>,
  geom: GeoJSON.Geometry,
): string {
  const id = String(r.id ?? '');
  const name = (() => {
    const label = r.label ?? r.title ?? r.species ?? r.type;
    return label ? String(label) : KIND_LABELS[kind];
  })();
  const description = r.notes ?? r.body ?? r.description ?? '';
  return [
    `<Placemark id="${escapeXml(id)}">`,
    `<name>${escapeXml(name)}</name>`,
    description ? `<description>${escapeXml(String(description))}</description>` : '',
    geomToKml(geom),
    `</Placemark>`,
  ].join('');
}

/** Render the project annotations as a KML 2.2 document. One `<Folder>`
 *  per kind; geometry-less kinds are omitted from the KML entirely
 *  (they remain in the CSV export). */
export function toKML(p: ProjectAnnotations): string {
  const ctx: ExportContext = {
    sectorAnchor: resolveSectorAnchor(p.projectId),
  };
  const folders: string[] = [];
  for (const kind of ALL_KINDS) {
    const arr = p.byKind[kind] ?? [];
    const placemarks: string[] = [];
    for (const r of arr) {
      const geom = geometryFor(kind, r, ctx);
      if (!geom) continue;
      placemarks.push(placemarkXml(kind, r, geom));
    }
    if (!placemarks.length) continue;
    folders.push(
      [
        `<Folder>`,
        `<name>${escapeXml(KIND_LABELS[kind])}</name>`,
        ...placemarks,
        `</Folder>`,
      ].join(''),
    );
  }
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<kml xmlns="http://www.opengis.net/kml/2.2">',
    '<Document>',
    `<name>Atlas OBSERVE export — ${escapeXml(p.projectId)}</name>`,
    `<description>Exported ${escapeXml(p.exportedAt)}; ${p.totalCount} records.</description>`,
    folders.join(''),
    '</Document>',
    '</kml>',
  ].join('\n');
}

// ── CSV (multi-section) ────────────────────────────────────────────────────────

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return '';
  let s: string;
  if (typeof v === 'string') s = v;
  else if (typeof v === 'number' || typeof v === 'boolean') s = String(v);
  else s = JSON.stringify(v);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Encode a geometry as Well-Known Text. Used in CSV so geometries can
 *  round-trip into QGIS / PostGIS without a separate column-per-coord
 *  explosion. */
function geomToWkt(g: GeoJSON.Geometry | null): string {
  if (!g) return '';
  const fmt = (c: GeoJSON.Position) => `${c[0]} ${c[1]}`;
  switch (g.type) {
    case 'Point':
      return `POINT(${fmt(g.coordinates)})`;
    case 'LineString':
      return `LINESTRING(${g.coordinates.map(fmt).join(', ')})`;
    case 'Polygon':
      return `POLYGON(${g.coordinates
        .map((ring) => `(${ring.map(fmt).join(', ')})`)
        .join(', ')})`;
    default:
      return '';
  }
}

/** Build one CSV section for a single kind. Returns `''` when the kind
 *  has no rows to emit (the caller filters those sections out). */
function csvSection(
  kind: ExportKind,
  rows: Array<Record<string, unknown>>,
  ctx: ExportContext,
): string {
  if (!rows.length) return '';
  // Compute column union across rows so optional fields aren't dropped.
  const cols = new Set<string>();
  for (const r of rows) {
    for (const k of Object.keys(r)) {
      if (k === 'projectId' || k === 'geometry') continue;
      cols.add(k);
    }
  }
  const ordered = ['id', 'createdAt', ...[...cols].filter((c) => c !== 'id' && c !== 'createdAt').sort()];
  const header = [...ordered, 'geometryWkt'].join(',');
  const lines = rows.map((r) => {
    const wkt = geomToWkt(geometryFor(kind, r, ctx));
    const cells = ordered.map((c) => csvEscape(r[c]));
    cells.push(csvEscape(wkt));
    return cells.join(',');
  });
  return [`# kind: ${kind} (${KIND_LABELS[kind]})`, header, ...lines].join('\n');
}

/** Render a multi-section CSV — one block per kind with its own header
 *  row — preceded by a meta block. Empty kinds are skipped. */
export function toCSV(p: ProjectAnnotations): string {
  const ctx: ExportContext = {
    sectorAnchor: resolveSectorAnchor(p.projectId),
  };
  const sections: string[] = [
    `# atlas-observe-export`,
    `# projectId: ${p.projectId}`,
    `# exportedAt: ${p.exportedAt}`,
    `# totalCount: ${p.totalCount}`,
  ];
  for (const kind of ALL_KINDS) {
    const arr = p.byKind[kind] ?? [];
    const block = csvSection(kind, arr, ctx);
    if (block) sections.push('', block);
  }
  return sections.join('\n');
}

// ── Filename helper ────────────────────────────────────────────────────────────

/** Build a filename of the form
 *  `atlas-observe-${shortId}-${YYYYMMDD}.${ext}`. */
export function exportFilename(
  projectId: string,
  ext: 'geojson' | 'kml' | 'csv',
  now: Date = new Date(),
): string {
  const short = projectId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 8) || 'project';
  const yyyy = now.getFullYear().toString();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `atlas-observe-${short}-${yyyy}${mm}${dd}.${ext}`;
}
