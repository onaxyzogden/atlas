/**
 * MapToolbar — bottom-left floating toolbar on the Observe map.
 *
 * Replaces the legacy "Active overlays" legend (read-only) with a unified
 * dock that combines:
 *   - Overlays popover (toggles topography/sectors/zones/wind/water)
 *   - Distance measurement
 *   - Elevation sample (point or path)
 *   - Area measurement
 *   - Property-boundary draw
 *   - Clear (visible only when any tool is active)
 *
 * One-tool-at-a-time semantics via useMapToolStore. Sub-tool components
 * (DistanceTool, AreaTool, etc.) own their MapboxDraw lifecycle and
 * mount/unmount in response to activeTool changes.
 */

import { useEffect, useRef, useState } from 'react';
import {
  Crosshair,
  Map as MapIcon,
  Ruler,
  Mountain,
  Square,
  SquareDashed,
  Upload,
  X,
} from 'lucide-react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import { polygonBounds } from '../../components/DiagnoseMap.js';
import { parseGeoFile } from '../../../lib/geoParsers.js';
import {
  BASEMAP_OPTIONS,
  useBasemapStore,
  useMapToolStore,
  type MapToolId,
} from './measure/useMapToolStore.js';
import DistanceTool from './measure/DistanceTool.js';
import AreaTool from './measure/AreaTool.js';
import ElevationTool from './measure/ElevationTool.js';
import BoundaryTool from './measure/BoundaryTool.js';
import { DelayedTooltip } from '../../../components/ui/DelayedTooltip.js';
import css from './MapToolbar.module.css';

interface Props {
  map: MaplibreMap;
  projectId?: string | null;
  /** Persisted parcel boundary, used to power the "Return to property" button. */
  boundary?: GeoJSON.Polygon | null;
  onBoundaryDrawn?: (polygon: GeoJSON.Polygon) => void;
  /**
   * Called when the steward imports a boundary from a file (KML / KMZ /
   * GeoJSON). Receives the parsed FeatureCollection so the caller can persist
   * it and compute acreage. Only wired when `showBoundary` is true.
   */
  onBoundaryImported?: (geojson: GeoJSON.FeatureCollection) => void;
  /** Show the draw-property-boundary button + tool. Defaults to true (Observe). */
  showBoundary?: boolean;
}

export default function MapToolbar({
  map,
  projectId,
  boundary,
  onBoundaryDrawn,
  onBoundaryImported,
  showBoundary = true,
}: Props) {
  const activeTool = useMapToolStore((s) => s.activeTool);
  const setActiveTool = useMapToolStore((s) => s.setActiveTool);
  const basemap = useBasemapStore((s) => s.basemap);
  const setBasemap = useBasemapStore((s) => s.setBasemap);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    setImportError(null);
    try {
      const { geojson } = await parseGeoFile(file);
      onBoundaryImported?.(geojson);
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : 'Could not read that file.',
      );
    }
  };

  // Reset activeTool on unmount so route changes don't carry stale state.
  useEffect(() => {
    return () => {
      setActiveTool(null);
    };
  }, [setActiveTool]);

  const isActive = (id: MapToolId) =>
    activeTool === id ||
    (id === 'elevation-point' && activeTool === 'elevation-path');

  const onClick = (id: MapToolId) => () => {
    setActiveTool(activeTool === id || isActive(id) ? null : id);
  };

  const elevationActive =
    activeTool === 'elevation-point' || activeTool === 'elevation-path';

  // Re-fits the camera to the persisted parcel boundary. Mirrors the initial
  // fit performed by DiagnoseMap (48px padding, polygonBounds helper). Honors
  // prefers-reduced-motion: animate only when motion is allowed so the snap
  // is calm on low-motion preferences.
  const onReturnToProperty = () => {
    if (!boundary) return;
    const bb = polygonBounds(boundary);
    if (!bb) return;
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    map.fitBounds(bb, { padding: 48, animate: !reduceMotion });
  };

  return (
    <div className={css.dock}>
      <div className={css.bar} role="toolbar" aria-label="Map tools">
        <DelayedTooltip label="Basemap" position="top">
          <button
            type="button"
            className={css.btn}
            data-active={activeTool === 'basemap'}
            onClick={onClick('basemap')}
            aria-label="Basemap"
          >
            <MapIcon size={16} strokeWidth={1.75} />
          </button>
        </DelayedTooltip>
        <div className={css.divider} aria-hidden="true" />
        <DelayedTooltip label="Measure distance" position="top">
          <button
            type="button"
            className={css.btn}
            data-active={activeTool === 'distance'}
            onClick={onClick('distance')}
            aria-label="Measure distance"
          >
            <Ruler size={16} strokeWidth={1.75} />
          </button>
        </DelayedTooltip>
        <DelayedTooltip
          label={
            projectId ? 'Measure elevation' : 'Open a project to use elevation'
          }
          position="top"
        >
          <button
            type="button"
            className={css.btn}
            data-active={elevationActive}
            onClick={() =>
              setActiveTool(elevationActive ? null : 'elevation-point')
            }
            disabled={!projectId}
            aria-label="Measure elevation"
          >
            <Mountain size={16} strokeWidth={1.75} />
          </button>
        </DelayedTooltip>
        <DelayedTooltip label="Measure area" position="top">
          <button
            type="button"
            className={css.btn}
            data-active={activeTool === 'area'}
            onClick={onClick('area')}
            aria-label="Measure area"
          >
            <SquareDashed size={16} strokeWidth={1.75} />
          </button>
        </DelayedTooltip>
        {showBoundary && (
          <DelayedTooltip label="Draw property boundary" position="top">
            <button
              type="button"
              className={css.btn}
              data-active={activeTool === 'boundary'}
              onClick={onClick('boundary')}
              aria-label="Draw property boundary"
            >
              <Square size={16} strokeWidth={1.75} />
            </button>
          </DelayedTooltip>
        )}
        {showBoundary && onBoundaryImported && (
          <DelayedTooltip label="Import boundary (KML / GeoJSON)" position="top">
            <button
              type="button"
              className={css.btn}
              onClick={() => fileInputRef.current?.click()}
              aria-label="Import boundary from file"
            >
              <Upload size={16} strokeWidth={1.75} />
            </button>
          </DelayedTooltip>
        )}
        <DelayedTooltip
          label={
            boundary
              ? 'Return to property'
              : 'Draw a property boundary first'
          }
          position="top"
        >
          <button
            type="button"
            className={css.btn}
            onClick={onReturnToProperty}
            disabled={!boundary}
            aria-label="Return to property"
          >
            <Crosshair size={16} strokeWidth={1.75} />
          </button>
        </DelayedTooltip>
        {activeTool !== null && (
          <>
            <div className={css.divider} aria-hidden="true" />
            <DelayedTooltip label="Clear" position="top">
              <button
                type="button"
                className={css.btn}
                onClick={() => setActiveTool(null)}
                aria-label="Clear"
              >
                <X size={16} strokeWidth={1.75} />
              </button>
            </DelayedTooltip>
          </>
        )}
      </div>

      {showBoundary && onBoundaryImported && (
        <input
          ref={fileInputRef}
          type="file"
          accept=".kml,.kmz,.geojson,.json,application/geo+json"
          onChange={handleImportFile}
          aria-label="Boundary file"
          style={{ display: 'none' }}
        />
      )}

      {importError && (
        <div className={css.popover} role="alert">
          <span className={css.popoverTitle}>Import failed</span>
          <span style={{ fontSize: 12, lineHeight: 1.5 }}>{importError}</span>
          <button
            type="button"
            className={css.btn}
            style={{ marginTop: 8, width: '100%' }}
            onClick={() => setImportError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {activeTool === 'basemap' && (
        <div className={css.popover} role="dialog" aria-label="Basemap">
          <span className={css.popoverTitle}>Basemap</span>
          {BASEMAP_OPTIONS.map((opt) => (
            <label key={opt.key} className={css.overlayRow}>
              <input
                type="radio"
                name="basemap"
                checked={basemap === opt.key}
                onChange={() => setBasemap(opt.key)}
              />
              {opt.label}
            </label>
          ))}
        </div>
      )}

      {activeTool === 'distance' && <DistanceTool map={map} />}
      {activeTool === 'area' && <AreaTool map={map} />}
      {showBoundary && activeTool === 'boundary' && (
        <BoundaryTool
          map={map}
          existing={boundary ?? null}
          onBoundaryDrawn={onBoundaryDrawn}
        />
      )}
      {elevationActive && (
        <ElevationTool map={map} projectId={projectId ?? undefined} />
      )}
    </div>
  );
}
