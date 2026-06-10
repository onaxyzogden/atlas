/**
 * useObjectivePlacedFeatures — the live, objective-scoped placed-feature list
 * rendered in the Act objective panel ("Placed features" section).
 *
 * Given the selected Plan objective + project, it derives which placed-feature
 * stores the objective's armed map tools write into (see
 * objectiveFeatureRegistry) and returns a unified, grouped `ObjectivePlacedRow[]`
 * — each row click-to-zoom ready (`centroid`) and carrying a bound `remove()`.
 *
 * Reactivity (Zustand v5): the hook *subscribes* to every raw store slice it
 * may read, so a draw/delete on the map re-renders the panel. The actual row
 * build reads via `getState()` inside the memo — the subscriptions above are
 * what drive recomputation (they sit in the dep array), so reads stay fresh
 * without threading each slice through every descriptor. Per the v5 stable-
 * snapshot rule, the fresh array is built only inside `useMemo`, never returned
 * straight from a selector.
 */

import { useMemo } from 'react';
import type { PlanStratumObjective } from '@ogden/shared';

import { useCropStore } from '../../../store/cropStore.js';
import { useLivestockStore } from '../../../store/livestockStore.js';
import { useBuiltEnvironmentStoreV2 } from '../../../store/builtEnvironmentStoreV2.js';
import { useLandDesignStore } from '../../../store/landDesignStore.js';
import { useWaterSystemsStore } from '../../../store/waterSystemsStore.js';
import { useZoneStore } from '../../../store/zoneStore.js';
import { usePathStore } from '../../../store/pathStore.js';
import { useVegetationSurveyStore } from '../../../store/vegetationSurveyStore.js';
import { useSlopeSurveyStore } from '../../../store/slopeSurveyStore.js';

import {
  matchedDescriptors,
  objectiveMapToolIds,
  type ObjectivePlacedRow,
} from './objectiveFeatureRegistry.js';

export interface UseObjectivePlacedFeaturesResult {
  rows: ObjectivePlacedRow[];
  /** Group-label → count, in display order (for the section header). */
  groups: Array<{ groupLabel: string; count: number }>;
  total: number;
}

const EMPTY: UseObjectivePlacedFeaturesResult = { rows: [], groups: [], total: 0 };

export function useObjectivePlacedFeatures(
  objective: PlanStratumObjective | null | undefined,
  projectId: string | null | undefined,
): UseObjectivePlacedFeaturesResult {
  // Subscribe to every slice a descriptor may read — these drive re-render.
  const cropAreas = useCropStore((s) => s.cropAreas);
  const paddocks = useLivestockStore((s) => s.paddocks);
  const fenceLines = useLivestockStore((s) => s.fenceLines);
  const builtEntities = useBuiltEnvironmentStoreV2((s) => s.entities);
  const designByProject = useLandDesignStore((s) => s.byProject);
  const earthworks = useWaterSystemsStore((s) => s.earthworks);
  const storageInfra = useWaterSystemsStore((s) => s.storageInfra);
  const watercourses = useWaterSystemsStore((s) => s.watercourses);
  const waterbodies = useWaterSystemsStore((s) => s.waterbodies);
  const waterNodes = useWaterSystemsStore((s) => s.waterNodes);
  const zones = useZoneStore((s) => s.zones);
  const paths = usePathStore((s) => s.paths);
  const vegByProject = useVegetationSurveyStore((s) => s.byProject);
  const slopeByProject = useSlopeSurveyStore((s) => s.byProject);

  // The matched descriptors depend only on the objective's tool set.
  const descriptors = useMemo(
    () => (objective ? matchedDescriptors(objectiveMapToolIds(objective)) : []),
    [objective],
  );

  return useMemo<UseObjectivePlacedFeaturesResult>(() => {
    if (!objective || !projectId || descriptors.length === 0) return EMPTY;

    const rows: ObjectivePlacedRow[] = [];
    for (const d of descriptors) rows.push(...d.build(projectId));

    // Stable sort: groupLabel asc, then label asc.
    rows.sort((a, b) =>
      a.groupLabel !== b.groupLabel
        ? a.groupLabel.localeCompare(b.groupLabel)
        : a.label.localeCompare(b.label),
    );

    const counts = new Map<string, number>();
    for (const r of rows) counts.set(r.groupLabel, (counts.get(r.groupLabel) ?? 0) + 1);
    const groups = Array.from(counts.entries()).map(([groupLabel, count]) => ({
      groupLabel,
      count,
    }));

    return { rows, groups, total: rows.length };
    // The store slices below are intentionally in the dep array: they are the
    // reactive trigger. `descriptors.build` reads them fresh via getState().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    objective,
    projectId,
    descriptors,
    cropAreas,
    paddocks,
    fenceLines,
    builtEntities,
    designByProject,
    earthworks,
    storageInfra,
    watercourses,
    waterbodies,
    waterNodes,
    zones,
    paths,
    vegByProject,
    slopeByProject,
  ]);
}
