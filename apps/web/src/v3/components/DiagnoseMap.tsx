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
const BOUNDARY_LINE_CASING_LAYER = "diagnose-parcel-boundary-line-casing";
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

export function polygonBounds(poly: GeoJSON.Polygon): maplibregl.LngLatBounds | null {
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
  // Tracks the basemap value most recently *applied* to the map. The
  // basemap-swap effect compares against this so it can skip the no-op
  // setStyle on first mount (when the map was just constructed with the
  // rehydrated basemap). That no-op setStyle was triggering MapLibre's
  // diff path, which removed app-added sources (observe-anno-*, BE
  // layers) the steward had just placed — a Polygon/Building adopt would
  // appear briefly and then vanish.
  const appliedBasemapRef = useRef(basemap);

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
    if (import.meta.env.DEV) (window as unknown as { __atlasMap?: maplibregl.Map }).__atlasMap = m;
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
  //
  // CRITICAL: skip when `basemap` matches what's already applied. The map
  // is constructed with `MAP_STYLES[initialBasemapRef.current]`, so on
  // first mount this effect would otherwise call `setStyle` with the same
  // style URL it was just built with. MapLibre's `setStyle` defaults to
  // `{diff: true}`: it computes a diff between the *current* style (which
  // at this point already includes our app-added sources/layers from any
  // sibling effect that ran first — ObserveAnnotationLayers, BE layers,
  // etc.) and the *new* style JSON, then removes everything in current
  // that isn't in new via `style.setState` → `style.removeSource`. That
  // path bypasses `map.removeSource`, fires no `style.load` event the
  // app can re-hook from, and silently wipes adopted-building + annotation
  // sources within a second of placement.
  useEffect(() => {
    if (!map) return;
    if (appliedBasemapRef.current === basemap) return;
    const target = MAP_STYLES[basemap];
    if (!target) return;
    appliedBasemapRef.current = basemap;
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
            "fill-opacity": 0.08,
          },
        });
      }
      // Two-pass casing → main stroke. Dark casing underneath gives the
      // line legibility on bright/satellite basemaps where a thin tan line
      // disappears into terrain; the warm gold on top stays branded. This
      // pattern is standard MapLibre cartography (cf. street casings).
      if (!map.getLayer(BOUNDARY_LINE_CASING_LAYER)) {
        map.addLayer({
          id: BOUNDARY_LINE_CASING_LAYER,
          type: "line",
          source: BOUNDARY_SOURCE_ID,
          paint: {
            "line-color": "#1f1a14",
            "line-width": 6,
            "line-opacity": 0.6,
          },
        });
      }
      if (!map.getLayer(BOUNDARY_LINE_LAYER)) {
        map.addLayer({
          id: BOUNDARY_LINE_LAYER,
          type: "line",
          source: BOUNDARY_SOURCE_ID,
          paint: {
            "line-color": "#e6c34a",
            "line-width": 3,
            "line-opacity": 0.95,
          },
        });
      }
    };

    // ADDENDUM 7 (render-path-A fix): idempotently re-add the boundary
    // source/layers on every `styledata` event. The previous design
    // attached a one-shot `styledata` for the first paint plus a
    // `style.load` listener for subsequent basemap swaps, but in some
    // F5/setStyle interleavings `style.load` does not fire and the
    // initial-paint listener has already self-`off`d — leaving the
    // app-added layers wiped without re-entry. `styledata` fires for
    // every style update including basemap swaps, and `ensure()` is
    // idempotent (guards on `getSource`/`getLayer`). fitBounds runs
    // exactly once per mount/boundary-change so we never steal the
    // user's pan.
    const ready = () => (map.getStyle()?.layers?.length ?? 0) > 0;
    let didInitialFit = false;
    const ensureAndMaybeFit = () => {
      if (!ready()) return;
      ensure();
      if (didInitialFit) return;
      const fb = polygonBounds(boundary);
      if (fb) {
        map.fitBounds(fb, {
          padding: FIT_PADDING,
          animate: false,
        });
      }
      didInitialFit = true;
    };
    ensureAndMaybeFit();
    map.on("styledata", ensureAndMaybeFit);
    return () => {
      map.off("styledata", ensureAndMaybeFit);
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
