/**
 * ObservationNeed — the Observe stage's "guided observation package": a
 * discrete, location-bound unit of *something that still needs observing*.
 * Distinct from the two module-keyed "objective" notions:
 *   - `ObserveObjective` (pure predicates over store counts, module-level)
 *   - `CompassObjective` (compass-wheel nodes)
 * An ObservationNeed carries everything needed to *launch a focused capture
 * workspace*: where on the map, which tools, which checklist, what evidence,
 * and the rule that marks it recorded. User-facing label is "Observation Need".
 *
 * Observe does two things only: it manages recorded observations, and it
 * expresses observation needs. It does NOT assign work — no assignee, no
 * labour deadline. Who does the work and when is an Act concern (after Plan
 * decides the response). The terminal action here is "Record observation",
 * not "Submit for review": there is no review gate inside Observe.
 *
 * The static catalog (title, target, tools, checklist spec) is seed data; the
 * mutable run state (checked items, captured evidence, status) lives in
 * `observationNeedStore`. This split mirrors the compass evidence/checks model
 * and keeps recording evaluation a pure function of catalog + run.
 */

import type { ObserveModule } from '../observe/types.js';
import { OBSERVE_MODULES } from '../observe/types.js';
import type { MapToolId } from '../observe/components/measure/useMapToolStore.js';

/**
 * Lifecycle of a single observation need. Collapsed from the old
 * assignment/review states: a need is `open` until work begins, `in-progress`
 * while evidence is captured, `recorded` once the observation is logged, and
 * optionally `resolved` when the underlying concern is closed out.
 */
export type ObservationNeedStatus =
  | 'open'
  | 'in-progress'
  | 'recorded'
  | 'resolved';

export type ObservationNeedPriority = 'low' | 'medium' | 'high';

/** Where the recorded reality may force the Plan to change. Signal to Plan only. */
export type PlanImpact = 'none' | 'possible' | 'likely';

/**
 * How an observation need came to exist. `auto` needs are not authored by a
 * steward — the system raises them from live signals (coverage gaps, stale
 * data) and recomputes them each render; only their run-state persists.
 */
export type ObservationNeedOrigin = 'seed' | 'follow-up' | 'manual' | 'auto';

/** Kinds of proof an observation need can require. */
export type EvidenceKind =
  | 'photo'
  | 'note'
  | 'annotation'
  | 'confirmation'
  | 'audio';

/** One checklist item the steward ticks while working the need. */
export interface ChecklistItemSpec {
  id: string;
  label: string;
  required: boolean;
}

/** One evidence requirement (e.g. "3 photos minimum", "1 summary note"). */
export interface EvidenceSpec {
  id: string;
  kind: EvidenceKind;
  label: string;
  /** Minimum count to satisfy this requirement (defaults to 1). */
  min?: number;
  required: boolean;
}

/** Where the workspace should take the steward and what to highlight. */
export interface ObservationNeedTarget {
  center: [number, number];
  zoom?: number;
  bbox?: [number, number, number, number];
  highlightGeometry?: GeoJSON.Geometry;
}

/** What makes an observation need eligible to be recorded. */
export interface RecordingRule {
  requireAllRequiredChecklist: boolean;
  requireAllRequiredEvidence: boolean;
  requireSummary: boolean;
}

/** The static, seeded description of an observation package. */
export interface ObservationNeed {
  id: string;
  projectId: string;
  stage: 'observe' | 'plan' | 'act';
  /** Domain — drives the dot colour, the tool rail, and the deep-link module. */
  module: ObserveModule;
  title: string;
  description?: string;
  target: ObservationNeedTarget;
  /** Tools surfaced in the left rail while this need is focused. */
  requiredTools: MapToolId[];
  /** Layer ids the workspace should foreground (data-only for v1). */
  requiredLayers: string[];
  checklist: ChecklistItemSpec[];
  evidence: EvidenceSpec[];
  recordingRule: RecordingRule;
  priority: ObservationNeedPriority;
  /** How this need arose — seeded catalog, follow-up from a record, or manual. */
  origin: ObservationNeedOrigin;
  /** Why this need exists — shown on the card. */
  reason: string;
  /** Back-link to the record that raised this need (follow-up origin). */
  sourceObservationId?: string;
  /**
   * Optional re-observation *condition* (e.g. "recheck after next rainfall").
   * A condition, not a schedule — scheduling labour is an Act concern.
   */
  trigger?: string;
  /** Whether the recorded reality may require the Plan to change. Signal to Plan. */
  planImpact?: PlanImpact;
}

/** A single captured piece of evidence in the run state. */
export interface CapturedEvidence {
  /** Matches an `EvidenceSpec.id`. */
  specId: string;
  kind: EvidenceKind;
  /** Data URL (photo/audio), free text (note), or `''` for a confirmation. */
  value: string;
  capturedAt: string;
}

/** The mutable progress of one observation need for one steward. */
export interface ObservationNeedRun {
  status: ObservationNeedStatus;
  checkedChecklist: string[];
  evidence: CapturedEvidence[];
  summary: string;
  /** ISO timestamp of the last mutation, for the timeline. */
  updatedAt?: string;
}

/** An empty run — the implicit state before a steward touches a need. */
export const emptyObservationNeedRun = (): ObservationNeedRun => ({
  status: 'open',
  checkedChecklist: [],
  evidence: [],
  summary: '',
});

/** Result of evaluating a need's run against its recording rule. */
export interface RecordingEvaluation {
  /** Required checklist items that are ticked. */
  checklistDone: number;
  /** Total required checklist items. */
  checklistTotal: number;
  /** Required evidence specs whose min count is satisfied. */
  evidenceDone: number;
  /** Total required evidence specs. */
  evidenceTotal: number;
  /** Whether a summary is present when one is required. */
  summarySatisfied: boolean;
  /** All gates in the recording rule pass → eligible to record. */
  canRecord: boolean;
  /** 0–100 across every required gate, for progress display. */
  pct: number;
}

/**
 * Pure evaluation of a need's run against its recording rule. No store, no
 * side effects — mirrors the predicate style of `objectives.ts` so it is
 * trivially unit-testable.
 */
export function evaluateObservationRecorded(
  need: ObservationNeed,
  run: ObservationNeedRun,
): RecordingEvaluation {
  const requiredChecklist = need.checklist.filter((c) => c.required);
  const checkedSet = new Set(run.checkedChecklist);
  const checklistDone = requiredChecklist.filter((c) =>
    checkedSet.has(c.id),
  ).length;
  const checklistTotal = requiredChecklist.length;

  const requiredEvidence = need.evidence.filter((e) => e.required);
  const evidenceDone = requiredEvidence.filter((spec) => {
    const min = spec.min ?? 1;
    const count = run.evidence.filter((e) => e.specId === spec.id).length;
    return count >= min;
  }).length;
  const evidenceTotal = requiredEvidence.length;

  const summarySatisfied =
    !need.recordingRule.requireSummary || run.summary.trim().length > 0;

  const checklistGate =
    !need.recordingRule.requireAllRequiredChecklist ||
    checklistDone === checklistTotal;
  const evidenceGate =
    !need.recordingRule.requireAllRequiredEvidence ||
    evidenceDone === evidenceTotal;

  const canRecord = checklistGate && evidenceGate && summarySatisfied;

  // Progress weights each active gate's components equally.
  const parts: number[] = [];
  if (need.recordingRule.requireAllRequiredChecklist) {
    parts.push(checklistTotal === 0 ? 1 : checklistDone / checklistTotal);
  }
  if (need.recordingRule.requireAllRequiredEvidence) {
    parts.push(evidenceTotal === 0 ? 1 : evidenceDone / evidenceTotal);
  }
  if (need.recordingRule.requireSummary) {
    parts.push(summarySatisfied ? 1 : 0);
  }
  const pct =
    parts.length === 0
      ? 100
      : Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100);

  return {
    checklistDone,
    checklistTotal,
    evidenceDone,
    evidenceTotal,
    summarySatisfied,
    canRecord,
    pct,
  };
}

/**
 * Some `requiredLayers` tokens are not `ObserveModule`s in their own right —
 * they name a finer concept that lives inside a module's layer set. Map those
 * aliases to their owning module so the layer engine (which gates by module)
 * can foreground them. e.g. `hydrology` features (watercourses / waterbodies)
 * are part of the Earth, Water & Ecology module.
 */
const REQUIRED_LAYER_ALIAS: Record<string, ObserveModule> = {
  hydrology: 'earth-water-ecology',
};

const OBSERVE_MODULE_SET = new Set<string>(OBSERVE_MODULES);

/**
 * Normalize a need's `requiredLayers` (a mix of module names and finer alias
 * tokens) into the set of `ObserveModule`s the focus workspace should
 * foreground on the map. The need's own `module` is always included (so its
 * layers are never hidden even if `requiredLayers` omits it); aliases are
 * resolved; unknown tokens are dropped; the result is de-duplicated.
 *
 * Pure — no store, no side effects — so it is trivially unit-testable.
 */
export function requiredLayersToModules(
  requiredLayers: string[],
  ownModule: ObserveModule,
): ObserveModule[] {
  const out = new Set<ObserveModule>([ownModule]);
  for (const token of requiredLayers) {
    if (OBSERVE_MODULE_SET.has(token)) {
      out.add(token as ObserveModule);
    } else if (REQUIRED_LAYER_ALIAS[token]) {
      out.add(REQUIRED_LAYER_ALIAS[token]);
    }
    // unknown tokens are dropped
  }
  return [...out];
}

/** The fields a steward fills in the "Raise observation need" form. */
export interface RaiseNeedInput {
  title: string;
  reason: string;
  priority: ObservationNeedPriority;
  /** Optional re-observation condition (not a schedule). */
  trigger?: string;
  planImpact?: PlanImpact;
}

/** Host-supplied context for turning `RaiseNeedInput` into a full need. */
export interface RaiseNeedContext {
  id: string;
  projectId: string;
  module: ObserveModule;
  target: ObservationNeedTarget;
  /**
   * Steward-raised needs are only ever `follow-up` or `manual`. `auto` needs go
   * through `buildAutoNeed` instead, so they cannot leak through this path.
   */
  origin: 'follow-up' | 'manual';
  /** The record this need follows from (follow-up origin only). */
  sourceObservationId?: string;
}

/**
 * The minimal capture package shared by every generatively-raised need
 * (`buildRaisedNeed`) and every system-raised need (`buildAutoNeed`): no
 * checklist, tools, or layers — just one required "Summary note". That note both
 * records the evidence and mirrors into `run.summary`, so a single textarea
 * satisfies both active gates while keeping the need from being instantly
 * recordable. Returns fresh arrays per call so callers never share mutable state.
 */
export function minimalCapturePackage(): Pick<
  ObservationNeed,
  'requiredTools' | 'requiredLayers' | 'checklist' | 'evidence' | 'recordingRule'
> {
  return {
    requiredTools: [],
    requiredLayers: [],
    checklist: [],
    evidence: [
      { id: 'summary', kind: 'note', label: 'Summary note', required: true },
    ],
    recordingRule: {
      requireAllRequiredChecklist: false,
      requireAllRequiredEvidence: true,
      requireSummary: true,
    },
  };
}

/**
 * Build a fresh `ObservationNeed` from steward input. The generated need opens
 * with a single required "Summary note" (no checklist, tools, or layers): that
 * note both records the evidence and mirrors into `run.summary`, so one textarea
 * satisfies both gates while keeping the need from being instantly recordable.
 *
 * Pure — the caller owns id generation and persistence — so it is unit-testable.
 */
export function buildRaisedNeed(
  input: RaiseNeedInput,
  ctx: RaiseNeedContext,
): ObservationNeed {
  const trigger = input.trigger?.trim();
  return {
    id: ctx.id,
    projectId: ctx.projectId,
    stage: 'observe',
    module: ctx.module,
    title: input.title.trim(),
    target: ctx.target,
    ...minimalCapturePackage(),
    priority: input.priority,
    origin: ctx.origin,
    reason: input.reason.trim(),
    ...(ctx.sourceObservationId
      ? { sourceObservationId: ctx.sourceObservationId }
      : {}),
    ...(trigger ? { trigger } : {}),
    ...(input.planImpact ? { planImpact: input.planImpact } : {}),
  };
}

/**
 * Find the first `annotation`-kind evidence spec on a need that is not yet
 * satisfied by its run — i.e. whose captured count is below its `min`
 * (default 1). Returns `null` when every annotation requirement is met (or the
 * need declares none). Used by the auto-capture listener to decide which spec a
 * freshly-placed feature should advance.
 *
 * Pure — no store, no side effects — so it is trivially unit-testable.
 */
export function firstUnsatisfiedAnnotationSpec(
  need: ObservationNeed,
  run: ObservationNeedRun,
): EvidenceSpec | null {
  for (const spec of need.evidence) {
    if (spec.kind !== 'annotation') continue;
    const min = spec.min ?? 1;
    const count = run.evidence.filter((e) => e.specId === spec.id).length;
    if (count < min) return spec;
  }
  return null;
}
