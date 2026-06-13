/**
 * ObjectiveToolsPanel -- the focused right-rail takeover panel for the generic
 * objective-tools mode (the shell-agnostic generalization of SlopeSurveyPanel /
 * VegetationSurveyPanel). Mounted by PlanTierShell (and, later, ActTierShell) in
 * the right-rail slot while useObjectiveToolsTakeoverStore is active for the
 * selected objective.
 *
 * Surfaces the SAME per-objective map tools the bottom PlanTierCategorizedTools-
 * Rail uses (resolved via objectiveMapTools), grouped by category, in a focused
 * form: each tile arms its draw tool through useMapToolStore (a pure toggle --
 * no shell dispatcher), which the draw hosts already mounted in
 * VisionLayoutCanvas pick up by id. Only `kind: 'map'` tools appear (the panel's
 * whole purpose is drawing on the map; form/flow/module arms stay on the bottom
 * rail). "Done" disarms the tool and closes the takeover.
 */

import { useMemo } from 'react';
import { Map as MapIcon } from 'lucide-react';
import type { PlanStratumObjective } from '@ogden/shared';
import { useMapToolStore } from '../../observe/components/measure/useMapToolStore.js';
import { useObjectiveToolsTakeoverStore } from '../../../store/objectiveToolsTakeoverStore.js';
import {
  PLAN_TOOL_CATEGORIES,
  type PlanTool,
} from '../../plan/tier-shell/planToolCatalog.js';
import { objectiveMapTools } from './objectiveMapTools.js';
import styles from './mapTakeover.module.css';

interface Props {
  projectId: string;
  objective: PlanStratumObjective;
}

export default function ObjectiveToolsPanel({ objective }: Props) {
  const activeTool = useMapToolStore((s) => s.activeTool);
  const setActiveTool = useMapToolStore((s) => s.setActiveTool);
  const close = useObjectiveToolsTakeoverStore((s) => s.close);

  const tools = useMemo(() => objectiveMapTools(objective), [objective]);

  // Group the map tools by Plan tool category, dropping empty categories, so the
  // panel mirrors the bottom rail's grouping for the same objective.
  const groups = useMemo(
    () =>
      PLAN_TOOL_CATEGORIES.map((category) => ({
        category,
        catTools: tools.filter((t) => t.category === category.id),
      })).filter((g) => g.catTools.length > 0),
    [tools],
  );

  const handleDone = () => {
    // Disarm the draw tool, then close the takeover (mirrors SlopeSurveyPanel).
    setActiveTool(null);
    close();
  };

  const handleArm = (tool: PlanTool) => {
    if (tool.arm.kind !== 'map') return;
    const id = tool.arm.mapToolId;
    // Pure toggle: arming the active tool again disarms it (parity with the
    // bottom rail + survey panels).
    setActiveTool(activeTool === id ? null : id);
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>
          <MapIcon aria-hidden="true" size={14} />
          Map tools
        </span>
        <button type="button" className={styles.doneBtn} onClick={handleDone}>
          Done
        </button>
      </div>

      <p className={styles.hint}>
        {activeTool
          ? 'Draw or place on the map. Arm another tool here, or press Done to finish.'
          : 'Arm a tool, then draw or place its feature on the map.'}
      </p>

      <p className={styles.objective}>{objective.title}</p>

      {groups.map(({ category, catTools }) => (
        <section key={category.id} className={styles.group}>
          <div className={styles.groupLabel}>{category.label}</div>
          <div className={styles.grid}>
            {catTools.map((tool) => {
              const Icon = tool.icon;
              const armed =
                tool.arm.kind === 'map' && activeTool === tool.arm.mapToolId;
              return (
                <button
                  key={tool.id}
                  type="button"
                  className={styles.tile}
                  data-active={armed}
                  aria-pressed={armed}
                  onClick={() => handleArm(tool)}
                  title={tool.label}
                >
                  <span className={styles.tileIcon} aria-hidden="true">
                    <Icon size={18} strokeWidth={1.7} />
                  </span>
                  <span className={styles.tileLabel}>{tool.label}</span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
