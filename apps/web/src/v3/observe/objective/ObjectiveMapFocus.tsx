/**
 * CaptureMapFocus — drives the camera when an observation need is in focus. On
 * entry (and whenever the target changes) it flies the map to the need's target
 * centre/zoom and drops a pulsing highlight ring there, so the steward
 * immediately sees the exact area to work. A child of DiagnoseMap (receives the
 * live `map`); renders no React DOM of its own.
 */

import { useEffect } from 'react';
import { maplibregl } from '../../../lib/maplibre.js';
import { OBSERVE_MODULE_DOT } from '../moduleGuidance.js';
import type { ObservationNeed } from '../../objectives/fieldObjective.js';
import css from './ObjectiveFocus.module.css';

interface Props {
  map: maplibregl.Map;
  objective: ObservationNeed;
}

export default function CaptureMapFocus({ map, objective }: Props) {
  const lng = objective.target.center[0];
  const lat = objective.target.center[1];
  const zoom = objective.target.zoom ?? 16;
  const color = OBSERVE_MODULE_DOT[objective.module];

  useEffect(() => {
    map.flyTo({ center: [lng, lat], zoom, duration: 1200, essential: true });
  }, [map, lng, lat, zoom]);

  useEffect(() => {
    const el = document.createElement('div');
    el.className = css.focusHighlight ?? '';
    el.style.setProperty('--focus-color', color);
    el.setAttribute('aria-hidden', 'true');
    const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
      .setLngLat([lng, lat])
      .addTo(map);
    return () => {
      marker.remove();
    };
  }, [map, lng, lat, color]);

  return null;
}
