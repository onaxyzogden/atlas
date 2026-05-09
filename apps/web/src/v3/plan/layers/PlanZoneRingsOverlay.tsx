/**
 * PlanZoneRingsOverlay — Tier C / C5 read-only map layer.
 *
 * Draws three concentric rings (Z1 / Z2 / Z3) around every zone with
 * `permacultureZone === 0` in the active project. The rings give a
 * steward an instant sanity check on Mollison's Zone-distance principle:
 * Z1 within ~30 m of the home centre (daily touch), Z2 within ~100 m
 * (weekly), Z3 within ~500 m (main crops / managed orchard).
 *
 * Defaults are intentionally rough — a steward planning a Z2 wheelbarrow
 * orchard wants to see whether their proposed orchard polygon falls
 * inside the 100 m ring, not a precise geodesic computation. The values
 * are constants here; if a project ever needs custom distances the
 * fix is to lift them onto the LandZone schema.
 *
 * Visibility is gated on the global `zoneRings` toggle in
 * `useMatrixTogglesStore`. Idempotent ensure-on-styledata so basemap
 * swaps don't double-add the source.
 *
 * Multiple Z0 zones produce multiple ring sets (a homestead with two
 * dwellings legitimately has two anchors). Each ring is computed from
 * the zone polygon's centroid via turf.
 */

import { useEffect, useMemo } from 'react';
import * as turf from '@turf/turf';
import { maplibregl } from '../../../lib/maplibre.js';
import { useMatrixTogglesStore } from '../../../store/matrixTogglesStore.js';
import { useZoneStore } from '../../../store/zoneStore.js';

const SOURCE_ID = 'plan-zone-rings-source';
const RING_LAYER = 'plan-zone-rings-line';
const LABEL_LAYER = 'plan-zone-rings-label';

/** [meters, label, color] — Mollison Z1/Z2/Z3 indicative defaults. */
const RINGS: { radiusM: number; label: string; color: string }[] = [
  { radiusM: 30,  label: 'Z1 · 30 m',  color: '#c8a85a' },
  { radiusM: 100, label: 'Z2 · 100 m', color: '#a88a4a' },
  { radiusM: 500, label: 'Z3 · 500 m', color: '#856a3a' },
];

interface Props {
  map: maplibregl.Map;
  projectId: string;
}

export default function PlanZoneRingsOverlay({ map, projectId }: Props) {
  const visible = useMatrixTogglesStore((s) => s.zoneRings);
  const zones = useZoneStore((s) => s.zones);

  const fc = useMemo<GeoJSON.FeatureCollection>(() => {
    const features: GeoJSON.Feature[] = [];
    for (const z of zones) {
      if (z.projectId !== projectId) continue;
      if (z.permacultureZone !== 0) continue;
      const center = turf.centroid(z.geometry);
      for (const r of RINGS) {
        const ring = turf.circle(center, r.radiusM, {
          steps: 64,
          units: 'meters',
        });
        ring.properties = {
          radiusM: r.radiusM,
          label: r.label,
          color: r.color,
          anchorZoneId: z.id,
        };
        features.push(ring);
      }
    }
    return { type: 'FeatureCollection', features };
  }, [zones, projectId]);

  useEffect(() => {
    if (!map) return;

    const ensure = () => {
      const src = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      if (!src) {
        map.addSource(SOURCE_ID, { type: 'geojson', data: fc });
      } else {
        src.setData(fc);
      }
      if (!map.getLayer(RING_LAYER)) {
        map.addLayer({
          id: RING_LAYER,
          type: 'line',
          source: SOURCE_ID,
          paint: {
            'line-color': ['get', 'color'],
            'line-width': 1.5,
            'line-opacity': 0.65,
            'line-dasharray': [4, 3],
          },
        });
      }
      if (!map.getLayer(LABEL_LAYER)) {
        map.addLayer({
          id: LABEL_LAYER,
          type: 'symbol',
          source: SOURCE_ID,
          layout: {
            'symbol-placement': 'line',
            'text-field': ['get', 'label'],
            'text-size': 10,
            'text-keep-upright': true,
            'text-allow-overlap': false,
            'text-ignore-placement': false,
          },
          paint: {
            'text-color': ['get', 'color'],
            'text-halo-color': '#f2ede3',
            'text-halo-width': 1.2,
          },
        });
      }
      [RING_LAYER, LABEL_LAYER].forEach((id) => {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
        }
      });
    };

    const ready = () => (map.getStyle()?.layers?.length ?? 0) > 0;
    if (ready()) ensure();
    const onStyle = () => {
      if (!ready()) return;
      ensure();
    };
    map.on('styledata', onStyle);
    return () => {
      map.off('styledata', onStyle);
    };
  }, [map, fc, visible]);

  return null;
}
