/**
 * AdoptBasemapBuildingTool — captures a 3D building footprint already rendered
 * by the basemap (OpenMapTiles `building` source-layer in MapTiler streets/
 * topo/hybrid styles) and persists it as a `state: 'existing'` Built
 * Environment entity, then opens the inline edit form for labeling.
 *
 * UX: while active, the next single map click runs `queryRenderedFeatures`
 * against the basemap building layer(s). If a hit lands, its Polygon
 * geometry and `render_height` (or `height`) property are copied into a
 * fresh V2 entity (kind: 'building'); the inline-edit popover is opened so
 * the steward can refine kind/subtype/label. The tool then auto-clears.
 *
 * If the active basemap has no building source-layer (satellite), the click
 * surfaces a toast and the tool stays armed so the steward can switch
 * basemaps and try again.
 */

import { useEffect } from 'react';
import * as turf from '@turf/turf';
import type { Map as MaplibreMap, MapMouseEvent } from 'maplibre-gl';
import { useBuiltEnvironmentStoreV2 } from '../../../../store/builtEnvironmentStoreV2.js';
import { useMapToolStore } from '../measure/useMapToolStore.js';
import { openBeInlineEditById } from '../../../builtEnvironment/inline/openBeInlineEdit.js';
import { toast } from '../../../../components/Toast.js';
import { findBuildingLayerIds } from '../../../../features/map/adoptedBasemapBuildings.js';
import css from './ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
}

/** Coerce a Polygon or MultiPolygon GeoJSON into a single Polygon. For
 *  MultiPolygons we keep the first ring set — adoption is best-effort and
 *  most basemap buildings are simple polygons. */
function toSinglePolygon(
  geom: GeoJSON.Geometry,
): GeoJSON.Polygon | null {
  if (geom.type === 'Polygon') return geom;
  if (geom.type === 'MultiPolygon' && geom.coordinates.length > 0) {
    const first = geom.coordinates[0];
    if (!first) return null;
    return { type: 'Polygon', coordinates: first };
  }
  return null;
}

function readHeight(props: Record<string, unknown> | null | undefined): number | undefined {
  if (!props) return undefined;
  const candidates = [props['render_height'], props['height'], props['min_height']];
  for (const v of candidates) {
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v;
  }
  return undefined;
}

export default function AdoptBasemapBuildingTool({ map, projectId }: Props) {
  const setActiveTool = useMapToolStore((s) => s.setActiveTool);

  useEffect(() => {
    const onClick = (e: MapMouseEvent) => {
      const layerIds = findBuildingLayerIds(map);
      if (layerIds.length === 0) {
        toast.warning(
          'No building layer in this basemap. Switch to Street, Topo, or Hybrid and try again.',
        );
        return;
      }
      const hits = map.queryRenderedFeatures(e.point, { layers: layerIds });
      const hit = hits[0];
      if (!hit) {
        toast.info('No building under the cursor — click directly on a building footprint.');
        return;
      }
      const polygon = toSinglePolygon(hit.geometry);
      if (!polygon) {
        toast.error('Building footprint geometry not supported.');
        return;
      }
      const heightM = readHeight(hit.properties);
      let areaM2: number | undefined;
      try {
        areaM2 = turf.area(polygon);
      } catch {
        areaM2 = undefined;
      }

      // Stable id for the basemap tile feature — needed by v2 so the
      // basemap sync (`adoptedBasemapBuildings.ts`) can hide the
      // underlying extrusion via `setFeatureState` + a filter clause.
      // MapTiler's OpenMapTiles source promotes osm_id onto `feature.id`
      // for buildings, but we fall back to common property names just in
      // case. If none resolve, the entity still saves; the basemap
      // building just stays visible.
      const props = hit.properties as Record<string, unknown> | null;
      const rawId =
        hit.id ??
        (props && typeof props['osm_id'] !== 'undefined' ? props['osm_id'] : undefined) ??
        (props && typeof props['id'] !== 'undefined' ? props['id'] : undefined);
      const adoptedFromBasemapId =
        typeof rawId === 'string' || typeof rawId === 'number' ? rawId : undefined;
      if (adoptedFromBasemapId === undefined) {
        toast.info('Adopted — basemap building couldn’t be hidden (no feature id).');
      }

      // Height lives on `proposed.heightM` (the existing block has no height
      // slot in the V2 schema). DesignElementExtrusionLayer reads heightM
      // from `proposed`, so the adopted footprint extrudes correctly even
      // though the entity is `state: 'existing'`. Schema-wise both metadata
      // blocks are independently optional, so this is well-formed.
      const existing = {
        ...(areaM2 !== undefined ? { areaM2 } : {}),
        ...(adoptedFromBasemapId !== undefined ? { adoptedFromBasemapId } : {}),
      };
      const entity = useBuiltEnvironmentStoreV2.getState().create({
        projectId,
        kind: 'building',
        state: 'existing',
        geometry: polygon,
        label: 'Adopted building',
        ...(Object.keys(existing).length > 0 ? { existing } : {}),
        ...(heightM !== undefined ? { proposed: { heightM } } : {}),
      });

      // Anchor the inline form at the click point so it surfaces near where
      // the steward looked, not at the polygon centroid (which can be off-
      // screen for large buildings).
      openBeInlineEditById(entity.id, [e.lngLat.lng, e.lngLat.lat]);

      // One-shot: clear the active tool so the next click is a normal pan/
      // select. Steward re-arms via the rail if they want to adopt another.
      setActiveTool(null);
    };

    map.getCanvas().style.cursor = 'crosshair';
    map.on('click', onClick);
    return () => {
      map.off('click', onClick);
      try {
        map.getCanvas().style.cursor = '';
      } catch {
        /* canvas may already be torn down */
      }
    };
  }, [map, projectId, setActiveTool]);

  return (
    <div className={css.popover} role="dialog" aria-label="Adopt from map">
      <span className={css.title}>Adopt from map</span>
      <span className={css.hint}>
        Click a 3D building on the basemap to capture its footprint as an
        existing structure. The inline form will open so you can label it.
      </span>
    </div>
  );
}
