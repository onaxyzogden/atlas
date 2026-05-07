import { useEffect, useRef, useState } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import * as turf from '@turf/turf';
import css from '../MapToolbar.module.css';

interface Props {
  map: MaplibreMap;
  onBoundaryDrawn?: (polygon: GeoJSON.Polygon) => void;
}

export default function BoundaryTool({ map, onBoundaryDrawn }: Props) {
  const drawRef = useRef<MapboxDraw | null>(null);
  const [polygon, setPolygon] = useState<GeoJSON.Polygon | null>(null);

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
        const poly = feat.geometry as GeoJSON.Polygon;
        setPolygon(poly);
        onBoundaryDrawn?.(poly);
      } else {
        setPolygon(null);
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
  }, [map, onBoundaryDrawn]);

  const ring = polygon?.coordinates[0];
  const vertexCount = ring ? ring.length - 1 : 0;
  const areaHa = polygon
    ? turf.area({ type: 'Feature', properties: {}, geometry: polygon }) / 10000
    : null;

  return (
    <div className={css.popover} role="dialog" aria-label="Property boundary">
      <span className={css.popoverTitle}>Property boundary</span>
      {polygon ? (
        <div className={css.readout}>
          <span className={css.readoutLabel}>Vertices</span>
          <span className={css.readoutValue}>{vertexCount}</span>
          {areaHa !== null && (
            <>
              <span className={css.readoutLabel}>Area</span>
              <span className={css.readoutValue}>{areaHa.toFixed(2)} ha</span>
            </>
          )}
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
