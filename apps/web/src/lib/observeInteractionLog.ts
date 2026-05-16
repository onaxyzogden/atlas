/**
 * Observe-stage interaction telemetry buffer.
 *
 * Local-only v1 — no backend endpoint exists yet for
 * `/api/v1/telemetry/observe-interactions`. The module mirrors
 * `actInteractionLog.ts` shape (queue + idle/ceiling triggers + session
 * id + dev-flag gate + test hooks) so wiring a future endpoint is a
 * one-line `api.telemetry.postObserveInteractions(...)` swap on the
 * flush path.
 *
 * Currently invoked by `useEffectiveHomestead` consumers to record
 * `homestead_gate_flip` events with `{ source: 'explicit' | 'derived' |
 * 'none' }` so we can measure how often the residence→Zone-0 derivation
 * lands the gate without an explicit Place-homestead (ADR
 * `wiki/decisions/2026-05-13-atlas-residence-zone0-derivation.md`).
 *
 * Privacy posture: gated behind `VITE_ATLAS_TELEMETRY_ENABLED`. When the
 * flag is unset or 'false', `recordObserveInteraction` is a no-op.
 */

import { useCallback, useMemo } from 'react';

// ─── Flag gate ───────────────────────────────────────────────────────────────

const TELEMETRY_ENABLED =
  (import.meta.env.VITE_ATLAS_TELEMETRY_ENABLED ??
    (import.meta.env.DEV ? 'true' : 'false')) === 'true';

export const isObserveTelemetryEnabled = (): boolean => TELEMETRY_ENABLED;

// ─── Event vocab ─────────────────────────────────────────────────────────────

export type ObserveModuleId =
  | 'human-context'
  | 'built-environment'
  | 'land-base'
  | 'climate-water'
  | 'flora-fauna'
  | 'sectors-zones'
  | 'swot-synthesis';

export type ObserveInteractionEventType =
  /** The Permaculture-zone tool gate flipped. Payload carries the
   *  resolved anchor source so we can compare explicit vs derived. */
  | 'homestead_gate_flip'
  /** The steward explicitly placed (or moved/cleared) the homestead. */
  | 'homestead_explicit_set'
  | 'homestead_explicit_clear';

export interface ObserveInteractionEventInput {
  projectId: string;
  sessionId: string;
  occurredAt: string;
  module: ObserveModuleId | null;
  eventType: ObserveInteractionEventType;
  payload?: Record<string, unknown>;
}

// ─── Session id ──────────────────────────────────────────────────────────────

let sessionId: string | null = null;

const getSessionId = (): string => {
  if (sessionId) return sessionId;
  sessionId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return sessionId;
};

// ─── Queue ───────────────────────────────────────────────────────────────────

const MAX_QUEUE = 50;
const IDLE_MS = 1500;

let queue: ObserveInteractionEventInput[] = [];
let idleTimer: ReturnType<typeof setTimeout> | null = null;

const cancelIdle = () => {
  if (idleTimer != null) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
};

const scheduleFlush = () => {
  cancelIdle();
  idleTimer = setTimeout(() => {
    void flush();
  }, IDLE_MS);
};

/**
 * v1 flush sink: in dev, mirror to console.debug so engineers can verify
 * events fire. Production builds keep events in the module-level queue
 * for future backend wiring — the test hooks below let assertions inspect
 * what would have been sent.
 */
export async function flush(): Promise<void> {
  cancelIdle();
  if (queue.length === 0) return;
  const batch = queue.splice(0, MAX_QUEUE);
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug('[observe-telemetry] flush', batch);
  }
}

// ─── Public record API ───────────────────────────────────────────────────────

export interface ObserveTelemetryContext {
  projectId: string;
}

export interface RecordObserveInteractionInput {
  module: ObserveModuleId | null;
  eventType: ObserveInteractionEventType;
  payload?: Record<string, unknown>;
}

export function recordObserveInteraction(
  ctx: ObserveTelemetryContext,
  input: RecordObserveInteractionInput,
): void {
  if (!TELEMETRY_ENABLED) return;
  if (!ctx.projectId) return;

  queue.push({
    projectId: ctx.projectId,
    sessionId: getSessionId(),
    occurredAt: new Date().toISOString(),
    module: input.module,
    eventType: input.eventType,
    payload: input.payload ?? {},
  });

  if (queue.length >= MAX_QUEUE) {
    void flush();
  } else {
    scheduleFlush();
  }
}

// ─── Test hooks ──────────────────────────────────────────────────────────────

/** @internal — for tests only. */
export const __test = {
  reset: () => {
    cancelIdle();
    queue = [];
    sessionId = null;
  },
  getQueueLength: () => queue.length,
  getQueueSnapshot: () => [...queue],
};

// ─── React binding ───────────────────────────────────────────────────────────

/**
 * Tiny hook to keep call-sites tidy. Captures the current projectId and
 * returns a `record(input)` that prefills it.
 */
export function useObserveTelemetry(ctx: ObserveTelemetryContext) {
  const stableCtx = useMemo<ObserveTelemetryContext>(
    () => ({ projectId: ctx.projectId }),
    [ctx.projectId],
  );
  return useCallback(
    (input: RecordObserveInteractionInput) =>
      recordObserveInteraction(stableCtx, input),
    [stableCtx],
  );
}
