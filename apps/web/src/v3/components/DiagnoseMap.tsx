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
import { useMatrixTogglesStore } from "../../store/matrixTogglesStore.js";
import type { WindClimatologyStatus } from "../data/useWindClimatology.js";
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
  /** Provenance of the wind rose — drives a chip in the legend. */
  windStatus?: WindClimatologyStatus;
  children?: (ctx: DiagnoseMapChildProps) => ReactNode;
}

function polygonBounds(poly: GeoJSON.Polygon): maplibregl.LngLatBounds {
  const ring = poly.coordinates[0];
  const b = new maplibregl.LngLatBounds(
    [ring[0][0], ring[0][1]],
    [ring[0][0], ring[0][1]],
  );
  for (const [lng, lat] of ring) b.extend([lng, lat]);
  return b;
}

export default function DiagnoseMap({
  centroid,
  zoom = 14,
  boundary,
  homestead,
  windStatus,
  children,
}: DiagnoseMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [placing, setPlacing] = useState(false);

  const topography = useMatrixTogglesStore((s) => s.topography);
  const sectors = useMatrixTogglesStore((s) => s.sectors);
  const zones = useMatrixTogglesStore((s) => s.zones);
  const wind = useMatrixTogglesStore((s) => s.wind);
  const water = useMatrixTogglesStore((s) => s.water);
  const anyOn = topography || sectors || zones || wind || water;

  // Derive viewport from boundary when available; fall back to props otherwise.
  const { initialCenter, effectiveCentroid } = useMemo(() => {
    if (boundary) {
      const b = polygonBounds(boundary);
      const c = b.getCenter();
      return {
        initialCenter: [c.lng, c.lat] as [number, number],
        effectiveCentroid: [c.lng, c.lat] as [number, number],
      };
    }
    return { initialCenter: centroid, effectiveCentroid: centroid };
  }, [boundary, centroid]);

  useEffect(() => {
    if (!containerRef.current) return;
    const m = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLES["topographic"],
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

  // Paint boundary outline + fitBounds when boundary is present.
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
      map.fitBounds(polygonBounds(boundary), {
        padding: FIT_PADDING,
        animate: false,
      });
    };

    // `isStyleLoaded()` stays false until raster tile sources finish, and
    // `once("load")` may have already fired by the time this effect mounts.
    // Gate on the presence of style layers via `styledata` instead — it fires
    // as soon as the style spec is parsed, which is all we need to add ours.
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
      {anyOn && (
        <div className={css.legend} aria-hidden="true">
          <span className={css.legendTitle}>Active overlays</span>
          {topography && (
            <span className={css.legendRow}>
              <span className={css.swatch} style={{ background: "#7a6a3f" }} />
              Topography (contours)
            </span>
          )}
          {sectors && (
            <span className={css.legendRow}>
              <span className={css.swatch} style={{ background: "#c4a265" }} />
              Solar sectors (sun arcs)
            </span>
          )}
          {zones && (
            <span className={css.legendRow}>
              <span className={css.swatch} style={{ background: "#a85a3f" }} />
              Zones (use-frequency rings)
            </span>
          )}
          {wind && (
            <span className={css.legendRow}>
              <span className={css.swatch} style={{ background: "#5b7a8a" }} />
              Wind (prevailing rose)
              {windStatus && <WindStatusChip status={windStatus} />}
            </span>
          )}
          {water && (
            <span className={css.legendRow}>
              <span className={css.swatch} style={{ background: "#5b8aa8" }} />
              Water (streams · surface water)
            </span>
          )}
          {homestead?.legendNote && (
            <span className={css.legendNote}>{homestead.legendNote}</span>
          )}
        </div>
      )}
    </div>
  );
}

const CHIP_LABEL: Record<WindClimatologyStatus, string> = {
  live: "Live ERA5",
  fallback: "Defaults",
  loading: "Loading…",
};

function WindStatusChip({ status }: { status: WindClimatologyStatus }) {
  return (
    <span
      className={`${css.windChip} ${css[`windChip_${status}`]}`}
      title={
        status === "live"
          ? "Open-Meteo ERA5 reanalysis for this anchor"
          : status === "fallback"
            ? "Pedagogical Eastern-Ontario climatology (live fetch unavailable)"
            : "Fetching ERA5 climatology…"
      }
    >
      {CHIP_LABEL[status]}
    </span>
  );
}
