/**
 * placementGuard — server-side PostGIS evaluation of the shared placement
 * rules for design_features writes (2026-06-11 plan, Phase 4).
 *
 * Mirrors the client evaluator (apps/web/src/v3/plan/validation/) over the
 * `serverEnforceable` subset of `@ogden/shared/placementRules`. v1 compiles
 * exactly three constraint shapes (documented in the shared types.ts header):
 *
 *   within-boundary    → ST_Covers(projects.parcel_boundary, candidate)
 *                        (skipped when the project has no boundary)
 *   min-distance-from  → ST_DWithin(geography) vs sibling design_features
 *                        whose subtype is in the rule's target `kinds` pool
 *                        (zoneCategories / siteLayers / setbackRings pools
 *                        are client-only context — skipped here)
 *   zone-exclusion     → ST_Intersects vs feature_type='zone' rows whose
 *                        subtype is in the rule's zoneCategories (zone rows
 *                        store their zone category as the subtype column)
 *
 * Rules skip silently when their context is absent server-side (no boundary,
 * no matching siblings) — the server guard protects what actually reaches
 * design_features; the client remains the full evaluator.
 *
 * Candidate mapping follows apps/web/src/lib/featureMapping.ts, the sync
 * mappers that produce these rows:
 *   zone      → kind 'zone',              category 'zone'   (subtype = zone category)
 *   structure → kind subtype ?? 'structure', category 'structure'
 *   path      → kind 'path',              category 'access'
 *   point     → kind subtype ?? 'point',  category 'utility' (subtype = utility type, e.g. 'septic')
 *   annotation → never gated (matches the client's annotation exemption)
 */

import type { Sql } from 'postgres';
import {
  serverEnforceableRules,
  subjectMatches,
  type PlacementCandidate,
  type PlacementRule,
} from '@ogden/shared/placementRules';

export interface PlacementViolation {
  ruleId: string;
  severity: 'block' | 'warn';
  message: string;
}

export interface CheckPlacementInput {
  projectId: string;
  featureType: string;
  subtype: string | null | undefined;
  /** GeoJSON geometry object (already schema-validated by the route). */
  geometry: unknown;
  /** On PATCH: the feature being moved, excluded from sibling queries. */
  excludeFeatureId?: string;
}

/** design_features row → rule-catalog candidate (see header). */
export function candidateForFeature(
  featureType: string,
  subtype: string | null | undefined,
): PlacementCandidate | null {
  switch (featureType) {
    case 'zone':
      return { kind: 'zone', category: 'zone' };
    case 'structure':
      return { kind: subtype ?? 'structure', category: 'structure' };
    case 'path':
      return { kind: 'path', category: 'access' };
    case 'point':
      return { kind: subtype ?? 'point', category: 'utility' };
    case 'annotation':
    default:
      return null;
  }
}

async function violatesWithinBoundary(
  db: Sql,
  projectId: string,
  geomStr: string,
): Promise<boolean> {
  const [row] = await db`
    SELECT (
      parcel_boundary IS NOT NULL
      AND NOT ST_Covers(parcel_boundary, ST_GeomFromGeoJSON(${geomStr}))
    ) AS violated
    FROM projects
    WHERE id = ${projectId}
  `;
  return row?.violated === true;
}

async function violatesMinDistance(
  db: Sql,
  projectId: string,
  geomStr: string,
  kinds: readonly string[],
  distanceM: number,
  excludeFeatureId: string | undefined,
): Promise<boolean> {
  const [row] = await db`
    SELECT 1 AS hit
    FROM design_features
    WHERE project_id = ${projectId}
      AND subtype = ANY(${[...kinds]})
      AND id IS DISTINCT FROM ${excludeFeatureId ?? null}
      AND ST_DWithin(
        geometry::geography,
        ST_GeomFromGeoJSON(${geomStr})::geography,
        ${distanceM}
      )
    LIMIT 1
  `;
  return row != null;
}

async function violatesZoneExclusion(
  db: Sql,
  projectId: string,
  geomStr: string,
  zoneCategories: readonly string[],
  excludeFeatureId: string | undefined,
): Promise<boolean> {
  const [row] = await db`
    SELECT 1 AS hit
    FROM design_features
    WHERE project_id = ${projectId}
      AND feature_type = 'zone'
      AND subtype = ANY(${[...zoneCategories]})
      AND id IS DISTINCT FROM ${excludeFeatureId ?? null}
      AND ST_Intersects(geometry, ST_GeomFromGeoJSON(${geomStr}))
    LIMIT 1
  `;
  return row != null;
}

async function ruleViolated(
  db: Sql,
  rule: PlacementRule,
  input: CheckPlacementInput,
  geomStr: string,
): Promise<boolean> {
  const { constraint } = rule;
  switch (constraint.type) {
    case 'within-boundary':
      return violatesWithinBoundary(db, input.projectId, geomStr);
    case 'min-distance-from': {
      // Server v1 measures the feature-`kinds` pool only; zoneCategories /
      // siteLayers / setbackRings pools are client-side context.
      const kinds = constraint.target.kinds;
      if (!kinds?.length) return false;
      return violatesMinDistance(
        db,
        input.projectId,
        geomStr,
        kinds,
        constraint.distanceM,
        input.excludeFeatureId,
      );
    }
    case 'zone-exclusion':
      return violatesZoneExclusion(
        db,
        input.projectId,
        geomStr,
        constraint.zoneCategories,
        input.excludeFeatureId,
      );
    default:
      // Other constraint shapes are client-only in v1 (types.ts header).
      return false;
  }
}

/**
 * Evaluate the server-enforceable placement rules against a candidate
 * design-feature write. Returns the violations found (empty = clean).
 * Mode handling (off/log/enforce) is the caller's job — this is pure check.
 */
export async function checkPlacement(
  db: Sql,
  input: CheckPlacementInput,
): Promise<PlacementViolation[]> {
  const candidate = candidateForFeature(input.featureType, input.subtype);
  if (!candidate || input.geometry == null) return [];

  const geomStr = JSON.stringify(input.geometry);
  const violations: PlacementViolation[] = [];

  for (const rule of serverEnforceableRules()) {
    if (!subjectMatches(rule.subject, candidate)) continue;
    if (await ruleViolated(db, rule, input, geomStr)) {
      violations.push({
        ruleId: rule.id,
        severity: rule.severity,
        message: rule.message,
      });
    }
  }
  return violations;
}
