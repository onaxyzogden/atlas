/**
 * answerOptionLabels — maps the raw stored option ids that `resolveAnswerSpec`
 * returns to human labels for the Act `AnswerRecap` renderer. Labels come from
 * the EXISTING constants (nothing is duplicated):
 *   - project types  -> `findProjectType` / `PROJECT_TYPES` (@ogden/shared)
 *   - vision options -> the Stage Zero Vision Builder config (`VISION_QUESTIONS`)
 *
 * This lives in apps/web (not packages/shared) on purpose: it reads the
 * apps/web-only Vision Builder config, so keeping it here avoids a shared ->
 * apps/web dependency (see the `AnswerOptionSetId` schema note).
 */

import type { AnswerOptionSetId } from '@ogden/shared';
import { findProjectType } from '@ogden/shared';
import { VISION_QUESTIONS } from '../stage-zero/data/visionBuilderQuestions.js';

/** "food-forest" / "food_forest" -> "Food forest". */
export function humaniseId(id: string): string {
  if (!id) return '';
  const spaced = id.replace(/[-_]+/g, ' ').trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

// Flatten every Vision Builder option into a single id -> label lookup. First
// label wins (ids are intended to be globally unique across questions).
const VISION_LABEL_BY_ID: ReadonlyMap<string, string> = (() => {
  const map = new Map<string, string>();
  for (const question of VISION_QUESTIONS) {
    for (const option of question.options) {
      if (!map.has(option.id)) map.set(option.id, option.label);
    }
  }
  return map;
})();

/**
 * Resolve a single stored option id to a display label. Falls back to
 * humanising the raw id when the option set is unset or no label is found
 * (e.g. a free-text land-vision statement, which is shown verbatim).
 */
export function labelForOption(
  optionSetId: AnswerOptionSetId | undefined,
  id: string,
): string {
  if (
    optionSetId === 'projectPrimaryType' ||
    optionSetId === 'projectSecondaryType'
  ) {
    return findProjectType(id)?.label ?? humaniseId(id);
  }
  // vision* sets (or unset): try the Vision Builder config, else humanise.
  return VISION_LABEL_BY_ID.get(id) ?? humaniseId(id);
}
