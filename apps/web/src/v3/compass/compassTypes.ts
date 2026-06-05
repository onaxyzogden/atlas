/**
 * compassTypes — stage-agnostic shapes shared by the Observe / Plan / Act Stage
 * Compasses.
 *
 * These were originally defined inline in the Observe config + data hook
 * (`observeCompassConfig.ts`, `useCompassData.ts`). They are lifted here so the
 * three stages render through one set of presentational components
 * (`StageCompassView`, `ObserveCompassWheel`, `SelectedObjectivePanel`,
 * `StageSpine`, `StageProgressionRail`) without duplicating type definitions.
 *
 * `CompassObjective.id` is a plain string (each stage's module-id union widens
 * to string) so one component tree serves every stage. Per-stage configs still
 * produce their own narrow ids; this is the lowest-common-denominator view.
 */

import type { LucideIcon } from 'lucide-react';
import type { NodeState, ObjectiveProgress } from './compassGating.js';

/** The three lifecycle stages that each own a Stage Compass. */
export type Stage = 'observe' | 'plan' | 'act';

export interface CompassNode {
  /** Index into the module's `how` steps — the canonical checklist item. */
  index: number;
  label: string;
}

export interface CompassObjective {
  /** Stage module id (e.g. an ObserveModule / PlanModule / ActModule). */
  id: string;
  /** 1-based position used for the ordinal badge. */
  ordinal: number;
  label: string;
  icon: LucideIcon;
  /** Accent colour, reused from the stage's per-module dot palette. */
  accent: string;
  /** Short right-panel body copy. */
  summary: string;
  /** Each node is one checklist item (one `how` step). */
  nodes: CompassNode[];
  pitfall?: string;
}

export interface ObjectiveView {
  objective: CompassObjective;
  states: NodeState[];
  progress: ObjectiveProgress;
}

export interface CompassData {
  views: ObjectiveView[];
  byId: Record<string, ObjectiveView>;
  stage: ObjectiveProgress;
}
