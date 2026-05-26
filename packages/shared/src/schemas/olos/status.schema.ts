// status.schema.ts
//
// Per-stage status enums for OLOS records. Each stage has its own set of
// allowed status outputs (dev specs tables 10-25). Helpers below filter the
// universal status union by stage so a status-picker UI can render only the
// allowed values.

import { z } from 'zod';
import { Stage } from './stage.schema.js';

export const ObserveStatus = z.enum([
  'clear',
  'unknown',
  'needs-investigation',
  'major-constraint',
  'potential-disqualifier',
]);
export type ObserveStatus = z.infer<typeof ObserveStatus>;

export const PlanApprovalStatus = z.enum([
  'approved-for-act',
  'conditionally-approved',
  'needs-more-observation',
  'needs-professional-review',
  'redesign-required',
  'deferred',
  'rejected',
]);
export type PlanApprovalStatus = z.infer<typeof PlanApprovalStatus>;

export const ActTaskStatus = z.enum([
  'ready',
  'assigned',
  'in-progress',
  'paused-for-conditions',
  'blocked',
  'completed-pending-verification',
  'verified-complete',
  'needs-rework',
  'needs-follow-up',
  'escalated',
  'archived',
  'cancelled',
]);
export type ActTaskStatus = z.infer<typeof ActTaskStatus>;

export const OLOSStatus = z.union([
  ObserveStatus,
  PlanApprovalStatus,
  ActTaskStatus,
]);
export type OLOSStatus = z.infer<typeof OLOSStatus>;

export const STATUS_BY_STAGE: Record<Stage, readonly string[]> = {
  observe: ObserveStatus.options,
  plan: PlanApprovalStatus.options,
  act: ActTaskStatus.options,
};

export const STATUS_LABELS: Record<string, string> = {
  // Observe
  'clear': 'Clear',
  'unknown': 'Unknown',
  'needs-investigation': 'Needs Investigation',
  'major-constraint': 'Major Constraint',
  'potential-disqualifier': 'Potential Disqualifier',
  // Plan
  'approved-for-act': 'Approved for Act',
  'conditionally-approved': 'Conditionally Approved',
  'needs-more-observation': 'Needs More Observation',
  'needs-professional-review': 'Needs Professional Review',
  'redesign-required': 'Redesign Required',
  'deferred': 'Deferred',
  'rejected': 'Rejected',
  // Act
  'ready': 'Ready',
  'assigned': 'Assigned',
  'in-progress': 'In Progress',
  'paused-for-conditions': 'Paused for Conditions',
  'blocked': 'Blocked',
  'completed-pending-verification': 'Completed Pending Verification',
  'verified-complete': 'Verified Complete',
  'needs-rework': 'Needs Rework',
  'needs-follow-up': 'Needs Follow-up',
  'escalated': 'Escalated',
  'archived': 'Archived',
  'cancelled': 'Cancelled',
};

/** Statuses that mark a Plan record as ready for handoff to Act. */
export const APPROVED_PLAN_STATUSES: readonly PlanApprovalStatus[] = [
  'approved-for-act',
  'conditionally-approved',
];

/** Statuses that mark an Act task as terminal-successful. */
export const TERMINAL_ACT_STATUSES: readonly ActTaskStatus[] = [
  'verified-complete',
  'archived',
];
