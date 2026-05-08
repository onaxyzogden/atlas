// Synthetic placeholder geometry — replace when project service returns real geo.
// All overlays are centred near [-79.87, 43.55] (Halton, ON demo project) so they
// stack visibly over the map at zoom 11.

const C = [-79.87, 43.55]; // [lng, lat]

// Build a polygon ring of N points at radius (in degrees) around centre.
function ring(centre, radiusDeg, n = 32) {
  const [lng, lat] = centre;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2;
    pts.push([lng + Math.cos(t) * radiusDeg, lat + Math.sin(t) * radiusDeg * 0.75]);
  }
  return pts;
}

// Sector wedge polygon (radial slice).
function wedge(centre, startDeg, endDeg, radiusDeg, n = 16) {
  const [lng, lat] = centre;
  const pts = [[lng, lat]];
  const start = (startDeg * Math.PI) / 180;
  const end = (endDeg * Math.PI) / 180;
  for (let i = 0; i <= n; i++) {
    const t = start + (end - start) * (i / n);
    pts.push([lng + Math.cos(t) * radiusDeg, lat + Math.sin(t) * radiusDeg * 0.75]);
  }
  pts.push([lng, lat]);
  return pts;
}

const fc = (features) => ({ type: "FeatureCollection", features });
const f = (geom, props = {}) => ({ type: "Feature", geometry: geom, properties: props });

export const LAND_BRIEF_OVERLAYS = {
  "human-context": {
    label: "Human Context",
    color: "#cfe6ee",
    source: { id: "lb-human-context", source: { type: "geojson", data: fc([
      f({ type: "Point", coordinates: [C[0] - 0.018, C[1] + 0.012] }, { name: "Neighbour: Hartford farm" }),
      f({ type: "Point", coordinates: [C[0] + 0.022, C[1] - 0.008] }, { name: "Steward residence" }),
      f({ type: "Point", coordinates: [C[0] + 0.005, C[1] + 0.025] }, { name: "Co-op meeting hall" }),
      f({ type: "Point", coordinates: [C[0] - 0.030, C[1] - 0.015] }, { name: "Road access" }),
      f({ type: "LineString", coordinates: [[C[0] - 0.04, C[1] - 0.02], [C[0] - 0.01, C[1]], [C[0] + 0.025, C[1] + 0.005]] }, { name: "Sideroad 4" }),
    ]) } },
    layers: [
      { id: "lb-human-context-line", type: "line", paint: { "line-color": "#cfe6ee", "line-width": 2, "line-dasharray": [3, 2] }, filter: ["==", "$type", "LineString"] },
      { id: "lb-human-context-points", type: "circle", paint: { "circle-radius": 6, "circle-color": "#cfe6ee", "circle-stroke-color": "#0e1a14", "circle-stroke-width": 1.5 }, filter: ["==", "$type", "Point"] },
    ],
  },

  macroclimate: {
    label: "Macroclimate & Hazards",
    color: "#d4a93f",
    source: { id: "lb-macroclimate", source: { type: "geojson", data: fc([
      f({ type: "Polygon", coordinates: [ring(C, 0.055)] }, { name: "Climate zone 5b" }),
    ]) } },
    layers: [
      { id: "lb-macroclimate-fill", type: "fill", paint: { "fill-color": "#d4a93f", "fill-opacity": 0.18 } },
      { id: "lb-macroclimate-line", type: "line", paint: { "line-color": "#d4a93f", "line-width": 1.5, "line-dasharray": [4, 2] } },
    ],
  },

  topography: {
    label: "Topography",
    color: "#a5c736",
    source: { id: "lb-topography", source: { type: "geojson", data: fc(
      [0.012, 0.022, 0.032, 0.042].map((r, i) =>
        f({ type: "LineString", coordinates: ring(C, r) }, { elevation: 200 + i * 20 })
      )
    ) } },
    layers: [
      { id: "lb-topography-line", type: "line", paint: { "line-color": "#a5c736", "line-width": 1.5, "line-opacity": 0.8 } },
    ],
  },

  ewe: {
    label: "Earth, Water & Ecology",
    color: "#6fb4d6",
    source: { id: "lb-ewe", source: { type: "geojson", data: fc([
      f({ type: "LineString", coordinates: [[C[0] - 0.04, C[1] + 0.03], [C[0] - 0.02, C[1] + 0.01], [C[0], C[1]], [C[0] + 0.02, C[1] - 0.012], [C[0] + 0.04, C[1] - 0.025]] }, { name: "Sample creek" }),
      f({ type: "LineString", coordinates: [[C[0] - 0.025, C[1] + 0.018], [C[0] - 0.005, C[1] + 0.005], [C[0] + 0.012, C[1] - 0.003]] }, { name: "Tributary" }),
    ]) } },
    layers: [
      { id: "lb-ewe-line", type: "line", paint: { "line-color": "#6fb4d6", "line-width": 3, "line-opacity": 0.85 } },
    ],
  },

  sectors: {
    label: "Sectors & Zones",
    color: "#b574d7",
    source: { id: "lb-sectors", source: { type: "geojson", data: fc([
      f({ type: "Polygon", coordinates: [wedge(C, -30, 30, 0.04)] }, { name: "Summer sun" }),
      f({ type: "Polygon", coordinates: [wedge(C, 150, 210, 0.04)] }, { name: "Winter sun" }),
      f({ type: "Polygon", coordinates: [wedge(C, 60, 120, 0.035)] }, { name: "Prevailing wind" }),
    ]) } },
    layers: [
      { id: "lb-sectors-fill", type: "fill", paint: { "fill-color": "#b574d7", "fill-opacity": 0.22 } },
      { id: "lb-sectors-line", type: "line", paint: { "line-color": "#b574d7", "line-width": 1 } },
    ],
  },

  swot: {
    label: "SWOT Synthesis",
    color: "#e57373",
    source: { id: "lb-swot", source: { type: "geojson", data: fc([
      f({ type: "Point", coordinates: [C[0] - 0.012, C[1] + 0.008] }, { kind: "S", note: "Strong soil" }),
      f({ type: "Point", coordinates: [C[0] + 0.015, C[1] + 0.013] }, { kind: "W", note: "Wet flat" }),
      f({ type: "Point", coordinates: [C[0] + 0.020, C[1] - 0.010] }, { kind: "O", note: "Solar slope" }),
      f({ type: "Point", coordinates: [C[0] - 0.018, C[1] - 0.014] }, { kind: "T", note: "Frost pocket" }),
    ]) } },
    layers: [
      { id: "lb-swot-points", type: "circle", paint: { "circle-radius": 8, "circle-color": "#e57373", "circle-stroke-color": "#0e1a14", "circle-stroke-width": 2, "circle-opacity": 0.9 } },
    ],
  },
};
