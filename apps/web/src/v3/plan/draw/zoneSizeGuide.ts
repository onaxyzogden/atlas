/**
 * zoneSizeGuide — single source of truth for the snap-assist sizing target
 * of a hand-drawn permaculture zone.
 *
 * The guide radius per Z-level is the Mollison absolute outer radius from the
 * canonical pedagogical ladder in `concentric.ts` (Z0→5 … Z4→600 m). Z5 is
 * open-ended (wilderness clipped to the parcel) so it has no size target.
 *
 * Everything here is pure — no map, no React — so it is trivially testable
 * and shared by the popover readout and the live guide-ring overlay.
 */

import { DEFAULT_OUTER_RADII } from '../../../lib/zones/concentric.js';

export type ZLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type ZoneSizeStatus = 'under' | 'ok' | 'over' | 'none';

/**
 * Outer radius (metres) the drawn zone should roughly fit within, by
 * Z-level. `null` for Z5 — wilderness has no target. Indices 0..4 come
 * straight off the shared Mollison ladder so the guide can never drift
 * from the concentric-zone defaults.
 */
export const ZONE_GUIDE_RADIUS_M: Record<ZLevel, number | null> = {
  0: DEFAULT_OUTER_RADII[0],
  1: DEFAULT_OUTER_RADII[1],
  2: DEFAULT_OUTER_RADII[2],
  3: DEFAULT_OUTER_RADII[3],
  4: DEFAULT_OUTER_RADII[4],
  5: null,
};

/** Tolerance band (× target area) within which a drawn zone reads as on-spec. */
const OK_LOW_FACTOR = 0.4;
const OK_HIGH_FACTOR = 2.5;

/** Guide radius (m) for a Z-level, or null when there is no target (Z5). */
export function guideRadiusM(z: ZLevel): number | null {
  return ZONE_GUIDE_RADIUS_M[z] ?? null;
}

/** Target footprint area (m²) = π·r² of the guide radius. Null for Z5. */
export function guideAreaM2(z: ZLevel): number | null {
  const r = ZONE_GUIDE_RADIUS_M[z];
  if (r == null) return null;
  return Math.PI * r * r;
}

/**
 * Advisory status of a drawn polygon's area against its Z-level target.
 * Never blocks the user — purely drives colour/feedback.
 */
export function zoneSizeStatus(
  areaM2: number | null,
  z: ZLevel,
): ZoneSizeStatus {
  const target = guideAreaM2(z);
  if (target == null) return 'none';
  if (areaM2 == null || !Number.isFinite(areaM2) || areaM2 <= 0) return 'none';
  if (areaM2 < target * OK_LOW_FACTOR) return 'under';
  if (areaM2 > target * OK_HIGH_FACTOR) return 'over';
  return 'ok';
}

const Z_LABEL: Record<ZLevel, string> = {
  0: 'Z0 home centre',
  1: 'Z1 daily touch',
  2: 'Z2 weekly touch',
  3: 'Z3 main crops',
  4: 'Z4 forage / managed',
  5: 'Z5 wilderness',
};

function formatArea(m2: number): string {
  if (m2 < 10_000) return `~${Math.round(m2)} m²`;
  return `~${(m2 / 10_000).toFixed(1)} ha`;
}

/** One-line target hint shown next to the live-area readout. */
export function zoneGuideLabel(z: ZLevel): string {
  const r = ZONE_GUIDE_RADIUS_M[z];
  if (r == null) return `${Z_LABEL[z]} — no size target`;
  const area = guideAreaM2(z);
  const areaStr = area != null ? ` (${formatArea(area)})` : '';
  return `${Z_LABEL[z]} target ≈ ${r} m radius${areaStr}`;
}
