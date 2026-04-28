/**
 * /v3/project/:projectId/design — Design Studio (Phase 9, last per brief).
 *
 * Layout inside the main column:
 *   ┌─────────┬───────────────────────────────────────────┐
 *   │ Toolbox │ Canvas Toolbar (Base Map · Overlays)      │
 *   │         ├───────────────────────────────────────────┤
 *   │  (5     │                                           │
 *   │  groups)│   Static SVG canvas with dummy parcels,   │
 *   │         │   paddocks, yurt cluster, water pond,     │
 *   │         │   path network — placeholder for v3.1     │
 *   │         │   MapboxGL integration.                   │
 *   │         ├───────────────────────────────────────────┤
 *   │         │ Bottom strip: Area / Perimeter / Elev /   │
 *   │         │  Water Need / Project Phase MetricCards   │
 *   └─────────┴───────────────────────────────────────────┘
 *
 * RULE 2: no MapboxGL imports — static SVG only.
 * The right "Intelligence Rail" is mounted by V3ProjectLayout → DesignRail.
 *
 * Clicking a toolbox item triggers an in-page toast ("would place X").
 */

import { useState, useEffect } from "react";
import { useParams } from "@tanstack/react-router";
import MetricCard from "../components/MetricCard.js";
import { useV3Project } from "../data/useV3Project.js";
import css from "./DesignPage.module.css";

interface ToolItem {
  id: string;
  label: string;
  glyph: string;
}

interface ToolGroup {
  id: string;
  label: string;
  items: ToolItem[];
}

const TOOL_GROUPS: ToolGroup[] = [
  {
    id: "grazing",
    label: "Grazing & Land Use",
    items: [
      { id: "paddock", label: "Paddock", glyph: "▦" },
      { id: "rotation", label: "Rotation Block", glyph: "↻" },
      { id: "field-crop", label: "Field Crop", glyph: "≡" },
      { id: "orchard", label: "Orchard", glyph: "✿" },
    ],
  },
  {
    id: "structures",
    label: "Structures",
    items: [
      { id: "barn", label: "Barn", glyph: "▣" },
      { id: "yurt", label: "Yurt Cluster", glyph: "◬" },
      { id: "shelter", label: "Teaching Shelter", glyph: "△" },
      { id: "shed", label: "Shed", glyph: "□" },
    ],
  },
  {
    id: "water",
    label: "Water Systems",
    items: [
      { id: "pond", label: "Pond", glyph: "◯" },
      { id: "tank", label: "Storage Tank", glyph: "⬢" },
      { id: "swale", label: "Swale", glyph: "⌣" },
      { id: "trough", label: "Trough", glyph: "▭" },
    ],
  },
  {
    id: "access",
    label: "Access & Paths",
    items: [
      { id: "road", label: "Road", glyph: "═" },
      { id: "footpath", label: "Footpath", glyph: "⋯" },
      { id: "gate", label: "Gate", glyph: "❘❘" },
    ],
  },
  {
    id: "amenity",
    label: "Amenity & Culture",
    items: [
      { id: "garden", label: "Garden", glyph: "❀" },
      { id: "musalla", label: "Musalla", glyph: "✦" },
      { id: "fire-pit", label: "Fire Pit", glyph: "✶" },
    ],
  },
];

const BASE_MAPS = ["Satellite", "Topographic", "Outdoor", "Streets"];
const OVERLAYS = [
  { id: "contours", label: "Contours" },
  { id: "hydrology", label: "Hydrology" },
  { id: "soils", label: "Soils" },
  { id: "property", label: "Property" },
  { id: "wetlands", label: "Wetlands" },
];

export default function DesignPage() {
  const params = useParams({ strict: false }) as { projectId?: string };
  const project = useV3Project(params.projectId);

  const [baseMap, setBaseMap] = useState("Satellite");
  const [overlays, setOverlays] = useState<Record<string, boolean>>({
    contours: true,
    hydrology: true,
    soils: false,
    property: true,
    wetlands: true,
  });
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(t);
  }, [toast]);

  if (!project) {
    return <p className={css.empty}>No project loaded.</p>;
  }

  function placeItem(group: ToolGroup, item: ToolItem) {
    setToast(`Would place ${item.label} (${group.label})`);
  }

  function toggleOverlay(id: string) {
    setOverlays((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className={css.studio}>
      <aside className={css.toolbox} aria-label="Design toolbox">
        <header className={css.toolboxHeader}>
          <span className={css.eyebrow}>Toolbox</span>
          <h2 className={css.toolboxTitle}>Place Elements</h2>
        </header>
        {TOOL_GROUPS.map((g) => (
          <section key={g.id} className={css.group}>
            <span className={css.groupLabel}>{g.label}</span>
            <div className={css.itemGrid}>
              {g.items.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  className={css.toolItem}
                  onClick={() => placeItem(g, it)}
                  aria-label={`Place ${it.label}`}
                >
                  <span className={css.toolGlyph} aria-hidden="true">{it.glyph}</span>
                  <span className={css.toolLabel}>{it.label}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </aside>

      <div className={css.canvasColumn}>
        <header className={css.canvasToolbar} aria-label="Map controls">
          <div className={css.toolbarGroup}>
            <label className={css.toolbarLabel} htmlFor="basemap">Base Map</label>
            <select
              id="basemap"
              className={css.select}
              value={baseMap}
              onChange={(e) => setBaseMap(e.target.value)}
            >
              {BASE_MAPS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <div className={css.toolbarGroup}>
            <span className={css.toolbarLabel}>Overlays</span>
            <div className={css.overlayChips}>
              {OVERLAYS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className={`${css.chip} ${overlays[o.id] ? css.chipOn : ""}`}
                  onClick={() => toggleOverlay(o.id)}
                  aria-pressed={overlays[o.id]}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className={css.canvasFrame} aria-label="Design canvas (placeholder)">
          <svg
            className={css.canvas}
            viewBox="0 0 200 120"
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="Static parcel diagram with placeholder design elements"
          >
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgb(255 255 255 / 0.04)" strokeWidth="0.3" />
              </pattern>
            </defs>
            <rect width="200" height="120" fill="url(#grid)" />

            {/* property boundary */}
            {overlays.property && (
              <polygon
                points="10,12 188,16 184,108 14,104"
                fill="rgb(118 156 91 / 0.06)"
                stroke="rgb(var(--color-gold-rgb) / 0.7)"
                strokeWidth="0.6"
                strokeDasharray="2 1.5"
              />
            )}

            {/* contours */}
            {overlays.contours && (
              <g fill="none" stroke="rgb(255 255 255 / 0.10)" strokeWidth="0.3">
                <path d="M 20 30 Q 60 26 100 32 T 180 38" />
                <path d="M 20 50 Q 60 46 100 52 T 180 58" />
                <path d="M 20 70 Q 60 66 100 72 T 180 78" />
                <path d="M 20 90 Q 60 86 100 92 T 180 98" />
              </g>
            )}

            {/* hydrology — stream + pond */}
            {overlays.hydrology && (
              <g>
                <path
                  d="M 0 60 C 40 56 70 80 110 70 S 170 50 200 64"
                  fill="none"
                  stroke="rgb(70 130 180 / 0.6)"
                  strokeWidth="0.7"
                  strokeDasharray="1.4 0.8"
                />
                <ellipse cx="56" cy="74" rx="6" ry="3.5" fill="rgb(70 130 180 / 0.32)" stroke="rgb(70 130 180 / 0.7)" strokeWidth="0.4" />
              </g>
            )}

            {/* wetlands */}
            {overlays.wetlands && (
              <ellipse cx="150" cy="92" rx="14" ry="6" fill="rgb(70 130 180 / 0.16)" stroke="rgb(70 130 180 / 0.5)" strokeWidth="0.3" strokeDasharray="0.8 0.8" />
            )}

            {/* paddocks */}
            <g>
              <polygon points="32,28 78,30 80,58 30,56" fill="rgb(118 156 91 / 0.20)" stroke="rgb(118 156 91 / 0.7)" strokeWidth="0.5" />
              <polygon points="80,30 130,32 130,58 80,58" fill="rgb(118 156 91 / 0.16)" stroke="rgb(118 156 91 / 0.6)" strokeWidth="0.5" />
              <polygon points="30,58 80,58 80,84 30,84" fill="rgb(118 156 91 / 0.13)" stroke="rgb(118 156 91 / 0.55)" strokeWidth="0.5" />
              <polygon points="80,58 130,58 130,84 80,84" fill="rgb(118 156 91 / 0.10)" stroke="rgb(118 156 91 / 0.5)" strokeWidth="0.5" />
              <text x="55" y="46" fontSize="3.5" fontWeight="600" textAnchor="middle" fill="#cfd5c0">Paddock A</text>
              <text x="105" y="46" fontSize="3.5" fontWeight="600" textAnchor="middle" fill="#cfd5c0">Paddock B</text>
              <text x="55" y="73" fontSize="3.5" fontWeight="600" textAnchor="middle" fill="#cfd5c0">Paddock C</text>
              <text x="105" y="73" fontSize="3.5" fontWeight="600" textAnchor="middle" fill="#cfd5c0">Paddock D</text>
            </g>

            {/* yurt cluster */}
            <g>
              {[0, 1, 2, 3].map((i) => {
                const cx = 152 + (i % 2) * 7;
                const cy = 30 + Math.floor(i / 2) * 6;
                return (
                  <circle key={i} cx={cx} cy={cy} r="2.4" fill="rgb(var(--color-gold-rgb) / 0.5)" stroke="var(--color-gold-brand)" strokeWidth="0.4" />
                );
              })}
              <text x="159" y="50" fontSize="3.2" fontWeight="600" textAnchor="middle" fill="#e6cf99">Yurt Village</text>
            </g>

            {/* barn */}
            <rect x="36" y="92" width="14" height="9" fill="rgb(120 78 48 / 0.45)" stroke="rgb(120 78 48 / 0.85)" strokeWidth="0.4" />
            <text x="43" y="98" fontSize="3" fontWeight="600" textAnchor="middle" fill="#e8d4ba">Barn</text>

            {/* musalla */}
            <polygon points="170,80 176,80 173,76" fill="rgb(var(--color-gold-rgb) / 0.4)" stroke="var(--color-gold-brand)" strokeWidth="0.4" />
            <text x="173" y="86" fontSize="2.6" fontWeight="600" textAnchor="middle" fill="#e6cf99">Musalla</text>

            {/* path */}
            <path d="M 14 100 L 60 96 L 95 84 L 130 60 L 158 38" fill="none" stroke="rgb(190 164 110 / 0.65)" strokeWidth="0.7" strokeDasharray="0.8 0.8" />
          </svg>

          <div className={css.canvasNotice}>
            <span className={css.canvasBadge}>Phase 9 placeholder</span>
            <span className={css.canvasNoticeText}>
              Live MapboxGL canvas with object placement, snapping, and live scoring arrives in v3.1. Click toolbox items to preview placements.
            </span>
          </div>

          {toast && <div className={css.toast} role="status">{toast}</div>}
        </div>

        <div className={css.bottomStrip} aria-label="Design metrics">
          <MetricCard label="Area" value="128" unit="ha" subtext="Property total" />
          <MetricCard label="Perimeter" value="4.6" unit="km" subtext="Designed boundary" />
          <MetricCard label="Elevation Range" value="38 m" subtext="218 m – 256 m" />
          <MetricCard
            label="Estimated Water Need"
            value="9,200"
            unit="L/d"
            subtext="Livestock + irrigation"
            status={{ label: "Watch", tone: "watch" }}
          />
          <MetricCard
            label="Project Phase"
            value="1 of 3"
            subtext="Site Prep + Water"
            status={{ label: "In progress", tone: "good" }}
          />
        </div>
      </div>
    </div>
  );
}
