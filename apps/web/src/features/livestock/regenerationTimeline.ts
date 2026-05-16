/**
 * regenerationTimeline — pure projection of the steward-selected pathway
 * methods onto a year timeline for the RegenerationPlanCard's multi-year SVG.
 *
 * The sequential "spine" (ripping → cover-crop → amendment) is the critical
 * path to productive use and is what sets `totalYears`. Conditional methods
 * (managed grazing, biochar) run concurrently inside the cover-crop window
 * and must never extend the total — exactly mirroring
 * buildRegenerationPathway's critical-path semantics in
 * v3/plan/data/regenerationPathway.ts.
 */

import {
  REGENERATION_METHODS,
  type RegenerationMethod,
} from '../../v3/plan/data/regenerationPathway.js';

/**
 * The critical-path spine, in sequence. Every selected method NOT in this
 * set runs concurrently with the cover-crop window instead of extending it.
 */
const SPINE_IDS: readonly string[] = [
  'keyline-subsoiling',
  'cover-crop-rebuild',
  'compost-amendment',
];

export interface TimelineSegment {
  id: string;
  name: string;
  order: number;
  startYear: number;
  endYear: number;
  durationYears: number;
  /** True for methods that overlap the spine rather than extend it. */
  concurrent: boolean;
}

export interface RegenerationTimeline {
  segments: TimelineSegment[];
  /** Critical-path length in years (the end of the spine). */
  totalYears: number;
  /** Year offset at which the zone becomes productively usable. */
  productiveYearOffset: number;
}

export function buildRegenerationTimeline(
  methodIds: string[],
): RegenerationTimeline {
  const byId = new Map<string, RegenerationMethod>(
    REGENERATION_METHODS.map((m) => [m.id, m]),
  );

  const selected = methodIds
    .map((id) => byId.get(id))
    .filter((m): m is RegenerationMethod => m !== undefined)
    .sort((a, b) => a.order - b.order);

  const spine = selected.filter((m) => SPINE_IDS.includes(m.id));
  const concurrent = selected.filter((m) => !SPINE_IDS.includes(m.id));

  const segments: TimelineSegment[] = [];

  // Lay the spine sequentially: each method begins where the prior one ended.
  let cursor = 0;
  let coverStartYear = 0;
  for (const m of spine) {
    const startYear = cursor;
    const endYear = cursor + m.durationYears;
    if (m.id === 'cover-crop-rebuild') coverStartYear = startYear;
    segments.push({
      id: m.id,
      name: m.name,
      order: m.order,
      startYear,
      endYear,
      durationYears: m.durationYears,
      concurrent: false,
    });
    cursor = endYear;
  }

  const totalYears = cursor;

  // Concurrent methods anchor to the cover-crop window (biology needs a
  // living cover established first) and are clamped so they never extend
  // the critical-path total.
  for (const m of concurrent) {
    const startYear = coverStartYear;
    const endYear = Math.min(startYear + m.durationYears, totalYears);
    segments.push({
      id: m.id,
      name: m.name,
      order: m.order,
      startYear,
      endYear,
      durationYears: m.durationYears,
      concurrent: true,
    });
  }

  segments.sort((a, b) => a.order - b.order);

  return {
    segments,
    totalYears,
    productiveYearOffset: totalYears,
  };
}
