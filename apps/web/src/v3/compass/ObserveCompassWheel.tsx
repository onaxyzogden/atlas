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
 *
 * Selection vs. hover: the shared wheel only tracks ONE highlighted segment
 * (`forceHover || internalHover`), so pinning the selection with `forceHover`
 * would suppress the native pointer-hover preview entirely. Instead we leave
 * hover fully native and mark the *selected* objective with our own persistent
 * ring — a runtime-injected <style> that targets the selected band by its
 * `aria-label` (the objective label), scoped to this host via a unique id.
 * Clicking the already-selected segment toggles it back off (deselect).
 */

import { useId } from 'react';
import { MaqasidComparisonWheel } from '@ogden/ui-components';
import { MemoryRouter } from 'react-router-dom';
import type { ObserveModule } from '../observe/types.js';
import type { ObjectiveView } from './useCompassData.js';
import css from './ObserveCompassWheel.module.css';

/** Neutral Observe base fill; per-segment `color` overrides each wedge. */
const OBSERVE_ACCENT = '#8b7355';

interface WheelProps {
  views: ObjectiveView[];
  selected: ObserveModule | null;
  onSelect: (module: ObserveModule | null) => void;
}

/** Escape a string for use inside a double-quoted CSS attribute selector. */
function cssAttrEscape(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export default function ObserveCompassWheel({
  views,
  selected,
  onSelect,
}: WheelProps) {
  // Unique, CSS-selector-safe host id so the injected selection-ring <style>
  // only touches this wheel (useId yields colons, invalid in CSS ids).
  const hostId = `cw-${useId().replace(/:/g, '')}`;

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

  // The selected objective's accent + label drive the persistent ring. The
  // band element carries `aria-label="<objective label>"`, so we target it by
  // attribute selector scoped under this host's unique id.
  const selectedObjective = selected
    ? views.find((v) => v.objective.id === selected)?.objective
    : undefined;

  return (
    <div id={hostId} className={css.wheelHost}>
      {selectedObjective && (
        <style>{`
          #${hostId} :where(.mcw-band[aria-label="${cssAttrEscape(
            selectedObjective.label,
          )}"]) {
            stroke: ${selectedObjective.accent};
            stroke-width: 2.5px;
            stroke-opacity: 0.9;
            fill-opacity: 0.42;
          }
        `}</style>
      )}
      <MemoryRouter>
        <MaqasidComparisonWheel
          centerLabel="OBSERVE"
          levelColor={OBSERVE_ACCENT}
          segments={segments}
          nextActions={nextActions}
          showNextCard
          showDiacritics={false}
          onSegmentSelect={(arg: string | { id: string }) => {
            const id = (typeof arg === 'string' ? arg : arg.id) as ObserveModule;
            // Toggle: clicking the already-selected objective deselects it.
            onSelect(id === selected ? null : id);
          }}
        />
      </MemoryRouter>
    </div>
  );
}
