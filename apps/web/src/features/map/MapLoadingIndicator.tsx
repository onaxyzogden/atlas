/**
 * MapLoadingIndicator — small top-right shimmer chip that signals
 * in-flight tile loads without blocking interaction.
 *
 * Listens to maplibre's `dataloading` / `idle` events on the given map
 * instance and shows/hides a subtle chip. Separate from the full-canvas
 * "Loading map…" overlay which handles the initial style-load state only.
 *
 * Design rule (UX scholar #5): any time the map is showing stale/partial
 * tiles, the user should see something — a passive indicator beats silent
 * half-rendered state. Chip sits top-right so it never obscures the
 * bottom-center DomainFloatingToolbar or the legend areas.
 */

import { useEffect, useState } from 'react';
import type maplibregl from 'maplibre-gl';
import css from './MapLoadingIndicator.module.css';

interface Props {
  map: maplibregl.Map | null;
  /** When true (initial style load in progress), chip is hidden — the
   *  full overlay handles that state. */
  suppressed?: boolean;
}

export default function MapLoadingIndicator({ map, suppressed = false }: Props) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!map) return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    // `dataloading` only fires for the initial style/metadata fetch, not per
    // tile. For tile-level visibility we need `sourcedataloading` (fires when
    // a tile request starts) plus a "is everything loaded now?" check on
    // `sourcedata` / `idle`. This lets the chip show during pan/zoom over
    // uncached areas, which was the actual user-visible gap in v1.
    const show = () => {
      if (timer) return;
      // Debounce 120ms — avoids flashing the chip on trivially-fast tile loads.
      timer = setTimeout(() => {
        setLoading(true);
        timer = null;
      }, 120);
    };
    const hide = () => {
      if (timer) { clearTimeout(timer); timer = null; }
      setLoading(false);
    };
    // Only hide if the map really has nothing left in flight. Prevents the
    // chip from blinking off mid-pan when one tile resolves but others are
    // still pending.
    const maybeHide = () => {
      try {
        if (typeof map.areTilesLoaded === 'function' && !map.areTilesLoaded()) return;
      } catch { /* older maplibre — fall through to hide */ }
      hide();
    };

    map.on('dataloading', show);
    map.on('sourcedataloading', show);
    map.on('sourcedata', maybeHide);
    map.on('idle', hide);
    map.on('error', hide);

    return () => {
      if (timer) clearTimeout(timer);
      map.off('dataloading', show);
      map.off('sourcedataloading', show);
      map.off('sourcedata', maybeHide);
      map.off('idle', hide);
      map.off('error', hide);
    };
  }, [map]);

  if (suppressed || !loading) return null;

  return (
    <div className={css.chip} role="status" aria-live="polite">
      <span className={css.dot} aria-hidden="true" />
      <span className={css.label}>Loading tiles</span>
    </div>
  );
}
