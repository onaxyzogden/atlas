/**
 * AdoptBasemapWaterTool — captures a water feature already rendered by the
 * basemap (OpenMapTiles `water` polygon source-layer or `waterway` line
 * source-layer) and persists it into `waterSystemsStore`, then opens the
 * inline edit form for labelling.
 *
 * UX: while active, the next single map click runs `queryRenderedFeatures`
 * against the basemap water layers in priority order — polygon hits first
 * (a lake or pond under the cursor wins over a stream that runs through
 * it), then line hits as a fallback. Polygon hits create a `Waterbody`
 * with inferred kind (lake / pond / wetland / reservoir / other); line
 * hits create a `Watercourse` with inferred kind (stream / ditch / other).
 * Dedup uses centroid proximity (polygons) or start/end-point proximity
 * (lines) so re-clicking the same basemap feature reopens the same record
 * instead of duplicating it.
 *
 * If the active basemap has no water source-layer the click surfaces a
 * toast and the tool stays armed so the steward can switch basemaps and
 * try again.
 */

import { useEffect } from 'react';
import * as turf from '@turf/turf';
import type { Map as MaplibreMap, MapMouseEvent } from 'maplibre-gl';
import {
  useWaterSystemsStore,
  type Waterbody,
  type Watercourse,
} from '../../../../store/waterSystemsStore.js';
import { useMatrixTogglesStore } from '../../../../store/matrixTogglesStore.js';
import { useMapToolStore } from '../measure/useMapToolStore.js';
import { useAnnotationFormStore } from '../../../../store/annotationFormStore.js';
import { toast } from '../../../../components/Toast.js';
import {
  findWaterPolygonLayerIds,
  findWaterwayLineLayerIds,
  inferWaterbodyKind,
  inferWatercourseKind,
} from '../../../../features/map/adoptedBasemapWater.js';
import {
  pickClickedPolygon,
  pickClickedLine,
} from '../../../../features/map/pickClickedFeature.js';
import css from './ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
}

const nowIso = () => new Date().toISOString();

export default function AdoptBasemapWaterTool({ map, projectId }: Props) {
  const setActiveTool = useMapToolStore((s) => s.setActiveTool);

  useEffect(() => {
    const onClick = (e: MapMouseEvent) => {
      const polyLayerIds = findWaterPolygonLayerIds(map);
      const lineLayerIds = findWaterwayLineLayerIds(map);
      if (polyLayerIds.length === 0 && lineLayerIds.length === 0) {
        toast.warning(
          'No water layer in this basemap. Switch to Topographic, Terrain, Street, or Hybrid and try again.',
        );
        return;
      }

      const click: [number, number] = [e.lngLat.lng, e.lngLat.lat];

      // Polygon hits win — a lake or pond under the cursor should be
      // adopted as a Waterbody even if a stream's path runs across the
      // same pixel. Falls through to waterway lines on no polygon hit.
      const polyHits =
        polyLayerIds.length > 0
          ? map.queryRenderedFeatures(e.point, { layers: polyLayerIds })
          : [];
      if (polyHits[0]) {
        adoptPolygon(polyHits[0], click);
        return;
      }

      const lineHits =
        lineLayerIds.length > 0
          ? map.queryRenderedFeatures(e.point, { layers: lineLayerIds })
          : [];
      if (lineHits[0]) {
        adoptLine(lineHits[0], click);
        return;
      }

      toast.info(
        'No water feature under the cursor — click directly on a basemap stream, lake, or pond.',
      );
    };

    const adoptPolygon = (
      hit: maplibregl.MapGeoJSONFeature,
      click: [number, number],
    ) => {
      const polygon = pickClickedPolygon(hit.geometry, click);
      if (!polygon) {
        toast.error('Water polygon geometry not supported.');
        return;
      }
      let areaM2: number | undefined;
      try {
        areaM2 = turf.area(polygon);
      } catch {
        areaM2 = undefined;
      }
      const clickedCentroid = turf.centroid(polygon);

      // Dedup against already-adopted waterbodies for this project. Mirror
      // the building-adopt heuristic: centroid <=2 m absorbs MVT
      // quantisation jitter; relative area <=5 % rejects an unrelated small
      // pond whose centroid happens to fall near a large lake's centre.
      const existing = useWaterSystemsStore
        .getState()
        .waterbodies.find((cand) => {
          if (cand.projectId !== projectId) return false;
          if (cand.geometry?.type !== 'Polygon') return false;
          const candCentroid = turf.centroid(cand.geometry as GeoJSON.Polygon);
          const metres = turf.distance(clickedCentroid, candCentroid, {
            units: 'meters',
          });
          if (metres > 2.0) return false;
          if (areaM2 === undefined) return true;
          let candArea: number | undefined;
          try {
            candArea = turf.area(cand.geometry as GeoJSON.Polygon);
          } catch {
            candArea = undefined;
          }
          if (candArea === undefined) return true;
          const rel = Math.abs(areaM2 - candArea) / Math.max(areaM2, candArea);
          return rel <= 0.05;
        });
      if (existing) {
        toast.info('Already adopted — opened the existing entry for editing.');
        openWaterbodyForm(existing);
        flipWaterToggle();
        setActiveTool(null);
        return;
      }

      const kind = inferWaterbodyKind(hit.properties);
      const entity: Waterbody = {
        id: crypto.randomUUID(),
        projectId,
        geometry: polygon,
        kind,
        createdAt: nowIso(),
      };
      useWaterSystemsStore.getState().addWaterbody(entity);
      openWaterbodyForm(entity);
      flipWaterToggle();
      setActiveTool(null);
    };

    const adoptLine = (
      hit: maplibregl.MapGeoJSONFeature,
      click: [number, number],
    ) => {
      const line = pickClickedLine(hit.geometry, click);
      if (!line || line.coordinates.length < 2) {
        toast.error('Waterway geometry not supported.');
        return;
      }
      const start = line.coordinates[0] as [number, number];
      const end = line.coordinates[line.coordinates.length - 1] as [
        number,
        number,
      ];

      // Dedup against existing watercourses by start/end-point proximity.
      // A reasonable threshold for the basemap's MVT quantisation jitter
      // is ~5 m; raising this would risk matching unrelated tributaries
      // that briefly run near each other.
      const existing = useWaterSystemsStore
        .getState()
        .watercourses.find((cand) => {
          if (cand.projectId !== projectId) return false;
          const cs = cand.geometry.coordinates[0] as [number, number];
          const ce = cand.geometry.coordinates[
            cand.geometry.coordinates.length - 1
          ] as [number, number];
          const dStart = turf.distance(turf.point(start), turf.point(cs), {
            units: 'meters',
          });
          const dEnd = turf.distance(turf.point(end), turf.point(ce), {
            units: 'meters',
          });
          return dStart <= 5 && dEnd <= 5;
        });
      if (existing) {
        toast.info('Already adopted — opened the existing entry for editing.');
        openWatercourseForm(existing);
        flipWaterToggle();
        setActiveTool(null);
        return;
      }

      const kind = inferWatercourseKind(hit.properties);
      const entity: Watercourse = {
        id: crypto.randomUUID(),
        projectId,
        geometry: line,
        kind,
        perennial: true,
        createdAt: nowIso(),
      };
      useWaterSystemsStore.getState().addWatercourse(entity);
      openWatercourseForm(entity);
      flipWaterToggle();
      setActiveTool(null);
    };

    const openWaterbodyForm = (rec: Waterbody) => {
      useAnnotationFormStore.getState().open({
        kind: 'waterbody',
        geometry: rec.geometry,
        mode: 'edit',
        existingId: rec.id,
        projectId,
        discardOnCancel: true,
      });
    };

    const openWatercourseForm = (rec: Watercourse) => {
      useAnnotationFormStore.getState().open({
        kind: 'watercourse',
        geometry: rec.geometry,
        mode: 'edit',
        existingId: rec.id,
        projectId,
        discardOnCancel: true,
      });
    };

    /** Using this tool is an explicit signal the steward cares about water
     *  visibility; flip the `water` matrix toggle on if it was off. Same
     *  idiom as the building adopt tool's `builtEnvironment` toggle flip. */
    const flipWaterToggle = () => {
      const toggles = useMatrixTogglesStore.getState();
      if (!toggles.water) toggles.toggle('water');
    };

    map.on('click', onClick);
    return () => {
      map.off('click', onClick);
    };
  }, [map, projectId, setActiveTool]);

  return (
    <div className={css.popover} role="dialog" aria-label="Adopt water from map">
      <span className={css.title}>Adopt water from map</span>
      <span className={css.hint}>
        Click a stream or a lake/pond/wetland on the basemap to capture it as a
        steward-owned feature. The inline form will open so you can label it.
      </span>
    </div>
  );
}
