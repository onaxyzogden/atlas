// actProgress — pure derivation for the Plan-stage Act progress bar
// (Plan Nav v1.1 section 4.3). Kept store-free and React-free so it can be
// unit-tested without dragging in the Act store modules' rehydrate side
// effects; ActProgressBar.tsx does the store subscription one level up.

import type { ActTask, VerificationRecord } from '@ogden/shared';

export interface ActProgress {
  /** Tasks tied to the objective with a passing verification record. */
  verified: number;
  /** Tasks tied to the objective, regardless of verification state. */
  total: number;
}

/**
 * Of the Act tasks tied to `objectiveId`, how many have a passing
 * verification. `total` counts the objective's tasks; `verified` is the
 * subset whose id appears on a `pass` VerificationRecord. Only `pass`
 * counts — `partial`, `fail`, and `needs-rework` are not "verified".
 */
export function deriveActProgress(
  tasks: readonly ActTask[],
  verifications: readonly VerificationRecord[],
  objectiveId: string,
): ActProgress {
  const objTasks = tasks.filter((t) => t.objectiveId === objectiveId);
  const passedTaskIds = new Set(
    verifications.filter((v) => v.outcome === 'pass').map((v) => v.taskId),
  );
  const verified = objTasks.filter((t) => passedTaskIds.has(t.id)).length;
  return { verified, total: objTasks.length };
}
