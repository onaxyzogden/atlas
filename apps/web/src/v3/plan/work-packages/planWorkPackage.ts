/**
 * planWorkPackage — the Work Package domain (Phase 3). A Plan Work Package is
 * the durable, *authored* unit of field work handed from an accepted Decision
 * to an Act team: an objective, the detail behind it, a team-type (which Act
 * module executes it), a location, the tools required, the evidence the team
 * must capture, the completion criteria, a status, and timestamps.
 *
 * Like a Plan Decision (and unlike a derived Plan Impact Flag), a work package
 * is authored whole — so the store (`planWorkPackageStore`) holds complete
 * records keyed `byProject[projectId][packageId]`. The pure helpers here (sort,
 * promote-from-decision) carry no store access so they stay unit-testable in the
 * style of `buildDecisionFromFlag` / `sortDecisions`.
 *
 * Scope (Phase 3): operational scheduling only — no riba/gharar/CSRA/salam/
 * investor/financing/cost-of-capital semantics. The Plan side authors and
 * dispatches a package (draft → queued); the Act side advances it once it lands
 * (queued → in-progress → done). Dispatching does not mutate any of the 15 Plan
 * modules or write to the WorkItem spine.
 */

import { ACT_MODULE_LABEL, ACT_MODULES, type ActModule } from '../../act/types.js';
import type { PlanDecision } from '../decisions/planDecision.js';

/** Re-export so the Work Packages surface has a single import for the team-type. */
export { ACT_MODULE_LABEL, ACT_MODULES, type ActModule };

/** Where a work package sits in its lifecycle. */
export type PlanWorkPackageStatus =
  | 'draft'
  | 'queued'
  | 'in-progress'
  | 'done'
  | 'cancelled';

/** An authored unit of field work handed from Plan to Act. */
export interface PlanWorkPackage {
  id: string;
  projectId: string;
  /** The accepted decision this package was generated from, if any. */
  decisionId?: string;
  /** One-line statement of what the team must achieve. */
  objective: string;
  /** Fuller description of the work. */
  detail: string;
  /** Which Act team executes this — connects the package to where in Act it lands. */
  teamType: ActModule;
  /** Where on the land the work happens. */
  location: string;
  /** Tools/materials the team needs. */
  tools: string;
  /** Evidence the team must capture on completion. */
  evidenceRequired: string;
  /** What "done" means for this package. */
  completionCriteria: string;
  status: PlanWorkPackageStatus;
  createdAt: string;
  updatedAt: string;
  /** ISO timestamp the package was dispatched to Act (→ queued). */
  dispatchedAt?: string;
  /** ISO timestamp the package was completed (→ done). */
  completedAt?: string;
}

/** Human label for each status — for badges + section titles. */
export const PLAN_WORK_PACKAGE_STATUS_LABEL: Record<
  PlanWorkPackageStatus,
  string
> = {
  draft: 'Draft',
  queued: 'Queued',
  'in-progress': 'In progress',
  done: 'Done',
  cancelled: 'Cancelled',
};

/** Statuses in display order — drives section order + sort grouping. */
export const PLAN_WORK_PACKAGE_STATUSES: readonly PlanWorkPackageStatus[] = [
  'draft',
  'queued',
  'in-progress',
  'done',
  'cancelled',
] as const;

const STATUS_RANK: Record<PlanWorkPackageStatus, number> =
  PLAN_WORK_PACKAGE_STATUSES.reduce(
    (acc, status, i) => {
      acc[status] = i;
      return acc;
    },
    {} as Record<PlanWorkPackageStatus, number>,
  );

const newId = (): string => crypto.randomUUID();
const now = (): string => new Date().toISOString();

/** A blank draft work package — the starting point for standalone authoring. */
export function emptyPlanWorkPackage(projectId: string): PlanWorkPackage {
  const stamp = now();
  return {
    id: newId(),
    projectId,
    objective: '',
    detail: '',
    teamType: 'build',
    location: '',
    tools: '',
    evidenceRequired: '',
    completionCriteria: '',
    status: 'draft',
    createdAt: stamp,
    updatedAt: stamp,
  };
}

/**
 * Pure: seed a draft work package from an accepted decision. Carries the
 * decision headline as the objective and its rationale as the detail seed, and
 * links back via `decisionId`. No store access → unit-testable.
 */
export function buildWorkPackageFromDecision(
  decision: PlanDecision,
): PlanWorkPackage {
  const base = emptyPlanWorkPackage(decision.projectId);
  return {
    ...base,
    decisionId: decision.id,
    objective: decision.headline,
    detail: decision.rationale,
  };
}

/**
 * Pure: group work packages by status (draft → queued → in-progress → done →
 * cancelled), then most-recently-updated first within a group. No store access.
 */
export function sortWorkPackages(
  pkgs: PlanWorkPackage[],
): PlanWorkPackage[] {
  return [...pkgs].sort((a, b) => {
    const rank = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (rank !== 0) return rank;
    return (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '');
  });
}
