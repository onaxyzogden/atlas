import { z } from 'zod';

/**
 * Showcase visitor telemetry — the Phase 5 public observation loop for the
 * `/showcase/three-streams` scrollytelling portal (Phase 3).
 *
 * Motivation: the portal recruits three audience tiers (dreaming /
 * transitioning / stewarding) but ships blind — we cannot see which tier
 * visitors pick, whether they click through to register, or whether they go
 * on to instantiate a template. This channel captures that tier-conversion
 * signal so Phase 5 can read it and queue refinements.
 *
 * Pipeline mirrors the client-error telemetry one (migration 040 +
 * apps/api/src/routes/telemetry/index.ts + apps/web/src/showcase/lib/showcaseEventLog.ts):
 *   apps/web/src/showcase/lib/showcaseEventLog.ts (buffer, sendBeacon)
 *     → POST /api/v1/telemetry/showcase-events (PUBLIC, rate-limited)
 *       → migration 040 (showcase_visitor_events)
 *
 * The `eventType` and `tier` strings here mirror the SQL CHECK constraints in
 * migration 040 exactly. Both are sources of truth in their own layer; keep
 * them in lock-step by hand.
 *
 * Design notes that differ from client-error telemetry:
 *   - The route is PUBLIC (no auth) — a cold showcase visitor has no session.
 *     The route stamps `user_id` best-effort only if a bearer token happens to
 *     be present (e.g. a `visitor_registered` event posted right after
 *     sign-up); it is never required.
 *   - `tier` and `projectId` are both NULLABLE — early events (showcase_view)
 *     happen before a tier is chosen and long before a project exists.
 */

export const SHOWCASE_EVENT_TYPES = [
  'showcase_view',
  'tier_selected',
  'scene_viewed',
  'cta_primary_click',
  'cta_secondary_click',
  'visitor_registered',
  'template_instantiated',
] as const;

export const ShowcaseEventType = z.enum(SHOWCASE_EVENT_TYPES);
export type ShowcaseEventType = z.infer<typeof ShowcaseEventType>;

export const SHOWCASE_TIERS = ['dreaming', 'transitioning', 'stewarding'] as const;

export const ShowcaseTier = z.enum(SHOWCASE_TIERS);
export type ShowcaseTier = z.infer<typeof ShowcaseTier>;

/**
 * Wire shape for a single showcase visitor event posted from the portal.
 *
 * String fields are length-capped so a runaway payload cannot bloat the
 * request body or the row.
 */
export const ShowcaseEventInput = z.object({
  sessionId: z.string().min(1).max(64),
  occurredAt: z.string().datetime(),
  eventType: ShowcaseEventType,
  /** Null before a tier is chosen (e.g. the initial showcase_view). */
  tier: ShowcaseTier.nullable().default(null),
  /** Set only once a template_instantiated event names a project. */
  projectId: z.string().uuid().nullable().default(null),
  /** Per-event-type extras, e.g. { sceneId } or { href }. */
  payload: z.record(z.string(), z.unknown()).default({}),
});
export type ShowcaseEventInput = z.infer<typeof ShowcaseEventInput>;

export const PostShowcaseEventsBody = z.object({
  events: z.array(ShowcaseEventInput).min(1).max(50),
});
export type PostShowcaseEventsBody = z.infer<typeof PostShowcaseEventsBody>;

export const PostShowcaseEventsResult = z.object({
  ingested: z.number().int().nonnegative(),
});
export type PostShowcaseEventsResult = z.infer<typeof PostShowcaseEventsResult>;

/**
 * Wire shape for a single visitor feedback submission (Phase 5 B.4).
 *
 * Backed by migration 041 (showcase_feedback) and posted to the PUBLIC,
 * rate-limited POST /api/v1/showcase/feedback route. `message` is the only
 * required field; rating + contact are optional and visitor-supplied.
 */
export const PostShowcaseFeedbackBody = z.object({
  sessionId: z.string().min(1).max(64).nullable().default(null),
  tier: ShowcaseTier.nullable().default(null),
  /** Optional 1–5 satisfaction rating. */
  rating: z.number().int().min(1).max(5).nullable().default(null),
  message: z.string().min(1).max(4000),
  /** Optional contact (e.g. email) the visitor chooses to share. */
  contact: z.string().max(320).nullable().default(null),
});
export type PostShowcaseFeedbackBody = z.infer<typeof PostShowcaseFeedbackBody>;

export const PostShowcaseFeedbackResult = z.object({
  ok: z.boolean(),
});
export type PostShowcaseFeedbackResult = z.infer<typeof PostShowcaseFeedbackResult>;
