/**
 * protocolStore — lifecycle state for steward-activated standing protocols.
 *
 * Bridges the Plan-stage ProtocolConfirmationFlow (where protocols are
 * activated/skipped) to the Act-stage TriggeredProtocolsPanel (where they
 * surface as urgent actionable cards when triggered).
 *
 * Evaluation engine (auto-triggering from Observe data) is deferred.
 * Triggering is manual for this slice: call markTriggered() from the
 * browser console or a future evaluation hook.
 *
 * Persist key: 'ogden-protocols', version 1.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import type { ProtocolStatus } from '@ogden/shared';

export interface ActivatedProtocolRecord {
  templateId: string;
  projectId: string;
  /** Subset of ProtocolStatus used for active protocols. */
  status: Extract<ProtocolStatus, 'active' | 'triggered' | 'suspended'>;
  activatedAt: string;
  /** ISO timestamp — hide from panel until this time has passed. */
  deferredUntil?: string;
  /** ISO timestamp — set when the steward logs a response. */
  lastLoggedAt?: string;
}

interface ProtocolState {
  records: ActivatedProtocolRecord[];

  /**
   * Idempotent activate: upserts a record with status 'active'.
   * Re-activating a skipped/suspended record resets it to 'active'.
   */
  activateProtocol: (projectId: string, templateId: string) => void;

  /** Mark a protocol as triggered (condition has fired). */
  markTriggered: (projectId: string, templateId: string) => void;

  /**
   * Record a steward response: sets lastLoggedAt + flips status back to
   * 'active' so the card disappears from the triggered panel.
   */
  logResponse: (projectId: string, templateId: string) => void;

  /** Hide from triggered panel for 24h (or until isoUntil). */
  defer: (projectId: string, templateId: string, isoUntil: string) => void;

  /** Suspend a protocol (still tracked, not triggered). */
  suspendProtocol: (projectId: string, templateId: string) => void;

  /**
   * Returns records for this project that are triggered AND not currently
   * deferred. Deferral is checked at read time — no timer required.
   */
  getTriggered: (projectId: string) => ActivatedProtocolRecord[];
}

function upsert(
  records: ActivatedProtocolRecord[],
  projectId: string,
  templateId: string,
  patch: Partial<ActivatedProtocolRecord>,
): ActivatedProtocolRecord[] {
  const existing = records.find(
    (r) => r.projectId === projectId && r.templateId === templateId,
  );
  if (existing) {
    return records.map((r) =>
      r.projectId === projectId && r.templateId === templateId
        ? { ...r, ...patch }
        : r,
    );
  }
  return [
    ...records,
    {
      templateId,
      projectId,
      status: 'active',
      activatedAt: new Date().toISOString(),
      ...patch,
    } satisfies ActivatedProtocolRecord,
  ];
}

export const useProtocolStore = create<ProtocolState>()(
  persist(
    (set, get) => ({
      records: [],

      activateProtocol: (projectId, templateId) =>
        set((s) => ({
          records: upsert(s.records, projectId, templateId, {
            status: 'active',
            deferredUntil: undefined,
          }),
        })),

      markTriggered: (projectId, templateId) =>
        set((s) => ({
          records: upsert(s.records, projectId, templateId, {
            status: 'triggered',
            deferredUntil: undefined,
          }),
        })),

      logResponse: (projectId, templateId) =>
        set((s) => ({
          records: s.records.map((r) =>
            r.projectId === projectId && r.templateId === templateId
              ? {
                  ...r,
                  status: 'active' as const,
                  lastLoggedAt: new Date().toISOString(),
                }
              : r,
          ),
        })),

      defer: (projectId, templateId, isoUntil) =>
        set((s) => ({
          records: s.records.map((r) =>
            r.projectId === projectId && r.templateId === templateId
              ? { ...r, deferredUntil: isoUntil }
              : r,
          ),
        })),

      suspendProtocol: (projectId, templateId) =>
        set((s) => ({
          records: s.records.map((r) =>
            r.projectId === projectId && r.templateId === templateId
              ? { ...r, status: 'suspended' as const }
              : r,
          ),
        })),

      getTriggered: (projectId) => {
        const now = new Date();
        return get().records.filter(
          (r) =>
            r.projectId === projectId &&
            r.status === 'triggered' &&
            (!r.deferredUntil || new Date(r.deferredUntil) <= now),
        );
      },
    }),
    {
      name: 'ogden-protocols',
      version: 1,
      migrate: (persisted) => persisted as never,
      partialize: (state) => ({ records: state.records }),
    },
  ),
);

rehydrateWithLogging(useProtocolStore);
