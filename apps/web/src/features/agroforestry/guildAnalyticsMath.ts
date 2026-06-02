/**
 * guildAnalyticsMath — pure, tested analytics for a single guild,
 * feeding the Plan-stage Guild Builder card.
 *
 * Adopted from the prior OGDEN "Guild Builder" mockup (which showed
 * hardcoded functional-coverage / resilience / water-balance /
 * compatibility readouts) but recomputed live from the guild's
 * resolved catalog members. Every value is a *design-time planning
 * estimate*, not a measured outcome.
 *
 * SCOPE NOTE (Permaculture Scholar verdict, 2026-05-07): the OGDEN
 * page's Shannon-diversity index was struck as "ecological theatre for
 * working stewards" and is deliberately NOT reproduced here. Diversity
 * is instead expressed as plain niche/function *counts* — see
 * wiki/decisions/2026-05-07-atlas-plan-plants-scholar-build-fresh.md.
 *
 * Compatibility is delegated to the existing companion-planting
 * constraint checker (`guildIntegrityMath.checkGuild`) rather than
 * forking that logic.
 */

import type { Guild, GuildMember } from '../../store/polycultureStore.js';
import type { PlantCatalogEntry } from '../../data/plantCatalog.js';
import { findEntry } from '../../data/plantCatalog.js';
import { checkGuild } from '../../v3/plan/cards/plant-systems/guildIntegrityMath.js';
import {
  FOOD_FOREST_NICHES,
  distinctFunctionCount,
} from '../forest/canopyMetricsMath.js';

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

const ECOLOGICAL_FUNCTION_COUNT = 9;

/** Resolve anchor + members of a guild to catalog entries (drops
 *  ids the catalog can't resolve). */
export function guildSpecies(guild: Guild): PlantCatalogEntry[] {
  const ids = [guild.anchorSpeciesId, ...(guild.members ?? []).map((m) => m.speciesId)];
  const out: PlantCatalogEntry[] = [];
  for (const id of ids) {
    const e = findEntry(id);
    if (e) out.push(e);
  }
  return out;
}

/** Distinct vertical niches occupied by the guild, out of seven. */
export function nicheFill(species: PlantCatalogEntry[]): {
  filled: number;
  total: number;
} {
  const layers = new Set(species.map((s) => s.layer).filter(Boolean));
  const filled = FOOD_FOREST_NICHES.filter((n) => layers.has(n)).length;
  return { filled, total: FOOD_FOREST_NICHES.length };
}

/** Functional coverage % — distinct ecological functions / 9. */
export function functionalCoveragePct(species: PlantCatalogEntry[]): number {
  return Math.round((distinctFunctionCount(species) / ECOLOGICAL_FUNCTION_COUNT) * 100);
}

export interface NutrientCycling {
  nFixers: number;
  accumulators: number;
  /** % of guild members carrying a fertility function (n_fixer or
   *  dynamic_accumulator). */
  pct: number;
}

/** Nutrient-cycling signal: nitrogen fixers + dynamic accumulators. */
export function nutrientCycling(species: PlantCatalogEntry[]): NutrientCycling {
  let nFixers = 0;
  let accumulators = 0;
  let contributors = 0;
  for (const sp of species) {
    const fns = sp.ecologicalFunction ?? [];
    const isFixer = fns.includes('n_fixer');
    const isAccum = fns.includes('dynamic_accumulator');
    if (isFixer) nFixers++;
    if (isAccum) accumulators++;
    if (isFixer || isAccum) contributors++;
  }
  const pct = species.length > 0 ? Math.round((contributors / species.length) * 100) : 0;
  return { nFixers, accumulators, pct };
}

/**
 * Water-balance % — consistency of the guild's irrigation regime: the
 * share of members sharing the dominant `waterNeeds` band. A guild of
 * uniform water demand is easier to irrigate as one zone (higher
 * balance); mixed low/high demand within one guild scores lower.
 * Empty / unknown → 0.
 */
export function waterBalancePct(species: PlantCatalogEntry[]): number {
  const counts: Record<string, number> = {};
  let total = 0;
  for (const sp of species) {
    const w = sp.waterNeeds;
    if (!w) continue;
    counts[w] = (counts[w] ?? 0) + 1;
    total++;
  }
  if (total === 0) return 0;
  const dominant = Math.max(...Object.values(counts));
  return Math.round((dominant / total) * 100);
}

export interface CompatibilityResult {
  /** 0–100. 100 = no antagonisms or spacing/maturity warnings. */
  score: number;
  errors: number;
  warnings: number;
  /** Pairs the companion matrix could not verify either way. */
  unverified: number;
}

/** Penalty weights for the compatibility score (documented design
 *  choice). Errors (antagonism) bite hard; warnings are advisory. */
const COMPAT_ERROR_PENALTY = 25;
const COMPAT_WARNING_PENALTY = 8;

/**
 * Fold the anchor into the member list (if not already present) so the
 * pairwise antagonism check covers anchor↔member conflicts — e.g. a
 * black-walnut anchor over an apple understory (juglone). `checkGuild`
 * itself only compares member↔member pairs, so a raw delegation would
 * silently clear an antagonistic anchor. This augments the member set
 * before delegating; it does not fork the checker.
 */
function withAnchorAsMember(guild: Guild): Guild {
  const members = guild.members ?? [];
  if (members.some((m) => m.speciesId === guild.anchorSpeciesId)) return guild;
  const layer = (findEntry(guild.anchorSpeciesId)?.layer ?? 'canopy') as GuildMember['layer'];
  return { ...guild, members: [{ speciesId: guild.anchorSpeciesId, layer }, ...members] };
}

/**
 * Compatibility score — delegates to the companion-planting checker
 * (with the anchor folded into the member set, see `withAnchorAsMember`).
 * Starts at 100 and subtracts per-finding penalties; `unmatched`
 * (info) findings carry no penalty but are surfaced so an all-clear
 * is never falsely reported.
 */
export function compatibilityScore(guild: Guild): CompatibilityResult {
  const findings = checkGuild(withAnchorAsMember(guild));
  let errors = 0;
  let warnings = 0;
  let unverified = 0;
  for (const f of findings) {
    if (f.severity === 'error') errors++;
    else if (f.severity === 'warning') warnings++;
    else unverified++;
  }
  const penalty = errors * COMPAT_ERROR_PENALTY + warnings * COMPAT_WARNING_PENALTY;
  const score = Math.max(0, 100 - penalty);
  return { score, errors, warnings, unverified };
}

/**
 * Resilience score (0–100) — a single planning-aid scalar blending:
 *   • niche fill        (distinct layers / 7)        weight 0.35
 *   • functional spread (distinct functions / 9)     weight 0.35
 *   • compatibility     (companion-check score / 100) weight 0.30
 * A structurally complete, functionally diverse, internally
 * compatible guild scores high. NOT a survival prediction.
 */
export function resilienceScore(guild: Guild, species?: PlantCatalogEntry[]): number {
  const sp = species ?? guildSpecies(guild);
  const { filled, total } = nicheFill(sp);
  const nicheTerm = total > 0 ? filled / total : 0;
  const functionalTerm = clamp01(distinctFunctionCount(sp) / ECOLOGICAL_FUNCTION_COUNT);
  const compatTerm = compatibilityScore(guild).score / 100;
  const idx = 0.35 * nicheTerm + 0.35 * functionalTerm + 0.3 * compatTerm;
  return Math.round(clamp01(idx) * 100);
}

export interface GuildAnalytics {
  memberCount: number;
  nichesFilled: number;
  nicheCount: number;
  functionalCoveragePct: number;
  nutrientCycling: NutrientCycling;
  waterBalancePct: number;
  compatibility: CompatibilityResult;
  resilienceScore: number;
}

/** One-shot aggregator for the Guild Builder card. */
export function guildAnalytics(guild: Guild): GuildAnalytics {
  const sp = guildSpecies(guild);
  const { filled, total } = nicheFill(sp);
  return {
    memberCount: sp.length,
    nichesFilled: filled,
    nicheCount: total,
    functionalCoveragePct: functionalCoveragePct(sp),
    nutrientCycling: nutrientCycling(sp),
    waterBalancePct: waterBalancePct(sp),
    compatibility: compatibilityScore(guild),
    resilienceScore: resilienceScore(guild, sp),
  };
}
