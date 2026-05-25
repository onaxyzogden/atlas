/**
 * ActModuleTabs — the Act Command Centre's top module strip. One "All Modules"
 * tab plus one tab per Act module, each showing the module's real progress (from
 * useActCompassData), its compass icon, and its accent dot. Selecting a tab sets
 * the page's active-module lens; "All Modules" clears it.
 *
 * Mirrors `PlanModuleTabs`. Uses the short `ACT_MODULE_LABEL` (the compass
 * objective label is the long form) so the eight tabs stay compact, and reuses
 * the shared Command Centre stylesheet for pixel parity with Observe/Plan.
 */

import { Compass, LayoutGrid } from 'lucide-react';
import type { CompassData } from '../../compass/compassTypes.js';
import { ACT_MODULE_LABEL, type ActModule } from '../types.js';
import css from '../../command/ObserveCommandCentrePage.module.css';

interface Props {
  data: CompassData;
  active: ActModule | null;
  onSelect: (module: ActModule | null) => void;
  onBackToCompass: () => void;
}

export default function ActModuleTabs({
  data,
  active,
  onSelect,
  onBackToCompass,
}: Props) {
  return (
    <nav className={css.tabs} aria-label="Act modules">
      <button
        type="button"
        className={`${css.tab} ${active === null ? css.tabActive : ''}`}
        aria-pressed={active === null}
        onClick={() => onSelect(null)}
      >
        <span className={css.tabIcon}>
          <LayoutGrid size={16} strokeWidth={2} />
        </span>
        <span className={css.tabBody}>
          <span className={css.tabLabel}>All Modules</span>
          <span className={css.tabPct}>{data.stage.pct}% done</span>
        </span>
      </button>

      {data.views.map((v) => {
        const module = v.objective.id as ActModule;
        const Icon = v.objective.icon;
        const isActive = active === module;
        return (
          <button
            key={module}
            type="button"
            className={`${css.tab} ${isActive ? css.tabActive : ''}`}
            aria-pressed={isActive}
            onClick={() => onSelect(isActive ? null : module)}
          >
            <span
              className={css.tabDot}
              style={{ background: v.objective.accent }}
            />
            <span className={css.tabIcon}>
              <Icon size={16} strokeWidth={2} />
            </span>
            <span className={css.tabBody}>
              <span className={css.tabLabel}>{ACT_MODULE_LABEL[module]}</span>
              <span className={css.tabPct}>{v.progress.pct}% done</span>
            </span>
          </button>
        );
      })}

      <button
        type="button"
        className={`${css.ghostBtn} ${css.tabsBackBtn}`}
        onClick={onBackToCompass}
      >
        <Compass size={16} strokeWidth={2} /> Compass
      </button>
    </nav>
  );
}
