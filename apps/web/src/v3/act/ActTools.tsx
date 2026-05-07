/**
 * ActTools — left tools rail for the Act stage.
 *
 * Mirrors PlanTools: 5 module sections, each clickable to select the module.
 * Map-tool toggles will be layered in per-module once act-stage tools land.
 */

import type { ActModule } from './types.js';
import { ACT_MODULES, ACT_MODULE_FULL_LABEL } from './types.js';
import css from './ActTools.module.css';

interface Props {
  activeModule: ActModule | null;
  onSelectModule: (m: ActModule | null) => void;
}

export default function ActTools({ activeModule, onSelectModule }: Props) {
  const handleClick = (mod: ActModule) => {
    onSelectModule(activeModule === mod ? null : mod);
  };
  const handleKey = (e: React.KeyboardEvent, mod: ActModule) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick(mod);
    }
  };

  return (
    <div
      className={css.toolbox}
      data-has-active={activeModule !== null ? 'true' : 'false'}
    >
      {ACT_MODULES.map((mod) => {
        const isActive = activeModule === mod;
        return (
          <div
            key={mod}
            className={`${css.group} ${isActive ? css.groupActive : ''}`}
            data-module={mod}
            role="button"
            tabIndex={0}
            aria-pressed={isActive}
            onClick={() => handleClick(mod)}
            onKeyDown={(e) => handleKey(e, mod)}
          >
            <div className={css.groupHeader}>
              <span className={css.dot} aria-hidden="true" />
              <span className={css.groupLabel}>{ACT_MODULE_FULL_LABEL[mod]}</span>
            </div>
            <p className={css.placeholder}>Tools coming soon</p>
          </div>
        );
      })}
    </div>
  );
}
