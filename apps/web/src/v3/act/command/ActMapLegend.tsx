/**
 * ActMapLegend — the colour key for the Act Command Centre site map. Each row
 * maps an Act module to its dot colour (the same `ACT_MODULE_DOT` palette the
 * compass + tabs use). When a module lens is active, the legend narrows to that
 * single module so the key matches the focused Act execution layers on the map.
 *
 * Mirrors `PlanMapLegend`; reuses the shared Command Centre stylesheet.
 */

import { ACT_MODULES, ACT_MODULE_LABEL, type ActModule } from '../types.js';
import { ACT_MODULE_DOT } from '../data/actModulePalette.js';
import css from '../../command/ObserveCommandCentrePage.module.css';

interface Props {
  active: ActModule | null;
}

export default function ActMapLegend({ active }: Props) {
  const modules = active ? [active] : ACT_MODULES;
  return (
    <div className={css.legend} aria-label="Map legend">
      <p className={css.legendTitle}>Act modules</p>
      {modules.map((module) => (
        <span key={module} className={css.legendRow}>
          <span
            className={css.legendDot}
            style={{ background: ACT_MODULE_DOT[module] }}
          />
          {ACT_MODULE_LABEL[module]}
        </span>
      ))}
    </div>
  );
}
