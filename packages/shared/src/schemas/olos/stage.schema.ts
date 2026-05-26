// stage.schema.ts
//
// The three OLOS stages — Observe, Plan, Act — and their boundary rules. The
// stage determines the user's relationship to a Domain: Observe documents,
// Plan decides, Act executes + proves + verifies.
//
// Source of truth for stage ids. Verb sets + per-stage status enums live in
// sibling schemas; see ../../constants/olos/stageBoundaries.ts for the
// canonical verb lists per dev-spec §3.

import { z } from 'zod';

export const Stage = z.enum(['observe', 'plan', 'act']);
export type Stage = z.infer<typeof Stage>;

export const STAGES: readonly Stage[] = ['observe', 'plan', 'act'] as const;

export const STAGE_LABELS: Record<Stage, string> = {
  observe: 'Observe',
  plan: 'Plan',
  act: 'Act',
};

export const STAGE_CORE_QUESTION: Record<Stage, string> = {
  observe: 'What is happening?',
  plan: 'What should happen, where, why, and in what sequence?',
  act: 'Who does it, when, with what proof, what is blocked, and what feedback must return to the system?',
};
