/**
 * rotationAdherence — B3 plan-vs-actual rotation adherence composition engine.
 *
 * Diffs the steward's intended rotation plan (`RotationPlan`) against the
 * actually-logged paddock moves (`LivestockMoveEvent[]`), producing a single
 * health light plus a ranked, deterministic, render-only recommendation list.
 * It COMPOSES existing engines: it reuses `requiredRestDays` from
 * `rotationSequenceMath` and never re-derives recovery / rest math. Pure —
 * never mutates input, never reads or writes `WorkItem.status`.
 *
 * Covenant: strictly agronomic / ecological operating analytics. No
 * riba / gharar / financing / capital / investor / yield framing — only
 * sward, forage, graze, rest and recovery language.
 */

import type { Light, Severity } from '@ogden/shared';
import type { Paddock } from '../../store/livestockStore.js';
import {
  destPaddockId,
  type LivestockMoveEvent,
} from '../../store/livestockMoveLogStore.js';
import {
  requiredRestDays,
  type RotationCell,
  type RotationPlan,
} from './rotationSequenceMath.js';

const DAY_MS = 86_400_000;

export type AdherenceKind =
  | 'overgrazed'
  | 'under-rested-reentry'
  | 'short-rest'
  | 'early-move'
  | 'unplanned-paddock';

export interface AdherenceRecommendation {
  id: string;
  severity: Severity;
  kind: AdherenceKind;
  message: string;
  paddockId?: string;
}

export interface RotationAdherenceCounts {
  overgrazed: number;
  underRestedReentry: number;
  shortRest: number;
  earlyMove: number;
  unplanned: number;
  paddocksTracked: number;
}

export interface RotationAdherenceInput {
  paddocks: Paddock[];
  plan: RotationPlan | null;
  moves: LivestockMoveEvent[];
  /** ISO timestamp used for open-interval end. Omitted ⇒ Date.now();
   *  malformed ⇒ treated as Date.now(). */
  now?: string;
}

export interface RotationAdherence {
  light: Light;
  recommendations: AdherenceRecommendation[];
  counts: RotationAdherenceCounts;
}

const SEVERITY_RANK: Record<Severity, number> = { high: 0, med: 1, low: 2 };

interface Interval {
  inMs: number;
  outMs: number;
  /** true when a real linked `move_out` partner closed the occupancy. */
  closed: boolean;
}

export function computeRotationAdherence(
  inp: RotationAdherenceInput,
): RotationAdherence {
  const { paddocks, plan, moves } = inp;

  // House guard: negative early check — malformed/absent now ⇒ Date.now().
  let nowMs = inp.now ? new Date(inp.now).getTime() : Date.now();
  if (Number.isNaN(nowMs)) nowMs = Date.now();

  // Index moves by id for linked-partner lookup (read-only).
  const byId = new Map<string, LivestockMoveEvent>();
  for (const m of moves) byId.set(m.id, m);

  // Build chronologically-ascending occupancy intervals per destination
  // paddock from `move_in` legs only. The closing exit is the linked
  // `move_out` partner; absent ⇒ open interval running to `now`.
  const intervalsByPaddock = new Map<string, Interval[]>();
  for (const m of moves) {
    if (plan && m.projectId !== plan.projectId) continue;
    const dest = destPaddockId(m);
    if (dest === undefined) continue;
    if (m.direction !== 'move_in') continue;

    const inMs = new Date(m.date).getTime();
    if (Number.isNaN(inMs)) continue;

    let outMs = nowMs;
    let closed = false;
    if (m.linkedEventId) {
      const partner = byId.get(m.linkedEventId);
      if (partner && partner.direction === 'move_out') {
        const pMs = new Date(partner.date).getTime();
        if (!Number.isNaN(pMs)) {
          outMs = pMs;
          closed = true;
        }
      }
    }

    const list = intervalsByPaddock.get(dest) ?? [];
    list.push({ inMs, outMs, closed });
    intervalsByPaddock.set(dest, list);
  }
  for (const list of intervalsByPaddock.values()) {
    list.sort((a, b) => a.inMs - b.inMs);
  }

  const cellByPaddock = new Map<string, RotationCell>();
  if (plan) for (const c of plan.cells) cellByPaddock.set(c.paddockId, c);
  const paddockById = new Map<string, Paddock>();
  for (const p of paddocks) paddockById.set(p.id, p);

  let overgrazed = 0;
  let underRestedReentry = 0;
  let shortRest = 0;
  let earlyMove = 0;
  let unplanned = 0;

  const recs: AdherenceRecommendation[] = [];

  const days = (ms: number): number => Math.max(0, Math.round(ms / DAY_MS));

  for (const [paddockId, intervals] of intervalsByPaddock) {
    const cell = cellByPaddock.get(paddockId);

    if (!cell) {
      unplanned += 1;
      recs.push({
        id: `unplanned-paddock:${paddockId}`,
        severity: 'low',
        kind: 'unplanned-paddock',
        message: `Paddock ${paddockId} was grazed but has no cell in the rotation plan — fold it into the sequence.`,
        paddockId,
      });
      continue;
    }

    const pad = paddockById.get(paddockId);
    const req = pad ? requiredRestDays(pad) : 30;

    let firedOvergrazed = false;
    let firedEarlyMove = false;
    for (const iv of intervals) {
      const grazeDays = days(iv.outMs - iv.inMs);
      if (!firedOvergrazed && grazeDays > cell.targetGrazeDays) {
        firedOvergrazed = true;
        overgrazed += 1;
        recs.push({
          id: `overgrazed:${paddockId}`,
          severity: 'high',
          kind: 'overgrazed',
          message: `Paddock ${paddockId} grazed ${grazeDays} days beyond its ${cell.targetGrazeDays}-day target — rest the sward.`,
          paddockId,
        });
      }
      if (
        !firedEarlyMove &&
        iv.closed &&
        grazeDays < cell.targetGrazeDays
      ) {
        firedEarlyMove = true;
        earlyMove += 1;
        recs.push({
          id: `early-move:${paddockId}`,
          severity: 'med',
          kind: 'early-move',
          message: `Paddock ${paddockId} was vacated after ${grazeDays} days, short of its ${cell.targetGrazeDays}-day graze target — the sward may be under-utilised.`,
          paddockId,
        });
      }
    }

    let firedUnderRested = false;
    let firedShortRest = false;
    for (let k = 0; k + 1 < intervals.length; k += 1) {
      const gapDays = days(intervals[k + 1]!.inMs - intervals[k]!.outMs);
      if (!firedUnderRested && gapDays < req) {
        firedUnderRested = true;
        underRestedReentry += 1;
        recs.push({
          id: `under-rested-reentry:${paddockId}`,
          severity: 'high',
          kind: 'under-rested-reentry',
          message: `Paddock ${paddockId} re-entered after only ${gapDays} days; it needs ${req} days recovery.`,
          paddockId,
        });
      } else if (
        !firedShortRest &&
        gapDays >= req &&
        gapDays < cell.targetRestDays
      ) {
        firedShortRest = true;
        shortRest += 1;
        recs.push({
          id: `short-rest:${paddockId}`,
          severity: 'med',
          kind: 'short-rest',
          message: `Paddock ${paddockId} re-grazed after ${gapDays} days, short of its ${cell.targetRestDays}-day planned rest — let the forage recover.`,
          paddockId,
        });
      }
    }
  }

  const counts: RotationAdherenceCounts = {
    overgrazed,
    underRestedReentry,
    shortRest,
    earlyMove,
    unplanned,
    paddocksTracked: intervalsByPaddock.size,
  };

  const highTotal = overgrazed + underRestedReentry;
  const otherTotal = shortRest + earlyMove + unplanned;
  const light: Light =
    highTotal > 0 ? 'alert' : otherTotal > 0 ? 'warn' : 'ok';

  const countOf = (r: AdherenceRecommendation): number => {
    switch (r.kind) {
      case 'overgrazed':
        return overgrazed;
      case 'under-rested-reentry':
        return underRestedReentry;
      case 'short-rest':
        return shortRest;
      case 'early-move':
        return earlyMove;
      case 'unplanned-paddock':
        return unplanned;
      default: {
        const _exhaustive: never = r.kind;
        void _exhaustive;
        return 0;
      }
    }
  };

  recs.sort((a, b) => {
    const s = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (s !== 0) return s;
    const c = countOf(b) - countOf(a);
    if (c !== 0) return c;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  return { light, recommendations: recs, counts };
}
