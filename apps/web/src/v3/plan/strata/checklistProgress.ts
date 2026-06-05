// checklistProgress — pure derivation of an objective's decision-checklist
// completion, mirroring DecisionChecklist's "required done / required total"
// figure exactly (DecisionChecklist.tsx:64-67). Extracted as a standalone
// helper so DecisionProgressBar can render the same number without depending on
// (or editing) DecisionChecklist. Required-only: optional items are excluded; an
// item counts as done when its id is in the captured completedItemIds OR the
// Stage Zero Vision bridge marks it complete.

import type { PlanDecisionChecklistItem } from '@ogden/shared';
import type { VisionDerivedMap } from '../../strata/visionProfileToChecklist.js';

export interface ChecklistProgress {
  done: number;
  total: number;
}

export function deriveChecklistProgress(
  checklist: readonly PlanDecisionChecklistItem[],
  completedItemIds: readonly string[],
  derivedEvidence?: VisionDerivedMap,
): ChecklistProgress {
  const completed = new Set(completedItemIds);
  const isItemComplete = (id: string) =>
    completed.has(id) || derivedEvidence?.[id]?.isComplete === true;

  const required = checklist.filter((i) => !i.optional);
  const total = required.length;
  const done = required.filter((i) => isItemComplete(i.id)).length;

  return { done, total };
}
