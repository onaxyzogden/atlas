/**
 * useLivestockFulfillmentSync — generalized ±7-day auto-fulfilment for
 * livestock work on the spine (Phase 4 of the work-management layer).
 *
 * Subscribed where the Act work panel renders. Adapts live livestock work
 * rows + actual move-log events into the pure shared matcher
 * (`matchLivestockFulfillment`) and routes every match through the existing
 * single completion writer (`confirmTypedProofMatch`: event gets the
 * `workItemId` back-link, spine row → done with the event's field date as
 * `actualEnd` so variance reflects when the work HAPPENED).
 *
 * RECORD-KEEPING ONLY (sovereign-steward): this links work the operator
 * already confirmed to execution the operator already logged. It never
 * creates work, never invents evidence, and is idempotent — a fulfilled row
 * leaves the live set and a linked event leaves the candidate pool, so the
 * effect converges in one pass.
 *
 * Check-shaped livestock-plan rows (welfare checks, reviews, …) currently
 * have NO typed evidence log, so their `checkProofs` pool is empty and they
 * complete only via the operator's explicit "Mark done" (generic proof) —
 * deliberately NOT inferred from unrelated logs. The matcher already
 * supports provenance-matched check proofs (`sourceProtocolId`/kind +
 * window) for when a typed check log exists.
 *
 * Coexistence: the legacy RotationScheduleCard effect auto-fulfils
 * scheduled-move rows on the retiring 7-stage Act page with the same
 * (destination + species + ±7d) semantics. Both are idempotent over the
 * same back-link field; whichever runs first wins and the other no-ops.
 */

import { useEffect } from 'react';
import {
  matchLivestockFulfillment,
  type MatchableMoveEvent,
  type MatchableWorkRow,
} from '@ogden/shared';
import { useWorkItemStore } from '../../store/workItemStore.js';
import {
  useLivestockMoveLogStore,
  destPaddockId,
  destStructureId,
} from '../../store/livestockMoveLogStore.js';
import { confirmTypedProofMatch } from '../act/fieldProofActions.js';
import { isLivestockWork, workDueDate } from '../work/workSelectors.js';

export function useLivestockFulfillmentSync(projectId: string): void {
  const items = useWorkItemStore((s) => s.items);
  const events = useLivestockMoveLogStore((s) => s.events);

  useEffect(() => {
    const work: MatchableWorkRow[] = [];
    for (const it of items) {
      if (it.projectId !== projectId || !isLivestockWork(it)) continue;
      if (it.status === 'done' || it.status === 'cancelled') continue;
      const dueDate = workDueDate(it);
      if (!dueDate) continue;
      const target = it.target;
      work.push({
        id: it.id,
        dueDate,
        ...(it.direction ? { direction: it.direction } : {}),
        ...(it.species ? { species: it.species } : {}),
        ...(target?.toId && target.kind === 'paddock'
          ? { toPaddockId: target.toId }
          : {}),
        ...(target?.toId && target.kind === 'structure'
          ? { toStructureId: target.toId }
          : {}),
        ...(it.sourceProtocolId
          ? { sourceProtocolId: it.sourceProtocolId }
          : {}),
      });
    }
    if (work.length === 0) return;

    const moveEvents: MatchableMoveEvent[] = events
      .filter((e) => e.projectId === projectId)
      .map((e) => {
        const toPaddock = destPaddockId(e);
        const toStructure = destStructureId(e);
        return {
          id: e.id,
          date: e.date,
          species: e.species,
          ...(toPaddock ? { toPaddockId: toPaddock } : {}),
          ...(toStructure ? { toStructureId: toStructure } : {}),
          ...(e.workItemId ? { workItemId: e.workItemId } : {}),
        };
      });

    const matches = matchLivestockFulfillment({ work, moveEvents });
    for (const m of matches) {
      const ev = events.find((e) => e.id === m.eventId);
      confirmTypedProofMatch(
        m.workItemId,
        { store: 'livestock-move', eventId: m.eventId },
        ev ? { actualEnd: ev.date } : {},
      );
    }
  }, [items, events, projectId]);
}
