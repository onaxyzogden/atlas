/**
 * ObserveModuleTabs — the Command Centre's top module strip. One "All Modules"
 * tab plus one tab per Observe domain, each showing the domain's real verified
 * progress (from useCompassData), its compass icon, and its accent dot. Selecting
 * a tab sets the page's active-module lens; "All Modules" clears it.
 *
 * No fabricated "coverage" — the percentage is the live `progress.pct` the
 * Stage Compass already computes from checklist + evidence state.
 */

import { LayoutGrid } from 'lucide-react';
import type { CompassData } from '../compass/useCompassData.js';
import type { ObserveModule } from '../observe/types.js';
import css from './ObserveCommandCentrePage.module.css';

interface Props {
  data: CompassData;
  active: ObserveModule | null;
  onSelect: (module: ObserveModule | null) => void;
}

export default function ObserveModuleTabs({ data, active, onSelect }: Props) {
  return (
    <nav className={css.tabs} aria-label="Observe modules">
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
          <span className={css.tabPct}>{data.stage.pct}% verified</span>
        </span>
      </button>

      {data.views.map((v) => {
        const module = v.objective.id as ObserveModule;
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
              <span className={css.tabLabel}>{v.objective.label}</span>
              <span className={css.tabPct}>{v.progress.pct}% verified</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
