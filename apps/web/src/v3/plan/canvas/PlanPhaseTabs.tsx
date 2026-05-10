/**
 * PlanPhaseTabs — top tab strip for the Plan stage.
 *
 * Five tabs: Current Land, Vision Layout, two Yeomans-keyed phase tabs
 * (Year 1 / Year 5), and 3D Terrain.
 *
 * 3D extrusions for placed design elements (`DesignElementExtrusionLayer`)
 * are mounted **always** in the Vision/Phase canvases — they're driven by
 * camera pitch, not by tab. Top-down they collapse to nothing visually
 * and the flat layer underneath does the work; tilt the map (shift-drag)
 * and they read as 3D.
 *
 * The "3D Terrain" tab is a one-click camera preset: it mounts
 * `Terrain3DController`, which eases pitch to 60°/bearing -20° and
 * activates MapLibre native terrain (MapTiler raster-DEM, exaggeration
 * 1.4). Switching back to any other tab restores pitch 0 and clears
 * terrain so the default Plan-stage open path stays cheap.
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
