/**
 * DesignElementExtrusionLayer (shared) — renders Built-Environment
 * entities with a height in `elementHeights.ts` as MapLibre
 * `fill-extrusion` polygons.
 *
 * Lifted to the shared dir in Phase 4.1b of ADR
 * `2026-05-10-atlas-built-environment-unification.md`. Reads directly
 * from `useBuiltEnvironmentStoreV2` — both Plan and Observe mount this
 * single instance via the shared barrel and pass `stateFilter` to scope
 * the slice they care about.
 *
 * Behaviour mirrors the previous Plan-only implementation:
 *   - `EXTRUDED_KINDS` membership gates participation.
 *   - Entries with `mode: 'glb'` are skipped here (rendered by
 *     `DesignElementScenegraphLayer`); this layer is the procedural fallback.
 *   - Polygon kinds extrude as drawn; Point kinds inflate to a
 *     `footprintM`-sided square; LineString kinds are skipped.
 *   - Top-down (pitch 0°) the extrusions collapse to nothing visually
 *     and the underlying flat fill remains the primary affordance.
 *
 * Stage filtering:
 *   - `stateFilter`: 'existing' | 'proposed' | 'all'. Default 'all' so
 *     a single shared mount surfaces both Observe annotations and Plan
 *     proposals if both stages happen to share a canvas.
 *   - `view`: optional Plan phase (PHASE_VIEW_CAP applies only to
 *     `state === 'proposed'` entries). Existing-state entities are
 *     always visible regardless of view; phase capping is a Plan-stage
 *     concept.
 */

import { useEffect, useMemo } from 'react';
import type { Map as MaplibreMap, MapLayerMouseEvent } from 'maplibre-gl';
import {
  useBuiltEnvironmentStoreV2,
  type BuiltEnvironmentV2State,
} from '../../../store/builtEnvironmentStoreV2.js';
import { openBeInlineEditById } from '../inline/openBeInlineEdit.js';
import {
  PHASE_VIEW_CAP,
  phaseIndex,
  type PhaseKey,
  type PlanView,
} from '../../plan/types.js';
import { findElementSpec } from '../../plan/canvas/elementCatalog.js';
import {
  getElementHeightSpec,
  EXTRUDED_KINDS,
} from '../../plan/canvas/elementHeights.js';

export type StateFilter = 'existing' | 'proposed' | 'all';

interface Props {
  map: MaplibreMap;
  projectId: string;
  /** Default 'all' — render both states. */
  stateFilter?: StateFilter;
  /** Plan-stage phase cap. Applied only to proposed-state entries. */
  view?: PlanView;
}

const SOURCE_ID = 'design-el-extrusion';
const LAYER_ID = 'design-el-extrusion-fill';
/** Inserted just above the flat poly fill so flat fills stay legible
 *  underneath when the camera is top-down. */
const INSERT_BEFORE_LAYER = 'design-el-poly-line';

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

const selectEntities = (s: BuiltEnvironmentV2State) => s.entities;

export default function DesignElementExtrusionLayer({
  map,
  projectId,
  stateFilter = 'all',
  view,
}: Props) {
  const entities = useBuiltEnvironmentStoreV2(selectEntities);

  const fc = useMemo<GeoJSON.FeatureCollection>(() => {
    const cap =
      view === 'phase-1' || view === 'phase-2'
        ? phaseIndex(PHASE_VIEW_CAP[view])
        : Infinity;

    const features: GeoJSON.Feature[] = [];
    for (const e of entities) {
      if (e.projectId !== projectId) continue;
      if (stateFilter !== 'all' && e.state !== stateFilter) continue;
      if (!EXTRUDED_KINDS.has(e.kind)) continue;
      const spec = getElementHeightSpec(e.kind);
      if (!spec) continue;
      // GLB-mode kinds are rendered by `DesignElementGlbLayer`. Skip them
      // here so the two layers don't double-draw the same kind.
      if (spec.mode === 'glb') continue;

      // Phase capping: only meaningful for proposed entries (Plan stage).
      // Existing-state entries always pass.
      if (e.state === 'proposed' && cap !== Infinity) {
        const phase = (e.proposed?.phase ?? 'buildings') as PhaseKey;
        if (phaseIndex(phase) > cap) continue;
      }

      const colour =
        spec.color ?? findElementSpec(e.kind)?.color ?? '#888';
      // Prefer the entity's recorded height when present — adopted basemap
      // buildings capture the basemap's `render_height` onto
      // `proposed.heightM`, and user-drawn structures may also tweak height
      // via the inline edit form. Spec height is the fallback for kinds
      // without per-entity sizing.
      const entityHeightM =
        typeof e.proposed?.heightM === 'number' && e.proposed.heightM > 0
          ? e.proposed.heightM
          : undefined;
      const props = {
        id: e.id,
        kind: e.kind,
        color: colour,
        heightM: entityHeightM ?? spec.heightM,
        baseM: spec.baseM ?? 0,
      };

      if (e.geometry.type === 'Polygon') {
        features.push({
          type: 'Feature',
          id: e.id,
          properties: props,
          geometry: e.geometry,
        });
      } else if (e.geometry.type === 'Point') {
        const [lng, lat] = e.geometry.coordinates;
        if (lng == null || lat == null || spec.footprintM <= 0) continue;
        features.push({
          type: 'Feature',
          id: e.id,
          properties: props,
          geometry: squareAround(lng, lat, spec.footprintM),
        });
      }
      // Lines intentionally skipped.
    }
    return { type: 'FeatureCollection', features };
  }, [entities, projectId, stateFilter, view]);

  // Apply source + layer; re-apply on style.load so basemap swaps
  // don't drop the extrusion.
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

  // Click → inline-edit; hover → cursor pointer. Mirrors BeV2GenericLayer.
  // Needed so adopted/extruded buildings remain selectable at non-top-down
  // pitches, where the 3D extrusion intercepts clicks instead of letting
  // them fall through to the flat 2D fill underneath.
  useEffect(() => {
    if (!map) return;

    const onClick = (e: MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (!f) return;
      const props = (f.properties ?? {}) as { id?: string };
      const id = props.id;
      if (!id) return;
      openBeInlineEditById(id, [e.lngLat.lng, e.lngLat.lat]);
    };
    const onEnter = () => {
      map.getCanvas().style.cursor = 'pointer';
    };
    const onLeave = () => {
      map.getCanvas().style.cursor = '';
    };

    map.on('click', LAYER_ID, onClick);
    map.on('mouseenter', LAYER_ID, onEnter);
    map.on('mouseleave', LAYER_ID, onLeave);
    return () => {
      try {
        map.off('click', LAYER_ID, onClick);
        map.off('mouseenter', LAYER_ID, onEnter);
        map.off('mouseleave', LAYER_ID, onLeave);
      } catch {
        /* map disposed */
      }
    };
  }, [map]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (!map) return;
      try {
        if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      } catch {
        /* map disposed */
      }
    };
  }, [map]);

  return null;
}
