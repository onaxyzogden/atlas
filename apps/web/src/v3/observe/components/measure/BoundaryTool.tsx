import { useEffect, useRef, useState } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import * as turf from '@turf/turf';
import css from '../MapToolbar.module.css';
import { MAPLIBRE_DRAW_STYLES } from '../draw/mapboxDrawStyles.js';

interface Props {
  map: MaplibreMap;
  /** Existing persisted polygon — when present, tool opens in edit (direct_select) mode. */
  existing?: GeoJSON.Polygon | null;
  onBoundaryDrawn?: (polygon: GeoJSON.Polygon) => void;
}

export default function BoundaryTool({ map, existing, onBoundaryDrawn }: Props) {
  const drawRef = useRef<MapboxDraw | null>(null);
  const [polygon, setPolygon] = useState<GeoJSON.Polygon | null>(existing ?? null);
  const [liveArea, setLiveArea] = useState<number | null>(null);
  // Stash latest onBoundaryDrawn so the effect does not re-init the draw
  // control every time the parent re-renders (ObserveLayout creates a new
  // inline arrow function on every render, which would otherwise cause
  // draw_polygon mode to restart mid-session and lose the in-progress polygon).
  const onBoundaryDrawnRef = useRef(onBoundaryDrawn);
  useEffect(() => {
    onBoundaryDrawnRef.current = onBoundaryDrawn;
  }, [onBoundaryDrawn]);
  // Snapshot existing at mount time so re-renders don't re-init the control.
  const existingRef = useRef(existing);

  useEffect(() => {
    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {},
      styles: MAPLIBRE_DRAW_STYLES,
    });
    map.addControl(draw);
    const seed = existingRef.current;
    if (seed) {
      const ids = draw.add({
        type: 'Feature',
        properties: {},
        geometry: seed,
      });
      const featureId = ids[0];
      if (featureId) {
        draw.changeMode('direct_select', { featureId });
      } else {
        draw.changeMode('draw_polygon');
      }
    } else {
      draw.changeMode('draw_polygon');
    }
    drawRef.current = draw;

    const onChange = () => {
      const all = draw.getAll();
      const feat = all.features[0];
      if (feat && feat.geometry.type === 'Polygon') {
        const poly = feat.geometry as GeoJSON.Polygon;
        setPolygon(poly);
        onBoundaryDrawnRef.current?.(poly);
      } else {
        setPolygon(null);
      }
    };

    // Live-area pump — fires on every MapboxDraw internal render (each click,
    // each mouse-move rubber-band tick). rAF-coalesced so we re-render React
    // at most once per frame even under the 60Hz `draw.render` firehose.
    let rafId: number | null = null;
    let pendingArea: number | null = null;
    const flushArea = () => {
      rafId = null;
      setLiveArea((prev) => (prev === pendingArea ? prev : pendingArea));
    };
    const onRender = () => {
      const fc = draw.getAll();
      let best: GeoJSON.Feature<GeoJSON.Polygon> | null = null;
      for (const f of fc.features) {
        if (f.geometry?.type === 'Polygon') {
          const ring = f.geometry.coordinates[0];
          if (
            ring &&
            (!best ||
              ring.length > (best.geometry.coordinates[0]?.length ?? 0))
          ) {
            best = f as GeoJSON.Feature<GeoJSON.Polygon>;
          }
        }
      }
      if (best && (best.geometry.coordinates[0]?.length ?? 0) >= 3) {
        const a = turf.area(best);
        pendingArea = a > 0 ? a : null;
      } else {
        pendingArea = null;
      }
      if (rafId === null) rafId = requestAnimationFrame(flushArea);
    };

    map.on('draw.create', onChange);
    map.on('draw.update', onChange);
    map.on('draw.delete', onChange);
    map.on('draw.render', onRender);

    return () => {
      map.off('draw.create', onChange);
      map.off('draw.update', onChange);
      map.off('draw.delete', onChange);
      map.off('draw.render', onRender);
      if (rafId !== null) cancelAnimationFrame(rafId);
      try {
        map.removeControl(draw);
      } catch {
        /* map already disposed */
      }
      drawRef.current = null;
    };
  }, [map]); // removed onBoundaryDrawn from deps — stashed in ref above

  const ring = polygon?.coordinates[0];
  const vertexCount = ring ? ring.length - 1 : 0;
  const finalAreaM2 = polygon
    ? turf.area({ type: 'Feature', properties: {}, geometry: polygon })
    : null;
  const displayAreaM2 = finalAreaM2 ?? liveArea;
  const areaDisplay =
    displayAreaM2 === null
      ? null
      : displayAreaM2 > 10000
        ? `${(displayAreaM2 / 10000).toFixed(2)} ha (${(displayAreaM2 / 4046.86).toFixed(2)} ac)`
        : `${displayAreaM2.toFixed(0)} m²`;

  return (
    <div className={css.popover} role="dialog" aria-label="Property boundary">
      <span className={css.popoverTitle}>Property boundary</span>
      {polygon ? (
        <div className={css.readout}>
          <span className={css.readoutLabel}>Vertices</span>
          <span className={css.readoutValue}>{vertexCount}</span>
          {areaDisplay && (
            <>
              <span className={css.readoutLabel}>Area</span>
              <span className={css.readoutValue}>{areaDisplay}</span>
            </>
          )}
        </div>
      ) : areaDisplay ? (
        <div className={css.readout}>
          <span className={css.readoutLabel}>Area</span>
          <span className={css.readoutValue}>{areaDisplay}</span>
        </div>
      ) : (
        <span className={css.hint}>
          Click points to outline the parcel. Double-click to close the
          polygon.
        </span>
      )}
    </div>
  );
}
