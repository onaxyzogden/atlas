/**
 * Step 3 — Draw parcel boundary on map or import from file.
 *
 * Two modes:
 *   1. Draw: use MapboxDraw to draw a polygon directly
 *   2. Import: upload KML/KMZ/GeoJSON file → parsed → shown on map
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { maplibregl, MAP_STYLES, hasMapToken, maptilerKey, maptilerTransformRequest, setMaptilerKey, MAPTILER_KEY_STORAGE } from '../../../lib/maplibre.js';
import { parseGeoFile } from '../../../lib/geoParsers.js';
import type { WizardStepProps } from './types.js';
import WizardNav from './WizardNav.js';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { earth, semantic } from '../../../lib/tokens.js';

type BoundaryMode = 'none' | 'draw' | 'import';

export default function StepBoundary({ data, updateData, onNext, onBack, isFirst, isLast }: WizardStepProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const [mode, setMode] = useState<BoundaryMode>(data.parcelBoundaryGeojson ? 'import' : 'none');
  const [importError, setImportError] = useState<string | null>(null);
  const [importInfo, setImportInfo] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [geocodeWarning, setGeocodeWarning] = useState<string | null>(null);

  // Keep latest wizard data accessible from stable callbacks (map load handler,
  // Recenter button) without re-creating the map.
  const dataRef = useRef(data);
  useEffect(() => { dataRef.current = data; }, [data]);

  const updateDataRef = useRef(updateData);
  useEffect(() => { updateDataRef.current = updateData; }, [updateData]);

  /** Re-center the map using the priority: boundary > manual coords > geocode. */
  const centerMap = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const d = dataRef.current;

    // 1. Boundary wins — fitBounds via showBoundaryOnMap.
    if (d.parcelBoundaryGeojson) {
      showBoundaryOnMap(map, d.parcelBoundaryGeojson as GeoJSON.FeatureCollection);
      setGeocodeWarning(null);
      return;
    }

    // 2. Manual coordinates.
    const lat = parseFloat(d.centerLat);
    const lng = parseFloat(d.centerLng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      map.flyTo({ center: [lng, lat], zoom: 15, duration: 1200 });
      setGeocodeWarning(null);
      return;
    }

    // 3. Geocode address (scoped by country + provinceState).
    if (d.address && hasMapToken) {
      const queryParts = [d.address];
      if (d.provinceState) queryParts.push(d.provinceState);
      const query = queryParts.join(', ');
      const params = new URLSearchParams({ key: maptilerKey ?? '', limit: '1' });
      if (d.country === 'US') params.set('country', 'us');
      else if (d.country === 'CA') params.set('country', 'ca');

      fetch(
        `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?${params.toString()}`,
      )
        .then((r) => r.json())
        .then((result) => {
          const feature = result?.features?.[0];
          if (feature?.center) {
            const [glng, glat] = feature.center as [number, number];
            map.flyTo({ center: [glng, glat], zoom: 15, duration: 1200 });
            setGeocodeWarning(null);
            // Backfill so the project remembers the resolved center without a
            // second geocode call later.
            if (!d.centerLat && !d.centerLng) {
              updateDataRef.current({ centerLat: String(glat), centerLng: String(glng) });
            }
          } else {
            setGeocodeWarning(
              "Couldn't locate that address. Go back to Step 2 and enter coordinates to center the map.",
            );
          }
        })
        .catch((err) => {
          console.warn('[OGDEN] Address geocode failed:', err);
          setGeocodeWarning(
            "Couldn't locate that address. Go back to Step 2 and enter coordinates to center the map.",
          );
        });
      return;
    }

    // No signal at all — leave at default and prompt user.
    setGeocodeWarning(
      'No address or coordinates provided. Go back to Step 2 to add them so the map can center on your property.',
    );
  }, []);

  const canRecenter = Boolean(
    data.parcelBoundaryGeojson ||
      (data.centerLat && data.centerLng) ||
      data.address,
  );

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Check for token before attempting map init
    if (!hasMapToken) {
      setMapError('NEEDS_KEY');
      return;
    }

    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLES['satellite']!,
      center: [-79.8, 43.5],
      zoom: 12,
      attributionControl: false,
      transformRequest: maptilerTransformRequest,
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
          paint: { 'fill-color': semantic.primary, 'fill-outline-color': earth[800], 'fill-opacity': 0.3 },
        },
        {
          id: 'gl-draw-polygon-stroke',
          type: 'line',
          filter: ['all', ['==', '$type', 'Polygon']],
          paint: { 'line-color': earth[800], 'line-width': 2 },
        },
        {
          id: 'gl-draw-point',
          type: 'circle',
          filter: ['all', ['==', '$type', 'Point']],
          paint: { 'circle-radius': 5, 'circle-color': semantic.primary, 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' },
        },
      ],
    });

    map.addControl(draw);
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    map.on('load', () => {
      setIsMapReady(true);
      centerMap();
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

        <button
          onClick={centerMap}
          disabled={!canRecenter}
          style={{
            padding: '7px 16px',
            fontSize: 12,
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            background: 'transparent',
            color: canRecenter ? 'var(--color-text)' : 'var(--color-text-muted)',
            cursor: canRecenter ? 'pointer' : 'not-allowed',
            opacity: canRecenter ? 1 : 0.5,
          }}
        >
          Recenter
        </button>

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

      {/* Geocode warning banner */}
      {geocodeWarning && !mapError && (
        <div
          role="status"
          style={{
            padding: '10px 20px',
            background: 'var(--color-earth-100)',
            borderBottom: '1px solid var(--color-border)',
            fontSize: 12,
            color: 'var(--color-earth-800)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexShrink: 0,
          }}
        >
          <span style={{ flex: 1 }}>{geocodeWarning}</span>
          <button
            onClick={onBack}
            style={{
              padding: '5px 12px',
              fontSize: 12,
              border: '1px solid var(--color-earth-600)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface)',
              color: 'var(--color-earth-800)',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Back to Step 2
          </button>
          <button
            onClick={() => setGeocodeWarning(null)}
            aria-label="Dismiss"
            style={{
              padding: '5px 10px',
              fontSize: 12,
              border: 'none',
              background: 'transparent',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Map or fallback */}
      {mapError ? (
        <MapKeyFallback
          messageOverride={mapError === 'NEEDS_KEY' ? null : mapError}
          onFileImport={handleFileImport}
          importInfo={importInfo}
          importError={importError}
        />
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

// ─── Visitor key-entry fallback ───────────────────────────────────────────

interface MapKeyFallbackProps {
  /** When non-null, render this raw error instead of the key-entry copy. */
  messageOverride: string | null;
  onFileImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  importInfo: string | null;
  importError: string | null;
}

function MapKeyFallback({ messageOverride, onFileImport, importInfo, importError }: MapKeyFallbackProps) {
  const hasStoredKey = (() => {
    try { return !!localStorage.getItem(MAPTILER_KEY_STORAGE); } catch { return false; }
  })();
  const [keyInput, setKeyInput] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);

  const onSave = () => {
    const trimmed = keyInput.trim();
    if (!trimmed) {
      setSaveError('Paste a key first.');
      return;
    }
    setMaptilerKey(trimmed);
    window.location.reload();
  };

  const onClear = () => {
    setMaptilerKey(null);
    window.location.reload();
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        padding: 40,
        background: 'var(--color-earth-100)',
      }}
    >
      {messageOverride ? (
        <div style={{ fontSize: 13, color: 'var(--color-confidence-low)', textAlign: 'center', maxWidth: 480, lineHeight: 1.6 }}>
          {messageOverride}
        </div>
      ) : (
        <>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-earth-800)', textAlign: 'center' }}>
            Map needs a MapTiler API key
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-earth-700)', textAlign: 'center', maxWidth: 520, lineHeight: 1.6 }}>
            Get a free key in about a minute at{' '}
            <a
              href="https://cloud.maptiler.com/account/keys/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--color-earth-800)', textDecoration: 'underline' }}
            >
              cloud.maptiler.com
            </a>
            {' '}— paste it below to unlock the map. Your key stays in this browser only; we never see it.
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            <input
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={keyInput}
              onChange={(e) => { setKeyInput(e.target.value); setSaveError(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') onSave(); }}
              placeholder="Paste MapTiler API key"
              style={{
                padding: '8px 12px',
                fontSize: 13,
                width: 320,
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                fontFamily: 'monospace',
              }}
            />
            <button
              onClick={onSave}
              style={{
                padding: '8px 18px',
                fontSize: 13,
                border: '1px solid var(--color-earth-600)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-earth-600)',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Save & reload
            </button>
            {hasStoredKey && (
              <button
                onClick={onClear}
                style={{
                  padding: '8px 14px',
                  fontSize: 12,
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  background: 'transparent',
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                }}
              >
                Clear saved key
              </button>
            )}
          </div>
          {saveError && (
            <span style={{ fontSize: 12, color: 'var(--color-confidence-low)', fontWeight: 500 }}>{saveError}</span>
          )}
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 6 }}>— or —</div>
        </>
      )}
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
          onChange={onFileImport}
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
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function showBoundaryOnMap(map: maplibregl.Map, geojson: GeoJSON.FeatureCollection) {
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
      'fill-color': semantic.primary,
      'fill-opacity': 0.2,
    },
  });

  map.addLayer({
    id: 'imported-boundary-line',
    type: 'line',
    source: 'imported-boundary',
    paint: {
      'line-color': earth[800],
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
