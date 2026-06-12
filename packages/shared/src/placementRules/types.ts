/**
 * Placement-rule types — the shared, data-only vocabulary for draw-time
 * placement validation.
 *
 * One rule source, two evaluators:
 *   - CLIENT: `apps/web/src/v3/plan/validation/` evaluates every rule with
 *     turf against live store geometry at draw-complete / drag-commit time.
 *   - SERVER: `apps/api/src/lib/placementGuard.ts` compiles the
 *     `serverEnforceable` subset to PostGIS (`ST_Covers` / `ST_DWithin` /
 *     `ST_Intersects`) against `design_features` + `projects.parcel_boundary`.
 *
 * This package is pure data + types (zod-only shared package — NO turf, NO
 * app imports). Geometry evaluation lives with the consumers.
 *
 * Tiered enforcement (operator decision 2026-06-11, mirroring the buried-
 * utility veto ADR 2026-05-10): `block` rules reject the placement outright
 * (toast, no record); `warn` rules open an acknowledgment dialog — the
 * steward types a >=3-char acknowledgment which is persisted on the record.
 *
 * KIND / CATEGORY VOCABULARY — `PlacementCandidate.kind` is matched VERBATIM
 * against `subject.kinds` / distance-target `kinds`, so the catalog must use
 * the ids the stores actually carry. The pools in play:
 *   - design elements (elementCatalog.ts): kind 'paddock'|'orchard'|'pond'|
 *     'swale'|'road'|'path'|'gate'|'hedgerow'|'insectary-strip'|'apple-tree'|
 *     'water-tank'|... with category 'grazing'|'structure'|'water'|'access'|
 *     'vegetation'|'earthworks'|'amenity'|'habitat'|'machinery'.
 *   - structures (BE V2, shared StructureType): 'well'|'septic'(utility)|
 *     'cabin'|'barn'|... -> candidate category 'structure'.
 *   - utility points (utilityStore UtilityType): 'septic'|'well_pump'|
 *     'water_tank'|... -> candidate category 'utility'.
 *   - crop areas (cropStore CropAreaType): 'orchard'|'food_forest'|'nursery'|
 *     ... -> candidate category 'crop-area'.
 *   - paddocks (livestockStore): kind 'paddock', category 'grazing'.
 *   - zones (zoneStore): kind 'zone', category 'zone' (zone-on-zone rules
 *     use `zoneCategories`, not kind matching).
 * Where two stores spell the same thing differently (water-tank vs
 * water_tank), the catalog lists BOTH spellings rather than normalizing —
 * normalization bugs are silent; duplicate list entries are not.
 */

import { z } from 'zod';
import type { ZoneCategory } from '../constants/zoneCategories.js';

export type PlacementSeverity = 'block' | 'warn';

/**
 * One acknowledged warn-severity violation, persisted on the placed record
 * (`placementAcknowledgments` on the client stores; mirrored into
 * `properties.placementAcknowledgments` jsonb on synced design_features).
 * Mirrors the buried-utility veto's `utilityAcknowledgment` precedent.
 * A zod schema (not a bare interface) so `BuiltEnvironmentEntity` and the
 * API's design-feature schema can embed it.
 */
export const PlacementAcknowledgment = z.object({
  ruleId: z.string().min(1),
  message: z.string(),
  acknowledgment: z.string().min(3),
  acknowledgedAt: z.string(),
});
export type PlacementAcknowledgment = z.infer<typeof PlacementAcknowledgment>;

/** The thing being placed or moved, as the evaluator sees it. */
export interface PlacementCandidate {
  /** Store-level kind id (see vocabulary note above). */
  kind: string;
  /** Broad class: 'structure' | 'utility' | 'crop-area' | 'grazing' | ... */
  category?: string;
}

/**
 * Which candidates a rule applies to. Empty kinds AND categories = applies
 * to every candidate (minus `exceptKinds`). `exceptKinds` always wins.
 */
export interface PlacementSubjectMatch {
  kinds?: readonly string[];
  categories?: readonly string[];
  exceptKinds?: readonly string[];
}

/** Environmental layers read from siteData (client) — not drawn features. */
export type PlacementSiteLayer = 'wetland' | 'waterway';

/**
 * What a distance constraint measures against. The pools are ADDITIVE —
 * every listed pool contributes candidate geometries (e.g. the livestock-
 * spiritual rule measures against BOTH prayer structures and spiritual
 * zones). At least one pool must be set (integrity-tested).
 */
export interface PlacementDistanceTarget {
  /** Drawn features by verbatim kind id. */
  kinds?: readonly string[];
  /** Drawn features by broad category. */
  categories?: readonly string[];
  /** Drawn zones by zone category. */
  zoneCategories?: readonly ZoneCategory[];
  /** Site-data environmental layers (client-side only; server skips). */
  siteLayers?: readonly PlacementSiteLayer[];
  /** Steward-drawn setback rings (advisory annotations; client-side only). */
  setbackRings?: boolean;
  /** Human phrase for violation messages, e.g. 'a septic system'. */
  label: string;
}

export type PlacementConstraint =
  /** Geometry must sit entirely inside the parcel boundary. */
  | { type: 'within-boundary' }
  /**
   * Geometry should sit (>= minCoveragePct % of its area) inside zones of
   * the given categories. No-op when the project has no zones drawn yet.
   */
  | {
      type: 'zone-containment';
      zoneCategories: readonly ZoneCategory[];
      minCoveragePct: number;
    }
  /** Geometry must not intersect zones of the given categories. */
  | { type: 'zone-exclusion'; zoneCategories: readonly ZoneCategory[] }
  /**
   * Geometry must keep >= distanceM from every target. distanceM 0 means
   * "must not intersect" (used for setback-ring respect).
   */
  | {
      type: 'min-distance-from';
      target: PlacementDistanceTarget;
      distanceM: number;
    }
  /** At least ONE target must lie within distanceM (proximity requirement). */
  | {
      type: 'max-distance-from';
      target: PlacementDistanceTarget;
      distanceM: number;
    }
  /** Geometry must not overlap an existing feature of the same kind. */
  | { type: 'no-overlap-same-kind' }
  /**
   * Geometry should fall within the given Holmgren ring band (Z levels of
   * the zones it lands in, via `permacultureZone`). No-op when no zones
   * carry a Z level.
   */
  | {
      type: 'permaculture-ring-range';
      minZ: 0 | 1 | 2 | 3 | 4 | 5;
      maxZ: 0 | 1 | 2 | 3 | 4 | 5;
    };

export interface PlacementRule {
  id: string;
  severity: PlacementSeverity;
  subject: PlacementSubjectMatch;
  constraint: PlacementConstraint;
  /** Short violation line shown in the toast / dialog. */
  message: string;
  /** Plain-language rationale (RulesPanel + dialog detail). */
  whyItMatters?: string;
  /**
   * Covenant note — Amanah / fiqh grounding where the rule carries one.
   * Shown alongside whyItMatters; never stripped or genericized.
   */
  amanahNote?: string;
  /**
   * True when the server placement guard should attempt this rule. v1
   * compiles exactly three constraint shapes (within-boundary,
   * min-distance-from with feature `kinds`, zone-exclusion); everything
   * else is client-only regardless of this flag's plausibility.
   */
  serverEnforceable: boolean;
  /** Matching post-hoc rule in features/rules/SitingRules.ts RULE_CATALOG. */
  legacyRuleId?: string;
}
