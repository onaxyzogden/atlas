/**
 * `@ogden/shared/placementRules` — shared placement-rule catalog.
 *
 * Data + matching only; geometry evaluation lives with the consumers
 * (client: apps/web/src/v3/plan/validation/; server:
 * apps/api/src/lib/placementGuard.ts).
 */

// Schema + type pair (zod object, embeddable in other schemas).
export { PlacementAcknowledgment } from './types.js';
export type {
  PlacementCandidate,
  PlacementConstraint,
  PlacementDistanceTarget,
  PlacementRule,
  PlacementSeverity,
  PlacementSiteLayer,
  PlacementSubjectMatch,
} from './types.js';
export {
  PLACEMENT_DISTANCES_M,
  PLACEMENT_RULES,
  findPlacementRule,
} from './catalog.js';
export {
  rulesForCandidate,
  serverEnforceableRules,
  subjectMatches,
} from './selectors.js';
export { ZONE_CATEGORIES, type ZoneCategory } from '../constants/zoneCategories.js';
