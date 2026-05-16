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

/** Extract the single building footprint the steward actually clicked.
 *
 *  The MapTiler OpenMapTiles `building` source does NOT deliver one feature
 *  per building: `queryRenderedFeatures` returns a tile-batched MultiPolygon
 *  whose `coordinates` hold *hundreds* of unrelated building footprints under
 *  one feature id. The old `coordinates[0]` shortcut therefore captured an
 *  arbitrary building (usually not the clicked one) — the root cause of the
 *  wrong-building adoption bug.
 *
 *  We instead pick the sub-polygon that contains the click point. When no
 *  sub-polygon contains it (tall buildings viewed under pitch put the clicked
 *  roof pixel's ground `lngLat` outside the footprint) we fall back to the
 *  sub-polygon whose centroid is nearest the click. Both branches are
 *  deterministic, so re-clicking the same building yields the same footprint
 *  — which is what the geometry-based dedup downstream relies on. */
function pickClickedPolygon(
  geom: GeoJSON.Geometry,
  click: [number, number],
): GeoJSON.Polygon | null {
  if (geom.type === 'Polygon') return geom;
  if (geom.type !== 'MultiPolygon' || geom.coordinates.length === 0) return null;

  const point = turf.point(click);
  let nearest: { poly: GeoJSON.Polygon; metres: number } | null = null;
  for (const coords of geom.coordinates) {
    if (!coords || coords.length === 0) continue;
    const poly: GeoJSON.Polygon = { type: 'Polygon', coordinates: coords };
    if (turf.booleanPointInPolygon(point, poly)) return poly;
    try {
      const metres = turf.distance(point, turf.centroid(poly), {
        units: 'meters',
      });
      if (!nearest || metres < nearest.metres) nearest = { poly, metres };
    } catch {
      /* skip degenerate ring */
    }
  }
  return nearest?.poly ?? null;
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
      const polygon = pickClickedPolygon(hit.geometry, [
        e.lngLat.lng,
        e.lngLat.lat,
      ]);
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

      // Dedup identity is the footprint geometry, NOT the basemap feature
      // id. The `building` source batches hundreds of footprints under one
      // tile-local feature id, so the id collides across unrelated
      // buildings. `pickClickedPolygon` is deterministic, so two clicks on
      // the same building yield the same ring — centroid + area is a
      // reliable key.
      const clickedCentroid = turf.centroid(polygon);

      // Dedup guard: if this footprint was already adopted into this
      // project, re-open the existing entity's inline form instead of
      // creating a duplicate. Match on centroid proximity (<=2 m absorbs
      // MVT quantisation jitter for the same footprint) AND relative area
      // (<=5% rejects a small footprint sitting near a large building's
      // centroid). Requiring both kills the wrong-entity bug where a
      // never-adopted building resolved to an already-adopted one via a
      // colliding tile-local feature id. (Stewards still want
      // re-arm-and-edit as a workflow, so route the click into edit.)
      const existingEntity = useBuiltEnvironmentStoreV2
        .getState()
        .entities.find((cand) => {
          if (cand.projectId !== projectId) return false;
          if (cand.kind !== 'building') return false;
          if (cand.state !== 'existing') return false;
          if (cand.geometry?.type !== 'Polygon') return false;
          const candCentroid = turf.centroid(cand.geometry as GeoJSON.Polygon);
          const metres = turf.distance(clickedCentroid, candCentroid, {
            units: 'meters',
          });
          if (metres > 2.0) return false;
          if (areaM2 === undefined) return true;
          let candArea = cand.existing?.areaM2;
          if (candArea === undefined) {
            try {
              candArea = turf.area(cand.geometry as GeoJSON.Polygon);
            } catch {
              candArea = undefined;
            }
          }
          if (candArea === undefined) return true;
          const rel = Math.abs(areaM2 - candArea) / Math.max(areaM2, candArea);
          return rel <= 0.05;
        });
      if (existingEntity) {
        toast.info('Already adopted — opened the existing entry for editing.');
        openBeInlineEditById(existingEntity.id, [e.lngLat.lng, e.lngLat.lat]);
        setActiveTool(null);
        return;
      }

      // Height lives on `proposed.heightM` (the existing block has no height
      // slot in the V2 schema). DesignElementExtrusionLayer reads heightM
      // from `proposed`, so the adopted footprint extrudes correctly even
      // though the entity is `state: 'existing'`. Schema-wise both metadata
      // blocks are independently optional, so this is well-formed.
      const existing = {
        ...(areaM2 !== undefined ? { areaM2 } : {}),
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
      // there's no clickable feature to re-open the inline form. Using the
      // BE adopt tool is an explicit signal the steward cares about BE
      // visibility, so flip the toggle on.
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
