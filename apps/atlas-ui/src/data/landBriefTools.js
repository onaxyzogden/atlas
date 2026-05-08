// Per-module tool palettes for the Land Brief workspace.
// Each tool is one of:
//   - draw-point | draw-line | draw-polygon: switches MapboxDraw mode and routes
//     created features into drawnByModule[moduleKey]
//   - toggle-sublayer: flips visibility of a single layer id (used for things
//     like a label layer atop the synthetic overlay)
// `tag` is injected into the created feature's properties so SWOT can carry
// S/W/O/T classification onto identical point geometry.

export const MODULE_TOOLS = {
  "human-context": [
    { id: "neighbour-pin", label: "Neighbour pin", iconKey: "mapPin", kind: "draw-point", tag: "neighbour" },
    { id: "steward-pin", label: "Steward / household", iconKey: "users", kind: "draw-point", tag: "steward" },
    { id: "access-road", label: "Access road", iconKey: "penLine", kind: "draw-line", tag: "access-road" },
  ],
  macroclimate: [
    { id: "frost-pocket", label: "Frost pocket", iconKey: "snowflake", kind: "draw-polygon", tag: "frost-pocket" },
    { id: "hazard-zone", label: "Hazard zone", iconKey: "triangleAlert", kind: "draw-polygon", tag: "hazard" },
  ],
  topography: [
    { id: "digitize-contour", label: "Contour line", iconKey: "penLine", kind: "draw-line", tag: "contour" },
    { id: "high-point", label: "High point", iconKey: "mountain", kind: "draw-point", tag: "high-point" },
    { id: "drainage-line", label: "Drainage line", iconKey: "waves", kind: "draw-line", tag: "drainage" },
  ],
  ewe: [
    { id: "watercourse", label: "Watercourse", iconKey: "waves", kind: "draw-line", tag: "watercourse" },
    { id: "soil-sample", label: "Soil sample", iconKey: "beaker", kind: "draw-point", tag: "soil-sample" },
    { id: "ecology-zone", label: "Ecology zone", iconKey: "sprout", kind: "draw-polygon", tag: "ecology-zone" },
  ],
  sectors: [
    { id: "sun-wind-wedge", label: "Sun/wind wedge", iconKey: "sun", kind: "draw-polygon", tag: "sun-wind" },
    { id: "permaculture-zone", label: "Permaculture zone", iconKey: "target", kind: "draw-polygon", tag: "perma-zone" },
  ],
  swot: [
    { id: "swot-s", label: "Strength (S)", iconKey: "shieldCheck", kind: "draw-point", tag: "S" },
    { id: "swot-w", label: "Weakness (W)", iconKey: "shieldAlert", kind: "draw-point", tag: "W" },
    { id: "swot-o", label: "Opportunity (O)", iconKey: "star", kind: "draw-point", tag: "O" },
    { id: "swot-t", label: "Threat (T)", iconKey: "triangleAlert", kind: "draw-point", tag: "T" },
  ],
};

const DRAW_MODE_FOR_KIND = {
  "draw-point": "draw_point",
  "draw-line": "draw_line_string",
  "draw-polygon": "draw_polygon",
};

export function drawModeForTool(tool) {
  return DRAW_MODE_FOR_KIND[tool.kind] ?? null;
}
