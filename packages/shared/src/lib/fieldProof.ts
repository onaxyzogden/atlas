/**
 * fieldProof — the pure field-execution-proof engine (Sub-project D4).
 *
 * No React, no store, no I/O. Owns the derived, render-only proof surfaces:
 *
 *   1. proof state per WorkItem — proven (done + a linked proof event) /
 *      claimed (done, no event) / open (not done);
 *   2. source → typed-D0-store routing (which immutable event log, if any,
 *      should carry a typed proof for this item; else 'generic' fallback);
 *   3. render-only "this recent domain event probably fulfils that item"
 *      window suggestions — candidates only, NEVER a write.
 *
 * Derived only — NEVER written back into `WorkItem.status` (single-writer
 * spine discipline, consistent with D0.1 / D1 / D2 / D3). Defensive: items
 * missing dates are skipped rather than throwing.
 *
 * Covenant (D4, binding): strictly operational field-execution proof. No
 * cost, financing, capital, investor, yield-as-return, riba, gharar, salam
 * computation anywhere — those stay in Scholar-gated Sub-project C.
 */

import type { WorkItem } from '../schemas/workItem.schema.js';
import type { WorkItemSource } from '../schemas/workItem.schema.js';

/** Which immutable D0 event log carries a typed proof for a source. */
export type ProofTarget =
  | 'maintenance'
  | 'livestock-move'
  | 'nursery'
  | 'generic';

export type ProofState = 'proven' | 'claimed' | 'open';

/** Normalised domain event the caller maps its D0 store rows into. */
export interface DomainEvent {
  id: string;
  store: Exclude<ProofTarget, 'generic'>;
  projectId: string;
  /** ISO date the event occurred. */
  date: string;
}

export interface ProofSuggestion {
  itemId: string;
  eventId: string;
  store: Exclude<ProofTarget, 'generic'>;
  daysApart: number;
}

export interface FieldProofAnalysis {
  byItemId: Map<string, ProofState>;
  suggestions: ProofSuggestion[];
  counts: { proven: number; claimed: number; open: number };
}

/**
 * Map a WorkItem's legacy-origin `source` to the typed D0 event log that
 * should carry its proof, else 'generic'. Harvest is deliberately absent:
 * a WorkItem is a planned task, not "a harvest" — harvest entries stay
 * their own D0 log and are never auto-treated as task proof.
 */
export function routeProofTarget(source: WorkItemSource): ProofTarget {
  switch (source) {
    case 'maintenance':
      return 'maintenance';
    case 'scheduled-livestock-move':
      return 'livestock-move';
    case 'nursery-batch':
      return 'nursery';
    default:
      return 'generic';
  }
}

/**
 * proven = status 'done' AND at least one linked proof event id;
 * claimed = status 'done' with no linked event; open = not done.
 */
export function classifyProof(
  item: Pick<WorkItem, 'status'>,
  linkedEventIds: readonly string[],
): ProofState {
  if (item.status !== 'done') return 'open';
  return linkedEventIds.length > 0 ? 'proven' : 'claimed';
}

/** Absolute whole-day distance between two ISO dates. */
function daysApart(a: string, b: string): number {
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  if (Number.isNaN(da) || Number.isNaN(db)) return Number.POSITIVE_INFINITY;
  return Math.abs(Math.round((da - db) / 86_400_000));
}

/**
 * Render-only. For each not-done item with a scheduled anchor date, finds
 * recent same-project domain events of the item's routed typed store within
 * `windowDays`; returns the single closest candidate per item. Pure — never
 * mutates inputs, never writes. The caller decides whether to act.
 */
export function suggestProofMatches(
  items: WorkItem[],
  domainEvents: DomainEvent[],
  windowDays = 7,
): ProofSuggestion[] {
  const out: ProofSuggestion[] = [];
  for (const it of items) {
    if (it.status === 'done') continue;
    const target = routeProofTarget(it.source);
    if (target === 'generic') continue;
    const anchor = it.scheduledStart ?? it.scheduledEnd;
    if (!anchor) continue;
    let best: ProofSuggestion | undefined;
    for (const ev of domainEvents) {
      if (ev.store !== target) continue;
      if (ev.projectId !== it.projectId) continue;
      const d = daysApart(anchor, ev.date);
      if (d > windowDays) continue;
      if (!best || d < best.daysApart) {
        best = { itemId: it.id, eventId: ev.id, store: target, daysApart: d };
      }
    }
    if (best) out.push(best);
  }
  return out;
}

/**
 * Pure rollup: classify every item's proof state, compute render-only
 * suggestions, and total the state counts. `linkedEventsByItemId` is keyed
 * by `WorkItem.id` (absent ⇒ no linked events). Nothing reads or writes
 * `WorkItem.status`.
 */
export function analyzeFieldProof(
  items: WorkItem[],
  linkedEventsByItemId: Map<string, string[]>,
  domainEvents: DomainEvent[],
  windowDays = 7,
): FieldProofAnalysis {
  const byItemId = new Map<string, ProofState>();
  const counts = { proven: 0, claimed: 0, open: 0 };
  for (const it of items) {
    const state = classifyProof(it, linkedEventsByItemId.get(it.id) ?? []);
    byItemId.set(it.id, state);
    counts[state] += 1;
  }
  return {
    byItemId,
    suggestions: suggestProofMatches(items, domainEvents, windowDays),
    counts,
  };
}
