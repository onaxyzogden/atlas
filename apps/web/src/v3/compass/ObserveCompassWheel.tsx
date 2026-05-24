/**
 * ObserveCompassWheel — the central progress wheel for the Stage Compass.
 *
 * Thin adapter over the shared `@ogden/ui-components` `MaqasidComparisonWheel`
 * (the same component the OPA dashboard radial uses, see
 * `components/opa-wheel/OPAComparisonWheel.tsx`). One segment per Observe
 * objective, count-driven from `useCompassData` so it stays in sync with
 * OBSERVE_MODULES. Each segment carries its icon, label, verified %, and its
 * per-module accent colour. Gating still drives the % here and the checklist
 * states in the right-hand `SelectedObjectivePanel`; the on-wheel skill-tree
 * node dots are intentionally dropped in favour of the shared design-system
 * wheel.
 *
 * The shared wheel calls react-router-dom's `useNavigate` internally; Atlas
 * uses @tanstack/react-router and has no react-router-dom context, so we wrap
 * it in a <MemoryRouter> exactly as OPAComparisonWheel does. `onSegmentSelect`
 * receives the whole segment object (the installed v0.1.0 calls it with the
 * segment, not just the id) and short-circuits the internal navigate; we read
 * `.id` off it (and tolerate a bare id string for forward-compat).
 */

import { MaqasidComparisonWheel } from '@ogden/ui-components';
import { MemoryRouter } from 'react-router-dom';
import type { ObserveModule } from '../observe/types.js';
import type { ObjectiveView } from './useCompassData.js';
import css from './ObserveCompassWheel.module.css';

/** Neutral Observe base fill; per-segment `color` overrides each wedge. */
const OBSERVE_ACCENT = '#8b7355';

interface WheelProps {
  views: ObjectiveView[];
  selected: ObserveModule;
  onSelect: (module: ObserveModule) => void;
}

export default function ObserveCompassWheel({ views, onSelect }: WheelProps) {
  const segments = views.map((v) => ({
    id: v.objective.id,
    label: v.objective.label,
    Icon: v.objective.icon,
    current: v.progress.pct,
    color: v.objective.accent,
    tooltipLabel: 'Next',
  }));

  // Hover "Next" card copy: the first still-open node (the genuine next step),
  // falling back to the objective summary when nothing is open. Keyed like the
  // OPA wrapper (`{ site: label }`) — the only level this single-level compass
  // uses.
  const nextActions = Object.fromEntries(
    views.map((v) => {
      const openIdx = v.states.findIndex((s) => s === 'open');
      const label =
        openIdx >= 0
          ? (v.objective.nodes[openIdx]?.label ?? v.objective.summary)
          : v.objective.summary;
      return [v.objective.id, { site: label }];
    }),
  );

  return (
    <div className={css.wheelHost}>
      <MemoryRouter>
        <MaqasidComparisonWheel
          centerLabel="OBSERVE"
          levelColor={OBSERVE_ACCENT}
          segments={segments}
          nextActions={nextActions}
          showNextCard
          showDiacritics={false}
          onSegmentSelect={(arg: string | { id: string }) =>
            onSelect(
              (typeof arg === 'string' ? arg : arg.id) as ObserveModule,
            )
          }
        />
      </MemoryRouter>
    </div>
  );
}
