/**
 * TrueNorthCompassWheel — the central wheel for the True North (Stage 0)
 * compass. A thin adapter over the shared `@ogden/ui-components`
 * `MaqasidComparisonWheel`, identical in mechanics to `ObserveCompassWheel`:
 * one segment per True North segment, count-driven from `useTrueNorthData`,
 * each wedge carrying its icon, label, completeness %, and accent colour.
 *
 * Center-unlock: "the outer ring readies the stage; the center runs it." Here
 * the center opens the Fit Gate verdict surface once every segment is fully
 * answered. The advisory contract is preserved — the Fit Gate is always
 * reachable from the page; this affordance only signals readiness.
 *
 * Selection vs. hover mechanics, the MemoryRouter wrap, and the runtime
 * selection-ring <style> all follow `ObserveCompassWheel` exactly (see that
 * file for the rationale).
 */

import { useId } from 'react';
import { Lock, ArrowRight } from 'lucide-react';
import { MaqasidComparisonWheel } from '@ogden/ui-components';
import { MemoryRouter } from 'react-router-dom';
import type { SegmentView } from './useTrueNorthData.js';
import type { TrueNorthSegmentId } from './data/trueNorthTypes.js';
import css from './TrueNorthCompassWheel.module.css';

/** Neutral True North base fill; per-segment `color` overrides each wedge. */
const TRUE_NORTH_ACCENT = '#9c6f3f';

interface WheelProps {
  views: SegmentView[];
  selected: TrueNorthSegmentId | null;
  onSelect: (segment: TrueNorthSegmentId | null) => void;
  /** All segments answered — unlocks the center Fit Gate affordance. */
  ready: boolean;
  onEnterFitGate: () => void;
}

function cssAttrEscape(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export default function TrueNorthCompassWheel({
  views,
  selected,
  onSelect,
  ready,
  onEnterFitGate,
}: WheelProps) {
  const hostId = `tnw-${useId().replace(/:/g, '')}`;

  const segments = views.map((v) => ({
    id: v.segment.id,
    label: v.segment.label,
    Icon: v.segment.icon,
    current: v.progress.pct,
    color: v.segment.accent,
    tooltipLabel: 'Segment',
  }));

  const nextActions = Object.fromEntries(
    views.map((v) => [v.segment.id, { site: v.segment.summary }]),
  );

  const selectedSegment = selected
    ? views.find((v) => v.segment.id === selected)?.segment
    : undefined;

  return (
    <div id={hostId} className={css.wheelHost}>
      {selectedSegment && (
        <style>{`
          #${hostId} :where(.mcw-band[aria-label="${cssAttrEscape(
            selectedSegment.label,
          )}"]) {
            stroke: ${selectedSegment.accent};
            stroke-width: 2.5px;
            stroke-opacity: 0.9;
            fill-opacity: 0.42;
          }
        `}</style>
      )}
      <MemoryRouter>
        <MaqasidComparisonWheel
          centerLabel="TRUE NORTH"
          levelColor={TRUE_NORTH_ACCENT}
          segments={segments}
          nextActions={nextActions}
          showNextCard
          showDiacritics={false}
          forceConverged={ready}
          onSegmentSelect={(arg: string | { id: string }) => {
            const id = (typeof arg === 'string' ? arg : arg.id) as TrueNorthSegmentId;
            onSelect(id === selected ? null : id);
          }}
        />
      </MemoryRouter>

      <button
        type="button"
        className={css.centerHotspot}
        data-ready={ready ? '' : undefined}
        aria-disabled={!ready}
        aria-label={
          ready
            ? 'Open the Fit Gate verdict'
            : 'Answer all segments to unlock the Fit Gate'
        }
        title={
          ready
            ? 'Open Fit Gate'
            : 'Answer all segments to unlock the Fit Gate'
        }
        onClick={() => {
          if (ready) onEnterFitGate();
        }}
      >
        {ready ? (
          <span className={css.centerHint} data-ready="">
            Open Fit Gate <ArrowRight size={12} strokeWidth={2.25} />
          </span>
        ) : (
          <span className={css.centerHint}>
            <Lock size={11} strokeWidth={2} /> Locked
          </span>
        )}
      </button>
    </div>
  );
}
