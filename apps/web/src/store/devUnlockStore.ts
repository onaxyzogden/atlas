// devUnlockStore — DEV-ONLY global override that lifts the Plan prerequisite
// lock gate so every stratum/objective reads as accessible. Drives the
// `DevUnlockToggle` header control; consumed by PlanStratumShell and
// ActTierShell, which both pass their computed status map through
// `liftLockedStatuses` (guarded by `import.meta.env.DEV`) before gating.
//
// The override is honest: it only turns `locked` into `available`. It never
// fabricates `complete`, so progress percentages and completion celebrations
// are unaffected. Persisted to localStorage purely for dev convenience; the
// call-site DEV guard means production never lifts a lock even if a stale flag
// survives in storage.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PlanStratumObjectiveStatus } from '@ogden/shared';

interface DevUnlockState {
  unlockAll: boolean;
  toggle: () => void;
  setUnlockAll: (value: boolean) => void;
}

export const useDevUnlockStore = create<DevUnlockState>()(
  persist(
    (set) => ({
      unlockAll: false,
      toggle: () => set((s) => ({ unlockAll: !s.unlockAll })),
      setUnlockAll: (value) => set({ unlockAll: value }),
    }),
    { name: 'ogden-dev-unlock-all-strata' },
  ),
);

/**
 * Pure helper — return a copy of an objective-status map with every `locked`
 * status promoted to `available`. All other statuses (active/complete/
 * deferred) pass through untouched. Stratum states recomputed from the result
 * roll up to unlocked automatically.
 */
export function liftLockedStatuses(
  statuses: Readonly<Record<string, PlanStratumObjectiveStatus>>,
): Record<string, PlanStratumObjectiveStatus> {
  const out: Record<string, PlanStratumObjectiveStatus> = {};
  for (const [id, status] of Object.entries(statuses)) {
    out[id] = status === 'locked' ? 'available' : status;
  }
  return out;
}
