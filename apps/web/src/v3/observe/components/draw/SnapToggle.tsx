/**
 * SnapToggle — the magnet on/off chip shown in the draw dock whenever a v3
 * draw tool is armed (Phase 4). Flips `useMapToolStore.snapEnabled`, the single
 * source of truth read live by both central snap gates —
 * `snapDrawModes.applySnap` (mapbox-draw point/line/polygon modes) and the
 * `useContinuousPointDrawTool` `snap` helper (design-element point drops). Read
 * live means toggling takes effect on the very next pointer event without
 * re-arming the tool: magnet off lets a vertex land exactly where clicked even
 * atop a snap target; magnet on restores snap-to-features.
 *
 * Rendered as a sibling of the tool popover inside the shared dock
 * (`ObserveDrawHost.module.css` `.dock`), so it inherits the dock's
 * `pointer-events: none` and re-enables its own via the button class.
 */

import { Magnet } from 'lucide-react';
import { useMapToolStore } from '../measure/useMapToolStore.js';
import css from './SnapToggle.module.css';

export default function SnapToggle() {
  const snapEnabled = useMapToolStore((s) => s.snapEnabled);
  const setSnapEnabled = useMapToolStore((s) => s.setSnapEnabled);

  return (
    <button
      type="button"
      className={snapEnabled ? css.btnOn : css.btnOff}
      aria-pressed={snapEnabled}
      title={
        snapEnabled
          ? 'Snapping on — new features lock onto existing ones. Click for free placement.'
          : 'Snapping off — features land exactly where clicked. Click to snap to existing features.'
      }
      onClick={() => setSnapEnabled(!snapEnabled)}
    >
      <Magnet size={15} strokeWidth={1.9} aria-hidden="true" />
      <span className={css.label}>{snapEnabled ? 'Snap' : 'Snap off'}</span>
    </button>
  );
}
