/**
 * OpenMapToolsButton -- the generic "Open map with tools" affordance, the
 * shell-agnostic generalization of the bespoke SlopeSurveySummary /
 * VegetationSurveySummary "Open map survey" buttons. Mounted wherever a
 * draw/place objective is surfaced (currently the Plan right-rail objective
 * detail); clicking flips the shell into the focused map+tools takeover via
 * useObjectiveToolsTakeoverStore.
 *
 * Renders NOTHING for objectives with no map tool (objectiveNeedsMap === false),
 * so non-spatial objectives never show a dead button.
 *
 * The two bespoke survey objectives (s2-terrain, s2-ecology) keep their own
 * richer summary+button (which open the survey-specific panels with live % of
 * site); this generic button covers every OTHER draw/place objective.
 */

import { Map as MapIcon } from 'lucide-react';
import type { PlanStratumObjective } from '@ogden/shared';
import { useObjectiveToolsTakeoverStore } from '../../../store/objectiveToolsTakeoverStore.js';
import { objectiveNeedsMap } from './objectiveMapTools.js';
import styles from './mapTakeover.module.css';

interface Props {
  projectId: string;
  objective: PlanStratumObjective;
}

export default function OpenMapToolsButton({ projectId, objective }: Props) {
  const open = useObjectiveToolsTakeoverStore((s) => s.open);

  // Self-gate: an objective "needs the map" iff it resolves to >= 1 map tool.
  if (!objectiveNeedsMap(objective)) return null;

  return (
    <button
      type="button"
      className={styles.openBtn}
      data-testid="open-map-tools"
      onClick={() => open(projectId, objective.id)}
    >
      <MapIcon size={13} aria-hidden="true" />
      Open map with tools
    </button>
  );
}
