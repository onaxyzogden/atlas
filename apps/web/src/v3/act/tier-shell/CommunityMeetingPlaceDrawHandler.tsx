/**
 * CommunityMeetingPlaceDrawHandler — the map-mounted half of the "drop a pin"
 * meeting-place affordance. The work-panel control
 * (`CommunityMeetingPlaceControl`) arms placement via
 * `communityMeetingPlaceStore.armMeetingPinPlacement(projectId)`; this thin
 * shell watches that transient flag and, while armed for THIS project, captures
 * the next map click as the point meeting place.
 *
 * Same store-bridge shape as `ActAsBuiltDrawHandler` (the popover/control owns
 * the button + readout; the handler owns the map interaction). Renders null —
 * a behavioural mount. The `map.on('click')` + crosshair-cursor + teardown
 * idiom mirrors the Act draw tools (e.g. `HarvestLogTool`).
 */

import { useEffect } from 'react';
import type { MapMouseEvent } from 'maplibre-gl';
import { maplibregl } from '../../../lib/maplibre.js';
import { useCommunityMeetingPlaceStore } from '../../../store/communityMeetingPlaceStore.js';

interface Props {
  map: maplibregl.Map;
  projectId: string;
}

export default function CommunityMeetingPlaceDrawHandler({
  map,
  projectId,
}: Props) {
  const armed = useCommunityMeetingPlaceStore(
    (s) => s.armedProjectId === projectId,
  );

  useEffect(() => {
    if (!armed) return;

    const prevCursor = map.getCanvas().style.cursor;
    map.getCanvas().style.cursor = 'crosshair';

    const handler = (e: MapMouseEvent) => {
      const { lng, lat } = e.lngLat;
      const store = useCommunityMeetingPlaceStore.getState();
      store.setMeetingPlace(projectId, {
        kind: 'point',
        coordinates: [lng, lat],
      });
      // setMeetingPlace already disarms, but be explicit for clarity.
      store.disarmMeetingPinPlacement();
    };

    map.on('click', handler);
    return () => {
      map.off('click', handler);
      map.getCanvas().style.cursor = prevCursor;
    };
  }, [armed, map, projectId]);

  return null;
}
