/**
 * CesiumTerrainViewer — 3D terrain globe overlay.
 * Lazy-loaded only when the user activates 3D terrain mode.
 * Uses Cesium World Terrain (Ion asset 1) for elevation data.
 */

import { useEffect, useRef } from 'react';
import {
  Viewer,
  Cartesian3,
  Math as CesiumMath,
  createWorldTerrainAsync,
  UrlTemplateImageryProvider,
  ImageryLayer,
} from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { initCesiumIon, hasCesiumToken } from '../../lib/cesium.js';

interface CesiumTerrainViewerProps {
  initialCenter: [number, number]; // [lng, lat] from MapLibre
  initialZoom: number;
  onCameraSync?: (center: [number, number], zoom: number) => void;
}

/** Convert a MapLibre zoom level to an approximate camera altitude in meters. */
function zoomToAltitude(zoom: number, latitude = 0): number {
  return (78271.484 * Math.cos((latitude * Math.PI) / 180)) / Math.pow(2, zoom);
}

/** Convert a Cesium camera altitude to an approximate MapLibre zoom level. */
function altitudeToZoom(altitude: number, latitude = 0): number {
  return Math.log2((78271.484 * Math.cos((latitude * Math.PI) / 180)) / altitude);
}

export default function CesiumTerrainViewer({
  initialCenter,
  initialZoom,
  onCameraSync,
}: CesiumTerrainViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const onCameraSyncRef = useRef(onCameraSync);
  onCameraSyncRef.current = onCameraSync;

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    if (!hasCesiumToken) {
      console.warn('[OGDEN] No Cesium Ion token — 3D terrain will not render. Set VITE_CESIUM_ION_TOKEN.');
      return;
    }

    initCesiumIon();

    let destroyed = false;

    (async () => {
      const terrainProvider = await createWorldTerrainAsync({
        requestVertexNormals: true,
        requestWaterMask: true,
      });

      if (destroyed || !containerRef.current) return;

      // Hide Cesium credits in a detached div
      const creditContainer = document.createElement('div');

      // Esri World Imagery — HTTPS + CORS, no token required. Replaces Bing
      // (Ion asset 2), which delivers tiles over HTTP without CORS and fails
      // to decode in the browser ("InvalidStateError: source image ..."). We
      // pass this as Viewer's baseLayer so Cesium never tries to load its
      // Ion-asset-2 default.
      const baseLayer = ImageryLayer.fromProviderAsync(
        Promise.resolve(
          new UrlTemplateImageryProvider({
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            maximumLevel: 19,
            credit: 'Esri, Maxar, Earthstar Geographics, and the GIS User Community',
          }),
        ),
        {},
      );

      const viewer = new Viewer(containerRef.current, {
        terrainProvider,
        baseLayer,
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        selectionIndicator: false,
        timeline: false,
        animation: false,
        navigationHelpButton: false,
        fullscreenButton: false,
        infoBox: false,
        creditContainer,
      });

      if (destroyed) {
        viewer.destroy();
        return;
      }

      // Enable depth testing against terrain so entities sit on the ground
      viewer.scene.globe.depthTestAgainstTerrain = true;

      // Fly camera to match MapLibre view
      const altitude = zoomToAltitude(initialZoom, initialCenter[1]);
      viewer.camera.setView({
        destination: Cartesian3.fromDegrees(initialCenter[0], initialCenter[1], altitude),
        orientation: {
          heading: 0,
          pitch: CesiumMath.toRadians(-45),
          roll: 0,
        },
      });

      viewerRef.current = viewer;
    })();

    return () => {
      destroyed = true;

      // Sync camera position back to MapLibre before destroying
      if (viewerRef.current && onCameraSyncRef.current) {
        try {
          const cartographic = viewerRef.current.camera.positionCartographic;
          const lng = CesiumMath.toDegrees(cartographic.longitude);
          const lat = CesiumMath.toDegrees(cartographic.latitude);
          const zoom = altitudeToZoom(cartographic.height, lat);
          onCameraSyncRef.current([lng, lat], Math.max(0, Math.min(22, zoom)));
        } catch {
          // Camera may not be available if viewer failed to initialize
        }
      }

      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!hasCesiumToken) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(15, 26, 18, 0.95)',
        color: 'rgba(232, 220, 200, 0.7)',
        fontSize: '14px',
        letterSpacing: '0.03em',
      }}>
        3D Terrain unavailable — Cesium Ion access token is not configured.
      </div>
    );
  }

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
