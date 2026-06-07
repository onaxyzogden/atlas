/**
 * Soil-test store — PLAN-stage Module 5 (Soil Fertility & Closed-Loop).
 *
 * Persists the steward's jar-test / percolation / pH readings authored in
 * `SoilBaselineCard`. Per Permaculture Scholar verdict 2026-05-07
 * (`wiki/decisions/2026-05-07-atlas-plan-soil-scholar-build-fresh.md`)
 * the Scholar called "soil management areas" — a project usually has more
 * than one reading because soil varies across zones — so each entry
 * carries an optional `zoneId` plus a free-text label.
 *
 * Selector discipline: subscribers should read `state.byProject` and
 * `useMemo` their per-project slice (the standard subscribe-then-derive
 * pattern from `wiki/decisions/2026-04-26-zustand-selector-stability.md`).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import { idbPersistStorage } from '../lib/indexedDBStorage.js';

export interface SoilTest {
  id: string;
  projectId: string;
  /** Optional human-friendly label ("Front field", "Greenhouse bed"). */
  label?: string;
  /** Optional link into `zoneStore` so a steward can tag readings to a zone. */
  zoneId?: string;
  /** Jar-test percentages (0-100). Should sum to ~100. */
  sandPct: number;
  siltPct: number;
  clayPct: number;
  /** Percolation rate in inches per hour; 0 if unknown. */
  percolationInPerHr: number;
  /** Soil pH on 0-14 scale; 0 if unknown. */
  pH: number;
  notes?: string;
  createdAt: string;
}

interface SoilTestState {
  /** projectId → soil-test list. */
  byProject: Record<string, SoilTest[]>;
  addTest: (test: SoilTest) => void;
  updateTest: (id: string, patch: Partial<Omit<SoilTest, 'id' | 'projectId' | 'createdAt'>>) => void;
  removeTest: (id: string) => void;
}

export const useSoilTestStore = create<SoilTestState>()(
  persist(
    (set) => ({
      byProject: {},
      addTest: (test) =>
        set((s) => {
          const list = s.byProject[test.projectId] ?? [];
          return {
            byProject: { ...s.byProject, [test.projectId]: [...list, test] },
          };
        }),
      updateTest: (id, patch) =>
        set((s) => {
          const next: Record<string, SoilTest[]> = {};
          for (const [pid, list] of Object.entries(s.byProject)) {
            next[pid] = list.map((t) => (t.id === id ? { ...t, ...patch } : t));
          }
          return { byProject: next };
        }),
      removeTest: (id) =>
        set((s) => {
          const next: Record<string, SoilTest[]> = {};
          for (const [pid, list] of Object.entries(s.byProject)) {
            next[pid] = list.filter((t) => t.id !== id);
          }
          return { byProject: next };
        }),
    }),
    { name: 'ogden-soil-tests', storage: idbPersistStorage, version: 1, migrate: (persisted) => persisted as never },
  ),
);

rehydrateWithLogging(useSoilTestStore);

export function newSoilTestId(): string {
  return `st-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
