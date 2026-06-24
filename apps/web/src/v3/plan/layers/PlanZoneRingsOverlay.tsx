/**
 * PlanZoneRingsOverlay — Tier C / C5 read-only map layer.
 *
 * Draws five concentric rings (Z1–Z5) around every zone with
 * `permacultureZone === 0` in the active project. The rings give a
 * steward an instant sanity check on Mollison's Zone-distance principle:
 * Z1 within ~30 m of the home centre (daily touch), Z2 within ~100 m
 * (weekly), Z3 within ~300 m (main crops / managed orchard), Z4 within
 * ~600 m (forage / woodlot), Z5 a fixed ~1200 m wild ring. Radii are
 * shared with the ring seeder (`zoneRingConstants`) so the preview rings
 * are exactly what a seed would lay down.
 *
 * Defaults are intentionally rough — a steward planning a Z2 wheelbarrow
 * orchard wants to see whether their proposed orchard polygon falls
 * inside the 100 m ring, not a precise geodesic computation. They are no
 * longer fixed, though: the rings FOLLOW the per-project adjustable radii
 * in `zoneRingConfigStore` (a steward can re-size them before/after
 * seeding), defaulting to the Mollison ladder when untouched — so the
 * reference rings and the seeded zones always agree.
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
import { useZoneRingConfigStore } from '../../../store/zoneRingConfigStore.js';
import {
  DEFAULT_RING_RADII,
  bandsFromRadii,
  ringCircle,
} from './zoneRingConstants.js';

const SOURCE_ID = 'plan-zone-rings-source';
const CASING_LAYER = 'plan-zone-rings-line-casing';
const RING_LAYER = 'plan-zone-rings-line';
const LABEL_LAYER = 'plan-zone-rings-label';

const ALL_LAYERS = [CASING_LAYER, RING_LAYER, LABEL_LAYER] as const;

interface Props {
  map: maplibregl.Map;
  projectId: string;
}

export default function PlanZoneRingsOverlay({ map, projectId }: Props) {
  const visible = useMatrixTogglesStore((s) => s.zoneRings);
  const zones = useZoneStore((s) => s.zones);
  // Follow the per-project adjustable radii so the reference rings track
  // whatever the steward set (default = the Mollison ladder). Reactive:
  // a resize re-renders the overlay in lockstep with the seeded zones.
  const radii = useZoneRingConfigStore(
    (s) => s.byProject[projectId] ?? DEFAULT_RING_RADII,
  );

  const fc = useMemo<GeoJSON.FeatureCollection>(() => {
    const features: GeoJSON.Feature[] = [];
    const bands = bandsFromRadii(radii);
    for (const z of zones) {
      if (z.projectId !== projectId) continue;
      if (z.permacultureZone !== 0) continue;
      const center = turf.centroid(z.geometry);
      for (const band of bands) {
        const ring = ringCircle(center, band.outerM);
        ring.properties = {
          radiusM: band.outerM,
          label: band.label,
          color: band.color,
          anchorZoneId: z.id,
        };
        features.push(ring);
      }
    }
    return { type: 'FeatureCollection', features };
  }, [zones, projectId, radii]);

  useEffect(() => {
    if (!map) return;

    const ensure = () => {
      const src = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      if (!src) {
        map.addSource(SOURCE_ID, { type: 'geojson', data: fc });
      } else {
        src.setData(fc);
      }
      // White casing under the coloured ring — makes the stroke read on
      // dark satellite imagery and light/paper basemaps alike. Solid (not
      // dashed) so it forms a continuous halo behind the dashed colour line.
      if (!map.getLayer(CASING_LAYER)) {
        map.addLayer({
          id: CASING_LAYER,
          type: 'line',
          source: SOURCE_ID,
          paint: {
            'line-color': '#ffffff',
            'line-opacity': 0.55,
            'line-width': [
              'interpolate',
              ['linear'],
              ['zoom'],
              14,
              4,
              19,
              6,
            ],
          },
        });
      }
      if (!map.getLayer(RING_LAYER)) {
        map.addLayer({
          id: RING_LAYER,
          type: 'line',
          source: SOURCE_ID,
          paint: {
            'line-color': ['get', 'color'],
            'line-opacity': 0.95,
            'line-width': [
              'interpolate',
              ['linear'],
              ['zoom'],
              14,
              2,
              19,
              4,
            ],
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
            'text-size': [
              'interpolate',
              ['linear'],
              ['zoom'],
              14,
              10,
              19,
              13,
            ],
            'text-keep-upright': true,
            'text-allow-overlap': true,
            'text-ignore-placement': true,
          },
          paint: {
            'text-color': ['get', 'color'],
            'text-halo-color': '#f2ede3',
            'text-halo-width': 1.8,
          },
        });
      }
      ALL_LAYERS.forEach((id) => {
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
