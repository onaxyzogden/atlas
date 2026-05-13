/**
 * AdoptedBuildingsSync — render-prop-free component that runs
 * `syncAdoptedHidings` against the supplied MapLibre map whenever
 * the V2 entity store changes, on initial mount, and on every
 * `style.load` (so basemap swaps don't drop the hide).
 *
 * Originally wired only in the legacy `MapCanvas`, the adopt-basemap
 * sync now also needs to run wherever a project map is mounted in
 * v3 (`DiagnoseMap` instances inside ObserveLayout, VisionLayoutCanvas,
 * etc.) — otherwise `setFeatureState({ adopted: true })` + the
 * filter splice never apply and the basemap building stays visible
 * underneath the project's own extrusion, making adoption feel
 * like a no-op to the steward.
 *
 * Mount once per map with the active `projectId`. Returns `null`.
 */

import { useEffect } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import { useBuiltEnvironmentStoreV2 } from '../../../store/builtEnvironmentStoreV2.js';
import {
  ensureBuildingPromoteId,
  syncAdoptedHidings,
} from '../../../features/map/adoptedBasemapBuildings.js';

interface Props {
  map: MaplibreMap;
  projectId: string;
}

export default function AdoptedBuildingsSync({ map, projectId }: Props) {
  useEffect(() => {
    if (!map || !projectId) return;
    const run = () => {
      ensureBuildingPromoteId(map);
      syncAdoptedHidings(map, projectId);
    };
    run();
    map.on('style.load', run);
    const unsub = useBuiltEnvironmentStoreV2.subscribe(run);
    return () => {
      try {
        map.off('style.load', run);
      } catch {
        /* map disposed */
      }
      unsub();
    };
  }, [map, projectId]);
  return null;
}
