/**
 * BeV2GenericLayer — 2D top-down render + click-to-edit pipeline for the
 * 23 BE kinds without bespoke per-kind machinery.
 *
 * Phase 5.2.B of ADR `2026-05-10-atlas-built-environment-unification.md`.
 *
 * Why a separate layer:
 *   - Observe's `ObserveAnnotationLayers.tsx` only iterates the legacy 8
 *     BE collections (buildings/wells/septics/power-lines/buried-utilities/
 *     fences/gates/driveways) — those keep their bespoke styled layers,
 *     selection halo, and slide-up form. The other 23 registry kinds have
 *     no per-kind layer there.
 *   - The shared `DesignElementExtrusionLayer` + `DesignElementScenegraphLayer`
 *     cover those 23 kinds in 3D when the camera is pitched, but collapse
 *     to nothing top-down. This generic layer is the flat 2D fallback so
 *     a steward sees the placed entity at default Observe pitch (0°).
 *
 * What it draws:
 *   - Subscribes to `useBuiltEnvironmentStoreV2` and projects entities
 *     matching `projectId` AND `state` filter AND `!LEGACY_OBSERVE_BE_KINDS`
 *     into three FeatureCollections (polygon/line/point).
 *   - Three MapLibre layers — fill (polygon), line (line), circle (point) —
 *     each painted from the `color` property populated from the kind
 *     registry's `getBuiltEnvironmentKind(kind).color`.
 *
 * Click pipeline:
 *   - Each of the three layers gets a click handler that calls
 *     `openBeInlineEditById(props.id, [lng, lat])` from the shared
 *     `openBeInlineEdit` helper. That dispatches to a per-kind builder if
 *     one exists in `inlineEditSchemas.ts`, otherwise falls through to
 *     `buildGenericBeEditSchema`.
 *
 * Halo wiring is intentionally skipped — the floating popover provides
 * sufficient visual feedback for the steward; revisit if usage shows the
 * lack of selection ring is confusing.
 */

import { useEffect, useMemo } from 'react';
import type { Map as MaplibreMap, MapLayerMouseEvent } from 'maplibre-gl';
import {
  useBuiltEnvironmentStoreV2,
  type BuiltEnvironmentV2State,
} from '../../../store/builtEnvironmentStoreV2.js';
import {
  getBuiltEnvironmentKind,
  LEGACY_OBSERVE_BE_KINDS,
  type BuiltEnvironmentEntity,
} from '@ogden/shared';
import { openBeInlineEditById } from '../inline/openBeInlineEdit.js';
import { usePlanSelectionStore } from '../../../store/planSelectionStore.js';

export type StateFilter = 'existing' | 'proposed' | 'all';

interface Props {
  map: MaplibreMap;
  projectId: string;
  /** Default 'existing' — Observe's primary slice. Plan can mount with
   *  'proposed' or 'all' as needed. */
  stateFilter?: StateFilter;
}

const SOURCE_POLY = 'be-v2-generic-poly';
const SOURCE_LINE = 'be-v2-generic-line';
const SOURCE_POINT = 'be-v2-generic-point';
const LAYER_POLY_FILL = 'be-v2-generic-poly-fill';
const LAYER_POLY_LINE = 'be-v2-generic-poly-line';
const LAYER_LINE = 'be-v2-generic-line';
const LAYER_POINT = 'be-v2-generic-point';

const CLICK_LAYERS = [
  LAYER_POLY_FILL,
  LAYER_LINE,
  LAYER_POINT,
] as const;

const selectEntities = (s: BuiltEnvironmentV2State) => s.entities;

interface FeatureProps {
  id: string;
  kind: string;
  color: string;
}

export default function BeV2GenericLayer({
  map,
  projectId,
  stateFilter = 'existing',
}: Props) {
  const entities = useBuiltEnvironmentStoreV2(selectEntities);

  const { polyFc, lineFc, pointFc } = useMemo(() => {
    const poly: GeoJSON.Feature[] = [];
    const line: GeoJSON.Feature[] = [];
    const point: GeoJSON.Feature[] = [];

    for (const e of entities as BuiltEnvironmentEntity[]) {
      if (e.projectId !== projectId) continue;
      if (stateFilter !== 'all' && e.state !== stateFilter) continue;
      if (LEGACY_OBSERVE_BE_KINDS.has(e.kind)) continue;

      const spec = getBuiltEnvironmentKind(e.kind);
      if (!spec) continue;

      const props: FeatureProps = {
        id: e.id,
        kind: e.kind,
        color: spec.color ?? '#888',
      };
      const feat: GeoJSON.Feature = {
        type: 'Feature',
        id: e.id,
        properties: props,
        geometry: e.geometry,
      };

      if (e.geometry.type === 'Polygon') poly.push(feat);
      else if (e.geometry.type === 'LineString') line.push(feat);
      else if (e.geometry.type === 'Point') point.push(feat);
    }

    return {
      polyFc: { type: 'FeatureCollection' as const, features: poly },
      lineFc: { type: 'FeatureCollection' as const, features: line },
      pointFc: { type: 'FeatureCollection' as const, features: point },
    };
  }, [entities, projectId, stateFilter]);

  // Apply sources + layers; re-apply on style.load.
  useEffect(() => {
    if (!map) return;

    const apply = () => {
      if ((map.getStyle()?.layers?.length ?? 0) === 0) return;

      // Sources
      const ensureSource = (id: string, data: GeoJSON.FeatureCollection) => {
        const src = map.getSource(id) as
          | maplibregl.GeoJSONSource
          | undefined;
        if (src) src.setData(data);
        else
          map.addSource(id, {
            type: 'geojson',
            data,
            promoteId: 'id',
          });
      };
      ensureSource(SOURCE_POLY, polyFc);
      ensureSource(SOURCE_LINE, lineFc);
      ensureSource(SOURCE_POINT, pointFc);

      // Layers
      if (!map.getLayer(LAYER_POLY_FILL)) {
        map.addLayer({
          id: LAYER_POLY_FILL,
          type: 'fill',
          source: SOURCE_POLY,
          paint: {
            'fill-color': ['get', 'color'],
            'fill-opacity': 0.45,
          },
        });
      }
      if (!map.getLayer(LAYER_POLY_LINE)) {
        map.addLayer({
          id: LAYER_POLY_LINE,
          type: 'line',
          source: SOURCE_POLY,
          paint: {
            'line-color': ['get', 'color'],
            'line-width': 1.5,
          },
        });
      }
      if (!map.getLayer(LAYER_LINE)) {
        map.addLayer({
          id: LAYER_LINE,
          type: 'line',
          source: SOURCE_LINE,
          paint: {
            'line-color': ['get', 'color'],
            'line-width': 3,
          },
        });
      }
      if (!map.getLayer(LAYER_POINT)) {
        map.addLayer({
          id: LAYER_POINT,
          type: 'circle',
          source: SOURCE_POINT,
          paint: {
            'circle-color': ['get', 'color'],
            'circle-radius': 6,
            'circle-stroke-width': 1.5,
            'circle-stroke-color': '#1f2937',
          },
        });
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
  }, [map, polyFc, lineFc, pointFc]);

  // Click → inline-edit. One handler per click-bearing layer; cursor hint
  // on hover.
  useEffect(() => {
    if (!map) return;

    const onClick = (e: MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (!f) return;
      const props = (f.properties ?? {}) as Partial<FeatureProps>;
      const id = props.id;
      if (!id) return;
      // Use the click lng/lat as the popover anchor — matches Phase 4.4
      // behaviour for the bespoke 8.
      const anchor: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      usePlanSelectionStore.getState().set([
        { kind: 'design-element', id, projectId },
      ]);
      openBeInlineEditById(id, anchor);
    };
    const onEnter = () => {
      map.getCanvas().style.cursor = 'pointer';
    };
    const onLeave = () => {
      map.getCanvas().style.cursor = '';
    };

    for (const id of CLICK_LAYERS) {
      map.on('click', id, onClick);
      map.on('mouseenter', id, onEnter);
      map.on('mouseleave', id, onLeave);
    }
    return () => {
      for (const id of CLICK_LAYERS) {
        try {
          map.off('click', id, onClick);
          map.off('mouseenter', id, onEnter);
          map.off('mouseleave', id, onLeave);
        } catch {
          /* map disposed */
        }
      }
    };
  }, [map, projectId]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (!map) return;
      try {
        for (const lid of [
          LAYER_POLY_FILL,
          LAYER_POLY_LINE,
          LAYER_LINE,
          LAYER_POINT,
        ]) {
          if (map.getLayer(lid)) map.removeLayer(lid);
        }
        for (const sid of [SOURCE_POLY, SOURCE_LINE, SOURCE_POINT]) {
          if (map.getSource(sid)) map.removeSource(sid);
        }
      } catch {
        /* map disposed */
      }
    };
  }, [map]);

  return null;
}
