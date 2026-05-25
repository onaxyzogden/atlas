/**
 * PlanMapLegend — the colour key for the Plan Command Centre site map. Each row
 * maps a Plan module to its dot colour (the same `PLAN_MODULE_DOT` palette the
 * compass + tabs use). When a module lens is active, the legend narrows to that
 * single module so the key matches the focused Plan/design layers on the map.
 *
 * Mirrors `ObserveMapLegend`; reuses the shared Command Centre stylesheet.
 */

import { PLAN_MODULES, PLAN_MODULE_LABEL, type PlanModule } from '../types.js';
import { PLAN_MODULE_DOT } from '../data/planModulePalette.js';
import css from '../../command/ObserveCommandCentrePage.module.css';

interface Props {
  active: PlanModule | null;
}

export default function PlanMapLegend({ active }: Props) {
  const modules = active ? [active] : PLAN_MODULES;
  return (
    <div className={css.legend} aria-label="Map legend">
      <p className={css.legendTitle}>Plan modules</p>
      {modules.map((module) => (
        <span key={module} className={css.legendRow}>
          <span
            className={css.legendDot}
            style={{ background: PLAN_MODULE_DOT[module] }}
          />
          {PLAN_MODULE_LABEL[module]}
        </span>
      ))}
    </div>
  );
}
