/**
 * planVersion — the Plan Versioning domain (Plan-Operation Phase 5b). A Plan
 * Version is an authored, durable record wrapping a point-in-time
 * `PlanSnapshot` of the whole project plan state, with a lifecycle
 * (draft → approved → superseded), a steward-given label/note, and timestamps.
 *
 * Like a Plan Decision (and unlike a derived flag), a version is authored
 * whole, so the store (`planVersionStore`) holds complete records. The pure
 * helpers here (sort, empty) carry no store access so they stay unit-testable
 * in the style of `sortDecisions`.
 *
 * Scope (Phase 5b): a version captures + restores plan state only. Approval
 * (Phase 5c) is an advisory status stamp on top — it never locks or gates any
 * other surface. Strictly operational — no riba/gharar/CSRA/salam/financing
 * semantics; a snapshot is opaque per-store JSON.
 */

import type { PlanSnapshot } from './planSnapshot.js';

/** Where a version sits in its lifecycle. */
export type PlanVersionStatus = 'draft' | 'approved' | 'superseded';

/** Human label for each status — for badges + section titles. */
export const PLAN_VERSION_STATUS_LABEL: Record<PlanVersionStatus, string> = {
  draft: 'Draft',
  approved: 'Approved',
  superseded: 'Superseded',
};

/** Statuses in display order — drives section order + sort grouping. */
export const PLAN_VERSION_STATUSES: readonly PlanVersionStatus[] = [
  'draft',
  'approved',
  'superseded',
] as const;

const STATUS_RANK: Record<PlanVersionStatus, number> =
  PLAN_VERSION_STATUSES.reduce(
    (acc, status, i) => {
      acc[status] = i;
      return acc;
    },
    {} as Record<PlanVersionStatus, number>,
  );

/** An authored, point-in-time version of the whole plan. */
export interface PlanVersion {
  id: string;
  projectId: string;
  /** Steward-given label, e.g. "Pre-monsoon baseline". */
  label: string;
  note: string;
  status: PlanVersionStatus;
  /** The captured plan state this version restores. */
  snapshot: PlanSnapshot;
  createdAt: string;
  updatedAt: string;
  /** ISO timestamp the version was approved (Phase 5c). */
  approvedAt?: string;
  /** Who approved it (steward name / dev sentinel). */
  approvedBy?: string;
}

const newId = (): string => crypto.randomUUID();
const now = (): string => new Date().toISOString();

/**
 * A fresh draft version wrapping a just-captured snapshot. The label defaults
 * to a timestamped name when the steward leaves it blank.
 */
export function emptyPlanVersion(
  projectId: string,
  snapshot: PlanSnapshot,
  label = '',
): PlanVersion {
  const stamp = now();
  return {
    id: newId(),
    projectId,
    label: label.trim() || `Snapshot ${stamp.slice(0, 10)}`,
    note: '',
    status: 'draft',
    snapshot,
    createdAt: stamp,
    updatedAt: stamp,
  };
}

/**
 * Pure: group versions by status (draft → approved → superseded), then
 * most-recently-created first within a group. No store access.
 */
export function sortVersions(versions: PlanVersion[]): PlanVersion[] {
  return [...versions].sort((a, b) => {
    const rank = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (rank !== 0) return rank;
    return (b.createdAt ?? '').localeCompare(a.createdAt ?? '');
  });
}
