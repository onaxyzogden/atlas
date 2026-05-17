import { z } from 'zod';

/**
 * Act-stage interaction telemetry.
 *
 * Backs the affinity-validation pipeline: see migration 024 +
 * apps/api/src/routes/telemetry/index.ts +
 * apps/web/src/lib/actInteractionLog.ts.
 *
 * The 7 event_type strings here mirror the SQL CHECK constraint in
 * migration 024 exactly. Both are sources of truth in their own layer;
 * they must be kept in lock-step by hand.
 */

export const ACT_INTERACTION_EVENT_TYPES = [
  'tile_select',
  'tile_open',
  'tile_close',
  'quick_log_click',
  'slideup_open',
  'slideup_close',
  'panel_row_visible',
] as const;

export const ActInteractionEventType = z.enum(ACT_INTERACTION_EVENT_TYPES);
export type ActInteractionEventType = z.infer<typeof ActInteractionEventType>;

export const ActModuleId = z.enum([
  'tracker',
  'build',
  'maintain',
  'livestock',
  'harvest',
  'review',
  'network',
  'schedule',
]);
export type ActModuleId = z.infer<typeof ActModuleId>;

export const PlanProjectTypeId = z.enum([
  'regenerative_farm',
  'retreat_center',
  'homestead',
  'educational_farm',
  'conservation',
  'multi_enterprise',
]);
export type PlanProjectTypeId = z.infer<typeof PlanProjectTypeId>;

const TilePayload = z.object({}).passthrough();
const QuickLogPayload = z.object({
  toolId: z.string().min(1),
});
const SlideUpOpenPayload = z.object({}).passthrough();
const SlideUpClosePayload = z.object({
  dwellMs: z.number().int().nonnegative(),
});
const PanelRowVisiblePayload = z.object({
  panel: z.enum(['priorities', 'alerts']),
  modules: z.array(ActModuleId.nullable()),
  rowIds: z.array(z.string().min(1)),
});

/**
 * Wire shape for a single event posted from the web client.
 *
 * `payload` is per-event-type extras; the schema is per-type discriminated
 * via {@link ActInteractionEventInput.refine}.
 */
export const ActInteractionEventInput = z
  .object({
    projectId: z.string().uuid(),
    sessionId: z.string().min(1).max(64),
    occurredAt: z.string().datetime(),
    projectType: PlanProjectTypeId.nullable(),
    module: ActModuleId,
    eventType: ActInteractionEventType,
    payload: z.record(z.string(), z.unknown()).default({}),
  })
  .superRefine((evt, ctx) => {
    const result = (() => {
      switch (evt.eventType) {
        case 'tile_select':
        case 'tile_open':
        case 'tile_close':
          return TilePayload.safeParse(evt.payload);
        case 'quick_log_click':
          return QuickLogPayload.safeParse(evt.payload);
        case 'slideup_open':
          return SlideUpOpenPayload.safeParse(evt.payload);
        case 'slideup_close':
          return SlideUpClosePayload.safeParse(evt.payload);
        case 'panel_row_visible':
          return PanelRowVisiblePayload.safeParse(evt.payload);
      }
    })();
    if (!result.success) {
      for (const issue of result.error.issues) {
        ctx.addIssue({
          ...issue,
          path: ['payload', ...issue.path],
        });
      }
    }
  });
export type ActInteractionEventInput = z.infer<typeof ActInteractionEventInput>;

export const PostActInteractionsBody = z.object({
  events: z.array(ActInteractionEventInput).min(1).max(100),
});
export type PostActInteractionsBody = z.infer<typeof PostActInteractionsBody>;

export const PostActInteractionsResult = z.object({
  ingested: z.number().int().nonnegative(),
});
export type PostActInteractionsResult = z.infer<typeof PostActInteractionsResult>;

/**
 * Aggregate row returned by GET /telemetry/act-interactions/aggregate.
 * One row per (projectType, module, eventType) bucket.
 */
export const ActAffinityAggregateRow = z.object({
  projectType: PlanProjectTypeId.nullable(),
  module: ActModuleId,
  eventType: ActInteractionEventType,
  touchCount: z.number().int().nonnegative(),
  distinctSessions: z.number().int().nonnegative(),
  avgDwellMs: z.number().nullable(),
});
export type ActAffinityAggregateRow = z.infer<typeof ActAffinityAggregateRow>;

export const GetActAffinityAggregateQuery = z.object({
  projectId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});
export type GetActAffinityAggregateQuery = z.infer<typeof GetActAffinityAggregateQuery>;

export const GetActAffinityAggregateResult = z.object({
  rows: z.array(ActAffinityAggregateRow),
});
export type GetActAffinityAggregateResult = z.infer<typeof GetActAffinityAggregateResult>;
