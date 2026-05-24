/**
 * Steward roster — the multi-steward join.
 *
 * Who the stewards are comes from the live `project_members` roster
 * (`memberStore`); the rich human-context profile fields come from
 * `visionStore.stewardProfiles`, keyed by member `userId`. This selector layers
 * the two so the Human Context module never duplicates member identity.
 *
 * Offline/demo (no auth, no backend members): the builtin seed injects two
 * synthetic `ProjectMemberRecord`s into `memberStore` plus matching profiles, so
 * the same selector drives both the authenticated and the offline flows.
 */

import { useMemberStore } from '../../../../store/memberStore.js';
import { useVisionStore } from '../../../../store/visionStore.js';
import type { StewardProfile } from '../../../../store/visionStore.js';
import type { ProjectMemberRecord } from '@ogden/shared';

export interface StewardRosterEntry {
  /** Identity + app-permission role from the live members roster. */
  member: ProjectMemberRecord;
  /** Rich human-context overlay (empty object when not yet filled). */
  profile: StewardProfile;
}

const EMPTY_PROFILES: Record<string, StewardProfile> = {};

/**
 * Returns one entry per project member, each carrying its profile overlay.
 * Members without a profile yet still appear (with an empty `profile`) so the
 * UI can prompt the steward to fill their survey.
 */
export function useStewardRoster(projectId: string): StewardRosterEntry[] {
  const members = useMemberStore((s) => s.members);
  const profiles = useVisionStore(
    (s) => s.getVisionData(projectId)?.stewardProfiles ?? EMPTY_PROFILES,
  );
  return members.map((member) => ({
    member,
    profile: profiles[member.userId] ?? {},
  }));
}

/** Non-hook variant for use outside React (exports, derivations callers). */
export function getStewardRoster(projectId: string): StewardRosterEntry[] {
  const members = useMemberStore.getState().members;
  const profiles =
    useVisionStore.getState().getVisionData(projectId)?.stewardProfiles ?? EMPTY_PROFILES;
  return members.map((member) => ({
    member,
    profile: profiles[member.userId] ?? {},
  }));
}
