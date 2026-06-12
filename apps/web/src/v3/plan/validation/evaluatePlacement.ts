/**
 * evaluatePlacement — pure draw-time placement evaluation.
 *
 * `evaluatePlacement(geometry, candidate, ctx)` runs every catalog rule
 * whose subject matches the candidate against the geometry pools in a
 * `PlacementContext` and returns tiered results: `blocks` (placement must
 * be rejected — no record) and `warns` (placement needs a steward
 * acknowledgment via PlacementConflictDialog).
 *
 * Geometry discipline:
 *   - MultiPolygons are ALWAYS exploded into parts before any turf
 *     predicate — never reuse the geo.ts largest-ring shortcut here.
 *   - Distance rules pre-buffer their targets ONCE per context (cached in
 *     `ctx.bufferCache` by rule id), so repeated evaluation against a live
 *     cursor never re-buffers. Buffered entries retain their source
 *     feature id so drag-revalidation can self-exclude without a rebuild.
 *   - Zone rules no-op (not warn) while no zones exist yet: a steward who
 *     hasn't drawn zoning shouldn't be nagged about zone affinity. Once
 *     any zone exists for the project, zone-containment rules evaluate.
 *   - max-distance rules no-op when no target exists (you can't demand
 *     proximity to a water source that hasn't been placed).
 */

import * as turf from '@turf/turf';
import {
  rulesForCandidate,
  type PlacementCandidate,
  type PlacementDistanceTarget,
  type PlacementRule,
  type PlacementSeverity,
} from '@ogden/shared/placementRules';
import type {
  BufferedTargetEntry,
  PlacementContext,
  PlacementGeometry,
} from './placementContext.js';

export interface PlacementViolation {
  ruleId: string;
  severity: PlacementSeverity;
  message: string;
  whyItMatters?: string;
  amanahNote?: string;
}

export interface PlacementEvaluation {
  ok: boolean;
  blocks: PlacementViolation[];
  warns: PlacementViolation[];
}

export interface EvaluatePlacementOptions {
  /** Feature id to ignore in target pools — the feature being drag-moved
   *  (or re-validated) must not collide with its own previous geometry. */
  excludeFeatureId?: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Geometry helpers
// ─────────────────────────────────────────────────────────────────────────

type SinglePartGeometry = GeoJSON.Point | GeoJSON.LineString | GeoJSON.Polygon;

/** Explode MultiPolygons into their parts; everything else passes through. */
function geomParts(geom: PlacementGeometry): SinglePartGeometry[] {
  if (geom.type === 'MultiPolygon') {
    return geom.coordinates.map((coords) => ({ type: 'Polygon', coordinates: coords }));
  }
  return [geom];
}

function intersectsAnyPart(a: PlacementGeometry, b: PlacementGeometry): boolean {
  for (const pa of geomParts(a)) {
    for (const pb of geomParts(b)) {
      if (!turf.booleanDisjoint(pa, pb)) return true;
    }
  }
  return false;
}

/** Every part of `geom` sits within at least one part of `container`. */
function withinAnyPart(geom: PlacementGeometry, container: PlacementGeometry): boolean {
  const containerParts = geomParts(container).filter(
    (p): p is GeoJSON.Polygon => p.type === 'Polygon',
  );
  if (containerParts.length === 0) return false;
  for (const part of geomParts(geom)) {
    const inside = containerParts.some((c) =>
      part.type === 'Point'
        ? turf.booleanPointInPolygon(part.coordinates, c)
        : turf.booleanWithin(part, c),
    );
    if (!inside) return false;
  }
  return true;
}

/** Area of `geom` (m²) — 0 for non-polygons. */
function polygonAreaM2(geom: PlacementGeometry): number {
  if (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon') return 0;
  return turf.area(geom);
}

// ─────────────────────────────────────────────────────────────────────────
// Distance-target resolution + buffering
// ─────────────────────────────────────────────────────────────────────────

interface ResolvedTarget {
  sourceId: string | null;
  geometry: PlacementGeometry;
}

function resolveDistanceTargets(
  target: PlacementDistanceTarget,
  ctx: PlacementContext,
): ResolvedTarget[] {
  const out: ResolvedTarget[] = [];
  const seenFeatureIds = new Set<string>();
  for (const f of ctx.features) {
    const byKind = target.kinds?.includes(f.kind) ?? false;
    const byCategory =
      (f.category !== undefined && target.categories?.includes(f.category)) ?? false;
    if (!byKind && !byCategory) continue;
    if (seenFeatureIds.has(f.id)) continue;
    seenFeatureIds.add(f.id);
    out.push({ sourceId: f.id, geometry: f.geometry });
  }
  if (target.zoneCategories) {
    // Context zone categories are plain strings (zoneStore data); widen the
    // catalog's ZoneCategory list for the membership test.
    const zoneCategories: readonly string[] = target.zoneCategories;
    for (const z of ctx.zones) {
      if (!zoneCategories.includes(z.category)) continue;
      out.push({ sourceId: z.id, geometry: z.geometry });
    }
  }
  if (target.siteLayers) {
    for (const layer of target.siteLayers) {
      for (const geometry of ctx.siteLayers[layer]) {
        out.push({ sourceId: null, geometry });
      }
    }
  }
  if (target.setbackRings) {
    for (const r of ctx.setbackRings) {
      out.push({ sourceId: r.id, geometry: r.geometry });
    }
  }
  return out;
}

/**
 * Buffered targets for a distance rule — built once per context, cached by
 * rule id. distanceM 0 ("must not intersect") skips buffering and reuses
 * the raw geometry.
 */
function bufferedTargetsForRule(
  rule: PlacementRule,
  ctx: PlacementContext,
): BufferedTargetEntry[] {
  const cached = ctx.bufferCache.get(rule.id);
  if (cached) return cached;
  const c = rule.constraint;
  if (c.type !== 'min-distance-from' && c.type !== 'max-distance-from') return [];
  const entries: BufferedTargetEntry[] = [];
  for (const t of resolveDistanceTargets(c.target, ctx)) {
    if (c.distanceM === 0) {
      for (const part of geomParts(t.geometry)) {
        if (part.type !== 'Polygon') continue;
        entries.push({ sourceId: t.sourceId, geometry: part });
      }
      // Point / LineString with distanceM 0 cannot meaningfully be
      // "intersected" by a buffer of zero width — skip rather than guess.
      continue;
    }
    for (const part of geomParts(t.geometry)) {
      const buffered = turf.buffer(turf.feature(part), c.distanceM, {
        units: 'meters',
      });
      if (!buffered) continue;
      entries.push({
        sourceId: t.sourceId,
        geometry: buffered.geometry,
      });
    }
  }
  ctx.bufferCache.set(rule.id, entries);
  return entries;
}

// ─────────────────────────────────────────────────────────────────────────
// Per-constraint evaluators — each returns true when VIOLATED
// ─────────────────────────────────────────────────────────────────────────

function violatesWithinBoundary(
  geom: PlacementGeometry,
  ctx: PlacementContext,
): boolean {
  if (!ctx.boundary) return false;
  return !withinAnyPart(geom, ctx.boundary);
}

function violatesZoneContainment(
  geom: PlacementGeometry,
  zoneCategories: readonly string[],
  minCoveragePct: number,
  ctx: PlacementContext,
): boolean {
  if (ctx.zones.length === 0) return false; // no zoning drawn yet — no-op
  const matching = ctx.zones.filter((z) => zoneCategories.includes(z.category));
  if (matching.length === 0) return true; // zoned project, but no qualifying zone
  if (geom.type === 'Point') {
    return !matching.some((z) =>
      geomParts(z.geometry).some(
        (p) => p.type === 'Polygon' && turf.booleanPointInPolygon(geom.coordinates, p),
      ),
    );
  }
  if (geom.type === 'LineString') {
    return !matching.some((z) => withinAnyPart(geom, z.geometry));
  }
  const totalArea = polygonAreaM2(geom);
  if (totalArea <= 0) return false;
  // Overlapping qualifying zones can double-count intersection area;
  // coverage is capped at 100 so that only ever errs lenient.
  let covered = 0;
  for (const candidatePart of geomParts(geom)) {
    if (candidatePart.type !== 'Polygon') continue;
    for (const z of matching) {
      for (const zonePart of geomParts(z.geometry)) {
        if (zonePart.type !== 'Polygon') continue;
        const overlap = turf.intersect(
          turf.featureCollection([turf.feature(candidatePart), turf.feature(zonePart)]),
        );
        if (overlap) covered += turf.area(overlap);
      }
    }
  }
  const coveragePct = Math.min(100, (covered / totalArea) * 100);
  return coveragePct < minCoveragePct;
}

function violatesZoneExclusion(
  geom: PlacementGeometry,
  zoneCategories: readonly string[],
  ctx: PlacementContext,
): boolean {
  return ctx.zones.some(
    (z) => zoneCategories.includes(z.category) && intersectsAnyPart(geom, z.geometry),
  );
}

function violatesMinDistance(
  geom: PlacementGeometry,
  rule: PlacementRule,
  ctx: PlacementContext,
  excludeFeatureId?: string,
): boolean {
  const entries = bufferedTargetsForRule(rule, ctx);
  return entries.some(
    (e) =>
      (excludeFeatureId === undefined || e.sourceId !== excludeFeatureId) &&
      intersectsAnyPart(geom, e.geometry),
  );
}

function violatesMaxDistance(
  geom: PlacementGeometry,
  rule: PlacementRule,
  ctx: PlacementContext,
  excludeFeatureId?: string,
): boolean {
  const entries = bufferedTargetsForRule(rule, ctx).filter(
    (e) => excludeFeatureId === undefined || e.sourceId !== excludeFeatureId,
  );
  if (entries.length === 0) return false; // nothing to be near — no-op
  return !entries.some((e) => intersectsAnyPart(geom, e.geometry));
}

function violatesNoOverlapSameKind(
  geom: PlacementGeometry,
  candidate: PlacementCandidate,
  ctx: PlacementContext,
  excludeFeatureId?: string,
): boolean {
  return ctx.features.some(
    (f) =>
      f.kind === candidate.kind &&
      f.id !== excludeFeatureId &&
      intersectsAnyPart(geom, f.geometry),
  );
}

function violatesPermacultureRingRange(
  geom: PlacementGeometry,
  minZ: number,
  maxZ: number,
  ctx: PlacementContext,
): boolean {
  const tagged = ctx.zones.filter((z) => typeof z.permacultureZone === 'number');
  if (tagged.length === 0) return false; // rings not mapped — no-op
  const touching = tagged.filter((z) => intersectsAnyPart(geom, z.geometry));
  if (touching.length === 0) return false; // outside the mapped rings — indeterminate
  return !touching.some(
    (z) => (z.permacultureZone as number) >= minZ && (z.permacultureZone as number) <= maxZ,
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────────────────

function ruleViolated(
  rule: PlacementRule,
  geom: PlacementGeometry,
  candidate: PlacementCandidate,
  ctx: PlacementContext,
  opts?: EvaluatePlacementOptions,
): boolean {
  const c = rule.constraint;
  switch (c.type) {
    case 'within-boundary':
      return violatesWithinBoundary(geom, ctx);
    case 'zone-containment':
      return violatesZoneContainment(geom, c.zoneCategories, c.minCoveragePct, ctx);
    case 'zone-exclusion':
      return violatesZoneExclusion(geom, c.zoneCategories, ctx);
    case 'min-distance-from':
      return violatesMinDistance(geom, rule, ctx, opts?.excludeFeatureId);
    case 'max-distance-from':
      return violatesMaxDistance(geom, rule, ctx, opts?.excludeFeatureId);
    case 'no-overlap-same-kind':
      return violatesNoOverlapSameKind(geom, candidate, ctx, opts?.excludeFeatureId);
    case 'permaculture-ring-range':
      return violatesPermacultureRingRange(geom, c.minZ, c.maxZ, ctx);
  }
}

export function evaluatePlacement(
  geometry: PlacementGeometry,
  candidate: PlacementCandidate,
  ctx: PlacementContext,
  opts?: EvaluatePlacementOptions,
): PlacementEvaluation {
  const blocks: PlacementViolation[] = [];
  const warns: PlacementViolation[] = [];
  for (const rule of rulesForCandidate(candidate)) {
    if (!ruleViolated(rule, geometry, candidate, ctx, opts)) continue;
    const violation: PlacementViolation = {
      ruleId: rule.id,
      severity: rule.severity,
      message: rule.message,
    };
    if (rule.whyItMatters !== undefined) violation.whyItMatters = rule.whyItMatters;
    if (rule.amanahNote !== undefined) violation.amanahNote = rule.amanahNote;
    (rule.severity === 'block' ? blocks : warns).push(violation);
  }
  return { ok: blocks.length === 0 && warns.length === 0, blocks, warns };
}
