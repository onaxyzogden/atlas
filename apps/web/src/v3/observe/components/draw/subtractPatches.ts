/**
 * subtractPatches — the geometry engine behind Observe's "Fill
 * remainder" gesture. Vegetation and pasture describe the
 * ground-cover *matrix*; crops and buildings sit on top as opaque
 * *patches*. This module computes `matrix = boundary − Σ patches`.
 *
 * Split into two exports on purpose:
 *
 * - `subtractPatches(boundary, subtractees)` is **pure**: it takes
 *   the boundary polygon and an explicit array of subtractee
 *   geometries, returns `Polygon | MultiPolygon | null`. No store
 *   access, no React. Unit-testable in isolation.
 *
 * - `collectSubtractees(projectId)` is the impure half: it reads
 *   crops + buildings from the Zustand stores filtered by
 *   `projectId`. Components call this then hand the result to
 *   `subtractPatches`.
 *
 * Why null can come back: `turf.difference` returns `null` when the
 * accumulator is fully consumed (boundary entirely covered by
 * patches) or when an intermediate subtraction wipes it out. Callers
 * must handle this — typically by bailing on placement.
 *
 * `@turf/turf` v7 invariant: `difference` takes a `FeatureCollection`
 * of `[minuend, subtrahend]`, not two positional arguments. This is
 * load-bearing — if a future turf bump flips the signature again, the
 * tests in this module's `__tests__/` catch it before the field.
 */

import * as turf from '@turf/turf';
import { useConventionalCropStore } from '../../../../store/conventionalCropStore.js';
import { useBuiltEnvironmentStore } from '../../../../store/builtEnvironmentStore.js';

export type PatchGeometry = GeoJSON.Polygon | GeoJSON.MultiPolygon;

/**
 * Pure: subtract every geometry in `subtractees` from `boundary`,
 * left-to-right. Returns the resulting Polygon / MultiPolygon, or
 * `null` if the boundary ends up fully covered.
 *
 * An empty subtractees array returns the boundary unchanged (the
 * caller still gets a usable geometry — useful when Fill-remainder is
 * toggled on but no patches exist yet).
 *
 * Malformed subtrahends (self-intersecting, degenerate, anything that
 * makes turf throw) are silently skipped — the reduction continues
 * over the remaining subtractees. This is the right call for a UI
 * gesture: one bad polygon in the project shouldn't break the whole
 * Fill-remainder action.
 */
export function subtractPatches(
  boundary: GeoJSON.Polygon,
  subtractees: ReadonlyArray<PatchGeometry>,
): PatchGeometry | null {
  if (subtractees.length === 0) return boundary;

  let acc: GeoJSON.Feature<PatchGeometry> | null = turf.feature(boundary);
  for (const g of subtractees) {
    if (!acc) break;
    try {
      acc = turf.difference(
        turf.featureCollection([acc, turf.feature(g)]),
      ) as typeof acc;
    } catch {
      /* malformed subtrahend — skip, keep current acc */
    }
  }
  return acc ? acc.geometry : null;
}

/**
 * Impure: pull the current crops + buildings for `projectId` out of
 * the two Zustand stores. Returns just the geometries, ready to feed
 * `subtractPatches`.
 *
 * Not memoised — caller is expected to call this on gesture, not on
 * every render.
 */
export function collectSubtractees(projectId: string): PatchGeometry[] {
  const crops = useConventionalCropStore
    .getState()
    .conventionalCrops.filter((c) => c.projectId === projectId);
  const buildings = useBuiltEnvironmentStore
    .getState()
    .buildings.filter((b) => b.projectId === projectId);
  return [
    ...crops.map((c) => c.geometry),
    ...buildings.map((b) => b.geometry),
  ];
}
