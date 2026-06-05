// urgencyScore.ts
//
// Pure ranker that produces a single numeric urgency score per project, used
// to order the Portfolio Home project cards (Phase 5 Slice 5.3) and to seed
// the Per-Project Home "Next Up" card (Slice 5.4). Per Phase 1 pre-spec:
// "Urgency score engine for Portfolio Home ordering (computed, never
// displayed)." The number is an ordering signal only — the UI surfaces the
// underlying reasons (divergences, stale domains, drafts) directly rather
// than ever rendering the score.
//
// Inputs are already-projected primitives, not stores — this keeps the
// helper trivially testable, server-side runnable (presentation share
// snapshots, future digest emails), and free of Zustand/web coupling. The
// caller in `apps/web/src/v3/home/useProjectUrgency.ts` (Slice 5.3) is
// responsible for assembling the inputs from observeDataPointStore,
// observeFeedStore, fieldActionStore, planTierStore, cyclicalReviewStore,
// and the LocalProject record.
//
// Weight model — additive, not multiplicative, so contributions remain
// interpretable in the breakdown and so a single category cannot dominate
// the ranking by accident. Critical signals weighted ~10x foundational
// ones, foundational ~3x baseline cadence ones, so the spec's three-band
// priority intuition (critical / high / informational) shows up as
// ordering clusters in the final score:
//
//   critical divergence       — 100
//   high divergence           —  30
//   stale foundation domain   —  20    (hydrology, soil, risk-compliance)
//   cyclical review due       —  15
//   blocked field action      —  10
//   ageing foundation domain  —   5
//   pending verification      —   5    (submitted, awaiting verifier)
//   draft wizard ("Finish setup")  — 25
//   inactivity                —   1/day (capped at INACTIVITY_DAYS_CAP)
//
// Pure, deterministic, dependency-free. No I/O.

import type {
  FieldAction,
  FieldActionStatus,
} from '../schemas/fieldAction/fieldAction.schema.js';
import type { ObserveDataPoint } from '../schemas/observe/dataPoint.schema.js';
import type { PlanStratumObjectiveStatus } from '../schemas/plan/planStratumObjective.schema.js';
import type { UniversalDomain } from '../schemas/universalDomain.schema.js';
import { FOUNDATION_DOMAINS_FOR_REVISION } from './revisionPriority.js';
import type { ObserveFreshness } from './observeFreshness.js';

/** Per-category weights. Exported so consumers can document the model. */
export const URGENCY_WEIGHTS = {
  divergenceCritical: 100,
  divergenceHigh: 30,
  staleFoundationDomain: 20,
  cyclicalReviewDue: 15,
  blockedFieldAction: 10,
  ageingFoundationDomain: 5,
  pendingVerification: 5,
  draftWizard: 25,
  inactivityPerDay: 1,
} as const;

/** Inactivity contribution caps at this many days so a long-dormant
 *  project cannot outrank an actively-failing one purely on age. Chosen
 *  to keep `INACTIVITY_DAYS_CAP * inactivityPerDay` strictly below the
 *  per-unit weight of every concrete signal (cyclical-review-due = 15,
 *  stale foundation domain = 20). Two weeks of silence is a natural
 *  "this project went quiet" threshold without crowding out real work. */
export const INACTIVITY_DAYS_CAP = 14;

const MS_PER_DAY = 86_400_000;

const FOUNDATION_DOMAIN_SET: ReadonlySet<UniversalDomain> = new Set(
  FOUNDATION_DOMAINS_FOR_REVISION,
);

const CRITICAL_STATUS_OUTPUTS: ReadonlySet<string> = new Set([
  'major_constraint',
  'potential_disqualifier',
]);

const HIGH_STATUS_OUTPUTS: ReadonlySet<string> = new Set([
  'needs_investigation',
]);

/** Inputs the engine reads. All already-projected primitives so the helper
 *  stays pure. The caller assembles these from the appropriate stores. */
export interface ProjectUrgencyInputs {
  projectId: string;

  /** From `project.metadata.wizardStatus`. `undefined` = wizard never
   *  started (legacy project) OR wizard already finished. */
  wizardStatus?: 'in_progress' | 'complete';

  /** Most recent activity timestamp on the project — verified field
   *  action / new observation / decision confirmed / etc. ISO 8601. */
  lastActivityAt?: string | null;

  /** Already-computed status map from `computeAllObjectiveStatuses`. */
  objectiveStatuses: Readonly<Record<string, PlanStratumObjectiveStatus>>;

  /** Objective ids that the cyclical-review predicate currently flags
   *  as due (90-day cadence OR Observe-driven revision flag). */
  cyclicalReviewDueObjectiveIds: readonly string[];

  /** Open field actions for the project. Engine slices on
   *  status === 'blocked' / 'submitted'. */
  fieldActions: ReadonlyArray<
    Pick<FieldAction, 'status' | 'divergenceFlag'>
  >;

  /** Per-domain freshness classification produced by
   *  `computeDomainFreshness` for each of the 16 domains. Omit a
   *  domain to read it as `'missing'`. */
  domainFreshness: Readonly<
    Partial<Record<UniversalDomain, ObserveFreshness>>
  >;

  /** Active (non-superseded) Observe data points whose statusOutput
   *  indicates a critical or high divergence. The Plan Revision Banner
   *  reads the same source; the urgency engine cares only about the
   *  count by severity. */
  divergencePoints: ReadonlyArray<
    Pick<ObserveDataPoint, 'statusOutput' | 'isSuperseded'>
  >;

  /** Injected for deterministic tests. */
  now: Date | number;
}

/** Per-category breakdown that the UI can render as "why" annotations
 *  next to the project card without re-running the engine. */
export interface ProjectUrgencyBreakdown {
  divergencesCritical: number;
  divergencesHigh: number;
  staleFoundationDomains: number;
  ageingFoundationDomains: number;
  cyclicalReviewsDue: number;
  blockedFieldActions: number;
  pendingVerifications: number;
  draftWizard: boolean;
  inactivityDays: number;
}

export interface ProjectUrgencyResult {
  /** Sum of all weighted contributions. Higher = more urgent. */
  score: number;
  breakdown: ProjectUrgencyBreakdown;
}

function countDivergencesBySeverity(
  points: ProjectUrgencyInputs['divergencePoints'],
): { critical: number; high: number } {
  let critical = 0;
  let high = 0;
  for (const p of points) {
    if (p.isSuperseded) continue;
    if (CRITICAL_STATUS_OUTPUTS.has(p.statusOutput)) {
      critical += 1;
    } else if (HIGH_STATUS_OUTPUTS.has(p.statusOutput)) {
      high += 1;
    }
  }
  return { critical, high };
}

function countFoundationFreshness(
  freshness: ProjectUrgencyInputs['domainFreshness'],
): { stale: number; ageing: number } {
  let stale = 0;
  let ageing = 0;
  for (const domain of FOUNDATION_DOMAIN_SET) {
    const f = freshness[domain];
    if (f === 'stale') stale += 1;
    else if (f === 'ageing') ageing += 1;
  }
  return { stale, ageing };
}

function countFieldActionStates(
  fieldActions: ProjectUrgencyInputs['fieldActions'],
): { blocked: number; submitted: number } {
  let blocked = 0;
  let submitted = 0;
  for (const a of fieldActions) {
    const status: FieldActionStatus = a.status;
    if (status === 'blocked') blocked += 1;
    else if (status === 'submitted') submitted += 1;
  }
  return { blocked, submitted };
}

function computeInactivityDays(
  lastActivityAt: string | null | undefined,
  now: Date | number,
): number {
  if (!lastActivityAt) return 0;
  const lastMs = Date.parse(lastActivityAt);
  if (!Number.isFinite(lastMs)) return 0;
  const nowMs = typeof now === 'number' ? now : now.getTime();
  const diff = (nowMs - lastMs) / MS_PER_DAY;
  if (!Number.isFinite(diff) || diff <= 0) return 0;
  return Math.min(Math.floor(diff), INACTIVITY_DAYS_CAP);
}

/**
 * Compute the urgency score + breakdown for a single project.
 *
 * Score is a positive integer (never negative — the weight model is
 * strictly additive) and zero when the project has no urgent signals.
 * Higher score = more urgent. The Portfolio Home consumer sorts
 * descending.
 */
export function computeProjectUrgency(
  inputs: ProjectUrgencyInputs,
): ProjectUrgencyResult {
  const divergences = countDivergencesBySeverity(inputs.divergencePoints);
  const foundationFreshness = countFoundationFreshness(inputs.domainFreshness);
  const fieldActionCounts = countFieldActionStates(inputs.fieldActions);
  const cyclicalReviewsDue = inputs.cyclicalReviewDueObjectiveIds.length;
  const draftWizard = inputs.wizardStatus === 'in_progress';
  const inactivityDays = computeInactivityDays(
    inputs.lastActivityAt ?? null,
    inputs.now,
  );

  const score =
    divergences.critical * URGENCY_WEIGHTS.divergenceCritical +
    divergences.high * URGENCY_WEIGHTS.divergenceHigh +
    foundationFreshness.stale * URGENCY_WEIGHTS.staleFoundationDomain +
    foundationFreshness.ageing * URGENCY_WEIGHTS.ageingFoundationDomain +
    cyclicalReviewsDue * URGENCY_WEIGHTS.cyclicalReviewDue +
    fieldActionCounts.blocked * URGENCY_WEIGHTS.blockedFieldAction +
    fieldActionCounts.submitted * URGENCY_WEIGHTS.pendingVerification +
    (draftWizard ? URGENCY_WEIGHTS.draftWizard : 0) +
    inactivityDays * URGENCY_WEIGHTS.inactivityPerDay;

  return {
    score,
    breakdown: {
      divergencesCritical: divergences.critical,
      divergencesHigh: divergences.high,
      staleFoundationDomains: foundationFreshness.stale,
      ageingFoundationDomains: foundationFreshness.ageing,
      cyclicalReviewsDue,
      blockedFieldActions: fieldActionCounts.blocked,
      pendingVerifications: fieldActionCounts.submitted,
      draftWizard,
      inactivityDays,
    },
  };
}

/**
 * Sort a list of projects by their precomputed urgency scores, descending.
 * Stable sort — ties preserve the input order so the caller can decide a
 * deterministic secondary key (e.g. last-activity timestamp, project name)
 * before passing the list in.
 */
export function sortByUrgency<T>(
  items: readonly T[],
  scoreOf: (item: T) => number,
): T[] {
  return [...items]
    .map((item, index) => ({ item, index, score: scoreOf(item) }))
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return a.index - b.index;
    })
    .map((entry) => entry.item);
}
