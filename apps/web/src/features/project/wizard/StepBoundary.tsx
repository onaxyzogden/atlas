/**
 * Step 3 — Draw parcel boundary on map or import from file.
 *
 * Two modes:
 *   1. Draw: use MapboxDraw to draw a polygon directly
 *   2. Import: upload KML/KMZ/GeoJSON file → parsed → shown on map
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { mapboxgl, MAP_STYLES } from '../../../lib/mapbox.js';
import { parseGeoFile } from '../../../lib/geoParsers.js';
import type { WizardStepProps } from './types.js';
import WizardNav from './WizardNav.js';
import MapboxDraw from '@mapbox/mapbox-gl-draw';

type BoundaryMode = 'none' | 'draw' | 'import';

export default function StepBoundary({ data, updateData, onNext, onBack, isFirst, isLast }: WizardStepProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const [mode, setMode] = useState<BoundaryMode>(data.parcelBoundaryGeojson ? 'import' : 'none');
  const [importError, setImportError] = useState<string | null>(null);
  const [importInfo, setImportInfo] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Check for token before attempting map init
    if (!mapboxgl.accessToken) {
      setMapError('No Mapbox token configured. Set VITE_MAPBOX_TOKEN in your .env file to enable the map. You can still import boundary files below.');
      return;
    }

    let map: mapboxgl.Map;
    try {
      map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAP_STYLES['satellite']!,
      center: [-79.8, 43.5],
      zoom: 12,
      attributionControl: false,
      pitchWithRotate: false,
      dragRotate: false,
    });

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {},
      styles: [
        {
          id: 'gl-draw-polygon-fill',
          type: 'fill',
          filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
          paint: { 'fill-color': '#7d6140', 'fill-outline-color': '#4a3823', 'fill-opacity': 0.3 },
        },
        {
          id: 'gl-draw-polygon-stroke',
          type: 'line',
          filter: ['all', ['==', '$type', 'Polygon']],
          paint: { 'line-color': '#4a3823', 'line-width': 2 },
        },
        {
          id: 'gl-draw-point',
          type: 'circle',
          filter: ['all', ['==', '$type', 'Point']],
          paint: { 'circle-radius': 5, 'circle-color': '#7d6140', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' },
        },
      ],
    });

    map.addControl(draw);
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

    map.on('load', () => {
      setIsMapReady(true);

      // If boundary already exists (e.g. user went back), display it
      if (data.parcelBoundaryGeojson) {
        showBoundaryOnMap(map, data.parcelBoundaryGeojson as GeoJSON.FeatureCollection);
      } else if (data.address && mapboxgl.accessToken) {
        // Geocode the address from Step 2 to center the map
        fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(data.address)}.json?access_token=${mapboxgl.accessToken}&limit=1`
        )
          .then((r) => r.json())
          .then((result) => {
            const feature = result?.features?.[0];
            if (feature?.center) {
              map.flyTo({ center: feature.center, zoom: 15, duration: 1200 });
            }
          })
          .catch(() => {}); // Best-effort geocode
      }
    });

    // Capture drawn geometry
    map.on('draw.create', () => saveDraw(draw));
    map.on('draw.update', () => saveDraw(draw));
    map.on('draw.delete', () => saveDraw(draw));

    mapRef.current = map;
    drawRef.current = draw;

    return () => {
      map.remove();
      mapRef.current = null;
      drawRef.current = null;
    };
    } catch (err) {
      setMapError(err instanceof Error ? err.message : 'Failed to initialize map');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveDraw = useCallback(
    (draw: MapboxDraw) => {
      const all = draw.getAll();
      if (all.features.length > 0) {
        updateData({ parcelBoundaryGeojson: all });
      } else {
        updateData({ parcelBoundaryGeojson: null });
      }
    },
    [updateData],
  );

  // Start draw mode
  const handleStartDraw = useCallback(() => {
    setMode('draw');
    setImportError(null);
    setImportInfo(null);
    if (drawRef.current) {
      drawRef.current.deleteAll();
      drawRef.current.changeMode('draw_polygon');
    }
    // Remove import layer if present
    const map = mapRef.current;
    if (map?.getSource('imported-boundary')) {
      if (map.getLayer('imported-boundary-fill')) map.removeLayer('imported-boundary-fill');
      if (map.getLayer('imported-boundary-line')) map.removeLayer('imported-boundary-line');
      map.removeSource('imported-boundary');
    }
  }, []);

  // File import
  const handleFileImport = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setImportError(null);
      setImportInfo(null);
      setMode('import');

      try {
        const result = await parseGeoFile(file);
        updateData({ parcelBoundaryGeojson: result.geojson });
        setImportInfo(`Imported ${result.featureCount} feature(s) from ${result.format.toUpperCase()}`);

        // Clear draw features
        drawRef.current?.deleteAll();

        // Show on map
        if (mapRef.current && isMapReady) {
          showBoundaryOnMap(mapRef.current, result.geojson);
        }
      } catch (err) {
        setImportError(err instanceof Error ? err.message : 'Failed to parse file');
      }

      // Reset input so same file can be re-selected
      e.target.value = '';
    },
    [updateData, isMapReady],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Controls bar */}
      <div
        style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'var(--color-bg)',
          borderBottom: '1px solid var(--color-border)',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)', marginRight: 8 }}>
          Property Boundary
        </span>

        <button
          onClick={handleStartDraw}
          style={{
            padding: '7px 16px',
            fontSize: 12,
            border: mode === 'draw' ? '2px solid var(--color-earth-600)' : '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            background: mode === 'draw' ? 'var(--color-earth-600)' : 'var(--color-bg)',
            color: mode === 'draw' ? '#fff' : 'var(--color-text)',
            cursor: 'pointer',
            fontWeight: mode === 'draw' ? 600 : 400,
          }}
        >
          Draw on Map
        </button>

        <label
          style={{
            padding: '7px 16px',
            fontSize: 12,
            border: mode === 'import' ? '2px solid var(--color-earth-600)' : '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            background: mode === 'import' ? 'var(--color-earth-600)' : 'var(--color-bg)',
            color: mode === 'import' ? '#fff' : 'var(--color-text)',
            cursor: 'pointer',
            fontWeight: mode === 'import' ? 600 : 400,
          }}
        >
          Import File
          <input
            type="file"
            accept=".kml,.kmz,.geojson,.json"
            onChange={handleFileImport}
            style={{ display: 'none' }}
          />
        </label>

        {importInfo && (
          <span style={{ fontSize: 12, color: 'var(--color-sage-600)', fontWeight: 500 }}>{importInfo}</span>
        )}
        {importError && (
          <span style={{ fontSize: 12, color: 'var(--color-confidence-low)', fontWeight: 500 }}>{importError}</span>
        )}

        {mode === 'none' && (
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
            Optional — you can add a boundary later
          </span>
        )}

        <div style={{ flex: 1 }} />

        {data.parcelBoundaryGeojson !== null && (
          <button
            onClick={() => {
              updateData({ parcelBoundaryGeojson: null });
              drawRef.current?.deleteAll();
              setMode('none');
              setImportInfo(null);
              const map = mapRef.current;
              if (map?.getSource('imported-boundary')) {
                if (map.getLayer('imported-boundary-fill')) map.removeLayer('imported-boundary-fill');
                if (map.getLayer('imported-boundary-line')) map.removeLayer('imported-boundary-line');
                map.removeSource('imported-boundary');
              }
            }}
            style={{
              padding: '7px 16px',
              fontSize: 12,
              border: '1px solid var(--color-confidence-low)',
              borderRadius: 'var(--radius-md)',
              background: 'transparent',
              color: 'var(--color-confidence-low)',
              cursor: 'pointer',
            }}
          >
            Clear Boundary
          </button>
        )}
      </div>

      {/* Map */}
      {/* Map or fallback */}
      {mapError ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            padding: 40,
            background: 'var(--color-earth-100)',
          }}
        >
          <div style={{ fontSize: 13, color: 'var(--color-earth-700)', textAlign: 'center', maxWidth: 480, lineHeight: 1.6 }}>
            {mapError}
          </div>
          <label
            style={{
              padding: '10px 20px',
              fontSize: 13,
              border: '1px solid var(--color-earth-600)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface)',
              color: 'var(--color-earth-700)',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Import Boundary File (KML / GeoJSON)
            <input
              type="file"
              accept=".kml,.kmz,.geojson,.json"
              onChange={handleFileImport}
              style={{ display: 'none' }}
            />
          </label>
          {importInfo && (
            <span style={{ fontSize: 13, color: 'var(--color-sage-600)', fontWeight: 500 }}>{importInfo}</span>
          )}
          {importError && (
            <span style={{ fontSize: 13, color: 'var(--color-confidence-low)', fontWeight: 500 }}>{importError}</span>
          )}
        </div>
      ) : (
        <div ref={containerRef} style={{ flex: 1 }} />
      )}

      {/* Nav */}
      <div style={{ padding: '0 20px 16px', background: 'var(--color-bg)' }}>
        <WizardNav onBack={onBack} onNext={onNext} isFirst={isFirst} isLast={isLast} />
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function showBoundaryOnMap(map: mapboxgl.Map, geojson: GeoJSON.FeatureCollection) {
  // Remove existing
  if (map.getSource('imported-boundary')) {
    if (map.getLayer('imported-boundary-fill')) map.removeLayer('imported-boundary-fill');
    if (map.getLayer('imported-boundary-line')) map.removeLayer('imported-boundary-line');
    map.removeSource('imported-boundary');
  }

  map.addSource('imported-boundary', { type: 'geojson', data: geojson });

  map.addLayer({
    id: 'imported-boundary-fill',
    type: 'fill',
    source: 'imported-boundary',
    paint: {
      'fill-color': '#7d6140',
      'fill-opacity': 0.2,
    },
  });

  map.addLayer({
    id: 'imported-boundary-line',
    type: 'line',
    source: 'imported-boundary',
    paint: {
      'line-color': '#4a3823',
      'line-width': 2.5,
    },
  });

  // Fit bounds to imported geometry
  try {
    const bbox = computeBBox(geojson);
    if (bbox) {
      map.fitBounds(bbox as [number, number, number, number], { padding: 60, maxZoom: 16 });
    }
  } catch {
    // Best-effort zoom
  }
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
