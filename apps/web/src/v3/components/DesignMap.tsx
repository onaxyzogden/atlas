/**
 * DesignMap — MapLibre container for the Design Studio canvas.
 *
 * Phase 5.1 PR1 closure (per `wiki/decisions/2026-04-30-v3-design-canvas-
 * scoping.md`). Mirrors `DiagnoseMap`: same render-prop child API, same
 * boundary-driven `fitBounds`, same `MapTokenMissing` paste-key fallback.
 *
 * PR1 scope is deliberately narrow:
 *   - Mount MapLibre, fit to parcel boundary, render boundary outline.
 *   - Accept a `styleKey` prop wired to the existing `MAP_STYLES` table so
 *     the DesignPage Base Map dropdown swaps tiles live.
 *   - Render-prop `children?: ({ map, centroid }) => ReactNode` for
 *     overlays. PR2 mounts the 5 overlay components (contours / hydrology
 *     / soils / property / wetlands).
 *   - Click-to-drop placement (PR3) and live score-delta callouts (PR4)
 *     remain unwired — the canvas still ships the "live placement coming
 *     in PR3" notice on top of the live tiles.
 *
 * Deliberately does *not* mount `MapboxDraw` — v3 placements happen via
 * toolbox click-to-drop, not the v2 `MapCanvas` polygon-edit toolchain.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  maplibregl,
  MAP_STYLES,
  hasMapToken,
  maptilerTransformRequest,
} from "../../lib/maplibre.js";
import MapTokenMissing from "../../components/MapTokenMissing.js";
import { useMapFocusStore } from "../../store/mapFocusStore.js";
import css from "./DesignMap.module.css";

const BOUNDARY_SOURCE_ID = "design-parcel-boundary";
const BOUNDARY_LINE_LAYER = "design-parcel-boundary-line";
const BOUNDARY_FILL_LAYER = "design-parcel-boundary-fill";
const FIT_PADDING = 56;

export const DESIGN_MAP_STYLE_KEYS = [
  "satellite",
  "topographic",
  "terrain",
  "street",
  "hybrid",
] as const;
export type DesignMapStyleKey = (typeof DESIGN_MAP_STYLE_KEYS)[number];

export interface DesignMapChildProps {
  map: maplibregl.Map;
  centroid: [number, number];
}

export interface DesignMapProps {
  /** Fallback center when `boundary` is absent. */
  centroid: [number, number];
  /** Fallback zoom when `boundary` is absent. */
  zoom?: number;
  /** Parcel boundary polygon — drives viewport when present. */
  boundary?: GeoJSON.Polygon;
  /** Active base-map key — swaps the underlying tile style live. */
  styleKey?: DesignMapStyleKey;
  /** Optional caption rendered in the top-right notice chip. */
  notice?: string;
  /** Render-prop overlays. Receives the live map instance. */
  children?: (ctx: DesignMapChildProps) => ReactNode;
  /** When set, DesignMap consumes Map Focus requests scoped to this project. */
  projectId?: string;
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

export default function DesignMap({
  centroid,
  zoom = 14,
  boundary,
  styleKey = "satellite",
  notice,
  children,
  projectId,
}: DesignMapProps) {
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

  // Mount MapLibre once. styleKey is read on initial mount; subsequent
  // changes are routed through `setStyle` in the dedicated effect below
  // so the user's pan/zoom state is preserved across base-map swaps.
  useEffect(() => {
    if (!containerRef.current) return;
    const m = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLES[styleKey] ?? MAP_STYLES["satellite"]!,
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
    // initialCenter / styleKey intentionally not in deps — same reasoning as
    // DiagnoseMap. Style swaps run through setStyle below; viewport changes
    // run through the boundary effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  // Live base-map swap. `setStyle` reloads the style JSON without unmounting
  // the camera; we re-paint the boundary in the next effect once `styledata`
  // fires for the new style. Guard against re-applying the *current* style
  // on mount — the constructor already loaded it, and a redundant setStyle
  // would trigger an unnecessary reload + boundary re-add loop.
  const lastStyleRef = useRef<DesignMapStyleKey>(styleKey);
  useEffect(() => {
    if (!map) return;
    if (lastStyleRef.current === styleKey) return;
    const target = MAP_STYLES[styleKey];
    if (!target) return;
    lastStyleRef.current = styleKey;
    map.setStyle(target);
  }, [map, styleKey]);

  // Paint boundary outline + fitBounds. The effect re-attaches its source +
  // layers any time the style is swapped (setStyle wipes everything tied to
  // the old style), so we listen to `styledata` and idempotently ensure the
  // boundary layers exist after each load.
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
    };

    const ready = () => (map.getStyle()?.layers?.length ?? 0) > 0;
    if (ready()) {
      ensure();
      const fb = polygonBounds(boundary);
      if (fb) map.fitBounds(fb, { padding: FIT_PADDING, animate: false });
    }
    const onStyle = () => {
      if (!ready()) return;
      ensure();
    };
    map.on("styledata", onStyle);
    return () => {
      map.off("styledata", onStyle);
    };
  }, [map, boundary]);

  // Phase 6.2: consume Map Focus requests targeting this project. Fires
  // a flyTo when ProvePage's "Fix on Map" lands the user on Design.
  // requestedAt is monotonic so re-clicking the CTA refires even when
  // the camera is already centred on the parcel.
  const focusRequest = useMapFocusStore((s) => s.request);
  const clearFocus = useMapFocusStore((s) => s.clear);
  useEffect(() => {
    if (!map || !focusRequest) return;
    if (projectId && focusRequest.projectId !== projectId) return;
    map.flyTo({
      center: focusRequest.center,
      zoom: focusRequest.zoom ?? Math.max(map.getZoom(), 15),
      duration: 1200,
      essential: true,
    });
    clearFocus();
  }, [map, focusRequest, projectId, clearFocus]);

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
      {notice && (
        <div className={css.notice} aria-hidden="true">
          <span className={css.badge}>Phase 5.1 PR1</span>
          <span>{notice}</span>
        </div>
      )}
      {map && children?.({ map, centroid: effectiveCentroid })}
    </div>
  );
}
