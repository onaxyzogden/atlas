/**
 * fieldProofActions — the thin D4 orchestrator (Sub-project D4).
 *
 * Composes proof-event creation with the spine-only single writer
 * `workItemStore.fulfilWorkItem`. This is the "routes typed domain event OR
 * generic fallback" responsibility from the D4 spec, kept OUT of
 * workItemStore so the spine store retains zero app-store dependencies —
 * structurally identical to how `RotationScheduleCard` already pairs
 * `updateItem(...)` with `updateEvent(...)`. The single completion writer
 * of the spine is still exactly one action.
 *
 * Covenant (D4, binding): operational field-execution proof only — no
 * cost / financing / capital / investor framing.
 */

import type { ProofTarget } from '@ogden/shared';
import { useWorkItemStore } from '../../store/workItemStore.js';
import { useProofEventStore } from '../../store/proofEventStore.js';
import { useMaintenanceLogStore } from '../../store/maintenanceLogStore.js';
import { useLivestockMoveLogStore } from '../../store/livestockMoveLogStore.js';
import { useNurseryStore } from '../../store/nurseryStore.js';

export interface ProofCapture {
  who?: string;
  actualStart?: string | null;
  actualEnd?: string | null;
  notes?: string;
  evidence?: { photoRef: string; geo?: [number, number] };
}

/**
 * No matching typed D0 event: write a generic ProofEvent carrying the
 * back-link, then fulfil the spine. Two side-effects, one spine writer.
 */
export function fulfilWithGenericProof(
  workItemId: string,
  projectId: string,
  capture: ProofCapture,
): void {
  useProofEventStore.getState().addProofEvent({
    id: crypto.randomUUID(),
    projectId,
    workItemId,
    ...(capture.who !== undefined ? { actorWho: capture.who } : {}),
    ...(capture.actualStart !== undefined
      ? { actualStart: capture.actualStart }
      : {}),
    ...(capture.actualEnd !== undefined
      ? { actualEnd: capture.actualEnd }
      : {}),
    ...(capture.notes !== undefined ? { notes: capture.notes } : {}),
    ...(capture.evidence !== undefined ? { evidence: capture.evidence } : {}),
    createdAt: new Date().toISOString(),
  });
  useWorkItemStore.getState().fulfilWorkItem(workItemId, capture);
}

type TypedStore = Exclude<ProofTarget, 'generic'>;

/**
 * Steward confirmed a render-only suggestion: stamp the existing immutable
 * typed D0 event with the WorkItem back-link (mirrors
 * RotationScheduleCard's `updateEvent(match.id, { workItemId })`), then
 * fulfil the spine. No generic ProofEvent is written.
 */
export function confirmTypedProofMatch(
  workItemId: string,
  link: { store: TypedStore; eventId: string },
  // Optional actuals (e.g. the typed event's field date as actualEnd) so
  // schedule variance reflects when the work HAPPENED, not when it was
  // linked. Additive default keeps every existing call-site byte-identical.
  capture: ProofCapture = {},
): void {
  switch (link.store) {
    case 'maintenance':
      useMaintenanceLogStore
        .getState()
        .updateEvent(link.eventId, { workItemId });
      break;
    case 'livestock-move':
      useLivestockMoveLogStore
        .getState()
        .updateEvent(link.eventId, { workItemId });
      break;
    case 'nursery':
      useNurseryStore
        .getState()
        .updateTransfer(link.eventId, { workItemId });
      break;
  }
  useWorkItemStore.getState().fulfilWorkItem(workItemId, capture);
}
