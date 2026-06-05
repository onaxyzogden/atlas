/**
 * deriveActivatedModules — pure projection from a VisionProfile to the set of
 * Plan modules the profile's answers emphasise.
 *
 * Drives the informational "What this will activate in the Plan stage" strip.
 * MVP = preview only: this does NOT gate which Plan/Act modules render (real
 * gating is a deferred follow-up). It simply walks the answered options and
 * unions their `activates` lists, then returns them in canonical
 * PLAN_MODULES order so the strip is stable regardless of answer order.
 */

import type { VisionProfile } from '@ogden/shared';
import { PLAN_MODULES, type PlanModule } from '../../plan/types.js';
import { VISION_QUESTIONS } from '../data/visionBuilderQuestions.js';

/**
 * Foundations every land-based project needs, regardless of which options are
 * picked. These are unioned into the activation set as soon as a project type
 * is chosen — water, soil, zone/circulation and phasing apply to virtually
 * every land-based project, so the per-option `activates` map only needs to
 * carry the *type-distinctive* modules on top of these.
 */
export const BASELINE_MODULES: PlanModule[] = [
  'hydrology',           // ← water-management
  'soil',                // ← soil-fertility
  'access-circulation',  // ← zone-circulation
  'economics-capacity',  // ← phasing-budgeting
];

/** Collect the selected option ids for a question from the profile. */
function selectedIdsForPath(profile: VisionProfile, path: string): Set<string> {
  const value = path
    .split('.')
    .reduce<unknown>(
      (acc, key) =>
        acc != null && typeof acc === 'object'
          ? (acc as Record<string, unknown>)[key]
          : undefined,
      profile as Record<string, unknown>,
    );
  if (value == null) return new Set();
  if (Array.isArray(value)) return new Set(value as string[]);
  return new Set([String(value)]);
}

/**
 * Return the Plan modules a profile activates, de-duplicated and ordered by
 * `PLAN_MODULES`. Conditional questions only contribute when they are
 * currently visible (so e.g. livestock detail doesn't leak modules once
 * animals are removed from scope).
 */
export function deriveActivatedModules(profile: VisionProfile): PlanModule[] {
  const active = new Set<PlanModule>();

  for (const question of VISION_QUESTIONS) {
    // Deferred questions aren't asked in Stage Zero (so they're unanswered
    // today), but skip them explicitly so this projection stays vision-only.
    if (question.deferToPlan) continue;
    if (question.visibleWhen && !question.visibleWhen(profile)) continue;
    const selected = selectedIdsForPath(profile, question.profilePath);
    if (selected.size === 0) continue;
    for (const option of question.options) {
      if (!option.activates || !selected.has(option.id)) continue;
      for (const mod of option.activates) active.add(mod);
    }
  }

  // Seed the baseline once a project type is chosen — every land-based project
  // gets these fundamentals. Gating on `primaryType` (Step 1) keeps the strip's
  // empty state ("Answer a few questions…") intact for a blank profile.
  if (profile.primaryType) {
    for (const mod of BASELINE_MODULES) active.add(mod);
  }

  return PLAN_MODULES.filter((m) => active.has(m));
}
