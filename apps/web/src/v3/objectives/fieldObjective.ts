/**
 * FieldObjective — the doc's "guided field-work package": a discrete,
 * location-bound, assignable unit of stage work. Distinct from the two
 * existing module-keyed "objective" notions:
 *   - `ObserveObjective` (pure predicates over store counts, module-level)
 *   - `CompassObjective` (compass-wheel nodes)
 * A FieldObjective carries everything needed to *launch a focused workspace*:
 * where on the map, which tools, which checklist, what evidence, and the rule
 * that marks it complete. User-facing label is simply "Objective".
 *
 * The static catalog (title, target, tools, checklist spec) is seed data; the
 * mutable run state (checked items, captured evidence, status) lives in
 * `fieldObjectiveStore`. This split mirrors the compass evidence/checks model
 * and keeps completion evaluation a pure function of catalog + run.
 */

import type { ObserveModule } from '../observe/types.js';
import { OBSERVE_MODULES } from '../observe/types.js';
import type { MapToolId } from '../observe/components/measure/useMapToolStore.js';

/** Lifecycle of a single objective, per the doc's status states. */
export type ObjectiveStatus =
  | 'not-started'
  | 'in-progress'
  | 'evidence-submitted'
  | 'complete'
  | 'needs-review';

export type ObjectivePriority = 'low' | 'medium' | 'high';

/** Kinds of proof an objective can require. */
export type EvidenceKind =
  | 'photo'
  | 'note'
  | 'annotation'
  | 'confirmation'
  | 'audio';

/** One checklist item the steward ticks while working the objective. */
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
export interface ObjectiveTarget {
  center: [number, number];
  zoom?: number;
  bbox?: [number, number, number, number];
  highlightGeometry?: GeoJSON.Geometry;
}

/** What makes an objective eligible for "Submit for review". */
export interface CompletionRule {
  requireAllRequiredChecklist: boolean;
  requireAllRequiredEvidence: boolean;
  requireSummary: boolean;
}

export interface ObjectiveAssignee {
  id: string;
  name: string;
}

/** The static, seeded description of a field-work package. */
export interface FieldObjective {
  id: string;
  projectId: string;
  stage: 'observe' | 'plan' | 'act';
  /** Domain — drives the dot colour, the tool rail, and the deep-link module. */
  module: ObserveModule;
  title: string;
  description?: string;
  target: ObjectiveTarget;
  /** Tools surfaced in the left rail while this objective is focused. */
  requiredTools: MapToolId[];
  /** Layer ids the workspace should foreground (data-only for v1). */
  requiredLayers: string[];
  checklist: ChecklistItemSpec[];
  evidence: EvidenceSpec[];
  completionRule: CompletionRule;
  priority: ObjectivePriority;
  /** ISO date string. */
  dueAt?: string;
  assignee?: ObjectiveAssignee;
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

/** The mutable progress of one objective for one steward. */
export interface ObjectiveRun {
  status: ObjectiveStatus;
  checkedChecklist: string[];
  evidence: CapturedEvidence[];
  summary: string;
  /** ISO timestamp of the last mutation, for the timeline. */
  updatedAt?: string;
}

/** An empty run — the implicit state before a steward touches an objective. */
export const emptyObjectiveRun = (): ObjectiveRun => ({
  status: 'not-started',
  checkedChecklist: [],
  evidence: [],
  summary: '',
});

/** Result of evaluating an objective's run against its completion rule. */
export interface CompletionEvaluation {
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
  /** All gates in the completion rule pass → eligible to submit. */
  canSubmit: boolean;
  /** 0–100 across every required gate, for progress display. */
  pct: number;
}

/**
 * Pure evaluation of an objective's run against its completion rule. No store,
 * no side effects — mirrors the predicate style of `objectives.ts` so it is
 * trivially unit-testable.
 */
export function evaluateObjectiveCompletion(
  objective: FieldObjective,
  run: ObjectiveRun,
): CompletionEvaluation {
  const requiredChecklist = objective.checklist.filter((c) => c.required);
  const checkedSet = new Set(run.checkedChecklist);
  const checklistDone = requiredChecklist.filter((c) =>
    checkedSet.has(c.id),
  ).length;
  const checklistTotal = requiredChecklist.length;

  const requiredEvidence = objective.evidence.filter((e) => e.required);
  const evidenceDone = requiredEvidence.filter((spec) => {
    const min = spec.min ?? 1;
    const count = run.evidence.filter((e) => e.specId === spec.id).length;
    return count >= min;
  }).length;
  const evidenceTotal = requiredEvidence.length;

  const summarySatisfied =
    !objective.completionRule.requireSummary || run.summary.trim().length > 0;

  const checklistGate =
    !objective.completionRule.requireAllRequiredChecklist ||
    checklistDone === checklistTotal;
  const evidenceGate =
    !objective.completionRule.requireAllRequiredEvidence ||
    evidenceDone === evidenceTotal;

  const canSubmit = checklistGate && evidenceGate && summarySatisfied;

  // Progress weights each active gate's components equally.
  const parts: number[] = [];
  if (objective.completionRule.requireAllRequiredChecklist) {
    parts.push(checklistTotal === 0 ? 1 : checklistDone / checklistTotal);
  }
  if (objective.completionRule.requireAllRequiredEvidence) {
    parts.push(evidenceTotal === 0 ? 1 : evidenceDone / evidenceTotal);
  }
  if (objective.completionRule.requireSummary) {
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
    canSubmit,
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
 * Normalize an objective's `requiredLayers` (a mix of module names and finer
 * alias tokens) into the set of `ObserveModule`s the focus workspace should
 * foreground on the map. The objective's own `module` is always included (so
 * its layers are never hidden even if `requiredLayers` omits it); aliases are
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

/**
 * Find the first `annotation`-kind evidence spec on an objective that is not
 * yet satisfied by its run — i.e. whose captured count is below its `min`
 * (default 1). Returns `null` when every annotation requirement is met (or the
 * objective declares none). Used by the auto-capture listener to decide which
 * spec a freshly-placed feature should advance.
 *
 * Pure — no store, no side effects — so it is trivially unit-testable.
 */
export function firstUnsatisfiedAnnotationSpec(
  objective: FieldObjective,
  run: ObjectiveRun,
): EvidenceSpec | null {
  for (const spec of objective.evidence) {
    if (spec.kind !== 'annotation') continue;
    const min = spec.min ?? 1;
    const count = run.evidence.filter((e) => e.specId === spec.id).length;
    if (count < min) return spec;
  }
  return null;
}
