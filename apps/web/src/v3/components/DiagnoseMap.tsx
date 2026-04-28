/**
 * DiagnoseMap — MapLibre container for the Diagnose page (site analysis).
 *
 * Permaculture Scholar IA (wiki/concepts/atlas-sidebar-permaculture.md):
 * sectors / zones / topography are *site-analysis* tools, so they live on
 * Diagnose, not Discover. Children are render-prop overlay components that
 * receive the live map instance and the parcel centroid.
 *
 * MTC centroid is hard-coded for v3.1 — mockProject lacks lat/lng. Real
 * parcel geometry will swap in when the project store gains a boundary.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  maplibregl,
  MAP_STYLES,
  hasMapToken,
  maptilerTransformRequest,
} from "../../lib/maplibre.js";
import MapTokenMissing from "../../components/MapTokenMissing.js";
import { useMatrixTogglesStore } from "../../store/matrixTogglesStore.js";
import css from "./DiagnoseMap.module.css";

export interface DiagnoseMapChildProps {
  map: maplibregl.Map;
  centroid: [number, number];
}

export interface DiagnoseMapProps {
  centroid: [number, number];
  zoom?: number;
  children?: (ctx: DiagnoseMapChildProps) => ReactNode;
}

export default function DiagnoseMap({ centroid, zoom = 14, children }: DiagnoseMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);

  const topography = useMatrixTogglesStore((s) => s.topography);

  useEffect(() => {
    if (!containerRef.current) return;
    const m = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLES["topographic"],
      center: centroid,
      zoom,
      attributionControl: { compact: true },
      transformRequest: maptilerTransformRequest,
    });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    setMap(m);
    return () => {
      setMap(null);
      m.remove();
    };
  }, [centroid, zoom]);

  if (!hasMapToken) {
    return (
      <div className={css.wrap}>
        <MapTokenMissing />
      </div>
    );
  }

  return (
    <div className={css.wrap}>
      <div ref={containerRef} className={css.map} />
      {map && children?.({ map, centroid })}
      {topography && (
        <div className={css.legend} aria-hidden="true">
          <span className={css.legendTitle}>Active overlays</span>
          <span className={css.legendRow}>
            <span className={css.swatch} style={{ background: "#7a6a3f" }} />
            Topography (contours)
          </span>
        </div>
      )}
    </div>
  );
}
