/**
 * PlanPhaseTabs — top tab strip for the Plan stage.
 *
 * Five tabs: Current Land, Vision Layout, two Yeomans-keyed phase tabs
 * (Year 1 / Year 5), and a 3D Terrain placeholder. Selecting a tab swaps
 * the canvas content via PlanLayout's activeView state.
 */

import { Mountain } from 'lucide-react';
import { PLAN_VIEWS, PLAN_VIEW_LABEL, type PlanView } from '../types.js';
import css from './PlanPhaseTabs.module.css';

interface Props {
  active: PlanView;
  onChange: (view: PlanView) => void;
}

export default function PlanPhaseTabs({ active, onChange }: Props) {
  return (
    <div className={css.wrap} role="tablist" aria-label="Plan view">
      {PLAN_VIEWS.map((view) => {
        const isActive = active === view;
        const isDisabled = view === 'terrain3d';
        return (
          <button
            key={view}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-disabled={isDisabled}
            className={css.tab}
            data-active={isActive}
            data-disabled={isDisabled}
            onClick={() => !isDisabled && onChange(view)}
            disabled={isDisabled}
          >
            {view === 'terrain3d' && (
              <Mountain size={13} strokeWidth={1.75} aria-hidden="true" />
            )}
            <span>{PLAN_VIEW_LABEL[view]}</span>
          </button>
        );
      })}
    </div>
  );
}
