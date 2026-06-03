/**
 * useCompostStore — local-first persisted slice for the compost vertical.
 *
 * Holds the active pile's temperature readings so a reading logged in the Act
 * screen flows straight into Observe (the curve, phase detection, and
 * pathogen-kill surfaces all read from here). Seeded with the textbook batch
 * from `model.ts` so Observe renders a full lifecycle on first load.
 *
 * Separate persist key + `version: 1`, NO `temporal`, NO `migrate` — mirrors
 * the additive-covenant shape of the existing `ogden-compost-*` slices. The
 * Phase 2 org-scoped Site/Pile/Reading API exists for multi-user sync; wiring
 * this slice to it is deferred (the Phase 3 gate is manual logging → Observe).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { READINGS, type Reading } from './model.js';

interface CompostState {
  readings: Reading[];
  /** Append a manual reading. `tempC` is the operator-entered Celsius value. */
  logReading: (tempC: number, note: string) => void;
  /** Restore the textbook seed (used by the dev reset affordance). */
  reset: () => void;
}

export const useCompostStore = create<CompostState>()(
  persist(
    (set) => ({
      readings: READINGS,

      logReading: (tempC, note) =>
        set((s) => {
          const last = s.readings[s.readings.length - 1];
          const tempF = Math.round((tempC * 9) / 5 + 32);
          const next: Reading = {
            id: `r${s.readings.length}`,
            day: (last?.day ?? -1) + 1,
            date: 'Apr 08',
            temp: tempF,
            moisture: last?.moisture ?? 50,
            turned: false,
            note,
            proofPhoto: false,
          };
          return { readings: [...s.readings, next] };
        }),

      reset: () => set({ readings: READINGS }),
    }),
    { name: 'ogden-compost-pile', version: 1 },
  ),
);
