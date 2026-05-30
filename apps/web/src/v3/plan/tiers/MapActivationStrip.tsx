// MapActivationStrip — Plan-tier wrapper around the OLOS OverlayBundleStrip
// (Plan Navigation Spec v1, Slice 1.6). The strip itself is presentational —
// the steward owns `activeOverlayIds` higher up in ObjectiveDetailPanel so
// the embedded map and the chip strip stay in lockstep without prop drilling
// past one layer. Plan stage tier objectives ship with `defaultOverlayBundle`
// — empty in the Slice 1.1 seed; Slice 1.6 onward populates real bundles.

import type {
  OverlayId,
  PlanStratumObjective,
} from '@ogden/shared';
import OverlayBundleStrip from '../../olos/map/OverlayBundleStrip.js';
import css from './MapActivationStrip.module.css';

interface Props {
  objective: PlanStratumObjective;
  activeOverlayIds: readonly string[];
  onToggleOverlay: (overlayId: OverlayId) => void;
}

export default function MapActivationStrip({
  objective,
  activeOverlayIds,
  onToggleOverlay,
}: Props) {
  return (
    <div className={css.wrap}>
      <p className={css.eyebrow}>Map activation</p>
      <OverlayBundleStrip
        stage="plan"
        bundle={objective.defaultOverlayBundle}
        activeOverlayIds={activeOverlayIds}
        onToggle={onToggleOverlay}
      />
    </div>
  );
}
