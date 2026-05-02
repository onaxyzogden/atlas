/**
 * /v3/project/:projectId/design — Design Studio (Phase 9, last per brief).
 *
 * Layout inside the main column:
 *   ┌─────────┬───────────────────────────────────────────┐
 *   │ Toolbox │                                           │
 *   │         │   DesignMap (MapLibre satellite/topo +    │
 *   │  (5     │   parcel boundary). PR2 mounts the 5      │
 *   │  groups)│   overlay components; PR3 wires toolbox   │
 *   │         │   click-to-drop; PR4 lights up live       │
 *   │         │   metrics + score-delta callouts.         │
 *   │         ├───────────────────────────────────────────┤
 *   │         │ Bottom strip: Area / Perimeter / Elev /   │
 *   │         │  Water Need / Project Phase MetricCards   │
 *   │         ├───────────────────────────────────────────┤
 *   │         │ Bottom toolbar: Base Map · Overlays       │
 *   └─────────┴───────────────────────────────────────────┘
 *
 * Phase 5.1 PR1: live MapLibre canvas (DesignMap) replaces the static SVG.
 * RULE 2 ("no MapboxGL in v3.0") is now lifted on Design as well.
 *
 * Clicking a toolbox item still fires the in-page "would place X" toast —
 * actual store mutation lands in PR3.
 */

import { useState, useEffect } from "react";
import { useParams } from "@tanstack/react-router";
import MetricCard from "../components/MetricCard.js";
import DesignMap, { type DesignMapStyleKey } from "../components/DesignMap.js";
import DesignContoursOverlay from "../components/overlays/design/DesignContoursOverlay.js";
import DesignHydrologyOverlay from "../components/overlays/design/DesignHydrologyOverlay.js";
import DesignPropertyOverlay from "../components/overlays/design/DesignPropertyOverlay.js";
import DesignSoilsOverlay from "../components/overlays/design/DesignSoilsOverlay.js";
import DesignWetlandsOverlay from "../components/overlays/design/DesignWetlandsOverlay.js";
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

interface BaseMapOption { key: DesignMapStyleKey; label: string }
const BASE_MAPS: BaseMapOption[] = [
  { key: "satellite", label: "Satellite" },
  { key: "topographic", label: "Topographic" },
  { key: "terrain", label: "Terrain" },
  { key: "street", label: "Streets" },
  { key: "hybrid", label: "Hybrid" },
];
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

  const [baseMap, setBaseMap] = useState<DesignMapStyleKey>("satellite");
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
        <div className={css.canvasFrame} aria-label="Design canvas">
          <DesignMap
            // Fallback centroid only used when the project carries no
            // boundary polygon — every real project does, so this is the
            // dev-mock path.
            centroid={[-78.20, 44.50]}
            boundary={project.location.boundary}
            styleKey={baseMap}
            notice="Click-to-drop placement lands in PR3"
          >
            {({ map }) => (
              <>
                <DesignContoursOverlay map={map} visible={!!overlays.contours} />
                <DesignHydrologyOverlay map={map} visible={!!overlays.hydrology} />
                <DesignPropertyOverlay
                  map={map}
                  visible={!!overlays.property}
                  boundary={project.location.boundary}
                />
                <DesignSoilsOverlay visible={!!overlays.soils} projectId={project.id} />
                <DesignWetlandsOverlay visible={!!overlays.wetlands} projectId={project.id} />
              </>
            )}
          </DesignMap>

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

        <footer className={css.bottomToolbar} aria-label="Map controls">
          <div className={css.toolbarGroup}>
            <label className={css.toolbarLabel} htmlFor="basemap">Base Map</label>
            <select
              id="basemap"
              className={css.select}
              value={baseMap}
              onChange={(e) => setBaseMap(e.target.value as DesignMapStyleKey)}
            >
              {BASE_MAPS.map((b) => (
                <option key={b.key} value={b.key}>{b.label}</option>
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
        </footer>
      </div>
    </div>
  );
}
