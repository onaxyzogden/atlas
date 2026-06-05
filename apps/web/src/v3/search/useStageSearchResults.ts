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
  getObjectiveActTools,
  getObjectiveObserveDomains,
  UNIVERSAL_DOMAIN_LABELS,
  type PlanStratumObjective,
} from '@ogden/shared';
import {
  ACT_TOOL_CATEGORIES,
  resolveActTools,
  type ActTool,
} from '../act/tier-shell/actToolCatalog.js';

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

// ---------------------------------------------------------------------------
// Act resolver (Phase 3) — the Act tier-shell scopes its tools to the *selected*
// objective (getObjectiveActTools), so a whole-stage tool search needs a reverse
// map: walk every objective, resolve its act-tools, and key each tool back to an
// owning objective so a selected tool can both navigate to that objective and
// arm itself there. Objective text matches ride alongside so the steward can
// search either a tool ("contour") or an objective ("water strategy").
// ---------------------------------------------------------------------------

/** Catalogue-id -> category label, built once from ACT_TOOL_CATEGORIES so a tool
 *  can be matched on its human category name ("Water & Hydrology") as well. */
const ACT_CATEGORY_LABELS: Readonly<Record<string, string>> = Object.fromEntries(
  ACT_TOOL_CATEGORIES.map((c) => [c.id, c.label]),
);

/** A single Act tool that matched, plus the objective that exposes it (the one
 *  selecting the result navigates to and arms the tool on). `categoryLabel` is
 *  shown as the provenance hint beneath the result. */
export interface ActToolMatch {
  tool: ActTool;
  objective: PlanStratumObjective;
  categoryLabel: string;
}

/** Flat Act match set: objectives (by text) + tools (reverse-mapped, deduped). */
export interface ActSearchResults {
  objectives: PlanStratumObjective[];
  tools: ActToolMatch[];
}

function objectiveTextMatches(
  objective: PlanStratumObjective,
  q: string,
): boolean {
  return [
    objective.title,
    objective.shortTitle ?? '',
    objective.focusedQuestion,
    objective.ref ?? '',
  ]
    .join(' ')
    .toLowerCase()
    .includes(q);
}

/**
 * Resolve Act matches for a query across ALL objectives. Tools are deduped by
 * catalogue id (a tool exposed by several objectives surfaces once, owned by the
 * first objective that exposes it — any owner arms identically for map/log/flow
 * arms, and a form arm gathers its sibling group from that owner). Returns empty
 * arrays for an empty query so a non-empty result doubles as the active signal.
 */
export function resolveActSearchMatches(
  objectives: readonly PlanStratumObjective[],
  rawQuery: string,
): ActSearchResults {
  const q = normalizeQuery(rawQuery);
  if (!q) return { objectives: [], tools: [] };

  const objectiveMatches: PlanStratumObjective[] = [];
  const toolMatches: ActToolMatch[] = [];
  const seenTools = new Set<string>();

  for (const objective of objectives) {
    if (objectiveTextMatches(objective, q)) objectiveMatches.push(objective);

    for (const tool of resolveActTools(getObjectiveActTools(objective))) {
      if (seenTools.has(tool.id)) continue;
      const categoryLabel = ACT_CATEGORY_LABELS[tool.category] ?? '';
      const toolMatch =
        tool.label.toLowerCase().includes(q) ||
        categoryLabel.toLowerCase().includes(q);
      if (toolMatch) {
        seenTools.add(tool.id);
        toolMatches.push({ tool, objective, categoryLabel });
      }
    }
  }
  return { objectives: objectiveMatches, tools: toolMatches };
}

// ---------------------------------------------------------------------------
// Observe resolver (Phase 4) — the Observe dashboard's Unified Land State
// surface already shows ALL 16 universal domains at once (the whole-stage view),
// so a query NARROWS the grid in place rather than broadening it. Each domain is
// matched on its human label, its purpose blurb, and its raw id; selecting a
// surviving card reveals the domain-detail surface and clears the query. The
// matcher takes the already-resolved snapshot fields (label/purpose) the surface
// holds, so it needs no second data join.
// ---------------------------------------------------------------------------

/** True when a query matches an Observe domain by label, purpose, or id. Returns
 *  false for an empty query so callers gate on a search being active first. */
export function observeDomainMatchesQuery(
  fields: { label: string; purpose: string; domainId: string },
  rawQuery: string,
): boolean {
  const q = normalizeQuery(rawQuery);
  if (!q) return false;
  return (
    fields.label.toLowerCase().includes(q) ||
    fields.purpose.toLowerCase().includes(q) ||
    fields.domainId.toLowerCase().includes(q)
  );
}
