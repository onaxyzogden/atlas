/**
 * OperateMap — MapLibre container for the Operate page (field activity).
 *
 * Phase 5.2 PR2 closure (per `wiki/decisions/2026-04-30-v3-operate-field-map-scoping.md`).
 * Mirrors `DiagnoseMap`: same render-prop child API, same boundary-driven
 * `fitBounds`, same `MapTokenMissing` paste-key fallback. Deliberately
 * does *not* mount MapboxDraw — Operate is read-mostly, with click-to-
 * place-observation as the single mutation (wired in PR4).
 *
 * No `MatrixToggles` consumption: Operate's overlays are flag-driven, not
 * the Diagnose-style topography/sectors/zones suite. The render-prop
 * child receives `{ map, centroid, projectId? }` so overlays can scope
 * themselves to the active project.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  maplibregl,
  MAP_STYLES,
  hasMapToken,
  maptilerTransformRequest,
} from "../../lib/maplibre.js";
import MapTokenMissing from "../../components/MapTokenMissing.js";
import css from "./OperateMap.module.css";

const BOUNDARY_SOURCE_ID = "operate-parcel-boundary";
const BOUNDARY_LINE_LAYER = "operate-parcel-boundary-line";
const BOUNDARY_FILL_LAYER = "operate-parcel-boundary-fill";
const FIT_PADDING = 56;

export interface OperateMapChildProps {
  map: maplibregl.Map;
  centroid: [number, number];
}

export interface OperateMapProps {
  /** Fallback center when `boundary` is absent. */
  centroid: [number, number];
  /** Fallback zoom when `boundary` is absent. */
  zoom?: number;
  /** Parcel boundary polygon — drives viewport when present. */
  boundary?: GeoJSON.Polygon;
  /** Optional caption rendered in the top-left legend chip. */
  legendNote?: string;
  /** Render-prop overlays. Receives the live map instance. */
  children?: (ctx: OperateMapChildProps) => ReactNode;
}

function polygonBounds(poly: GeoJSON.Polygon): maplibregl.LngLatBounds | null {
  const ring = poly.coordinates[0];
  if (!ring || ring.length === 0) return null;
  const first = ring[0];
  if (!first || first[0] === undefined || first[1] === undefined) return null;
  const b = new maplibregl.LngLatBounds(
    [first[0], first[1]],
    [first[0], first[1]],
  );
  for (const pt of ring) {
    const lng = pt[0];
    const lat = pt[1];
    if (lng === undefined || lat === undefined) continue;
    b.extend([lng, lat]);
  }
  return b;
}

export default function OperateMap({
  centroid,
  zoom = 14,
  boundary,
  legendNote,
  children,
}: OperateMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);

  const { initialCenter, effectiveCentroid } = useMemo(() => {
    if (boundary) {
      const b = polygonBounds(boundary);
      if (b) {
        const c = b.getCenter();
        return {
          initialCenter: [c.lng, c.lat] as [number, number],
          effectiveCentroid: [c.lng, c.lat] as [number, number],
        };
      }
    }
    return { initialCenter: centroid, effectiveCentroid: centroid };
  }, [boundary, centroid]);

  // Mount MapLibre once; the empty-token branch is gated above the
  // container so this effect never fires without a key.
  useEffect(() => {
    if (!containerRef.current) return;
    const m = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLES["satellite"],
      center: initialCenter,
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
    // initialCenter intentionally not in deps — same reasoning as DiagnoseMap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  // Paint boundary outline + fitBounds.
  useEffect(() => {
    if (!map || !boundary) return;
    const data: GeoJSON.Feature<GeoJSON.Polygon> = {
      type: "Feature",
      properties: {},
      geometry: boundary,
    };

    const ensure = () => {
      const existing = map.getSource(BOUNDARY_SOURCE_ID) as
        | maplibregl.GeoJSONSource
        | undefined;
      if (!existing) {
        map.addSource(BOUNDARY_SOURCE_ID, { type: "geojson", data });
      } else {
        existing.setData(data);
      }
      if (!map.getLayer(BOUNDARY_FILL_LAYER)) {
        map.addLayer({
          id: BOUNDARY_FILL_LAYER,
          type: "fill",
          source: BOUNDARY_SOURCE_ID,
          paint: {
            "fill-color": "#c4a265",
            "fill-opacity": 0.05,
          },
        });
      }
      if (!map.getLayer(BOUNDARY_LINE_LAYER)) {
        map.addLayer({
          id: BOUNDARY_LINE_LAYER,
          type: "line",
          source: BOUNDARY_SOURCE_ID,
          paint: {
            "line-color": "#dca87c",
            "line-width": 2,
            "line-opacity": 0.9,
          },
        });
      }
      const fb = polygonBounds(boundary);
      if (fb) {
        map.fitBounds(fb, { padding: FIT_PADDING, animate: false });
      }
    };

    const ready = () => (map.getStyle()?.layers?.length ?? 0) > 0;
    if (ready()) {
      ensure();
      return;
    }
    const onStyle = () => {
      if (!ready()) return;
      ensure();
      map.off("styledata", onStyle);
    };
    map.on("styledata", onStyle);
    return () => {
      map.off("styledata", onStyle);
    };
  }, [map, boundary]);

  if (!hasMapToken) {
    return (
      <div className={css.wrap}>
        <div className={css.empty}>
          <MapTokenMissing />
        </div>
      </div>
    );
  }

  return (
    <div className={css.wrap}>
      <div ref={containerRef} className={css.map} />
      {legendNote && (
        <div className={css.legend} aria-hidden="true">
          <span className={css.legendNote}>{legendNote}</span>
        </div>
      )}
      {map && children?.({ map, centroid: effectiveCentroid })}
    </div>
  );
}
