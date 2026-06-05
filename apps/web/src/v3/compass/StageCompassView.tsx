/**
 * StageCompassView — stage-agnostic presentational shell for a Stage Compass.
 *
 * Extracted from the original Observe-only `StageCompassPage` so the same layout
 * (top spine, left progression rail, center wheel + legend, right detail panel)
 * serves Observe, Plan, and Act. All stage-specific concerns — data, route
 * navigation, the optional Command Centre center-unlock, the True North advisory
 * banner — arrive from a thin per-stage page wrapper that owns the typed router
 * calls and renders the banner above this view.
 */

import StageProgressionRail from './StageProgressionRail.js';
import ObserveCompassWheel, {
  type CommandCentreAffordance,
} from './ObserveCompassWheel.js';
import SelectedObjectivePanel from './SelectedObjectivePanel.js';
import type { CompassData, Stage } from './compassTypes.js';
import css from './StageCompassView.module.css';

const LEGEND: { state: string; label: string }[] = [
  { state: 'verified', label: 'Verified outcome' },
  { state: 'evidence-in', label: 'Evidence in' },
  { state: 'open', label: 'Ready to start' },
  { state: 'locked', label: 'Locked — verify the previous step' },
];

interface StageCompassViewProps {
  data: CompassData;
  /** Which lifecycle stage this compass represents. */
  activeStage: Stage;
  /** Display title used for the region aria-label (e.g. "Observe"). */
  stageTitle: string;
  /** Hub label inside the wheel (e.g. "OBSERVE"). */
  centerLabel: string;
  /** Base wheel fill; per-segment accents override each wedge. */
  wheelAccent?: string;
  selected: string | null;
  onSelect: (id: string | null) => void;
  /** Enter the stage's working map for the given module. */
  onOpenMap: (moduleId: string) => void;
  /** When present, the wheel renders the center-unlock Command Centre affordance. */
  commandCentre?: CommandCentreAffordance;
}

export default function StageCompassView({
  data,
  activeStage,
  stageTitle,
  centerLabel,
  wheelAccent,
  selected,
  onSelect,
  onOpenMap,
  commandCentre,
}: StageCompassViewProps) {
  const selectedView = selected ? (data.byId[selected] ?? null) : null;

  return (
    <div className={css.page}>
      <div className={css.body}>
        <StageProgressionRail activeStage={activeStage} progress={data.stage} />

        <main className={css.center} aria-label={`${stageTitle} compass`}>
          <div className={css.wheelHost}>
            <ObserveCompassWheel
              views={data.views}
              selected={selected}
              onSelect={onSelect}
              centerLabel={centerLabel}
              accent={wheelAccent}
              commandCentre={commandCentre}
            />
          </div>
          <ul className={css.legend}>
            {LEGEND.map((item) => (
              <li key={item.state} className={css.legendItem}>
                <span className={css.legendDot} data-state={item.state} />
                {item.label}
              </li>
            ))}
          </ul>
        </main>

        <SelectedObjectivePanel view={selectedView} onOpenMap={onOpenMap} />
      </div>
    </div>
  );
}
