// ActProtoMapMarkers.tsx
//
// PROTOTYPE-ONLY map pins, one per objective, placed at the deterministic
// protoSeed offset from the parcel centroid and coloured by mock priority.
// Clicking a pin selects that objective (flips the right rail to execution
// detail). Mirrors the marker lifecycle of CaptureMapMarkers. Delete w/ folder.

import { useEffect, useRef } from 'react';
import type { PlanStratumObjective } from '@ogden/shared';
import { maplibregl } from '../../../lib/maplibre.js';
import {
  protoPriority,
  protoSeed,
  PROTO_PRIORITY_COLOR,
} from './actProtoMock.js';

interface Props {
  map: maplibregl.Map;
  centroid: [number, number];
  objectives: PlanStratumObjective[];
  activeObjectiveId: string | null;
  onSelectObjective: (objectiveId: string) => void;
}

function buildPin(color: string, isActive: boolean): HTMLDivElement {
  const el = document.createElement('div');
  el.style.width = '18px';
  el.style.height = '18px';
  el.style.borderRadius = '50%';
  el.style.background = color;
  el.style.cursor = 'pointer';
  el.style.boxShadow = '0 1px 4px rgba(0, 0, 0, 0.45)';
  el.style.border = isActive
    ? '3px solid #c4a265'
    : '2px solid rgba(255, 255, 255, 0.85)';
  return el;
}

export default function ActProtoMapMarkers({
  map,
  centroid,
  objectives,
  activeObjectiveId,
  onSelectObjective,
}: Props) {
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const onSelectRef = useRef(onSelectObjective);
  onSelectRef.current = onSelectObjective;

  useEffect(() => {
    const known = markersRef.current;
    const seen = new Set<string>();

    objectives.forEach((objective, index) => {
      seen.add(objective.id);
      // Teardown-and-replace each pass so the active outline stays current;
      // the marker count is tiny, so this is cheaper than mutating in place.
      known.get(objective.id)?.remove();
      const seed = protoSeed(centroid, index);
      const color = PROTO_PRIORITY_COLOR[protoPriority(index)];
      const el = buildPin(color, objective.id === activeObjectiveId);
      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([seed.lng, seed.lat])
        .addTo(map);
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        onSelectRef.current?.(objective.id);
      });
      known.set(objective.id, marker);
    });

    for (const [id, marker] of known.entries()) {
      if (!seen.has(id)) {
        marker.remove();
        known.delete(id);
      }
    }
  }, [map, centroid, objectives, activeObjectiveId]);

  useEffect(() => {
    const known = markersRef.current;
    return () => {
      for (const marker of known.values()) marker.remove();
      known.clear();
    };
  }, []);

  return null;
}
