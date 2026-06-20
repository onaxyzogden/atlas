/**
 * PlanPhaseTabs — top tab strip for the Plan stage.
 *
 * Two tabs: Current Land, Vision Layout (order + membership driven by
 * `PLAN_VIEWS`). The `current` tab keeps the legacy module-driven surface;
 * `vision` opens the design-element canvas.
 *
 * 3D extrusions for placed design elements (`DesignElementExtrusionLayer`)
 * are mounted **always** in the Vision canvas — they're driven by
 * camera pitch, not by tab. Top-down they collapse to nothing visually
 * and the flat layer underneath does the work; tilt the map (shift-drag)
 * and they read as 3D.
 *
 * The "3D Terrain" tab and the bottom-canvas year-scrubber toggle were
 * removed from this strip on 2026-06-15. The `terrain3d` PlanView and the
 * `TemporalScrubSlider` / temporal-scrub stores remain in the codebase but
 * are no longer reachable from here.
 */

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
        return (
          <button
            key={view}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={css.tab}
            data-active={isActive}
            onClick={() => onChange(view)}
          >
            <span>{PLAN_VIEW_LABEL[view]}</span>
          </button>
        );
      })}
    </div>
  );
}
