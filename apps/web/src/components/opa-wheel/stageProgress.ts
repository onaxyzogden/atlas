/**
 * Stage progress derivation for the OPAComparisonWheel.
 *
 * Walks every dashboard-only item in DASHBOARD_ITEMS, groups by `stage3`
 * (Observe / Plan / Act), and asks the caller-supplied `itemHasData`
 * predicate whether that item has any user data attached. The result is a
 * per-stage:
 *   - `current` — completion ratio scaled to 0–100, rounded.
 *   - `nextActionLabel` — the first not-yet-populated item's `label`, taken
 *     from the canonical taxonomy ordering (which is hub-first, then
 *     module order). When every item is populated the fallback string
 *     "All caught up" is returned.
 *
 * The helper is intentionally pure (no React, no zustand) so it can be
 * unit-tested with a synthetic predicate. The wrapper component supplies a
 * predicate that reads the relevant zustand stores.
 *
 * Why this shape: the wheel just needs three numbers + three short strings.
 * Tying derivation to the existing taxonomy means new stage items get
 * picked up automatically as long as they carry a `stage3` tag.
 */

import {
  DASHBOARD_ITEMS,
  STAGE3_ORDER,
  type Stage3Key,
} from '../../features/navigation/taxonomy.js';

export interface StageProgress {
  /** 0–100, rounded. */
  current: number;
  /** Count of dashboard-only items in this stage that report data. */
  populated: number;
  /** Total dashboard-only items in this stage. */
  total: number;
  /** Label of the first unpopulated item, or "All caught up". */
  nextActionLabel: string;
  /** Id of the first unpopulated item, or null when stage is complete. */
  nextActionId: string | null;
}

export type StageProgressMap = Record<Stage3Key, StageProgress>;

const ALL_CAUGHT_UP = 'All caught up';

export function computeStageProgress(
  itemHasData: (itemId: string) => boolean,
): StageProgressMap {
  const result: Partial<StageProgressMap> = {};

  for (const stage of STAGE3_ORDER) {
    const items = DASHBOARD_ITEMS.filter(
      (item) => item.stage3 === stage && item.dashboardOnly === true,
    );

    let populated = 0;
    let nextActionLabel = ALL_CAUGHT_UP;
    let nextActionId: string | null = null;

    for (const item of items) {
      if (itemHasData(item.id)) {
        populated += 1;
      } else if (nextActionId === null) {
        nextActionLabel = item.label;
        nextActionId = item.id;
      }
    }

    const total = items.length;
    const current = total === 0 ? 0 : Math.round((populated / total) * 100);

    result[stage] = { current, populated, total, nextActionLabel, nextActionId };
  }

  return result as StageProgressMap;
}
