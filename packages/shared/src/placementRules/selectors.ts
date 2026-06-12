/**
 * Placement-rule selectors — pure matching helpers shared by the client
 * evaluator and the server guard. No geometry here; just "which rules
 * apply to this candidate".
 */

import { PLACEMENT_RULES } from './catalog.js';
import type {
  PlacementCandidate,
  PlacementRule,
  PlacementSubjectMatch,
} from './types.js';

/**
 * Does a rule's subject match a candidate?
 *   - `exceptKinds` always excludes, regardless of the other matchers.
 *   - With `kinds` and/or `categories` set, the candidate matches when it
 *     hits ANY listed kind OR any listed category.
 *   - With neither set, the rule applies to every candidate.
 */
export function subjectMatches(
  subject: PlacementSubjectMatch,
  candidate: PlacementCandidate,
): boolean {
  if (subject.exceptKinds?.includes(candidate.kind)) return false;
  const hasKinds = (subject.kinds?.length ?? 0) > 0;
  const hasCategories = (subject.categories?.length ?? 0) > 0;
  if (!hasKinds && !hasCategories) return true;
  if (hasKinds && subject.kinds!.includes(candidate.kind)) return true;
  if (
    hasCategories &&
    candidate.category !== undefined &&
    subject.categories!.includes(candidate.category)
  ) {
    return true;
  }
  return false;
}

/** Every rule applying to a candidate, catalog order (blocks first). */
export function rulesForCandidate(
  candidate: PlacementCandidate,
  rules: readonly PlacementRule[] = PLACEMENT_RULES,
): PlacementRule[] {
  return rules.filter((r) => subjectMatches(r.subject, candidate));
}

/** The subset the server placement guard attempts (Phase 4). */
export function serverEnforceableRules(
  rules: readonly PlacementRule[] = PLACEMENT_RULES,
): PlacementRule[] {
  return rules.filter((r) => r.serverEnforceable);
}
