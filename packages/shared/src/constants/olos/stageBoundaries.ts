// stageBoundaries.ts
//
// Per-stage allowed and avoided verb sets, per §3 of each OLOS developer
// spec. Stage boundaries are enforced by these verbs: Observe documents,
// Plan decides, Act executes + proves + verifies. The Objective focused
// question for each Stage × Domain cell must use a verb from the stage's
// allowed list.

import type { Stage } from '../../schemas/olos/stage.schema.js';

export const OBSERVE_ALLOWED_VERBS: readonly string[] = [
  'document',
  'record',
  'measure',
  'sample',
  'map',
  'photograph',
  'describe',
  'survey',
  'note',
  'capture',
  'log',
  'baseline',
  'identify',
  'flag',
] as const;

export const OBSERVE_AVOIDED_VERBS: readonly string[] = [
  'decide',
  'design',
  'choose',
  'approve',
  'plan',
  'install',
  'build',
  'execute',
  'fix',
  'implement',
] as const;

export const PLAN_ALLOWED_VERBS: readonly string[] = [
  'decide',
  'design',
  'choose',
  'approve',
  'prioritise',
  'prioritize',
  'select',
  'sequence',
  'allocate',
  'budget',
  'schedule',
  'specify',
  'phase',
  'route',
  'compare',
  'evaluate',
] as const;

export const PLAN_AVOIDED_VERBS: readonly string[] = [
  'document',
  'measure',
  'photograph',
  'install',
  'build',
  'execute',
  'plant',
  'dig',
  'pour',
  'wire',
] as const;

export const ACT_ALLOWED_VERBS: readonly string[] = [
  'execute',
  'install',
  'build',
  'plant',
  'dig',
  'pour',
  'wire',
  'assign',
  'do',
  'complete',
  'submit-proof',
  'verify',
  'inspect',
  'sign-off',
  'escalate',
  'steward',
  'maintain',
  'monitor',
] as const;

export const ACT_AVOIDED_VERBS: readonly string[] = [
  'decide',
  'design',
  'redesign',
  'choose',
  'approve-new-scope',
  'budget',
  'rescope',
] as const;

export const STAGE_ALLOWED_VERBS: Record<Stage, readonly string[]> = {
  observe: OBSERVE_ALLOWED_VERBS,
  plan: PLAN_ALLOWED_VERBS,
  act: ACT_ALLOWED_VERBS,
};

export const STAGE_AVOIDED_VERBS: Record<Stage, readonly string[]> = {
  observe: OBSERVE_AVOIDED_VERBS,
  plan: PLAN_AVOIDED_VERBS,
  act: ACT_AVOIDED_VERBS,
};

/**
 * Helper used by the StatusPicker and Objective-authoring UI to filter
 * verbs by stage. Returns true if the verb is in the stage's allowed list
 * (case-insensitive, exact match against the canonical list).
 */
export function isVerbAllowedForStage(verb: string, stage: Stage): boolean {
  return STAGE_ALLOWED_VERBS[stage].includes(verb.toLowerCase());
}

/**
 * Returns true if the verb is on the stage's avoided list. Useful for
 * highlighting accidental stage-crossing in the Objective editor.
 */
export function isVerbAvoidedForStage(verb: string, stage: Stage): boolean {
  return STAGE_AVOIDED_VERBS[stage].includes(verb.toLowerCase());
}
