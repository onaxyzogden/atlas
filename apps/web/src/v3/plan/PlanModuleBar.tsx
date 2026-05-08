/**
 * PlanModuleBar — 10-tile bottom navigator for the Plan stage.
 *
 * Click semantics mirror ObserveModuleBar:
 *   inactive tile    → select module (no slide-up yet)
 *   active + closed  → open slide-up
 *   active + open    → close slide-up
 */

import type { PlanModule } from './types.js';
import { PLAN_MODULES, PLAN_MODULE_LABEL } from './types.js';
import css from './PlanModuleBar.module.css';

interface Props {
  activeModule: PlanModule | null;
  onSelectModule: (module: PlanModule | null) => void;
  slideUpOpen: boolean;
  onOpenSlideUp: () => void;
  onCloseSlideUp: () => void;
}

export default function PlanModuleBar({
  activeModule,
  onSelectModule,
  slideUpOpen,
  onOpenSlideUp,
  onCloseSlideUp,
}: Props) {
  const handleTileClick = (mod: PlanModule) => {
    if (mod === activeModule) {
      if (slideUpOpen) onCloseSlideUp();
      else onOpenSlideUp();
      return;
    }
    onSelectModule(mod);
  };

  return (
    <div className={css.rail}>
      <div className={css.tiles} role="toolbar" aria-label="Plan modules">
        {PLAN_MODULES.map((mod) => {
          const isActive = activeModule === mod;
          return (
            <button
              key={mod}
              type="button"
              aria-pressed={isActive}
              className={`${css.tile} ${isActive ? css.tileActive : ''}`}
              onClick={() => handleTileClick(mod)}
            >
              <div className={css.tileBar} aria-hidden="true" />
              <span className={css.tileLabel}>{PLAN_MODULE_LABEL[mod]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
