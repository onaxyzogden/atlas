/**
 * PlanDataLayers — renders persisted Plan-stage features (water nodes, zones,
 * paths) as MapLibre layers on the Current Land map. Mirrors
 * `DesignElementLayers` but reads from the canonical Plan stores.
 *
 * Sources:
 *   - plan-poly       — polygons (catchments + zones)
 *   - plan-line       — lines (swales + paths)
 *   - plan-point      — points (storage + sink)
 *   - plan-label      — symbol labels (one per feature)
 */

import { useEffect, useMemo } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import * as turf from '@turf/turf';
import { useWaterSystemsStore } from '../../../store/waterSystemsStore.js';
import { useZoneStore } from '../../../store/zoneStore.js';
import { usePathStore } from '../../../store/pathStore.js';
import { useCropStore } from '../../../store/cropStore.js';
import { useClosedLoopStore } from '../../../store/closedLoopStore.js';
import { useLivestockStore } from '../../../store/livestockStore.js';
import { usePolycultureStore } from '../../../store/polycultureStore.js';
import { useStructureStore } from '../../../store/structureStore.js';
import {
  useLayeringLensStore,
  RANK_COLOR,
} from '../../../store/layeringLensStore.js';
import { usePlanSelectionStore } from '../../../store/planSelectionStore.js';
import { useMapToolStore } from '../../observe/components/measure/useMapToolStore.js';
import { useInlineFormStore } from '../draw/inlineFormStore.js';
import {
  STRUCTURE_TEMPLATES,
  createFootprintPolygon,
} from '../../../features/structures/footprints.js';
import type { StructureType } from '../../../store/structureStore.js';

interface Props {
  map: MaplibreMap;
  projectId: string;
}

const SOURCE_PREFIX = 'plan-data-';
const LAYER_PREFIX = 'plan-data-';

const WATER_COLOR: Record<string, string> = {
  catchment: '#5fc7d4',
  storage: '#3a8fb7',
  swale: '#7cb6c8',
  sink: '#205c7a',
};

// Fertility-infra palette: structural practices (composter / hugelkultur /
// biochar / worm_bin) sit on warm earth tones; biological practices
// (cover_crop / chop_and_drop / dynamic_accumulator / rotational_grazing)
// sit on greens. Yeomans rank 7 (Soil).
const FERTILITY_COLOR: Record<string, string> = {
  composter:           '#8a6a3a',
  hugelkultur:         '#6a4a28',
  biochar:             '#3a2a1a',
  worm_bin:            '#a07050',
  cover_crop:          '#7aae3c',
  chop_and_drop:       '#6b8b3d',
  dynamic_accumulator: '#9bc15a',
  rotational_grazing:  '#a8c97f',
};

const FERTILITY_LABEL: Record<string, string> = {
  composter:           'Composter',
  hugelkultur:         'Hugelkultur',
  biochar:             'Biochar',
  worm_bin:            'Worm bin',
  cover_crop:          'Cover crop',
  chop_and_drop:       'Chop & drop',
  dynamic_accumulator: 'Accumulator',
  rotational_grazing:  'Rot. grazing',
};

// Structure category palette. Dwellings on warm clay (rank-5 lens hue);
// utility/infra on cooler steel; agricultural on muted green-clay; civic
// gathering on amber. The Yeomans lens stamps rank 5 on every structure
// so the lens swap recolours all 20 types uniformly.
const STRUCTURE_COLOR: Record<string, string> = {
  cabin:            '#a06b48',
  yurt:             '#b07c4a',
  earthship:        '#8a6a3a',
  tent_glamping:    '#c08a5a',
  pavilion:         '#caa46c',
  classroom:        '#caa46c',
  prayer_space:     '#b58c5e',
  bathhouse:        '#9a8070',
  fire_circle:      '#a85a3a',
  lookout:          '#8a8270',
  greenhouse:       '#7aae3c',
  barn:             '#a07050',
  animal_shelter:   '#9b8a7a',
  workshop:         '#8a8270',
  storage:          '#7a7068',
  compost_station:  '#6a4a28',
  water_pump_house: '#3a8fb7',
  solar_array:      '#3a4a5c',
  well:             '#3a8fb7',
  water_tank:       '#5fc7d4',
};

/**
 * Build a MapLibre `match` expression that maps the per-feature
 * `yeomansRank` to a Yeomans-rank colour. Falls back to `color` if the
 * rank is missing (defensive — every plan-data feature now ships with a
 * rank).
 */
function rankColorExpr(): unknown {
  const branches: unknown[] = [];
  for (const [rank, color] of Object.entries(RANK_COLOR)) {
    branches.push(Number(rank), color);
  }
  return ['match', ['get', 'yeomansRank'], ...branches, ['get', 'color']];
}

export default function PlanDataLayers({ map, projectId }: Props) {
  const waterNodes = useWaterSystemsStore((s) => s.waterNodes);
  const zones = useZoneStore((s) => s.zones);
  const paths = usePathStore((s) => s.paths);
  const cropAreas = useCropStore((s) => s.cropAreas);
  const fertilityInfra = useClosedLoopStore((s) => s.fertilityInfra);
  const paddocks = useLivestockStore((s) => s.paddocks);
  const guilds = usePolycultureStore((s) => s.guilds);
  const updateGuild = usePolycultureStore((s) => s.updateGuild);
  const structures = useStructureStore((s) => s.structures);
  const updateStructure = useStructureStore((s) => s.updateStructure);
  const activeTool = useMapToolStore((s) => s.activeTool);
  const openForm = useInlineFormStore((s) => s.open);
  const lensEnabled = useLayeringLensStore((s) => s.enabled);
  const selected = usePlanSelectionStore((s) => s.selected);
  const setSelected = usePlanSelectionStore((s) => s.setSelected);
  const selectedGuildId =
    selected?.kind === 'guild' ? selected.id : null;

  const { polyFC, lineFC, pointFC, labelFC } = useMemo(() => {
    const polys: GeoJSON.Feature[] = [];
    const lines: GeoJSON.Feature[] = [];
    const points: GeoJSON.Feature[] = [];
    const labels: GeoJSON.Feature[] = [];

    // Zones (polygon) — Yeomans rank 4 (Access; activity proximity).
    for (const z of zones) {
      if (z.projectId !== projectId) continue;
      const props = { id: z.id, color: z.color, label: z.name, yeomansRank: 4 };
      polys.push({ type: 'Feature', id: z.id, properties: props, geometry: z.geometry });
      try {
        const c = turf.centroid(z.geometry).geometry;
        labels.push({ type: 'Feature', id: z.id, properties: props, geometry: c });
      } catch {
        /* skip */
      }
    }

    // Crop areas (polygon) — Module 5 Plant Systems. Yeomans rank 8.
    for (const c of cropAreas) {
      if (c.projectId !== projectId) continue;
      const props = { id: c.id, color: c.color, label: c.name, yeomansRank: 8 };
      polys.push({ type: 'Feature', id: c.id, properties: props, geometry: c.geometry });
      try {
        const ctr = turf.centroid(c.geometry).geometry;
        labels.push({ type: 'Feature', id: c.id, properties: props, geometry: ctr });
      } catch {
        /* skip */
      }
    }

    // Paddocks (polygon) — Module 4 Livestock & Subdivision. Yeomans rank 9.
    for (const pd of paddocks) {
      if (pd.projectId !== projectId) continue;
      const props = { id: pd.id, color: pd.color, label: pd.name, yeomansRank: 9 };
      polys.push({ type: 'Feature', id: pd.id, properties: props, geometry: pd.geometry });
      try {
        const ctr = turf.centroid(pd.geometry).geometry;
        labels.push({ type: 'Feature', id: pd.id, properties: props, geometry: ctr });
      } catch {
        /* skip */
      }
    }

    // Paths (line) — Yeomans rank 4 (Access).
    for (const p of paths) {
      if (p.projectId !== projectId) continue;
      const props = { id: p.id, color: p.color, label: p.name, yeomansRank: 4 };
      lines.push({ type: 'Feature', id: p.id, properties: props, geometry: p.geometry });
    }

    // Structures (polygon) — Yeomans rank 5 (Structures) + 6 (Subsystems).
    // The lens stamps rank 5 uniformly; the per-feature `color` already
    // reflects category (dwelling vs utility) when the lens is OFF.
    for (const st of structures) {
      if (st.projectId !== projectId) continue;
      const color = STRUCTURE_COLOR[st.type] ?? '#a06b48';
      const props = { id: st.id, kind: 'structure', color, label: st.name, yeomansRank: 5 };
      polys.push({ type: 'Feature', id: st.id, properties: props, geometry: st.geometry });
      try {
        const ctr = turf.centroid(st.geometry).geometry;
        labels.push({ type: 'Feature', id: st.id, properties: props, geometry: ctr });
      } catch {
        /* skip */
      }
    }

    // Guilds (point) — Module 5 Plant Systems. Yeomans rank 8 (Vegetation).
    // Render only guilds whose centroidUv can be projected back to lng/lat
    // via current map bounds. The slide-up GuildSpatialBuilderCard remains
    // the canonical layer composer; this is the at-a-glance anchor map.
    let mapBounds: [number, number, number, number] | null = null;
    try {
      const b = map.getBounds();
      mapBounds = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
    } catch {
      mapBounds = null;
    }
    for (const g of guilds) {
      if (g.projectId !== projectId) continue;
      if (!g.centroidUv) continue;
      if (!mapBounds) continue;
      const [w, s, e, n] = mapBounds;
      const lng = w + g.centroidUv[0] * (e - w);
      const lat = n - g.centroidUv[1] * (n - s);
      const props = {
        id: g.id,
        kind: 'guild',
        color: '#3d8a3d',
        label: g.name,
        yeomansRank: 8,
      };
      points.push({
        type: 'Feature',
        id: g.id,
        properties: props,
        geometry: { type: 'Point', coordinates: [lng, lat] },
      });
      labels.push({
        type: 'Feature',
        id: g.id,
        properties: props,
        geometry: { type: 'Point', coordinates: [lng, lat] },
      });
    }

    // Fertility infra (point) — Module 6 Soil & Closed-Loop. Yeomans rank 7.
    for (const f of fertilityInfra) {
      if (f.projectId !== projectId) continue;
      const color = FERTILITY_COLOR[f.type] ?? '#8a6a3a';
      const label = FERTILITY_LABEL[f.type] ?? f.type;
      const props = { id: f.id, kind: 'fertility', color, label, yeomansRank: 7 };
      points.push({
        type: 'Feature',
        id: f.id,
        properties: props,
        geometry: { type: 'Point', coordinates: f.center },
      });
      labels.push({
        type: 'Feature',
        id: f.id,
        properties: props,
        geometry: { type: 'Point', coordinates: f.center },
      });
    }

    // Water nodes — polygons (catchments use stored geometry? They don't —
    // catchment geometry isn't on WaterNode. v1: render storage/sink as
    // points; render swale as a thin line if a length is set; skip catchment
    // polygon rendering until WaterNode carries geometry. The Plan slide-up
    // cards already show catchments as a list; the map shows the rest.
    for (const n of waterNodes) {
      if (n.projectId !== projectId) continue;
      const color = WATER_COLOR[n.kind] ?? '#5fc7d4';
      const props = { id: n.id, color, label: n.name };
      // No geometry stored on WaterNode itself — skip in v1 (the slide-up
      // remains the canonical readout). Future: persist geometry on node.
      void props;
    }

    return {
      polyFC: { type: 'FeatureCollection' as const, features: polys },
      lineFC: { type: 'FeatureCollection' as const, features: lines },
      pointFC: { type: 'FeatureCollection' as const, features: points },
      labelFC: { type: 'FeatureCollection' as const, features: labels },
    };
  }, [waterNodes, zones, paths, cropAreas, fertilityInfra, paddocks, guilds, structures, projectId, map]);

  useEffect(() => {
    if (!map) return;

    const apply = () => {
      if (!map.isStyleLoaded()) return;

      const ensureSource = (id: string, data: GeoJSON.FeatureCollection) => {
        const sid = `${SOURCE_PREFIX}${id}`;
        const existing = map.getSource(sid) as
          | maplibregl.GeoJSONSource
          | undefined;
        if (existing) existing.setData(data);
        else map.addSource(sid, { type: 'geojson', data, promoteId: 'id' });
        return sid;
      };

      const polySid = ensureSource('poly', polyFC);
      const lineSid = ensureSource('line', lineFC);
      const pointSid = ensureSource('point', pointFC);
      const labelSid = ensureSource('label', labelFC);

      const ensureLayer = (spec: maplibregl.LayerSpecification) => {
        if (!map.getLayer(spec.id)) map.addLayer(spec);
      };

      // Colour expression toggles between per-feature `color` (default) and
      // a Yeomans-rank `match` (when the layering lens is enabled).
      const colorExpr = lensEnabled ? rankColorExpr() : ['get', 'color'];

      ensureLayer({
        id: `${LAYER_PREFIX}poly-fill`,
        type: 'fill',
        source: polySid,
        paint: { 'fill-color': colorExpr as never, 'fill-opacity': 0.28 },
      });
      ensureLayer({
        id: `${LAYER_PREFIX}poly-line`,
        type: 'line',
        source: polySid,
        paint: {
          'line-color': colorExpr as never,
          'line-width': 1.5,
          'line-opacity': 0.9,
        },
      });
      ensureLayer({
        id: `${LAYER_PREFIX}line`,
        type: 'line',
        source: lineSid,
        paint: {
          'line-color': colorExpr as never,
          'line-width': 2,
          'line-opacity': 0.9,
        },
      });
      const strokeColorExpr = selectedGuildId
        ? ['case', ['==', ['get', 'id'], selectedGuildId], '#ffd166', '#1f1d1a']
        : '#1f1d1a';
      const strokeWidthExpr = selectedGuildId
        ? ['case', ['==', ['get', 'id'], selectedGuildId], 3, 1.5]
        : 1.5;
      const radiusExpr = selectedGuildId
        ? ['case', ['==', ['get', 'id'], selectedGuildId], 9, 6]
        : 6;

      ensureLayer({
        id: `${LAYER_PREFIX}point`,
        type: 'circle',
        source: pointSid,
        paint: {
          'circle-radius': radiusExpr as never,
          'circle-color': colorExpr as never,
          'circle-stroke-color': strokeColorExpr as never,
          'circle-stroke-width': strokeWidthExpr as never,
          'circle-opacity': 0.95,
        },
      });

      // Re-apply paint properties on existing layers so the toggle takes
      // effect for already-created layers (ensureLayer is a no-op when the
      // layer exists).
      try {
        map.setPaintProperty(`${LAYER_PREFIX}poly-fill`, 'fill-color', colorExpr as never);
        map.setPaintProperty(`${LAYER_PREFIX}poly-line`, 'line-color', colorExpr as never);
        map.setPaintProperty(`${LAYER_PREFIX}line`, 'line-color', colorExpr as never);
        map.setPaintProperty(`${LAYER_PREFIX}point`, 'circle-color', colorExpr as never);
        map.setPaintProperty(`${LAYER_PREFIX}point`, 'circle-stroke-color', strokeColorExpr as never);
        map.setPaintProperty(`${LAYER_PREFIX}point`, 'circle-stroke-width', strokeWidthExpr as never);
        map.setPaintProperty(`${LAYER_PREFIX}point`, 'circle-radius', radiusExpr as never);
      } catch {
        /* layer may have been removed mid-toggle */
      }
      ensureLayer({
        id: `${LAYER_PREFIX}label`,
        type: 'symbol',
        source: labelSid,
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 11,
          'text-offset': [0, 1.1],
          'text-anchor': 'top',
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': '#f2ede3',
          'text-halo-color': 'rgba(31, 29, 26, 0.85)',
          'text-halo-width': 1.2,
        },
      });
    };

    apply();
    const onStyle = () => apply();
    map.on('style.load', onStyle);
    map.on('load', onStyle);
    // If style isn't loaded yet at mount, wait for next idle to retry once.
    let pendingIdle = false;
    if (!map.isStyleLoaded()) {
      pendingIdle = true;
      map.once('idle', onStyle);
    }

    return () => {
      try {
        map.off('style.load', onStyle);
        map.off('load', onStyle);
        if (pendingIdle) map.off('idle', onStyle);
      } catch {
        /* map already disposed */
      }
    };
  }, [map, polyFC, lineFC, pointFC, labelFC, lensEnabled, selectedGuildId]);

  // Click-to-select + drag-to-move for guild points (mirrors AnnotationSectorHandles).
  useEffect(() => {
    if (!map) return;
    const layerId = `${LAYER_PREFIX}point`;
    let dragging = false;

    const onMouseEnter = (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (f?.properties?.kind === 'guild') {
        map.getCanvas().style.cursor = 'move';
      }
    };
    const onMouseLeave = () => {
      if (!dragging) map.getCanvas().style.cursor = '';
    };
    const onMouseDown = (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (!f || f.properties?.kind !== 'guild') return;
      e.preventDefault();
      const guildId = String(f.properties.id);
      setSelected({ kind: 'guild', id: guildId });
      dragging = true;
      map.dragPan.disable();

      const onMove = (ev: maplibregl.MapMouseEvent) => {
        const b = map.getBounds();
        const w = b.getWest();
        const eL = b.getEast();
        const s = b.getSouth();
        const n = b.getNorth();
        const u = (ev.lngLat.lng - w) / (eL - w);
        const v = (n - ev.lngLat.lat) / (n - s);
        const cu = Math.min(1, Math.max(0, u));
        const cv = Math.min(1, Math.max(0, v));
        updateGuild(guildId, { centroidUv: [cu, cv] });
      };
      const onUp = () => {
        map.off('mouseup', onUp);
        dragging = false;
        map.off('mousemove', onMove);
        map.dragPan.enable();
        map.getCanvas().style.cursor = '';
      };
      map.on('mousemove', onMove);
      map.on('mouseup', onUp);
    };
    const onBgClick = (e: maplibregl.MapMouseEvent) => {
      if (!map.getLayer(layerId)) return;
      try {
        const features = map.queryRenderedFeatures(e.point, { layers: [layerId] });
        const hit = features.find((feat) => feat.properties?.kind === 'guild');
        if (!hit) setSelected(null);
      } catch {
        /* layer may have been removed mid-event */
      }
    };

    map.on('mouseenter', layerId, onMouseEnter);
    map.on('mouseleave', layerId, onMouseLeave);
    map.on('mousedown', layerId, onMouseDown);
    map.on('click', onBgClick);

    return () => {
      try {
        map.off('mouseenter', layerId, onMouseEnter);
        map.off('mouseleave', layerId, onMouseLeave);
        map.off('mousedown', layerId, onMouseDown);
        map.off('click', onBgClick);
        map.dragPan.enable();
      } catch {
        /* map already disposed */
      }
    };
  }, [map, setSelected, updateGuild]);

  // Click-to-edit + drag-to-move for placed Structures (poly fill).
  // Gated to `activeTool == null` so a Plan draw tool always wins.
  useEffect(() => {
    if (!map) return;
    if (activeTool !== null) return;
    const layerId = `${LAYER_PREFIX}poly-fill`;

    const TYPE_OPTIONS: { value: StructureType; label: string }[] = [
      { value: 'cabin',            label: 'Cabin' },
      { value: 'yurt',             label: 'Yurt' },
      { value: 'earthship',        label: 'Earthship' },
      { value: 'tent_glamping',    label: 'Tent / Glamping' },
      { value: 'pavilion',         label: 'Pavilion' },
      { value: 'classroom',        label: 'Classroom' },
      { value: 'prayer_space',     label: 'Prayer space' },
      { value: 'bathhouse',        label: 'Bathhouse' },
      { value: 'fire_circle',      label: 'Fire circle' },
      { value: 'lookout',          label: 'Lookout' },
      { value: 'greenhouse',       label: 'Greenhouse' },
      { value: 'barn',             label: 'Barn' },
      { value: 'animal_shelter',   label: 'Animal shelter' },
      { value: 'workshop',         label: 'Workshop' },
      { value: 'storage',          label: 'Storage shed' },
      { value: 'compost_station',  label: 'Compost station' },
      { value: 'water_pump_house', label: 'Pump house' },
      { value: 'solar_array',      label: 'Solar array' },
      { value: 'well',             label: 'Well' },
      { value: 'water_tank',       label: 'Water tank' },
    ];
    const PHASE_OPTIONS = [
      { value: 'Phase 1', label: 'Phase 1' },
      { value: 'Phase 2', label: 'Phase 2' },
      { value: 'Phase 3', label: 'Phase 3' },
      { value: 'Phase 4', label: 'Phase 4' },
    ];
    const midCost = (type: StructureType): number => {
      const [lo, hi] = STRUCTURE_TEMPLATES[type].costRange;
      return Math.round((lo + hi) / 2);
    };

    const DRAG_THRESHOLD_PX = 4;
    let down: { id: string; x: number; y: number; dragging: boolean } | null = null;

    const onMouseEnter = (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (f?.properties?.kind === 'structure') {
        map.getCanvas().style.cursor = 'move';
      }
    };
    const onMouseLeave = () => {
      if (!down?.dragging) map.getCanvas().style.cursor = '';
    };

    const onMouseDown = (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (!f || f.properties?.kind !== 'structure') return;
      e.preventDefault();
      down = {
        id: String(f.properties.id),
        x: e.point.x,
        y: e.point.y,
        dragging: false,
      };

      const onMove = (ev: maplibregl.MapMouseEvent) => {
        if (!down) return;
        const dx = ev.point.x - down.x;
        const dy = ev.point.y - down.y;
        if (!down.dragging && Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
          down.dragging = true;
          map.dragPan.disable();
          map.getCanvas().style.cursor = 'grabbing';
        }
        if (!down.dragging) return;
        const st = useStructureStore
          .getState()
          .structures.find((s) => s.id === down!.id);
        if (!st) return;
        const center: [number, number] = [ev.lngLat.lng, ev.lngLat.lat];
        const geometry = createFootprintPolygon(
          center,
          st.widthM,
          st.depthM,
          st.rotationDeg,
        );
        updateStructure(st.id, { center, geometry });
      };
      const onUp = (ev: maplibregl.MapMouseEvent) => {
        map.off('mousemove', onMove);
        map.off('mouseup', onUp);
        if (!down) return;
        const wasDrag = down.dragging;
        const id = down.id;
        const downXY = { x: down.x, y: down.y };
        down = null;
        map.dragPan.enable();
        map.getCanvas().style.cursor = '';
        if (wasDrag) return;
        // Click (no drag) → open edit popover.
        const st = useStructureStore
          .getState()
          .structures.find((s) => s.id === id);
        if (!st) return;
        const anchor: [number, number] =
          ev?.lngLat
            ? [ev.lngLat.lng, ev.lngLat.lat]
            : (() => {
                try {
                  const { lng, lat } = map.unproject([downXY.x, downXY.y]);
                  return [lng, lat] as [number, number];
                } catch {
                  return st.center;
                }
              })();
        openForm({
          title: 'Edit structure',
          anchor,
          fields: [
            { key: 'name', label: 'Name', kind: 'text', required: true },
            {
              key: 'type',
              label: 'Type',
              kind: 'select',
              required: true,
              options: TYPE_OPTIONS,
            },
            {
              key: 'phase',
              label: 'Phase',
              kind: 'select',
              options: PHASE_OPTIONS,
            },
            {
              key: 'rotationDeg',
              label: 'Rotation (°)',
              kind: 'number',
              placeholder: '0',
              suffix: '°',
            },
          ],
          initial: {
            name: st.name,
            type: st.type,
            phase: st.phase,
            rotationDeg: st.rotationDeg,
          },
          onSave: (values) => {
            const nextType = values.type as StructureType;
            const nextTpl = STRUCTURE_TEMPLATES[nextType] ?? STRUCTURE_TEMPLATES[st.type];
            const rawRot = Number(values.rotationDeg);
            const rotationDeg = Number.isFinite(rawRot)
              ? ((rawRot % 360) + 360) % 360
              : 0;
            const geometry = createFootprintPolygon(
              st.center,
              nextTpl.widthM,
              nextTpl.depthM,
              rotationDeg,
            );
            updateStructure(st.id, {
              name: String(values.name ?? nextTpl.label).trim() || nextTpl.label,
              type: nextType,
              geometry,
              rotationDeg,
              widthM: nextTpl.widthM,
              depthM: nextTpl.depthM,
              phase: String(values.phase ?? 'Phase 1'),
              costEstimate: midCost(nextType),
              infrastructureReqs: [...nextTpl.infrastructureReqs],
            });
          },
          onCancel: () => {
            /* no-op — record already exists */
          },
        });
      };
      map.on('mousemove', onMove);
      map.on('mouseup', onUp);
    };

    map.on('mouseenter', layerId, onMouseEnter);
    map.on('mouseleave', layerId, onMouseLeave);
    map.on('mousedown', layerId, onMouseDown);

    return () => {
      try {
        map.off('mouseenter', layerId, onMouseEnter);
        map.off('mouseleave', layerId, onMouseLeave);
        map.off('mousedown', layerId, onMouseDown);
        map.dragPan.enable();
      } catch {
        /* map already disposed */
      }
    };
  }, [map, activeTool, updateStructure, openForm]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (!map) return;
      try {
        const allLayers = map.getStyle()?.layers ?? [];
        for (const l of allLayers) {
          if (l.id.startsWith(LAYER_PREFIX) && map.getLayer(l.id)) {
            map.removeLayer(l.id);
          }
        }
        const sources = (map.getStyle()?.sources ?? {}) as Record<
          string,
          unknown
        >;
        for (const sid of Object.keys(sources)) {
          if (sid.startsWith(SOURCE_PREFIX) && map.getSource(sid)) {
            map.removeSource(sid);
          }
        }
      } catch {
        /* map already disposed */
      }
    };
  }, [map]);

  return null;
}
