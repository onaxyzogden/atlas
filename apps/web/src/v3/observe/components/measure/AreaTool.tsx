import { useEffect, useRef, useState } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import * as turf from '@turf/turf';
import css from '../MapToolbar.module.css';

interface Props {
  map: MaplibreMap;
}

export default function AreaTool({ map }: Props) {
  const drawRef = useRef<MapboxDraw | null>(null);
  const [m2, setM2] = useState<number | null>(null);

  useEffect(() => {
    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {},
    });
    map.addControl(draw);
    draw.changeMode('draw_polygon');
    drawRef.current = draw;

    const onChange = () => {
      const all = draw.getAll();
      const feat = all.features[0];
      if (feat && feat.geometry.type === 'Polygon') {
        setM2(turf.area(feat as GeoJSON.Feature<GeoJSON.Polygon>));
      } else {
        setM2(null);
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
    m2 === null
      ? null
      : m2 > 10000
        ? `${(m2 / 10000).toFixed(2)} ha (${(m2 / 4046.86).toFixed(2)} ac)`
        : `${m2.toFixed(0)} m²`;

  return (
    <div className={css.popover} role="dialog" aria-label="Area">
      <span className={css.popoverTitle}>Area</span>
      <div className={css.readout}>
        {display ? (
          <span className={css.readoutValue}>{display}</span>
        ) : (
          <span className={css.hint}>
            Click points to draw a polygon. Double-click to finish.
          </span>
        )}
      </div>
    </div>
  );
}
