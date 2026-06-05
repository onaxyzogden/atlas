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
 *
 * Phase 4 (Planning Workspace) extends the record with optional, qualitative
 * `scenarioOptions` — side-by-side response alternatives a steward weighs before
 * settling a decision (each scored on effort / reversibility / time-to-effect) —
 * plus the `chosenScenarioId` they adopt. The new fields are optional so existing
 * persisted decisions rehydrate unchanged (no schemaVersion bump). Scope is
 * strictly qualitative: no riba/gharar/CSRA/salam/investor/financing/
 * cost-of-capital semantics — that comparison is the financial cards' job, not
 * this one's.
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

/* ── Phase 4: qualitative scenario options ──────────────────────────── */

/** How much work an option takes — qualitative, not a cost figure. */
export type PlanScenarioEffort = 'low' | 'medium' | 'high';
/** How easily an option can be undone once acted on. */
export type PlanScenarioReversibility = 'easy' | 'moderate' | 'hard';
/** How soon an option's effect is felt. */
export type PlanScenarioHorizon = 'immediate' | 'season' | 'multi-season';

export const PLAN_SCENARIO_EFFORT_LABEL: Record<PlanScenarioEffort, string> = {
  low: 'Low effort',
  medium: 'Medium effort',
  high: 'High effort',
};
export const PLAN_SCENARIO_REVERSIBILITY_LABEL: Record<
  PlanScenarioReversibility,
  string
> = {
  easy: 'Easily reversible',
  moderate: 'Moderately reversible',
  hard: 'Hard to reverse',
};
export const PLAN_SCENARIO_HORIZON_LABEL: Record<PlanScenarioHorizon, string> = {
  immediate: 'Immediate',
  season: 'This season',
  'multi-season': 'Multi-season',
};

export const PLAN_SCENARIO_EFFORTS: readonly PlanScenarioEffort[] = [
  'low',
  'medium',
  'high',
] as const;
export const PLAN_SCENARIO_REVERSIBILITIES: readonly PlanScenarioReversibility[] =
  ['easy', 'moderate', 'hard'] as const;
export const PLAN_SCENARIO_HORIZONS: readonly PlanScenarioHorizon[] = [
  'immediate',
  'season',
  'multi-season',
] as const;

/**
 * A single qualitative response option weighed against a decision — e.g. "move
 * the livestock" vs "add a water point". Strictly qualitative; financial
 * comparison stays in the financial cards.
 */
export interface PlanScenarioOption {
  id: string;
  label: string;
  summary: string;
  pros: string;
  cons: string;
  effort: PlanScenarioEffort;
  reversibility: PlanScenarioReversibility;
  horizon: PlanScenarioHorizon;
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
  /**
   * Phase 4: qualitative response options weighed in the Planning Workspace.
   * Optional — decisions without a workspace pass simply omit it.
   */
  scenarioOptions?: PlanScenarioOption[];
  /** Phase 4: the option adopted into this decision's authored fields, if any. */
  chosenScenarioId?: string;
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

/* ── Phase 4: scenario-option helpers (pure, no store access) ────────── */

/** A blank response option with sensible mid-point axis defaults. */
export function emptyScenarioOption(): PlanScenarioOption {
  return {
    id: newId(),
    label: '',
    summary: '',
    pros: '',
    cons: '',
    effort: 'medium',
    reversibility: 'moderate',
    horizon: 'season',
  };
}

/**
 * Pure: produce the patch that adopts one option into a decision's authored
 * fields — headline ← label, rationale ← summary, trade-offs ← a labelled
 * pros/cons block — and records the choice. Does NOT mutate the decision; the
 * caller feeds the patch to `planDecisionStore.update()`. Returns `{}` when the
 * id is absent so an adopt on stale data is a no-op.
 */
export function adoptScenarioIntoDecision(
  decision: PlanDecision,
  optionId: string,
): Partial<PlanDecision> {
  const option = decision.scenarioOptions?.find((o) => o.id === optionId);
  if (!option) return {};
  const tradeoffParts: string[] = [];
  if (option.pros.trim()) tradeoffParts.push(`Pros: ${option.pros.trim()}`);
  if (option.cons.trim()) tradeoffParts.push(`Cons: ${option.cons.trim()}`);
  return {
    headline: option.label,
    rationale: option.summary,
    tradeoffs: tradeoffParts.join('\n'),
    chosenScenarioId: optionId,
  };
}
