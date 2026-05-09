/**
 * ActModuleBar — 7-tile bottom navigator for the Act stage.
 *
 * Click semantics mirror PlanModuleBar / ObserveModuleBar:
 *   inactive tile    → select module
 *   active + closed  → open slide-up
 *   active + open    → close slide-up
 */

import type { ActModule } from './types.js';
import { ACT_MODULES, ACT_MODULE_LABEL } from './types.js';
import css from './ActModuleBar.module.css';

interface Props {
  activeModule: ActModule | null;
  onSelectModule: (module: ActModule | null) => void;
  slideUpOpen: boolean;
  onOpenSlideUp: () => void;
  onCloseSlideUp: () => void;
}

export default function ActModuleBar({
  activeModule,
  onSelectModule,
  slideUpOpen,
  onOpenSlideUp,
  onCloseSlideUp,
}: Props) {
  const handleTileClick = (mod: ActModule) => {
    if (mod === activeModule) {
      if (slideUpOpen) onCloseSlideUp();
      else onOpenSlideUp();
      return;
    }
    onSelectModule(mod);
  };

  return (
    <div className={css.rail}>
      <div className={css.tiles} role="toolbar" aria-label="Act modules">
        {ACT_MODULES.map((mod) => {
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
              <span className={css.tileLabel}>{ACT_MODULE_LABEL[mod]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
