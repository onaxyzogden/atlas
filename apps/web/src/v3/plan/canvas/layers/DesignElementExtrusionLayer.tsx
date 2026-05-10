/**
 * DesignElementExtrusionLayer — renders the subset of placed design
 * elements that have a height in `elementHeights.ts` as MapLibre
 * `fill-extrusion` polygons.
 *
 * Always mounted alongside the flat `DesignElementLayers`. Visibility
 * is not gated by view — pitch is. Top-down (pitch 0°) the extrusions
 * collapse to nothing visually and the flat layer underneath remains
 * the primary affordance; tilt the camera and they pop up. The
 * `terrain3d` tab triggers a camera preset (`Terrain3DController`)
 * that does the tilting in one click.
 *
 * Phase filtering mirrors `DesignElementLayers`: phase-1 caps at
 * `water`, phase-2 caps at `buildings`, vision/terrain3d show all.
 *
 * Geometry handling:
 *  - Polygon kinds extrude as drawn.
 *  - Point kinds inflate to a `footprintM`-sided square via
 *    `squareAround()` (metres-per-degree approximation).
 *  - Line kinds and kinds absent from `ELEMENT_HEIGHTS` are skipped.
 *
 * Selector hygiene: a stable `EMPTY_ELEMENTS` reference is used so
 * Zustand's `useSyncExternalStore` snapshot caching holds for
 * projects with no design elements (mirrors the pattern in
 * `DesignElementLayers.tsx` and `useDesignElementDrawTool.ts`).
 */

import { useEffect, useMemo } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import { useDesignElementsStore } from '../../../../store/designElementsStore.js';
import type { DesignElement } from '../../../../store/designElementsStore.js';
import {
  PHASE_VIEW_CAP,
  phaseIndex,
  type PlanView,
} from '../../types.js';
import { findElementSpec } from '../elementCatalog.js';
import { getElementHeightSpec, EXTRUDED_KINDS } from '../elementHeights.js';

interface Props {
  map: MaplibreMap;
  projectId: string;
  view: PlanView;
}

const SOURCE_ID = 'design-el-extrusion';
const LAYER_ID = 'design-el-extrusion-fill';
/** Inserted just above the flat poly fill so flat fills stay legible
 *  underneath when the camera is top-down. */
const INSERT_BEFORE_LAYER = 'design-el-poly-line';
const EMPTY_ELEMENTS: DesignElement[] = [];

/** ~metres per degree of latitude (constant) and longitude (cos(lat) corrected). */
const M_PER_DEG_LAT = 111_320;
function squareAround(
  lng: number,
  lat: number,
  sizeM: number,
): GeoJSON.Polygon {
  const half = sizeM / 2;
  const dLat = half / M_PER_DEG_LAT;
  const dLng = half / (M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180));
  return {
    type: 'Polygon',
    coordinates: [[
      [lng - dLng, lat - dLat],
      [lng + dLng, lat - dLat],
      [lng + dLng, lat + dLat],
      [lng - dLng, lat + dLat],
      [lng - dLng, lat - dLat],
    ]],
  };
}

export default function DesignElementExtrusionLayer({
  map,
  projectId,
  view,
}: Props) {
  const elements = useDesignElementsStore(
    (s) => s.byProject[projectId] ?? EMPTY_ELEMENTS,
  );

  const fc = useMemo<GeoJSON.FeatureCollection>(() => {
    const cap =
      view === 'phase-1' || view === 'phase-2'
        ? phaseIndex(PHASE_VIEW_CAP[view])
        : Infinity;

    const features: GeoJSON.Feature[] = [];
    for (const el of elements) {
      if (!EXTRUDED_KINDS.has(el.kind)) continue;
      if (phaseIndex(el.phase) > cap) continue;
      const spec = getElementHeightSpec(el.kind);
      if (!spec) continue;
      const colour =
        spec.color ?? findElementSpec(el.kind)?.color ?? '#888';
      const props = {
        id: el.id,
        kind: el.kind,
        color: colour,
        heightM: spec.heightM,
        baseM: spec.baseM ?? 0,
      };

      if (el.geometry.type === 'Polygon') {
        features.push({
          type: 'Feature',
          id: el.id,
          properties: props,
          geometry: el.geometry,
        });
      } else if (el.geometry.type === 'Point') {
        const [lng, lat] = el.geometry.coordinates;
        if (lng == null || lat == null || spec.footprintM <= 0) continue;
        features.push({
          type: 'Feature',
          id: el.id,
          properties: props,
          geometry: squareAround(lng, lat, spec.footprintM),
        });
      }
      // Lines intentionally skipped.
    }
    return { type: 'FeatureCollection', features };
  }, [elements, view]);

  // Apply source + layer; re-apply on style.load so basemap swaps
  // (BaseMapCard) don't drop the extrusion.
  useEffect(() => {
    if (!map) return;

    const apply = () => {
      if ((map.getStyle()?.layers?.length ?? 0) === 0) return;

      const existing = map.getSource(SOURCE_ID) as
        | maplibregl.GeoJSONSource
        | undefined;
      if (existing) {
        existing.setData(fc);
      } else {
        map.addSource(SOURCE_ID, {
          type: 'geojson',
          data: fc,
          promoteId: 'id',
        });
      }

      if (!map.getLayer(LAYER_ID)) {
        const before = map.getLayer(INSERT_BEFORE_LAYER)
          ? INSERT_BEFORE_LAYER
          : undefined;
        map.addLayer(
          {
            id: LAYER_ID,
            type: 'fill-extrusion',
            source: SOURCE_ID,
            paint: {
              'fill-extrusion-color': ['get', 'color'],
              'fill-extrusion-height': ['get', 'heightM'],
              'fill-extrusion-base': ['coalesce', ['get', 'baseM'], 0],
              'fill-extrusion-opacity': 0.85,
            },
          },
          before,
        );
      }
    };

    apply();
    const onStyle = () => apply();
    map.on('style.load', onStyle);

    return () => {
      try {
        map.off('style.load', onStyle);
      } catch {
        /* map disposed */
      }
    };
  }, [map, fc]);

  // Cleanup on unmount: tear down our source + layer so they don't
  // bleed into the Current Land view (which uses a different layer
  // composition).
  useEffect(() => {
    return () => {
      if (!map) return;
      try {
        if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      } catch {
        /* map already disposed */
      }
    };
  }, [map]);

  return null;
}
