// objective.schema.ts
//
// An Objective is the focused unit of work inside a Stage × Domain cell.
// Each Objective binds a focused question (a verb-set framing from the
// Stage's allowed-verb list), required upstream inputs, a default overlay
// bundle that the map view should load, the ordered checklist items that
// make up the work, the Record type it emits, and the status set it can
// land in.

import { z } from 'zod';
import { Stage } from './stage.schema.js';
import { UniversalDomain } from '../universalDomain.schema.js';
import { OverlayBundleSchema } from './overlay.schema.js';

export const ObjectiveOutputKind = z.enum([
  'observation-record',
  'plan-decision-record',
  'act-task',
  'stewardship-routine',
]);
export type ObjectiveOutputKind = z.infer<typeof ObjectiveOutputKind>;

export const ObjectiveRequiredInputSchema = z.object({
  kind: z.enum([
    'observation-record',
    'plan-decision-record',
    'act-handoff-package',
    'reference-doc',
  ]),
  objectiveId: z.string().optional(),
  description: z.string().optional(),
});
export type ObjectiveRequiredInput = z.infer<
  typeof ObjectiveRequiredInputSchema
>;

export const ObjectiveSchema = z.object({
  id: z.string().min(1),
  stage: Stage,
  domain: UniversalDomain,
  title: z.string().min(1),
  focusedQuestion: z.string().min(1),
  completionCriteria: z.string().optional(),
  requiredInputs: z.array(ObjectiveRequiredInputSchema).default([]),
  defaultOverlayBundle: OverlayBundleSchema.default([]),
  checklistItemIds: z.array(z.string()).default([]),
  outputKind: ObjectiveOutputKind,
  allowedStatuses: z.array(z.string()).default([]),
});
export type Objective = z.infer<typeof ObjectiveSchema>;
