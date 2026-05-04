/**
 * HomesteadMarker — draggable MapLibre marker representing the dwelling
 * (Mollison's Zone 0 anchor). Renders only when an explicit homestead point
 * exists in the store; otherwise the page-level anchor falls back to the
 * parcel centroid and no marker is shown.
 *
 * Drag UX: position updates locally during drag (no store thrash); on
 * `dragend` we persist to the store, which triggers sector/zone recompute.
 */

import { useEffect, useRef } from "react";
import { maplibregl } from "../../../lib/maplibre.js";
import { useHomesteadStore, type LngLat } from "../../../store/homesteadStore.js";

export interface HomesteadMarkerProps {
  map: maplibregl.Map;
  projectId: string;
  point: LngLat;
}

function buildElement(): HTMLDivElement {
  const el = document.createElement("div");
  el.setAttribute("aria-label", "Homestead anchor (Zone 0)");
  el.style.cssText = [
    "width:22px",
    "height:22px",
    "border-radius:50%",
    "background:#7a3f2e",
    "border:2px solid #f2ede3",
    "box-shadow:0 1px 4px rgba(0,0,0,0.4)",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "color:#f2ede3",
    "font-size:12px",
    "font-family:sans-serif",
    "font-weight:700",
    "cursor:grab",
    "user-select:none",
  ].join(";");
  el.textContent = "0";
  return el;
}

export default function HomesteadMarker({ map, projectId, point }: HomesteadMarkerProps) {
  const setPoint = useHomesteadStore((s) => s.set);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!map) return;
    const el = buildElement();
    const marker = new maplibregl.Marker({ element: el, draggable: true })
      .setLngLat(point)
      .addTo(map);

    const onDragEnd = () => {
      const ll = marker.getLngLat();
      setPoint(projectId, [ll.lng, ll.lat]);
    };
    marker.on("dragend", onDragEnd);

    markerRef.current = marker;
    return () => {
      marker.off("dragend", onDragEnd);
      marker.remove();
      markerRef.current = null;
    };
    // point is intentionally omitted — re-creating on every store update
    // would steal mid-drag state. Position sync happens in the next effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, projectId, setPoint]);

  useEffect(() => {
    const m = markerRef.current;
    if (!m) return;
    const cur = m.getLngLat();
    if (cur.lng !== point[0] || cur.lat !== point[1]) {
      m.setLngLat(point);
    }
  }, [point]);

  return null;
}
