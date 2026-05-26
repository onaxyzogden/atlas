/**
 * OverlayBundleStrip — a chip strip above the map view showing each overlay
 * in the active Objective's default bundle. Toggling a chip flips that
 * overlay's visibility on the map.
 *
 * Phase 1.3 ships the chip-strip control surface; Phase 1.4 wires the
 * toggles into the real overlay layer registry (currently a placeholder).
 */

import {
  UNIVERSAL_OVERLAY_LABELS,
  type OverlayBundle,
  type OverlayId,
} from '@ogden/shared';
import css from './OverlayBundleStrip.module.css';

export interface OverlayBundleStripProps {
  bundle: OverlayBundle;
  activeOverlayIds: readonly string[];
  onToggle: (overlayId: OverlayId) => void;
}

export default function OverlayBundleStrip({
  bundle,
  activeOverlayIds,
  onToggle,
}: OverlayBundleStripProps) {
  if (bundle.length === 0) {
    return (
      <div className={css.strip} role="toolbar" aria-label="Overlay bundle">
        <span className={css.empty}>No overlays bound to this objective.</span>
      </div>
    );
  }

  return (
    <div className={css.strip} role="toolbar" aria-label="Overlay bundle">
      <span className={css.lead}>Bundle:</span>
      {bundle.map((overlayId) => {
        const active = activeOverlayIds.includes(overlayId);
        return (
          <button
            key={overlayId}
            type="button"
            className={active ? css.chipActive : css.chip}
            aria-pressed={active}
            onClick={() => onToggle(overlayId)}
          >
            {UNIVERSAL_OVERLAY_LABELS[overlayId]}
          </button>
        );
      })}
    </div>
  );
}
