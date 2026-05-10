/**
 * Terrain3DController — one-click camera preset attached to the Plan-stage
 * "3D Terrain" tab. Mounted only when `view === 'terrain3d'`.
 *
 * On mount:
 *  - Eases the camera to pitch 60°, bearing -20°.
 *  - Adds the MapTiler `terrain-rgb-v2` raster-DEM source (named
 *    `mapbox-dem`, matching `features/map/TerrainControls.tsx` so the
 *    two paths share one source if both happen to mount).
 *  - Calls `map.setTerrain({ source, exaggeration: 1.4 })` so placed
 *    extrusions sit on real elevation.
 *
 * On unmount (user clicks back to a Vision/Phase tab):
 *  - Clears terrain (`setTerrain(null)`).
 *  - Eases the camera back to pitch 0, bearing 0.
 *  - Best-effort removes the DEM source, swallowing if another
 *    consumer (TerrainControls) is still using it.
 *
 * Default Vision Layout therefore stays cheap (no DEM tile fetches);
 * 3D is opt-in either via this preset or by manual shift-drag pitch.
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

    // Capture the camera state we entered with so we can restore it
    // when the operator switches tabs back.
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
        // Only remove the DEM source if we were the ones who added it;
        // otherwise leave it for whoever else relies on it.
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
