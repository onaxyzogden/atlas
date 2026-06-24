/**
 * useKeyedStyleErrorFallback — recover the v3 map when a keyed basemap style
 * fails to load, instead of letting it silently die.
 *
 * The persisted `useBasemapStore` defaults to a *keyed* MapTiler style
 * (`topographic`) whenever a MapTiler key is present (see useMapToolStore's
 * `basemap: hasMapToken ? 'topographic' : 'satellite'`). If that key is
 * referrer-locked — the deployed demo key is locked to `*.ogden.ag` — the keyed
 * style 403s on any other origin (e.g. `localhost`) and never loads. When the
 * style never loads, `map.on('load')` never fires, so MapboxDraw's
 * `map.addControl(draw)` in `useMapboxDrawTool` throws and its try/catch bails
 * *before* attaching the `draw.create` listener. The net effect is that EVERY
 * draw tool (zone-seed, boundary, water, fences…) is silently starved: the
 * click never reaches `onComplete`, so nothing is ever stored — which is why
 * "Seed zones from home" appears to do nothing and "Clear seeded zones" then
 * reports "No seeded zones".
 *
 * This hook listens to the map's `error` events; on a style/tile load failure
 * while the active basemap is *keyed* (≠ `satellite`), it switches once to
 * keyless Satellite (Esri imagery — no token, cannot 403), which restores the
 * map and, with it, the draw engine. A one-shot backstop timer covers failure
 * modes that never surface an `error` event (DNS, opaque CORS). Satellite is
 * keyless, so the fallback can never loop.
 *
 * Sibling to `useOfflineBasemapFallback` (same `setBasemap` + one-time-toast
 * idiom); that one handles *offline* blank-tile recovery, this one handles
 * *online* keyed-style auth failures. Mounted at the shared v3 map seam
 * (`DiagnoseMap`), so the Plan Current + Vision canvases — the operator's draw
 * path — both benefit from a single mount.
 */

import { useEffect, useRef } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import { useBasemapStore } from '../../observe/components/measure/useMapToolStore.js';
import { toast } from '../../../components/Toast.js';

const FALLBACK_BASEMAP = 'satellite' as const;
/**
 * Grace period after which an un-loaded keyed style is treated as failed even
 * if no `error` event surfaced. A healthy MapTiler style loads in well under a
 * second; 4s is comfortably past that without making a genuine failure feel
 * sluggish.
 */
const STYLE_LOAD_BACKSTOP_MS = 4000;

/**
 * True when a MapLibre error looks like an auth/availability failure of the
 * keyed style or its tiles (the signals a referrer-locked or expired MapTiler
 * key produces).
 */
function isKeyedStyleLoadError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  // MapLibre wraps failed style/tile fetches in an AJAXError carrying the HTTP
  // status and the offending URL.
  const status = (err as { status?: number }).status;
  if (status === 401 || status === 403 || status === 404) return true;
  const url = (err as { url?: string }).url;
  if (typeof url === 'string' && url.includes('api.maptiler.com')) return true;
  const message = (err as { message?: string }).message;
  if (typeof message === 'string' && /maptiler|forbidden|unauthor/i.test(message)) {
    return true;
  }
  return false;
}

export function useKeyedStyleErrorFallback(map: MaplibreMap | null): void {
  const basemap = useBasemapStore((s) => s.basemap);
  const setBasemap = useBasemapStore((s) => s.setBasemap);
  // Latches once we've switched, so the storm of per-tile error events (and the
  // backstop timer) only triggers a single store write. Reset at the top of the
  // effect whenever the active basemap is keyed, so a deliberate manual switch
  // back to a keyed style re-arms the guard.
  const switchedRef = useRef(false);

  useEffect(() => {
    if (!map) return;
    if (basemap === FALLBACK_BASEMAP) return; // already keyless — nothing to guard
    switchedRef.current = false;

    const switchToSatellite = () => {
      if (switchedRef.current) return;
      switchedRef.current = true;
      setBasemap(FALLBACK_BASEMAP);
      toast.warning(
        "Map key isn't authorized for this domain — switched to keyless Satellite.",
      );
    };

    const onError = (e: { error?: unknown }) => {
      if (switchedRef.current) return;
      if (isKeyedStyleLoadError(e?.error)) switchToSatellite();
    };
    map.on('error', onError);

    // Backstop: a 403 normally emits an `error`, but some failure modes (DNS,
    // opaque CORS) may not. If the keyed style still hasn't loaded after the
    // grace period, force the fallback.
    const timer = window.setTimeout(() => {
      if (!switchedRef.current && !map.isStyleLoaded()) switchToSatellite();
    }, STYLE_LOAD_BACKSTOP_MS);

    return () => {
      map.off('error', onError);
      window.clearTimeout(timer);
    };
  }, [map, basemap, setBasemap]);
}
