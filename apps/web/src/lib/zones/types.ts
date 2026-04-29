/**
 * Zone data shape — permaculture use-frequency rings radiating from a centroid.
 *
 * Mollison's zones order activity by visit frequency:
 *   Zone 0 = the dwelling itself (the home)
 *   Zone 1 = daily attention (kitchen garden, herbs)
 *   Zone 2 = weekly (orchards, small livestock)
 *   Zone 3 = main crops, pasture
 *   Zone 4 = forage, woodlot
 *   Zone 5 = wild / observation only
 *
 * Radii are pedagogical defaults, not surveyed measurements — an acre of
 * intensive market garden may compress all six zones into 100 m, while a
 * grazing operation may stretch them across kilometres. v3.3 ships a single
 * default ladder; per-project overrides are a follow-up.
 */

export type ZoneIndex = 0 | 1 | 2 | 3 | 4 | 5;

export interface ZoneRing {
  index: ZoneIndex;
  label: string;
  /** Distance from centroid where this ring begins (0 for Zone 0). */
  innerRadiusMeters: number;
  /**
   * Distance from centroid where this ring ends. Undefined for Zone 5,
   * which extends to the parcel boundary (or to "the rest of the world").
   */
  outerRadiusMeters?: number;
  color: string;
}

export interface ZoneSource {
  kind: string;
  provenance: string;
}

export interface SiteZones {
  centroid: [number, number];
  generatedAt: string;
  rings: ZoneRing[];
  sources: ZoneSource[];
}
