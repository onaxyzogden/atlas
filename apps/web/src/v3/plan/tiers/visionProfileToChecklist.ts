/**
 * visionProfileToChecklist — Phase-1 bridge between the existing Stage
 * Zero Vision Builder output (`project.metadata.visionProfile`) and the
 * Tier 0 checklist items shipped by Slice 1.1 (see
 * packages/shared/src/constants/plan/tierObjectives.ts).
 *
 * Why this exists
 * ---------------
 * Stage Zero is still the only place the steward authors land vision /
 * project type / capacity bands as of 2026-05-25 (Phase 2 wizard is
 * still upstream). Without a bridge, opening Tier 0 on a project that
 * already finished Stage Zero would show every checklist item empty —
 * a regression in perceived progress.
 *
 * The bridge maps a small set of VisionProfile fields to the three
 * `t0-vision-*` checklist items (the `t0-stewardship-*` items have no
 * VisionProfile equivalent — Phase 2 Step 3 "Team" supplies those).
 * When Phase 2 lands, the wizard's Step 2 output is the SAME
 * VisionProfile shape, so this bridge keeps working without change.
 *
 * Pure / deterministic. No I/O. Safe in render.
 */

import type { VisionProfile } from '@ogden/shared';

export interface VisionDerivedItem {
  /** Whether this checklist item is satisfied by the VisionProfile. */
  isComplete: boolean;
  /** Human-readable evidence to surface beneath the item. */
  evidence: string;
}

export type VisionDerivedMap = Readonly<Record<string, VisionDerivedItem>>;

const EMPTY_MAP: VisionDerivedMap = Object.freeze({});

// "food-forest" -> "Food forest". Kebab/snake-case to sentence case.
function humanise(id: string): string {
  if (!id) return '';
  const spaced = id.replace(/[-_]+/g, ' ').trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function listOrEmpty(value: readonly string[] | undefined | null): string[] {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function formatList(ids: readonly string[]): string {
  return ids.map(humanise).join(', ');
}

/**
 * Derive Tier 0 checklist completion + evidence from a VisionProfile.
 * Returns a frozen empty map when no profile (or no fields) are present
 * so callers using this as a memo input see a stable identity.
 *
 * Coverage map:
 *  - `t0-vision-c1` (Articulate the land vision)
 *      satisfied when `primaryOutcomes` or `landIdentity` has entries.
 *  - `t0-vision-c2` (Primary land-use goals)
 *      satisfied when `systemsInScope` has any group with entries OR
 *      `primaryOutcomes` has entries.
 *  - `t0-vision-c3` (Stewardship time + budget capacity bands)
 *      satisfied only when BOTH `budgetRange` AND `timelineProgress`
 *      are set — both axes of the band are required to call it done.
 */
export function deriveTier0EvidenceMap(
  profile: VisionProfile | null | undefined,
): VisionDerivedMap {
  if (!profile) return EMPTY_MAP;

  const map: Record<string, VisionDerivedItem> = {};

  // --- t0-vision-c1 -------------------------------------------------------
  const primaryOutcomes = listOrEmpty(profile.primaryOutcomes);
  const landIdentity = listOrEmpty(profile.landIdentity);
  if (primaryOutcomes.length > 0 || landIdentity.length > 0) {
    const fragments: string[] = [];
    if (primaryOutcomes.length > 0) {
      fragments.push(`Primary outcomes: ${formatList(primaryOutcomes)}`);
    }
    if (landIdentity.length > 0) {
      fragments.push(`Land identity: ${formatList(landIdentity)}`);
    }
    map['t0-vision-c1'] = {
      isComplete: true,
      evidence: fragments.join('. '),
    };
  }

  // --- t0-vision-c2 -------------------------------------------------------
  const systemsInScope = profile.systemsInScope;
  const scopeFragments: string[] = [];
  if (systemsInScope) {
    for (const [groupKey, ids] of Object.entries(systemsInScope)) {
      const list = listOrEmpty(ids);
      if (list.length === 0) continue;
      scopeFragments.push(`${humanise(groupKey)}: ${formatList(list)}`);
    }
  }
  if (scopeFragments.length > 0 || primaryOutcomes.length > 0) {
    map['t0-vision-c2'] = {
      isComplete: true,
      evidence:
        scopeFragments.length > 0
          ? `Systems in scope - ${scopeFragments.join('; ')}`
          : `Primary outcomes - ${formatList(primaryOutcomes)}`,
    };
  }

  // --- t0-vision-c3 -------------------------------------------------------
  const budgetRange = profile.budgetRange;
  const timelineProgress = profile.timelineProgress;
  if (budgetRange || timelineProgress) {
    const fragments: string[] = [];
    if (budgetRange) fragments.push(`Budget band: ${humanise(budgetRange)}`);
    if (timelineProgress) {
      fragments.push(`Timeline: ${humanise(timelineProgress)}`);
    }
    const constraints = listOrEmpty(profile.resourceConstraints);
    if (constraints.length > 0) {
      fragments.push(`Constraints: ${formatList(constraints)}`);
    }
    map['t0-vision-c3'] = {
      // Both axes are required to call the capacity band "set".
      isComplete: !!budgetRange && !!timelineProgress,
      evidence: fragments.join('. '),
    };
  }

  return Object.keys(map).length === 0 ? EMPTY_MAP : map;
}

/**
 * Returns the steward's checklist progress map (from planTierStore)
 * unioned with the items the bridge has derived as `isComplete`. Used
 * by `computeAllObjectiveStatuses` so the Tier 0 spine state reflects
 * Stage Zero progress without writing to the planTierStore.
 */
export function mergeDerivedIntoProgress(
  storeProgress: Readonly<Record<string, boolean>>,
  derivedMap: VisionDerivedMap,
): Readonly<Record<string, boolean>> {
  const derivedIds = Object.entries(derivedMap)
    .filter(([, item]) => item.isComplete)
    .map(([id]) => id);
  if (derivedIds.length === 0) return storeProgress;
  const out: Record<string, boolean> = { ...storeProgress };
  for (const id of derivedIds) out[id] = true;
  return out;
}
