/**
 * ActMapStrip — overlay-count strip between the objective header and the
 * task list per spec §5.4.1. Mirrors Plan's `MapActivationStrip` /
 * `OverlayBundleStrip` pattern but is read-only here — toggling overlays
 * happens inside the full-screen Act map view (opened by the "Open map
 * view" CTA).
 *
 * Slice 3.3 keeps the chips informational (label + count). Slice 3.4 will
 * wire the proof-tool drawing toolbar into this strip's bundle so the
 * activated overlays double as capture surfaces.
 */

import { Map as MapIcon } from 'lucide-react';
import {
  UNIVERSAL_OVERLAY_LABELS,
  type OverlayBundle,
  type OverlayId,
} from '@ogden/shared';
import css from './ActMapStrip.module.css';

interface Props {
  bundle: OverlayBundle;
  onOpenMapView: () => void;
}

export default function ActMapStrip({ bundle, onOpenMapView }: Props) {
  const count = bundle.length;
  return (
    <div className={css.strip} role="toolbar" aria-label="Map overlays">
      {count === 0 ? (
        <span className={css.empty}>No overlays bound to this objective.</span>
      ) : (
        <>
          <span className={css.lead}>
            {count} overlay{count === 1 ? '' : 's'} active on the map
          </span>
          {bundle.map((id: OverlayId) => (
            <span key={id} className={css.chip}>
              {UNIVERSAL_OVERLAY_LABELS[id]}
            </span>
          ))}
        </>
      )}
      <button
        type="button"
        className={css.openMap}
        onClick={onOpenMapView}
        data-testid="act-open-map-view"
      >
        <MapIcon size={12} strokeWidth={2} aria-hidden="true" />
        <span>Open map view</span>
      </button>
    </div>
  );
}
