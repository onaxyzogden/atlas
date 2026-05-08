import { useEffect, useRef, useState } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import * as turf from '@turf/turf';
import css from '../MapToolbar.module.css';

interface Props {
  map: MaplibreMap;
}

export default function DistanceTool({ map }: Props) {
  const drawRef = useRef<MapboxDraw | null>(null);
  const [meters, setMeters] = useState<number | null>(null);

  useEffect(() => {
    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {},
    });
    map.addControl(draw);
    draw.changeMode('draw_line_string');
    drawRef.current = draw;

    const onChange = () => {
      const all = draw.getAll();
      const feat = all.features[0];
      if (feat && feat.geometry.type === 'LineString') {
        const m = turf.length(feat as GeoJSON.Feature<GeoJSON.LineString>, {
          units: 'meters',
        });
        setMeters(m);
      } else {
        setMeters(null);
      }
    };

    map.on('draw.create', onChange);
    map.on('draw.update', onChange);
    map.on('draw.delete', onChange);

    return () => {
      map.off('draw.create', onChange);
      map.off('draw.update', onChange);
      map.off('draw.delete', onChange);
      try {
        map.removeControl(draw);
      } catch {
        /* map already disposed */
      }
      drawRef.current = null;
    };
  }, [map]);

  const display =
    meters === null
      ? null
      : meters > 1000
        ? `${(meters / 1000).toFixed(2)} km`
        : `${meters.toFixed(1)} m`;

  return (
    <div className={css.popover} role="dialog" aria-label="Distance">
      <span className={css.popoverTitle}>Distance</span>
      <div className={css.readout}>
        {display ? (
          <span className={css.readoutValue}>{display}</span>
        ) : (
          <span className={css.hint}>
            Click points to draw a line. Double-click to finish.
          </span>
        )}
      </div>
    </div>
  );
}
