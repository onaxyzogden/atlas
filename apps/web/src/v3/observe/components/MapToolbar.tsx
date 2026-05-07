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

import { useEffect } from 'react';
import {
  Layers,
  Map as MapIcon,
  Ruler,
  Mountain,
  Square,
  SquareDashed,
  X,
} from 'lucide-react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import { useMatrixTogglesStore } from '../../../store/matrixTogglesStore.js';
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
import css from './MapToolbar.module.css';

interface Props {
  map: MaplibreMap;
  projectId?: string | null;
  onBoundaryDrawn?: (polygon: GeoJSON.Polygon) => void;
}

interface OverlayDef {
  key:
    | 'topography'
    | 'sectors'
    | 'zones'
    | 'wind'
    | 'water'
    | 'observeAnnotations';
  label: string;
  swatch: string;
}

const OVERLAYS: OverlayDef[] = [
  { key: 'observeAnnotations', label: 'Observe annotations (steward-placed)', swatch: '#7c5a8a' },
  { key: 'topography', label: 'Topography (contours + hillshade)', swatch: '#7a6a3f' },
  { key: 'sectors', label: 'Solar sectors (sun arcs)', swatch: '#c4a265' },
  { key: 'zones', label: 'Zones (use-frequency rings)', swatch: '#a85a3f' },
  { key: 'wind', label: 'Wind (prevailing rose)', swatch: '#5b7a8a' },
  { key: 'water', label: 'Water (streams · surface water)', swatch: '#5b8aa8' },
];

export default function MapToolbar({ map, projectId, onBoundaryDrawn }: Props) {
  const activeTool = useMapToolStore((s) => s.activeTool);
  const setActiveTool = useMapToolStore((s) => s.setActiveTool);
  const toggles = useMatrixTogglesStore();
  const basemap = useBasemapStore((s) => s.basemap);
  const setBasemap = useBasemapStore((s) => s.setBasemap);

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

  return (
    <div className={css.dock}>
      <div className={css.bar} role="toolbar" aria-label="Map tools">
        <button
          type="button"
          className={css.btn}
          data-active={activeTool === 'overlays'}
          onClick={onClick('overlays')}
          title="Overlays"
          aria-label="Overlays"
        >
          <Layers size={16} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          className={css.btn}
          data-active={activeTool === 'basemap'}
          onClick={onClick('basemap')}
          title="Basemap"
          aria-label="Basemap"
        >
          <MapIcon size={16} strokeWidth={1.75} />
        </button>
        <div className={css.divider} aria-hidden="true" />
        <button
          type="button"
          className={css.btn}
          data-active={activeTool === 'distance'}
          onClick={onClick('distance')}
          title="Measure distance"
          aria-label="Measure distance"
        >
          <Ruler size={16} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          className={css.btn}
          data-active={elevationActive}
          onClick={() =>
            setActiveTool(elevationActive ? null : 'elevation-point')
          }
          disabled={!projectId}
          title={
            projectId ? 'Measure elevation' : 'Open a project to use elevation'
          }
          aria-label="Measure elevation"
        >
          <Mountain size={16} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          className={css.btn}
          data-active={activeTool === 'area'}
          onClick={onClick('area')}
          title="Measure area"
          aria-label="Measure area"
        >
          <Square size={16} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          className={css.btn}
          data-active={activeTool === 'boundary'}
          onClick={onClick('boundary')}
          title="Draw property boundary"
          aria-label="Draw property boundary"
        >
          <SquareDashed size={16} strokeWidth={1.75} />
        </button>
        {activeTool !== null && (
          <>
            <div className={css.divider} aria-hidden="true" />
            <button
              type="button"
              className={css.btn}
              onClick={() => setActiveTool(null)}
              title="Clear"
              aria-label="Clear"
            >
              <X size={16} strokeWidth={1.75} />
            </button>
          </>
        )}
      </div>

      {activeTool === 'overlays' && (
        <div className={css.popover} role="dialog" aria-label="Overlays">
          <span className={css.popoverTitle}>Overlays</span>
          {OVERLAYS.map((o) => (
            <label key={o.key} className={css.overlayRow}>
              <input
                type="checkbox"
                checked={toggles[o.key]}
                onChange={() => toggles.toggle(o.key)}
              />
              <span className={css.swatch} style={{ background: o.swatch }} />
              {o.label}
            </label>
          ))}
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
      {activeTool === 'boundary' && (
        <BoundaryTool map={map} onBoundaryDrawn={onBoundaryDrawn} />
      )}
      {elevationActive && (
        <ElevationTool map={map} projectId={projectId ?? undefined} />
      )}
    </div>
  );
}
