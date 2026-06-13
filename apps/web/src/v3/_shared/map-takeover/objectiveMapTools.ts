/**
 * objectiveMapTools -- the single predicate behind the generic map-takeover: the
 * PlanTools for an objective whose arm DRAWS/PLACES on the map (`kind: 'map'`).
 *
 * The takeover exists to "load the map with the relevant tools", so only map
 * arms qualify -- form/flow/zone-action/module arms open modals or slide-ups,
 * not the map, and the focused panel arms tools via useMapToolStore alone (no
 * shell dispatcher), so non-map arms have no place here. The bottom
 * PlanTierCategorizedToolsRail still surfaces the full tool set; this is the
 * focused map-only subset.
 *
 * Resolution path mirrors the bottom rail: getObjectiveActTools(objective) (the
 * shared per-objective id map) -> resolvePlanTools (the app-layer catalog, which
 * delegates to the Act catalog and drops Plan-dead 'log' arms).
 */

import type { PlanStratumObjective } from '@ogden/shared';
import { getObjectiveActTools } from '@ogden/shared';
import {
  resolvePlanTools,
  type PlanTool,
} from '../../plan/tier-shell/planToolCatalog.js';

/** PlanTools for `objective` whose arm draws/places on the map (`kind: 'map'`). */
export function objectiveMapTools(
  objective: PlanStratumObjective,
): PlanTool[] {
  return resolvePlanTools(getObjectiveActTools(objective)).filter(
    (t) => t.arm.kind === 'map',
  );
}

/** True iff `objective` has >= 1 map draw/place tool (so it "needs the map"). */
export function objectiveNeedsMap(objective: PlanStratumObjective): boolean {
  return objectiveMapTools(objective).length > 0;
}
