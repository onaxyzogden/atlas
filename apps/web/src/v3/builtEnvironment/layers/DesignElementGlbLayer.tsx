/**
 * DesignElementGlbLayer (shared) — three.js custom MapLibre layer that
 * renders Built-Environment entities as authored GLB models.
 *
 * Lifted to the shared dir in Phase 4.1b of ADR
 * `2026-05-10-atlas-built-environment-unification.md`. Reads directly
 * from `useBuiltEnvironmentStoreV2` so both Plan and Observe mount this
 * single instance via the shared barrel and pass `stateFilter` to scope
 * the slice they care about.
 *
 * Renderer: a bespoke MapLibre `type: 'custom'` layer with
 * `renderingMode: '3d'`. The layer owns a single three.js
 * `WebGLRenderer` that shares MapLibre's WebGL context (no second
 * canvas, no second context). On each MapLibre frame the layer
 * receives the projection matrix from MapLibre and renders one
 * three.js scene aligned to it.
 *
 * Coordinates: each placed element is positioned via
 * `MercatorCoordinate.fromLngLat(centerLngLat, baseM)`, scaled by
 * `meterInMercatorCoordinateUnits()` so 1 metre on the ground maps
 * to the correct number of mercator units at that latitude.
 */

import { useEffect, useRef } from 'react';
import maplibregl, {
  type Map as MaplibreMap,
  type CustomLayerInterface,
} from 'maplibre-gl';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  useBuiltEnvironmentStoreV2,
  type BuiltEnvironmentV2State,
} from '../../../store/builtEnvironmentStoreV2.js';
import type { BuiltEnvironmentEntity } from '@ogden/shared';
import {
  PHASE_VIEW_CAP,
  phaseIndex,
  type PlanView,
} from '../../plan/types.js';
import {
  getElementHeightSpec,
  EXTRUDED_KINDS,
  type ElementHeightSpec,
} from '../../plan/canvas/elementHeights.js';
import type { StateFilter } from './DesignElementExtrusionLayer.js';

interface Props {
  map: MaplibreMap;
  projectId: string;
  /** Default 'all' — render both states. */
  stateFilter?: StateFilter;
  /** Plan-stage phase cap. Applied only to proposed-state entries. */
  view?: PlanView;
}

const LAYER_ID = 'design-el-glb';

/** Polygon centroid (simple average of the outer ring). */
function polygonCentroid(poly: GeoJSON.Polygon): [number, number] {
  const ring = poly.coordinates[0] ?? [];
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const pt = ring[i];
    if (!pt) continue;
    sx += pt[0] ?? 0;
    sy += pt[1] ?? 0;
    n++;
  }
  if (n === 0) return [0, 0];
  return [sx / n, sy / n];
}

/** Polygon bounding-box edges in metres at its centroid latitude. */
function polygonExtentsM(poly: GeoJSON.Polygon): { widthM: number; depthM: number } {
  const ring = poly.coordinates[0] ?? [];
  if (ring.length === 0) return { widthM: 1, depthM: 1 };
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const pt of ring) {
    const lng = pt[0];
    const lat = pt[1];
    if (lng == null || lat == null) continue;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  const M_PER_DEG_LAT = 111_320;
  const midLat = (minLat + maxLat) / 2;
  const depthM = (maxLat - minLat) * M_PER_DEG_LAT;
  const widthM =
    (maxLng - minLng) * M_PER_DEG_LAT * Math.cos((midLat * Math.PI) / 180);
  return {
    widthM: Math.max(widthM, 0.1),
    depthM: Math.max(depthM, 0.1),
  };
}

interface PlacedSpec {
  id: string;
  kind: string;
  glbUrl: string;
  centerLngLat: [number, number];
  baseM: number;
  widthM: number;
  heightM: number;
  depthM: number;
  rotationRad: number;
  anchorOffsetM?: [number, number, number];
}

function entityToPlaced(
  e: BuiltEnvironmentEntity,
  spec: ElementHeightSpec,
): PlacedSpec | null {
  if (!spec.glbUrl) return null;
  const baseM = spec.baseM ?? 0;
  const heightM = Math.max(spec.heightM, 0.05);
  const rotationRad = ((spec.glbRotationDeg ?? 0) * Math.PI) / 180;

  if (e.geometry.type === 'Point') {
    const [lng, lat] = e.geometry.coordinates;
    if (lng == null || lat == null) return null;
    const side = Math.max(spec.footprintM, 0.5);
    return {
      id: e.id,
      kind: e.kind,
      glbUrl: spec.glbUrl,
      centerLngLat: [lng, lat],
      baseM,
      widthM: side,
      heightM,
      depthM: side,
      rotationRad,
      anchorOffsetM: spec.glbAnchorOffsetM,
    };
  }

  if (e.geometry.type === 'Polygon') {
    const center = polygonCentroid(e.geometry);
    const { widthM, depthM } = polygonExtentsM(e.geometry);
    return {
      id: e.id,
      kind: e.kind,
      glbUrl: spec.glbUrl,
      centerLngLat: center,
      baseM,
      widthM,
      heightM,
      depthM,
      rotationRad,
      anchorOffsetM: spec.glbAnchorOffsetM,
    };
  }

  // Lines intentionally skipped here.
  return null;
}

// ── GLB cache (process-wide, never invalidated — assets are immutable) ─────
const GLB_CACHE = new Map<string, Promise<THREE.Object3D>>();
const loader = new GLTFLoader();

function loadGlb(url: string): Promise<THREE.Object3D> {
  let p = GLB_CACHE.get(url);
  if (!p) {
    p = new Promise<THREE.Object3D>((resolve, reject) => {
      loader.load(
        url,
        (gltf) => resolve(gltf.scene),
        undefined,
        (err) => reject(err),
      );
    });
    GLB_CACHE.set(url, p);
  }
  return p;
}

/** Recursively dispose geometries/materials beneath an Object3D. */
function disposeSubtree(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) {
      for (const m of mat) m.dispose();
    } else if (mat) {
      mat.dispose();
    }
  });
}

interface PlacedEntry {
  spec: PlacedSpec;
  node: THREE.Group;
}

interface GlbCustomLayer extends CustomLayerInterface {
  _setPlaced(specs: PlacedSpec[]): void;
  _dispose(): void;
}

function createLayer(): GlbCustomLayer {
  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera: THREE.Camera | null = null;
  let mapRef: MaplibreMap | null = null;
  const placed = new Map<string, PlacedEntry>();
  let pendingSpecs: PlacedSpec[] | null = null;

  function applyTransform(entry: PlacedEntry): void {
    const { spec, node } = entry;
    const merc = maplibregl.MercatorCoordinate.fromLngLat(
      { lng: spec.centerLngLat[0], lat: spec.centerLngLat[1] },
      spec.baseM,
    );
    const mPerUnit = merc.meterInMercatorCoordinateUnits();
    node.position.set(merc.x, merc.y, merc.z);
    node.scale.set(
      spec.widthM * mPerUnit,
      spec.heightM * mPerUnit,
      spec.depthM * mPerUnit,
    );
    node.rotation.set(-Math.PI / 2, spec.rotationRad, 0);
    if (spec.anchorOffsetM) {
      const [ox, oy, oz] = spec.anchorOffsetM;
      node.position.x += ox * mPerUnit;
      node.position.y += oy * mPerUnit;
      node.position.z += oz * mPerUnit;
    }
  }

  async function reconcile(specs: PlacedSpec[]): Promise<void> {
    if (!scene) {
      pendingSpecs = specs;
      return;
    }

    const nextIds = new Set(specs.map((s) => s.id));

    for (const [id, entry] of placed) {
      if (!nextIds.has(id)) {
        scene.remove(entry.node);
        disposeSubtree(entry.node);
        placed.delete(id);
      }
    }

    for (const spec of specs) {
      const existing = placed.get(spec.id);
      if (existing) {
        existing.spec = spec;
        applyTransform(existing);
        continue;
      }
      try {
        const template = await loadGlb(spec.glbUrl);
        if (!scene) return;
        const cloned = template.clone(true);
        const wrapper = new THREE.Group();
        wrapper.add(cloned);
        const entry: PlacedEntry = { spec, node: wrapper };
        applyTransform(entry);
        scene.add(wrapper);
        placed.set(spec.id, entry);
        mapRef?.triggerRepaint();
      } catch {
        /* asset failed to load — extrusion fallback covers it */
      }
    }

    mapRef?.triggerRepaint();
  }

  return {
    id: LAYER_ID,
    type: 'custom',
    renderingMode: '3d',

    onAdd(map, gl) {
      mapRef = map as MaplibreMap;
      renderer = new THREE.WebGLRenderer({
        canvas: map.getCanvas(),
        context: gl,
        antialias: true,
      });
      renderer.autoClear = false;

      scene = new THREE.Scene();
      camera = new THREE.Camera();

      scene.add(new THREE.AmbientLight(0xffffff, 0.7));
      const sun = new THREE.DirectionalLight(0xffffff, 0.7);
      sun.position.set(0.5, 1, 0.3);
      scene.add(sun);

      if (pendingSpecs) {
        const specs = pendingSpecs;
        pendingSpecs = null;
        void reconcile(specs);
      }
    },

    render(_gl, matrix) {
      if (!renderer || !scene || !camera || !mapRef) return;
      const m = new THREE.Matrix4().fromArray(matrix);
      camera.projectionMatrix = m;
      camera.matrixWorldInverse = new THREE.Matrix4();
      renderer.resetState();
      renderer.render(scene, camera);
    },

    onRemove() {
      this._dispose();
    },

    _setPlaced(specs: PlacedSpec[]) {
      void reconcile(specs);
    },

    _dispose() {
      for (const entry of placed.values()) {
        if (scene) scene.remove(entry.node);
        disposeSubtree(entry.node);
      }
      placed.clear();
      renderer = null;
      scene = null;
      camera = null;
      mapRef = null;
    },
  };
}

const selectEntities = (s: BuiltEnvironmentV2State) => s.entities;

export default function DesignElementGlbLayer({
  map,
  projectId,
  stateFilter = 'all',
  view,
}: Props) {
  const layerRef = useRef<GlbCustomLayer | null>(null);
  const entities = useBuiltEnvironmentStoreV2(selectEntities);

  // Mount the custom layer (idempotent across style.load).
  useEffect(() => {
    if (!map) return;

    const ensure = () => {
      if (map.getLayer(LAYER_ID)) return;
      if ((map.getStyle()?.layers?.length ?? 0) === 0) return;
      if (!layerRef.current) layerRef.current = createLayer();
      try {
        map.addLayer(layerRef.current as unknown as CustomLayerInterface);
      } catch {
        /* style not ready */
      }
    };

    ensure();
    const onStyle = () => ensure();
    map.on('style.load', onStyle);

    return () => {
      try {
        map.off('style.load', onStyle);
        if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
      } catch {
        /* map disposed */
      }
      if (layerRef.current) {
        layerRef.current._dispose();
        layerRef.current = null;
      }
    };
  }, [map]);

  // Reconcile placed scene contents whenever entities or filter inputs change.
  useEffect(() => {
    if (!layerRef.current) return;

    const cap =
      view === 'phase-1' || view === 'phase-2'
        ? phaseIndex(PHASE_VIEW_CAP[view])
        : Infinity;

    const specs: PlacedSpec[] = [];
    for (const e of entities) {
      if (e.projectId !== projectId) continue;
      if (stateFilter !== 'all' && e.state !== stateFilter) continue;
      if (!EXTRUDED_KINDS.has(e.kind)) continue;
      const heightSpec = getElementHeightSpec(e.kind);
      if (!heightSpec || heightSpec.mode !== 'glb') continue;

      // Phase capping: only meaningful for proposed entries (Plan stage).
      if (e.state === 'proposed' && cap !== Infinity) {
        const phase = (e.proposed?.phase ?? 'building') as PhaseKey;
        if (phaseIndex(phase) > cap) continue;
      }

      const placed = entityToPlaced(e, heightSpec);
      if (placed) specs.push(placed);
    }

    layerRef.current._setPlaced(specs);
    map?.triggerRepaint();
  }, [entities, projectId, stateFilter, view, map]);

  return null;
}
