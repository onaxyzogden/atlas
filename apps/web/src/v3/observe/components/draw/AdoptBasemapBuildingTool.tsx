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
import { useMatrixTogglesStore } from '../../../../store/matrixTogglesStore.js';
import { useMapToolStore } from '../measure/useMapToolStore.js';
import { openBeInlineEditById } from '../../../builtEnvironment/inline/openBeInlineEdit.js';
import { useInlineFormStore } from '../../../plan/draw/inlineFormStore.js';
import { buildBuildingEditSchema } from '../../../plan/layers/inlineEditSchemas.js';
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

      // Dedup guard: if this basemap building (same osm_id) was already
      // adopted into this project, re-open the existing entity's inline
      // form instead of creating a duplicate. Without this guard, repeated
      // adopts of the same footprint pile up entities at identical
      // geometry, and a subsequent click resolves to an arbitrary one of
      // the stack via MapLibre's `feature[0]` — the steward then sees
      // their edit land on a different building than the one they
      // clicked. (Stewards still want re-arm-and-edit as a workflow, so
      // we route the click into edit rather than ignoring it.)
      if (adoptedFromBasemapId !== undefined) {
        const existingEntity = useBuiltEnvironmentStoreV2
          .getState()
          .entities.find(
            (e) =>
              e.projectId === projectId &&
              e.kind === 'building' &&
              e.state === 'existing' &&
              e.existing?.adoptedFromBasemapId === adoptedFromBasemapId,
          );
        if (existingEntity) {
          toast.info('Already adopted — opened the existing entry for editing.');
          openBeInlineEditById(existingEntity.id, [e.lngLat.lng, e.lngLat.lat]);
          setActiveTool(null);
          return;
        }
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

      // ObserveAnnotationLayers gates the 2D BE-building fill behind the
      // `builtEnvironment` matrix toggle, which defaults to false. Without
      // turning it on, the adopted footprint never renders top-down and
      // there's no clickable feature to re-open the inline form — the
      // basemap building was hidden by `AdoptedBuildingsSync` the instant
      // the entity landed, so the steward sees a blank patch and assumes
      // Save did nothing. Using the BE adopt tool is an explicit signal
      // the steward cares about BE visibility, so flip the toggle on.
      const toggles = useMatrixTogglesStore.getState();
      if (!toggles.builtEnvironment) toggles.toggle('builtEnvironment');

      // Anchor the inline form at the click point so it surfaces near where
      // the steward looked, not at the polygon centroid (which can be off-
      // screen for large buildings).
      //
      // Wrap the schema's onCancel so Cancel discards the just-created
      // entity. The shared `buildBuildingEditSchema` assumes the record
      // already exists — true for edit flows, but for *fresh adopts* we
      // only persist on Save. Without this, hitting Cancel would leave a
      // stub "Adopted building" in the store. The wrap is local to this
      // adopt path; re-opening an already-adopted building via the dedup
      // branch above keeps the default no-op cancel.
      const schema = buildBuildingEditSchema(entity);
      useInlineFormStore.getState().open({
        ...schema,
        anchor: [e.lngLat.lng, e.lngLat.lat],
        onCancel: () => {
          useBuiltEnvironmentStoreV2.getState().delete(entity.id);
        },
      });

      // One-shot: clear the active tool so the next click is a normal pan/
      // select. Steward re-arms via the rail if they want to adopt another.
      setActiveTool(null);
    };

    // Cursor is owned by useMapCursor — this tool's activeTool starts with
    // 'observe.' so drawArmed → 'crosshair' is computed there.
    map.on('click', onClick);
    return () => {
      map.off('click', onClick);
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
