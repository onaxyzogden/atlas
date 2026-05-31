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

import { findProjectType, hasCapability, type ProjectRole } from '@ogden/shared';
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

// §2.6 boundary colour coding. The hexes MIRROR the High-Tech Earth stage
// tokens in tokens.css (--color-stage-plan/act/observe/setup/archived): MapLibre
// paint expressions can't read CSS custom properties, so the concrete values are
// duplicated here and MUST be kept in sync with the tokens. The spec's §2.6
// table names a generic blue/green/teal palette (--color-primary/complete/teal);
// those map onto the project's actual identity as Plan=Verdigris Teal,
// Act=Loam Amber, Observe=Flint Blue (ratified P3, same tokens the rails use).
export const STAGE_PAINT: Record<PortfolioStage, StagePaint> = {
  setup: { label: 'Setup', color: '#b08a3a', fill: '#b08a3a', fillOpacity: 0.16, strokeWidth: 1.5, dashed: true },
  plan: { label: 'Plan', color: '#38a3a5', fill: '#38a3a5', fillOpacity: 0.2, strokeWidth: 1.5, dashed: false },
  act: { label: 'Act', color: '#d9a036', fill: '#d9a036', fillOpacity: 0.2, strokeWidth: 1.5, dashed: false },
  observe: { label: 'Observe', color: '#6c8294', fill: '#6c8294', fillOpacity: 0.2, strokeWidth: 1.5, dashed: false },
  archived: { label: 'Archived', color: '#8a8f94', fill: '#8a8f94', fillOpacity: 0.2, strokeWidth: 1.0, dashed: true },
};

/** The four stage filters surfaced as chips in the left rail (§2.1). */
export const STAGE_FILTERS = ['plan', 'act', 'observe'] as const;
export type StageFilter = (typeof STAGE_FILTERS)[number];

/** Field-action statuses that still demand attention (not verified, not a
 *  resolved divergence). Shared by usePortfolioBriefing (selected project) and
 *  usePortfolioStages (all projects) so the Act-in-progress signal is derived
 *  identically for the rail and the map. */
export const OUTSTANDING_STATUSES: ReadonlySet<string> = new Set([
  'not_started',
  'in_progress',
  'submitted',
  'blocked',
]);

/**
 * Inputs to the live-data stage derivation (§2.5/§2.6). Decoupled from any
 * store/hook so the *same* rule colours the selected project's rail and every
 * project's map boundary.
 */
export interface StageSignals {
  /** `project.status === 'archived'`. */
  archived: boolean;
  /** `project.metadata?.wizardStatus === 'complete'`. */
  wizardComplete: boolean;
  /** Has parcel geometry (`hasParcelBoundary` flag or inline GeoJSON). */
  hasBoundary: boolean;
  /** Count of field-actions in an OUTSTANDING_STATUSES state. */
  outstanding: number;
  /** Any Observe data points captured. */
  hasData: boolean;
  /** Every Plan objective complete (and at least one exists). */
  allComplete: boolean;
}

/**
 * The single live-data stage rule (§2.6). Archived wins; a project whose wizard
 * is incomplete *and* has no boundary is still in setup; outstanding field-work
 * means Act; a fully-planned project with Observe data is in its Observe cycle;
 * otherwise it is in Plan. This is the canonical refinement of the coarse
 * geometry-only `derivePortfolioStage` below.
 */
export function deriveStageFromSignals(s: StageSignals): PortfolioStage {
  if (s.archived) return 'archived';
  if (!s.wizardComplete && !s.hasBoundary) return 'setup';
  if (s.outstanding > 0) return 'act';
  if (s.hasData && s.allComplete) return 'observe';
  return 'plan';
}

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
  stageById?: ReadonlyMap<string, PortfolioStage>,
): GeoJSON.FeatureCollection<GeoJSON.Polygon, PortfolioFeatureProps> {
  const features: GeoJSON.Feature<GeoJSON.Polygon, PortfolioFeatureProps>[] = [];
  for (const p of projects) {
    const poly = projectPolygon(p);
    if (!poly) continue;
    // Prefer the live-data stage (usePortfolioStages); fall back to the coarse
    // geometry-only derivation for any project missing from the store-backed map.
    const stage = stageById?.get(p.id) ?? derivePortfolioStage(p);
    features.push({
      type: 'Feature',
      properties: { id: p.id, name: p.name, stage },
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

/** A project's display type badge — primary or one of its secondaries (§3.3). */
export interface ProjectTypeBadge {
  id: string;
  label: string;
}

/**
 * Primary + secondary project-type badges, derived purely from the project
 * record (no store). Shared by the Dashboard card (§3.3) and the at-a-glance
 * rail (§2.4) so both label types identically. `primary` comes from
 * `project.projectType`; `secondary` from
 * `metadata.projectTypeRecord.secondaryTypeIds`, resolved via the shared
 * project-type catalogue (`findProjectType`).
 */
export function projectTypeBadges(p: LocalProject): {
  primary: ProjectTypeBadge | null;
  secondary: ProjectTypeBadge[];
} {
  const primaryDef = p.projectType ? findProjectType(p.projectType) : undefined;
  const primary: ProjectTypeBadge | null = primaryDef
    ? { id: primaryDef.id, label: primaryDef.label }
    : null;
  const secondaryIds = p.metadata?.projectTypeRecord?.secondaryTypeIds ?? [];
  const secondary: ProjectTypeBadge[] = secondaryIds
    .map((sid): ProjectTypeBadge | null => {
      const def = findProjectType(sid);
      return def ? { id: def.id, label: def.label } : null;
    })
    .filter((b): b is ProjectTypeBadge => b !== null);
  return { primary, secondary };
}

/**
 * Resolved §8 access for one project on the Portfolio surface. Single source
 * of truth for every Portfolio Home capability gate (relationship create,
 * cross-project Observe compare, contractor redirect).
 *
 * Role keying: `useMyProjectRoles()` is keyed by SERVER project id. A
 * local-only project (no `serverId`) is absent from the map and is owned by
 * the steward — so `role` is `null` and the project is treated as owner-tier.
 * Gates use capability checks (`hasCapability`) rather than literal role names,
 * so all 8 ProjectRole variants resolve correctly without an `admin` role.
 */
export interface PortfolioAccess {
  role: ProjectRole | null;
  /** owner / primary_steward (manage_members), or local-only ⇒ owner. */
  isOwnerTier: boolean;
  /** owner-tier + designer / team_member / contractor (edit capability). */
  canEdit: boolean;
  /** Granted role is literally `contractor` (drives the §8 redirect). */
  isContractor: boolean;
}

export function portfolioAccess(
  project: LocalProject,
  roleMap: ReadonlyMap<string, ProjectRole>,
): PortfolioAccess {
  const role = project.serverId ? roleMap.get(project.serverId) ?? null : null;
  return {
    role,
    isOwnerTier: role == null || hasCapability(role, 'manage_members'),
    canEdit: role == null || hasCapability(role, 'edit'),
    isContractor: role === 'contractor',
  };
}
