/**
 * FieldFlagOverlay — Phase 5.2 PR2.
 *
 * Renders a `FieldFlag[]` as an HTML-marker layer on top of an `OperateMap`
 * MapLibre instance. Per the scoping ADR each flag is one DOM marker (not
 * a sprite-sheet symbol layer) — the marker count on Operate is small
 * (5–20 typical) so the simplicity of HTML markers wins over the sprite
 * pipeline. If pin density grows past ~50, swap to the sprite/symbol
 * pattern referenced in the ADR.
 *
 * Click → opens a `maplibregl.Popup` with label + detail + observedAt and
 * fires `onSelect(flagId)` for any host-side state (e.g., scrolling the
 * Alerts panel to the matching item — wired in PR3 / PR4).
 */

import { useEffect, useRef } from "react";
import { maplibregl } from "../../../lib/maplibre.js";
import type { FieldFlag, FieldFlagKind, OpsTone } from "../../types.js";

export interface FieldFlagOverlayProps {
  map: maplibregl.Map;
  flags: FieldFlag[];
  onSelect?: (flagId: string) => void;
}

const KIND_GLYPH: Record<FieldFlagKind, string> = {
  livestock: "🐄",
  water: "💧",
  fence: "▦",
  weather: "❄",
  team: "✦",
};

const TONE_BG: Record<OpsTone, string> = {
  good: "rgba(110, 168, 119, 0.92)",
  watch: "rgba(196, 162, 101, 0.92)",
  warning: "rgba(178, 92, 82, 0.92)",
  neutral: "rgba(60, 56, 52, 0.92)",
};

const TONE_BORDER: Record<OpsTone, string> = {
  good: "#a9d8b1",
  watch: "#d4b87a",
  warning: "#e2a597",
  neutral: "rgba(242, 237, 227, 0.4)",
};

function buildPin(flag: FieldFlag): HTMLDivElement {
  const el = document.createElement("div");
  el.setAttribute("aria-label", `${flag.kind} flag: ${flag.label}`);
  el.style.cssText = [
    "width:30px",
    "height:30px",
    "border-radius:50%",
    `background:${TONE_BG[flag.tone]}`,
    `border:2px solid ${TONE_BORDER[flag.tone]}`,
    "box-shadow:0 2px 6px rgba(0,0,0,0.45)",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "color:#f6efe1",
    "font-size:14px",
    "font-family:'Apple Color Emoji','Segoe UI Emoji',sans-serif",
    "cursor:pointer",
    "user-select:none",
    "transition:transform 120ms ease",
  ].join(";");
  el.textContent = KIND_GLYPH[flag.kind];
  el.addEventListener("mouseenter", () => {
    el.style.transform = "scale(1.12)";
  });
  el.addEventListener("mouseleave", () => {
    el.style.transform = "scale(1)";
  });
  return el;
}

function popupHtml(flag: FieldFlag): string {
  const observed = flag.observedAt
    ? `<div style="margin-top:6px;font-size:10px;opacity:0.7">Observed ${new Date(flag.observedAt).toLocaleString()}</div>`
    : "";
  const detail = flag.detail
    ? `<div style="margin-top:4px;font-size:11px;opacity:0.85">${escapeHtml(flag.detail)}</div>`
    : "";
  return `
    <div style="font-family:inherit;color:#1f1d1a;min-width:160px">
      <div style="font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;opacity:0.6">${flag.kind}</div>
      <div style="font-size:13px;font-weight:600;margin-top:2px">${escapeHtml(flag.label)}</div>
      ${detail}
      ${observed}
    </div>
  `;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default function FieldFlagOverlay({ map, flags, onSelect }: FieldFlagOverlayProps) {
  // Map of flag id → marker so we can diff on flag-set changes without
  // tearing down the entire layer.
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const popupRef = useRef<maplibregl.Popup | null>(null);

  useEffect(() => {
    const known = markersRef.current;
    const seenIds = new Set<string>();

    for (const flag of flags) {
      seenIds.add(flag.id);
      const existing = known.get(flag.id);
      if (existing) {
        // Position may have shifted (livestock moved paddocks etc.).
        const cur = existing.getLngLat();
        if (cur.lng !== flag.position[0] || cur.lat !== flag.position[1]) {
          existing.setLngLat(flag.position);
        }
        continue;
      }
      const el = buildPin(flag);
      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat(flag.position)
        .addTo(map);
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        if (popupRef.current) popupRef.current.remove();
        const popup = new maplibregl.Popup({ offset: 18, closeButton: true, closeOnClick: false, className: "v3-flag-popup" })
          .setLngLat(flag.position)
          .setHTML(popupHtml(flag))
          .addTo(map);
        popupRef.current = popup;
        onSelect?.(flag.id);
      });
      known.set(flag.id, marker);
    }

    // Remove markers whose flag has gone away.
    for (const [id, marker] of known.entries()) {
      if (!seenIds.has(id)) {
        marker.remove();
        known.delete(id);
      }
    }
  }, [map, flags, onSelect]);

  // Tear down on unmount.
  useEffect(() => {
    const known = markersRef.current;
    return () => {
      for (const marker of known.values()) marker.remove();
      known.clear();
      popupRef.current?.remove();
      popupRef.current = null;
    };
  }, []);

  return null;
}
