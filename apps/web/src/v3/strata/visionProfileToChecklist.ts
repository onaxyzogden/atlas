/**
 * visionProfileToChecklist — Phase-1 bridge between the existing Stage
 * Zero Vision Builder output (`project.metadata.visionProfile`) and the
 * Stratum 1 checklist items shipped by Slice 1.1 (see
 * packages/shared/src/constants/plan/stratumObjectives.ts).
 *
 * MOVED 2026-05-31 from `v3/plan/strata/visionProfileToChecklist.ts` to the
 * surface-neutral `v3/strata/` directory so Act, Plan, Portfolio and Home can
 * all import the derivation without Act depending on Plan (a layering smell).
 *
 * FIXED 2026-05-31: the derived keys were updated from the pre-renumber
 * `t0-vision-*` / `t0-stewardship-*` namespace to the live catalogue
 * `s1-vision-*` / `s1-stewardship-*` ids. The `t0->s1` stratum renumber
 * (constants/plan/remapSlug.ts) renamed the catalogue checklist ids but this
 * bridge's hardcoded output keys were not migrated, so the derivation silently
 * matched nothing (verified live: Plan + Act showed 0/N with no "From Stage
 * Zero Vision" badge on a wizard-completed project). The required targets are
 * pinned by constants/plan/__tests__/catalogues.test.ts ("preserves the 3
 * visionProfileToChecklist bridge ids on s1-vision").
 *
 * Why this exists
 * ---------------
 * Stage Zero is still the only place the steward authors land vision /
 * project type / capacity bands as of 2026-05-25 (Phase 2 wizard is
 * still upstream). Without a bridge, opening Stratum 1 on a project that
 * already finished Stage Zero would show every checklist item empty —
 * a regression in perceived progress.
 *
 * The bridge maps a small set of VisionProfile fields to the three
 * `s1-vision-*` checklist items (the `s1-stewardship-*` items have no
 * VisionProfile equivalent — Phase 2 Step 3 "Team" supplies those).
 * When Phase 2 lands, the wizard's Step 2 output is the SAME
 * VisionProfile shape, so this bridge keeps working without change.
 *
 * Pure / deterministic. No I/O. Safe in render.
 */

import type { ProjectMetadata, VisionProfile } from '@ogden/shared';

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
 * Derive Stratum 1 checklist completion + evidence from a VisionProfile.
 * Returns a frozen empty map when no profile (or no fields) are present
 * so callers using this as a memo input see a stable identity.
 *
 * Coverage map:
 *  - `s1-vision-c1` (Articulate the land vision)
 *      satisfied when `primaryOutcomes` or `landIdentity` has entries.
 *  - `s1-vision-c2` (Primary land-use goals)
 *      satisfied when `systemsInScope` has any group with entries OR
 *      `primaryOutcomes` has entries.
 *  - `s1-vision-c3` (Stewardship time + budget capacity bands)
 *      satisfied only when BOTH `budgetRange` AND `timelineProgress`
 *      are set — both axes of the band are required to call it done.
 */
export function deriveStratum1EvidenceMap(
  profile: VisionProfile | null | undefined,
): VisionDerivedMap {
  if (!profile) return EMPTY_MAP;

  const map: Record<string, VisionDerivedItem> = {};

  // --- s1-vision-c1 -------------------------------------------------------
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
    map['s1-vision-c1'] = {
      isComplete: true,
      evidence: fragments.join('. '),
    };
  }

  // --- s1-vision-c2 -------------------------------------------------------
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
    map['s1-vision-c2'] = {
      isComplete: true,
      evidence:
        scopeFragments.length > 0
          ? `Systems in scope - ${scopeFragments.join('; ')}`
          : `Primary outcomes - ${formatList(primaryOutcomes)}`,
    };
  }

  // --- s1-vision-c3 -------------------------------------------------------
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
    map['s1-vision-c3'] = {
      // Both axes are required to call the capacity band "set".
      isComplete: !!budgetRange && !!timelineProgress,
      evidence: fragments.join('. '),
    };
  }

  return Object.keys(map).length === 0 ? EMPTY_MAP : map;
}

type ProjectTeam = NonNullable<ProjectMetadata['team']>;
type QueuedInvite = NonNullable<ProjectTeam['queuedInvites']>[number];

function describeSteward(
  steward: NonNullable<ProjectTeam['primarySteward']> | undefined,
): string | null {
  if (!steward) return null;
  const name = steward.name?.trim() ?? '';
  const email = steward.email?.trim() ?? '';
  if (name && email) return `${name} <${email}>`;
  if (name) return name;
  if (email) return email;
  return null;
}

function inviteRoleLabel(role: QueuedInvite['role']): string {
  switch (role) {
    case 'team_member':
      return 'Team member';
    case 'contractor':
      return 'Contractor';
    case 'landowner':
      return 'Landowner';
    case 'reviewer':
      return 'Reviewer';
    default:
      return role;
  }
}

/**
 * Derive Stratum 1 stewardship checklist completion + evidence from the
 * wizard's Step 3 Team payload. Mirrors `deriveStratum1EvidenceMap` in
 * shape so both maps can be unioned by `PlanStratumShell` before the
 * status engine runs.
 *
 * Coverage map:
 *  - `s1-stewardship-c1` (List primary steward and any co-stewards)
 *      satisfied when `primarySteward` has a name OR email, OR any
 *      `coStewards` entry exists, OR any invite has been queued (the
 *      steward has clearly named who else works on the land).
 *  - `s1-stewardship-c2` (Note contractor and reviewer roles if known)
 *      satisfied when any queued invite has role `contractor`,
 *      `landowner`, or `reviewer`. `team_member` alone does not count
 *      because the checklist label explicitly singles out the
 *      non-default roles.
 */
export function deriveStratum1StewardshipMap(
  team: ProjectTeam | null | undefined,
): VisionDerivedMap {
  if (!team) return EMPTY_MAP;

  const map: Record<string, VisionDerivedItem> = {};

  const stewardLabel = describeSteward(team.primarySteward);
  const coStewards = (team.coStewards ?? [])
    .map((c) => describeSteward(c))
    .filter((s): s is string => !!s);
  const invites = team.queuedInvites ?? [];

  // --- s1-stewardship-c1 -------------------------------------------------
  if (stewardLabel || coStewards.length > 0 || invites.length > 0) {
    const fragments: string[] = [];
    if (stewardLabel) fragments.push(`Primary steward: ${stewardLabel}`);
    if (coStewards.length > 0) {
      fragments.push(`Co-stewards: ${coStewards.join(', ')}`);
    }
    if (!stewardLabel && coStewards.length === 0 && invites.length > 0) {
      fragments.push(`${invites.length} invite(s) queued`);
    }
    map['s1-stewardship-c1'] = {
      isComplete: true,
      evidence: fragments.join('. '),
    };
  }

  // --- s1-stewardship-c2 -------------------------------------------------
  const flaggedInvites = invites.filter(
    (i) =>
      i.role === 'contractor' ||
      i.role === 'landowner' ||
      i.role === 'reviewer',
  );
  if (flaggedInvites.length > 0) {
    const fragments = flaggedInvites.map(
      (i) => `${inviteRoleLabel(i.role)} invited: ${i.email}`,
    );
    map['s1-stewardship-c2'] = {
      isComplete: true,
      evidence: fragments.join('. '),
    };
  }

  return Object.keys(map).length === 0 ? EMPTY_MAP : map;
}

/**
 * Returns the steward's checklist progress map (from planStratumStore)
 * unioned with the items the bridge has derived as `isComplete`. Used
 * by `computeAllObjectiveStatuses` so the Stratum 1 spine state reflects
 * Stage Zero progress without writing to the planStratumStore.
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
