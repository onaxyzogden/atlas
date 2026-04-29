/**
 * Concentric zones — pure function returning Mollison's six use-frequency rings
 * around a parcel centroid. Pedagogical defaults; no network, no surveyed data.
 *
 * Default radii ladder (metres):
 *   Zone 0 inner 0     outer 5     (dwelling disc)
 *   Zone 1 inner 5     outer 30    (daily attention)
 *   Zone 2 inner 30    outer 100   (weekly)
 *   Zone 3 inner 100   outer 300   (main crops / pasture)
 *   Zone 4 inner 300   outer 600   (forage / woodlot)
 *   Zone 5 inner 600   outer ∞     (wild — clipped to parcel by overlay)
 *
 * Override the ladder via opts.outerRadii (length 5; index i is the outer
 * radius of zone i+1, since zone 0's outer = the smallest entry pulled in).
 */

import type { SiteZones, ZoneIndex, ZoneRing } from "./types.js";

const DEFAULT_OUTER_RADII = [5, 30, 100, 300, 600] as const;

const COLORS: Record<ZoneIndex, string> = {
  0: "#7a3f2e",
  1: "#a85a3f",
  2: "#c48055",
  3: "#a89456",
  4: "#7a8550",
  5: "#3f6b4a",
};

const LABELS: Record<ZoneIndex, string> = {
  0: "Zone 0 — Home",
  1: "Zone 1 — Daily",
  2: "Zone 2 — Weekly",
  3: "Zone 3 — Main crops",
  4: "Zone 4 — Forage",
  5: "Zone 5 — Wild",
};

export interface ComputeConcentricZonesOptions {
  /**
   * Outer radii (metres) for zones 0..4. Zone 5 has no outer radius — the
   * overlay clips it to the parcel boundary. Must be 5 strictly-ascending
   * positive numbers; falls back to DEFAULT_OUTER_RADII otherwise.
   */
  outerRadii?: readonly [number, number, number, number, number];
}

function isAscendingPositive(arr: readonly number[]): boolean {
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    if (v === undefined || !Number.isFinite(v) || v <= 0) return false;
    const prev = arr[i - 1];
    if (i > 0 && prev !== undefined && v <= prev) return false;
  }
  return true;
}

export function computeConcentricZones(
  centroid: [number, number],
  opts: ComputeConcentricZonesOptions = {},
): SiteZones {
  const radii = opts.outerRadii && isAscendingPositive(opts.outerRadii)
    ? opts.outerRadii
    : DEFAULT_OUTER_RADII;

  const rings: ZoneRing[] = [
    { index: 0, label: LABELS[0], innerRadiusMeters: 0,        outerRadiusMeters: radii[0], color: COLORS[0] },
    { index: 1, label: LABELS[1], innerRadiusMeters: radii[0], outerRadiusMeters: radii[1], color: COLORS[1] },
    { index: 2, label: LABELS[2], innerRadiusMeters: radii[1], outerRadiusMeters: radii[2], color: COLORS[2] },
    { index: 3, label: LABELS[3], innerRadiusMeters: radii[2], outerRadiusMeters: radii[3], color: COLORS[3] },
    { index: 4, label: LABELS[4], innerRadiusMeters: radii[3], outerRadiusMeters: radii[4], color: COLORS[4] },
    { index: 5, label: LABELS[5], innerRadiusMeters: radii[4], color: COLORS[5] },
  ];

  return {
    centroid,
    generatedAt: new Date().toISOString(),
    rings,
    sources: [
      { kind: "zones", provenance: "Mollison concentric zones — pedagogical defaults" },
    ],
  };
}
