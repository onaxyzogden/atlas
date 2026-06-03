// useStageSearchResults — per-stage resolvers for the header Stage Search.
//
// Given the active stage's data + the raw query from `stageSearchStore`, each
// resolver returns a flat, cross-scope match list that the stage surface
// renders IN PLACE of its normally-scoped list while a query is active
// (objectives across all strata in Plan; tools across all objectives in Act;
// modules/domains in Observe). Matching is case-insensitive substring — the
// same approach CommandPalette uses, no new fuzzy-search dependency.
//
// Phase 2 ships the Plan branch (objectives, widened by their mapped Observe
// domain labels so a domain term like "Water" surfaces the objectives that
// concern it — Plan has no standalone domain surface, so a domain match
// resolves to its objectives rather than to a domain route). Act (Phase 3) and
// Observe (Phase 4) branches land in later slices.

import {
  getObjectiveObserveDomains,
  UNIVERSAL_DOMAIN_LABELS,
  type PlanStratumObjective,
} from '@ogden/shared';

/** A single Plan objective that matched the query, with the reason it did. */
export interface PlanObjectiveMatch {
  objective: PlanStratumObjective;
  /**
   * Mapped Observe-domain labels that themselves matched the query (e.g.
   * "Hydrology & Water" for the term "water"). Empty when the objective matched
   * on its own text. Surfaced as a subtle "via …" hint so the steward
   * understands why a card with no literal title match appears.
   */
  matchedDomains: string[];
}

/** Lower-case + trim a raw query. Returns '' for an all-whitespace query. */
export function normalizeQuery(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Resolve the Plan objective matches for a query, across ALL strata (the
 * "broaden + reveal" reach). An objective matches when the query is a substring
 * of its title / shortTitle / focusedQuestion / ref, OR of any of its mapped
 * Observe-domain labels. Input order is preserved (objectives already arrive in
 * stratum/catalogue order). Returns [] for an empty query so callers can use a
 * non-empty result as the "search is active" signal without a separate flag.
 */
export function resolvePlanSearchMatches(
  objectives: readonly PlanStratumObjective[],
  rawQuery: string,
): PlanObjectiveMatch[] {
  const q = normalizeQuery(rawQuery);
  if (!q) return [];

  const matches: PlanObjectiveMatch[] = [];
  for (const objective of objectives) {
    const textHaystack = [
      objective.title,
      objective.shortTitle ?? '',
      objective.focusedQuestion,
      objective.ref ?? '',
    ]
      .join(' ')
      .toLowerCase();
    const textMatch = textHaystack.includes(q);

    const matchedDomains: string[] = [];
    for (const domainId of getObjectiveObserveDomains(objective)) {
      const label = UNIVERSAL_DOMAIN_LABELS[domainId];
      if (label.toLowerCase().includes(q)) matchedDomains.push(label);
    }

    if (textMatch || matchedDomains.length > 0) {
      matches.push({ objective, matchedDomains });
    }
  }
  return matches;
}
