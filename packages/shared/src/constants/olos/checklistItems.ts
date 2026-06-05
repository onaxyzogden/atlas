// checklistItems.ts
//
// Re-export the flat list of checklist items derived from
// UNIVERSAL_OBJECTIVES. The source-of-truth authoring table lives in
// objectives.ts so the two views (Objective.checklistItemIds and the flat
// item table) cannot drift.

export {
  UNIVERSAL_CHECKLIST_ITEMS,
  getChecklistItemsForObjective,
} from './objectives.js';
