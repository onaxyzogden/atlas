/**
 * Terrain3DController — one-click camera preset for the Built-Environment
 * 3D affordance. Originally lived under `v3/plan/canvas/`; physically
 * lifted here in Phase 4.1b of ADR
 * `2026-05-10-atlas-built-environment-unification.md` so both Plan and
 * Observe can mount it through the shared barrel.
 *
 * The controller is stage-agnostic: it only depends on the MapLibre map
 * handle and the shared `TERRAIN_DEM_URL` constant. Mount it conditionally
 * (e.g. `view === 'terrain3d'` in Plan, or a Terrain toggle in Observe).
 *
 * On mount:
 *  - Eases the camera to pitch 60°, bearing -20°.
 *  - Adds the MapTiler `terrain-rgb-v2` raster-DEM source (named
 *    `mapbox-dem`, matching `features/map/TerrainControls.tsx` so the
 *    two paths share one source if both happen to mount).
 *  - Calls `map.setTerrain({ source, exaggeration: 1.4 })`.
 *
 * On unmount:
 *  - Clears terrain (`setTerrain(null)`).
 *  - Eases the camera back to its entry pitch + bearing.
 *  - Best-effort removes the DEM source, swallowing if another consumer
 *    (TerrainControls) is still using it.
 */

import { useEffect } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import { TERRAIN_DEM_URL } from '../../../lib/maplibre.js';

interface Props {
  map: MaplibreMap;
}

const DEM_SOURCE = 'mapbox-dem';
const PRESET_PITCH = 60;
const PRESET_BEARING = -20;
const PRESET_EXAGGERATION = 1.4;
const EASE_DURATION_MS = 600;

export default function Terrain3DController({ map }: Props) {
  useEffect(() => {
    if (!map) return;

    const restorePitch = map.getPitch();
    const restoreBearing = map.getBearing();
    const ownsDemSource = !map.getSource(DEM_SOURCE);

    const apply = () => {
      try {
        if (!map.getSource(DEM_SOURCE)) {
          map.addSource(DEM_SOURCE, {
            type: 'raster-dem',
            url: TERRAIN_DEM_URL,
            tileSize: 512,
            maxzoom: 14,
          });
        }
        map.setTerrain({ source: DEM_SOURCE, exaggeration: PRESET_EXAGGERATION });
        map.easeTo({
          pitch: PRESET_PITCH,
          bearing: PRESET_BEARING,
          duration: EASE_DURATION_MS,
        });
      } catch {
        /* style not ready — style.load handler retries */
      }
    };

    apply();
    const onStyle = () => apply();
    map.on('style.load', onStyle);

    return () => {
      try {
        map.off('style.load', onStyle);
        if (map.getTerrain()) map.setTerrain(null);
        map.easeTo({
          pitch: restorePitch,
          bearing: restoreBearing,
          duration: EASE_DURATION_MS,
        });
        if (ownsDemSource && map.getSource(DEM_SOURCE)) {
          map.removeSource(DEM_SOURCE);
        }
      } catch {
        /* map disposed */
      }
    };
  }, [map]);

  return null;
}
