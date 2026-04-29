/**
 * Sector data shape — permaculture site-analysis wedges fanning from a centroid.
 *
 * v3.2 ships solar wedges only (winter solstice / summer solstice / equinox arcs).
 * Wind, fire, view, and noise wedges share the same shape and slot in via the
 * `kind` discriminator without a schema change.
 *
 * Bearings are compass degrees: 0 = north, increasing clockwise (so 90 = east,
 * 180 = south, 270 = west). A wedge sweeps clockwise from `startBearingDeg` to
 * `endBearingDeg`. In the Northern hemisphere a solar wedge sweeps through the
 * south (sunrise bearing → sunset bearing crossing 180°).
 */

export type SectorKind =
  | "solar-summer"
  | "solar-winter"
  | "solar-equinox"
  | "wind-prevailing"
  | "fire"
  | "view"
  | "noise";

export interface SectorWedge {
  id: string;
  kind: SectorKind;
  label: string;
  startBearingDeg: number;
  endBearingDeg: number;
  reachMeters: number;
  color: string;
  meta?: Record<string, unknown>;
}

export interface SectorSource {
  kind: string;
  provenance: string;
}

export interface SiteSectors {
  centroid: [number, number];
  generatedAt: string;
  wedges: SectorWedge[];
  sources: SectorSource[];
}
