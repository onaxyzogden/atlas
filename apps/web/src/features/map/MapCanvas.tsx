/**
 * MapCanvas — the MapboxGL root.
 * All map features (layers, draw tools, terrain, measurement, spiritual)
 * depend on this initialization pattern.
 */

import { useRef, useEffect, useMemo } from 'react';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { useMaplibre } from './hooks/useMaplibre.js';
import { maplibregl, MAP_STYLES, hasMapToken, maptilerKey } from '../../lib/maplibre.js';
import MapTokenMissing from '../../components/MapTokenMissing.js';
import MapLoadingIndicator from './MapLoadingIndicator.js';
import loadingCss from './MapLoadingOverlay.module.css';
import { useZoneStore } from '../../store/zoneStore.js';
import { useMapStore } from '../../store/mapStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { STRUCTURE_TEMPLATES, createFootprintPolygon } from '../structures/footprints.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { useCropStore } from '../../store/cropStore.js';
import { CROP_TYPES } from '../livestock/speciesData.js';
import { usePathStore, PATH_TYPE_CONFIG } from '../../store/pathStore.js';
import { useUtilityStore, UTILITY_TYPE_CONFIG } from '../../store/utilityStore.js';
import { useCommentStore } from '../../store/commentStore.js';
import { map as mapTokens, zone as zoneTokens, structure as structureTokens, earth, group } from '../../lib/tokens.js';

interface MapCanvasProps {
  projectId?: string;
  initialCenter?: [number, number]; // [lng, lat]
  initialZoom?: number;
  boundaryGeojson?: GeoJSON.FeatureCollection | null;
  boundaryColor?: string;
  address?: string | null;
  canEdit?: boolean;
  onMapReady?: (map: maplibregl.Map, draw: MapboxDraw) => void;
  onMarkerCreated?: (marker: maplibregl.Marker) => void;
}

export default function MapCanvas({ projectId, initialCenter, initialZoom, boundaryGeojson, boundaryColor, address, canEdit = true, onMapReady, onMarkerCreated }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { map, draw, isLoaded, mapError } = useMaplibre({ containerRef, initialCenter, initialZoom });
  const mapReadyFiredRef = useRef(false);

  // Notify parent when map is ready
  useEffect(() => {
    if (map && draw && isLoaded && onMapReady && !mapReadyFiredRef.current) {
      mapReadyFiredRef.current = true;
      onMapReady(map, draw);
    }
  }, [map, draw, isLoaded, onMapReady]);
  // Render boundary + zones + structures on map. Re-adds after style changes.
  const allZones = useZoneStore((s) => s.zones);
  const zones = useMemo(() => projectId ? allZones.filter((z) => z.projectId === projectId) : [], [allZones, projectId]);
  const allStructures = useStructureStore((s) => s.structures);
  const structures = useMemo(() => projectId ? allStructures.filter((s) => s.projectId === projectId) : [], [allStructures, projectId]);
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const paddocks = useMemo(() => projectId ? allPaddocks.filter((p) => p.projectId === projectId) : [], [allPaddocks, projectId]);
  const allCrops = useCropStore((s) => s.cropAreas);
  const cropAreas = useMemo(() => projectId ? allCrops.filter((c) => c.projectId === projectId) : [], [allCrops, projectId]);
  const allPaths = usePathStore((s) => s.paths);
  const designPaths = useMemo(() => projectId ? allPaths.filter((p) => p.projectId === projectId) : [], [allPaths, projectId]);
  const allUtilities = useUtilityStore((s) => s.utilities);
  const designUtilities = useMemo(() => projectId ? allUtilities.filter((u) => u.projectId === projectId) : [], [allUtilities, projectId]);
  const allComments = useCommentStore((s) => s.comments);
  const mapComments = useMemo(() => projectId ? allComments.filter((c) => c.projectId === projectId && c.location && !c.resolved) : [], [allComments, projectId]);
  const hasFittedRef = useRef(false);

  useEffect(() => {
    if (!map || !isLoaded) return;

    const addAllLayers = () => {
      // ── Boundary ──
      if (boundaryGeojson) {
        if (!map.getSource('project-boundary')) {
          map.addSource('project-boundary', { type: 'geojson', data: boundaryGeojson });
        }
        const bColor = boundaryColor ?? mapTokens.boundary;
        if (!map.getLayer('project-boundary-fill')) {
          map.addLayer({
            id: 'project-boundary-fill',
            type: 'fill',
            source: 'project-boundary',
            paint: { 'fill-color': bColor, 'fill-opacity': 0.15 },
          });
        } else {
          map.setPaintProperty('project-boundary-fill', 'fill-color', bColor);
        }
        if (!map.getLayer('project-boundary-line')) {
          map.addLayer({
            id: 'project-boundary-line',
            type: 'line',
            source: 'project-boundary',
            paint: { 'line-color': bColor, 'line-width': 2.5 },
          });
        } else {
          map.setPaintProperty('project-boundary-line', 'line-color', bColor);
        }
        // Fit once
        if (!hasFittedRef.current) {
          try {
            const bbox = computeBBox(boundaryGeojson);
            if (bbox) map.fitBounds(bbox, { padding: 60, maxZoom: 16 });
          } catch (err) { console.warn('[OGDEN] Boundary bbox fit failed:', err); }
          hasFittedRef.current = true;
        }
      }

      // ── Zones ──
      for (const zone of zones) {
        const sourceId = `zone-${zone.id}`;
        const zoneData: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { name: zone.name }, geometry: zone.geometry }] };
        const existingZone = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
        if (existingZone) { existingZone.setData(zoneData); continue; }
        map.addSource(sourceId, { type: 'geojson', data: zoneData });
        map.addLayer({ id: `zone-fill-${zone.id}`, type: 'fill', source: sourceId, paint: { 'fill-color': zone.color, 'fill-opacity': 0.25 } });
        map.addLayer({ id: `zone-line-${zone.id}`, type: 'line', source: sourceId, paint: { 'line-color': zone.color, 'line-width': 2 } });
        map.addLayer({
          id: `zone-label-${zone.id}`, type: 'symbol', source: sourceId,
          layout: { 'text-field': zone.name, 'text-size': 11, 'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'], 'text-anchor': 'center' },
          paint: { 'text-color': mapTokens.label, 'text-halo-color': mapTokens.labelHalo, 'text-halo-width': 1.5 },
        });
      }

      // ── Structures ──
      for (const structure of structures) {
        const sourceId = `structure-${structure.id}`;
        const tmpl = STRUCTURE_TEMPLATES[structure.type];
        const color = (tmpl?.category && structureTokens[tmpl.category as keyof typeof structureTokens]) ?? structureTokens.infrastructure;
        const structData: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { name: structure.name }, geometry: structure.geometry }] };
        const existingStruct = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
        if (existingStruct) { existingStruct.setData(structData); continue; }
        map.addSource(sourceId, { type: 'geojson', data: structData });
        map.addLayer({ id: `structure-fill-${structure.id}`, type: 'fill', source: sourceId, paint: { 'fill-color': color, 'fill-opacity': 0.45 } });
        map.addLayer({ id: `structure-line-${structure.id}`, type: 'line', source: sourceId, paint: { 'line-color': color, 'line-width': 2 } });
        map.addLayer({
          id: `structure-label-${structure.id}`, type: 'symbol', source: sourceId,
          layout: { 'text-field': structure.name, 'text-size': 10, 'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'], 'text-anchor': 'center' },
          paint: { 'text-color': mapTokens.label, 'text-halo-color': mapTokens.labelHalo, 'text-halo-width': 1.5 },
        });
      }

      // ── Paddocks ──
      for (const paddock of paddocks) {
        const sourceId = `paddock-${paddock.id}`;
        const pColor = paddock.color ?? zoneTokens.livestock;
        const paddockData: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { name: paddock.name }, geometry: paddock.geometry }] };
        const existingPaddock = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
        if (existingPaddock) { existingPaddock.setData(paddockData); continue; }
        map.addSource(sourceId, { type: 'geojson', data: paddockData });
        map.addLayer({ id: `paddock-fill-${paddock.id}`, type: 'fill', source: sourceId, paint: { 'fill-color': pColor, 'fill-opacity': 0.2 } });
        map.addLayer({ id: `paddock-line-${paddock.id}`, type: 'line', source: sourceId, paint: { 'line-color': pColor, 'line-width': 2, 'line-dasharray': [4, 2] } });
        map.addLayer({
          id: `paddock-label-${paddock.id}`, type: 'symbol', source: sourceId,
          layout: { 'text-field': paddock.name, 'text-size': 10, 'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'], 'text-anchor': 'center' },
          paint: { 'text-color': mapTokens.label, 'text-halo-color': mapTokens.labelHalo, 'text-halo-width': 1.5 },
        });
      }

      // ── Crop Areas ──
      for (const crop of cropAreas) {
        const sourceId = `crop-${crop.id}`;
        const ct = CROP_TYPES[crop.type];
        const color = crop.color ?? ct?.color ?? zoneTokens.food_production;
        const cropData: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { name: crop.name }, geometry: crop.geometry }] };
        const existingCrop = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
        if (existingCrop) { existingCrop.setData(cropData); continue; }
        map.addSource(sourceId, { type: 'geojson', data: cropData });
        map.addLayer({ id: `crop-fill-${crop.id}`, type: 'fill', source: sourceId, paint: { 'fill-color': color, 'fill-opacity': 0.2 } });
        map.addLayer({ id: `crop-line-${crop.id}`, type: 'line', source: sourceId, paint: { 'line-color': color, 'line-width': 1.5 } });
        map.addLayer({
          id: `crop-label-${crop.id}`, type: 'symbol', source: sourceId,
          layout: { 'text-field': crop.name, 'text-size': 10, 'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'], 'text-anchor': 'center' },
          paint: { 'text-color': mapTokens.label, 'text-halo-color': mapTokens.labelHalo, 'text-halo-width': 1.5 },
        });
      }

      // ── Paths ──
      for (const path of designPaths) {
        const sourceId = `path-${path.id}`;
        const cfg = PATH_TYPE_CONFIG[path.type];
        const pathData: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { name: path.name }, geometry: path.geometry }] };
        const existingPath = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
        if (existingPath) { existingPath.setData(pathData); continue; }
        map.addSource(sourceId, { type: 'geojson', data: pathData });
        const paintProps: Record<string, unknown> = { 'line-color': path.color ?? cfg.color, 'line-width': cfg.width };
        if (cfg.dashArray.length > 0) paintProps['line-dasharray'] = cfg.dashArray;
        map.addLayer({ id: `path-line-${path.id}`, type: 'line', source: sourceId, paint: paintProps as maplibregl.LineLayerSpecification['paint'] });
        map.addLayer({
          id: `path-label-${path.id}`, type: 'symbol', source: sourceId,
          layout: { 'text-field': path.name, 'text-size': 10, 'symbol-placement': 'line', 'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'] },
          paint: { 'text-color': mapTokens.label, 'text-halo-color': mapTokens.labelHalo, 'text-halo-width': 1.5 },
        });
      }

      // ── Utilities ──
      for (const utility of designUtilities) {
        const sourceId = `utility-${utility.id}`;
        const cfg = UTILITY_TYPE_CONFIG[utility.type];
        const utilData: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { name: utility.name }, geometry: { type: 'Point', coordinates: utility.center } }] };
        const existingUtil = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
        if (existingUtil) { existingUtil.setData(utilData); continue; }
        map.addSource(sourceId, { type: 'geojson', data: utilData });
        map.addLayer({
          id: `utility-circle-${utility.id}`, type: 'circle', source: sourceId,
          paint: { 'circle-radius': 6, 'circle-color': cfg?.color ?? group.livestock, 'circle-stroke-width': 2, 'circle-stroke-color': mapTokens.label },
        });
        map.addLayer({
          id: `utility-label-${utility.id}`, type: 'symbol', source: sourceId,
          layout: { 'text-field': utility.name, 'text-size': 10, 'text-offset': [0, 1.5], 'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'], 'text-anchor': 'top' },
          paint: { 'text-color': mapTokens.label, 'text-halo-color': mapTokens.labelHalo, 'text-halo-width': 1.5 },
        });
      }

      // ── Comment Markers ──
      for (const comment of mapComments) {
        if (!comment.location) continue;
        const sourceId = `comment-${comment.id}`;
        const commentData: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { text: comment.text }, geometry: { type: 'Point', coordinates: comment.location } }] };
        const existingComment = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
        if (existingComment) { existingComment.setData(commentData); continue; }
        map.addSource(sourceId, { type: 'geojson', data: commentData });
        map.addLayer({
          id: `comment-circle-${comment.id}`, type: 'circle', source: sourceId,
          paint: { 'circle-radius': 8, 'circle-color': group.livestock, 'circle-stroke-width': 2, 'circle-stroke-color': mapTokens.label, 'circle-opacity': 0.8 },
        });
        map.addLayer({
          id: `comment-icon-${comment.id}`, type: 'symbol', source: sourceId,
          layout: { 'text-field': '\u{1F4AC}', 'text-size': 12, 'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'], 'text-anchor': 'center' },
        });
      }
    };

    // Add layers now if style is ready, and re-add after any style change.
    // Use a short retry to handle the race between style load and data hydration.
    const tryAdd = () => {
      if (map.isStyleLoaded()) {
        addAllLayers();
      }
    };

    tryAdd();
    // Retry shortly after — covers the case where store hydrates after map loads
    const retryTimer = setTimeout(tryAdd, 500);
    const retryTimer2 = setTimeout(tryAdd, 1500);

    map.on('style.load', addAllLayers);

    return () => {
      clearTimeout(retryTimer);
      clearTimeout(retryTimer2);
      map.off('style.load', addAllLayers);
    };
  }, [map, isLoaded, boundaryGeojson, boundaryColor, zones, structures, paddocks, cropAreas, designPaths, designUtilities, mapComments]);

  // ── Basemap swap — owned here, not in useMaplibre, so the
  // `style.load` re-hydration listener registered above (line 245)
  // is guaranteed to be live before `setStyle` is invoked. Effects in
  // the same component fire in registration order, so this effect
  // runs strictly AFTER the addAllLayers effect on every render —
  // no timing window where the swap can fire without a handler.
  //
  // `{ diff: false }` forces a full style reload every time, which:
  //   1. Guarantees `style.load` fires (diff-mode can elide it).
  //   2. Wipes user-added sources/layers cleanly so addAllLayers
  //      re-adds them at the top of the layer stack — the previous
  //      diff-mode behaviour silently re-ordered them under opaque
  //      basemap layers, hiding boundary/zone/structure renders.
  // (Chrome audit, 2026-04-25.)
  const activeStyle = useMapStore((s) => s.style);
  const lastAppliedStyleRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!map || !isLoaded) return;
    // First post-load run: the map was constructed with `activeStyle`
    // already (see useMaplibre.ts), so no swap is needed — just record
    // the baseline. Without this guard, `{ diff: false }` would force
    // a redundant full reload on initial mount, flickering the
    // just-added boundary off and back on.
    if (lastAppliedStyleRef.current === undefined) {
      lastAppliedStyleRef.current = activeStyle;
      return;
    }
    if (lastAppliedStyleRef.current === activeStyle) return;
    lastAppliedStyleRef.current = activeStyle;
    map.setStyle(
      MAP_STYLES[activeStyle] ?? MAP_STYLES['satellite']!,
      { diff: false },
    );
  }, [map, isLoaded, activeStyle]);

  // ── Phase filter — toggle layer visibility ──
  const activePhaseFilter = useMapStore((s) => s.activePhaseFilter);

  useEffect(() => {
    if (!map || !isLoaded) return;

    const setVis = (layerId: string, visible: boolean) => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
      }
    };

    // Filter zones
    for (const zone of zones) {
      const vis = activePhaseFilter === 'all' || zone.primaryUse === activePhaseFilter;
      setVis(`zone-fill-${zone.id}`, vis);
      setVis(`zone-line-${zone.id}`, vis);
      setVis(`zone-label-${zone.id}`, vis);
    }

    // Filter structures
    for (const s of structures) {
      const vis = activePhaseFilter === 'all' || s.phase === activePhaseFilter;
      setVis(`structure-fill-${s.id}`, vis);
      setVis(`structure-line-${s.id}`, vis);
      setVis(`structure-label-${s.id}`, vis);
    }

    // Filter paddocks
    for (const p of paddocks) {
      const vis = activePhaseFilter === 'all' || p.phase === activePhaseFilter;
      setVis(`paddock-fill-${p.id}`, vis);
      setVis(`paddock-line-${p.id}`, vis);
      setVis(`paddock-label-${p.id}`, vis);
    }

    // Filter crop areas
    for (const c of cropAreas) {
      const vis = activePhaseFilter === 'all' || c.phase === activePhaseFilter;
      setVis(`crop-fill-${c.id}`, vis);
      setVis(`crop-line-${c.id}`, vis);
      setVis(`crop-label-${c.id}`, vis);
    }

    // Filter paths
    for (const p of designPaths) {
      const vis = activePhaseFilter === 'all' || p.phase === activePhaseFilter;
      setVis(`path-line-${p.id}`, vis);
      setVis(`path-label-${p.id}`, vis);
    }

    // Filter utilities
    for (const u of designUtilities) {
      const vis = activePhaseFilter === 'all' || u.phase === activePhaseFilter;
      setVis(`utility-circle-${u.id}`, vis);
      setVis(`utility-label-${u.id}`, vis);
    }
  }, [map, isLoaded, activePhaseFilter, zones, structures, paddocks, cropAreas, designPaths, designUtilities]);

  // ── Structure drag-to-relocate ──
  const updateStructure = useStructureStore((s) => s.updateStructure);
  const dragRef = useRef<{ structureId: string; startLng: number; startLat: number } | null>(null);

  useEffect(() => {
    if (!map || !isLoaded) return;

    const onMouseDown = (e: maplibregl.MapMouseEvent) => {
      // Check if click is on a structure fill layer
      const features = map.queryRenderedFeatures(e.point, {
        layers: structures.map((s) => `structure-fill-${s.id}`).filter((id) => map.getLayer(id)),
      });
      if (features.length === 0) return;

      const featureLayerId = features[0]?.layer?.id;
      if (!featureLayerId) return;
      const structureId = featureLayerId.replace('structure-fill-', '');
      const structure = structures.find((s) => s.id === structureId);
      if (!structure) return;

      e.preventDefault();
      dragRef.current = { structureId, startLng: e.lngLat.lng, startLat: e.lngLat.lat };
      map.getCanvas().style.cursor = 'grabbing';
    };

    const onMouseMove = (e: maplibregl.MapMouseEvent) => {
      if (!dragRef.current) return;
      const { structureId, startLng, startLat } = dragRef.current;
      const structure = structures.find((s) => s.id === structureId);
      if (!structure) return;

      const dLng = e.lngLat.lng - startLng;
      const dLat = e.lngLat.lat - startLat;

      // Translate geometry
      const newCenter: [number, number] = [structure.center[0] + dLng, structure.center[1] + dLat];
      const newGeometry = createFootprintPolygon(newCenter, structure.widthM, structure.depthM, structure.rotationDeg);

      // Update map source in real-time
      const src = map.getSource(`structure-${structureId}`) as maplibregl.GeoJSONSource | undefined;
      if (src) {
        src.setData({
          type: 'FeatureCollection',
          features: [{ type: 'Feature', properties: { name: structure.name }, geometry: newGeometry }],
        });
      }

      dragRef.current = { structureId, startLng: e.lngLat.lng, startLat: e.lngLat.lat };
      // Temporarily store new center for mouseup
      (dragRef.current as { structureId: string; startLng: number; startLat: number; newCenter?: [number, number]; newGeometry?: GeoJSON.Polygon }).newCenter = newCenter;
      (dragRef.current as { structureId: string; startLng: number; startLat: number; newGeometry?: GeoJSON.Polygon }).newGeometry = newGeometry;
    };

    const onMouseUp = () => {
      if (!dragRef.current) return;
      const drag = dragRef.current as { structureId: string; newCenter?: [number, number]; newGeometry?: GeoJSON.Polygon };
      if (drag.newCenter && drag.newGeometry) {
        updateStructure(drag.structureId, {
          center: drag.newCenter,
          geometry: drag.newGeometry,
        });
      }
      dragRef.current = null;
      map.getCanvas().style.cursor = '';
    };

    map.on('mousedown', onMouseDown);
    map.on('mousemove', onMouseMove);
    map.on('mouseup', onMouseUp);

    return () => {
      map.off('mousedown', onMouseDown);
      map.off('mousemove', onMouseMove);
      map.off('mouseup', onMouseUp);
    };
  }, [map, isLoaded, structures, updateStructure]);

  // ── Double-click to edit any polygon boundary (zones, paddocks, crops) ──
  const updateZone = useZoneStore((s) => s.updateZone);
  const updatePaddock = useLivestockStore((s) => s.updatePaddock);
  const updateCrop = useCropStore((s) => s.updateCropArea);
  const editingRef = useRef<{ type: 'zone' | 'paddock' | 'crop'; id: string } | null>(null);

  useEffect(() => {
    if (!map || !isLoaded || !draw) return;

    const onDblClick = (e: maplibregl.MapMouseEvent) => {
      // Don't allow editing for Viewer/Reviewer roles
      if (!canEdit) return;
      // Don't interfere with structure placement mode
      if (useStructureStore.getState().placementMode) return;

      // Query all polygon fill layers at the click point
      const allFillLayers = [
        ...zones.map((z) => `zone-fill-${z.id}`),
        ...paddocks.map((p) => `paddock-fill-${p.id}`),
        ...cropAreas.map((c) => `crop-fill-${c.id}`),
      ].filter((id) => map.getLayer(id));

      const features = map.queryRenderedFeatures(e.point, { layers: allFillLayers });
      if (features.length === 0) return;

      const layerId = features[0]?.layer?.id ?? '';
      let entityType: 'zone' | 'paddock' | 'crop';
      let entityId: string;
      let geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon | undefined;

      if (layerId.startsWith('zone-fill-')) {
        entityId = layerId.replace('zone-fill-', '');
        entityType = 'zone';
        geometry = zones.find((z) => z.id === entityId)?.geometry;
      } else if (layerId.startsWith('paddock-fill-')) {
        entityId = layerId.replace('paddock-fill-', '');
        entityType = 'paddock';
        geometry = paddocks.find((p) => p.id === entityId)?.geometry;
      } else if (layerId.startsWith('crop-fill-')) {
        entityId = layerId.replace('crop-fill-', '');
        entityType = 'crop';
        geometry = cropAreas.find((c) => c.id === entityId)?.geometry;
      } else {
        return;
      }

      if (!geometry) return;

      // Hide the static layer while editing
      map.setLayoutProperty(`${entityType === 'zone' ? 'zone' : entityType}-fill-${entityId}`, 'visibility', 'none');
      map.setLayoutProperty(`${entityType === 'zone' ? 'zone' : entityType}-line-${entityId}`, 'visibility', 'none');

      // Load geometry into MapboxDraw for vertex editing
      draw.deleteAll();
      const featureIds = draw.add({
        type: 'Feature',
        properties: {},
        geometry: geometry as GeoJSON.Geometry,
      });

      if (featureIds.length > 0) {
        draw.changeMode('direct_select', { featureId: featureIds[0]! });
      }

      editingRef.current = { type: entityType, id: entityId };
      e.preventDefault();
    };

    const onDrawUpdate = () => {
      if (!editingRef.current) return;
      const all = draw.getAll();
      const edited = all.features[0];
      if (!edited || edited.geometry.type !== 'Polygon') return;

      const { type, id } = editingRef.current;
      const newGeometry = edited.geometry as GeoJSON.Polygon;

      // Compute new area
      let newArea = 0;
      try {
        // Inline area calc to avoid async import during event handler
        const coords = newGeometry.coordinates[0];
        if (coords && coords.length >= 4) {
          // Shoelace formula approximation in m²
          const toRad = Math.PI / 180;
          let area = 0;
          for (let i = 0; i < coords.length - 1; i++) {
            const [lng1, lat1] = coords[i]!;
            const [lng2, lat2] = coords[i + 1]!;
            area += lng1! * lat2! - lng2! * lat1!;
          }
          const centroidLat = coords.reduce((s, c) => s + c[1]!, 0) / coords.length;
          const mPerDeg = 111320 * Math.cos(centroidLat * toRad);
          newArea = Math.abs(area / 2) * mPerDeg * 111320;
        }
      } catch (err) { console.warn('[OGDEN] Area computation failed:', err); }

      if (type === 'zone') {
        updateZone(id, { geometry: newGeometry, areaM2: newArea });
      } else if (type === 'paddock') {
        updatePaddock(id, { geometry: newGeometry, areaM2: newArea });
      } else if (type === 'crop') {
        updateCrop(id, { geometry: newGeometry, areaM2: newArea });
      }

      // Restore static layer visibility
      const prefix = type === 'zone' ? 'zone' : type;
      if (map.getLayer(`${prefix}-fill-${id}`)) map.setLayoutProperty(`${prefix}-fill-${id}`, 'visibility', 'visible');
      if (map.getLayer(`${prefix}-line-${id}`)) map.setLayoutProperty(`${prefix}-line-${id}`, 'visibility', 'visible');

      // Update the GeoJSON source
      const src = map.getSource(`${prefix}-${id}`) as maplibregl.GeoJSONSource | undefined;
      if (src) {
        src.setData({
          type: 'FeatureCollection',
          features: [{ type: 'Feature', properties: {}, geometry: newGeometry }],
        });
      }

      draw.deleteAll();
      editingRef.current = null;
    };

    // Escape key to cancel editing
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && editingRef.current) {
        const { type, id } = editingRef.current;
        const prefix = type === 'zone' ? 'zone' : type;
        if (map.getLayer(`${prefix}-fill-${id}`)) map.setLayoutProperty(`${prefix}-fill-${id}`, 'visibility', 'visible');
        if (map.getLayer(`${prefix}-line-${id}`)) map.setLayoutProperty(`${prefix}-line-${id}`, 'visibility', 'visible');
        draw.deleteAll();
        editingRef.current = null;
      }
    };

    map.on('dblclick', onDblClick);
    map.on('draw.update', onDrawUpdate);
    // Also save when user clicks away (mode change to simple_select)
    map.on('draw.modechange', (e: { mode: string }) => {
      if (e.mode === 'simple_select' && editingRef.current) {
        onDrawUpdate();
      }
    });
    document.addEventListener('keydown', onKeyDown);

    return () => {
      map.off('dblclick', onDblClick);
      map.off('draw.update', onDrawUpdate);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [map, isLoaded, draw, canEdit, zones, paddocks, cropAreas, updateZone, updatePaddock, updateCrop]);

  // Geocode address and place marker — only runs once per address
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const markerAddressRef = useRef<string | null>(null);
  const onMarkerCreatedRef = useRef(onMarkerCreated);
  onMarkerCreatedRef.current = onMarkerCreated;

  useEffect(() => {
    if (!map || !isLoaded || !address) return;
    // Skip if we already placed a marker for this address
    if (markerRef.current && markerAddressRef.current === address) return;

    if (!maptilerKey) return;

    let cancelled = false;
    const encoded = encodeURIComponent(address);
    fetch(`https://api.maptiler.com/geocoding/${encoded}.json?key=${maptilerKey}&limit=1`)
      .then((r) => r.json())
      .then((data: { features?: { center?: [number, number] }[] }) => {
        if (cancelled) return;
        const coords = data.features?.[0]?.center;
        if (coords) {
          placeMarker(map, markerRef, coords, address);
          markerAddressRef.current = address;
          onMarkerCreatedRef.current?.(markerRef.current!);
          if (!boundaryGeojson) {
            map.flyTo({ center: coords, zoom: 15, duration: 1500 });
          }
        }
      })
      .catch(() => { /* best effort */ });

    return () => { cancelled = true; };
    // Only re-run when address actually changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, isLoaded, address]);

  // Show helpful message if no token
  if (!hasMapToken) {
    return <MapTokenMissing />;
  }

  return (
    <div className="map-container" style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Map canvas */}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Initial-load overlay — shimmer bar across the canvas so the user
          sees "something is happening" before the first tile arrives. */}
      {!isLoaded && (
        <div className={loadingCss.overlay}>
          <div className={loadingCss.shimmerBar} aria-hidden="true" />
          <div className={loadingCss.label} style={{ color: mapTokens.label }}>
            Loading map
          </div>
        </div>
      )}

      {/* Post-load, in-flight tile chip — only surfaces after the initial
          style-load finishes (suppressed while the overlay above is showing). */}
      <MapLoadingIndicator map={map} suppressed={!isLoaded} />

      {/* Basemap style switcher is rendered by MapView's top-right
          cluster (top:56 right:60), NOT here. A previous duplicate at
          top:12 right:12 collided with the floatingControls row
          (Draw Boundary + zones · structures) producing a visible
          overlap — see chrome audit, 2026-04-25. */}

      {/* Map scale bar is added natively by Mapbox — no floating panels needed */}
    </div>
  );
}

function computeBBox(geojson: GeoJSON.FeatureCollection): [number, number, number, number] | null {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  let hasCoords = false;

  function visitCoords(coords: unknown): void {
    if (!Array.isArray(coords)) return;
    if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      hasCoords = true;
      minLng = Math.min(minLng, coords[0] as number);
      minLat = Math.min(minLat, coords[1] as number);
      maxLng = Math.max(maxLng, coords[0] as number);
      maxLat = Math.max(maxLat, coords[1] as number);
      return;
    }
    for (const item of coords) visitCoords(item);
  }

  for (const f of geojson.features) {
    visitCoords((f.geometry as { coordinates: unknown }).coordinates);
  }

  return hasCoords ? [minLng, minLat, maxLng, maxLat] : null;
}

function placeMarker(
  map: maplibregl.Map,
  markerRef: React.MutableRefObject<maplibregl.Marker | null>,
  coords: [number, number],
  label: string,
) {
  // Remove old marker
  markerRef.current?.remove();

  // Custom marker element — OGDEN earth-tone pin
  const el = document.createElement('div');
  el.style.cssText = `
    width: 28px; height: 28px;
    background: ${mapTokens.boundary};
    border: 3px solid ${mapTokens.label};
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    box-shadow: 0 2px 6px rgba(0,0,0,0.35);
  `;

  const marker = new maplibregl.Marker({ element: el, anchor: 'bottom-left' })
    .setLngLat(coords)
    .setPopup(
      new maplibregl.Popup({ offset: 20, closeButton: false })
        .setHTML(`<div style="font-size:12px;font-weight:500;color:${earth[900]};max-width:200px;line-height:1.4">${label}</div>`),
    )
    .addTo(map);

  markerRef.current = marker;
}
