/**
 * useOfflineBasemapFallback — keep the v3 map usable when signal drops.
 *
 * Stewards lose connectivity unpredictably in the field. The persisted
 * `useBasemapStore` defaults to (and may be left on) `topographic` — a MapTiler
 * vector style. If that basemap's tiles were never warmed for the active
 * project and the device is offline, the map renders blank. This hook detects
 * that case and falls back to `satellite` (Esri), the most reliably warmed
 * bucket (precached first, raster, single source), firing a one-time toast so
 * the switch is never silent.
 *
 * Fires at most once per offline episode: a ref latches when we switch, and
 * resets when the device comes back online, so a steward who reconnects and
 * loses signal again gets a fresh, correct evaluation.
 */

import { useEffect, useRef } from 'react';
import { useConnectivityStore } from '../../../store/connectivityStore.js';
import { useMapCacheStore } from '../../../store/mapCacheStore.js';
import { useBasemapStore } from '../../observe/components/measure/useMapToolStore.js';
import { toast } from '../../../components/Toast.js';

const FALLBACK_BASEMAP = 'satellite' as const;

export function useOfflineBasemapFallback(projectId: string | undefined): void {
  const isOnline = useConnectivityStore((s) => s.isOnline);
  const basemap = useBasemapStore((s) => s.basemap);
  const setBasemap = useBasemapStore((s) => s.setBasemap);
  // Subscribe to the cache ledger so a basemap turning 'ready' re-evaluates.
  const byProject = useMapCacheStore((s) => s.byProject);

  // Latches once we've switched this offline episode; cleared on reconnect.
  const switchedRef = useRef(false);

  useEffect(() => {
    if (isOnline) {
      switchedRef.current = false;
      return;
    }
    if (!projectId) return;
    if (basemap === FALLBACK_BASEMAP) return;
    if (switchedRef.current) return;

    const entry = byProject[projectId]?.[basemap];
    if (entry?.status === 'ready') return; // active basemap is saved — leave it

    // Only fall back if satellite itself is actually saved — switching to a
    // second blank basemap helps no one.
    const satEntry = byProject[projectId]?.[FALLBACK_BASEMAP];
    if (satEntry?.status !== 'ready') return;

    switchedRef.current = true;
    setBasemap(FALLBACK_BASEMAP);
    toast.warning(
      "Switched to Satellite — the selected map isn't saved for offline use.",
    );
  }, [isOnline, projectId, basemap, byProject, setBasemap]);
}
