/**
 * planDecision — the Decision Log domain (Phase 2). A Plan Decision is the
 * durable, *authored* record behind a steward's call: the operational verb
 * (reused from Plan Reviews), a free-text headline, the reasoning a steward
 * stands behind (rationale / assumptions / trade-offs), the observations that
 * prompted it, a status, and timestamps.
 *
 * Unlike a Plan Impact Flag (derived, never stored), a decision is authored
 * whole — so the store (`planDecisionStore`) holds complete records, like the
 * steward-raised needs in `observationNeedStore.createdByProject`. The pure
 * helpers here (sort, promote-from-flag) carry no store access so they stay
 * unit-testable in the style of `derivePlanImpactFlags`.
 *
 * Scope (Phase 2): a decision RECORDS INTENT only. Accepting one does not yet
 * generate Act Work Packages, mutate a Plan module, or pause Act — that wiring
 * is Phase 3.
 */

import type { ObserveModule } from '../../observe/types.js';
import type { PlanModule } from '../types.js';
import type {
  PlanImpactFlag,
  PlanReviewDecision,
  PlanReviewRun,
} from '../impact/planImpactFlag.js';

/** Re-export so the Decision Log surface has a single import for the verb. */
export type { PlanReviewDecision } from '../impact/planImpactFlag.js';

/** Where a decision sits in its lifecycle. */
export type PlanDecisionStatus = 'draft' | 'accepted' | 'superseded' | 'rejected';

/**
 * A snapshot of an observation that prompted/supports a decision, taken at link
 * time so the log reads correctly even if the source need later changes. The
 * `observationId` IS the flag/need id, so it deep-links back into Observe.
 */
export interface PlanDecisionSource {
  observationId: string;
  title: string;
  module: ObserveModule;
}

/** An authored decision recorded against the plan. */
export interface PlanDecision {
  id: string;
  projectId: string;
  /** The operational decision type — the signal Phase 3 keys off. */
  verb: PlanReviewDecision;
  /** Free-text summary of the specific call. */
  headline: string;
  rationale: string;
  assumptions: string;
  tradeoffs: string;
  status: PlanDecisionStatus;
  /** Observations that prompted/support this decision. */
  sources: PlanDecisionSource[];
  /** Optional Plan module the decision affects (aids Phase-3 routing). */
  affectedModule?: PlanModule;
  /** The decision this one replaces, if it was created via Supersede. */
  supersedesId?: string;
  createdAt: string;
  updatedAt: string;
  /** ISO timestamp the decision became accepted/rejected. */
  decidedAt?: string;
}

/** Human label for each status — for badges + section titles. */
export const PLAN_DECISION_STATUS_LABEL: Record<PlanDecisionStatus, string> = {
  draft: 'Draft',
  accepted: 'Accepted',
  superseded: 'Superseded',
  rejected: 'Rejected',
};

/** Statuses in display order — drives section order + sort grouping. */
export const PLAN_DECISION_STATUSES: readonly PlanDecisionStatus[] = [
  'draft',
  'accepted',
  'superseded',
  'rejected',
] as const;

const STATUS_RANK: Record<PlanDecisionStatus, number> =
  PLAN_DECISION_STATUSES.reduce(
    (acc, status, i) => {
      acc[status] = i;
      return acc;
    },
    {} as Record<PlanDecisionStatus, number>,
  );

const newId = (): string => crypto.randomUUID();
const now = (): string => new Date().toISOString();

/** A blank draft decision — the starting point for standalone authoring. */
export function emptyPlanDecision(projectId: string): PlanDecision {
  const stamp = now();
  return {
    id: newId(),
    projectId,
    verb: 'no-change',
    headline: '',
    rationale: '',
    assumptions: '',
    tradeoffs: '',
    status: 'draft',
    sources: [],
    createdAt: stamp,
    updatedAt: stamp,
  };
}

/**
 * Pure: seed a draft decision from a reviewed Plan Impact Flag. Carries the
 * recorded verb, the review note as the rationale seed, and the flag as the
 * single source. No store access → unit-testable.
 */
export function buildDecisionFromFlag(
  flag: PlanImpactFlag,
  review: PlanReviewRun,
): PlanDecision {
  const base = emptyPlanDecision(flag.projectId);
  return {
    ...base,
    verb: review.decision ?? 'no-change',
    rationale: review.note,
    sources: [
      { observationId: flag.id, title: flag.title, module: flag.module },
    ],
  };
}

/**
 * Pure: a copy of an existing decision as a fresh draft that supersedes it.
 * Carries the reasoning forward; the store stamps the link + marks the old one.
 */
export function buildSupersedingDraft(prev: PlanDecision): PlanDecision {
  const base = emptyPlanDecision(prev.projectId);
  return {
    ...base,
    verb: prev.verb,
    headline: prev.headline,
    rationale: prev.rationale,
    assumptions: prev.assumptions,
    tradeoffs: prev.tradeoffs,
    sources: prev.sources.map((s) => ({ ...s })),
    ...(prev.affectedModule ? { affectedModule: prev.affectedModule } : {}),
    supersedesId: prev.id,
  };
}

/**
 * Pure: group decisions by status (draft → accepted → superseded → rejected),
 * then most-recently-updated first within a group. No store access.
 */
export function sortDecisions(decisions: PlanDecision[]): PlanDecision[] {
  return [...decisions].sort((a, b) => {
    const rank = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (rank !== 0) return rank;
    return (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '');
  });
}
