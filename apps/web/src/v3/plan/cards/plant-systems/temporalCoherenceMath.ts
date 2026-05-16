/**
 * temporalCoherenceMath — pure helper that walks vegetation point pairs
 * and reports the first year (within a lookahead) where their projected
 * canopies overlap. Used by both:
 *   - the plan-canvas feature-state effect (drives the fired-clay
 *     warning ring on tree dots), and
 *   - the TemporalCoherenceCard readout list.
 *
 * O(N²) on placed vegetation point count. Fine for permaculture-scale
 * orchards (<200 trees); revisit if the canvas ever stamps thousands
 * via `stampHexFill`.
 */

import { canopyAtAge } from '@ogden/shared';
import { distance } from '@turf/turf';
import type { DesignElement } from '../../../../store/designElementsStore.js';

export interface CanopyOverlap {
  aId: string;
  bId: string;
  aLabel: string;
  bLabel: string;
  /** Centre-to-centre separation in metres (constant — geometry doesn't change with year). */
  separationM: number;
  /** Sum of the two crown radii at `yearOfOverlap`. */
  combinedRadiusM: number;
  /** First year in [from, from+lookahead] where summed canopies exceed separation. */
  yearOfOverlap: number;
}

function pointCoords(el: DesignElement): [number, number] | null {
  if (el.geometry.type !== 'Point') return null;
  const coords = el.geometry.coordinates;
  if (coords.length < 2 || coords[0] == null || coords[1] == null) return null;
  return [coords[0], coords[1]];
}

function radiusM(speciesKind: string, year: number): number {
  return canopyAtAge(speciesKind, year).canopyM / 2;
}

/**
 * Walk every pair of vegetation point elements; for each pair walk the
 * year cursor from `currentYear` to `currentYear + lookaheadYears`
 * inclusive and report the first year where `r(a) + r(b) > separation`.
 */
export function findOverlaps(
  vegetation: DesignElement[],
  currentYear: number,
  lookaheadYears = 5,
): CanopyOverlap[] {
  const overlaps: CanopyOverlap[] = [];
  const points = vegetation
    .map((el) => ({ el, coords: pointCoords(el) }))
    .filter((p): p is { el: DesignElement; coords: [number, number] } => p.coords !== null);

  for (let i = 0; i < points.length; i += 1) {
    const a = points[i]!;
    for (let j = i + 1; j < points.length; j += 1) {
      const b = points[j]!;
      const separationM = distance(a.coords, b.coords, { units: 'meters' });
      let foundYear: number | null = null;
      let combined = 0;
      for (let y = currentYear; y <= currentYear + lookaheadYears; y += 1) {
        combined = radiusM(a.el.kind, y) + radiusM(b.el.kind, y);
        if (combined > separationM) {
          foundYear = y;
          break;
        }
      }
      if (foundYear !== null) {
        overlaps.push({
          aId: a.el.id,
          bId: b.el.id,
          aLabel: a.el.label ?? a.el.kind,
          bLabel: b.el.label ?? b.el.kind,
          separationM,
          combinedRadiusM: combined,
          yearOfOverlap: foundYear,
        });
      }
    }
  }
  return overlaps;
}

/** Set of element ids that participate in any overlap — convenient for
 *  the plan-canvas feature-state effect (one boolean per id). */
export function overlappingIds(overlaps: CanopyOverlap[]): Set<string> {
  const out = new Set<string>();
  for (const o of overlaps) {
    out.add(o.aId);
    out.add(o.bId);
  }
  return out;
}
