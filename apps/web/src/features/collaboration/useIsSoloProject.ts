/**
 * useIsSoloProject -- live solo-project gate for the Operational Role Layer
 * (ADR 2026-06-24 SS Solo Steward). The layer is suppressed entirely on a solo
 * project: a lone steward owns 100% of every domain, so view-scoping only adds
 * noise. Reads the active project's roster size and the viewer's system role
 * from memberStore and defers the rule to the shared `isSoloProject` helper
 * (which also treats the legacy `owner` alias as a steward seat).
 *
 * `projectId` is accepted for call-site clarity and future per-project scoping;
 * the memberStore roster is already scoped to the active project, so it is not
 * read here.
 */

import { useMemberStore } from '../../store/memberStore.js';
import { isSoloProject } from '@ogden/shared';

export function useIsSoloProject(_projectId: string): boolean {
  const memberCount = useMemberStore((s) => s.members.length);
  const myRole = useMemberStore((s) => s.myRole);
  return isSoloProject(memberCount, myRole);
}
