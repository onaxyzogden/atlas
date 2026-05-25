/**
 * CommandCentreModuleTabs — the stage-agnostic top module strip shared by every
 * Command Centre. One "All Modules" tab that clears the lens plus one tab per
 * compass view (accent dot, compass icon, short label, live % progress), and a
 * "Compass" back control.
 *
 * The percentage is always the live `progress.pct` the Stage Compass computes —
 * no fabricated coverage. Per-stage wrappers (ObserveModuleTabs / PlanModuleTabs
 * / ActModuleTabs) inject the aria label, the optional short-label map, and the
 * status word ("verified" for Observe/Plan, "done" for Act).
 *
 * Generic over the stage's module-id union `M` so each wrapper keeps full
 * type-safety on `active` / `onSelect` without widening to `string`.
 */

import { Compass, LayoutGrid } from 'lucide-react';
import type { CompassData } from '../../compass/compassTypes.js';
import css from './CommandCentreShell.module.css';

export interface CommandCentreModuleTabsProps<M extends string> {
  data: CompassData;
  active: M | null;
  onSelect: (module: M | null) => void;
  onBackToCompass: () => void;
  /** Accessible label for the tab strip, e.g. "Act modules". */
  ariaLabel: string;
  /** Optional short-label map; falls back to the compass objective label. */
  moduleLabel?: Record<M, string>;
  /** Trailing progress word: "verified" (Observe/Plan) or "done" (Act). */
  statusWord: 'verified' | 'done';
}

export default function CommandCentreModuleTabs<M extends string>({
  data,
  active,
  onSelect,
  onBackToCompass,
  ariaLabel,
  moduleLabel,
  statusWord,
}: CommandCentreModuleTabsProps<M>) {
  return (
    <nav className={css.tabs} aria-label={ariaLabel}>
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
          <span className={css.tabPct}>
            {data.stage.pct}% {statusWord}
          </span>
        </span>
      </button>

      {data.views.map((v) => {
        const module = v.objective.id as M;
        const Icon = v.objective.icon;
        const isActive = active === module;
        const label = moduleLabel
          ? moduleLabel[module] ?? v.objective.label
          : v.objective.label;
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
              <span className={css.tabLabel}>{label}</span>
              <span className={css.tabPct}>
                {v.progress.pct}% {statusWord}
              </span>
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
