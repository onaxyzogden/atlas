/**
 * DiagnoseMap — MapLibre container for the Diagnose page (site analysis).
 *
 * Permaculture Scholar IA (wiki/concepts/atlas-sidebar-permaculture.md):
 * sectors / zones / topography are *site-analysis* tools, so they live on
 * Diagnose, not Discover. Children are render-prop overlay components that
 * receive the live map instance and the parcel centroid.
 *
 * Viewport: when `boundary` is provided, the map fits to its bounds and
 * the centroid passed to render-prop children is `bounds.getCenter()`.
 * When absent, falls back to the legacy `centroid` + `zoom` props (kept
 * for non-MTC mock projects that don't yet carry a boundary polygon).
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  maplibregl,
  MAP_STYLES,
  hasMapToken,
  maptilerTransformRequest,
} from "../../lib/maplibre.js";
import MapTokenMissing from "../../components/MapTokenMissing.js";
import { useBasemapStore } from "../observe/components/measure/useMapToolStore.js";
import css from "./DiagnoseMap.module.css";

const BOUNDARY_SOURCE_ID = "diagnose-parcel-boundary";
const BOUNDARY_LINE_LAYER = "diagnose-parcel-boundary-line";
const BOUNDARY_FILL_LAYER = "diagnose-parcel-boundary-fill";
const FIT_PADDING = 48;

export interface DiagnoseMapChildProps {
  map: maplibregl.Map;
  centroid: [number, number];
}

export interface HomesteadControl {
  /** Render a "Place homestead" / "Move" / "Clear" toolbar. */
  enabled: boolean;
  /** True when a homestead is currently set — flips the toolbar verbs. */
  hasHomestead: boolean;
  /** Called with map lngLat when user clicks during placement mode. */
  onPlace: (point: [number, number]) => void;
  /** Called when user clears the homestead. */
  onClear: () => void;
  /** Caption appended to the legend ("· anchored at homestead"/"· at centroid"). */
  legendNote?: string;
}

export interface DiagnoseMapProps {
  /** Fallback center if `boundary` is absent. */
  centroid: [number, number];
  /** Fallback zoom if `boundary` is absent. */
  zoom?: number;
  /** Parcel boundary polygon. When present, drives viewport + centroid. */
  boundary?: GeoJSON.Polygon;
  /** Optional homestead-placement control rendered as a small map toolbar. */
  homestead?: HomesteadControl;
  children?: (ctx: DiagnoseMapChildProps) => ReactNode;
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

export default function DiagnoseMap({
  centroid,
  zoom = 14,
  boundary,
  homestead,
  children,
}: DiagnoseMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [placing, setPlacing] = useState(false);
  const basemap = useBasemapStore((s) => s.basemap);
  const initialBasemapRef = useRef(basemap);

  // Derive viewport from boundary when available; fall back to props otherwise.
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

  useEffect(() => {
    if (!containerRef.current) return;
    const m = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLES[initialBasemapRef.current] ?? MAP_STYLES["topographic"],
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
    // initialCenter intentionally not in deps — recentering on memo identity
    // change would steal the user's pan. Boundary identity is the real signal,
    // and that's handled by the fitBounds effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  // Swap basemap style when the user picks a different basemap.
  useEffect(() => {
    if (!map) return;
    const target = MAP_STYLES[basemap];
    if (!target) return;
    map.setStyle(target);
  }, [map, basemap]);

  // Paint boundary outline + fitBounds when boundary is present. Re-runs after
  // every style.load so the polygon survives basemap switches (setStyle wipes
  // app-added sources/layers).
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
            "fill-opacity": 0.06,
          },
        });
      }
      if (!map.getLayer(BOUNDARY_LINE_LAYER)) {
        map.addLayer({
          id: BOUNDARY_LINE_LAYER,
          type: "line",
          source: BOUNDARY_SOURCE_ID,
          paint: {
            "line-color": "#7a6a3f",
            "line-width": 2,
            "line-opacity": 0.85,
          },
        });
      }
    };

    const ensureAndFit = () => {
      ensure();
      const fb = polygonBounds(boundary);
      if (fb) {
        map.fitBounds(fb, {
          padding: FIT_PADDING,
          animate: false,
        });
      }
    };

    const ready = () => (map.getStyle()?.layers?.length ?? 0) > 0;
    if (ready()) {
      ensureAndFit();
    } else {
      const onFirst = () => {
        if (!ready()) return;
        ensureAndFit();
        map.off("styledata", onFirst);
      };
      map.on("styledata", onFirst);
    }
    // Reapply (without refit) after every subsequent style swap.
    const onStyleSwap = () => ensure();
    map.on("style.load", onStyleSwap);
    return () => {
      map.off("style.load", onStyleSwap);
    };
  }, [map, boundary]);

  // Placement mode: one-shot map click → onPlace, then exit. Crosshair cursor
  // is set on the canvas while active; restored on exit/cleanup.
  useEffect(() => {
    if (!map || !placing || !homestead) return;
    const canvas = map.getCanvas();
    const prevCursor = canvas.style.cursor;
    canvas.style.cursor = "crosshair";
    const onClick = (e: maplibregl.MapMouseEvent) => {
      homestead.onPlace([e.lngLat.lng, e.lngLat.lat]);
      setPlacing(false);
    };
    map.once("click", onClick);
    return () => {
      canvas.style.cursor = prevCursor;
      map.off("click", onClick);
    };
  }, [map, placing, homestead]);

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
      {map && children?.({ map, centroid: effectiveCentroid })}
      {homestead?.enabled && (
        <div className={css.toolbar}>
          <button
            type="button"
            className={css.toolBtn}
            data-active={placing ? "true" : "false"}
            onClick={() => setPlacing((p) => !p)}
          >
            {placing
              ? "Click map…"
              : homestead.hasHomestead
                ? "Move homestead"
                : "Place homestead"}
          </button>
          {homestead.hasHomestead && (
            <button
              type="button"
              className={css.toolBtn}
              onClick={() => {
                setPlacing(false);
                homestead.onClear();
              }}
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
