/**
 * PlanTools — left tools rail for the Plan stage.
 *
 * Minimal first pass: 8 module sections, each clickable to select the module.
 * Map-tool toggles will be layered in per-module once the plan card tools
 * are designed. Structure mirrors ObserveTools bento layout.
 */

import type { PlanModule } from './types.js';
import { PLAN_MODULES, PLAN_MODULE_FULL_LABEL } from './types.js';
import css from './PlanTools.module.css';

interface Props {
  activeModule: PlanModule | null;
  onSelectModule: (m: PlanModule | null) => void;
}

export default function PlanTools({ activeModule, onSelectModule }: Props) {
  const handleClick = (mod: PlanModule) => {
    onSelectModule(activeModule === mod ? null : mod);
  };
  const handleKey = (e: React.KeyboardEvent, mod: PlanModule) => {
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
      {PLAN_MODULES.map((mod) => {
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
              <span className={css.groupLabel}>{PLAN_MODULE_FULL_LABEL[mod]}</span>
            </div>
            <p className={css.placeholder}>Tools coming soon</p>
          </div>
        );
      })}
    </div>
  );
}
