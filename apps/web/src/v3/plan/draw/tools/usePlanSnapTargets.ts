/**
 * usePlanSnapTargets — assembles the `SnapTargets` a Plan draw tool snaps onto.
 *
 * Single source of the "snap to existing" target set so FenceLineTool,
 * PaddockTool, and any future opt-in tool build identical targets. Collects, for
 * the current project:
 *   - fence lines (livestockStore) -> LineString edges + endpoints
 *   - paddocks (livestockStore)    -> polygon-ring edges + corners
 *   - built-environment entities (builtEnvironmentStoreV2) -> structure
 *     footprints (Polygon rings) + any LineString runs -> edges + corners
 *   - the parcel boundary ring     -> edges + corners
 *
 * Returns a stable `getSnapTargets` callback (re-created only when an input
 * collection changes). `useMapboxDrawTool` invokes it once at mode start, so the
 * targets reflect existing features at the moment the draw session begins.
 */

import { useCallback } from 'react';
import { useLivestockStore } from '../../../../store/livestockStore.js';
import { useBuiltEnvironmentStoreV2 } from '../../../../store/builtEnvironmentStoreV2.js';
import type { SnapTargets } from '../../../lib/snapPoint.js';

type LngLat = [number, number];

export function usePlanSnapTargets(
  projectId: string,
  parcelBoundary?: GeoJSON.Polygon,
): () => SnapTargets {
  const fenceLines = useLivestockStore((s) => s.fenceLines);
  const paddocks = useLivestockStore((s) => s.paddocks);
  const entities = useBuiltEnvironmentStoreV2((s) => s.entities);

  return useCallback((): SnapTargets => {
    const lines: LngLat[][] = [];
    const vertices: LngLat[] = [];

    const pushLine = (coords: LngLat[] | undefined): void => {
      if (!coords || coords.length < 2) return;
      lines.push(coords);
      for (const c of coords) vertices.push(c);
    };

    // Fence lines — LineString geometry.
    for (const f of fenceLines) {
      if (f.projectId !== projectId) continue;
      pushLine(f.geometry?.coordinates as LngLat[] | undefined);
    }

    // Paddocks — outer polygon ring.
    for (const p of paddocks) {
      if (p.projectId !== projectId) continue;
      pushLine(p.geometry?.coordinates?.[0] as LngLat[] | undefined);
    }

    // Built-environment entities — structure footprints (Polygon) + line runs.
    for (const e of entities) {
      if (e.projectId !== projectId) continue;
      const g = e.geometry;
      if (!g) continue;
      if (g.type === 'Polygon') {
        pushLine(g.coordinates?.[0] as LngLat[] | undefined);
      } else if (g.type === 'LineString') {
        pushLine(g.coordinates as LngLat[]);
      }
    }

    // Parcel boundary — outer ring.
    if (parcelBoundary) {
      pushLine(parcelBoundary.coordinates?.[0] as LngLat[] | undefined);
    }

    return { lines, vertices };
  }, [fenceLines, paddocks, entities, parcelBoundary, projectId]);
}
