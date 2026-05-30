// portfolioModel.ts
//
// Shared model helpers for the Portfolio Home four-zone surface
// (OLOS_Portfolio_Home_Spec_v1.0 §2). Pure functions — no React, no map
// engine — so the project list, the map, and (later) the rails all derive
// stage / geometry / colour the same way.
//
// Stage colours live here as hex literals on purpose: MapLibre paint
// expressions can't read CSS custom properties, so the map needs concrete
// values (same pattern as DiagnoseMap's `#e6c34a` boundary stroke). P3 mirrors
// these into stage-semantic tokens in tokens.css for the DOM (pills, cards).

import type { LocalProject } from '../../store/projectStore.js';

/**
 * Stage used to colour-code a project's boundary + label pin (§2.5/§2.6).
 * `setup` = wizard incomplete; `plan`/`act`/`observe` = the three lifecycle
 * stages; `archived` = inactive.
 */
export type PortfolioStage = 'setup' | 'plan' | 'act' | 'observe' | 'archived';

export interface StagePaint {
  /** Display label for the stage pill. */
  label: string;
  /** Stroke / accent colour (hex). */
  color: string;
  /** Fill colour (hex). */
  fill: string;
  /** Base fill opacity (selection bumps this to 0.35 per §2.6). */
  fillOpacity: number;
  /** Base stroke width in px (selection bumps this to 3 per §2.6). */
  strokeWidth: number;
  /** Dashed stroke (setup + archived) vs solid (plan/act/observe). */
  dashed: boolean;
}

// §2.6 boundary colour coding. Estate-palette hexes chosen to honour the
// spec's stage semantics (amber setup · blue Plan · green Act · teal Observe ·
// grey archived) while staying within the gold/sage identity.
export const STAGE_PAINT: Record<PortfolioStage, StagePaint> = {
  setup: { label: 'Setup', color: '#b08a3a', fill: '#b08a3a', fillOpacity: 0.16, strokeWidth: 1.5, dashed: true },
  plan: { label: 'Plan', color: '#5b8eaf', fill: '#5b8eaf', fillOpacity: 0.2, strokeWidth: 1.5, dashed: false },
  act: { label: 'Act', color: '#527852', fill: '#527852', fillOpacity: 0.2, strokeWidth: 1.5, dashed: false },
  observe: { label: 'Observe', color: '#2f8f86', fill: '#2f8f86', fillOpacity: 0.2, strokeWidth: 1.5, dashed: false },
  archived: { label: 'Archived', color: '#8a8f94', fill: '#8a8f94', fillOpacity: 0.2, strokeWidth: 1.0, dashed: true },
};

/** The four stage filters surfaced as chips in the left rail (§2.1). */
export const STAGE_FILTERS = ['plan', 'act', 'observe'] as const;
export type StageFilter = (typeof STAGE_FILTERS)[number];

/**
 * Derive the portfolio stage for boundary + pin colour coding (§2.5/§2.6).
 *
 * P1 scope — coarse but honest: archived status first, then wizard-incomplete
 * (no parcel geometry and no intake centroid) → setup, otherwise the neutral
 * working stage `plan`. The plan/act/observe split is refined in P2/P3 once
 * the shared stratum-progress, outstanding-task, and observe-freshness
 * selectors are wired into the rails — at which point this reads them to
 * distinguish "Act in progress" and "Observe cycle review" from "Plan". The
 * signature and the `stage` feature property stay stable across that deepening.
 */
export function derivePortfolioStage(p: LocalProject): PortfolioStage {
  if (p.status === 'archived') return 'archived';
  if (!projectPolygon(p) && !projectCentroid(p)) return 'setup';
  return 'plan';
}

/**
 * First Polygon for a project, unwrapping a MultiPolygon to its first ring set.
 * v3 only renders one polygon per project (multi-parcel is a later concern).
 */
export function projectPolygon(p: LocalProject): GeoJSON.Polygon | null {
  const fc = p.parcelBoundaryGeojson;
  if (!fc || fc.type !== 'FeatureCollection') return null;
  for (const f of fc.features) {
    const g = f.geometry;
    if (!g) continue;
    if (g.type === 'Polygon') return g;
    if (g.type === 'MultiPolygon') {
      const first = g.coordinates[0];
      if (first) return { type: 'Polygon', coordinates: first };
    }
  }
  return null;
}

/** Bounding-box centre of a polygon's outer ring, as [lng, lat]. */
export function polygonCentroid(poly: GeoJSON.Polygon): [number, number] | null {
  const ring = poly.coordinates[0];
  if (!ring || ring.length === 0) return null;
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const pt of ring) {
    const lng = pt[0];
    const lat = pt[1];
    if (lng === undefined || lat === undefined) continue;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  if (!Number.isFinite(minLng)) return null;
  return [(minLng + maxLng) / 2, (minLat + maxLat) / 2];
}

/**
 * Map anchor for a project's label pin: polygon centroid when geometry
 * exists, else the intake centroid (`metadata.centerLat/centerLng`). Returned
 * as [lng, lat] to match MapLibre ordering. Null when the project has neither
 * (it then appears in the list but not on the map).
 */
export function projectCentroid(p: LocalProject): [number, number] | null {
  const poly = projectPolygon(p);
  if (poly) {
    const c = polygonCentroid(poly);
    if (c) return c;
  }
  const lat = p.metadata?.centerLat;
  const lng = p.metadata?.centerLng;
  if (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  ) {
    return [lng, lat];
  }
  return null;
}

export interface PortfolioFeatureProps {
  id: string;
  name: string;
  stage: PortfolioStage;
}

/**
 * Single FeatureCollection of every project boundary that has geometry,
 * carrying `{ id, name, stage }` so the map can drive paint expressions and
 * click → select off one source (the multi-feature pattern from
 * PlanDataLayers). Projects without geometry are skipped here and surfaced as
 * centroid-only label pins / list rows instead.
 */
export function buildBoundaryFeatureCollection(
  projects: LocalProject[],
): GeoJSON.FeatureCollection<GeoJSON.Polygon, PortfolioFeatureProps> {
  const features: GeoJSON.Feature<GeoJSON.Polygon, PortfolioFeatureProps>[] = [];
  for (const p of projects) {
    const poly = projectPolygon(p);
    if (!poly) continue;
    features.push({
      type: 'Feature',
      properties: { id: p.id, name: p.name, stage: derivePortfolioStage(p) },
      geometry: poly,
    });
  }
  return { type: 'FeatureCollection', features };
}

/** Human-readable area label, e.g. "12 ac" / "4.8 ha" / "Area unknown". */
export function projectAreaLabel(p: LocalProject): string {
  if (typeof p.acreage !== 'number' || !Number.isFinite(p.acreage) || p.acreage <= 0) {
    return 'Area unknown';
  }
  const unit = p.units === 'imperial' ? 'ac' : 'ha';
  const rounded = p.acreage >= 10 ? Math.round(p.acreage) : Math.round(p.acreage * 10) / 10;
  return `${rounded} ${unit}`;
}
